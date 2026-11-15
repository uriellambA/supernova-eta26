import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { HeroGrowwy } from "@/components/landing/HeroGrowwy";
import { MobileBar } from "@/components/landing/MobileBar";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { TryIt } from "@/components/landing/TryIt";
import { Reveal } from "@/components/ui";

// What Growvia measures first (icon paths)
const MEASURES: [string, string][] = [
  ["Climate", "M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"],
  ["Moisture", "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"],
  ["Soil", "M3 10h18M3 15h18M3 20h18M8 10V6m8 4V5m-4 5V3"],
  ["Crop rotation", "M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2"],
];

/** Landing: the promise, what we measure, Growwy's quick questions and the live demo. */
export default function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* ---------- Hero ---------- */}
        <section className="relative isolate overflow-hidden">
          <HeroBackdrop />
          <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-12">
            <div className="lg:col-span-7">
            <Reveal>
              <h1 className="font-serif text-5xl leading-[0.98] tracking-tight sm:text-6xl xl:text-7xl">
                Harvest <em className="text-cta">smart</em>
              </h1>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-6 max-w-2xl text-lg text-ink-2">Cutting-edge technology backed by more than 20 years of satellite data</p>
            </Reveal>
            <Reveal delay={160} className="mt-10 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
              {MEASURES.map(([label, path]) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-sm">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-cta" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={path} /></svg>
                  <span className="font-medium leading-tight">{label}</span>
                </div>
              ))}
            </Reveal>
            <p className="mt-8 text-xs uppercase tracking-[0.14em] text-muted">Guiding growers towards a better future</p>
            </div>
            <Reveal delay={200} className="lg:col-span-5 lg:pt-6">
              <HeroGrowwy />
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
