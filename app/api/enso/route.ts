import { conCache, jsonCacheado, usarSimulado } from "@/lib/cache";
import { ensoFallback, ensoLive } from "@/lib/enso";

export async function GET(req: Request) {
  void req.url; // run on every request (no prerender)
  if (usarSimulado()) {
    const f = ensoFallback();
    return jsonCacheado({ ...f, simulado: true, current: { season: "SON", year: 2026, anomaly: 0.7, phase: "El Niño" } }, 60);
  }
  try {
    return jsonCacheado(await conCache("enso", 12 * 3_600_000, ensoLive), 43_200);
  } catch {
    return jsonCacheado(ensoFallback(), 3600);
  }
}
