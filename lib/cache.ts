// Cache en memoria por instancia del servidor + helpers de respuesta.
const mem = new Map<string, { t: number; v: unknown }>();

export async function conCache<T>(clave: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = mem.get(clave);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v as T;
  const v = await fn();
  mem.set(clave, { t: Date.now(), v });
  if (mem.size > 500) mem.delete(mem.keys().next().value!);
  return v;
}

export function jsonCacheado(data: unknown, segundos: number) {
  return Response.json(data, {
    headers: { "Cache-Control": `public, s-maxage=${segundos}, stale-while-revalidate=${segundos * 4}` },
  });
}

export function errorJson(msg: string, status = 502) {
  return Response.json({ error: msg }, { status });
}

export function leerLatLon(url: string) {
  const sp = new URL(url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat: +lat.toFixed(2), lon: +lon.toFixed(2) };
}

export const usarSimulado = () => process.env.MOCK_DATA === "1";

export async function fetchJson(url: string, timeoutMs = 25_000, init?: RequestInit) {
  // long offline jobs (the soil study) can ask for more patience with GROWVIA_MIN_TIMEOUT_MS
  const ms = Math.max(timeoutMs, Number(process.env.GROWVIA_MIN_TIMEOUT_MS) || 0);
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`${new URL(url).host} respondió ${res.status}`);
  return res.json();
}

/** Rejects if the promise takes longer than ms (so the route can answer with a fallback before the platform times out). */
export function conDeadline<T>(p: Promise<T>, ms: number, what = "source"): Promise<T> {
  return new Promise<T>((ok, fail) => {
    const t = setTimeout(() => fail(new Error(`${what} did not answer in ${Math.round(ms / 1000)} s`)), ms);
    p.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); fail(e); });
  });
}
