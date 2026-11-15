import { conCache, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { SMAP_LAYERS, salinityRisk, type SmapResumen } from "@/lib/smap";
import { smapAt } from "@/lib/smap-server";

export const maxDuration = 60;

const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10);

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
    // the source did not answer: no error for the browser; the page keeps the last saved values and asks again in 5 minutes
    return jsonCacheado({ sinDatos: true, motivo: `Satellite soil moisture unavailable: ${(e as Error).message}` }, 300);
  }
}
