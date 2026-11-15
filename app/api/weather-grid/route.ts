import { siteById } from "@/config/sites";
import { conCache, fetchJson, jsonCacheado, usarSimulado } from "@/lib/cache";
import { WEATHER_VARS, type WeatherGrid } from "@/lib/weathergrid";

export const maxDuration = 30;
const NX = 7, NY = 5;

async function grid(siteId: string): Promise<WeatherGrid> {
  const s = siteById(siteId);
  const [[w, so], [e, n]] = s.bounds;
  const lats = Array.from({ length: NY }, (_, j) => +(n - ((n - so) * j) / (NY - 1)).toFixed(3));
  const lons = Array.from({ length: NX }, (_, i) => +(w + ((e - w) * i) / (NX - 1)).toFixed(3));
  const pts = lats.flatMap((la) => lons.map((lo) => [la, lo]));
  const params = [...WEATHER_VARS.map((v) => v.param), "wind_direction_10m"].join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${pts.map((p) => p[0]).join(",")}&longitude=${pts.map((p) => p[1]).join(",")}&current=${params}&wind_speed_unit=kmh&timezone=GMT`;
  const j = await fetchJson(url, 20_000);
  const arr: { current: Record<string, number | string | null> }[] = Array.isArray(j) ? j : [j];
  const values: WeatherGrid["values"] = {};
  for (const v of WEATHER_VARS) values[v.param] = arr.map((r) => (typeof r.current?.[v.param] === "number" ? (r.current[v.param] as number) : null));
  return { time: String(arr[0]?.current?.time ?? ""), bounds: s.bounds, nx: NX, ny: NY, lats, lons, values, windDir: arr.map((r) => (typeof r.current?.wind_direction_10m === "number" ? (r.current.wind_direction_10m as number) : null)) };
}

function simulated(siteId: string): WeatherGrid {
  const s = siteById(siteId);
  const [[w, so], [e, n]] = s.bounds;
  const warm = s.zone === "pampa" ? 12 : 0;
  const lats = Array.from({ length: NY }, (_, j) => n - ((n - so) * j) / (NY - 1));
  const lons = Array.from({ length: NX }, (_, i) => w + ((e - w) * i) / (NX - 1));
  const cell = (f: (i: number, j: number) => number) => lats.flatMap((_, j) => lons.map((__, i) => +f(i, j).toFixed(1)));
  return {
    simulado: true, time: new Date().toISOString().slice(0, 16), bounds: s.bounds, nx: NX, ny: NY, lats, lons,
    values: {
      temperature_2m: cell((i, j) => 9 + warm + i * 0.8 - j * 0.6),
      uv_index: cell((i) => 5 + i * 0.4),
      wind_speed_10m: cell((i, j) => 45 - i * 4 + j * 2),
      relative_humidity_2m: cell((i, j) => 55 - i * 3 + j * 2 + warm),
      precipitation: cell((i, j) => Math.max(0, 2 - i * 0.5 + j * 0.3)),
      surface_pressure: cell((i, j) => 1000 - s.elevation / 9 + j - i),
      cloud_cover: cell((i, j) => 70 - i * 8 + j * 3),
    },
    windDir: cell(() => 270),
  };
}

/** Current weather on a 7×5 grid over the site, for the map overlay. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("site") ?? "";
  try {
    if (usarSimulado()) return jsonCacheado(simulated(id), 60);
    return jsonCacheado(await conCache(`wgrid:${id}`, 30 * 60_000, () => grid(id)), 1800);
  } catch (e) {
    // the source did not answer: no error for the browser; the page keeps the last saved values and asks again in 5 minutes
    return jsonCacheado({ sinDatos: true, motivo: `Weather map unavailable: ${(e as Error).message}` }, 300);
  }
}
