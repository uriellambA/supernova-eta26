"use client";
import { useLang } from "@/lib/i18n";

/** Download link to a real example of Growwy's action plan (PDF), in the page language. */
export function SamplePlanLink() {
  const lang = useLang();
  return (
    <a href={lang === "es" ? "/landing/plan-ejemplo.pdf" : "/landing/plan-example.pdf"} target="_blank" rel="noopener"
      className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-canvas p-3 transition hover:border-ink">
      <span className="grid h-10 w-8 shrink-0 place-items-center rounded-md bg-red-bg text-[10px] font-bold text-red-fg">PDF</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">See a real plan</span>
        <span className="block text-xs text-muted">Los Antiguos · 5 ha orchard · example</span>
      </span>
      <span className="text-subtle">↓</span>
    </a>
  );
}
