/* sw.js — cache the shell so the app opens in airplane mode.
   Every path is relative: this is served from a GitHub Pages project
   subdirectory, so a leading slash would point at the wrong origin root. */
var CACHE = 'shaheen-traders-v2';

var SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './js/store.js',
  './js/catalogue.js',
  './js/state.js',
  './js/ui-bill.js',
  './js/ui-items.js',
  './js/ui-parties.js',
  './js/ui-records.js',
  './js/ui-setup.js',
  './js/invoice.js',
  './js/app.js',
  /* pinned third-party, so WhatsApp sharing keeps working with no network */
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

/* the pinned third-party files, so they can also be picked up at runtime if
   the install-time precache did not manage to fetch them */
var REMOTE = SHELL.filter(function (u) { return u.indexOf('http') === 0; });
function isPinnedRemote(url) { return REMOTE.indexOf(url) >= 0; }

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
        if (res && res.status === 200 && (res.type === 'basic' || (res.type === 'cors' && isPinnedRemote(req.url)))) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); })['catch'](function () {});
        }
        return res;
      })['catch'](function () { return hit; });
    })
  );
});
