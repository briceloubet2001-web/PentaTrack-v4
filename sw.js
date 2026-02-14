// Version du cache
const CACHE_NAME = 'pentatrack-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Mode "Pass-through" : on laisse tout passer vers le réseau sans interférence
  return;
});
