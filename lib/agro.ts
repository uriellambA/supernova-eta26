import type { DiarioClima, IndicadoresNasa, Mensual } from "./types";

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

/** Spring frost calendar days: Sep 1 → Dec 31. */
export function diasCalendario(): string[] {
  const out: string[] = [];
  for (let t = Date.UTC(2001, 8, 1); t <= Date.UTC(2001, 11, 31); t += DIA_MS) out.push(new Date(t).toISOString().slice(5, 10));
  return out;
}

/** Extraterrestrial radiation (mm/day equivalent), FAO-56. */
function radiacionExtra(latDeg: number, diaJuliano: number) {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * diaJuliano) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * diaJuliano) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  const ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
  return ra * 0.408;
}

/** Hargreaves reference evapotranspiration (mm/day). */
export function et0Hargreaves(lat: number, iso: string, tmin: number, tmax: number) {
  const ra = radiacionExtra(lat, doy(iso) + 1);
  return Math.max(0, 0.0023 * ra * ((tmin + tmax) / 2 + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)));
}

/** Chill hours (0–7.2 °C) of one day using a sine daily curve. */
function horasFrioDia(tmin: number, tmax: number) {
  let h = 0;
  for (let i = 0; i < 24; i++) {
    const t = (tmin + tmax) / 2 + ((tmax - tmin) / 2) * Math.cos((2 * Math.PI * (i - 15)) / 24);
    if (t > 0 && t <= 7.2) h++;
  }
  return h;
}

export function calcularIndicadores(d: DiarioClima, lat: number, lon: number): IndicadoresNasa {
  const porFecha = new Map<string, number>();
  d.fechas.forEach((f, i) => porFecha.set(f, i));
  const anios = [...new Set(d.fechas.map((f) => +f.slice(0, 4)))].sort();
  const dias = diasCalendario();

  const calTmin = anios.map((a) =>
    dias.map((md) => {
      const i = porFecha.get(`${a}-${md}`);
      return i === undefined ? null : d.tmin[i];
    }),
  );

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

  // Last spring frost (Jul→Dec) and first autumn frost (Jan→Jun next year)
  const ultimas: number[] = [];
  const libres: number[] = [];
  const ultimaPorAnio = new Map<number, string>();
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
    ultimaPorAnio.set(a, mmdd(ultima));
    if (mmdd(ultima) > "11-01") tardias++;
    let primera: string | null = null;
    for (let t = Date.UTC(a + 1, 0, 1); t <= Date.UTC(a + 1, 5, 30); t += DIA_MS) {
      const iso = new Date(t).toISOString().slice(0, 10);
      const i = porFecha.get(iso);
      if (i === undefined) continue;
      const v = d.tmin[i];
      if (v !== null && v <= 0) {
        primera = iso;
        break;
      }
    }
    if (primera) libres.push((Date.parse(primera) - Date.parse(ultima)) / DIA_MS - 1);
  }
  const fechaDoy = (n: number) => mmdd(isoDeDoy(2001, Math.round(n)));

  const hfPorAnio = new Map<number, number>();
  const gddPorTemp = new Map<number, number>();
  const lluviaPorAnio = new Map<number, number>();
  const et0PorAnio = new Map<number, number>();
  const heladaPorAnio = new Map<number, number>();
  const acumMes = Array.from({ length: 12 }, () => ({ tmin: [] as number[], tmax: [] as number[], lluvia: 0, et0: 0, viento: [] as number[], hr: [] as number[], hs: [] as number[], rh: [] as number[], ps: [] as number[], uv: [] as number[], helada: 0, calor: 0 }));
  const tPorAnio = new Map<number, number[]>();
  const minPorAnio = new Map<number, number>();
  const vPrimPorAnio = new Map<number, number[]>();
  const mesesContados = Array.from({ length: 12 }, () => new Set<string>());
  const vientoPrim: number[] = [];

  d.fechas.forEach((f, i) => {
    const tn = d.tmin[i], tx = d.tmax[i];
    const anio = +f.slice(0, 4), mes = +f.slice(5, 7);
    const m = acumMes[mes - 1];
    mesesContados[mes - 1].add(f.slice(0, 7));
    if (d.lluvia[i] !== null) {
      m.lluvia += d.lluvia[i]!;
      lluviaPorAnio.set(anio, (lluviaPorAnio.get(anio) ?? 0) + d.lluvia[i]!);
    }
    if (d.viento[i] !== null) {
      m.viento.push(d.viento[i]!);
      if (mes >= 9) {
        vientoPrim.push(d.viento[i]!);
        vPrimPorAnio.set(anio, [...(vPrimPorAnio.get(anio) ?? []), d.viento[i]!]);
      }
    }
    const rh = d.humedadRel?.[i], ps = d.presion?.[i], uv = d.uv?.[i];
    if (rh != null) m.rh.push(rh);
    if (ps != null) m.ps.push(ps * 10); // kPa → hPa
    if (uv != null) m.uv.push(uv);
    if (d.humedadRaiz[i] !== null) m.hr.push(d.humedadRaiz[i]!);
    if (d.humedadSup[i] !== null) m.hs.push(d.humedadSup[i]!);
    if (tn === null || tx === null) return;
    m.tmin.push(tn);
    m.tmax.push(tx);
    minPorAnio.set(anio, Math.min(minPorAnio.get(anio) ?? 99, tn));
    const tl = tPorAnio.get(anio);
    if (tl) tl.push((tn + tx) / 2);
    else tPorAnio.set(anio, [(tn + tx) / 2]);
    if (tn <= 0) {
      m.helada++;
      heladaPorAnio.set(anio, (heladaPorAnio.get(anio) ?? 0) + 1);
    }
    if (tx >= 30) m.calor++;
    const e = et0Hargreaves(lat, f, tn, tx);
    m.et0 += e;
    et0PorAnio.set(anio, (et0PorAnio.get(anio) ?? 0) + e);
    if (mes >= 5 && mes <= 8) hfPorAnio.set(anio, (hfPorAnio.get(anio) ?? 0) + horasFrioDia(tn, tx));
    const temporada = mes >= 9 ? anio : mes <= 4 ? anio - 1 : null;
    if (temporada !== null) gddPorTemp.set(temporada, (gddPorTemp.get(temporada) ?? 0) + Math.max(0, (tn + tx) / 2 - 10));
  });

  const completos = (map: Map<number, number>, min: number) => [...map.entries()].filter(([, v]) => v >= min).map(([, v]) => v);
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
      humedadSup: m.hs.length ? +media(m.hs).toFixed(2) : null,
      diasHelada: +(m.helada / n).toFixed(1),
      diasCalor: +(m.calor / n).toFixed(1),
      humedadRel: m.rh.length ? Math.round(media(m.rh)) : null,
      presion: m.ps.length ? Math.round(media(m.ps)) : null,
      uv: m.uv.length ? +media(m.uv).toFixed(1) : null,
    };
  });

  let tendencia: IndicadoresNasa["tendencia"] = null;
  let tendenciaLluvia: IndicadoresNasa["tendenciaLluvia"] = null;
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
    const l1 = [...lluviaPorAnio.entries()].filter(([y]) => y < mitad).map(([, v]) => v);
    const l2 = [...lluviaPorAnio.entries()].filter(([y]) => y >= mitad).map(([, v]) => v);
    const ma = media(l1), mb = media(l2);
    tendenciaLluvia = { antes: Math.round(ma), despues: Math.round(mb), difPct: ma ? Math.round(((mb - ma) / ma) * 100) : 0 };
  }

  const todas = d.fechas.map((_, i) => (d.tmin[i] !== null && d.tmax[i] !== null ? (d.tmin[i]! + d.tmax[i]!) / 2 : null)).filter((v): v is number => v !== null);

  const anual = anios
    .filter((a) => (tPorAnio.get(a)?.length ?? 0) > 300)
    .map((a) => ({
      anio: a,
      lluvia: Math.round(lluviaPorAnio.get(a) ?? 0),
      diasHelada: heladaPorAnio.get(a) ?? 0,
      tMedia: +media(tPorAnio.get(a) ?? []).toFixed(2),
      heladaTardia: (ultimaPorAnio.get(a) ?? "00") > "11-01",
      ultimaHelada: ultimaPorAnio.get(a) ?? null,
      vientoPrim: +media(vPrimPorAnio.get(a) ?? []).toFixed(1),
    }));
  const conVal = (k: "humedadRel" | "presion") => mensual.map((m) => m[k]).filter((v): v is number => v !== null);
  const uvVer = [mensual[11].uv, mensual[0].uv, mensual[1].uv].filter((v): v is number => v !== null);

  return {
    celda: { lat, lon },
    periodo: [anios[0], anios[anios.length - 1]],
    calendario: { anios, dias, tmin: calTmin },
    probSemanal,
    ultimaHeladaMedia: ultimas.length ? fechaDoy(media(ultimas)) : null,
    ultimaHeladaP80: ultimas.length ? fechaDoy(percentil(ultimas, 0.8)) : null,
    aniosHeladaTardia: tardias,
    libreHeladas: Math.round(media(libres)),
    diasHeladaAnio: Math.round(media(completos(heladaPorAnio, 0))),
    horasFrio: Math.round(media(completos(hfPorAnio, 100))),
    gdd10: Math.round(media(completos(gddPorTemp, 50))),
    lluviaAnual: Math.round(media(completos(lluviaPorAnio, 1))),
    et0Anual: Math.round(media(completos(et0PorAnio, 300))),
    tempMedia: +media(todas).toFixed(1),
    vientoPrimavera: +media(vientoPrim).toFixed(1),
    mensual,
    tendencia,
    tendenciaLluvia,
    anual,
    humedadRelMedia: conVal("humedadRel").length ? Math.round(media(conVal("humedadRel"))) : null,
    presionMedia: conVal("presion").length ? Math.round(media(conVal("presion"))) : null,
    uvVerano: uvVer.length ? +media(uvVer).toFixed(1) : null,
    minAnual: +media(anual.map((a) => minPorAnio.get(a.anio) ?? 0)).toFixed(1),
  };
}

/** Probability (0..1) that tmin ≤ threshold within an MM-DD window across all years. */
export function probHeladaVentana(ind: IndicadoresNasa, desde: string, hasta: string, umbral: number) {
  const { dias, tmin } = ind.calendario;
  const i0 = dias.findIndex((d) => d >= desde);
  let i1 = dias.findIndex((d) => d > hasta);
  if (i1 === -1) i1 = dias.length;
  if (i0 === -1 || i1 <= i0) return null;
  let n = 0, c = 0;
  for (const fila of tmin) {
    const v = fila.slice(i0, i1).filter((x): x is number => x !== null);
    if (!v.length) continue;
    n++;
    if (Math.min(...v) <= umbral) c++;
  }
  return n ? c / n : null;
}

export const SEASONS = [
  { id: "spring", name: "Spring", months: [9, 10, 11], range: "Sep–Nov" },
  { id: "summer", name: "Summer", months: [12, 1, 2], range: "Dec–Feb" },
  { id: "autumn", name: "Autumn", months: [3, 4, 5], range: "Mar–May" },
  { id: "winter", name: "Winter", months: [6, 7, 8], range: "Jun–Aug" },
] as const;
export type SeasonId = (typeof SEASONS)[number]["id"];

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (md: string | null) => (md ? `${MONTHS[+md.slice(0, 2) - 1]} ${+md.slice(3, 5)}` : "—");
