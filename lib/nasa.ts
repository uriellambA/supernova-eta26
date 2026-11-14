import { calcularIndicadores } from "./agro";
import { fetchJson } from "./cache";
import type { DiarioClima, IndicadoresNasa, NdviResumen, PuntoNdvi } from "./types";

const POWER = "https://power.larc.nasa.gov/api/temporal/daily/point";
const PARAMS = ["T2M_MIN", "T2M_MAX", "PRECTOTCORR", "WS2M", "GWETROOT"];

/** Descarga 20 años de clima diario de NASA POWER (comunidad AG). */
export async function powerDiario(lat: number, lon: number): Promise<DiarioClima> {
  const fin = new Date().getUTCFullYear() - 1;
  const inicio = fin - 19;
  const url = `${POWER}?parameters=${PARAMS.join(",")}&community=AG&latitude=${lat}&longitude=${lon}&start=${inicio}0101&end=${fin}1231&format=JSON&time-standard=LST`;
  const j = await fetchJson(url, 45_000);
  const p = j?.properties?.parameter;
  if (!p?.T2M_MIN) throw new Error("NASA POWER: respuesta sin datos");
  const fill = Number(j?.header?.fill_value ?? -999);
  const claves = Object.keys(p.T2M_MIN).sort();
  const val = (param: string, k: string) => {
    const v = p[param]?.[k];
    return v === undefined || v === null || v === fill || v <= -990 ? null : Number(v);
  };
  return {
    fechas: claves.map((k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`),
    tmin: claves.map((k) => val("T2M_MIN", k)),
    tmax: claves.map((k) => val("T2M_MAX", k)),
    lluvia: claves.map((k) => val("PRECTOTCORR", k)),
    viento: claves.map((k) => val("WS2M", k)),
    humedadRaiz: claves.map((k) => val("GWETROOT", k)),
  };
}

export async function indicadoresNasa(lat: number, lon: number): Promise<IndicadoresNasa> {
  const d = await powerDiario(lat, lon);
  return calcularIndicadores(d, lat, lon, "NASA POWER (LaRC) — comunidad AG, diario");
}

const ORNL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1";

/** NDVI MODIS (MOD13Q1, 250 m, 16 días) de los últimos ~2 años vía ORNL DAAC. */
export async function ndviModis(lat: number, lon: number): Promise<NdviResumen> {
  const h = { headers: { Accept: "application/json" } };
  const fechas = await fetchJson(`${ORNL}/dates?latitude=${lat}&longitude=${lon}`, 20_000, h);
  const lista: { modis_date: string; calendar_date: string }[] = (fechas?.dates ?? []).slice(-46);
  if (!lista.length) throw new Error("MODIS: sin fechas");
  const lotes: (typeof lista)[] = [];
  for (let i = 0; i < lista.length; i += 10) lotes.push(lista.slice(i, i + 10)); // ORNL: máx. 10 fechas por pedido
  const partes = await Promise.all(
    lotes.map((l) =>
      fetchJson(
        `${ORNL}/subset?latitude=${lat}&longitude=${lon}&band=250m_16_days_NDVI&startDate=${l[0].modis_date}&endDate=${l[l.length - 1].modis_date}&kmAboveBelow=0&kmLeftRight=0`,
        30_000,
        h,
      ).catch(() => null),
    ),
  );
  const serie: PuntoNdvi[] = [];
  for (const parte of partes) {
    for (const s of parte?.subset ?? []) {
      const raw = Number(s?.data?.[0]);
      if (!Number.isFinite(raw) || raw <= -2000) continue;
      serie.push({ fecha: s.calendar_date, ndvi: +(raw * 0.0001).toFixed(3) });
    }
  }
  serie.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return resumenNdvi(serie, "NASA MODIS MOD13Q1 (ORNL DAAC) — NDVI 250 m, 16 días");
}

export function resumenNdvi(serie: PuntoNdvi[], fuente: string): NdviResumen {
  const ultimo = serie.at(-1) ?? null;
  let anioAnterior: PuntoNdvi | null = null;
  if (ultimo) {
    const objetivo = Date.parse(ultimo.fecha) - 365 * 86_400_000;
    anioAnterior = serie.reduce<PuntoNdvi | null>((mejor, p) => {
      const dif = Math.abs(Date.parse(p.fecha) - objetivo);
      return dif < 20 * 86_400_000 && (!mejor || dif < Math.abs(Date.parse(mejor.fecha) - objetivo)) ? p : mejor;
    }, null);
  }
  return { fuente, serie, ultimo, anioAnterior };
}
