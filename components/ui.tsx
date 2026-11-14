import type { ReactNode } from "react";
import type { Nivel } from "@/lib/types";

export const ICONO_NIVEL: Record<Nivel, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴" };
const PALABRA: Record<Nivel, string> = { verde: "Bien", amarillo: "Atención", rojo: "Alerta" };
const ESTILO: Record<Nivel, string> = {
  verde: "border-emerald-300 bg-emerald-50 text-emerald-950",
  amarillo: "border-amber-300 bg-amber-50 text-amber-950",
  rojo: "border-red-300 bg-red-50 text-red-950",
};

export function Semaforo({ nivel, titulo, texto, fuente }: { nivel: Nivel; titulo: string; texto: string; fuente?: string }) {
  return (
    <div className={`rounded-2xl border-2 p-3 ${ESTILO[nivel]}`} role="status">
      <div className="flex items-center gap-2 font-semibold">
        <span aria-hidden className="text-xl">{ICONO_NIVEL[nivel]}</span>
        <span>{titulo}</span>
        <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold uppercase tracking-wide">{PALABRA[nivel]}</span>
      </div>
      <p className="mt-1 text-sm leading-snug">{texto}</p>
      {fuente && <Fuente>{fuente}</Fuente>}
    </div>
  );
}

export function Fuente({ children }: { children: ReactNode }) {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      📡 {children}
    </span>
  );
}

export function Tarjeta({ titulo, children, extra, className = "" }: { titulo?: ReactNode; children: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {(titulo || extra) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {titulo && <h3 className="text-base font-bold text-slate-900">{titulo}</h3>}
          {extra && <div className="ml-auto">{extra}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Dato({ etiqueta, valor, unidad, ayuda }: { etiqueta: string; valor: ReactNode; unidad?: string; ayuda?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3" title={ayuda}>
      <div className="text-xs font-medium text-slate-500">{etiqueta}</div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
        {valor}
        {unidad && <span className="ml-1 text-sm font-medium text-slate-500">{unidad}</span>}
      </div>
      {ayuda && <div className="mt-0.5 text-xs leading-snug text-slate-500">{ayuda}</div>}
    </div>
  );
}

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "alerta" | "error"; children: ReactNode }) {
  const s = { info: "border-sky-200 bg-sky-50 text-sky-900", alerta: "border-amber-300 bg-amber-50 text-amber-900", error: "border-red-200 bg-red-50 text-red-900" }[tipo];
  return <div className={`rounded-xl border px-3 py-2 text-sm ${s}`}>{children}</div>;
}

export function Cargando({ texto = "Cargando datos…" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      {texto}
    </div>
  );
}

export const botonPrimario =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const botonSecundario =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const campo =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30";
