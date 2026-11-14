import { usarSimulado } from "@/lib/cache";
import { resolveSmap, smapErrors } from "@/lib/smap-server";

/** Which SMAP layer/date is being used (or why none works) — shown under the map filter. */
export async function GET(req: Request) {
  void req.url;
  if (usarSimulado()) return Response.json({ ok: false, reason: "Sample-data mode: satellite tiles are not loaded." });
  try {
    const s = await resolveSmap();
    return Response.json({ ok: true, layer: s.layer, date: s.date, level: s.level, decoding: s.decoding, tried: smapErrors() });
  } catch (e) {
    return Response.json({ ok: false, reason: (e as Error).message, tried: smapErrors() });
  }
}
