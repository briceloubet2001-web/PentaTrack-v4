// Version du cache
const CACHE_NAME = 'pentatrack-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Minimum fetch handler required for PWA installation
self.addEventListener('fetch', (event) => {
  // Let all requests go through normally to the network
  event.respondWith(fetch(event.request));
});
