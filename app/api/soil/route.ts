import { conCache, conDeadline, errorJson, jsonCacheado, leerLatLon, usarSimulado } from "@/lib/cache";
import { soilSimulado } from "@/lib/simulado";
import { soilAt, soilReference } from "@/lib/soil";

export const maxDuration = 30;

export async function GET(req: Request) {
  const p = leerLatLon(req.url);
  if (!p) return errorJson("invalid lat/lon", 400);
  if (usarSimulado()) return jsonCacheado(soilSimulado(p.lat, p.lon), 60);
  try {
    // SoilGrids can be very slow: answer within 12 s (well before the 30 s limit) or use the reference
    return jsonCacheado(await conDeadline(conCache(`soil:${p.lat}:${p.lon}`, 30 * 86_400_000, () => soilAt(p.lat, p.lon)), 12_000, "SoilGrids"), 30 * 86_400);
  } catch {
    // Soil map unavailable → regional reference values (flagged as such in the UI); retried after 10 minutes
    return jsonCacheado(soilReference(p.lat, p.lon), 600);
  }
}
