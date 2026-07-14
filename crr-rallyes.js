// ─── CHRONO RALLYE RACE — DONNÉES DES RALLYES ──────────────────────────────────
// Un objet par rallye. Benjamin met à jour ce fichier chaque week-end :
//   1) avant le rallye  : engagés, classes, coûts, spéciales + horaires de départ
//   2) pendant le rallye : "resultats" au fur et à mesure des spéciales
// Résultat d'un équipage sur une spéciale = son CLASSEMENT DANS SA CLASSE (nombre),
// ou un statut : "Ab" (abandon) | "Tf" (temps forfaitaire) | "Fo" (forfait avant départ).
'use strict';

const RALLYES = [
  {
    id: 'stpr-2026',
    nom: '49. Susquehannock Trail Performance Rally',
    dates: '9 – 11 juillet 2026',
    lieu: 'Wellsboro, Pennsylvanie',
    surface: 'Terre',
    championnat: 'ARA East #3',
    fuseau: 'America/New_York',

    // Nombre d'engagés par classe EN DÉBUT DE RALLYE (= abscisse du tableau bonus/malus)
    classes: { L4WD: 5, NA4WD: 6, O2WD: 8, L2WD: 7, O4WD: 2 },

    // Clôture des écuries = départ de l'ES1 (heure locale du rallye, en UTC ici)
    cloture: '2026-07-10T13:00:00Z',

    speciales: [
      { code: 'ES1', nom: 'Sunken Branch 1',  km: 12.1, base: 512.0, depart: '2026-07-10T13:00:00Z' },
      { code: 'ES2', nom: 'Fahnestock 1',     km: 18.4, base: 748.0, depart: '2026-07-10T14:30:00Z' },
      { code: 'ES3', nom: 'Gravel Pit',       km:  9.7, base: 405.0, depart: '2026-07-10T16:00:00Z' },
      { code: 'ES4', nom: 'Fahnestock 2',     km: 18.4, base: 748.0, depart: '2026-07-11T13:00:00Z' },
      { code: 'ES5', nom: 'Sunken Branch 2',  km: 12.1, base: 512.0, depart: '2026-07-11T14:15:00Z' },
      { code: 'ES6', nom: 'Big Bend',         km: 22.6, base: 905.0, depart: '2026-07-11T15:45:00Z' },
      { code: 'ES7', nom: 'Gravel Pit 2',     km:  9.7, base: 405.0, depart: '2026-07-11T17:00:00Z' },
      { code: 'ES8', nom: 'Power Stage',      km: 11.3, base: 470.0, depart: '2026-07-11T18:30:00Z' },
    ],

    // Liste réelle des 28 engagés (extraite de la capture officielle).
    // cout : 10 / 20 / 30 / 40 crédits selon la performance attendue DANS SA CLASSE.
    // estim: true = coût estimé (pilote non vu en course), à ajuster.
    engages: [
      { id:'432', pilote:'Mayer Tom',           copilote:'McKenna Dillon',    classe:'L4WD',  modele:'Subaru Impreza WRX',      cout:40 },
      { id:'545', pilote:'Donnelly Niall',      copilote:'Gregory Gage',      classe:'L4WD',  modele:'Subaru Impreza STi N12',  cout:30 },
      { id:'771', pilote:'Pryzbylkowski James', copilote:'Curtis Ethan',      classe:'L4WD',  modele:'Subaru Impreza WRX',      cout:20 },
      { id:'27',  pilote:'Panjabi Sumit',       copilote:'Kurey Stephen',     classe:'L4WD',  modele:'Mitsubishi Lancer Evo X', cout:20, estim:true },
      { id:'18',  pilote:'Tippens Bryan',       copilote:'Jones Aislinn',     classe:'L4WD',  modele:'Subaru Impreza STi',      cout:10, estim:true },

      { id:'797', pilote:'Pryzbylkowski Ryan',  copilote:'Luther Nick',       classe:'NA4WD', modele:'Subaru Impreza RS',       cout:40 },
      { id:'353', pilote:'Shirley Dan',         copilote:'Eisele Eric',       classe:'NA4WD', modele:'Subaru Impreza Wagon',    cout:30 },
      { id:'333', pilote:'Quintero Leonardo',   copilote:'Fuerte Leonel',     classe:'NA4WD', modele:'Subaru Impreza GH',       cout:20, estim:true },
      { id:'359', pilote:'Zapsky Ben',          copilote:'Zapsky Andrew',     classe:'NA4WD', modele:'Subaru Impreza',          cout:10, estim:true },
      { id:'484', pilote:'McGowan Kevin',       copilote:'Busk Brandon',      classe:'NA4WD', modele:'BMW 330xi E46',           cout:10, estim:true },
      { id:'519', pilote:'Verge Kadence',       copilote:'Verge Joseph',      classe:'NA4WD', modele:'Subaru Impreza',          cout:10, estim:true },

      { id:'36',  pilote:'Cessna Michael',      copilote:'Harrell Steven',    classe:'O2WD',  modele:'BMW M3 E36',              cout:40 },
      { id:'175', pilote:'James Derek',         copilote:'Miller Kyle KJ',    classe:'O2WD',  modele:'Ford Fiesta MK6.5 R2',    cout:30 },
      { id:'918', pilote:'James Gavin',         copilote:'Cook Nicholas',     classe:'O2WD',  modele:'Volkswagen Golf V GTI',   cout:20, estim:true },
      { id:'986', pilote:'Nonack Chris',        copilote:'Nonack Sara',       classe:'O2WD',  modele:'Subaru BRZ (ZC6)',        cout:20, estim:true },
      { id:'122', pilote:'Voudouris Spiro',     copilote:'Schwartz Lillian',  classe:'O2WD',  modele:'Mazda 2',                 cout:10, estim:true },
      { id:'907', pilote:'Jonas Lajos',         copilote:'Tameris Ivan',      classe:'O2WD',  modele:'BMW 325i E36',            cout:10, estim:true },
      { id:'912', pilote:'James Scott',         copilote:'Donovan Michelle',  classe:'O2WD',  modele:'Porsche 912',             cout:10, estim:true },
      { id:'914', pilote:'Gillespie Michael',   copilote:'McNamara Brian',    classe:'O2WD',  modele:'Ford Escort MK2',         cout:10, estim:true },

      { id:'86',  pilote:'Peker Tevfik',        copilote:'Beliveau James',    classe:'L2WD',  modele:'Ford Fiesta ST',          cout:40 },
      { id:'193', pilote:'Guyer Gavin',         copilote:'Jordan Tessa',      classe:'L2WD',  modele:'Ford Fiesta',             cout:30 },
      { id:'108', pilote:'Bersheim Christopher',copilote:'Moran Emilio',      classe:'L2WD',  modele:'Nissan 240SX',            cout:20 },
      { id:'950', pilote:'Kodat Jason',         copilote:'Marsh Phil',        classe:'L2WD',  modele:'Ford Fiesta ST',          cout:20, estim:true },
      { id:'129', pilote:'GT Becca',            copilote:'Park Helen',        classe:'L2WD',  modele:'Ford Fiesta ST',          cout:10, estim:true },
      { id:'205', pilote:'Serwinski Colin',     copilote:'Ross William',      classe:'L2WD',  modele:'Toyota Corolla',          cout:10, estim:true },
      { id:'617', pilote:'Giliver Phillip',     copilote:'Cordara Elizabeth', classe:'L2WD',  modele:'Toyota Yaris',            cout:10, estim:true },

      { id:'74',  pilote:'Mozes Lucas',         copilote:'Smith Boyd',        classe:'O4WD',  modele:'Mitsubishi Lancer Evo IX',cout:20, estim:true },
      { id:'985', pilote:'Carr Michael',        copilote:'Lambert Indy',      classe:'O4WD',  modele:'Subaru Impreza STi N10',  cout:20, estim:true },
    ],

    // Modèles proposés au choix (1 par écurie). Coût dérivé des équipages du modèle.
    voitures: [
      { modele:'Subaru Impreza WRX',      classes:['L4WD'],  cout:30 },
      { modele:'Subaru Impreza STi N12',  classes:['L4WD'],  cout:30 },
      { modele:'Mitsubishi Lancer Evo X', classes:['L4WD'],  cout:20 },
      { modele:'Subaru Impreza STi',      classes:['L4WD'],  cout:10 },
      { modele:'Subaru Impreza RS',       classes:['NA4WD'], cout:40 },
      { modele:'Subaru Impreza Wagon',    classes:['NA4WD'], cout:30 },
      { modele:'Subaru Impreza GH',       classes:['NA4WD'], cout:20 },
      { modele:'Subaru Impreza',          classes:['NA4WD'], cout:10 },
      { modele:'BMW 330xi E46',           classes:['NA4WD'], cout:10 },
      { modele:'BMW M3 E36',              classes:['O2WD'],  cout:40 },
      { modele:'Ford Fiesta MK6.5 R2',    classes:['O2WD'],  cout:30 },
      { modele:'Volkswagen Golf V GTI',   classes:['O2WD'],  cout:20 },
      { modele:'Subaru BRZ (ZC6)',        classes:['O2WD'],  cout:20 },
      { modele:'Mazda 2',                 classes:['O2WD'],  cout:10 },
      { modele:'BMW 325i E36',            classes:['O2WD'],  cout:10 },
      { modele:'Porsche 912',             classes:['O2WD'],  cout:10 },
      { modele:'Ford Escort MK2',         classes:['O2WD'],  cout:10 },
      { modele:'Ford Fiesta ST',          classes:['L2WD'],  cout:20 },
      { modele:'Ford Fiesta',             classes:['L2WD'],  cout:30 },
      { modele:'Nissan 240SX',            classes:['L2WD'],  cout:20 },
      { modele:'Toyota Corolla',          classes:['L2WD'],  cout:10 },
      { modele:'Toyota Yaris',            classes:['L2WD'],  cout:10 },
      { modele:'Mitsubishi Lancer Evo IX',classes:['O4WD'],  cout:20 },
      { modele:'Subaru Impreza STi N10',  classes:['O4WD'],  cout:20 },
    ],

    // Résultats réels, spéciale par spéciale. À remplir au fil du week-end.
    // Vide = rallye pas encore couru.
    resultats: {},
  },
];

module.exports = { RALLYES };
