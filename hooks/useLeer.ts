"use client";
import { useCallback, useEffect, useState } from "react";

/** Limpia el texto para leerlo en voz alta (sin fuentes entre corchetes, emojis ni markdown). */
export function limpiarParaVoz(t: string) {
  return t
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[*_#>`]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/°C/g, " degrees")
    .replace(/\s+/g, " ")
    .trim();
}

function elegirVoz(): SpeechSynthesisVoice | null {
  const voces = window.speechSynthesis.getVoices();
  const pref = ["en-US", "en-GB", "en-AU", "en-CA"];
  for (const p of pref) {
    const v = voces.find((x) => x.lang.replace("_", "-").toLowerCase() === p.toLowerCase());
    if (v) return v;
  }
  return voces.find((x) => x.lang.toLowerCase().startsWith("en")) ?? null;
}

/** Lectura en voz alta con las voces del dispositivo (funciona sin conexión). */
export function useLeer() {
  const [soportado, setSoportado] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detección de capacidad del navegador
    setSoportado(true);
    window.speechSynthesis.getVoices(); // precarga en Chrome
    return () => window.speechSynthesis.cancel();
  }, []);

  const leer = useCallback((texto: string) => {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(limpiarParaVoz(texto));
    const v = elegirVoz();
    if (v) u.voice = v;
    u.lang = v?.lang ?? "en-US";
    u.rate = 0.95;
    u.onend = () => {
      setHablando(false);
      setPausado(false);
    };
    u.onerror = u.onend;
    setHablando(true);
    setPausado(false);
    s.speak(u);
  }, []);

  const pausar = useCallback(() => {
    const s = window.speechSynthesis;
    if (s.paused) {
      s.resume();
      setPausado(false);
    } else {
      s.pause();
      setPausado(true);
    }
  }, []);

  const detener = useCallback(() => {
    window.speechSynthesis.cancel();
    setHablando(false);
    setPausado(false);
  }, []);

  return { soportado, hablando, pausado, leer, pausar, detener };
}
