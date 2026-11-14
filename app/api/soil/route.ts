import { conCache, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { soilSimulado } from "@/lib/simulado";
import { soilAt, soilReference } from "@/lib/soil";

export const maxDuration = 30;

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("invalid lat/lon", 400);
  if (usarSimulado()) return jsonCacheado(soilSimulado(), 60);
  try {
    return jsonCacheado(await conCache(`soil:${p.lat}:${p.lon}`, 30 * 86_400_000, () => soilAt(p.lat, p.lon)), 30 * 86_400);
  } catch {
    // Soil map unavailable → regional reference values (flagged as such in the UI)
    return jsonCacheado(soilReference(), 3600);
  }
}
