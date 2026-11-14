import { SPECIES, type Species } from "@/config/species";
import { SITE } from "@/config/site";
import { probHeladaVentana, shortDate } from "./agro";
import { EFFICIENCY } from "./riego";
import type { FarmProfile, IndicadoresNasa, Nivel, Salinity, SoilResumen } from "./types";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lvl = (s: number): Nivel => (s >= 65 ? "good" : s >= 45 ? "watch" : "alert");

export type Factor = { name: string; score: number; note: string };
export type SpeciesFit = {
  species: Species;
  agro: number; // 0..100 agronomic suitability
  economy: { revenue: number; margin: number; paybackYears: number | null; marginPerDay: number };
  viability: number; // 0..100 overall
  level: Nivel;
  factors: Factor[];
  limits: string[]; // the factors that hold it back
  fillsGap: boolean; // harvests outside the cherry/strawberry peak
};

/** Months when today's crops already bring income (cherry + strawberry peak). */
export const BUSY_MONTHS = [12, 1, 2];

export function speciesFit(sp: Species, c: IndicadoresNasa, soil: SoilResumen, sal: Salinity, farm: FarmProfile): SpeciesFit {
  const f: Factor[] = [];
  const indoor = !!sp.greenhouse;

  // Winter cold
  const margin = c.minAnual - sp.minWinter;
  f.push({ name: "Winter cold", score: indoor ? 1 : clamp(0.5 + margin / 8), note: indoor ? "Protected crop" : `Coldest night averages ${c.minAnual} °C; survives ${sp.minWinter} °C` });

  // Spring frost at a sensitive stage
  if (sp.bloom && !indoor) {
    const p = probHeladaVentana(c, sp.bloom.from, sp.bloom.to, sp.bloom.threshold) ?? 0;
    f.push({ name: "Spring frost", score: clamp(1 - p * 1.3), note: `Frost ≤ ${sp.bloom.threshold} °C at ${sp.bloom.stage} (${shortDate(sp.bloom.from)}–${shortDate(sp.bloom.to)}) in ${Math.round(p * 100)}% of years` });
  }
  // Season length and heat
  if (sp.minFrostFree && !indoor) f.push({ name: "Season length", score: clamp(0.4 + (c.libreHeladas - sp.minFrostFree) / 60 + 0.6 * Number(c.libreHeladas >= sp.minFrostFree)), note: `${c.libreHeladas} frost-free days; needs ~${sp.minFrostFree}` });
  if (sp.gdd && !indoor) f.push({ name: "Summer heat", score: clamp(c.gdd10 / sp.gdd), note: `${c.gdd10} degree-days available; needs ~${sp.gdd}` });
  if (sp.chill && !indoor) f.push({ name: "Winter chill", score: clamp(c.horasFrio / sp.chill), note: `${c.horasFrio} chill hours; needs ~${sp.chill}` });

  // Soil: pH and salinity
  const dph = soil.ph < sp.ph[0] ? sp.ph[0] - soil.ph : soil.ph > sp.ph[1] ? soil.ph - sp.ph[1] : 0;
  f.push({ name: "Soil pH", score: indoor ? 1 : clamp(1 - dph / 1.2), note: `Soil pH ${soil.ph}; likes ${sp.ph[0]}–${sp.ph[1]}` });
  const over = Math.max(0, sal.ece - sp.salt);
  f.push({ name: "Salinity", score: indoor ? 1 : clamp(1 - over * 0.15), note: `${sal.measured ? "" : "~"}${sal.ece} dS/m; yield drops above ${sp.salt}` });

  // Water and wind
  const supply = SITE.irrigation.grossSupplyMm * EFFICIENCY[farm.irrigation] * ({ low: 0.7, medium: 1, high: 1.25 } as const)[farm.water];
  f.push({ name: "Water", score: clamp(1.15 - sp.water / supply), note: `Needs ~${sp.water} mm/season; useful supply ~${Math.round(supply)} mm` });
  f.push({ name: "Wind", score: indoor ? 1 : clamp(sp.wind + (1 - sp.wind) * (1 - c.vientoPrimavera / 8)), note: `Spring wind ${c.vientoPrimavera} m/s; tolerance ${sp.wind >= 0.8 ? "high" : sp.wind >= 0.5 ? "medium" : "low"}` });

  const scores = f.map((x) => x.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const agro = Math.round(100 * (0.55 * Math.min(...scores) + 0.45 * mean));

  const revenue = sp.econ.yieldTHa * 1000 * sp.econ.priceUsdKg;
  const marginUsd = revenue - sp.econ.costUsdHa;
  const realMargin = marginUsd * (agro / 100); // poor fit = lower yields
  const payback = realMargin > 0 ? +(sp.yearsToHarvest + sp.econ.setupUsdHa / realMargin).toFixed(1) : null;
  const fillsGap = sp.harvest.some((m) => !BUSY_MONTHS.includes(m));

  const econScore = clamp(realMargin / 25000);
  const paybackScore = payback === null ? 0 : clamp(1 - (payback - 2) / 10);
  const viability = Math.round(100 * clamp(0.6 * (agro / 100) + 0.2 * econScore + 0.1 * paybackScore + (fillsGap ? 0.1 : 0)));

  return {
    species: sp, agro, viability, level: lvl(viability), factors: f, fillsGap,
    limits: f.filter((x) => x.score < 0.6).sort((a, b) => a.score - b.score).map((x) => `${x.name}: ${x.note}`),
    economy: { revenue: Math.round(revenue), margin: Math.round(marginUsd), paybackYears: payback, marginPerDay: Math.round(marginUsd / Math.max(1, sp.laborDaysHa)) },
  };
}

export function rankSpecies(c: IndicadoresNasa, soil: SoilResumen, sal: Salinity, farm: FarmProfile) {
  return SPECIES.map((s) => speciesFit(s, c, soil, sal, farm)).sort((a, b) => b.viability - a.viability);
}

/** Month-by-month income coverage: which months have something to harvest. */
export function harvestCoverage(ids: string[]) {
  return Array.from({ length: 12 }, (_, i) => SPECIES.filter((s) => ids.includes(s.id) && s.harvest.includes(i + 1)).map((s) => s.id));
}
