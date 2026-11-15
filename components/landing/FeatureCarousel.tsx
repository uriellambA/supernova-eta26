"use client";
// One panel that slides through what Growvia measures, each with a real image:
// screenshots of the dashboard and a Sentinel-2 satellite view of a farm in Los Antiguos.
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Slide = { title: string; text: string; img: string; w: number; h: number; alt: string; icon: string };
const SLIDES: Slide[] = [
  { title: "Climate", text: "20 years of daily NASA climate for your exact farm: frost, heat, rain and wind, month by month.", img: "/landing/feature-climate.jpg", w: 1872, h: 1050, alt: "Climate record and frost calendar in Growvia", icon: "M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" },
  { title: "Moisture", text: "Rain against evaporation, the snow that feeds your summer water and how much to irrigate with each method.", img: "/landing/feature-water.jpg", w: 1872, h: 585, alt: "Irrigation calculator and snow in Growvia", icon: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" },
  { title: "Soil", text: "Texture, organic matter, pH, salinity and water holding from the global soil map, with a soil health score.", img: "/landing/feature-soil.jpg", w: 1872, h: 1050, alt: "Soil properties and soil health in Growvia", icon: "M3 10h18M3 15h18M3 20h18M8 10V6m8 4V5m-4 5V3" },
  { title: "Vegetation from space", text: "How green your farm is, measured by satellite: real Sentinel-2 image of orchards in Los Antiguos (NDVI).", img: "/landing/chacra-ndvi.jpg", w: 1705, h: 963, alt: "Vegetation index of farms in Los Antiguos from Sentinel-2", icon: "M12 21v-9m0 0c0-4 2.5-7 8-7 0 4.5-3 7-8 7Zm0 2c0-3.2-2-5.5-7-5.5 0 3.6 2.5 5.5 7 5.5Z" },
  { title: "Crop rotation", text: "The best rotation for your field, how effective it will be and why: soil, pests, water and income.", img: "/landing/feature-rotation.jpg", w: 1872, h: 1050, alt: "Effectiveness of the recommended rotation in Growvia", icon: "M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2" },
];

export function FeatureCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const go = useCallback((k: number) => setI((k + SLIDES.length) % SLIDES.length), []);

  // moves by itself every 6 s (not while the pointer is on it, nor with reduced motion)
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const s = SLIDES[i];
  return (
    <div className="max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface/85 backdrop-blur-sm"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => { const x0 = touch.current; touch.current = null; if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); }}
      role="region" aria-roledescription="carousel" aria-label="What Growvia measures">
      <div className="relative aspect-[16/8] w-full overflow-hidden bg-surface-2">
        {SLIDES.map((x, k) => (
          <Image key={x.img} src={x.img} alt={x.alt} width={x.w} height={x.h} sizes="(min-width: 1024px) 640px, 100vw" priority={k === 0}
            className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`} />
        ))}
      </div>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-6 w-6 shrink-0 text-cta" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={s.icon} /></svg>
        <div className="min-w-0 flex-1" aria-live="polite">
          <div className="font-medium">{s.title}</div>
          <p className="mt-0.5 text-sm text-muted">{s.text}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => go(i - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted hover:border-ink hover:text-ink" aria-label="Previous">‹</button>
          <button onClick={() => go(i + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted hover:border-ink hover:text-ink" aria-label="Next">›</button>
        </div>
      </div>
      <div className="flex gap-1.5 px-4 pb-4 sm:px-5">
        {SLIDES.map((x, k) => (
          <button key={x.title} onClick={() => go(k)} aria-label={x.title} aria-current={k === i}
            className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-cta" : "w-3 bg-line hover:bg-muted"}`} />
        ))}
      </div>
    </div>
  );
}
