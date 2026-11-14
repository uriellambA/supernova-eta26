"use client";
import { useState } from "react";
import { CULTIVOS } from "@/config/cultivos/alto-valle";
import { fechaCorta } from "@/lib/agro";
import { CORRECCION_BAJO } from "@/lib/semaforo";
import type { IndicadoresNasa } from "@/lib/types";

const COLORES = [
  { max: -2, color: "#7f1d1d", nombre: "≤ −2 °C (daña flores)" },
  { max: 0, color: "#ef4444", nombre: "−2 a 0 °C (helada)" },
  { max: 2, color: "#facc15", nombre: "0 a 2 °C (riesgo)" },
  { max: Infinity, color: "#dcefe3", nombre: "> 2 °C" },
];
const color = (t: number | null) => (t === null ? "#f1f5f9" : COLORES.find((c) => t <= c.max)!.color);

export function CalendarioHeladas({ ind, bajo = false, compacto = false }: { ind: IndicadoresNasa; bajo?: boolean; compacto?: boolean }) {
  const [corregir, setCorregir] = useState(bajo);
  const [cultivoId, setCultivoId] = useState("peral");
  const { anios, dias, tmin } = ind.calendario;
  const corr = corregir ? CORRECCION_BAJO : 0;
  const cw = 8, ch = 12, izq = 40, arriba = 18;
  const ancho = izq + dias.length * cw + 4;
  const alto = arriba + anios.length * ch + 4;
  const cultivo = CULTIVOS.find((c) => c.id === cultivoId);
  const v = cultivo?.ventanaCritica;
  const xDe = (md: string) => {
    const i = dias.findIndex((d) => d >= md);
    return izq + (i === -1 ? dias.length : i) * cw;
  };
  const meses = [
    { md: "09-01", n: "Septiembre" },
    { md: "10-01", n: "Octubre" },
    { md: "11-01", n: "Noviembre" },
  ];
  const conHelada = tmin.filter((fila) => fila.some((t, i) => t !== null && t + corr <= 0 && dias[i] > "10-10")).length;

  return (
    <div>
      {!compacto && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm print:hidden">
          <label className="flex items-center gap-2">
            Ver floración de
            <select className="rounded-lg border border-slate-300 px-2 py-1" value={cultivoId} onChange={(e) => setCultivoId(e.target.value)}>
              {CULTIVOS.filter((c) => c.ventanaCritica).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nombre.split("(")[0]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={corregir} onChange={(e) => setCorregir(e.target.checked)} className="h-4 w-4 accent-emerald-700" />
            Mi chacra está en un bajo ({CORRECCION_BAJO} °C)
          </label>
        </div>
      )}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full min-w-[560px]" role="img" aria-label="Calendario de heladas de primavera">
          {meses.map((m) => (
            <g key={m.md}>
              <text x={xDe(m.md) + 2} y={11} fontSize={10} fill="#475569">{m.n}</text>
              <line x1={xDe(m.md)} x2={xDe(m.md)} y1={arriba - 4} y2={alto} stroke="#94a3b8" strokeWidth={0.6} />
            </g>
          ))}
          {anios.map((a, k) => (
            <g key={a}>
              <text x={izq - 4} y={arriba + k * ch + ch - 3} fontSize={9} textAnchor="end" fill="#475569">{a}</text>
              {dias.map((d, i) => {
                const t = tmin[k][i];
                const tc = t === null ? null : +(t + corr).toFixed(1);
                return (
                  <rect key={d} x={izq + i * cw} y={arriba + k * ch} width={cw - 0.8} height={ch - 1.2} rx={1.2} fill={color(tc)}>
                    <title>{`${fechaCorta(d)}/${a}: ${tc === null ? "sin dato" : `${tc} °C`}`}</title>
                  </rect>
                );
              })}
            </g>
          ))}
          {v && (
            <rect x={xDe(v.desde)} y={arriba - 3} width={xDe(v.hasta) - xDe(v.desde) + cw} height={anios.length * ch + 4} fill="none" stroke="#0f766e" strokeWidth={2} strokeDasharray="4 2" rx={3} />
          )}
          {ind.ultimaHeladaMedia && ind.ultimaHeladaMedia >= "09-01" && ind.ultimaHeladaMedia <= "11-30" && (
            <line x1={xDe(ind.ultimaHeladaMedia) + cw / 2} x2={xDe(ind.ultimaHeladaMedia) + cw / 2} y1={arriba - 4} y2={alto} stroke="#1e3a8a" strokeWidth={2} />
          )}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {COLORES.map((c) => (
          <span key={c.nombre} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c.color }} /> {c.nombre}
          </span>
        ))}
        {v && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-4 rounded-sm border-2 border-dashed border-teal-700" /> {v.etapa} de {cultivo?.nombre.split("(")[0].trim().toLowerCase()}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-0.5 bg-blue-900" /> última helada promedio ({fechaCorta(ind.ultimaHeladaMedia)})
        </span>
      </div>
      <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
        En <b>{conHelada} de los últimos {anios.length} años</b> hubo helada (≤ 0 °C) después del 10 de octubre
        {corregir ? " (con corrección por bajo)" : ""}. En 4 de cada 5 años, la última helada ocurre antes del <b>{fechaCorta(ind.ultimaHeladaP80)}</b>.
      </p>
    </div>
  );
}

export function ProbSemanal({ ind }: { ind: IndicadoresNasa }) {
  const max = 1;
  return (
    <div className="flex h-36 items-end gap-1" role="img" aria-label="Probabilidad semanal de helada">
      {ind.probSemanal.map((s) => (
        <div key={s.inicio} className="flex flex-1 flex-col items-center gap-1" title={`Semana del ${fechaCorta(s.inicio)}: ${Math.round(s.p0 * 100)} % helada, ${Math.round(s.p2 * 100)} % ≤ −2 °C`}>
          <span className="text-[10px] tabular-nums text-slate-600">{Math.round(s.p0 * 100)}%</span>
          <div className="relative w-full rounded-t bg-red-400" style={{ height: `${(s.p0 / max) * 90}px` }}>
            <div className="absolute bottom-0 w-full rounded-t bg-red-900" style={{ height: `${(s.p2 / max) * 90}px` }} />
          </div>
          <span className="text-[9px] text-slate-500">{fechaCorta(s.inicio)}</span>
        </div>
      ))}
    </div>
  );
}
