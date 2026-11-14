import { SITE } from "@/config/site";
import { shortDate } from "./agro";
import type { AdvisorResult, ClimaResumen, FarmProfile, IndicadoresNasa, NdviResumen, Priorities, SoilResumen, StrategyResult } from "./types";

export type AdvisorContext = {
  place: string;
  farm: FarmProfile;
  priorities: Priorities;
  climate: Record<string, unknown>;
  soil: Record<string, unknown>;
  forecast: Record<string, unknown> | null;
  strategies: { id: string; name: string; current: boolean; score: number; metrics: Record<string, number>; benefits: string[]; risks: string[]; gaps: string[] }[];
};

export function buildContext(
  fieldName: string, farm: FarmProfile, pri: Priorities, c: IndicadoresNasa, soil: SoilResumen,
  fc: ClimaResumen | null, ndvi: NdviResumen | null, res: StrategyResult[],
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
      ndviLatest: ndvi?.ultimo?.ndvi ?? null,
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
  };
}

/** Rule-based explanation (offline or without an AI key). */
export function localAdvice(ctx: AdvisorContext): AdvisorResult {
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
  };
}
