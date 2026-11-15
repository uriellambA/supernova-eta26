import { SITES } from "@/config/sites";
import { shortDate } from "./agro";
import { yearPlan } from "./seasons";
import type { SpeciesFit } from "./suitability";
import type { VisualId, SiteConfig, AdvisorResult, ClimaResumen, EnsoResumen, FarmProfile, FarmRegister, IndicadoresNasa, NdviResumen, Priorities, Salinity, SoilHealth, SoilResumen, StrategyResult } from "./types";
import { registerSummary } from "./register";

export type AdvisorContext = {
  language?: "English" | "Spanish (Argentina)";
  site?: { name: string; zone: string; description: string };
  question?: string;
  /** earlier turns of the conversation with Growwy (oldest first) */
  history?: { q: string; a: string }[];
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

export type ContextExtras = { fits: SpeciesFit[]; health: SoilHealth; sal: Salinity; enso: EnsoResumen | null; register: FarmRegister | null; site?: SiteConfig };

export function buildContext(
  fieldName: string, farm: FarmProfile, pri: Priorities, c: IndicadoresNasa, soil: SoilResumen,
  fc: ClimaResumen | null, ndvi: NdviResumen | null, res: StrategyResult[], x: ContextExtras,
): AdvisorContext {
  const next = fc?.dias.filter((d) => !d.pasado).slice(0, 7) ?? [];
  const coldest = next.length ? next.reduce((a, b) => (b.tmin < a.tmin ? b : a)) : null;
  return {
    place: `${fieldName}, ${(x.site ?? SITES[0]).name} (${(x.site ?? SITES[0]).region})`,
    site: { name: (x.site ?? SITES[0]).name, zone: (x.site ?? SITES[0]).zone, description: (x.site ?? SITES[0]).description },
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

/** Rule-based explanation (offline or without an SI key). */
/** Charts that fit a question (rules-based fallback of the SI's choice). English + Spanish keywords. */
export function pickVisuals(q?: string): VisualId[] {
  const t = (q ?? "").toLowerCase();
  if (!t.trim()) return ["rotations", "seasons"] as VisualId[];
  const out: VisualId[] = [];
  const has = (re: RegExp) => re.test(t);
  if (has(/agua|riego|seca|sequ[ií]a|lluvia|water|irrigat|drought|rain/)) out.push("water");
  if (has(/helad|fr[ií]o|frost|cold/)) out.push("frost");
  if (has(/clima|temperatur|climate|weather/)) out.push("climate");
  if (has(/precio|costo|cuesta|plata|ganan|ingreso|inversi|rentab|margen|dinero|price|cost|money|income|profit|invest|margin/)) out.push("economy");
  if (has(/plant|cultiv|sembr|especie|nuevo|crop|grow|sow|species/)) out.push("crops");
  if (has(/rotaci|rotation|compar|mejor|best/)) out.push("rotations");
  if (has(/estaci|temporada|verano|invierno|oto[ñn]o|primavera|season|summer|winter|autumn|spring|calendar|mes/)) out.push("seasons");
  if (has(/distribu|dividir|repart|parcela|lote|hect[áa]rea|superficie|divide|plot|layout|area/)) out.push("distribution");
  return (out.length ? out : (["rotations"] as VisualId[])).slice(0, 2);
}

/** Rules-based answer to a free question: picks the season mentioned and lists what fits it. */
function localAnswer(q: string, ctx: AdvisorContext, res?: StrategyResult[], fits?: SpeciesFit[]) {
  const t = q.toLowerCase();
  const id = /verano|summer/.test(t) ? "summer" : /oto[ñn]o|autumn|fall/.test(t) ? "autumn" : /invierno|winter/.test(t) ? "winter" : /primavera|spring/.test(t) ? "spring" : null;
  const plan = yearPlan(res ? [...res].sort((a, b) => b.score - a.score)[0] : undefined, fits ?? [], ctx.site?.zone === "pampa" ? "pampa" : "patagonia");
  const months: Record<string, number[]> = { spring: [9, 10, 11], summer: [12, 1, 2], autumn: [3, 4, 5], winter: [6, 7, 8] };
  const names: Record<string, string> = { spring: "spring", summer: "summer", autumn: "autumn", winter: "winter" };
  const best = [...ctx.strategies].sort((a, b) => b.score - a.score)[0];
  if (id) {
    const crops = (fits ?? []).filter((f) => f.viability >= 50 && f.species.harvest.some((m) => months[id].includes(m))).slice(0, 4).map((f) => f.species.name);
    return `For ${names[id]}: ${plan[id as keyof typeof plan].focus}. ${crops.length ? `Crops that fit your field and give a harvest then: ${crops.join(", ")}. ` : ""}Keep the rotation "${best?.name}": ${plan[id as keyof typeof plan].tasks[0]}.`;
  }
  return `Based on your field: the rotation that fits your priorities best is "${best?.name}" (${best?.score}/100). ${ctx.newCrops[0] ? `A new crop worth a small trial: ${ctx.newCrops[0].name}.` : ""}`;
}

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
    answer: ctx.question?.trim() ? localAnswer(ctx.question, ctx, res, fits) : undefined,
    visuals: pickVisuals(ctx.question),
    newCrops: ctx.newCrops.filter((n) => n.viability >= 55).slice(0, 3).map((n) => ({
      id: n.id, why: `${n.viability}/100 fit; harvest in ${n.harvestMonths.map((m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]).join("/")}${n.limits[0] ? `. Watch: ${n.limits[0]}` : ""}.`,
    })),
    seasons: (() => {
      const plan = yearPlan(res ? [...res].sort((a, b) => b.score - a.score)[0] : undefined, fits ?? [], ctx.site?.zone === "pampa" ? "pampa" : "patagonia");
      const line = (k: keyof typeof plan) => `${plan[k].focus}.${plan[k].harvest.length ? ` Harvest: ${plan[k].harvest.join(", ")}.` : ""}`;
      return { spring: line("spring"), summer: line("summer"), autumn: line("autumn"), winter: line("winter") };
    })(),
  };
}
