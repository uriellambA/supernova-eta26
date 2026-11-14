"use client";
import { useEffect, useRef } from "react";
import { isSpeaking, voiceLevel } from "@/lib/voz";

// Pachamama: the face of Growwy, Growvia's SI. Uses the team's illustration (public/brand/pachamama):
// body.webp = the character without the flying leaves; leaves.webp = the five leaves, animated one by one.
// On top of the painting: blinking eyelids, a jaw that opens with the voice (lib/voz.ts), breathing and a soft sway.
// Coordinates below are pixels of the original illustration (773 × 1327).

const W = 773, H = 1327;
const LEAVES_AT = { x: 89, y: 131, w: 168, h: 145 };
const LEAVES = [
  { x: 141, y: 131, w: 52, h: 43, d: 0 },
  { x: 219, y: 155, w: 38, h: 50, d: 0.7 },
  { x: 163, y: 174, w: 48, h: 28, d: 1.4 },
  { x: 89, y: 195, w: 33, h: 81, d: 2.1 },
  { x: 163, y: 216, w: 47, h: 41, d: 2.8 },
];
const MOUTH = { x: 372, y: 213.5, rot: -14 };
const EYES = [
  { x: 336, y: 169, rx: 15, ry: 8.5, rot: -14, skin: "#8a5126" },
  { x: 392, y: 154, rx: 16, ry: 8.5, rot: -14, skin: "#985728" },
];
const VIEW = {
  bust: "100 0 460 520", // headdress to waist, raised fist and leaves (for the dashboard card)
  full: `0 0 ${W} ${H}`,
};

export function Pachamama({ state = "idle", variant = "bust", fill = false, className = "" }: { state?: "idle" | "thinking" | "speaking"; variant?: "bust" | "full"; /** cover the whole box (crops the sides), anchored at the bottom */ fill?: boolean; className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const mouth = useRef<SVGEllipseElement>(null);
  const jaw = useRef<SVGImageElement>(null);
  const base = useRef(state);
  useEffect(() => {
    base.current = state;
  });

  // Mouth follows the voice every frame (no React re-render)
  useEffect(() => {
    let raf = 0, open = 0;
    const tick = (now: number) => {
      open += (voiceLevel(now) - open) * 0.35;
      const d = open * 8; // jaw drop in illustration pixels
      mouth.current?.setAttribute("ry", (d / 2).toFixed(2));
      mouth.current?.setAttribute("cy", (MOUTH.y + d / 2).toFixed(2));
      jaw.current?.setAttribute("transform", `translate(0 ${d.toFixed(2)})`);
      const st = isSpeaking() ? "speaking" : base.current;
      if (svg.current && svg.current.dataset.state !== st) svg.current.dataset.state = st;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const id = `pm-${variant}`;
  return (
    <svg ref={svg} viewBox={VIEW[variant]} preserveAspectRatio={fill ? "xMidYMax slice" : undefined} className={`pm ${className}`} data-state={state} role="img" aria-label="Pachamama, Growwy's guide">
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#d9a441" stopOpacity="0.5" />
          <stop offset="1" stopColor="#d9a441" stopOpacity="0" />
        </radialGradient>
        {/* lower lip + chin, fading out downwards, so only the jaw moves */}
        <linearGradient id={`${id}-fade`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.55" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}-jaw`} maskUnits="userSpaceOnUse">
          {/* starts exactly at the line between the lips, so only the lower lip and chin move */}
          <path d={`M${MOUTH.x - 22} ${MOUTH.y} L${MOUTH.x + 22} ${MOUTH.y} L${MOUTH.x + 22} ${MOUTH.y + 14} Q${MOUTH.x} ${MOUTH.y + 40} ${MOUTH.x - 22} ${MOUTH.y + 14} Z`}
            fill={`url(#${id}-fade)`} transform={`rotate(${MOUTH.rot} ${MOUTH.x} ${MOUTH.y})`} />
        </mask>
        {LEAVES.map((l, i) => (
          <clipPath key={i} id={`${id}-leaf${i}`}><rect x={l.x - 1} y={l.y - 1} width={l.w + 2} height={l.h + 2} /></clipPath>
        ))}
      </defs>

      <circle cx="350" cy={variant === "full" ? 420 : 260} r={variant === "full" ? 380 : 240} fill={`url(#${id}-glow)`} className="pm-glow" />

      <g className="pm-breathe">
        <image href="/brand/pachamama/body.webp" width={W} height={H} />

        {/* mouth: the jaw (lower lip + chin) slides down with the voice and a dark opening fills the gap */}
        <g mask={`url(#${id}-jaw)`}>
          <image ref={jaw} href="/brand/pachamama/body.webp" width={W} height={H} />
        </g>
        <ellipse ref={mouth} cx={MOUTH.x} cy={MOUTH.y} rx="13" ry="0" fill="#3a120a" transform={`rotate(${MOUTH.rot} ${MOUTH.x} ${MOUTH.y})`} />

        {/* eyelids (blink) */}
        {EYES.map((e) => (
          <g key={e.x} transform={`translate(${e.x} ${e.y}) rotate(${e.rot})`}>
            <g className="pm-lid">
              <ellipse cx="0" cy="0" rx={e.rx} ry={e.ry} fill={e.skin} />
              <path d={`M${-e.rx} 1 Q0 ${e.ry + 3} ${e.rx} 1`} stroke="#2a1208" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </g>
          </g>
        ))}
      </g>

      {/* the five leaves around the raised fist */}
      {LEAVES.map((l, i) => (
        <g key={i} className="pm-leaf" style={{ animationDelay: `${-l.d}s`, transformOrigin: `${l.x + l.w / 2}px ${l.y + l.h / 2}px` }}>
          <g clipPath={`url(#${id}-leaf${i})`}>
            <image href="/brand/pachamama/leaves.webp" x={LEAVES_AT.x} y={LEAVES_AT.y} width={LEAVES_AT.w} height={LEAVES_AT.h} />
          </g>
        </g>
      ))}
    </svg>
  );
}
