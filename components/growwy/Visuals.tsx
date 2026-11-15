"use client";
// Charts and tables Growwy shows next to her answers (and in the action-plan PDF). Plain SVG, theme colours.
import { cropById } from "@/config/crops";
import { SEASONS } from "@/lib/agro";
import type { ActionPlan, CashYear, PlanPlot } from "@/lib/plan";
import { MONTH, usd } from "@/lib/plan";
import { effectiveRain } from "@/lib/riego";
import type { SpeciesFit } from "@/lib/suitability";
import type { AdvisorResult, IndicadoresNasa, StrategyResult, VisualId } from "@/lib/types";

export type VisualData = {
  results: StrategyResult[];
  fits: SpeciesFit[];
  climate: IndicadoresNasa | null;
  plan: ActionPlan | null;
  advice: AdvisorResult | null;
};

const M1 = MONTH.map((m) => m[0]);

function Frame({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <figure className="mt-3 max-w-xl rounded-xl border border-line bg-surface p-3 print:break-inside-avoid">
      <figcaption className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">{title}</figcaption>
      <div className="mt-2">{children}</div>
      {note && <p className="mt-1.5 text-[11px] text-muted">{note}</p>}
    </figure>
  );
}

/** Grouped bars per month (or category). */
export function Bars({ labels, series, unit, height = 120 }: { labels: string[]; series: { name: string; color: string; values: number[] }[]; unit?: string; height?: number }) {
  const W = 300, H = height, P = { l: 26, r: 4, t: 6, b: 16 };
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.1;
  const bw = (W - P.l - P.r) / labels.length;
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / max);
  const ticks = [0, max / 2, max].map((v) => Math.round(v));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth="0.6" />
            <text x={P.l - 3} y={y(t) + 3} textAnchor="end" fontSize="7" fill="var(--chart-axis)">{t}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <g key={i}>
            {series.map((s, k) => {
              const w = (bw * 0.78) / series.length;
              const x = P.l + i * bw + bw * 0.11 + k * w;
              const v = s.values[i] ?? 0;
              return <rect key={s.name} x={x} y={y(Math.max(0, v))} width={w - 0.6} height={Math.max(0, H - P.b - y(Math.max(0, v)))} rx="1" fill={s.color}><title>{`${s.name} · ${l}: ${Math.round(v)}${unit ? " " + unit : ""}`}</title></rect>;
            })}
            <text x={P.l + i * bw + bw / 2} y={H - 5} textAnchor="middle" fontSize="7" fill="var(--chart-axis)">{l}</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted">
        {series.map((s) => <span key={s.name} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.name}{unit ? ` (${unit})` : ""}</span>)}
      </div>
    </div>
  );
}

/** Field divided into plots: windbreak on the west, trials along the north, rotation plots as strips. */
export function FieldMap({ plots, hedgeM, areaHa }: { plots: PlanPlot[]; hedgeM: number; areaHa: number }) {
  const W = 300, H = 200, X0 = 34, Y0 = 14, FW = 220, FH = 170;
  const hedge = plots.find((p) => p.kind === "hedge");
  const trials = plots.filter((p) => p.kind === "trial");
  const mains = plots.filter((p) => p.kind === "main");
  const hw = hedge ? 10 : 0;
  const trialH = trials.length ? Math.max(28, FH * (trials.reduce((a, t) => a + t.ha, 0) / areaHa) * 1.6) : 0;
  const innerW = FW - hw;
  const totalTrial = trials.reduce((a, t) => a + t.ha, 0) || 1;
  const mainTotal = mains.reduce((a, m) => a + m.ha, 0) || 1;
  // x position of each block (cumulative widths)
  // tiny plots (a 500 m² tunnel) get a minimum width so their name fits; the rest share the remaining space
  const lay = <T extends PlanPlot>(list: T[], total: number) => {
    const MIN = 52;
    const raw = list.map((p) => (innerW * p.ha) / total);
    const small = raw.map((w) => w < MIN);
    const fixed = small.filter(Boolean).length * MIN;
    const rest = raw.reduce((a, w, i) => a + (small[i] ? 0 : w), 0) || 1;
    const ws = raw.map((w, i) => (small[i] ? MIN : (w * (innerW - fixed)) / rest));
    return list.map((p, i) => ({ p, w: ws[i], x: X0 + hw + ws.slice(0, i).reduce((a, b) => a + b, 0) }));
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Field layout">
      <rect x={X0} y={Y0} width={FW} height={FH} fill="none" stroke="var(--ink)" strokeWidth="1.2" rx="2" />
      {hedge && (
        <g>
          <rect x={X0} y={Y0} width={hw} height={FH} fill={hedge.color} />
          {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={X0 + 5} cy={Y0 + 6 + i * 11.8} r="3.6" fill="#7aa64a" stroke={hedge.color} />)}
        </g>
      )}
      {lay(trials, totalTrial).map(({ p: t, w, x: tx }) => {
        return <g key={t.id}><rect x={tx} y={Y0} width={w} height={trialH} fill={t.color} opacity="0.85" stroke="var(--surface)" /><text x={tx + w / 2} y={Y0 + trialH / 2 - 2} textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#fff">{(w < 70 ? t.name.replace("Trial: ", "").split(" ").pop() : t.name.replace("Trial: ", ""))}</text><text x={tx + w / 2} y={Y0 + trialH / 2 + 8} textAnchor="middle" fontSize="7" fill="#fff">{t.ha} ha</text></g>;
      })}
      {lay(mains, mainTotal).map(({ p: m, w, x: mx }) => {
        const y = Y0 + trialH, h = FH - trialH;
        return (
          <g key={m.id}>
            <rect x={mx} y={y} width={w} height={h} fill={m.color} opacity="0.85" stroke="var(--surface)" />
            {Array.from({ length: Math.floor(h / 9) }, (_, i) => <line key={i} x1={mx + 3} x2={mx + w - 3} y1={y + 5 + i * 9} y2={y + 5 + i * 9} stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />)}
            <text x={mx + w / 2} y={y + h / 2 - 2} textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#fff">{m.name.replace(/ \(rotation year \d\)/, "")}</text>
            <text x={mx + w / 2} y={y + h / 2 + 8} textAnchor="middle" fontSize="7" fill="#fff">{m.ha} ha</text>
          </g>
        );
      })}
      {/* north arrow, wind and size */}
      <g transform={`translate(${X0 + FW + 22} ${Y0 + 12})`}><path d="M0 -10 L5 4 L0 1 L-5 4 Z" fill="var(--ink)" /><text y="14" textAnchor="middle" fontSize="8" fill="var(--ink)">N</text></g>
      {hedgeM > 0 && <g transform={`translate(${X0 - 18} ${Y0 + FH / 2})`}><path d="M-12 0 H6 M1 -4 L6 0 L1 4" stroke="var(--chart-axis)" strokeWidth="1.4" fill="none" /><text y="-7" x="-3" textAnchor="middle" fontSize="6.5" fill="var(--chart-axis)">Wind</text></g>}
      <text x={X0 + FW / 2} y={H - 2} textAnchor="middle" fontSize="7" fill="var(--chart-axis)">{areaHa} ha in total · plots drawn to scale (approx.)</text>
    </svg>
  );
}

/** Months each plot is busy: crop in the field, sowing and harvest. */
export function Calendar({ plots }: { plots: PlanPlot[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] table-fixed border-separate border-spacing-0.5 text-[10px]">
        <thead><tr><th className="w-32 text-left font-medium text-muted">Plot</th>{M1.map((m, i) => <th key={i} className="font-medium text-muted">{m}</th>)}</tr></thead>
        <tbody>
          {plots.map((p) => (
            <tr key={p.id}>
              <td className="truncate pr-1 text-ink-2">{p.name.replace(/ \(rotation year \d\)/, "")}</td>
              {MONTH.map((_, i) => {
                const m = i + 1;
                const h = p.months.harvest.includes(m), s = p.months.sow.includes(m), f = p.months.inField.includes(m);
                return <td key={m} className="h-5 rounded-sm text-center" style={{ background: f || h || s ? p.color : "var(--surface-2)", opacity: f || h || s ? (h ? 1 : 0.55) : 1, color: "#fff" }}>{h ? "★" : s ? "↓" : ""}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-muted">↓ sow / plant · ★ harvest · colour = crop in the field</p>
    </div>
  );
}

/** Cumulative money of the plan (investment, ramp-up years, then margin). */
export function CashChart({ cash }: { cash: CashYear[] }) {
  const W = 300, H = 130, P = { l: 40, r: 6, t: 8, b: 16 };
  const vals = cash.map((c) => c.cumulative);
  const lo = Math.min(0, ...vals), hi = Math.max(1, ...vals);
  const x = (i: number) => P.l + ((W - P.l - P.r) * i) / (cash.length - 1);
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - (v - lo) / (hi - lo || 1));
  const d = cash.map((c, i) => `${i ? "L" : "M"}${x(i)} ${y(c.cumulative)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative money">
      <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} stroke="var(--chart-axis)" strokeDasharray="3 3" strokeWidth="0.8" />
      {[lo, hi].map((v) => <text key={v} x={P.l - 3} y={y(v) + 3} textAnchor="end" fontSize="7" fill="var(--chart-axis)">{Math.round(v / 1000)}k</text>)}
      {cash.map((c, i) => <rect key={i} x={x(i) - 6} y={Math.min(y(0), y(c.flow + 0 * lo))} width="12" height={Math.abs(y(c.flow) - y(0))} fill={c.flow >= 0 ? "var(--green-fg)" : "var(--red-fg)"} opacity="0.35" />)}
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      {cash.map((c, i) => <g key={i}><circle cx={x(i)} cy={y(c.cumulative)} r="2.4" fill={c.cumulative >= 0 ? "var(--green-fg)" : "var(--red-fg)"} /><text x={x(i)} y={H - 4} textAnchor="middle" fontSize="7" fill="var(--chart-axis)">{`Y${c.year}`}</text></g>)}
    </svg>
  );
}

export function Visual({ id, data }: { id: VisualId; data: VisualData }) {
  const { results, fits, climate, plan, advice } = data;
  const sorted = [...results].sort((a, b) => b.score - a.score);
  const best = results.find((r) => r.strategy.id === advice?.best) ?? sorted[0];
  switch (id) {
    case "rotations":
      return (
        <Frame title="Rotations compared" note="Score for your priorities (0–100), water per year and soil left bare.">
          <table className="w-full text-[11px]">
            <tbody>
              {sorted.map((r) => (
                <tr key={r.strategy.id} className="border-b border-line last:border-0">
                  <td className="py-1 pr-2">{r.strategy.name}{r.strategy.current && <span className="text-subtle"> (current)</span>}</td>
                  <td className="w-24"><div className="h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${r.score}%`, background: r === best ? "var(--green-fg)" : "var(--chart-axis)" }} /></div></td>
                  <td className="w-8 text-right font-semibold tabular-nums">{r.score}</td>
                  <td className="w-16 text-right tabular-nums text-muted">{r.metrics.waterMm} mm</td>
                  <td className="w-12 text-right tabular-nums text-muted">{r.metrics.bareMonths} mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Frame>
      );
    case "water": {
      if (!climate) return null;
      const main = cropById(best?.strategy.years[0].main);
      const need = climate.mensual.map((m, i) => Math.round(m.et0 * (main?.kc[i] ?? 0.8)));
      const rain = climate.mensual.map((m) => Math.round(effectiveRain(m.lluvia)));
      return (
        <Frame title={`Water: ${main?.name ?? "crop"} need vs useful rain`} note={`Irrigation fills the gap: about ${need.reduce((a, b, i) => a + Math.max(0, b - rain[i]), 0)} mm a year.`}>
          <Bars labels={M1} unit="mm" series={[{ name: "Crop need", color: "var(--blue-fg)", values: need }, { name: "Useful rain", color: "var(--green-fg)", values: rain }]} />
        </Frame>
      );
    }
    case "frost":
      if (!climate) return null;
      return (
        <Frame title="Frost days per month" note={`${climate.libreHeladas} frost-free days a year on average.`}>
          <Bars labels={M1} unit="days" series={[{ name: "Days ≤ 0 °C", color: "var(--blue-fg)", values: climate.mensual.map((m) => +m.diasHelada.toFixed(1)) }]} />
        </Frame>
      );
    case "climate":
      if (!climate) return null;
      return (
        <Frame title="Climate of your field (20-year average)">
          <Bars labels={M1} series={[{ name: "Max °C", color: "var(--red-fg)", values: climate.mensual.map((m) => Math.round(m.tmax)) }, { name: "Rain mm", color: "var(--blue-fg)", values: climate.mensual.map((m) => Math.round(m.lluvia)) }]} />
        </Frame>
      );
    case "crops": {
      const top = fits.filter((f) => f.species.status === "new").slice(0, 5);
      return (
        <Frame title="New crops that fit your field" note="Fit = soil + climate + economy (0–100). Margin per hectare at full production.">
          <table className="w-full text-[11px]">
            <thead className="text-muted"><tr><th className="text-left font-medium">Crop</th><th className="font-medium">Fit</th><th className="font-medium">Harvest</th><th className="text-right font-medium">Margin/ha</th></tr></thead>
            <tbody>
              {top.map((f) => (
                <tr key={f.species.id} className="border-t border-line">
                  <td className="py-1">{f.species.name}</td>
                  <td className="text-center tabular-nums">{f.viability}</td>
                  <td className="text-center text-muted">{f.species.harvest.map((m) => MONTH[m - 1]).join(", ")}</td>
                  <td className="text-right tabular-nums">{usd(f.economy.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Frame>
      );
    }
    case "economy": {
      const top = fits.filter((f) => f.species.status === "new").slice(0, 4);
      return (
        <Frame title="Money per hectare (USD, full production)" note="Reference prices; ask buyers and suppliers for a current quote.">
          <Bars labels={top.map((f) => f.species.name.split(" ")[0])} unit="USD" series={[
            { name: "Income", color: "var(--green-fg)", values: top.map((f) => f.economy.revenue) },
            { name: "Yearly cost", color: "var(--amber-fg)", values: top.map((f) => f.species.econ.costUsdHa) },
            { name: "Setup", color: "var(--red-fg)", values: top.map((f) => f.species.econ.setupUsdHa) },
          ]} />
          {plan && plan.trials.length > 0 && <p className="mt-1 text-[11px] text-ink-2">{`Your plan: investment ${usd(plan.totals.investment)}, margin at full production ${usd(plan.totals.trialMargin)} a year.`}</p>}
        </Frame>
      );
    }
    case "seasons":
      return (
        <Frame title="Your year, season by season">
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {SEASONS.map((s) => (
              <div key={s.id} className="rounded-lg bg-surface-2 p-2">
                <div className="font-medium">{s.name} <span className="text-subtle">{s.range}</span></div>
                <div className="mt-0.5 text-ink-2">{advice?.seasons?.[s.id] ?? plan?.seasons.find((x) => x.name === s.name)?.focus}</div>
              </div>
            ))}
          </div>
        </Frame>
      );
    case "distribution":
      if (!plan) return null;
      return (
        <Frame title="How to divide your field" note={plan.plots.map((p) => `${p.name}: ${p.ha} ha`).join(" · ")}>
          <FieldMap plots={plan.plots} hedgeM={plan.hedgeM} areaHa={plan.areaHa} />
        </Frame>
      );
  }
}
