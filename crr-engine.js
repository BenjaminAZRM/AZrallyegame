// ─── CHRONO RALLYE RACE — MOTEUR (autorité serveur) ───────────────────────────
// Toute la logique de jeu est ici. Le client n'envoie que des CHOIX ;
// le serveur recalcule chronos et classements. Aucun temps client n'est cru.
'use strict';
const crypto = require('crypto');

// Table bonus/malus extraite du PDF (grille triangulaire 50x50 + statuts).
// Clé "position-engages" -> secondes. Négatif = bonus, positif = malus.
const GRID = {"1-1":0.0,"1-2":-1.1,"1-3":-2.2,"1-4":-3.3,"1-5":-4.4,"1-6":-5.6,"1-7":-6.7,"1-8":-7.8,"1-9":-8.9,"1-10":-10.0,"1-11":-10.0,"1-12":-10.0,"1-13":-10.0,"1-14":-10.0,"1-15":-10.0,"1-16":-10.0,"1-17":-10.0,"1-18":-10.0,"1-19":-10.0,"1-20":-10.0,"1-21":-10.0,"1-22":-10.0,"1-23":-10.0,"1-24":-10.0,"1-25":-10.0,"1-26":-10.0,"1-27":-10.0,"1-28":-10.0,"1-29":-10.0,"1-30":-10.0,"1-31":-10.0,"1-32":-10.0,"1-33":-10.0,"1-34":-10.0,"1-35":-10.0,"1-36":-10.0,"1-37":-10.0,"1-38":-10.0,"1-39":-10.0,"1-40":-10.0,"1-41":-10.0,"1-42":-10.0,"1-43":-10.0,"1-44":-10.0,"1-45":-10.0,"1-46":-10.0,"1-47":-10.0,"1-48":-10.0,"1-49":-10.0,"1-50":-10.0,"2-2":1.1,"2-3":0.0,"2-4":0.0,"2-5":-2.2,"2-6":-2.8,"2-7":-4.4,"2-8":-5.2,"2-9":-5.9,"2-10":-6.7,"2-11":-7.5,"2-12":-7.5,"2-13":-7.5,"2-14":-8.0,"2-15":-8.0,"2-16":-8.0,"2-17":-8.0,"2-18":-8.3,"2-19":-8.3,"2-20":-8.3,"2-21":-8.3,"2-22":-8.3,"2-23":-8.6,"2-24":-8.6,"2-25":-8.6,"2-26":-8.6,"2-27":-8.8,"2-28":-8.8,"2-29":-8.8,"2-30":-8.8,"2-31":-8.8,"2-32":-8.9,"2-33":-8.9,"2-34":-8.9,"2-35":-8.9,"2-36":-8.9,"2-37":-8.9,"2-38":-9.0,"2-39":-9.0,"2-40":-9.0,"2-41":-9.0,"2-42":-9.0,"2-43":-9.1,"2-44":-9.1,"2-45":-9.1,"2-46":-9.1,"2-47":-9.1,"2-48":-9.1,"2-49":-9.2,"2-50":-9.2,"3-3":2.2,"3-4":1.7,"3-5":0.0,"3-6":0.0,"3-7":-2.2,"3-8":-2.6,"3-9":-3.0,"3-10":-3.3,"3-11":-5.0,"3-12":-5.0,"3-13":-5.0,"3-14":-6.0,"3-15":-6.0,"3-16":-6.0,"3-17":-6.0,"3-18":-6.7,"3-19":-6.7,"3-20":-6.7,"3-21":-6.7,"3-22":-6.7,"3-23":-7.1,"3-24":-7.1,"3-25":-7.1,"3-26":-7.1,"3-27":-7.5,"3-28":-7.5,"3-29":-7.5,"3-30":-7.5,"3-31":-7.5,"3-32":-7.8,"3-33":-7.8,"3-34":-7.8,"3-35":-7.8,"3-36":-7.8,"3-37":-7.8,"3-38":-8.0,"3-39":-8.0,"3-40":-8.0,"3-41":-8.0,"3-42":-8.0,"3-43":-8.2,"3-44":-8.2,"3-45":-8.2,"3-46":-8.2,"3-47":-8.2,"3-48":-8.2,"3-49":-8.3,"3-50":-8.3,"4-4":3.3,"4-5":2.2,"4-6":1.9,"4-7":0.0,"4-8":0.0,"4-9":0.0,"4-10":0.0,"4-11":-2.5,"4-12":-2.5,"4-13":-2.5,"4-14":-4.0,"4-15":-4.0,"4-16":-4.0,"4-17":-4.0,"4-18":-5.0,"4-19":-5.0,"4-20":-5.0,"4-21":-5.0,"4-22":-5.0,"4-23":-5.7,"4-24":-5.7,"4-25":-5.7,"4-26":-5.7,"4-27":-6.2,"4-28":-6.2,"4-29":-6.2,"4-30":-6.2,"4-31":-6.2,"4-32":-6.7,"4-33":-6.7,"4-34":-6.7,"4-35":-6.7,"4-36":-6.7,"4-37":-6.7,"4-38":-7.0,"4-39":-7.0,"4-40":-7.0,"4-41":-7.0,"4-42":-7.0,"4-43":-7.3,"4-44":-7.3,"4-45":-7.3,"4-46":-7.3,"4-47":-7.3,"4-48":-7.3,"4-49":-7.5,"4-50":-7.5,"5-5":4.4,"5-6":3.7,"5-7":2.2,"5-8":1.9,"5-9":1.8,"5-10":1.7,"5-11":0.0,"5-12":0.0,"5-13":0.0,"5-14":-2.0,"5-15":-2.0,"5-16":-2.0,"5-17":-2.0,"5-18":-3.3,"5-19":-3.3,"5-20":-3.3,"5-21":-3.3,"5-22":-3.3,"5-23":-4.3,"5-24":-4.3,"5-25":-4.3,"5-26":-4.3,"5-27":-5.0,"5-28":-5.0,"5-29":-5.0,"5-30":-5.0,"5-31":-5.0,"5-32":-5.6,"5-33":-5.6,"5-34":-5.6,"5-35":-5.6,"5-36":-5.6,"5-37":-5.6,"5-38":-6.0,"5-39":-6.0,"5-40":-6.0,"5-41":-6.0,"5-42":-6.0,"5-43":-6.4,"5-44":-6.4,"5-45":-6.4,"5-46":-6.4,"5-47":-6.4,"5-48":-6.4,"5-49":-6.7,"5-50":-6.7,"6-6":5.6,"6-7":4.4,"6-8":3.9,"6-9":3.6,"6-10":3.3,"6-11":1.7,"6-12":1.4,"6-13":1.2,"6-14":0.0,"6-15":0.0,"6-16":0.0,"6-17":0.0,"6-18":-1.7,"6-19":-1.7,"6-20":-1.7,"6-21":-1.7,"6-22":-1.7,"6-23":-2.9,"6-24":-2.9,"6-25":-2.9,"6-26":-2.9,"6-27":-3.8,"6-28":-3.8,"6-29":-3.8,"6-30":-3.8,"6-31":-3.8,"6-32":-4.4,"6-33":-4.4,"6-34":-4.4,"6-35":-4.4,"6-36":-4.4,"6-37":-4.4,"6-38":-5.0,"6-39":-5.0,"6-40":-5.0,"6-41":-5.0,"6-42":-5.0,"6-43":-5.5,"6-44":-5.5,"6-45":-5.5,"6-46":-5.5,"6-47":-5.5,"6-48":-5.5,"6-49":-5.8,"6-50":-5.8,"7-7":6.7,"7-8":5.8,"7-9":5.3,"7-10":5.0,"7-11":3.3,"7-12":2.9,"7-13":2.5,"7-14":1.2,"7-15":1.1,"7-16":1.0,"7-17":0.9,"7-18":0.0,"7-19":0.0,"7-20":0.0,"7-21":0.0,"7-22":0.0,"7-23":-1.4,"7-24":-1.4,"7-25":-1.4,"7-26":-1.4,"7-27":-2.5,"7-28":-2.5,"7-29":-2.5,"7-30":-2.5,"7-31":-2.5,"7-32":-3.3,"7-33":-3.3,"7-34":-3.3,"7-35":-3.3,"7-36":-3.3,"7-37":-3.3,"7-38":-4.0,"7-39":-4.0,"7-40":-4.0,"7-41":-4.0,"7-42":-4.0,"7-43":-4.5,"7-44":-4.5,"7-45":-4.5,"7-46":-4.5,"7-47":-4.5,"7-48":-4.5,"7-49":-5.0,"7-50":-5.0,"8-8":7.8,"8-9":7.1,"8-10":6.7,"8-11":5.0,"8-12":4.3,"8-13":3.8,"8-14":2.5,"8-15":2.2,"8-16":2.0,"8-17":1.8,"8-18":0.9,"8-19":0.8,"8-20":0.8,"8-21":0.7,"8-22":0.7,"8-23":0.0,"8-24":0.0,"8-25":0.0,"8-26":0.0,"8-27":-1.2,"8-28":-1.2,"8-29":-1.2,"8-30":-1.2,"8-31":-1.2,"8-32":-2.2,"8-33":-2.2,"8-34":-2.2,"8-35":-2.2,"8-36":-2.2,"8-37":-2.2,"8-38":-3.0,"8-39":-3.0,"8-40":-3.0,"8-41":-3.0,"8-42":-3.0,"8-43":-3.6,"8-44":-3.6,"8-45":-3.6,"8-46":-3.6,"8-47":-3.6,"8-48":-3.6,"8-49":-4.2,"8-50":-4.2,"9-9":8.9,"9-10":8.3,"9-11":6.7,"9-12":5.7,"9-13":5.0,"9-14":3.8,"9-15":3.3,"9-16":3.0,"9-17":2.7,"9-18":1.8,"9-19":1.7,"9-20":1.5,"9-21":1.4,"9-22":1.3,"9-23":0.7,"9-24":0.6,"9-25":0.6,"9-26":0.6,"9-27":0.0,"9-28":0.0,"9-29":0.0,"9-30":0.0,"9-31":0.0,"9-32":-1.1,"9-33":-1.1,"9-34":-1.1,"9-35":-1.1,"9-36":-1.1,"9-37":-1.1,"9-38":-2.0,"9-39":-2.0,"9-40":-2.0,"9-41":-2.0,"9-42":-2.0,"9-43":-2.7,"9-44":-2.7,"9-45":-2.7,"9-46":-2.7,"9-47":-2.7,"9-48":-2.7,"9-49":-3.3,"9-50":-3.3,"10-10":10.0,"10-11":8.3,"10-12":7.1,"10-13":6.2,"10-14":5.0,"10-15":4.4,"10-16":4.0,"10-17":3.6,"10-18":2.7,"10-19":2.5,"10-20":2.3,"10-21":2.1,"10-22":2.0,"10-23":1.3,"10-24":1.2,"10-25":1.2,"10-26":1.1,"10-27":0.6,"10-28":0.5,"10-29":0.5,"10-30":0.5,"10-31":0.5,"10-32":0.0,"10-33":0.0,"10-34":0.0,"10-35":0.0,"10-36":0.0,"10-37":0.0,"10-38":-1.0,"10-39":-1.0,"10-40":-1.0,"10-41":-1.0,"10-42":-1.0,"10-43":-1.8,"10-44":-1.8,"10-45":-1.8,"10-46":-1.8,"10-47":-1.8,"10-48":-1.8,"10-49":-2.5,"10-50":-2.5,"11-11":10.0,"11-12":8.6,"11-13":7.5,"11-14":6.2,"11-15":5.6,"11-16":5.0,"11-17":4.5,"11-18":3.6,"11-19":3.3,"11-20":3.1,"11-21":2.9,"11-22":2.7,"11-23":2.0,"11-24":1.9,"11-25":1.8,"11-26":1.7,"11-27":1.1,"11-28":1.1,"11-29":1.0,"11-30":1.0,"11-31":0.9,"11-32":0.5,"11-33":0.4,"11-34":0.4,"11-35":0.4,"11-36":0.4,"11-37":0.4,"11-38":0.0,"11-39":0.0,"11-40":0.0,"11-41":0.0,"11-42":0.0,"11-43":-0.9,"11-44":-0.9,"11-45":-0.9,"11-46":-0.9,"11-47":-0.9,"11-48":-0.9,"11-49":-1.7,"11-50":-1.7,"12-12":10.0,"12-13":8.8,"12-14":7.5,"12-15":6.7,"12-16":6.0,"12-17":5.5,"12-18":4.5,"12-19":4.2,"12-20":3.8,"12-21":3.6,"12-22":3.3,"12-23":2.7,"12-24":2.5,"12-25":2.4,"12-26":2.2,"12-27":1.7,"12-28":1.6,"12-29":1.5,"12-30":1.4,"12-31":1.4,"12-32":0.9,"12-33":0.9,"12-34":0.8,"12-35":0.8,"12-36":0.8,"12-37":0.7,"12-38":0.4,"12-39":0.4,"12-40":0.3,"12-41":0.3,"12-42":0.3,"12-43":0.0,"12-44":0.0,"12-45":0.0,"12-46":0.0,"12-47":0.0,"12-48":0.0,"12-49":-0.8,"12-50":-0.8,"13-13":10.0,"13-14":8.8,"13-15":7.8,"13-16":7.0,"13-17":6.4,"13-18":5.5,"13-19":5.0,"13-20":4.6,"13-21":4.3,"13-22":4.0,"13-23":3.3,"13-24":3.1,"13-25":2.9,"13-26":2.8,"13-27":2.2,"13-28":2.1,"13-29":2.0,"13-30":1.9,"13-31":1.8,"13-32":1.4,"13-33":1.3,"13-34":1.2,"13-35":1.2,"13-36":1.2,"13-37":1.1,"13-38":0.7,"13-39":0.7,"13-40":0.7,"13-41":0.7,"13-42":0.6,"13-43":0.3,"13-44":0.3,"13-45":0.3,"13-46":0.3,"13-47":0.3,"13-48":0.3,"13-49":0.0,"13-50":0.0,"14-14":10.0,"14-15":8.9,"14-16":8.0,"14-17":7.3,"14-18":6.4,"14-19":5.8,"14-20":5.4,"14-21":5.0,"14-22":4.7,"14-23":4.0,"14-24":3.8,"14-25":3.5,"14-26":3.3,"14-27":2.8,"14-28":2.6,"14-29":2.5,"14-30":2.4,"14-31":2.3,"14-32":1.8,"14-33":1.7,"14-34":1.7,"14-35":1.6,"14-36":1.5,"14-37":1.5,"14-38":1.1,"14-39":1.1,"14-40":1.0,"14-41":1.0,"14-42":1.0,"14-43":0.6,"14-44":0.6,"14-45":0.6,"14-46":0.6,"14-47":0.6,"14-48":0.6,"14-49":0.3,"14-50":0.3,"15-15":10.0,"15-16":9.0,"15-17":8.2,"15-18":7.3,"15-19":6.7,"15-20":6.2,"15-21":5.7,"15-22":5.3,"15-23":4.7,"15-24":4.4,"15-25":4.1,"15-26":3.9,"15-27":3.3,"15-28":3.2,"15-29":3.0,"15-30":2.9,"15-31":2.7,"15-32":2.3,"15-33":2.2,"15-34":2.1,"15-35":2.0,"15-36":1.9,"15-37":1.9,"15-38":1.5,"15-39":1.4,"15-40":1.4,"15-41":1.3,"15-42":1.3,"15-43":1.0,"15-44":0.9,"15-45":0.9,"15-46":0.9,"15-47":0.9,"15-48":0.8,"15-49":0.6,"15-50":0.5,"16-16":10.0,"16-17":9.1,"16-18":8.2,"16-19":7.5,"16-20":6.9,"16-21":6.4,"16-22":6.0,"16-23":5.3,"16-24":5.0,"16-25":4.7,"16-26":4.4,"16-27":3.9,"16-28":3.7,"16-29":3.5,"16-30":3.3,"16-31":3.2,"16-32":2.7,"16-33":2.6,"16-34":2.5,"16-35":2.4,"16-36":2.3,"16-37":2.2,"16-38":1.9,"16-39":1.8,"16-40":1.7,"16-41":1.7,"16-42":1.6,"16-43":1.3,"16-44":1.2,"16-45":1.2,"16-46":1.2,"16-47":1.1,"16-48":1.1,"16-49":0.8,"16-50":0.8,"17-17":10.0,"17-18":9.1,"17-19":8.3,"17-20":7.7,"17-21":7.1,"17-22":6.7,"17-23":6.0,"17-24":5.6,"17-25":5.3,"17-26":5.0,"17-27":4.4,"17-28":4.2,"17-29":4.0,"17-30":3.8,"17-31":3.6,"17-32":3.2,"17-33":3.0,"17-34":2.9,"17-35":2.8,"17-36":2.7,"17-37":2.6,"17-38":2.2,"17-39":2.1,"17-40":2.1,"17-41":2.0,"17-42":1.9,"17-43":1.6,"17-44":1.6,"17-45":1.5,"17-46":1.5,"17-47":1.4,"17-48":1.4,"17-49":1.1,"17-50":1.1,"18-18":10.0,"18-19":9.2,"18-20":8.5,"18-21":7.9,"18-22":7.3,"18-23":6.7,"18-24":6.2,"18-25":5.9,"18-26":5.6,"18-27":5.0,"18-28":4.7,"18-29":4.5,"18-30":4.3,"18-31":4.1,"18-32":3.6,"18-33":3.5,"18-34":3.3,"18-35":3.2,"18-36":3.1,"18-37":3.0,"18-38":2.6,"18-39":2.5,"18-40":2.4,"18-41":2.3,"18-42":2.3,"18-43":1.9,"18-44":1.9,"18-45":1.8,"18-46":1.8,"18-47":1.7,"18-48":1.7,"18-49":1.4,"18-50":1.4,"19-19":10.0,"19-20":9.2,"19-21":8.6,"19-22":8.0,"19-23":7.3,"19-24":6.9,"19-25":6.5,"19-26":6.1,"19-27":5.6,"19-28":5.3,"19-29":5.0,"19-30":4.8,"19-31":4.5,"19-32":4.1,"19-33":3.9,"19-34":3.8,"19-35":3.6,"19-36":3.5,"19-37":3.3,"19-38":3.0,"19-39":2.9,"19-40":2.8,"19-41":2.7,"19-42":2.6,"19-43":2.3,"19-44":2.2,"19-45":2.1,"19-46":2.1,"19-47":2.0,"19-48":1.9,"19-49":1.7,"19-50":1.6,"20-20":10.0,"20-21":9.3,"20-22":8.7,"20-23":8.0,"20-24":7.5,"20-25":7.1,"20-26":6.7,"20-27":6.1,"20-28":5.8,"20-29":5.5,"20-30":5.2,"20-31":5.0,"20-32":4.5,"20-33":4.3,"20-34":4.2,"20-35":4.0,"20-36":3.8,"20-37":3.7,"20-38":3.3,"20-39":3.2,"20-40":3.1,"20-41":3.0,"20-42":2.9,"20-43":2.6,"20-44":2.5,"20-45":2.4,"20-46":2.4,"20-47":2.3,"20-48":2.2,"20-49":1.9,"20-50":1.9,"21-21":10.0,"21-22":9.3,"21-23":8.7,"21-24":8.1,"21-25":7.6,"21-26":7.2,"21-27":6.7,"21-28":6.3,"21-29":6.0,"21-30":5.7,"21-31":5.5,"21-32":5.0,"21-33":4.8,"21-34":4.6,"21-35":4.4,"21-36":4.2,"21-37":4.1,"21-38":3.7,"21-39":3.6,"21-40":3.4,"21-41":3.3,"21-42":3.2,"21-43":2.9,"21-44":2.8,"21-45":2.7,"21-46":2.6,"21-47":2.6,"21-48":2.5,"21-49":2.2,"21-50":2.2,"22-22":10.0,"22-23":9.3,"22-24":8.8,"22-25":8.2,"22-26":7.8,"22-27":7.2,"22-28":6.8,"22-29":6.5,"22-30":6.2,"22-31":5.9,"22-32":5.5,"22-33":5.2,"22-34":5.0,"22-35":4.8,"22-36":4.6,"22-37":4.4,"22-38":4.1,"22-39":3.9,"22-40":3.8,"22-41":3.7,"22-42":3.5,"22-43":3.2,"22-44":3.1,"22-45":3.0,"22-46":2.9,"22-47":2.9,"22-48":2.8,"22-49":2.5,"22-50":2.4,"23-23":10.0,"23-24":9.4,"23-25":8.8,"23-26":8.3,"23-27":7.8,"23-28":7.4,"23-29":7.0,"23-30":6.7,"23-31":6.4,"23-32":5.9,"23-33":5.7,"23-34":5.4,"23-35":5.2,"23-36":5.0,"23-37":4.8,"23-38":4.4,"23-39":4.3,"23-40":4.1,"23-41":4.0,"23-42":3.9,"23-43":3.5,"23-44":3.4,"23-45":3.3,"23-46":3.2,"23-47":3.1,"23-48":3.1,"23-49":2.8,"23-50":2.7,"24-24":10.0,"24-25":9.4,"24-26":8.9,"24-27":8.3,"24-28":7.9,"24-29":7.5,"24-30":7.1,"24-31":6.8,"24-32":6.4,"24-33":6.1,"24-34":5.8,"24-35":5.6,"24-36":5.4,"24-37":5.2,"24-38":4.8,"24-39":4.6,"24-40":4.5,"24-41":4.3,"24-42":4.2,"24-43":3.9,"24-44":3.8,"24-45":3.6,"24-46":3.5,"24-47":3.4,"24-48":3.3,"24-49":3.1,"24-50":3.0,"25-25":10.0,"25-26":9.4,"25-27":8.9,"25-28":8.4,"25-29":8.0,"25-30":7.6,"25-31":7.3,"25-32":6.8,"25-33":6.5,"25-34":6.2,"25-35":6.0,"25-36":5.8,"25-37":5.6,"25-38":5.2,"25-39":5.0,"25-40":4.8,"25-41":4.7,"25-42":4.5,"25-43":4.2,"25-44":4.1,"25-45":3.9,"25-46":3.8,"25-47":3.7,"25-48":3.6,"25-49":3.3,"25-50":3.2,"26-26":10.0,"26-27":9.4,"26-28":8.9,"26-29":8.5,"26-30":8.1,"26-31":7.7,"26-32":7.3,"26-33":7.0,"26-34":6.7,"26-35":6.4,"26-36":6.2,"26-37":5.9,"26-38":5.6,"26-39":5.4,"26-40":5.2,"26-41":5.0,"26-42":4.8,"26-43":4.5,"26-44":4.4,"26-45":4.2,"26-46":4.1,"26-47":4.0,"26-48":3.9,"26-49":3.6,"26-50":3.5,"27-27":10.0,"27-28":9.5,"27-29":9.0,"27-30":8.6,"27-31":8.2,"27-32":7.7,"27-33":7.4,"27-34":7.1,"27-35":6.8,"27-36":6.5,"27-37":6.3,"27-38":5.9,"27-39":5.7,"27-40":5.5,"27-41":5.3,"27-42":5.2,"27-43":4.8,"27-44":4.7,"27-45":4.5,"27-46":4.4,"27-47":4.3,"27-48":4.2,"27-49":3.9,"27-50":3.8,"28-28":10.0,"28-29":9.5,"28-30":9.0,"28-31":8.6,"28-32":8.2,"28-33":7.8,"28-34":7.5,"28-35":7.2,"28-36":6.9,"28-37":6.7,"28-38":6.3,"28-39":6.1,"28-40":5.9,"28-41":5.7,"28-42":5.5,"28-43":5.2,"28-44":5.0,"28-45":4.8,"28-46":4.7,"28-47":4.6,"28-48":4.4,"28-49":4.2,"28-50":4.1,"29-29":10.0,"29-30":9.5,"29-31":9.1,"29-32":8.6,"29-33":8.3,"29-34":7.9,"29-35":7.6,"29-36":7.3,"29-37":7.0,"29-38":6.7,"29-39":6.4,"29-40":6.2,"29-41":6.0,"29-42":5.8,"29-43":5.5,"29-44":5.3,"29-45":5.2,"29-46":5.0,"29-47":4.9,"29-48":4.7,"29-49":4.4,"29-50":4.3,"30-30":10.0,"30-31":9.5,"30-32":9.1,"30-33":8.7,"30-34":8.3,"30-35":8.0,"30-36":7.7,"30-37":7.4,"30-38":7.0,"30-39":6.8,"30-40":6.6,"30-41":6.3,"30-42":6.1,"30-43":5.8,"30-44":5.6,"30-45":5.5,"30-46":5.3,"30-47":5.1,"30-48":5.0,"30-49":4.7,"30-50":4.6,"31-31":10.0,"31-32":9.5,"31-33":9.1,"31-34":8.8,"31-35":8.4,"31-36":8.1,"31-37":7.8,"31-38":7.4,"31-39":7.1,"31-40":6.9,"31-41":6.7,"31-42":6.5,"31-43":6.1,"31-44":5.9,"31-45":5.8,"31-46":5.6,"31-47":5.4,"31-48":5.3,"31-49":5.0,"31-50":4.9,"32-32":10.0,"32-33":9.6,"32-34":9.2,"32-35":8.8,"32-36":8.5,"32-37":8.1,"32-38":7.8,"32-39":7.5,"32-40":7.2,"32-41":7.0,"32-42":6.8,"32-43":6.5,"32-44":6.2,"32-45":6.1,"32-46":5.9,"32-47":5.7,"32-48":5.6,"32-49":5.3,"32-50":5.1,"33-33":10.0,"33-34":9.6,"33-35":9.2,"33-36":8.8,"33-37":8.5,"33-38":8.1,"33-39":7.9,"33-40":7.6,"33-41":7.3,"33-42":7.1,"33-43":6.8,"33-44":6.6,"33-45":6.4,"33-46":6.2,"33-47":6.0,"33-48":5.8,"33-49":5.6,"33-50":5.4,"34-34":10.0,"34-35":9.6,"34-36":9.2,"34-37":8.9,"34-38":8.5,"34-39":8.2,"34-40":7.9,"34-41":7.7,"34-42":7.4,"34-43":7.1,"34-44":6.9,"34-45":6.7,"34-46":6.5,"34-47":6.3,"34-48":6.1,"34-49":5.8,"34-50":5.7,"35-35":10.0,"35-36":9.6,"35-37":9.3,"35-38":8.9,"35-39":8.6,"35-40":8.3,"35-41":8.0,"35-42":7.7,"35-43":7.4,"35-44":7.2,"35-45":7.0,"35-46":6.8,"35-47":6.6,"35-48":6.4,"35-49":6.1,"35-50":5.9,"36-36":10.0,"36-37":9.6,"36-38":9.3,"36-39":8.9,"36-40":8.6,"36-41":8.3,"36-42":8.1,"36-43":7.7,"36-44":7.5,"36-45":7.3,"36-46":7.1,"36-47":6.9,"36-48":6.7,"36-49":6.4,"36-50":6.2,"37-37":10.0,"37-38":9.6,"37-39":9.3,"37-40":9.0,"37-41":8.7,"37-42":8.4,"37-43":8.1,"37-44":7.8,"37-45":7.6,"37-46":7.4,"37-47":7.1,"37-48":6.9,"37-49":6.7,"37-50":6.5,"38-38":10.0,"38-39":9.6,"38-40":9.3,"38-41":9.0,"38-42":8.7,"38-43":8.4,"38-44":8.1,"38-45":7.9,"38-46":7.6,"38-47":7.4,"38-48":7.2,"38-49":6.9,"38-50":6.8,"39-39":10.0,"39-40":9.7,"39-41":9.3,"39-42":9.0,"39-43":8.7,"39-44":8.4,"39-45":8.2,"39-46":7.9,"39-47":7.7,"39-48":7.5,"39-49":7.2,"39-50":7.0,"40-40":10.0,"40-41":9.7,"40-42":9.4,"40-43":9.0,"40-44":8.8,"40-45":8.5,"40-46":8.2,"40-47":8.0,"40-48":7.8,"40-49":7.5,"40-50":7.3,"41-41":10.0,"41-42":9.7,"41-43":9.4,"41-44":9.1,"41-45":8.8,"41-46":8.5,"41-47":8.3,"41-48":8.1,"41-49":7.8,"41-50":7.6,"42-42":10.0,"42-43":9.7,"42-44":9.4,"42-45":9.1,"42-46":8.8,"42-47":8.6,"42-48":8.3,"42-49":8.1,"42-50":7.8,"43-43":10.0,"43-44":9.7,"43-45":9.4,"43-46":9.1,"43-47":8.9,"43-48":8.6,"43-49":8.3,"43-50":8.1,"44-44":10.0,"44-45":9.7,"44-46":9.4,"44-47":9.1,"44-48":8.9,"44-49":8.6,"44-50":8.4,"45-45":10.0,"45-46":9.7,"45-47":9.4,"45-48":9.2,"45-49":8.9,"45-50":8.6,"46-46":10.0,"46-47":9.7,"46-48":9.4,"46-49":9.2,"46-50":8.9,"47-47":10.0,"47-48":9.7,"47-49":9.4,"47-50":9.2,"48-48":10.0,"48-49":9.7,"48-50":9.5,"49-49":10.0,"49-50":9.7,"50-50":10.0};
// Statuts spéciaux : Ab (abandon) = +15 s ; Tf (temps forfaitaire) et Fo (forfait) = 0.
const SPECIAL = {"Ab":{"1":15,"2":15,"3":15,"4":15,"5":15,"6":15,"7":15,"8":15,"9":15,"10":15,"11":15,"12":15,"13":15,"14":15,"15":15,"16":15,"17":15,"18":15,"19":15,"20":15,"21":15,"22":15,"23":15,"24":15,"25":15,"26":15,"27":15,"28":15,"29":15,"30":15,"31":15,"32":15,"33":15,"34":15,"35":15,"36":15,"37":15,"38":15,"39":15,"40":15,"41":15,"42":15,"43":15,"44":15,"45":15,"46":15,"47":15,"48":15,"49":15,"50":15},"Tf":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0,"17":0,"18":0,"19":0,"20":0,"21":0,"22":0,"23":0,"24":0,"25":0,"26":0,"27":0,"28":0,"29":0,"30":0,"31":0,"32":0,"33":0,"34":0,"35":0,"36":0,"37":0,"38":0,"39":0,"40":0,"41":0,"42":0,"43":0,"44":0,"45":0,"46":0,"47":0,"48":0,"49":0,"50":0},"Fo":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0,"17":0,"18":0,"19":0,"20":0,"21":0,"22":0,"23":0,"24":0,"25":0,"26":0,"27":0,"28":0,"29":0,"30":0,"31":0,"32":0,"33":0,"34":0,"35":0,"36":0,"37":0,"38":0,"39":0,"40":0,"41":0,"42":0,"43":0,"44":0,"45":0,"46":0,"47":0,"48":0,"49":0,"50":0}};

const MAX_ENGAGES = 50;
const BUDGET = 100;
const NB_EQUIPAGES = 3;
const MAX_JOKERS = 3;              // jokers posables par rallye
const SEUIL_POURCENT = 15;         // à partir de 15 joueurs -> barème en %
const PTS_FIXE = [35,27,23,19,16,13,10,7,4,2];   // < 15 joueurs
const PTS_DECILE = [25,18,15,12,10,8,6,4,2,1];   // >= 15 joueurs
const PTS_TOP10  = [10,9,8,7,6,5,4,3,2,1];
const JOKERS = ['flat','cold','forf','pwr','regl'];
const POWER_STAGE = [-5, -4, -3, -2, -1];   // joker Power stage : bonus ajouté aux 5 premiers de la classe

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
      // -5s au 1er, -4s au 2e, -3s au 3e, -2s au 4e, -1s au 5e. Rien au-delà.
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
