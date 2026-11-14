"use client";
import { useState } from "react";
import { cropById } from "@/config/crops";
import { SPECIES } from "@/config/species";
import { MONTHS, SEASONS } from "@/lib/agro";
import { ensoImpacts } from "@/lib/enso";
import type { Hazard } from "@/lib/contingency";
import { seasonGrid, yearPlan, type SeasonCell } from "@/lib/seasons";
import { BUSY_MONTHS, harvestCoverage, type SpeciesFit } from "@/lib/suitability";
import type { AdvisorResult, EnsoResumen, IndicadoresNasa, Priorities, StrategyResult } from "@/lib/types";
import { Badge, Card, LevelPill, Meter, Note, Reveal } from "./ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const usd = (n: number) => `${n < 0 ? "−" : ""}USD ${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

// ---------------- Rotations ----------------
const PRI_LABEL: Record<keyof Priorities, string> = { water: "Save water", income: "Income", soil: "Soil health", forage: "Forage", labor: "Less work" };
const CELL: Record<SeasonCell["kind"], string> = {
  crop: "bg-blue-bg text-blue-fg",
  tree: "bg-surface-2 text-ink-2",
  cover: "bg-green-bg text-green-fg",
  bare: "bg-red-bg text-red-fg",
};

export function SeasonStrip({ r }: { r: StrategyResult }) {
  const grid = seasonGrid(r.strategy);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-separate border-spacing-[3px] text-[10.5px]">
        <thead>
          <tr>
            <th className="w-8" />
            {SEASONS.map((s) => <th key={s.id} className="text-left font-medium text-subtle">{s.name} <span className="font-normal">{s.range}</span></th>)}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, y) => (
            <tr key={y}>
              <td className="text-subtle">Y{y + 1}</td>
              {row.map((cell, i) => <td key={i} className={`rounded-md px-1.5 py-1 leading-tight ${CELL[cell.kind]}`}>{cell.label}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Rotations({ results, pri, setPri, children }: { results: StrategyResult[]; pri: Priorities; setPri: (p: Priorities) => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...results].sort((a, b) => b.score - a.score);
  return (
    <div className="space-y-4">
      <Card title="What matters most to you?" eyebrow="Your priorities re-rank the strategies instantly">
        <div className="grid gap-4 sm:grid-cols-5">
          {(Object.keys(PRI_LABEL) as (keyof Priorities)[]).map((k) => (
            <label key={k} className="text-xs text-ink-2">
              <div className="mb-1 flex justify-between"><span>{PRI_LABEL[k]}</span><span className="text-subtle">{["off", "low", "mid", "high"][pri[k]]}</span></div>
              <input type="range" min={0} max={3} step={1} value={pri[k]} onChange={(e) => setPri({ ...pri, [k]: Number(e.target.value) })} className="w-full accent-[var(--ink)]" />
            </label>
          ))}
        </div>
      </Card>
      {children}
      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((r, i) => {
          const isOpen = open === r.strategy.id;
          return (
            <Reveal key={r.strategy.id} delay={i * 70} className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-subtle">#{i + 1}</span>
                    {r.strategy.current && <Badge tone="blue">Current rotation</Badge>}
                    {r.strategy.id === "custom" && <Badge tone="amber">Your design</Badge>}
                    {i === 0 && <Badge tone="green" dot>Best match</Badge>}
                  </div>
                  <h4 className="mt-1.5 font-semibold leading-tight tracking-tight">{r.strategy.name}</h4>
                  <p className="mt-1 text-xs text-muted">{r.strategy.years.map((y) => `${cropById(y.main)?.name}${y.winter && y.winter !== y.main ? ` + ${cropById(y.winter)?.name.toLowerCase()}` : ""}`).join(" → ")}</p>
                </div>
                <div className="text-right">
                  <div className="font-serif text-4xl leading-none tabular-nums">{r.score}</div>
                  <div className="mt-1"><LevelPill level={r.level} /></div>
                </div>
              </div>
              <div className="mt-4"><SeasonStrip r={r} /></div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
                {[["Water", `${r.metrics.waterMm} mm`], ["Bare", `${r.metrics.bareMonths} mo`], ["Erosion", pct(r.metrics.erosion)], ["N added", `${r.metrics.nitrogen} kg`]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-surface-2 p-1.5"><div className="text-muted">{k}</div><div className="font-semibold">{v}</div></div>
                ))}
              </div>
              {r.benefits.length > 0 && <p className="mt-3 text-sm text-green-fg">✓ {r.benefits.slice(0, 2).join(" · ")}</p>}
              {r.risks[0] && <p className="mt-1 text-sm text-amber-fg">⚠ {r.risks[0]}</p>}
              <button className="mt-3 text-xs font-medium text-ink underline-offset-4 hover:underline" onClick={() => setOpen(isOpen ? null : r.strategy.id)} aria-expanded={isOpen}>
                {isOpen ? "Hide details" : "Why? Evidence, gaps and risks →"}
              </button>
              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs text-ink-2">
                  <Block title="Why it was suggested" items={r.why} />
                  <Block title="Evidence" items={r.evidence} />
                  {r.benefits.length > 0 && <Block title="Benefits" items={r.benefits} />}
                  <Block title="Information gaps" items={r.gaps} />
                  <Block title="Risks to review locally" items={r.risks} />
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {(Object.keys(PRI_LABEL) as (keyof Priorities)[]).map((k) => (
                      <div key={k}><Meter value={r.scores[k] * 100} /><div className="mt-0.5 text-[10px] text-subtle">{PRI_LABEL[k]}</div></div>
                    ))}
                  </div>
                </div>
              )}
            </Reveal>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <Badge tone="blue">Crop</Badge><Badge tone="green">Cover / forage</Badge><Badge tone="neutral">Orchard</Badge><Badge tone="red">Bare soil</Badge>
      </div>
      <Note>
        <b>Quick guide:</b> legumes (alfalfa, vetch, clover, peas, fava) fix nitrogen from the air · cover crops (rye, oats) protect bare soil from wind and add organic matter · deep roots (alfalfa, rye) open the soil so water soaks in · drought-tolerant crops (garlic, peas) need less irrigation.
      </Note>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="font-semibold text-ink">{title}</div>
      <ul className="list-disc pl-4">{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

// ---------------- Year plan (seasons) ----------------
export function YearPlan({ results, fits, advice }: { results: StrategyResult[]; fits: SpeciesFit[]; advice: AdvisorResult | null }) {
  const best = [...results].sort((a, b) => b.score - a.score)[0];
  const plan = yearPlan(best, fits);
  const current = SPECIES.filter((s) => s.status === "current").map((s) => s.id);
  const added = fits.filter((f) => f.species.status === "new" && f.viability >= 55).slice(0, 4).map((f) => f.species.id);
  const before = harvestCoverage(current);
  const after = harvestCoverage([...current, ...added]);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SEASONS.map((s, i) => (
          <Card key={s.id} delay={i * 70} eyebrow={s.range} title={s.name}>
            <p className="text-sm font-medium">{plan[s.id].focus}</p>
            {advice?.seasons?.[s.id] && <p className="mt-2 rounded-lg bg-blue-bg px-2.5 py-1.5 text-xs text-blue-fg">✨ {advice.seasons[s.id]}</p>}
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-ink-2">{plan[s.id].tasks.map((t) => <li key={t}>{t}</li>)}</ul>
            <div className="mt-4 border-t border-line pt-3">
              <div className="text-[11px] font-medium text-muted">Harvest</div>
              <div className="mt-1 flex flex-wrap gap-1">{plan[s.id].harvest.length ? plan[s.id].harvest.map((h) => <Badge key={h} tone="green">{h}</Badge>) : <span className="text-xs text-subtle">Nothing to sell yet</span>}</div>
            </div>
          </Card>
        ))}
      </div>
      <Card title="Months with something to sell" eyebrow="Today vs with the best new crops">
        <CoverageRow label="Today" cov={before} />
        <CoverageRow label="With new crops" cov={after} />
        <p className="mt-3 text-xs text-muted">
          Today the income is concentrated in {before.filter((x) => x.length).length} months (cherries and strawberries).
          Adding {added.map((id) => SPECIES.find((s) => s.id === id)?.name).join(", ")} covers {after.filter((x) => x.length).length} months of the year.
        </p>
      </Card>
      {best && <Card title={`Seasonal layout of the best rotation: ${best.strategy.name}`}><SeasonStrip r={best} /></Card>}
    </div>
  );
}

function CoverageRow({ label, cov }: { label: string; cov: string[][] }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-ink-2">{label}</span>
      <div className="grid flex-1 grid-cols-12 gap-[3px]">
        {cov.map((ids, i) => (
          <div key={i} title={`${MONTHS[i]}: ${ids.map((id) => SPECIES.find((s) => s.id === id)?.name).join(", ") || "no harvest"}`} className={`flex h-8 flex-col items-center justify-center rounded-md text-[10px] ${ids.length ? "bg-green-bg text-green-fg" : "bg-surface-2 text-subtle"}`}>
            <span>{MONTHS[i][0]}</span>
            <span className="leading-none">{ids.slice(0, 2).map((id) => SPECIES.find((s) => s.id === id)?.emoji).join("")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- New crops ----------------
export function NewCrops({ fits, advice }: { fits: SpeciesFit[]; advice: AdvisorResult | null }) {
  const [filter, setFilter] = useState<"all" | "new" | "gap">("new");
  const [open, setOpen] = useState<string | null>(null);
  const list = fits.filter((f) => (filter === "all" ? true : filter === "new" ? f.species.status === "new" : f.species.status === "new" && f.fillsGap));
  const picked = new Map((advice?.newCrops ?? []).map((n) => [n.id, n.why]));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto max-w-2xl text-sm text-ink-2">Los Antiguos grows mostly cherries and strawberries. What can the soil and climate support <i>after</i> their season? Each species is scored against your field&apos;s frost, heat, chill, pH, salinity, water and wind.</p>
        {([["new", "New species"], ["gap", "Fill the off-season"], ["all", "All"]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === id ? "border-ink bg-ink text-canvas" : "border-line bg-surface text-ink-2 hover:bg-surface-2"}`}>{l}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((f, i) => {
          const s = f.species;
          const isOpen = open === s.id;
          return (
            <Reveal key={s.id} delay={(i % 6) * 60} className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold leading-tight">{s.name}</h4>
                  <div className="text-[11px] italic text-subtle">{s.latin}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge tone={s.status === "current" ? "blue" : "neutral"}>{s.status === "current" ? "Grown today" : s.group}</Badge>
                    {s.status === "new" && f.fillsGap && <Badge tone="green">Fills off-season</Badge>}
                    {picked.has(s.id) && <Badge tone="blue">✨ AI pick</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-3xl leading-none">{f.viability}</div>
                  <div className="mt-1"><LevelPill level={f.level} /></div>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-2">{picked.get(s.id) ?? s.why}</p>
              <div className="mt-3 grid grid-cols-12 gap-[2px]">
                {MONTHS.map((m, k) => (
                  <div key={m} title={m} className={`h-4 rounded-sm text-center text-[8px] leading-4 ${s.harvest.includes(k + 1) ? (BUSY_MONTHS.includes(k + 1) ? "bg-blue-bg text-blue-fg" : "bg-green-bg text-green-fg") : "bg-surface-2 text-subtle"}`}>{m[0]}</div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-lg bg-surface-2 p-1.5"><div className="text-muted">Soil & climate</div><div className="font-semibold">{f.agro}</div></div>
                <div className="rounded-lg bg-surface-2 p-1.5"><div className="text-muted">Margin /ha</div><div className="font-semibold">{(f.economy.margin / 1000).toFixed(1)}k</div></div>
                <div className="rounded-lg bg-surface-2 p-1.5"><div className="text-muted">Payback</div><div className="font-semibold">{f.economy.paybackYears ? `${f.economy.paybackYears} yr` : "—"}</div></div>
              </div>
              {f.limits[0] && <p className="mt-2 text-xs text-amber-fg">⚠ {f.limits[0]}</p>}
              <button className="mt-3 text-xs font-medium underline-offset-4 hover:underline" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>{isOpen ? "Hide factors" : "All factors →"}</button>
              {isOpen && (
                <div className="mt-2 space-y-1.5 border-t border-line pt-3">
                  {f.factors.map((x) => (
                    <div key={x.name}>
                      <div className="flex justify-between text-[11px]"><span>{x.name}</span><span className="text-muted">{x.note}</span></div>
                      <Meter value={x.score * 100} level={x.score >= 0.65 ? "good" : x.score >= 0.45 ? "watch" : "alert"} className="mt-0.5" />
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] text-muted">Role on the farm: {s.role}. Market: {s.market}.</p>
                </div>
              )}
            </Reveal>
          );
        })}
      </div>
      <Note kind="warn">Species values are regional references. Before planting, run a small trial (100–500 m²) and check buyers and plant availability with INTA and local cooperatives.</Note>
    </div>
  );
}

// ---------------- Viability (economy) ----------------
export function Viability({ fits, areaHa }: { fits: SpeciesFit[]; areaHa: number }) {
  const [sort, setSort] = useState<"viability" | "margin" | "payback">("viability");
  const rows = [...fits].sort((a, b) =>
    sort === "viability" ? b.viability - a.viability : sort === "margin" ? b.economy.margin - a.economy.margin : (a.economy.paybackYears ?? 99) - (b.economy.paybackYears ?? 99),
  );
  const top = fits.filter((f) => f.species.status === "new").slice(0, 3);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {top.map((f, i) => (
          <Card key={f.species.id} delay={i * 70} eyebrow={`#${i + 1} new option`} title={`${f.species.emoji} ${f.species.name}`} right={<LevelPill level={f.level}>{f.viability}</LevelPill>}>
            <div className="font-serif text-3xl">{usd(f.economy.margin * Math.min(1, areaHa))}</div>
            <div className="text-xs text-muted">gross margin per year on {Math.min(1, areaHa)} ha at full production</div>
            <div className="mt-3 space-y-1 text-xs text-ink-2">
              <div className="flex justify-between"><span>Setup cost</span><span>{usd(f.species.econ.setupUsdHa)}/ha</span></div>
              <div className="flex justify-between"><span>First harvest</span><span>year {f.species.yearsToHarvest}</span></div>
              <div className="flex justify-between"><span>Pays back in</span><span>{f.economy.paybackYears ? `~${f.economy.paybackYears} years` : "—"}</span></div>
              <div className="flex justify-between"><span>Return per work day</span><span>{usd(f.economy.marginPerDay)}</span></div>
            </div>
          </Card>
        ))}
      </div>
      <Card title="Viability table" eyebrow="Soil + climate + economy + market" pad={false} right={
        <div className="flex gap-1">
          {([["viability", "Viability"], ["margin", "Margin"], ["payback", "Payback"]] as const).map(([id, l]) => (
            <button key={id} onClick={() => setSort(id)} aria-pressed={sort === id} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${sort === id ? "border-ink bg-ink text-canvas" : "border-line text-ink-2"}`}>{l}</button>
          ))}
        </div>
      }>
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">Species</th><th className="font-medium">Viability</th><th className="font-medium">Soil & climate</th>
                <th className="font-medium">Yield t/ha</th><th className="font-medium">Price USD/kg</th><th className="font-medium">Margin /ha/yr</th><th className="font-medium">Setup /ha</th><th className="font-medium">Payback</th><th className="font-medium">Work days/ha</th><th className="font-medium">Market</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.species.id} className="border-b border-line align-top last:border-0">
                  <td className="py-2 pr-2 font-medium">{f.species.emoji} {f.species.name}{f.species.status === "current" && <span className="ml-1 text-[10px] text-blue-fg">today</span>}</td>
                  <td><LevelPill level={f.level}>{f.viability}</LevelPill></td>
                  <td className="tabular-nums">{f.agro}</td>
                  <td className="tabular-nums">{f.species.econ.yieldTHa < 0.1 ? `${f.species.econ.yieldTHa * 1000} kg` : f.species.econ.yieldTHa}</td>
                  <td className="tabular-nums">{f.species.econ.priceUsdKg.toLocaleString("en-US")}</td>
                  <td className={`tabular-nums ${f.economy.margin < 0 ? "text-red-fg" : ""}`}>{usd(f.economy.margin)}</td>
                  <td className="tabular-nums">{usd(f.species.econ.setupUsdHa)}</td>
                  <td className="tabular-nums">{f.economy.paybackYears ? `${f.economy.paybackYears} yr` : "—"}</td>
                  <td className="tabular-nums">{f.species.laborDaysHa}</td>
                  <td className="max-w-[220px] text-muted">{f.species.market}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Regional context" eyebrow="Los Antiguos, Santa Cruz">
        <ul className="grid gap-2 text-sm text-ink-2 md:grid-cols-2">
          <li>🍒 The National Cherry Festival and summer tourism create a local market for fresh fruit, jams and experiences (lavender fields, berry picking).</li>
          <li>🚚 Fresh fruit travels ~1,000 km to big markets: products that store well (frozen, dried, oils, saffron) avoid freight risk.</li>
          <li>💧 Water comes from snowmelt through canals: crops with low water need are safer in low-snow years.</li>
          <li>👥 Labor peaks in Dec–Jan with cherries: crops harvested in autumn or spring use the same workers in quieter months.</li>
        </ul>
        <p className="mt-3 text-[11px] text-muted">Margins = yield × price − yearly costs, reduced by the soil &amp; climate fit. Payback = years to first harvest + setup ÷ margin. Indicative values to validate with local data.</p>
      </Card>
    </div>
  );
}

// ---------------- Contingencies ----------------
export function Contingency({ list, enso, c }: { list: Hazard[]; enso: EnsoResumen | null; c: IndicadoresNasa }) {
  const impacts = enso ? ensoImpacts(enso, c.anual) : [];
  const [open, setOpen] = useState<string | null>(list.find((h) => h.level !== "good")?.id ?? null);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((h, i) => {
          const isOpen = open === h.id;
          return (
            <Reveal key={h.id} delay={i * 60} className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{h.emoji}</span>
                <h4 className="font-semibold">{h.name}</h4>
                <span className="ml-auto"><LevelPill level={h.level}>{h.level === "good" ? "Calm" : h.level === "watch" ? "Watch" : "Act now"}</LevelPill></span>
              </div>
              <p className="mt-3 text-sm">{h.status}</p>
              <p className="mt-1 text-xs text-muted">{h.history}</p>
              <button className="mt-3 text-xs font-medium underline-offset-4 hover:underline" onClick={() => setOpen(isOpen ? null : h.id)} aria-expanded={isOpen}>{isOpen ? "Hide plan" : "Contingency plan →"}</button>
              {isOpen && (
                <div className="mt-2 grid gap-2 border-t border-line pt-3 text-xs text-ink-2">
                  {([["Before", h.before], ["During", h.during], ["After", h.after]] as const).map(([t, items]) => (
                    <div key={t}><div className="font-semibold text-ink">{t}</div><ul className="list-disc pl-4">{items.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  ))}
                </div>
              )}
            </Reveal>
          );
        })}
      </div>
      {impacts.length > 0 && (
        <Card title="El Niño and La Niña on your field" eyebrow={`What each Pacific phase meant here, ${c.periodo.join("–")}`} right={enso?.current ? <Badge tone="blue" dot>Now: {enso.current.phase}</Badge> : <Badge>Live index unavailable</Badge>}>
          <div className="grid gap-3 md:grid-cols-3">
            {impacts.map((im) => (
              <div key={im.phase} className={`rounded-xl border p-4 ${enso?.current?.phase === im.phase ? "border-ink" : "border-line"}`}>
                <div className="flex items-center gap-2"><b>{im.phase}</b><span className="text-[11px] text-subtle">{im.years.length} years</span></div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div><div className="text-muted">Rain</div><div className="font-semibold">{im.rain} mm</div></div>
                  <div><div className="text-muted">Frost days</div><div className="font-semibold">{im.frostDays}</div></div>
                  <div><div className="text-muted">Late frost</div><div className="font-semibold">{im.lateFrostPct}% of years</div></div>
                  <div><div className="text-muted">Mean temp.</div><div className="font-semibold">{im.temp} °C</div></div>
                </div>
                <div className="mt-2 text-[10px] text-subtle">{im.years.join(", ")}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">El Niño / La Niña = warming / cooling of the tropical Pacific that shifts weather worldwide (index ≥ +0.5 °C / ≤ −0.5 °C in Sep–Nov). Few years per phase: treat differences as tendencies.</p>
        </Card>
      )}
    </div>
  );
}
