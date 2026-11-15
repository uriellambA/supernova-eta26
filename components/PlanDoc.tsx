"use client";
// Growwy's action plan, laid out to be saved as PDF (A4) or read on screen.
import { Brand } from "./Brand";
import { Pachamama } from "./Pachamama";
import { Calendar, CashChart, FieldMap } from "./growwy/Visuals";
import type { ActionPlan } from "@/lib/plan";
import { METHOD_NAME } from "@/lib/riego";
import { getLang } from "@/lib/i18n";
import type { SistemaRiego } from "@/lib/types";

const SYS: Record<string, string> = { orchard: "Orchard", vegetables: "Vegetables", forage: "Forage", grains: "Grains" };
import { usd } from "@/lib/plan";

const card = "rounded-2xl border border-line bg-surface p-5 print:break-inside-avoid print:rounded-lg print:border-black/20 print:p-3";
const h2 = "font-serif text-2xl leading-tight print:text-lg";
const eyebrow = "text-[11px] font-medium uppercase tracking-[0.1em] text-subtle";

export function PlanDoc({ p }: { p: ActionPlan }) {
  const date = new Date(p.createdAt).toLocaleDateString(getLang() === "es" ? "es-AR" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  const cats = [...new Set(p.materials.map((m) => m.category))];
  const payYear = p.cash.find((c) => c.year > 0 && c.cumulative >= 0)?.year;
  return (
    <article className="mx-auto max-w-4xl space-y-4 print:max-w-none print:space-y-2 print:text-[11px]">
      {/* ---------- cover ---------- */}
      <header className="relative overflow-hidden rounded-2xl border-2 border-ink bg-surface p-6 print:rounded-lg print:p-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <Brand />
            <div className={`${eyebrow} mt-4`}>Action plan by Growwy</div>
            <h1 className="mt-1 font-serif text-4xl leading-tight print:text-3xl">{p.farmName}</h1>
            <p className="mt-1 flex flex-wrap gap-x-1.5 text-sm text-muted [&>span+span]:before:mr-1.5 [&>span+span]:before:content-['·']"><span>{p.place}</span><span>{`${p.areaHa} ha`}</span><span>{SYS[p.system] ?? p.system}</span><span>{`${METHOD_NAME[p.irrigation as SistemaRiego] ?? p.irrigation} irrigation`}</span><span>{date}</span></p>
            <p className="mt-4 font-serif text-xl italic leading-snug text-ink-2 print:text-base">“I listen to the land so that you can decide better. Here is what we agreed, step by step.”</p>
          </div>
          <Pachamama className="h-44 w-auto shrink-0 print:h-32" />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-4 print:grid-cols-4">
          {[
            ["Recommended rotation", p.rotation.name],
            ["Score", `${p.rotation.score} / 100 (today ${p.rotation.currentScore})`],
            ["Investment", usd(p.totals.investment)],
            ["Margin new crops / yr", p.trials.length ? usd(p.totals.trialMargin) : "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2 p-3 print:p-2"><div className="text-[10px] uppercase tracking-[0.08em] text-subtle">{k}</div><div className="mt-0.5 font-semibold leading-snug">{v}</div></div>
          ))}
        </div>
      </header>

      {/* ---------- what and why ---------- */}
      <section className={card}>
        <div className={eyebrow}>1 · What to do</div>
        <h2 className={h2}>{p.rotation.name}</h2>
        <p className="mt-2 text-sm text-ink-2">{p.rotation.idea}</p>
        {p.answer && <p className="mt-2 text-sm">{p.answer}</p>}
        {p.rotation.benefits.length > 0 && <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2 print:grid-cols-2">{p.rotation.benefits.map((b) => <li key={b} className="flex gap-1.5"><span className="text-green-fg">✓</span>{b}</li>)}</ul>}
        <ol className="mt-4 space-y-1.5">
          {p.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-canvas print:h-5 print:w-5">{i + 1}</span>
              <span><b className="text-ink">{s.when}:</b> <span className="text-ink-2">{s.what}</span></span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- distribution ---------- */}
      <section className={`${card} grid gap-4 sm:grid-cols-2 print:grid-cols-2`}>
        <div>
          <div className={eyebrow}>2 · How to divide your field</div>
          <FieldMap plots={p.plots} hedgeM={p.hedgeM} areaHa={p.areaHa} />
        </div>
        <div>
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] text-muted"><tr><th className="font-medium">Plot</th><th className="text-right font-medium">ha</th></tr></thead>
            <tbody>
              {p.plots.map((x) => (
                <tr key={x.id} className="border-t border-line align-top">
                  <td className="py-1.5"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: x.color }} /><span className="font-medium">{x.name}</span><div className="text-xs text-muted">{x.what}</div></td>
                  <td className="py-1.5 text-right tabular-nums">{x.ha}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">{p.plots.some((x) => x.kind === "main" && x.name.startsWith("Plot")) ? "Each plot is one year of the rotation: next year every plot moves to the next step, so the whole cycle runs every season." : "Trials are small on purpose: test, measure and grow what works."}</p>
        </div>
        <div className="sm:col-span-2 print:col-span-2">
          <div className={eyebrow}>Calendar</div>
          <Calendar plots={p.plots} />
        </div>
      </section>

      {/* ---------- materials ---------- */}
      <section className={card}>
        <div className={eyebrow}>3 · Materials and prices</div>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[560px] text-sm print:min-w-0">
            <thead className="text-left text-[11px] text-muted"><tr><th className="font-medium">Item</th><th className="font-medium">When</th><th className="text-right font-medium">Quantity</th><th className="text-right font-medium">Price</th><th className="text-right font-medium">Total</th></tr></thead>
            {cats.map((c) => (
              <tbody key={c}>
                <tr><td colSpan={5} className="pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">{c}</td></tr>
                {p.materials.filter((m) => m.category === c).map((m, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1 pr-2">{m.item}</td>
                    <td className="pr-2 text-xs text-muted">{m.when}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{m.qty.toLocaleString("en-US")} {m.unit}</td>
                    <td className="whitespace-nowrap pl-2 text-right tabular-nums text-muted">{m.unitUsd < 1 ? `USD ${m.unitUsd}` : usd(m.unitUsd)}/{m.unit === "plants" ? "plant" : m.unit === "test" ? "test" : m.unit}</td>
                    <td className="whitespace-nowrap pl-2 text-right font-medium tabular-nums">{usd(m.totalUsd)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot>
              <tr className="border-t-2 border-ink"><td colSpan={4} className="pt-2 font-semibold">One-time investment</td><td className="whitespace-nowrap pt-2 text-right font-semibold tabular-nums">{usd(p.totals.investment)}</td></tr>
              <tr><td colSpan={4} className="font-semibold">Every year (seeds and care)</td><td className="whitespace-nowrap text-right font-semibold tabular-nums">{usd(p.totals.yearlyCost)}</td></tr>
              {p.totals.laborDays > 0 && <tr><td colSpan={4} className="text-muted">Work for the new crops (approx.)</td><td className="whitespace-nowrap text-right tabular-nums text-muted">{`${p.totals.laborDays} days/yr`}</td></tr>}
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Reference prices in US dollars (2026). Ask suppliers for a current quote and convert at the day&apos;s exchange rate.</p>
      </section>

      {/* ---------- numbers ---------- */}
      {p.trials.length > 0 && (
        <section className={`${card} grid gap-4 sm:grid-cols-2 print:grid-cols-2`}>
          <div>
            <div className={eyebrow}>4 · The numbers</div>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-[11px] text-muted"><tr><th className="font-medium">New crop</th><th className="text-right font-medium">Income</th><th className="text-right font-medium">Margin</th><th className="text-right font-medium">Pays back</th></tr></thead>
              <tbody>
                {p.trials.map((t) => (
                  <tr key={t.name} className="border-t border-line">
                    <td className="py-1">{t.name}<div className="text-xs text-muted">{`${t.ha} ha · first harvest year ${t.yearsToHarvest}`}</div></td>
                    <td className="whitespace-nowrap pl-2 text-right tabular-nums">{usd(t.revenue)}</td>
                    <td className="whitespace-nowrap pl-2 text-right tabular-nums">{usd(t.margin)}</td>
                    <td className="whitespace-nowrap pl-2 text-right tabular-nums">{t.payback ? `${t.payback} yr` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">Income and margin per year at full production, with reference yields and prices.</p>
          </div>
          <div>
            <div className={eyebrow}>Money over 6 years (cumulative)</div>
            <CashChart cash={p.cash} />
            <p className="text-xs text-muted">{payYear ? `The plan pays for itself around year ${payYear}.` : "With these references the plan does not pay back in 6 years: start smaller or check prices."}</p>
          </div>
        </section>
      )}

      {/* ---------- seasons ---------- */}
      <section className={card}>
        <div className={eyebrow}>5 · Your year, season by season</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-4 print:grid-cols-4">
          {p.seasons.map((s) => (
            <div key={s.name} className="rounded-xl bg-surface-2 p-3 print:p-2">
              <div className="font-medium">{s.name} <span className="text-xs text-subtle">{s.range}</span></div>
              <p className="mt-1 text-xs text-ink-2">{s.focus}</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted">{s.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- risks and help ---------- */}
      <section className={`${card} grid gap-4 sm:grid-cols-3 print:grid-cols-3`}>
        <div>
          <div className={eyebrow}>6 · Be ready for</div>
          <ul className="mt-2 space-y-1.5 text-sm">{p.risks.length ? p.risks.map((r) => <li key={r.name}><b>{r.name}</b><div className="text-xs text-muted">{r.prepare}</div></li>) : <li className="text-muted">No active alerts.</li>}</ul>
        </div>
        <div>
          <div className={eyebrow}>Check before you start</div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-2">{p.check.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
        <div>
          <div className={eyebrow}>Who can help</div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-2">{p.contacts.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      </section>

      {p.conversation.length > 0 && (
        <section className={card}>
          <div className={eyebrow}>Our conversation</div>
          <div className="mt-2 space-y-2 text-sm">
            {p.conversation.map((c, i) => (
              <div key={i}><p className="text-muted"><b className="text-ink-2">You:</b> {c.q}</p><p className="mt-0.5"><b>Growwy:</b> {c.a}</p></div>
            ))}
          </div>
        </section>
      )}

      <footer className="pb-6 text-center text-[11px] text-muted print:pb-0">
        Growvia · NASA Space Apps Challenge 2026 · Data: NASA POWER, MODIS, SMAP, SoilGrids, Open-Meteo. Decision support only: the final decision is yours.
      </footer>
    </article>
  );
}
