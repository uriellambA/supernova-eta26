import { MONTHS } from "@/lib/agro";
import type { Mensual, PuntoNdvi } from "@/lib/types";

const AXIS = "var(--chart-axis)";
const GRID = "var(--chart-grid)";

export function TempChart({ m }: { m: Mensual[] }) {
  const W = 360, H = 160, p = 26;
  const lo = Math.floor(Math.min(...m.map((x) => x.tmin), 0) / 5) * 5;
  const hi = Math.ceil(Math.max(...m.map((x) => x.tmax)) / 5) * 5;
  const y = (t: number) => H - p - ((t - lo) / (hi - lo || 1)) * (H - 2 * p);
  const bw = (W - p - 8) / 12;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Average monthly minimum and maximum temperature">
      {[lo, 0, hi].filter((v, i, a) => a.indexOf(v) === i).map((t) => (
        <g key={t}>
          <line x1={p} x2={W - 4} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#5b8fc9" : GRID} strokeDasharray={t === 0 ? "3 2" : undefined} />
          <text x={p - 4} y={y(t) + 3} fontSize={9} textAnchor="end" fill={AXIS}>{t}°</text>
        </g>
      ))}
      <defs>
        <linearGradient id="gT" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#d9824a" /><stop offset="1" stopColor="#6c9fd3" /></linearGradient>
      </defs>
      {m.map((x, i) => (
        <g key={x.mes}>
          <rect x={p + i * bw + 3} y={y(x.tmax)} width={bw - 6} height={Math.max(1, y(x.tmin) - y(x.tmax))} rx={4} fill="url(#gT)">
            <title>{`${MONTHS[i]}: min ${x.tmin} °C · max ${x.tmax} °C`}</title>
          </rect>
          <text x={p + i * bw + bw / 2} y={H - 8} fontSize={9} textAnchor="middle" fill={AXIS}>{MONTHS[i][0]}</text>
        </g>
      ))}
    </svg>
  );
}

export function WaterChart({ m }: { m: Mensual[] }) {
  const W = 360, H = 160, p = 26;
  const hi = Math.ceil(Math.max(...m.map((x) => Math.max(x.et0, x.lluvia)), 10) / 50) * 50;
  const y = (v: number) => H - p - (v / hi) * (H - 2 * p);
  const bw = (W - p - 8) / 12;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly rain vs evapotranspiration">
      {[0, hi / 2, hi].map((v) => (
        <g key={v}>
          <line x1={p} x2={W - 4} y1={y(v)} y2={y(v)} stroke={GRID} />
          <text x={p - 4} y={y(v) + 3} fontSize={9} textAnchor="end" fill={AXIS}>{v}</text>
        </g>
      ))}
      {m.map((x, i) => (
        <g key={x.mes}>
          <rect x={p + i * bw + 2} y={y(x.et0)} width={bw / 2 - 2} height={H - p - y(x.et0)} rx={2} fill="#d9a441"><title>{`${MONTHS[i]}: evaporation ${x.et0} mm`}</title></rect>
          <rect x={p + i * bw + bw / 2} y={y(x.lluvia)} width={bw / 2 - 2} height={H - p - y(x.lluvia)} rx={2} fill="#5b8fc9"><title>{`${MONTHS[i]}: rain ${x.lluvia} mm`}</title></rect>
          <text x={p + i * bw + bw / 2} y={H - 8} fontSize={9} textAnchor="middle" fill={AXIS}>{MONTHS[i][0]}</text>
        </g>
      ))}
    </svg>
  );
}

export function LineChart({ points, label, color = "#3f8f5a", min = 0, max = 1, second }: { points: { x: string; y: number }[]; label: string; color?: string; min?: number; max?: number; second?: { points: { x: string; y: number }[]; color: string } }) {
  if (points.length < 2) return null;
  const W = 360, H = 140, p = 28;
  const x = (i: number) => p + (i / (points.length - 1)) * (W - p - 8);
  const y = (v: number) => H - p - ((v - min) / (max - min)) * (H - 2 * p);
  const d = points.map((pt, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pt.y).toFixed(1)}`).join(" ");
  const ticks = [min, (min + max) / 2, max];
  const every = Math.ceil(points.length / 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={p} x2={W - 4} y1={y(v)} y2={y(v)} stroke={GRID} />
          <text x={p - 4} y={y(v) + 3} fontSize={9} textAnchor="end" fill={AXIS}>{+v.toFixed(2)}</text>
        </g>
      ))}
      <path d={`${d} L${x(points.length - 1)},${H - p} L${x(0)},${H - p} Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
      {second && second.points.length > 1 && (
        <path d={second.points.map((pt, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pt.y).toFixed(1)}`).join(" ")} fill="none" stroke={second.color} strokeWidth={1.6} strokeDasharray="4 3" />
      )}
      {points.map((pt, i) => (i % every === 0 || i === points.length - 1 ? <text key={i} x={x(i)} y={H - 8} fontSize={8.5} textAnchor="middle" fill={AXIS}>{pt.x}</text> : null))}
    </svg>
  );
}

export const ndviPoints = (s: PuntoNdvi[]) => s.map((p) => ({ x: `${MONTHS[+p.fecha.slice(5, 7) - 1]} ${p.fecha.slice(2, 4)}`, y: p.ndvi }));

export const eviPoints = (s: PuntoNdvi[]) => s.map((p) => ({ x: `${MONTHS[+p.fecha.slice(5, 7) - 1]} ${p.fecha.slice(2, 4)}`, y: p.evi ?? 0 }));
