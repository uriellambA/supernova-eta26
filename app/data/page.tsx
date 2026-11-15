import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { btnGhost } from "@/components/styles";
import { LangToggle } from "@/components/Translator";
import { Reveal, ThemeToggle } from "@/components/ui";
import { SPECIES } from "@/config/species";

export const metadata: Metadata = { title: "Our data · Growvia", description: "The satellite, climate and soil data behind every Growvia recommendation." };

/** Technical detail moved out of the landing page: the data layers behind Growwy. */
export default function DataPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Brand />
          <div className="ml-auto flex items-center gap-2"><LangToggle /><ThemeToggle /><Link href="/" className={btnGhost}>← Home</Link></div>
        </div>
      </header>
      <main>
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
                    ["Satellite map layers", "Imagery, vegetation, land heat, snow, relief, salinity risk", "4 sites", "Map filters and 3D view"],
                    ["Weather map", "Temperature, UV, wind, humidity, rain, pressure, clouds", "Grid over each site, now", "Weather filters on the map"],
                    ["Crop & species library", `${SPECIES.length} species, 15 traits each + economics`, "Patagonia and Pampa", "New crops and viability"],
                    ["Your farm register", "Plots, history, soil test, water, economy", "Your farm", "Personal SI analysis"],
                  ].map(([a, b, c, d]) => (
                    <tr key={a} className="border-b border-line last:border-0"><td className="px-6 py-3 font-medium text-ink">{a}</td><td>{b}</td><td className="whitespace-nowrap pr-4">{c}</td><td className="px-6">{d}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

      </main>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal>
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">{eyebrow}</div>
      <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">{title}</h1>
    </Reveal>
  );
}
