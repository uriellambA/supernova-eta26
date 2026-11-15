import { calcularIndicadores } from "./agro";
import { siteNear } from "@/config/sites";
import { fetchJson } from "./cache";
import { resumenNdvi } from "./nasa-summary";
import type { DiarioClima, IndicadoresNasa, NdviResumen, PuntoNdvi } from "./types";

const POWER = "https://power.larc.nasa.gov/api/temporal/daily/point";
const PARAMS = ["T2M_MIN", "T2M_MAX", "PRECTOTCORR", "WS2M", "GWETROOT", "GWETTOP"];
const EXTRA = ["RH2M", "PS", "ALLSKY_SFC_UV_INDEX"];

/** Descarga 20 años de clima diario de NASA POWER (comunidad AG). */
export async function powerDiario(lat: number, lon: number): Promise<DiarioClima> {
  const fin = new Date().getUTCFullYear() - 1;
  const inicio = fin - 19;
  const url = (ps: string[]) => `${POWER}?parameters=${ps.join(",")}&community=AG&latitude=${lat}&longitude=${lon}&start=${inicio}0101&end=${fin}1231&format=JSON&time-standard=LST`;
  // Humidity, pressure and UV are extras: if they fail, keep the core record.
  const j = await fetchJson(url([...PARAMS, ...EXTRA]), 50_000).catch(() => fetchJson(url(PARAMS), 45_000));
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
    humedadSup: claves.map((k) => val("GWETTOP", k)),
    humedadRel: p.RH2M ? claves.map((k) => val("RH2M", k)) : undefined,
    presion: p.PS ? claves.map((k) => val("PS", k)) : undefined,
    uv: p.ALLSKY_SFC_UV_INDEX ? claves.map((k) => val("ALLSKY_SFC_UV_INDEX", k)) : undefined,
    elevCelda: typeof j?.geometry?.coordinates?.[2] === "number" ? j.geometry.coordinates[2] : null,
  };
}

/** Field elevation (m) from a 90 m terrain model; falls back to the site's typical elevation. */
export async function elevacionCampo(lat: number, lon: number): Promise<number> {
  try {
    const j = await fetchJson(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`, 10_000);
    const e = Number(j?.elevation?.[0]);
    return Number.isFinite(e) ? e : siteNear(lat, lon).elevation;
  } catch {
    return siteNear(lat, lon).elevation;
  }
}

/**
 * The climate grid cell (~50 km) averages the valley with the Andes, so it is much higher and colder than the farms.
 * Shift temperatures by the standard lapse rate (6.5 °C per 1000 m) from the cell's mean elevation to the field's.
 */
export function corregirAltura(d: DiarioClima, campo: number) {
  const celda = d.elevCelda;
  if (celda === null || celda === undefined || Math.abs(celda - campo) < 50) return { d, altura: null };
  const delta = +(((celda - campo) * 6.5) / 1000).toFixed(2);
  const shift = (xs: (number | null)[]) => xs.map((t) => (t === null ? null : +(t + delta).toFixed(2)));
  return { d: { ...d, tmin: shift(d.tmin), tmax: shift(d.tmax) }, altura: { celda: Math.round(celda), campo: Math.round(campo), deltaC: delta } };
}

export async function indicadoresNasa(lat: number, lon: number): Promise<IndicadoresNasa> {
  const [raw, campo] = await Promise.all([powerDiario(lat, lon), elevacionCampo(lat, lon)]);
  const { d, altura } = corregirAltura(raw, campo);
  return { ...calcularIndicadores(d, lat, lon), altura };
}

const ORNL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1";

/** NDVI + EVI MODIS (MOD13Q1, 250 m, 16 días) de los últimos ~2 años vía ORNL DAAC. */
export async function ndviModis(lat: number, lon: number): Promise<NdviResumen> {
  const h = { headers: { Accept: "application/json" } };
  const fechas = await fetchJson(`${ORNL}/dates?latitude=${lat}&longitude=${lon}`, 20_000, h);
  const lista: { modis_date: string; calendar_date: string }[] = (fechas?.dates ?? []).slice(-46);
  if (!lista.length) throw new Error("MODIS: sin fechas");
  const lotes: (typeof lista)[] = [];
  for (let i = 0; i < lista.length; i += 10) lotes.push(lista.slice(i, i + 10)); // ORNL: máx. 10 fechas por pedido
  const pedir = (band: string) =>
    Promise.all(
      lotes.map((l) =>
        fetchJson(
          `${ORNL}/subset?latitude=${lat}&longitude=${lon}&band=${band}&startDate=${l[0].modis_date}&endDate=${l[l.length - 1].modis_date}&kmAboveBelow=0&kmLeftRight=0`,
          30_000,
          h,
        ).catch(() => null),
      ),
    );
  const [pn, pe] = await Promise.all([pedir("250m_16_days_NDVI"), pedir("250m_16_days_EVI")]);
  const leerBanda = (partes: unknown[]) => {
    const m = new Map<string, number>();
    for (const parte of partes as { subset?: { calendar_date: string; data: number[] }[] }[]) {
      for (const s of parte?.subset ?? []) {
        const raw = Number(s?.data?.[0]);
        if (Number.isFinite(raw) && raw > -2000) m.set(s.calendar_date, +(raw * 0.0001).toFixed(3));
      }
    }
    return m;
  };
  const ndvi = leerBanda(pn), evi = leerBanda(pe);
  const serie: PuntoNdvi[] = [...ndvi.entries()].map(([fecha, v]) => ({ fecha, ndvi: v, ...(evi.has(fecha) && { evi: evi.get(fecha) }) }));
  serie.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return resumenNdvi(serie);
}

export { resumenNdvi } from "./nasa-summary";
