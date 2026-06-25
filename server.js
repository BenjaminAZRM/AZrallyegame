const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { RALLYES, DATA } = require('./wrc-data.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

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

function basePerf(driver, car, rallye) {
  // Driver stats: asp,ter,nei,sec,plu,rap,sin + copilote stats: casp,cter,cnei,csec,cplu,crap,csin
  const r = rallye;
  const driverScore = driver.asp*r.asp + driver.ter*r.ter + driver.nei*r.nei +
                      driver.sec*r.sec + driver.plu*r.plu + driver.rap*r.rap + driver.sin*r.sin;
  const copScore    = driver.casp*r.asp + driver.cter*r.ter + driver.cnei*r.nei +
                      driver.csec*r.sec + driver.cplu*r.plu + driver.crap*r.rap + driver.csin*r.sin;
  const carScore    = car.asp*r.asp + car.ter*r.ter + car.nei*r.nei +
                      car.sec*r.sec + car.plu*r.plu + car.rap*r.rap + car.sin*r.sin;
  const somme = r.asp+r.ter+r.nei+r.sec+r.plu+r.rap+r.sin;
  return (driverScore + copScore + carScore) / (3 * somme);
}

function calcInc(car, rallye, strategie) {
  let fib = car.fib;
  if (strategie === 'prudent') fib = Math.min(1, fib + 0.15);
  if (strategie === 'attaque') fib = Math.max(0, fib - 0.20);
  const risk = (1-fib) * (1+rallye.cas);
  const t = Math.random();
  if (t < risk * 0.33) return { type:'Abandon', pen:Infinity };
  if (t < risk * 0.67) return { type:'Panne', pen:60 };
  if (t < risk)        return { type:'Crevaison', pen:30 };
  return { type:'OK', pen:0 };
}

function simulerRallye(room) {
  const rallye = room.rallyes[room.rallyeActuel];
  const resultats = [];

  // Joueurs humains
  for (const j of room.joueurs) {
    const { pilote, voiture } = j.picks;
    const inc = calcInc(voiture, rallye, j.strategie);
    if (inc.type === 'Abandon') {
      resultats.push({ nom:j.nom, equipe:`${pilote.nom} / ${pilote.cop}`, voiture:voiture.nom, temps:Infinity, points:0, incident:'Abandon', estJoueur:true, id:j.id });
      continue;
    }
    let perf = basePerf(pilote, voiture, rallye);
    if (j.strategie === 'prudent') perf *= 0.95;
    if (j.strategie === 'attaque') perf *= 1.08;
    perf *= (0.95 + Math.random()*0.10);
    let temps = 3600 - (perf - 85) * 10;
    if (inc.pen) temps += inc.pen;
    resultats.push({ nom:j.nom, equipe:`${pilote.nom} / ${pilote.cop}`, voiture:voiture.nom, temps, points:0, incident:inc.pen?(inc.type==='Panne'?'+60s Panne':'+30s Crevaison'):null, estJoueur:true, id:j.id });
  }

  // Rivaux IA
  if (room.avecRivaux && room.rivaux.length > 0) {
    const nbRivaux = Math.min(20 - room.joueurs.length, room.rivaux.length);
    for (let i = 0; i < nbRivaux; i++) {
      const r = room.rivaux[i];
      const inc = calcInc(r.car, rallye, 'normal');
      if (inc.type === 'Abandon') {
        resultats.push({ nom:r.driver.nom, equipe:`${r.driver.nom} / ${r.driver.cop}`, voiture:r.car.nom, temps:Infinity, points:0, incident:'Abandon', estJoueur:false });
        continue;
      }
      let perf = basePerf(r.driver, r.car, rallye);
      perf *= (0.95 + Math.random()*0.10);
      let temps = 3600 - (perf - 85) * 10;
      if (inc.pen) temps += inc.pen;
      resultats.push({ nom:r.driver.nom, equipe:`${r.driver.nom} / ${r.driver.cop}`, voiture:r.car.nom, temps, points:0, estJoueur:false });
    }
  }

  // Trier et attribuer points
  resultats.sort((a,b) => a.temps - b.temps);
  let rang = 0;
  for (const r of resultats) {
    if (!isFinite(r.temps)) { r.rang = 99; continue; }
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
      room.pointsRivaux[r.nom] = (room.pointsRivaux[r.nom]||0) + r.points;
    }
  }

  return resultats;
}

function creerRivaux(annee) {
  const d = DATA[annee];
  if (!d) return [];
  return d.drivers.map(driver => {
    // Find matching car by voiture field
    const car = d.cars.find(c => c.nom === driver.voiture) || d.cars[0];
    return { driver, car };
  });
}

function proposerItems(room, joueurId) {
  const j = room.joueurs.find(j => j.id === joueurId);
  const anneesDispos = room.anneesSelectionnees.length > 0 ? room.anneesSelectionnees : ANNEES_DISPO;

  const rndAnnee = () => anneesDispos[Math.floor(Math.random()*anneesDispos.length)];

  // Voiture : année verrouillée si définie
  const anneeVoiture = room.anneeVerrouillee || rndAnnee();
  const anneePilote  = rndAnnee();

  const proposals = [];
  const typesManquants = ['pilote','copilote','voiture'].filter(t => !j.picks[t]);

  // Pilote (inclut copilote dans les données)
  const dataPilote = DATA[anneePilote] || DATA[ANNEES_DISPO[0]];
  const pilote = dataPilote.drivers[Math.floor(Math.random()*dataPilote.drivers.length)];
  proposals.push({ type:'pilote', item:{ nom:pilote.nom, fib:pilote.fib, asp:pilote.asp, ter:pilote.ter, nei:pilote.nei, sec:pilote.sec, plu:pilote.plu, rap:pilote.rap, sin:pilote.sin, cop:pilote.cop, voiture:pilote.voiture }, annee:anneePilote, disponible:typesManquants.includes('pilote') });

  // Copilote (nom du copilote associé au pilote tiré)
  const anneeCop = rndAnnee();
  const dataCop = DATA[anneeCop] || DATA[ANNEES_DISPO[0]];
  const piloteCop = dataCop.drivers[Math.floor(Math.random()*dataCop.drivers.length)];
  proposals.push({ type:'copilote', item:{ nom:piloteCop.cop, fib:piloteCop.cfib, asp:piloteCop.casp, ter:piloteCop.cter, nei:piloteCop.cnei, sec:piloteCop.csec, plu:piloteCop.cplu, rap:piloteCop.crap, sin:piloteCop.csin }, annee:anneeCop, disponible:typesManquants.includes('copilote') });

  // Voiture
  const dataVoiture = DATA[anneeVoiture] || DATA[ANNEES_DISPO[0]];
  const voiture = dataVoiture.cars[Math.floor(Math.random()*dataVoiture.cars.length)];
  proposals.push({ type:'voiture', item:{ nom:voiture.nom, fib:voiture.fib, asp:voiture.asp, ter:voiture.ter, nei:voiture.nei, sec:voiture.sec, plu:voiture.plu, rap:voiture.rap, sin:voiture.sin }, annee:anneeVoiture, disponible:typesManquants.includes('voiture') });

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
    rooms[code].joueurs.push(newJoueur(socket.id, (nom||'Hôte').trim().slice(0,5), true));
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
    room.joueurs.push(newJoueur(socket.id, (nom||'Joueur').trim().slice(0,5), false));
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

  socket.on('faire_pick', ({ code, type }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'draft') return;
    const joueurActif = room.joueurs[room.tourIndex % room.joueurs.length];
    if (joueurActif.id !== socket.id) return;
    const prop = room.propositionsCourantes.find(p => p.type === type && p.disponible);
    if (!prop) return;

    joueurActif.picks[type] = prop.item;

    if (type === 'voiture' && !room.anneeVerrouillee) {
      room.anneeVerrouillee = prop.annee;
      room.rivaux = creerRivaux(room.anneeVerrouillee);
      io.to(code).emit('annee_verrouillee', { annee:room.anneeVerrouillee, joueur:joueurActif.nom });
    }

    io.to(code).emit('pick_effectue', { joueurNom:joueurActif.nom, type, item:prop.item, annee:prop.annee });
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
