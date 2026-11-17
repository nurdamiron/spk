// Строй Трекер: приложение открывается без интернета.
// Страницы: сначала пробуем сеть 3 секунды, потом отдаём последнюю копию.
// Скрипты, стили и значки: сразу из памяти телефона.
// Запросы к серверу (api) и отправки никогда не кэшируем.
const VERSION = 'st-app-v4'
const SHELL = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/manifest.webmanifest']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// При выходе из аккаунта стираем копии страниц, чтобы на общем телефоне не остались чужие данные.
self.addEventListener('message', e => {
  if (e.data === 'clear') caches.delete(VERSION).then(() => caches.open(VERSION).then(c => c.addAll(SHELL)))
})

const withTimeout = (p, ms) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout')), ms)
  p.then(v => { clearTimeout(t); res(v) }, e => { clearTimeout(t); rej(e) })
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    e.respondWith(
      withTimeout(fetch(req), 3000)
        .then(res => {
          if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)) }
          return res
        })
        .catch(() => caches.match(req).then(c => c || caches.match('/report') || caches.match('/')))
    )
    return
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest') {
    e.respondWith(
      caches.match(req).then(c => c || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(x => x.put(req, copy)) }
        return res
      }))
    )
  }
})
