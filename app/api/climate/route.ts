import { conCache, conDeadline, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { indicadoresNasa } from "@/lib/nasa";
import { indicadoresSimulados } from "@/lib/simulado";

export const maxDuration = 60;

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("invalid lat/lon", 400);
  try {
    if (usarSimulado()) return jsonCacheado(indicadoresSimulados(p.lat, p.lon), 60);
    // answer before the 60 s platform limit (a clear message instead of a gateway timeout)
    return jsonCacheado(await conDeadline(conCache(`climate:v3:${p.lat}:${p.lon}`, 7 * 86_400_000, () => indicadoresNasa(p.lat, p.lon)), 50_000, "NASA POWER"), 7 * 86_400);
  } catch (e) {
    return errorJson(`Climate record unavailable: ${(e as Error).message}`);
  }
}
