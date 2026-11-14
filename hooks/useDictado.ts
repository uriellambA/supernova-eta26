"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Tipos mínimos de la Web Speech API (no todos los navegadores la traen tipada)
type ResultadoVoz = { isFinal: boolean; 0: { transcript: string } };
type EventoVoz = { results: ArrayLike<ResultadoVoz> };
type Reconocedor = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: EventoVoz) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type CtorReconocedor = new () => Reconocedor;

const ctor = (): CtorReconocedor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: CtorReconocedor; webkitSpeechRecognition?: CtorReconocedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Dictado por voz en español rioplatense. onTexto recibe la transcripción completa de la sesión. */
export function useDictado(onTexto: (texto: string) => void, lang = "es-AR") {
  const [soportado, setSoportado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Reconocedor | null>(null);
  const cb = useRef(onTexto);
  useEffect(() => {
    cb.current = onTexto;
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detección de capacidad del navegador
    setSoportado(!!ctor());
    return () => rec.current?.stop();
  }, []);

  const iniciar = useCallback(() => {
    const C = ctor();
    if (!C) return;
    setError(null);
    const r = new C();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      cb.current(t);
    };
    r.onend = () => setEscuchando(false);
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Permití el micrófono para dictar" : e.error === "network" ? "El dictado necesita conexión" : "No se pudo escuchar");
      setEscuchando(false);
    };
    rec.current = r;
    r.start();
    setEscuchando(true);
  }, [lang]);

  const detener = useCallback(() => rec.current?.stop(), []);
  return { soportado, escuchando, error, iniciar, detener };
}
