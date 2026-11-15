// Service worker: offline mode. Bump VERSION to invalidate old caches.
const VERSION = "v7";
const SHELL = `shell-${VERSION}`;
const DATOS = `datos-${VERSION}`;
const TILES = `tiles-${VERSION}`;
const PRECACHE = ["/", "/app", "/register", "/manifest.webmanifest", "/icons/icon-192.png", "/brand/growvia-mark-128.png"];
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

// Safari refuses a page answered by a service worker with a redirected response: give it a clean copy
async function limpia(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function redPrimero(req, cache, opciones) {
  try {
    const res = await limpia(await fetch(req));
    if (res.ok) (await caches.open(cache)).put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    const hit = await caches.match(req, opciones);
    if (hit) return hit;
    throw new Error("offline");
  }
}

// Never answer a page with "nothing" (Safari then shows "Safari can't open the page")
const SIN_RED = () => new Response(
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Growvia</title>' +
  '<body style="font-family:system-ui;padding:2rem;background:#141413;color:#eee"><h1>Growvia</h1>' +
  "<p>No hay conexión y esta página todavía no está guardada en este aparato. Probá de nuevo cuando tengas internet.</p>" +
  '<p><a style="color:#9fd8a0" href="/">Reintentar</a></p>',
  { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
);

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
  // Never cache app code on a local development machine
  if (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") {
    if (new URL(req.url).pathname.startsWith("/_next/")) return;
  }
  if (req.method !== "GET") return; // la IA (POST) siempre va a la red
  if (req.headers.has("range")) return; // audio / video: Safari pide por partes, que lo atienda la red
  const url = new URL(req.url);

  // Páginas: red primero; sin red, la última versión guardada (ignorando ?lat=…)
  if (req.mode === "navigate") {
    e.respondWith(
      redPrimero(req, SHELL, { ignoreSearch: true })
        .catch(async () => (await caches.match("/app")) || (await caches.match("/")) || SIN_RED()),
    );
    return;
  }
  // Tiles del mapa (satélite, OSM, NASA GIBS)
  if (/arcgisonline\.com|elevation-tiles-prod|gibs\.earthdata\.nasa\.gov/.test(url.host)) {
    e.respondWith(cachePrimero(req, TILES));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Código de la app
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/landing/") || url.pathname.startsWith("/brand/")) {
    e.respondWith(cachePrimero(req, SHELL));
    return;
  }
  // Datos que cambian poco (NASA, nieve): mostrar lo guardado y actualizar en segundo plano
  if (/^\/api\/(climate|vegetation|snow|soil|enso)/.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(req, DATOS));
    return;
  }
  // Pronóstico: red primero, con respaldo
  if (url.pathname.startsWith("/api/forecast")) {
    e.respondWith(redPrimero(req, DATOS));
    return;
  }
  // Lo demás (datos de navegación de Next, cuentas, etc.): directo a la red, sin guardar
});
