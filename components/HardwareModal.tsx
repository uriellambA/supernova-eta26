"use client";
import { useEffect, useState } from "react";
import type { GroundReading } from "@/lib/types";
import { btnGhost, btnPrimary, input, label } from "./ui";

const KIT = [
  ["🌡️", "Soil moisture + temperature", "Capacitive probe at 20 and 40 cm"],
  ["🧂", "Soil salinity (EC)", "Electrical conductivity probe: salt build-up near roots"],
  ["🌬️", "Air temp, humidity & pressure", "BME280 at canopy height: local frost and pressure drops"],
  ["☀️", "UV & light", "UV index sensor for sunburn risk"],
  ["🌧️", "Rain gauge", "Tipping bucket, 0.2 mm resolution"],
  ["📡", "LoRa radio + solar panel", "Up to ~5 km to a farm gateway, runs all year"],
];

export function HardwareModal({ open, onClose, readings, addReading }: { open: boolean; onClose: () => void; readings: GroundReading[]; addReading: (r: GroundReading) => void }) {
  const [v, setV] = useState({ moisture: "", soilTemp: "", ec: "", airTemp: "", humidity: "" });
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  const num = (s: string) => (s === "" ? null : Number(s));
  const any = Object.values(v).some((x) => x !== "");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4 print:hidden" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Field hardware" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-3xl">Growvia Field Node</h2>
          <button className="ml-auto flex items-center gap-2 rounded-full px-2 text-sm text-muted hover:text-ink" onClick={onClose} aria-label="Close"><kbd>Esc</kbd> ✕</button>
        </div>
        <p className="mt-2 text-sm text-ink-2">
          Satellites see the whole valley; a small sensor sees your field. Combining both corrects the regional data for your exact spot
          (low spots that freeze first, sandy patches that dry out, salty corners).
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {KIT.map(([e, t, d]) => (
            <div key={t} className="rounded-xl border border-line p-3">
              <div className="text-xl">{e}</div>
              <div className="text-sm font-medium">{t}</div>
              <div className="text-xs text-muted">{d}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Open hardware (ESP32 microcontroller). Estimated cost: under USD 180 per node. One node per management zone is enough.</p>

        <div className="mt-6 rounded-2xl border border-line p-4">
          <div className="text-sm font-medium">Add a field reading</div>
          <p className="text-xs text-muted">No sensor yet? Enter a reading from any probe, EC meter or thermometer.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <label className={label}>Soil moisture (%)<input type="number" min={0} max={60} className={input} value={v.moisture} onChange={(e) => setV({ ...v, moisture: e.target.value })} /></label>
            <label className={label}>Soil temp (°C)<input type="number" min={-10} max={40} className={input} value={v.soilTemp} onChange={(e) => setV({ ...v, soilTemp: e.target.value })} /></label>
            <label className={label}>Salinity EC (dS/m)<input type="number" min={0} max={20} step={0.1} className={input} value={v.ec} onChange={(e) => setV({ ...v, ec: e.target.value })} /></label>
            <label className={label}>Air temp (°C)<input type="number" min={-20} max={45} className={input} value={v.airTemp} onChange={(e) => setV({ ...v, airTemp: e.target.value })} /></label>
            <label className={label}>Humidity (%)<input type="number" min={0} max={100} className={input} value={v.humidity} onChange={(e) => setV({ ...v, humidity: e.target.value })} /></label>
          </div>
          <button
            className={`${btnPrimary} mt-3 w-full`}
            disabled={!any}
            onClick={() => {
              addReading({ date: new Date().toISOString().slice(0, 10), moisture: num(v.moisture), soilTemp: num(v.soilTemp), ec: num(v.ec), airTemp: num(v.airTemp), humidity: num(v.humidity) });
              setV({ moisture: "", soilTemp: "", ec: "", airTemp: "", humidity: "" });
            }}
          >
            Save reading
          </button>
          {readings.length > 0 && (
            <ul className="mt-3 divide-y divide-line text-xs text-ink-2">
              {readings.slice(-5).reverse().map((r, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-1.5">
                  <span>{r.date}</span>
                  <span className="text-muted">
                    {[r.moisture != null && `${r.moisture}% moisture`, r.soilTemp != null && `soil ${r.soilTemp} °C`, r.ec != null && `EC ${r.ec} dS/m`, r.airTemp != null && `air ${r.airTemp} °C`, r.humidity != null && `${r.humidity}% RH`].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className={`${btnGhost} mt-4 w-full`} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
