// Service worker: modo offline. Sube VERSION para invalidar caches viejos.
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const DATOS = `datos-${VERSION}`;
const TILES = `tiles-${VERSION}`;
const PRECACHE = ["/", "/chacra", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png"];
const MAX_TILES = 600;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function recortar(nombre, max) {
  const c = await caches.open(nombre);
  const ks = await c.keys();
  for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}

async function redPrimero(req, cache, opciones) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(cache)).put(req, res.clone());
    return res;
  } catch {
    const hit = await caches.match(req, opciones);
    if (hit) return hit;
    throw new Error("offline");
  }
}

async function cachePrimero(req, cache) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") {
    (await caches.open(cache)).put(req, res.clone());
    if (cache === TILES) recortar(TILES, MAX_TILES);
  }
  return res;
}

async function staleWhileRevalidate(req, cache) {
  const hit = await caches.match(req);
  const red = fetch(req)
    .then(async (res) => {
      if (res.ok) (await caches.open(cache)).put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || red;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // la IA (POST) siempre va a la red
  const url = new URL(req.url);

  // Páginas: red primero; sin red, la última versión guardada (ignorando ?lat=…)
  if (req.mode === "navigate") {
    e.respondWith(redPrimero(req, SHELL, { ignoreSearch: true }).catch(() => caches.match("/")));
    return;
  }
  // Tiles del mapa (satélite, OSM, NASA GIBS)
  if (/arcgisonline\.com|tile\.openstreetmap\.org|gibs\.earthdata\.nasa\.gov/.test(url.host)) {
    e.respondWith(cachePrimero(req, TILES));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Código de la app
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(cachePrimero(req, SHELL));
    return;
  }
  // Datos que cambian poco (NASA, nieve): mostrar lo guardado y actualizar en segundo plano
  if (/^\/api\/(nasa|ndvi|nieve)/.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(req, DATOS));
    return;
  }
  // Pronóstico: red primero, con respaldo
  if (url.pathname.startsWith("/api/weather")) {
    e.respondWith(redPrimero(req, DATOS));
    return;
  }
  e.respondWith(redPrimero(req, SHELL).catch(() => Response.error()));
});
