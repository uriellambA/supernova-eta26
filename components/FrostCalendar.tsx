"use client";
import { useState } from "react";
import { CROPS } from "@/config/crops";
import { shortDate } from "@/lib/agro";
import type { IndicadoresNasa } from "@/lib/types";

const BINS = [
  { max: -2, color: "#a3302a", name: "≤ −2 °C hard frost" },
  { max: 0, color: "#e07a6c", name: "−2 to 0 °C frost" },
  { max: 2, color: "#e8c178", name: "0 to 2 °C risk" },
  { max: Infinity, color: "var(--surface-2)", name: "> 2 °C" },
];
const color = (t: number | null) => (t === null ? "var(--canvas)" : BINS.find((b) => t <= b.max)!.color);

export function FrostCalendar({ c, compact = false }: { c: IndicadoresNasa; compact?: boolean }) {
  const sensitive = CROPS.filter((x) => x.sensitive);
  const [cropId, setCropId] = useState(sensitive[0]?.id ?? "");
  const [low, setLow] = useState(false);
  const { anios, dias, tmin } = c.calendario;
  const corr = low ? -1.5 : 0;
  const cw = 6, ch = 11, left = 34, top = 16;
  const W = left + dias.length * cw + 4, H = top + anios.length * ch + 4;
  const crop = sensitive.find((x) => x.id === cropId);
  const xOf = (md: string) => {
    const i = dias.findIndex((d) => d >= md);
    return left + (i === -1 ? dias.length : i) * cw;
  };
  const late = tmin.filter((row) => row.some((t, i) => t !== null && t + corr <= 0 && dias[i] > "11-01")).length;
  return (
    <div>
      {!compact && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-ink-2">
          <label className="flex items-center gap-2">
            Show sensitive stage of
            <select className="rounded-lg border border-line bg-surface px-2 py-1" value={cropId} onChange={(e) => setCropId(e.target.value)}>
              {sensitive.map((x) => <option key={x.id} value={x.id}>{x.emoji} {x.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
            My field is in a low spot (−1.5 °C)
          </label>
        </div>
      )}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Spring frost calendar">
          {[["09-01", "Sep"], ["10-01", "Oct"], ["11-01", "Nov"], ["12-01", "Dec"]].map(([md, n]) => (
            <g key={md}>
              <text x={xOf(md) + 2} y={10} fontSize={9} fill="var(--chart-axis)">{n}</text>
              <line x1={xOf(md)} x2={xOf(md)} y1={top - 3} y2={H} stroke="var(--line-strong)" strokeWidth={0.6} />
            </g>
          ))}
          {anios.map((a, k) => (
            <g key={a}>
              <text x={left - 4} y={top + k * ch + ch - 3} fontSize={8} textAnchor="end" fill="var(--chart-axis)">{a}</text>
              {dias.map((d, i) => {
                const t = tmin[k][i];
                const tc = t === null ? null : +(t + corr).toFixed(1);
                return (
                  <rect key={d} x={left + i * cw} y={top + k * ch} width={cw - 0.7} height={ch - 1.2} rx={1} fill={color(tc)}>
                    <title>{`${shortDate(d)} ${a}: ${tc === null ? "no data" : `${tc} °C`}`}</title>
                  </rect>
                );
              })}
            </g>
          ))}
          {crop?.sensitive && (
            <rect x={xOf(crop.sensitive.from)} y={top - 3} width={xOf(crop.sensitive.to) - xOf(crop.sensitive.from) + cw} height={anios.length * ch + 4} fill="none" stroke="var(--ink)" strokeWidth={1.6} strokeDasharray="4 2" rx={3} />
          )}
          {c.ultimaHeladaMedia && c.ultimaHeladaMedia >= "09-01" && (
            <line x1={xOf(c.ultimaHeladaMedia) + cw / 2} x2={xOf(c.ultimaHeladaMedia) + cw / 2} y1={top - 3} y2={H} stroke="#5b8fc9" strokeWidth={1.5} />
          )}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {BINS.map((b) => (
          <span key={b.name} className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm border border-line" style={{ background: b.color }} /> {b.name}</span>
        ))}
        {crop?.sensitive && <span className="flex items-center gap-1"><span className="inline-block h-3 w-4 rounded-sm border border-dashed border-ink" /> {crop.name} {crop.sensitive.stage}</span>}
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-0.5 bg-[#5b8fc9]" /> average last frost ({shortDate(c.ultimaHeladaMedia)})</span>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        Frost after Nov 1 happened in <b className="text-ink">{late} of the last {anios.length} years</b>{low ? " (low-spot correction)" : ""}.
        In 4 of 5 years the last frost comes before <b className="text-ink">{shortDate(c.ultimaHeladaP80)}</b>.
      </p>
    </div>
  );
}
