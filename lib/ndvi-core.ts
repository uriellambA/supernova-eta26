// NDVI / EVI time series read from NASA GIBS map tiles (MODIS 8-day composites, ~250 m), pixel by pixel.
// Shared by the server route and the browser (fallback when the server could not reach NASA in time):
// only the way a tile is downloaded changes.
import { gibsDecoder, type Decoder } from "./gibs-decode";
import { GIBS, tilePixel } from "./smap";
import { resumenNdvi } from "./nasa-summary";
import type { NdviResumen, PuntoNdvi } from "./types";

export type TilePixels = { width: number; height: number; data: ArrayLike<number> };
export type ReadTile = (url: string) => Promise<TilePixels>;

const LEVEL = 9; // GoogleMapsCompatible_Level9 ≈ 200–300 m per pixel at these latitudes
// 8-day composite first; the 16-day product (MOD13) if a date has no 8-day image
export const NDVI_LAYERS = ["MODIS_Terra_NDVI_8Day", "MODIS_Terra_L3_NDVI_16Day"];
const EVI_LAYER = "MODIS_Terra_EVI_8Day";
const tileUrl = (layer: string, date: string, x: number, y: number) =>
  `${GIBS}/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${LEVEL}/${LEVEL}/${y}/${x}.png`;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Median of the valid pixels in a 3×3 window around the point (avoids a single cloudy / edge pixel). */
async function valueAt(read: ReadTile, layer: string, date: string, lat: number, lon: number, decode: Decoder["decode"]) {
  const t = tilePixel(lat, lon, LEVEL);
  const png = await read(tileUrl(layer, date, t.x, t.y));
  const vals: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const px = Math.min(png.width - 1, Math.max(0, t.px + dx)), py = Math.min(png.height - 1, Math.max(0, t.py + dy));
    const i = (py * png.width + px) * 4;
    const v = decode(png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]);
    if (v !== null && v > -0.3 && v <= 1) vals.push(v);
  }
  if (!vals.length) return null;
  vals.sort((a, b) => a - b);
  return +vals[Math.floor(vals.length / 2)].toFixed(3);
}

/** Runs tasks at most n at a time; stops starting new ones once `stop()` is true. */
async function pool(tasks: (() => Promise<void>)[], n: number, stop: () => boolean) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < tasks.length && !stop()) await tasks[i++]();
  }));
}

/**
 * Reads the series within `budgetMs`: whatever arrived by then is used (at least 3 dates are needed),
 * so a slow NASA answer gives a shorter series instead of nothing.
 */
export async function ndviFromGibs(lat: number, lon: number, read: ReadTile, budgetMs = 25_000, now = Date.now()): Promise<NdviResumen> {
  const t0 = Date.now();
  const over = () => Date.now() - t0 > budgetMs;
  const [ndviDec, eviDec] = await Promise.all([gibsDecoder(NDVI_LAYERS[0], "ndvi"), gibsDecoder(EVI_LAYER, "evi")]);
  // one composite every 16 days for the last ~13 months (so "same time last year" exists), newest ~10 days ago.
  // Newest first: if time runs out, the recent part of the series is what we keep.
  const dates = Array.from({ length: 26 }, (_, k) => iso(now - (10 + 16 * (25 - k)) * 86_400_000));
  const nd = new Map<string, number>(), ev = new Map<string, number>();
  const errors = new Set<string>();
  const tasks = [...dates].reverse().map((d, k) => async () => {
    for (const layer of NDVI_LAYERS) {
      if (over()) return;
      try {
        const v = await valueAt(read, layer, d, lat, lon, ndviDec.decode);
        if (v !== null) { nd.set(d, v); break; }
      } catch (e) {
        errors.add((e as Error).message);
      }
    }
    if (k < 3 && !over()) {
      const e = await valueAt(read, EVI_LAYER, d, lat, lon, eviDec.decode).catch(() => null);
      if (e !== null) ev.set(d, e);
    }
  });
  const work = pool(tasks, 8, over);
  await Promise.race([work, new Promise((r) => setTimeout(r, budgetMs + 2_000))]);
  const serie: PuntoNdvi[] = dates.filter((d) => nd.has(d)).map((fecha) => ({ fecha, ndvi: nd.get(fecha)!, ...(ev.has(fecha) && { evi: ev.get(fecha) }) }));
  if (serie.length < 3) {
    const why = [...errors].slice(0, 2).join(", ") || (over() ? "too slow" : "only empty images (clouds / no data)");
    throw new Error(`NASA GIBS: ${serie.length} of ${dates.length} dates read in ${Math.round((Date.now() - t0) / 1000)} s (${why})`);
  }
  return { ...resumenNdvi(serie), aproximado: !ndviDec.exact };
}
