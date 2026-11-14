"use client";
import { useRef, useState } from "react";
import { SYSTEMS } from "@/config/rotations";
import { useDictado } from "@/hooks/useDictado";
import { useLang } from "@/lib/i18n";
import { METHOD_NAME } from "@/lib/riego";
import type { AdvisorResult, FarmProfile, SistemaRiego, StrategyResult } from "@/lib/types";
import Link from "next/link";
import { speciesById } from "@/config/species";
import type { SavedSession } from "@/lib/session";
import { SessionActions } from "./SessionView";
import { Growwy } from "./Growwy";
import { Badge, btnGhost, btnPrimary, input, label, LevelPill } from "./ui";

export function AIPanel({
  farm, setFarm, results, advice, busy, onAnalyze, error, registered, session, link, savedCount, onOpenSessions, systems,
}: {
  systems?: readonly string[];
  farm: FarmProfile;
  setFarm: (f: FarmProfile) => void;
  results: StrategyResult[];
  advice: AdvisorResult | null;
  busy: boolean;
  onAnalyze: (question: string, history?: { q: string; a: string }[]) => void;
  error: string | null;
  registered: boolean;
  session: SavedSession | null;
  link: string | null;
  savedCount: number;
  onOpenSessions: () => void;
}) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [follow, setFollow] = useState<string[]>([]);
  const ui = useLang();
  const [pick, setPick] = useState<"en-US" | "es-AR" | null>(null);
  const lang = pick ?? (ui === "es" ? "es-AR" : "en-US");
  const setLang = setPick;
  const base = useRef("");
  const dict = useDictado((t) => setText((base.current ? base.current + " " : "") + t), lang);
  const best = advice ? results.find((r) => r.strategy.id === advice.best) : null;

  // Conversation with Growwy: each question/reply and her answer, sent back with the next reply
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [asked, setAsked] = useState<{ q: string; reply: boolean } | null>(null);
  const [seen, setSeen] = useState(advice);
  if (advice !== seen) {
    setSeen(advice);
    if (advice && asked?.q) setThread((t) => [...(asked.reply ? t : []), { q: asked.q, a: advice.answer || advice.summary }]);
  }
  function ask(q: string, reply = false) {
    setAsked({ q: q.trim(), reply });
    onAnalyze(q, reply ? thread : []);
  }

  async function readNotes() {
    if (text.trim().length < 3) return;
    setReading(true);
    try {
      const r = await fetch("/api/farm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const j = await r.json();
      setFarm({ ...farm, ...(j.system && { system: j.system }), ...(j.areaHa && { areaHa: j.areaHa }), ...(j.irrigation && { irrigation: j.irrigation }), ...(j.water && { water: j.water }), notes: j.notes ?? text });
      setFollow(j.followUp ?? []);
    } catch {
      setFollow(["Could not read your notes right now. Fill in the fields above."]);
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <button className={`${btnPrimary} w-full py-3`} onClick={() => ask(text)} disabled={busy || !results.length}>
        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-ink border-t-transparent" /> : "✨"} {busy ? "Analyzing…" : "Analyze my field"}
        {!busy && <kbd>A</kbd>}
      </button>

      <Growwy busy={busy} advice={advice} question={asked?.q || null} isReply={!!asked?.reply} onReply={(q) => ask(q, true)} />

      <div className="space-y-2 rounded-xl border border-line p-3">
        <div className="flex items-center text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">Your farm<Link href="/register" className="ml-auto normal-case tracking-normal text-ink underline-offset-4 hover:underline">{registered ? "Edit register" : "Register farm"} <kbd>R</kbd></Link></div>
        <div className={`grid gap-1 ${systems && systems.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {SYSTEMS.filter((s) => !systems || systems.includes(s.id)).map((s) => (
            <button key={s.id} onClick={() => setFarm({ ...farm, system: s.id })} className={`rounded-lg border px-1 py-1.5 text-xs font-medium ${farm.system === s.id ? "border-ink bg-ink text-canvas" : "border-line bg-surface text-ink-2 hover:bg-surface-2"}`}>
              {s.emoji} {s.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className={label}>Area (ha)<input type="number" min={0.1} step={0.5} className={input} value={farm.areaHa} onChange={(e) => setFarm({ ...farm, areaHa: Number(e.target.value) || 1 })} /></label>
          <label className={label}>Irrigation<select className={input} value={farm.irrigation} onChange={(e) => setFarm({ ...farm, irrigation: e.target.value as SistemaRiego })}>{(Object.keys(METHOD_NAME) as SistemaRiego[]).map((m) => <option key={m} value={m}>{METHOD_NAME[m]}</option>)}</select></label>
          <label className={label}>Water<select className={input} value={farm.water} onChange={(e) => setFarm({ ...farm, water: e.target.value as FarmProfile["water"] })}><option value="low">Short</option><option value="medium">Normal</option><option value="high">Plenty</option></select></label>
        </div>
        <textarea className={`${input} min-h-20 resize-y`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question or tell Growvia about your farm. E.g.: What can I plant for summer? · 4 ha of cherries, furrow irrigation, water gets short in February…" />
        <div className="flex flex-wrap items-center gap-2">
          {dict.soportado && (
            <button
              className={`${btnGhost} !px-2.5 !py-1.5 text-xs ${dict.escuchando ? "animate-pulse !border-red-fg text-red-fg" : ""}`}
              onClick={() => {
                if (dict.escuchando) return dict.detener();
                base.current = text.trim();
                dict.iniciar();
              }}
            >
              {dict.escuchando ? "⏹ Stop" : "🎙 Speak"}
            </button>
          )}
          {dict.soportado && (
            <button className="text-[11px] text-muted hover:text-ink" onClick={() => setLang(lang === "en-US" ? "es-AR" : "en-US")} title="Dictation language">
              {lang === "en-US" ? "EN" : "ES"}
            </button>
          )}
          <button className={`${btnGhost} ml-auto !px-2.5 !py-1.5 text-xs`} onClick={readNotes} disabled={reading || text.trim().length < 3}>
            {reading ? "Reading…" : "Use my notes"}
          </button>
        </div>
        {dict.error && <p className="text-[11px] text-red-fg">{dict.error}</p>}
        {follow.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-amber-fg">{follow.map((q) => <li key={q}>{q}</li>)}</ul>
        )}
      </div>

      <div className="min-w-0 break-words">
        {!advice && !busy && (
          <div className="space-y-2 text-sm text-muted">
            {savedCount > 0 && <button className="text-xs font-medium text-ink underline-offset-4 hover:underline" onClick={onOpenSessions}>Saved sessions ({savedCount}) →</button>}
            <p>Compares your current rotation with three alternatives, plans the four seasons and suggests new crops for the months without income, using your field&apos;s climate, soil, water and farm register.</p>
          </div>
        )}
        {error && <p className="mb-2 text-[11px] text-amber-fg">{error}</p>}
        {advice && (
          <div className="space-y-3 text-sm">
            {best && (
              <div className="rounded-xl bg-green-bg p-3 text-green-fg">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em]">Recommended rotation</div>
                <div className="font-semibold">{best.strategy.name}</div>
                <div className="mt-1"><LevelPill level={best.level}>{best.score} / 100</LevelPill></div>
              </div>
            )}
            {advice.answer && (
              <div className="rounded-xl border border-line p-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">Answer to your question</div>
                <p className="mt-1 text-ink">{advice.answer}</p>
              </div>
            )}
            <p className="text-ink-2">{advice.summary}</p>
            {advice.newCrops && advice.newCrops.length > 0 && (
              <div>
                <div className="text-xs font-semibold">New crops to try</div>
                <div className="mt-1 flex flex-wrap gap-1">{advice.newCrops.map((n) => <Badge key={n.id} tone="blue" title={n.why}>{speciesById(n.id)?.emoji} {speciesById(n.id)?.name ?? n.id}</Badge>)}</div>
              </div>
            )}
            {advice.askExpert.length > 0 && (
              <div>
                <div className="text-xs font-semibold">Check with a local expert</div>
                <ul className="list-disc pl-4 text-xs text-muted">{advice.askExpert.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
            )}
            {session && <SessionActions s={session} link={link} compact />}
            <div className="flex items-center gap-2 text-[11px] text-muted">
              {session && <span>💾 Saved on this device</span>}
              <button className="ml-auto font-medium text-ink underline-offset-4 hover:underline" onClick={onOpenSessions}>Saved sessions ({savedCount})</button>
            </div>
            <p className="text-[10px] text-subtle">
              {advice.source === "ai" ? "SI explanation · scores from the rotation model" : "Rotation model (SI offline)"} · confidence {advice.confidence}. Decision support only: your judgment comes first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
