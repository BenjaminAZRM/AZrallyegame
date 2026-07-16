// ─── CHRONO RALLYE RACE — MOTEUR (autorité serveur) ───────────────────────────
// Toute la logique de jeu est ici. Le client n'envoie que des CHOIX ;
// le serveur recalcule chronos et classements. Aucun temps client n'est cru.
// Échelle bonus/malus : grille et abandon divisés par 5, arrondis au dixième
// (abandon = 3 s/spéciale). Toutes les spéciales comptent.
'use strict';
const crypto = require('crypto');

// Table bonus/malus extraite du PDF (grille triangulaire 50x50), divisée par 5.
// Clé "position-engages" -> secondes. Négatif = bonus, positif = malus.
const GRID = {"1-1":0,"1-2":-0.2,"1-3":-0.4,"1-4":-0.7,"1-5":-0.9,"1-6":-1.1,"1-7":-1.3,"1-8":-1.6,"1-9":-1.8,"1-10":-2,"1-11":-2,"1-12":-2,"1-13":-2,"1-14":-2,"1-15":-2,"1-16":-2,"1-17":-2,"1-18":-2,"1-19":-2,"1-20":-2,"1-21":-2,"1-22":-2,"1-23":-2,"1-24":-2,"1-25":-2,"1-26":-2,"1-27":-2,"1-28":-2,"1-29":-2,"1-30":-2,"1-31":-2,"1-32":-2,"1-33":-2,"1-34":-2,"1-35":-2,"1-36":-2,"1-37":-2,"1-38":-2,"1-39":-2,"1-40":-2,"1-41":-2,"1-42":-2,"1-43":-2,"1-44":-2,"1-45":-2,"1-46":-2,"1-47":-2,"1-48":-2,"1-49":-2,"1-50":-2,"2-2":0.2,"2-3":0,"2-4":0,"2-5":-0.4,"2-6":-0.6,"2-7":-0.9,"2-8":-1,"2-9":-1.2,"2-10":-1.3,"2-11":-1.5,"2-12":-1.5,"2-13":-1.5,"2-14":-1.6,"2-15":-1.6,"2-16":-1.6,"2-17":-1.6,"2-18":-1.7,"2-19":-1.7,"2-20":-1.7,"2-21":-1.7,"2-22":-1.7,"2-23":-1.7,"2-24":-1.7,"2-25":-1.7,"2-26":-1.7,"2-27":-1.8,"2-28":-1.8,"2-29":-1.8,"2-30":-1.8,"2-31":-1.8,"2-32":-1.8,"2-33":-1.8,"2-34":-1.8,"2-35":-1.8,"2-36":-1.8,"2-37":-1.8,"2-38":-1.8,"2-39":-1.8,"2-40":-1.8,"2-41":-1.8,"2-42":-1.8,"2-43":-1.8,"2-44":-1.8,"2-45":-1.8,"2-46":-1.8,"2-47":-1.8,"2-48":-1.8,"2-49":-1.8,"2-50":-1.8,"3-3":0.4,"3-4":0.3,"3-5":0,"3-6":0,"3-7":-0.4,"3-8":-0.5,"3-9":-0.6,"3-10":-0.7,"3-11":-1,"3-12":-1,"3-13":-1,"3-14":-1.2,"3-15":-1.2,"3-16":-1.2,"3-17":-1.2,"3-18":-1.3,"3-19":-1.3,"3-20":-1.3,"3-21":-1.3,"3-22":-1.3,"3-23":-1.4,"3-24":-1.4,"3-25":-1.4,"3-26":-1.4,"3-27":-1.5,"3-28":-1.5,"3-29":-1.5,"3-30":-1.5,"3-31":-1.5,"3-32":-1.6,"3-33":-1.6,"3-34":-1.6,"3-35":-1.6,"3-36":-1.6,"3-37":-1.6,"3-38":-1.6,"3-39":-1.6,"3-40":-1.6,"3-41":-1.6,"3-42":-1.6,"3-43":-1.6,"3-44":-1.6,"3-45":-1.6,"3-46":-1.6,"3-47":-1.6,"3-48":-1.6,"3-49":-1.7,"3-50":-1.7,"4-4":0.7,"4-5":0.4,"4-6":0.4,"4-7":0,"4-8":0,"4-9":0,"4-10":0,"4-11":-0.5,"4-12":-0.5,"4-13":-0.5,"4-14":-0.8,"4-15":-0.8,"4-16":-0.8,"4-17":-0.8,"4-18":-1,"4-19":-1,"4-20":-1,"4-21":-1,"4-22":-1,"4-23":-1.1,"4-24":-1.1,"4-25":-1.1,"4-26":-1.1,"4-27":-1.2,"4-28":-1.2,"4-29":-1.2,"4-30":-1.2,"4-31":-1.2,"4-32":-1.3,"4-33":-1.3,"4-34":-1.3,"4-35":-1.3,"4-36":-1.3,"4-37":-1.3,"4-38":-1.4,"4-39":-1.4,"4-40":-1.4,"4-41":-1.4,"4-42":-1.4,"4-43":-1.5,"4-44":-1.5,"4-45":-1.5,"4-46":-1.5,"4-47":-1.5,"4-48":-1.5,"4-49":-1.5,"4-50":-1.5,"5-5":0.9,"5-6":0.7,"5-7":0.4,"5-8":0.4,"5-9":0.4,"5-10":0.3,"5-11":0,"5-12":0,"5-13":0,"5-14":-0.4,"5-15":-0.4,"5-16":-0.4,"5-17":-0.4,"5-18":-0.7,"5-19":-0.7,"5-20":-0.7,"5-21":-0.7,"5-22":-0.7,"5-23":-0.9,"5-24":-0.9,"5-25":-0.9,"5-26":-0.9,"5-27":-1,"5-28":-1,"5-29":-1,"5-30":-1,"5-31":-1,"5-32":-1.1,"5-33":-1.1,"5-34":-1.1,"5-35":-1.1,"5-36":-1.1,"5-37":-1.1,"5-38":-1.2,"5-39":-1.2,"5-40":-1.2,"5-41":-1.2,"5-42":-1.2,"5-43":-1.3,"5-44":-1.3,"5-45":-1.3,"5-46":-1.3,"5-47":-1.3,"5-48":-1.3,"5-49":-1.3,"5-50":-1.3,"6-6":1.1,"6-7":0.9,"6-8":0.8,"6-9":0.7,"6-10":0.7,"6-11":0.3,"6-12":0.3,"6-13":0.2,"6-14":0,"6-15":0,"6-16":0,"6-17":0,"6-18":-0.3,"6-19":-0.3,"6-20":-0.3,"6-21":-0.3,"6-22":-0.3,"6-23":-0.6,"6-24":-0.6,"6-25":-0.6,"6-26":-0.6,"6-27":-0.8,"6-28":-0.8,"6-29":-0.8,"6-30":-0.8,"6-31":-0.8,"6-32":-0.9,"6-33":-0.9,"6-34":-0.9,"6-35":-0.9,"6-36":-0.9,"6-37":-0.9,"6-38":-1,"6-39":-1,"6-40":-1,"6-41":-1,"6-42":-1,"6-43":-1.1,"6-44":-1.1,"6-45":-1.1,"6-46":-1.1,"6-47":-1.1,"6-48":-1.1,"6-49":-1.2,"6-50":-1.2,"7-7":1.3,"7-8":1.2,"7-9":1.1,"7-10":1,"7-11":0.7,"7-12":0.6,"7-13":0.5,"7-14":0.2,"7-15":0.2,"7-16":0.2,"7-17":0.2,"7-18":0,"7-19":0,"7-20":0,"7-21":0,"7-22":0,"7-23":-0.3,"7-24":-0.3,"7-25":-0.3,"7-26":-0.3,"7-27":-0.5,"7-28":-0.5,"7-29":-0.5,"7-30":-0.5,"7-31":-0.5,"7-32":-0.7,"7-33":-0.7,"7-34":-0.7,"7-35":-0.7,"7-36":-0.7,"7-37":-0.7,"7-38":-0.8,"7-39":-0.8,"7-40":-0.8,"7-41":-0.8,"7-42":-0.8,"7-43":-0.9,"7-44":-0.9,"7-45":-0.9,"7-46":-0.9,"7-47":-0.9,"7-48":-0.9,"7-49":-1,"7-50":-1,"8-8":1.6,"8-9":1.4,"8-10":1.3,"8-11":1,"8-12":0.9,"8-13":0.8,"8-14":0.5,"8-15":0.4,"8-16":0.4,"8-17":0.4,"8-18":0.2,"8-19":0.2,"8-20":0.2,"8-21":0.1,"8-22":0.1,"8-23":0,"8-24":0,"8-25":0,"8-26":0,"8-27":-0.2,"8-28":-0.2,"8-29":-0.2,"8-30":-0.2,"8-31":-0.2,"8-32":-0.4,"8-33":-0.4,"8-34":-0.4,"8-35":-0.4,"8-36":-0.4,"8-37":-0.4,"8-38":-0.6,"8-39":-0.6,"8-40":-0.6,"8-41":-0.6,"8-42":-0.6,"8-43":-0.7,"8-44":-0.7,"8-45":-0.7,"8-46":-0.7,"8-47":-0.7,"8-48":-0.7,"8-49":-0.8,"8-50":-0.8,"9-9":1.8,"9-10":1.7,"9-11":1.3,"9-12":1.1,"9-13":1,"9-14":0.8,"9-15":0.7,"9-16":0.6,"9-17":0.5,"9-18":0.4,"9-19":0.3,"9-20":0.3,"9-21":0.3,"9-22":0.3,"9-23":0.1,"9-24":0.1,"9-25":0.1,"9-26":0.1,"9-27":0,"9-28":0,"9-29":0,"9-30":0,"9-31":0,"9-32":-0.2,"9-33":-0.2,"9-34":-0.2,"9-35":-0.2,"9-36":-0.2,"9-37":-0.2,"9-38":-0.4,"9-39":-0.4,"9-40":-0.4,"9-41":-0.4,"9-42":-0.4,"9-43":-0.5,"9-44":-0.5,"9-45":-0.5,"9-46":-0.5,"9-47":-0.5,"9-48":-0.5,"9-49":-0.7,"9-50":-0.7,"10-10":2,"10-11":1.7,"10-12":1.4,"10-13":1.2,"10-14":1,"10-15":0.9,"10-16":0.8,"10-17":0.7,"10-18":0.5,"10-19":0.5,"10-20":0.5,"10-21":0.4,"10-22":0.4,"10-23":0.3,"10-24":0.2,"10-25":0.2,"10-26":0.2,"10-27":0.1,"10-28":0.1,"10-29":0.1,"10-30":0.1,"10-31":0.1,"10-32":0,"10-33":0,"10-34":0,"10-35":0,"10-36":0,"10-37":0,"10-38":-0.2,"10-39":-0.2,"10-40":-0.2,"10-41":-0.2,"10-42":-0.2,"10-43":-0.4,"10-44":-0.4,"10-45":-0.4,"10-46":-0.4,"10-47":-0.4,"10-48":-0.4,"10-49":-0.5,"10-50":-0.5,"11-11":2,"11-12":1.7,"11-13":1.5,"11-14":1.2,"11-15":1.1,"11-16":1,"11-17":0.9,"11-18":0.7,"11-19":0.7,"11-20":0.6,"11-21":0.6,"11-22":0.5,"11-23":0.4,"11-24":0.4,"11-25":0.4,"11-26":0.3,"11-27":0.2,"11-28":0.2,"11-29":0.2,"11-30":0.2,"11-31":0.2,"11-32":0.1,"11-33":0.1,"11-34":0.1,"11-35":0.1,"11-36":0.1,"11-37":0.1,"11-38":0,"11-39":0,"11-40":0,"11-41":0,"11-42":0,"11-43":-0.2,"11-44":-0.2,"11-45":-0.2,"11-46":-0.2,"11-47":-0.2,"11-48":-0.2,"11-49":-0.3,"11-50":-0.3,"12-12":2,"12-13":1.8,"12-14":1.5,"12-15":1.3,"12-16":1.2,"12-17":1.1,"12-18":0.9,"12-19":0.8,"12-20":0.8,"12-21":0.7,"12-22":0.7,"12-23":0.5,"12-24":0.5,"12-25":0.5,"12-26":0.4,"12-27":0.3,"12-28":0.3,"12-29":0.3,"12-30":0.3,"12-31":0.3,"12-32":0.2,"12-33":0.2,"12-34":0.2,"12-35":0.2,"12-36":0.2,"12-37":0.1,"12-38":0.1,"12-39":0.1,"12-40":0.1,"12-41":0.1,"12-42":0.1,"12-43":0,"12-44":0,"12-45":0,"12-46":0,"12-47":0,"12-48":0,"12-49":-0.2,"12-50":-0.2,"13-13":2,"13-14":1.8,"13-15":1.6,"13-16":1.4,"13-17":1.3,"13-18":1.1,"13-19":1,"13-20":0.9,"13-21":0.9,"13-22":0.8,"13-23":0.7,"13-24":0.6,"13-25":0.6,"13-26":0.6,"13-27":0.4,"13-28":0.4,"13-29":0.4,"13-30":0.4,"13-31":0.4,"13-32":0.3,"13-33":0.3,"13-34":0.2,"13-35":0.2,"13-36":0.2,"13-37":0.2,"13-38":0.1,"13-39":0.1,"13-40":0.1,"13-41":0.1,"13-42":0.1,"13-43":0.1,"13-44":0.1,"13-45":0.1,"13-46":0.1,"13-47":0.1,"13-48":0.1,"13-49":0,"13-50":0,"14-14":2,"14-15":1.8,"14-16":1.6,"14-17":1.5,"14-18":1.3,"14-19":1.2,"14-20":1.1,"14-21":1,"14-22":0.9,"14-23":0.8,"14-24":0.8,"14-25":0.7,"14-26":0.7,"14-27":0.6,"14-28":0.5,"14-29":0.5,"14-30":0.5,"14-31":0.5,"14-32":0.4,"14-33":0.3,"14-34":0.3,"14-35":0.3,"14-36":0.3,"14-37":0.3,"14-38":0.2,"14-39":0.2,"14-40":0.2,"14-41":0.2,"14-42":0.2,"14-43":0.1,"14-44":0.1,"14-45":0.1,"14-46":0.1,"14-47":0.1,"14-48":0.1,"14-49":0.1,"14-50":0.1,"15-15":2,"15-16":1.8,"15-17":1.6,"15-18":1.5,"15-19":1.3,"15-20":1.2,"15-21":1.1,"15-22":1.1,"15-23":0.9,"15-24":0.9,"15-25":0.8,"15-26":0.8,"15-27":0.7,"15-28":0.6,"15-29":0.6,"15-30":0.6,"15-31":0.5,"15-32":0.5,"15-33":0.4,"15-34":0.4,"15-35":0.4,"15-36":0.4,"15-37":0.4,"15-38":0.3,"15-39":0.3,"15-40":0.3,"15-41":0.3,"15-42":0.3,"15-43":0.2,"15-44":0.2,"15-45":0.2,"15-46":0.2,"15-47":0.2,"15-48":0.2,"15-49":0.1,"15-50":0.1,"16-16":2,"16-17":1.8,"16-18":1.6,"16-19":1.5,"16-20":1.4,"16-21":1.3,"16-22":1.2,"16-23":1.1,"16-24":1,"16-25":0.9,"16-26":0.9,"16-27":0.8,"16-28":0.7,"16-29":0.7,"16-30":0.7,"16-31":0.6,"16-32":0.5,"16-33":0.5,"16-34":0.5,"16-35":0.5,"16-36":0.5,"16-37":0.4,"16-38":0.4,"16-39":0.4,"16-40":0.3,"16-41":0.3,"16-42":0.3,"16-43":0.3,"16-44":0.2,"16-45":0.2,"16-46":0.2,"16-47":0.2,"16-48":0.2,"16-49":0.2,"16-50":0.2,"17-17":2,"17-18":1.8,"17-19":1.7,"17-20":1.5,"17-21":1.4,"17-22":1.3,"17-23":1.2,"17-24":1.1,"17-25":1.1,"17-26":1,"17-27":0.9,"17-28":0.8,"17-29":0.8,"17-30":0.8,"17-31":0.7,"17-32":0.6,"17-33":0.6,"17-34":0.6,"17-35":0.6,"17-36":0.5,"17-37":0.5,"17-38":0.4,"17-39":0.4,"17-40":0.4,"17-41":0.4,"17-42":0.4,"17-43":0.3,"17-44":0.3,"17-45":0.3,"17-46":0.3,"17-47":0.3,"17-48":0.3,"17-49":0.2,"17-50":0.2,"18-18":2,"18-19":1.8,"18-20":1.7,"18-21":1.6,"18-22":1.5,"18-23":1.3,"18-24":1.2,"18-25":1.2,"18-26":1.1,"18-27":1,"18-28":0.9,"18-29":0.9,"18-30":0.9,"18-31":0.8,"18-32":0.7,"18-33":0.7,"18-34":0.7,"18-35":0.6,"18-36":0.6,"18-37":0.6,"18-38":0.5,"18-39":0.5,"18-40":0.5,"18-41":0.5,"18-42":0.5,"18-43":0.4,"18-44":0.4,"18-45":0.4,"18-46":0.4,"18-47":0.3,"18-48":0.3,"18-49":0.3,"18-50":0.3,"19-19":2,"19-20":1.8,"19-21":1.7,"19-22":1.6,"19-23":1.5,"19-24":1.4,"19-25":1.3,"19-26":1.2,"19-27":1.1,"19-28":1.1,"19-29":1,"19-30":1,"19-31":0.9,"19-32":0.8,"19-33":0.8,"19-34":0.8,"19-35":0.7,"19-36":0.7,"19-37":0.7,"19-38":0.6,"19-39":0.6,"19-40":0.6,"19-41":0.5,"19-42":0.5,"19-43":0.5,"19-44":0.4,"19-45":0.4,"19-46":0.4,"19-47":0.4,"19-48":0.4,"19-49":0.3,"19-50":0.3,"20-20":2,"20-21":1.9,"20-22":1.7,"20-23":1.6,"20-24":1.5,"20-25":1.4,"20-26":1.3,"20-27":1.2,"20-28":1.2,"20-29":1.1,"20-30":1,"20-31":1,"20-32":0.9,"20-33":0.9,"20-34":0.8,"20-35":0.8,"20-36":0.8,"20-37":0.7,"20-38":0.7,"20-39":0.6,"20-40":0.6,"20-41":0.6,"20-42":0.6,"20-43":0.5,"20-44":0.5,"20-45":0.5,"20-46":0.5,"20-47":0.5,"20-48":0.4,"20-49":0.4,"20-50":0.4,"21-21":2,"21-22":1.9,"21-23":1.7,"21-24":1.6,"21-25":1.5,"21-26":1.4,"21-27":1.3,"21-28":1.3,"21-29":1.2,"21-30":1.1,"21-31":1.1,"21-32":1,"21-33":1,"21-34":0.9,"21-35":0.9,"21-36":0.8,"21-37":0.8,"21-38":0.7,"21-39":0.7,"21-40":0.7,"21-41":0.7,"21-42":0.6,"21-43":0.6,"21-44":0.6,"21-45":0.5,"21-46":0.5,"21-47":0.5,"21-48":0.5,"21-49":0.4,"21-50":0.4,"22-22":2,"22-23":1.9,"22-24":1.8,"22-25":1.6,"22-26":1.6,"22-27":1.4,"22-28":1.4,"22-29":1.3,"22-30":1.2,"22-31":1.2,"22-32":1.1,"22-33":1,"22-34":1,"22-35":1,"22-36":0.9,"22-37":0.9,"22-38":0.8,"22-39":0.8,"22-40":0.8,"22-41":0.7,"22-42":0.7,"22-43":0.6,"22-44":0.6,"22-45":0.6,"22-46":0.6,"22-47":0.6,"22-48":0.6,"22-49":0.5,"22-50":0.5,"23-23":2,"23-24":1.9,"23-25":1.8,"23-26":1.7,"23-27":1.6,"23-28":1.5,"23-29":1.4,"23-30":1.3,"23-31":1.3,"23-32":1.2,"23-33":1.1,"23-34":1.1,"23-35":1,"23-36":1,"23-37":1,"23-38":0.9,"23-39":0.9,"23-40":0.8,"23-41":0.8,"23-42":0.8,"23-43":0.7,"23-44":0.7,"23-45":0.7,"23-46":0.6,"23-47":0.6,"23-48":0.6,"23-49":0.6,"23-50":0.5,"24-24":2,"24-25":1.9,"24-26":1.8,"24-27":1.7,"24-28":1.6,"24-29":1.5,"24-30":1.4,"24-31":1.4,"24-32":1.3,"24-33":1.2,"24-34":1.2,"24-35":1.1,"24-36":1.1,"24-37":1,"24-38":1,"24-39":0.9,"24-40":0.9,"24-41":0.9,"24-42":0.8,"24-43":0.8,"24-44":0.8,"24-45":0.7,"24-46":0.7,"24-47":0.7,"24-48":0.7,"24-49":0.6,"24-50":0.6,"25-25":2,"25-26":1.9,"25-27":1.8,"25-28":1.7,"25-29":1.6,"25-30":1.5,"25-31":1.5,"25-32":1.4,"25-33":1.3,"25-34":1.2,"25-35":1.2,"25-36":1.2,"25-37":1.1,"25-38":1,"25-39":1,"25-40":1,"25-41":0.9,"25-42":0.9,"25-43":0.8,"25-44":0.8,"25-45":0.8,"25-46":0.8,"25-47":0.7,"25-48":0.7,"25-49":0.7,"25-50":0.6,"26-26":2,"26-27":1.9,"26-28":1.8,"26-29":1.7,"26-30":1.6,"26-31":1.5,"26-32":1.5,"26-33":1.4,"26-34":1.3,"26-35":1.3,"26-36":1.2,"26-37":1.2,"26-38":1.1,"26-39":1.1,"26-40":1,"26-41":1,"26-42":1,"26-43":0.9,"26-44":0.9,"26-45":0.8,"26-46":0.8,"26-47":0.8,"26-48":0.8,"26-49":0.7,"26-50":0.7,"27-27":2,"27-28":1.9,"27-29":1.8,"27-30":1.7,"27-31":1.6,"27-32":1.5,"27-33":1.5,"27-34":1.4,"27-35":1.4,"27-36":1.3,"27-37":1.3,"27-38":1.2,"27-39":1.1,"27-40":1.1,"27-41":1.1,"27-42":1,"27-43":1,"27-44":0.9,"27-45":0.9,"27-46":0.9,"27-47":0.9,"27-48":0.8,"27-49":0.8,"27-50":0.8,"28-28":2,"28-29":1.9,"28-30":1.8,"28-31":1.7,"28-32":1.6,"28-33":1.6,"28-34":1.5,"28-35":1.4,"28-36":1.4,"28-37":1.3,"28-38":1.3,"28-39":1.2,"28-40":1.2,"28-41":1.1,"28-42":1.1,"28-43":1,"28-44":1,"28-45":1,"28-46":0.9,"28-47":0.9,"28-48":0.9,"28-49":0.8,"28-50":0.8,"29-29":2,"29-30":1.9,"29-31":1.8,"29-32":1.7,"29-33":1.7,"29-34":1.6,"29-35":1.5,"29-36":1.5,"29-37":1.4,"29-38":1.3,"29-39":1.3,"29-40":1.2,"29-41":1.2,"29-42":1.2,"29-43":1.1,"29-44":1.1,"29-45":1,"29-46":1,"29-47":1,"29-48":0.9,"29-49":0.9,"29-50":0.9,"30-30":2,"30-31":1.9,"30-32":1.8,"30-33":1.7,"30-34":1.7,"30-35":1.6,"30-36":1.5,"30-37":1.5,"30-38":1.4,"30-39":1.4,"30-40":1.3,"30-41":1.3,"30-42":1.2,"30-43":1.2,"30-44":1.1,"30-45":1.1,"30-46":1.1,"30-47":1,"30-48":1,"30-49":0.9,"30-50":0.9,"31-31":2,"31-32":1.9,"31-33":1.8,"31-34":1.8,"31-35":1.7,"31-36":1.6,"31-37":1.6,"31-38":1.5,"31-39":1.4,"31-40":1.4,"31-41":1.3,"31-42":1.3,"31-43":1.2,"31-44":1.2,"31-45":1.2,"31-46":1.1,"31-47":1.1,"31-48":1.1,"31-49":1,"31-50":1,"32-32":2,"32-33":1.9,"32-34":1.8,"32-35":1.8,"32-36":1.7,"32-37":1.6,"32-38":1.6,"32-39":1.5,"32-40":1.4,"32-41":1.4,"32-42":1.4,"32-43":1.3,"32-44":1.2,"32-45":1.2,"32-46":1.2,"32-47":1.1,"32-48":1.1,"32-49":1.1,"32-50":1,"33-33":2,"33-34":1.9,"33-35":1.8,"33-36":1.8,"33-37":1.7,"33-38":1.6,"33-39":1.6,"33-40":1.5,"33-41":1.5,"33-42":1.4,"33-43":1.4,"33-44":1.3,"33-45":1.3,"33-46":1.2,"33-47":1.2,"33-48":1.2,"33-49":1.1,"33-50":1.1,"34-34":2,"34-35":1.9,"34-36":1.8,"34-37":1.8,"34-38":1.7,"34-39":1.6,"34-40":1.6,"34-41":1.5,"34-42":1.5,"34-43":1.4,"34-44":1.4,"34-45":1.3,"34-46":1.3,"34-47":1.3,"34-48":1.2,"34-49":1.2,"34-50":1.1,"35-35":2,"35-36":1.9,"35-37":1.9,"35-38":1.8,"35-39":1.7,"35-40":1.7,"35-41":1.6,"35-42":1.5,"35-43":1.5,"35-44":1.4,"35-45":1.4,"35-46":1.4,"35-47":1.3,"35-48":1.3,"35-49":1.2,"35-50":1.2,"36-36":2,"36-37":1.9,"36-38":1.9,"36-39":1.8,"36-40":1.7,"36-41":1.7,"36-42":1.6,"36-43":1.5,"36-44":1.5,"36-45":1.5,"36-46":1.4,"36-47":1.4,"36-48":1.3,"36-49":1.3,"36-50":1.2,"37-37":2,"37-38":1.9,"37-39":1.9,"37-40":1.8,"37-41":1.7,"37-42":1.7,"37-43":1.6,"37-44":1.6,"37-45":1.5,"37-46":1.5,"37-47":1.4,"37-48":1.4,"37-49":1.3,"37-50":1.3,"38-38":2,"38-39":1.9,"38-40":1.9,"38-41":1.8,"38-42":1.7,"38-43":1.7,"38-44":1.6,"38-45":1.6,"38-46":1.5,"38-47":1.5,"38-48":1.4,"38-49":1.4,"38-50":1.4,"39-39":2,"39-40":1.9,"39-41":1.9,"39-42":1.8,"39-43":1.7,"39-44":1.7,"39-45":1.6,"39-46":1.6,"39-47":1.5,"39-48":1.5,"39-49":1.4,"39-50":1.4,"40-40":2,"40-41":1.9,"40-42":1.9,"40-43":1.8,"40-44":1.8,"40-45":1.7,"40-46":1.6,"40-47":1.6,"40-48":1.6,"40-49":1.5,"40-50":1.5,"41-41":2,"41-42":1.9,"41-43":1.9,"41-44":1.8,"41-45":1.8,"41-46":1.7,"41-47":1.7,"41-48":1.6,"41-49":1.6,"41-50":1.5,"42-42":2,"42-43":1.9,"42-44":1.9,"42-45":1.8,"42-46":1.8,"42-47":1.7,"42-48":1.7,"42-49":1.6,"42-50":1.6,"43-43":2,"43-44":1.9,"43-45":1.9,"43-46":1.8,"43-47":1.8,"43-48":1.7,"43-49":1.7,"43-50":1.6,"44-44":2,"44-45":1.9,"44-46":1.9,"44-47":1.8,"44-48":1.8,"44-49":1.7,"44-50":1.7,"45-45":2,"45-46":1.9,"45-47":1.9,"45-48":1.8,"45-49":1.8,"45-50":1.7,"46-46":2,"46-47":1.9,"46-48":1.9,"46-49":1.8,"46-50":1.8,"47-47":2,"47-48":1.9,"47-49":1.9,"47-50":1.8,"48-48":2,"48-49":1.9,"48-50":1.9,"49-49":2,"49-50":1.9,"50-50":2};

// Statuts spéciaux : Ab (abandon) = +3 s/spéciale ; Tf (temps forfaitaire) et Fo (forfait) = 0.
const SPECIAL = {"Ab":{"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":3,"9":3,"10":3,"11":3,"12":3,"13":3,"14":3,"15":3,"16":3,"17":3,"18":3,"19":3,"20":3,"21":3,"22":3,"23":3,"24":3,"25":3,"26":3,"27":3,"28":3,"29":3,"30":3,"31":3,"32":3,"33":3,"34":3,"35":3,"36":3,"37":3,"38":3,"39":3,"40":3,"41":3,"42":3,"43":3,"44":3,"45":3,"46":3,"47":3,"48":3,"49":3,"50":3},"Tf":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0,"17":0,"18":0,"19":0,"20":0,"21":0,"22":0,"23":0,"24":0,"25":0,"26":0,"27":0,"28":0,"29":0,"30":0,"31":0,"32":0,"33":0,"34":0,"35":0,"36":0,"37":0,"38":0,"39":0,"40":0,"41":0,"42":0,"43":0,"44":0,"45":0,"46":0,"47":0,"48":0,"49":0,"50":0},"Fo":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0,"17":0,"18":0,"19":0,"20":0,"21":0,"22":0,"23":0,"24":0,"25":0,"26":0,"27":0,"28":0,"29":0,"30":0,"31":0,"32":0,"33":0,"34":0,"35":0,"36":0,"37":0,"38":0,"39":0,"40":0,"41":0,"42":0,"43":0,"44":0,"45":0,"46":0,"47":0,"48":0,"49":0,"50":0}};

const MAX_ENGAGES = 50;
const BUDGET = 100;
const NB_EQUIPAGES = 3;
const MAX_JOKERS = 3;              // jokers posables par rallye
const SEUIL_POURCENT = 15;         // à partir de 15 joueurs -> barème en %
const PTS_FIXE = [35,27,23,19,16,13,10,7,4,2];   // < 15 joueurs
const PTS_DECILE = [25,18,15,12,10,8,6,4,2,1];   // >= 15 joueurs
const PTS_TOP10  = [10,9,8,7,6,5,4,3,2,1];
const JOKERS = ['flat','cold','forf','pwr','regl'];
const POWER_STAGE = [-1, -0.8, -0.6, -0.4, -0.2];   // joker Power stage : bonus ajouté aux 5 premiers de la classe

const r1 = x => Math.round(x * 10) / 10;
const clampEng = n => Math.max(1, Math.min(MAX_ENGAGES, n | 0));

// Bonus/malus brut d'un résultat. res = nombre (position) ou "Ab"/"Tf"/"Fo".
function bmBrut(res, engages) {
  const e = clampEng(engages);
  if (typeof res === 'string') {
    const s = SPECIAL[res];
    if (!s) return 0;
    const v = s[String(e)];
    return v == null ? 0 : v;
  }
  const p = res | 0;
  if (p < 1) return 0;
  const v = GRID[p + '-' + e];
  return v == null ? 0 : v;   // position > engagés : hors grille
}

// Tirage aléatoire DÉTERMINISTE (joker "Temps forfaitaire").
// Même rallye + même joueur + même spéciale + même équipage => toujours le même
// tirage. Impossible à rejouer jusqu'à obtenir un bon résultat.
function rangAleatoire(seedParts, engages) {
  const h = crypto.createHash('sha256').update(seedParts.join('|')).digest();
  return (h.readUInt32BE(0) % clampEng(engages)) + 1;
}

// Applique un joker au bonus/malus d'UN équipage sur UNE spéciale.
// La voiture n'est jamais ciblable (règle du jeu).
function appliquerJoker(joker, res, engages, bm, seedParts) {
  switch (joker) {
    case 'flat':                                   // double bonus ET malus
      return r1(bm * 2);
    case 'cold':                                   // annule tout
      return 0;
    case 'forf':                                   // classement aléatoire dans la classe
      return bmBrut(rangAleatoire(seedParts, engages), engages);
    case 'pwr': {                                  // bonus FIXE ajouté si top 5 de sa classe
      // -1s au 1er, -0.8s au 2e, -0.6s au 3e, -0.4s au 4e, -0.2s au 5e. Rien au-delà.
      if (typeof res !== 'number' || res < 1 || res > 5) return bm;
      return r1(bm + POWER_STAGE[res - 1]);
    }
    case 'regl':                                   // gagne une place dans sa classe
      if (typeof res === 'number' && res > 1) return bmBrut(res - 1, engages);
      return bm;
    default:
      return bm;
  }
}

// Un équipage est-il définitivement hors course à partir d'une spéciale ?
// "Fo" = forfait (jamais parti) ; "Ab" sans reprise ultérieure = abandon définitif.
// Un "Ab" suivi d'un classement (Super-Rallye) n'est PAS définitif.
function horsCourse(rallye, engageId, ssIndex) {
  const res = (rallye.resultats || {})[engageId] || {};
  const codes = rallye.speciales.map(s => s.code);
  if (res[codes[0]] === 'Fo') return true;
  const ici = res[codes[ssIndex]];
  if (ici !== 'Ab' && ici !== 'Fo') return false;
  if (ici === 'Fo') return true;
  // "Ab" : définitif seulement s'il ne repart jamais (pas de Super-Rallye après)
  for (let i = ssIndex + 1; i < codes.length; i++) {
    const v = res[codes[i]];
    if (typeof v === 'number') return false;   // il repart -> pas définitif
  }
  return true;
}

// Bonus/malus de la VOITURE sur une spéciale : moyenne de tous les équipages
// réels roulant ce modèle. Les forfaits (Fo) sont exclus de la moyenne.
function bmVoiture(rallye, modele, ssCode) {
  return detailVoiture(rallye, modele, ssCode).bm;
}

// Détail de la moyenne voiture : la liste des équipages comptés et leur bonus/malus.
// Les forfaits (Fo) sont exclus de la moyenne.
function detailVoiture(rallye, modele, ssCode) {
  const lignes = [];
  for (const e of (rallye.engages || [])) {
    if (e.modele !== modele) continue;
    const res = ((rallye.resultats || {})[e.id] || {})[ssCode];
    if (res == null || res === 'Fo') continue;          // forfait : ignoré
    const nb = (rallye.classes || {})[e.classe] || 1;
    lignes.push({ id: e.id, pilote: e.pilote, classe: e.classe, engages: nb,
                  res, bm: bmBrut(res, nb) });
  }
  if (!lignes.length) return { bm: 0, lignes: [] };
  const bm = r1(lignes.reduce((a, l) => a + l.bm, 0) / lignes.length);
  return { bm, lignes };
}

// Chrono d'un joueur sur une spéciale.
// temps = base + somme(3 équipages) + voiture   (règle : ADDITION, pas moyenne)
function calculerSpeciale(rallye, ecurie, jokers, ssIndex) {
  const ss = rallye.speciales[ssIndex];
  const resultats = rallye.resultats || {};
  const detail = [];
  let somme = 0;

  ecurie.equipages.forEach((eid, k) => {
    const eng = rallye.engages.find(x => x.id === eid);
    if (!eng) { detail.push({ id: eid, bm: 0, erreur: 'introuvable' }); return; }
    const nb = (rallye.classes || {})[eng.classe] || 1;
    const res = (resultats[eid] || {})[ss.code];
    if (res == null) { detail.push({ id: eid, classe: eng.classe, engages: nb, res: null, bm: 0 }); return; }

    const brut = bmBrut(res, nb);
    const jk = jokers.find(j => j.ss === ss.code && j.equipage === eid);
    const bm = jk
      ? appliquerJoker(jk.joker, res, nb, brut, [rallye.id, ecurie.user, ss.code, eid])
      : brut;

    somme = r1(somme + bm);
    detail.push({ id: eid, pilote: eng.pilote, classe: eng.classe, engages: nb,
                  res, brut, bm, joker: jk ? jk.joker : null });
  });

  const dv = detailVoiture(rallye, ecurie.voiture, ss.code);
  const delta = r1(somme + dv.bm);
  const base = Number(ss.base) || 0;
  return { code: ss.code, nom: ss.nom, base, detail,
           voiture: { modele: ecurie.voiture, bm: dv.bm, lignes: dv.lignes },
           delta, temps: r1(base + delta) };
}

// Chrono total : uniquement les spéciales dont les résultats sont saisis.
// jusqu'a = index max inclus (pour reconstituer le général à l'issue d'une spéciale).
function calculerRallye(rallye, ecurie, jokers, jusqua) {
  if (!pret(rallye)) return { user: ecurie.user, speciales: [], total: 0, courues: 0 };
  const fin = (jusqua == null) ? rallye.speciales.length - 1 : jusqua;
  const ss = [];
  let total = 0;
  for (let i = 0; i <= fin && i < rallye.speciales.length; i++) {
    if (!speciqleCourue(rallye, i)) continue;
    const r = calculerSpeciale(rallye, ecurie, jokers, i);
    total = r1(total + r.temps);
    ss.push(r);
  }
  return { user: ecurie.user, speciales: ss, total, courues: ss.length };
}

// Une spéciale est "courue" dès qu'au moins un résultat y est saisi.
function speciqleCourue(rallye, ssIndex) {
  if (!rallye.speciales || !rallye.speciales[ssIndex]) return false;
  const code = rallye.speciales[ssIndex].code;
  const res = rallye.resultats || {};
  for (const id in res) if (res[id][code] != null) return true;
  return false;
}

// ─── VALIDATION D'UNE ÉCURIE ────────────────────────────────────────────────────
function validerEcurie(rallye, equipages, voiture) {
  if (!rallye.engages || !rallye.engages.length)
    return { ok: false, error: 'Les engagés de ce rallye ne sont pas encore connus.' };
  if (!Array.isArray(equipages) || equipages.length !== NB_EQUIPAGES)
    return { ok: false, error: 'Il faut exactement 3 équipages.' };
  if (new Set(equipages).size !== NB_EQUIPAGES)
    return { ok: false, error: 'Trois équipages différents sont requis.' };

  const choisis = [];
  for (const id of equipages) {
    const e = rallye.engages.find(x => x.id === id && x.selectionnable !== false);
    if (!e) return { ok: false, error: 'Équipage indisponible : ' + id };
    choisis.push(e);
  }
  const classes = choisis.map(e => e.classe);
  if (new Set(classes).size !== NB_EQUIPAGES)
    return { ok: false, error: 'Les 3 équipages doivent être de classes différentes.' };

  const v = (rallye.voitures || []).find(x => x.modele === voiture && x.selectionnable !== false);
  if (!v) return { ok: false, error: 'Modèle de voiture indisponible.' };

  const cout = choisis.reduce((a, e) => a + (e.cout || 0), 0) + (v.cout || 0);
  if (cout > BUDGET) return { ok: false, error: 'Budget dépassé (' + cout + '/' + BUDGET + ' crédits).' };

  return { ok: true, cout };
}

// ─── VALIDATION D'UN JOKER ──────────────────────────────────────────────────────
// Règles : 3 max par rallye | chaque joker 1 seule fois | jamais 2 jokers sur le
// même équipage sur la même spéciale (mais 2 jokers sur une même spéciale = OK si
// équipages différents) | spéciale non encore partie | équipage ni abandonné ni forfait.
function validerJoker(rallye, ecurie, jokersPoses, joker, ssCode, equipageId, maintenant) {
  if (!JOKERS.includes(joker)) return { ok: false, error: 'Joker inconnu.' };
  if (jokersPoses.length >= MAX_JOKERS)
    return { ok: false, error: 'Quota atteint : ' + MAX_JOKERS + ' jokers par rallye.' };
  if (jokersPoses.some(j => j.joker === joker))
    return { ok: false, error: 'Ce joker a déjà été utilisé sur ce rallye.' };

  const idx = rallye.speciales.findIndex(s => s.code === ssCode);
  if (idx < 0) return { ok: false, error: 'Spéciale inconnue.' };

  const dep = rallye.speciales[idx].depart ? Date.parse(rallye.speciales[idx].depart) : null;
  if (dep && maintenant >= dep) return { ok: false, error: 'La spéciale ' + ssCode + ' est déjà partie.' };
  if (speciqleCourue(rallye, idx)) return { ok: false, error: 'La spéciale ' + ssCode + ' est déjà courue.' };

  if (!ecurie.equipages.includes(equipageId))
    return { ok: false, error: 'Cet équipage n\'est pas dans ton écurie.' };
  if (jokersPoses.some(j => j.ss === ssCode && j.equipage === equipageId))
    return { ok: false, error: 'Un joker vise déjà cet équipage sur ' + ssCode + '.' };
  if (horsCourse(rallye, equipageId, Math.max(0, idx - 1)))
    return { ok: false, error: 'Équipage abandonné ou forfait : joker impossible.' };

  return { ok: true };
}

// ─── CLASSEMENT & POINTS ────────────────────────────────────────────────────────
// Classement général. jusqua = index de spéciale (inclus) pour figer le général
// à l'issue de cette spéciale ; null = état actuel.
function classement(rallye, ecuries, jokersParUser, jusqua) {
  const lignes = ecuries.map(ec =>
    calculerRallye(rallye, ec, jokersParUser[ec.user] || [], jusqua)
  );
  lignes.sort((a, b) => a.total - b.total);
  lignes.forEach((l, i) => { l.rang = i + 1; });
  return lignes;
}

// Général à l'issue de CHAQUE spéciale courue, avec l'évolution des places
// par rapport à la spéciale précédente (+ = places gagnées).
function generalParSpeciale(rallye, ecuries, jokersParUser) {
  const out = {};
  if (!pret(rallye)) return out;
  let precedent = null;
  for (let i = 0; i < rallye.speciales.length; i++) {
    if (!speciqleCourue(rallye, i)) continue;
    const cl = classement(rallye, ecuries, jokersParUser, i);
    const lead = cl.length ? cl[0].total : 0;
    const lignes = cl.map(l => {
      const av = precedent ? precedent[l.user] : null;
      return {
        user: l.user, rang: l.rang, total: l.total,
        ecart: r1(l.total - lead),
        evol: av == null ? null : (av - l.rang),   // +2 = a gagné 2 places
      };
    });
    out[rallye.speciales[i].code] = lignes;
    precedent = {};
    lignes.forEach(l => { precedent[l.user] = l.rang; });
  }
  return out;
}

// Barème : < 15 joueurs -> barème fixe ; >= 15 -> décile + bonus top 10.
// Seuls les joueurs ayant composé une écurie sont classés (donc marquent).
function points(rang, total) {
  if (rang < 1 || total < 1) return 0;
  if (total < SEUIL_POURCENT) return rang <= 10 ? PTS_FIXE[rang - 1] : 1;
  const d = Math.min(10, Math.ceil((rang / total) * 10));
  return PTS_DECILE[d - 1] + (rang <= 10 ? PTS_TOP10[rang - 1] : 0);
}

// Un rallye est "prêt" quand ses engagés et ses spéciales sont saisis.
// Sinon il n'existe que comme ligne de calendrier (informations en attente).
function pret(rallye) {
  return !!(rallye.engages && rallye.engages.length
         && rallye.speciales && rallye.speciales.length);
}

function cloture(rallye) {
  const s0 = rallye.speciales[0];
  const t = rallye.cloture || (s0 && s0.depart);
  return t ? Date.parse(t) : null;
}
function ecurieOuverte(rallye, maintenant) {
  if (!pret(rallye)) return false;          // données pas encore saisies
  const c = cloture(rallye);
  return c == null ? true : maintenant < c;
}

// État d'un rallye pour l'affichage : attente | ouvert | encours | termine
function etat(rallye, maintenant) {
  if (!pret(rallye)) return 'attente';
  const nb = rallye.speciales.length;
  const courues = rallye.speciales.filter((s, i) => speciqleCourue(rallye, i)).length;
  if (courues >= nb && nb > 0) return 'termine';
  if (ecurieOuverte(rallye, maintenant)) return 'ouvert';
  return 'encours';
}

module.exports = {
  GRID, SPECIAL, BUDGET, NB_EQUIPAGES, MAX_JOKERS, JOKERS, SEUIL_POURCENT, POWER_STAGE,
  bmBrut, bmVoiture, detailVoiture, horsCourse, speciqleCourue,
  calculerSpeciale, calculerRallye, classement, generalParSpeciale, points,
  validerEcurie, validerJoker, cloture, ecurieOuverte, pret, etat, r1,
};
