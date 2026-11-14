"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

// Photos of the four Growvia sites, shown behind the hero text with a soft blur and cross-fade.
const SLIDES = [
  { src: "/brand/sites/los-antiguos.jpg", place: "Los Antiguos, Santa Cruz", text: "Lake Buenos Aires and the Andes, at the entrance of the town", w: 664, h: 462 },
  { src: "/brand/sites/perito-moreno.jpg", place: "Perito Moreno, Santa Cruz", text: "The turquoise waters of Lake Buenos Aires and the Andes on the way to Perito Moreno", w: 360, h: 288 },
  { src: "/brand/sites/gobernador-gregores.jpg", place: "Gobernador Gregores, Santa Cruz", text: "Flower fields and poplar windbreaks in an irrigated Patagonian valley", w: 551, h: 362 },
  { src: "/brand/sites/pampa-ondulada.jpg", place: "Pampa Ondulada, Buenos Aires", text: "Maize next to a pasture in the rolling fields of Pergamino", w: 260, h: 146 },
];
const EVERY = 7000;

export function HeroBackdrop() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), EVERY);
    return () => clearInterval(t);
  }, [paused]);
  const s = SLIDES[i];
  return (
    <>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        {SLIDES.map((x, k) => (
          <Image
            key={x.src}
            src={x.src}
            alt=""
            fill
            sizes="100vw"
            priority={k === 0}
            className={`object-cover blur-[3px] transition-[opacity,transform] ease-out ${k === i ? "scale-110 opacity-100" : "scale-100 opacity-0"}`}
            style={{ transitionDuration: `1600ms, ${EVERY + 1600}ms` }}
          />
        ))}
        {/* readability: solid on the text side, photo shows through on the right, fade into the page at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/85 to-canvas/20 max-lg:via-canvas/90 max-lg:to-canvas/70" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-canvas to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />
      </div>
      <figure className="absolute bottom-6 right-4 z-10 max-w-xs text-right sm:right-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <figcaption key={s.src} className="animate-[fadein_0.8s_ease-out]">
          <div className="text-sm font-medium text-ink">{s.place}</div>
          <div className="text-xs text-ink-2">{s.text}</div>
        </figcaption>
        <div className="mt-2 flex justify-end gap-1.5">
          {SLIDES.map((x, k) => (
            <button key={x.src} onClick={() => setI(k)} aria-label={x.place} aria-pressed={k === i}
              className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-ink" : "w-1.5 bg-ink/30 hover:bg-ink/60"}`} />
          ))}
        </div>
      </figure>
    </>
  );
}
