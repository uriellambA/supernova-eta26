// Growwy's action plan: what to do, how to divide the field, materials and prices, calendar and numbers.
// Built from the rotation model, the species ranking and the farm profile. All prices are references (config/materials.ts).
import { cropById } from "@/config/crops";
import { ADVICE_CONTACTS, PRICE, SEED } from "@/config/materials";
import { speciesById } from "@/config/species";
import { SEASONS } from "./agro";
import type { Hazard } from "./contingency";
import { yearPlan } from "./seasons";
import type { SpeciesFit } from "./suitability";
import { effectiveness, type Effectiveness } from "./effectiveness";
import type { AdvisorResult, FarmProfile, FarmRegister, IndicadoresNasa, Salinity, SiteConfig, SoilResumen, StrategyResult } from "./types";

export type PlanPlot = {
  id: string;
  name: string;
  ha: number;
  kind: "main" | "trial" | "hedge";
  color: string;
  what: string; // crops / use
  months: { inField: number[]; harvest: number[]; sow: number[] }; // for the calendar (1..12)
};
export type PlanItem = { category: string; item: string; qty: number; unit: string; unitUsd: number; totalUsd: number; when: string };
export type PlanStep = { when: string; what: string };
export type CashYear = { year: number; flow: number; cumulative: number };

export type ActionPlan = {
  createdAt: string;
  farmName: string;
  place: string;
  zone: "patagonia" | "pampa";
  areaHa: number;
  system: string;
  irrigation: string;
  rotation: { name: string; score: number; currentName: string; currentScore: number; idea: string; benefits: string[] };
  answer?: string;
  summary: string;
  plots: PlanPlot[];
  hedgeM: number; // windbreak length (m), 0 if none
  steps: PlanStep[];
  seasons: { name: string; range: string; focus: string; tasks: string[] }[];
  materials: PlanItem[];
  totals: { investment: number; yearlyCost: number; trialRevenue: number; trialMargin: number; laborDays: number };
  cash: CashYear[];
  trials: { name: string; ha: number; yearsToHarvest: number; revenue: number; margin: number; payback: number | null; why: string }[];
  risks: { name: string; level: string; prepare: string }[];
  check: string[];
  contacts: string[];
  conversation: { q: string; a: string }[];
  /** how effective the recommended combination will be, and why */
  effectiveness?: Effectiveness;
};

const r2 = (x: number) => Math.round(x * 100) / 100;
const round05 = (x: number) => Math.max(0.05, Math.round(x * 20) / 20);
const COLORS = { main: ["#5f8a3a", "#7aa64a", "#94b85e", "#4f7a32"], trial: ["#c4552f", "#d9a441"], hedge: "#3c5d24" };
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthsOf = (kc: number[]) => kc.map((k, i) => (k > 0 ? i + 1 : 0)).filter(Boolean);

export function buildPlan(o: {
  farm: FarmProfile;
  site: SiteConfig;
  place: string;
  register: FarmRegister | null;
  results: StrategyResult[];
  fits: SpeciesFit[];
  advice: AdvisorResult;
  soil: SoilResumen | null;
  sal: Salinity | null;
  risks: Hazard[];
  conversation: { q: string; a: string }[];
  climate?: IndicadoresNasa | null;
}): ActionPlan {
  const { farm, site, advice } = o;
  const zone = site.zone === "pampa" ? "pampa" : "patagonia";
  const sorted = [...o.results].sort((a, b) => b.score - a.score);
  const best = o.results.find((r) => r.strategy.id === advice.best) ?? sorted[0];
  const cur = o.results.find((r) => r.strategy.current) ?? best;
  const A = Math.max(0.1, farm.areaHa);

  // ---------- 1. How to divide the field ----------
  const plots: PlanPlot[] = [];
  const side = Math.sqrt(A * 10000); // metres, as if the field were square
  const hedgeM = zone === "patagonia" ? Math.round(side) : 0; // windbreak on the west side (prevailing wind)
  const hedgeHa = hedgeM ? r2((hedgeM * 4) / 10000) : 0;

  const picked = (advice.newCrops?.map((n) => o.fits.find((f) => f.species.id === n.id)).filter(Boolean) as SpeciesFit[] | undefined) ?? [];
  const trialsFits = (picked.length ? picked : o.fits.filter((f) => f.species.status === "new" && f.viability >= 55)).slice(0, 2);
  const trialHa = (f: SpeciesFit) => (f.species.greenhouse ? 0.05 : round05(Math.min(1, Math.max(0.1, A * 0.1))));
  let used = hedgeHa;
  trialsFits.forEach((f, i) => {
    const ha = Math.min(trialHa(f), Math.max(0.05, (A - used) * 0.4));
    used += ha;
    plots.push({
      id: `t${i}`, name: `Trial: ${f.species.name}`, ha: r2(ha), kind: "trial", color: COLORS.trial[i % 2],
      what: `${f.species.name}${f.species.greenhouse ? " (tunnel)" : ""} · ${f.species.role}`,
      months: { inField: f.species.annual ? f.species.harvest : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], harvest: f.species.harvest, sow: f.species.greenhouse ? [3, 4] : f.species.annual ? [10, 11] : [9] },
    });
  });
  const mainHa = Math.max(0.05, A - used);
  const years = best.strategy.years;
  const n = best.strategy.system === "orchard" ? 1 : years.length;
  years.slice(0, n).forEach((y, i) => {
    const main = cropById(y.main)!;
    const win = cropById(y.winter);
    const alley = cropById(best.strategy.alley);
    const cover = win && win.id !== main.id ? win : alley;
    plots.push({
      id: `m${i}`,
      name: n > 1 ? `Plot ${String.fromCharCode(65 + i)} (rotation year ${i + 1})` : best.strategy.system === "orchard" ? "Orchard" : "Main field",
      ha: r2(mainHa / n), kind: "main", color: COLORS.main[i % COLORS.main.length],
      what: `${main.name}${cover ? ` + ${cover.name.toLowerCase()}` : ""}`,
      months: { inField: monthsOf(main.kc), harvest: monthsOf(main.kc).slice(-2), sow: cover ? [3, 4] : [] },
    });
  });
  if (hedgeM) plots.push({ id: "hedge", name: "Windbreak (west side)", ha: hedgeHa, kind: "hedge", color: COLORS.hedge, what: `${hedgeM} m of native shrubs or poplars, double row`, months: { inField: [], harvest: [], sow: [5, 6] } });

  // ---------- 2. Materials and prices ----------
  const items: PlanItem[] = [];
  const add = (category: string, item: string, qty: number, unit: string, unitUsd: number, when: string) => {
    if (qty <= 0 || unitUsd <= 0) return;
    const q = qty >= 10 ? Math.round(qty) : r2(qty);
    items.push({ category, item, qty: q, unit, unitUsd, totalUsd: Math.round(q * unitUsd), when });
  };
  // seeds for the main rotation (each plot sows its own crops every year)
  plots.filter((p) => p.kind === "main").forEach((p, i) => {
    const y = years[i] ?? years[0];
    const ids = [y.main, y.winter !== y.main ? y.winter : null, best.strategy.alley].filter(Boolean) as string[];
    for (const id of new Set(ids)) {
      const s = SEED[id];
      if (!s || !s.kgHa) continue;
      const ha = id === best.strategy.alley ? p.ha * 0.6 : p.ha; // alleys ≈ 60% of an orchard floor
      add("Seeds", `${s.label} · ${p.name}`, s.kgHa * ha, "kg", s.usdKg, id === y.winter || id === best.strategy.alley ? "Mar–Apr" : "Sep–Nov");
      if (s.extra) add("Seeds", `${s.extra.label} · ${p.name}`, ha, "ha", s.extra.usd, "At sowing");
    }
  });
  // trials: plants, installation and drip
  for (const p of plots.filter((x) => x.kind === "trial")) {
    const f = trialsFits[Number(p.id.slice(1))];
    const e = f.species.econ;
    add("New crops", `Plants and installation · ${f.species.name}`, p.ha, "ha", e.setupUsdHa, f.species.greenhouse ? "Mar–Apr" : "Sep");
    add("New crops", `Yearly inputs and care · ${f.species.name}`, p.ha, "ha", e.costUsdHa, "Every year");
    if (zone === "patagonia" && farm.irrigation !== "drip" && !f.species.greenhouse) {
      add("Irrigation", `Drip tape · ${f.species.name}`, PRICE.dripTapeMHa * p.ha, "m", PRICE.dripTapeUsdM, "Before planting");
      add("Irrigation", `Filter, valves and main line · ${f.species.name}`, 1, "kit", PRICE.dripHeadUsd, "Before planting");
    }
  }
  // soil
  if (o.soil && o.soil.organicMatter < 2.5) add("Soil", "Compost or well-rotted manure (5 t/ha on trials, 2 t/ha on the main field)", 5 * (A - mainHa - hedgeHa) + 2 * mainHa, "t", PRICE.compostUsdT, "Autumn");
  if (o.sal && o.sal.ece > 2) add("Soil", "Agricultural gypsum against salinity (2 t/ha where salty)", 2 * A * 0.5, "t", PRICE.gypsumUsdT, "Autumn, before irrigating");
  if (o.soil && o.soil.ph < 5.6) add("Soil", "Agricultural lime (acid soil)", 1.5 * A, "t", PRICE.limeUsdT, "Autumn");
  add("Soil", "Soil lab test, one per plot", plots.filter((p) => p.kind !== "hedge").length, "test", PRICE.soilTestUsd, "Now, before changing anything");
  if (hedgeM) add("Windbreak", "Native shrubs (calafate) or poplar cuttings, double row", hedgeM * PRICE.windbreakPlantsM, "plants", PRICE.windbreakPlantUsd, "May–Jun");

  // ---------- 3. Numbers ----------
  const once = items.filter((i) => i.when !== "Every year" && i.category !== "Seeds");
  const investment = once.reduce((a, i) => a + i.totalUsd, 0);
  const yearlyCost = items.filter((i) => i.when === "Every year" || i.category === "Seeds").reduce((a, i) => a + i.totalUsd, 0);
  const trials = plots.filter((p) => p.kind === "trial").map((p) => {
    const f = trialsFits[Number(p.id.slice(1))];
    const e = f.species.econ;
    const revenue = Math.round(e.yieldTHa * 1000 * e.priceUsdKg * p.ha);
    const margin = Math.round(revenue - e.costUsdHa * p.ha);
    const setup = e.setupUsdHa * p.ha;
    return { name: f.species.name, ha: p.ha, yearsToHarvest: f.species.yearsToHarvest, revenue, margin, payback: margin > 0 ? Math.round((setup / margin + f.species.yearsToHarvest - 1) * 10) / 10 : null, why: advice.newCrops?.find((n) => n.id === f.species.id)?.why ?? f.species.why };
  });
  const laborDays = Math.round(trials.reduce((a, t) => a + (speciesById(trialsFits.find((f) => f.species.name === t.name)!.species.id)?.laborDaysHa ?? 0) * t.ha, 0));
  const cash: CashYear[] = [];
  let cum = 0;
  for (let y = 0; y <= 6; y++) {
    let flow = y === 0 ? -investment : 0;
    for (const t of trials) {
      if (y === 0) continue;
      flow += y >= t.yearsToHarvest ? t.margin : -Math.round((t.revenue - t.margin) * 0.6); // ramp-up years: care without harvest
    }
    if (y > 0) flow -= items.filter((i) => i.category === "Seeds").reduce((a, i) => a + i.totalUsd, 0);
    cum += flow;
    cash.push({ year: y, flow: Math.round(flow), cumulative: Math.round(cum) });
  }

  // ---------- 4. What to do, step by step ----------
  const sp = yearPlan(best, o.fits, zone);
  const steps: PlanStep[] = [
    { when: "This month", what: `Take a soil sample of each plot and send it to a lab (${plots.filter((p) => p.kind !== "hedge").length} tests).` },
    { when: "This month", what: `Mark the ${plots.length} plots on the field as shown in the map (section 2).` },
  ];
  if (best.strategy.id !== cur.strategy.id) steps.push({ when: "Next season", what: `Switch from "${cur.strategy.name}" to "${best.strategy.name}": ${best.strategy.idea}` });
  for (const t of plots.filter((p) => p.kind === "trial")) steps.push({ when: t.months.sow.map((m) => MONTH[m - 1]).join("–"), what: `Set up the trial of ${t.name.replace("Trial: ", "")} on ${t.ha} ha${zone === "patagonia" && !t.what.includes("(tunnel)") ? " with drip irrigation" : ""}.` });
  if (hedgeM) steps.push({ when: "May–Jun", what: `Plant the ${hedgeM} m windbreak on the west side, against the prevailing wind.` });
  steps.push({ when: "Mar–Apr", what: "Sow the winter cover right after harvest so the soil is never bare." });
  steps.push({ when: "Every season", what: "Open Growvia: check the forecast, frost and the plan, and note your real yields and costs." });

  return {
    createdAt: new Date().toISOString(),
    farmName: o.register?.farmName || o.place,
    place: `${site.name}, ${site.region}`,
    zone, areaHa: A, system: farm.system, irrigation: farm.irrigation,
    rotation: { name: best.strategy.name, score: best.score, currentName: cur.strategy.name, currentScore: cur.score, idea: best.strategy.idea, benefits: best.benefits.slice(0, 4) },
    answer: o.conversation.length ? o.conversation[o.conversation.length - 1].a : advice.answer,
    summary: advice.summary,
    plots, hedgeM, steps,
    seasons: SEASONS.map((s) => ({ name: s.name, range: s.range, focus: advice.seasons?.[s.id] ?? sp[s.id].focus, tasks: sp[s.id].tasks.slice(0, 3) })),
    materials: items,
    totals: { investment, yearlyCost, trialRevenue: trials.reduce((a, t) => a + t.revenue, 0), trialMargin: trials.reduce((a, t) => a + t.margin, 0), laborDays },
    cash, trials,
    risks: o.risks.filter((h) => h.level !== "good").slice(0, 4).map((h) => ({ name: h.name, level: h.level, prepare: h.before[0] ?? "" })),
    check: advice.askExpert,
    contacts: ADVICE_CONTACTS[zone],
    conversation: o.conversation,
    effectiveness: effectiveness(best, cur, { soil: o.soil, climate: o.climate ?? null, sal: o.sal, register: o.register, simulated: !!(o.climate?.simulado || o.soil?.simulado) }),
  };
}

// ---------- hand-off to the printable page ----------
const KEY = "growvia-plan";
export function savePlan(p: ActionPlan) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
    localStorage.setItem(KEY, JSON.stringify(p)); // also survives opening it in another tab later
  } catch {
    /* storage blocked */
  }
}
export function loadPlan(): ActionPlan | null {
  try {
    const t = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
    return t ? (JSON.parse(t) as ActionPlan) : null;
  } catch {
    return null;
  }
}
export const usd = (n: number) => `USD ${Math.round(n).toLocaleString("en-US")}`;
export { MONTH };
