// Version du cache
const CACHE_NAME = 'pentatrack-v11';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Gestionnaire de fetch obligatoire pour la PWA mais configuré en pur "pass-through"
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
