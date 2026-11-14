"use client";
import { useEffect, useRef, useState } from "react";
import { useDictado } from "@/hooks/useDictado";
import { useLeer } from "@/hooks/useLeer";
import { useLang } from "@/lib/i18n";
import type { AdvisorResult } from "@/lib/types";
import { Pachamama } from "./Pachamama";

const AUTO_KEY = "growwy-auto-voice";
const leerAuto = () => {
  try {
    return localStorage.getItem(AUTO_KEY) !== "0";
  } catch {
    return true;
  }
};

const pill = "rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium transition hover:border-ink disabled:opacity-50";

/**
 * Growwy, Growvia's SI, shown as the Pachamama whenever the SI is working or answering.
 * Her voice is generated as soon as the answer arrives and, with "Auto voice" on, she speaks it right away.
 * "Reply" lets the farmer answer her (typing or speaking); the conversation goes back to the SI with its history.
 */
export function Growwy({ busy, advice, question, isReply, onReply }: {
  busy: boolean;
  advice: AdvisorResult | null;
  /** what the farmer asked or replied last (shown above the answer) */
  question?: string | null;
  /** the answer is a follow-up: read only the answer, not the whole summary again */
  isReply?: boolean;
  onReply: (text: string) => void;
}) {
  const tts = useLeer();
  const ui = useLang();
  const [auto, setAuto] = useState(leerAuto);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const base = useRef("");
  const dict = useDictado((t) => setReply((base.current ? base.current + " " : "") + t), ui === "es" ? "es-AR" : "en-US");

  // parts read aloud (each one is translated on its own when the page is in Spanish)
  const parts = advice ? (isReply ? [advice.answer || advice.summary] : [advice.answer, advice.voice ?? advice.summary]).filter((x): x is string => !!x) : [];
  const text = parts.join(" ");

  // As soon as the answer is ready: generate the voice, and speak it when the farmer just asked (auto voice)
  const wasBusy = useRef(busy);
  useEffect(() => {
    const justAnswered = wasBusy.current && !busy;
    wasBusy.current = busy;
    if (!text || busy) return;
    if (justAnswered && auto) tts.leer(parts);
    else tts.preparar(parts);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when a new answer arrives
  }, [busy, text]);

  if (!busy && !advice) return null;
  const say = busy ? "Let me read your field: climate, soil, water and your register…" : advice!.answer || advice!.summary;

  function send() {
    const q = reply.trim();
    if (q.length < 2) return;
    dict.detener();
    tts.detener();
    setReply("");
    setReplying(false);
    onReply(q);
  }
  function toggleAuto() {
    const v = !auto;
    setAuto(v);
    try {
      localStorage.setItem(AUTO_KEY, v ? "1" : "0");
    } catch {
      /* private mode */
    }
  }

  return (
    <div key={busy ? "busy" : "answer"} className="pm-enter relative overflow-hidden rounded-2xl border border-line bg-surface-2">
      {/* fixed height; the avatar box has the bust's proportions on wide screens, so she fills it without empty space */}
      <div className="flex h-64 items-stretch gap-1">
        <div className="relative w-[48%] max-w-[230px] shrink-0 [mask-image:linear-gradient(to_right,#000_88%,transparent)]">
          <Pachamama state={busy ? "thinking" : "idle"} fill className="absolute inset-0 h-full w-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">Growwy · Pachamama</span>
            <button onClick={toggleAuto} aria-pressed={auto} title="Speak each answer automatically"
              className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${auto ? "bg-green-bg text-green-fg" : "bg-surface text-muted"}`}>
              {auto ? "Auto voice on" : "Auto voice off"}
            </button>
          </div>
          <div className="relative mt-1.5 min-h-0 overflow-y-auto overscroll-contain rounded-xl rounded-bl-sm border border-line bg-surface p-2.5 text-sm leading-relaxed text-ink [scrollbar-width:thin]" tabIndex={0} aria-label="Growwy's answer">
            {question && <p className="mb-1.5 border-b border-line pb-1.5 text-xs text-muted"><span className="font-medium text-ink-2">You:</span> {question}</p>}
            {busy ? (
              <span className="inline-flex items-center gap-1.5">{say}<span className="inline-flex gap-0.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="h-1 w-1 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}</span></span>
            ) : say}
          </div>
          {advice && !busy && (
            <div className="mt-2 flex shrink-0 flex-wrap gap-1.5">
              {tts.soportado && (tts.hablando ? (
                <>
                  <button className={pill} onClick={tts.pausar} disabled={tts.cargando}>{tts.cargando ? "Preparing voice…" : tts.pausado ? "▶ Resume" : "❚❚ Pause"}</button>
                  <button className={pill} onClick={tts.detener}>■ Stop</button>
                </>
              ) : (
                <button className="rounded-full bg-cta px-3 py-1 text-xs font-medium text-cta-ink" onClick={() => tts.leer(parts)}>▶ Listen to Growwy</button>
              ))}
              <button className={`${pill} ${replying ? "!border-ink" : ""}`} onClick={() => setReplying((r) => !r)} aria-expanded={replying}>↩ Reply</button>
            </div>
          )}
        </div>
      </div>

      {replying && advice && !busy && (
        <form className="flex items-end gap-2 border-t border-line bg-surface p-2.5" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea autoFocus rows={2} value={reply} onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Answer Growwy… e.g. And if I have less water in February?"
            className="min-h-10 flex-1 resize-none rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm text-ink placeholder:text-subtle focus:border-ink focus:outline-none" />
          {dict.soportado && (
            <button type="button" className={`${pill} ${dict.escuchando ? "animate-pulse !border-red-fg text-red-fg" : ""}`}
              onClick={() => { if (dict.escuchando) return dict.detener(); base.current = reply.trim(); dict.iniciar(); }}>
              {dict.escuchando ? "■ Stop" : "🎙 Speak"}
            </button>
          )}
          <button type="submit" className="rounded-full bg-cta px-3 py-1.5 text-xs font-medium text-cta-ink disabled:opacity-50" disabled={reply.trim().length < 2}>Send</button>
        </form>
      )}
    </div>
  );
}
