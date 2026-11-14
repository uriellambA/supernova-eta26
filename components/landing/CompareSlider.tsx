"use client";
import { useState } from "react";

// Deterministic farm parcels (a stylized Los Antiguos valley: chacras between the river and the lake).
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const r = rng(7);
type Parcel = { pts: string; ndvi: number; tone: number };
const PARCELS: Parcel[] = [];
const COLS = [0, 120, 230, 360, 470, 600, 720, 840];
const ROWS = [0, 95, 175, 270, 350, 450];
for (let i = 0; i < COLS.length - 1; i++) {
  for (let j = 0; j < ROWS.length - 1; j++) {
    const j1 = (k: number) => k + (r() - 0.5) * 14;
    const x0 = COLS[i] + 4, x1 = COLS[i + 1] - 4, y0 = ROWS[j] + 4, y1 = ROWS[j + 1] - 4;
    const split = r() > 0.55;
    const mx = (x0 + x1) / 2 + (r() - 0.5) * 30;
    const shapes = split
      ? [[x0, y0, mx - 3, y1], [mx + 3, y0, x1, y1]]
      : [[x0, y0, x1, y1]];
    for (const [a, b, c, d] of shapes) {
      const ndvi = Math.max(0.05, Math.min(0.9, 0.15 + r() * 0.75 * (i === 3 ? 0.35 : 1)));
      PARCELS.push({ pts: `${j1(a)},${j1(b)} ${j1(c)},${j1(b)} ${j1(c)},${j1(d)} ${j1(a)},${j1(d)}`, ndvi, tone: r() });
    }
  }
}
const ndviColor = (v: number) => {
  const stops = [[0.05, [166, 97, 26]], [0.3, [223, 194, 125]], [0.5, [166, 217, 106]], [0.7, [26, 150, 65]], [0.9, [0, 90, 40]]] as const;
  for (let k = 1; k < stops.length; k++) {
    if (v <= stops[k][0]) {
      const [a, ca] = stops[k - 1], [b, cb] = stops[k];
      const t = (v - a) / (b - a);
      return `rgb(${ca.map((x, n) => Math.round(x + (cb[n] - x) * t)).join(",")})`;
    }
  }
  return "rgb(0,90,40)";
};
const natural = (p: Parcel) => {
  const g = 70 + p.ndvi * 60 + p.tone * 20;
  return `rgb(${Math.round(g + 30 - p.ndvi * 40)},${Math.round(g + 18)},${Math.round(g - 10)})`;
};

function Scene({ mode }: { mode: "index" | "natural" }) {
  return (
    <svg viewBox="0 0 840 450" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <rect width="840" height="450" fill={mode === "index" ? "#7a5a2a" : "#6f6656"} />
      {PARCELS.map((p, i) => <polygon key={i} points={p.pts} fill={mode === "index" ? ndviColor(p.ndvi) : natural(p)} stroke={mode === "index" ? "rgba(255,255,255,0.85)" : "rgba(235,230,220,0.55)"} strokeWidth={1.5} />)}
      <path d="M0,300 C150,280 260,330 420,300 S700,250 840,280" fill="none" stroke={mode === "index" ? "#3b6fb0" : "#4c6a7a"} strokeWidth={9} opacity={0.9} />
      <path d="M380,0 L395,450" stroke="#3a3833" strokeWidth={10} />
      <text x={402} y={440} fill="#efece6" fontSize={13} fontFamily="ui-sans-serif">Main canal</text>
    </svg>
  );
}

export function CompareSlider() {
  const [x, setX] = useState(52);
  return (
    <div className="relative aspect-[16/9] w-full select-none overflow-hidden rounded-2xl border border-line">
      <Scene mode="natural" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}><Scene mode="index" /></div>
      <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">Vegetation index</span>
      <span className="absolute right-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">Original image</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${x}%` }}>
        <span className="absolute top-1/2 left-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-xs text-black">‹ ›</span>
      </div>
      <input type="range" min={0} max={100} value={x} onChange={(e) => setX(Number(e.target.value))} aria-label="Compare vegetation index with the original image" className="compare-range absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}
