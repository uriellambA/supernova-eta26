"use client";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/config/app";
import { useOnline } from "@/hooks/useOnline";

export function Encabezado() {
  const online = useOnline();
  return (
    <header className="sticky top-0 z-[1000] border-b border-emerald-900/10 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-sky-700 text-lg text-white shadow">🛰️</span>
          <span className="leading-tight">
            <span className="block font-extrabold text-slate-900">{APP_NAME}</span>
            <span className="block text-xs text-slate-500">{APP_TAGLINE}</span>
          </span>
        </Link>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${online ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
          title={online ? "Con conexión" : "Sin conexión: mostrando datos guardados"}
        >
          <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-red-500"}`} />
          {online ? "Conectado" : "Sin conexión"}
        </span>
      </div>
    </header>
  );
}
