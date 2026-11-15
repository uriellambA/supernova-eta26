// NDVI and EVI time series from NASA GIBS (MODIS Terra, 8-day composites, ~250 m), read pixel by pixel.
// GIBS serves the same MODIS vegetation index as the ORNL service, as map tiles: it is fast and reliable, so it is
// the first source; ORNL stays as a fallback. Each tile's color is turned back into the index with the layer's colormap.
import { gibsDecoder, type Decoder } from "./gibs-decode";
import { GIBS, tilePixel } from "./smap";
import { getPng } from "./smap-server";
import { resumenNdvi } from "./nasa";
import type { NdviResumen, PuntoNdvi } from "./types";

const LEVEL = 9; // GoogleMapsCompatible_Level9 ≈ 200–300 m per pixel at these latitudes
const tileUrl = (layer: string, date: string, z: number, x: number, y: number) =>
  `${GIBS}/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${LEVEL}/${z}/${y}/${x}.png`;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Median of the valid pixels in a 3×3 window around the point (avoids a single cloudy / edge pixel). */
async function valueAt(layer: string, date: string, lat: number, lon: number, decode: Decoder["decode"]) {
  const t = tilePixel(lat, lon, LEVEL);
  const png = await getPng(tileUrl(layer, date, LEVEL, t.x, t.y));
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

/** Runs tasks with at most n at a time (kind to the tile service). */
async function pool<T>(tasks: (() => Promise<T>)[], n = 8): Promise<T[]> {
  const out: T[] = new Array(tasks.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < tasks.length) {
      const k = i++;
      out[k] = await tasks[k]();
    }
  }));
  return out;
}

export async function ndviGibs(lat: number, lon: number, now = Date.now()): Promise<NdviResumen> {
  // official colormap when reachable, otherwise an approximate reading of the color ramp
  const [ndviDec, eviDec] = await Promise.all([gibsDecoder("MODIS_Terra_NDVI_8Day", "ndvi"), gibsDecoder("MODIS_Terra_EVI_8Day", "evi")]);
  const ndviLut = ndviDec.decode, eviLut = eviDec.decode;
  // one composite every 16 days for the last ~13 months (so "same time last year" exists), newest ~10 days ago
  const dates = Array.from({ length: 26 }, (_, k) => iso(now - (10 + 16 * (25 - k)) * 86_400_000));
  const nd = await pool(dates.map((d) => () => valueAt("MODIS_Terra_NDVI_8Day", d, lat, lon, ndviLut).catch(() => null)));
  // EVI only for the latest composites (shown as the current value)
  const ev = await pool(dates.slice(-3).map((d) => () => valueAt("MODIS_Terra_EVI_8Day", d, lat, lon, eviLut).catch(() => null)));
  const serie: PuntoNdvi[] = [];
  dates.forEach((fecha, k) => {
    const v = nd[k];
    if (v === null) return;
    const e = k >= dates.length - 3 ? ev[k - (dates.length - 3)] : null;
    serie.push({ fecha, ndvi: v, ...(e !== null && e !== undefined && { evi: e }) });
  });
  const fails = nd.filter((v) => v === null).length;
  if (serie.length < 3) throw new Error(`GIBS: no vegetation values for this point (${fails} of ${dates.length} images empty or unreachable)`);
  return { ...resumenNdvi(serie), aproximado: !ndviDec.exact };
}
