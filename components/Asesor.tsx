"use client";
import { useEffect, useState } from "react";
import { useOnline } from "@/hooks/useOnline";
import type { ContextoIA } from "@/lib/contexto";
import { explicacionLocal } from "@/lib/contexto";
import type { ClimaResumen, CultivoPuntaje, DatosChacrero, RecomendacionIA } from "@/lib/types";
import { BotonEscuchar } from "./BotonVoz";
import { Aviso, Fuente, ICONO_NIVEL, botonPrimario, botonSecundario } from "./ui";

const COLOR_BARRA = (v: number) => (v >= 0.7 ? "bg-emerald-500" : v >= 0.4 ? "bg-amber-400" : "bg-red-500");
const BORDE = { verde: "border-emerald-400", amarillo: "border-amber-400", rojo: "border-red-400" } as const;

function TarjetaCultivo({ r, ia, pos }: { r: CultivoPuntaje; ia?: RecomendacionIA["recomendaciones"][number]; pos: number }) {
  const [abierto, setAbierto] = useState(false);
  const porQue = ia?.porQue?.length
    ? ia.porQue
    : [...r.factores].sort((a, b) => b.valor * b.peso - a.valor * a.peso).slice(0, 2).map((f) => f.motivo);
  return (
    <article className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${BORDE[r.semaforo]}`}>
      <div className="flex items-start gap-3">
        <div className="text-4xl" aria-hidden>{r.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-500">#{pos}</div>
          <h4 className="text-lg font-bold leading-tight text-slate-900">{ia?.cultivo || r.nombre}</h4>
          <div className="text-xs text-slate-500">
            {r.aniosProduccion ? `Produce en ~${r.aniosProduccion} años` : "Cosecha en la temporada"} · inversión {r.inversion}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tabular-nums text-slate-900">{r.puntaje}</div>
          <div className="text-xs">{ICONO_NIVEL[r.semaforo]} de 100</div>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <div>
          <b className="text-emerald-800">✅ Por qué</b>
          <ul className="list-disc pl-5 text-slate-700">{porQue.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        {(ia?.riesgos ?? r.riesgos).length > 0 && (
          <div>
            <b className="text-red-800">⚠️ Riesgos</b>
            <ul className="list-disc pl-5 text-slate-700">{(ia?.riesgos ?? r.riesgos).map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}
        <div>
          <b className="text-sky-800">🛠️ Cómo adaptarte</b>
          <ul className="list-disc pl-5 text-slate-700">{(ia?.adaptaciones?.length ? ia.adaptaciones : r.adaptaciones).map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        {ia?.calendario && <p className="text-slate-700">📅 {ia.calendario}</p>}
      </div>
      <button className="mt-3 text-sm font-semibold text-emerald-800 underline" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
        {abierto ? "Ocultar el cálculo" : "Ver cómo se calculó el puntaje"}
      </button>
      {abierto && (
        <ul className="mt-2 space-y-2">
          {r.factores.map((f) => (
            <li key={f.id} className="text-xs">
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 font-semibold text-slate-700">{f.nombre}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span className={`block h-full ${COLOR_BARRA(f.valor)}`} style={{ width: `${Math.round(f.valor * 100)}%` }} />
                </span>
                <span className="w-16 shrink-0 text-right tabular-nums text-slate-500">{Math.round(f.valor * 100)} · {Math.round(f.peso * 100)}%</span>
              </div>
              <div className="ml-24 pl-2 text-slate-500">{f.motivo}</div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function Asesor({
  ranking, armar, clima, ch, reco, setReco, onCompartir, listo,
}: {
  ranking: CultivoPuntaje[] | null;
  armar: () => ContextoIA | null;
  clima: ClimaResumen | null;
  ch: DatosChacrero;
  reco: RecomendacionIA | null;
  setReco: (r: RecomendacionIA) => void;
  onCompartir: () => void;
  listo: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verTodos, setVerTodos] = useState(false);
  const online = useOnline();

  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [abierto]);

  async function pedir() {
    const ctx = armar();
    if (!ctx || !ranking) return;
    setAbierto(true);
    setCargando(true);
    setAviso(null);
    try {
      if (!online) throw new Error("Sin conexión: te mostramos la recomendación calculada en el teléfono.");
      const res = await fetch("/api/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? `Error ${res.status}`);
      setReco(j as RecomendacionIA);
    } catch (e) {
      setReco(explicacionLocal(ctx, ranking, clima, ch));
      setAviso(`${(e as Error).message} Usamos el motor de reglas (los puntajes son los mismos).`);
    } finally {
      setCargando(false);
    }
  }

  const porId = new Map(ranking?.map((r) => [r.id, r]) ?? []);
  const lista = reco?.recomendaciones.filter((x) => porId.has(x.id)) ?? [];
  const mostrados = lista.length ? lista.map((x) => ({ r: porId.get(x.id)!, ia: x })) : (ranking ?? []).slice(0, 4).map((r) => ({ r, ia: undefined }));

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[1100] flex justify-center p-3 print:hidden">
        <button className={`${botonPrimario} w-full max-w-md bg-gradient-to-r from-emerald-700 to-sky-700 py-4 text-lg shadow-xl`} onClick={() => (reco && !abierto ? setAbierto(true) : pedir())} disabled={!listo}>
          ✨ ¿Qué me conviene cultivar acá?
        </button>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-slate-900/50 sm:items-center print:hidden" onClick={() => setAbierto(false)}>
          <div role="dialog" aria-modal="true" aria-label="Recomendación de cultivos" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-slate-50 p-4 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">✨ Qué te conviene cultivar</h2>
              <button className="ml-auto rounded-full p-2 text-2xl leading-none text-slate-500 hover:bg-slate-200" onClick={() => setAbierto(false)} aria-label="Cerrar">×</button>
            </div>

            {cargando && (
              <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-4 text-slate-600">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                La IA está analizando los datos de NASA, el pronóstico y tu chacra…
              </div>
            )}
            {aviso && <div className="mb-3"><Aviso tipo="alerta">{aviso}</Aviso></div>}

            {reco && !cargando && (
              <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-slate-800">{reco.resumenVoz}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <BotonEscuchar texto={reco.resumenVoz} />
                  <button className={botonSecundario} onClick={onCompartir}>📲 WhatsApp</button>
                  <button className={botonSecundario} onClick={() => window.print()}>📄 PDF</button>
                  <button className={botonSecundario} onClick={pedir}>🔄 Recalcular</button>
                </div>
                {reco.alertaCortoPlazo && <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-900">🥶 {reco.alertaCortoPlazo}</p>}
                {reco.agua && <p className="mt-2 rounded-xl bg-sky-50 p-2 text-sm text-sky-900">🏔️ {reco.agua}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Fuente>{reco.generadoPor === "ia" ? "Explicación: IA (OpenRouter) · puntajes: motor de reglas" : "Motor de reglas (sin IA)"}</Fuente>
                  <span className="text-xs text-slate-500">Confianza: {reco.confianza}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {mostrados.map(({ r, ia }, i) => <TarjetaCultivo key={r.id} r={r} ia={ia} pos={i + 1} />)}
            </div>

            {reco?.datosFaltantes?.length ? (
              <div className="mt-3"><Aviso>📝 Para afinar: {reco.datosFaltantes.join(" · ")} (cargalo en «Mi chacra»)</Aviso></div>
            ) : null}

            {ranking && (
              <div className="mt-4 rounded-2xl bg-white p-4">
                <button className="font-semibold text-slate-800" onClick={() => setVerTodos(!verTodos)} aria-expanded={verTodos}>
                  🚦 Semáforo de todos los cultivos {verTodos ? "▲" : "▼"}
                </button>
                {verTodos && (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {ranking.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
                        <span>{ICONO_NIVEL[r.semaforo]}</span>
                        <span>{r.emoji}</span>
                        <span className="flex-1">{r.nombre}</span>
                        <b className="tabular-nums">{r.puntaje}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p className="mt-4 text-center text-xs text-slate-500">
              Orientativo. Consultá con INTA Alto Valle o un ingeniero agrónomo antes de invertir.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
