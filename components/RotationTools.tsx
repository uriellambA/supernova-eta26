"use client";
import { CROPS, cropById } from "@/config/crops";
import { SYSTEMS } from "@/config/rotations";
import type { FarmRegister, FarmSystem, Priorities, Strategy, StrategyResult } from "@/lib/types";
import type { Effectiveness } from "@/lib/effectiveness";
import { EFF_LEVEL, effTone } from "./EffectivenessCard";
import { SeasonStrip } from "./PlanSections";
import { Badge, Card, LevelPill, Meter, Note, Reveal, btnGhost, btnPrimary, input, label } from "./ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const PRI: [keyof Priorities, string][] = [["water", "Save water"], ["income", "Income"], ["soil", "Soil health"], ["forage", "Forage"], ["labor", "Less work"]];
const sorted = (r: StrategyResult[]) => [...r].sort((a, b) => b.score - a.score);

// ---------------- Summary card (Overview tab) ----------------
/** The one decision, short: the best rotation, its score, how effective it is and the way to the details. */
export function RotationSummary({ results, eff, onCompare, onEffect }: { results: StrategyResult[]; eff: Effectiveness | null; onCompare: () => void; onEffect: () => void }) {
  if (!results.length) return null;
  const list = sorted(results);
  const best = list[0];
  const cur = results.find((r) => r.strategy.current) ?? best;
  const same = best.strategy.id === cur.strategy.id;
  const bars: [string, number, string][] = same ? [["Your rotation", best.score, "bg-green-fg"]] : [["Today", cur.score, "bg-blue-fg"], ["Recommended", best.score, "bg-green-fg"]];
  return (
    <Reveal tour="rotation" className="rounded-2xl border border-ink bg-surface p-6 md:col-span-6 lg:col-span-12">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Recommended rotation</div>
      <div className="mt-2 grid items-center gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="font-serif text-3xl leading-tight sm:text-4xl">{same ? "Keep your current rotation" : best.strategy.name}</h2>
          {/* today vs recommended, as two bars */}
          <div className="mt-5 space-y-2.5">
            {bars.map(([l, v, c]) => (
              <div key={l} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="text-muted">{l}</span>
                <div className="h-3 overflow-hidden rounded-full bg-surface-2"><div className={`h-full rounded-full ${c}`} style={{ width: `${v}%` }} /></div>
                <span className="text-right font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={onEffect}>Why it works →</button>
            <button className={btnGhost} onClick={onCompare}>Compare rotations</button>
          </div>
        </div>
        {eff && (
          <div data-tour="effect" className="flex items-center gap-4 lg:col-span-5 lg:justify-end">
            <Ring value={eff.score} />
            <div>
              <div className="text-sm text-muted">How effective</div>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${effTone(eff.level)}`}>{EFF_LEVEL[eff.level]}</span>
              <div className="mt-1 text-xs text-muted">{`Improves ${eff.improved} of ${eff.aspects.length} aspects`}</div>
            </div>
          </div>
        )}
      </div>
    </Reveal>
  );
}

/** A percentage as a ring (0–100). */
function Ring({ value }: { value: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 shrink-0" role="img" aria-label={`${value}%`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-2" />
      <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-green-fg"
        strokeDasharray={`${(c * value) / 100} ${c}`} transform="rotate(-90 40 40)" />
      <text x="40" y="45" textAnchor="middle" className="fill-[var(--ink)] font-serif" fontSize="20">{`${value}%`}</text>
    </svg>
  );
}

// ---------------- Overview hero ----------------
export function RotationHero({ results, onCompare, onBuild, onYear }: { results: StrategyResult[]; onCompare: () => void; onBuild: () => void; onYear: () => void }) {
  if (!results.length) return null;
  const list = sorted(results);
  const best = list[0];
  const cur = results.find((r) => r.strategy.current) ?? best;
  const same = best.strategy.id === cur.strategy.id;
  const chips = [
    !same && best.metrics.waterMm < cur.metrics.waterMm - 20 && `💧 −${cur.metrics.waterMm - best.metrics.waterMm} mm water/yr`,
    !same && best.metrics.bareMonths < cur.metrics.bareMonths - 0.5 && `🌱 bare soil ${cur.metrics.bareMonths} → ${best.metrics.bareMonths} months`,
    !same && best.metrics.erosion < cur.metrics.erosion - 0.05 && `💨 erosion ${pct(cur.metrics.erosion)} → ${pct(best.metrics.erosion)}`,
    !same && best.metrics.nitrogen > cur.metrics.nitrogen + 10 && `🫘 +${best.metrics.nitrogen - cur.metrics.nitrogen} kg N/ha`,
  ].filter(Boolean) as string[];
  return (
    <Reveal tour="rotation" className="rounded-2xl border border-ink bg-surface p-6 md:col-span-6 lg:col-span-12">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Crop rotation</span>
            <Badge tone="blue">Core decision</Badge>
          </div>
          <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
            {same ? "Your current rotation is the best fit" : <>Best for your field: <em>{best.strategy.name}</em></>}
          </h2>
          <div className="mt-3 flex flex-wrap items-end gap-6">
            <div><div className="font-serif text-6xl leading-none">{best.score}</div><div className="mt-1 text-xs text-muted">score / 100</div></div>
            {!same && <div><div className="font-serif text-4xl leading-none text-subtle">{cur.score}</div><div className="mt-1 text-xs text-muted">your current rotation</div></div>}
            <div className="flex flex-wrap gap-1.5">{chips.map((c) => <Badge key={c} tone="green">{c}</Badge>)}</div>
          </div>
          <div className="mt-5"><SeasonStrip r={best} /></div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={onCompare}>Compare all rotations →</button>
            <button className={btnGhost} onClick={onBuild}>Build your own</button>
            <button className={btnGhost} onClick={onYear}>Year plan</button>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">Ranking for your priorities</div>
          <ol className="mt-3 space-y-3">
            {list.map((r, i) => (
              <li key={r.strategy.id}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-subtle">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{r.strategy.name}</span>
                  {r.strategy.current && <Badge tone="blue">Current</Badge>}
                  {r.strategy.id === "custom" && <Badge tone="amber">Yours</Badge>}
                  <span className="w-8 text-right font-semibold tabular-nums">{r.score}</span>
                </div>
                <Meter value={r.score} level={r.level} className="ml-7 mt-1" />
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">Scores combine water, income, soil health, forage and work, weighted by your priorities. Decision support only: you decide.</p>
        </div>
      </div>
    </Reveal>
  );
}

// ---------------- Side-by-side matrix ----------------
export function RotationMatrix({ results }: { results: StrategyResult[] }) {
  const list = sorted(results);
  const cell = (v: number) => <div className="min-w-16"><div className="text-[11px] tabular-nums text-ink-2">{Math.round(v * 100)}</div><Meter value={v * 100} level={v >= 0.65 ? "good" : v >= 0.45 ? "watch" : "alert"} /></div>;
  return (
    <Card title="Side by side" eyebrow="Each criterion 0–100 (higher is better)" pad={false}>
      <div className="overflow-x-auto px-6 pb-6">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-2 font-medium">Strategy</th><th className="font-medium">Score</th>
              {PRI.map(([k, l]) => <th key={k} className="font-medium">{l}</th>)}
              <th className="font-medium">Water mm/yr</th><th className="font-medium">Bare months</th><th className="font-medium">Erosion</th><th className="font-medium">N kg/ha</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={r.strategy.id} className={`border-b border-line align-middle last:border-0 ${i === 0 ? "bg-green-bg/40" : ""}`}>
                <td className="py-2.5 pr-3">
                  <div className="font-medium">{r.strategy.name}</div>
                  <div className="mt-0.5 flex gap-1">{r.strategy.current && <Badge tone="blue">Current</Badge>}{r.strategy.id === "custom" && <Badge tone="amber">Yours</Badge>}{i === 0 && <Badge tone="green">Best match</Badge>}</div>
                </td>
                <td><LevelPill level={r.level}>{r.score}</LevelPill></td>
                {PRI.map(([k]) => <td key={k} className="pr-3">{cell(r.scores[k])}</td>)}
                <td className="tabular-nums">{r.metrics.waterMm}</td><td className="tabular-nums">{r.metrics.bareMonths}</td><td className="tabular-nums">{pct(r.metrics.erosion)}</td><td className="tabular-nums">{r.metrics.nitrogen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------- Build your own ----------------
const MAINS = CROPS.filter((c) => c.kind !== "cover");
const COVERS = CROPS.filter((c) => c.kind === "cover" || c.kind === "forage");
const TREES = CROPS.filter((c) => ["cherry", "raspberry", "currant"].includes(c.id));

export const blankCustom = (system: FarmSystem): Strategy => ({
  id: "custom", system, name: "My rotation", short: "Yours",
  years: system === "orchard" ? [{ main: "cherry", winter: "rye" }] : system === "grains" ? [{ main: "maize", winter: "oats-vetch" }, { main: "soy", winter: "wheat" }] : system === "forage" ? [{ main: "alfalfa", winter: "alfalfa" }, { main: "potato", winter: "oats-vetch" }] : [{ main: "potato", winter: "rye" }, { main: "garlic", winter: "oats-vetch" }],
  alley: system === "orchard" ? "rye" : undefined,
  idea: "A rotation you designed: compare it with the alternatives before deciding.",
  gaps: ["Your own yields and costs for these crops"],
  risks: [],
});

/** Builds a starting design from the farm register (largest plot, last 12 months). */
export function customFromRegister(r: FarmRegister, system: FarmSystem): Strategy | null {
  const plot = [...r.plots].sort((a, b) => b.areaHa - a.areaHa)[0];
  if (!plot) return null;
  const pick = (...ids: string[]) => ids.find((id) => cropById(id)) ?? null;
  const main = pick(plot.crop, plot.history.summer, plot.history.spring);
  if (!main) return null;
  const winter = plot.history.winter && plot.history.winter !== "bare" ? pick(plot.history.winter) : null;
  const base = blankCustom(system);
  return system === "orchard"
    ? { ...base, name: `${plot.name} (from register)`, years: [{ main, winter }], alley: winter }
    : { ...base, name: `${plot.name} (from register)`, years: [{ main, winter }] };
}

export function RotationBuilder({ system, custom, setCustom, result, rank, total, register }: {
  system: FarmSystem; custom: Strategy | null; setCustom: (s: Strategy | null) => void; result: StrategyResult | null; rank: number; total: number; register: FarmRegister | null;
}) {
  const s = custom && custom.system === system ? custom : null;
  if (!s) {
    return (
      <Card title="Design your own rotation" eyebrow={`System: ${SYSTEMS.find((x) => x.id === system)?.name}`}>
        <p className="max-w-2xl text-sm text-ink-2">Choose the crops for each year and what covers the soil in winter. Growvia scores your design with the same rules and shows where it ranks against the alternatives.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => setCustom(blankCustom(system))}>Start a new design</button>
          {register && <button className={btnGhost} onClick={() => setCustom(customFromRegister(register, system) ?? blankCustom(system))}>Start from my farm register</button>}
        </div>
      </Card>
    );
  }
  const upd = (p: Partial<Strategy>) => setCustom({ ...s, ...p });
  const setYear = (i: number, p: Partial<Strategy["years"][number]>) => upd({ years: s.years.map((y, j) => (j === i ? { ...y, ...p } : y)) });
  const orchard = system === "orchard";
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-7" title="Design your own rotation" eyebrow={`System: ${SYSTEMS.find((x) => x.id === system)?.name}`} right={<button className="text-xs text-red-fg hover:underline" onClick={() => setCustom(null)}>Discard</button>}>
        <label className={label}>Name<input className={input} value={s.name} onChange={(e) => upd({ name: e.target.value })} /></label>
        {orchard ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className={label}>Trees / main crop
              <select className={input} value={s.years[0].main} onChange={(e) => setYear(0, { main: e.target.value })}>{TREES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select>
            </label>
            <label className={label}>Between the rows (alleys)
              <select className={input} value={s.alley ?? ""} onChange={(e) => upd({ alley: e.target.value || null, years: s.years.map((y) => ({ ...y, winter: e.target.value || null })) })}>
                <option value="">Bare soil / herbicide strip</option>
                {COVERS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {s.years.map((y, i) => (
              <div key={i} className="grid grid-cols-[2.5rem_1fr_1fr_auto] items-end gap-2">
                <span className="pb-2 text-sm font-medium text-subtle">Y{i + 1}</span>
                <label className={label}>Main crop (Oct–Apr)
                  <select className={input} value={y.main} onChange={(e) => setYear(i, { main: e.target.value })}>{MAINS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select>
                </label>
                <label className={label}>Winter (May–Sep)
                  <select className={input} value={y.winter ?? ""} onChange={(e) => setYear(i, { winter: e.target.value || null })}>
                    <option value="">Bare soil</option>
                    {[...COVERS, ...MAINS.filter((c) => c.id === y.main && c.kind !== "annual")].map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                  </select>
                </label>
                <button className={`${btnGhost} !px-2 !py-1.5`} disabled={s.years.length <= 1} onClick={() => upd({ years: s.years.filter((_, j) => j !== i) })} aria-label="Remove year">✕</button>
              </div>
            ))}
            {s.years.length < 6 && <button className={`${btnGhost} mt-1`} onClick={() => upd({ years: [...s.years, { main: "garlic", winter: "rye" }] })}>+ Add year</button>}
          </div>
        )}
        <div className="mt-5"><div className="mb-1 text-[11px] font-medium text-muted">Season by season</div>{result && <SeasonStrip r={result} />}</div>
        <p className="mt-3 text-[11px] text-subtle">Saved on this device. Your design also appears in the comparison and in the SI analysis.</p>
      </Card>
      <Card className="lg:col-span-5" title="How your design scores" right={result && <LevelPill level={result.level}>{result.score} / 100</LevelPill>}>
        {result ? (
          <>
            <div className="flex items-end gap-3"><span className="font-serif text-6xl leading-none">{result.score}</span><span className="pb-1 text-sm text-muted">{`#${rank} of ${total} for your priorities`}</span></div>
            <div className="mt-4 space-y-2">
              {PRI.map(([k, l]) => (
                <div key={k}><div className="flex justify-between text-xs"><span>{l}</span><span className="text-muted">{Math.round(result.scores[k] * 100)}</span></div><Meter value={result.scores[k] * 100} level={result.scores[k] >= 0.65 ? "good" : result.scores[k] >= 0.45 ? "watch" : "alert"} className="mt-1" /></div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px]">
              {[["Water", `${result.metrics.waterMm} mm`], ["Bare", `${result.metrics.bareMonths} mo`], ["Erosion", pct(result.metrics.erosion)], ["N added", `${result.metrics.nitrogen} kg`]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-2 p-1.5"><div className="text-muted">{k}</div><div className="font-semibold">{v}</div></div>
              ))}
            </div>
            {result.benefits.length > 0 && <ul className="mt-3 space-y-0.5 text-sm text-green-fg">{result.benefits.slice(0, 3).map((b) => <li key={b}>✓ {b}</li>)}</ul>}
            {result.risks.length > 0 && <ul className="mt-2 space-y-0.5 text-sm text-amber-fg">{result.risks.slice(0, 3).map((b) => <li key={b}>⚠ {b}</li>)}</ul>}
          </>
        ) : <p className="text-sm text-muted">Choose at least one crop.</p>}
      </Card>
    </div>
  );
}

// ---------------- Method & glossary ----------------
const TERMS: [string, string][] = [
  ["Crop rotation", "Changing what grows in a field from season to season and year to year, so pests, diseases and nutrient use do not build up."],
  ["Cover crop", "A crop sown to protect and feed the soil rather than to sell (rye, oats + vetch, clover). It keeps the soil from blowing away in winter and spring."],
  ["Legume", "A plant family (alfalfa, clover, peas, fava, vetch) whose roots host bacteria that take nitrogen from the air: free fertilizer for the next crop."],
  ["Bare months", "Months a year when the soil has nothing growing on it. In Los Antiguos, bare soil plus strong spring wind means erosion."],
  ["Wind erosion", "Topsoil carried away by wind. Sandy, low-organic-matter soils left bare in Sep–Dec are the most exposed."],
  ["Organic matter", "Decomposed plant and animal material in the soil. It holds water and nutrients; above 3% is healthy."],
  ["Pest break", "Growing a different plant family so that pests and diseases of the previous crop lose their host."],
  ["Evapotranspiration (ET0)", "Water that the air pulls out of soil and plants. Irrigation needs = crop use − useful rain."],
  ["Frost-free days", "Days between the last spring frost and the first autumn frost: the safe season for sensitive crops."],
];

export function RotationMethod() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-7" title="How Growvia scores a rotation" eyebrow="Transparent rules, not a black box">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-2">
          <li><b>Water:</b> each crop&apos;s monthly need (crop coefficient × evaporation − useful rain) on your field, plus covers and alleys, compared with what your irrigation can deliver.</li>
          <li><b>Soil health:</b> bare months × spring wind × soil texture (erosion), organic matter added by each crop, nitrogen fixed by legumes and how many plant families break pest cycles.</li>
          <li><b>Income, market, forage and work:</b> relative value, how many outlets the rotation sells into, forage produced and labor of each crop.</li>
          <li><b>Your priorities</b> (0–3) weight the five criteria. Each criterion mixes an absolute value with how the option ranks among those compared, so differences are visible.</li>
          <li><b>Penalties</b> when a crop needs more frost-free days than your field has, when frost hits its sensitive stage in half of the years, or when water use exceeds supply.</li>
        </ol>
        <p className="mt-4 text-sm text-ink-2">Every strategy lists <b>why</b> it is suggested, the <b>evidence</b> (climate record, soil, snowpack), <b>benefits</b>, <b>information gaps</b> and <b>risks</b> to check with a local expert. The SI explains the result in plain words; it does not change the scores.</p>
        <Note kind="warn">Values come from regional references and satellite records. Validate with your own yields, a soil test and local advice (INTA, cooperatives) before changing your rotation.</Note>
      </Card>
      <Card className="lg:col-span-5" title="Words used here">
        <dl className="space-y-3 text-sm">
          {TERMS.map(([t, d]) => (
            <div key={t}><dt className="font-medium">{t}</dt><dd className="text-ink-2">{d}</dd></div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
