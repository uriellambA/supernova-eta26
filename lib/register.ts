import { DEFAULT_SITE_ID, siteById } from "@/config/sites";
import { speciesById } from "@/config/species";
import { DEFAULT_PRIORITIES, type FarmProfile, type FarmRegister, type FarmSystem, type PlotRecord } from "./types";

export const newPlot = (n: number): PlotRecord => ({
  id: `plot-${n}`,
  name: `Plot ${n}`,
  areaHa: 1,
  crop: "cherry",
  plantedYear: null,
  history: { spring: "", summer: "", autumn: "", winter: "" },
  irrigation: "furrow",
  yieldTHa: null,
});

export const emptyRegister = (siteId = DEFAULT_SITE_ID): FarmRegister => ({
  siteId,
  farmName: "",
  producer: "",
  address: "",
  boundary: null,
  boundaryHa: null,
  lat: siteById(siteId).center[1],
  lon: siteById(siteId).center[0],
  plots: [newPlot(1)],
  water: { source: "canal", turnDays: 7, shortMonths: [2, 3] },
  soilTest: { date: "", ph: null, ec: null, organicMatter: null, notes: "" },
  economy: { channel: "national", workers: 2, budgetUsd: null, machinery: [] },
  livestock: false,
  interests: [],
  priorities: DEFAULT_PRIORITIES,
  notes: "",
  updated: "",
});

const SYSTEM_OF: Record<string, FarmSystem> = { soy: "grains", maize: "grains", wheat: "grains", barley: "grains", sunflower: "grains", sorghum: "grains", canola: "grains", chickpea: "grains", cherry: "orchard", apple: "orchard", hazelnut: "orchard", walnut: "orchard", raspberry: "orchard", haskap: "orchard", blueberry: "orchard" };

/** Turns the register into the simple profile the rotation engine uses (largest plot sets the system). */
export function profileFromRegister(r: FarmRegister): FarmProfile {
  const total = r.plots.reduce((s, p) => s + (p.areaHa || 0), 0) || 1;
  const main = [...r.plots].sort((a, b) => b.areaHa - a.areaHa)[0];
  const sp = speciesById(main?.crop);
  const system: FarmSystem = SYSTEM_OF[main?.crop ?? ""] ?? (main?.crop === "alfalfa" || main?.crop === "pasture" ? "forage" : sp?.group === "Vegetables" || main?.crop === "strawberry" ? "vegetables" : "orchard");
  const water = r.water.shortMonths.length >= 3 ? "low" : r.water.shortMonths.length === 0 ? "high" : "medium";
  return { system, areaHa: +total.toFixed(1), irrigation: main?.irrigation ?? "furrow", water, notes: r.notes };
}

/** Compact text summary for the SI. */
export function registerSummary(r: FarmRegister) {
  return {
    farm: r.farmName || "Unnamed farm",
    plots: r.plots.map((p) => ({ name: p.name, ha: p.areaHa, crop: speciesById(p.crop)?.name ?? p.crop, planted: p.plantedYear, irrigation: p.irrigation, yieldTHa: p.yieldTHa, lastYear: p.history })),
    water: r.water,
    soilTest: r.soilTest,
    economy: r.economy,
    livestock: r.livestock,
    interests: r.interests,
    notes: r.notes,
  };
}

/** Area (ha) and perimeter (m) of a [lon, lat] polygon (local planar approximation, fine for a farm). */
export function polygonStats(pts: [number, number][]) {
  if (pts.length < 3) return { ha: 0, perimeterM: 0, center: pts[0] ?? null };
  const lat0 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110540;
  const xy = pts.map(([lo, la]) => [lo * kx, la * ky]);
  let a = 0, per = 0, cx = 0, cy = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length];
    const cr = x1 * y2 - x2 * y1;
    a += cr;
    cx += (x1 + x2) * cr;
    cy += (y1 + y2) * cr;
    per += Math.hypot(x2 - x1, y2 - y1);
  }
  a /= 2;
  const center: [number, number] = a ? [cx / (6 * a) / kx, cy / (6 * a) / ky] : pts[0];
  return { ha: +(Math.abs(a) / 10000).toFixed(2), perimeterM: Math.round(per), center };
}
