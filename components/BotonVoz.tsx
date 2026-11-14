"use client";
import { useRef } from "react";
import { useDictado } from "@/hooks/useDictado";
import { useLeer } from "@/hooks/useLeer";
import { botonSecundario } from "./ui";

/** 🎙️ Dictado: agrega lo hablado al texto actual. */
export function BotonDictar({ valor, onCambio }: { valor: string; onCambio: (t: string) => void }) {
  const base = useRef("");
  const { soportado, escuchando, error, iniciar, detener } = useDictado((t) => onCambio((base.current ? base.current + " " : "") + t));
  if (!soportado) return <span className="text-xs text-slate-500">🎙️ El dictado no está disponible en este navegador (probá Chrome).</span>;
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={`${botonSecundario} ${escuchando ? "animate-pulse border-red-400 bg-red-50 text-red-800" : ""}`}
        onClick={() => {
          if (escuchando) return detener();
          base.current = valor.trim();
          iniciar();
        }}
        aria-pressed={escuchando}
      >
        {escuchando ? "⏹️ Terminar de dictar" : "🎙️ Dictar"}
      </button>
      {error && <span className="mt-1 text-xs text-red-700">{error}</span>}
    </span>
  );
}

/** 🔊 Lectura en voz alta. */
export function BotonEscuchar({ texto, etiqueta = "Escuchar" }: { texto: string; etiqueta?: string }) {
  const { soportado, hablando, pausado, leer, pausar, detener } = useLeer();
  if (!soportado) return null;
  if (!hablando)
    return (
      <button type="button" className={botonSecundario} onClick={() => leer(texto)}>
        🔊 {etiqueta}
      </button>
    );
  return (
    <span className="inline-flex gap-2">
      <button type="button" className={botonSecundario} onClick={pausar}>
        {pausado ? "▶️ Seguir" : "⏸️ Pausa"}
      </button>
      <button type="button" className={botonSecundario} onClick={detener}>
        ⏹️ Parar
      </button>
    </span>
  );
}
