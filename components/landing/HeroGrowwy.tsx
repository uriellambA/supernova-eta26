"use client";
// Growwy greets on the landing and offers three quick questions; each one opens the dashboard with her answer.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pachamama } from "@/components/Pachamama";

const QUICK: { label: string; q: string; icon: string }[] = [
  { label: "What should I plant?", q: "What should I plant next season, and what can I grow when the main harvest is over?", icon: "M12 21v-9m0 0c0-4 2.5-7 8-7 0 4.5-3 7-8 7Zm0 2c0-3.2-2-5.5-7-5.5 0 3.6 2.5 5.5 7 5.5Z" },
  { label: "How much water do I need?", q: "How much water does my field need each month, and how can I save water?", icon: "M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" },
  { label: "How much can I earn?", q: "How much does it cost to plant something new and how much can I earn per hectare?", icon: "M12 3v18M16.5 7.5C16 6 14.3 5 12 5 9.5 5 8 6.3 8 8c0 4 9 2.5 9 7 0 1.8-1.7 3-5 3-2.4 0-4.2-1-4.7-2.6" },
];

export function HeroGrowwy() {
  const router = useRouter();
  const [text, setText] = useState("");
  const go = (q: string) => router.push(`/app?ask=${encodeURIComponent(q)}`);
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface/85 backdrop-blur-sm">
      <div className="flex items-stretch">
        <div className="relative w-[44%] shrink-0 [mask-image:linear-gradient(to_right,#000_85%,transparent)]">
          <Pachamama fill className="absolute inset-0 h-full w-full" />
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-subtle">Growwy · your farm guide</div>
          <p className="mt-2 rounded-2xl rounded-bl-sm border border-line bg-canvas p-3 font-serif text-xl leading-snug">Hi! I&apos;m Growwy. What do you want to know about your farm?</p>
          <div className="mt-3 grid gap-1.5">
            {QUICK.map((x) => (
              <button key={x.label} onClick={() => go(x.q)} className="group flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm font-medium transition hover:border-ink">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-cta" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={x.icon} /></svg>
                <span className="flex-1">{x.label}</span>
                <span className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); if (text.trim().length > 2) go(text.trim()); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Or ask your own question…"
          className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-ink focus:outline-none" />
        <button className="rounded-xl bg-cta px-4 text-sm font-medium text-cta-ink disabled:opacity-40" disabled={text.trim().length < 3}>Ask</button>
      </form>
    </div>
  );
}
