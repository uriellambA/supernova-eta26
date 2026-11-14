import { conCache, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { ndviModis } from "@/lib/nasa";
import { ndviSimulado } from "@/lib/simulado";

export const maxDuration = 60;

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("invalid lat/lon", 400);
  try {
    if (usarSimulado()) return jsonCacheado(ndviSimulado(), 60);
    return jsonCacheado(await conCache(`ndvi:${p.lat}:${p.lon}`, 86_400_000, () => ndviModis(p.lat, p.lon)), 86_400);
  } catch (e) {
    return errorJson(`Vegetation index unavailable: ${(e as Error).message}`);
  }
}
