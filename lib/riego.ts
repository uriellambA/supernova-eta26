import type { Cultivo, DiaPronostico, Mensual, SistemaRiego } from "./types";

export const EFICIENCIA: Record<SistemaRiego, number> = { manto: 0.45, surco: 0.55, aspersion: 0.75, goteo: 0.9 };
export const NOMBRE_SISTEMA: Record<SistemaRiego, string> = { manto: "Manto", surco: "Surco", aspersion: "Aspersión", goteo: "Goteo" };
// Agua fácilmente disponible en la zona de raíces (mm), aprox. 80 cm de profundidad
export const RESERVA_MM = { arenoso: 40, franco: 70, arcilloso: 90 } as const;

export const lluviaEfectiva = (mm: number) => (mm > 5 ? 0.75 * mm : 0);
const kcDe = (c: Cultivo, iso: string) => c.kc[+iso.slice(5, 7) - 1] ?? 0;

export type EntradaRiego = {
  cultivo: Cultivo;
  ha: number;
  sistema: SistemaRiego;
  turnoDias: number;
  diasDesdeRiego: number;
  textura: keyof typeof RESERVA_MM;
  caudalGotero: number; // L/h
  goterosHa: number;
};

export function calcularRiego(e: EntradaRiego, dias: DiaPronostico[], mensual: Mensual[] | null) {
  const futuros = dias.filter((d) => !d.pasado).slice(0, e.turnoDias);
  const pasados = dias.filter((d) => d.pasado).slice(-e.diasDesdeRiego);
  const etc = (ds: DiaPronostico[]) => ds.reduce((s, d) => s + d.et0 * kcDe(e.cultivo, d.fecha), 0);
  const pe = (ds: DiaPronostico[]) => ds.reduce((s, d) => s + lluviaEfectiva(d.lluvia), 0);

  const netaTurno = Math.max(0, etc(futuros) - pe(futuros));
  const ef = EFICIENCIA[e.sistema];
  const brutaTurno = netaTurno / ef;
  const m3Turno = brutaTurno * 10 * e.ha;
  const m3Goteo = (netaTurno / EFICIENCIA.goteo) * 10 * e.ha;
  const horasGoteo = e.caudalGotero * e.goterosHa > 0 ? (m3Goteo * 1000) / (e.caudalGotero * e.goterosHa * e.ha) : 0;

  const deficit = Math.max(0, etc(pasados) - pe(pasados));
  const reserva = RESERVA_MM[e.textura];
  const ratio = reserva ? deficit / reserva : 0;

  // Temporada completa (sep→abr) con la climatología de NASA POWER
  let temporada: { netaMm: number; m3Sistema: number; m3Goteo: number; ahorroM3: number } | null = null;
  if (mensual) {
    const neta = mensual.reduce((s, m) => s + Math.max(0, m.et0 * (e.cultivo.kc[m.mes - 1] ?? 0) - lluviaEfectiva(m.lluvia)), 0);
    const m3S = (neta / ef) * 10 * e.ha;
    const m3G = (neta / EFICIENCIA.goteo) * 10 * e.ha;
    temporada = { netaMm: Math.round(neta), m3Sistema: Math.round(m3S), m3Goteo: Math.round(m3G), ahorroM3: Math.round(m3S - m3G) };
  }

  return {
    diasCalculados: futuros.length,
    etcTurno: +etc(futuros).toFixed(1),
    lluviaEfTurno: +pe(futuros).toFixed(1),
    netaTurno: +netaTurno.toFixed(1),
    brutaTurno: +brutaTurno.toFixed(1),
    m3Turno: Math.round(m3Turno),
    horasGoteo: +horasGoteo.toFixed(1),
    deficit: +deficit.toFixed(1),
    reserva,
    ratio,
    temporada,
  };
}

/** Necesidad neta de riego de la temporada (mm) para el puntaje. */
export function necesidadTemporada(c: Cultivo, mensual: Mensual[]) {
  return mensual.reduce((s, m) => s + Math.max(0, m.et0 * (c.kc[m.mes - 1] ?? 0) - lluviaEfectiva(m.lluvia)), 0);
}
