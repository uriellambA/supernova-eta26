"use client";
import { useSyncExternalStore } from "react";
import { ES, ES_WORDS } from "./i18n-es";

export type Lang = "en" | "es";
const KEY = "growvia-lang";

// ---------- Language store (shared by every component, persisted on the device) ----------
const listeners = new Set<() => void>();
let current: Lang | null = null;
export function getLang(): Lang {
  if (current) return current;
  if (typeof window === "undefined") return "en";
  try {
    current = (localStorage.getItem(KEY) as Lang | null) ?? (navigator.language?.toLowerCase().startsWith("es") ? "es" : "en");
  } catch {
    current = "en";
  }
  return current;
}
export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* private mode */
  }
  listeners.forEach((f) => f());
}
export function useLang(): Lang {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    getLang,
    () => "en",
  );
}

// ---------- Dictionary engine ----------
const NUM = "([−-]?\\d[\\d.,]*)";
const AFFIX = /^([^\p{L}\p{N}"¿¡({]*\(?)([\s\S]*?)([\s.:;!?…→()]*)$/u;
const strip = (s: string) => {
  const m = s.match(AFFIX);
  return m ? m[2] : s;
};

type Pattern = { re: RegExp; slots: ("n" | "x")[]; out: string };
const exact = new Map<string, string>();
const patterns: Pattern[] = [];
for (const [k0, v0] of Object.entries(ES)) {
  const k = strip(k0), v = strip(v0);
  if (!/\{[nx]\}/.test(k)) {
    exact.set(k, v);
    continue;
  }
  const slots: ("n" | "x")[] = [];
  const src = k
    .split(/(\{[nx]\})/)
    .map((part) => {
      if (part === "{n}") { slots.push("n"); return NUM; }
      if (part === "{x}") { slots.push("x"); return "(.+?)"; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  patterns.push({ re: new RegExp(`^${src}$`, "u"), slots, out: v });
}
for (const [k, v] of Object.entries(ES_WORDS)) if (!exact.has(k)) exact.set(k, v);
// Most specific patterns first (more literal text = fewer wildcards)
patterns.sort((a, b) => b.re.source.replace(/\(\.\+\?\)|\(\[−-\]\?\\d\[\\d\.,\]\*\)/g, "").length - a.re.source.replace(/\(\.\+\?\)|\(\[−-\]\?\\d\[\\d\.,\]\*\)/g, "").length);

const WORD_RE = new RegExp(`\\b(${Object.keys(ES_WORDS).sort((a, b) => b.length - a.length).join("|")})\\b`, "g");
const KEEP = /^(Growvia|NDVI|EVI|UV|pH|CEC|USD|INTA|Los Antiguos|El Niño|La Niña|[A-Z][a-z]+ [a-z]+)$/;
const cache = new Map<string, string | null>();

function core(s: string, depth: number): string | null {
  if (!s || !/\p{L}{2,}/u.test(s)) return s;
  const hit = exact.get(s);
  if (hit !== undefined) return hit;
  for (const p of patterns) {
    const m = s.match(p.re);
    if (!m) continue;
    const vals = m.slice(1).map((g, i) => (p.slots[i] === "x" ? (depth < 3 ? translate(g, depth + 1) ?? g : g) : g));
    let n = 0, x = 0;
    const ns = vals.filter((_, j) => p.slots[j] === "n"), xs = vals.filter((_, j) => p.slots[j] === "x");
    return p.out.replace(/\{([nx])\}/g, (_, t) => (t === "n" ? ns[n++] ?? "" : xs[x++] ?? ""));
  }
  // Lists: "Cherry, Strawberry" · "A → B" · "A + B" · "A · B" · "A / B"
  for (const sep of [". ", " · ", " → ", ", ", " + ", " / ", "/"]) {
    if (!s.includes(sep)) continue;
    const parts = s.split(sep);
    const tr = parts.map((p) => (depth < 3 ? translate(p, depth + 1) : null));
    if (tr.every((t, j) => t !== null || !/\p{L}{2,}/u.test(parts[j]) || KEEP.test(parts[j].trim()))) return tr.map((t, j) => t ?? parts[j]).join(sep);
  }
  const w = s.replace(WORD_RE, (k) => ES_WORDS[k]);
  return w !== s ? w : null;
}

/** Translates one UI string to Spanish; returns null when there is no translation. */
export function translate(text: string, depth = 0): string | null {
  if (cache.has(text)) return cache.get(text)!;
  const m = text.match(AFFIX);
  let out: string | null = null;
  if (m) {
    const c = core(m[2], depth);
    if (c !== null && c !== m[2]) out = m[1] + c + m[3];
  }
  if (depth === 0) cache.set(text, out);
  return out;
}
