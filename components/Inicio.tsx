"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { REGION } from "@/config/regions/alto-valle";
import type { Zona } from "@/lib/types";
import { Cargando, botonPrimario } from "./ui";

const Mapa = dynamic(() => import("./MapaLeaflet"), { ssr: false, loading: () => <Cargando texto="Cargando mapa…" /> });

export function Inicio() {
  const [punto, setPunto] = useState<[number, number] | null>(null);
  const [zona, setZona] = useState<Zona | null>(null);

  const elegirZona = (z: Zona) => {
    setZona(z);
    setPunto([z.lat, z.lon]);
  };
  const nombre = zona ? zona.nombre : punto ? "Mi chacra" : "";
  const href = punto ? `/chacra?lat=${punto[0]}&lon=${punto[1]}&n=${encodeURIComponent(nombre)}${zona ? `&zona=${zona.id}` : ""}` : "#";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5">
      <section className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">🍐 {REGION.nombre}</p>
        <h1 className="mt-1 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">¿Dónde está tu chacra?</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Tocá el mapa sobre tu chacra o elegí una zona. Vas a ver <b>20 años de heladas medidas por NASA</b>, el <b>pronóstico</b>,
          cuánta <b>nieve</b> hay en la cordillera para el riego, y la IA te dice <b>qué te conviene cultivar</b>.
        </p>
      </section>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {REGION.zonas.map((z) => (
          <button
            key={z.id}
            onClick={() => elegirZona(z)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${zona?.id === z.id ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"}`}
            title={z.perfil}
          >
            {z.demo ? "⭐ " : ""}
            {z.nombre}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <Mapa
          punto={punto}
          zonaId={zona?.id ?? null}
          onPick={(lat, lon) => {
            setPunto([lat, lon]);
            setZona(null);
          }}
          onZona={elegirZona}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Capas de NASA (MODIS color real, NDVI y nieve) en el botón de capas del mapa, arriba a la derecha. ⭐ = chacras de la demo.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["🛰️", "Datos de NASA", "Heladas de 20 años, horas de frío, calor y verdor del lote (POWER y MODIS)."],
          ["👨‍🌾", "Lo que vos sabés", "Contale a la IA, escribiendo o hablando, cómo es tu chacra: riego, suelo, el bajo que se hiela."],
          ["🌦️", "El pronóstico", "Alertas de helada, viento y riego para los próximos 16 días (Open-Meteo)."],
        ].map(([i, t, d]) => (
          <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-2xl">{i}</div>
            <div className="mt-1 font-bold text-slate-900">{t}</div>
            <p className="text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[1000] border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            {punto ? (
              <>
                <div className="truncate font-semibold text-slate-900">📍 {nombre}</div>
                <div className="text-xs text-slate-500">{punto[0].toFixed(3)}, {punto[1].toFixed(3)}</div>
              </>
            ) : (
              <span className="text-slate-500">Tocá el mapa o elegí una zona</span>
            )}
          </div>
          <Link href={href} aria-disabled={!punto} className={`${botonPrimario} ${punto ? "" : "pointer-events-none opacity-50"}`}>
            Ver mi chacra →
          </Link>
        </div>
      </div>
    </main>
  );
}
