"use client";
import { useEffect, useState } from "react";
import { SITE } from "@/config/site";

type Meta = { name: string; date?: string; cloud?: number; ndviMedian?: number };
type View =
  | { mode: "loading" }
  | { mode: "error" }
  | { mode: "static"; color: string; index: string; meta: Meta } // real NDVI (red + near-infrared), built by `npm run landing-images`
  | { mode: "live"; color: string; index: string }; // live imagery + visible-band vegetation index (VARI)

const Z = 17;
const mercX = (lo: number) => ((lo + 180) / 360) * 256 * 2 ** Z;
const mercY = (la: number) => {
  const s = Math.sin((la * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** Z;
};

// NDVI-style palette (bare soil → dense crop)
const STOPS: [number, number[]][] = [[0, [140, 90, 45]], [0.2, [205, 170, 100]], [0.35, [235, 225, 140]], [0.5, [150, 205, 95]], [0.65, [55, 155, 65]], [0.85, [10, 90, 40]]];
function palette(v: number) {
  if (v <= 0) return STOPS[0][1];
  for (let k = 1; k < STOPS.length; k++) if (v <= STOPS[k][0]) {
    const [a, ca] = STOPS[k - 1], [b, cb] = STOPS[k], t = (v - a) / (b - a);
    return ca.map((c, j) => c + (cb[j] - c) * t);
  }
  return STOPS.at(-1)![1];
}

/** Stitches real satellite tiles of the showcase chacra and computes a visible-band vegetation index (VARI). */
async function buildLive(): Promise<{ color: string; index: string }> {
  const { lat, lon, widthM, heightM } = SITE.showcase;
  const dLat = heightM / 2 / 111320, dLon = widthM / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  const x0 = Math.floor(mercX(lon - dLon)), x1 = Math.ceil(mercX(lon + dLon)), y0 = Math.floor(mercY(lat + dLat)), y1 = Math.ceil(mercY(lat - dLat));
  const W = x1 - x0, H = y1 - y0;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  const jobs: Promise<void>[] = [];
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x1 - 1) / 256); tx++) {
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y1 - 1) / 256); ty++) {
      jobs.push(new Promise((ok, fail) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => { ctx.drawImage(im, tx * 256 - x0, ty * 256 - y0); ok(); };
        im.onerror = () => fail(new Error("tile"));
        im.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${ty}/${tx}`;
      }));
    }
  }
  await Promise.all(jobs);
  const color = cv.toDataURL("image/jpeg", 0.85);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const den = g + r - b;
    const vari = den !== 0 ? (g - r) / den : 0;
    const v = Math.max(0, Math.min(0.85, (vari + 0.12) * 1.9)); // stretch VARI to the palette
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    const c = palette(v), k = 0.55 + 0.6 * lum;
    d[i] = Math.min(255, c[0] * k); d[i + 1] = Math.min(255, c[1] * k); d[i + 2] = Math.min(255, c[2] * k);
  }
  ctx.putImageData(img, 0, 0);
  return { color, index: cv.toDataURL("image/jpeg", 0.85) };
}

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
        try {
          const live = await buildLive();
          if (alive) setView({ mode: "live", ...live });
        } catch {
          if (alive) setView({ mode: "error" });
        }
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
        <img src={view.color} alt="Real satellite image of a chacra in Los Antiguos" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- generated or data-URL images */}
          <img src={view.index} alt="Vegetation index computed from the image" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        </div>
        <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">{indexLabel}</span>
        <span className="absolute right-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">Original image</span>
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
        {SITE.showcase.name}
        {view.mode === "static" && view.meta.date ? ` · ${view.meta.date}` : ""}. Satellites see plant health that is invisible to the naked eye. Drag to compare.
      </figcaption>
    </figure>
  );
}
