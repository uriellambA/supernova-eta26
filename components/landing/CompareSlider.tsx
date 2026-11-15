"use client";
import { useEffect, useState } from "react";
import { SHOWCASE } from "@/config/sites";

type Meta = { name: string; date?: string; cloud?: number; ndviMedian?: number };
type View =
  | { mode: "loading" }
  | { mode: "error" }
  | { mode: "static"; color: string; index: string; meta: Meta }; // Sentinel-2 true color + NDVI, built by `npm run landing-images`

export function CompareSlider() {
  const [x, setX] = useState(50);
  const [view, setView] = useState<View>({ mode: "loading" });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/landing/chacra.json");
        if (!r.ok) throw new Error("no static images");
        const meta = (await r.json()) as Meta;
        if (alive) setView({ mode: "static", color: "/landing/chacra-color.jpg", index: "/landing/chacra-ndvi.jpg", meta });
      } catch {
        if (alive) setView({ mode: "error" });
      }
    })();
    return () => { alive = false; };
  }, []);

  if (view.mode === "loading" || view.mode === "error") {
    return (
      <div className="grid aspect-[16/9] w-full place-items-center rounded-2xl border border-line bg-surface-2 text-sm text-muted">
        {view.mode === "loading" ? "Loading satellite image…" : "Satellite image unavailable right now"}
      </div>
    );
  }
  const indexLabel = view.mode === "static" ? "Vegetation index · NDVI" : "Vegetation index";
  return (
    <figure>
      <div className="relative aspect-[16/9] w-full select-none overflow-hidden rounded-2xl border border-line bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated or data-URL images */}
        <img src={view.color} alt="Sentinel-2 satellite image of chacras in Los Antiguos" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- generated or data-URL images */}
          <img src={view.index} alt="Vegetation index computed from the image" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        </div>
        <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">{indexLabel}</span>
        <span className="absolute right-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">Satellite image · Sentinel-2</span>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${x}%` }}>
          <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-xs text-black">‹ ›</span>
        </div>
        <input type="range" min={0} max={100} value={x} onChange={(e) => setX(Number(e.target.value))} aria-label="Compare vegetation index with the original image" className="compare-range absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/55 px-2 py-1 text-[10px] text-white backdrop-blur">
          <span>Bare soil</span>
          <span className="h-2 w-20 rounded-full" style={{ background: "linear-gradient(90deg,#8c5a2d,#cdaa64,#ebe18c,#96cd5f,#379b41,#0a5a28)" }} />
          <span>Dense crop</span>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-muted">
        {SHOWCASE.name}
        {view.mode === "static" && view.meta.date ? ` · ${view.meta.date}` : ""}. Satellites see plant health that is invisible to the naked eye. Drag to compare.
      </figcaption>
    </figure>
  );
}
