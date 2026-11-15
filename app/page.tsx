import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { HeroGrowwy } from "@/components/landing/HeroGrowwy";
import { MobileBar } from "@/components/landing/MobileBar";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { TryIt } from "@/components/landing/TryIt";
import { Reveal } from "@/components/ui";
import { btnPrimary } from "@/components/styles";

// The three things Growvia does, in a few words each
const FEATURES = [
  { title: "Crop rotation", icon: "M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2",
    points: ["The best rotation for your field", "Scored by water, soil, income and work", "Your year plan, season by season"] },
  { title: "Soils", icon: "M3 10h18M3 15h18M3 20h18M8 10V6m8 4V5m-4 5V3",
    points: ["Texture, pH and organic matter", "Salinity risk from NASA satellites", "A simple soil health score"] },
  { title: "Climate", icon: "M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    points: ["20 years of NASA climate", "Frost, wind and drought by month", "Forecast and alerts for your farm"] },
];

/** Landing: the promise, Growwy's quick questions and the live demo. */
export default function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* ---------- Hero ---------- */}
        <section className="relative isolate overflow-hidden">
          <HeroBackdrop />
          <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
            <Reveal>
              <h1 className="font-serif text-5xl leading-[0.98] tracking-tight sm:text-6xl xl:text-7xl">
                Sow <em className="text-cta">smart</em>
              </h1>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-6 max-w-2xl text-lg text-ink-2">Cutting-edge technology backed by more than 20 years of satellite data</p>
            </Reveal>
            <Reveal delay={160} className="mt-10">
              <a href="#try" className={`${btnPrimary} px-6 py-3 text-base`}>Try it</a>
            </Reveal>
            <p className="mt-8 text-xs uppercase tracking-[0.14em] text-muted">Guiding growers towards a better future</p>
            <Reveal delay={220} className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-line bg-surface/85 p-5 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-cta" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={f.icon} /></svg>
                    <span className="font-medium">{f.title}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
                    {f.points.map((x) => <li key={x} className="flex gap-2"><span className="text-cta" aria-hidden>·</span><span>{x}</span></li>)}
                  </ul>
                </div>
              ))}
            </Reveal>
            </div>
            <Reveal delay={200} className="lg:col-span-5 lg:pt-6">
              <div className="lg:ml-auto lg:max-w-md"><HeroGrowwy /></div>
            </Reveal>
          </div>
        </section>

        <TryIt />
      </main>
      <MobileBar />
      <SiteFooter />
    </div>
  );
}
