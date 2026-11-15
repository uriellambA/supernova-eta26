"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDictado } from "@/hooks/useDictado";
import { useLeer } from "@/hooks/useLeer";
import type { Hazard } from "@/lib/contingency";
import { useLang } from "@/lib/i18n";
import { buildPlan, savePlan, usd } from "@/lib/plan";
import type { SpeciesFit } from "@/lib/suitability";
import type { AdvisorResult, FarmProfile, FarmRegister, IndicadoresNasa, Salinity, SiteConfig, SoilResumen, StrategyResult } from "@/lib/types";
import { Visual } from "./growwy/Visuals";
import { Pachamama } from "./Pachamama";

export type GrowwyTurn = { q: string; advice: AdvisorResult };
export type GrowwyData = {
  results: StrategyResult[];
  fits: SpeciesFit[];
  climate: IndicadoresNasa | null;
  soil: SoilResumen | null;
  sal: Salinity | null;
  risks: Hazard[];
  register: FarmRegister | null;
  site: SiteConfig;
  place: string;
  farm: FarmProfile;
};

const AUTO_KEY = "growwy-auto-voice";
const leerAuto = () => {
  try {
    return localStorage.getItem(AUTO_KEY) !== "0";
  } catch {
    return true;
  }
};

const pill = "rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium transition hover:border-ink disabled:opacity-50";
const Dots = () => <span className="inline-flex gap-0.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="h-1 w-1 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>;
const THINKING = "Let me read your field: climate, soil, water and your farm data…";

/**
 * Growwy, Growvia's SI, shown as the Pachamama whenever the SI is working or answering.
 * - Her voice is generated as soon as the answer arrives; with "Auto voice" on she speaks right away.
 * - Answers come with charts and tables (chosen by the SI, or by keywords without it).
 * - "Reply" continues the conversation; "Full screen" shows the whole conversation with a big Pachamama.
 * - "Build my plan" turns the conversation into a printable action plan (PDF) with layout, materials and prices.
 */
export function Growwy({ busy, advice, turns, pending, isReply, onReply, data, openFull = false }: {
  /** open in full screen (the farmer came from a quick question on the landing) */
  openFull?: boolean;
  busy: boolean;
  advice: AdvisorResult | null;
  turns: GrowwyTurn[];
  /** the question being answered right now (while busy) */
  pending: string | null;
  /** the answer is a follow-up: read only the answer, not the whole summary again */
  isReply?: boolean;
  onReply: (text: string) => void;
  data: GrowwyData;
}) {
  const tts = useLeer();
  const [auto, setAuto] = useState(leerAuto);
  const [replying, setReplying] = useState(false);
  const [full, setFull] = useState(openFull);
  const [prevOpen, setPrevOpen] = useState(openFull);
  if (openFull !== prevOpen) {
    setPrevOpen(openFull);
    if (openFull) setFull(true);
  }

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

  const conversation = useMemo(() => turns.filter((t) => t.q).map((t) => ({ q: t.q, a: t.advice.answer || t.advice.summary })), [turns]);
  const plan = useMemo(() => (advice && data.results.length ? buildPlan({ ...data, advice, conversation }) : null), [advice, data, conversation]);

  if (!busy && !advice) return null;
  const last = turns[turns.length - 1];
  const say = busy ? THINKING : advice!.answer || advice!.summary;
  const convinced = conversation.length >= 2; // after a real back-and-forth, invite to close with the plan

  function makePlan() {
    if (!plan) return;
    savePlan(plan);
    window.open("/plan?print=1", "_blank", "noopener");
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
  const send = (q: string) => {
    tts.detener();
    setReplying(false);
    onReply(q);
  };
  const vdata = { results: data.results, fits: data.fits, climate: data.climate, plan, advice };

  const voiceButtons = advice && !busy && tts.soportado && (tts.hablando ? (
    <>
      <button className={pill} onClick={tts.pausar} disabled={tts.cargando}>{tts.cargando ? "Preparing voice…" : tts.pausado ? "▶ Resume" : "❚❚ Pause"}</button>
      <button className={pill} onClick={tts.detener}>■ Stop</button>
    </>
  ) : (
    <button className="rounded-full bg-cta px-3 py-1 text-xs font-medium text-cta-ink" onClick={() => tts.leer(parts)}>▶ Listen to Growwy</button>
  ));
  const autoBtn = (
    <button onClick={toggleAuto} aria-pressed={auto} title="Speak each answer automatically"
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${auto ? "bg-green-bg text-green-fg" : "bg-surface text-muted"}`}>
      {auto ? "Auto voice on" : "Auto voice off"}
    </button>
  );
  const planBtn = (big = false) => (
    <button onClick={makePlan} disabled={!plan || busy}
      className={big ? "w-full rounded-xl bg-green-fg px-4 py-2.5 text-sm font-semibold text-canvas transition hover:opacity-90 disabled:opacity-50" : `${pill} ${convinced ? "!border-green-fg !bg-green-bg text-green-fg" : ""}`}>
      ⤓ Build my plan (PDF)
    </button>
  );

  return (
    <>
      <div key={busy ? "busy" : "answer"} className="pm-enter relative overflow-hidden rounded-2xl border border-line bg-surface-2">
        {/* fixed height; the avatar box has the bust's proportions on wide screens, so she fills it without empty space */}
        <div className="flex h-72 items-stretch gap-1">
          <div className="relative w-[48%] max-w-[230px] shrink-0 [mask-image:linear-gradient(to_right,#000_88%,transparent)]">
            <Pachamama state={busy ? "thinking" : "idle"} fill className="absolute inset-0 h-full w-full" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-3">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">Growwy · Pachamama</span>
              <button onClick={() => setFull(true)} className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink" title="Full screen" aria-label="Full screen">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              </button>
            </div>
            <div className="relative mt-1.5 min-h-0 overflow-y-auto overscroll-contain rounded-xl rounded-bl-sm border border-line bg-surface p-2.5 text-sm leading-relaxed text-ink [scrollbar-width:thin]" tabIndex={0} aria-label="Growwy's answer">
              {(busy ? pending : last?.q) && <p className="mb-1.5 border-b border-line pb-1.5 text-xs text-muted"><span className="font-medium text-ink-2">You:</span> {busy ? pending : last?.q}</p>}
              {busy ? <span className="inline-flex items-center gap-1.5">{say}<Dots /></span> : say}
              {!busy && advice?.visuals?.map((v) => <Visual key={v} id={v} data={vdata} />)}
              {!busy && convinced && <p className="mt-3 rounded-lg bg-green-bg p-2 text-xs text-green-fg">Does it convince you? I can put everything in a plan: what to do, how to divide the field, materials and prices.</p>}
            </div>
          </div>
        </div>
        {/* actions: a full-width bar so the answer keeps its space on phones */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-2.5 py-2">
          {voiceButtons}
          {advice && !busy && <button className={`${pill} ${replying ? "!border-ink" : ""}`} onClick={() => setReplying((r) => !r)} aria-expanded={replying}>↩ Reply</button>}
          {advice && !busy && planBtn()}
          <span className="ml-auto">{autoBtn}</span>
          {tts.hablando && tts.dispositivo && <p className="w-full text-[11px] text-muted">Using your device&apos;s voice: turn up the volume of your phone or computer.</p>}
        </div>
        {replying && advice && !busy && <ReplyBox onSend={send} />}
      </div>

      {full && <FullScreen {...{ busy, pending, turns, data: vdata, onClose: () => setFull(false), voiceButtons, autoBtn, planBtn, onSend: send, plan }} />}
    </>
  );
}

function ReplyBox({ onSend, big = false }: { onSend: (q: string) => void; big?: boolean }) {
  const ui = useLang();
  const [reply, setReply] = useState("");
  const base = useRef("");
  const dict = useDictado((t) => setReply((base.current ? base.current + " " : "") + t), ui === "es" ? "es-AR" : "en-US");
  const send = () => {
    const q = reply.trim();
    if (q.length < 2) return;
    dict.detener();
    setReply("");
    onSend(q);
  };
  return (
    <form className={`flex items-end gap-2 border-t border-line bg-surface ${big ? "p-3" : "p-2.5"}`} onSubmit={(e) => { e.preventDefault(); send(); }}>
      <textarea autoFocus={!big} rows={big ? 2 : 2} value={reply} onChange={(e) => setReply(e.target.value)}
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
  );
}

function FullScreen({ busy, pending, turns, data, onClose, voiceButtons, autoBtn, planBtn, onSend, plan }: {
  busy: boolean;
  pending: string | null;
  turns: GrowwyTurn[];
  data: React.ComponentProps<typeof Visual>["data"];
  onClose: () => void;
  voiceButtons: React.ReactNode;
  autoBtn: React.ReactNode;
  planBtn: (big?: boolean) => React.ReactNode;
  onSend: (q: string) => void;
  plan: ReturnType<typeof buildPlan> | null;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); // (returns a promise in new browsers: don't return it)
  }, [turns.length, busy]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex bg-canvas" role="dialog" aria-modal="true" aria-label="Growwy">
      {/* the Pachamama, big */}
      <aside className="relative hidden w-[38%] max-w-[560px] shrink-0 overflow-hidden border-r border-line bg-surface-2 lg:block">
        <Pachamama variant="full" state={busy ? "thinking" : "idle"} className="absolute inset-x-0 bottom-0 mx-auto h-[86%] w-auto" />
        <div className="absolute left-6 top-5">
          <div className="font-serif text-4xl">Growwy</div>
          <div className="text-sm text-muted">The voice of the Pachamama in Growvia</div>
        </div>
        {plan && (
          <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-line bg-surface/90 p-4 backdrop-blur">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">Your plan so far</div>
            <div className="mt-1 font-medium">{plan.rotation.name}</div>
            <div className="mt-0.5 text-xs text-muted">{`${plan.plots.length} plots · investment ${usd(plan.totals.investment)} · ${plan.steps.length} steps`}</div>
            <div className="mt-3">{planBtn(true)}</div>
          </div>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-line bg-surface-2 lg:hidden"><Pachamama fill state={busy ? "thinking" : "idle"} className="absolute inset-0 h-full w-full" /></div>
          <div className="min-w-0">
            <div className="font-serif text-2xl leading-none">Talk with Growwy</div>
            <div className="text-xs text-muted">{data.plan?.place ?? ""}</div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {autoBtn}
            {voiceButtons}
            <span className="lg:hidden">{planBtn()}</span>
            <button onClick={onClose} className={pill} aria-label="Close full screen">✕ Close <kbd>Esc</kbd></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {turns.map((t, i) => (
              <div key={i} className="space-y-2">
                {t.q && <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-canvas">{t.q}</div>}
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed">
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">Growwy</div>
                  {t.advice.answer && <p>{t.advice.answer}</p>}
                  {(!t.advice.answer || !t.q) && <p className={t.advice.answer ? "mt-2 text-ink-2" : ""}>{t.advice.summary}</p>}
                  {t.advice.visuals?.map((v) => <Visual key={v} id={v} data={{ ...data, advice: t.advice }} />)}
                </div>
              </div>
            ))}
            {busy && (
              <div className="space-y-2">
                {pending && <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-canvas">{pending}</div>}
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3 text-sm text-muted">{THINKING}<Dots /></div>
              </div>
            )}
            {!busy && turns.length > 0 && (
              <div className="rounded-2xl border border-green-fg/40 bg-green-bg p-4 text-sm text-green-fg">
                <p>When you are convinced, I will put it all in a plan you can print or send: what to do and when, how to divide your field, materials with prices, the numbers and the risks.</p>
                <div className="mt-3 max-w-xs">{planBtn(true)}</div>
              </div>
            )}
            <div ref={end} />
          </div>
        </div>
        {!busy && turns.length > 0 && <div className="mx-auto w-full max-w-3xl"><ReplyBox onSend={onSend} big /></div>}
      </section>
    </div>,
    document.body,
  );
}
