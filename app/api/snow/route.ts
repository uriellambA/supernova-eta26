import { conCache, errorJson, jsonCacheado, usarSimulado } from "@/lib/cache";
import { nieveCuencas } from "@/lib/openmeteo";
import { nieveSimulada } from "@/lib/simulado";

export const maxDuration = 60;

export async function GET(req: Request) {
  void req.url; // run on every request (no prerender)
  try {
    if (usarSimulado()) return jsonCacheado(nieveSimulada(), 60);
    return jsonCacheado(await conCache("snow", 12 * 3_600_000, nieveCuencas), 12 * 3600);
  } catch (e) {
    return errorJson(`Snowpack unavailable: ${(e as Error).message}`);
  }
}
