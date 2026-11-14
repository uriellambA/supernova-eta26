"use client";
import type { Estado } from "@/hooks/useRecurso";
import { CORRECCION_BAJO } from "@/lib/semaforo";
import type { ClimaResumen } from "@/lib/types";
import { EstadoDatos } from "../EstadoDatos";
import { Aviso, Cargando, Tarjeta } from "../ui";

export function TabClima({ clima, bajo }: { clima: Estado<ClimaResumen>; bajo: boolean }) {
  if (clima.estado === "cargando") return <Cargando texto="Pidiendo el pronóstico a Open-Meteo…" />;
  if (!clima.data) return <Aviso tipo="error">No pudimos obtener el pronóstico: {clima.error}</Aviso>;
  const c = clima.data;
  const prox = c.dias.filter((d) => !d.pasado);
  const corr = bajo ? CORRECCION_BAJO : 0;
  return (
    <div className="space-y-4">
      <EstadoDatos estado={clima} fuente={c.fuente} simulado={c.simulado} />
      <Tarjeta titulo="🌦️ Próximos 16 días" extra={c.elevacion !== null ? <span className="text-xs text-slate-500">Altitud {Math.round(c.elevacion)} m (SRTM)</span> : null}>
        {bajo && <p className="mb-2 text-xs text-slate-600">Las mínimas incluyen la corrección de tu bajo ({CORRECCION_BAJO} °C).</p>}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {prox.map((d) => {
            const tmin = +(d.tmin + corr).toFixed(1);
            const helada = tmin <= 0, riesgo = tmin <= 2;
            const f = new Date(d.fecha + "T12:00:00");
            return (
              <div key={d.fecha} className={`w-24 shrink-0 rounded-2xl border-2 p-2 text-center ${helada ? "border-red-400 bg-red-50" : riesgo ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
                <div className="text-xs font-semibold capitalize text-slate-600">{f.toLocaleDateString("es-AR", { weekday: "short" })}</div>
                <div className="text-xs text-slate-500">{f.toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}</div>
                <div className="my-1 text-xl">{helada ? "🥶" : d.lluvia > 2 ? "🌧️" : d.rafagas > 60 ? "💨" : "☀️"}</div>
                <div className="text-sm font-bold text-orange-600">{Math.round(d.tmax)}°</div>
                <div className={`text-sm font-bold ${helada ? "text-red-700" : "text-sky-700"}`}>{tmin}°</div>
                {helada && d.horaMin && <div className="text-[10px] font-semibold text-red-700">mín {d.horaMin}</div>}
                <div className="mt-1 text-[11px] text-slate-600">💧 {d.lluvia} mm</div>
                <div className="text-[11px] text-slate-600">💨 {Math.round(d.rafagas)}</div>
                <div className="text-[11px] text-amber-700">ET0 {d.et0}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-500">Temperaturas en °C · lluvia en mm · ráfagas en km/h · ET0 (mm/día) = agua que pierde el cultivo de referencia.</p>
      </Tarjeta>
      <Tarjeta titulo="🧭 Qué hacer esta semana">
        <ul className="space-y-2 text-sm text-slate-800">
          {prox.slice(0, 7).map((d) => {
            const t = +(d.tmin + corr).toFixed(1);
            const acciones: string[] = [];
            if (t <= 0) acciones.push(`🥶 Helada de ${t} °C${d.horaMin ? ` cerca de las ${d.horaMin}` : ""}: preparar la defensa desde la medianoche.`);
            if (d.rafagas > 60) acciones.push(`💨 Ráfagas de ${Math.round(d.rafagas)} km/h: no pulverizar.`);
            if (d.lluvia > 10) acciones.push(`🌧️ ${d.lluvia} mm de lluvia: se puede postergar el riego.`);
            if (!acciones.length) return null;
            return (
              <li key={d.fecha}>
                <b className="capitalize">{new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric" })}:</b> {acciones.join(" ")}
              </li>
            );
          })}
          {prox.slice(0, 7).every((d) => d.tmin + corr > 0 && d.rafagas <= 60 && d.lluvia <= 10) && <li>✅ Semana tranquila: sin heladas, viento fuerte ni lluvias importantes.</li>}
        </ul>
      </Tarjeta>
    </div>
  );
}
