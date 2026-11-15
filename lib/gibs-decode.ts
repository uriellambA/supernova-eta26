// Turn a NASA GIBS map-tile color back into the measured value (NDVI, EVI, land temperature, snow cover).
// Used on the server (vegetation series) and in the browser (exact value under the cursor on the map).
// 1) the layer's official colormap (several known locations are tried);
// 2) if none is reachable, an approximate reading of the color ramp (marked as approximate).
import { colorLookup, GIBS, parseColormap } from "./smap";

export type GibsKind = "ndvi" | "evi" | "lst" | "snow";
export type Decoder = { decode: (r: number, g: number, b: number, a?: number) => number | null; exact: boolean };

const candidates = (layer: string) => {
  const base = layer.replace(/_(8Day|16Day|Day|Night|Monthly)$/, "");
  return [...new Set([
    `${GIBS}/colormaps/v1.3/${layer}.xml`,
    `${GIBS}/colormaps/v1.2/${layer}.xml`,
    `${GIBS}/colormaps/v1.0/${layer}.xml`,
    `${GIBS}/colormaps/v1.3/${base}.xml`,
  ])];
};

/** Colormap values come in the layer's own unit: land temperature in Kelvin → °C. */
function normalize(kind: GibsKind, v: number) {
  if (kind === "lst" && v > 150) return +(v - 273.15).toFixed(1);
  if ((kind === "ndvi" || kind === "evi") && Math.abs(v) > 1.5) return +(v * 0.0001).toFixed(3); // raw MODIS scale
  return v;
}

function hsl(r: number, g: number, b: number) {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn, l = (mx + mn) / 2;
  if (d < 0.0001) return { h: 0, s: 0, l };
  const h = (mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4) * 60;
  return { h: (h + 360) % 360, s: d / (1 - Math.abs(2 * l - 1) || 1), l };
}

/** Approximate reading of the usual GIBS ramps when the colormap file is not reachable. */
export function rampDecoder(kind: GibsKind): Decoder {
  return {
    exact: false,
    decode: (r, g, b, a = 255) => {
      if (a < 128) return null;
      const { h, s, l } = hsl(r, g, b);
      if (kind === "ndvi" || kind === "evi") {
        if (l > 0.94 && s < 0.15) return 0; // white = bare / no vegetation
        // tan/brown (≈30°) = sparse → yellow-green (≈70°) → green (≈120°), darker = denser
        const t = Math.max(0, Math.min(1, (h - 30) / 100));
        const v = 0.08 + 0.55 * t + 0.35 * Math.max(0, 0.6 - l) / 0.6;
        return +Math.min(1, v * (kind === "evi" ? 0.75 : 1)).toFixed(2);
      }
      if (kind === "lst") {
        if (s < 0.15) return null;
        const t = Math.max(0, Math.min(1, (260 - Math.min(260, h > 300 ? 0 : h)) / 260)); // blue = cold → red = hot
        return +(-25 + 70 * t).toFixed(1);
      }
      // snow cover (NDSI): white = snow; the brighter and greyer, the more snow
      if (s < 0.2) return Math.round(Math.max(0, Math.min(100, (l - 0.3) / 0.7 * 100)));
      return null;
    },
  };
}

const cache = new Map<string, Promise<Decoder>>();

/** Official colormap for a GIBS layer if reachable, else the approximate ramp. Never rejects. */
export function gibsDecoder(layer: string, kind: GibsKind): Promise<Decoder> {
  let p = cache.get(layer);
  if (!p) {
    p = (async () => {
      // all known locations at once: the first valid colormap wins
      const tries = candidates(layer).map(async (url) => {
        const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) throw new Error(`${r.status}`);
        const entries = parseColormap(await r.text());
        if (entries.length < 5) throw new Error("empty colormap");
        const look = colorLookup(entries);
        return { exact: true, decode: (r, g, b, a) => { const v = look(r, g, b, a); return v === null ? null : normalize(kind, v); } } as Decoder;
      });
      return Promise.any(tries).catch(() => rampDecoder(kind));
    })();
    cache.set(layer, p);
  }
  return p;
}
