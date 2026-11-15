"use client";
import { useEffect, useState } from "react";
import { guardar, leer } from "@/lib/storage";

export type Estado<T> = { data: T | null; estado: "cargando" | "ok" | "cache" | "error"; error?: string; t?: number };

/**
 * GET con respaldo en IndexedDB: si la red falla, muestra lo último guardado (modo offline).
 * `respaldo` (optional, must be stable) gets the data another way when our server has none, before the saved copy.
 */
export function useRecurso<T>(url: string | null, respaldo?: () => Promise<T>): Estado<T> {
  const [st, setSt] = useState<Estado<T>>({ data: null, estado: "cargando" });
  useEffect(() => {
    if (!url) return;
    let vivo = true;
    const clave = `api:${url}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia el estado al cambiar la URL
    setSt({ data: null, estado: "cargando" });
    (async () => {
      try {
        const r = await fetch(url);
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error ?? `Error ${r.status}`);
        if (j?.sinDatos) throw new Error(j.motivo ?? "no data this time"); // keep the last saved values instead
        if (!vivo) return;
        setSt({ data: j as T, estado: "ok", t: Date.now() });
        guardar(clave, j);
      } catch (e) {
        if (respaldo) {
          try {
            const v = await respaldo();
            if (!vivo) return;
            setSt({ data: v, estado: "ok", t: Date.now() });
            guardar(clave, v);
            return;
          } catch (e2) {
            (e as Error).message += ` · ${(e2 as Error).message}`;
          }
        }
        const c = await leer<T>(clave);
        if (!vivo) return;
        setSt(c ? { data: c.v, estado: "cache", t: c.t, error: (e as Error).message } : { data: null, estado: "error", error: (e as Error).message });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [url, respaldo]);
  return st;
}
