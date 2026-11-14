"use client";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/config/app";
import { SITE } from "@/config/site";
import { shortDate } from "@/lib/agro";
import type { Option } from "@/lib/options";
import type { SpeciesFit } from "@/lib/suitability";
import type { AdvisorResult, FarmProfile, IndicadoresNasa, SoilResumen, StrategyResult } from "@/lib/types";

/** Print-only report (Share → PDF uses window.print). */
export function Report({ field, farm, c, soil, results, advice, options, fits }: {
  field: { lat: number; lon: number; name: string }; farm: FarmProfile; c: IndicadoresNasa | null; soil: SoilResumen | null;
  results: StrategyResult[]; advice: AdvisorResult | null; options: Option[]; fits: SpeciesFit[];
}) {
  const sorted = [...results].sort((a, b) => b.score - a.score);
  const [today, setToday] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- date only known in the browser
  useEffect(() => setToday(new Date().toLocaleDateString("en-US", { dateStyle: "long" })), []);
  return (
    <div className="hidden bg-white p-2 text-[11.5px] text-black print:block">
      <div className="flex items-end justify-between border-b-2 border-black pb-2">
        <div>
          <div className="text-xl font-bold">{APP_NAME} · Field report</div>
          <div>{field.name}, {SITE.name} ({SITE.region}) · {field.lat.toFixed(3)}, {field.lon.toFixed(3)} · {farm.areaHa} ha · {farm.system}, {farm.irrigation} irrigation</div>
        </div>
        <div>{today}</div>
      </div>
      {advice && <p className="mt-2 rounded border p-2">{advice.summary}</p>}
      <h2 className="mt-3 font-bold">Rotation strategies compared</h2>
      <table className="w-full border-collapse">
        <thead><tr className="border-b text-left"><th>Strategy</th><th>Score</th><th>Water mm/yr</th><th>Bare months</th><th>Erosion</th><th>N kg/ha</th><th>Main benefit / risk</th></tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.strategy.id} className="border-b align-top">
              <td>{r.strategy.name}{r.strategy.current ? " (current)" : ""}</td><td>{r.score}</td><td>{r.metrics.waterMm}</td><td>{r.metrics.bareMonths}</td>
              <td>{Math.round(r.metrics.erosion * 100)}%</td><td>{r.metrics.nitrogen}</td><td>{r.benefits[0] ?? r.risks[0] ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-4">
        {c && (
          <div>
            <h2 className="font-bold">Climate (record {c.periodo.join("–")})</h2>
            <p>{c.libreHeladas} frost-free days · last spring frost {shortDate(c.ultimaHeladaMedia)} (4 of 5 years before {shortDate(c.ultimaHeladaP80)}) · {c.lluviaAnual} mm rain vs {c.et0Anual} mm evaporation · spring wind {c.vientoPrimavera} m/s.</p>
          </div>
        )}
        {soil && (
          <div>
            <h2 className="font-bold">Soil (0–30 cm{soil.source === "reference" ? ", regional reference" : ""})</h2>
            <p>{soil.texture} · sand {soil.sand}% / silt {soil.silt}% / clay {soil.clay}% · organic matter {soil.organicMatter}% · pH {soil.ph} · water holding {soil.waterHolding} mm.</p>
          </div>
        )}
      </div>
      {advice?.seasons && (
        <>
          <h2 className="mt-3 font-bold">Year plan</h2>
          <ul>{(["spring", "summer", "autumn", "winter"] as const).map((k) => <li key={k}><b className="capitalize">{k}:</b> {advice.seasons![k]}</li>)}</ul>
        </>
      )}
      <h2 className="mt-3 font-bold">New crops ranked for this field</h2>
      <table className="w-full border-collapse">
        <thead><tr className="border-b text-left"><th>Species</th><th>Viability</th><th>Soil &amp; climate</th><th>Margin USD/ha</th><th>Payback</th><th>Main limit</th></tr></thead>
        <tbody>
          {fits.filter((f) => f.species.status === "new").slice(0, 6).map((f) => (
            <tr key={f.species.id} className="border-b align-top"><td>{f.species.name}</td><td>{f.viability}</td><td>{f.agro}</td><td>{f.economy.margin.toLocaleString("en-US")}</td><td>{f.economy.paybackYears ?? "—"} yr</td><td>{f.limits[0] ?? "—"}</td></tr>
          ))}
        </tbody>
      </table>
      <h2 className="mt-3 font-bold">What you can do</h2>
      <ul>{options.map((o) => <li key={o.id}>{o.emoji} <b>{o.title}</b> ({Math.round(o.fit * 100)}% fit): {o.headline}</li>)}</ul>
      {advice?.askExpert.length ? <><h2 className="mt-3 font-bold">Check with a local expert</h2><ul>{advice.askExpert.map((a) => <li key={a}>• {a}</li>)}</ul></> : null}
      <p className="mt-4 border-t pt-2 text-[10px] text-gray-600">Decision-support tool: it highlights patterns and options, it does not replace the farmer&apos;s judgment or local agronomic advice.</p>
    </div>
  );
}
