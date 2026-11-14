"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

/**
 * Reads text aloud. Uses the server voice when configured (louder: boosted ×2.5 with a compressor),
 * otherwise the device voice at maximum volume.
 */
export function useLeer() {
  const [soportado, setSoportado] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const audio = useRef<{ el: HTMLAudioElement; ctx: AudioContext; url: string } | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window) && !("AudioContext" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability check
    setSoportado(true);
    window.speechSynthesis?.getVoices(); // preload (Chrome)
    return () => {
      window.speechSynthesis?.cancel();
      audio.current?.el.pause();
    };
  }, []);

  const terminar = useCallback(() => {
    setSpeaking(false);
    setHablando(false);
    setPausado(false);
    if (audio.current) {
      URL.revokeObjectURL(audio.current.url);
      audio.current.ctx.close().catch(() => {});
      audio.current = null;
    }
  }, []);

  const leerDispositivo = useCallback((texto: string) => {
    const s = window.speechSynthesis;
    s.cancel();
    const v = elegirVoz();
    const partes = trozos(limpiarParaVoz(texto));
    partes.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      if (v) u.voice = v;
      u.lang = v?.lang ?? (getLang() === "es" ? "es-AR" : "en-US");
      u.volume = 1; // maximum the browser allows
      u.rate = 0.95;
      u.onstart = pulse;
      u.onboundary = pulse; // moves the avatar's mouth on every word
      if (i === partes.length - 1) {
        u.onend = terminar;
        u.onerror = terminar;
      }
      s.speak(u);
    });
  }, [terminar]);

  const leer = useCallback(async (original: string) => {
    // rules-based answers are written in English: read them in Spanish when the page is in Spanish
    const texto = getLang() === "es" ? translate(original) ?? original : original;
    window.speechSynthesis?.cancel();
    audio.current?.el.pause();
    setHablando(true);
    setPausado(false);
    setSpeaking(true);
    if (serverTts !== false && "AudioContext" in window) {
      try {
        const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: limpiarParaVoz(texto), lang: getLang() }) });
        if (r.status === 501) serverTts = false;
        if (!r.ok) throw new Error("tts");
        serverTts = true;
        const url = URL.createObjectURL(await r.blob());
        const el = new Audio(url);
        const ctx = new AudioContext();
        const gain = ctx.createGain();
        gain.gain.value = 2.5; // louder than the device voice
        const comp = ctx.createDynamicsCompressor(); // keeps the boost from distorting
        comp.threshold.value = -12;
        comp.ratio.value = 6;
        ctx.createMediaElementSource(el).connect(gain).connect(comp).connect(ctx.destination);
        const an = ctx.createAnalyser(); // loudness for the avatar's mouth
        an.fftSize = 512;
        comp.connect(an);
        setAnalyser(an);
        el.onended = terminar;
        el.onerror = terminar;
        audio.current = { el, ctx, url };
        await el.play();
        return;
      } catch {
        /* fall back to the device voice */
      }
    }
    if ("speechSynthesis" in window) leerDispositivo(texto);
    else terminar();
  }, [leerDispositivo, terminar]);

  const pausar = useCallback(() => {
    const a = audio.current;
    if (a) {
      if (a.el.paused) { a.el.play(); setPausado(false); setPaused(false); } else { a.el.pause(); setPausado(true); setPaused(true); }
      return;
    }
    const s = window.speechSynthesis;
    if (s.paused) { s.resume(); setPausado(false); setPaused(false); } else { s.pause(); setPausado(true); setPaused(true); }
  }, []);

  const detener = useCallback(() => {
    window.speechSynthesis?.cancel();
    audio.current?.el.pause();
    terminar();
  }, [terminar]);

  return { soportado, hablando, pausado, leer, pausar, detener };
}
