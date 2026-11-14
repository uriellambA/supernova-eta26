import { SITE } from "@/config/site";
import { fetchJson } from "./cache";
import type { ClimaResumen, NieveCuenca, NieveResumen } from "./types";

/** 16-day forecast + last 10 days (for the water balance). */
export async function pronostico(lat: number, lon: number): Promise<ClimaResumen> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,wind_speed_10m_max,et0_fao_evapotranspiration,uv_index_max` +
    `&hourly=temperature_2m,relative_humidity_2m,surface_pressure&timezone=${encodeURIComponent(SITE.timezone)}&forecast_days=16&past_days=10&wind_speed_unit=kmh`;
  const j = await fetchJson(url, 20_000);
  const d = j.daily;
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: SITE.timezone });
  const horaMin = new Map<string, { t: number; h: string }>();
  const hr = new Map<string, number[]>(), ps = new Map<string, number[]>();
  const push = (m: Map<string, number[]>, k: string, v: number | null | undefined) => {
    if (v === null || v === undefined) return;
    const a = m.get(k);
    if (a) a.push(v);
    else m.set(k, [v]);
  };
  const avg = (xs?: number[]) => (xs?.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  (j.hourly?.time ?? []).forEach((iso: string, i: number) => {
    push(hr, iso.slice(0, 10), j.hourly.relative_humidity_2m?.[i]);
    push(ps, iso.slice(0, 10), j.hourly.surface_pressure?.[i]);
    const t = j.hourly.temperature_2m[i];
    if (t === null) return;
    const dia = iso.slice(0, 10);
    const prev = horaMin.get(dia);
    if (!prev || t < prev.t) horaMin.set(dia, { t, h: iso.slice(11, 16) });
  });
  return {
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
      humedad: avg(hr.get(f)) === null ? null : Math.round(avg(hr.get(f))!),
      presion: avg(ps.get(f)) === null ? null : Math.round(avg(ps.get(f))!),
      uv: d.uv_index_max?.[i] ?? null,
    })),
  };
}

/**
 * Snowpack index: accumulated snowfall (ERA5 reanalysis) Apr 1 → today (or Oct 31) in the watershed
 * that feeds the irrigation canals, compared with the same window of the previous 20 seasons.
 */
export async function nieveCuencas(): Promise<NieveResumen> {
  const fin = new Date(Date.now() - 6 * 86_400_000);
  const temporada = fin.getUTCMonth() + 1 >= 4 ? fin.getUTCFullYear() : fin.getUTCFullYear() - 1;
  const finStr = fin.toISOString().slice(0, 10);
  const pts = SITE.watershed.points;
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${pts.map((p) => p[0]).join(",")}` +
    `&longitude=${pts.map((p) => p[1]).join(",")}&start_date=${temporada - 20}-04-01&end_date=${finStr}&daily=snowfall_sum&timezone=GMT`;
  const j = await fetchJson(url, 45_000);
  const respuestas: { daily: { time: string[]; snowfall_sum: (number | null)[] } }[] = Array.isArray(j) ? j : [j];
  const corte = fin.getUTCMonth() + 1 >= 4 && fin.getUTCMonth() + 1 <= 10 ? finStr.slice(5) : "10-31";
  const porAnio = new Map<number, number[]>();
  for (const r of respuestas) {
    const acum = new Map<number, number>();
    r.daily.time.forEach((f, k) => {
      const md = f.slice(5);
      if (md < "04-01" || md > corte) return;
      const a = +f.slice(0, 4);
      acum.set(a, (acum.get(a) ?? 0) + (r.daily.snowfall_sum[k] ?? 0));
    });
    acum.forEach((v, a) => porAnio.set(a, [...(porAnio.get(a) ?? []), v]));
  }
  const serie = [...porAnio.entries()].map(([anio, vs]) => ({ anio, cm: Math.round(vs.reduce((s, x) => s + x, 0) / vs.length) })).sort((a, b) => a.anio - b.anio);
  const actual = serie.find((s) => s.anio === temporada)?.cm ?? 0;
  const hist = serie.filter((s) => s.anio < temporada);
  const prom = hist.length ? hist.reduce((s, x) => s + x.cm, 0) / hist.length : 0;
  const c: NieveCuenca = { id: SITE.id, nombre: SITE.watershed.name, temporada, actualCm: actual, promedioCm: Math.round(prom), pct: prom ? +(actual / prom).toFixed(2) : 1, serie };
  return { hasta: finStr, cuencas: [c], indice: c.pct };
}
