import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/config/app";
import { SPECIES } from "@/config/species";
import { STRATEGIES } from "@/config/rotations";
import { CompareSlider } from "@/components/landing/CompareSlider";
import { SamplePlanLink } from "@/components/landing/SamplePlanLink";
import { OpenData } from "@/components/landing/OpenData";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { DownloadButton } from "@/components/DownloadButton";
import { btnPrimary } from "@/components/styles";
import { Badge, Reveal } from "@/components/ui";

export const metadata: Metadata = { title: "About us · Growvia", description: "Who we are, how Growvia works and what it gives each farmer." };

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** "About us": the team, the satellite comparison, how it works and what Growvia gives the farmer. */
export default function AboutPage() {
  const newSpecies = SPECIES.filter((s) => s.status === "new");
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="pt-10">
        {/* ---------- About us ---------- */}
        <section id="about" aria-labelledby="about-title" className="mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6">
          <Reveal className="max-w-3xl rounded-2xl border border-line bg-surface p-6">
            <h2 id="about-title" className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">About us</h2>
            <div className="mt-3 rounded-xl border border-cta/40 bg-surface-2 p-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-cta">NASA Space Apps Challenge 2026 · Our challenge</div>
              <div className="mt-1 font-serif text-2xl leading-snug">Field Shift: Adapting Farms with NASA Data</div>
              <p className="mt-1 text-sm text-ink-2">Using NASA data so that farmers can adapt what they grow and how they care for their soil to a changing climate.</p>
            </div>
            <p className="mt-3 font-serif text-2xl leading-snug">We are high school students from Caleta Olivia taking part in the NASA Space Apps Challenge. We developed Growvia: the path to smarter farming.</p>
            <p className="mt-3 text-ink-2">Growvia is a smart web platform designed to help farmers in Los Antiguos, Santa Cruz, make better decisions about their crops and the care of their soil. Our project combines NASA satellite observations, climate information, soil data and crop characteristics to offer recommendations tailored to each farm.</p>
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <Reveal className="mt-12">
            <CompareSlider />
          </Reveal>
        </section>


        {/* ---------- How it works ---------- */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <SectionTitle eyebrow="How it works" title="From satellite to a decision you can trust" />
          <div className="mt-10 grid gap-4 lg:grid-cols-12">
            <Step n="01" title="Pick your field" text="Tap the satellite map or load your farm data: plots, crops of each season, water, soil test and economy." className="lg:col-span-4" />
            <Step n="02" title="Growvia reads the data" text="Two decades of daily climate, the soil map, vegetation every 16 days, snowpack and the Pacific index, all for that spot." className="lg:col-span-4" delay={80} />
            <Step n="03" title="Compare and decide" text="Your rotation vs three alternatives, a four-season plan and new crops — each with why, evidence, gaps and risks." className="lg:col-span-4" delay={160} />
            <Shot src="/landing/rotations.png" alt="Rotation strategies compared side by side with a season-by-season layout" caption="Rotations compared, season by season" className="lg:col-span-7" />
            <Shot src="/landing/crops.png" alt="New crop species ranked by viability for the selected field" caption="New crops ranked for your soil and climate" className="lg:col-span-5" delay={80} />
          </div>
        </section>

        {/* ---------- What Growwy does for you ---------- */}
        <section id="features" className="border-t border-line bg-surface-2/50">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
            <SectionTitle eyebrow="What you get" title="Less guessing, more harvest" />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <Feature title="Know what to plant" badge={<Badge tone="green">{`${STRATEGIES.length} rotations · ${newSpecies.length} new crops`}</Badge>}
                text="The best rotation for your soil and your priorities, and new crops for the months without income, season by season.">
                <div className="mt-5 space-y-1.5">
                  <MonthRow label="Today" months={[12, 1, 2, 3]} />
                  <MonthRow label="With Growwy" months={[3, 4, 5, 10, 11, 12, 1, 2]} />
                </div>
              </Feature>
              <Feature title="Save water and soil" delay={70}
                text="How much to irrigate each month, how to keep the soil covered, and alerts for frost, wind, drought, El Niño and La Niña.">
                <div className="mt-4 flex flex-wrap gap-1.5"><Badge tone="blue" dot>Irrigation by month</Badge><Badge tone="red" dot>Late frost</Badge><Badge tone="amber" dot>Strong wind</Badge><Badge tone="green" dot>Soil covered</Badge></div>
              </Feature>
              <Feature title="Know the numbers" delay={140}
                text="A plan in PDF with what to do, how to divide your field, materials with prices, margin and when it pays back.">
                <SamplePlanLink />
              </Feature>
            </div>
            <p className="mt-6 text-sm text-muted">Curious about the satellites and models behind it? <Link href="/data" className="font-medium text-ink underline underline-offset-4">See the technical data →</Link></p>
          </div>
        </section>

        {/* ---------- Open data ---------- */}
        <OpenData />

        {/* ---------- CTA ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal className="rounded-2xl border border-line bg-surface p-10 text-center">
            <h2 className="mx-auto max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Your field, your priorities, <em className="text-muted">your decision.</em></h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-2">{APP_NAME} highlights patterns and trade-offs. It supports your judgment and local agronomic advice; it never replaces them.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/app" className={`${btnPrimary} px-5 py-3`}>Open the dashboard <kbd>D</kbd></Link>
              <DownloadButton size="lg" ghost />
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
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
