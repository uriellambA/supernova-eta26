import type { Anual, EnsoPhase, EnsoResumen } from "./types";

/**
 * El Niño / La Niña state from the Oceanic Niño Index (3-month sea-surface temperature anomaly in the Pacific).
 * Phase threshold ±0.5 °C. A year's phase is taken from Sep–Nov (spring), when it matters most for frost and wind.
 */
export const phaseOf = (a: number): EnsoPhase => (a >= 0.5 ? "El Niño" : a <= -0.5 ? "La Niña" : "Neutral");

// Fallback (spring ONI, approximate): used only when the live index cannot be reached.
const FALLBACK: Record<number, number> = {
  2003: 0.4, 2004: 0.7, 2005: -0.3, 2006: 0.9, 2007: -1.4, 2008: -0.5, 2009: 1.3, 2010: -1.6, 2011: -1.0, 2012: 0.3,
  2013: -0.2, 2014: 0.5, 2015: 2.4, 2016: -0.7, 2017: -0.8, 2018: 0.7, 2019: 0.3, 2020: -1.3, 2021: -1.0, 2022: -1.0,
  2023: 1.8, 2024: -0.2, 2025: -0.5,
};

export function ensoFallback(): EnsoResumen {
  return { live: false, current: null, years: Object.entries(FALLBACK).map(([y, a]) => ({ year: +y, anomaly: a, phase: phaseOf(a) })) };
}

export async function ensoLive(): Promise<EnsoResumen> {
  const res = await fetch("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`ONI ${res.status}`);
  const rows = (await res.text())
    .split("\n")
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length >= 4 && /^\d{4}$/.test(p[1]))
    .map((p) => ({ season: p[0], year: +p[1], anomaly: +p[3] }))
    .filter((r) => Number.isFinite(r.anomaly));
  if (!rows.length) throw new Error("ONI: empty");
  const last = rows.at(-1)!;
  const years = [...new Set(rows.map((r) => r.year))]
    .filter((y) => y >= 2000)
    .map((y) => {
      const son = rows.find((r) => r.year === y && r.season === "SON");
      return { year: y, anomaly: son ? son.anomaly : null, phase: son ? phaseOf(son.anomaly) : ("Neutral" as EnsoPhase) };
    })
    .filter((y) => y.anomaly !== null);
  return { live: true, current: { ...last, phase: phaseOf(last.anomaly) }, years };
}

export type EnsoImpact = { phase: EnsoPhase; years: number[]; rain: number; frostDays: number; lateFrostPct: number; temp: number; wind: number };

/** What each phase meant on THIS field in the climate history (rain, frost, late frost, wind). */
export function ensoImpacts(enso: EnsoResumen, anual: Anual[]): EnsoImpact[] {
  const phases: EnsoPhase[] = ["El Niño", "Neutral", "La Niña"];
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return phases
    .map((ph) => {
      const ys = enso.years.filter((y) => y.phase === ph).map((y) => y.year);
      const rows = anual.filter((a) => ys.includes(a.anio));
      return {
        phase: ph,
        years: rows.map((r) => r.anio),
        rain: Math.round(avg(rows.map((r) => r.lluvia))),
        frostDays: Math.round(avg(rows.map((r) => r.diasHelada))),
        lateFrostPct: Math.round(100 * avg(rows.map((r) => (r.heladaTardia ? 1 : 0)))),
        temp: +avg(rows.map((r) => r.tMedia)).toFixed(1),
        wind: +avg(rows.map((r) => r.vientoPrim)).toFixed(1),
      };
    })
    .filter((x) => x.years.length > 0);
}
