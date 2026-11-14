import { PNG } from "pngjs";
import { conCache, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { SMAP_LAYERS, colorLookup, parseColormap, salinityRisk, smapColormapUrl, smapTileUrl, tilePixel, type SmapResumen } from "@/lib/smap";

export const maxDuration = 60;

const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10);

async function readPoint(layer: string, level: number, date: string, lat: number, lon: number, lookup: ReturnType<typeof colorLookup>) {
  const t = tilePixel(lat, lon, level);
  const r = await fetch(smapTileUrl(layer, date, level, level, t.x, t.y), { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`tile ${r.status}`);
  const png = PNG.sync.read(Buffer.from(await r.arrayBuffer()));
  // average the 3×3 pixels around the point, ignoring no-data
  const vals: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const px = Math.min(png.width - 1, Math.max(0, t.px + dx)), py = Math.min(png.height - 1, Math.max(0, t.py + dy));
    const i = (py * png.width + px) * 4;
    const v = lookup(png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]);
    if (v !== null) vals.push(v);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/** SMAP surface soil moisture at the field: last 8 weeks (weekly samples) → salinity-risk indicator. */
async function smapAt(lat: number, lon: number): Promise<SmapResumen> {
  let lastErr: unknown;
  for (const L of SMAP_LAYERS) {
    try {
      const cm = await fetch(smapColormapUrl(L.id), { signal: AbortSignal.timeout(15_000) });
      if (!cm.ok) throw new Error(`colormap ${cm.status}`);
      const lookup = colorLookup(parseColormap(await cm.text()));
      const dates = Array.from({ length: 8 }, (_, k) => day(4 + k * 7));
      const vals = await Promise.all(dates.map((d) => readPoint(L.id, L.level, d, lat, lon, lookup).catch(() => null)));
      const samples = dates.map((date, k) => ({ date, sm: vals[k] })).filter((s): s is { date: string; sm: number } => s.sm !== null).map((s) => ({ ...s, sm: +s.sm.toFixed(3) }));
      if (!samples.length) throw new Error("no data at this point");
      const mean = samples.reduce((a, s) => a + s.sm, 0) / samples.length;
      return { layer: L.id, samples, mean: +mean.toFixed(3), latest: samples[0], wetShare: +(samples.filter((s) => s.sm > 0.25).length / samples.length).toFixed(2), risk: +salinityRisk(mean).toFixed(2) };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("SMAP unavailable");
}

function smapSimulado(): SmapResumen {
  const samples = Array.from({ length: 8 }, (_, k) => ({ date: day(4 + k * 7), sm: +(0.17 + 0.03 * Math.sin(k)).toFixed(3) }));
  const mean = samples.reduce((a, s) => a + s.sm, 0) / samples.length;
  return { simulado: true, layer: SMAP_LAYERS[0].id, samples, mean: +mean.toFixed(3), latest: samples[0], wetShare: 0, risk: +salinityRisk(mean).toFixed(2) };
}

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("invalid lat/lon", 400);
  try {
    if (usarSimulado()) return jsonCacheado(smapSimulado(), 60);
    return jsonCacheado(await conCache(`smap:${p.lat}:${p.lon}`, 12 * 3_600_000, () => smapAt(p.lat, p.lon)), 43_200);
  } catch (e) {
    return errorJson(`Satellite soil moisture unavailable: ${(e as Error).message}`);
  }
}
