"use client";
import { useRef, useState } from "react";
import { SYSTEMS } from "@/config/rotations";
import { useDictado } from "@/hooks/useDictado";
import { useLeer } from "@/hooks/useLeer";
import { METHOD_NAME } from "@/lib/riego";
import type { AdvisorResult, FarmProfile, SistemaRiego, StrategyResult } from "@/lib/types";
import { btnGhost, btnPrimary, input, LevelPill } from "./ui";

export function AIPanel({
  farm, setFarm, results, advice, busy, onAnalyze, onShare, error,
}: {
  farm: FarmProfile;
  setFarm: (f: FarmProfile) => void;
  results: StrategyResult[];
  advice: AdvisorResult | null;
  busy: boolean;
  onAnalyze: () => void;
  onShare: () => void;
  error: string | null;
}) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [follow, setFollow] = useState<string[]>([]);
  const [lang, setLang] = useState<"en-US" | "es-AR">("en-US");
  const base = useRef("");
  const dict = useDictado((t) => setText((base.current ? base.current + " " : "") + t), lang);
  const tts = useLeer();
  const best = advice ? results.find((r) => r.strategy.id === advice.best) : null;

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
      <button className={`${btnPrimary} w-full py-3 text-base`} onClick={onAnalyze} disabled={busy || !results.length}>
        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" /> : "✨"} {busy ? "Analyzing…" : "AI · Analyze my field"}
      </button>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-900/80 p-3">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Your farm</div>
        <div className="grid grid-cols-3 gap-1">
          {SYSTEMS.map((s) => (
            <button key={s.id} onClick={() => setFarm({ ...farm, system: s.id })} className={`rounded-lg px-1 py-1.5 text-xs font-semibold ${farm.system === s.id ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>
              {s.emoji} {s.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[11px] text-slate-400">Area (ha)<input type="number" min={0.1} step={0.5} className={input} value={farm.areaHa} onChange={(e) => setFarm({ ...farm, areaHa: Number(e.target.value) || 1 })} /></label>
          <label className="text-[11px] text-slate-400">Irrigation<select className={input} value={farm.irrigation} onChange={(e) => setFarm({ ...farm, irrigation: e.target.value as SistemaRiego })}>{(Object.keys(METHOD_NAME) as SistemaRiego[]).map((m) => <option key={m} value={m}>{METHOD_NAME[m]}</option>)}</select></label>
          <label className="text-[11px] text-slate-400">Water<select className={input} value={farm.water} onChange={(e) => setFarm({ ...farm, water: e.target.value as FarmProfile["water"] })}><option value="low">Short</option><option value="medium">Normal</option><option value="high">Plenty</option></select></label>
        </div>
        <textarea className={`${input} min-h-20 resize-y`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell Growvia about your farm, in your words. E.g.: 4 ha of cherries, furrow irrigation, alleys are bare, water gets short in February…" />
        <div className="flex flex-wrap items-center gap-2">
          {dict.soportado && (
            <button
              className={`${btnGhost} !px-2.5 !py-1.5 text-xs ${dict.escuchando ? "animate-pulse border-rose-400/60 text-rose-200" : ""}`}
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
            <button className="text-[11px] text-slate-400 hover:text-white" onClick={() => setLang(lang === "en-US" ? "es-AR" : "en-US")} title="Dictation language">
              {lang === "en-US" ? "EN" : "ES"}
            </button>
          )}
          <button className={`${btnGhost} ml-auto !px-2.5 !py-1.5 text-xs`} onClick={readNotes} disabled={reading || text.trim().length < 3}>
            {reading ? "Reading…" : "Use my notes"}
          </button>
        </div>
        {dict.error && <p className="text-[11px] text-rose-300">{dict.error}</p>}
        {follow.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-amber-200">{follow.map((q) => <li key={q}>{q}</li>)}</ul>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/80 p-3">
        {!advice && !busy && (
          <div className="text-sm text-slate-400">
            <p className="font-semibold text-slate-200">Growvia AI</p>
            <p className="mt-1">Compares your current rotation with three alternatives using your field&apos;s climate, soil and water, and explains the trade-offs.</p>
          </div>
        )}
        {error && <p className="mb-2 text-[11px] text-amber-300">{error}</p>}
        {advice && (
          <div className="space-y-3 text-sm">
            {best && (
              <div className="rounded-xl bg-emerald-500/10 p-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Recommended</div>
                <div className="font-bold text-white">{best.strategy.name}</div>
                <div className="mt-1"><LevelPill level={best.level}>{best.score} / 100</LevelPill></div>
              </div>
            )}
            <p className="text-slate-200">{advice.summary}</p>
            {advice.askExpert.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-300">Check with a local expert</div>
                <ul className="list-disc pl-4 text-xs text-slate-400">{advice.askExpert.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {tts.soportado && (tts.hablando ? <button className={`${btnGhost} !py-1.5 text-xs`} onClick={tts.detener}>⏹ Stop</button> : <button className={`${btnGhost} !py-1.5 text-xs`} onClick={() => tts.leer(advice.voice)}>🔊 Listen</button>)}
              <button className={`${btnGhost} !py-1.5 text-xs`} onClick={onShare}>Share</button>
              <button className={`${btnGhost} !py-1.5 text-xs`} onClick={() => window.print()}>PDF</button>
            </div>
            <p className="text-[10px] text-slate-500">
              {advice.source === "ai" ? "AI explanation · scores from the rotation model" : "Rotation model (AI offline)"} · confidence {advice.confidence}. Decision support only: your judgment comes first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
