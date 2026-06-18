const CACHE_NAME = 'monietrack-v8';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/monietrack_icon_192.png',
  '/monietrack_icon_512.png',
  '/favicon.ico'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS).catch(() => null))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    url.pathname === '/manifest.json' ||
    url.pathname.includes('monietrack_icon_') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => null);
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => cached);
    })
  );
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}
  const title = data.title || 'MonieTrack Reminder';
  const options = {
    body: data.body || 'You have a reminder in MonieTrack.',
    icon: '/monietrack_icon_192.png',
    badge: '/monietrack_icon_192.png',
    data: data.url || '/'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(clients.openWindow(url));
});
