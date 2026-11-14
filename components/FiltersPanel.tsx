"use client";
import type { OverlayId } from "./MapView";

export const FILTERS: { id: OverlayId; name: string; desc: string; legend: string }[] = [
  { id: "vegetation", name: "Vegetation health", desc: "NDVI, 8-day: how green and active plants are", legend: "linear-gradient(90deg,#a16207,#facc15,#22c55e,#065f46)" },
  { id: "temperature", name: "Land temperature", desc: "Daytime surface heat: spots plants with heat stress", legend: "linear-gradient(90deg,#1e3a8a,#22d3ee,#facc15,#dc2626)" },
  { id: "snow", name: "Snow cover", desc: "Snow on the mountains = irrigation water in summer", legend: "linear-gradient(90deg,#334155,#e0f2fe)" },
  { id: "relief", name: "Terrain relief", desc: "Slopes and low spots where cold air and water collect", legend: "linear-gradient(90deg,#020617,#94a3b8)" },
  { id: "latest", name: "Latest pass", desc: "Most recent wide-area satellite image (true color)", legend: "linear-gradient(90deg,#78716c,#e7e5e4)" },
];

export function FiltersPanel({ active, toggle }: { active: Set<OverlayId>; toggle: (id: OverlayId) => void }) {
  return (
    <div className="flex gap-2 lg:block lg:space-y-2">
      {FILTERS.map((f) => {
        const on = active.has(f.id);
        return (
          <button
            key={f.id}
            onClick={() => toggle(f.id)}
            aria-pressed={on}
            className={`w-40 shrink-0 rounded-xl border p-2.5 text-left transition lg:w-full ${on ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <span className={`h-3.5 w-3.5 rounded border ${on ? "border-emerald-400 bg-emerald-400" : "border-white/30"}`} />
              {f.name}
            </div>
            <div className="mt-1 hidden text-[11px] leading-snug text-slate-400 lg:block">{f.desc}</div>
            {on && <div className="mt-1.5 h-1.5 rounded-full" style={{ background: f.legend }} />}
          </button>
        );
      })}
    </div>
  );
}
