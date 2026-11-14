"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_NAME } from "@/config/app";
import { SITE } from "@/config/site";
import { useOnline } from "@/hooks/useOnline";
import { useRecurso } from "@/hooks/useRecurso";
import { buildContext, localAdvice } from "@/lib/advisor";
import { hazards } from "@/lib/contingency";
import { farmOptions } from "@/lib/options";
import { profileFromRegister } from "@/lib/register";
import { compareStrategies } from "@/lib/rotation";
import { salinityEstimate, soilHealth } from "@/lib/soil";
import { rankSpecies } from "@/lib/suitability";
import { guardar, leer } from "@/lib/storage";
import {
  DEFAULT_PRIORITIES, DEFAULT_PROFILE, type AdvisorResult, type ClimaResumen, type EnsoResumen, type FarmProfile, type FarmRegister,
  type GroundReading, type IndicadoresNasa, type NdviResumen, type NieveResumen, type Priorities, type SoilResumen,
} from "@/lib/types";
import { AIPanel } from "./AIPanel";
import { LineChart, ndviPoints } from "./Charts";
import { FiltersPanel } from "./FiltersPanel";
import { HardwareModal } from "./HardwareModal";
import type { OverlayId } from "./MapView";
import { Contingency, NewCrops, Rotations, Viability, YearPlan } from "./PlanSections";
import { Report } from "./Report";
import { Forecast, Frost, Options, Overview, Soil, Water } from "./Sections";
import { Badge, DemoBadge, LevelPill, Meter, Note, Reveal, Spinner, ThemeToggle, btnGhost, useHotkeys } from "./ui";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading map…</div> });

const SECTIONS = [
  { id: "overview", label: "Climate", icon: "📊" },
  { id: "soil", label: "Soil", icon: "🟫" },
  { id: "rotations", label: "Rotations", icon: "🔄" },
  { id: "seasons", label: "Year plan", icon: "🗓️" },
  { id: "crops", label: "New crops", icon: "🌱" },
  { id: "viability", label: "Viability", icon: "💰" },
  { id: "risks", label: "Contingencies", icon: "⚠️" },
  { id: "options", label: "What you can do", icon: "🛠️" },
  { id: "forecast", label: "Forecast", icon: "🌦️" },
  { id: "frost", label: "Frost", icon: "❄️" },
  { id: "water", label: "Water", icon: "💧" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];
const KEY = (i: number) => (i < 9 ? String(i + 1) : i === 9 ? "0" : null);

export function Growvia() {
  const router = useRouter();
  const first = SITE.fields[0];
  const [field, setField] = useState({ lat: first.lat, lon: first.lon, name: first.name });
  const [farm, setFarmState] = useState<FarmProfile>(DEFAULT_PROFILE);
  const [pri, setPriState] = useState<Priorities>(DEFAULT_PRIORITIES);
  const [register, setRegister] = useState<FarmRegister | null>(null);
  const [readings, setReadings] = useState<GroundReading[]>([]);
  const [section, setSection] = useState<SectionId>("rotations");
  const [is3D, setIs3D] = useState(false);
  const [overlays, setOverlays] = useState<Set<OverlayId>>(new Set());
  const [hw, setHw] = useState(false);
  const [advice, setAdvice] = useState<AdvisorResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const online = useOnline();

  const q = `lat=${field.lat.toFixed(2)}&lon=${field.lon.toFixed(2)}`;
  const climate = useRecurso<IndicadoresNasa>(`/api/climate?lat=${field.lat.toFixed(1)}&lon=${field.lon.toFixed(1)}`);
  const ndvi = useRecurso<NdviResumen>(`/api/vegetation?${q}`);
  const forecast = useRecurso<ClimaResumen>(`/api/forecast?${q}`);
  const snow = useRecurso<NieveResumen>("/api/snow");
  const soil = useRecurso<SoilResumen>(`/api/soil?${q}`);
  const enso = useRecurso<EnsoResumen>("/api/enso");

  // Restore saved farm data (stored on this device)
  useEffect(() => {
    leer<FarmRegister>("register").then((r) => {
      if (!r) {
        leer<FarmProfile>("farm").then((f) => f && setFarmState({ ...DEFAULT_PROFILE, ...f.v }));
        leer<Priorities>("priorities").then((p) => p && setPriState(p.v));
        return;
      }
      setRegister(r.v);
      setFarmState(profileFromRegister(r.v));
      setPriState(r.v.priorities);
      setField({ lat: r.v.lat, lon: r.v.lon, name: r.v.farmName || "My farm" });
    });
    leer<GroundReading[]>("readings").then((r) => r && setReadings(r.v));
  }, []);
  const setFarm = useCallback((f: FarmProfile) => { setFarmState(f); guardar("farm", f); setAdvice(null); }, []);
  const setPri = useCallback((p: Priorities) => { setPriState(p); guardar("priorities", p); setAdvice(null); }, []);
  const addReading = (r: GroundReading) => { const n = [...readings, r]; setReadings(n); guardar("readings", n); };

  const pick = useCallback((lat: number, lon: number) => {
    const preset = SITE.fields.find((f) => Math.abs(f.lat - lat) < 0.002 && Math.abs(f.lon - lon) < 0.003);
    setField({ lat, lon, name: preset?.name ?? "My field" });
    setAdvice(null);
  }, []);

  const results = useMemo(
    () => (climate.data && soil.data ? compareStrategies({ climate: climate.data, soil: soil.data, snow: snow.data }, farm, pri) : []),
    [climate.data, soil.data, snow.data, farm, pri],
  );
  const current = results.find((r) => r.strategy.current) ?? null;
  const measuredEc = register?.soilTest.ec ?? [...readings].reverse().find((r) => r.ec != null)?.ec ?? null;
  const sal = useMemo(() => (climate.data && soil.data ? salinityEstimate(soil.data, climate.data, farm.irrigation, measuredEc) : null), [climate.data, soil.data, farm.irrigation, measuredEc]);
  const health = useMemo(() => (soil.data && sal && climate.data ? soilHealth(soil.data, sal, current?.metrics.bareMonths ?? 0, climate.data.vientoPrimavera, ndvi.data) : null), [soil.data, sal, climate.data, current, ndvi.data]);
  const fits = useMemo(() => (climate.data && soil.data && sal ? rankSpecies(climate.data, soil.data, sal, farm) : []), [climate.data, soil.data, sal, farm]);
  const risks = useMemo(() => (climate.data ? hazards(climate.data, forecast.data, snow.data, enso.data) : []), [climate.data, forecast.data, snow.data, enso.data]);
  const options = useMemo(() => (climate.data ? farmOptions(climate.data, farm) : []), [climate.data, farm]);
  const simulated = climate.data?.simulado || soil.data?.simulado;

  async function analyze() {
    if (!climate.data || !soil.data || !results.length || !health || !sal) return;
    const ctx = buildContext(field.name, farm, pri, climate.data, soil.data, forecast.data, ndvi.data, results, { fits, health, sal, enso: enso.data, register });
    setBusy(true);
    setAiError(null);
    try {
      if (!online) throw new Error("Offline: showing the rules-based answer.");
      const r = await fetch("/api/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) });
      const j = await r.json();
      if (!r.ok) throw new Error(r.status === 501 ? "AI key not configured: showing the rules-based answer." : "AI unavailable: showing the rules-based answer.");
      setAdvice(j);
    } catch (e) {
      setAdvice(localAdvice(ctx, results, fits));
      setAiError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function share() {
    const top = [...results].sort((a, b) => b.score - a.score).slice(0, 3);
    const text = [
      `🌱 ${APP_NAME} · ${field.name}, ${SITE.name}`,
      advice?.summary ?? "",
      ...top.map((r, i) => `${i + 1}) ${r.strategy.name}: ${r.score}/100${r.strategy.current ? " (current)" : ""}`),
      fits.length ? `New crops: ${fits.filter((f) => f.species.status === "new").slice(0, 3).map((f) => f.species.name).join(", ")}` : "",
      climate.data ? `❄️ ${climate.data.libreHeladas} frost-free days · 💧 ${climate.data.lluviaAnual} mm rain/yr` : "",
      window.location.origin,
    ].filter(Boolean).join("\n");
    if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) navigator.share({ title: APP_NAME, text }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  const toggleOverlay = (id: OverlayId) => setOverlays((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  useHotkeys({
    a: analyze,
    d: () => setIs3D((v) => !v),
    h: () => setHw(true),
    r: () => router.push("/register"),
    ...Object.fromEntries(SECTIONS.map((s, i) => [KEY(i), () => setSection(s.id)]).filter(([k]) => k)),
  });

  const loading = climate.estado === "cargando" || soil.estado === "cargando";
  const failed = !climate.data && climate.estado === "error";
  const today = forecast.data?.dias.find((d) => !d.pasado);
  const alerts = risks.filter((h) => h.level !== "good");
  const sec = SECTIONS.find((s) => s.id === section)!;

  return (
    <>
      <div className="flex min-h-screen flex-col print:hidden">
        <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="font-serif text-2xl leading-none tracking-tight">{APP_NAME}</Link>
            <nav className="hidden items-center gap-1 text-sm text-muted md:flex">
              <Link href="/" className="rounded-lg px-2 py-1 hover:text-ink">About</Link>
              <span className="rounded-lg px-2 py-1 text-ink">Dashboard</span>
              <Link href="/register" className="rounded-lg px-2 py-1 hover:text-ink">Register</Link>
            </nav>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm sm:max-w-md">
              <span className="text-muted">📍</span>
              <select className="min-w-0 flex-1 bg-transparent font-medium focus:outline-none" aria-label="Field"
                value={register && field.lat === register.lat && field.lon === register.lon ? "register" : SITE.fields.find((f) => f.name === field.name)?.id ?? "custom"}
                onChange={(e) => {
                  if (e.target.value === "register" && register) return setField({ lat: register.lat, lon: register.lon, name: register.farmName || "My farm" });
                  const f = SITE.fields.find((x) => x.id === e.target.value);
                  if (f) pick(f.lat, f.lon);
                }}>
                {register && <option value="register">🏠 {register.farmName || "My farm"}</option>}
                {SITE.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                <option value="custom" disabled>My field (tap the map)</option>
              </select>
              <span className="hidden truncate text-xs text-subtle lg:inline">{SITE.name}</span>
              <DemoBadge show={simulated} />
            </div>
            <div className="flex gap-2">
              <button className={`${btnGhost} ${is3D ? "!border-ink" : ""}`} onClick={() => setIs3D(!is3D)} aria-pressed={is3D}>3D View <kbd>D</kbd></button>
              <button className={btnGhost} onClick={() => setHw(true)}>Hardware <kbd>H</kbd></button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">
          <Reveal className="mb-6 flex flex-wrap items-end gap-3">
            <div>
              <h1 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">{field.name}</h1>
              <p className="mt-2 text-sm text-muted">{SITE.name}, {SITE.region} · {field.lat.toFixed(3)}, {field.lon.toFixed(3)} · {farm.areaHa} ha · {farm.system}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:ml-auto">
              {climate.data && <Badge tone="blue">Climate record {climate.data.periodo.join("–")}</Badge>}
              {soil.data && <Badge tone={soil.data.source === "soil-map" ? "green" : "amber"}>{soil.data.source === "soil-map" ? "Soil map 250 m" : "Soil: regional reference"}</Badge>}
              {register ? <Badge tone="green" dot>Farm registered</Badge> : <Link href="/register"><Badge tone="amber">Register your farm →</Badge></Link>}
            </div>
          </Reveal>

          {/* ---------- Bento grid ---------- */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
            <Reveal className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface md:col-span-6 lg:col-span-8 lg:row-span-2">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                <span className="text-sm font-medium">Satellite map</span>
                <span className="hidden text-xs text-subtle sm:inline">Tap to place your field</span>
                <div className="w-full sm:ml-auto sm:w-auto"><FiltersPanel active={overlays} toggle={toggleOverlay} /></div>
              </div>
              <div className="h-[46vh] min-h-[340px] lg:h-auto lg:flex-1">
                <MapView field={field} onPick={pick} is3D={is3D} overlays={overlays} />
              </div>
            </Reveal>

            <Reveal delay={80} className="flex flex-col rounded-2xl border border-line bg-surface p-6 md:col-span-6 lg:col-span-4 lg:row-span-2 lg:max-h-[640px]">
              <div className="mb-4 flex items-center gap-2">
                <span className="font-serif text-2xl leading-none">Decision support</span>
                <Badge tone="blue">AI</Badge>
              </div>
              <AIPanel farm={farm} setFarm={setFarm} results={results} advice={advice} busy={busy} onAnalyze={analyze} onShare={share} error={aiError} registered={!!register} />
            </Reveal>

            {/* status tiles */}
            <Tile className="md:col-span-3 lg:col-span-4" delay={60} eyebrow="Vegetation index" onClick={() => setSection("soil")}>
              {ndvi.data?.ultimo ? (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-4xl">{ndvi.data.ultimo.ndvi}</span><span className="text-xs text-muted">NDVI</span>
                    {ndvi.data.ultimo.evi !== undefined && <><span className="font-serif text-2xl text-ink-2">{ndvi.data.ultimo.evi}</span><span className="text-xs text-muted">EVI</span></>}
                  </div>
                  <div className="-mx-1 mt-1"><LineChart label="NDVI" points={ndviPoints(ndvi.data.serie.slice(-23))} /></div>
                </>
              ) : <TileEmpty st={ndvi.estado} />}
            </Tile>
            <Tile className="md:col-span-3 lg:col-span-3" delay={120} eyebrow="Weather today" onClick={() => setSection("forecast")}>
              {today ? (
                <>
                  <div className="font-serif text-4xl">{Math.round(today.tmin)}° <span className="text-ink-2">/ {Math.round(today.tmax)}°</span></div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-muted">Humidity</dt><dd className="text-right tabular-nums">{today.humedad ?? "—"}%</dd>
                    <dt className="text-muted">Pressure</dt><dd className="text-right tabular-nums">{today.presion ?? "—"} hPa</dd>
                    <dt className="text-muted">UV max</dt><dd className="text-right tabular-nums">{today.uv ?? "—"}</dd>
                    <dt className="text-muted">Evaporation</dt><dd className="text-right tabular-nums">{today.et0} mm</dd>
                    <dt className="text-muted">Gusts</dt><dd className="text-right tabular-nums">{Math.round(today.rafagas)} km/h</dd>
                  </dl>
                </>
              ) : <TileEmpty st={forecast.estado} />}
            </Tile>
            <Tile className="md:col-span-3 lg:col-span-2" delay={180} eyebrow="Soil health" onClick={() => setSection("soil")}>
              {health && sal ? (
                <>
                  <div className="font-serif text-4xl">{health.score}</div>
                  <LevelPill level={health.level} />
                  <Meter value={health.score} level={health.level} className="mt-3" />
                  <div className="mt-3 text-xs text-muted">Salinity {sal.measured ? "" : "~"}{sal.ece} dS/m</div>
                  <div className="text-xs text-muted">OM {soil.data?.organicMatter}% · pH {soil.data?.ph}</div>
                </>
              ) : <TileEmpty st={soil.estado} />}
            </Tile>
            <Tile className="md:col-span-3 lg:col-span-3" delay={240} eyebrow="Contingencies" onClick={() => setSection("risks")}>
              {climate.data ? (
                <>
                  <div className="flex items-baseline gap-2"><span className="font-serif text-4xl">{alerts.length}</span><span className="text-xs text-muted">{alerts.length === 1 ? "alert" : "alerts"}</span></div>
                  <ul className="mt-2 space-y-1 text-xs">
                    {(alerts.length ? alerts : risks).slice(0, 3).map((h) => <li key={h.id} className="flex items-center gap-1.5"><span>{h.emoji}</span><span className="truncate">{h.name}</span><span className="ml-auto"><LevelPill level={h.level}>{h.level === "good" ? "Calm" : h.level === "watch" ? "Watch" : "Act"}</LevelPill></span></li>)}
                  </ul>
                  {enso.data?.current && <div className="mt-3"><Badge tone="blue">Pacific: {enso.data.current.phase}</Badge></div>}
                </>
              ) : <TileEmpty st={climate.estado} />}
            </Tile>

            {/* sections */}
            <Reveal className="rounded-2xl border border-line bg-surface md:col-span-6 lg:col-span-12">
              <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2" aria-label="Sections">
                {SECTIONS.map((s, i) => (
                  <button key={s.id} onClick={() => setSection(s.id)} aria-pressed={section === s.id}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${section === s.id ? "bg-ink text-canvas" : "text-ink-2 hover:bg-surface-2"}`}>
                    <span>{s.icon}</span>{s.label}{KEY(i) && <kbd className="hidden lg:inline-flex">{KEY(i)}</kbd>}
                  </button>
                ))}
              </nav>
              <div className="p-4 sm:p-6">
                <div className="mb-5 flex items-baseline gap-2">
                  <h2 className="font-serif text-3xl leading-none">{sec.label}</h2>
                  <span className="text-xs text-subtle">· {field.name}</span>
                </div>
                {failed ? (
                  <Note kind="warn">We couldn&apos;t load the climate record for this field ({climate.error}). Try again in a minute.</Note>
                ) : loading || !climate.data || !soil.data || !sal || !health ? (
                  <Spinner text="Reading 20 years of climate records and the soil map for your field… (first time ~20 s)" />
                ) : (
                  <>
                    {section === "overview" && <Overview c={climate.data} current={current} ndvi={ndvi.data} />}
                    {section === "soil" && <Soil s={soil.data} c={climate.data} ndvi={ndvi.data} readings={readings} sal={sal} health={health} />}
                    {section === "rotations" && <Rotations results={results} pri={pri} setPri={setPri} />}
                    {section === "seasons" && <YearPlan results={results} fits={fits} advice={advice} />}
                    {section === "crops" && <NewCrops fits={fits} advice={advice} />}
                    {section === "viability" && <Viability fits={fits} areaHa={farm.areaHa} />}
                    {section === "risks" && <Contingency list={risks} enso={enso.data} c={climate.data} />}
                    {section === "options" && <Options options={options} />}
                    {section === "forecast" && (forecast.data ? <Forecast f={forecast.data} /> : <Spinner text="Loading forecast…" />)}
                    {section === "frost" && <Frost c={climate.data} />}
                    {section === "water" && <Water c={climate.data} f={forecast.data} snow={snow.data} farm={farm} setFarm={setFarm} />}
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </main>
        <footer className="mx-auto w-full max-w-[1500px] px-6 pb-6 text-[11px] text-subtle">
          {APP_NAME} is a decision-support tool. It does not replace your judgment or local agronomic advice. · Shortcuts: <kbd>A</kbd> analyze · <kbd>D</kbd> 3D · <kbd>H</kbd> hardware · <kbd>R</kbd> register · <kbd>1</kbd>–<kbd>0</kbd> sections
        </footer>
      </div>

      <HardwareModal open={hw} onClose={() => setHw(false)} readings={readings} addReading={addReading} />
      <Report field={field} farm={farm} c={climate.data} soil={soil.data} results={results} advice={advice} options={options} fits={fits} />
    </>
  );
}

function Tile({ children, className = "", delay = 0, eyebrow, onClick }: { children: React.ReactNode; className?: string; delay?: number; eyebrow: string; onClick?: () => void }) {
  return (
    <Reveal delay={delay} className={`group relative rounded-2xl border border-line bg-surface p-6 ${className}`}>
      <div className="mb-3 flex items-center text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
        {eyebrow}
        {onClick && <button onClick={onClick} className="ml-auto normal-case tracking-normal text-muted transition group-hover:text-ink">Details →</button>}
      </div>
      {children}
    </Reveal>
  );
}

function TileEmpty({ st }: { st: string }) {
  return <div className="text-sm text-muted">{st === "cargando" ? "Loading…" : "Not available right now"}</div>;
}
