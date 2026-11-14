"use client";
import { WEATHER_VARS, type WeatherGrid, type WeatherVarId } from "@/lib/weathergrid";
import type { OverlayId } from "./MapView";

export const FILTERS: { id: OverlayId; name: string; desc: string; legend: string }[] = [
  { id: "vegetation", name: "Vegetation · NDVI", desc: "8-day index: how green and active plants are", legend: "linear-gradient(90deg,#a16207,#facc15,#22c55e,#065f46)" },
  { id: "evi", name: "Vegetation · EVI", desc: "Enhanced index: sharper in dense orchards, less soil noise", legend: "linear-gradient(90deg,#a16207,#facc15,#22c55e,#065f46)" },
  { id: "temperature", name: "Land temperature", desc: "Daytime surface heat: spots plants with heat stress", legend: "linear-gradient(90deg,#1e3a8a,#22d3ee,#facc15,#dc2626)" },
  { id: "salinity", name: "Salinity risk · SMAP", desc: "Where salts can build up: SMAP satellite soil moisture (9 km) in this dry climate. Wet surface + strong evaporation = higher risk. Confirm with an EC test", legend: "linear-gradient(90deg,#2ea05a,#ebcd50,#e6782d,#be2828)" },
  { id: "snow", name: "Snow cover", desc: "Snow on the mountains = irrigation water in summer", legend: "linear-gradient(90deg,#334155,#e0f2fe)" },
  { id: "relief", name: "Terrain relief", desc: "Slopes and low spots where cold air and water collect", legend: "linear-gradient(90deg,#020617,#94a3b8)" },
  { id: "latest", name: "Latest pass", desc: "Most recent wide-area satellite image (true color)", legend: "linear-gradient(90deg,#78716c,#e7e5e4)" },
];

export function FiltersPanel({ active, toggle }: { active: Set<OverlayId>; toggle: (id: OverlayId) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => {
        const on = active.has(f.id);
        return (
          <button
            key={f.id}
            onClick={() => toggle(f.id)}
            aria-pressed={on}
            title={f.desc}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${on ? "border-ink bg-ink text-canvas" : "border-line bg-surface text-ink-2 hover:bg-surface-2"}`}
          >
            {on ? <span className="h-2 w-5 rounded-full" style={{ background: f.legend }} /> : <span className="h-2 w-2 rounded-full border border-current" />}
            {f.name}
          </button>
        );
      })}
    </div>
  );
}

/** Weather variables painted on the map (current conditions on a grid over the site). */
export function WeatherPicker({ value, onChange }: { value: WeatherVarId | null; onChange: (v: WeatherVarId | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Weather on the map">
      {WEATHER_VARS.map((v) => {
        const on = value === v.id;
        return (
          <button key={v.id} onClick={() => onChange(on ? null : v.id)} aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${on ? "border-ink bg-ink text-canvas" : "border-line bg-surface text-ink-2 hover:bg-surface-2"}`}>
            {on ? <span className="h-2 w-5 rounded-full" style={{ background: `linear-gradient(90deg,${v.stops.join(",")})` }} /> : <span className="h-2 w-2 rounded-full border border-current" />}
            {v.name}
          </button>
        );
      })}
    </div>
  );
}

export function WeatherLegend({ varId, grid }: { varId: WeatherVarId; grid: WeatherGrid | null }) {
  const v = WEATHER_VARS.find((x) => x.id === varId)!;
  const vals = (grid?.values[v.param] ?? []).filter((x): x is number => x !== null);
  const time = grid?.time ? new Date(grid.time + (grid.time.endsWith("Z") ? "" : "Z")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-2 text-[11px] text-muted">
      <span className="font-medium text-ink">{v.name}</span>
      <span>{v.min}{v.unit}</span>
      <span className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(90deg,${v.stops.join(",")})` }} />
      <span>{v.max}{v.unit}</span>
      {vals.length > 0 && <span>{`· now ${Math.min(...vals).toFixed(0)}–${Math.max(...vals).toFixed(0)} ${v.unit}`.trim()}</span>}
      {time && <span>{`· updated ${time}`}</span>}
      {!grid && <span>Loading weather…</span>}
      {varId === "wind" && <span>· arrows show where the wind blows</span>}
    </div>
  );
}
