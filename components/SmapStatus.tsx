"use client";
import { useEffect, useState } from "react";

type Status = { ok: boolean; layer?: string; date?: string; decoding?: string; reason?: string };

/** Shown while the salinity filter is on: which SMAP data is on the map, or why it is empty. */
export function SmapStatus() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/smap/status").then((r) => r.json()).then((j) => alive && setS(j)).catch(() => alive && setS({ ok: false, reason: "Could not reach the server." }));
    return () => { alive = false; };
  }, []);
  if (!s) return <div className="px-4 pb-2 text-[11px] text-muted">Loading SMAP soil moisture…</div>;
  return (
    <div className={`px-4 pb-2 text-[11px] ${s.ok ? "text-muted" : "text-amber-fg"}`}>
      {s.ok
        ? `SMAP soil moisture ${s.date} · 9 km · green = low salinity risk, red = high. ${s.decoding === "color-ramp" ? "Values read from the color ramp (approximate)." : ""}`
        : `Salinity layer unavailable: ${s.reason}`}
    </div>
  );
}
