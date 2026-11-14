import type { ReactNode } from "react";
import type { Nivel } from "@/lib/types";

export const LEVEL_DOT: Record<Nivel, string> = { good: "bg-emerald-400", watch: "bg-amber-400", alert: "bg-rose-500" };
export const LEVEL_TEXT: Record<Nivel, string> = { good: "text-emerald-300", watch: "text-amber-300", alert: "text-rose-300" };
export const LEVEL_RING: Record<Nivel, string> = { good: "border-emerald-500/50", watch: "border-amber-500/50", alert: "border-rose-500/50" };
const LEVEL_WORD: Record<Nivel, string> = { good: "Good", watch: "Watch", alert: "Alert" };

export function Panel({ title, children, right, className = "" }: { title?: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-slate-900/80 p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {title && <h3 className="text-sm font-bold tracking-wide text-slate-100">{title}</h3>}
          {right && <div className="ml-auto">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3" title={hint}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums text-white">
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-slate-400">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</div>}
    </div>
  );
}

export function LevelPill({ level, children }: { level: Nivel; children?: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold ${LEVEL_TEXT[level]}`}>
      <span className={`h-2 w-2 rounded-full ${LEVEL_DOT[level]}`} />
      {children ?? LEVEL_WORD[level]}
    </span>
  );
}

export function Note({ kind = "info", children }: { kind?: "info" | "warn"; children: ReactNode }) {
  const s = kind === "warn" ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : "border-sky-500/20 bg-sky-500/10 text-sky-100";
  return <div className={`rounded-xl border px-3 py-2 text-sm ${s}`}>{children}</div>;
}

export function Spinner({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      {text}
    </div>
  );
}

export function DemoBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300" title="Running with sample data (offline development mode)">Sample data</span>;
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
export const input =
  "w-full rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20";
