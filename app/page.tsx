import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/config/app";
import { SPECIES } from "@/config/species";
import { STRATEGIES } from "@/config/rotations";
import { CompareSlider } from "@/components/landing/CompareSlider";
import { LangToggle } from "@/components/Translator";
import { LandingKeys } from "@/components/landing/LandingKeys";
import { btnGhost, btnPrimary } from "@/components/styles";
import { Badge, Reveal, ThemeToggle } from "@/components/ui";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export default function Landing() {
  const newSpecies = SPECIES.filter((s) => s.status === "new");
  return (
    <div className="min-h-screen">
      <LandingKeys />
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <span className="font-serif text-2xl leading-none">{APP_NAME}</span>
          <nav className="hidden gap-1 text-sm text-muted md:flex">
            <a href="#how" className="rounded-lg px-2 py-1 hover:text-ink">How it works</a>
            <a href="#features" className="rounded-lg px-2 py-1 hover:text-ink">Features</a>
            <a href="#data" className="rounded-lg px-2 py-1 hover:text-ink">Our data</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
            <Link href="/app" className={btnPrimary}>Open dashboard <kbd>D</kbd></Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <Reveal className="flex flex-wrap gap-2">
            <Badge tone="green" dot>Los Antiguos · Santa Cruz, Patagonia</Badge>
            <Badge tone="blue">Decision support with AI</Badge>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[0.98] tracking-tight sm:text-7xl">
              A better crop rotation for your soil, <em className="text-muted">every season.</em>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-lg text-ink-2">
              {APP_NAME} compares your current crop rotation with better alternatives for your exact field — using 20 years of climate,
              satellite vegetation and soil data — explains why, and shows what you could grow when the cherry and strawberry season is over.
            </p>
          </Reveal>
          <Reveal delay={220} className="mt-8 flex flex-wrap gap-3">
            <Link href="/app" className={`${btnPrimary} px-5 py-3`}>Compare rotations for my field <kbd>D</kbd></Link>
            <Link href="/register" className={`${btnGhost} px-5 py-3`}>Register your farm <kbd>R</kbd></Link>
          </Reveal>
          <Reveal delay={300} className="mt-12">
            <CompareSlider />
          </Reveal>
        </section>

        {/* ---------- Strip ---------- */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line md:grid-cols-4">
            {[
              ["🗺️", "Satellite layers", "Vegetation, heat, snow and relief on one map"],
              ["📈", "12+ indicators", "Frost, humidity, pressure, UV, evaporation, salinity"],
              ["⏱️", "Always current", "Daily forecast, 16-day vegetation passes"],
              ["⚖️", "Options compared", "4 rotations and 15 crops ranked for your field"],
            ].map(([e, t, d], i) => (
              <Reveal key={t} delay={i * 70} className="bg-surface p-6">
                <div className="text-2xl">{e}</div>
                <div className="mt-2 font-medium">{t}</div>
                <div className="text-sm text-muted">{d}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <SectionTitle eyebrow="How it works" title="From satellite to a decision you can trust" />
          <div className="mt-10 grid gap-4 lg:grid-cols-12">
            <Step n="01" title="Pick your field" text="Tap the satellite map or register your farm: plots, crops of each season, water, soil test and economy." className="lg:col-span-4" />
            <Step n="02" title="Growvia reads the data" text="Two decades of daily climate, the soil map, vegetation every 16 days, snowpack and the Pacific index, all for that spot." className="lg:col-span-4" delay={80} />
            <Step n="03" title="Compare and decide" text="Your rotation vs three alternatives, a four-season plan and new crops — each with why, evidence, gaps and risks." className="lg:col-span-4" delay={160} />
            <Shot src="/landing/rotations.png" alt="Rotation strategies compared side by side with a season-by-season layout" caption="Rotations compared, season by season" className="lg:col-span-7" />
            <Shot src="/landing/crops.png" alt="New crop species ranked by viability for the selected field" caption="New crops ranked for your soil and climate" className="lg:col-span-5" delay={80} />
          </div>
        </section>

        {/* ---------- Features (bento) ---------- */}
        <section id="features" className="border-t border-line bg-surface-2/50">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
            <SectionTitle eyebrow="Features" title="Everything a small farm needs to plan the year" />
            <div className="mt-10 grid gap-4 md:grid-cols-6 lg:grid-cols-12">
              <Feature className="md:col-span-6 lg:col-span-12" title="Crop rotation decision system — the heart of Growvia" badge={<Badge tone="blue">AI + rules</Badge>}
                text="Compares your existing rotation with three alternatives using water, bare-soil months, wind erosion, nitrogen, organic matter, pests, forage, income and labor — weighted by your priorities.">
                <div className="mt-5 grid grid-cols-4 gap-1 text-[10.5px]">
                  {["Spring", "Summer", "Autumn", "Winter"].map((s) => <div key={s} className="text-subtle">{s}</div>)}
                  {["Cherry + clover", "Cherry harvest", "Rye sown in alleys", "Rye cover"].map((c, i) => <div key={c} className={`rounded-md px-1.5 py-1 ${i >= 2 ? "bg-green-bg text-green-fg" : "bg-surface-2 text-ink-2"}`}>{c}</div>)}
                  {["Potato", "Potato", "Oats + vetch", "Bare soil"].map((c, i) => <div key={c + i} className={`rounded-md px-1.5 py-1 ${i === 3 ? "bg-red-bg text-red-fg" : i === 2 ? "bg-green-bg text-green-fg" : "bg-blue-bg text-blue-fg"}`}>{c}</div>)}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["Your rotation vs 3 alternatives", "Build your own rotation", "Plan by season", "Why · evidence · gaps · risks", "Weighted by your priorities"].map((x) => <Badge key={x} tone="green" dot>{x}</Badge>)}
                </div>
                <p className="mt-3 text-xs text-muted">{STRATEGIES.length} strategies across orchards, vegetables and forage.</p>
              </Feature>
              <Feature className="md:col-span-6 lg:col-span-6" title="Vegetation index · NDVI & EVI" delay={70} text="Plant vigor every 16 days at 250 m, and how it compares with last year.">
                <svg viewBox="0 0 300 80" className="mt-5 w-full" aria-hidden>
                  <path d="M0,60 C30,58 50,30 80,22 S130,40 160,58 S220,26 250,20 S290,40 300,46" fill="none" stroke="#3f8f5a" strokeWidth="2" />
                  <path d="M0,68 C30,66 50,46 80,40 S130,52 160,66 S220,44 250,38 S290,52 300,56" fill="none" stroke="#b08a3c" strokeWidth="1.6" strokeDasharray="4 3" />
                </svg>
              </Feature>
              <Feature className="md:col-span-3 lg:col-span-4" title="Weather & field sensors" delay={0} text="Temperature, humidity, pressure, soil salinity, evaporation and UV — from satellites, forecasts and your own Field Node.">
                <div className="mt-4 flex flex-wrap gap-1.5">{["Temperature", "Humidity", "Pressure", "Salinity", "Evaporation", "UV"].map((x) => <Badge key={x}>{x}</Badge>)}</div>
              </Feature>
              <Feature className="md:col-span-3 lg:col-span-4" title="Soil study & health" delay={70} text="Texture, organic matter, pH, nitrogen, CEC, water holding, infiltration and a soil-health index for every point.">
                <div className="mt-4 flex h-2.5 overflow-hidden rounded-full"><div className="w-[55%] bg-[#e3c995]" /><div className="w-[30%] bg-[#b5aca1]" /><div className="w-[15%] bg-[#9a5b3c]" /></div>
                <div className="mt-1 flex justify-between text-[10px] text-subtle"><span>Sand</span><span>Silt</span><span>Clay</span></div>
              </Feature>
              <Feature className="md:col-span-6 lg:col-span-4" title="Economic viability" delay={140} text="Yield, price, margin, setup cost and payback for each option, adjusted by how well it fits your soil and climate.">
                <div className="mt-4 font-serif text-4xl">USD 9.4k<span className="ml-2 font-sans text-xs text-muted">margin/ha · example</span></div>
              </Feature>
              <Feature className="md:col-span-6 lg:col-span-6" title="What after cherries and strawberries?" badge={<Badge tone="green">{newSpecies.length} new species</Badge>}
                text="Haskap, calafate, rosehip, sea buckthorn, saffron, hops, asparagus… scored against frost, chill, heat, pH, salinity, water and wind.">
                <div className="mt-5 space-y-1.5">
                  <MonthRow label="Today" months={[12, 1, 2, 3]} />
                  <MonthRow label="With new crops" months={[3, 4, 5, 10, 11, 12, 1, 2]} />
                </div>
              </Feature>
              <Feature className="md:col-span-6 lg:col-span-6" title="Contingencies: frost, wind, drought, El Niño & La Niña" delay={70}
                text="Live status from the forecast plus a before / during / after plan, and what each Pacific phase meant on your field in the last 20 years.">
                <div className="mt-4 flex flex-wrap gap-1.5"><Badge tone="red" dot>Late frost</Badge><Badge tone="amber" dot>Strong wind</Badge><Badge tone="green" dot>Snowpack</Badge><Badge tone="blue" dot>El Niño</Badge><Badge>Volcanic ash</Badge></div>
              </Feature>
              <Feature className="md:col-span-3 lg:col-span-4" title="Farm register" text="Plots, crops season by season, water, soil test and economy. Stays on your device; export it anytime." />
              <Feature className="md:col-span-3 lg:col-span-4" title="3D terrain & hardware" delay={70} text="See slopes and cold low spots in 3D, and add a low-cost Field Node for soil, salinity and air readings." />
              <Feature className="md:col-span-6 lg:col-span-4" title="Voice, offline & share" delay={140} text="Speak your notes, listen to the advice, use it without signal, and share a PDF or WhatsApp summary." />
            </div>
          </div>
        </section>

        {/* ---------- Data ---------- */}
        <section id="data" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <SectionTitle eyebrow="Our data" title="The database behind every recommendation" />
          <Reveal className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b border-line"><th className="px-6 py-3 font-medium">Layer</th><th className="font-medium">Detail</th><th className="font-medium">Coverage</th><th className="px-6 font-medium">Used for</th></tr>
                </thead>
                <tbody className="text-ink-2">
                  {[
                    ["Daily climate record", "Temperature, rain, wind, humidity, pressure, UV, soil wetness", "20 years, every day", "Frost calendar, evaporation, chill hours, trends"],
                    ["Vegetation index", "NDVI and EVI, 250 m", "Every 16 days", "Crop vigor, bare soil, year-on-year change"],
                    ["Soil map", "Texture, organic carbon, pH, N, CEC, density · 6 depths", "250 m, 0–200 cm", "Soil study, water holding, soil health"],
                    ["Weather forecast", "Hourly temperature, humidity, pressure, UV, gusts", "16 days", "Frost alerts, irrigation, contingencies"],
                    ["Snowpack", "Snowfall in the watershed that feeds the canals", "20 seasons", "Summer water outlook"],
                    ["Pacific index", "El Niño / La Niña anomaly", "Since 1950", "Seasonal tendency, contingency plans"],
                    ["Satellite map layers", "Imagery, vegetation, land heat, snow, relief", "Valley-wide", "Map filters and 3D view"],
                    ["Crop & species library", `${SPECIES.length} species, 15 traits each + economics`, "Los Antiguos", "New crops and viability"],
                    ["Your farm register", "Plots, history, soil test, water, economy", "Your farm", "Personal AI analysis"],
                  ].map(([a, b, c, d]) => (
                    <tr key={a} className="border-b border-line last:border-0"><td className="px-6 py-3 font-medium text-ink">{a}</td><td>{b}</td><td className="whitespace-nowrap pr-4">{c}</td><td className="px-6">{d}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal className="rounded-2xl border border-line bg-surface p-10 text-center">
            <h2 className="mx-auto max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Your field, your priorities, <em className="text-muted">your decision.</em></h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-2">{APP_NAME} highlights patterns and trade-offs. It supports your judgment and local agronomic advice; it never replaces them.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/app" className={`${btnPrimary} px-5 py-3`}>Open the dashboard <kbd>D</kbd></Link>
              <Link href="/register" className={`${btnGhost} px-5 py-3`}>Register your farm <kbd>R</kbd></Link>
            </div>
          </Reveal>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-3 px-4 py-6 text-xs text-subtle sm:px-6">
          <span className="font-serif text-base text-ink">{APP_NAME}</span>
          <span>Smarter crop rotations for resilient soil · Los Antiguos, Santa Cruz</span>
          <span className="ml-auto">Values to validate with local experts</span>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal>
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">{eyebrow}</div>
      <h2 className="mt-2 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">{title}</h2>
    </Reveal>
  );
}

function Step({ n, title, text, className = "", delay = 0 }: { n: string; title: string; text: string; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={`rounded-2xl border border-line bg-surface p-6 ${className}`}>
      <div className="font-serif text-3xl text-subtle">{n}</div>
      <div className="mt-3 font-medium">{title}</div>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </Reveal>
  );
}

function Shot({ src, alt, caption, className = "", delay = 0 }: { src: string; alt: string; caption: string; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={`overflow-hidden rounded-2xl border border-line bg-surface ${className}`}>
      <Image src={src} alt={alt} width={1400} height={900} className="h-72 w-full object-cover object-top" />
      <div className="border-t border-line px-6 py-3 text-sm text-muted">{caption}</div>
    </Reveal>
  );
}

function Feature({ title, text, badge, children, className = "", delay = 0 }: { title: string; text: string; badge?: ReactNode; children?: ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={`rounded-2xl border border-line bg-surface p-6 ${className}`}>
      <div className="flex items-start gap-2">
        <h3 className="font-medium">{title}</h3>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      <p className="mt-2 text-sm text-muted">{text}</p>
      {children}
    </Reveal>
  );
}

function MonthRow({ label, months }: { label: string; months: number[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-[11px] text-muted">{label}</span>
      <div className="grid flex-1 grid-cols-12 gap-[2px]">
        {MONTHS.map((m, i) => <div key={i} className={`h-5 rounded-sm text-center text-[9px] leading-5 ${months.includes(i + 1) ? "bg-green-bg text-green-fg" : "bg-surface-2 text-subtle"}`}>{m}</div>)}
      </div>
    </div>
  );
}
