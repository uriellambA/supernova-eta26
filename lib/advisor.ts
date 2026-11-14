import { SITE } from "@/config/site";
import { shortDate } from "./agro";
import { yearPlan } from "./seasons";
import type { SpeciesFit } from "./suitability";
import type { AdvisorResult, ClimaResumen, EnsoResumen, FarmProfile, FarmRegister, IndicadoresNasa, NdviResumen, Priorities, Salinity, SoilHealth, SoilResumen, StrategyResult } from "./types";
import { registerSummary } from "./register";

export type AdvisorContext = {
  language?: "English" | "Spanish (Argentina)";
  place: string;
  farm: FarmProfile;
  priorities: Priorities;
  climate: Record<string, unknown>;
  soil: Record<string, unknown>;
  forecast: Record<string, unknown> | null;
  strategies: { id: string; name: string; current: boolean; score: number; metrics: Record<string, number>; benefits: string[]; risks: string[]; gaps: string[] }[];
  newCrops: { id: string; name: string; viability: number; agro: number; marginUsdHa: number; harvestMonths: number[]; limits: string[] }[];
  soilHealth: { score: number; salinityDsM: number; salinityMeasured: boolean };
  climateOutlook: string | null;
  register: ReturnType<typeof registerSummary> | null;
};

export type ContextExtras = { fits: SpeciesFit[]; health: SoilHealth; sal: Salinity; enso: EnsoResumen | null; register: FarmRegister | null };

export function buildContext(
  fieldName: string, farm: FarmProfile, pri: Priorities, c: IndicadoresNasa, soil: SoilResumen,
  fc: ClimaResumen | null, ndvi: NdviResumen | null, res: StrategyResult[], x: ContextExtras,
): AdvisorContext {
  const next = fc?.dias.filter((d) => !d.pasado).slice(0, 7) ?? [];
  const coldest = next.length ? next.reduce((a, b) => (b.tmin < a.tmin ? b : a)) : null;
  return {
    place: `${fieldName}, ${SITE.name} (${SITE.region})`,
    farm,
    priorities: pri,
    climate: {
      record: c.periodo.join("–"),
      frostFreeDays: c.libreHeladas,
      lastSpringFrostAvg: shortDate(c.ultimaHeladaMedia),
      lastSpringFrost4of5years: shortDate(c.ultimaHeladaP80),
      frostDaysPerYear: c.diasHeladaAnio,
      rainMmYear: c.lluviaAnual,
      evapotranspirationMmYear: c.et0Anual,
      springWindMs: c.vientoPrimavera,
      tempChange: c.tendencia ? `${c.tendencia.dif > 0 ? "+" : ""}${c.tendencia.dif} °C (recent vs earlier half)` : null,
      rainChange: c.tendenciaLluvia ? `${c.tendenciaLluvia.difPct}%` : null,
      humidityPct: c.humedadRelMedia,
      pressureHpa: c.presionMedia,
      summerUv: c.uvVerano,
      coldestNightAvg: c.minAnual,
      ndviLatest: ndvi?.ultimo?.ndvi ?? null,
      eviLatest: ndvi?.ultimo?.evi ?? null,
      ndviYearAgo: ndvi?.anioAnterior?.ndvi ?? null,
    },
    soil: {
      source: soil.source === "soil-map" ? "250 m soil map" : "regional reference (no field data)",
      texture: soil.texture, sandPct: soil.sand, clayPct: soil.clay, organicMatterPct: soil.organicMatter, ph: soil.ph,
      nitrogenGkg: soil.nitrogen, waterHoldingMm: soil.waterHolding, infiltration: soil.infiltration,
    },
    forecast: coldest ? { coldestNext7Days: `${coldest.tmin} °C on ${coldest.fecha}`, maxGustNext3Days: Math.max(...next.slice(0, 3).map((d) => d.rafagas)), rainNext7DaysMm: +next.reduce((s, d) => s + d.lluvia, 0).toFixed(1) } : null,
    strategies: res.map((r) => ({
      id: r.strategy.id, name: r.strategy.name, current: !!r.strategy.current, score: r.score,
      metrics: { waterMm: r.metrics.waterMm, bareMonths: r.metrics.bareMonths, erosionPct: Math.round(r.metrics.erosion * 100), nitrogenKgHa: r.metrics.nitrogen },
      benefits: r.benefits, risks: r.risks.slice(0, 3), gaps: r.gaps.slice(0, 2),
    })),
    newCrops: x.fits.filter((f) => f.species.status === "new").slice(0, 8).map((f) => ({
      id: f.species.id, name: f.species.name, viability: f.viability, agro: f.agro, marginUsdHa: f.economy.margin, harvestMonths: f.species.harvest, limits: f.limits.slice(0, 2),
    })),
    soilHealth: { score: x.health.score, salinityDsM: x.sal.ece, salinityMeasured: x.sal.measured },
    climateOutlook: x.enso?.current ? `${x.enso.current.phase} (Pacific index ${x.enso.current.anomaly} °C, ${x.enso.current.season} ${x.enso.current.year})` : null,
    register: x.register ? registerSummary(x.register) : null,
  };
}

/** Rule-based explanation (offline or without an AI key). */
export function localAdvice(ctx: AdvisorContext, res?: StrategyResult[], fits?: SpeciesFit[]): AdvisorResult {
  const sorted = [...ctx.strategies].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const cur = ctx.strategies.find((s) => s.current);
  const better = best && cur && best.id !== cur.id;
  return {
    summary: better
      ? `For your priorities, "${best.name}" scores ${best.score} vs ${cur!.score} for your current rotation. ${best.benefits.slice(0, 2).join(". ")}.`
      : `Your current rotation already fits your priorities best (${best?.score}). Small changes like winter covers can still protect the soil.`,
    best: best?.id ?? "",
    notes: sorted.map((s) => ({ id: s.id, text: s.benefits[0] ?? s.risks[0] ?? "" })),
    askExpert: ["Confirm frost dates on your own field (low spots are colder)", "Run a soil test before changing fertilization", "Check local market demand before planting new crops"],
    voice: better
      ? `The best match for your farm is ${best.name}, with ${best.score} points. Your current rotation scores ${cur!.score}.`
      : `Your current rotation is the best match, with ${best?.score} points.`,
    confidence: "medium",
    source: "rules",
    newCrops: ctx.newCrops.filter((n) => n.viability >= 55).slice(0, 3).map((n) => ({
      id: n.id, why: `${n.viability}/100 fit; harvest in ${n.harvestMonths.map((m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]).join("/")}${n.limits[0] ? `. Watch: ${n.limits[0]}` : ""}.`,
    })),
    seasons: (() => {
      const plan = yearPlan(res ? [...res].sort((a, b) => b.score - a.score)[0] : undefined, fits ?? []);
      const line = (k: keyof typeof plan) => `${plan[k].focus}.${plan[k].harvest.length ? ` Harvest: ${plan[k].harvest.join(", ")}.` : ""}`;
      return { spring: line("spring"), summer: line("summer"), autumn: line("autumn"), winter: line("winter") };
    })(),
  };
}
