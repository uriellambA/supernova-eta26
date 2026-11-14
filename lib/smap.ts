// SMAP (Soil Moisture Active Passive) soil moisture from the satellite imagery tile service.
// SMAP measures soil MOISTURE (top ~5 cm, 9 km). It does not measure salt: Growvia uses it as an
// indicator of salinity RISK — in an arid valley, soil that stays wet at the surface while evaporation is
// high pulls water up by capillarity and leaves salts behind.

/** Candidate layers, most useful first (model-assimilated daily surface moisture, then the radiometer product). */
export const SMAP_LAYERS = [
  { id: "SMAP_L4_Analyzed_Surface_Soil_Moisture", level: 6 },
  { id: "SMAP_L3_Passive_Enhanced_Day_Soil_Moisture", level: 7 },
  { id: "SMAP_L3_Passive_Enhanced_Night_Soil_Moisture", level: 7 },
  { id: "SMAP_L3_Passive_Day_Soil_Moisture", level: 6 },
  { id: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", level: 6 },
] as const;

export const GIBS = "https://gibs.earthdata.nasa.gov";
export const smapTileUrl = (layer: string, date: string, level: number, z: number, x: number, y: number) =>
  `${GIBS}/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/${z}/${y}/${x}.png`;
export const smapColormapUrl = (layer: string, v = "v1.3") => `${GIBS}/colormaps/${v}/${layer}.xml`;

/**
 * Fallback when the colormap file is not reachable: read moisture from the color ramp itself
 * (soil-moisture palettes run from brown/yellow = dry, through green, to blue = wet).
 */
export function hueMoisture(r: number, g: number, b: number, a = 255): number | null {
  if (a < 128) return null;
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  if (mx < 0.08 || d / (mx || 1) < 0.15) return null; // black / grey / white = no data
  let h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h > 300) h = 0; // magenta/red end = driest
  return 0.02 + (Math.min(250, Math.max(20, h)) - 20) / 230 * 0.5;
}

export type ColorEntry = { r: number; g: number; b: number; value: number };

/** Parses a colormap XML (rgb="r,g,b" … value="[a,b)") into rgb → moisture (cm³/cm³) entries. */
export function parseColormap(xml: string): ColorEntry[] {
  const out: ColorEntry[] = [];
  for (const m of xml.matchAll(/<ColorMapEntry\b[^>]*>/g)) {
    const tag = m[0];
    if (/nodata="true"/i.test(tag) || /transparent="true"/i.test(tag)) continue;
    const rgb = tag.match(/rgb="(\d+),(\d+),(\d+)"/);
    const val = tag.match(/\svalue="([^"]+)"/) ?? tag.match(/sourceValue="([^"]+)"/);
    if (!rgb || !val) continue;
    const nums = (val[1].match(/-?\d+(\.\d+)?(e-?\d+)?/gi) ?? []).map(Number).filter(Number.isFinite);
    if (!nums.length) continue;
    out.push({ r: +rgb[1], g: +rgb[2], b: +rgb[3], value: nums.reduce((a, b) => a + b, 0) / nums.length });
  }
  return out;
}

/** rgb → value lookup (exact match, else nearest color within a small distance). */
export function colorLookup(entries: ColorEntry[]) {
  const exact = new Map(entries.map((e) => [(e.r << 16) | (e.g << 8) | e.b, e.value]));
  return (r: number, g: number, b: number, a = 255): number | null => {
    if (a < 128 || !entries.length) return null;
    const hit = exact.get((r << 16) | (g << 8) | b);
    if (hit !== undefined) return hit;
    let best: ColorEntry | null = null, d = Infinity;
    for (const e of entries) {
      const dd = (e.r - r) ** 2 + (e.g - g) ** 2 + (e.b - b) ** 2;
      if (dd < d) { d = dd; best = e; }
    }
    return best && d <= 300 ? best.value : null;
  };
}

/** Web Mercator tile + pixel for a point at zoom z. */
export function tilePixel(lat: number, lon: number, z: number) {
  const n = 256 * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  const X = ((lon + 180) / 360) * n, Y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  return { x: Math.floor(X / 256), y: Math.floor(Y / 256), px: Math.floor(X % 256), py: Math.floor(Y % 256) };
}

/**
 * Salinity-risk index (0..1) from surface soil moisture in an arid climate.
 * Dry surface (< 0.08) → salts are not moving up; persistently wet surface (> 0.35) under strong evaporation → high risk.
 */
export const salinityRisk = (sm: number, aridity = 0.15) =>
  Math.max(0, Math.min(1, ((sm - 0.08) / 0.27) * (aridity < 0.35 ? 1 : 0.6)));

export const RISK_STOPS: [number, [number, number, number]][] = [[0, [46, 160, 90]], [0.35, [235, 205, 80]], [0.65, [230, 120, 45]], [1, [190, 40, 40]]];
export function riskColor(v: number): [number, number, number] {
  for (let k = 1; k < RISK_STOPS.length; k++) if (v <= RISK_STOPS[k][0]) {
    const [a, ca] = RISK_STOPS[k - 1], [b, cb] = RISK_STOPS[k], t = (v - a) / (b - a);
    return [0, 1, 2].map((j) => Math.round(ca[j] + (cb[j] - ca[j]) * t)) as [number, number, number];
  }
  return RISK_STOPS.at(-1)![1];
}

export type SmapResumen = {
  simulado?: boolean;
  layer: string;
  decoding?: "colormap" | "color-ramp";
  samples: { date: string; sm: number }[];
  mean: number | null; // m³/m³ over the samples
  latest: { date: string; sm: number } | null;
  wetShare: number; // share of samples with sm > 0.25
  risk: number | null; // 0..1 salinity-risk index
};
