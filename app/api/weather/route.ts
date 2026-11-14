import { conCache, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { pronostico } from "@/lib/openmeteo";
import { climaSimulado } from "@/lib/simulado";

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("lat/lon inválidos", 400);
  try {
    if (usarSimulado()) return jsonCacheado(climaSimulado(), 60);
    const data = await conCache(`om:${p.lat}:${p.lon}`, 30 * 60_000, () => pronostico(p.lat, p.lon));
    return jsonCacheado(data, 1800);
  } catch (e) {
    return errorJson(`No se pudo obtener el pronóstico: ${(e as Error).message}`);
  }
}
