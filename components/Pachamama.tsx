"use client";
import { useEffect, useRef } from "react";
import { isSpeaking, voiceLevel } from "@/lib/voz";

// Pachamama: the face of Growwy, Growvia's SI. Drawn from the team's pencil sketch: Andean sun headdress,
// patterned headband, painted line across the face, gold hoops, high-collar tunic, woven sash,
// a vine of leaves across the skirt, one fist raised with leaves flying around it.
// Animated: breathing, blinking, hair in the wind, floating leaves; the mouth follows the voice (lib/voz.ts).

const C = {
  skin: "#b97a52", skinShade: "#9a5f3d", hair: "#24160f", hairHi: "#3d2a1f",
  gold: "#d9a441", goldDark: "#a8741f", rust: "#b5452a", red: "#a32f24", cream: "#efe0bf", creamShade: "#d9c49a",
  leaf: "#5f8a3a", leafDark: "#3c5d24", skirt: "#4f6f35", skirtShade: "#3e5a29", lip: "#8e3b2e", mouth: "#3f1510",
};

const HX = 130, HY = 104; // headdress centre
const polar = (r: number, deg: number) => [HX + r * Math.cos((deg * Math.PI) / 180), HY + r * Math.sin((deg * Math.PI) / 180)] as const;
const TEETH = Array.from({ length: 15 }, (_, i) => 186 + i * 12);
const SPIRALS = Array.from({ length: 9 }, (_, i) => 192 + i * 19.5);
const RAYS = Array.from({ length: 13 }, (_, i) => 186 + i * 14);
const VINE_LEAVES = [0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92];
const FLYING = [
  { x: 26, y: 112, r: -30, d: 0 }, { x: 50, y: 96, r: 20, d: 0.6 }, { x: 18, y: 134, r: 60, d: 1.2 },
  { x: 62, y: 118, r: -70, d: 1.8 }, { x: 36, y: 84, r: 10, d: 2.4 },
];

function Leaf({ fill = C.leaf, vein = C.leafDark }: { fill?: string; vein?: string }) {
  return (
    <>
      <path d="M0 -7 C5 -3 5 3 0 7 C-5 3 -5 -3 0 -7 Z" fill={fill} />
      <path d="M0 -6 L0 6" stroke={vein} strokeWidth={0.8} />
    </>
  );
}

// point on the vine curve (cubic bezier) for leaf placement
const VINE = [[164, 250], [140, 272], [118, 288], [86, 330]] as const;
function onVine(t: number) {
  const [p0, p1, p2, p3] = VINE;
  const u = 1 - t;
  const x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0];
  const y = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1];
  return [x, y];
}

export function Pachamama({ state = "idle", className = "" }: { state?: "idle" | "thinking" | "speaking"; className?: string }) {
  const mouth = useRef<SVGEllipseElement>(null);
  const lower = useRef<SVGPathElement>(null);
  const head = useRef<SVGGElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const base = useRef(state);
  useEffect(() => {
    base.current = state;
  });

  // Mouth follows the voice every frame (no React re-render)
  useEffect(() => {
    let raf = 0, open = 0;
    const tick = (now: number) => {
      open += (voiceLevel(now) - open) * 0.35;
      mouth.current?.setAttribute("ry", (0.4 + open * 4.6).toFixed(2));
      mouth.current?.setAttribute("cy", (138.6 + open * 1.6).toFixed(2));
      lower.current?.setAttribute("transform", `translate(0 ${(open * 3.6).toFixed(2)})`);
      const st = isSpeaking() ? "speaking" : base.current;
      if (svg.current && svg.current.dataset.state !== st) svg.current.dataset.state = st;
      head.current?.setAttribute("transform", `rotate(${(Math.sin(now / 420) * open * 2.2).toFixed(2)} 130 150)`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg ref={svg} viewBox="0 0 260 330" className={`pm ${className}`} data-state={state} role="img" aria-label="Pachamama, Growwy's guide">
      <defs>
        <radialGradient id="pm-glow" cx="50%" cy="38%" r="55%">
          <stop offset="0" stopColor={C.gold} stopOpacity="0.45" />
          <stop offset="1" stopColor={C.gold} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pm-tunic" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={C.cream} />
          <stop offset="1" stopColor={C.creamShade} />
        </linearGradient>
        <linearGradient id="pm-skirt" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={C.skirtShade} />
          <stop offset="0.5" stopColor={C.skirt} />
          <stop offset="1" stopColor={C.skirtShade} />
        </linearGradient>
      </defs>

      <circle cx="130" cy="130" r="128" fill="url(#pm-glow)" className="pm-glow" />

      <g className="pm-breathe">
        {/* ---------- headdress (sun) ---------- */}
        <g className="pm-crown">
          <path d={`M${HX - 70} ${HY} A70 70 0 0 1 ${HX + 70} ${HY} Z`} fill={C.gold} stroke={C.goldDark} strokeWidth="1.5" />
          {TEETH.map((a) => {
            const [x, y] = polar(64, a);
            return <rect key={a} x={x - 3} y={y - 3} width="6" height="6" fill={C.red} transform={`rotate(${a + 45} ${x} ${y})`} />;
          })}
          <path d={`M${HX - 58} ${HY} A58 58 0 0 1 ${HX + 58} ${HY} Z`} fill={C.rust} stroke={C.goldDark} strokeWidth="1" />
          {SPIRALS.map((a) => {
            const [x, y] = polar(52, a);
            return (
              <g key={a}>
                <circle cx={x} cy={y} r="4" fill="none" stroke={C.gold} strokeWidth="1.3" />
                <circle cx={x} cy={y} r="1.4" fill={C.gold} />
              </g>
            );
          })}
          <path d={`M${HX - 45} ${HY} A45 45 0 0 1 ${HX + 45} ${HY} Z`} fill={C.gold} />
          {RAYS.map((a) => {
            const [x1, y1] = polar(36, a), [x2, y2] = polar(44, a);
            return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.goldDark} strokeWidth="1.4" />;
          })}
        </g>

        {/* ---------- hair (back) ---------- */}
        <g className="pm-hair">
          <path d="M104 96 C86 122 84 176 70 266 C88 262 104 252 114 236 L114 140 Z" fill={C.hair} />
          <path d="M156 96 C174 122 176 176 190 266 C172 262 156 252 146 236 L146 140 Z" fill={C.hair} />
          <path className="pm-strand" d="M104 112 C88 120 72 126 48 120 C62 132 80 138 102 134 Z" fill={C.hair} />
          <path className="pm-strand pm-strand2" d="M102 124 C86 136 74 146 56 146 C70 154 86 152 102 144 Z" fill={C.hairHi} />
        </g>

        {/* ---------- body ---------- */}
        <path d="M94 256 L166 256 C178 280 190 305 200 330 L60 330 C70 305 82 280 94 256 Z" fill="url(#pm-skirt)" />
        <path d="M110 262 C104 290 98 310 94 330 M150 262 C156 290 162 310 168 330 M130 262 L130 330" stroke={C.skirtShade} strokeWidth="1.5" fill="none" opacity="0.7" />
        <path d="M112 166 C96 168 80 172 72 184 L72 214 C82 234 92 244 100 248 L160 248 C168 244 178 234 188 214 L188 184 C180 172 164 168 148 166 Z" fill="url(#pm-tunic)" />
        <path d="M130 172 L130 236" stroke={C.creamShade} strokeWidth="1.5" />
        <path d="M100 212 Q130 224 160 212" stroke={C.creamShade} strokeWidth="1.5" fill="none" />

        {/* sash with woven diamonds */}
        <path d="M96 234 L164 234 L168 258 L92 258 Z" fill={C.red} />
        <path d="M95 238 L165 238 M93 254 L167 254" stroke={C.gold} strokeWidth="1.4" />
        {Array.from({ length: 8 }, (_, i) => 101 + i * 8.3).map((x) => <path key={x} d={`M${x} 246 l3.5 -4 l3.5 4 l-3.5 4 Z`} fill={C.cream} />)}

        {/* vine of leaves across the skirt */}
        <path d={`M${VINE[0].join(" ")} C${VINE[1].join(" ")} ${VINE[2].join(" ")} ${VINE[3].join(" ")}`} stroke={C.leafDark} strokeWidth="2" fill="none" />
        {VINE_LEAVES.map((t, i) => {
          const [x, y] = onVine(t);
          return <g key={t} transform={`translate(${x} ${y}) rotate(${i % 2 ? 50 : -40}) translate(0 -6) scale(0.8)`}><Leaf /></g>;
        })}

        {/* left arm (raised fist) */}
        <path d="M46 222 C40 200 37 182 38 164 L53 164 C53 182 56 200 63 218 Z" fill={C.skin} />
        <path d="M80 178 C66 182 54 196 46 214 L62 228 C70 212 78 202 90 196 Z" fill="url(#pm-tunic)" />
        <path d="M46 214 L62 228" stroke={C.red} strokeWidth="3" />
        <rect x="36" y="162" width="19" height="4" rx="2" fill={C.gold} />
        <g className="pm-fist">
          <rect x="33" y="139" width="25" height="25" rx="9" fill={C.skin} />
          <path d="M37 146 h17 M37 152 h17 M37 158 h15" stroke={C.skinShade} strokeWidth="1" />
        </g>

        {/* right arm (hand on hip) */}
        <path d="M196 220 L210 226 C200 240 190 250 180 256 L172 246 C182 240 190 232 196 220 Z" fill={C.skin} />
        <path d="M180 178 C194 184 204 198 210 216 L194 226 C188 210 182 202 170 196 Z" fill="url(#pm-tunic)" />
        <path d="M210 216 L194 226" stroke={C.red} strokeWidth="3" />
        <ellipse cx="174" cy="251" rx="8" ry="6" fill={C.skin} />

        {/* neck and high collar */}
        <rect x="119" y="144" width="22" height="24" fill={C.skinShade} />
        <path d="M113 160 Q130 168 147 160 L149 172 Q130 180 111 172 Z" fill={C.cream} />
        <path d="M112 166 Q130 174 148 166" stroke={C.red} strokeWidth="2" fill="none" />
        {[118, 124, 130, 136, 142].map((x) => <circle key={x} cx={x} cy={170 + (x === 130 ? 1.5 : Math.abs(130 - x) < 10 ? 1 : 0)} r="1.6" fill={C.gold} />)}

        {/* ---------- head ---------- */}
        <g ref={head}>
          <path d="M103 112 C103 88 116 80 130 80 C144 80 157 88 157 112 C157 132 148 148 130 152 C112 148 103 132 103 112 Z" fill={C.skin} />
          <ellipse cx="112" cy="129" rx="6" ry="3.5" fill="#d4785a" opacity="0.35" />
          <ellipse cx="148" cy="129" rx="6" ry="3.5" fill="#d4785a" opacity="0.35" />

          {/* painted line across the face */}
          <path d="M104 123 Q130 127 156 123" stroke={C.cream} strokeWidth="2.4" fill="none" />
          <path d="M104 123 Q130 127 156 123" stroke={C.red} strokeWidth="1" strokeDasharray="2 3" fill="none" />

          {/* eyes */}
          <path d="M109 106 Q118 101 127 105" stroke={C.hair} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M133 105 Q142 101 151 106" stroke={C.hair} strokeWidth="2" fill="none" strokeLinecap="round" />
          <g className="pm-eyes">
            {[118, 142].map((x) => (
              <g key={x}>
                <path d={`M${x - 8} 115 Q${x} 109 ${x + 8} 115 Q${x} 120 ${x - 8} 115 Z`} fill="#fbf4ea" />
                <g className="pm-iris">
                  <circle cx={x} cy="115" r="3.4" fill="#3b2216" />
                  <circle cx={x + 1.1} cy="113.9" r="1" fill="#fff" />
                </g>
                <path d={`M${x - 8.5} 115 Q${x} 108 ${x + 8.5} 114.5`} stroke={C.hair} strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </g>
            ))}
          </g>
          <path d="M131 119 Q128.5 126 130.5 129.5" stroke={C.skinShade} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M127 130 Q130 131.6 133 130" stroke={C.skinShade} strokeWidth="1.1" fill="none" strokeLinecap="round" />

          {/* mouth: opens with the voice */}
          <ellipse ref={mouth} cx="130" cy="138.6" rx="5.6" ry="0.4" fill={C.mouth} />
          <path d="M121.5 137.5 Q126 135.2 130 136.6 Q134 135.2 138.5 137.5 Q130 138.8 121.5 137.5 Z" fill={C.lip} />
          <path ref={lower} d="M122.5 138.6 Q130 143.2 137.5 138.6 Q130 140.2 122.5 138.6 Z" fill={C.lip} />

          {/* hair (front) */}
          <path d="M101 110 C99 86 113 74 130 74 C147 74 161 86 159 110 C152 96 142 90 130 90 C118 90 108 96 101 110 Z" fill={C.hair} />
          <path className="pm-front" d="M104 98 C95 116 97 160 99 206 C102 218 106 226 110 234 C112 200 111 160 109 120 Z" fill={C.hair} />
          <path className="pm-front pm-front2" d="M156 98 C165 116 163 160 161 206 C158 218 154 226 150 234 C148 200 149 160 151 120 Z" fill={C.hair} />

          {/* headband */}
          <path d="M103 97 Q130 88 157 97 L157 104 Q130 95 103 104 Z" fill={C.red} />
          {[110, 120, 130, 140, 150].map((x) => <circle key={x} cx={x} cy={x === 130 ? 96.4 : x === 120 || x === 140 ? 97.2 : 99} r="1.5" fill={C.gold} />)}

          {/* gold hoops */}
          <circle cx="101" cy="134" r="5" fill="none" stroke={C.gold} strokeWidth="2" />
          <circle cx="159" cy="134" r="5" fill="none" stroke={C.gold} strokeWidth="2" />
        </g>
      </g>

      {/* leaves flying around the raised fist */}
      {FLYING.map((l) => (
        <g key={l.d} transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}>
          <g className="pm-leaf" style={{ animationDelay: `${l.d}s` }}><Leaf fill={l.d % 1.2 ? "#7aa64a" : C.leaf} /></g>
        </g>
      ))}
    </svg>
  );
}
