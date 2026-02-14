
// Version du cache
const CACHE_NAME = 'pentatrack-v2';

// On n'intercepte rien de façon bloquante pour éviter l'écran blanc.
// On se contente de remplir les conditions minimales pour l'installation PWA.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Stratégie "Network Only" ou "Network with Cache Fallback" simplifiée
// Cela garantit que le navigateur charge toujours les derniers fichiers JS (esm.sh etc)
self.addEventListener('fetch', (event) => {
  // On laisse le navigateur gérer la requête normalement
  return;
});
