// ─── CHRONO RALLYE RACE — ROUTES SERVEUR ───────────────────────────────────────
// Se greffe sur l'existant : réutilise l'authentification (jetons signés),
// le rate-limit et le stockage (Postgres si dispo, sinon fichier sur le Volume).
// Le client n'envoie JAMAIS de temps : il envoie ses choix, le serveur recalcule.
'use strict';

const fs = require('fs');
const path = require('path');
const E = require('./crr-engine.js');
const { RALLYES } = require('./crr-rallyes.js');

module.exports = function mountCRR(deps) {
  const { app, pool, isDbReady, tokenFrom, rateLimit, DATA_DIR } = deps;

  // ── Stockage ────────────────────────────────────────────────────────────────
  const FILE = path.join(DATA_DIR, 'crr.json');
  let store = { ecuries: {}, jokers: {}, completions: {}, resultats: {}, rallyes: {} };
  // rallyes : { id: {...} } — rallyes créés/édités via la page admin (priment sur crr-rallyes.js)
  // resultats : { rallyeId: { crewId: { ES1: 3, ES2: 'Ab', ... } } } — saisis via la page admin
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (raw && typeof raw === 'object') store = {
      ecuries: raw.ecuries || {}, jokers: raw.jokers || {}, completions: raw.completions || {},
      resultats: raw.resultats || {}, rallyes: raw.rallyes || {},
    };
  } catch (e) { /* premier lancement */ }

  // ── Compte administrateur ───────────────────────────────────────────────────
  // Défini par la variable d'environnement CRR_ADMIN (modifiable dans Railway
  // sans toucher au code). Valeur de repli : 'zezeben'.
  const ADMIN = (process.env.CRR_ADMIN || 'zezeben').trim().toLowerCase();
  function estAdmin(req) {
    const u = tokenFrom(req);
    return u && String(u).trim().toLowerCase() === ADMIN ? u : null;
  }
  function saveFile() {
    try { fs.writeFileSync(FILE, JSON.stringify(store)); }
    catch (e) { console.error('CRR sauvegarde fichier échouée:', e.message); }
  }

  // Les tables sont créées dès que Postgres répond. On ne se fie PAS à isDbReady()
  // au démarrage : server.js le met à true plus tard (à la fin de initDb()), donc
  // au moment où ce module est monté le drapeau est encore false. On attend donc
  // que la base réponde, puis on crée les tables.
  let tablesPretes = false;

  async function initTables(essai) {
    essai = essai || 1;
    if (!pool) { console.log('CRR — stockage : FICHIER (pas de Postgres)'); return; }
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS crr_config (
        cle  TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        maj  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS crr_resultats (
        rallye TEXT PRIMARY KEY,
        data   TEXT NOT NULL,
        maj    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS crr_ecuries (
        rallye TEXT NOT NULL,
        joueur TEXT NOT NULL,
        equipages JSONB NOT NULL,
        voiture TEXT NOT NULL,
        cout INT NOT NULL,
        cree BIGINT NOT NULL,
        PRIMARY KEY (rallye, joueur)
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS crr_jokers (
        rallye TEXT NOT NULL,
        joueur TEXT NOT NULL,
        joker TEXT NOT NULL,
        ss TEXT NOT NULL,
        equipage TEXT NOT NULL,
        pose BIGINT NOT NULL,
        PRIMARY KEY (rallye, joueur, joker)
      )`);
      tablesPretes = true;
      console.log('CRR — stockage : POSTGRES ✔ (tables prêtes)');
      chargerResultatsDb();          // récupère les résultats saisis en admin
      chargerRallyesDb();            // récupère les rallyes créés en admin
    } catch (e) {
      // Postgres pas encore joignable au démarrage : on réessaie quelques fois.
      if (essai < 5) {
        console.log('CRR — Postgres pas encore prêt (essai ' + essai + '), nouvelle tentative dans 3s…');
        setTimeout(() => initTables(essai + 1), 3000);
      } else {
        console.error('CRR — tables indisponibles → repli fichier :', e.message);
      }
    }
  }
  initTables();

  // Postgres n'est utilisé que si les tables existent VRAIMENT.
  // Sinon on écrit dans le fichier du Volume : le jeu marche quand même.
  function pg() { return !!pool && tablesPretes && isDbReady(); }

  const cle = (r, u) => r + '|' + u;

  // Mémorise l'instant où un rallye devient complet (toutes spéciales saisies).
  // Renvoie ce timestamp (ou null si le rallye n'est pas encore complet).
  function completeDepuis(r) {
    if (!E.pret(r)) return null;
    const nb = r.speciales.length;
    const courues = r.speciales.filter((s, i) => E.speciqleCourue(r, i)).length;
    if (!(courues >= nb && nb > 0)) return null;      // pas complet
    if (!store.completions[r.id]) {                   // 1re fois qu'on le voit complet
      store.completions[r.id] = Date.now();
      saveFile();
    }
    return store.completions[r.id];
  }
  // état d'un rallye en tenant compte de la période de grâce de 24 h
  function etatDe(r, now) { return E.etat(r, now || Date.now(), completeDepuis(r)); }

  async function getEcurie(rallyeId, user) {
    if (pg()) {
      const q = await pool.query('SELECT equipages,voiture,cout FROM crr_ecuries WHERE rallye=$1 AND joueur=$2', [rallyeId, user]);
      if (!q.rowCount) return null;
      const r = q.rows[0];
      return { user, equipages: r.equipages, voiture: r.voiture, cout: r.cout };
    }
    return store.ecuries[cle(rallyeId, user)] || null;
  }
  async function getEcuries(rallyeId) {
    if (pg()) {
      const q = await pool.query('SELECT joueur,equipages,voiture,cout FROM crr_ecuries WHERE rallye=$1', [rallyeId]);
      return q.rows.map(r => ({ user: r.joueur, equipages: r.equipages, voiture: r.voiture, cout: r.cout }));
    }
    return Object.keys(store.ecuries)
      .filter(k => k.startsWith(rallyeId + '|'))
      .map(k => store.ecuries[k]);
  }
  async function setEcurie(rallyeId, ec) {
    if (pg()) {
      await pool.query(
        `INSERT INTO crr_ecuries (rallye,joueur,equipages,voiture,cout,cree) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (rallye,joueur) DO UPDATE SET equipages=$3, voiture=$4, cout=$5, cree=$6`,
        [rallyeId, ec.user, JSON.stringify(ec.equipages), ec.voiture, ec.cout, Date.now()]
      );
      return;
    }
    store.ecuries[cle(rallyeId, ec.user)] = ec;
    saveFile();
  }
  async function getJokers(rallyeId, user) {
    if (pg()) {
      const q = await pool.query('SELECT joker,ss,equipage FROM crr_jokers WHERE rallye=$1 AND joueur=$2', [rallyeId, user]);
      return q.rows;
    }
    return store.jokers[cle(rallyeId, user)] || [];
  }
  async function getTousJokers(rallyeId) {
    const par = {};
    if (pg()) {
      const q = await pool.query('SELECT joueur,joker,ss,equipage FROM crr_jokers WHERE rallye=$1', [rallyeId]);
      q.rows.forEach(r => { (par[r.joueur] = par[r.joueur] || []).push({ joker: r.joker, ss: r.ss, equipage: r.equipage }); });
      return par;
    }
    for (const k in store.jokers) {
      if (!k.startsWith(rallyeId + '|')) continue;
      par[k.split('|')[1]] = store.jokers[k];
    }
    return par;
  }
  async function addJoker(rallyeId, user, jk) {
    if (pg()) {
      await pool.query(
        'INSERT INTO crr_jokers (rallye,joueur,joker,ss,equipage,pose) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        [rallyeId, user, jk.joker, jk.ss, jk.equipage, Date.now()]
      );
      return;
    }
    const k = cle(rallyeId, user);
    (store.jokers[k] = store.jokers[k] || []).push(jk);
    saveFile();
  }

  // ── Persistance des résultats saisis en admin ───────────────────────────────
  async function sauverResultatsDb(rid) {
    if (!pg()) return;                       // pas de Postgres : le fichier suffit
    try {
      await pool.query(
        `INSERT INTO crr_resultats (rallye, data, maj) VALUES ($1,$2,NOW())
         ON CONFLICT (rallye) DO UPDATE SET data=$2, maj=NOW()`,
        [rid, JSON.stringify(store.resultats[rid] || {})]);
    } catch (e) { console.error('CRR sauvegarde résultats:', e.message); }
  }
  async function chargerResultatsDb() {
    if (!pg()) return;
    try {
      const { rows } = await pool.query('SELECT rallye, data FROM crr_resultats');
      for (const r of rows) {
        try { store.resultats[r.rallye] = JSON.parse(r.data) || {}; } catch (_) {}
      }
      if (rows.length) console.log(`CRR — résultats chargés depuis Postgres (${rows.length} rallye(s))`);
    } catch (e) { console.error('CRR chargement résultats:', e.message); }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  // Renvoie une COPIE du rallye dont les résultats fusionnent :
  //   1) ceux saisis via la page admin (prioritaires),
  //   2) ceux écrits dans crr-rallyes.js (repli).
  // Les anciens rallyes continuent donc de marcher sans migration.
  function avecResultats(r) {
    const saisis = store.resultats[r.id];
    if (!saisis || !Object.keys(saisis).length) return r;
    const fusion = {};
    for (const id of Object.keys(r.resultats || {})) fusion[id] = Object.assign({}, r.resultats[id]);
    for (const id of Object.keys(saisis)) fusion[id] = Object.assign({}, fusion[id] || {}, saisis[id]);
    return Object.assign({}, r, { resultats: fusion });
  }

  // Liste de base : les rallyes du fichier + ceux créés en admin.
  // Un rallye créé en admin avec le même id REMPLACE celui du fichier.
  function baseRallyes() {
    const parId = {};
    for (const r of RALLYES) parId[r.id] = r;
    for (const id of Object.keys(store.rallyes)) parId[id] = store.rallyes[id];
    const liste = Object.keys(parId).map(id => parId[id]);
    // tri par date de début quand elle existe
    liste.sort((a, b) => {
      const da = a.debut ? Date.parse(a.debut) : Infinity;
      const db = b.debut ? Date.parse(b.debut) : Infinity;
      if (da !== db) return da - db;
      return 0;
    });
    return liste;
  }

  // Tous les rallyes, avec les résultats saisis en admin déjà fusionnés.
  function tousRallyes() { return baseRallyes().map(avecResultats); }

  // Rallye "courant" = le dernier dont la clôture est passée, sinon le prochain.
  function rallyeCourant() {
    const now = Date.now();
    const RALLYES = tousRallyes();          // ombre locale : version fusionnée (fichier + admin)
    // 1) un rallye en cours (parti mais pas fini)
    const enCours = RALLYES.filter(r => etatDe(r, now) === 'encours');
    if (enCours.length) return enCours[enCours.length - 1];
    // 2) un rallye ouvert à la composition
    const ouverts = RALLYES.filter(r => etatDe(r, now) === 'ouvert');
    if (ouverts.length) return ouverts[0];
    // 3) le prochain du calendrier (données pas encore saisies).
    //    On se fie à `debut` (date ISO) si elle existe, sinon à l'ordre du fichier.
    const attente = RALLYES.filter(r => etatDe(r, now) === 'attente');
    if (attente.length) {
      const avec = attente.filter(r => r.debut);
      if (avec.length) {
        // Un rallye qui a lieu AUJOURD'HUI reste le rallye courant toute la journée :
        // on compare au début de la journée, pas à l'heure actuelle.
        const d = new Date(now);
        const debutDuJour = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        const aVenir = avec.filter(r => Date.parse(r.debut) >= debutDuJour)
                           .sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut));
        if (aVenir.length) return aVenir[0];           // aujourd'hui, sinon le prochain
        const passes = avec.slice().sort((a, b) => Date.parse(b.debut) - Date.parse(a.debut));
        return passes[0];                              // sinon le plus récent
      }
      return attente[0];
    }
    // 4) sinon le dernier couru
    return RALLYES[RALLYES.length - 1];
  }
  function trouverRallye(id) {
    const r = baseRallyes().find(x => x.id === id);
    return r ? avecResultats(r) : rallyeCourant();
  }

  // Vue publique d'un rallye : on n'expose que ce qui est utile au client.
  function vueRallye(r, now) {
    const sp = r.speciales || [];
    const courues = sp.map((s, i) => E.speciqleCourue(r, i));
    return {
      id: r.id, nom: r.nom, dates: r.dates, lieu: r.lieu, surface: r.surface,
      championnat: r.championnat, classes: r.classes || {},
      etat: etatDe(r, now), pret: E.pret(r),
      cloture: r.cloture, ouvert: E.ecurieOuverte(r, now),
      speciales: sp.map((s, i) => ({
        code: s.code, nom: s.nom, km: s.km, depart: s.depart,
        courue: courues[i],
        partie: s.depart ? now >= Date.parse(s.depart) : courues[i],
      })),
      engages: (r.engages || []).map(e => ({
        id: e.id, pilote: e.pilote, copilote: e.copilote, classe: e.classe,
        modele: e.modele, cout: e.cout, estim: !!e.estim,
      })),
      voitures: (r.voitures || []).map(v => ({
        modele: v.modele, classes: v.classes, cout: v.cout,
        n: (r.engages || []).filter(e => e.modele === v.modele).length,
      })),
      budget: E.BUDGET, maxJokers: E.MAX_JOKERS,
    };
  }

  // ── ROUTES ──────────────────────────────────────────────────────────────────

  // Le rallye du week-end (public, pas besoin d'être connecté)
  app.get('/api/crr/rallye', (req, res) => {
    const now = Date.now();
    const r = req.query.rallye ? trouverRallye(req.query.rallye) : rallyeCourant();
    const calendrier = tousRallyes().map(x => ({
      id: x.id, nom: x.nom, dates: x.dates, lieu: x.lieu, surface: x.surface,
      championnat: x.championnat, etat: etatDe(x, now),
      engages: (x.engages || []).length,
      speciales: (x.speciales || []).length,
      courues: (x.speciales || []).filter((s, i) => E.speciqleCourue(x, i)).length,
    }));
    res.json({ ok: true, rallye: vueRallye(r, now), calendrier });
  });

  // Mon écurie + mes jokers sur ce rallye
  app.get('/api/crr/moi', async (req, res) => {
    const user = tokenFrom(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Session expirée — reconnecte-toi.' });
    try {
      const r = trouverRallye(req.query.rallye);
      const ec = await getEcurie(r.id, user);
      const jk = await getJokers(r.id, user);
      let course = null;
      if (ec) course = E.calculerRallye(r, ec, jk);
      res.json({ ok: true, ecurie: ec, jokers: jk, course });
    } catch (e) {
      console.error('GET /api/crr/moi', e.message);
      res.status(500).json({ ok: false, error: 'Indisponible pour le moment.' });
    }
  });

  // Composer / modifier son écurie (fermé au départ de l'ES1)
  app.post('/api/crr/ecurie', async (req, res) => {
    const user = tokenFrom(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Session expirée — reconnecte-toi.' });
    if (!rateLimit('crr:ec:' + user, 30, 3600000))
      return res.status(429).json({ ok: false, error: 'Trop de modifications. Réessaie plus tard.' });

    const b = req.body || {};
    const r = trouverRallye(b.rallye);
    if (!E.pret(r))
      return res.status(403).json({ ok: false, error: 'Les engagés de ce rallye ne sont pas encore publiés.' });
    if (!E.ecurieOuverte(r, Date.now()))
      return res.status(403).json({ ok: false, error: 'Les écuries sont closes : le rallye est parti.' });

    const equipages = Array.isArray(b.equipages) ? b.equipages.map(String) : [];
    const voiture = typeof b.voiture === 'string' ? b.voiture : '';
    const v = E.validerEcurie(r, equipages, voiture);
    if (!v.ok) return res.status(400).json({ ok: false, error: v.error });

    try {
      await setEcurie(r.id, { user, equipages, voiture, cout: v.cout });
      res.json({ ok: true, cout: v.cout });
    } catch (e) {
      console.error('POST /api/crr/ecurie', e.message);
      res.status(500).json({ ok: false, error: 'Enregistrement impossible.' });
    }
  });

  // Poser un joker (1 joker + 1 spéciale à venir + 1 équipage de mon écurie)
  app.post('/api/crr/joker', async (req, res) => {
    const user = tokenFrom(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Session expirée — reconnecte-toi.' });
    if (!rateLimit('crr:jk:' + user, 40, 3600000))
      return res.status(429).json({ ok: false, error: 'Trop de tentatives. Réessaie plus tard.' });

    const b = req.body || {};
    const r = trouverRallye(b.rallye);
    try {
      const ec = await getEcurie(r.id, user);
      if (!ec) return res.status(400).json({ ok: false, error: 'Compose d\'abord ton écurie.' });
      const poses = await getJokers(r.id, user);
      const v = E.validerJoker(r, ec, poses, String(b.joker), String(b.ss), String(b.equipage), Date.now());
      if (!v.ok) return res.status(400).json({ ok: false, error: v.error });

      await addJoker(r.id, user, { joker: String(b.joker), ss: String(b.ss), equipage: String(b.equipage) });
      res.json({ ok: true, jokers: await getJokers(r.id, user) });
    } catch (e) {
      console.error('POST /api/crr/joker', e.message);
      res.status(500).json({ ok: false, error: 'Enregistrement impossible.' });
    }
  });

  // Classement du rallye : général + par spéciale. Tout est recalculé ici.
  app.get('/api/crr/classement', async (req, res) => {
    try {
      const r = trouverRallye(req.query.rallye);
      if (!E.pret(r)) return res.json({ ok: true, general: [], parSpeciale: {}, generalParSS: {}, joueurs: 0 });
      const ecuries = await getEcuries(r.id);
      const jokers = await getTousJokers(r.id);
      if (!ecuries.length) return res.json({ ok: true, general: [], parSpeciale: {}, generalParSS: {}, joueurs: 0 });

      const general = E.classement(r, ecuries, jokers);
      general.forEach(l => { l.points = E.points(l.rang, general.length); });

      // Les compositions ne sont révélées qu'une fois les écuries closes :
      // sinon les derniers à composer pourraient copier les meilleurs.
      const revele = !E.ecurieOuverte(r, Date.now());

      // classement de chaque spéciale courue (les temps DE la spéciale)
      const parSpeciale = {};
      (r.speciales || []).forEach((s, i) => {
        if (!E.speciqleCourue(r, i)) return;
        const lignes = ecuries.map(ec => {
          const c = E.calculerSpeciale(r, ec, jokers[ec.user] || [], i);
          const l = { user: ec.user, temps: c.temps, delta: c.delta };
          if (revele) {
            l.detail = c.detail.map(d => ({
              pilote: d.pilote, classe: d.classe, engages: d.engages,
              res: d.res, brut: d.brut, bm: d.bm, joker: d.joker,
            }));
            l.voiture = c.voiture;
          }
          return l;
        }).sort((a, b) => a.temps - b.temps);
        const meilleur = lignes.length ? lignes[0].temps : 0;
        lignes.forEach((l, k) => { l.rang = k + 1; l.ecart = E.r1(l.temps - meilleur); });
        parSpeciale[s.code] = lignes;
      });

      // composition de chaque écurie (révélée après clôture)
      const compos = {};
      if (revele) {
        ecuries.forEach(ec => {
          compos[ec.user] = {
            equipages: ec.equipages.map(id => {
              const e = (r.engages || []).find(x => x.id === id);
              return e ? { id: e.id, pilote: e.pilote, classe: e.classe, cout: e.cout } : { id };
            }),
            voiture: ec.voiture,
            cout: ec.cout,
            jokers: (jokers[ec.user] || []).map(j => ({ joker: j.joker, ss: j.ss, equipage: j.equipage })),
          };
        });
      }

      // classement GÉNÉRAL à l'issue de chaque spéciale, avec évolution des places
      const generalParSS = E.generalParSpeciale(r, ecuries, jokers);

      res.json({ ok: true, general, parSpeciale, generalParSS, compos, revele,
                 joueurs: general.length });
    } catch (e) {
      console.error('GET /api/crr/classement', e.message);
      res.status(500).json({ ok: false, error: 'Classement indisponible.' });
    }
  });

  // Championnat : points cumulés sur tous les rallyes déjà courus
  app.get('/api/crr/championnat', async (req, res) => {
    try {
      const now = Date.now();
      const total = {};
      const done = [];
      for (const r of tousRallyes()) {
        if (!E.pret(r)) continue;
        const nbCourues = r.speciales.filter((s, i) => E.speciqleCourue(r, i)).length;
        if (!nbCourues) continue;
        const ecuries = await getEcuries(r.id);
        if (!ecuries.length) continue;
        const jokers = await getTousJokers(r.id);
        const cl = E.classement(r, ecuries, jokers);
        // classement de CE rallye, avec points
        const lignes = cl.map(l => {
          const p = E.points(l.rang, cl.length);
          total[l.user] = (total[l.user] || 0) + p;
          return { rang: l.rang, user: l.user, total: l.total, points: p };
        });
        done.push({
          id: r.id, nom: r.nom, dates: r.dates, surface: r.surface,
          joueurs: cl.length,
          courues: nbCourues, speciales: r.speciales.length,
          termine: nbCourues === r.speciales.length,
          classement: lignes,
        });
      }
      const classement = Object.keys(total)
        .map(u => ({ user: u, points: total[u] }))
        .sort((a, b) => b.points - a.points);
      classement.forEach((l, i) => { l.rang = i + 1; });
      // le championnat est "définitif" si tous les rallyes prêts sont terminés
      const enCours = done.some(d => !d.termine);
      res.json({ ok: true, classement, rallyes: done, provisoire: enCours });
    } catch (e) {
      console.error('GET /api/crr/championnat', e.message);
      res.status(500).json({ ok: false, error: 'Championnat indisponible.' });
    }
  });

  console.log('CRR — routes montées (/api/crr/*)');

  // ══════════════════════════════════════════════════════════════════════════
  //  ADMINISTRATION — saisie des résultats sans commit
  //  Réservé au compte défini par CRR_ADMIN (défaut : zezeben).
  // ══════════════════════════════════════════════════════════════════════════

  // Analyse un collage "46:3, 3:1, 86:Ab" → { '46':3, '3':1, '86':'Ab' } + erreurs
  function analyser(texte, rallye, ssCode) {
    const out = {}, erreurs = [], vus = new Set();
    const ids = new Set((rallye.engages || []).map(e => String(e.id)));
    const morceaux = String(texte || '')
      .split(/[,;\n\r]+/).map(x => x.trim()).filter(Boolean);

    for (const m of morceaux) {
      const p = m.split(':');
      if (p.length !== 2) { erreurs.push(`« ${m} » : format attendu numéro:position`); continue; }
      const id = p[0].trim().replace(/^#/, '');
      const v = p[1].trim();
      if (!ids.has(id)) { erreurs.push(`« ${id} » : numéro inconnu dans les engagés`); continue; }
      if (vus.has(id)) { erreurs.push(`« ${id} » : saisi deux fois`); continue; }
      vus.add(id);

      if (/^(ab|abandon)$/i.test(v)) { out[id] = 'Ab'; continue; }
      if (/^(tf|forfaitaire)$/i.test(v)) { out[id] = 'Tf'; continue; }
      if (/^(fo|forfait)$/i.test(v)) { out[id] = 'Fo'; continue; }
      const n = parseInt(v, 10);
      if (!isFinite(n) || n < 1) { erreurs.push(`« ${m} » : position invalide (${v})`); continue; }
      const eng = (rallye.engages || []).find(e => String(e.id) === id);
      const nbClasse = (rallye.classes || {})[eng.classe] || 0;
      if (n > nbClasse) erreurs.push(`« ${id} » : position ${n} > ${nbClasse} engagés en ${eng.classe}`);
      out[id] = n;
    }
    return { positions: out, erreurs };
  }

  // Contrôle de complétude : chaque classe est-elle entièrement saisie ?
  function controler(rallye, positions) {
    const parClasse = {};
    for (const e of (rallye.engages || [])) {
      const c = e.classe;
      parClasse[c] = parClasse[c] || { total: 0, saisis: 0, manquants: [] };
      parClasse[c].total++;
      if (positions[String(e.id)] != null) parClasse[c].saisis++;
      else parClasse[c].manquants.push(String(e.id));
    }
    return Object.keys(parClasse).map(c => ({
      classe: c, total: parClasse[c].total, saisis: parClasse[c].saisis,
      manquants: parClasse[c].manquants,
      complet: parClasse[c].saisis === parClasse[c].total,
    }));
  }

  // Qui suis-je ? (le client sait s'il doit afficher le lien admin)
  app.get('/api/crr/admin/moi', (req, res) => {
    res.json({ ok: true, admin: !!estAdmin(req) });
  });

  // Liste des rallyes + état de saisie de chaque spéciale
  app.get('/api/crr/admin/rallyes', (req, res) => {
    if (!estAdmin(req)) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const now = Date.now();
    res.json({ ok: true, rallyes: tousRallyes().map(r => ({
      id: r.id, nom: r.nom, dates: r.dates, etat: etatDe(r, now),
      engages: (r.engages || []).length,
      classes: r.classes || {},
      equipages: (r.engages || []).map(e => ({ id: String(e.id), pilote: e.pilote, classe: e.classe })),
      speciales: (r.speciales || []).map((sp, i) => ({
        code: sp.code, nom: sp.nom, depart: sp.depart,
        saisie: E.speciqleCourue(r, i),
        source: (store.resultats[r.id] &&
                 Object.values(store.resultats[r.id]).some(x => x[sp.code] != null)) ? 'base' : 'fichier',
      })),
    })) });
  });

  // Aperçu AVANT enregistrement : ce que la saisie donnerait + contrôles
  app.post('/api/crr/admin/apercu', (req, res) => {
    if (!estAdmin(req)) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const { rallye: rid, ss, texte } = req.body || {};
    const r = baseRallyes().find(x => x.id === rid);
    if (!r) return res.status(400).json({ ok: false, error: 'Rallye inconnu.' });
    const sp = (r.speciales || []).find(x => x.code === ss);
    if (!sp) return res.status(400).json({ ok: false, error: 'Spéciale inconnue.' });

    const { positions, erreurs } = analyser(texte, r, ss);
    const classes = controler(r, positions);
    const lignes = Object.keys(positions).map(id => {
      const e = (r.engages || []).find(x => String(x.id) === id);
      return { id, pilote: e ? e.pilote : '?', classe: e ? e.classe : '?', valeur: positions[id] };
    }).sort((a, b) => a.classe.localeCompare(b.classe) ||
                      (typeof a.valeur === 'number' ? a.valeur : 999) -
                      (typeof b.valeur === 'number' ? b.valeur : 999));
    res.json({ ok: true, rallye: r.nom, speciale: sp.code + ' — ' + sp.nom,
               total: lignes.length, lignes, classes, erreurs });
  });

  // Enregistrement d'une spéciale
  app.post('/api/crr/admin/saisir', async (req, res) => {
    const admin = estAdmin(req);
    if (!admin) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const { rallye: rid, ss, texte, force } = req.body || {};
    const r = baseRallyes().find(x => x.id === rid);
    if (!r) return res.status(400).json({ ok: false, error: 'Rallye inconnu.' });
    const sp = (r.speciales || []).find(x => x.code === ss);
    if (!sp) return res.status(400).json({ ok: false, error: 'Spéciale inconnue.' });

    const { positions, erreurs } = analyser(texte, r, ss);
    if (erreurs.length && !force) return res.status(400).json({ ok: false, error: erreurs.join(' · '), erreurs });
    if (!Object.keys(positions).length) return res.status(400).json({ ok: false, error: 'Aucune position lisible.' });

    // Sécurité : ne pas enregistrer une spéciale qui n'est pas encore partie.
    if (sp.depart && Date.now() < Date.parse(sp.depart) && !force) {
      return res.status(400).json({ ok: false,
        error: 'Cette spéciale n\'est pas encore partie. Enregistrer maintenant verrouillerait les jokers trop tôt.' });
    }

    store.resultats[rid] = store.resultats[rid] || {};
    for (const id of Object.keys(positions)) {
      store.resultats[rid][id] = Object.assign({}, store.resultats[rid][id] || {});
      store.resultats[rid][id][ss] = positions[id];
    }
    saveFile();
    await sauverResultatsDb(rid);
    console.log(`CRR admin — ${admin} a saisi ${ss} de ${rid} (${Object.keys(positions).length} équipages)`);
    res.json({ ok: true, enregistres: Object.keys(positions).length, erreurs });
  });

  // Effacer une spéciale saisie (pour corriger)
  app.post('/api/crr/admin/effacer', async (req, res) => {
    const admin = estAdmin(req);
    if (!admin) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const { rallye: rid, ss } = req.body || {};
    if (!store.resultats[rid]) return res.json({ ok: true, efface: 0 });
    let n = 0;
    for (const id of Object.keys(store.resultats[rid])) {
      if (store.resultats[rid][id][ss] != null) { delete store.resultats[rid][id][ss]; n++; }
      if (!Object.keys(store.resultats[rid][id]).length) delete store.resultats[rid][id];
    }
    // la complétion n'est plus valable
    delete store.completions[rid];
    saveFile();
    await sauverResultatsDb(rid);
    console.log(`CRR admin — ${admin} a effacé ${ss} de ${rid}`);
    res.json({ ok: true, efface: n });
  });

  // Export de la saison (sauvegarde téléchargeable)
  app.get('/api/crr/admin/export', (req, res) => {
    if (!estAdmin(req)) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const data = {
      exporte: new Date().toISOString(),
      rallyes: store.rallyes,
      resultats: store.resultats,
      ecuries: store.ecuries,
      jokers: store.jokers,
      completions: store.completions,
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition',
      'attachment; filename="crr-saison-' + new Date().toISOString().slice(0, 10) + '.json"');
    res.send(JSON.stringify(data, null, 2));
  });


  // ══════════════════════════════════════════════════════════════════════════
  //  ADMIN — Calendrier et spéciales
  // ══════════════════════════════════════════════════════════════════════════

  async function sauverRallyesDb() {
    if (!pg()) return;
    try {
      await pool.query(
        `INSERT INTO crr_config (cle, data, maj) VALUES ('rallyes',$1,NOW())
         ON CONFLICT (cle) DO UPDATE SET data=$1, maj=NOW()`,
        [JSON.stringify(store.rallyes)]);
    } catch (e) { console.error('CRR sauvegarde rallyes:', e.message); }
  }
  async function chargerRallyesDb() {
    if (!pg()) return;
    try {
      const { rows } = await pool.query(`SELECT data FROM crr_config WHERE cle='rallyes'`);
      if (rows.length) {
        store.rallyes = JSON.parse(rows[0].data) || {};
        console.log(`CRR — ${Object.keys(store.rallyes).length} rallye(s) chargé(s) depuis Postgres`);
      }
    } catch (e) { console.error('CRR chargement rallyes:', e.message); }
  }

  // Identifiant technique à partir d'un nom : "Rallye de Catalogne" -> "rallye-de-catalogne"
  function slug(txt) {
    return String(txt || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  // Liste complète pour l'édition (rallyes fichier + admin, avec leur origine)
  app.get('/api/crr/admin/calendrier', (req, res) => {
    if (!estAdmin(req)) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const now = Date.now();
    const dansFichier = new Set(RALLYES.map(r => r.id));
    res.json({ ok: true, rallyes: baseRallyes().map(r => ({
      id: r.id, nom: r.nom, dates: r.dates, debut: r.debut, surface: r.surface,
      championnat: r.championnat, cloture: r.cloture, brouillon: !!r.brouillon,
      origine: store.rallyes[r.id] ? (dansFichier.has(r.id) ? 'admin (remplace le fichier)' : 'admin')
                                   : 'fichier',
      modifiable: !!store.rallyes[r.id] || !dansFichier.has(r.id),
      etat: etatDe(avecResultats(r), now),
      engages: (r.engages || []).length,
      listeEngages: (r.engages || []).map(e => ({
        id: e.id, pilote: e.pilote, copilote: e.copilote || '',
        classe: e.classe, modele: e.modele, cout: e.cout,
      })),
      voitures: (r.voitures || []).map(v => ({ modele: v.modele, cout: v.cout })),
      speciales: (r.speciales || []).map(sp => ({
        code: sp.code, nom: sp.nom, km: sp.km, base: sp.base, depart: sp.depart,
      })),
    })) });
  });

  // Créer ou modifier un rallye (calendrier)
  app.post('/api/crr/admin/rallye', async (req, res) => {
    const admin = estAdmin(req);
    if (!admin) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const b = req.body || {};
    const nom = String(b.nom || '').trim();
    if (!nom) return res.status(400).json({ ok: false, error: 'Le nom du rallye est obligatoire.' });

    const id = String(b.id || '').trim() || slug(nom);
    if (!id) return res.status(400).json({ ok: false, error: 'Identifiant invalide.' });

    // on part de l'existant (admin, sinon fichier) pour ne rien perdre
    const existant = store.rallyes[id] || RALLYES.find(r => r.id === id) || null;
    const r = Object.assign({}, existant || {}, {
      id, nom,
      dates: String(b.dates || '').trim(),
      debut: String(b.debut || '').trim() || undefined,
      surface: String(b.surface || '').trim(),
      championnat: String(b.championnat || '').trim(),
      cloture: String(b.cloture || '').trim() || undefined,
      brouillon: !!b.brouillon,
    });
    // structures obligatoires
    r.speciales = existant && existant.speciales ? existant.speciales : [];
    r.engages   = existant && existant.engages   ? existant.engages   : [];
    r.classes   = existant && existant.classes   ? existant.classes   : {};
    r.voitures  = existant && existant.voitures  ? existant.voitures  : [];
    r.resultats = existant && existant.resultats ? existant.resultats : {};

    store.rallyes[id] = r;
    saveFile(); await sauverRallyesDb();
    console.log(`CRR admin — ${admin} a enregistré le rallye ${id}`);
    res.json({ ok: true, id, cree: !existant });
  });

  // Supprimer un rallye créé en admin
  app.post('/api/crr/admin/rallye/supprimer', async (req, res) => {
    const admin = estAdmin(req);
    if (!admin) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const id = String((req.body || {}).id || '');
    if (!store.rallyes[id]) return res.status(400).json({ ok: false, error: 'Ce rallye ne vient pas de la page admin (il est dans le fichier).' });
    delete store.rallyes[id];
    delete store.resultats[id];
    delete store.completions[id];
    saveFile(); await sauverRallyesDb(); await sauverResultatsDb(id);
    console.log(`CRR admin — ${admin} a supprimé le rallye ${id}`);
    res.json({ ok: true });
  });

  // Enregistrer la LISTE DES SPÉCIALES d'un rallye (collage en colonnes)
  // Format d'une ligne : CODE  NOM  KM  [JJ/MM/AAAA HH:MM]
  app.post('/api/crr/admin/speciales', async (req, res) => {
    const admin = estAdmin(req);
    if (!admin) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const { id, texte, offset } = req.body || {};
    const r = store.rallyes[id] || RALLYES.find(x => x.id === id);
    if (!r) return res.status(400).json({ ok: false, error: 'Rallye inconnu.' });

    const { speciales, erreurs } = analyserSpeciales(texte, offset);
    if (!speciales.length) return res.status(400).json({ ok: false, error: 'Aucune spéciale lisible.', erreurs });

    const copie = Object.assign({}, store.rallyes[id] || r);
    copie.speciales = speciales;
    copie.id = id;
    if (!copie.engages) copie.engages = r.engages || [];
    if (!copie.classes) copie.classes = r.classes || {};
    if (!copie.voitures) copie.voitures = r.voitures || [];
    if (!copie.resultats) copie.resultats = r.resultats || {};
    // la clôture par défaut = départ de l'ES1
    if (!copie.cloture && speciales[0] && speciales[0].depart) copie.cloture = speciales[0].depart;

    store.rallyes[id] = copie;
    saveFile(); await sauverRallyesDb();
    console.log(`CRR admin — ${admin} a enregistré ${speciales.length} spéciales pour ${id}`);
    res.json({ ok: true, total: speciales.length, speciales, erreurs });
  });

  // Aperçu des spéciales avant enregistrement
  app.post('/api/crr/admin/speciales/apercu', (req, res) => {
    if (!estAdmin(req)) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const { texte, offset } = req.body || {};
    const { speciales, erreurs } = analyserSpeciales(texte, offset);
    res.json({ ok: true, total: speciales.length, speciales, erreurs });
  });

  // Analyse le collage des spéciales.
  // Colonnes séparées par TABULATION ou point-virgule :
  //   ES1 ; La Trona 1 ; 21.26 ; 14/07/2026 08:05
  // Le temps de base est calculé : km x 36 s (convention du jeu).
  function analyserSpeciales(texte, offset) {
    const speciales = [], erreurs = [], codes = new Set();
    const off = String(offset || '+02:00');
    const lignes = String(texte || '').split(/[\n\r]+/).map(x => x.trim()).filter(Boolean);

    for (const ligne of lignes) {
      const p = ligne.split(/\t|;/).map(x => x.trim()).filter(x => x !== '');
      if (p.length < 3) { erreurs.push(`« ${ligne} » : il faut au moins CODE, NOM et KM`); continue; }
      const code = p[0].toUpperCase().replace(/\s+/g, '');
      if (codes.has(code)) { erreurs.push(`« ${code} » : code en double`); continue; }
      const nom = p[1];
      const km = parseFloat(String(p[2]).replace(',', '.'));
      if (!isFinite(km) || km <= 0) { erreurs.push(`« ${code} » : distance invalide (${p[2]})`); continue; }

      let depart;
      if (p[3]) {
        const m = String(p[3]).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
        if (m) {
          const [, j, mo, an, h, mi] = m;
          depart = `${an}-${String(mo).padStart(2,'0')}-${String(j).padStart(2,'0')}` +
                   `T${String(h).padStart(2,'0')}:${mi}:00${off}`;
          if (isNaN(Date.parse(depart))) { erreurs.push(`« ${code} » : horaire illisible (${p[3]})`); depart = undefined; }
        } else {
          erreurs.push(`« ${code} » : horaire attendu JJ/MM/AAAA HH:MM (reçu « ${p[3]} »)`);
        }
      }
      codes.add(code);
      speciales.push({ code, nom, km: Math.round(km * 100) / 100,
                       base: Math.round(km * 36 * 10) / 10, depart });
    }
    return { speciales, erreurs };
  }


  // ══════════════════════════════════════════════════════════════════════════
  //  ADMIN — Liste des engagés (et voitures déduites)
  // ══════════════════════════════════════════════════════════════════════════

  // Analyse le collage des engagés. Colonnes séparées par TABULATION ou ';' :
  //   NUMÉRO ; PILOTE ; COPILOTE ; CLASSE ; MODÈLE ; COÛT
  // Le copilote et le coût peuvent manquer (coût = 10 par défaut).
  function analyserEngages(texte) {
    const engages = [], erreurs = [], vus = new Set();
    const lignes = String(texte || '').split(/[\n\r]+/).map(x => x.trim()).filter(Boolean);

    for (const ligne of lignes) {
      const p = ligne.split(/\t|;/).map(x => x.trim());
      // on retire les colonnes vides en fin de ligne seulement
      while (p.length && p[p.length - 1] === '') p.pop();
      if (p.length < 4) { erreurs.push(`« ${ligne} » : il faut au moins NUMÉRO, PILOTE, CLASSE et MODÈLE`); continue; }

      const id = String(p[0]).replace(/^#/, '').trim();
      if (!id) { erreurs.push(`« ${ligne} » : numéro manquant`); continue; }
      if (vus.has(id)) { erreurs.push(`« ${id} » : numéro en double`); continue; }

      let pilote, copilote, classe, modele, cout;
      if (p.length >= 6) {          // n° / pilote / copilote / classe / modèle / coût
        pilote = p[1]; copilote = p[2]; classe = p[3]; modele = p[4]; cout = p[5];
      } else if (p.length === 5) {  // sans copilote OU sans coût : on devine
        // si la dernière colonne est un nombre, c'est le coût (donc pas de copilote)
        if (/^\d+$/.test(p[4])) { pilote = p[1]; copilote = ''; classe = p[2]; modele = p[3]; cout = p[4]; }
        else { pilote = p[1]; copilote = p[2]; classe = p[3]; modele = p[4]; cout = ''; }
      } else {                      // 4 colonnes : n° / pilote / classe / modèle
        pilote = p[1]; copilote = ''; classe = p[2]; modele = p[3]; cout = '';
      }

      if (!pilote) { erreurs.push(`« ${id} » : pilote manquant`); continue; }
      if (!classe) { erreurs.push(`« ${id} » : classe manquante`); continue; }
      if (!modele) { erreurs.push(`« ${id} » : modèle de voiture manquant`); continue; }

      let c = parseInt(cout, 10);
      if (!isFinite(c) || c <= 0) c = 10;
      if ([10, 20, 30, 40].indexOf(c) === -1) {
        erreurs.push(`« ${id} » : coût ${cout} inhabituel (attendu 10, 20, 30 ou 40)`);
      }

      vus.add(id);
      engages.push({ id, pilote, copilote, classe: classe.toUpperCase(), modele, cout: c });
    }

    // Nombre d'engagés par classe : c'est lui qui pilote la grille de bonus/malus.
    const classes = {};
    for (const e of engages) classes[e.classe] = (classes[e.classe] || 0) + 1;

    // Voitures déduites des engagés : un modèle = une voiture.
    // Coût proposé = le plus élevé parmi les équipages qui la pilotent.
    const parModele = {};
    for (const e of engages) {
      parModele[e.modele] = parModele[e.modele] || { modele: e.modele, classes: [], n: 0, cout: 10 };
      const v = parModele[e.modele];
      v.n++;
      if (v.classes.indexOf(e.classe) === -1) v.classes.push(e.classe);
      if (e.cout > v.cout) v.cout = e.cout;
    }
    const voitures = Object.keys(parModele).map(m => parModele[m])
      .sort((a, b) => b.n - a.n || a.modele.localeCompare(b.modele));

    return { engages, classes, voitures, erreurs };
  }

  // Aperçu avant enregistrement
  app.post('/api/crr/admin/engages/apercu', (req, res) => {
    if (!estAdmin(req)) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const r = analyserEngages((req.body || {}).texte);
    res.json({ ok: true, total: r.engages.length, engages: r.engages,
               classes: r.classes, voitures: r.voitures, erreurs: r.erreurs });
  });

  // Enregistrement des engagés (+ coûts des voitures ajustés dans la page)
  app.post('/api/crr/admin/engages', async (req, res) => {
    const admin = estAdmin(req);
    if (!admin) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const { id, texte, couts } = req.body || {};
    const base = store.rallyes[id] || RALLYES.find(x => x.id === id);
    if (!base) return res.status(400).json({ ok: false, error: 'Rallye inconnu.' });

    const a = analyserEngages(texte);
    if (!a.engages.length) return res.status(400).json({ ok: false, error: 'Aucun équipage lisible.', erreurs: a.erreurs });

    // coûts de voiture ajustés depuis la page (facultatif)
    if (couts && typeof couts === 'object') {
      for (const v of a.voitures) if (couts[v.modele] != null) {
        const c = parseInt(couts[v.modele], 10);
        if (isFinite(c) && c > 0) v.cout = c;
      }
    }

    const copie = Object.assign({}, store.rallyes[id] || base);
    copie.id = id;
    copie.engages = a.engages;
    copie.classes = a.classes;
    copie.voitures = a.voitures.map(v => ({ modele: v.modele, classes: v.classes, cout: v.cout }));
    if (!copie.speciales) copie.speciales = base.speciales || [];
    if (!copie.resultats) copie.resultats = base.resultats || {};

    store.rallyes[id] = copie;
    saveFile(); await sauverRallyesDb();
    console.log(`CRR admin — ${admin} a enregistré ${a.engages.length} engagés pour ${id}`);
    res.json({ ok: true, total: a.engages.length,
               classes: a.classes, voitures: copie.voitures, erreurs: a.erreurs });
  });


  // ══════════════════════════════════════════════════════════════════════════
  //  ADMIN — Remise à zéro (irréversible)
  // ══════════════════════════════════════════════════════════════════════════
  // Protégée par un mot de confirmation à taper : "EFFACER".
  // 'quoi' : 'ecuries' | 'resultats' | 'rallyes' | 'tout'
  app.post('/api/crr/admin/reset', async (req, res) => {
    const admin = estAdmin(req);
    if (!admin) return res.status(403).json({ ok: false, error: 'Accès réservé.' });
    const { quoi, confirmation } = req.body || {};
    if (String(confirmation || '').trim().toUpperCase() !== 'EFFACER') {
      return res.status(400).json({ ok: false, error: 'Confirmation incorrecte : tape EFFACER pour valider.' });
    }
    const choix = ['ecuries', 'resultats', 'rallyes', 'tout'];
    if (choix.indexOf(quoi) === -1) return res.status(400).json({ ok: false, error: 'Élément à effacer inconnu.' });

    const bilan = {};
    const tout = quoi === 'tout';

    // 1) Écuries et jokers des joueurs
    if (tout || quoi === 'ecuries') {
      bilan.ecuries = Object.keys(store.ecuries).length;
      bilan.jokers = Object.keys(store.jokers).length;
      store.ecuries = {}; store.jokers = {};
      if (pg()) {
        try { await pool.query('DELETE FROM crr_ecuries'); await pool.query('DELETE FROM crr_jokers'); }
        catch (e) { console.error('CRR reset écuries:', e.message); }
      }
    }

    // 2) Résultats saisis en admin (ceux du fichier crr-rallyes.js ne bougent pas)
    if (tout || quoi === 'resultats') {
      bilan.resultats = Object.keys(store.resultats).length;
      store.resultats = {}; store.completions = {};
      if (pg()) {
        try { await pool.query('DELETE FROM crr_resultats'); }
        catch (e) { console.error('CRR reset résultats:', e.message); }
      }
    }

    // 3) Rallyes créés en admin (calendrier, spéciales, engagés)
    if (tout || quoi === 'rallyes') {
      bilan.rallyes = Object.keys(store.rallyes).length;
      store.rallyes = {};
      if (pg()) {
        try { await pool.query(`DELETE FROM crr_config WHERE cle='rallyes'`); }
        catch (e) { console.error('CRR reset rallyes:', e.message); }
      }
    }

    saveFile();
    console.log(`CRR admin — ${admin} a effacé : ${quoi} ${JSON.stringify(bilan)}`);
    res.json({ ok: true, quoi, bilan,
      note: 'Les rallyes écrits dans crr-rallyes.js ne sont pas touchés : seul un commit peut les modifier.' });
  });

};

