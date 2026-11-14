"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { APP_NAME } from "@/config/app";
import { CROPS } from "@/config/crops";
import { SITE } from "@/config/site";
import { SPECIES } from "@/config/species";
import { MONTHS, SEASONS } from "@/lib/agro";
import { emptyRegister, newPlot, profileFromRegister } from "@/lib/register";
import { METHOD_NAME } from "@/lib/riego";
import { guardar, leer } from "@/lib/storage";
import type { FarmRegister, PlotRecord, Priorities, SistemaRiego } from "@/lib/types";
import { Badge, Reveal, ThemeToggle, btnGhost, btnPrimary, input, label, useHotkeys } from "./ui";

const STEPS = [
  { id: "farm", title: "Farm", hint: "Name and location" },
  { id: "plots", title: "Plots", hint: "What grows where, season by season" },
  { id: "water", title: "Water & soil", hint: "Irrigation and your last soil test" },
  { id: "economy", title: "Economy", hint: "Sales, workers, machinery" },
  { id: "goals", title: "Goals", hint: "What matters to you" },
] as const;

const CROP_CHOICES = [
  ...SPECIES.map((s) => ({ id: s.id, name: `${s.emoji} ${s.name}` })),
  ...CROPS.filter((c) => !SPECIES.some((s) => s.id === c.id)).map((c) => ({ id: c.id, name: `${c.emoji} ${c.name}` })),
];
const SEASON_CHOICES = [{ id: "", name: "—" }, { id: "bare", name: "Bare soil" }, ...CROP_CHOICES];
const MACHINERY = ["Tractor", "Mower", "Sprayer", "Seeder", "Drip system", "Frost fans", "Cold storage", "Greenhouse"];
const INTERESTS = ["New crops", "Greenhouse / hydroponics", "Geothermal heating", "Drip irrigation", "Livestock integration", "Agro-tourism", "Organic certification", "Export"];
const PRI_LABEL: Record<keyof Priorities, string> = { water: "Save water", income: "Income", soil: "Soil health", forage: "Forage", labor: "Less work" };

export function RegisterForm() {
  const router = useRouter();
  const [r, setR] = useState<FarmRegister>(emptyRegister);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [active, setActive] = useState<string>("farm");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    leer<FarmRegister>("register").then((x) => {
      if (x) setR({ ...emptyRegister(), ...x.v });
      setLoaded(true);
    });
  }, []);
  // Auto-save on this device
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      const v = { ...r, updated: new Date().toISOString() };
      guardar("register", v);
      guardar("farm", profileFromRegister(v));
      guardar("priorities", v.priorities);
      setSaved(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    }, 500);
    return () => clearTimeout(t);
  }, [r, loaded]);
  // Highlight the step in view
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-30% 0px -60% 0px" });
    STEPS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const set = <K extends keyof FarmRegister>(k: K, v: FarmRegister[K]) => setR((x) => ({ ...x, [k]: v }));
  const setPlot = (id: string, p: Partial<PlotRecord>) => setR((x) => ({ ...x, plots: x.plots.map((q) => (q.id === id ? { ...q, ...p } : q)) }));
  const total = r.plots.reduce((s, p) => s + (p.areaHa || 0), 0);
  const done = [!!r.farmName, r.plots.length > 0 && r.plots.every((p) => p.crop), r.soilTest.ph !== null || r.soilTest.ec !== null, r.economy.workers > 0, Object.values(r.priorities).some((v) => v > 0)];
  const finish = () => router.push("/app");

  useHotkeys({ s: finish });

  function exportJson() {
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(r.farmName || "growvia-farm").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function importJson(f: File) {
    try {
      setR({ ...emptyRegister(), ...JSON.parse(await f.text()) });
    } catch {
      alert("That file is not a Growvia farm register.");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-serif text-2xl leading-none">{APP_NAME}</Link>
          <nav className="hidden gap-1 text-sm text-muted sm:flex">
            <Link href="/app" className="rounded-lg px-2 py-1 hover:text-ink">Dashboard</Link>
            <span className="rounded-lg px-2 py-1 text-ink">Register</span>
          </nav>
          <span className="ml-auto text-xs text-subtle">{saved ? `Saved on this device · ${saved}` : "Not saved yet"}</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h1 className="font-serif text-4xl leading-none">Farm register</h1>
          <p className="mt-3 text-sm text-muted">Tell {APP_NAME} about your farm once. The AI uses it to compare rotations, plan the seasons and suggest new crops.</p>
          <ol className="mt-6 hidden space-y-1 lg:block">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${active === s.id ? "bg-surface text-ink" : "text-muted hover:text-ink"}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${done[i] ? "border-green-fg bg-green-bg text-green-fg" : "border-line-strong"}`}>{done[i] ? "✓" : i + 1}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-6 grid gap-2">
            <button className={btnPrimary} onClick={finish}>Save &amp; analyze <kbd>S</kbd></button>
            <div className="grid grid-cols-2 gap-2">
              <button className={btnGhost} onClick={exportJson}>Export</button>
              <button className={btnGhost} onClick={() => file.current?.click()}>Import</button>
            </div>
            <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            <p className="text-[11px] text-subtle">Your data stays on this device. Export it to move it to another phone or share it with your advisor.</p>
          </div>
        </aside>

        <div className="space-y-6">
          <Step id="farm" n={1} title="Farm" hint="Name and location">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>Farm name<input className={input} value={r.farmName} onChange={(e) => set("farmName", e.target.value)} placeholder="e.g. Chacra Los Álamos" /></label>
              <label className={label}>Producer<input className={input} value={r.producer} onChange={(e) => set("producer", e.target.value)} placeholder="Your name (optional)" /></label>
              <label className={label}>Area near
                <select className={input} value={SITE.fields.find((f) => f.lat === r.lat && f.lon === r.lon)?.id ?? "custom"} onChange={(e) => { const f = SITE.fields.find((x) => x.id === e.target.value); if (f) setR((x) => ({ ...x, lat: f.lat, lon: f.lon })); }}>
                  {SITE.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  <option value="custom">Exact coordinates</option>
                </select>
              </label>
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className={label}>Latitude<input type="number" step={0.0001} className={input} value={r.lat} onChange={(e) => set("lat", Number(e.target.value))} /></label>
                <label className={label}>Longitude<input type="number" step={0.0001} className={input} value={r.lon} onChange={(e) => set("lon", Number(e.target.value))} /></label>
                <button className={`${btnGhost} !py-1.5`} title="Use my location" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setR((x) => ({ ...x, lat: +p.coords.latitude.toFixed(4), lon: +p.coords.longitude.toFixed(4) })))}>📍</button>
              </div>
            </div>
          </Step>

          <Step id="plots" n={2} title="Plots" hint={`${r.plots.length} plot${r.plots.length === 1 ? "" : "s"} · ${total.toFixed(1)} ha`}>
            <div className="space-y-4">
              {r.plots.map((p) => (
                <div key={p.id} className="rounded-xl border border-line p-4">
                  <div className="grid gap-3 sm:grid-cols-6">
                    <label className={`${label} sm:col-span-2`}>Name<input className={input} value={p.name} onChange={(e) => setPlot(p.id, { name: e.target.value })} /></label>
                    <label className={label}>Area (ha)<input type="number" min={0.1} step={0.1} className={input} value={p.areaHa} onChange={(e) => setPlot(p.id, { areaHa: Number(e.target.value) })} /></label>
                    <label className={`${label} sm:col-span-2`}>Main crop<select className={input} value={p.crop} onChange={(e) => setPlot(p.id, { crop: e.target.value })}>{CROP_CHOICES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                    <label className={label}>Planted (year)<input type="number" min={1950} max={2100} className={input} value={p.plantedYear ?? ""} onChange={(e) => setPlot(p.id, { plantedYear: e.target.value ? Number(e.target.value) : null })} placeholder="perennials" /></label>
                    <label className={`${label} sm:col-span-2`}>Irrigation<select className={input} value={p.irrigation} onChange={(e) => setPlot(p.id, { irrigation: e.target.value as SistemaRiego })}>{(Object.keys(METHOD_NAME) as SistemaRiego[]).map((m) => <option key={m} value={m}>{METHOD_NAME[m]}</option>)}</select></label>
                    <label className={label}>Last yield (t/ha)<input type="number" min={0} step={0.1} className={input} value={p.yieldTHa ?? ""} onChange={(e) => setPlot(p.id, { yieldTHa: e.target.value ? Number(e.target.value) : null })} /></label>
                  </div>
                  <div className="mt-4 text-[11px] font-medium text-muted">What covered this plot in the last 12 months?</div>
                  <div className="mt-1 grid gap-2 sm:grid-cols-4">
                    {SEASONS.map((s) => (
                      <label key={s.id} className={label}>{s.name} <span className="text-subtle">{s.range}</span>
                        <select className={input} value={p.history[s.id]} onChange={(e) => setPlot(p.id, { history: { ...p.history, [s.id]: e.target.value } })}>
                          {SEASON_CHOICES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  {r.plots.length > 1 && <button className="mt-3 text-xs text-red-fg hover:underline" onClick={() => set("plots", r.plots.filter((q) => q.id !== p.id))}>Remove plot</button>}
                </div>
              ))}
              <button className={btnGhost} onClick={() => set("plots", [...r.plots, newPlot(Math.max(0, ...r.plots.map((p) => Number(p.id.split("-")[1]) || 0)) + 1)])}>+ Add plot</button>
            </div>
          </Step>

          <Step id="water" n={3} title="Water & soil" hint="Irrigation and your last soil test">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={label}>Water source<select className={input} value={r.water.source} onChange={(e) => set("water", { ...r.water, source: e.target.value as FarmRegister["water"]["source"] })}><option value="canal">Irrigation canal</option><option value="well">Well</option><option value="river">River / stream</option><option value="mixed">Mixed</option></select></label>
              <label className={label}>Water turn every (days)<input type="number" min={1} max={30} className={input} value={r.water.turnDays ?? ""} onChange={(e) => set("water", { ...r.water, turnDays: e.target.value ? Number(e.target.value) : null })} /></label>
            </div>
            <div className="mt-4 text-[11px] font-medium text-muted">Months when water gets short</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {MONTHS.map((m, i) => {
                const on = r.water.shortMonths.includes(i + 1);
                return <button key={m} onClick={() => set("water", { ...r.water, shortMonths: on ? r.water.shortMonths.filter((x) => x !== i + 1) : [...r.water.shortMonths, i + 1] })} aria-pressed={on} className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? "border-ink bg-ink text-canvas" : "border-line text-ink-2"}`}>{m}</button>;
              })}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <label className={label}>Soil test date<input type="date" className={input} value={r.soilTest.date} onChange={(e) => set("soilTest", { ...r.soilTest, date: e.target.value })} /></label>
              <label className={label}>pH<input type="number" min={3} max={11} step={0.1} className={input} value={r.soilTest.ph ?? ""} onChange={(e) => set("soilTest", { ...r.soilTest, ph: e.target.value ? Number(e.target.value) : null })} /></label>
              <label className={label}>Salinity EC (dS/m)<input type="number" min={0} max={30} step={0.1} className={input} value={r.soilTest.ec ?? ""} onChange={(e) => set("soilTest", { ...r.soilTest, ec: e.target.value ? Number(e.target.value) : null })} /></label>
              <label className={label}>Organic matter (%)<input type="number" min={0} max={20} step={0.1} className={input} value={r.soilTest.organicMatter ?? ""} onChange={(e) => set("soilTest", { ...r.soilTest, organicMatter: e.target.value ? Number(e.target.value) : null })} /></label>
            </div>
            <p className="mt-3 text-[11px] text-subtle">No soil test? Leave it empty: {APP_NAME} uses the soil map and estimates salinity. A test from INTA or any lab makes the advice much better.</p>
          </Step>

          <Step id="economy" n={4} title="Economy" hint="Sales, workers, machinery">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={label}>Main sales channel<select className={input} value={r.economy.channel} onChange={(e) => set("economy", { ...r.economy, channel: e.target.value as FarmRegister["economy"]["channel"] })}><option value="export">Export</option><option value="national">National market</option><option value="local">Local shops</option><option value="tourism">Tourism / farm stand</option><option value="processing">Processing (jams, frozen)</option></select></label>
              <label className={label}>People working (avg.)<input type="number" min={0} max={200} className={input} value={r.economy.workers} onChange={(e) => set("economy", { ...r.economy, workers: Number(e.target.value) })} /></label>
              <label className={label}>Budget for changes (USD)<input type="number" min={0} step={500} className={input} value={r.economy.budgetUsd ?? ""} onChange={(e) => set("economy", { ...r.economy, budgetUsd: e.target.value ? Number(e.target.value) : null })} /></label>
            </div>
            <div className="mt-4 text-[11px] font-medium text-muted">Machinery and infrastructure</div>
            <Chips all={MACHINERY} on={r.economy.machinery} set={(v) => set("economy", { ...r.economy, machinery: v })} />
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--ink)]" checked={r.livestock} onChange={(e) => set("livestock", e.target.checked)} /> I keep livestock (can use forage and covers)</label>
          </Step>

          <Step id="goals" n={5} title="Goals" hint="What matters to you">
            <div className="grid gap-4 sm:grid-cols-5">
              {(Object.keys(PRI_LABEL) as (keyof Priorities)[]).map((k) => (
                <label key={k} className="text-xs text-ink-2">
                  <div className="mb-1 flex justify-between"><span>{PRI_LABEL[k]}</span><span className="text-subtle">{["off", "low", "mid", "high"][r.priorities[k]]}</span></div>
                  <input type="range" min={0} max={3} value={r.priorities[k]} onChange={(e) => set("priorities", { ...r.priorities, [k]: Number(e.target.value) })} className="w-full accent-[var(--ink)]" />
                </label>
              ))}
            </div>
            <div className="mt-5 text-[11px] font-medium text-muted">I&apos;m interested in</div>
            <Chips all={INTERESTS} on={r.interests} set={(v) => set("interests", v)} />
            <label className={`${label} mt-5 block`}>Anything else? (problems, ideas, what happened last season)
              <textarea className={`${input} min-h-24`} value={r.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. The low corner floods in spring and freezes first. I'd like something to sell in autumn." />
            </label>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className={btnPrimary} onClick={finish}>Save &amp; analyze my farm <kbd>S</kbd></button>
              <Badge tone="green" dot>{done.filter(Boolean).length} of {STEPS.length} sections complete</Badge>
            </div>
          </Step>
        </div>
      </main>
    </div>
  );
}

function Step({ id, n, title, hint, children }: { id: string; n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <Reveal className="scroll-mt-24 rounded-2xl border border-line bg-surface p-6">
      <section id={id}>
        <div className="mb-5 flex items-baseline gap-3">
          <span className="font-serif text-3xl text-subtle">{String(n).padStart(2, "0")}</span>
          <h2 className="font-serif text-3xl leading-none">{title}</h2>
          <span className="ml-auto text-xs text-muted">{hint}</span>
        </div>
        {children}
      </section>
    </Reveal>
  );
}

function Chips({ all, on, set }: { all: string[]; on: string[]; set: (v: string[]) => void }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {all.map((m) => {
        const sel = on.includes(m);
        return <button key={m} aria-pressed={sel} onClick={() => set(sel ? on.filter((x) => x !== m) : [...on, m])} className={`rounded-full border px-3 py-1 text-xs ${sel ? "border-ink bg-ink text-canvas" : "border-line text-ink-2 hover:bg-surface-2"}`}>{m}</button>;
      })}
    </div>
  );
}
