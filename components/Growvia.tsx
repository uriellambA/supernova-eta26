"use client";
import dynamic from "next/dynamic";
import { Brand } from "@/components/Brand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_NAME } from "@/config/app";
import { DEFAULT_SITE_ID, SITES, siteById } from "@/config/sites";
import type { WeatherGrid, WeatherVarId } from "@/lib/weathergrid";
import { useOnline } from "@/hooks/useOnline";
import { useRecurso } from "@/hooks/useRecurso";
import { buildContext, localAdvice } from "@/lib/advisor";
import type { SmapResumen } from "@/lib/smap";
import { hazards } from "@/lib/contingency";
import { farmOptions } from "@/lib/options";
import { profileFromRegister } from "@/lib/register";
import { compareStrategies } from "@/lib/rotation";
import { salinityEstimate, soilHealth } from "@/lib/soil";
import { rankSpecies } from "@/lib/suitability";
import { guardar, leer } from "@/lib/storage";
import {
  DEFAULT_PRIORITIES, DEFAULT_PROFILE, type AdvisorResult, type ClimaResumen, type EnsoResumen, type FarmProfile, type FarmRegister,
  type GroundReading, type IndicadoresNasa, type NdviResumen, type NieveResumen, type Priorities, type SoilResumen, type Strategy,
} from "@/lib/types";
import { AIPanel } from "./AIPanel";
import { LineChart, ndviPoints } from "./Charts";
import { FiltersPanel, WeatherLegend, WeatherPicker } from "./FiltersPanel";
import { Icon } from "./icons";
import type { OverlayId } from "./MapView";
import { Contingency, NewCrops, Rotations, Viability, YearPlan } from "./PlanSections";
import { SessionsModal } from "./SessionsModal";
import { buildSession, listSessions, saveSession, sessionLink, type SavedSession } from "@/lib/session";
import { SmapStatus } from "./SmapStatus";
import { RotationBuilder, RotationHero, RotationMatrix, RotationMethod } from "./RotationTools";
import { RotationExplorer } from "./RotationExplorer";
import { LangToggle } from "./Translator";
import { getLang } from "@/lib/i18n";
import { Forecast, Frost, Options, Overview, Soil, Water } from "./Sections";
import { Badge, DemoBadge, LevelPill, Meter, Note, Reveal, Spinner, ThemeToggle, btnGhost, useHotkeys } from "./ui";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading map…</div> });

// The dashboard is split in 5 tabs so the farmer sees one topic at a time.
const TABS = [
  { id: "home", label: "Overview", icon: "home", blurb: "", tone: "", subs: [] },
  { id: "plan", label: "Crop rotation", icon: "rotation", blurb: "Compare, design and plan the rotation of your field", tone: "bg-green-bg text-green-fg", subs: [{ id: "rotations", label: "Compare rotations" }, { id: "builder", label: "Build your own" }, { id: "seasons", label: "Year plan" }, { id: "method", label: "How it's scored" }] },
  { id: "crops", label: "Crops & economy", icon: "sprout", blurb: "New species, costs, margins and what you can do", tone: "bg-amber-bg text-amber-fg", subs: [{ id: "crops", label: "New crops" }, { id: "viability", label: "Viability" }, { id: "options", label: "What you can do" }] },
  { id: "weather", label: "Weather & risks", icon: "weather", blurb: "Forecast, frost and El Niño / La Niña plans", tone: "bg-blue-bg text-blue-fg", subs: [{ id: "forecast", label: "Forecast" }, { id: "risks", label: "Contingencies" }, { id: "frost", label: "Frost" }, { id: "climate", label: "Climate record" }] },
  { id: "soil", label: "Soil & water", icon: "drop", blurb: "Soil health, salinity and irrigation needs", tone: "bg-red-bg text-red-fg", subs: [{ id: "soil", label: "Soil" }, { id: "water", label: "Irrigation" }] },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function Growvia() {
  const router = useRouter();
  const [siteId, setSiteIdState] = useState(DEFAULT_SITE_ID);
  const site = siteById(siteId);
  const [field, setField] = useState({ lat: site.center[1], lon: site.center[0], name: site.name });
  const [weatherVar, setWeatherVar] = useState<WeatherVarId | null>(null);
  const [farm, setFarmState] = useState<FarmProfile>(DEFAULT_PROFILE);
  const [pri, setPriState] = useState<Priorities>(DEFAULT_PRIORITIES);
  const [register, setRegister] = useState<FarmRegister | null>(null);
  const [readings, setReadings] = useState<GroundReading[]>([]);
  const [custom, setCustomState] = useState<Strategy | null>(null);
  const [tab, setTab] = useState<TabId>("home");
  const [subs, setSubs] = useState<Record<string, string>>({ plan: "rotations", crops: "crops", weather: "forecast", soil: "soil" });
  const go = useCallback((t: TabId, sub?: string) => {
    setTab(t);
    if (sub) setSubs((x) => ({ ...x, [t]: sub }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const [is3D, setIs3D] = useState(false);
  const [overlays, setOverlays] = useState<Set<OverlayId>>(new Set());
  const [advice, setAdvice] = useState<AdvisorResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  useEffect(() => { listSessions().then(setSessions); }, []);
  const online = useOnline();
  /** Change of site: go to its centre, keep a farming system that exists there. */
  const chooseSite = useCallback((id: string) => {
    const s2 = siteById(id);
    setSiteIdState(s2.id);
    guardar("site", s2.id);
    setField({ lat: s2.center[1], lon: s2.center[0], name: s2.name });
    setFarmState((f) => ({ ...f, system: s2.systems[0], irrigation: s2.irrigation.defaultMethod }));
    setAdvice(null);
  }, []);

  const q = `lat=${field.lat.toFixed(2)}&lon=${field.lon.toFixed(2)}`;
  const climate = useRecurso<IndicadoresNasa>(`/api/climate?v=3&lat=${field.lat.toFixed(1)}&lon=${field.lon.toFixed(1)}`);
  const ndvi = useRecurso<NdviResumen>(`/api/vegetation?${q}`);
  const forecast = useRecurso<ClimaResumen>(`/api/forecast?${q}`);
  const snow = useRecurso<NieveResumen>(site.watershed ? `/api/snow?site=${site.id}` : null);
  const wgrid = useRecurso<WeatherGrid>(weatherVar ? `/api/weather-grid?site=${site.id}` : null);
  const soil = useRecurso<SoilResumen>(`/api/soil?${q}`);
  const enso = useRecurso<EnsoResumen>("/api/enso");
  const smap = useRecurso<SmapResumen>(`/api/smap?${q}`);

  // Restore saved farm data (stored on this device)
  useEffect(() => {
    leer<FarmRegister>("register").then((r) => {
      if (!r) {
        leer<string>("site").then((x) => x && x.v !== DEFAULT_SITE_ID && chooseSite(x.v));
        leer<FarmProfile>("farm").then((f) => f && setFarmState({ ...DEFAULT_PROFILE, ...f.v }));
        leer<Priorities>("priorities").then((p) => p && setPriState(p.v));
        return;
      }
      setRegister(r.v);
      setFarmState(profileFromRegister(r.v));
      setPriState(r.v.priorities);
      setSiteIdState(siteById(r.v.siteId).id);
      setField({ lat: r.v.lat, lon: r.v.lon, name: r.v.farmName || "My farm" });
    });

    leer<GroundReading[]>("readings").then((r) => r && setReadings(r.v));
    leer<Strategy | null>("customRotation").then((r) => r?.v && setCustomState(r.v));
  }, [chooseSite]);
  const setFarm = useCallback((f: FarmProfile) => { setFarmState(f); guardar("farm", f); setAdvice(null); }, []);
  const setPri = useCallback((p: Priorities) => { setPriState(p); guardar("priorities", p); setAdvice(null); }, []);
  const setCustom = useCallback((c: Strategy | null) => { setCustomState(c); guardar("customRotation", c); setAdvice(null); }, []);

  const pick = useCallback((lat: number, lon: number) => {
    setField({ lat, lon, name: "My field" });
    setAdvice(null);
  }, []);

  const results = useMemo(
    () => (climate.data && soil.data ? compareStrategies({ climate: climate.data, soil: soil.data, snow: site.watershed ? snow.data : null, cfg: site }, farm, pri, custom ? [custom] : []) : []),
    [climate.data, soil.data, snow.data, farm, pri, custom, site],
  );
  const current = results.find((r) => r.strategy.current) ?? null;
  const measuredEc = register?.soilTest.ec ?? [...readings].reverse().find((r) => r.ec != null)?.ec ?? null;
  const sal = useMemo(() => (climate.data && soil.data ? salinityEstimate(soil.data, climate.data, farm.irrigation, measuredEc, smap.data) : null), [climate.data, soil.data, farm.irrigation, measuredEc, smap.data]);
  const health = useMemo(() => (soil.data && sal && climate.data ? soilHealth(soil.data, sal, current?.metrics.bareMonths ?? 0, climate.data.vientoPrimavera, ndvi.data) : null), [soil.data, sal, climate.data, current, ndvi.data]);
  const fits = useMemo(() => (climate.data && soil.data && sal ? rankSpecies(climate.data, soil.data, sal, farm, site) : []), [climate.data, soil.data, sal, farm, site]);
  const risks = useMemo(() => (climate.data ? hazards(climate.data, forecast.data, site.watershed ? snow.data : null, enso.data, site.zone) : []), [climate.data, forecast.data, snow.data, enso.data, site]);
  const options = useMemo(() => (climate.data ? farmOptions(climate.data, farm) : []), [climate.data, farm]);
  const simulated = climate.data?.simulado || soil.data?.simulado;

  async function analyze(question = "") {
    if (!climate.data || !soil.data || !results.length || !health || !sal) return;
    const ctx = {
      ...buildContext(field.name, farm, pri, climate.data, soil.data, forecast.data, ndvi.data, results, { fits, health, sal, enso: enso.data, register, site }),
      language: getLang() === "es" ? ("Spanish (Argentina)" as const) : ("English" as const),
      question: question.trim() || undefined,
    };
    setBusy(true);
    setAiError(null);
    let adv: AdvisorResult;
    try {
      if (!online) throw new Error("Offline: showing the rules-based answer.");
      const r = await fetch("/api/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) });
      const j = await r.json();
      if (!r.ok) throw new Error(r.status === 501 ? "SI key not configured: showing the rules-based answer." : "SI unavailable: showing the rules-based answer.");
      adv = j;
    } catch (e) {
      adv = localAdvice(ctx, results, fits);
      setAiError((e as Error).message);
    }
    setAdvice(adv);
    setBusy(false);
    // Save this analysis as a session (on the device) and prepare its share link
    const ses = buildSession({ zone: site.zone, place: field.name, lat: field.lat, lon: field.lon, farm, question, advice: adv, results, fits, risks, forecast: forecast.data, climate: climate.data, soil: soil.data });
    setSession(ses);
    setSessions(await saveSession(ses));
    setLink(await sessionLink(ses));
  }

  const toggleOverlay = (id: OverlayId) => setOverlays((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  useHotkeys({
    a: () => { go("home"); analyze(); },
    d: () => { go("home"); setIs3D((v) => !v); },
    r: () => router.push("/register"),
    ...Object.fromEntries(TABS.map((t, i) => [String(i + 1), () => go(t.id)])),
  });

  const loading = climate.estado === "cargando" || soil.estado === "cargando";
  const failed = !climate.data && climate.estado === "error";
  const today = forecast.data?.dias.find((d) => !d.pasado);
  const alerts = risks.filter((h) => h.level !== "good");
  const current_tab = TABS.find((t) => t.id === tab)!;
  const sub = subs[tab];
  const ready = !failed && !loading && climate.data && soil.data && sal && health;

  return (
    <>
      <div className="flex min-h-screen flex-col print:hidden">
        <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <Brand />
            <nav className="hidden items-center gap-1 text-sm text-muted md:flex">
              <Link href="/" className="rounded-lg px-2 py-1 hover:text-ink">About</Link>
              <span className="rounded-lg px-2 py-1 text-ink">Dashboard</span>
              <Link href="/register" className="rounded-lg px-2 py-1 hover:text-ink">Register</Link>
            </nav>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm sm:max-w-md">
              <Icon name="pin" className="h-4 w-4 shrink-0 text-muted" />
              <select className="min-w-0 flex-1 bg-transparent font-medium focus:outline-none" aria-label="Satellite map"
                value={register && field.lat === register.lat && field.lon === register.lon ? "register" : site.id}
                onChange={(e) => {
                  if (e.target.value === "register" && register) {
                    chooseSite(register.siteId);
                    return setField({ lat: register.lat, lon: register.lon, name: register.farmName || "My farm" });
                  }
                  chooseSite(e.target.value);
                }}>
                {register && <option value="register">{register.farmName || "My farm"} · my farm</option>}
                {SITES.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.region.split(",")[0]}</option>)}
              </select>
              <DemoBadge show={simulated} />
            </div>
            <div className="flex gap-2">
              <button className={`${btnGhost} ${is3D ? "!border-ink" : ""}`} onClick={() => { go("home"); setIs3D(!is3D); }} aria-pressed={is3D}>3D View <kbd>D</kbd></button>
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>
          <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 pb-2 sm:px-6" aria-label="Dashboard tabs">
            {TABS.map((t, i) => (
              <button key={t.id} onClick={() => go(t.id)} aria-pressed={tab === t.id}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? "bg-ink text-canvas" : "text-ink-2 hover:bg-surface-2"}`}>
                <Icon name={t.icon} />{t.label}{t.id === "plan" && tab !== "plan" && <span className="h-1.5 w-1.5 rounded-full bg-green-fg" aria-hidden />}<kbd className="hidden lg:inline-flex">{i + 1}</kbd>
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <div>
              <h1 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">{tab === "home" ? field.name : current_tab.label}</h1>
              <p className="mt-2 text-sm text-muted">{tab === "home" ? `${site.name}, ${site.region} · ${field.lat.toFixed(3)}, ${field.lon.toFixed(3)} · ${farm.areaHa} ha · ${farm.system}` : `${field.name} · ${site.name}`}</p>
            </div>
            {tab === "home" && (
              <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                {climate.data && <Badge tone="blue">Climate record {climate.data.periodo.join("–")}</Badge>}
                {soil.data && <Badge tone={soil.data.source === "soil-map" ? "green" : "amber"}>{soil.data.source === "soil-map" ? "Soil map 250 m" : "Soil: regional reference"}</Badge>}
                {register ? <Badge tone="green" dot>Farm registered</Badge> : <Link href="/register"><Badge tone="amber">Register your farm →</Badge></Link>}
              </div>
            )}
            {current_tab.subs.length > 0 && (
              <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1 sm:ml-auto" role="tablist">
                {current_tab.subs.map((x) => (
                  <button key={x.id} role="tab" aria-selected={sub === x.id} onClick={() => go(tab, x.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${sub === x.id ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}>{x.label}</button>
                ))}
              </div>
            )}
          </div>

          {tab === "home" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
              {ready ? (
                <RotationHero results={results} onCompare={() => go("plan", "rotations")} onBuild={() => go("plan", "builder")} onYear={() => go("plan", "seasons")} />
              ) : !failed && <div className="md:col-span-6 lg:col-span-12"><Spinner text="Comparing crop rotations for your field…" /></div>}
              <Reveal className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface md:col-span-6 lg:col-span-8">
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                  <span className="text-sm font-medium">Satellite map</span>
                  <span className="hidden text-xs text-subtle sm:inline">Tap to place your field</span>
                  <div className="w-full sm:ml-auto sm:w-auto"><FiltersPanel active={overlays} toggle={toggleOverlay} /></div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
                  <span className="text-xs font-medium text-muted">Weather now</span>
                  <div className="w-full sm:ml-auto sm:w-auto"><WeatherPicker value={weatherVar} onChange={setWeatherVar} /></div>
                </div>
                {weatherVar && <WeatherLegend varId={weatherVar} grid={wgrid.data} />}
                {overlays.has("salinity") && <SmapStatus />}
                <div className="h-[46vh] min-h-[340px] lg:h-[560px]">
                  <MapView site={site} weather={weatherVar && wgrid.data ? { varId: weatherVar, grid: wgrid.data } : null} field={field} onPick={pick} is3D={is3D} overlays={overlays} boundary={register && field.lat === register.lat && field.lon === register.lon ? register.boundary : null} />
                </div>
              </Reveal>

              <Reveal delay={80} className="flex flex-col rounded-2xl border border-line bg-surface p-6 md:col-span-6 lg:col-span-4">
                <div className="mb-4 flex items-center gap-2">
                  <span className="font-serif text-2xl leading-none">Decision support</span>
                  <Badge tone="blue">SI</Badge>
                </div>
                <AIPanel farm={farm} setFarm={setFarm} results={results} advice={advice} busy={busy} onAnalyze={analyze} error={aiError} registered={!!register} session={session} link={link} savedCount={sessions.length} onOpenSessions={() => setSessionsOpen(true)} systems={site.systems} />
                {advice && <button className="mt-3 text-left text-xs font-medium underline-offset-4 hover:underline" onClick={() => go("plan", "seasons")}>See the year plan →</button>}
              </Reveal>

              <Tile className="md:col-span-3 lg:col-span-3" delay={60} eyebrow="Vegetation" onClick={() => go("soil", "soil")}>
                {ndvi.data?.ultimo ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-4xl">{ndvi.data.ultimo.ndvi}</span><span className="text-xs text-muted">NDVI</span>
                      {ndvi.data.ultimo.evi !== undefined && <span className="ml-auto text-xs text-muted">EVI {ndvi.data.ultimo.evi}</span>}
                    </div>
                    <div className="-mx-1 mt-1"><LineChart label="NDVI" points={ndviPoints(ndvi.data.serie.slice(-23))} /></div>
                  </>
                ) : <TileEmpty st={ndvi.estado} />}
              </Tile>
              <Tile className="md:col-span-3 lg:col-span-3" delay={120} eyebrow="Weather today" onClick={() => go("weather", "forecast")}>
                {today ? (
                  <>
                    <div className="font-serif text-4xl">{Math.round(today.tmin)}° <span className="text-ink-2">/ {Math.round(today.tmax)}°</span></div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div><div className="text-muted">Humidity</div><div className="font-medium">{today.humedad ?? "—"}%</div></div>
                      <div><div className="text-muted">UV</div><div className="font-medium">{today.uv ?? "—"}</div></div>
                      <div><div className="text-muted">Gusts</div><div className="font-medium">{Math.round(today.rafagas)}</div></div>
                    </div>
                  </>
                ) : <TileEmpty st={forecast.estado} />}
              </Tile>
              <Tile className="md:col-span-3 lg:col-span-3" delay={180} eyebrow="Soil health" onClick={() => go("soil", "soil")}>
                {health && sal ? (
                  <>
                    <div className="flex items-baseline gap-2"><span className="font-serif text-4xl">{health.score}</span><LevelPill level={health.level} /></div>
                    <Meter value={health.score} level={health.level} className="mt-3" />
                    <div className="mt-3 text-xs text-muted">Salinity {sal.measured ? "" : "~"}{sal.ece} dS/m · pH {soil.data?.ph}</div>
                  </>
                ) : <TileEmpty st={soil.estado} />}
              </Tile>
              <Tile className="md:col-span-3 lg:col-span-3" delay={240} eyebrow="Alerts" onClick={() => go("weather", "risks")}>
                {climate.data ? (
                  <>
                    <div className="flex items-baseline gap-2"><span className="font-serif text-4xl">{alerts.length}</span><span className="text-xs text-muted">{alerts.length === 1 ? "alert" : "alerts"}</span></div>
                    <ul className="mt-2 space-y-1 text-xs">
                      {(alerts.length ? alerts : risks).slice(0, 2).map((h) => <li key={h.id} className="flex items-center gap-1.5"><span>{h.emoji}</span><span className="truncate">{h.name}</span></li>)}
                    </ul>
                  </>
                ) : <TileEmpty st={climate.estado} />}
              </Tile>

              <Reveal className="grid gap-3 sm:grid-cols-2 md:col-span-6 lg:col-span-12 lg:grid-cols-4">
                {TABS.slice(1).map((t, i) => (
                  <div key={t.id} role="link" tabIndex={0} onClick={() => go(t.id)} onKeyDown={(e) => e.key === "Enter" && go(t.id)}
                    className="group flex cursor-pointer flex-col rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-ink">
                    <div className="flex items-start justify-between">
                      <span className={`grid h-11 w-11 place-items-center rounded-xl ${t.tone}`}><Icon name={t.icon} className="h-5 w-5" /></span>
                      <span className="flex items-center gap-2 text-subtle">
                        <kbd className="hidden lg:inline-flex">{i + 2}</kbd>
                        <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                      </span>
                    </div>
                    <div className="mt-4 font-medium">{t.label}</div>
                    <p className="mt-1 text-xs text-muted">{t.blurb}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                      {t.subs.map((x) => (
                        <button key={x.id} onClick={(e) => { e.stopPropagation(); go(t.id, x.id); }}
                          className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-2 transition hover:border-ink hover:text-ink">{x.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </Reveal>
            </div>
          ) : failed ? (
            <Note kind="warn">We couldn&apos;t load the climate record for this field ({climate.error}). Try again in a minute.</Note>
          ) : !ready ? (
            <Spinner text="Reading 20 years of climate records and the soil map for your field… (first time ~20 s)" />
          ) : (
            <div key={`${tab}-${sub}`}>
              {sub === "rotations" && (
                <Rotations results={results} pri={pri} setPri={setPri}>
                  <RotationMatrix results={results} />
                  <RotationExplorer results={results} site={site} />
                </Rotations>
              )}
              {sub === "builder" && (() => {
                const list = [...results].sort((a, b) => b.score - a.score);
                const mine = list.find((r) => r.strategy.id === "custom") ?? null;
                return <RotationBuilder system={farm.system} custom={custom} setCustom={setCustom} result={mine} rank={mine ? list.indexOf(mine) + 1 : 0} total={list.length} register={register} />;
              })()}
              {sub === "method" && <RotationMethod />}
              {sub === "seasons" && <YearPlan results={results} fits={fits} advice={advice} site={site} />}
              {sub === "crops" && <NewCrops fits={fits} advice={advice} site={site} />}
              {sub === "viability" && <Viability fits={fits} areaHa={farm.areaHa} site={site} />}
              {sub === "options" && <Options options={options} />}
              {sub === "forecast" && (forecast.data ? <Forecast f={forecast.data} /> : <Spinner text="Loading forecast…" />)}
              {sub === "risks" && <Contingency list={risks} enso={enso.data} c={climate.data!} />}
              {sub === "frost" && <Frost c={climate.data!} />}
              {sub === "climate" && <Overview c={climate.data!} current={current} ndvi={ndvi.data} />}
              {sub === "soil" && <Soil s={soil.data!} c={climate.data} ndvi={ndvi.data} readings={readings} sal={sal!} health={health!} smap={smap.data} onShowMap={() => { setOverlays(new Set(["salinity"])); go("home"); }} />}
              {sub === "water" && <Water c={climate.data!} f={forecast.data} snow={snow.data} farm={farm} setFarm={setFarm} />}
            </div>
          )}
        </main>
        <footer className="mx-auto w-full max-w-[1500px] px-6 pb-6 text-[11px] text-subtle">
          {APP_NAME} is a decision-support tool. It does not replace your judgment or local agronomic advice. · Shortcuts: <kbd>A</kbd> analyze · <kbd>D</kbd> 3D · <kbd>R</kbd> register · <kbd>1</kbd>–<kbd>5</kbd> tabs
        </footer>
      </div>

      <SessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} sessions={sessions} setSessions={setSessions} />
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
