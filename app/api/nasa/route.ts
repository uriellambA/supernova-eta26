import { conCache, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { indicadoresNasa } from "@/lib/nasa";
import { indicadoresSimulados } from "@/lib/simulado";

export const maxDuration = 60;

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("lat/lon inválidos", 400);
  try {
    if (usarSimulado()) return jsonCacheado(indicadoresSimulados(p.lat, p.lon), 60);
    const data = await conCache(`nasa:${p.lat}:${p.lon}`, 7 * 86_400_000, () => indicadoresNasa(p.lat, p.lon));
    return jsonCacheado(data, 7 * 86_400);
  } catch (e) {
    return errorJson(`No se pudo obtener NASA POWER: ${(e as Error).message}`);
  }
}
