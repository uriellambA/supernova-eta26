"use client";
import Link from "next/link";
import { DownloadButton } from "@/components/DownloadButton";

/** Phones: a fixed bar with the two main actions, always under the thumb. */
export function MobileBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-line bg-canvas/95 p-3 backdrop-blur sm:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <Link href="/app?ask=" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cta py-3 text-sm font-semibold text-cta-ink">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 6h16v10H8l-4 4V6Z" /></svg>
        Talk with Growwy
      </Link>
      <DownloadButton ghost className="!px-3" />
    </div>
  );
}
