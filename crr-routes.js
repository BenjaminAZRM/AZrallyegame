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
  let store = { ecuries: {}, jokers: {} };   // { "rallyeId|user": {...} }
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (raw && typeof raw === 'object') store = { ecuries: raw.ecuries || {}, jokers: raw.jokers || {} };
  } catch (e) { /* premier lancement */ }
  function saveFile() {
    try { fs.writeFileSync(FILE, JSON.stringify(store)); }
    catch (e) { console.error('CRR sauvegarde fichier échouée:', e.message); }
  }

  async function initTables() {
    if (!isDbReady()) { console.log('CRR — stockage : FICHIER'); return; }
    try {
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
      console.log('CRR — stockage : POSTGRES ✔');
    } catch (e) {
      console.error('CRR — tables indisponibles → repli fichier :', e.message);
    }
  }
  initTables();

  const cle = (r, u) => r + '|' + u;

  async function getEcurie(rallyeId, user) {
    if (isDbReady()) {
      const q = await pool.query('SELECT equipages,voiture,cout FROM crr_ecuries WHERE rallye=$1 AND joueur=$2', [rallyeId, user]);
      if (!q.rowCount) return null;
      const r = q.rows[0];
      return { user, equipages: r.equipages, voiture: r.voiture, cout: r.cout };
    }
    return store.ecuries[cle(rallyeId, user)] || null;
  }
  async function getEcuries(rallyeId) {
    if (isDbReady()) {
      const q = await pool.query('SELECT joueur,equipages,voiture,cout FROM crr_ecuries WHERE rallye=$1', [rallyeId]);
      return q.rows.map(r => ({ user: r.joueur, equipages: r.equipages, voiture: r.voiture, cout: r.cout }));
    }
    return Object.keys(store.ecuries)
      .filter(k => k.startsWith(rallyeId + '|'))
      .map(k => store.ecuries[k]);
  }
  async function setEcurie(rallyeId, ec) {
    if (isDbReady()) {
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
    if (isDbReady()) {
      const q = await pool.query('SELECT joker,ss,equipage FROM crr_jokers WHERE rallye=$1 AND joueur=$2', [rallyeId, user]);
      return q.rows;
    }
    return store.jokers[cle(rallyeId, user)] || [];
  }
  async function getTousJokers(rallyeId) {
    const par = {};
    if (isDbReady()) {
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
    if (isDbReady()) {
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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  // Rallye "courant" = le dernier dont la clôture est passée, sinon le prochain.
  function rallyeCourant() {
    const now = Date.now();
    const futurs = RALLYES.filter(r => { const c = E.cloture(r); return c == null || now < c; });
    if (futurs.length) return futurs[0];
    return RALLYES[RALLYES.length - 1];
  }
  function trouverRallye(id) { return RALLYES.find(r => r.id === id) || rallyeCourant(); }

  // Vue publique d'un rallye : on n'expose que ce qui est utile au client.
  function vueRallye(r, now) {
    const courues = r.speciales.map((s, i) => E.speciqleCourue(r, i));
    return {
      id: r.id, nom: r.nom, dates: r.dates, lieu: r.lieu, surface: r.surface,
      championnat: r.championnat, classes: r.classes,
      cloture: r.cloture, ouvert: E.ecurieOuverte(r, now),
      speciales: r.speciales.map((s, i) => ({
        code: s.code, nom: s.nom, km: s.km, depart: s.depart,
        courue: courues[i],
        partie: s.depart ? now >= Date.parse(s.depart) : courues[i],
      })),
      engages: r.engages.map(e => ({
        id: e.id, pilote: e.pilote, copilote: e.copilote, classe: e.classe,
        modele: e.modele, cout: e.cout, estim: !!e.estim,
      })),
      voitures: r.voitures.map(v => ({
        modele: v.modele, classes: v.classes, cout: v.cout,
        n: r.engages.filter(e => e.modele === v.modele).length,
      })),
      budget: E.BUDGET, maxJokers: E.MAX_JOKERS,
    };
  }

  // ── ROUTES ──────────────────────────────────────────────────────────────────

  // Le rallye du week-end (public, pas besoin d'être connecté)
  app.get('/api/crr/rallye', (req, res) => {
    const r = rallyeCourant();
    res.json({ ok: true, rallye: vueRallye(r, Date.now()) });
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
      const ecuries = await getEcuries(r.id);
      const jokers = await getTousJokers(r.id);
      if (!ecuries.length) return res.json({ ok: true, general: [], parSpeciale: {}, joueurs: 0 });

      const general = E.classement(r, ecuries, jokers);
      general.forEach(l => { l.points = E.points(l.rang, general.length); });

      // classement de chaque spéciale courue (les temps DE la spéciale)
      const parSpeciale = {};
      r.speciales.forEach((s, i) => {
        if (!E.speciqleCourue(r, i)) return;
        const lignes = ecuries.map(ec => {
          const c = E.calculerSpeciale(r, ec, jokers[ec.user] || [], i);
          return { user: ec.user, temps: c.temps, delta: c.delta };
        }).sort((a, b) => a.temps - b.temps);
        const meilleur = lignes.length ? lignes[0].temps : 0;
        lignes.forEach((l, k) => { l.rang = k + 1; l.ecart = E.r1(l.temps - meilleur); });
        parSpeciale[s.code] = lignes;
      });

      // classement GÉNÉRAL à l'issue de chaque spéciale, avec évolution des places
      const generalParSS = E.generalParSpeciale(r, ecuries, jokers);

      res.json({ ok: true, general, parSpeciale, generalParSS, joueurs: general.length });
    } catch (e) {
      console.error('GET /api/crr/classement', e.message);
      res.status(500).json({ ok: false, error: 'Classement indisponible.' });
    }
  });

  // Championnat : points cumulés sur tous les rallyes déjà courus
  app.get('/api/crr/championnat', async (req, res) => {
    try {
      const total = {};
      const done = [];
      for (const r of RALLYES) {
        const nbCourues = r.speciales.filter((s, i) => E.speciqleCourue(r, i)).length;
        if (!nbCourues) continue;
        const ecuries = await getEcuries(r.id);
        if (!ecuries.length) continue;
        const jokers = await getTousJokers(r.id);
        const cl = E.classement(r, ecuries, jokers);
        cl.forEach(l => {
          const p = E.points(l.rang, cl.length);
          total[l.user] = (total[l.user] || 0) + p;
        });
        done.push({ id: r.id, nom: r.nom, joueurs: cl.length, termine: nbCourues === r.speciales.length });
      }
      const classement = Object.keys(total)
        .map(u => ({ user: u, points: total[u] }))
        .sort((a, b) => b.points - a.points);
      classement.forEach((l, i) => { l.rang = i + 1; });
      res.json({ ok: true, classement, rallyes: done });
    } catch (e) {
      console.error('GET /api/crr/championnat', e.message);
      res.status(500).json({ ok: false, error: 'Championnat indisponible.' });
    }
  });

  console.log('CRR — routes montées (/api/crr/*)');
};
