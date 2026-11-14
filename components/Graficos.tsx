import { NOMBRE_MES } from "@/lib/agro";
import type { Mensual, PuntoNdvi } from "@/lib/types";

/** Temperaturas mensuales (barra flotante mín–máx) — NASA POWER. */
export function GraficoTemperaturas({ mensual }: { mensual: Mensual[] }) {
  const W = 360, H = 170, p = 26;
  const lo = Math.floor(Math.min(...mensual.map((m) => m.tmin), 0) / 5) * 5;
  const hi = Math.ceil(Math.max(...mensual.map((m) => m.tmax)) / 5) * 5;
  const y = (t: number) => H - p - ((t - lo) / (hi - lo)) * (H - 2 * p);
  const bw = (W - p - 8) / 12;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Temperaturas mínimas y máximas medias por mes">
      {[lo, 0, (lo + hi) / 2, hi].filter((v, i, a) => a.indexOf(v) === i).map((t) => (
        <g key={t}>
          <line x1={p} x2={W - 4} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#3b82f6" : "#e2e8f0"} strokeDasharray={t === 0 ? "3 2" : undefined} />
          <text x={p - 4} y={y(t) + 3} fontSize={9} textAnchor="end" fill="#64748b">{Math.round(t)}°</text>
        </g>
      ))}
      {mensual.map((m, i) => (
        <g key={m.mes}>
          <rect x={p + i * bw + 3} y={y(m.tmax)} width={bw - 6} height={Math.max(1, y(m.tmin) - y(m.tmax))} rx={4} fill="url(#gradT)">
            <title>{`${NOMBRE_MES[i]}: mín ${m.tmin} °C · máx ${m.tmax} °C`}</title>
          </rect>
          <text x={p + i * bw + bw / 2} y={H - 8} fontSize={9} textAnchor="middle" fill="#475569">{NOMBRE_MES[i]}</text>
        </g>
      ))}
      <defs>
        <linearGradient id="gradT" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f97316" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Lluvia vs. evapotranspiración mensual — NASA POWER. */
export function GraficoAgua({ mensual }: { mensual: Mensual[] }) {
  const W = 360, H = 170, p = 26;
  const hi = Math.ceil(Math.max(...mensual.map((m) => Math.max(m.et0, m.lluvia)), 10) / 50) * 50;
  const y = (v: number) => H - p - (v / hi) * (H - 2 * p);
  const bw = (W - p - 8) / 12;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Lluvia y evapotranspiración por mes">
      {[0, hi / 2, hi].map((v) => (
        <g key={v}>
          <line x1={p} x2={W - 4} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
          <text x={p - 4} y={y(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{v}</text>
        </g>
      ))}
      {mensual.map((m, i) => (
        <g key={m.mes}>
          <rect x={p + i * bw + 2} y={y(m.et0)} width={bw / 2 - 2} height={H - p - y(m.et0)} rx={2} fill="#f59e0b">
            <title>{`${NOMBRE_MES[i]}: ET0 ${m.et0} mm`}</title>
          </rect>
          <rect x={p + i * bw + bw / 2} y={y(m.lluvia)} width={bw / 2 - 2} height={H - p - y(m.lluvia)} rx={2} fill="#0ea5e9">
            <title>{`${NOMBRE_MES[i]}: lluvia ${m.lluvia} mm`}</title>
          </rect>
          <text x={p + i * bw + bw / 2} y={H - 8} fontSize={9} textAnchor="middle" fill="#475569">{NOMBRE_MES[i]}</text>
        </g>
      ))}
    </svg>
  );
}

/** Curva de NDVI MODIS. */
export function GraficoNdvi({ serie }: { serie: PuntoNdvi[] }) {
  if (serie.length < 2) return null;
  const W = 360, H = 150, p = 28;
  const t0 = Date.parse(serie[0].fecha), t1 = Date.parse(serie.at(-1)!.fecha);
  const x = (f: string) => p + ((Date.parse(f) - t0) / Math.max(1, t1 - t0)) * (W - p - 8);
  const y = (v: number) => H - p - Math.max(0, v) * (H - 2 * p);
  const d = serie.map((s, i) => `${i ? "L" : "M"}${x(s.fecha).toFixed(1)},${y(s.ndvi).toFixed(1)}`).join(" ");
  const anios = [...new Set(serie.map((s) => s.fecha.slice(0, 4)))];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="NDVI de los últimos dos años">
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={p} x2={W - 4} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
          <text x={p - 4} y={y(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{v}</text>
        </g>
      ))}
      {anios.map((a) => {
        const f = `${a}-01-01`;
        if (Date.parse(f) < t0) return null;
        return (
          <g key={a}>
            <line x1={x(f)} x2={x(f)} y1={p - 6} y2={H - p} stroke="#cbd5e1" strokeDasharray="2 2" />
            <text x={x(f) + 3} y={p - 8} fontSize={9} fill="#64748b">{a}</text>
          </g>
        );
      })}
      <path d={`${d} L${x(serie.at(-1)!.fecha)},${H - p} L${x(serie[0].fecha)},${H - p} Z`} fill="#16a34a22" />
      <path d={d} fill="none" stroke="#15803d" strokeWidth={2} />
      <circle cx={x(serie.at(-1)!.fecha)} cy={y(serie.at(-1)!.ndvi)} r={4} fill="#15803d" />
    </svg>
  );
}
