// DATOS SIMULADOS solo para desarrollo sin internet (MOCK_DATA=1). NUNCA usar en la demo.
import { calcularIndicadores } from "./agro";
import { resumenNdvi } from "./nasa";
import type { ClimaResumen, DiarioClima, NieveResumen } from "./types";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const ruido = (r: () => number) => (r() + r() + r() - 1.5) * 2;

export function diarioSimulado(lat: number, lon: number): DiarioClima {
  const r = rng(Math.round((lat * 100 + lon * 10) * 1000) >>> 0);
  const d: DiarioClima = { fechas: [], tmin: [], tmax: [], lluvia: [], viento: [], humedadRaiz: [] };
  const fin = new Date().getUTCFullYear() - 1;
  for (let t = Date.UTC(fin - 19, 0, 1); t <= Date.UTC(fin, 11, 31); t += 86_400_000) {
    const f = new Date(t);
    const dia = (t - Date.UTC(f.getUTCFullYear(), 0, 1)) / 86_400_000;
    const estacion = Math.cos((2 * Math.PI * (dia - 15)) / 365); // 1 en enero, −1 en julio
    d.fechas.push(f.toISOString().slice(0, 10));
    d.tmin.push(+(5 + 8.5 * estacion + ruido(r) * 1.8).toFixed(1));
    d.tmax.push(+(21 + 11 * estacion + ruido(r) * 2).toFixed(1));
    d.lluvia.push(r() < 0.08 ? +(r() * 18).toFixed(1) : 0);
    d.viento.push(+(3 + r() * 3).toFixed(1));
    d.humedadRaiz.push(+(0.3 + r() * 0.1).toFixed(2));
  }
  return d;
}

export const indicadoresSimulados = (lat: number, lon: number) => ({
  ...calcularIndicadores(diarioSimulado(lat, lon), lat, lon, "DATOS SIMULADOS (modo prueba sin internet)"),
  simulado: true,
});

export function ndviSimulado() {
  const serie = [];
  const hoy = Date.now();
  for (let i = 45; i >= 0; i--) {
    const t = hoy - i * 16 * 86_400_000;
    const f = new Date(t);
    const dia = (t - Date.UTC(f.getUTCFullYear(), 0, 1)) / 86_400_000;
    serie.push({ fecha: f.toISOString().slice(0, 10), ndvi: +(0.45 + 0.25 * Math.cos((2 * Math.PI * (dia - 20)) / 365)).toFixed(3) });
  }
  return { ...resumenNdvi(serie, "DATOS SIMULADOS (modo prueba sin internet)"), simulado: true };
}

export function climaSimulado(): ClimaResumen {
  const r = rng(42);
  const dias = [];
  for (let i = -10; i < 16; i++) {
    const f = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    dias.push({
      fecha: f,
      tmin: +(6 + ruido(r) * 3 - (i === 3 ? 7 : 0)).toFixed(1),
      tmax: +(24 + ruido(r) * 3).toFixed(1),
      lluvia: r() < 0.15 ? +(r() * 10).toFixed(1) : 0,
      rafagas: +(30 + r() * 40).toFixed(0),
      viento: +(12 + r() * 15).toFixed(0),
      et0: +(4 + r() * 2.5).toFixed(1),
      horaMin: "06:00",
      pasado: i < 0,
    });
  }
  return { fuente: "DATOS SIMULADOS (modo prueba sin internet)", simulado: true, elevacion: 250, dias };
}

export function nieveSimulada(): NieveResumen {
  const mk = (id: string, nombre: string, pct: number) => {
    const serie = Array.from({ length: 21 }, (_, k) => ({ anio: 2006 + k, cm: Math.round(300 + 120 * Math.sin(k * 1.7)) }));
    const prom = serie.slice(0, -1).reduce((s, x) => s + x.cm, 0) / 20;
    serie[20].cm = Math.round(prom * pct);
    return { id, nombre, temporada: 2026, actualCm: serie[20].cm, promedioCm: Math.round(prom), pct, serie };
  };
  return {
    fuente: "DATOS SIMULADOS (modo prueba sin internet)",
    simulado: true,
    hasta: new Date().toISOString().slice(0, 10),
    cuencas: [mk("neuquen-alta", "Alta cuenca del río Neuquén", 0.74), mk("limay-alta", "Alta cuenca del río Limay", 0.92)],
    indice: 0.81,
  };
}
