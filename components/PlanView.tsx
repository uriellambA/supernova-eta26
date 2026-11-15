"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PlanDoc } from "./PlanDoc";
import { LangToggle } from "./Translator";
import { btnGhost, btnPrimary } from "./styles";
import { loadPlan, usd, type ActionPlan } from "@/lib/plan";
import { openWhatsApp } from "@/lib/session";

/** /plan: the action plan Growwy prepared, ready to save as PDF. */
export function PlanView() {
  const [plan, setPlan] = useState<ActionPlan | null | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the plan lives in this browser's storage
    setPlan(loadPlan());
    // printed documents always use the light theme
    document.documentElement.dataset.theme = "light";
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      const t = setTimeout(() => window.print(), 1200); // let the translator and images finish
      return () => clearTimeout(t);
    }
  }, []);
  if (plan === undefined) return null;
  if (!plan) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-serif text-3xl">No plan yet</h1>
        <p className="mt-2 text-muted">Talk with Growwy in the dashboard and press “Build my plan (PDF)”.</p>
        <Link href="/app" className={`${btnPrimary} mt-6`}>Open dashboard</Link>
      </main>
    );
  }
  const text = [
    `🌱 Action plan for ${plan.farmName} (${plan.place})`,
    `Rotation: ${plan.rotation.name} (${plan.rotation.score}/100)`,
    ...plan.steps.map((s, i) => `${i + 1}. ${s.when}: ${s.what}`),
    `Investment: ${usd(plan.totals.investment)} · every year: ${usd(plan.totals.yearlyCost)}`,
    "— Growwy, Growvia",
  ].join("\n");
  return (
    <div className="min-h-screen bg-canvas px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl flex-wrap items-center gap-2 print:hidden">
        <Link href="/app" className={btnGhost}>← Dashboard</Link>
        <button className={btnPrimary} onClick={() => window.print()}>Save as PDF / Print</button>
        <button className={btnGhost} onClick={() => openWhatsApp(text)}>Send by WhatsApp</button>
        <LangToggle className="ml-auto" />
      </div>
      <PlanDoc p={plan} />
    </div>
  );
}
