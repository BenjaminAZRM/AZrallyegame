/* ChronoRallyeRace — service worker (application installable)
 *
 * Principe : le jeu a besoin du réseau, donc on va TOUJOURS chercher la
 * version la plus récente sur le serveur. Le cache ne sert que de secours
 * quand il n'y a pas de connexion. Ainsi, chaque déploiement est visible
 * immédiatement, sans risque de version périmée.
 *
 * Jamais mis en cache : l'API (/api/...), le temps réel (/socket.io/...),
 * les requêtes autres que GET et tout ce qui vient d'un autre site.
 */
const VERSION = 'crr-v1';
const HORS_LIGNE = '/hors-ligne.html';
const PRECACHE = [
  HORS_LIGNE,
  '/theme.css',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') return caches.match(HORS_LIGNE);
          return Response.error();
        })
      )
  );
});
