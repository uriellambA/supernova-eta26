import { CULTIVOS } from "@/config/cultivos/alto-valle";
import { REGION } from "@/config/regions/alto-valle";
import { fechaCorta, probHeladaVentana } from "./agro";
import { EFICIENCIA, necesidadTemporada } from "./riego";
import { CORRECCION_BAJO, nivelPuntaje } from "./semaforo";
import type { Cultivo, CultivoPuntaje, DatosChacrero, Factor, IndicadoresNasa, NieveResumen } from "./types";

export const PESOS = { helada: 0.3, agua: 0.2, frio: 0.15, calor: 0.1, suelo: 0.15, plazo: 0.07, economico: 0.03 };
const REDUCCION_DEFENSA = { ninguna: 1, aspersion: 0.3, calefactores: 0.5, ventiladores: 0.6 } as const;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const pct = (x: number) => `${Math.round(x * 100)} %`;

export function puntuarCultivo(c: Cultivo, ind: IndicadoresNasa, ch: DatosChacrero, nieve: NieveResumen | null): CultivoPuntaje {
  const f: Factor[] = [];
  const riesgos: string[] = [];
  const corr = ch.bajoHeladizo ? CORRECCION_BAJO : 0;

  // 1) Helada en la etapa crítica + largo de la temporada
  let helada = clamp(1 - Math.max(0, c.libreHeladasMin - ind.libreHeladas) / 60);
  let motivoHelada = `Período libre de heladas: ${ind.libreHeladas} días (necesita ${c.libreHeladasMin}) [NASA POWER]`;
  if (c.ventanaCritica) {
    const p = probHeladaVentana(ind, c.ventanaCritica.desde, c.ventanaCritica.hasta, c.umbralHelada, corr);
    if (p !== null) {
      const red = REDUCCION_DEFENSA[ch.defensaHeladas ?? "ninguna"];
      const pEf = p * red;
      helada = Math.min(helada, clamp(1 - pEf * c.sensibilidad * 1.6));
      motivoHelada = `Helada ≤ ${c.umbralHelada} °C en ${c.ventanaCritica.etapa} (${fechaCorta(c.ventanaCritica.desde)}–${fechaCorta(c.ventanaCritica.hasta)}): ${pct(p)} de los años${corr ? " (con corrección por bajo)" : ""} [NASA POWER]`;
      if (red < 1) motivoHelada += `; tu defensa lo baja a ~${pct(pEf)} [Productor]`;
      if (pEf >= 0.2) riesgos.push(`Helada en ${c.ventanaCritica.etapa}: ${pct(pEf)} de los años`);
    }
  }
  f.push({ id: "helada", nombre: "Heladas", valor: helada, peso: PESOS.helada, motivo: motivoHelada });

  // 2) Agua: necesidad de la temporada vs. lo que entrega el sistema (afectado por la nieve)
  const necesidad = necesidadTemporada(c, ind.mensual);
  const sistema = ch.riego ?? REGION.riego.sistemaDefault;
  const factorNieve = nieve ? clamp(0.85 + 0.15 * nieve.indice, 0.7, 1.05) : 1;
  let oferta = REGION.riego.dotacionBrutaMm * EFICIENCIA[sistema] * factorNieve + (ch.pozo ? 200 : 0);
  if (c.tipo === "anual" && (ch.turnoDias ?? REGION.riego.turnoDefaultDias) > 10 && sistema !== "goteo") oferta *= 0.85;
  const agua = necesidad > 0 ? clamp(oferta / necesidad) : 1;
  f.push({
    id: "agua", nombre: "Agua", valor: agua, peso: PESOS.agua,
    motivo: `Necesita ~${Math.round(necesidad)} mm netos por temporada; con ${sistema} llegan ~${Math.round(oferta)} mm útiles${nieve ? ` (nieve al ${pct(nieve.indice)})` : ""} [NASA POWER${nieve ? " + nieve" : ""}]`,
  });
  if (agua < 0.75) riesgos.push("Agua justa para este cultivo: conviene el goteo");

  // 3) Horas de frío
  let frio = 1;
  let motivoFrio = "No necesita horas de frío";
  if (c.horasFrio) {
    const { min, opt } = c.horasFrio;
    frio = ind.horasFrio >= min ? clamp(0.6 + (0.4 * (ind.horasFrio - min)) / Math.max(1, opt - min)) : clamp((0.6 * ind.horasFrio) / min);
    motivoFrio = `Tu zona acumula ~${ind.horasFrio} horas de frío (necesita ${min}–${opt}) [NASA POWER]`;
    if (ind.horasFrio < min) riesgos.push("Pocas horas de frío: brotación despareja");
  }
  f.push({ id: "frio", nombre: "Frío invernal", valor: frio, peso: PESOS.frio, motivo: motivoFrio });

  // 4) Calor (grados-día)
  let calor = 1;
  let motivoCalor = `Grados-día de la temporada: ${ind.gdd10} [NASA POWER]`;
  if (c.gddMin) {
    calor = clamp(ind.gdd10 / c.gddMin) ** 1.5;
    motivoCalor = `Grados-día (base 10 °C): ${ind.gdd10} de ${c.gddMin} necesarios [NASA POWER]`;
    if (calor < 0.8) riesgos.push("Calor justo para madurar bien");
  }
  f.push({ id: "calor", nombre: "Calor", valor: calor, peso: PESOS.calor, motivo: motivoCalor });

  // 5) Suelo
  const tablaSal = { alta: { no: 1, algo: 1, mucha: 0.8 }, media: { no: 1, algo: 0.8, mucha: 0.5 }, baja: { no: 1, algo: 0.6, mucha: 0.3 } };
  let suelo = tablaSal[c.salinidad][ch.salinidad ?? "no"];
  const partes: string[] = [];
  if (ch.salinidad && ch.salinidad !== "no") partes.push(`salitre ${ch.salinidad} (tolerancia ${c.salinidad})`);
  if (ch.napaAlta) {
    suelo *= c.raizProfunda ? 0.6 : 0.85;
    partes.push("napa alta");
  }
  f.push({
    id: "suelo", nombre: "Suelo", valor: suelo, peso: PESOS.suelo,
    motivo: partes.length ? `Tu suelo: ${partes.join(", ")} [Productor]` : "Sin problemas de suelo informados [Productor]",
  });
  if (suelo < 0.7) riesgos.push("El suelo limita: conviene un análisis de suelo");

  // 6) Plazo y economía
  const plazo = ch.plazoAnios === null ? 1 : c.aniosProduccion <= ch.plazoAnios ? 1 : clamp(1 - 0.15 * (c.aniosProduccion - ch.plazoAnios), 0.4);
  f.push({
    id: "plazo", nombre: "Plazo", valor: plazo, peso: PESOS.plazo,
    motivo: c.aniosProduccion ? `Empieza a producir en ~${c.aniosProduccion} años${ch.plazoAnios !== null ? ` (vos querés ${ch.plazoAnios})` : ""}` : "Cosecha en la misma temporada",
  });
  const eco = ch.presupuesto === "bajo" ? { alta: 0.5, media: 0.8, baja: 1 }[c.inversion] : ch.presupuesto === "medio" && c.inversion === "alta" ? 0.8 : 1;
  f.push({ id: "economico", nombre: "Inversión", valor: eco, peso: PESOS.economico, motivo: `Inversión ${c.inversion}${ch.presupuesto ? `, tu presupuesto es ${ch.presupuesto}` : ""}` });

  const puntaje = Math.round(100 * f.reduce((s, x) => s * Math.max(0.01, x.valor) ** x.peso, 1));
  const adaptaciones = [...c.adaptaciones];
  if (sistema !== "goteo" && agua < 0.9) adaptaciones.unshift("Pasar a riego por goteo");
  if (ch.bajoHeladizo && c.ventanaCritica) adaptaciones.unshift("Plantarlo en la parte alta de la chacra, no en el bajo");

  return {
    id: c.id, nombre: c.nombre, emoji: c.emoji, puntaje, semaforo: nivelPuntaje(puntaje),
    factores: f, riesgos, adaptaciones: [...new Set(adaptaciones)].slice(0, 4), aniosProduccion: c.aniosProduccion, inversion: c.inversion,
  };
}

export function rankingCultivos(ind: IndicadoresNasa, ch: DatosChacrero, nieve: NieveResumen | null): CultivoPuntaje[] {
  return CULTIVOS.map((c) => puntuarCultivo(c, ind, ch, nieve)).sort((a, b) => b.puntaje - a.puntaje);
}
