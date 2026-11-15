"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { detectPlatform, type Platform } from "@/config/downloads";
import { btnGhost, btnPrimary } from "./styles";

const noop = () => () => {};
const LABEL: Record<Platform, string> = {
  windows: "Download Growvia Desktop",
  mac: "Download Growvia Desktop",
  linux: "Download Growvia Desktop",
  android: "Download for Android",
  iphone: "Install on iPhone",
};

/** The official-app button: "Download Growvia Desktop" on computers, the APK on Android, the web app on iPhone. */
export function DownloadButton({ size = "md", ghost = false, className = "" }: { size?: "md" | "lg"; ghost?: boolean; className?: string }) {
  const p = useSyncExternalStore(noop, () => detectPlatform(navigator.userAgent, navigator.platform), () => "windows" as Platform);
  return (
    <Link href={`/download#${p}`} className={`${ghost ? btnGhost : btnPrimary} ${size === "lg" ? "px-5 py-3" : ""} ${className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
      </svg>
      <span className="whitespace-nowrap">{LABEL[p]}</span>
    </Link>
  );
}
