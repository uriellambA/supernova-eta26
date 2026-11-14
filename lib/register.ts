import { SITE } from "@/config/site";
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

export const emptyRegister = (): FarmRegister => ({
  farmName: "",
  producer: "",
  lat: SITE.fields[0].lat,
  lon: SITE.fields[0].lon,
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

const SYSTEM_OF: Record<string, FarmSystem> = { cherry: "orchard", apple: "orchard", hazelnut: "orchard", walnut: "orchard", raspberry: "orchard", haskap: "orchard", blueberry: "orchard" };

/** Turns the register into the simple profile the rotation engine uses (largest plot sets the system). */
export function profileFromRegister(r: FarmRegister): FarmProfile {
  const total = r.plots.reduce((s, p) => s + (p.areaHa || 0), 0) || 1;
  const main = [...r.plots].sort((a, b) => b.areaHa - a.areaHa)[0];
  const sp = speciesById(main?.crop);
  const system: FarmSystem = SYSTEM_OF[main?.crop ?? ""] ?? (main?.crop === "alfalfa" || main?.crop === "pasture" ? "forage" : sp?.group === "Vegetables" || main?.crop === "strawberry" ? "vegetables" : "orchard");
  const water = r.water.shortMonths.length >= 3 ? "low" : r.water.shortMonths.length === 0 ? "high" : "medium";
  return { system, areaHa: +total.toFixed(1), irrigation: main?.irrigation ?? "furrow", water, notes: r.notes };
}

/** Compact text summary for the AI. */
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
