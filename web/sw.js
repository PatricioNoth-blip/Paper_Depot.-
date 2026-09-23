// Service Worker: hält die Oberfläche bereit, Kurse und Orders kommen immer frisch vom Programm.
const CACHE = 'paperdepot-v1';
const SCHALE = ['/', '/style.css', '/app.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SCHALE))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !SCHALE.includes(url.pathname)) return;
  e.respondWith(fetch(e.request).then(a => { const kopie = a.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); return a; })
    .catch(() => caches.match(e.request)));
});
