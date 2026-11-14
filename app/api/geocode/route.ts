import { siteById } from "@/config/sites";
import { errorJson, usarSimulado } from "@/lib/cache";

export type Place = { name: string; lat: number; lon: number };
const UA = { "User-Agent": "Growvia/0.4 (farm decision-support prototype)", "Accept-Language": "es,en" };

/** Street / place search biased to Los Antiguos (OpenStreetMap: Nominatim, fallback Photon). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const SITE = siteById(sp.get("site"));
  if (q.length < 3) return Response.json([]);
  if (usarSimulado()) {
    return Response.json([
      { name: `${q}, ${SITE.name} (sample)`, lat: SITE.center[1] + 0.004, lon: SITE.center[0] - 0.006 },
      { name: `${q} (rural), ${SITE.name} (sample)`, lat: SITE.center[1] - 0.006, lon: SITE.center[0] - 0.02 },
    ] satisfies Place[]);
  }
  const town = SITE.zone === "pampa" ? "Pergamino, Buenos Aires" : `${SITE.name}, Santa Cruz`;
  const query = q.toLowerCase().includes(SITE.name.toLowerCase().split(" ")[0]) ? q : `${q}, ${town}`;
  const [lon0, lat0] = SITE.center;
  try {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=ar&viewbox=${SITE.bounds[0][0]},${SITE.bounds[1][1]},${SITE.bounds[1][0]},${SITE.bounds[0][1]}&q=${encodeURIComponent(query)}`;
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(10_000) });
    const j = (await r.json()) as { display_name: string; lat: string; lon: string }[];
    if (r.ok && j.length) return Response.json(j.map((x) => ({ name: x.display_name, lat: +x.lat, lon: +x.lon })));
    throw new Error("no results");
  } catch {
    try {
      const r = await fetch(`https://photon.komoot.io/api/?limit=6&lat=${lat0}&lon=${lon0}&q=${encodeURIComponent(query)}`, { headers: UA, signal: AbortSignal.timeout(10_000) });
      const j = (await r.json()) as { features: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }[] };
      return Response.json(
        j.features.map((f) => ({
          name: [f.properties.name, f.properties.street, f.properties.city ?? f.properties.locality, f.properties.state].filter(Boolean).join(", "),
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        })),
      );
    } catch (e) {
      return errorJson(`Address search unavailable: ${(e as Error).message}`);
    }
  }
}
