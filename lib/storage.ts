import { get, set } from "idb-keyval";

// IndexedDB: guarda chacras y últimos resultados para el modo offline.
export const claveChacra = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

export async function guardar<T>(clave: string, valor: T) {
  try {
    await set(clave, { t: Date.now(), v: valor });
  } catch {
    /* modo privado o sin IndexedDB: la app sigue funcionando */
  }
}

export async function leer<T>(clave: string): Promise<{ t: number; v: T } | null> {
  try {
    return ((await get(clave)) as { t: number; v: T } | undefined) ?? null;
  } catch {
    return null;
  }
}
