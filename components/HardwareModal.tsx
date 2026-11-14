"use client";
import { useState } from "react";
import type { GroundReading } from "@/lib/types";
import { btnGhost, btnPrimary, input } from "./ui";

const KIT = [
  ["🌡️", "Soil moisture + temperature probe", "Capacitive sensor at 20 and 40 cm"],
  ["🌬️", "Air temperature & humidity", "Detects frost at canopy height, not just regionally"],
  ["🌧️", "Rain gauge", "Tipping bucket, 0.2 mm resolution"],
  ["📡", "LoRa radio + solar panel", "Up to ~5 km to a farm gateway, runs all year"],
];

export function HardwareModal({ open, onClose, readings, addReading }: { open: boolean; onClose: () => void; readings: GroundReading[]; addReading: (r: GroundReading) => void }) {
  const [moisture, setMoisture] = useState("");
  const [temp, setTemp] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 print:hidden" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Field hardware" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-white">🔌 Growvia Field Node</h2>
          <button className="ml-auto rounded-full px-2 text-2xl leading-none text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="mt-1 text-sm text-slate-300">
          Satellites see the whole valley; a small sensor sees your field. Combining both corrects the regional data for your exact spot
          (low spots that freeze first, sandy patches that dry out faster).
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {KIT.map(([e, t, d]) => (
            <div key={t} className="rounded-xl bg-white/[0.04] p-3">
              <div className="text-xl">{e}</div>
              <div className="text-sm font-semibold text-white">{t}</div>
              <div className="text-xs text-slate-400">{d}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Built on open hardware (ESP32 microcontroller). Estimated cost: under USD 150 per node. One node per management zone is enough.</p>

        <div className="mt-5 rounded-2xl border border-white/10 p-3">
          <div className="text-sm font-semibold text-white">Add a ground reading</div>
          <p className="text-xs text-slate-400">No sensor yet? Enter a reading from any soil probe or thermometer.</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="text-[11px] text-slate-400">Soil moisture (%)<input type="number" min={0} max={60} className={input} value={moisture} onChange={(e) => setMoisture(e.target.value)} /></label>
            <label className="text-[11px] text-slate-400">Soil temp (°C)<input type="number" min={-10} max={40} className={input} value={temp} onChange={(e) => setTemp(e.target.value)} /></label>
            <button
              className={`${btnPrimary} col-span-2 self-end sm:col-span-1`}
              disabled={!moisture && !temp}
              onClick={() => {
                addReading({ date: new Date().toISOString().slice(0, 10), moisture: moisture ? Number(moisture) : null, soilTemp: temp ? Number(temp) : null });
                setMoisture("");
                setTemp("");
              }}
            >
              Save reading
            </button>
          </div>
          {readings.length > 0 && (
            <ul className="mt-3 divide-y divide-white/5 text-xs text-slate-300">
              {readings.slice(-5).reverse().map((r, i) => (
                <li key={i} className="flex justify-between py-1.5"><span>{r.date}</span><span>{r.moisture !== null ? `${r.moisture}% moisture` : ""} {r.soilTemp !== null ? `· ${r.soilTemp} °C` : ""}</span></li>
              ))}
            </ul>
          )}
        </div>
        <button className={`${btnGhost} mt-4 w-full`} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
