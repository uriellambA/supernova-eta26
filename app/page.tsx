import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { HeroGrowwy } from "@/components/landing/HeroGrowwy";
import { MobileBar } from "@/components/landing/MobileBar";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { TryIt } from "@/components/landing/TryIt";
import { Reveal } from "@/components/ui";
import { btnPrimary } from "@/components/styles";

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
                Harvest <em className="text-cta">smart</em>
              </h1>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-6 max-w-2xl text-lg text-ink-2">Cutting-edge technology backed by more than 20 years of satellite data</p>
            </Reveal>
            <Reveal delay={160} className="mt-10">
              <a href="#try" className={`${btnPrimary} px-6 py-3 text-base`}>Try it</a>
            </Reveal>
            <p className="mt-8 text-xs uppercase tracking-[0.14em] text-muted">Guiding growers towards a better future</p>
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
