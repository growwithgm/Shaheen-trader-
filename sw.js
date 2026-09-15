/* sw.js — cache the shell so the app opens in airplane mode.
   Every path is relative: this is served from a GitHub Pages project
   subdirectory, so a leading slash would point at the wrong origin root. */
var CACHE = 'shaheen-traders-v1';

var SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './js/store.js',
  './js/state.js',
  './js/ui-bill.js',
  './js/ui-items.js',
  './js/ui-parties.js',
  './js/ui-records.js',
  './js/ui-setup.js',
  './js/invoice.js',
  './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* one missing file must not fail the whole install */
      return Promise.all(SHELL.map(function (url) {
        return c.add(new Request(url, { cache: 'reload' }))['catch'](function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches['delete'](k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') { return; }

  /* navigations: network first so an update lands, cache as the fallback */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); })['catch'](function () {});
        return res;
      })['catch'](function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* everything else: cache first, then network, then nothing */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) { return hit; }
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); })['catch'](function () {});
        }
        return res;
      })['catch'](function () { return hit; });
    })
  );
});
