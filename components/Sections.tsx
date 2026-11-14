"use client";
import { useState } from "react";
import { CROPS, cropById } from "@/config/crops";
import { MONTHS, shortDate } from "@/lib/agro";
import type { Option } from "@/lib/options";
import { EFFICIENCY, METHOD_NAME, nextDaysNeed, seasonNeed } from "@/lib/riego";
import type { ClimaResumen, FarmProfile, GroundReading, IndicadoresNasa, NdviResumen, NieveResumen, Priorities, SistemaRiego, SoilResumen, StrategyResult } from "@/lib/types";
import { LineChart, TempChart, WaterChart, ndviPoints } from "./Charts";
import { FrostCalendar } from "./FrostCalendar";
import { SnowGauge } from "./SnowGauge";
import { LEVEL_RING, LevelPill, Note, Panel, Stat, input } from "./ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;

// ---------------- Overview ----------------
export function Overview({ c, current }: { c: IndicadoresNasa; current: StrategyResult | null }) {
  const bareWinter = current ? current.metrics.bareMonths >= 3 : false;
  const rows: { name: string; color: string; v: (m: IndicadoresNasa["mensual"][number]) => number; fmt: (m: IndicadoresNasa["mensual"][number]) => string }[] = [
    { name: "Frost", color: "251,113,133", v: (m) => Math.min(1, m.diasHelada / 20), fmt: (m) => `${m.diasHelada} frost days` },
    { name: "Heat", color: "251,146,60", v: (m) => Math.min(1, m.diasCalor / 5), fmt: (m) => `${m.diasCalor} days ≥ 30 °C` },
    { name: "Water deficit", color: "250,204,21", v: (m) => Math.min(1, Math.max(0, m.et0 - m.lluvia) / 150), fmt: (m) => `${Math.round(m.et0 - m.lluvia)} mm more evaporation than rain` },
    { name: "Wind", color: "56,189,248", v: (m) => Math.min(1, Math.max(0, m.viento - 3) / 4), fmt: (m) => `${m.viento} m/s average` },
    { name: "Bare soil", color: "168,162,158", v: (m) => (bareWinter && m.mes >= 5 && m.mes <= 9 ? 0.9 : 0), fmt: (m) => (bareWinter && m.mes >= 5 && m.mes <= 9 ? "field usually empty" : "covered") },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Stat label="Frost-free days" value={c.libreHeladas} hint="Length of the safe growing season" />
        <Stat label="Last spring frost" value={shortDate(c.ultimaHeladaMedia)} hint={`4 of 5 years before ${shortDate(c.ultimaHeladaP80)}`} />
        <Stat label="Rain" value={c.lluviaAnual} unit="mm/yr" hint="Very dry: irrigation is essential" />
        <Stat label="Evaporation" value={c.et0Anual} unit="mm/yr" hint="Water the air pulls from soil and plants (ET0)" />
        <Stat label="Spring wind" value={c.vientoPrimavera} unit="m/s" hint="Drives wind erosion of bare soil" />
        <Stat label="Frost days" value={c.diasHeladaAnio} unit="/yr" />
        <Stat label="Temperature trend" value={c.tendencia ? `${c.tendencia.dif > 0 ? "+" : ""}${c.tendencia.dif}` : "—"} unit="°C" hint={`Recent vs earlier years (${c.periodo.join("–")})`} />
        <Stat label="Rain trend" value={c.tendenciaLluvia ? `${c.tendenciaLluvia.difPct > 0 ? "+" : ""}${c.tendenciaLluvia.difPct}` : "—"} unit="%" hint="Recent vs earlier years" />
      </div>
      <Panel title="Field calendar: when is the field vulnerable?" className="!p-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] border-separate border-spacing-[3px] text-[11px]">
            <thead>
              <tr>
                <th />
                {MONTHS.map((m) => <th key={m} className="font-medium text-slate-400">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="whitespace-nowrap pr-2 text-slate-300">{r.name}</td>
                  {c.mensual.map((m) => (
                    <td key={m.mes} title={`${MONTHS[m.mes - 1]}: ${r.fmt(m)}`} className="h-6 rounded" style={{ background: `rgba(${r.color},${0.08 + r.v(m) * 0.85})` }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Darker = higher risk. Hover a cell for the value. Winter months with bare soil and strong spring winds are the best moments for a cover crop.</p>
      </Panel>
      <Panel title="Temperature by month" className="!p-3"><TempChart m={c.mensual} /></Panel>
      <Panel title="Rain vs evaporation" className="!p-3">
        <WaterChart m={c.mensual} />
        <p className="text-[11px] text-slate-400"><span className="text-amber-400">■</span> evaporation (ET0) · <span className="text-sky-400">■</span> rain. The gap is what irrigation must supply.</p>
      </Panel>
    </div>
  );
}

// ---------------- Soil ----------------
export function Soil({ s, c, ndvi, readings }: { s: SoilResumen; c: IndicadoresNasa | null; ndvi: NdviResumen | null; readings: GroundReading[] }) {
  const health = s.organicMatter >= 3 ? "good" : s.organicMatter >= 1.5 ? "watch" : "alert";
  const last = readings.at(-1);
  return (
    <div className="space-y-4">
      {s.source === "reference" && <Note kind="warn">No soil-map data for this exact point: showing regional reference values for Los Antiguos. A lab soil test will improve every recommendation.</Note>}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Texture" value={<span className="text-lg">{s.texture}</span>} hint={`${s.depth}`} />
            <Stat label="Organic matter" value={s.organicMatter} unit="%" hint="> 3% is healthy; feeds life and holds water" />
            <Stat label="Water holding" value={s.waterHolding} unit="mm" hint="Plant-available water in the top 60 cm" />
            <Stat label="pH" value={s.ph} hint={s.ph > 7.8 ? "Alkaline: watch iron/zinc" : s.ph < 6 ? "Acidic" : "Good range"} />
            <Stat label="Nitrogen" value={s.nitrogen} unit="g/kg" />
            <Stat label="CEC" value={s.cec} unit="cmol/kg" hint="Capacity to hold nutrients" />
            <Stat label="Bulk density" value={s.bulkDensity} unit="g/cm³" hint={s.bulkDensity > 1.5 ? "Compacted" : "OK"} />
            <Stat label="Infiltration" value={<span className="text-lg capitalize">{s.infiltration}</span>} />
          </div>
          <div>
            <div className="mb-1 flex text-[11px] text-slate-400"><span>Sand {s.sand}%</span><span className="mx-auto">Silt {s.silt}%</span><span>Clay {s.clay}%</span></div>
            <div className="flex h-3 overflow-hidden rounded-full">
              <div className="bg-amber-300" style={{ width: `${s.sand}%` }} />
              <div className="bg-stone-400" style={{ width: `${s.silt}%` }} />
              <div className="bg-orange-700" style={{ width: `${s.clay}%` }} />
            </div>
          </div>
          <Panel className="!p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">Soil health <LevelPill level={health} /></div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {s.sand >= 50 && <li>Sandy soil: drains fast and blows away when bare. Keep it covered, especially Sep–Dec.</li>}
              {s.organicMatter < 2 && <li>Low organic matter: legumes, covers and manure will raise water holding over the years.</li>}
              {s.ph > 7.5 && <li>Slightly alkaline: choose tolerant varieties and avoid salt build-up with good irrigation.</li>}
              <li>Your soil holds ~{s.waterHolding} mm: in January the crop can use that in about {c ? Math.max(1, Math.round(s.waterHolding / Math.max(1, c.mensual[0].et0 / 31))) : "?"} days without irrigation.</li>
            </ul>
          </Panel>
        </div>
        <div className="space-y-3">
          {c && c.mensual.some((m) => m.humedadSup !== null) && (
            <Panel title="Soil moisture through the year" className="!p-3">
              <LineChart label="Surface soil wetness" points={c.mensual.map((m) => ({ x: MONTHS[m.mes - 1], y: m.humedadSup ?? 0 }))} color="#38bdf8" />
              <p className="text-[11px] text-slate-400">Satellite soil wetness (0 = dry, 1 = saturated), monthly average. It covers a wide area: a field sensor gives the exact value at your field.</p>
              {last && (last.moisture !== null) && <p className="mt-1 text-xs text-emerald-300">Your sensor ({last.date}): {last.moisture}% volumetric moisture{last.soilTemp !== null ? `, ${last.soilTemp} °C` : ""}.</p>}
            </Panel>
          )}
          {ndvi && ndvi.serie.length > 1 && (
            <Panel title="Vegetation health (NDVI)" className="!p-3">
              <LineChart label="NDVI" points={ndviPoints(ndvi.serie)} />
              <p className="text-[11px] text-slate-400">
                NDVI measures how green plants are (0 = bare soil, 0.8 = dense crop). Latest: <b className="text-white">{ndvi.ultimo?.ndvi}</b>
                {ndvi.anioAnterior && <> · a year ago: <b className="text-white">{ndvi.anioAnterior.ndvi}</b></>}. Low values in winter show bare soil.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Rotations ----------------
const PRI_LABEL: Record<keyof Priorities, string> = { water: "Save water", income: "Income", soil: "Soil health", forage: "Forage", labor: "Less work" };

export function Rotations({ results, pri, setPri }: { results: StrategyResult[]; pri: Priorities; setPri: (p: Priorities) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...results].sort((a, b) => b.score - a.score);
  return (
    <div className="space-y-4">
      <Panel title="What matters most to you?" className="!p-3">
        <div className="grid gap-3 sm:grid-cols-5">
          {(Object.keys(PRI_LABEL) as (keyof Priorities)[]).map((k) => (
            <label key={k} className="text-xs text-slate-300">
              <div className="mb-1 flex justify-between"><span>{PRI_LABEL[k]}</span><span className="text-slate-500">{["off", "low", "mid", "high"][pri[k]]}</span></div>
              <input type="range" min={0} max={3} step={1} value={pri[k]} onChange={(e) => setPri({ ...pri, [k]: Number(e.target.value) })} className="w-full accent-emerald-400" />
            </label>
          ))}
        </div>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((r, i) => {
          const isOpen = open === r.strategy.id;
          return (
            <article key={r.strategy.id} className={`rounded-2xl border-2 bg-slate-900/80 p-4 ${LEVEL_RING[r.level]}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                    <span className="text-slate-500">#{i + 1}</span>
                    {r.strategy.current && <span className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-200">Current</span>}
                    {i === 0 && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">Best match</span>}
                  </div>
                  <h4 className="mt-1 font-bold leading-tight text-white">{r.strategy.name}</h4>
                  <p className="mt-1 text-xs text-slate-400">{r.strategy.years.map((y) => `${cropById(y.main)?.name}${y.winter && y.winter !== y.main ? ` + ${cropById(y.winter)?.name.toLowerCase()}` : ""}`).join(" → ")}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black tabular-nums text-white">{r.score}</div>
                  <LevelPill level={r.level} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="rounded-lg bg-white/[0.04] p-1.5"><div className="text-slate-400">Water</div><div className="font-bold text-white">{r.metrics.waterMm} mm</div></div>
                <div className="rounded-lg bg-white/[0.04] p-1.5"><div className="text-slate-400">Bare</div><div className="font-bold text-white">{r.metrics.bareMonths} mo</div></div>
                <div className="rounded-lg bg-white/[0.04] p-1.5"><div className="text-slate-400">Erosion</div><div className="font-bold text-white">{pct(r.metrics.erosion)}</div></div>
                <div className="rounded-lg bg-white/[0.04] p-1.5"><div className="text-slate-400">N added</div><div className="font-bold text-white">{r.metrics.nitrogen} kg</div></div>
              </div>
              {r.benefits.length > 0 && <p className="mt-3 text-sm text-emerald-200">✓ {r.benefits.slice(0, 2).join(" · ")}</p>}
              {r.risks[0] && <p className="mt-1 text-sm text-amber-200">⚠ {r.risks[0]}</p>}
              <button className="mt-3 text-xs font-semibold text-emerald-300 hover:underline" onClick={() => setOpen(isOpen ? null : r.strategy.id)} aria-expanded={isOpen}>
                {isOpen ? "Hide details" : "Why? Evidence, gaps and risks"}
              </button>
              {isOpen && (
                <div className="mt-2 space-y-2 text-xs text-slate-300">
                  <Block title="Why it was suggested" items={r.why} />
                  <Block title="Evidence" items={r.evidence} />
                  {r.benefits.length > 0 && <Block title="Benefits" items={r.benefits} />}
                  <Block title="Information gaps" items={r.gaps} />
                  <Block title="Risks to review locally" items={r.risks} />
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {(Object.keys(PRI_LABEL) as (keyof Priorities)[]).map((k) => (
                      <div key={k}>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-400" style={{ width: pct(r.scores[k]) }} /></div>
                        <div className="mt-0.5 text-[10px] text-slate-500">{PRI_LABEL[k]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <Note>
        <b>Quick guide:</b> legumes (alfalfa, vetch, clover, peas, fava) fix nitrogen from the air · cover crops (rye, oats) protect bare soil from wind and add organic matter · deep roots (alfalfa, rye) open the soil so water soaks in · drought-tolerant crops (garlic, peas) need less irrigation.
      </Note>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="font-semibold text-slate-100">{title}</div>
      <ul className="list-disc pl-4">{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

// ---------------- What you can do ----------------
export function Options({ options }: { options: Option[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {options.map((o) => (
        <article key={o.id} className={`rounded-2xl border-2 bg-slate-900/80 p-4 ${LEVEL_RING[o.level]}`}>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{o.emoji}</span>
            <h4 className="font-bold text-white">{o.title}</h4>
            <span className="ml-auto"><LevelPill level={o.level}>{Math.round(o.fit * 100)}% fit</LevelPill></span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-100">{o.headline}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">{o.facts.map((f) => <li key={f}>{f}</li>)}</ul>
          <div className="mt-3 text-xs font-semibold text-slate-200">How to start</div>
          <ol className="list-decimal pl-5 text-xs text-slate-400">{o.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <div className="mt-3 text-[11px] text-slate-500">Cost: {o.cost}</div>
        </article>
      ))}
    </div>
  );
}

// ---------------- Forecast ----------------
export function Forecast({ f }: { f: ClimaResumen }) {
  const next = f.dias.filter((d) => !d.pasado).slice(0, 14);
  const alerts = next.slice(0, 7).flatMap((d) => {
    const day = new Date(d.fecha + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
    const a: string[] = [];
    if (d.tmin <= 0) a.push(`🥶 ${day}: frost ${d.tmin} °C${d.horaMin ? ` around ${d.horaMin}` : ""}. Protect blossoms and seedlings.`);
    if (d.rafagas > 60) a.push(`💨 ${day}: gusts ${Math.round(d.rafagas)} km/h. Don't spray; check windbreaks.`);
    if (d.lluvia > 8) a.push(`🌧️ ${day}: ${d.lluvia} mm rain. You can skip one irrigation.`);
    return a;
  });
  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {next.map((d) => {
          const frost = d.tmin <= 0;
          const dt = new Date(d.fecha + "T12:00:00");
          return (
            <div key={d.fecha} className={`w-20 shrink-0 rounded-xl border p-2 text-center ${frost ? "border-rose-500/60 bg-rose-500/10" : "border-white/10 bg-white/[0.03]"}`}>
              <div className="text-[11px] font-semibold text-slate-300">{dt.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className="text-[10px] text-slate-500">{dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              <div className="my-1 text-lg">{frost ? "🥶" : d.lluvia > 2 ? "🌧️" : d.rafagas > 60 ? "💨" : "☀️"}</div>
              <div className="text-sm font-bold text-orange-300">{Math.round(d.tmax)}°</div>
              <div className={`text-sm font-bold ${frost ? "text-rose-300" : "text-sky-300"}`}>{Math.round(d.tmin)}°</div>
              <div className="mt-1 text-[10px] text-slate-400">💧{d.lluvia} · 💨{Math.round(d.rafagas)}</div>
            </div>
          );
        })}
      </div>
      <Panel title="This week" className="!p-3">
        {alerts.length ? <ul className="space-y-1 text-sm text-slate-200">{alerts.map((a) => <li key={a}>{a}</li>)}</ul> : <p className="text-sm text-slate-300">✅ Calm week: no frost, strong wind or heavy rain expected.</p>}
        {f.elevacion !== null && <p className="mt-2 text-[11px] text-slate-500">Field elevation {Math.round(f.elevacion)} m. Temperatures in °C, rain in mm, gusts in km/h.</p>}
      </Panel>
    </div>
  );
}

// ---------------- Frost ----------------
export function Frost({ c }: { c: IndicadoresNasa }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Panel title="Spring frost calendar (each row is a year, each cell a day)" className="!p-3"><FrostCalendar c={c} /></Panel>
      <Panel title="Chance of frost by week" className="!p-3">
        <div className="flex h-36 items-end gap-1">
          {c.probSemanal.map((s) => (
            <div key={s.inicio} className="flex flex-1 flex-col items-center gap-1" title={`Week of ${shortDate(s.inicio)}: ${pct(s.p0)} frost, ${pct(s.p2)} hard frost`}>
              <div className="relative w-full rounded-t bg-rose-400/70" style={{ height: `${s.p0 * 100}px` }}>
                <div className="absolute bottom-0 w-full rounded-t bg-rose-700" style={{ height: `${s.p2 * 100}px` }} />
              </div>
              <span className="text-[8px] text-slate-500">{shortDate(s.inicio).replace(" ", " ")}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Light red: frost (≤ 0 °C). Dark red: hard frost (≤ −2 °C). Frost risk = how often temperatures dropped below freezing in past years.</p>
      </Panel>
    </div>
  );
}

// ---------------- Water ----------------
export function Water({ c, f, snow, farm, setFarm }: { c: IndicadoresNasa; f: ClimaResumen | null; snow: NieveResumen | null; farm: FarmProfile; setFarm: (p: FarmProfile) => void }) {
  const [cropId, setCropId] = useState("cherry");
  const crop = CROPS.find((x) => x.id === cropId)!;
  const season = seasonNeed(crop.kc, c.mensual) || crop.water;
  const week = f ? nextDaysNeed(crop.kc, f.dias, 7) : null;
  const methods = Object.keys(EFFICIENCY) as SistemaRiego[];
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Panel title="Irrigation calculator" className="!p-3">
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-slate-400">Crop<select className={input} value={cropId} onChange={(e) => setCropId(e.target.value)}>{CROPS.map((x) => <option key={x.id} value={x.id}>{x.emoji} {x.name}</option>)}</select></label>
          <label className="text-xs text-slate-400">Area (ha)<input type="number" min={0.1} step={0.5} className={input} value={farm.areaHa} onChange={(e) => setFarm({ ...farm, areaHa: Number(e.target.value) || 1 })} /></label>
          <label className="text-xs text-slate-400">Method<select className={input} value={farm.irrigation} onChange={(e) => setFarm({ ...farm, irrigation: e.target.value as SistemaRiego })}>{methods.map((m) => <option key={m} value={m}>{METHOD_NAME[m]}</option>)}</select></label>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {week && <Stat label="Next 7 days" value={fmt(week.net / EFFICIENCY[farm.irrigation])} unit="mm" hint={`≈ ${fmt((week.net / EFFICIENCY[farm.irrigation]) * 10 * farm.areaHa)} m³ for ${farm.areaHa} ha`} />}
          <Stat label="Season need (net)" value={fmt(season)} unit="mm" hint="What the crop uses, Sep–Apr" />
          <Stat label="Season, your method" value={fmt((season / EFFICIENCY[farm.irrigation]) * 10 * farm.areaHa)} unit="m³" />
        </div>
        <div className="mt-3 space-y-1.5">
          {methods.map((m) => {
            const v = (season / EFFICIENCY[m]) * 10 * farm.areaHa;
            const max = (season / EFFICIENCY.flood) * 10 * farm.areaHa;
            return (
              <div key={m} className="flex items-center gap-2 text-xs">
                <span className={`w-20 ${m === farm.irrigation ? "font-bold text-white" : "text-slate-400"}`}>{METHOD_NAME[m]}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full ${m === "drip" ? "bg-emerald-400" : "bg-sky-500"}`} style={{ width: `${(v / max) * 100}%` }} /></div>
                <span className="w-24 text-right tabular-nums text-slate-300">{fmt(v)} m³</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Evapotranspiration (ET0) × crop coefficient − useful rain, divided by the efficiency of each method.</p>
      </Panel>
      <Panel title="Snowpack: your summer water" className="!p-3">
        {snow ? (
          <>
            <SnowGauge c={snow.cuencas[0]} />
            <p className="mt-3 text-xs text-slate-300">
              {snow.indice >= 0.9 ? "Good snow year: canals should run normally." : snow.indice >= 0.6 ? "Less snow than normal: water may get tight in late summer. Favor drip and low-water crops." : "Low snow: expect irrigation restrictions. Choose the water-saver rotation."}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">Snowpack data not available right now.</p>
        )}
      </Panel>
    </div>
  );
}
