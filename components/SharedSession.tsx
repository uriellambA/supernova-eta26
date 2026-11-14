"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/config/app";
import { decodeSession, saveSession, type SavedSession } from "@/lib/session";
import { SessionActions, SessionView } from "./SessionView";
import { LangToggle } from "./Translator";
import { Note, Spinner, ThemeToggle, btnGhost } from "./ui";

/** /s#<data> — a report someone shared. Everything is inside the link; nothing is stored on a server. */
export function SharedSession() {
  const [s, setS] = useState<SavedSession | null>(null);
  const [err, setErr] = useState(false);
  const [saved, setSaved] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => {
    const code = window.location.hash.slice(1);
    (code ? decodeSession(code) : Promise.reject(new Error("empty")))
      .then((x) => {
        setS(x);
        setLink(`${window.location.origin}/s#${code}`);
        if (new URLSearchParams(window.location.search).get("print") === "1") setTimeout(() => window.print(), 700);
      })
      .catch(() => setErr(true));
  }, []);
  return (
    <div className="min-h-screen print:bg-white">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-serif text-2xl leading-none">{APP_NAME}</Link>
          <span className="text-sm text-muted">Shared report</span>
          <div className="ml-auto flex items-center gap-2"><LangToggle /><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 print:max-w-none print:p-0">
        {err ? (
          <Note kind="warn">This link is incomplete or damaged. Ask the sender to share it again.</Note>
        ) : !s ? (
          <Spinner text="Opening the report…" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <SessionActions s={s} link={link} />
              <button className={`${btnGhost} !py-1.5 text-xs`} disabled={saved} onClick={() => saveSession(s).then(() => setSaved(true))}>{saved ? "✓ Saved on this device" : "💾 Save on this device"}</button>
              <Link href="/app" className="ml-auto text-xs font-medium underline-offset-4 hover:underline">Open Growvia →</Link>
            </div>
            <SessionView s={s} link={link} />
          </>
        )}
      </main>
    </div>
  );
}
