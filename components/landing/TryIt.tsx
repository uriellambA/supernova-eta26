"use client";
// "Try it now, no sign-up": pick a place and a farm type and see the best rotation for it with real data.
import Link from "next/link";
import { useState } from "react";
import { SYSTEMS } from "@/config/rotations";
import { SITES, siteById } from "@/config/sites";
import { compareStrategies } from "@/lib/rotation";
import { salinityEstimate } from "@/lib/soil";
import { rankSpecies, type SpeciesFit } from "@/lib/suitability";
import { DEFAULT_PRIORITIES, DEFAULT_PROFILE, type FarmSystem, type IndicadoresNasa, type NieveResumen, type SoilResumen, type StrategyResult } from "@/lib/types";
import { Visual } from "@/components/growwy/Visuals";
import { btnGhost, btnPrimary } from "@/components/styles";
import { Reveal } from "@/components/ui";

type Result = { results: StrategyResult[]; fits: SpeciesFit[]; climate: IndicadoresNasa };

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error ?? `Error ${r.status}`);
  return j as T;
}

export function TryIt() {
  const [siteId, setSiteId] = useState(SITES[0].id);
  const site = siteById(siteId);
  const [system, setSystem] = useState<FarmSystem>(site.systems[0] as FarmSystem);
  const [area, setArea] = useState(5);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [res, setRes] = useState<Result | null>(null);

  function pickSite(id: string) {
    setSiteId(id);
    setSystem(siteById(id).systems[0] as FarmSystem);
    setState("idle");
  }

  async function run() {
    setState("loading");
    try {
      const [lon, lat] = site.center;
      const q = `lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`;
      const [climate, soil, snow] = await Promise.all([
        getJson<IndicadoresNasa>(`/api/climate?v=3&lat=${lat.toFixed(1)}&lon=${lon.toFixed(1)}`),
        getJson<SoilResumen>(`/api/soil?${q}`),
        site.watershed ? getJson<NieveResumen>(`/api/snow?site=${site.id}`).catch(() => null) : Promise.resolve(null),
      ]);
      const farm = { ...DEFAULT_PROFILE, system, areaHa: area, irrigation: site.irrigation.defaultMethod };
      const results = compareStrategies({ climate, soil, snow, cfg: site }, farm, DEFAULT_PRIORITIES).sort((a, b) => b.score - a.score);
      const fits = rankSpecies(climate, soil, salinityEstimate(soil, climate, farm.irrigation), farm, site);
      setRes({ results, fits, climate });
      setState("done");
    } catch {
      setState("error");
    }
  }

  const best = res?.results[0];
  const cur = res?.results.find((r) => r.strategy.current) ?? best;
  const newCrops = res?.fits.filter((f) => f.species.status === "new").slice(0, 3) ?? [];
  const ask = best ? encodeURIComponent(`Why is "${best.strategy.name}" the best rotation for my field and what should I do first?`) : "";

  return (
    <section id="try" className="scroll-mt-20 border-y border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Try it now · no sign-up</div>
          <h2 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">See your result in a minute</h2>
          <p className="mt-3 text-ink-2">Choose where your farm is and what you grow.</p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {SITES.map((s) => (
              <button key={s.id} onClick={() => pickSite(s.id)} aria-pressed={siteId === s.id}
                className={`rounded-xl border p-3 text-left transition ${siteId === s.id ? "border-ink bg-surface-2" : "border-line hover:bg-surface-2"}`}>
                <div className="font-medium">{s.name}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="flex flex-wrap gap-1">
              {SYSTEMS.filter((x) => (site.systems as readonly string[]).includes(x.id)).map((x) => (
                <button key={x.id} onClick={() => { setSystem(x.id); setState("idle"); }} aria-pressed={system === x.id}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${system === x.id ? "border-ink bg-ink text-canvas" : "border-line hover:bg-surface-2"}`}>{x.name}</button>
              ))}
            </div>
            <label className="ml-auto flex items-center gap-2 text-sm text-muted">Hectares
              <input type="number" min={0.5} step={0.5} value={area} onChange={(e) => { setArea(Math.max(0.5, Number(e.target.value) || 1)); setState("idle"); }}
                className="w-20 rounded-lg border border-line bg-canvas px-2 py-1.5 text-ink focus:border-ink focus:outline-none" />
            </label>
          </div>
          <button className={`${btnPrimary} mt-4 w-full py-3 text-base`} onClick={run} disabled={state === "loading"}>
            {state === "loading" ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-ink border-t-transparent" /> Reading 20 years of climate…</> : "See result"}
          </button>
          {state === "error" && <p className="mt-2 text-sm text-red-fg">We couldn&apos;t load the data right now. Try again in a minute.</p>}
        </Reveal>

        <Reveal delay={100} className="lg:col-span-7">
          {state !== "done" || !best || !cur ? (
            <div className="grid h-full min-h-72 place-items-center rounded-2xl border border-dashed border-line-strong p-8 text-center text-muted">
              <div>
                <div className="font-serif text-3xl text-ink-2">{site.name}</div>
                <p className="mt-2 text-sm">{state === "loading" ? "Comparing rotations for your place…" : "Your result appears here: the best rotation, how much water and soil it saves, and new crops for the months without income."}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink bg-canvas p-6">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">{`Best for a ${system} farm in ${site.name}`}</div>
              <h3 className="mt-1 font-serif text-3xl leading-tight">{best.strategy.name}</h3>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  [`${best.score}`, `score (today ${cur.score})`],
                  [best.metrics.erosion < cur.metrics.erosion ? `−${Math.round((cur.metrics.erosion - best.metrics.erosion) * 100)}%` : `${Math.round(best.metrics.erosion * 100)}%`, "soil lost to erosion"],
                  [`${best.metrics.waterMm}`, `mm of water a year (today ${cur.metrics.waterMm})`],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl bg-surface-2 p-3"><div className="font-serif text-3xl leading-none">{v}</div><div className="mt-1 text-xs text-muted">{l}</div></div>
                ))}
              </div>
              <Visual id="rotations" data={{ results: res!.results, fits: res!.fits, climate: res!.climate, plan: null, advice: null }} />
              {newCrops.length > 0 && (
                <p className="mt-3 text-sm text-ink-2"><b className="text-ink">New crops for the months without income:</b> {newCrops.map((f) => f.species.name).join(", ")}.</p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/app?site=${site.id}&ask=${ask}`} className={btnPrimary}>Ask Growwy and get my plan →</Link>
                <Link href="/datos" className={btnGhost}>Save my farm</Link>
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
