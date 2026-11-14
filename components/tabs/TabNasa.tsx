"use client";
import { fechaCorta } from "@/lib/agro";
import type { Estado } from "@/hooks/useRecurso";
import type { IndicadoresNasa, NdviResumen } from "@/lib/types";
import { CalendarioHeladas, ProbSemanal } from "../CalendarioHeladas";
import { GraficoAgua, GraficoNdvi, GraficoTemperaturas } from "../Graficos";
import { Aviso, Cargando, Dato, Fuente, Tarjeta } from "../ui";
import { EstadoDatos } from "../EstadoDatos";

export function TabNasa({ nasa, ndvi, bajo }: { nasa: Estado<IndicadoresNasa>; ndvi: Estado<NdviResumen>; bajo: boolean }) {
  if (nasa.estado === "cargando") return <Cargando texto="Pidiendo 20 años de datos a NASA POWER… (la primera vez puede tardar ~20 s)" />;
  if (!nasa.data) return <Aviso tipo="error">No pudimos obtener los datos de NASA: {nasa.error}</Aviso>;
  const ind = nasa.data;
  return (
    <div className="space-y-4">
      <EstadoDatos estado={nasa} fuente={ind.fuente} simulado={ind.simulado} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Dato etiqueta="Última helada (promedio)" valor={fechaCorta(ind.ultimaHeladaMedia)} ayuda={`4 de cada 5 años, antes del ${fechaCorta(ind.ultimaHeladaP80)}`} />
        <Dato etiqueta="Período libre de heladas" valor={ind.libreHeladas} unidad="días" />
        <Dato etiqueta="Horas de frío (may–ago)" valor={ind.horasFrio} unidad="h" ayuda="Clave para pera, manzana y cereza" />
        <Dato etiqueta="Grados-día (sep–abr)" valor={ind.gdd10} unidad="GD" ayuda="Base 10 °C: calor para madurar" />
        <Dato etiqueta="Lluvia anual" valor={ind.lluviaAnual} unidad="mm" />
        <Dato etiqueta="Evapotranspiración" valor={ind.et0Anual} unidad="mm/año" ayuda="Agua que «pide» la atmósfera" />
        <Dato etiqueta="Años con helada tardía" valor={`${ind.aniosHeladaTardia}/${ind.calendario.anios.length}`} ayuda="Helada después del 10/10" />
        <Dato
          etiqueta="Cambio de temperatura"
          valor={ind.tendencia ? `${ind.tendencia.dif > 0 ? "+" : ""}${ind.tendencia.dif}` : "—"}
          unidad="°C"
          ayuda={`Mitad reciente vs. mitad anterior de ${ind.periodo.join("–")}`}
        />
      </div>

      <Tarjeta titulo="🧊 Calendario de heladas de primavera" extra={<Fuente>NASA POWER · T2M_MIN diaria</Fuente>}>
        <p className="mb-3 text-sm text-slate-600">
          Cada fila es un año y cada cuadrito, un día. En rojo, las noches con helada. El recuadro punteado marca cuándo florece el cultivo.
        </p>
        <CalendarioHeladas ind={ind} bajo={bajo} />
      </Tarjeta>

      <Tarjeta titulo="📊 Probabilidad de helada por semana" extra={<Fuente>NASA POWER</Fuente>}>
        <ProbSemanal ind={ind} />
        <p className="mt-2 text-xs text-slate-500">Rojo claro: helada (≤ 0 °C). Rojo oscuro: helada fuerte (≤ −2 °C).</p>
      </Tarjeta>

      <div className="grid gap-4 md:grid-cols-2">
        <Tarjeta titulo="🌡️ Temperaturas por mes" extra={<Fuente>NASA POWER</Fuente>}>
          <GraficoTemperaturas mensual={ind.mensual} />
        </Tarjeta>
        <Tarjeta titulo="💧 Lluvia vs. evapotranspiración" extra={<Fuente>NASA POWER</Fuente>}>
          <GraficoAgua mensual={ind.mensual} />
          <p className="mt-1 text-xs text-slate-500">
            <span className="text-amber-600">■</span> ET0 (agua que se evapora) · <span className="text-sky-600">■</span> lluvia. La diferencia la pone el riego.
          </p>
        </Tarjeta>
      </div>

      <Tarjeta titulo="🌱 Verdor del lote (NDVI)" extra={<Fuente>NASA MODIS MOD13Q1 · 250 m</Fuente>}>
        {ndvi.estado === "cargando" && <Cargando texto="Pidiendo NDVI a MODIS…" />}
        {ndvi.estado === "error" && <Aviso tipo="alerta">NDVI no disponible ahora: {ndvi.error}</Aviso>}
        {ndvi.data && ndvi.data.serie.length > 1 && (
          <>
            <GraficoNdvi serie={ndvi.data.serie} />
            {ndvi.data.ultimo && (
              <p className="mt-2 text-sm text-slate-700">
                Último dato ({ndvi.data.ultimo.fecha}): <b>NDVI {ndvi.data.ultimo.ndvi}</b>
                {ndvi.data.anioAnterior && (
                  <>
                    {" "}— hace un año: <b>{ndvi.data.anioAnterior.ndvi}</b>{" "}
                    {ndvi.data.ultimo.ndvi >= ndvi.data.anioAnterior.ndvi ? "🟢 más verde que el año pasado" : "🟡 menos verde que el año pasado"}
                  </>
                )}
              </p>
            )}
            {ndvi.data.simulado && <Aviso tipo="alerta">⚠️ NDVI SIMULADO (modo prueba)</Aviso>}
          </>
        )}
      </Tarjeta>

      <Aviso>
        ℹ️ NASA POWER trabaja con una grilla de ~50 km: muestra el clima de la zona, no de cada chacra. Por eso sumamos lo que vos sabés
        (por ejemplo, si tu bajo se hiela más) en la pestaña «Mi chacra». Celda: {ind.celda.lat}, {ind.celda.lon} · período {ind.periodo.join("–")}.
      </Aviso>
    </div>
  );
}
