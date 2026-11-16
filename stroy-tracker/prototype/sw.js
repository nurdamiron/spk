// Строй Трекер: храним приложение в телефоне, чтобы оно открывалось мгновенно и без интернета.
const VERSION = 'st-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала отдаём из памяти телефона, в фоне проверяем обновление.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
          if (cached && e.request.mode === 'navigate') {
            // если страница изменилась, скажем приложению показать «Обновить»
            res.clone().text().then(t => cached.clone().text().then(o => {
              if (t !== o) self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage('update')));
            }));
          }
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
