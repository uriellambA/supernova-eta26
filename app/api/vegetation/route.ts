import { conCache, conDeadline, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { ndviModis } from "@/lib/nasa";
import { ndviSimulado } from "@/lib/simulado";

export const maxDuration = 60;

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("invalid lat/lon", 400);
  try {
    if (usarSimulado()) return jsonCacheado(ndviSimulado(), 60);
    return jsonCacheado(await conDeadline(conCache(`ndvi:${p.lat}:${p.lon}`, 86_400_000, () => ndviModis(p.lat, p.lon)), 25_000, "MODIS (ORNL)"), 86_400);
  } catch (e) {
    // NASA's MODIS service did not answer: no error for the browser; the dashboard keeps the last saved
    // values on this device or shows "no data", and asks again in 10 minutes
    return jsonCacheado({ serie: [], ultimo: null, anioAnterior: null, sinDatos: true, motivo: (e as Error).message }, 600);
  }
}
