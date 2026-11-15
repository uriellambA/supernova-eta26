"use client";
// "How effective will this combination be, and why": shown on the dashboard and in the action plan PDF.
import type { Effectiveness } from "@/lib/effectiveness";
import { Reveal } from "./ui";

const LEVEL = { high: "Very effective", medium: "Effective", low: "Little gain" } as const;
const CONF = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" } as const;
const tone = (l: "high" | "medium" | "low") => (l === "high" ? "bg-green-bg text-green-fg" : l === "medium" ? "bg-amber-bg text-amber-fg" : "bg-red-bg text-red-fg");

export function EffectivenessView({ e, name, print = false }: { e: Effectiveness; name: string; print?: boolean }) {
  const ordered = [...e.aspects].sort((a, b) => b.gain - a.gain);
  return (
    <div className={print ? "" : "grid gap-6 lg:grid-cols-12"}>
      <div className={print ? "flex flex-wrap items-end gap-6" : "lg:col-span-4"}>
        <div>
          <div className="font-serif text-7xl leading-none print:text-5xl">{e.score}<span className="text-2xl text-muted">%</span></div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone(e.level)}`}>{LEVEL[e.level]}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone(e.confidence.level)}`}>{CONF[e.confidence.level]}</span>
          </div>
        </div>
        <p className={`text-sm text-ink-2 ${print ? "max-w-md" : "mt-4"}`}>
          {e.same
            ? `Your current rotation is already the best option for this farm: the plan keeps it and adds the improvements below.`
            : `"${name}" improves ${e.improved} of ${e.aspects.length} aspects compared with what you do today.`}
        </p>
        {!print && <p className="mt-2 text-xs text-muted">Effectiveness combines how well the rotation fits your field (climate, soil, water and your priorities) with how much it improves on today. Confidence depends on how much of the data is measured on your own farm.</p>}
      </div>

      <div className={print ? "mt-3" : "lg:col-span-8"}>
        <div className="grid gap-2 sm:grid-cols-2 print:grid-cols-2">
          {ordered.map((a) => (
            <div key={a.id} className="rounded-xl border border-line p-3 print:break-inside-avoid print:p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{a.name}</span>
                <span className={`text-xs font-semibold tabular-nums ${a.gain > 0.02 ? "text-green-fg" : a.gain < -0.02 ? "text-red-fg" : "text-muted"}`}>
                  {a.gain > 0.02 ? "▲ better" : a.gain < -0.02 ? "▼ worse" : "= same"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs tabular-nums text-muted">
                <span>{`Today ${a.before}`}</span><span>→</span><span className="font-medium text-ink">{a.after}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className={`h-full rounded-full ${a.gain >= 0 ? "bg-green-fg" : "bg-red-fg"}`} style={{ width: `${Math.max(4, Math.abs(a.gain) * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-ink-2">{a.why}</p>
              <p className="mt-0.5 text-[11px] text-subtle">{`When: ${a.when}`}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <div className="text-xs font-semibold">Why we trust it</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-ink-2">{e.confidence.based.map((x) => <li key={x}>{x}</li>)}</ul>
            {e.confidence.toImprove.length > 0 && (
              <>
                <div className="mt-2 text-xs font-semibold">To make it more precise</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted">{e.confidence.toImprove.map((x) => <li key={x}>{x}</li>)}</ul>
              </>
            )}
          </div>
          {e.watch.length > 0 && (
            <div>
              <div className="text-xs font-semibold">What could make it less effective</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-ink-2">{e.watch.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EffectivenessCard({ e, name }: { e: Effectiveness; name: string }) {
  return (
    <Reveal className="rounded-2xl border border-line bg-surface p-6 md:col-span-6 lg:col-span-12">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">How effective will it be?</div>
      <h2 className="mt-1 font-serif text-3xl leading-tight">{`${name}: what changes on your farm and why`}</h2>
      <div className="mt-5"><EffectivenessView e={e} name={name} /></div>
    </Reveal>
  );
}
