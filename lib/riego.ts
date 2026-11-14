import type { DiaPronostico, Mensual, SistemaRiego } from "./types";

export const EFFICIENCY: Record<SistemaRiego, number> = { flood: 0.45, furrow: 0.55, sprinkler: 0.75, drip: 0.9 };
export const METHOD_NAME: Record<SistemaRiego, string> = { flood: "Flood", furrow: "Furrow", sprinkler: "Sprinkler", drip: "Drip" };
export const effectiveRain = (mm: number) => (mm > 5 ? 0.75 * mm : 0);

/** Net irrigation need over a season (mm) from monthly ET0 × Kc − effective rain. */
export function seasonNeed(kc: number[], mensual: Mensual[]) {
  return mensual.reduce((s, m) => s + Math.max(0, m.et0 * (kc[m.mes - 1] ?? 0) - effectiveRain(m.lluvia)), 0);
}

/** Next-days irrigation need from the forecast. */
export function nextDaysNeed(kc: number[], dias: DiaPronostico[], n = 7) {
  const fut = dias.filter((d) => !d.pasado).slice(0, n);
  const etc = fut.reduce((s, d) => s + d.et0 * (kc[+d.fecha.slice(5, 7) - 1] ?? 0), 0);
  const pe = fut.reduce((s, d) => s + effectiveRain(d.lluvia), 0);
  return { days: fut.length, etc: +etc.toFixed(1), rain: +pe.toFixed(1), net: +Math.max(0, etc - pe).toFixed(1) };
}
