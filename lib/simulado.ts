// SIMULATED data, only for offline development (MOCK_DATA=1). Never for the demo.
import { calcularIndicadores } from "./agro";
import { resumenNdvi } from "./nasa";
import { soilReference } from "./soil";
import type { ClimaResumen, DiarioClima, NieveResumen } from "./types";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const ruido = (r: () => number) => (r() + r() + r() - 1.5) * 2;

export function diarioSimulado(lat: number, lon: number): DiarioClima {
  const r = rng(Math.round(Math.abs(lat * 100 + lon * 10) * 1000) >>> 0);
  const d: DiarioClima = { fechas: [], tmin: [], tmax: [], lluvia: [], viento: [], humedadRaiz: [], humedadSup: [] };
  const fin = new Date().getUTCFullYear() - 1;
  for (let t = Date.UTC(fin - 19, 0, 1); t <= Date.UTC(fin, 11, 31); t += 86_400_000) {
    const f = new Date(t);
    const dia = (t - Date.UTC(f.getUTCFullYear(), 0, 1)) / 86_400_000;
    const est = Math.cos((2 * Math.PI * (dia - 20)) / 365); // 1 in January, −1 in July
    const verano = (est + 1) / 2;
    d.fechas.push(f.toISOString().slice(0, 10));
    d.tmin.push(+(2.5 + 5.5 * est + ruido(r) * 1.6).toFixed(1));
    d.tmax.push(+(14 + 9 * est + ruido(r) * 2).toFixed(1));
    d.lluvia.push(r() < 0.07 ? +(r() * 9).toFixed(1) : 0);
    d.viento.push(+(4 + 2.5 * verano + r() * 2.5).toFixed(1));
    d.humedadRaiz.push(+(0.42 - 0.12 * verano + r() * 0.04).toFixed(2));
    d.humedadSup.push(+(0.38 - 0.16 * verano + r() * 0.06).toFixed(2));
  }
  return d;
}

export const indicadoresSimulados = (lat: number, lon: number) => ({ ...calcularIndicadores(diarioSimulado(lat, lon), lat, lon), simulado: true });

export function ndviSimulado() {
  const serie = [];
  const hoy = Date.now();
  for (let i = 45; i >= 0; i--) {
    const t = hoy - i * 16 * 86_400_000;
    const f = new Date(t);
    const dia = (t - Date.UTC(f.getUTCFullYear(), 0, 1)) / 86_400_000;
    serie.push({ fecha: f.toISOString().slice(0, 10), ndvi: +(0.4 + 0.25 * Math.cos((2 * Math.PI * (dia - 30)) / 365)).toFixed(3) });
  }
  return { ...resumenNdvi(serie), simulado: true };
}

export function climaSimulado(): ClimaResumen {
  const r = rng(42);
  const dias = [];
  for (let i = -10; i < 16; i++) {
    dias.push({
      fecha: new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
      tmin: +(4 + ruido(r) * 2.5 - (i === 3 ? 5 : 0)).toFixed(1),
      tmax: +(18 + ruido(r) * 3).toFixed(1),
      lluvia: r() < 0.12 ? +(r() * 6).toFixed(1) : 0,
      rafagas: +(35 + r() * 45).toFixed(0),
      viento: +(18 + r() * 20).toFixed(0),
      et0: +(3.5 + r() * 2.5).toFixed(1),
      horaMin: "06:00",
      pasado: i < 0,
    });
  }
  return { simulado: true, elevacion: 225, dias };
}

export function nieveSimulada(): NieveResumen {
  const serie = Array.from({ length: 21 }, (_, k) => ({ anio: 2006 + k, cm: Math.round(260 + 90 * Math.sin(k * 1.7)) }));
  const prom = serie.slice(0, -1).reduce((s, x) => s + x.cm, 0) / 20;
  serie[20].cm = Math.round(prom * 0.78);
  return {
    simulado: true,
    hasta: new Date().toISOString().slice(0, 10),
    cuencas: [{ id: "los-antiguos", nombre: "Upper Los Antiguos river watershed", temporada: 2026, actualCm: serie[20].cm, promedioCm: Math.round(prom), pct: 0.78, serie }],
    indice: 0.78,
  };
}

export const soilSimulado = () => ({ ...soilReference(), simulado: true });
