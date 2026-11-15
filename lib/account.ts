"use client";
// Optional accounts (Supabase, open source): the farm register and the saved Growwy sessions follow the person
// to any device. Without an account, or without internet, everything keeps working on the device as before.
// Sign-in is by e-mail code (works inside the desktop / Android apps too) or Google (in the browser).
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { listSessions, type SavedSession } from "./session";
import { guardar, leer, onSaved } from "./storage";
import type { FarmRegister } from "./types";

// Where the accounts live. Taken from the page build when present; otherwise asked to our server, which reads its
// environment at request time (so the keys work with or without the NEXT_PUBLIC_ prefix).
const BUILD_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const BUILD_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "").trim();
type Config = { url: string; key: string } | null;
let config: Promise<Config> | null = null;
function getConfig(): Promise<Config> {
  config ??= BUILD_URL && BUILD_KEY
    ? Promise.resolve({ url: BUILD_URL, key: BUILD_KEY })
    : fetch("/api/account-config", { cache: "no-store" }).then((r) => r.json()).then((j) => (j?.enabled ? { url: j.url, key: j.key } : null)).catch(() => null);
  return config;
}

let client: Promise<SupabaseClient> | null = null;
/** The Supabase client, loaded only when accounts are used. */
export function cloud(): Promise<SupabaseClient> {
  client ??= getConfig().then(async (c) => {
    if (!c) throw new Error("Accounts are not set up yet");
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce", storageKey: "growvia-auth" } });
  });
  return client;
}

// ---------- state shared with the screens ----------
export type SyncState = { status: "off" | "idle" | "syncing" | "ok" | "error"; at?: number; error?: string };
/** enabled: accounts are set up on this server (false until known). ready: we know who is signed in. */
export type AccountState = { session: Session | null; sync: SyncState; ready: boolean; enabled: boolean };
let state: AccountState = { session: null, sync: { status: "off" }, ready: false, enabled: false };
const subs = new Set<() => void>();
const emit = (patch: Partial<AccountState>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
export const accountSnapshot = () => state;
export function subscribeAccount(f: () => void) {
  subs.add(f);
  start();
  return () => { subs.delete(f); };
}

let started = false;
/** Reads the saved login once and keeps the device in sync while the person is signed in. */
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  getConfig().then((c) => {
    if (!c) return emit({ ready: true, enabled: false });
    emit({ enabled: true, sync: { status: "idle" } });
    watchSaves();
    return cloud().then(async (sb) => {
      const { data } = await sb.auth.getSession();
      emit({ session: data.session, ready: true });
      if (data.session) syncNow();
      sb.auth.onAuthStateChange((event, session) => {
        emit({ session });
        if (event === "SIGNED_IN") syncNow();
      });
    });
  }).catch(() => emit({ ready: true }));
}

// ---------- sign in / out ----------
export async function sendCode(email: string) {
  const sb = await cloud();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${location.origin}/account` } });
  if (error) throw error;
}
export async function verifyCode(email: string, code: string) {
  const sb = await cloud();
  const { data, error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: "email" });
  if (error) throw error;
  emit({ session: data.session });
}
export async function signInWithGoogle() {
  const sb = await cloud();
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/account${location.search}` } });
  if (error) throw error;
}
export async function signOut() {
  const sb = await cloud();
  await sb.auth.signOut();
  emit({ session: null, sync: { status: "idle" } });
}

// ---------- farms ----------
type FarmRow = { id: string; name: string; data: FarmRegister; updated_at: string };
const time = (s?: string) => (s ? Date.parse(s) || 0 : 0);

async function upsertFarm(sb: SupabaseClient, r: FarmRegister): Promise<FarmRegister> {
  const row = { name: r.farmName, data: { ...r, cloudId: undefined }, updated_at: r.updated || new Date().toISOString() };
  if (r.cloudId) {
    const { error } = await sb.from("farms").update(row).eq("id", r.cloudId);
    if (error) throw error;
    return r;
  }
  const { data, error } = await sb.from("farms").insert(row).select("id").single();
  if (error) throw error;
  return { ...r, cloudId: data.id as string };
}

/** The farms of the account (cached on the device for the farm switcher). */
export async function listFarms(): Promise<FarmRegister[]> {
  return (await leer<FarmRegister[]>("farms"))?.v ?? [];
}

let syncing: Promise<void> | null = null;
/** Two-way sync: the newest copy of each farm wins; saved sessions are merged. */
export function syncNow(): Promise<void> {
  syncing ??= (async () => {
    if (!state.session) return;
    emit({ sync: { status: "syncing" } });
    try {
      const sb = await cloud();
      const { data, error } = await sb.from("farms").select("id,name,data,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as FarmRow[];
      const toLocal = (row: FarmRow): FarmRegister => ({ ...row.data, cloudId: row.id, updated: row.data.updated || row.updated_at });

      let local = (await leer<FarmRegister>("register"))?.v ?? null;
      const named = !!local?.farmName?.trim();
      if (local && named) {
        const row = local.cloudId ? rows.find((x) => x.id === local!.cloudId) : undefined;
        if (local.cloudId && !row) local = { ...local, cloudId: undefined }; // deleted elsewhere: upload again
        if (row && time(row.data.updated || row.updated_at) > time(local.updated)) {
          local = toLocal(row);
          await guardarSilent("register", local);
          farmChanged();
        } else {
          local = await upsertFarm(sb, local);
          await guardarSilent("register", local);
        }
      } else if (rows.length) {
        local = toLocal(rows[0]); // new device: bring the most recent farm
        await guardarSilent("register", local);
        farmChanged();
      }
      const farms = rows.map(toLocal).map((f) => (local && f.cloudId === local.cloudId ? local : f));
      if (local?.cloudId && !farms.some((f) => f.cloudId === local!.cloudId)) farms.unshift(local);
      await guardarSilent("farms", farms);

      // sessions: union by id
      const { data: srows, error: serr } = await sb.from("saved_sessions").select("id,data");
      if (serr) throw serr;
      const remote = new Map((srows ?? []).map((x) => [x.id as string, x.data as SavedSession]));
      const mine = await listSessions();
      const missing = mine.filter((s) => !remote.has(s.id));
      if (missing.length) {
        const { error: ierr } = await sb.from("saved_sessions").upsert(missing.map((s) => ({ id: s.id, data: s })));
        if (ierr) throw ierr;
      }
      const merged = [...mine, ...[...remote.values()].filter((s) => !mine.some((m) => m.id === s.id))]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
      await guardarSilent("sessions", merged);
      emit({ sync: { status: "ok", at: Date.now() } });
    } catch (e) {
      emit({ sync: { status: "error", error: (e as Error).message } });
    }
  })().finally(() => { syncing = null; });
  return syncing;
}

/** Tells the open dashboard that the farm on this device changed (brought from the account or switched). */
export const FARM_CHANGED = "growvia:farm-changed";
const farmChanged = () => window.dispatchEvent(new Event(FARM_CHANGED));

// saves made by the sync itself must not trigger another upload
let quiet = false;
async function guardarSilent<T>(k: string, v: T) {
  quiet = true;
  try { await guardar(k, v); } finally { quiet = false; }
}

// every change to the register or the sessions on this device is sent to the account (a moment later)
let timer: ReturnType<typeof setTimeout> | null = null;
function watchSaves() {
  onSaved((k) => {
    if (quiet || !state.session || (k !== "register" && k !== "sessions")) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { syncNow(); }, 2500);
  });
}

/** Switch the dashboard to another farm of the account. */
export async function switchFarm(f: FarmRegister) {
  await guardarSilent("register", f);
  await guardar("site", f.siteId);
  farmChanged();
}

/** Start a new farm: the current one stays in the account; the register opens empty. */
export async function newFarm(empty: FarmRegister) {
  await guardarSilent("register", empty);
}

export async function deleteFarm(f: FarmRegister) {
  const sb = await cloud();
  if (f.cloudId) {
    const { error } = await sb.from("farms").delete().eq("id", f.cloudId);
    if (error) throw error;
  }
  const farms = (await listFarms()).filter((x) => x.cloudId !== f.cloudId);
  await guardarSilent("farms", farms);
  const cur = (await leer<FarmRegister>("register"))?.v;
  if (cur?.cloudId === f.cloudId) await guardarSilent("register", farms[0] ?? { ...cur, cloudId: undefined, farmName: "" });
}

/** Everything the account holds, as a JSON file. */
export async function exportAccount() {
  const sb = await cloud();
  const [{ data: farms }, { data: sessions }] = await Promise.all([sb.from("farms").select("*"), sb.from("saved_sessions").select("*")]);
  return { exported: new Date().toISOString(), email: state.session?.user.email, farms, sessions };
}

/** Deletes the account and all its data in the cloud (the copy on this device stays until the browser data is cleared). */
export async function deleteAccount() {
  const sb = await cloud();
  const { error } = await sb.rpc("delete_my_account");
  if (error) throw error;
  await sb.auth.signOut();
  const cur = (await leer<FarmRegister>("register"))?.v;
  if (cur) await guardarSilent("register", { ...cur, cloudId: undefined });
  await guardarSilent("farms", []);
  emit({ session: null, sync: { status: "idle" } });
}
