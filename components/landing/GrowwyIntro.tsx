"use client";
import Link from "next/link";
import { useLeer } from "@/hooks/useLeer";
import { getLang, translate } from "@/lib/i18n";
import { Pachamama } from "@/components/Pachamama";
import { Reveal } from "@/components/ui";
import { btnGhost, btnPrimary } from "@/components/styles";

const LEAD = "Growwy is Growvia's SI, inspired by the Pachamama: Mother Earth for the Andean peoples, who looks after the land and the people who work it. Growwy helps every grower find their way through the data and reach their own final decision.";
const P1 = "Growwy does not guess. Before saying anything, she reads what NASA satellites and records say about your exact field: 20 years of daily climate, the soil map, vegetation every 16 days, soil moisture and salinity, the snow that feeds the canals and the El Niño / La Niña phase.";
const P2 = "Then she compares your current rotation with the alternatives, plans the four seasons and suggests new crops for the months without income, always showing why, the evidence, the information gaps and the risks.";

const POINTS: { icon: string; title: string; text: string }[] = [
  { icon: "M4 6h16v10H8l-4 4V6Z", title: "Speaks your language", text: "Ask by typing or speaking, in Spanish or English. She answers in plain words and can read the answer aloud." },
  { icon: "M4 19V9m6 10V5m6 14v-7m4 7H2", title: "Shows the evidence", text: "Every recommendation comes with the data behind it: climate, soil, water and satellite records. No black boxes." },
  { icon: "M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7l-8-4Zm-3 9 2 2 4-4", title: "You decide", text: "Growwy guides and explains; the final decision is always yours, together with your experience and local advice (INTA, cooperatives)." },
  { icon: "M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19.5h.01", title: "Works without signal", text: "With no internet or no SI key she still answers, using Growvia's transparent rules." },
];

export function GrowwyIntro() {
  const tts = useLeer();
  return (
    <section id="growwy" className="relative scroll-mt-20 overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-20 sm:px-6 lg:grid-cols-12">
        <Reveal className="flex justify-center lg:col-span-5">
          <Pachamama variant="full" className="h-[440px] w-auto sm:h-[560px]" />
        </Reveal>
        <div className="lg:col-span-7">
          <Reveal>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Meet Growwy</div>
            <h2 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">What is Growwy?</h2>
            <p className="mt-4 text-lg text-ink-2">{LEAD}</p>
            <p className="mt-4 text-ink-2">{P1}</p>
            <p className="mt-3 text-ink-2">{P2}</p>
            <blockquote className="mt-6 border-l-2 border-cta pl-4 font-serif text-2xl italic text-ink">
              “I listen to the land so that you can decide better.”
              <footer className="mt-1 font-sans text-xs not-italic text-muted">Growwy, the voice of the Pachamama in Growvia</footer>
            </blockquote>
          </Reveal>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {POINTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 70} className="rounded-2xl border border-line bg-surface p-4">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-cta" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={p.icon} /></svg>
                <div className="mt-2 font-medium">{p.title}</div>
                <p className="mt-1 text-sm text-muted">{p.text}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/app" className={btnPrimary}>Ask Growwy about my field</Link>
            {tts.soportado && (tts.hablando
              ? <button className={btnGhost} onClick={tts.detener}>■ Stop</button>
              : <button className={btnGhost} onClick={() => tts.leer([LEAD, P1, P2].map((t) => (getLang() === "es" ? translate(t) ?? t : t)).join(" "))}>▶ Listen to Growwy</button>)}
          </div>
        </div>
      </div>
    </section>
  );
}
