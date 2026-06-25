const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

const MAX_JOUEURS = 20;

// ─── DONNÉES ──────────────────────────────────────────────────────────────────

const PILOTES = {
  1997: [
    { nom: 'Colin McRae', note: 94, fiabilite: 0.76, asphalte:86, terre:95, neige:83, sec:91, pluie:93, rapide:96, sinueux:89 },
    { nom: 'Piero Liatti', note: 80, fiabilite: 0.80, asphalte:85, terre:79, neige:80, sec:82, pluie:77, rapide:78, sinueux:83 },
    { nom: 'Carlos Sainz', note: 92, fiabilite: 0.84, asphalte:90, terre:93, neige:85, sec:92, pluie:89, rapide:89, sinueux:93 },
    { nom: 'Tommi Mäkinen', note: 95, fiabilite: 0.80, asphalte:83, terre:93, neige:99, sec:89, pluie:87, rapide:96, sinueux:87 },
    { nom: 'Richard Burns', note: 85, fiabilite: 0.86, asphalte:86, terre:87, neige:83, sec:87, pluie:82, rapide:83, sinueux:88 },
    { nom: 'Juha Kankkunen', note: 87, fiabilite: 0.86, asphalte:84, terre:88, neige:90, sec:86, pluie:84, rapide:86, sinueux:89 },
    { nom: 'Didier Auriol', note: 84, fiabilite: 0.83, asphalte:87, terre:85, neige:79, sec:86, pluie:81, rapide:83, sinueux:86 },
    { nom: 'Armin Schwarz', note: 78, fiabilite: 0.77, asphalte:80, terre:79, neige:76, sec:79, pluie:77, rapide:79, sinueux:80 },
    { nom: 'Kenneth Eriksson', note: 82, fiabilite: 0.82, asphalte:80, terre:83, neige:86, sec:81, pluie:80, rapide:83, sinueux:81 },
    { nom: 'Freddy Loix', note: 78, fiabilite: 0.79, asphalte:80, terre:78, neige:73, sec:79, pluie:77, rapide:78, sinueux:80 },
  ],
  1999: [
    { nom: 'Colin McRae', note: 95, fiabilite: 0.78, asphalte:88, terre:96, neige:85, sec:92, pluie:94, rapide:97, sinueux:90 },
    { nom: 'Richard Burns', note: 91, fiabilite: 0.88, asphalte:90, terre:92, neige:88, sec:91, pluie:87, rapide:88, sinueux:93 },
    { nom: 'Tommi Mäkinen', note: 94, fiabilite: 0.82, asphalte:85, terre:94, neige:98, sec:90, pluie:88, rapide:95, sinueux:88 },
    { nom: 'Carlos Sainz', note: 93, fiabilite: 0.85, asphalte:92, terre:95, neige:87, sec:93, pluie:90, rapide:91, sinueux:94 },
    { nom: 'Marcus Grönholm', note: 89, fiabilite: 0.80, asphalte:87, terre:91, neige:90, sec:88, pluie:85, rapide:92, sinueux:87 },
    { nom: 'Petter Solberg', note: 87, fiabilite: 0.79, asphalte:84, terre:88, neige:83, sec:86, pluie:89, rapide:90, sinueux:85 },
    { nom: 'Juha Kankkunen', note: 86, fiabilite: 0.87, asphalte:83, terre:87, neige:89, sec:85, pluie:83, rapide:85, sinueux:88 },
    { nom: 'Didier Auriol', note: 85, fiabilite: 0.84, asphalte:86, terre:86, neige:80, sec:87, pluie:82, rapide:84, sinueux:87 },
    { nom: 'Freddy Loix', note: 80, fiabilite: 0.81, asphalte:82, terre:80, neige:75, sec:81, pluie:79, rapide:80, sinueux:82 },
    { nom: 'Bruno Thiry', note: 75, fiabilite: 0.83, asphalte:77, terre:76, neige:72, sec:76, pluie:74, rapide:75, sinueux:78 },
  ],
  2001: [
    { nom: 'Richard Burns', note: 93, fiabilite: 0.90, asphalte:91, terre:93, neige:89, sec:92, pluie:88, rapide:89, sinueux:94 },
    { nom: 'Marcus Grönholm', note: 94, fiabilite: 0.83, asphalte:89, terre:96, neige:91, sec:91, pluie:88, rapide:95, sinueux:90 },
    { nom: 'Carlos Sainz', note: 91, fiabilite: 0.86, asphalte:90, terre:93, neige:85, sec:91, pluie:88, rapide:89, sinueux:92 },
    { nom: 'Tommi Mäkinen', note: 90, fiabilite: 0.79, asphalte:83, terre:92, neige:96, sec:88, pluie:85, rapide:93, sinueux:86 },
    { nom: 'Petter Solberg', note: 89, fiabilite: 0.80, asphalte:86, terre:90, neige:85, sec:88, pluie:91, rapide:92, sinueux:87 },
    { nom: 'Colin McRae', note: 91, fiabilite: 0.73, asphalte:87, terre:93, neige:83, sec:90, pluie:91, rapide:95, sinueux:88 },
    { nom: 'Harri Rovanperä', note: 83, fiabilite: 0.77, asphalte:81, terre:85, neige:82, sec:82, pluie:81, rapide:86, sinueux:82 },
    { nom: 'Didier Auriol', note: 82, fiabilite: 0.84, asphalte:86, terre:83, neige:78, sec:85, pluie:80, rapide:81, sinueux:85 },
    { nom: 'Freddy Loix', note: 79, fiabilite: 0.80, asphalte:81, terre:79, neige:74, sec:80, pluie:78, rapide:79, sinueux:81 },
    { nom: 'Markko Märtin', note: 82, fiabilite: 0.76, asphalte:81, terre:83, neige:79, sec:82, pluie:80, rapide:85, sinueux:80 },
  ],
  2003: [
    { nom: 'Sébastien Loeb', note: 99, fiabilite: 0.95, asphalte:99, terre:96, neige:93, sec:98, pluie:97, rapide:97, sinueux:99 },
    { nom: 'Marcus Grönholm', note: 95, fiabilite: 0.85, asphalte:90, terre:97, neige:92, sec:93, pluie:90, rapide:96, sinueux:91 },
    { nom: 'Carlos Sainz', note: 92, fiabilite: 0.88, asphalte:91, terre:94, neige:86, sec:92, pluie:89, rapide:90, sinueux:93 },
    { nom: 'Richard Burns', note: 88, fiabilite: 0.90, asphalte:89, terre:90, neige:87, sec:90, pluie:86, rapide:87, sinueux:92 },
    { nom: 'Petter Solberg', note: 93, fiabilite: 0.80, asphalte:86, terre:91, neige:85, sec:89, pluie:92, rapide:93, sinueux:88 },
    { nom: 'Colin McRae', note: 91, fiabilite: 0.72, asphalte:87, terre:93, neige:83, sec:90, pluie:91, rapide:95, sinueux:89 },
    { nom: 'Markko Märtin', note: 86, fiabilite: 0.78, asphalte:84, terre:87, neige:82, sec:85, pluie:84, rapide:89, sinueux:84 },
    { nom: 'François Duval', note: 82, fiabilite: 0.75, asphalte:85, terre:82, neige:78, sec:83, pluie:80, rapide:82, sinueux:85 },
    { nom: 'Toni Gardemeister', note: 78, fiabilite: 0.82, asphalte:79, terre:79, neige:80, sec:79, pluie:77, rapide:78, sinueux:80 },
    { nom: 'Gilles Panizzi', note: 85, fiabilite: 0.86, asphalte:93, terre:82, neige:75, sec:87, pluie:80, rapide:82, sinueux:90 },
  ],
  2006: [
    { nom: 'Sébastien Loeb', note: 99, fiabilite: 0.96, asphalte:99, terre:97, neige:94, sec:98, pluie:97, rapide:97, sinueux:99 },
    { nom: 'Marcus Grönholm', note: 96, fiabilite: 0.87, asphalte:91, terre:98, neige:93, sec:94, pluie:91, rapide:97, sinueux:92 },
    { nom: 'Petter Solberg', note: 90, fiabilite: 0.81, asphalte:87, terre:91, neige:86, sec:89, pluie:91, rapide:92, sinueux:88 },
    { nom: 'Chris Atkinson', note: 83, fiabilite: 0.80, asphalte:82, terre:84, neige:80, sec:83, pluie:82, rapide:84, sinueux:83 },
    { nom: 'Mikko Hirvonen', note: 84, fiabilite: 0.82, asphalte:83, terre:85, neige:84, sec:84, pluie:82, rapide:86, sinueux:83 },
    { nom: 'Daniel Sordo', note: 85, fiabilite: 0.83, asphalte:91, terre:83, neige:78, sec:87, pluie:82, rapide:83, sinueux:89 },
    { nom: 'Toni Gardemeister', note: 78, fiabilite: 0.80, asphalte:79, terre:79, neige:79, sec:79, pluie:77, rapide:78, sinueux:80 },
    { nom: 'Jari-Matti Latvala', note: 82, fiabilite: 0.74, asphalte:82, terre:83, neige:81, sec:82, pluie:80, rapide:85, sinueux:81 },
    { nom: 'Matthew Wilson', note: 75, fiabilite: 0.76, asphalte:75, terre:76, neige:73, sec:75, pluie:74, rapide:76, sinueux:76 },
    { nom: 'Manfred Stohl', note: 76, fiabilite: 0.79, asphalte:77, terre:77, neige:74, sec:77, pluie:75, rapide:75, sinueux:78 },
  ],
  2009: [
    { nom: 'Sébastien Loeb', note: 99, fiabilite: 0.97, asphalte:99, terre:97, neige:94, sec:99, pluie:97, rapide:97, sinueux:99 },
    { nom: 'Sébastien Ogier', note: 88, fiabilite: 0.84, asphalte:90, terre:87, neige:83, sec:89, pluie:86, rapide:87, sinueux:91 },
    { nom: 'Mikko Hirvonen', note: 91, fiabilite: 0.87, asphalte:88, terre:92, neige:90, sec:90, pluie:88, rapide:92, sinueux:89 },
    { nom: 'Jari-Matti Latvala', note: 89, fiabilite: 0.78, asphalte:87, terre:90, neige:87, sec:88, pluie:86, rapide:92, sinueux:87 },
    { nom: 'Petter Solberg', note: 88, fiabilite: 0.79, asphalte:86, terre:89, neige:84, sec:87, pluie:89, rapide:90, sinueux:86 },
    { nom: 'Daniel Sordo', note: 86, fiabilite: 0.84, asphalte:92, terre:83, neige:78, sec:88, pluie:83, rapide:83, sinueux:90 },
    { nom: 'Chris Atkinson', note: 84, fiabilite: 0.81, asphalte:82, terre:85, neige:81, sec:84, pluie:83, rapide:85, sinueux:83 },
    { nom: 'Matthew Wilson', note: 77, fiabilite: 0.77, asphalte:77, terre:78, neige:74, sec:77, pluie:75, rapide:78, sinueux:78 },
    { nom: 'Henning Solberg', note: 78, fiabilite: 0.78, asphalte:78, terre:79, neige:76, sec:78, pluie:77, rapide:79, sinueux:79 },
    { nom: 'Dani Sordo', note: 85, fiabilite: 0.83, asphalte:91, terre:82, neige:77, sec:87, pluie:82, rapide:82, sinueux:89 },
  ],
};

const COPILOTES = {
  1997: [
    { nom: 'Nicky Grist', note: 92, asphalte:86, terre:92, neige:82, sec:90, pluie:91, rapide:93, sinueux:88 },
    { nom: 'Piero Liatti (co)', note: 79, asphalte:83, terre:77, neige:78, sec:80, pluie:76, rapide:77, sinueux:81 },
    { nom: 'Luis Moya', note: 91, asphalte:88, terre:91, neige:83, sec:91, pluie:87, rapide:88, sinueux:91 },
    { nom: 'Seppo Harjanne', note: 93, asphalte:82, terre:91, neige:97, sec:88, pluie:85, rapide:93, sinueux:85 },
    { nom: 'Robert Reid', note: 84, asphalte:85, terre:86, neige:82, sec:86, pluie:81, rapide:82, sinueux:87 },
    { nom: 'Juha Repo', note: 85, asphalte:82, terre:86, neige:88, sec:84, pluie:82, rapide:84, sinueux:87 },
    { nom: 'Denis Giraudet', note: 83, asphalte:86, terre:84, neige:77, sec:85, pluie:80, rapide:82, sinueux:85 },
    { nom: 'Klaus Wicha', note: 76, asphalte:78, terre:77, neige:74, sec:77, pluie:75, rapide:77, sinueux:78 },
    { nom: 'Staffan Parmander', note: 80, asphalte:78, terre:81, neige:84, sec:79, pluie:78, rapide:81, sinueux:79 },
    { nom: 'Sven Smeets', note: 77, asphalte:79, terre:77, neige:72, sec:78, pluie:76, rapide:77, sinueux:79 },
  ],
  1999: [
    { nom: 'Nicky Grist', note: 93, asphalte:87, terre:93, neige:84, sec:91, pluie:92, rapide:94, sinueux:89 },
    { nom: 'Robert Reid', note: 90, asphalte:89, terre:91, neige:87, sec:90, pluie:86, rapide:87, sinueux:92 },
    { nom: 'Risto Mannisenmäki', note: 92, asphalte:84, terre:93, neige:97, sec:89, pluie:87, rapide:94, sinueux:87 },
    { nom: 'Luis Moya', note: 93, asphalte:91, terre:94, neige:86, sec:92, pluie:89, rapide:90, sinueux:93 },
    { nom: 'Timo Rautiainen', note: 88, asphalte:86, terre:90, neige:89, sec:87, pluie:84, rapide:91, sinueux:86 },
    { nom: 'Phil Mills', note: 86, asphalte:83, terre:87, neige:82, sec:85, pluie:88, rapide:89, sinueux:84 },
    { nom: 'Juha Repo', note: 84, asphalte:82, terre:85, neige:87, sec:83, pluie:81, rapide:83, sinueux:86 },
    { nom: 'Denis Giraudet', note: 84, asphalte:85, terre:85, neige:79, sec:86, pluie:81, rapide:83, sinueux:86 },
    { nom: 'Sven Smeets', note: 79, asphalte:81, terre:79, neige:74, sec:80, pluie:78, rapide:79, sinueux:81 },
    { nom: 'Stéphane Prévot', note: 74, asphalte:76, terre:75, neige:71, sec:75, pluie:73, rapide:74, sinueux:77 },
  ],
  2001: [
    { nom: 'Robert Reid', note: 92, asphalte:90, terre:92, neige:88, sec:91, pluie:87, rapide:88, sinueux:93 },
    { nom: 'Timo Rautiainen', note: 92, asphalte:88, terre:94, neige:90, sec:90, pluie:87, rapide:93, sinueux:89 },
    { nom: 'Luis Moya', note: 90, asphalte:89, terre:92, neige:84, sec:90, pluie:87, rapide:88, sinueux:91 },
    { nom: 'Risto Mannisenmäki', note: 88, asphalte:82, terre:90, neige:94, sec:87, pluie:84, rapide:91, sinueux:85 },
    { nom: 'Phil Mills', note: 88, asphalte:85, terre:89, neige:84, sec:87, pluie:90, rapide:91, sinueux:86 },
    { nom: 'Nicky Grist', note: 89, asphalte:86, terre:90, neige:82, sec:89, pluie:89, rapide:93, sinueux:87 },
    { nom: 'Risto Pietiläinen', note: 81, asphalte:79, terre:83, neige:80, sec:80, pluie:79, rapide:84, sinueux:80 },
    { nom: 'Denis Giraudet', note: 81, asphalte:85, terre:82, neige:77, sec:84, pluie:79, rapide:80, sinueux:84 },
    { nom: 'Sven Smeets', note: 78, asphalte:80, terre:78, neige:73, sec:79, pluie:77, rapide:78, sinueux:80 },
    { nom: 'Michael Park', note: 81, asphalte:80, terre:82, neige:78, sec:81, pluie:79, rapide:84, sinueux:80 },
  ],
  2003: [
    { nom: 'Daniel Elena', note: 98, asphalte:98, terre:95, neige:92, sec:97, pluie:96, rapide:96, sinueux:98 },
    { nom: 'Timo Rautiainen', note: 94, asphalte:89, terre:96, neige:91, sec:92, pluie:89, rapide:95, sinueux:90 },
    { nom: 'Marc Martí', note: 91, asphalte:90, terre:93, neige:85, sec:91, pluie:88, rapide:89, sinueux:92 },
    { nom: 'Robert Reid', note: 87, asphalte:88, terre:89, neige:86, sec:89, pluie:85, rapide:86, sinueux:91 },
    { nom: 'Phil Mills', note: 91, asphalte:85, terre:90, neige:84, sec:88, pluie:90, rapide:92, sinueux:87 },
    { nom: 'Nicky Grist', note: 89, asphalte:86, terre:92, neige:82, sec:89, pluie:90, rapide:94, sinueux:88 },
    { nom: 'Michael Park', note: 85, asphalte:83, terre:86, neige:81, sec:84, pluie:83, rapide:88, sinueux:83 },
    { nom: 'Stéphane Prévot', note: 81, asphalte:84, terre:81, neige:77, sec:82, pluie:79, rapide:81, sinueux:84 },
    { nom: 'Tero Gardemeister', note: 77, asphalte:78, terre:78, neige:79, sec:78, pluie:76, rapide:77, sinueux:79 },
    { nom: 'Gilles Monécier', note: 84, asphalte:92, terre:81, neige:74, sec:86, pluie:79, rapide:81, sinueux:89 },
  ],
  2006: [
    { nom: 'Daniel Elena', note: 98, asphalte:98, terre:96, neige:93, sec:98, pluie:96, rapide:96, sinueux:98 },
    { nom: 'Timo Rautiainen', note: 95, asphalte:90, terre:97, neige:92, sec:93, pluie:90, rapide:96, sinueux:91 },
    { nom: 'Phil Mills', note: 89, asphalte:86, terre:90, neige:85, sec:88, pluie:90, rapide:91, sinueux:87 },
    { nom: 'Glenn Macneall', note: 82, asphalte:81, terre:83, neige:79, sec:82, pluie:81, rapide:83, sinueux:82 },
    { nom: 'Jarmo Lehtinen', note: 83, asphalte:82, terre:84, neige:83, sec:83, pluie:81, rapide:85, sinueux:82 },
    { nom: 'Marc Martí', note: 84, asphalte:90, terre:82, neige:77, sec:86, pluie:81, rapide:82, sinueux:88 },
    { nom: 'Miikka Anttila', note: 77, asphalte:77, terre:78, neige:78, sec:77, pluie:75, rapide:77, sinueux:78 },
    { nom: 'Juho Hänninen', note: 81, asphalte:81, terre:82, neige:80, sec:81, pluie:79, rapide:84, sinueux:80 },
    { nom: 'Scott Martin', note: 74, asphalte:74, terre:75, neige:72, sec:74, pluie:73, rapide:75, sinueux:75 },
    { nom: 'Kay Gösselin', note: 75, asphalte:76, terre:76, neige:73, sec:76, pluie:74, rapide:74, sinueux:77 },
  ],
  2009: [
    { nom: 'Daniel Elena', note: 98, asphalte:98, terre:96, neige:93, sec:99, pluie:96, rapide:96, sinueux:98 },
    { nom: 'Julien Ingrassia', note: 87, asphalte:89, terre:86, neige:82, sec:88, pluie:85, rapide:86, sinueux:90 },
    { nom: 'Jarmo Lehtinen', note: 90, asphalte:87, terre:91, neige:89, sec:89, pluie:87, rapide:91, sinueux:88 },
    { nom: 'Miikka Anttila', note: 88, asphalte:86, terre:89, neige:86, sec:87, pluie:85, rapide:91, sinueux:86 },
    { nom: 'Phil Mills', note: 87, asphalte:85, terre:88, neige:83, sec:86, pluie:88, rapide:89, sinueux:85 },
    { nom: 'Marc Martí', note: 85, asphalte:91, terre:82, neige:77, sec:87, pluie:81, rapide:81, sinueux:89 },
    { nom: 'Glenn Macneall', note: 83, asphalte:81, terre:84, neige:80, sec:83, pluie:82, rapide:84, sinueux:82 },
    { nom: 'Scott Martin', note: 76, asphalte:76, terre:77, neige:73, sec:76, pluie:74, rapide:77, sinueux:77 },
    { nom: 'Ilka Minor', note: 77, asphalte:77, terre:78, neige:75, sec:77, pluie:76, rapide:78, sinueux:78 },
    { nom: 'Frédéric Miclotte', note: 75, asphalte:76, terre:75, neige:73, sec:75, pluie:74, rapide:74, sinueux:76 },
  ],
};

const VOITURES = {
  1997: [
    { nom: 'Subaru Impreza WRC97', note: 90, fiabilite: 0.76, asphalte:85, terre:92, neige:85, sec:88, pluie:89, rapide:93, sinueux:86 },
    { nom: 'Mitsubishi Carisma GT Evo4', note: 91, fiabilite: 0.78, asphalte:82, terre:92, neige:94, sec:87, pluie:86, rapide:92, sinueux:84 },
    { nom: 'Ford Escort RS Cosworth WRC', note: 86, fiabilite: 0.74, asphalte:85, terre:87, neige:80, sec:86, pluie:87, rapide:88, sinueux:85 },
    { nom: 'Toyota Celica GT-Four ST205', note: 87, fiabilite: 0.82, asphalte:87, terre:88, neige:83, sec:88, pluie:85, rapide:86, sinueux:89 },
    { nom: 'Seat Ibiza KitCar', note: 78, fiabilite: 0.72, asphalte:84, terre:76, neige:68, sec:81, pluie:74, rapide:75, sinueux:82 },
  ],
  1999: [
    { nom: 'Subaru Impreza WRC99', note: 93, fiabilite: 0.78, asphalte:88, terre:94, neige:87, sec:90, pluie:91, rapide:95, sinueux:88 },
    { nom: 'Mitsubishi Carisma GT Evo6', note: 94, fiabilite: 0.80, asphalte:84, terre:95, neige:96, sec:89, pluie:88, rapide:94, sinueux:86 },
    { nom: 'Toyota Corolla WRC', note: 90, fiabilite: 0.85, asphalte:89, terre:91, neige:85, sec:91, pluie:87, rapide:89, sinueux:92 },
    { nom: 'Ford Focus RS WRC99', note: 88, fiabilite: 0.72, asphalte:87, terre:89, neige:82, sec:88, pluie:89, rapide:90, sinueux:87 },
    { nom: 'Seat Córdoba WRC', note: 80, fiabilite: 0.70, asphalte:83, terre:80, neige:75, sec:82, pluie:78, rapide:80, sinueux:83 },
  ],
  2001: [
    { nom: 'Peugeot 206 WRC', note: 96, fiabilite: 0.88, asphalte:92, terre:97, neige:91, sec:93, pluie:90, rapide:97, sinueux:92 },
    { nom: 'Subaru Impreza WRC2001', note: 90, fiabilite: 0.81, asphalte:86, terre:91, neige:87, sec:88, pluie:91, rapide:92, sinueux:87 },
    { nom: 'Ford Focus RS WRC01', note: 88, fiabilite: 0.78, asphalte:87, terre:88, neige:82, sec:87, pluie:87, rapide:90, sinueux:86 },
    { nom: 'Mitsubishi Lancer Evo WRC', note: 86, fiabilite: 0.77, asphalte:82, terre:88, neige:91, sec:85, pluie:84, rapide:87, sinueux:83 },
    { nom: 'Toyota Corolla WRC', note: 84, fiabilite: 0.84, asphalte:88, terre:85, neige:82, sec:87, pluie:82, rapide:83, sinueux:88 },
  ],
  2003: [
    { nom: 'Citroën Xsara WRC', note: 97, fiabilite: 0.92, asphalte:98, terre:95, neige:90, sec:97, pluie:94, rapide:95, sinueux:98 },
    { nom: 'Peugeot 206 WRC', note: 95, fiabilite: 0.87, asphalte:93, terre:96, neige:91, sec:94, pluie:91, rapide:97, sinueux:92 },
    { nom: 'Subaru Impreza WRC2003', note: 91, fiabilite: 0.80, asphalte:87, terre:92, neige:88, sec:89, pluie:92, rapide:93, sinueux:88 },
    { nom: 'Ford Focus RS WRC03', note: 89, fiabilite: 0.78, asphalte:88, terre:89, neige:83, sec:88, pluie:88, rapide:91, sinueux:87 },
    { nom: 'Mitsubishi Lancer Evo WRC', note: 85, fiabilite: 0.75, asphalte:82, terre:87, neige:90, sec:84, pluie:85, rapide:86, sinueux:83 },
  ],
  2006: [
    { nom: 'Citroën Xsara WRC', note: 96, fiabilite: 0.91, asphalte:97, terre:94, neige:89, sec:96, pluie:93, rapide:94, sinueux:97 },
    { nom: 'Peugeot 307 WRC', note: 95, fiabilite: 0.86, asphalte:92, terre:96, neige:90, sec:93, pluie:90, rapide:96, sinueux:91 },
    { nom: 'Subaru Impreza WRC2006', note: 89, fiabilite: 0.79, asphalte:86, terre:90, neige:87, sec:87, pluie:90, rapide:91, sinueux:86 },
    { nom: 'Ford Focus RS WRC06', note: 90, fiabilite: 0.80, asphalte:88, terre:90, neige:84, sec:89, pluie:89, rapide:92, sinueux:88 },
    { nom: 'Mitsubishi Lancer Evo IX WRC', note: 83, fiabilite: 0.74, asphalte:80, terre:85, neige:88, sec:82, pluie:82, rapide:84, sinueux:81 },
  ],
  2009: [
    { nom: 'Citroën C4 WRC', note: 98, fiabilite: 0.94, asphalte:98, terre:96, neige:92, sec:98, pluie:95, rapide:96, sinueux:98 },
    { nom: 'Ford Focus RS WRC08', note: 93, fiabilite: 0.86, asphalte:91, terre:93, neige:88, sec:92, pluie:91, rapide:94, sinueux:91 },
    { nom: 'Subaru Impreza WRC2008', note: 89, fiabilite: 0.80, asphalte:87, terre:90, neige:87, sec:88, pluie:89, rapide:91, sinueux:87 },
    { nom: 'Peugeot 207 S2000', note: 85, fiabilite: 0.82, asphalte:89, terre:84, neige:79, sec:87, pluie:82, rapide:83, sinueux:89 },
    { nom: 'Mitsubishi Lancer Evo X', note: 83, fiabilite: 0.77, asphalte:81, terre:84, neige:86, sec:82, pluie:81, rapide:84, sinueux:81 },
  ],
};

const ANNEES_DISPONIBLES = Object.keys(VOITURES).map(Number).sort();

const RALLYES = [
  { nom: 'Monte-Carlo', surface: 'Asphalte/Neige', cassant: 0.15, coeffs: { asphalte:0.5, terre:0.1, neige:0.4, sec:0.3, pluie:0.2, rapide:0.2, sinueux:0.3 } },
  { nom: 'Suède', surface: 'Neige', cassant: 0.10, coeffs: { asphalte:0.1, terre:0.1, neige:0.8, sec:0.4, pluie:0.1, rapide:0.3, sinueux:0.2 } },
  { nom: 'Safari Kenya', surface: 'Terre', cassant: 0.55, coeffs: { asphalte:0.1, terre:0.6, neige:0.0, sec:0.3, pluie:0.3, rapide:0.4, sinueux:0.3 } },
  { nom: 'Portugal', surface: 'Terre', cassant: 0.35, coeffs: { asphalte:0.1, terre:0.7, neige:0.0, sec:0.4, pluie:0.2, rapide:0.3, sinueux:0.3 } },
  { nom: 'Espagne', surface: 'Asphalte', cassant: 0.20, coeffs: { asphalte:0.8, terre:0.1, neige:0.0, sec:0.5, pluie:0.2, rapide:0.2, sinueux:0.3 } },
  { nom: 'Acropole Grèce', surface: 'Terre', cassant: 0.65, coeffs: { asphalte:0.1, terre:0.7, neige:0.0, sec:0.5, pluie:0.1, rapide:0.4, sinueux:0.3 } },
  { nom: 'Argentine', surface: 'Terre', cassant: 0.40, coeffs: { asphalte:0.1, terre:0.7, neige:0.0, sec:0.3, pluie:0.3, rapide:0.4, sinueux:0.3 } },
  { nom: 'Finlande', surface: 'Terre', cassant: 0.20, coeffs: { asphalte:0.1, terre:0.6, neige:0.1, sec:0.3, pluie:0.2, rapide:0.6, sinueux:0.1 } },
  { nom: 'Australie', surface: 'Terre', cassant: 0.25, coeffs: { asphalte:0.1, terre:0.7, neige:0.0, sec:0.5, pluie:0.2, rapide:0.3, sinueux:0.2 } },
  { nom: 'Grande-Bretagne', surface: 'Terre', cassant: 0.20, coeffs: { asphalte:0.1, terre:0.6, neige:0.0, sec:0.2, pluie:0.5, rapide:0.2, sinueux:0.3 } },
  { nom: 'Corse', surface: 'Asphalte', cassant: 0.25, coeffs: { asphalte:0.8, terre:0.0, neige:0.0, sec:0.4, pluie:0.2, rapide:0.2, sinueux:0.4 } },
  { nom: 'Nouvelle-Zélande', surface: 'Terre', cassant: 0.30, coeffs: { asphalte:0.1, terre:0.7, neige:0.0, sec:0.4, pluie:0.3, rapide:0.3, sinueux:0.3 } },
  { nom: 'Sanremo', surface: 'Asphalte', cassant: 0.30, coeffs: { asphalte:0.7, terre:0.1, neige:0.1, sec:0.4, pluie:0.3, rapide:0.2, sinueux:0.4 } },
  { nom: 'Japon', surface: 'Terre', cassant: 0.25, coeffs: { asphalte:0.1, terre:0.7, neige:0.0, sec:0.4, pluie:0.3, rapide:0.3, sinueux:0.3 } },
  { nom: 'Chypre', surface: 'Terre', cassant: 0.45, coeffs: { asphalte:0.1, terre:0.8, neige:0.0, sec:0.6, pluie:0.1, rapide:0.3, sinueux:0.3 } },
  { nom: 'Turquie', surface: 'Terre', cassant: 0.50, coeffs: { asphalte:0.1, terre:0.8, neige:0.0, sec:0.5, pluie:0.2, rapide:0.3, sinueux:0.3 } },
];

const POINTS_WRC = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// ─── ROOMS ────────────────────────────────────────────────────────────────────

const rooms = {};

function genererCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  // Éviter doublons
  return rooms[code] ? genererCode() : code;
}

function melanger(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tirerAuSort(arr, n) {
  return melanger(arr).slice(0, n);
}

function calculerPerformance(pilote, copilote, voiture, rallye, strategie) {
  const coeffs = rallye.coeffs;
  const calcScore = (e) =>
    (e.asphalte||85) * coeffs.asphalte +
    (e.terre||85) * coeffs.terre +
    (e.neige||85) * coeffs.neige +
    (e.sec||85) * coeffs.sec +
    (e.pluie||85) * coeffs.pluie +
    (e.rapide||85) * coeffs.rapide +
    (e.sinueux||85) * coeffs.sinueux;

  const sommeCoeffs = Object.values(coeffs).reduce((a, b) => a + b, 0);
  let score = (calcScore(pilote) + calcScore(copilote) + calcScore(voiture)) / (3 * sommeCoeffs);

  if (strategie === 'prudent') score *= 0.95;
  if (strategie === 'attaque') score *= 1.08;
  score *= (0.95 + Math.random() * 0.10);

  return Math.round(score * 10) / 10;
}

function calculerIncident(voiture, rallye, strategie) {
  let fiabilite = voiture.fiabilite;
  if (strategie === 'prudent') fiabilite = Math.min(1, fiabilite + 0.15);
  if (strategie === 'attaque') fiabilite = Math.max(0, fiabilite - 0.20);

  const risque = (1 - fiabilite) * (1 + rallye.cassant);
  const r = Math.random();

  if (r < risque * 0.15) return { type: 'abandon' };
  if (r < risque * 0.35) return { type: 'panne', penalite: 60 };
  if (r < risque * 0.60) return { type: 'crevaison', penalite: 30 };
  return { type: null, penalite: 0 };
}

function creerRivaux(annee) {
  const pilotes = PILOTES[annee] || [];
  const copilotes = COPILOTES[annee] || [];
  const voitures = VOITURES[annee] || [];
  return pilotes.map((p, i) => ({
    pilote: p,
    copilote: copilotes[i] || copilotes[0],
    voiture: voitures[Math.min(i, voitures.length - 1)],
  }));
}

function simulerRallye(room) {
  const rallye = room.rallyes[room.rallyeActuel];
  const resultats = [];

  for (const j of room.joueurs) {
    const { pilote, copilote, voiture } = j.picks;
    const strategie = j.strategie;
    const incident = calculerIncident(voiture, rallye, strategie);

    if (incident.type === 'abandon') {
      resultats.push({ nom: j.nom, equipe: `${pilote.nom} / ${copilote.nom}`, voiture: voiture.nom, temps: Infinity, points: 0, incident: 'Abandon', estJoueur: true, id: j.id });
      continue;
    }

    let perf = calculerPerformance(pilote, copilote, voiture, rallye, strategie);
    let temps = 3600 - (perf - 85) * 10;
    if (incident.penalite) temps += incident.penalite;

    resultats.push({ nom: j.nom, equipe: `${pilote.nom} / ${copilote.nom}`, voiture: voiture.nom, temps, points: 0, incident: incident.penalite ? (incident.type === 'panne' ? '+60s panne' : '+30s crevaison') : null, estJoueur: true, id: j.id });
  }

  if (room.avecRivaux) {
    const nbRivaux = Math.min(20 - room.joueurs.length, room.rivaux.length);
    for (let i = 0; i < nbRivaux; i++) {
      const r = room.rivaux[i];
      const incident = calculerIncident(r.voiture, rallye, 'normal');
      if (incident.type === 'abandon') {
        resultats.push({ nom: r.pilote.nom, equipe: `${r.pilote.nom} / ${r.copilote.nom}`, voiture: r.voiture.nom, temps: Infinity, points: 0, incident: 'Abandon', estJoueur: false });
        continue;
      }
      let perf = calculerPerformance(r.pilote, r.copilote, r.voiture, rallye, 'normal');
      let temps = 3600 - (perf - 85) * 10;
      if (incident.penalite) temps += incident.penalite;
      resultats.push({ nom: r.pilote.nom, equipe: `${r.pilote.nom} / ${r.copilote.nom}`, voiture: r.voiture.nom, temps, points: 0, estJoueur: false });
    }
  }

  resultats.sort((a, b) => a.temps - b.temps);
  let rang = 0;
  for (const r of resultats) {
    if (r.temps === Infinity) { r.rang = 99; continue; }
    r.points = POINTS_WRC[rang] || 0;
    r.rang = rang + 1;
    rang++;
  }

  for (const r of resultats) {
    if (r.estJoueur) {
      const j = room.joueurs.find(j => j.id === r.id);
      if (j) j.pointsSaison += r.points;
    }
  }

  return resultats;
}

function proposerItems(room, joueurId) {
  const j = room.joueurs.find(j => j.id === joueurId);
  const anneesDispos = room.anneesSelectionnees.length > 0 ? room.anneesSelectionnees : ANNEES_DISPONIBLES;

  // Pour pilote/copilote : année libre parmi les années sélectionnées
  // Pour voiture : année verrouillée si définie, sinon libre
  const anneeVoiture = room.anneeVerrouillee || anneesDispos[Math.floor(Math.random() * anneesDispos.length)];
  const anneePilote = anneesDispos[Math.floor(Math.random() * anneesDispos.length)];
  const anneeCoP = anneesDispos[Math.floor(Math.random() * anneesDispos.length)];

  const typesManquants = [];
  if (!j.picks.pilote) typesManquants.push('pilote');
  if (!j.picks.copilote) typesManquants.push('copilote');
  if (!j.picks.voiture) typesManquants.push('voiture');

  const proposals = [];

  const tirerItem = (pool) => pool[Math.floor(Math.random() * pool.length)];

  for (const type of ['pilote', 'copilote', 'voiture']) {
    let item, annee;
    if (type === 'pilote') {
      annee = anneePilote;
      const pool = PILOTES[annee] || PILOTES[ANNEES_DISPONIBLES[0]];
      item = tirerItem(pool);
    } else if (type === 'copilote') {
      annee = anneeCoP;
      const pool = COPILOTES[annee] || COPILOTES[ANNEES_DISPONIBLES[0]];
      item = tirerItem(pool);
    } else {
      annee = anneeVoiture;
      const pool = VOITURES[annee] || VOITURES[ANNEES_DISPONIBLES[0]];
      item = tirerItem(pool);
    }
    proposals.push({ type, item, annee, disponible: typesManquants.includes(type) });
  }

  return proposals;
}

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {

  // L'hôte configure puis clique "Lancer la room" -> ouvrir_room génère le code
  socket.on('ouvrir_room', ({ nom, avecRivaux, anneesSelectionnees }) => {
    const code = genererCode();
    const nomTronque = (nom || 'Hôte').trim().slice(0, 5);
    const anneesFiltrees = Array.isArray(anneesSelectionnees) && anneesSelectionnees.length > 0
      ? anneesSelectionnees.filter(a => ANNEES_DISPONIBLES.includes(a))
      : [...ANNEES_DISPONIBLES];

    rooms[code] = {
      code,
      hoteId: socket.id,
      anneeVerrouillee: null,
      anneesSelectionnees: anneesFiltrees,
      avecRivaux: typeof avecRivaux === 'boolean' ? avecRivaux : true,
      phase: 'lobby',
      tourIndex: 0,
      joueurs: [],
      rallyes: [],
      rallyeActuel: 0,
      rivaux: [],
      derniersResultats: null,
      propositionsCourantes: null,
    };
    const joueur = newJoueur(socket.id, nomTronque, true);
    rooms[code].joueurs.push(joueur);
    socket.join(code);
    socket.emit('room_creee', { code });
    io.to(code).emit('room_update', etatPublic(rooms[code]));
  });

  socket.on('rejoindre_room', ({ code, nom }) => {
    const room = rooms[code];
    if (!room) { socket.emit('erreur', 'Room introuvable'); return; }
    if (room.phase !== 'lobby') { socket.emit('erreur', 'Partie déjà commencée'); return; }
    if (room.joueurs.length >= MAX_JOUEURS) { socket.emit('erreur', `Room pleine (max ${MAX_JOUEURS} joueurs)`); return; }
    if (room.joueurs.find(j => j.id === socket.id)) return;

    const nomTronque = (nom || 'Joueur').trim().slice(0, 5);
    room.joueurs.push(newJoueur(socket.id, nomTronque, false));
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
    room.rallyes = tirerAuSort(RALLYES, 10);
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

    // Verrouiller l'année UNIQUEMENT pour les voitures
    if (type === 'voiture' && !room.anneeVerrouillee) {
      room.anneeVerrouillee = prop.annee;
      room.rivaux = creerRivaux(room.anneeVerrouillee);
      io.to(code).emit('annee_verrouillee', { annee: room.anneeVerrouillee, joueur: joueurActif.nom });
    }

    io.to(code).emit('pick_effectue', { joueurNom: joueurActif.nom, type, item: prop.item, annee: prop.annee });

    room.tourIndex++;
    const totalTours = room.joueurs.length * 3;

    setTimeout(() => {
      if (room.tourIndex >= totalTours) {
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
    io.to(code).emit('relance_utilisee', { joueurNom: joueurActif.nom });
  });

  socket.on('valider_strategie', ({ code, strategie }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'strategie') return;
    const j = room.joueurs.find(j => j.id === socket.id);
    if (!j || j.aValide) return;

    j.strategie = strategie;
    j.aValide = true;

    io.to(code).emit('strategie_validee', { joueurNom: j.nom });
    io.to(code).emit('room_update', etatPublic(room));

    if (room.joueurs.every(j => j.aValide)) {
      setTimeout(() => {
        room.phase = 'resultats';
        room.derniersResultats = simulerRallye(room);
        io.to(code).emit('resultats_rallye', {
          resultats: room.derniersResultats,
          rallye: room.rallyes[room.rallyeActuel],
          rallyeNum: room.rallyeActuel + 1,
        });
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
        room.joueurs.forEach(j => { j.strategie = null; j.aValide = false; j.aCliqueSuivant = false; });
      }
      io.to(code).emit('room_update', etatPublic(room));
    }
  });

  socket.on('lancer_saison', ({ code }) => {
    const room = rooms[code];
    if (!room || room.hoteId !== socket.id) return;
    room.phase = 'strategie';
    room.joueurs.forEach(j => { j.strategie = null; j.aValide = false; j.aCliqueSuivant = false; });
    io.to(code).emit('room_update', etatPublic(room));
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      const idx = room.joueurs.findIndex(j => j.id === socket.id);
      if (idx !== -1) {
        const nom = room.joueurs[idx].nom;
        room.joueurs.splice(idx, 1);
        if (room.joueurs.length === 0) {
          delete rooms[code];
        } else {
          if (room.hoteId === socket.id) room.hoteId = room.joueurs[0].id;
          io.to(code).emit('joueur_deconnecte', { nom });
          io.to(code).emit('room_update', etatPublic(room));
        }
      }
    }
  });
});

function newJoueur(id, nom, estHote) {
  return { id, nom, estHote, picks: { pilote: null, copilote: null, voiture: null }, relanceDisponible: true, strategie: null, aValide: false, aCliqueSuivant: false, pointsSaison: 0 };
}

function lancerTourDraft(room) {
  const joueurActif = room.joueurs[room.tourIndex % room.joueurs.length];
  const props = proposerItems(room, joueurActif.id);
  room.propositionsCourantes = props;
  io.to(room.code).emit('nouvelles_propositions', {
    joueurId: joueurActif.id,
    joueurNom: joueurActif.nom,
    propositions: props,
    tourGlobal: room.tourIndex,
  });
}

function etatPublic(room) {
  return {
    code: room.code,
    phase: room.phase,
    anneeVerrouillee: room.anneeVerrouillee,
    anneesSelectionnees: room.anneesSelectionnees,
    avecRivaux: room.avecRivaux,
    tourIndex: room.tourIndex,
    hoteId: room.hoteId,
    rallyeActuel: room.rallyeActuel,
    rallyes: room.rallyes,
    joueurs: room.joueurs.map(j => ({
      id: j.id, nom: j.nom, estHote: j.estHote,
      picks: j.picks, relanceDisponible: j.relanceDisponible,
      aValide: j.aValide, aCliqueSuivant: j.aCliqueSuivant,
      pointsSaison: j.pointsSaison,
    })),
    pointsRivaux: room.pointsRivaux || {},
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`WRC Fantasy — port ${PORT}`));
