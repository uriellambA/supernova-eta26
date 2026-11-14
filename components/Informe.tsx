import { APP_NAME } from "@/config/app";
import { fechaCorta } from "@/lib/agro";
import type { calcularRiego } from "@/lib/riego";
import type { Luz } from "@/lib/semaforo";
import type { CultivoPuntaje, DatosChacrero, IndicadoresNasa, NieveResumen, RecomendacionIA } from "@/lib/types";
import { CalendarioHeladas } from "./CalendarioHeladas";
import { ICONO_NIVEL } from "./ui";

/** Vista solo para imprimir / guardar como PDF (window.print). */
export function Informe(p: {
  lugar: string; lat: number; lon: number; ch: DatosChacrero; luces: Luz[]; nasa: IndicadoresNasa | null;
  ranking: CultivoPuntaje[] | null; reco: RecomendacionIA | null; riego: ReturnType<typeof calcularRiego> | null;
  nieve: NieveResumen | null; cultivoRiego: string;
}) {
  const iaPorId = new Map(p.reco?.recomendaciones.map((r) => [r.id, r]) ?? []);
  return (
    <div className="hidden text-[12px] text-black print:block">
      <div className="flex items-end justify-between border-b-2 border-emerald-700 pb-2">
        <div>
          <div className="text-xl font-black">🛰️ {APP_NAME} — Informe de chacra</div>
          <div>📍 {p.lugar} · {p.lat.toFixed(3)}, {p.lon.toFixed(3)}{p.ch.superficieHa ? ` · ${p.ch.superficieHa} ha` : ""}</div>
        </div>
        <div className="text-right">{new Date().toLocaleDateString("es-AR", { dateStyle: "long" })}</div>
      </div>

      <h2 className="mt-3 text-sm font-bold">🚦 Estado de hoy</h2>
      <ul>{p.luces.map((l) => <li key={l.id}>{ICONO_NIVEL[l.nivel]} <b>{l.titulo}:</b> {l.texto}</li>)}</ul>

      {p.reco?.resumenVoz && <p className="mt-2 rounded border border-slate-300 p-2">{p.reco.resumenVoz}</p>}

      {p.ranking && (
        <>
          <h2 className="mt-3 text-sm font-bold">✨ Cultivos recomendados</h2>
          <table className="w-full border-collapse">
            <thead><tr className="border-b text-left"><th>#</th><th>Cultivo</th><th>Puntaje</th><th>Por qué / riesgos</th></tr></thead>
            <tbody>
              {p.ranking.slice(0, 5).map((r, i) => {
                const ia = iaPorId.get(r.id);
                return (
                  <tr key={r.id} className="border-b align-top">
                    <td className="pr-2">{i + 1}</td>
                    <td className="pr-2">{r.emoji} {r.nombre}</td>
                    <td className="pr-2">{ICONO_NIVEL[r.semaforo]} {r.puntaje}</td>
                    <td>{(ia?.porQue ?? r.factores.slice(0, 2).map((f) => f.motivo)).join(" · ")}{r.riesgos.length ? ` — ⚠️ ${r.riesgos.join("; ")}` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {p.nasa && (
        <div className="mt-3 break-inside-avoid">
          <h2 className="text-sm font-bold">🧊 Calendario de heladas (NASA POWER {p.nasa.periodo.join("–")})</h2>
          <p>Última helada promedio: <b>{fechaCorta(p.nasa.ultimaHeladaMedia)}</b> · 4 de cada 5 años antes del <b>{fechaCorta(p.nasa.ultimaHeladaP80)}</b> · período libre de heladas {p.nasa.libreHeladas} días · {p.nasa.horasFrio} horas de frío · {p.nasa.gdd10} grados-día.</p>
          <CalendarioHeladas ind={p.nasa} bajo={!!p.ch.bajoHeladizo} compacto />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-4 break-inside-avoid">
        {p.riego && (
          <div>
            <h2 className="text-sm font-bold">💧 Riego ({p.cultivoRiego})</h2>
            <p>Próximo turno ({p.riego.diasCalculados} días): aplicar <b>{p.riego.brutaTurno} mm</b> (~{p.riego.m3Turno.toLocaleString("es-AR")} m³).</p>
            {p.riego.temporada && <p>Temporada: {p.riego.temporada.m3Sistema.toLocaleString("es-AR")} m³ con tu sistema vs. {p.riego.temporada.m3Goteo.toLocaleString("es-AR")} m³ con goteo.</p>}
          </div>
        )}
        {p.nieve && (
          <div>
            <h2 className="text-sm font-bold">🏔️ Nieve en la cordillera</h2>
            <p>Índice: <b>{Math.round(p.nieve.indice * 100)} %</b> de lo normal ({p.nieve.cuencas.map((c) => `${c.nombre}: ${Math.round(c.pct * 100)} %`).join("; ")}).</p>
          </div>
        )}
      </div>

      <p className="mt-4 border-t pt-2 text-[10px] text-slate-600">
        Fuentes: NASA POWER (LaRC), NASA MODIS (ORNL DAAC, GIBS), Open-Meteo, reanálisis ERA5 y datos aportados por el productor. Puntajes calculados con reglas agroclimáticas orientativas;
        explicación generada con IA. Orientativo: consultar con INTA Alto Valle o un ingeniero agrónomo.
      </p>
    </div>
  );
}
