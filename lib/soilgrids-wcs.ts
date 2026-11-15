// SoilGrids (ISRIC, CC BY 4.0) read from its open map service (WCS) instead of the REST API.
// Same 250 m maps, another ISRIC server: used when rest.isric.org is down (it often answers 504).
// Each request returns a tiny GeoTIFF around the point; the value under the point is used.
import { fromArrayBuffer } from "geotiff";

const WCS = "https://maps.isric.org/mapserv";
// SoilGrids stores integers: value / factor = conventional unit (same conversion as the REST API's d_factor)
const FACTOR: Record<string, number> = { sand: 10, silt: 10, clay: 10, soc: 10, phh2o: 10, nitrogen: 100, cec: 10, bdod: 100, cfvo: 10 };
const D = 0.003; // ≈ 300 m box around the point (a few 250 m pixels)

export async function wcsValue(prop: string, depth: string, stat: string, lat: number, lon: number, timeoutMs = 30_000) {
  const q = new URLSearchParams({
    map: `/map/${prop}.map`, SERVICE: "WCS", VERSION: "2.0.1", REQUEST: "GetCoverage",
    COVERAGEID: `${prop}_${depth}_${stat}`, FORMAT: "image/tiff",
    SUBSETTINGCRS: "http://www.opengis.net/def/crs/EPSG/0/4326", OUTPUTCRS: "http://www.opengis.net/def/crs/EPSG/0/4326",
  });
  const url = `${WCS}?${q}&SUBSET=long(${(lon - D).toFixed(4)},${(lon + D).toFixed(4)})&SUBSET=lat(${(lat - D).toFixed(4)},${(lat + D).toFixed(4)})`;
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`maps.isric.org respondió ${r.status}`);
  const buf = await r.arrayBuffer();
  if (new Uint8Array(buf, 0, 2).every((b, i) => b === [0x3c, 0x3f][i])) throw new Error("maps.isric.org: no image (service error)");
  const img = await (await fromArrayBuffer(buf)).getImage();
  const [band] = (await img.readRasters()) as unknown as ArrayLike<number>[];
  const w = img.getWidth(), h = img.getHeight();
  const nodata = img.getGDALNoData();
  // centre pixel, else the median of the valid pixels in the box
  const ok = (v: number) => v !== nodata && v !== -32768 && Number.isFinite(v);
  const c = band[Math.floor(h / 2) * w + Math.floor(w / 2)];
  if (ok(c)) return c / FACTOR[prop];
  const vals = Array.from(band).filter(ok).sort((a, b) => a - b);
  return vals.length ? vals[Math.floor(vals.length / 2)] / FACTOR[prop] : null;
}

type Cell = { mean: number | null; q05: number | null; q95: number | null };

/** Same shape as the REST profile: profile[depth][property] = { mean, q05, q95 } in conventional units. */
export async function soilGridsWcs(lat: number, lon: number, props: readonly string[], depths: readonly string[], timeoutMs = 30_000) {
  const out: Record<string, Record<string, Cell>> = {};
  const jobs: (() => Promise<void>)[] = [];
  for (const d of depths) for (const p of props) {
    const cell: Cell = ((out[d] ??= {})[p] = { mean: null, q05: null, q95: null });
    jobs.push(async () => { cell.mean = await wcsValue(p, d, "mean", lat, lon, timeoutMs); });
    // uncertainty range only for clay (shown in the study)
    if (p === "clay") {
      jobs.push(async () => { cell.q05 = await wcsValue(p, d, "Q0.05", lat, lon, timeoutMs).catch(() => null); });
      jobs.push(async () => { cell.q95 = await wcsValue(p, d, "Q0.95", lat, lon, timeoutMs).catch(() => null); });
    }
  }
  let i = 0, fails = 0, lastErr = "";
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < jobs.length) {
      try { await jobs[i++](); } catch (e) { fails++; lastErr = (e as Error).message; }
    }
  }));
  const hasTexture = depths.some((d) => out[d].sand?.mean != null && out[d].clay?.mean != null);
  if (!hasTexture) throw new Error(`SoilGrids map service: no texture at this point (${fails} requests failed${lastErr ? `: ${lastErr}` : ""})`);
  return out;
}
