import { conCache, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { indicadoresNasa } from "@/lib/nasa";
import { indicadoresSimulados } from "@/lib/simulado";

export const maxDuration = 60;

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("invalid lat/lon", 400);
  try {
    if (usarSimulado()) return jsonCacheado(indicadoresSimulados(p.lat, p.lon), 60);
    return jsonCacheado(await conCache(`climate:${p.lat}:${p.lon}`, 7 * 86_400_000, () => indicadoresNasa(p.lat, p.lon)), 7 * 86_400);
  } catch (e) {
    return errorJson(`Climate record unavailable: ${(e as Error).message}`);
  }
}
