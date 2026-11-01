// Service worker : l'appli s'ouvre même sans Internet.
// Les fichiers de l'appli sont pris en priorité sur le réseau (donc toujours à jour),
// et la copie gardée sert quand il n'y a pas de connexion.
const VERSION = "inventaire-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "firebase-config.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"];
const CACHE_FIRST_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com",
  "cdn.jsdelivr.net", "unpkg.com", "images.openfoodfacts.org", "static.openfoodfacts.org"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // réseau d'abord, copie locale si hors ligne
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match("index.html"))));
    return;
  }
  if (CACHE_FIRST_HOSTS.includes(url.hostname)) {
    // bibliothèques, polices, vignettes produits : copie locale d'abord
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
  }
  // tout le reste (Firebase, Open Food Facts) : normal, sans interception
});
