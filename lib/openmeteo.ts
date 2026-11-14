import { REGION } from "@/config/regions/alto-valle";
import { fetchJson } from "./cache";
import type { ClimaResumen, NieveCuenca, NieveResumen } from "./types";

/** Pronóstico de 16 días + 10 días pasados (para el balance de riego). */
export async function pronostico(lat: number, lon: number): Promise<ClimaResumen> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,wind_speed_10m_max,et0_fao_evapotranspiration` +
    `&hourly=temperature_2m&timezone=${encodeURIComponent(REGION.timezone)}&forecast_days=16&past_days=10&wind_speed_unit=kmh`;
  const j = await fetchJson(url, 20_000);
  const d = j.daily;
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: REGION.timezone });
  // hora de la mínima por día
  const horaMin = new Map<string, { t: number; h: string }>();
  (j.hourly?.time ?? []).forEach((iso: string, i: number) => {
    const t = j.hourly.temperature_2m[i];
    if (t === null) return;
    const dia = iso.slice(0, 10);
    const prev = horaMin.get(dia);
    if (!prev || t < prev.t) horaMin.set(dia, { t, h: iso.slice(11, 16) });
  });
  return {
    fuente: "Open-Meteo (pronóstico, modelos combinados)",
    elevacion: typeof j.elevation === "number" ? j.elevation : null,
    dias: d.time.map((f: string, i: number) => ({
      fecha: f,
      tmin: d.temperature_2m_min[i] ?? 0,
      tmax: d.temperature_2m_max[i] ?? 0,
      lluvia: d.precipitation_sum[i] ?? 0,
      rafagas: d.wind_gusts_10m_max[i] ?? 0,
      viento: d.wind_speed_10m_max[i] ?? 0,
      et0: d.et0_fao_evapotranspiration[i] ?? 0,
      horaMin: horaMin.get(f)?.h ?? null,
      pasado: f < hoy,
    })),
  };
}

/**
 * Termómetro de nieve — PLAN B: nevadas acumuladas (ERA5 vía Open-Meteo) en puntos de la
 * cordillera, desde el 1/4 hasta hoy (o el 31/10), comparadas con el mismo período de años anteriores.
 * Versión NASA (MODIS Snow Cover vía AppEEARS): ver scripts/fetch-nieve.md.
 */
export async function nieveCuencas(): Promise<NieveResumen> {
  const ahora = new Date();
  const fin = new Date(ahora.getTime() - 6 * 86_400_000); // ERA5 tiene ~5 días de demora
  const temporada = fin.getUTCMonth() + 1 >= 4 ? fin.getUTCFullYear() : fin.getUTCFullYear() - 1;
  const inicioHist = temporada - 20;
  const finStr = fin.toISOString().slice(0, 10);
  const puntos = REGION.cuencasNieve.flatMap((c) => c.puntos.map((p) => ({ cuenca: c.id, lat: p[0], lon: p[1] })));
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${puntos.map((p) => p.lat).join(",")}` +
    `&longitude=${puntos.map((p) => p.lon).join(",")}&start_date=${inicioHist}-04-01&end_date=${finStr}&daily=snowfall_sum&timezone=GMT`;
  const j = await fetchJson(url, 45_000);
  const respuestas: { daily: { time: string[]; snowfall_sum: (number | null)[] } }[] = Array.isArray(j) ? j : [j];

  // fecha de corte dentro de la temporada (MM-DD)
  const corte = fin.getUTCMonth() + 1 >= 4 && fin.getUTCMonth() + 1 <= 10 ? finStr.slice(5) : "10-31";
  const cuencas: NieveCuenca[] = REGION.cuencasNieve.map((c) => {
    const idx = puntos.map((p, i) => (p.cuenca === c.id ? i : -1)).filter((i) => i >= 0);
    const porAnio = new Map<number, number[]>();
    for (const i of idx) {
      const r = respuestas[i]?.daily;
      if (!r) continue;
      const acum = new Map<number, number>();
      r.time.forEach((f, k) => {
        const md = f.slice(5);
        if (md < "04-01" || md > corte) return;
        const a = +f.slice(0, 4);
        acum.set(a, (acum.get(a) ?? 0) + (r.snowfall_sum[k] ?? 0));
      });
      acum.forEach((v, a) => porAnio.set(a, [...(porAnio.get(a) ?? []), v]));
    }
    const serie = [...porAnio.entries()]
      .map(([anio, vs]) => ({ anio, cm: Math.round(vs.reduce((s, x) => s + x, 0) / vs.length) }))
      .sort((a, b) => a.anio - b.anio);
    const actual = serie.find((s) => s.anio === temporada)?.cm ?? 0;
    const hist = serie.filter((s) => s.anio < temporada);
    const prom = hist.length ? hist.reduce((s, x) => s + x.cm, 0) / hist.length : 0;
    return { id: c.id, nombre: c.nombre, temporada, actualCm: actual, promedioCm: Math.round(prom), pct: prom ? +(actual / prom).toFixed(2) : 1, serie };
  });
  const indice = +REGION.cuencasNieve.reduce((s, c, i) => s + c.peso * cuencas[i].pct, 0).toFixed(2);
  return { fuente: "Reanálisis ERA5 vía Open-Meteo (plan B; versión MODIS Snow Cover de NASA en preparación)", hasta: finStr, cuencas, indice };
}
