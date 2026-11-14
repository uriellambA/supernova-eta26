import { PNG } from "pngjs";
import { SITE } from "@/config/site";
import { SMAP_LAYERS, colorLookup, hueMoisture, parseColormap, riskColor, salinityRisk, smapColormapUrl, smapTileUrl, tilePixel, type SmapResumen } from "./smap";

const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10);
type Decoder = (r: number, g: number, b: number, a: number) => number | null;
export type Resolved = { layer: string; level: number; date: string; decoding: "colormap" | "color-ramp"; decode: Decoder };

let cached: { t: number; v: Resolved } | null = null;
let lastErrors: string[] = [];
let failedAt = 0;
let pending: Promise<Resolved> | null = null;

async function getPng(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`${r.status}`);
  const type = r.headers.get("content-type") ?? "";
  if (!type.includes("png")) throw new Error(`not a PNG (${type || "no type"})`);
  return PNG.sync.read(Buffer.from(await r.arrayBuffer()));
}

/** Finds a SMAP layer + date + zoom level that serves data over Los Antiguos, and how to decode its colors. */
export async function resolveSmap(): Promise<Resolved> {
  if (cached && Date.now() - cached.t < 6 * 3_600_000) return cached.v;
  if (Date.now() - failedAt < 10 * 60_000) throw new Error(`no SMAP layer available (${lastErrors.slice(0, 3).join(" | ")})`);
  // one search at a time: map tiles arrive in parallel
  pending ??= search().finally(() => { pending = null; });
  return pending;
}

async function search(): Promise<Resolved> {
  const errors: string[] = [];
  const [lon, lat] = SITE.center;
  for (const L of SMAP_LAYERS) {
    for (const level of [...new Set([L.level, 6, 7])]) {
      const t = tilePixel(lat, lon, level);
      const dates = [3, 4, 6, 8, 11, 15, 21].map(day);
      const tries = await Promise.all(dates.map((d) => getPng(smapTileUrl(L.id, d, level, level, t.x, t.y)).then((png) => ({ d, png }), (e) => ({ d, err: (e as Error).message }))));
      const ok = tries.find((x): x is { d: string; png: ReturnType<typeof PNG.sync.read> } => "png" in x && x.png.data.some((v, i) => i % 4 === 3 && v > 128));
      if (!ok) {
        errors.push(`${L.id} L${level}: ${[...new Set(tries.map((x) => ("err" in x ? x.err : "empty")))].join(", ")}`);
        continue;
      }
      let decode: Decoder | null = null;
      for (const v of ["v1.3", "v1.2", "v1.0"]) {
        try {
          const r = await fetch(smapColormapUrl(L.id, v), { signal: AbortSignal.timeout(10_000) });
          if (!r.ok) continue;
          const entries = parseColormap(await r.text());
          if (entries.length > 2) { decode = colorLookup(entries); break; }
        } catch {
          /* next version */
        }
      }
      const v: Resolved = { layer: L.id, level, date: ok.d, decoding: decode ? "colormap" : "color-ramp", decode: decode ?? hueMoisture };
      cached = { t: Date.now(), v };
      lastErrors = errors;
      return v;
    }
  }
  lastErrors = errors;
  failedAt = Date.now();
  throw new Error(`no SMAP layer available (${errors.slice(0, 3).join(" | ")})`);
}

export const smapErrors = () => lastErrors;

const EMPTY = PNG.sync.write(new PNG({ width: 256, height: 256 }));
export const emptyTile = () => EMPTY;

/** A salinity-risk tile (PNG) for the map, built from the SMAP tile. */
export async function riskTile(z: number, x: number, y: number) {
  const s = await resolveSmap();
  const png = await getPng(smapTileUrl(s.layer, s.date, s.level, z, x, y));
  for (let i = 0; i < png.data.length; i += 4) {
    const v = s.decode(png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]);
    if (v === null) { png.data[i + 3] = 0; continue; }
    const [r, g, b] = riskColor(salinityRisk(v));
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 215;
  }
  return PNG.sync.write(png);
}

/** SMAP surface moisture at a point: 8 weekly samples → salinity-risk indicator. */
export async function smapAt(lat: number, lon: number): Promise<SmapResumen> {
  const s = await resolveSmap();
  const t = tilePixel(lat, lon, s.level);
  const base = Date.parse(s.date);
  const dates = Array.from({ length: 8 }, (_, k) => new Date(base - k * 7 * 86_400_000).toISOString().slice(0, 10));
  const vals = await Promise.all(dates.map(async (d) => {
    try {
      const png = await getPng(smapTileUrl(s.layer, d, s.level, s.level, t.x, t.y));
      const got: number[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const px = Math.min(png.width - 1, Math.max(0, t.px + dx)), py = Math.min(png.height - 1, Math.max(0, t.py + dy));
        const i = (py * png.width + px) * 4;
        const v = s.decode(png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]);
        if (v !== null) got.push(v);
      }
      return got.length ? got.reduce((a, b) => a + b, 0) / got.length : null;
    } catch {
      return null;
    }
  }));
  const samples = dates.map((date, k) => ({ date, sm: vals[k] })).filter((x): x is { date: string; sm: number } => x.sm !== null).map((x) => ({ ...x, sm: +x.sm.toFixed(3) }));
  if (!samples.length) throw new Error("no SMAP data at this point");
  const mean = samples.reduce((a, x) => a + x.sm, 0) / samples.length;
  return { layer: s.layer, decoding: s.decoding, samples, mean: +mean.toFixed(3), latest: samples[0], wetShare: +(samples.filter((x) => x.sm > 0.25).length / samples.length).toFixed(2), risk: +salinityRisk(mean).toFixed(2) };
}
