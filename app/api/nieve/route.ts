import { conCache, errorJson, jsonCacheado, usarSimulado } from "@/lib/cache";
import { nieveCuencas } from "@/lib/openmeteo";
import { nieveSimulada } from "@/lib/simulado";

export const maxDuration = 60;

export async function GET(req: Request) {
  void req.url; // fuerza ejecución en cada request (no prerender)
  try {
    if (usarSimulado()) return jsonCacheado(nieveSimulada(), 60);
    const data = await conCache("nieve", 12 * 3_600_000, nieveCuencas);
    return jsonCacheado(data, 12 * 3600);
  } catch (e) {
    return errorJson(`No se pudo calcular la nieve: ${(e as Error).message}`);
  }
}
