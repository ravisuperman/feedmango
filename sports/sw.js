/**
 * ============================================================
 * SPORTSrip Service Worker
 * ============================================================
 * Responsibilities:
 *   1. Cache static assets for offline support
 *   2. Receive push messages from the server
 *   3. Show rich notifications with actions
 *   4. Handle notification clicks (open correct page)
 *
 * ── CACHE BUSTING ──────────────────────────────────────────
 * IMPORTANT: Bump CACHE_VERSION on every deploy so users
 * automatically get fresh CSS/JS/HTML without clearing cache.
 * Format: sportsrip-YYYYMMDD-NN (NN = deploy number that day)
 * ============================================================
 */

const CACHE_VERSION = 'sportsrip-20260430-01';
const CACHE_NAME    = CACHE_VERSION;
const CACHE_URLS    = ['/', '/index.html'];

// ── Install: cache static shell ──────────────────────────────
self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CACHE_URLS);
    }).catch(function () {
      // Don't block install if caching fails
    })
  );
});

// ── Activate: clean old caches ───────────────────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ── Fetch: Network-first for HTML, Stale-While-Revalidate for CSS/JS ──
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);
  const isHTML = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHTML) {
    // NETWORK-FIRST for HTML so layout changes are always visible
    event.respondWith(
      fetch(event.request).then(function (response) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
        return response;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
  } else {
    // STALE-WHILE-REVALIDATE for CSS/JS
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        const networkFetch = fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
  }
});

// ── Push: receive notification from server ───────────────────
self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'SPORTSrip', body: event.data ? event.data.text() : 'New sports update!' };
  }

  const title   = data.title   || 'SPORTSrip 🏏';
  const options = {
    body:    data.body    || 'New sports update — tap to read.',
    icon:    data.icon    || '/favicon.ico',
    badge:   data.badge   || '/favicon.ico',
    tag:     data.tag     || 'sportsrip-update',
    data:    { url: data.url || '/' },
    actions: [
      { action: 'open',    title: '📰 Read Now' },
      { action: 'dismiss', title: '✕ Dismiss'   }
    ],
    requireInteraction: false,
    vibrate: [100, 50, 100]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click: open or focus the site ───────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      // If SPORTSrip is already open, focus it
      for (var i = 0; i < clients.length; i++) {
        var c = clients[i];
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.focus();
          c.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
