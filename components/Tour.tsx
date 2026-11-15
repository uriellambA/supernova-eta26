"use client";
// Guided first visit of the dashboard: highlights each part and explains it in a few words.
// Opens by itself the first time (remembered on this device) and again with the "?" button.
import { useCallback, useEffect, useState } from "react";
import { btnGhost, btnPrimary } from "./styles";

type Step = { id: string; title: string; text: string };

/** First visible element for a step (the same part can exist twice, e.g. tabs on top and at the bottom on phones). */
const find = (id: string) => (id ? [...document.querySelectorAll(`[data-tour="${id}"]`)].find((el) => el.getBoundingClientRect().width > 0) ?? null : null);

const STEPS: Step[] = [
  { id: "", title: "Welcome to Growvia", text: "A quick tour of your dashboard: what each part shows and how to use it. It takes one minute." },
  { id: "place", title: "Your farm or a place", text: "Choose your registered farm or one of the places. Everything on the dashboard changes to that spot." },
  { id: "tabs", title: "Six tabs", text: "It starts with Crop rotation, the main decision. Then Map, Crops, Climate and Soil. General overview, at the end, sums everything up." },
  { id: "rotation", title: "The best rotation for your field", text: "Growvia compares your current rotation with the others and scores them with your priorities: water, income, soil, forage and work." },
  { id: "effect", title: "How effective it will be", text: "How much the recommended rotation improves on what you do today. \"Why it works\" shows each aspect, why, and when you will notice it." },
  { id: "tiles", title: "Quick summary", text: "Vegetation, today's weather, soil health and alerts. \"Details\" opens the full tab." },
  { id: "map", title: "Satellite map", text: "Turn on NASA layers (vegetation, soil temperature, salinity, snow) or the weather. Move the cursor over the map to see the exact value at each point. Tap to place your field." },
  { id: "growwy", title: "Growwy, your SI", text: "Always here, on every tab. Ask anything about your farm, by writing or by voice. \"Analyze my field\" gives you a full plan with the year by seasons." },
  { id: "tools", title: "Tour and language", text: "Spanish or English, and the \"?\" button to see this tour again. Light or dark mode is at the bottom left; the 3D view is on the map." },
];

type Box = { x: number; y: number; w: number; h: number };

export function Tour({ onClose, onStep }: { onClose: () => void; onStep?: (id: string) => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [vw, setVw] = useState(1024);
  const [vh, setVh] = useState(800);
  const step = STEPS[i];

  const measure = useCallback(() => {
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    const el = find(step.id);
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    setBox({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, [step.id]);

  // bring the highlighted part into view, then follow it while the page moves
  useEffect(() => {
    onStep?.(step.id);
    const t = setTimeout(() => {
      const el = find(step.id);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      measure();
    }, 120);
    const again = setTimeout(measure, 650);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      clearTimeout(again);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [step.id, measure, onStep]);

  const last = i === STEPS.length - 1;
  const next = useCallback(() => (last ? onClose() : setI((x) => x + 1)), [last, onClose]);
  const back = useCallback(() => setI((x) => Math.max(0, x - 1)), []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [next, back, onClose]);

  // card next to the highlighted part (below if there is room, else above); on phones, at the bottom
  const pad = 8;
  const phone = vw < 640;
  const cardW = Math.min(360, vw - 32);
  let style: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: cardW };
  if (box && phone) style = { left: 16, right: 16, bottom: 16 };
  else if (box) {
    const below = box.y + box.h + pad + 12, above = box.y - pad - 12 - 236;
    if (below + 236 < vh) style = { left: Math.min(Math.max(16, box.x), vw - cardW - 16), top: below, width: cardW };
    else if (above > 16) style = { left: Math.min(Math.max(16, box.x), vw - cardW - 16), top: above, width: cardW };
    else style = { right: 24, bottom: 24, width: cardW }; // tall part: keep the card in a corner, out of the way
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Tutorial">
      {box ? (
        <div className="pointer-events-none fixed rounded-2xl ring-2 ring-cta transition-all duration-300"
          style={{ left: box.x - pad, top: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)" }} />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}
      <div className="fixed rounded-2xl border border-line bg-surface p-5 shadow-2xl" style={style}>
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">{`Tutorial · ${i + 1} / ${STEPS.length}`}</div>
        <h2 className="mt-1 font-serif text-2xl leading-tight">{step.title}</h2>
        <p className="mt-2 text-sm text-ink-2">{step.text}</p>
        <div className="mt-4 flex items-center gap-2">
          <button className="text-xs text-muted hover:text-ink" onClick={onClose}>Skip</button>
          <div className="ml-auto flex gap-2">
            {i > 0 && <button className={btnGhost} onClick={back}>Back</button>}
            <button className={btnPrimary} onClick={next} autoFocus>{last ? "Start" : "Next"}</button>
          </div>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden>
          {STEPS.map((s, k) => <span key={s.title} className={`h-1 flex-1 rounded-full ${k <= i ? "bg-cta" : "bg-line"}`} />)}
        </div>
      </div>
    </div>
  );
}
