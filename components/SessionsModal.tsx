"use client";
import { useEffect, useState } from "react";
import { deleteSession, sessionLink, type SavedSession } from "@/lib/session";
import { SessionActions, SessionView } from "./SessionView";
import { Badge, btnGhost } from "./ui";

/** Every SI analysis saved on this device: open, share again or delete. */
export function SessionsModal({ open, onClose, sessions, setSessions }: { open: boolean; onClose: () => void; sessions: SavedSession[]; setSessions: (s: SavedSession[]) => void }) {
  const [sel, setSel] = useState<SavedSession | null>(null);
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => {
    if (!sel) return;
    let alive = true;
    sessionLink(sel).then((l) => alive && setLink(l));
    return () => { alive = false; };
  }, [sel]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (sel ? setSel(null) : onClose());
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, sel, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4 print:hidden" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Saved sessions" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-line bg-canvas p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          {sel && <button className={`${btnGhost} !px-2.5 !py-1 text-xs`} onClick={() => { setSel(null); setLink(null); }}>← All sessions</button>}
          <h2 className="font-serif text-3xl">{sel ? "Session" : "Saved sessions"}</h2>
          <button className="ml-auto flex items-center gap-2 text-sm text-muted hover:text-ink" onClick={onClose} aria-label="Close"><kbd>Esc</kbd> ✕</button>
        </div>
        {sel ? (
          <div className="space-y-4">
            <SessionActions s={sel} link={link} />
            <SessionView s={sel} link={link} />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted">No sessions yet. Each time you press “Analyze my field” the result is saved here so you can share it later.</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {sessions.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => setSel(x)}>
                  <div className="text-xs text-muted">{new Date(x.createdAt).toLocaleString(x.lang === "es" ? "es-AR" : "en-US", { dateStyle: "medium", timeStyle: "short" })} · {x.place}</div>
                  <div className="truncate font-medium">{x.question ? `“${x.question}”` : x.best.name}</div>
                  <div className="truncate text-xs text-ink-2">{x.question ? x.best.name : x.advice.summary}</div>
                </button>
                <Badge tone="green">{x.best.score}/100</Badge>
                <button className={`${btnGhost} !px-2.5 !py-1 text-xs`} onClick={() => setSel(x)}>Open</button>
                <button className="text-xs text-red-fg hover:underline" onClick={async () => setSessions(await deleteSession(x.id))}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
