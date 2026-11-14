"use client";
import { useState } from "react";
import { cropById } from "@/config/crops";
import { STRATEGIES } from "@/config/rotations";
import type { Crop, SiteConfig, StrategyResult } from "@/lib/types";
import { Badge, Card, input } from "./ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
type M = StrategyResult["metrics"];

// ---------------- 1. Scenario explorer: two rotations, seven lenses ----------------
const LENSES: { id: string; icon: string; name: string; what: string; v: (m: M) => number; show: (m: M) => string; lowerBetter?: boolean }[] = [
  { id: "n", icon: "🫘", name: "Nutrient cycling", what: "Nitrogen fixed by legumes and returned by residues: less fertilizer to buy.", v: (m) => clamp(m.nitrogen / 120), show: (m) => `${m.nitrogen} kg N/ha/yr` },
  { id: "erosion", icon: "💨", name: "Erosion risk", what: "Bare months × wind or storms × soil texture. Lower is better.", v: (m) => m.erosion, show: (m) => `${pct(m.erosion)} · ${m.bareMonths} bare months`, lowerBetter: true },
  { id: "om", icon: "🍂", name: "Organic matter", what: "Roots and residues that feed soil life, glue aggregates and hold water.", v: (m) => m.organicMatter, show: (m) => `${Math.round(m.organicMatter * 100)} / 100` },
  { id: "pest", icon: "🐛", name: "Pest & disease break", what: "Changing plant families leaves pests and diseases without their host.", v: (m) => m.pestBreak, show: (m) => `${Math.round(m.pestBreak * 100)} / 100` },
  { id: "water", icon: "💧", name: "Water use", what: "Net irrigation (or rain deficit) per year on your field. Lower is better.", v: (m) => clamp(m.waterMm / 900), show: (m) => `${m.waterMm} mm/yr`, lowerBetter: true },
  { id: "forage", icon: "🐄", name: "Forage potential", what: "Hay, grazing or green feed for livestock from the rotation.", v: (m) => m.forage, show: (m) => `${Math.round(m.forage * 100)} / 100` },
  { id: "market", icon: "🏪", name: "Market", what: "How many outlets the rotation sells into: more outlets spread price and buyer risk.", v: (m) => m.market, show: (m) => `${m.outlets.length} ${m.outlets.length === 1 ? "outlet" : "outlets"}` },
];

function ScenarioExplorer({ results }: { results: StrategyResult[] }) {
  const list = [...results].sort((a, b) => b.score - a.score);
  const cur = results.find((r) => r.strategy.current) ?? list[list.length - 1];
  const [aId, setA] = useState(list[0].strategy.id === cur.strategy.id ? list[1]?.strategy.id ?? cur.strategy.id : list[0].strategy.id);
  const [bId, setB] = useState(cur.strategy.id);
  const A = results.find((r) => r.strategy.id === aId) ?? list[0];
  const B = results.find((r) => r.strategy.id === bId) ?? cur;
  let winsA = 0, winsB = 0;
  const rows = LENSES.map((l) => {
    const a = l.v(A.metrics), b = l.v(B.metrics);
    const d = l.lowerBetter ? b - a : a - b;
    const w = Math.abs(d) < 0.04 ? 0 : d > 0 ? 1 : -1;
    if (w > 0) winsA++;
    if (w < 0) winsB++;
    return { l, a, b, w };
  });
  const pick = (val: string, set: (s: string) => void, tag: string) => (
    <label className="block min-w-0 flex-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">Scenario {tag}</span>
      <select className={`${input} mt-1`} value={val} onChange={(e) => set(e.target.value)}>
        {list.map((r) => <option key={r.strategy.id} value={r.strategy.id}>{r.strategy.name}{r.strategy.current ? " (current)" : ""}</option>)}
      </select>
    </label>
  );
  return (
    <Card title="Explore two scenarios" eyebrow="Seven lenses on the same field">
      <div className="flex flex-col gap-3 sm:flex-row">{pick(aId, setA, "A")}{pick(bId, setB, "B")}</div>
      <div className="mt-5 space-y-4">
        {rows.map(({ l, a, b, w }) => (
          <div key={l.id} className="grid gap-2 border-b border-line pb-4 last:border-0 last:pb-0 sm:grid-cols-12 sm:items-center">
            <div className="sm:col-span-4">
              <div className="flex items-center gap-2 text-sm font-medium"><span>{l.icon}</span>{l.name}</div>
              <p className="mt-0.5 text-xs text-muted">{l.what}</p>
            </div>
            <div className="space-y-1.5 sm:col-span-6">
              {([["A", a, A.metrics], ["B", b, B.metrics]] as const).map(([tag, v, m]) => (
                <div key={tag} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-semibold text-subtle">{tag}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${tag === "A" ? "bg-ink" : "bg-subtle"}`} style={{ width: `${Math.max(3, v * 100)}%` }} />
                  </div>
                  <span className="w-40 shrink-0 text-right tabular-nums text-ink-2 max-sm:w-28">{l.show(m)}</span>
                </div>
              ))}
              {l.id === "market" && (
                <div className="flex flex-wrap gap-1 text-[11px] text-subtle">
                  {(["A", "B"] as const).map((tag) => (
                    <span key={tag} className="mr-2"><b>{tag}:</b>{" "}{(tag === "A" ? A : B).metrics.outlets.map((o, k) => <span key={o}>{k > 0 && " · "}<span>{o}</span></span>)}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:col-span-2 sm:text-right">
              {w === 0 ? <Badge>Similar</Badge> : <Badge tone="green">{w > 0 ? "A better" : "B better"}</Badge>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-xl bg-surface-2 p-4 text-sm text-ink-2">
        <b>{A.strategy.name}</b>{` is better in ${winsA} of 7 lenses and `}<b>{B.strategy.name}</b>{` in ${winsB}.`}{" "}
        {`Overall score for your priorities: ${A.score} vs ${B.score}.`}
      </p>
    </Card>
  );
}

// ---------------- 2. Fit map: which rotation idea suits which farmer goal ----------------
const GOALS: { id: string; icon: string; name: string; v: (r: StrategyResult) => number }[] = [
  { id: "water", icon: "💧", name: "Conserve water", v: (r) => r.scores.water },
  { id: "income", icon: "💵", name: "Extra income", v: (r) => clamp(0.55 * r.metrics.income + 0.45 * r.metrics.market) },
  { id: "structure", icon: "🧱", name: "Soil structure", v: (r) => clamp(0.4 * (1 - r.metrics.erosion) + 0.35 * r.metrics.organicMatter + 0.25 * r.metrics.deepRoots) },
  { id: "fert", icon: "🫘", name: "Less fertilizer", v: (r) => clamp(r.metrics.nitrogen / 120) },
  { id: "pest", icon: "🐛", name: "Fewer pests", v: (r) => r.metrics.pestBreak },
  { id: "forage", icon: "🐄", name: "Feed livestock", v: (r) => r.metrics.forage },
  { id: "labor", icon: "⏱️", name: "Less work", v: (r) => r.scores.labor },
];

function FitMap({ results }: { results: StrategyResult[] }) {
  const list = [...results].sort((a, b) => b.score - a.score);
  const grid = list.map((r) => GOALS.map((g) => g.v(r)));
  const best = GOALS.map((_, j) => grid.reduce((bi, row, i) => (row[j] > grid[bi][j] ? i : bi), 0));
  return (
    <Card title="Which idea fits which goal" eyebrow="Fit map · darker = better match" pad={false}>
      <div className="flex flex-wrap gap-1.5 px-6">
        {GOALS.slice(0, 4).map((g, j) => (
          <Badge key={g.id} tone="green">{g.icon} {g.name}: {list[best[j]].strategy.name}</Badge>
        ))}
      </div>
      <div className="overflow-x-auto px-6 pb-6 pt-4">
        <table className="w-full min-w-[760px] border-separate border-spacing-1 text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-medium">Rotation idea</th>
              {GOALS.map((g) => <th key={g.id} className="text-center font-medium"><div>{g.icon}</div>{g.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={r.strategy.id}>
                <td className="pr-2 font-medium">{r.strategy.name}{r.strategy.current && <span className="ml-1 text-subtle">(current)</span>}</td>
                {grid[i].map((v, j) => (
                  <td key={GOALS[j].id} className="h-11 rounded-md text-center tabular-nums text-ink"
                    style={{ background: `color-mix(in srgb, var(--green-fg) ${Math.round(6 + v * 40)}%, var(--surface))` }}>
                    <span className={best[j] === i ? "font-semibold" : ""}>{Math.round(v * 100)}{best[j] === i && " ★"}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">★ best rotation for that goal on this field. Use it with the priority sliders above: if water matters most, look at the first column.</p>
      </div>
    </Card>
  );
}

// ---------------- 3. How each crop type builds long-term soil health ----------------
const ROLES: { id: string; icon: string; name: string; test: (c: Crop) => boolean; how: string; long: string }[] = [
  { id: "nfix", icon: "🫘", name: "Nitrogen-fixing crops", test: (c) => c.nFix >= 20,
    how: "Legumes host bacteria in root nodules that take nitrogen from the air and turn it into plant food.",
    long: "Each cycle leaves nitrogen for the next crop, so you buy less fertilizer and the soil stays more fertile year after year." },
  { id: "cover", icon: "🌱", name: "Cover crops", test: (c) => c.kind === "cover",
    how: "Sown between cash crops or in orchard alleys so the ground is never bare.",
    long: "They stop wind and water erosion, add residues that build organic matter and keep soil life fed through winter." },
  { id: "deep", icon: "🌳", name: "Deep-rooted crops", test: (c) => c.root === "deep",
    how: "Roots reach 1–2 m, breaking compacted layers and pulling up nutrients that shallow crops cannot reach.",
    long: "Old root channels let water and air in, improve drainage and leave organic matter deep in the profile." },
  { id: "drought", icon: "🌵", name: "Drought-tolerant crops", test: (c) => !!c.drought,
    how: "Need less water or survive dry spells by rooting deep and slowing growth.",
    long: "They keep living roots and cover in dry years, protect the soil when irrigation is short and lower water bills." },
];

function CropRoles({ results, site }: { results: StrategyResult[]; site: SiteConfig }) {
  const best = [...results].sort((a, b) => b.score - a.score)[0];
  const ids = new Set(STRATEGIES.filter((s) => (site.systems as string[]).includes(s.system)).flatMap((s) => [...s.years.flatMap((y) => [y.main, y.winter]), s.alley]));
  const crops = [...ids].map(cropById).filter((c): c is Crop => !!c);
  const inBest = new Set([...best.strategy.years.flatMap((y) => [y.main, y.winter]), best.strategy.alley].filter(Boolean));
  return (
    <Card title="How each crop type helps the soil" eyebrow={`Crops used in ${site.name} rotations`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {ROLES.map((r) => {
          const here = crops.filter(r.test);
          return (
            <div key={r.id} className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 font-medium"><span className="text-xl">{r.icon}</span>{r.name}</div>
              <p className="mt-2 text-sm text-ink-2">{r.how}</p>
              <p className="mt-1 text-sm text-ink-2"><b>Long term:</b> {r.long}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {here.length ? here.map((c) => (
                  <Badge key={c.id} tone={inBest.has(c.id) ? "green" : "neutral"} title={inBest.has(c.id) ? "In the best rotation" : undefined}>{c.emoji} {c.name}</Badge>
                )) : <span className="text-xs text-subtle">None in these rotations yet</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">{`Green = part of the best rotation for your field (${best.strategy.name}).`}</p>
    </Card>
  );
}

export function RotationExplorer({ results, site }: { results: StrategyResult[]; site: SiteConfig }) {
  if (results.length < 2) return null;
  return (
    <div className="space-y-4">
      <ScenarioExplorer results={results} />
      <FitMap results={results} />
      <CropRoles results={results} site={site} />
    </div>
  );
}
