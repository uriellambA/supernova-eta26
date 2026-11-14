import { REGION } from "@/config/regions/alto-valle";
import { fechaCorta } from "./agro";
import { CORRECCION_BAJO } from "./semaforo";
import type { ClimaResumen, CultivoPuntaje, DatosChacrero, IndicadoresNasa, NdviResumen, NieveResumen, RecomendacionIA } from "./types";

export type ContextoIA = {
  lugar: string;
  lat: number;
  lon: number;
  nasa: Record<string, unknown>;
  chacrero: Partial<DatosChacrero>;
  pronostico: Record<string, unknown> | null;
  nieve: Record<string, unknown> | null;
  ranking: { id: string; nombre: string; puntaje: number; semaforo: string; factores: string[]; riesgos: string[]; adaptaciones: string[] }[];
};

/** Contexto compacto (pocos tokens) que se envía a la IA. */
export function armarContexto(
  lugar: string, lat: number, lon: number, ind: IndicadoresNasa, ch: DatosChacrero,
  clima: ClimaResumen | null, nieve: NieveResumen | null, ndvi: NdviResumen | null, ranking: CultivoPuntaje[],
): ContextoIA {
  const prox = clima?.dias.filter((d) => !d.pasado).slice(0, 7) ?? [];
  const peor = prox.length ? prox.reduce((a, b) => (b.tmin < a.tmin ? b : a)) : null;
  const chLimpio = Object.fromEntries(Object.entries(ch).filter(([, v]) => v !== null && v !== "")) as Partial<DatosChacrero>;
  return {
    lugar: `${lugar} (${REGION.nombre})`,
    lat, lon,
    nasa: {
      periodo: ind.periodo.join("-"),
      ultimaHeladaMedia: fechaCorta(ind.ultimaHeladaMedia),
      ultimaHeladaEn4de5Anios: fechaCorta(ind.ultimaHeladaP80),
      aniosConHeladaDespuesDel10Oct: `${ind.aniosHeladaTardia} de ${ind.calendario.anios.length}`,
      periodoLibreHeladasDias: ind.libreHeladas,
      horasFrio: ind.horasFrio,
      gradosDiaBase10: ind.gdd10,
      lluviaAnualMm: ind.lluviaAnual,
      et0AnualMm: ind.et0Anual,
      tendenciaTempMedia: ind.tendencia ? `${ind.tendencia.dif > 0 ? "+" : ""}${ind.tendencia.dif} °C entre mitades del período` : null,
      ndviUltimo: ndvi?.ultimo ? `${ndvi.ultimo.ndvi} (${ndvi.ultimo.fecha})` : null,
      ndviHaceUnAnio: ndvi?.anioAnterior?.ndvi ?? null,
      nota: ch.bajoHeladizo ? `Bajo heladizo: se aplicó corrección de ${CORRECCION_BAJO} °C` : undefined,
    },
    chacrero: chLimpio,
    pronostico: peor
      ? {
          minimaProx7Dias: `${peor.tmin} °C el ${peor.fecha}${peor.horaMin ? ` a las ${peor.horaMin}` : ""}`,
          rafagaMaxProx3Dias: Math.max(...prox.slice(0, 3).map((d) => d.rafagas)),
          lluviaProx7DiasMm: +prox.reduce((s, d) => s + d.lluvia, 0).toFixed(1),
          et0Prox7DiasMm: +prox.reduce((s, d) => s + d.et0, 0).toFixed(1),
        }
      : null,
    nieve: nieve
      ? { indicePctDeLoNormal: Math.round(nieve.indice * 100), cuencas: nieve.cuencas.map((c) => `${c.nombre}: ${Math.round(c.pct * 100)} %`), fuente: nieve.fuente }
      : null,
    ranking: ranking.slice(0, 8).map((r) => ({
      id: r.id, nombre: r.nombre, puntaje: r.puntaje, semaforo: r.semaforo,
      factores: r.factores.map((f) => `${f.nombre} ${Math.round(f.valor * 100)}/100: ${f.motivo}`),
      riesgos: r.riesgos, adaptaciones: r.adaptaciones,
    })),
  };
}

/** Explicación SIN IA (offline o sin clave): se arma con el ranking determinista. */
export function explicacionLocal(ctx: ContextoIA, ranking: CultivoPuntaje[], clima: ClimaResumen | null, ch: DatosChacrero): RecomendacionIA {
  const top = ranking.slice(0, 4);
  const prox = clima?.dias.filter((d) => !d.pasado).slice(0, 7) ?? [];
  const peor = prox.length ? prox.reduce((a, b) => (b.tmin < a.tmin ? b : a)) : null;
  const tPeor = peor ? +(peor.tmin + (ch.bajoHeladizo ? CORRECCION_BAJO : 0)).toFixed(1) : null;
  const alerta = peor && tPeor !== null && tPeor <= 2 ? `Mínima de ${tPeor} °C el ${new Date(peor.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "numeric" })}${peor.horaMin ? ` a las ${peor.horaMin}` : ""} [Open-Meteo]` : null;
  const nieve = ctx.nieve ? Number(ctx.nieve.indicePctDeLoNormal) : null;
  return {
    recomendaciones: top.map((r) => {
      const fuertes = [...r.factores].sort((a, b) => b.valor * b.peso - a.valor * a.peso).slice(0, 2);
      return {
        id: r.id,
        cultivo: r.nombre,
        porQue: fuertes.map((f) => f.motivo),
        riesgos: r.riesgos.length ? r.riesgos : ["Sin riesgos fuertes detectados con los datos disponibles"],
        adaptaciones: r.adaptaciones,
        calendario: r.aniosProduccion ? `Primera cosecha en ~${r.aniosProduccion} años` : "Cultivo de una temporada",
      };
    }),
    alertaCortoPlazo: alerta,
    agua: nieve !== null ? `Nieve en la cordillera al ${nieve} % de lo normal${nieve < 90 ? ": priorizá el goteo y cuidá el turno" : ""}` : null,
    resumenVoz: `Para tu chacra, lo que mejor anda es ${top[0]?.nombre.split("(")[0].trim()}, con ${top[0]?.puntaje} puntos. Le sigue ${top[1]?.nombre.split("(")[0].trim()}, con ${top[1]?.puntaje}.${alerta ? ` Ojo: se viene una mínima de ${tPeor} grados.` : ""}`,
    datosFaltantes: [],
    confianza: "media",
    generadoPor: "reglas",
  };
}
