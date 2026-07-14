// ─── CHRONO RALLYE RACE — DONNÉES DES RALLYES ──────────────────────────────────
// Un objet par rallye. Benjamin met à jour ce fichier chaque week-end :
//   1) avant le rallye  : engagés, classes, coûts, spéciales + horaires de départ
//   2) pendant le rallye : "resultats" au fur et à mesure des spéciales
// Résultat d'un équipage sur une spéciale = son CLASSEMENT DANS SA CLASSE (nombre),
// ou un statut : "Ab" (abandon) | "Tf" (temps forfaitaire) | "Fo" (forfait avant départ).
'use strict';

const RALLYES = [
  {
    id: 'catalogne-2004',
    nom: 'Rallye de Catalogne 2004',
    dates: '14 juillet 2026 (test — données réelles Catalogne 2004)',
    lieu: 'Catalogne, Espagne',
    surface: 'Asphalte',
    championnat: 'Test CRR',
    fuseau: 'Europe/Madrid',

    // Nombre d'engagés par classe EN DÉBUT DE RALLYE (= abscisse du tableau bonus/malus)
    classes: { A8: 21, A6: 22, N4: 6, N3: 1, N2: 1, N1: 1 },

    // Clôture des écuries = départ de l'ES1 (14h20 heure française = 12h20 UTC)
    cloture: '2026-07-14T12:20:00Z',

    // base = temps de référence de la spéciale, en secondes (km × 36 s ≈ 100 km/h).
    speciales: [
      { code: 'ES1',  nom: 'La Trona 1',                     km: 13.17, base:   474.1, depart: '2026-07-14T12:20:00Z' },
      { code: 'ES2',  nom: 'Alpens - Les Llosses 1',         km:  21.8, base:   784.8, depart: '2026-07-14T12:30:00Z' },
      { code: 'ES3',  nom: 'Gombrèn - St Jaume Frontanyà 1', km: 22.55, base:   811.8, depart: '2026-07-14T12:40:00Z' },
      { code: 'ES4',  nom: 'La Trona 2',                     km: 13.17, base:   474.1, depart: '2026-07-14T12:50:00Z' },
      { code: 'ES5',  nom: 'Alpens - Les Llosses 2',         km:  21.8, base:   784.8, depart: '2026-07-14T13:00:00Z' },
      { code: 'ES6',  nom: 'Gombrèn - St Jaume Frontanyà 2', km: 22.55, base:   811.8, depart: '2026-07-14T13:10:00Z' },
      { code: 'ES7',  nom: 'Les Llosses - Alpens 1',         km:  21.8, base:   784.8, depart: '2026-07-14T13:20:00Z' },
      { code: 'ES8',  nom: 'Sta Eulàlia 1',                  km:  16.8, base:   604.8, depart: '2026-07-14T13:30:00Z' },
      { code: 'ES9',  nom: 'Prats de Lluçanès - Olost 1',    km:  9.94, base:   357.8, depart: '2026-07-14T13:40:00Z' },
      { code: 'ES10', nom: 'Sant Julià 1',                   km:  32.9, base:  1184.4, depart: '2026-07-14T13:50:00Z' },
      { code: 'ES11', nom: 'Les Llosses - Alpens 2',         km:  21.8, base:   784.8, depart: '2026-07-14T14:00:00Z' },
      { code: 'ES12', nom: 'Sta Eulàlia 2',                  km:  16.8, base:   604.8, depart: '2026-07-14T14:10:00Z' },
      { code: 'ES13', nom: 'Prats de Lluçanès - Olost 2',    km:  9.94, base:   357.8, depart: '2026-07-14T14:20:00Z' },
      { code: 'ES14', nom: 'Sant Julià 2',                   km:  32.9, base:  1184.4, depart: '2026-07-14T14:30:00Z' },
      { code: 'ES15', nom: 'Sant Boi de Lluçanès 1',         km: 12.85, base:   462.6, depart: '2026-07-14T14:40:00Z' },
      { code: 'ES16', nom: 'La Roca 1',                      km:  5.05, base:   181.8, depart: '2026-07-14T14:50:00Z' },
      { code: 'ES17', nom: 'Viladrau 1',                     km: 35.18, base:  1266.5, depart: '2026-07-14T15:00:00Z' },
      { code: 'ES18', nom: 'Sant Boi de Lluçanès 2',         km: 12.85, base:   462.6, depart: '2026-07-14T15:10:00Z' },
      { code: 'ES19', nom: 'La Roca 2',                      km:  5.05, base:   181.8, depart: '2026-07-14T15:20:00Z' },
      { code: 'ES20', nom: 'Viladrau 2',                     km: 35.18, base:  1266.5, depart: '2026-07-14T15:30:00Z' },
    ],

    // 52 engagés réels du Rallye de Catalogne 2004.
    // cout : 10 / 20 / 30 / 40 crédits selon la performance attendue DANS SA CLASSE.
    engages: [
      { id:'1',   pilote:'Petter Solberg',        copilote:'Phil Mills',             classe:'A8', modele:'Subaru Impreza S10 WRC \'04', cout:40 },
      { id:'2',   pilote:'Mikko Hirvonen',        copilote:'Jarmo Lehtinen',         classe:'A8', modele:'Subaru Impreza S10 WRC \'04', cout:30 },
      { id:'3',   pilote:'Sébastien Loeb',        copilote:'Daniel Elena',           classe:'A8', modele:'Citroën Xsara WRC',          cout:40 },
      { id:'4',   pilote:'Carlos Sainz',          copilote:'Marc Martí',             classe:'A8', modele:'Citroën Xsara WRC',          cout:40 },
      { id:'5',   pilote:'Marcus Grönholm',       copilote:'Timo Rautiainen',        classe:'A8', modele:'Peugeot 307 WRC',            cout:40 },
      { id:'6',   pilote:'Freddy Loix',           copilote:'Sven Smeets',            classe:'A8', modele:'Peugeot 307 WRC',            cout:30 },
      { id:'7',   pilote:'Markko Märtin',         copilote:'Michael Park',           classe:'A8', modele:'Ford Focus RS WRC \'04',      cout:30 },
      { id:'8',   pilote:'François Duval',        copilote:'Stéphane Prévot',        classe:'A8', modele:'Ford Focus RS WRC \'04',      cout:40 },
      { id:'9',   pilote:'Gilles Panizzi',        copilote:'Hervé Panizzi',          classe:'A8', modele:'Mitsubishi Lancer WRC 04',   cout:30 },
      { id:'10',  pilote:'Dani Solà',             copilote:'Xavier Amigó Colón',     classe:'A8', modele:'Mitsubishi Lancer WRC 04',   cout:20 },
      { id:'11',  pilote:'Armin Schwarz',         copilote:'Manfred Hiemer',         classe:'A8', modele:'Škoda Fabia WRC',            cout:20 },
      { id:'12',  pilote:'Toni Gardemeister',     copilote:'Paavo Lukander',         classe:'A8', modele:'Škoda Fabia WRC',            cout:20 },
      { id:'14',  pilote:'Gianluigi Galli',       copilote:'Guido D\'Amore',          classe:'A8', modele:'Mitsubishi Lancer WRC 04',   cout:20 },
      { id:'15',  pilote:'Jan Kopecký',           copilote:'Filip Schovánek',        classe:'A8', modele:'Škoda Fabia WRC',            cout:20 },
      { id:'16',  pilote:'Antony Warmbold',       copilote:'Gemma Price',            classe:'A8', modele:'Ford Focus WRC \'02',         cout:10 },
      { id:'17',  pilote:'Nicolas Vouilloz',      copilote:'Denis Giraudet',         classe:'A8', modele:'Peugeot 206 WRC',            cout:10 },
      { id:'18',  pilote:'Stéphane Sarrazin',     copilote:'Patrick Pivato',         classe:'A8', modele:'Subaru Impreza S9 WRC \'03',  cout:30 },
      { id:'19',  pilote:'Eamonn Boland',         copilote:'Francis Regan',          classe:'A8', modele:'Subaru Impreza S9 WRC \'03',  cout:10 },
      { id:'61',  pilote:'Donie O\'Sullivan',      copilote:'Paul Nagle',             classe:'A8', modele:'Ford Focus WRC \'01',         cout:10 },
      { id:'62',  pilote:'Paddy White',           copilote:'Bruno Brissart',         classe:'A8', modele:'Subaru Impreza S9 WRC \'03',  cout:10 },
      { id:'63',  pilote:'Massimo Beltrami',      copilote:'Fabio Ceschino',         classe:'A8', modele:'Toyota Corolla WRC',         cout:10 },

      { id:'31',  pilote:'Mirco Baldacci',        copilote:'Giovanni Bernacchini',   classe:'A6', modele:'Suzuki Ignis S1600',         cout:30 },
      { id:'32',  pilote:'Urmo Aava',             copilote:'Kuldar Sikk',            classe:'A6', modele:'Suzuki Ignis S1600',         cout:30 },
      { id:'33',  pilote:'Guy Wilks',             copilote:'Phil Pugh',              classe:'A6', modele:'Suzuki Ignis S1600',         cout:40 },
      { id:'34',  pilote:'Alessandro Broccoli',   copilote:'Giovanni Agnese',        classe:'A6', modele:'Fiat Punto S1600',           cout:20 },
      { id:'35',  pilote:'Kosti Katajamäki',      copilote:'Timo Alanne',            classe:'A6', modele:'Suzuki Ignis S1600',         cout:20 },
      { id:'36',  pilote:'Kris Meeke',            copilote:'David Senior',           classe:'A6', modele:'Citroën C2 S1600',           cout:40 },
      { id:'39',  pilote:'Nicolas Bernardi',      copilote:'Jean-Marc Fortin',       classe:'A6', modele:'Renault Clio S1600',         cout:40 },
      { id:'40',  pilote:'Guerlain Chicherit',    copilote:'Mathieu Baumel',         classe:'A6', modele:'Citroën C2 S1600',           cout:30 },
      { id:'41',  pilote:'Natalie Barratt',       copilote:'Carl Williamson',        classe:'A6', modele:'Renault Clio S1600',         cout:10 },
      { id:'43',  pilote:'Jari-Matti Latvala',    copilote:'Miikka Anttila',         classe:'A6', modele:'Suzuki Ignis S1600',         cout:20 },
      { id:'44',  pilote:'Alan Scorcioni',        copilote:'Fulvio Florean',         classe:'A6', modele:'Fiat Punto S1600',           cout:10 },
      { id:'45',  pilote:'Per-Gunnar Andersson',  copilote:'Jonas Andersson',        classe:'A6', modele:'Suzuki Ignis S1600',         cout:30 },
      { id:'46',  pilote:'Xevi Pons',             copilote:'Oriol Julià Pascual',    classe:'A6', modele:'Renault Clio S1600',         cout:40 },
      { id:'47',  pilote:'Luca Tabaton',          copilote:'Gisella Rovegno',        classe:'A6', modele:'Fiat Punto S1600',           cout:10 },
      { id:'48',  pilote:'Conrad Rautenbach',     copilote:'Mark Jones',             classe:'A6', modele:'Citroën Saxo S1600',         cout:10 },
      { id:'49',  pilote:'Luca Betti',            copilote:'Paolo Del Grande',       classe:'A6', modele:'Fiat Punto S1600',           cout:20 },
      { id:'50',  pilote:'Oliver Marshall',       copilote:'Craig Parry',            classe:'A6', modele:'Renault Clio S1600',         cout:10 },
      { id:'51',  pilote:'Larry Cols',            copilote:'Filip Goddé',            classe:'A6', modele:'Renault Clio S1600',         cout:20 },
      { id:'64',  pilote:'Giandomenico Basso',    copilote:'Mitia Dotta',            classe:'A6', modele:'Fiat Punto S1600',           cout:20 },
      { id:'65',  pilote:'Dani Sordo',            copilote:'Carlos del Barrio',      classe:'A6', modele:'Citroën C2 S1600',           cout:40 },
      { id:'67',  pilote:'Emmanuel Guigou',       copilote:'Arnaud Delebecque',      classe:'A6', modele:'Renault Clio S1600',         cout:30 },
      { id:'68',  pilote:'Pavel Valoušek jun.',   copilote:'Vit Houšť',              classe:'A6', modele:'Suzuki Ignis S1600',         cout:10 },

      { id:'70',  pilote:'Ricardo Triviño',       copilote:'Alejandro Noriega',      classe:'N4', modele:'Mitsubishi Lancer Evo VIII', cout:30 },
      { id:'71',  pilote:'Joan Font',             copilote:'Manel Muñoz',            classe:'N4', modele:'Mitsubishi Lancer Evo VI',   cout:20 },
      { id:'72',  pilote:'Mattias Ekström',       copilote:'Stefan Bergman',         classe:'N4', modele:'Mitsubishi Lancer Evo VII',  cout:40 },
      { id:'73',  pilote:'Rafael Martínez Saco',  copilote:'Daniel García-Ibarrola', classe:'N4', modele:'Mitsubishi Lancer Evo VII',  cout:20 },
      { id:'74',  pilote:'Eduard Forés Pérez',    copilote:'Xavier Alujá',           classe:'N4', modele:'Seat León Cupra R',          cout:10 },
      { id:'75',  pilote:'Josep Basols Aguilera', copilote:'Álex Haro',              classe:'N4', modele:'Seat León Cupra R',          cout:10 },

      { id:'76',  pilote:'Enric Sans',            copilote:'Joan Manel Cabrera',     classe:'N3', modele:'Renault Clio RS',            cout:20 },

      { id:'79',  pilote:'Julio Cobo',            copilote:'Juan Jose Romero-Avila', classe:'N2', modele:'Citroën Saxo VTS',           cout:20 },

      { id:'80',  pilote:'Takako Nakano',         copilote:'Aggie Foster',           classe:'N1', modele:'Volkswagen Polo 16V',        cout:20 },
    ],

    // Modèles proposés au choix (1 par écurie).
    // cout = moyenne des coûts des équipages du modèle, ramenée au palier :
    //   [10;15] → 10 · ]15;25] → 20 · ]25;35] → 30 · ]35;40] → 40
    voitures: [
      { modele:'Citroën Xsara WRC',          classes:['A8'], cout:40 },
      { modele:'Ford Focus RS WRC \'04',      classes:['A8'], cout:30 },
      { modele:'Peugeot 307 WRC',            classes:['A8'], cout:30 },
      { modele:'Subaru Impreza S10 WRC \'04', classes:['A8'], cout:30 },
      { modele:'Mitsubishi Lancer WRC 04',   classes:['A8'], cout:20 },
      { modele:'Subaru Impreza S9 WRC \'03',  classes:['A8'], cout:20 },
      { modele:'Škoda Fabia WRC',            classes:['A8'], cout:20 },
      { modele:'Ford Focus WRC \'01',         classes:['A8'], cout:10 },
      { modele:'Ford Focus WRC \'02',         classes:['A8'], cout:10 },
      { modele:'Peugeot 206 WRC',            classes:['A8'], cout:10 },
      { modele:'Toyota Corolla WRC',         classes:['A8'], cout:10 },
      { modele:'Citroën C2 S1600',           classes:['A6'], cout:40 },
      { modele:'Suzuki Ignis S1600',         classes:['A6'], cout:30 },
      { modele:'Fiat Punto S1600',           classes:['A6'], cout:20 },
      { modele:'Renault Clio S1600',         classes:['A6'], cout:20 },
      { modele:'Citroën Saxo S1600',         classes:['A6'], cout:10 },
      { modele:'Mitsubishi Lancer Evo VII',  classes:['N4'], cout:30 },
      { modele:'Mitsubishi Lancer Evo VIII', classes:['N4'], cout:30 },
      { modele:'Mitsubishi Lancer Evo VI',   classes:['N4'], cout:20 },
      { modele:'Seat León Cupra R',          classes:['N4'], cout:10 },
      { modele:'Renault Clio RS',            classes:['N3'], cout:20 },
      { modele:'Citroën Saxo VTS',           classes:['N2'], cout:20 },
      { modele:'Volkswagen Polo 16V',        classes:['N1'], cout:20 },
    ],

    // Résultats réels, spéciale par spéciale. À remplir au fil du week-end.
    // Vide = rallye pas encore couru.
    resultats: {},
  },
];

module.exports = { RALLYES };
