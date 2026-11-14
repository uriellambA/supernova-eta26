"use client";
import { useLeer } from "@/hooks/useLeer";
import type { AdvisorResult } from "@/lib/types";
import { Pachamama } from "./Pachamama";

const first = (t: string, n = 170) => {
  const s = t.split(/(?<=[.!?])\s/)[0] ?? t;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

/** Growwy, Growvia's SI, shown as the Pachamama whenever the SI is working or answering. */
export function Growwy({ busy, advice }: { busy: boolean; advice: AdvisorResult | null }) {
  const tts = useLeer();
  if (!busy && !advice) return null;
  const text = advice ? [advice.answer, advice.voice ?? advice.summary].filter(Boolean).join(" ") : "";
  const say = busy ? "Let me read your field: climate, soil, water and your register…" : first(advice!.answer || advice!.summary);
  return (
    <div key={busy ? "busy" : "answer"} className="pm-enter relative overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div className="flex items-end gap-2">
        <Pachamama state={busy ? "thinking" : "idle"} className="-mb-1 h-44 w-auto shrink-0 sm:h-52" />
        <div className="min-w-0 flex-1 py-3 pr-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">Growwy · Pachamama</div>
          <div className="relative mt-1.5 rounded-xl rounded-bl-sm border border-line bg-surface p-2.5 text-sm text-ink">
            {busy ? (
              <span className="inline-flex items-center gap-1.5">{say}<span className="inline-flex gap-0.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="h-1 w-1 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}</span></span>
            ) : say}
          </div>
          {advice && tts.soportado && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tts.hablando ? (
                <>
                  <button className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium hover:border-ink" onClick={tts.pausar}>{tts.pausado ? "▶ Resume" : "❚❚ Pause"}</button>
                  <button className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium hover:border-ink" onClick={tts.detener}>■ Stop</button>
                </>
              ) : (
                <button className="rounded-full bg-cta px-3 py-1 text-xs font-medium text-cta-ink" onClick={() => tts.leer(text)}>▶ Listen to Growwy</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
