"use client";
import { useState } from "react";
import { CROPS } from "@/config/crops";
import { MONTHS, shortDate } from "@/lib/agro";
import type { Option } from "@/lib/options";
import type { SmapResumen } from "@/lib/smap";
import { EFFICIENCY, METHOD_NAME, nextDaysNeed, seasonNeed } from "@/lib/riego";
import type { ClimaResumen, FarmProfile, GroundReading, IndicadoresNasa, NdviResumen, NieveResumen, Salinity, SistemaRiego, SoilHealth, SoilResumen, StrategyResult } from "@/lib/types";
import { LineChart, TempChart, WaterChart, eviPoints, ndviPoints } from "./Charts";
import { FrostCalendar } from "./FrostCalendar";
import { SnowGauge } from "./SnowGauge";
import { Badge, Card, LevelPill, Meter, Note, Stat, input, label } from "./ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;

// ---------------- Overview ----------------
export function Overview({ c, current, ndvi }: { c: IndicadoresNasa; current: StrategyResult | null; ndvi: NdviResumen | null }) {
  const bareWinter = current ? current.metrics.bareMonths >= 3 : false;
  type M = IndicadoresNasa["mensual"][number];
  const rows: { name: string; color: string; v: (m: M) => number; fmt: (m: M) => string }[] = [
    { name: "Frost", color: "163,48,42", v: (m) => Math.min(1, m.diasHelada / 20), fmt: (m) => `${m.diasHelada} frost days` },
    { name: "Heat", color: "217,130,74", v: (m) => Math.min(1, m.diasCalor / 5), fmt: (m) => `${m.diasCalor} days ≥ 30 °C` },
    { name: "Water deficit", color: "196,150,52", v: (m) => Math.min(1, Math.max(0, m.et0 - m.lluvia) / 150), fmt: (m) => `${Math.round(m.et0 - m.lluvia)} mm more evaporation than rain` },
    { name: "Wind", color: "91,143,201", v: (m) => Math.min(1, Math.max(0, m.viento - 3) / 4), fmt: (m) => `${m.viento} m/s average` },
    { name: "UV", color: "140,90,170", v: (m) => Math.min(1, (m.uv ?? 0) / 9), fmt: (m) => `UV index ${m.uv ?? "—"}` },
    { name: "Bare soil", color: "120,113,108", v: (m) => (bareWinter && m.mes >= 5 && m.mes <= 9 ? 0.9 : 0), fmt: (m) => (bareWinter && m.mes >= 5 && m.mes <= 9 ? "field usually empty" : "covered") },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:col-span-5 lg:grid-cols-2 xl:grid-cols-3">
        <Stat label="Frost-free days" value={c.libreHeladas} hint="Length of the safe growing season" />
        <Stat label="Last spring frost" value={shortDate(c.ultimaHeladaMedia)} hint={`4 of 5 years before ${shortDate(c.ultimaHeladaP80)}`} />
        <Stat label="Coldest night" value={c.minAnual} unit="°C" hint="Average of each year's coldest night" />
        <Stat label="Rain" value={c.lluviaAnual} unit="mm/yr" hint="Very dry: irrigation is essential" />
        <Stat label="Evaporation" value={c.et0Anual} unit="mm/yr" hint="Water the air pulls from soil and plants (ET0)" />
        <Stat label="Humidity" value={c.humedadRelMedia ?? "—"} unit="%" hint="Average relative humidity of the air" />
        <Stat label="Pressure" value={c.presionMedia ?? "—"} unit="hPa" hint="Surface air pressure (lower with altitude)" />
        <Stat label="Summer UV" value={c.uvVerano ?? "—"} hint="UV index Dec–Feb: sunburn risk for fruit and people" />
        <Stat label="Spring wind" value={c.vientoPrimavera} unit="m/s" hint="Drives wind erosion of bare soil" />
        <Stat label="Chill hours" value={c.horasFrio} hint="Winter cold that fruit trees need to bloom well" />
        <Stat label="Temp. trend" value={c.tendencia ? `${c.tendencia.dif > 0 ? "+" : ""}${c.tendencia.dif}` : "—"} unit="°C" hint={`Recent vs earlier years (${c.periodo.join("–")})`} />
        <Stat label="Rain trend" value={c.tendenciaLluvia ? `${c.tendenciaLluvia.difPct > 0 ? "+" : ""}${c.tendenciaLluvia.difPct}` : "—"} unit="%" hint="Recent vs earlier years" />
      </div>
      <div className="grid gap-4 lg:col-span-7">
        <Card title="Field calendar: when is the field vulnerable?" eyebrow="20-year climate history">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] border-separate border-spacing-[3px] text-[11px]">
              <thead>
                <tr>
                  <th />
                  {MONTHS.map((m) => <th key={m} className="font-medium text-subtle">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td className="whitespace-nowrap pr-2 text-ink-2">{r.name}</td>
                    {c.mensual.map((m) => (
                      <td key={m.mes} title={`${MONTHS[m.mes - 1]}: ${r.fmt(m)}`} className="h-6 rounded" style={{ background: `rgba(${r.color},${0.06 + r.v(m) * 0.8})` }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {c.altura && <p className="mt-3 text-[11px] text-blue-fg">Temperatures adjusted {c.altura.deltaC > 0 ? "+" : ""}{c.altura.deltaC} °C: the regional climate history averages terrain at ~{c.altura.celda} m (Andes included); your field is at ~{c.altura.campo} m.</p>}
          <p className="mt-3 text-[11px] text-muted">Darker = higher risk. Hover a cell for the value. Winter months with bare soil and strong spring winds are the best moments for a cover crop.</p>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Temperature by month"><TempChart m={c.mensual} /></Card>
          <Card title="Rain vs evaporation">
            <WaterChart m={c.mensual} />
            <p className="text-[11px] text-muted"><span className="text-[#d9a441]">■</span> evaporation (ET0) · <span className="text-[#5b8fc9]">■</span> rain. The gap is what irrigation must supply.</p>
          </Card>
        </div>
        {ndvi && ndvi.serie.length > 1 && <VegetationCard ndvi={ndvi} />}
      </div>
    </div>
  );
}

export function VegetationCard({ ndvi }: { ndvi: NdviResumen }) {
  const hasEvi = ndvi.serie.some((p) => p.evi !== undefined);
  return (
    <Card title="Vegetation index · NDVI & EVI" eyebrow="Satellite, 250 m, every 16 days" right={<Badge tone="green">Latest NDVI {ndvi.ultimo?.ndvi}</Badge>}>
      <LineChart label="NDVI and EVI" points={ndviPoints(ndvi.serie)} second={hasEvi ? { points: eviPoints(ndvi.serie), color: "#b08a3c" } : undefined} />
      <p className="text-[11px] text-muted">
        <span className="text-[#3f8f5a]">━</span> NDVI: how green plants are (0 = bare soil, 0.8 = dense crop).{" "}
        {hasEvi && <><span className="text-[#b08a3c]">╌</span> EVI: like NDVI but does not saturate in dense canopies and corrects for soil and haze. </>}
        {ndvi.anioAnterior && <>A year ago NDVI was <b className="text-ink">{ndvi.anioAnterior.ndvi}</b>. </>}Low winter values show bare soil.
      </p>
    </Card>
  );
}

// ---------------- Soil ----------------
export function Soil({ s, c, ndvi, readings, sal, health, smap, onShowMap }: { s: SoilResumen; c: IndicadoresNasa | null; ndvi: NdviResumen | null; readings: GroundReading[]; sal: Salinity; health: SoilHealth; smap?: SmapResumen | null; onShowMap?: () => void }) {
  const last = readings.at(-1);
  return (
    <div className="space-y-4">
      {s.source === "reference" && <Note kind="warn">No soil-map data for this exact point: showing regional reference values for Los Antiguos. A lab soil test will improve every recommendation.</Note>}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Texture" value={<span className="text-lg">{s.texture}</span>} hint={s.depth} />
            <Stat label="Organic matter" value={s.organicMatter} unit="%" hint="> 3% is healthy; feeds life and holds water" />
            <Stat label="Water holding" value={s.waterHolding} unit="mm" hint="Plant-available water in the top 60 cm" />
            <Stat label="pH" value={s.ph} hint={s.ph > 7.8 ? "Alkaline: watch iron/zinc" : s.ph < 6 ? "Acidic" : "Good range"} />
            <Stat label="Nitrogen" value={s.nitrogen} unit="g/kg" />
            <Stat label="CEC" value={s.cec} unit="cmol/kg" hint="Capacity to hold nutrients" />
            <Stat label="Bulk density" value={s.bulkDensity} unit="g/cm³" hint={s.bulkDensity > 1.5 ? "Compacted" : "OK"} />
            <Stat label="Infiltration" value={s.ksat} unit="mm/h" hint={`${s.infiltration[0].toUpperCase()}${s.infiltration.slice(1)} — how fast water soaks in`} />
          </div>
          <Card title="Texture and water">
            <div className="mb-1 flex text-[11px] text-muted"><span>Sand {s.sand}%</span><span className="mx-auto">Silt {s.silt}%</span><span>Clay {s.clay}%</span></div>
            <div className="flex h-3 overflow-hidden rounded-full">
              <div className="bg-[#e3c995]" style={{ width: `${s.sand}%` }} />
              <div className="bg-[#b5aca1]" style={{ width: `${s.silt}%` }} />
              <div className="bg-[#9a5b3c]" style={{ width: `${s.clay}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-surface-2 p-2"><div className="text-muted">Field capacity</div><div className="font-semibold">{s.fieldCapacity}%</div></div>
              <div className="rounded-lg bg-surface-2 p-2"><div className="text-muted">Wilting point</div><div className="font-semibold">{s.wiltingPoint}%</div></div>
              <div className="rounded-lg bg-surface-2 p-2"><div className="text-muted">Days of reserve (Jan)</div><div className="font-semibold">{c ? Math.max(1, Math.round(s.waterHolding / Math.max(1, c.mensual[0].et0 / 31))) : "—"}</div></div>
            </div>
            <p className="mt-3 text-[11px] text-muted">Water values from texture and organic matter (Saxton &amp; Rawls pedotransfer equations). Field capacity = water left after drainage; wilting point = water plants cannot pull out.</p>
          </Card>
          <Card title="Salinity" right={<Badge tone={sal.cls === "low" ? "green" : sal.cls === "moderate" ? "amber" : "red"} dot>{sal.measured ? "" : "~"}{sal.ece} dS/m · {sal.cls}</Badge>}>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">{sal.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            {!sal.measured && <p className="mt-2 text-[11px] text-muted">Estimated: soil maps do not measure salt. Add an electrical conductivity (EC) test in your farm data or with the field sensor to replace this estimate.</p>}
          </Card>
          {smap && smap.mean !== null && smap.risk !== null && (
            <Card title="Salinity risk from SMAP" eyebrow="Satellite soil moisture, top 5 cm, 9 km" right={<Badge tone={smap.risk < 0.35 ? "green" : smap.risk < 0.65 ? "amber" : "red"} dot>{smap.risk < 0.35 ? "Low risk" : smap.risk < 0.65 ? "Moderate risk" : "High risk"}</Badge>}>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-surface-2 p-2"><div className="text-muted">Latest</div><div className="font-semibold">{smap.latest?.sm} m³/m³</div></div>
                <div className="rounded-lg bg-surface-2 p-2"><div className="text-muted">{`${smap.samples.length}-week mean`}</div><div className="font-semibold">{smap.mean} m³/m³</div></div>
                <div className="rounded-lg bg-surface-2 p-2"><div className="text-muted">Risk index</div><div className="font-semibold">{Math.round(smap.risk * 100)} / 100</div></div>
              </div>
              <div className="mt-3 h-2 rounded-full" style={{ background: "linear-gradient(90deg,#2ea05a,#ebcd50,#e6782d,#be2828)" }}>
                <div className="relative h-2" style={{ width: `${smap.risk * 100}%` }}><span className="absolute -right-1.5 -top-1 h-4 w-3 rounded border-2 border-ink bg-surface" /></div>
              </div>
              {smap.samples.length > 1 && <div className="mt-3"><LineChart label="SMAP surface soil moisture" points={[...smap.samples].reverse().map((p) => ({ x: p.date.slice(5), y: p.sm }))} color="#5b8fc9" min={0} max={0.5} /></div>}
              <p className="mt-2 text-[11px] text-muted">SMAP measures soil moisture, not salt. In a dry valley, a surface that stays wet while evaporation is high pulls water up from below and leaves salts behind: that is the risk shown here. Confirm with an EC test.</p>
              {onShowMap && <button className="mt-2 text-xs font-medium underline-offset-4 hover:underline" onClick={onShowMap}>See the salinity risk map →</button>}
            </Card>
          )}
        </div>
        <div className="space-y-4 lg:col-span-5">
          <Card title="Soil health index" right={<LevelPill level={health.level}>{health.score} / 100</LevelPill>}>
            <div className="space-y-2.5">
              {health.parts.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between text-xs"><span className="text-ink-2">{p.name}</span><span className="text-muted">{p.note}</span></div>
                  <Meter value={p.value * 100} level={p.value >= 0.65 ? "good" : p.value >= 0.45 ? "watch" : "alert"} className="mt-1" />
                </div>
              ))}
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-2">
              {s.sand >= 50 && <li>Sandy soil: drains fast and blows away when bare. Keep it covered, especially Sep–Dec.</li>}
              {s.organicMatter < 2 && <li>Low organic matter: legumes, covers and manure will raise water holding over the years.</li>}
              {s.ph > 7.5 && <li>Alkaline: choose tolerant crops (asparagus, lavender, sea buckthorn) and avoid salt build-up.</li>}
            </ul>
          </Card>
          {c && c.mensual.some((m) => m.humedadSup !== null) && (
            <Card title="Soil moisture through the year">
              <LineChart label="Surface soil wetness" points={c.mensual.map((m) => ({ x: MONTHS[m.mes - 1], y: m.humedadSup ?? 0 }))} color="#5b8fc9" />
              <p className="text-[11px] text-muted">Satellite soil wetness (0 = dry, 1 = saturated), monthly average over a wide area. A field sensor gives the exact value.</p>
              {last && last.moisture !== null && <p className="mt-1 text-xs text-green-fg">Your sensor ({last.date}): {last.moisture}% moisture{last.soilTemp != null ? `, ${last.soilTemp} °C` : ""}{last.ec != null ? `, EC ${last.ec} dS/m` : ""}.</p>}
            </Card>
          )}
          {ndvi && ndvi.serie.length > 1 && <VegetationCard ndvi={ndvi} />}
        </div>
      </div>
    </div>
  );
}

// ---------------- What you can do ----------------
export function Options({ options }: { options: Option[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {options.map((o, i) => (
        <Card key={o.id} delay={i * 80} title={<span className="flex items-center gap-2"><span className="text-2xl">{o.emoji}</span>{o.title}</span>} right={<LevelPill level={o.level}>{Math.round(o.fit * 100)}% fit</LevelPill>}>
          <p className="text-sm font-medium text-ink">{o.headline}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink-2">{o.facts.map((f) => <li key={f}>{f}</li>)}</ul>
          <div className="mt-4 text-xs font-semibold text-ink">How to start</div>
          <ol className="list-decimal pl-5 text-xs text-muted">{o.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <div className="mt-4 border-t border-line pt-3 text-[11px] text-muted">Cost: {o.cost}</div>
        </Card>
      ))}
    </div>
  );
}

// ---------------- Forecast ----------------
export function Forecast({ f }: { f: ClimaResumen }) {
  const next = f.dias.filter((d) => !d.pasado).slice(0, 14);
  const today = next[0];
  const alerts = next.slice(0, 7).flatMap((d) => {
    const day = new Date(d.fecha + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
    const a: string[] = [];
    if (d.tmin <= 0) a.push(`🥶 ${day}: frost ${d.tmin} °C${d.horaMin ? ` around ${d.horaMin}` : ""}. Protect blossoms and seedlings.`);
    if (d.rafagas > 60) a.push(`💨 ${day}: gusts ${Math.round(d.rafagas)} km/h. Don't spray; check windbreaks.`);
    if (d.lluvia > 8) a.push(`🌧️ ${day}: ${d.lluvia} mm rain. You can skip one irrigation.`);
    if ((d.uv ?? 0) >= 9) a.push(`☀️ ${day}: UV ${d.uv}. Shade for workers and berries at midday.`);
    return a;
  });
  return (
    <div className="space-y-4">
      {today && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Today" value={`${Math.round(today.tmin)}° / ${Math.round(today.tmax)}°`} />
          <Stat label="Humidity" value={today.humedad ?? "—"} unit="%" />
          <Stat label="Pressure" value={today.presion ?? "—"} unit="hPa" />
          <Stat label="UV max" value={today.uv ?? "—"} />
          <Stat label="Evaporation" value={today.et0} unit="mm" />
          <Stat label="Gusts" value={Math.round(today.rafagas)} unit="km/h" />
        </div>
      )}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {next.map((d) => {
          const frost = d.tmin <= 0;
          const dt = new Date(d.fecha + "T12:00:00");
          return (
            <div key={d.fecha} className={`w-[5.5rem] shrink-0 rounded-xl border p-2 text-center ${frost ? "border-red-fg/40 bg-red-bg" : "border-line bg-surface"}`}>
              <div className="text-[11px] font-semibold text-ink-2">{dt.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className="text-[10px] text-subtle">{dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              <div className="my-1 text-lg">{frost ? "🥶" : d.lluvia > 2 ? "🌧️" : d.rafagas > 60 ? "💨" : "☀️"}</div>
              <div className="text-sm font-semibold">{Math.round(d.tmax)}°</div>
              <div className={`text-sm font-semibold ${frost ? "text-red-fg" : "text-muted"}`}>{Math.round(d.tmin)}°</div>
              <div className="mt-1 text-[10px] text-muted">💧{d.lluvia} · 💨{Math.round(d.rafagas)}</div>
              <div className="text-[10px] text-subtle">{d.humedad ?? "—"}% · UV {d.uv ?? "—"}</div>
            </div>
          );
        })}
      </div>
      <Card title="This week">
        {alerts.length ? <ul className="space-y-1 text-sm text-ink-2">{alerts.map((a) => <li key={a}>{a}</li>)}</ul> : <p className="text-sm text-ink-2">✅ Calm week: no frost, strong wind or heavy rain expected.</p>}
        {f.elevacion !== null && <p className="mt-3 text-[11px] text-muted">Field elevation {Math.round(f.elevacion)} m. Temperatures in °C, rain in mm, gusts in km/h, pressure in hPa.</p>}
      </Card>
    </div>
  );
}

// ---------------- Frost ----------------
export function Frost({ c }: { c: IndicadoresNasa }) {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-8" title="Spring frost calendar" eyebrow="Each row is a year, each cell a day"><FrostCalendar c={c} /></Card>
      <Card className="lg:col-span-4" title="Chance of frost by week">
        <div className="flex h-36 items-end gap-1">
          {c.probSemanal.map((s) => (
            <div key={s.inicio} className="flex flex-1 flex-col items-center gap-1" title={`Week of ${shortDate(s.inicio)}: ${pct(s.p0)} frost, ${pct(s.p2)} hard frost`}>
              <div className="relative w-full rounded-t bg-[#e07a6c]" style={{ height: `${s.p0 * 100}px` }}>
                <div className="absolute bottom-0 w-full rounded-t bg-[#a3302a]" style={{ height: `${s.p2 * 100}px` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-subtle"><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span></div>
        <p className="mt-3 text-[11px] text-muted">Light: frost (≤ 0 °C). Dark: hard frost (≤ −2 °C). How often nights dropped below freezing in past years.</p>
      </Card>
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
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-7" title="Irrigation calculator">
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <label className={label}>Crop<select className={input} value={cropId} onChange={(e) => setCropId(e.target.value)}>{CROPS.map((x) => <option key={x.id} value={x.id}>{x.emoji} {x.name}</option>)}</select></label>
          <label className={label}>Area (ha)<input type="number" min={0.1} step={0.5} className={input} value={farm.areaHa} onChange={(e) => setFarm({ ...farm, areaHa: Number(e.target.value) || 1 })} /></label>
          <label className={label}>Method<select className={input} value={farm.irrigation} onChange={(e) => setFarm({ ...farm, irrigation: e.target.value as SistemaRiego })}>{methods.map((m) => <option key={m} value={m}>{METHOD_NAME[m]}</option>)}</select></label>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {week && <Stat label="Next 7 days" value={fmt(week.net / EFFICIENCY[farm.irrigation])} unit="mm" hint={`≈ ${fmt((week.net / EFFICIENCY[farm.irrigation]) * 10 * farm.areaHa)} m³ for ${farm.areaHa} ha`} />}
          <Stat label="Season need (net)" value={fmt(season)} unit="mm" hint="What the crop uses, Sep–Apr" />
          <Stat label="Season, your method" value={fmt((season / EFFICIENCY[farm.irrigation]) * 10 * farm.areaHa)} unit="m³" />
        </div>
        <div className="mt-4 space-y-2">
          {methods.map((m) => {
            const v = (season / EFFICIENCY[m]) * 10 * farm.areaHa;
            const max = (season / EFFICIENCY.flood) * 10 * farm.areaHa;
            return (
              <div key={m} className="flex items-center gap-2 text-xs">
                <span className={`w-20 ${m === farm.irrigation ? "font-semibold text-ink" : "text-muted"}`}>{METHOD_NAME[m]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><div className={`h-full rounded-full ${m === "drip" ? "bg-green-fg" : "bg-ink-2"}`} style={{ width: `${(v / max) * 100}%` }} /></div>
                <span className="w-24 text-right tabular-nums text-ink-2">{fmt(v)} m³</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted">Evapotranspiration (ET0) × crop coefficient − useful rain, divided by the efficiency of each method.</p>
      </Card>
      <Card className="lg:col-span-5" title="Snowpack: your summer water">
        {snow ? (
          <>
            <SnowGauge c={snow.cuencas[0]} />
            <p className="mt-3 text-xs text-ink-2">
              {snow.indice >= 0.9 ? "Good snow year: canals should run normally." : snow.indice >= 0.6 ? "Less snow than normal: water may get tight in late summer. Favor drip and low-water crops." : "Low snow: expect irrigation restrictions. Choose the water-saver rotation."}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Snowpack data not available right now.</p>
        )}
      </Card>
    </div>
  );
}
