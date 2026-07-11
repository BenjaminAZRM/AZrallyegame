const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { RALLYES, DATA } = require('./wrc-data.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '200kb' }));

// ─── CLASSEMENT CONTRE-LA-MONTRE (records partagés & persistants) ───────────────
// DATA_DIR pointe vers le Volume Railway (/data) s'il existe, sinon le dossier local
// (dans ce cas les records repartent à zéro à chaque redéploiement).
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/data') ? '/data' : __dirname);
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const MAX_RECORDS = 5000;
let records = [];
try {
  records = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));
  if (!Array.isArray(records)) records = [];
} catch (e) { records = []; }
function saveRecords() {
  try { fs.writeFileSync(RECORDS_FILE, JSON.stringify(records)); }
  catch (e) { console.error('Sauvegarde records échouée:', e.message); }
}

// ─── SÉCURITÉ : jetons de session signés + limitation anti-attaque ───────────────
app.set('trust proxy', 1); // Railway est derrière un proxy → pour lire la vraie IP

// Secret de signature, stable (env var, sinon fichier persistant sur le Volume)
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
let TOKEN_SECRET = process.env.TOKEN_SECRET || '';
if (!TOKEN_SECRET) {
  try { TOKEN_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim(); } catch (e) {}
  if (!TOKEN_SECRET) {
    TOKEN_SECRET = crypto.randomBytes(48).toString('hex');
    try { fs.writeFileSync(SECRET_FILE, TOKEN_SECRET); } catch (e) { console.error('Écriture secret échouée:', e.message); }
  }
}
const TOKEN_TTL = 30 * 24 * 3600 * 1000; // 30 jours
function b64u(buf){ return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function signToken(username){
  const payload = b64u(JSON.stringify({ u: username, exp: Date.now() + TOKEN_TTL }));
  const sig = b64u(crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest());
  return payload + '.' + sig;
}
function verifyToken(token){
  if (typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const parts = token.split('.');
  const payload = parts[0], sig = parts[1] || '';
  const expected = b64u(crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest());
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString()); } catch (e) { return null; }
  if (!data || !data.u || !data.exp || Date.now() > data.exp) return null;
  return data.u;
}
function tokenFrom(req){ return verifyToken(String(req.headers.authorization || '').replace(/^Bearer /, '')); }

// Limiteur de débit en mémoire (par clé : IP, compte…)
const rl = {};
function rateLimit(key, max, windowMs){
  const now = Date.now();
  const arr = (rl[key] || []).filter(t => now - t < windowMs);
  arr.push(now);
  rl[key] = arr;
  return arr.length <= max;
}
setInterval(() => { const now = Date.now(); for (const k in rl){ rl[k] = rl[k].filter(t => now - t < 3600000); if (!rl[k].length) delete rl[k]; } }, 3600000).unref();

// Blocage temporaire d'un compte après trop d'échecs de connexion
const failedLogins = {};
function noteLoginFail(key){
  const f = failedLogins[key] || { count: 0, until: 0 };
  f.count++;
  if (f.count >= 5) { f.until = Date.now() + 15 * 60000; f.count = 0; }
  failedLogins[key] = f;
}

// Tous les essais déjà enregistrés (le jeu s'en sert pour classer le joueur)
app.get('/api/records', (req, res) => {
  res.json(records);
});

// Enregistre un nouvel essai terminé (identité vérifiée par le jeton)
app.post('/api/records', (req, res) => {
  const user = tokenFrom(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Session expirée — reconnecte-toi.' });
  if (!rateLimit('rec:' + user, 30, 3600000)) return res.status(429).json({ ok: false, error: 'Trop d’envois, réessaie plus tard.' });
  const b = req.body || {};
  const total = Number(b.total);
  const splits = Array.isArray(b.splits) ? b.splits.map(Number) : [];
  if (!isFinite(total) || total <= 0 || !splits.length || splits.some(x => !isFinite(x))) {
    return res.status(400).json({ ok: false, error: 'invalid' });
  }
  records.push({ name: user, total, splits, date: Date.now() }); // nom = identité du jeton, pas du corps
  if (records.length > MAX_RECORDS) records = records.slice(records.length - MAX_RECORDS);
  saveRecords();
  res.json({ ok: true });
});

// ─── COMPTES JOUEURS (inscription / connexion) ──────────────────────────────────
// Chaque joueur crée son propre compte. Les codes sont chiffrés (scrypt + sel),
// jamais stockés en clair. Fichier persistant sur le Volume (comme les records).
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
let accounts = {};
try {
  accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  if (!accounts || typeof accounts !== 'object') accounts = {};
} catch (e) { accounts = {}; }
function saveAccounts() {
  try { fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts)); }
  catch (e) { console.error('Sauvegarde comptes échouée:', e.message); }
}
function hashCode(code, salt) {
  return crypto.scryptSync(String(code), salt, 64).toString('hex');
}

// Créer un compte
app.post('/api/register', (req, res) => {
  if (!rateLimit('reg:' + req.ip, 5, 3600000)) {
    return res.status(429).json({ ok: false, error: 'Trop de créations de compte depuis ce réseau. Réessaie plus tard.' });
  }
  const b = req.body || {};
  const username = (typeof b.username === 'string' ? b.username : '').trim().slice(0, 20);
  const code = typeof b.code === 'string' ? b.code : '';
  if (username.length < 3 || !/^[\p{L}0-9 _-]+$/u.test(username)) {
    return res.status(400).json({ ok: false, error: 'Identifiant invalide (3 à 20 caractères : lettres, chiffres, espace, - ou _).' });
  }
  if (code.length < 6 || code.length > 128) {
    return res.status(400).json({ ok: false, error: 'Code invalide (6 caractères minimum).' });
  }
  const key = username.toLowerCase();
  if (accounts[key]) {
    return res.status(409).json({ ok: false, error: 'Cet identifiant est déjà pris.' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  accounts[key] = { name: username, salt, hash: hashCode(code, salt), created: Date.now() };
  saveAccounts();
  res.json({ ok: true, username, token: signToken(username) });
});

// Se connecter
app.post('/api/login', (req, res) => {
  if (!rateLimit('login:' + req.ip, 20, 900000)) {
    return res.status(429).json({ ok: false, error: 'Trop de tentatives. Réessaie dans quelques minutes.' });
  }
  const b = req.body || {};
  const username = (typeof b.username === 'string' ? b.username : '').trim();
  const code = typeof b.code === 'string' ? b.code : '';
  const key = username.toLowerCase();
  const lock = failedLogins[key];
  if (lock && lock.until > Date.now()) {
    return res.status(429).json({ ok: false, error: 'Compte temporairement bloqué (trop d’essais). Réessaie plus tard.' });
  }
  const acc = accounts[key];
  // Message générique (on ne révèle pas si l'identifiant existe)
  if (!acc) { noteLoginFail(key); return res.status(401).json({ ok: false, error: 'Identifiant ou code incorrect.' }); }
  const h = hashCode(code, acc.salt);
  const ok = h.length === acc.hash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(acc.hash));
  if (!ok) { noteLoginFail(key); return res.status(401).json({ ok: false, error: 'Identifiant ou code incorrect.' }); }
  delete failedLogins[key];
  res.json({ ok: true, username: acc.name, token: signToken(acc.name) });
});

// Vérifier une session (jeton)
app.get('/api/me', (req, res) => {
  const user = tokenFrom(req);
  if (!user) return res.status(401).json({ ok: false });
  res.json({ ok: true, username: user });
});

const MAX_JOUEURS = 20;
const ANNEES_DISPO = Object.keys(DATA).map(Number).sort((a,b)=>a-b);
const PTS_WRC = [25,18,15,12,10,8,6,4,2,1];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function melanger(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function tirerAuSort(arr, n) { return melanger(arr).slice(0, n); }

function genererCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random()*chars.length)];
  return rooms[code] ? genererCode() : code;
}

function newJoueur(id, nom, estHote) {
  return { id, nom, estHote, picks:{pilote:null,copilote:null,voiture:null}, relanceDisponible:true, strategie:null, aValide:false, aCliqueSuivant:false, pointsSaison:0 };
}

// ─── CALCUL PERF ──────────────────────────────────────────────────────────────



function calcInc(car, rallye, strategie) {
  let fib = car.fib;
  if (strategie === 'prudent') fib = Math.min(1, fib + 0.10);
  if (strategie === 'attaque') fib = Math.max(0, fib - 0.10);
  const risk = (1-fib) * (1+rallye.cas);
  const t = Math.random();
  if (t < risk * 0.33) return { type:'Abandon', pen:999999 };
  if (t < risk * 0.67) return { type:'Panne', pen:60 };
  if (t < risk)        return { type:'Crevaison', pen:30 };
  return { type:'OK', pen:0 };
}

function scoreObj(e, r) {
  return (e.asp||80)*r.asp + (e.ter||80)*r.ter + (e.nei||80)*r.nei +
         (e.sec||80)*r.sec + (e.plu||80)*r.plu + (e.rap||80)*r.rap + (e.sin||80)*r.sin;
}

function precalcScore(pilote, copilote, voiture, rallye) {
  // Calcule la note de base (0-100) pour cet équipage sur ce rallye
  const r = rallye;
  const somme = r.asp + r.ter + r.nei + r.sec + r.plu + r.rap + r.sin;
  const sp = scoreObj({ asp:pilote?.asp||80, ter:pilote?.ter||80, nei:pilote?.nei||80, sec:pilote?.sec||80, plu:pilote?.plu||80, rap:pilote?.rap||80, sin:pilote?.sin||80 }, r);
  const sc = scoreObj({ asp:copilote?.asp||80, ter:copilote?.ter||80, nei:copilote?.nei||80, sec:copilote?.sec||80, plu:copilote?.plu||80, rap:copilote?.rap||80, sin:copilote?.sin||80 }, r);
  const sv = scoreObj({ asp:voiture?.asp||80, ter:voiture?.ter||80, nei:voiture?.nei||80, sec:voiture?.sec||80, plu:voiture?.plu||80, rap:voiture?.rap||80, sin:voiture?.sin||80 }, r);
  return (sp + sc + sv) / (3 * somme);
}

function simulerRallye(room) {
  const rallye = room.rallyes[room.rallyeActuel];
  const idx = room.rallyeActuel;
  const resultats = [];

  // Joueurs humains
  for (const j of room.joueurs) {
    const { pilote, copilote, voiture } = j.picks;
    const inc = calcInc(voiture, rallye, j.strategie);
    if (inc.pen >= 999999) {
      resultats.push({ nom:j.nom, equipe:`${pilote.nom} / ${copilote?.nom||''}`, voiture:voiture.nom, temps:999999, points:0, incident:'Abandon', estJoueur:true, id:j.id });
      continue;
    }
    let perf = j.scoresRallyes ? j.scoresRallyes[idx] : precalcScore(pilote, copilote, voiture, rallye);

    if (j.strategie === 'prudent') perf *= 0.98;
    if (j.strategie === 'attaque') perf *= 1.02;
    perf *= (0.98 + Math.random()*0.04);
    let temps = 3600 - (perf - 85) * 10;
    if (inc.pen) temps += inc.pen;
    resultats.push({ nom:j.nom, equipe:`${pilote.nom} / ${copilote?.nom||''}`, voiture:voiture.nom, temps, points:0, incident:inc.pen?(inc.type==='Panne'?'Panne':'Crevaison'):null, estJoueur:true, id:j.id });
  }

  // Rivaux IA
  if (room.avecRivaux && room.rivaux.length > 0) {
    const nbRivaux = Math.min(20 - room.joueurs.length, room.rivaux.length);
    for (let i = 0; i < nbRivaux; i++) {
      const r = room.rivaux[i];
      const inc = calcInc({ fib: r.driver.vfib || r.driver.fib }, rallye, 'normal');
      if (inc.pen >= 999999) {
        resultats.push({ nom:r.driver.pilote, equipe:`${r.driver.pilote} / ${r.driver.copilote}`, voiture:r.driver.voiture, temps:999999, points:0, incident:'Abandon', estJoueur:false });
        continue;
      }
      const rivCop = { asp:r.driver.casp, ter:r.driver.cter, nei:r.driver.cnei, sec:r.driver.csec, plu:r.driver.cplu, rap:r.driver.crap, sin:r.driver.csin };
      const rivVoit = { asp:r.driver.vasp, ter:r.driver.vter, nei:r.driver.vnei, sec:r.driver.vsec, plu:r.driver.vplu, rap:r.driver.vrap, sin:r.driver.vsin };
      let perf = r.scoresRallyes ? r.scoresRallyes[idx] : precalcScore(r.driver, rivCop, rivVoit, rallye);
      perf *= (0.98 + Math.random()*0.04);
      let temps = 3600 - (perf - 85) * 10;
      if (inc.pen) temps += inc.pen;
      resultats.push({ nom:r.driver.pilote, equipe:`${r.driver.pilote} / ${r.driver.copilote}`, voiture:r.driver.voiture, temps, points:0, incident:inc.pen?(inc.type==='Panne'?'Panne':'Crevaison'):null, estJoueur:false });
    }
  }

  // Trier et attribuer points
  resultats.sort((a,b) => a.temps - b.temps);
  let rang = 0;
  for (const r of resultats) {
    if (r.temps >= 999999) { r.rang = 99; continue; }
    r.points = PTS_WRC[rang] || 0;
    r.rang = rang + 1;
    rang++;
  }

  // Accumuler points
  for (const r of resultats) {
    if (r.estJoueur) {
      const j = room.joueurs.find(j => j.id === r.id);
      if (j) j.pointsSaison += r.points;
    } else {
      if (!room.pointsRivaux) room.pointsRivaux = {};
      room.pointsRivaux[r.nom||r.equipe] = (room.pointsRivaux[r.nom||r.equipe]||0) + r.points;
    }
  }

  // Ordre de révélation calculé côté serveur — identique pour tous les joueurs
  const melange=[...resultats];
  for(let i=melange.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[melange[i],melange[j]]=[melange[j],melange[i]];}
  melange.forEach((r,i)=>{r.revealIndex=i;});

  return resultats;
}

function creerRivaux(annee) {
  const d = DATA[annee];
  if (!d || !d.length) return [];
  return d.map(eq => ({ driver: eq, car: { nom: eq.voiture } }));
}

function proposerItems(room, joueurId) {
  const N = room.joueurs.length;
  const roundIdx = Math.floor(room.tourIndex / N); // 0 = pilotes, 1 = copilotes, 2 = voitures
  const type = roundIdx === 0 ? 'pilote' : roundIdx === 1 ? 'copilote' : 'voiture';
  const anneesDispos = room.anneesSelectionnees.length > 0 ? room.anneesSelectionnees : ANNEES_DISPO;
  const rndAnnee = () => anneesDispos[Math.floor(Math.random()*anneesDispos.length)];
  const rndEq = (annee) => {
    const pool = DATA[annee] || DATA[ANNEES_DISPO[0]];
    return pool[Math.floor(Math.random()*pool.length)];
  };

  const proposals = [];
  const seen = new Set();
  let guard = 0;
  while (proposals.length < 3 && guard < 300) {
    guard++;
    if (type === 'pilote') {
      const annee = rndAnnee();
      const eq = rndEq(annee);
      if (!eq || seen.has('p|'+eq.pilote)) continue;
      seen.add('p|'+eq.pilote);
      proposals.push({ type:'pilote', item:{ nom:eq.pilote, asp:eq.asp, ter:eq.ter, nei:eq.nei, sec:eq.sec, plu:eq.plu, rap:eq.rap, sin:eq.sin, fib:eq.fib }, annee, disponible:true });
    } else if (type === 'copilote') {
      const annee = rndAnnee();
      const eq = rndEq(annee);
      if (!eq || !eq.copilote || seen.has('c|'+eq.copilote)) continue;
      seen.add('c|'+eq.copilote);
      proposals.push({ type:'copilote', item:{ nom:eq.copilote, asp:eq.casp, ter:eq.cter, nei:eq.cnei, sec:eq.csec, plu:eq.cplu, rap:eq.crap, sin:eq.csin, fib:eq.cfib }, annee, disponible:true });
    } else {
      // Voiture : si l'année est déjà verrouillée par le 1er joueur, on n'y propose que des voitures de cette année.
      const annee = room.anneeVerrouillee || rndAnnee();
      const pool = DATA[annee] || DATA[ANNEES_DISPO[0]];
      const voitures = [...new Set(pool.map(e => e.voiture))];
      if (!voitures.length) continue;
      const voitureNom = voitures[Math.floor(Math.random()*voitures.length)];
      if (seen.has('v|'+annee+'|'+voitureNom)) continue;
      seen.add('v|'+annee+'|'+voitureNom);
      const eqV = pool.find(e => e.voiture === voitureNom);
      proposals.push({ type:'voiture', item:{ nom:voitureNom, asp:eqV.vasp, ter:eqV.vter, nei:eqV.vnei, sec:eqV.vsec, plu:eqV.vplu, rap:eqV.vrap, sin:eqV.vsin, fib:eqV.vfib }, annee, disponible:true });
    }
  }

  return proposals;
}

// ─── ROOMS ────────────────────────────────────────────────────────────────────

const rooms = {};

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {

  socket.on('ouvrir_room', ({ nom, avecRivaux, anneesSelectionnees, nbRallyes }) => {
    const code = genererCode();
    const anneesFiltrees = Array.isArray(anneesSelectionnees) && anneesSelectionnees.length > 0
      ? anneesSelectionnees.filter(a => ANNEES_DISPO.includes(a))
      : [...ANNEES_DISPO];
    const nbR = [1,5,10,15].includes(nbRallyes) ? nbRallyes : 10;

    rooms[code] = {
      code, hoteId:socket.id,
      anneeVerrouillee:null,
      anneesSelectionnees:anneesFiltrees,
      avecRivaux: typeof avecRivaux === 'boolean' ? avecRivaux : true,
      nbRallyes: nbR,
      phase:'lobby', tourIndex:0,
      joueurs:[], rallyes:[], rallyeActuel:0,
      rivaux:[], pointsRivaux:{},
      derniersResultats:null, propositionsCourantes:null,
    };
    rooms[code].joueurs.push(newJoueur(socket.id, (nom||'Hôte').trim().slice(0,12), true));
    socket.join(code);
    socket.emit('room_creee', { code });
    io.to(code).emit('room_update', etatPublic(rooms[code]));
  });

  socket.on('rejoindre_room', ({ code, nom }) => {
    const room = rooms[code];
    if (!room) { socket.emit('erreur', 'Room introuvable'); return; }
    if (room.phase !== 'lobby') { socket.emit('erreur', 'Partie déjà commencée'); return; }
    if (room.joueurs.length >= MAX_JOUEURS) { socket.emit('erreur', `Room pleine (max ${MAX_JOUEURS})`); return; }
    if (room.joueurs.find(j => j.id === socket.id)) return;
    room.joueurs.push(newJoueur(socket.id, (nom||'Joueur').trim().slice(0,12), false));
    socket.join(code);
    socket.emit('room_rejointe', { code });
    io.to(code).emit('room_update', etatPublic(room));
  });

  socket.on('lancer_draft', ({ code }) => {
    const room = rooms[code];
    if (!room || room.hoteId !== socket.id) return;
    if (room.joueurs.length < 2) { socket.emit('erreur', 'Il faut au moins 2 joueurs'); return; }
    room.phase = 'draft';
    room.tourIndex = 0;
    room.rallyes = tirerAuSort(RALLYES, room.nbRallyes);
    lancerTourDraft(room);
    io.to(code).emit('room_update', etatPublic(room));
  });

  socket.on('faire_pick', ({ code, index }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'draft') return;
    const joueurActif = room.joueurs[room.tourIndex % room.joueurs.length];
    if (joueurActif.id !== socket.id) return;
    const prop = room.propositionsCourantes && room.propositionsCourantes[index];
    if (!prop) return;

    joueurActif.picks[prop.type] = prop.item;

    if (prop.type === 'voiture' && !room.anneeVerrouillee) {
      room.anneeVerrouillee = prop.annee;
      room.rivaux = creerRivaux(room.anneeVerrouillee);
      io.to(code).emit('annee_verrouillee', { annee:room.anneeVerrouillee, joueur:joueurActif.nom });
    }

    io.to(code).emit('pick_effectue', { joueurNom:joueurActif.nom, type:prop.type, item:prop.item, annee:prop.annee });
    room.tourIndex++;
    const total = room.joueurs.length * 3;

    setTimeout(() => {
      if (room.tourIndex >= total) {
        room.phase = 'equipes';
        io.to(code).emit('room_update', etatPublic(room));
      } else {
        lancerTourDraft(room);
        io.to(code).emit('room_update', etatPublic(room));
      }
    }, 1800);
  });

  socket.on('utiliser_relance', ({ code }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'draft') return;
    const joueurActif = room.joueurs[room.tourIndex % room.joueurs.length];
    if (joueurActif.id !== socket.id || !joueurActif.relanceDisponible) return;
    joueurActif.relanceDisponible = false;
    lancerTourDraft(room);
    io.to(code).emit('room_update', etatPublic(room));
    io.to(code).emit('relance_utilisee', { joueurNom:joueurActif.nom });
  });

  socket.on('valider_strategie', ({ code, strategie }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'strategie') return;
    const j = room.joueurs.find(j => j.id === socket.id);
    if (!j || j.aValide) return;
    j.strategie = strategie;
    j.aValide = true;
    io.to(code).emit('strategie_validee', { joueurNom:j.nom });
    io.to(code).emit('room_update', etatPublic(room));
    if (room.joueurs.every(j => j.aValide)) {
      setTimeout(() => {
        room.phase = 'resultats';
        room.derniersResultats = simulerRallye(room);
        io.to(code).emit('resultats_rallye', { resultats:room.derniersResultats, rallye:room.rallyes[room.rallyeActuel], rallyeNum:room.rallyeActuel+1 });
        io.to(code).emit('room_update', etatPublic(room));
      }, 800);
    }
  });

  socket.on('cliquer_suivant', ({ code }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'resultats') return;
    const j = room.joueurs.find(j => j.id === socket.id);
    if (!j || j.aCliqueSuivant) return;
    j.aCliqueSuivant = true;
    io.to(code).emit('room_update', etatPublic(room));
    if (room.joueurs.every(j => j.aCliqueSuivant)) {
      room.rallyeActuel++;
      if (room.rallyeActuel >= room.rallyes.length) {
        room.phase = 'fin';
      } else {
        room.phase = 'strategie';
        room.joueurs.forEach(j => { j.strategie=null; j.aValide=false; j.aCliqueSuivant=false; });
      }
      io.to(code).emit('room_update', etatPublic(room));
    }
  });

  socket.on('lancer_saison', ({ code }) => {
    const room = rooms[code];
    if (!room || room.hoteId !== socket.id) return;

    // Précalculer les scores de base pour chaque joueur sur chaque rallye
    for (const j of room.joueurs) {
      if(j.picks.pilote && j.picks.copilote && j.picks.voiture){
        j.scoresRallyes = room.rallyes.map(rallye => precalcScore(j.picks.pilote, j.picks.copilote, j.picks.voiture, rallye));
      } else {
        j.scoresRallyes = room.rallyes.map(()=>80); // fallback si picks incomplets
      }
    }
    // Précalculer les scores pour chaque rival
    for (const r of room.rivaux) {
      const cop = { asp:r.driver.casp, ter:r.driver.cter, nei:r.driver.cnei, sec:r.driver.csec, plu:r.driver.cplu, rap:r.driver.crap, sin:r.driver.csin };
      const voit = { asp:r.driver.vasp, ter:r.driver.vter, nei:r.driver.vnei, sec:r.driver.vsec, plu:r.driver.vplu, rap:r.driver.vrap, sin:r.driver.vsin };
      r.scoresRallyes = room.rallyes.map(rallye => precalcScore(r.driver, cop, voit, rallye));
    }

    room.phase = 'strategie';
    room.joueurs.forEach(j => { j.strategie=null; j.aValide=false; j.aCliqueSuivant=false; });
    io.to(code).emit('room_update', etatPublic(room));
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      const idx = room.joueurs.findIndex(j => j.id === socket.id);
      if (idx !== -1) {
        const nom = room.joueurs[idx].nom;
        room.joueurs.splice(idx, 1);
        if (room.joueurs.length === 0) { delete rooms[code]; }
        else {
          if (room.hoteId === socket.id) room.hoteId = room.joueurs[0].id;
          io.to(code).emit('joueur_deconnecte', { nom });
          io.to(code).emit('room_update', etatPublic(room));
        }
      }
    }
  });
});

function lancerTourDraft(room) {
  const joueurActif = room.joueurs[room.tourIndex % room.joueurs.length];
  const props = proposerItems(room, joueurActif.id);
  room.propositionsCourantes = props;
  io.to(room.code).emit('nouvelles_propositions', { joueurId:joueurActif.id, joueurNom:joueurActif.nom, propositions:props, tourGlobal:room.tourIndex });
}

function etatPublic(room) {
  return {
    code:room.code, phase:room.phase,
    anneeVerrouillee:room.anneeVerrouillee,
    anneesSelectionnees:room.anneesSelectionnees,
    avecRivaux:room.avecRivaux,
    nbRallyes:room.nbRallyes,
    tourIndex:room.tourIndex,
    hoteId:room.hoteId,
    rallyeActuel:room.rallyeActuel,
    rallyes:room.rallyes,
    joueurs:room.joueurs.map(j => ({
      id:j.id, nom:j.nom, estHote:j.estHote,
      picks:j.picks, relanceDisponible:j.relanceDisponible,
      aValide:j.aValide, aCliqueSuivant:j.aCliqueSuivant,
      pointsSaison:j.pointsSaison,
    })),
    pointsRivaux:room.pointsRivaux||{},
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`AZrallyegame — port ${PORT}`));
