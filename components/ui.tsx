"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Nivel } from "@/lib/types";
import { btnGhost } from "./styles";

// ---------- Scroll-entry animation ----------
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ---------- Cards ----------
/** Feature card: 1px warm border, 24px padding, no shadows. */
export function Card({ title, eyebrow, right, children, className = "", delay = 0, pad = true }: { title?: ReactNode; eyebrow?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; delay?: number; pad?: boolean }) {
  return (
    <Reveal delay={delay} className={`rounded-2xl border border-line bg-surface ${pad ? "p-6" : ""} ${className}`}>
      {(title || eyebrow || right) && (
        <div className={`mb-4 flex flex-wrap items-start gap-2 ${pad ? "" : "px-6 pt-6"}`}>
          <div className="min-w-0">
            {eyebrow && <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">{eyebrow}</div>}
            {title && <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>}
          </div>
          {right && <div className="ml-auto">{right}</div>}
        </div>
      )}
      {children}
    </Reveal>
  );
}

export function Stat({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3" title={hint}>
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-ink">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-subtle">{hint}</div>}
    </div>
  );
}

// ---------- Badges ----------
export type Tone = "blue" | "green" | "amber" | "red" | "neutral";
const TONE: Record<Tone, string> = {
  blue: "bg-blue-bg text-blue-fg",
  green: "bg-green-bg text-green-fg",
  amber: "bg-amber-bg text-amber-fg",
  red: "bg-red-bg text-red-fg",
  neutral: "bg-surface-2 text-ink-2",
};
export function Badge({ tone = "neutral", children, dot = false, title }: { tone?: Tone; children: ReactNode; dot?: boolean; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
export const LEVEL_TONE: Record<Nivel, Tone> = { good: "green", watch: "amber", alert: "red" };
const LEVEL_WORD: Record<Nivel, string> = { good: "Good", watch: "Watch", alert: "Alert" };
export function LevelPill({ level, children }: { level: Nivel; children?: ReactNode }) {
  return <Badge tone={LEVEL_TONE[level]} dot>{children ?? LEVEL_WORD[level]}</Badge>;
}
export const LEVEL_BAR: Record<Nivel, string> = { good: "bg-green-fg", watch: "bg-amber-fg", alert: "bg-red-fg" };

export function Note({ kind = "info", children }: { kind?: "info" | "warn"; children: ReactNode }) {
  const s = kind === "warn" ? "bg-amber-bg text-amber-fg" : "bg-blue-bg text-blue-fg";
  return <div className={`rounded-xl px-3 py-2 text-sm ${s}`}>{children}</div>;
}

export function Spinner({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-5 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
      {text}
    </div>
  );
}

export function DemoBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return <Badge tone="amber" title="Running with sample data (offline development mode)">Sample data</Badge>;
}

export function Meter({ value, level, className = "" }: { value: number; level?: Nivel; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${className}`}>
      <div className={`h-full rounded-full ${level ? LEVEL_BAR[level] : "bg-ink"}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

// ---------- Theme ----------
export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- theme only known in the browser
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? "light"), []);
  const toggle = () => {
    const t = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("growvia-theme", t);
    } catch {
      /* private mode */
    }
    setTheme(t);
  };
  return (
    <button className={`${btnGhost} !px-2.5`} onClick={toggle} aria-label="Toggle dark mode" title="Toggle dark mode">
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}

// ---------- Keyboard shortcuts ----------
export function useHotkeys(map: Record<string, () => void>) {
  const ref = useRef(map);
  useEffect(() => {
    ref.current = map;
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || !t || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      const fn = ref.current[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
}

export { btnGhost, btnPrimary, input, label } from "./styles";
