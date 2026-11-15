"use client";
import dynamic from "next/dynamic";
import { Brand } from "@/components/Brand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ndviInBrowser } from "@/lib/map-probe";
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
import { Tour } from "./Tour";
import { AccountButton } from "./AccountButton";
import { FARM_CHANGED } from "@/lib/account";
import { EffectivenessCard } from "./EffectivenessCard";
import { effectiveness } from "@/lib/effectiveness";
import { syncFarm } from "@/lib/desktop";
import { desbloquearAudio } from "@/hooks/useLeer";
import { LineChart, ndviPoints } from "./Charts";
import { FiltersPanel, WeatherLegend, WeatherPicker } from "./FiltersPanel";
import { Icon } from "./icons";
import type { OverlayId } from "./MapView";
import { Contingency, NewCrops, Rotations, Viability, YearPlan } from "./PlanSections";
import { SessionsModal } from "./SessionsModal";
import { buildSession, listSessions, saveSession, sessionLink, type SavedSession } from "@/lib/session";
import { SmapStatus } from "./SmapStatus";
import { RotationBuilder, RotationMatrix, RotationMethod, RotationSummary } from "./RotationTools";
import { Pachamama } from "./Pachamama";
import { RotationExplorer } from "./RotationExplorer";
import { LangToggle } from "./Translator";
import { getLang, useLang } from "@/lib/i18n";
import { Forecast, Frost, Options, Overview, Soil, Water } from "./Sections";
import { Badge, DemoBadge, LevelPill, Meter, Note, Reveal, Spinner, ThemeToggle, btnGhost, useHotkeys } from "./ui";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading map…</div> });

// The dashboard is split in 5 tabs so the farmer sees one topic at a time.
const TABS = [
  { id: "plan", label: "Crop rotation", short: "Rotation", icon: "rotation", blurb: "Compare, design and plan the rotation of your field", tone: "bg-green-bg text-green-fg", subs: [{ id: "rotations", label: "Compare rotations" }, { id: "effect", label: "Effectiveness" }, { id: "builder", label: "Build your own" }, { id: "seasons", label: "Year plan" }, { id: "method", label: "How it's scored" }] },
  { id: "map", label: "Map", short: "Map", icon: "map", blurb: "", tone: "", subs: [] },
  { id: "crops", label: "Crops & economy", short: "Crops", icon: "sprout", blurb: "New species, costs, margins and what you can do", tone: "bg-amber-bg text-amber-fg", subs: [{ id: "crops", label: "New crops" }, { id: "viability", label: "Viability" }, { id: "options", label: "What you can do" }] },
  { id: "weather", label: "Weather & risks", short: "Weather", icon: "weather", blurb: "Forecast, frost and El Niño / La Niña plans", tone: "bg-blue-bg text-blue-fg", subs: [{ id: "forecast", label: "Forecast" }, { id: "risks", label: "Contingencies" }, { id: "frost", label: "Frost" }, { id: "climate", label: "Climate record" }] },
  { id: "soil", label: "Soil & water", short: "Soil", icon: "drop", blurb: "Soil health, salinity and irrigation needs", tone: "bg-red-bg text-red-fg", subs: [{ id: "soil", label: "Soil" }, { id: "water", label: "Irrigation" }] },
  { id: "home", label: "General overview", short: "General", icon: "home", blurb: "", tone: "", subs: [] },
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
  const [tab, setTab] = useState<TabId>("plan");
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
  // first visit: the guided tour opens once (remembered on this device); "?" opens it again
  const [tourOpen, setTourOpen] = useState(false);
  const [growwyOpen, setGrowwyOpen] = useState(false);
  useEffect(() => {
    leer<boolean>("tour").then((x) => { if (!x?.v) setTimeout(() => setTourOpen(true), 1200); });
  }, []);
  const closeTour = useCallback(() => { setTourOpen(false); guardar("tour", true); }, []);
  const tourStep = useCallback((id: string) => { if (["rotation", "effect", "tiles"].includes(id)) go("home"); else if (id === "map") go("map"); }, [go]);
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
  // if our server could not reach NASA in time, the browser reads the same NASA images directly
  const qLat = +field.lat.toFixed(2), qLon = +field.lon.toFixed(2);
  const ndviDirect = useCallback(() => ndviInBrowser(qLat, qLon), [qLat, qLon]);
  const ndvi = useRecurso<NdviResumen>(`/api/vegetation?${q}`, ndviDirect);
  const forecast = useRecurso<ClimaResumen>(`/api/forecast?${q}`);
  const snow = useRecurso<NieveResumen>(site.watershed ? `/api/snow?site=${site.id}` : null);
  const wgrid = useRecurso<WeatherGrid>(weatherVar ? `/api/weather-grid?site=${site.id}` : null);
  const soil = useRecurso<SoilResumen>(`/api/soil?${q}`);
  const enso = useRecurso<EnsoResumen>("/api/enso");
  const smap = useRecurso<SmapResumen>(`/api/smap?${q}`);

  // Coming from the landing (quick question to Growwy, or "Try it"): /app?site=…&ask=…
  const [autoAsk, setAutoAsk] = useState<string | null>(null);
  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    if (!u.has("ask") && !u.has("site")) return;
    const s = u.get("site");
    if (s && SITES.some((x) => x.id === s)) setTimeout(() => chooseSite(s), 0); // after the saved data is restored
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL
    if (u.has("ask")) { setAutoAsk(u.get("ask") ?? ""); setGrowwyOpen(true); }
    window.history.replaceState(null, "", "/app"); // a reload does not ask again
  }, [chooseSite]);

  // Growvia Desktop: keep the app's background frost / wind alerts on this field
  const uiLang = useLang();
  useEffect(() => {
    syncFarm(field.lat, field.lon, field.name, uiLang);
  }, [field.lat, field.lon, field.name, uiLang]);

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
    // the account brought or switched the farm: show it
    const reload = () => leer<FarmRegister>("register").then((r) => {
      if (!r?.v.farmName) return;
      setRegister(r.v);
      setFarmState(profileFromRegister(r.v));
      setPriState(r.v.priorities);
      setSiteIdState(siteById(r.v.siteId).id);
      setField({ lat: r.v.lat, lon: r.v.lon, name: r.v.farmName });
    });
    window.addEventListener(FARM_CHANGED, reload);
    leer<Strategy | null>("customRotation").then((r) => r?.v && setCustomState(r.v));
    return () => window.removeEventListener(FARM_CHANGED, reload);
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
  // How effective the recommended combination will be (best for the farmer vs what they do today)
  const eff = useMemo(() => {
    if (!results.length) return null;
    const best = results.find((r) => r.strategy.id === advice?.best) ?? [...results].sort((a, b) => b.score - a.score)[0];
    const cur = results.find((r) => r.strategy.current) ?? best;
    return { name: best.strategy.name, e: effectiveness(best, cur, { soil: soil.data ?? null, climate: climate.data ?? null, sal: sal ?? null, register, simulated: !!simulated }) };
  }, [results, advice, soil.data, climate.data, sal, register, simulated]);

  async function analyze(question = "", history: { q: string; a: string }[] = []) {
    if (!climate.data || !soil.data || !results.length || !health || !sal) return;
    desbloquearAudio(); // still inside the tap / key press: lets Growwy speak as soon as the answer arrives
    const ctx = {
      ...buildContext(field.name, farm, pri, climate.data, soil.data, forecast.data, ndvi.data, results, { fits, health, sal, enso: enso.data, register, site }),
      language: getLang() === "es" ? ("Spanish (Argentina)" as const) : ("English" as const),
      question: question.trim() || undefined,
      history: history.length ? history.slice(-4) : undefined,
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
    a: () => { setGrowwyOpen(true); analyze(); },
    d: () => { go("map"); setIs3D((v) => !v); },
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
      {tourOpen && <Tour onClose={closeTour} onStep={tourStep} />}
      <div className="flex min-h-screen flex-col print:hidden">
        <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <Brand />
            <div data-tour="place" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm sm:max-w-md">
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
            <div data-tour="tools" className="flex gap-2 sm:ml-auto">
              <button className={btnGhost} onClick={() => setTourOpen(true)} title="Tutorial" aria-label="Tutorial">?</button>
              <LangToggle />
              <AccountButton />
            </div>
          </div>
          <nav data-tour="tabs" className="mx-auto hidden max-w-[1500px] gap-1 overflow-x-auto px-4 pb-2 sm:flex sm:px-6" aria-label="Dashboard tabs">
            {TABS.map((t, i) => (
              <button key={t.id} onClick={() => go(t.id)} aria-pressed={tab === t.id}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? "bg-ink text-canvas" : "text-ink-2 hover:bg-surface-2"}`}>
                <Icon name={t.icon} />{t.label}{t.id === "plan" && tab !== "plan" && <span className="h-1.5 w-1.5 rounded-full bg-green-fg" aria-hidden />}<kbd className="hidden lg:inline-flex">{i + 1}</kbd>
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pb-6">
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <div>
              <h1 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">{tab === "home" ? field.name : current_tab.label}</h1>
              <p className="mt-2 text-sm text-muted">{tab === "home" ? `${site.name}, ${site.region} · ${field.lat.toFixed(3)}, ${field.lon.toFixed(3)} · ${farm.areaHa} ha · ${farm.system}` : `${field.name} · ${site.name}`}</p>
            </div>
            {tab === "home" && (
              <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                {!register && <Link href="/register"><Badge tone="amber">Register your farm →</Badge></Link>}
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
                <RotationSummary results={results} eff={eff?.e ?? null} onCompare={() => go("plan", "rotations")} onEffect={() => go("plan", "effect")} />
              ) : !failed && <div className="md:col-span-6 lg:col-span-12"><Spinner text="Comparing crop rotations for your field…" /></div>}
              <Tile tour="tiles" className="md:col-span-3 lg:col-span-3" delay={60} eyebrow="Vegetation" onClick={() => go("soil", "soil")}>
                {ndvi.data?.ultimo ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-4xl">{ndvi.data.aproximado ? "≈" : ""}{ndvi.data.ultimo.ndvi}</span><span className="text-xs text-muted">NDVI</span>
                    </div>
                    <div className="-mx-1 mt-1"><LineChart label="NDVI" points={ndviPoints(ndvi.data.serie.slice(-23))} /></div>
                  </>
                ) : <TileEmpty st={ndvi.estado} why={ndvi.error} />}
              </Tile>
              <Tile className="md:col-span-3 lg:col-span-3" delay={120} eyebrow="Weather today" onClick={() => go("weather", "forecast")}>
                {today ? (
                  <>
                    <div className="font-serif text-4xl">{Math.round(today.tmin)}° <span className="text-ink-2">/ {Math.round(today.tmax)}°</span></div>
                    <div className="mt-2 text-xs text-muted">{`Min / max · gusts ${Math.round(today.rafagas)} km/h`}</div>
                  </>
                ) : <TileEmpty st={forecast.estado} why={forecast.error} />}
              </Tile>
              <Tile className="md:col-span-3 lg:col-span-3" delay={180} eyebrow="Soil health" onClick={() => go("soil", "soil")}>
                {health && sal ? (
                  <>
                    <div className="flex items-baseline gap-2"><span className="font-serif text-4xl">{health.score}</span><LevelPill level={health.level} /></div>
                    <Meter value={health.score} level={health.level} className="mt-3" />
                  </>
                ) : <TileEmpty st={soil.estado} />}
              </Tile>
              <Tile className="md:col-span-3 lg:col-span-3" delay={240} eyebrow="Alerts" onClick={() => go("weather", "risks")}>
                {climate.data ? (
                  <>
                    <div className="flex items-baseline gap-2"><span className="font-serif text-4xl">{alerts.length}</span><span className="text-xs text-muted">{alerts.length === 1 ? "alert" : "alerts"}</span></div>
                    <ul className="mt-2 space-y-1 text-xs">
                      {(alerts.length ? alerts : risks).slice(0, 1).map((h) => <li key={h.id} className="flex items-center gap-1.5"><span>{h.emoji}</span><span className="truncate">{h.name}</span></li>)}
                    </ul>
                  </>
                ) : <TileEmpty st={climate.estado} />}
              </Tile>

            </div>
          ) : tab === "map" ? (
              <Reveal tour="map" className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface ">
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                  <span className="text-sm font-medium">Satellite map</span>
                  <span className="hidden text-xs text-subtle sm:inline">Tap to place your field · move the cursor to read the exact value</span>
                  <button className={`${btnGhost} !py-1 text-xs ${is3D ? "!border-ink" : ""}`} onClick={() => setIs3D(!is3D)} aria-pressed={is3D}>3D</button>
                  <div className="w-full sm:ml-auto sm:w-auto"><FiltersPanel active={overlays} toggle={toggleOverlay} /></div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
                  <span className="text-xs font-medium text-muted">Weather now</span>
                  <div className="w-full sm:ml-auto sm:w-auto"><WeatherPicker value={weatherVar} onChange={setWeatherVar} /></div>
                </div>
                {weatherVar && <WeatherLegend varId={weatherVar} grid={wgrid.data} />}
                {overlays.has("salinity") && <SmapStatus />}
                <div className="h-[62vh] min-h-[380px] lg:h-[calc(100vh-280px)]">
                  <MapView site={site} weather={weatherVar && wgrid.data ? { varId: weatherVar, grid: wgrid.data } : null} field={field} onPick={pick} is3D={is3D} overlays={overlays} boundary={register && field.lat === register.lat && field.lon === register.lon ? register.boundary : null} />
                </div>
              </Reveal>
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
              {sub === "effect" && (eff ? <EffectivenessCard e={eff.e} name={eff.name} /> : <Spinner text="Comparing crop rotations for your field…" />)}
              {sub === "seasons" && <YearPlan results={results} fits={fits} advice={advice} site={site} />}
              {sub === "crops" && <NewCrops fits={fits} advice={advice} site={site} />}
              {sub === "viability" && <Viability fits={fits} areaHa={farm.areaHa} site={site} />}
              {sub === "options" && <Options options={options} />}
              {sub === "forecast" && (forecast.data ? <Forecast f={forecast.data} /> : <Spinner text="Loading forecast…" />)}
              {sub === "risks" && <Contingency list={risks} enso={enso.data} c={climate.data!} />}
              {sub === "frost" && <Frost c={climate.data!} />}
              {sub === "climate" && <Overview c={climate.data!} current={current} ndvi={ndvi.data} />}
              {sub === "soil" && <Soil s={soil.data!} c={climate.data} ndvi={ndvi.data} readings={readings} sal={sal!} health={health!} smap={smap.data} onShowMap={() => { setOverlays(new Set(["salinity"])); go("map"); }} />}
              {sub === "water" && <Water c={climate.data!} f={forecast.data} snow={snow.data} farm={farm} setFarm={setFarm} />}
            </div>
          )}
        </main>
        <footer className="mx-auto hidden w-full max-w-[1500px] px-6 pb-6 text-[11px] text-subtle sm:block">
          {APP_NAME} is a decision-support tool. It does not replace your judgment or local agronomic advice. · Shortcuts: <kbd>A</kbd> analyze · <kbd>D</kbd> 3D · <kbd>R</kbd> register · <kbd>1</kbd>–<kbd>6</kbd> tabs
        </footer>
      </div>

      {/* theme switch: bottom left, out of the way (above the phone tab bar) */}
      <div className="fixed bottom-20 left-4 z-40 sm:bottom-5 sm:left-5 print:hidden"><ThemeToggle /></div>

      {/* Growwy: always at hand, in a side panel */}
      <button data-tour="growwy" onClick={() => setGrowwyOpen(true)} aria-label="Ask Growwy"
        className={`fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-line bg-surface p-1 shadow-xl sm:py-1.5 sm:pl-1.5 sm:pr-4 transition hover:border-ink sm:bottom-6 sm:right-6 print:hidden ${growwyOpen ? "hidden" : ""}`}>
        <span className="h-11 w-11 overflow-hidden rounded-full bg-surface-2"><Pachamama fill className="h-full w-full" /></span>
        <span className="hidden text-sm font-medium sm:inline">Ask Growwy</span>
      </button>
      {growwyOpen && (
        <div className="fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true" aria-label="Growwy">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGrowwyOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-line bg-canvas p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="font-serif text-2xl leading-none">Decision support</span>
              <Badge tone="blue">SI</Badge>
              <button className={`${btnGhost} ml-auto`} onClick={() => setGrowwyOpen(false)} aria-label="Close">✕</button>
            </div>
            <AIPanel farm={farm} setFarm={setFarm} results={results} advice={advice} busy={busy} onAnalyze={analyze} error={aiError} registered={!!register} session={session} link={link} savedCount={sessions.length} onOpenSessions={() => setSessionsOpen(true)} systems={site.systems} autoAsk={autoAsk}
                  growwy={{ fits, climate: climate.data ?? null, soil: soil.data ?? null, sal: sal ?? null, risks, register, site, place: field.name }} />
                {advice && <button className="mt-3 text-left text-xs font-medium underline-offset-4 hover:underline" onClick={() => { setGrowwyOpen(false); go("plan", "seasons"); }}>See the year plan →</button>}
          </aside>
        </div>
      )}

      {/* Phones: the tabs as a bar at the bottom, like an app */}
      <nav data-tour="tabs" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-canvas/95 backdrop-blur sm:hidden print:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Dashboard tabs">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => go(t.id)} aria-pressed={tab === t.id}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${tab === t.id ? "text-ink" : "text-muted"}`}>
            <span className={`grid h-7 w-10 place-items-center rounded-full ${tab === t.id ? "bg-surface-2" : ""}`}><Icon name={t.icon} className="h-[18px] w-[18px]" /></span>
            {t.short}
          </button>
        ))}
      </nav>

      <SessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} sessions={sessions} setSessions={setSessions} />
    </>
  );
}

function Tile({ children, className = "", delay = 0, eyebrow, onClick, tour }: { children: React.ReactNode; className?: string; delay?: number; eyebrow: string; onClick?: () => void; tour?: string }) {
  return (
    <Reveal delay={delay} tour={tour} className={`group relative rounded-2xl border border-line bg-surface p-6 ${className}`}>
      <div className="mb-3 flex items-center text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
        {eyebrow}
        {onClick && <button onClick={onClick} className="ml-auto normal-case tracking-normal text-muted transition group-hover:text-ink">Details →</button>}
      </div>
      {children}
    </Reveal>
  );
}

function TileEmpty({ st, why }: { st: string; why?: string }) {
  return (
    <div className="text-sm text-muted">
      {st === "cargando" ? "Loading…" : "Not available right now"}
      {st !== "cargando" && why && <div className="mt-1 text-[11px] text-subtle" title={why}>{why.length > 120 ? why.slice(0, 117) + "…" : why}</div>}
    </div>
  );
}
