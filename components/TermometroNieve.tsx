import type { NieveCuenca } from "@/lib/types";

export function TermometroNieve({ c }: { c: NieveCuenca }) {
  const pct = Math.round(c.pct * 100);
  const lleno = Math.min(150, pct) / 150; // escala hasta 150 %
  const color = c.pct >= 0.9 ? "#0284c7" : c.pct >= 0.6 ? "#f59e0b" : "#dc2626";
  const H = 180;
  return (
    <div className="flex items-end gap-4">
      <svg viewBox="0 0 60 220" className="h-56 w-16 shrink-0" role="img" aria-label={`${c.nombre}: ${pct} % de lo normal`}>
        <rect x={20} y={10} width={20} height={H} rx={10} fill="#e2e8f0" />
        <rect x={20} y={10 + H * (1 - lleno)} width={20} height={H * lleno} rx={10} fill={color} />
        <circle cx={30} cy={200} r={16} fill={color} />
        {/* marca del 100 % (lo normal) */}
        <line x1={14} x2={46} y1={10 + H * (1 - 100 / 150)} y2={10 + H * (1 - 100 / 150)} stroke="#0f172a" strokeWidth={2} />
        <text x={48} y={14 + H * (1 - 100 / 150)} fontSize={9} fill="#0f172a">100</text>
        <text x={30} y={204} fontSize={10} fill="#fff" textAnchor="middle" fontWeight={700}>❄</text>
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-700">{c.nombre}</div>
        <div className="text-4xl font-black tabular-nums" style={{ color }}>{pct}%</div>
        <div className="text-sm text-slate-600">
          de lo normal · temporada {c.temporada}: {c.actualCm} cm de nevadas acumuladas (promedio {c.promedioCm} cm)
        </div>
        <div className="mt-3 flex h-16 items-end gap-[2px]" role="img" aria-label="Nevadas acumuladas por temporada">
          {c.serie.map((s) => {
            const max = Math.max(...c.serie.map((x) => x.cm), 1);
            const actual = s.anio === c.temporada;
            return <div key={s.anio} title={`${s.anio}: ${s.cm} cm`} className={`flex-1 rounded-t ${actual ? "bg-sky-700" : "bg-sky-200"}`} style={{ height: `${(s.cm / max) * 100}%` }} />;
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>{c.serie[0]?.anio}</span>
          <span>{c.serie.at(-1)?.anio}</span>
        </div>
      </div>
    </div>
  );
}
