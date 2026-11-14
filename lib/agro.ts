import type { DiarioClima, IndicadoresNasa, Mensual } from "./types";

// ---------- utilidades de fecha (sin zonas horarias: todo en UTC) ----------
const DIA_MS = 86_400_000;
export const mmdd = (iso: string) => iso.slice(5, 10);
const doy = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / DIA_MS);
};
const isoDeDoy = (anio: number, n: number) => new Date(Date.UTC(anio, 0, 1) + n * DIA_MS).toISOString().slice(0, 10);
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const percentil = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

/** Días del calendario de heladas: 1/9 → 30/11 (año no bisiesto de referencia). */
export function diasCalendario(): string[] {
  const out: string[] = [];
  for (let t = Date.UTC(2001, 8, 1); t <= Date.UTC(2001, 10, 30); t += DIA_MS) out.push(new Date(t).toISOString().slice(5, 10));
  return out;
}

/** Radiación extraterrestre (mm/día equivalentes) — FAO-56. */
function radiacionExtra(latDeg: number, diaJuliano: number) {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * diaJuliano) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * diaJuliano) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  const ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
  return ra * 0.408; // MJ/m² → mm
}

/** ET0 Hargreaves (mm/día). */
export function et0Hargreaves(lat: number, iso: string, tmin: number, tmax: number) {
  const ra = radiacionExtra(lat, doy(iso) + 1);
  return Math.max(0, 0.0023 * ra * ((tmin + tmax) / 2 + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)));
}

/** Horas de frío de un día (0–7,2 °C) con una curva diaria sinusoidal. */
function horasFrioDia(tmin: number, tmax: number) {
  let h = 0;
  for (let i = 0; i < 24; i++) {
    // curva sinusoidal: máxima a las 15 h, mínima a las 3 h (aprox.)
    const t = (tmin + tmax) / 2 + ((tmax - tmin) / 2) * Math.cos((2 * Math.PI * (i - 15)) / 24);
    if (t > 0 && t <= 7.2) h++;
  }
  return h;
}

/** Calcula todos los indicadores agroclimáticos a partir del diario de NASA POWER. */
export function calcularIndicadores(d: DiarioClima, lat: number, lon: number, fuente: string): IndicadoresNasa {
  const porFecha = new Map<string, number>();
  d.fechas.forEach((f, i) => porFecha.set(f, i));
  const anios = [...new Set(d.fechas.map((f) => +f.slice(0, 4)))].sort();
  const dias = diasCalendario();

  // Calendario de heladas (tmin por año y día)
  const calTmin = anios.map((a) => dias.map((md) => {
    const i = porFecha.get(`${a}-${md}`);
    return i === undefined ? null : d.tmin[i];
  }));
  const aniosConDatos = anios.filter((_, k) => calTmin[k].some((v) => v !== null));

  // Probabilidad semanal de helada
  const probSemanal: IndicadoresNasa["probSemanal"] = [];
  for (let s = 0; s < dias.length; s += 7) {
    let n = 0, c0 = 0, c2 = 0;
    anios.forEach((_, k) => {
      const semana = calTmin[k].slice(s, s + 7).filter((v): v is number => v !== null);
      if (!semana.length) return;
      n++;
      const mn = Math.min(...semana);
      if (mn <= 0) c0++;
      if (mn <= -2) c2++;
    });
    probSemanal.push({ inicio: dias[s], p0: n ? c0 / n : 0, p2: n ? c2 / n : 0 });
  }

  // Última helada de primavera (jul→dic) y primera de otoño (ene→jun del año siguiente)
  const ultimas: number[] = [];
  const libres: number[] = [];
  let tardias = 0;
  for (const a of anios) {
    let ultima: string | null = null;
    let completo = false;
    for (let t = Date.UTC(a, 6, 1); t <= Date.UTC(a, 11, 31); t += DIA_MS) {
      const iso = new Date(t).toISOString().slice(0, 10);
      const i = porFecha.get(iso);
      if (i === undefined) continue;
      completo = true;
      const v = d.tmin[i];
      if (v !== null && v <= 0) ultima = iso;
    }
    if (!completo || !ultima) continue;
    ultimas.push(doy(ultima));
    if (mmdd(ultima) > "10-10") tardias++;
    let primera: string | null = null;
    for (let t = Date.UTC(a + 1, 0, 1); t <= Date.UTC(a + 1, 5, 30); t += DIA_MS) {
      const iso = new Date(t).toISOString().slice(0, 10);
      const i = porFecha.get(iso);
      if (i === undefined) continue;
      const v = d.tmin[i];
      if (v !== null && v <= 0) { primera = iso; break; }
    }
    if (primera) libres.push((Date.parse(primera) - Date.parse(ultima)) / DIA_MS - 1);
  }
  const fechaDoy = (n: number) => mmdd(isoDeDoy(2001, Math.round(n)));

  // Horas de frío (mayo→agosto), GDD (sep→abr), lluvia y ET0
  const hfPorAnio = new Map<number, number>();
  const gddPorTemp = new Map<number, number>();
  const lluviaPorAnio = new Map<number, number>();
  const et0PorAnio = new Map<number, number>();
  const acumMes = Array.from({ length: 12 }, () => ({ tmin: [] as number[], tmax: [] as number[], lluvia: 0, et0: 0, viento: [] as number[], hr: [] as number[] }));
  const mesesContados = Array.from({ length: 12 }, () => new Set<string>());

  d.fechas.forEach((f, i) => {
    const tn = d.tmin[i], tx = d.tmax[i];
    const anio = +f.slice(0, 4), mes = +f.slice(5, 7);
    const m = acumMes[mes - 1];
    mesesContados[mes - 1].add(f.slice(0, 7));
    if (d.lluvia[i] !== null) {
      m.lluvia += d.lluvia[i]!;
      lluviaPorAnio.set(anio, (lluviaPorAnio.get(anio) ?? 0) + d.lluvia[i]!);
    }
    if (d.viento[i] !== null) m.viento.push(d.viento[i]!);
    if (d.humedadRaiz[i] !== null) m.hr.push(d.humedadRaiz[i]!);
    if (tn === null || tx === null) return;
    m.tmin.push(tn); m.tmax.push(tx);
    const e = et0Hargreaves(lat, f, tn, tx);
    m.et0 += e;
    et0PorAnio.set(anio, (et0PorAnio.get(anio) ?? 0) + e);
    if (mes >= 5 && mes <= 8) hfPorAnio.set(anio, (hfPorAnio.get(anio) ?? 0) + horasFrioDia(tn, tx));
    const temporada = mes >= 9 ? anio : mes <= 4 ? anio - 1 : null;
    if (temporada !== null) gddPorTemp.set(temporada, (gddPorTemp.get(temporada) ?? 0) + Math.max(0, (tn + tx) / 2 - 10));
  });

  const aniosCompletos = (map: Map<number, number>, min: number) => [...map.entries()].filter(([, v]) => v >= min).map(([, v]) => v);
  const mensual: Mensual[] = acumMes.map((m, k) => {
    const n = mesesContados[k].size || 1;
    return {
      mes: k + 1,
      tmin: +media(m.tmin).toFixed(1),
      tmax: +media(m.tmax).toFixed(1),
      lluvia: +(m.lluvia / n).toFixed(1),
      et0: +(m.et0 / n).toFixed(1),
      viento: +media(m.viento).toFixed(1),
      humedadRaiz: m.hr.length ? +media(m.hr).toFixed(2) : null,
    };
  });

  // Tendencia: temperatura media de la primera mitad vs. la segunda del período
  let tendencia: IndicadoresNasa["tendencia"] = null;
  if (anios.length >= 8) {
    const mitad = anios[Math.floor(anios.length / 2)];
    const t1: number[] = [], t2: number[] = [];
    d.fechas.forEach((f, i) => {
      const tn = d.tmin[i], tx = d.tmax[i];
      if (tn === null || tx === null) return;
      (+f.slice(0, 4) < mitad ? t1 : t2).push((tn + tx) / 2);
    });
    const a = media(t1), b = media(t2);
    tendencia = { decada1: +a.toFixed(2), decada2: +b.toFixed(2), dif: +(b - a).toFixed(2) };
  }

  return {
    fuente,
    celda: { lat, lon },
    periodo: [anios[0], anios[anios.length - 1]],
    calendario: { anios, dias, tmin: calTmin },
    probSemanal,
    ultimaHeladaMedia: ultimas.length ? fechaDoy(media(ultimas)) : null,
    ultimaHeladaP80: ultimas.length ? fechaDoy(percentil(ultimas, 0.8)) : null,
    aniosHeladaTardia: tardias,
    libreHeladas: Math.round(media(libres)),
    horasFrio: Math.round(media(aniosCompletos(hfPorAnio, 100))),
    gdd10: Math.round(media(aniosCompletos(gddPorTemp, 300))),
    lluviaAnual: Math.round(media(aniosCompletos(lluviaPorAnio, 1))),
    et0Anual: Math.round(media(aniosCompletos(et0PorAnio, 500))),
    mensual,
    tendencia: aniosConDatos.length ? tendencia : null,
  };
}

/** Probabilidad (0..1) de que la tmin ≤ umbral en una ventana MM-DD, entre todos los años. */
export function probHeladaVentana(ind: IndicadoresNasa, desde: string, hasta: string, umbral: number, correccion = 0) {
  const { dias, tmin } = ind.calendario;
  const i0 = dias.findIndex((d) => d >= desde);
  let i1 = dias.findIndex((d) => d > hasta);
  if (i1 === -1) i1 = dias.length;
  if (i0 === -1 || i1 <= i0) return null; // ventana fuera del calendario
  let n = 0, c = 0;
  for (const fila of tmin) {
    const v = fila.slice(i0, i1).filter((x): x is number => x !== null);
    if (!v.length) continue;
    n++;
    if (Math.min(...v) + correccion <= umbral) c++;
  }
  return n ? c / n : null;
}

export const NOMBRE_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fechaCorta = (md: string | null) => (md ? `${+md.slice(3, 5)}/${+md.slice(0, 2)}` : "—");
