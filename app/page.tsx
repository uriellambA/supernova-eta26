import Link from "next/link";
import { SITES } from "@/config/sites";
import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { HeroGrowwy } from "@/components/landing/HeroGrowwy";
import { MobileBar } from "@/components/landing/MobileBar";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { TryIt } from "@/components/landing/TryIt";
import { DownloadButton } from "@/components/DownloadButton";
import { btnPrimary } from "@/components/styles";
import { Badge, Reveal } from "@/components/ui";

/** Landing: the promise, Growwy's quick questions, "About us" / "About Growwy" and the live demo. */
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
            <Reveal className="flex flex-wrap items-center gap-2">
              {SITES.map((x) => (
                <Badge key={x.id} tone="green" dot title={x.region}>{x.name}</Badge>
              ))}
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-serif text-5xl leading-[0.98] tracking-tight sm:text-6xl xl:text-7xl">
                Know what to plant next, <em className="text-cta">and how much you&apos;ll earn.</em>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-2xl text-lg text-ink-2">
                Growwy reads 20 years of NASA climate and the soil of your farm, compares your rotation with better ones and gives you a plan with numbers: water, money and a calendar. Free, in Spanish, on your phone or computer.
              </p>
            </Reveal>
            <Reveal delay={220} className="mt-8 flex flex-wrap gap-3">
              <a href="#try" className={`${btnPrimary} px-5 py-3`}>Try it with my farm</a>
              <DownloadButton size="lg" ghost />
            </Reveal>
            <Reveal delay={260} className="mt-8 grid max-w-2xl grid-cols-3 gap-2">
              {[
                ["20 years", "of NASA climate for your exact farm"],
                ["4 rotations", "compared in water, soil and money"],
                ["1 plan", "with materials, prices and calendar"],
              ].map(([v, l]) => (
                <div key={v} className="rounded-2xl border border-line bg-surface/80 p-3 backdrop-blur-sm sm:p-4">
                  <div className="font-serif text-2xl leading-none sm:text-3xl">{v}</div>
                  <div className="mt-1 text-xs text-muted sm:text-sm">{l}</div>
                </div>
              ))}
            </Reveal>
            <p className="mt-6 text-xs uppercase tracking-[0.14em] text-muted">Guiding growers towards a better future</p>
            <Reveal delay={300} className="mt-6 grid max-w-2xl grid-cols-2 gap-2">
              <Link href="/about" className="group flex items-center gap-3 rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-sm transition hover:border-ink">
                <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-cta" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 0 1 0 6M21 20c0-2.6-1.6-4.8-4-5.6" /></svg>
                <span className="min-w-0 flex-1"><span className="block font-medium">About us</span><span className="block text-xs text-muted">The team, how it works and what you get</span></span>
                <span className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink">→</span>
              </Link>
              <Link href="/growwy" className="group flex items-center gap-3 rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-sm transition hover:border-ink">
                <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-cta" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21v-9m0 0c0-4 2.5-7 8-7 0 4.5-3 7-8 7Zm0 2c0-3.2-2-5.5-7-5.5 0 3.6 2.5 5.5 7 5.5Z" /></svg>
                <span className="min-w-0 flex-1"><span className="block font-medium">About Growwy</span><span className="block text-xs text-muted">The Pachamama that guides your decisions</span></span>
                <span className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink">→</span>
              </Link>
            </Reveal>
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
