// How effective will the recommended combination be, and why: before → after on each aspect, when each
// improvement shows up, and how reliable the estimate is given the data we have for this farm.
import type { FarmRegister, IndicadoresNasa, Salinity, SoilResumen, StrategyResult } from "./types";

export type EffAspect = { id: string; name: string; before: string; after: string; gain: number; why: string; when: string };
export type Effectiveness = {
  score: number; // 0..100
  level: "high" | "medium" | "low";
  same: boolean; // the current rotation is already the best
  improved: number;
  aspects: EffAspect[];
  confidence: { level: "high" | "medium" | "low"; score: number; based: string[]; toImprove: string[] };
  watch: string[]; // what could make it less effective
};

const clamp = (x: number, a = -1, b = 1) => Math.max(a, Math.min(b, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function effectiveness(best: StrategyResult, cur: StrategyResult, ctx: {
  soil: SoilResumen | null;
  climate: IndicadoresNasa | null;
  sal: Salinity | null;
  register: FarmRegister | null;
  simulated?: boolean;
}): Effectiveness {
  const b = best.metrics, c = cur.metrics;
  const same = best.strategy.id === cur.strategy.id;
  const rel = (better: number, base: number, floor: number) => clamp(better / Math.max(Math.abs(base), floor));

  const aspects: EffAspect[] = [
    { id: "erosion", name: "Soil lost to wind and water", before: pct(c.erosion), after: pct(b.erosion), gain: rel(c.erosion - b.erosion, c.erosion, 0.05),
      why: b.bareMonths < c.bareMonths ? `The soil stays covered ${c.bareMonths} → ${b.bareMonths} bare months a year, so wind and rain carry less of it away.` : "Soil cover is similar to today.", when: "From the first winter" },
    { id: "water", name: "Water use", before: `${c.waterMm} mm/yr`, after: `${b.waterMm} mm/yr`, gain: rel(c.waterMm - b.waterMm, c.waterMm, 100),
      why: b.waterMm <= c.waterMm ? "Covers and residues keep moisture in the soil and the crops chosen need less irrigation." : `Needs about ${b.waterMm - c.waterMm} mm more per year: check that the canal turns can supply it.`, when: "From the first season" },
    { id: "nitrogen", name: "Nitrogen from legumes", before: `${c.nitrogen} kg/ha`, after: `${b.nitrogen} kg/ha`, gain: clamp((b.nitrogen - c.nitrogen) / 100),
      why: b.nitrogen > c.nitrogen ? "Legumes fix nitrogen from the air: less fertilizer to buy." : "No legumes added: fertilization stays as today.", when: "After the first legume season" },
    { id: "om", name: "Organic matter", before: `${Math.round(c.organicMatter * 100)}/100`, after: `${Math.round(b.organicMatter * 100)}/100`, gain: rel(b.organicMatter - c.organicMatter, c.organicMatter, 0.1),
      why: "Roots and residues feed soil life and help the soil hold water and nutrients.", when: "Builds up over 3–5 years" },
    { id: "pests", name: "Pest and disease break", before: `${Math.round(c.pestBreak * 100)}/100`, after: `${Math.round(b.pestBreak * 100)}/100`, gain: rel(b.pestBreak - c.pestBreak, c.pestBreak, 0.1),
      why: "Changing plant families leaves pests and diseases without their host.", when: "2–3 seasons" },
    { id: "income", name: "Income", before: `${Math.round(c.income * 100)}/100`, after: `${Math.round(b.income * 100)}/100`, gain: rel(b.income - c.income, c.income, 0.1),
      why: b.income >= c.income ? "Adds or keeps crops with good prices and more than one market." : "Some years earn less: the gain is in the soil and the water.", when: "Depends on the market; new crops take 1–3 years" },
  ];

  // Effectiveness: how well it fits this farm (score) and how much it improves on today (mean gain)
  const meanGain = aspects.reduce((a, x) => a + x.gain, 0) / aspects.length;
  const score = Math.round(100 * clamp(0.55 * (best.score / 100) + 0.45 * (0.5 + 0.5 * meanGain), 0, 1));

  // Confidence: depends on how much of the data is measured on this farm
  let conf = 100;
  const based = [`${ctx.climate?.calendario?.anios?.length ?? 20} years of daily NASA climate for this exact point`, "Rotation model with water, soil, nitrogen, pests, income and work"];
  const toImprove: string[] = [];
  if (ctx.simulated) { conf -= 25; toImprove.push("Some data are sample values: connect to the internet to use the real records."); }
  if (ctx.soil?.source === "soil-map") based.push("250 m soil map (SoilGrids) for your farm");
  else { conf -= 15; toImprove.push("No soil map for this point: a lab soil test would make it much more precise."); }
  if (ctx.sal?.measured || ctx.register?.soilTest?.ph != null) based.push("Your own soil test");
  else { conf -= 10; toImprove.push("Add a soil test (pH, salinity, organic matter) in the farm register."); }
  if (ctx.register?.plots?.length) based.push("Your plots and their history (farm register)");
  else { conf -= 10; toImprove.push("Add your plots and what grew in each season."); }
  if ((ctx.climate?.calendario?.anios?.length ?? 20) < 15) { conf -= 10; toImprove.push("The climate record is shorter than usual for this point."); }
  conf = Math.max(30, conf);

  return {
    score,
    level: score >= 70 ? "high" : score >= 50 ? "medium" : "low",
    same,
    improved: aspects.filter((a) => a.gain > 0.02).length,
    aspects,
    confidence: { level: conf >= 75 ? "high" : conf >= 55 ? "medium" : "low", score: conf, based, toImprove },
    watch: best.risks.slice(0, 3),
  };
}
