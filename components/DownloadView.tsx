"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { DOWNLOADS, RELEASES_URL, detectPlatform, type Platform } from "@/config/downloads";
import type { ReleaseInfo } from "@/lib/release";
import { Brand } from "./Brand";
import { desktopInfo } from "@/lib/desktop";
import { getLang } from "@/lib/i18n";
import { Pachamama } from "./Pachamama";
import { LangToggle } from "./Translator";
import { btnGhost, btnPrimary } from "./styles";
import { ThemeToggle } from "./ui";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const noop = () => () => {};
const ORDER: Platform[] = ["windows", "mac", "linux", "android", "iphone"];
const ICON: Record<Platform, string> = {
  windows: "M3 5.5 10.5 4.5v7H3zM12 4.3 21 3v8.5h-9zM3 12.5h7.5v7L3 18.5zM12 12.5h9V21l-9-1.3z",
  mac: "M16.5 3c.1 1.3-.4 2.5-1.2 3.4-.8.9-2 1.5-3.1 1.4-.1-1.2.4-2.5 1.2-3.3.8-.9 2.1-1.5 3.1-1.5ZM19.8 17c-.5 1.2-.8 1.7-1.5 2.8-1 1.5-2.3 3.3-4 3.3-1.5 0-1.9-1-3.9-1s-2.5 1-4 1c-1.7 0-2.9-1.6-3.9-3.1C-.3 15.7-.6 10.6 1.1 7.9 2.3 6 4.2 4.9 6 4.9c1.8 0 3 1 4.5 1 1.5 0 2.4-1 4.5-1 1.6 0 3.3.9 4.5 2.4-4 2.2-3.3 7.9.3 9.7Z",
  linux: "M12 2c-2 0-3.2 1.9-3.2 4.5 0 1.4.3 2.3-.6 3.6C6.8 12 5 14.5 5 17c0 1 .3 1.8.8 2.4M12 2c2 0 3.2 1.9 3.2 4.5 0 1.4-.3 2.3.6 3.6C17.2 12 19 14.5 19 17c0 1-.3 1.8-.8 2.4M7 21c1.5.7 3.2 1 5 1s3.5-.3 5-1M10 7h.01M14 7h.01M10.5 9.5c.9.6 2.1.6 3 0",
  android: "M7 9h10v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1zM7 9a5 5 0 0 1 10 0M9.5 6.5 8 4.5M14.5 6.5 16 4.5M10 18v3M14 18v3M4.5 10v5M19.5 10v5",
  iphone: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
};

/** /download: the official Growvia apps (Rust desktop app, Android APK) and the installable web app. */
export function DownloadView() {
  const mine = useSyncExternalStore(noop, () => detectPlatform(navigator.userAgent, navigator.platform), () => null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [rel, setRel] = useState<ReleaseInfo | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/release").then((r) => r.json()).then((j: ReleaseInfo) => alive && setRel(j)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const list = mine ? [mine, ...ORDER.filter((p) => p !== mine)] : ORDER;
  const app = useSyncExternalStore(noop, () => desktopInfo()?.version ?? null, () => null);
  const appOs = useSyncExternalStore(noop, () => desktopInfo()?.platform ?? null, () => null);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Brand />
          <div className="ml-auto flex items-center gap-2"><LangToggle /><ThemeToggle /><Link href="/app" className={btnGhost}>Open dashboard</Link></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid items-center gap-8 md:grid-cols-12">
          <div className="md:col-span-8">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Official app</div>
            <h1 className="mt-2 font-serif text-5xl leading-tight">Download Growvia</h1>
            {rel?.version && <p className="mt-1 text-sm text-muted">{`Version ${rel.version} · ${new Date(rel.published!).toLocaleDateString(getLang() === "es" ? "es-AR" : "en-US")}`}</p>}
            <p className="mt-3 max-w-xl text-lg text-ink-2">Growwy on your computer or phone: frost and wind alerts, your plan always at hand and the same data as the web. Built in Rust: light and fast.</p>
          </div>
          <div className="hidden justify-center md:col-span-4 md:flex"><Pachamama className="h-52 w-auto" /></div>
        </div>

        {app && (
          <div className="mt-8 rounded-2xl border border-green-fg/40 bg-green-bg p-4 text-green-fg">{appOs === "android" ? `You are already using the Growvia app ${app}.` : `You are already using Growvia Desktop ${app}.`}</div>
        )}
        <div className="mt-10 grid gap-3">
          {list.map((p, i) => {
            const d = DOWNLOADS[p];
            const first = i === 0 && !!mine;
            const a = d.url ? { url: d.url, name: d.file, sizeMb: 0 } : rel?.assets[p];
            return (
              <section id={p} key={p} className={`scroll-mt-24 rounded-2xl border bg-surface p-5 ${first ? "border-ink" : "border-line"}`}>
                <div className="flex flex-wrap items-center gap-4">
                  <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0 text-ink" fill={p === "mac" || p === "windows" ? "currentColor" : "none"} stroke={p === "mac" || p === "windows" ? "none" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICON[p]} /></svg>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{d.label}{first && <span className="ml-2 rounded-full bg-green-bg px-2 py-0.5 text-[11px] text-green-fg">Your device</span>}</div>
                    <div className="text-sm text-muted">{p === "iphone" ? "Install the web app from Safari: same features, no store needed." : a ? (a.sizeMb ? `${a.name} · ${a.sizeMb} MB` : a.name) : rel === null ? "Looking for the latest version…" : "Being prepared: available very soon."}</div>
                  </div>
                  {p === "iphone" ? null : a ? (
                    <div className="flex flex-wrap gap-2">
                      <a href={a.url} className={first ? btnPrimary : btnGhost}>Download</a>
                      {p === "linux" && rel?.assets.linuxDeb && <a href={rel.assets.linuxDeb.url} className={btnGhost}>.deb</a>}
                    </div>
                  ) : (
                    <a href={RELEASES_URL} className={btnGhost} target="_blank" rel="noopener">Check releases</a>
                  )}
                </div>
                {p === "iphone" && (
                  <ol className="mt-3 list-decimal space-y-1 pl-12 text-sm text-ink-2">
                    <li>Open this page in Safari.</li>
                    <li>Tap the Share button (square with an arrow).</li>
                    <li>Choose “Add to Home Screen” and tap “Add”.</li>
                  </ol>
                )}
                {p === "android" && !d.url && <p className="mt-3 pl-12 text-sm text-ink-2">Meanwhile, install the web app: it works like an app and opens without the browser.</p>}
                {p === "windows" && <p className="mt-3 pl-12 text-xs text-muted">If Windows shows “Windows protected your PC”, choose “More info” → “Run anyway”. The app is not signed yet.</p>}
                {p === "mac" && <p className="mt-3 pl-12 text-xs text-muted">The first time, right-click the app → “Open” (the app is not notarized yet).</p>}
                {p === "android" && <p className="mt-2 pl-12 text-xs text-muted">Android will ask to allow “Install unknown apps” for your browser: allow it once.</p>}
              </section>
            );
          })}
        </div>

        <section className="mt-8 rounded-2xl border border-line bg-surface-2 p-5">
          <div className="font-medium">Or install the web app (any device)</div>
          <p className="mt-1 text-sm text-ink-2">No download: Growvia stays on your home screen or desktop and opens like an app.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {installed ? <span className="rounded-full bg-green-bg px-3 py-1.5 text-sm text-green-fg">Installed ✓</span>
              : prompt ? <button className={btnPrimary} onClick={install}>Install the web app</button>
              : <span className="text-sm text-muted">Use your browser menu → “Install app” / “Add to Home Screen”.</span>}
            <Link href="/app" className={btnGhost}>Use it in the browser</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
