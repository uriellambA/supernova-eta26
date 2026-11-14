"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getLang, translate } from "@/lib/i18n";
import { pulse, setAnalyser, setPaused, setSpeaking } from "@/lib/voz";

/** Cleans text before reading it aloud (no brackets, emoji or markdown; units spelled out). */
export function limpiarParaVoz(t: string) {
  const es = getLang() === "es";
  return t
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[*_#>`]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/°C/g, es ? " grados" : " degrees")
    .replace(/(\d)\s?mm\b/g, es ? "$1 milímetros" : "$1 millimeters")
    .replace(/(\d)\s?ha\b/g, es ? "$1 hectáreas" : "$1 hectares")
    .replace(/(\d)\s?\/\s?100\b/g, es ? "$1 de 100" : "$1 out of 100")
    .replace(/→/g, es ? " a " : " to ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Best device voice: natural/online voices first (clearer and louder), then the right language. */
function elegirVoz(): SpeechSynthesisVoice | null {
  const es = getLang() === "es";
  const voces = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(es ? "es" : "en"));
  const region = es ? ["es-ar", "es-us", "es-419", "es-mx", "es-es"] : ["en-us", "en-gb", "en-au", "en-ca"];
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online|premium|enhanced|google/i.test(v.name) ? 10 : 0) +
    Math.max(0, 5 - region.indexOf(v.lang.replace("_", "-").toLowerCase())) * (region.includes(v.lang.replace("_", "-").toLowerCase()) ? 1 : 0) +
    (v.localService ? 0 : 1);
  return voces.sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Splits into sentences of ≤ ~200 characters (Chrome stops long utterances after ~15 s). */
function trozos(t: string) {
  const out: string[] = [];
  for (const s of t.split(/(?<=[.!?;:])\s+/)) {
    if (!s) continue;
    if (out.length && (out[out.length - 1] + " " + s).length < 200) out[out.length - 1] += " " + s;
    else out.push(s);
  }
  return out;
}

let serverTts: boolean | null = null; // null = not tried yet

// ---------------- shared state (every Listen button shows the same playback) ----------------
type Estado = { hablando: boolean; pausado: boolean; cargando: boolean };
const INICIAL: Estado = { hablando: false, pausado: false, cargando: false };
let estado = INICIAL;
const subs = new Set<() => void>();
const actualizar = (p: Partial<Estado>) => {
  estado = { ...estado, ...p };
  subs.forEach((f) => f());
};

/** Final text to read: rules-based answers are written in English, read them in Spanish when the page is in Spanish. */
const textoFinal = (original: string | string[]) =>
  limpiarParaVoz((Array.isArray(original) ? original : [original]).filter(Boolean).map((p) => (getLang() === "es" ? translate(p) ?? p : p)).join(" "));

/** Audio blocks: the first sentence alone (so the voice starts fast), then ~350-character groups. */
function bloques(t: string) {
  const frases = t.split(/(?<=[.!?;:])\s+/).filter(Boolean);
  if (!frases.length) return [];
  // first block: the first sentences up to ~80 characters (fast to generate, so she starts talking quickly)
  const out = [frases[0]];
  let i = 1;
  while (i < frases.length && out[0].length < 80) out[0] += " " + frases[i++];
  for (const f of frases.slice(i)) {
    if (out.length > 1 && (out[out.length - 1] + " " + f).length < 350) out[out.length - 1] += " " + f;
    else out.push(f);
  }
  return out;
}

// ---------------- pre-generated server audio ----------------
const cache = new Map<string, Promise<string | null>[]>(); // text → one promise per block (object URL, or null)

function pedirBloque(texto: string): Promise<string | null> {
  if (serverTts === false) return Promise.resolve(null);
  return fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: texto, lang: getLang() }) })
    .then(async (r) => {
      if (r.status === 501) serverTts = false;
      if (!r.ok) return null;
      serverTts = true;
      return URL.createObjectURL(await r.blob());
    })
    .catch(() => null);
}

function bloquesDe(original: string | string[]) {
  const t = textoFinal(original);
  const key = `${getLang()}|${t}`;
  let ps = cache.get(key);
  if (!ps) {
    const partes = bloques(t);
    const primero = pedirBloque(partes[0] ?? t);
    // the first block tells us whether the server voice exists; the rest are generated in parallel
    ps = [primero, ...partes.slice(1).map((p) => primero.then((u) => (u ? pedirBloque(p) : null)))];
    cache.set(key, ps);
    if (cache.size > 6) {
      const [viejo, bloquesViejos] = cache.entries().next().value!;
      cache.delete(viejo);
      bloquesViejos.forEach((b) => b.then((u) => u && URL.revokeObjectURL(u)));
    }
  }
  return { texto: t, bloques: ps };
}

/** Starts generating the server voice for a text in the background, so Listen plays at once. */
export function prepararVoz(original: string | string[]) {
  if (typeof window === "undefined" || serverTts === false || !String(original).trim()) return;
  bloquesDe(original);
}

// ---------------- one audio player for the whole app ----------------
const SILENCIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
let el: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let analizador: AnalyserNode | null = null;
let vozDesbloqueada = false;
let turno = 0; // each new reading cancels the previous one
let alTerminarBloque: ((ok: boolean) => void) | null = null;

/**
 * Must run inside a tap/click: browsers (above all on phones) only allow sound that starts from a user gesture.
 * Creates the player and plays a tiny silence so that later audio is allowed even after waiting for the server.
 */
export function desbloquearAudio() {
  if (typeof window === "undefined") return;
  try {
    if (!el) {
      el = new Audio();
      el.preload = "auto";
    }
    if (!ctx && "AudioContext" in window) {
      ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = 2.5; // louder than the device voice
      const comp = ctx.createDynamicsCompressor(); // keeps the boost from distorting
      comp.threshold.value = -12;
      comp.ratio.value = 6;
      analizador = ctx.createAnalyser(); // loudness for the avatar's mouth
      analizador.fftSize = 512;
      ctx.createMediaElementSource(el).connect(gain).connect(comp).connect(ctx.destination);
      comp.connect(analizador);
    }
    ctx?.resume().catch(() => {});
    if (!estado.hablando) {
      el.src = SILENCIO;
      el.play().catch(() => {});
    }
    if (!vozDesbloqueada && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
      vozDesbloqueada = true;
    }
  } catch {
    /* sound stays locked; the device voice may still work */
  }
}

function terminar(t: number) {
  if (t !== turno) return;
  setSpeaking(false);
  actualizar(INICIAL);
}

function reproducir(url: string, t: number) {
  return new Promise<boolean>((res) => {
    if (!el || t !== turno) return res(false);
    alTerminarBloque = res;
    el.onended = () => res(true);
    el.onerror = () => res(false);
    el.src = url;
    el.play().catch(() => res(false));
  });
}

function leerDispositivo(texto: string, t: number) {
  const s = window.speechSynthesis;
  s.cancel();
  setSpeaking(true);
  setAnalyser(null);
  const v = elegirVoz();
  const partes = trozos(texto);
  actualizar({ cargando: false });
  partes.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    if (v) u.voice = v;
    u.lang = v?.lang ?? (getLang() === "es" ? "es-AR" : "en-US");
    u.volume = 1; // maximum the browser allows
    u.rate = 0.95;
    u.onstart = pulse;
    u.onboundary = pulse; // moves the avatar's mouth on every word
    if (i === partes.length - 1) {
      u.onend = () => terminar(t);
      u.onerror = () => terminar(t);
    }
    s.speak(u);
  });
}

/** Reads a text aloud: pre-generated server voice when available (block by block), otherwise the device voice. */
export async function leerTexto(original: string | string[]) {
  detenerVoz();
  const t = ++turno;
  desbloquearAudio(); // still inside the tap that called us
  actualizar({ hablando: true, pausado: false, cargando: true });
  const { texto, bloques: ps } = bloquesDe(original);
  if (serverTts !== false && el && ctx) {
    let sonó = false;
    for (const p of ps) {
      const url = await p;
      if (t !== turno) return;
      if (!url) break;
      if (!sonó) {
        sonó = true;
        actualizar({ cargando: false });
        setSpeaking(true); // the mouth moves only once there is sound
        setAnalyser(analizador);
      }
      if (!(await reproducir(url, t))) break;
    }
    if (sonó) return terminar(t);
  }
  if (t !== turno) return;
  if ("speechSynthesis" in window) leerDispositivo(texto, t);
  else terminar(t);
}

export function pausarVoz() {
  if (!estado.hablando) return;
  const pausar = !estado.pausado;
  const servidor = el && el.src && !el.src.startsWith("data:") && !el.ended;
  if (servidor) {
    if (pausar) el!.pause();
    else el!.play().catch(() => {});
  }
  const s = window.speechSynthesis;
  if (s?.speaking) {
    if (pausar) s.pause();
    else s.resume();
  }
  setPaused(pausar);
  actualizar({ pausado: pausar });
}

export function detenerVoz() {
  turno++;
  window.speechSynthesis?.cancel();
  el?.pause();
  alTerminarBloque?.(false);
  alTerminarBloque = null;
  setSpeaking(false);
  actualizar(INICIAL);
}

const suscribir = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** Read-aloud controls. All instances share one player and one state. */
export function useLeer() {
  const [soportado, setSoportado] = useState(false);
  const e = useSyncExternalStore(suscribir, () => estado, () => INICIAL);
  useEffect(() => {
    if (!("speechSynthesis" in window) && !("AudioContext" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability check
    setSoportado(true);
    window.speechSynthesis?.getVoices(); // preload (Chrome)
  }, []);
  return { soportado, ...e, leer: leerTexto, pausar: pausarVoz, detener: detenerVoz, preparar: prepararVoz };
}
