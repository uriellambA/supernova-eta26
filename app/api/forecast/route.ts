import { conCache, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { pronostico } from "@/lib/openmeteo";
import { climaSimulado } from "@/lib/simulado";

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("invalid lat/lon", 400);
  try {
    if (usarSimulado()) return jsonCacheado(climaSimulado(), 60);
    return jsonCacheado(await conCache(`fc:${p.lat}:${p.lon}`, 30 * 60_000, () => pronostico(p.lat, p.lon)), 1800);
  } catch (e) {
    return errorJson(`Forecast unavailable: ${(e as Error).message}`);
  }
}
