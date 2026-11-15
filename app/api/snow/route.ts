import { siteById } from "@/config/sites";
import { conCache, errorJson, jsonCacheado, usarSimulado } from "@/lib/cache";
import { nieveCuencas } from "@/lib/openmeteo";
import { nieveSimulada } from "@/lib/simulado";

export const maxDuration = 60;

/** Snowpack in the watershed that feeds the site's irrigation (sites without one answer 404). */
export async function GET(req: Request) {
  const site = siteById(new URL(req.url).searchParams.get("site"));
  if (!site.watershed) return errorJson("This site is rain-fed: no snow-fed watershed", 404);
  try {
    if (usarSimulado()) return jsonCacheado({ ...nieveSimulada(), cuencas: nieveSimulada().cuencas.map((c) => ({ ...c, id: site.id, nombre: site.watershed!.name })) }, 60);
    return jsonCacheado(await conCache(`snow:${site.id}`, 12 * 3_600_000, () => nieveCuencas(site)), 12 * 3600);
  } catch (e) {
    // the source did not answer: no error for the browser; the page keeps the last saved values and asks again in 5 minutes
    return jsonCacheado({ sinDatos: true, motivo: `Snowpack unavailable: ${(e as Error).message}` }, 300);
  }
}
