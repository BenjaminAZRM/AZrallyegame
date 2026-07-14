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

    // Résultats réels : resultats[idEquipage][codeES].
    // Valeur = classement DANS SA CLASSE (ex aequo = rang partagé), ou 'Ab' / 'Tf'.
    // ES4  : 9:35.0 = temps forfaitaire (Tf) pour 6 équipages.
    // ES6  : tout temps >= 17:20.0 = temps forfaitaire (Tf), soit 20 équipages.
    // ES10 : spéciale ANNULÉE -> Tf pour les 52 (aucun bonus/malus, aucun +15s).
    // Tout équipage absent d'un classement est noté 'Ab' (+15 s).
    // Super-Rallye : #46 #63 #79 (ES7), #32 #63 (ES15) repartent après abandon.
    resultats: {
      '1':   { ES1: 5, ES2: 9, ES3: 6, ES4: 5, ES5: 6, ES6: 5, ES7: 6, ES8: 7, ES9: 7, ES10:'Tf', ES11: 5, ES12:13, ES13: 5, ES14: 9, ES15: 5, ES16:11, ES17: 9, ES18: 3, ES19:10, ES20: 3 },
      '2':   { ES1:13, ES2:14, ES3: 7, ES4: 9, ES5:11, ES6: 7, ES7:13, ES8: 8, ES9: 9, ES10:'Tf', ES11:10, ES12:11, ES13:11, ES14:11, ES15:11, ES16: 6, ES17: 7, ES18: 4, ES19: 8, ES20: 5 },
      '3':   { ES1: 2, ES2: 1, ES3: 5, ES4: 4, ES5: 1, ES6: 2, ES7: 1, ES8:'Ab', ES9:'Ab', ES10:'Tf', ES11:'Ab', ES12:'Ab', ES13:'Ab', ES14:'Ab', ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '4':   { ES1: 7, ES2: 5, ES3: 4, ES4: 6, ES5: 5, ES6: 4, ES7: 2, ES8: 2, ES9: 3, ES10:'Tf', ES11: 2, ES12: 4, ES13: 4, ES14: 1, ES15: 4, ES16: 1, ES17: 2, ES18: 2, ES19: 5, ES20: 2 },
      '5':   { ES1: 4, ES2: 4, ES3: 3, ES4: 3, ES5: 4, ES6: 3, ES7: 4, ES8:10, ES9: 1, ES10:'Tf', ES11: 1, ES12: 3, ES13: 1, ES14: 3, ES15: 2, ES16: 5, ES17: 3, ES18: 1, ES19: 1, ES20: 1 },
      '6':   { ES1:11, ES2:13, ES3:'Ab', ES4:'Ab', ES5:'Ab', ES6:'Ab', ES7:'Ab', ES8:'Ab', ES9:'Ab', ES10:'Tf', ES11:'Ab', ES12:'Ab', ES13:'Ab', ES14:'Ab', ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '7':   { ES1: 3, ES2: 2, ES3: 2, ES4: 2, ES5: 3, ES6: 1, ES7: 3, ES8: 1, ES9: 2, ES10:'Tf', ES11: 3, ES12: 1, ES13: 2, ES14: 2, ES15: 3, ES16: 1, ES17: 1, ES18: 5, ES19: 4, ES20: 5 },
      '8':   { ES1: 1, ES2: 8, ES3: 1, ES4: 1, ES5: 2, ES6:'Ab', ES7:'Ab', ES8:'Ab', ES9:'Ab', ES10:'Tf', ES11:'Ab', ES12:'Ab', ES13:'Ab', ES14:'Ab', ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '9':   { ES1: 6, ES2: 3, ES3:15, ES4:15, ES5:15, ES6:14, ES7: 9, ES8:13, ES9:12, ES10:'Tf', ES11: 9, ES12: 9, ES13:12, ES14:12, ES15: 8, ES16: 6, ES17:12, ES18: 9, ES19:13, ES20:11 },
      '10':  { ES1: 9, ES2: 6, ES3: 8, ES4: 8, ES5: 8, ES6:10, ES7: 8, ES8: 6, ES9: 5, ES10:'Tf', ES11:12, ES12: 6, ES13: 7, ES14: 5, ES15: 6, ES16: 3, ES17:10, ES18:11, ES19: 6, ES20:10 },
      '11':  { ES1: 9, ES2:11, ES3:16, ES4:11, ES5:12, ES6:12, ES7:11, ES8: 3, ES9:10, ES10:'Tf', ES11:11, ES12:10, ES13: 9, ES14: 8, ES15:10, ES16:11, ES17: 6, ES18:10, ES19:11, ES20:12 },
      '12':  { ES1: 8, ES2:12, ES3:10, ES4:12, ES5:13, ES6:11, ES7:12, ES8:11, ES9:11, ES10:'Tf', ES11: 8, ES12: 5, ES13:10, ES14:10, ES15: 7, ES16: 3, ES17: 4, ES18: 6, ES19: 7, ES20: 8 },
      '14':  { ES1:12, ES2:10, ES3:12, ES4:13, ES5: 9, ES6: 9, ES7: 7, ES8: 4, ES9: 6, ES10:'Tf', ES11: 6, ES12: 8, ES13: 6, ES14: 6, ES15: 9, ES16: 8, ES17: 5, ES18: 7, ES19: 8, ES20: 5 },
      '15':  { ES1:17, ES2:17, ES3:14, ES4:16, ES5:16, ES6:'Ab', ES7:'Ab', ES8:'Ab', ES9:'Ab', ES10:'Tf', ES11:'Ab', ES12:'Ab', ES13:'Ab', ES14:'Ab', ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '16':  { ES1:16, ES2:16, ES3:13, ES4:14, ES5:14, ES6:13, ES7:14, ES8:12, ES9:13, ES10:'Tf', ES11:13, ES12:12, ES13:13, ES14:13, ES15:13, ES16:13, ES17:13, ES18:13, ES19:12, ES20:13 },
      '17':  { ES1:15, ES2:15, ES3:11, ES4:10, ES5:10, ES6: 8, ES7:10, ES8: 5, ES9: 8, ES10:'Tf', ES11: 7, ES12: 2, ES13: 8, ES14: 7, ES15:12, ES16: 9, ES17:11, ES18:12, ES19: 2, ES20: 4 },
      '18':  { ES1:14, ES2: 7, ES3: 9, ES4: 7, ES5: 7, ES6: 6, ES7: 5, ES8: 9, ES9: 4, ES10:'Tf', ES11: 4, ES12: 7, ES13: 3, ES14: 4, ES15: 1, ES16: 9, ES17: 8, ES18: 8, ES19: 3, ES20: 9 },
      '19':  { ES1:18, ES2:18, ES3:18, ES4:18, ES5:18, ES6:15, ES7:15, ES8:14, ES9:14, ES10:'Tf', ES11:14, ES12:14, ES13:14, ES14:14, ES15:15, ES16:15, ES17:15, ES18:15, ES19:15, ES20:15 },
      '61':  { ES1:19, ES2:19, ES3:17, ES4:17, ES5:17, ES6:'Tf', ES7:16, ES8:15, ES9:15, ES10:'Tf', ES11:15, ES12:15, ES13:16, ES14:15, ES15:14, ES16:14, ES17:14, ES18:14, ES19:14, ES20:14 },
      '62':  { ES1:21, ES2:21, ES3:19, ES4:19, ES5:19, ES6:'Tf', ES7:17, ES8:16, ES9:16, ES10:'Tf', ES11:17, ES12:17, ES13:17, ES14:16, ES15:17, ES16:17, ES17:16, ES18:16, ES19:16, ES20:16 },
      '63':  { ES1:20, ES2:20, ES3:20, ES4:'Ab', ES5:'Ab', ES6:'Ab', ES7:18, ES8:17, ES9:17, ES10:'Tf', ES11:16, ES12:16, ES13:15, ES14:'Ab', ES15:16, ES16:16, ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '31':  { ES1: 2, ES2: 6, ES3: 4, ES4: 7, ES5: 4, ES6: 1, ES7: 7, ES8:19, ES9: 8, ES10:'Tf', ES11:10, ES12:15, ES13:11, ES14: 4, ES15: 5, ES16: 6, ES17: 2, ES18: 2, ES19: 6, ES20: 6 },
      '32':  { ES1: 9, ES2:10, ES3:10, ES4:19, ES5:19, ES6:'Tf', ES7:16, ES8:14, ES9:15, ES10:'Tf', ES11:'Ab', ES12:'Ab', ES13:'Ab', ES14:'Ab', ES15:17, ES16:12, ES17:16, ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '33':  { ES1:12, ES2: 5, ES3:13, ES4:13, ES5:12, ES6: 6, ES7: 4, ES8: 5, ES9: 9, ES10:'Tf', ES11: 9, ES12: 9, ES13: 5, ES14: 7, ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '34':  { ES1:16, ES2:13, ES3:14, ES4:15, ES5:14, ES6:'Tf', ES7:11, ES8:12, ES9:12, ES10:'Tf', ES11:11, ES12:14, ES13:13, ES14: 9, ES15:16, ES16:15, ES17:10, ES18:11, ES19:10, ES20: 9 },
      '35':  { ES1: 8, ES2: 4, ES3: 6, ES4:11, ES5: 9, ES6: 2, ES7:15, ES8: 9, ES9:19, ES10:'Tf', ES11:14, ES12:11, ES13:14, ES14:10, ES15:13, ES16:10, ES17: 6, ES18: 6, ES19: 8, ES20:14 },
      '36':  { ES1:13, ES2: 8, ES3: 5, ES4:10, ES5:11, ES6: 8, ES7:10, ES8:18, ES9:11, ES10:'Tf', ES11: 6, ES12: 7, ES13:10, ES14: 5, ES15: 4, ES16:11, ES17:16, ES18:12, ES19:12, ES20:10 },
      '39':  { ES1: 3, ES2: 2, ES3:12, ES4: 4, ES5:13, ES6: 3, ES7: 1, ES8: 2, ES9: 1, ES10:'Tf', ES11: 1, ES12: 3, ES13: 1, ES14: 1, ES15: 1, ES16: 2, ES17: 1, ES18: 3, ES19: 1, ES20: 4 },
      '40':  { ES1: 7, ES2:16, ES3:17, ES4:'Ab', ES5:'Ab', ES6:'Ab', ES7:'Ab', ES8:'Ab', ES9:'Ab', ES10:'Tf', ES11:'Ab', ES12:'Ab', ES13:'Ab', ES14:'Ab', ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '41':  { ES1:22, ES2:19, ES3:22, ES4:17, ES5:18, ES6:'Ab', ES7:'Ab', ES8:'Ab', ES9:'Ab', ES10:'Tf', ES11:'Ab', ES12:'Ab', ES13:'Ab', ES14:'Ab', ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '43':  { ES1: 5, ES2:12, ES3: 7, ES4: 5, ES5: 7, ES6:'Tf', ES7:12, ES8: 8, ES9:10, ES10:'Tf', ES11: 5, ES12: 8, ES13: 9, ES14: 8, ES15:14, ES16:13, ES17: 8, ES18:14, ES19:15, ES20:15 },
      '44':  { ES1:11, ES2:15, ES3: 9, ES4: 8, ES5:10, ES6:'Tf', ES7:13, ES8:13, ES9:14, ES10:'Tf', ES11: 8, ES12:13, ES13:12, ES14:16, ES15:10, ES16: 9, ES17:13, ES18: 9, ES19: 7, ES20:12 },
      '45':  { ES1: 6, ES2: 1, ES3: 3, ES4:12, ES5: 8, ES6: 4, ES7: 5, ES8: 7, ES9: 6, ES10:'Tf', ES11: 7, ES12: 5, ES13: 6, ES14: 6, ES15:12, ES16:14, ES17: 7, ES18:10, ES19:11, ES20: 8 },
      '46':  { ES1: 1, ES2: 9, ES3: 2, ES4: 1, ES5: 3, ES6:'Ab', ES7: 6, ES8: 4, ES9: 2, ES10:'Tf', ES11:12, ES12: 2, ES13: 2, ES14: 3, ES15: 2, ES16: 6, ES17:15, ES18: 8, ES19: 2, ES20: 2 },
      '47':  { ES1:17, ES2:20, ES3:19, ES4:18, ES5:16, ES6:'Tf', ES7:18, ES8:17, ES9:17, ES10:'Tf', ES11:16, ES12:17, ES13:15, ES14:13, ES15:15, ES16:17, ES17:14, ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '48':  { ES1:21, ES2:18, ES3:20, ES4:16, ES5:15, ES6:'Tf', ES7:19, ES8:16, ES9:16, ES10:'Tf', ES11:15, ES12:16, ES13:17, ES14:14, ES15:11, ES16:16, ES17:12, ES18:13, ES19:13, ES20:11 },
      '49':  { ES1:15, ES2:21, ES3:16, ES4:14, ES5:20, ES6:'Tf', ES7:14, ES8:11, ES9:13, ES10:'Tf', ES11:13, ES12:12, ES13:16, ES14:12, ES15: 6, ES16: 8, ES17: 9, ES18:15, ES19:14, ES20:13 },
      '50':  { ES1:19, ES2:17, ES3:21, ES4:'Tf', ES5:17, ES6:'Tf', ES7:17, ES8:15, ES9:18, ES10:'Tf', ES11:17, ES12:18, ES13:18, ES14:'Ab', ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '51':  { ES1:14, ES2: 7, ES3:15, ES4: 3, ES5: 1, ES6: 5, ES7: 2, ES8: 1, ES9: 3, ES10:'Tf', ES11:18, ES12: 4, ES13: 4, ES14: 2, ES15: 3, ES16: 3, ES17:11, ES18: 7, ES19: 5, ES20: 7 },
      '64':  { ES1: 4, ES2: 3, ES3: 1, ES4: 2, ES5: 2, ES6: 7, ES7: 3, ES8: 3, ES9: 5, ES10:'Tf', ES11: 2, ES12: 1, ES13: 3, ES14:11, ES15: 8, ES16: 4, ES17: 5, ES18: 4, ES19: 4, ES20: 5 },
      '65':  { ES1:18, ES2:14, ES3:11, ES4: 9, ES5: 5, ES6:'Tf', ES7: 9, ES8: 6, ES9: 4, ES10:'Tf', ES11: 4, ES12:10, ES13: 7, ES14:15, ES15: 9, ES16: 1, ES17: 3, ES18: 1, ES19: 3, ES20: 1 },
      '67':  { ES1:10, ES2:11, ES3: 8, ES4: 6, ES5: 6, ES6:'Tf', ES7: 8, ES8:10, ES9: 7, ES10:'Tf', ES11: 3, ES12: 6, ES13: 8, ES14:17, ES15: 7, ES16: 5, ES17: 3, ES18: 5, ES19: 9, ES20: 3 },
      '68':  { ES1:20, ES2:22, ES3:18, ES4:'Ab', ES5:'Ab', ES6:'Ab', ES7:'Ab', ES8:'Ab', ES9:'Ab', ES10:'Tf', ES11:'Ab', ES12:'Ab', ES13:'Ab', ES14:'Ab', ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '70':  { ES1: 3, ES2: 2, ES3: 2, ES4:'Tf', ES5: 3, ES6:'Tf', ES7: 2, ES8: 3, ES9: 4, ES10:'Tf', ES11: 2, ES12: 3, ES13: 3, ES14: 1, ES15: 3, ES16: 3, ES17: 2, ES18: 3, ES19: 3, ES20: 2 },
      '71':  { ES1: 5, ES2: 4, ES3: 4, ES4:'Tf', ES5: 5, ES6:'Tf', ES7: 4, ES8: 2, ES9: 6, ES10:'Tf', ES11: 5, ES12: 2, ES13: 4, ES14: 3, ES15: 2, ES16: 4, ES17: 3, ES18: 2, ES19: 2, ES20: 5 },
      '72':  { ES1: 1, ES2: 1, ES3: 1, ES4:'Tf', ES5: 1, ES6:'Tf', ES7: 1, ES8: 1, ES9: 2, ES10:'Tf', ES11: 1, ES12: 1, ES13: 1, ES14: 2, ES15: 1, ES16: 1, ES17: 1, ES18: 1, ES19: 1, ES20: 1 },
      '73':  { ES1: 4, ES2: 6, ES3: 3, ES4:'Tf', ES5: 4, ES6:'Tf', ES7: 3, ES8: 5, ES9: 3, ES10:'Tf', ES11:'Ab', ES12:'Ab', ES13:'Ab', ES14:'Ab', ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '74':  { ES1: 6, ES2: 5, ES3: 6, ES4: 1, ES5: 6, ES6:'Tf', ES7: 5, ES8: 4, ES9: 5, ES10:'Tf', ES11: 3, ES12: 4, ES13: 2, ES14: 4, ES15: 5, ES16: 5, ES17: 4, ES18: 5, ES19: 5, ES20: 4 },
      '75':  { ES1: 2, ES2: 3, ES3: 5, ES4:'Tf', ES5: 2, ES6:'Tf', ES7: 6, ES8: 6, ES9: 1, ES10:'Tf', ES11: 4, ES12: 5, ES13: 5, ES14: 5, ES15: 4, ES16: 2, ES17: 5, ES18: 4, ES19: 4, ES20: 3 },
      '76':  { ES1: 1, ES2: 1, ES3: 1, ES4: 1, ES5: 1, ES6:'Tf', ES7: 1, ES8: 1, ES9: 1, ES10:'Tf', ES11: 1, ES12: 1, ES13: 1, ES14: 1, ES15: 1, ES16: 1, ES17: 1, ES18: 1, ES19: 1, ES20: 1 },
      '79':  { ES1: 1, ES2: 1, ES3: 1, ES4:'Ab', ES5:'Ab', ES6:'Ab', ES7: 1, ES8: 1, ES9: 1, ES10:'Tf', ES11: 1, ES12: 1, ES13: 1, ES14: 1, ES15:'Ab', ES16:'Ab', ES17:'Ab', ES18:'Ab', ES19:'Ab', ES20:'Ab' },
      '80':  { ES1: 1, ES2: 1, ES3: 1, ES4: 1, ES5: 1, ES6:'Tf', ES7: 1, ES8: 1, ES9: 1, ES10:'Tf', ES11: 1, ES12: 1, ES13: 1, ES14: 1, ES15: 1, ES16: 1, ES17: 1, ES18: 1, ES19: 1, ES20: 1 },
    },
  },
];

module.exports = { RALLYES };
