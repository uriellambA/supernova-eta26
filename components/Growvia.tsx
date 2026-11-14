"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_NAME } from "@/config/app";
import { SITE } from "@/config/site";
import { useOnline } from "@/hooks/useOnline";
import { useRecurso } from "@/hooks/useRecurso";
import { buildContext, localAdvice } from "@/lib/advisor";
import { farmOptions } from "@/lib/options";
import { compareStrategies } from "@/lib/rotation";
import { guardar, leer } from "@/lib/storage";
import {
  DEFAULT_PRIORITIES, DEFAULT_PROFILE, type AdvisorResult, type ClimaResumen, type FarmProfile, type GroundReading,
  type IndicadoresNasa, type NdviResumen, type NieveResumen, type Priorities, type SoilResumen,
} from "@/lib/types";
import { AIPanel } from "./AIPanel";
import { FiltersPanel } from "./FiltersPanel";
import { HardwareModal } from "./HardwareModal";
import type { OverlayId } from "./MapView";
import { Report } from "./Report";
import { Forecast, Frost, Options, Overview, Rotations, Soil, Water } from "./Sections";
import { DemoBadge, Note, Spinner, btnGhost } from "./ui";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-slate-500">Loading map…</div> });

const SECTIONS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "soil", label: "Soil", icon: "🟫" },
  { id: "rotations", label: "Rotations", icon: "🔄" },
  { id: "options", label: "What you can do", icon: "🛠️" },
  { id: "forecast", label: "Forecast", icon: "🌦️" },
  { id: "frost", label: "Frost", icon: "❄️" },
  { id: "water", label: "Water", icon: "💧" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export function Growvia() {
  const first = SITE.fields[0];
  const [field, setField] = useState({ lat: first.lat, lon: first.lon, name: first.name });
  const [farm, setFarmState] = useState<FarmProfile>(DEFAULT_PROFILE);
  const [pri, setPriState] = useState<Priorities>(DEFAULT_PRIORITIES);
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

  // Restore saved farm data (stored on this device)
  useEffect(() => {
    leer<FarmProfile>("farm").then((r) => r && setFarmState({ ...DEFAULT_PROFILE, ...r.v }));
    leer<Priorities>("priorities").then((r) => r && setPriState(r.v));
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
  const options = useMemo(() => (climate.data ? farmOptions(climate.data, farm) : []), [climate.data, farm]);
  const current = results.find((r) => r.strategy.current) ?? null;
  const simulated = climate.data?.simulado || soil.data?.simulado;

  async function analyze() {
    if (!climate.data || !soil.data || !results.length) return;
    const ctx = buildContext(field.name, farm, pri, climate.data, soil.data, forecast.data, ndvi.data, results);
    setBusy(true);
    setAiError(null);
    setSection("rotations");
    try {
      if (!online) throw new Error("Offline: showing the rotation model's answer.");
      const r = await fetch("/api/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) });
      const j = await r.json();
      if (!r.ok) throw new Error(r.status === 501 ? "AI key not configured: showing the rotation model's answer." : "AI unavailable: showing the rotation model's answer.");
      setAdvice(j);
    } catch (e) {
      setAdvice(localAdvice(ctx));
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
      climate.data ? `❄️ ${climate.data.libreHeladas} frost-free days · 💧 ${climate.data.lluviaAnual} mm rain/yr` : "",
      window.location.origin,
    ].filter(Boolean).join("\n");
    if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) navigator.share({ title: APP_NAME, text }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  const toggleOverlay = (id: OverlayId) => setOverlays((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const loading = climate.estado === "cargando" || soil.estado === "cargando";
  const failed = !climate.data && climate.estado === "error";

  return (
    <>
      <div className="flex min-h-screen flex-col print:hidden">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05080f]/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 text-lg">🌱</span>
              <span className="text-xl font-black tracking-tight text-white">{APP_NAME}</span>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300">
              <span>📍</span>
              <select className="min-w-0 flex-1 bg-transparent font-semibold text-white focus:outline-none" value={SITE.fields.find((f) => f.name === field.name)?.id ?? "custom"} onChange={(e) => { const f = SITE.fields.find((x) => x.id === e.target.value); if (f) pick(f.lat, f.lon); }}>
                {SITE.fields.map((f) => <option key={f.id} value={f.id} className="bg-slate-900">{f.name}</option>)}
                <option value="custom" disabled className="bg-slate-900">My field (tap the map)</option>
              </select>
              <span className="hidden truncate text-xs text-slate-500 sm:inline">{SITE.name}, {SITE.region}</span>
              <DemoBadge show={simulated} />
            </div>
            <div className="flex gap-2">
              <button className={`${btnGhost} ${is3D ? "!border-emerald-400/60 !bg-emerald-400/15 text-emerald-200" : ""}`} onClick={() => setIs3D(!is3D)} aria-pressed={is3D}>🏔️ 3D View</button>
              <button className={btnGhost} onClick={() => setHw(true)}>🔌 Hardware</button>
            </div>
          </div>
        </header>

        <main className="grid flex-1 gap-3 p-3 lg:grid-cols-[300px_minmax(0,1fr)_230px] lg:grid-rows-[auto_auto]">
          <aside className="order-4 lg:order-1 lg:h-[calc(62vh+52px)]">
            <AIPanel farm={farm} setFarm={setFarm} results={results} advice={advice} busy={busy} onAnalyze={analyze} onShare={share} error={aiError} />
          </aside>

          <section className="order-1 flex flex-col gap-2 lg:order-2">
            <div className="h-[46vh] overflow-hidden rounded-2xl border border-white/10 lg:h-[62vh]">
              <MapView field={field} onPick={pick} is3D={is3D} overlays={overlays} />
            </div>
            <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Sections">
              {SECTIONS.map((s) => (
                <button key={s.id} onClick={() => setSection(s.id)} aria-pressed={section === s.id}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${section === s.id ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>
                  {s.icon} {s.label}
                </button>
              ))}
            </nav>
          </section>

          <aside className="order-2 lg:order-3 lg:h-[calc(62vh+52px)] lg:overflow-y-auto">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Map filters</div>
            <div className="overflow-x-auto pb-1 lg:overflow-visible">
              <FiltersPanel active={overlays} toggle={toggleOverlay} />
            </div>
            <p className="mt-2 hidden text-[11px] text-slate-500 lg:block">Tap the map to place your field. Use 3D View to see slopes and low spots.</p>
          </aside>

          <section className="order-3 rounded-2xl border border-white/10 bg-[#0a101c] p-4 lg:order-4 lg:col-span-3">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{SECTIONS.find((s) => s.id === section)?.icon} {SECTIONS.find((s) => s.id === section)?.label}</h2>
              <span className="text-xs text-slate-500">· {field.name}</span>
            </div>
            {failed ? (
              <Note kind="warn">We couldn&apos;t load the climate record for this field ({climate.error}). Try again in a minute.</Note>
            ) : loading || !climate.data || !soil.data ? (
              <Spinner text="Reading 20 years of climate records and the soil map for your field… (first time ~20 s)" />
            ) : (
              <>
                {section === "overview" && <Overview c={climate.data} current={current} />}
                {section === "soil" && <Soil s={soil.data} c={climate.data} ndvi={ndvi.data} readings={readings} />}
                {section === "rotations" && <Rotations results={results} pri={pri} setPri={setPri} />}
                {section === "options" && <Options options={options} />}
                {section === "forecast" && (forecast.data ? <Forecast f={forecast.data} /> : <Spinner text="Loading forecast…" />)}
                {section === "frost" && <Frost c={climate.data} />}
                {section === "water" && <Water c={climate.data} f={forecast.data} snow={snow.data} farm={farm} setFarm={setFarm} />}
              </>
            )}
          </section>
        </main>
        <footer className="px-4 pb-4 text-center text-[11px] text-slate-600">{APP_NAME} is a decision-support tool. It does not replace your judgment or local agronomic advice.</footer>
      </div>

      <HardwareModal open={hw} onClose={() => setHw(false)} readings={readings} addReading={addReading} />
      <Report field={field} farm={farm} c={climate.data} soil={soil.data} results={results} advice={advice} options={options} />
    </>
  );
}
