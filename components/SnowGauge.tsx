import type { NieveCuenca } from "@/lib/types";

export function SnowGauge({ c }: { c: NieveCuenca }) {
  const pct = Math.round(c.pct * 100);
  const fill = Math.min(150, pct) / 150;
  const col = c.pct >= 0.9 ? "#38bdf8" : c.pct >= 0.6 ? "#fbbf24" : "#fb7185";
  const H = 150;
  const max = Math.max(...c.serie.map((x) => x.cm), 1);
  return (
    <div className="flex items-end gap-4">
      <svg viewBox="0 0 56 190" className="h-44 w-12 shrink-0" role="img" aria-label={`Snowpack ${pct}% of normal`}>
        <rect x={18} y={8} width={20} height={H} rx={10} fill="#1e293b" />
        <rect x={18} y={8 + H * (1 - fill)} width={20} height={H * fill} rx={10} fill={col} />
        <circle cx={28} cy={172} r={15} fill={col} />
        <line x1={12} x2={44} y1={8 + H / 3} y2={8 + H / 3} stroke="#e2e8f0" strokeWidth={1.5} />
        <text x={46} y={12 + H / 3} fontSize={8} fill="#e2e8f0">100</text>
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-400">{c.nombre}</div>
        <div className="text-4xl font-black tabular-nums" style={{ color: col }}>{pct}%</div>
        <div className="text-xs text-slate-400">of normal · {c.actualCm} cm of snowfall this season vs {c.promedioCm} cm average</div>
        <div className="mt-3 flex h-12 items-end gap-[2px]" role="img" aria-label="Snowfall by season">
          {c.serie.map((s) => (
            <div key={s.anio} title={`${s.anio}: ${s.cm} cm`} className={`flex-1 rounded-t ${s.anio === c.temporada ? "bg-sky-400" : "bg-sky-900"}`} style={{ height: `${(s.cm / max) * 100}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500"><span>{c.serie[0]?.anio}</span><span>{c.serie.at(-1)?.anio}</span></div>
      </div>
    </div>
  );
}
