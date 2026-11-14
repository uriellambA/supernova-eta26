import { cropById } from "@/config/crops";
import { STRATEGIES } from "@/config/rotations";
import { SITES } from "@/config/sites";
import { probHeladaVentana, shortDate } from "./agro";
import { EFFICIENCY, seasonNeed } from "./riego";
import type { SiteConfig, Crop, FarmProfile, IndicadoresNasa, Nivel, NieveResumen, Priorities, SoilResumen, Strategy, StrategyResult } from "./types";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
export const levelOf = (s: number): Nivel => (s >= 55 ? "good" : s >= 40 ? "watch" : "alert");

const WATER_SUPPLY: Record<FarmProfile["water"], number> = { low: 0.7, medium: 1, high: 1.25 };

export type SiteData = { climate: IndicadoresNasa; soil: SoilResumen; snow: NieveResumen | null; cfg?: SiteConfig };

/** Net irrigation need of a crop on this field (mm/season): climate-based when available. */
export function cropWater(c: Crop, climate: IndicadoresNasa) {
  const n = seasonNeed(c.kc, climate.mensual);
  return n > 0 ? n : c.water;
}

function evaluate(s: Strategy, site: SiteData) {
  const { climate, soil } = site;
  const years = s.years.length;
  const mains = s.years.map((y) => cropById(y.main)!).filter(Boolean);
  const winters = s.years.map((y) => cropById(y.winter));
  const alley = s.alley === undefined ? undefined : cropById(s.alley);
  const isOrchard = s.system === "orchard";

  // Water (mm/yr, net): main crop + covers (winter covers use little irrigation; alleys add a share)
  const waterMain = avg(mains.map((c) => cropWater(c, climate)));
  const waterWinter = isOrchard ? 0 : avg(winters.map((c) => (c && c.id !== s.years[0].main && c.kind === "cover" ? c.water * 0.25 : 0)));
  const waterAlley = isOrchard && alley ? cropWater(alley, climate) * 0.35 : 0;
  const waterMm = Math.round(waterMain + waterWinter + waterAlley);

  // Bare soil months per year
  let bare = 0;
  if (isOrchard) bare = alley ? 0.5 : 0.6 * 12; // ~60% of orchard floor is alley
  else
    s.years.forEach((y) => {
      const m = cropById(y.main)!;
      const perennialCover = m.kind === "forage" || m.kind === "cover";
      if (!perennialCover && !y.winter) bare += 6;
      else if (!perennialCover) bare += 1.5; // gaps around harvest/planting
    });
  const bareMonths = +(isOrchard ? bare : bare / years).toFixed(1);

  // Wind erosion risk: bare time × spring wind × sandy, low-OM soil
  const wind = clamp(climate.vientoPrimavera / 7);
  const soilFactor = clamp(0.4 + soil.sand / 100 - soil.organicMatter / 8);
  const erosion = clamp((bareMonths / 12) * (0.4 + 0.6 * wind) * (0.5 + soilFactor));

  // Nitrogen added by legumes (kg/ha/yr)
  const slots = s.years.flatMap((y) => [y.main, y.winter !== y.main ? y.winter : null]).map(cropById);
  let nitrogen = slots.reduce((acc, c) => acc + (c?.nFix ?? 0) * (c?.kind === "cover" ? 0.6 : 1), 0) / years;
  if (isOrchard && alley) nitrogen = alley.nFix * 0.6;

  // Organic matter contribution and cover
  const omSlots = [...mains.map((c) => c.organicMatter), ...winters.map((c) => c?.organicMatter ?? 0)];
  if (isOrchard) omSlots.push(alley?.organicMatter ?? 0, alley?.organicMatter ?? 0);
  const organicMatter = clamp(avg(omSlots) + (isOrchard ? 0 : 0.05));

  // Pest / disease break: distinct families, penalize same family in consecutive years
  const fams = mains.map((c) => c.family);
  let repeats = 0;
  for (let i = 0; i < fams.length; i++) if (fams.length > 1 && fams[i] === fams[(i + 1) % fams.length]) repeats++;
  const distinct = new Set([...fams, ...winters.filter(Boolean).map((c) => c!.family), ...(alley ? [alley.family] : [])]).size;
  const pestBreak = clamp((distinct - 1) / 3 - repeats / Math.max(2, fams.length) * 0.5 + (isOrchard ? 0.1 : 0));

  const forage = clamp(avg([...mains.map((c) => c.forage), ...winters.map((c) => c?.forage ?? 0)]));
  // Same annual crop every year with nothing in between: yields fall over time (diseases, weeds, soil)
  const mono = s.years.length === 1 && mains[0]?.kind === "annual" && !s.years[0].winter;
  const income = clamp(avg(mains.map((c) => c.income)) * (mono ? 0.82 : 1));
  const labor = clamp(avg(mains.map((c) => c.labor)) + (winters.some((w) => w && w.kind === "cover") ? 0.05 : 0));

  return { mains, alley, metrics: { waterMm, bareMonths, erosion, nitrogen: Math.round(nitrogen), organicMatter, pestBreak, forage, income, labor } };
}

export function compareStrategies(site: SiteData, farm: FarmProfile, pri: Priorities, extra: Strategy[] = []): StrategyResult[] {
  const list = [...STRATEGIES.filter((s) => s.system === farm.system), ...extra.filter((s) => s.system === farm.system && s.years.length && s.years.every((y) => cropById(y.main)))];
  const evals = list.map((s) => ({ s, ...evaluate(s, site) }));
  const current = evals.find((e) => e.s.current) ?? evals[0];
  const SITE = site.cfg ?? SITES[0];
  const supply = SITE.irrigation.grossSupplyMm * EFFICIENCY[farm.irrigation] * WATER_SUPPLY[farm.water] * (site.snow ? clamp(0.8 + 0.2 * site.snow.indice, 0.7, 1.05) : 1);
  const { climate, soil } = site;

  // Absolute criterion scores (0..1)
  const absScores = evals.map(({ metrics: m }) => ({
    water: clamp((900 - m.waterMm) / 700),
    income: m.income,
    soil: clamp(0.4 * (1 - m.erosion) + 0.3 * m.organicMatter + 0.15 * clamp(m.nitrogen / 100) + 0.15 * m.pestBreak),
    forage: m.forage,
    labor: 1 - m.labor,
  }));
  // Blend with a relative score (how each option ranks among the 4 compared), so differences are visible
  const keys = Object.keys(pri) as (keyof Priorities)[];
  const blended = absScores.map((a) => {
    const out = { ...a };
    for (const k of keys) {
      const vals = absScores.map((x) => x[k]);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      const rel = hi - lo > 0.02 ? (a[k] - lo) / (hi - lo) : 0.6;
      out[k] = 0.5 * a[k] + 0.5 * rel;
    }
    return out;
  });

  const results = evals.map(({ s, mains, metrics: m }, idx) => {
    const scores = absScores[idx];
    const wsum = keys.reduce((a, k) => a + pri[k], 0) || 1;
    let score = keys.reduce((acc, k) => acc + blended[idx][k] * pri[k], 0) / wsum;

    const why: string[] = [];
    const evidence: string[] = [];
    const benefits: string[] = [];
    const risks = [...s.risks];
    if (s.years.length === 1 && cropById(s.years[0].main)?.kind === "annual" && !s.years[0].winter) risks.push("Monoculture: yields usually fall 10–20% after several years of the same crop");
    const gaps = [...s.gaps];

    // Frost fit of each main crop
    for (const c of mains) {
      if (c.minFrostFree > climate.libreHeladas) {
        score *= 0.9;
        risks.unshift(`${c.name} needs ~${c.minFrostFree} frost-free days; your field averages ${climate.libreHeladas}.`);
      }
      if (c.sensitive) {
        const p = probHeladaVentana(climate, c.sensitive.from, c.sensitive.to, c.sensitive.threshold);
        if (p !== null && p >= 0.25) {
          risks.unshift(`Frost ≤ ${c.sensitive.threshold} °C during ${c.name.toLowerCase()} ${c.sensitive.stage} (${shortDate(c.sensitive.from)}–${shortDate(c.sensitive.to)}) in ${pct(p)} of years.`);
          if (p >= 0.5) score *= 0.93;
        }
        if (p !== null) evidence.push(`${c.name} ${c.sensitive.stage} frost risk: ${pct(p)} of the last ${climate.calendario.anios.length} years (climate record).`);
      }
    }
    // Water fit
    if (SITE.zone === "pampa") {
      // rain-fed: waterMm is what rain does not cover in an average year
      if (m.waterMm > 150) {
        score *= 0.95;
        risks.unshift(`Needs ~${m.waterMm} mm/yr more than average rain provides: yields drop in dry years.`);
      }
    } else if (m.waterMm > supply) {
      score *= 0.9;
      risks.unshift(`Uses ~${m.waterMm} mm/yr but your irrigation delivers ~${Math.round(supply)} mm useful water.`);
    }

    // Why / benefits relative to the current rotation
    const c0 = current.metrics;
    if (!s.current) {
      if (m.bareMonths < c0.bareMonths - 0.5) {
        why.push(`Cuts bare-soil time from ${c0.bareMonths} to ${m.bareMonths} months a year, ${SITE.zone === "pampa" ? "when spring storms hit the slopes" : `when spring winds average ${climate.vientoPrimavera} m/s`}.`);
        benefits.push(`${SITE.zone === "pampa" ? "Erosion risk" : "Wind erosion risk"} ${pct(c0.erosion)} → ${pct(m.erosion)}`);
      }
      if (m.nitrogen > c0.nitrogen + 10) benefits.push(`Adds ~${m.nitrogen} kg N/ha/yr from legumes (less fertilizer)`);
      if (m.organicMatter > c0.organicMatter + 0.05) benefits.push("Builds organic matter → better water holding and infiltration");
      if (m.waterMm < c0.waterMm - 20) benefits.push(`Saves ~${c0.waterMm - m.waterMm} mm of water per year (${((c0.waterMm - m.waterMm) * 10).toLocaleString("en-US")} m³/ha)`);
      if (m.waterMm > c0.waterMm + 20) risks.push(`Needs ~${m.waterMm - c0.waterMm} mm/yr more water than today`);
      if (m.pestBreak > c0.pestBreak + 0.1) benefits.push("Breaks pest and disease cycles with more plant families");
      if (m.forage > c0.forage + 0.1) benefits.push("Produces forage for livestock");
      if (m.income > c0.income + 0.05) benefits.push("Adds a higher-value or second income");
      if (m.income < c0.income - 0.1) risks.push("Lower income per hectare in some years");
    } else {
      why.push("This is your existing rotation: the baseline to compare against.");
    }
    why.push(s.idea);
    evidence.push(`Soil: ${soil.texture.toLowerCase()}, ${soil.organicMatter}% organic matter, ${soil.waterHolding} mm water holding (${soil.source === "soil-map" ? "250 m soil map" : "regional reference"}).`);
    evidence.push(`Season: ${climate.libreHeladas} frost-free days, ${climate.lluviaAnual} mm rain vs ${climate.et0Anual} mm evaporation per year.`);
    if (site.snow) evidence.push(`Snowpack feeding the canals: ${pct(site.snow.indice)} of normal.`);
    if (soil.source === "reference") gaps.unshift("No field soil data: using regional reference values. A lab soil test is recommended.");

    const finalScore = Math.round(100 * clamp(score));
    return { strategy: s, score: finalScore, level: levelOf(finalScore), metrics: m, scores, why, evidence, benefits, gaps, risks: [...new Set(risks)] };
  });
  return results;
}
