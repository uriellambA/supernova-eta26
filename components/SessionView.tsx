"use client";
import { printPage } from "@/lib/desktop";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/config/app";
import { useLeer } from "@/hooks/useLeer";
import { METHOD_NAME } from "@/lib/riego";

const SYSTEM_NAME = { orchard: "Orchard", vegetables: "Vegetables", forage: "Forage", grains: "Grains" } as const;
import { openWhatsApp, whatsappText, type SavedSession } from "@/lib/session";
import { Badge, btnGhost, btnPrimary } from "./ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SEASONS = [["spring", "Spring", "🌸"], ["summer", "Summer", "☀️"], ["autumn", "Autumn", "🍂"], ["winter", "Winter", "❄️"]] as const;

/** Share bar: WhatsApp (owner summary or team tasks), copy link, native share, PDF, listen. */
export function SessionActions({ s, link, compact = false }: { s: SavedSession; link: string | null; compact?: boolean }) {
  const tts = useLeer();
  const [copied, setCopied] = useState(false);
  const url = link ?? "";
  const share = async () => {
    const text = whatsappText(s, "summary", url);
    if (navigator.share) await navigator.share({ title: `${APP_NAME} · ${s.place}`, text, url }).catch(() => {});
    else openWhatsApp(text);
  };
  const b = `${btnGhost} !py-1.5 text-xs`;
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button className={`${btnPrimary} !py-1.5 text-xs`} onClick={() => openWhatsApp(whatsappText(s, "summary", url))}>WhatsApp: summary</button>
      <button className={b} onClick={() => openWhatsApp(whatsappText(s, "team", url))}>WhatsApp: tasks for the team</button>
      <button className={b} disabled={!link} onClick={async () => { await navigator.clipboard.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? "✓ Link copied" : "🔗 Copy link"}</button>
      {!compact && typeof navigator !== "undefined" && "share" in navigator && <button className={b} onClick={share}>📤 Share…</button>}
      <button className={b} onClick={() => (link ? window.open(`${link.replace("/s#", "/s?print=1#")}`, "_blank", "noopener") : printPage())}>📄 PDF</button>
      {tts.soportado && (tts.hablando
        ? <><button className={b} onClick={tts.pausar}>{tts.pausado ? "▶ Resume" : "⏸ Pause"}</button><button className={b} onClick={tts.detener}>⏹ Stop</button></>
        : <button className={b} onClick={() => tts.leer([s.advice.answer, s.advice.voice ?? s.advice.summary].filter(Boolean).join(" "))}>🔊 Listen</button>)}
    </div>
  );
}

/** A saved SI session, readable on screen and printable as the PDF report. */
export function SessionView({ s, link }: { s: SavedSession; link: string | null }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!link || link.length > 2900) return; // beyond what a QR code can hold
    QRCode.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "L" }).then(setQr).catch(() => setQr(null));
  }, [link]);
  const date = new Date(s.createdAt).toLocaleDateString(s.lang === "es" ? "es-AR" : "en-US", { dateStyle: "long" });
  const card = "rounded-2xl border border-line bg-surface p-6 print:break-inside-avoid print:rounded-none print:border-black/20 print:p-3";
  return (
    <article className="space-y-4 print:space-y-2 print:text-[11px] print:text-black">
      <header className="flex flex-wrap items-start gap-4 border-b-2 border-ink pb-4 print:pb-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">{APP_NAME} · Field report</div>
          <h1 className="mt-1 font-serif text-4xl leading-tight print:text-2xl">{s.place}</h1>
          <p className="mt-1 text-sm text-muted">
            {`${date} · ${s.lat}, ${s.lon} · ${s.farm.areaHa} ha`} · <span>{SYSTEM_NAME[s.farm.system]}</span> · <span>{`${METHOD_NAME[s.farm.irrigation]} irrigation`}</span>
          </p>
        </div>
        {qr && (
          <div className="w-40 shrink-0 text-center print:w-[42mm]">
            <div className="rounded-lg bg-white p-1.5" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="mt-1 text-[10px] text-muted">Scan to open this report</div>
          </div>
        )}
      </header>

      {s.question && (
        <section className={card}>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">Your question</div>
          <p className="mt-1 font-serif text-2xl italic print:text-base">“{s.question}”</p>
          {s.advice.answer && <p className="mt-3 text-base leading-relaxed print:text-[12px]">{s.advice.answer}</p>}
        </section>
      )}

      <section className={`${card} !border-ink`}>
        <div className="flex flex-wrap items-end gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">Recommended rotation</div>
            <div className="mt-1 font-serif text-3xl leading-tight print:text-xl">{s.best.name}</div>
          </div>
          <div className="text-right"><div className="font-serif text-5xl leading-none print:text-3xl">{s.best.score}</div><div className="text-xs text-muted">score / 100</div></div>
          {s.current && s.current.name !== s.best.name && (
            <div className="text-right"><div className="font-serif text-3xl leading-none text-subtle print:text-xl">{s.current.score}</div><div className="text-xs text-muted">your current rotation</div></div>
          )}
        </div>
        <p className="mt-4 leading-relaxed text-ink-2">{s.advice.summary}</p>
      </section>

      {s.advice.seasons && (
        <section className={card}>
          <h2 className="font-semibold">Plan by season</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
            {SEASONS.map(([id, name, e]) => (
              <div key={id} className="rounded-xl bg-surface-2 p-3 print:bg-transparent print:p-1">
                <div className="text-xs font-semibold">{e} {name}</div>
                <p className="mt-1 text-sm text-ink-2 print:text-[10.5px]">{s.advice.seasons![id]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {s.tasks.length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Tasks for this week</h2>
          <ul className="mt-2 space-y-1 text-sm">{s.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Rotation strategies compared</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-muted"><tr className="border-b border-line"><th className="py-1.5 font-medium">Strategy</th><th className="font-medium">Score</th><th className="font-medium">Water mm/yr</th><th className="font-medium">Bare months</th><th className="font-medium">Erosion</th><th className="font-medium">N kg/ha</th><th className="font-medium">Main benefit / risk</th></tr></thead>
            <tbody>
              {s.ranking.map((r, i) => (
                <tr key={r.name} className="border-b border-line align-top last:border-0">
                  <td className="py-1.5 pr-2 font-medium">{r.name}{r.current && <span className="ml-1 text-blue-fg"> (current)</span>}{i === 0 && <span className="ml-1 text-green-fg"> ★</span>}</td>
                  <td className="tabular-nums">{r.score}</td><td className="tabular-nums">{r.water}</td><td className="tabular-nums">{r.bare}</td><td className="tabular-nums">{r.erosion}%</td><td className="tabular-nums">{r.n}</td>
                  <td className="text-muted">{r.benefit ?? r.risk ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-2">
        {s.crops.length > 0 && (
          <section className={card}>
            <h2 className="font-semibold">New crops to try</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {s.crops.map((c) => (
                <li key={c.name}>
                  <div className="flex flex-wrap items-center gap-1.5"><b>{c.name}</b><Badge tone="green">{c.viability}/100</Badge><span className="text-xs text-muted">{c.harvest.map((m) => MONTHS[m - 1]).join("/")}</span></div>
                  <div className="text-ink-2">{c.why}</div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className={card}>
          <h2 className="font-semibold">Field data</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-2">
            {s.climate && <li>{`❄️ ${s.climate.frostFree} frost-free days · last spring frost ${s.climate.lastFrost}`}</li>}
            {s.climate && <li>{`💧 ${s.climate.rain} mm rain vs ${s.climate.et0} mm evaporation per year`}</li>}
            {s.soil && <li>{`🟫 ${s.soil.texture} · organic matter ${s.soil.om}% · pH ${s.soil.ph}`}</li>}
          </ul>
          {s.advice.askExpert.length > 0 && (
            <>
              <h3 className="mt-3 text-sm font-semibold">Check with a local expert</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-ink-2">{s.advice.askExpert.map((a) => <li key={a}>{a}</li>)}</ul>
            </>
          )}
        </section>
      </div>

      <footer className="border-t border-line pt-3 text-[11px] text-muted">
        {`${s.advice.source === "ai" ? "SI explanation · scores from the rotation model" : "Rotation model (SI offline)"} · confidence ${s.advice.confidence}.`}
        {" "}Decision-support tool: it highlights patterns and options, it does not replace the farmer&apos;s judgment or local agronomic advice.
        {link && <span className="hidden break-all print:block">{link.length < 400 ? link : ""}</span>}
      </footer>
    </article>
  );
}
