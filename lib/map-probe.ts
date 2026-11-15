"use client";
// Exact value under the cursor on the satellite map, for each active layer.
import { gibsDecoder, type GibsKind } from "./gibs-decode";
import { RISK_STOPS, tilePixel } from "./smap";
import { WEATHER_VARS, type WeatherGrid, type WeatherVarId } from "./weathergrid";

type Pixels = { w: number; h: number; data: Uint8ClampedArray };
const tiles = new Map<string, Promise<Pixels | null>>();

/** Loads a map tile once and keeps its pixels (CORS-enabled tile services only). */
function pixels(url: string): Promise<Pixels | null> {
  let p = tiles.get(url);
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const bmp = await createImageBitmap(await r.blob());
        const cv = document.createElement("canvas");
        cv.width = bmp.width;
        cv.height = bmp.height;
        const ctx = cv.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(bmp, 0, 0);
        return { w: bmp.width, h: bmp.height, data: ctx.getImageData(0, 0, bmp.width, bmp.height).data };
      } catch {
        return null;
      }
    })();
    if (tiles.size > 300) tiles.clear();
    tiles.set(url, p);
  }
  return p;
}

/** Tile reader for the shared NASA readers (vegetation series computed in the browser). */
export async function browserTile(url: string) {
  const px = await pixels(url);
  if (!px) { tiles.delete(url); throw new Error("tile not reachable"); }
  return { width: px.w, height: px.h, data: px.data };
}

/** Vegetation series straight from NASA in the browser, when our server could not get it in time. */
export async function ndviInBrowser(lat: number, lon: number) {
  const { ndviFromGibs } = await import("./ndvi-core");
  return ndviFromGibs(lat, lon, browserTile, 40_000);
}

async function rgbaAt(urlFor: (z: number, x: number, y: number) => string, z: number, lat: number, lon: number) {
  const t = tilePixel(lat, lon, z);
  const px = await pixels(urlFor(z, t.x, t.y));
  if (!px) return null;
  const sx = Math.floor((t.px / 256) * px.w), sy = Math.floor((t.py / 256) * px.h);
  const i = (sy * px.w + sx) * 4;
  return [px.data[i], px.data[i + 1], px.data[i + 2], px.data[i + 3]] as const;
}

export type GibsProbe = { layer: string; date: string; level: number; kind: GibsKind };
export const gibsTile = (p: GibsProbe) => (z: number, x: number, y: number) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${p.layer}/default/${p.date}/GoogleMapsCompatible_Level${p.level}/${z}/${y}/${x}.png`;

/** NASA layer value at a point: { value, exact } or null where there is no data (clouds, water, night…). */
export async function probeGibs(p: GibsProbe, lat: number, lon: number) {
  const [dec, c] = await Promise.all([gibsDecoder(p.layer, p.kind), rgbaAt(gibsTile(p), p.level, lat, lon)]);
  if (!c) return null;
  const v = dec.decode(c[0], c[1], c[2], c[3]);
  return v === null ? null : { value: v, exact: dec.exact };
}

/** Elevation (m) from the open terrain tiles (terrarium encoding is exact). */
export async function probeElevation(lat: number, lon: number) {
  const c = await rgbaAt((z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`, 12, lat, lon);
  if (!c || c[3] < 128) return null;
  return Math.round(c[0] * 256 + c[1] + c[2] / 256 - 32768);
}

/** Salinity-risk index (0..1) from our SMAP risk tiles: the color is matched back to the risk ramp. */
export async function probeSalinity(lat: number, lon: number) {
  const c = await rgbaAt((z, x, y) => `/api/smap/tile/${z}/${x}/${y}`, 6, lat, lon);
  if (!c || c[3] < 100) return null;
  let best = 0, d = Infinity;
  for (let k = 0; k <= 100; k++) {
    const t = k / 100;
    let col: number[] = RISK_STOPS[RISK_STOPS.length - 1][1];
    for (let j = 1; j < RISK_STOPS.length; j++) if (t <= RISK_STOPS[j][0]) {
      const [a, ca] = RISK_STOPS[j - 1], [b, cb] = RISK_STOPS[j], f = (t - a) / (b - a);
      col = ca.map((v, n) => v + (cb[n] - v) * f);
      break;
    }
    const dd = (col[0] - c[0]) ** 2 + (col[1] - c[1]) ** 2 + (col[2] - c[2]) ** 2;
    if (dd < d) { d = dd; best = t; }
  }
  return best;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
/** Weather value at a point, interpolated from the forecast grid (same as the colors on the map). */
export function probeWeather(g: WeatherGrid, varId: WeatherVarId, lat: number, lon: number) {
  const v = WEATHER_VARS.find((x) => x.id === varId)!;
  const vals = g.values[v.param] ?? [];
  const [[w, s], [e, n]] = g.bounds;
  if (lon < w || lon > e || lat < s || lat > n) return null;
  const gx = ((lon - w) / (e - w)) * (g.nx - 1), gy = ((n - lat) / (n - s)) * (g.ny - 1);
  const i = Math.min(g.nx - 2, Math.floor(gx)), j = Math.min(g.ny - 2, Math.floor(gy)), fx = gx - i, fy = gy - j;
  const at = (a: number, b: number) => vals[b * g.nx + a];
  const q = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)];
  if (q.some((x) => x === null || x === undefined)) {
    const near = q.find((x) => x !== null && x !== undefined);
    return near === undefined ? null : { value: near as number, unit: v.unit, from: undefined as string | undefined };
  }
  const [a, b, c, d] = q as number[];
  const value = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  let from: string | undefined;
  if (varId === "wind") {
    const dir = g.windDir[Math.round(gy) * g.nx + Math.round(gx)];
    if (dir !== null && dir !== undefined) from = COMPASS[Math.round(dir / 45) % 8];
  }
  return { value, unit: v.unit, from };
}
