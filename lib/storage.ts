import { get, set } from "idb-keyval";

// IndexedDB: guarda chacras y últimos resultados para el modo offline.
// The farm register (and what comes from it) is also mirrored in localStorage: some phone browsers and
// app WebViews answer IndexedDB slowly or empty after a restart, and the farmer must not be sent back to the register.
export const claveChacra = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

const MIRROR = new Set(["register", "farm", "priorities", "site", "tour", "farms"]);

// Account sync listens to these saves (set by lib/account.ts when someone is signed in)
type SaveHook = (clave: string, valor: unknown) => void;
let hook: SaveHook | null = null;
export const onSaved = (fn: SaveHook | null) => { hook = fn; };
const LS = (k: string) => `growvia:${k}`;

function lsSet(clave: string, entry: unknown) {
  try {
    localStorage.setItem(LS(clave), JSON.stringify(entry));
  } catch {
    /* full or blocked */
  }
}
function lsGet<T>(clave: string): { t: number; v: T } | null {
  try {
    const s = localStorage.getItem(LS(clave));
    return s ? (JSON.parse(s) as { t: number; v: T }) : null;
  } catch {
    return null;
  }
}

/** IndexedDB read that gives up after ms (a stuck database must not block the app). */
function idbGet<T>(clave: string, ms = 2500): Promise<T | undefined> {
  return Promise.race([get(clave) as Promise<T | undefined>, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]).catch(() => undefined);
}

export async function guardar<T>(clave: string, valor: T) {
  const entry = { t: Date.now(), v: valor };
  if (MIRROR.has(clave)) lsSet(clave, entry);
  try {
    await set(clave, entry);
  } catch {
    /* modo privado o sin IndexedDB: la app sigue funcionando */
  }
  hook?.(clave, valor);
}

export async function leer<T>(clave: string): Promise<{ t: number; v: T } | null> {
  const mirrored = MIRROR.has(clave) ? lsGet<T>(clave) : null;
  const db = await idbGet<{ t: number; v: T }>(clave, mirrored ? 1500 : 2500);
  // the newest copy wins
  if (db && mirrored) return db.t >= mirrored.t ? db : mirrored;
  return db ?? mirrored;
}
