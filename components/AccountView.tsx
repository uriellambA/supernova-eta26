"use client";
// Account page: sign in with an e-mail code (or Google), the farms of the account, sync, export and delete.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Brand } from "@/components/Brand";
import { LangToggle } from "@/components/Translator";
import { ThemeToggle } from "@/components/ui";
import { useAccount } from "@/hooks/useAccount";
import {
  configProblem, deleteAccount, deleteFarm, displayName, updateProfile, exportAccount, listFarms, newFarm, sendCode, signInWithGoogle, signOut, switchFarm, syncNow, verifyCode,
} from "@/lib/account";
import { siteById } from "@/config/sites";
import { desktopInfo } from "@/lib/desktop";
import { emptyRegister } from "@/lib/register";
import { leer } from "@/lib/storage";
import type { FarmRegister } from "@/lib/types";
import { btnGhost, btnPrimary, input, label } from "./styles";

const noop = () => () => {};
const card = "rounded-2xl border border-line bg-surface p-6";

export function AccountView() {
  const { session, sync, ready, enabled } = useAccount();
  const router = useRouter();
  const inApp = useSyncExternalStore(noop, () => !!desktopInfo(), () => false);
  const next = useSyncExternalStore(noop, () => {
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") && !n.startsWith("//") ? n : null;
  }, () => null);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [farms, setFarms] = useState<FarmRegister[]>([]);
  const [current, setCurrent] = useState<string | undefined>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // signed in and sent here by the dashboard: bring the farms, then go back
  useEffect(() => {
    if (!session || !next) return;
    let alive = true;
    syncNow().then(() => alive && router.replace(next));
    return () => { alive = false; };
  }, [session, next, router]);

  // the farm list follows each sync
  useEffect(() => {
    if (!session) return;
    let alive = true;
    Promise.all([listFarms(), leer<FarmRegister>("register")]).then(([f, r]) => {
      if (!alive) return;
      setFarms(f);
      setCurrent(r?.v.cloudId);
    });
    return () => { alive = false; };
  }, [session, sync.at]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg(ok);
    } catch (e) {
      const m = (e as Error).message;
      setMsg(/fetch|network/i.test(m) ? "No connection with the account service. Check your internet and try again." : m);
    }
    setBusy(false);
  };

  const download = () => run(async () => {
    const data = await exportAccount();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "growvia-account.json";
    a.click();
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <Brand />
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
            <Link href={next ?? "/app"} className={btnGhost}>Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <div>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">Your account</h1>
          <p className="mt-2 text-ink-2">Your farms and your sessions with Growwy, on every device.</p>
        </div>

        {!ready ? (
          <div className={card}><p className="text-sm text-muted">Loading…</p></div>
        ) : !enabled ? (
          <div className={card}><p className="text-sm text-muted">Accounts are not turned on yet on this server.</p>
            {configProblem && (
              <p className="mt-2 text-xs text-subtle" data-no-translate>
                {`setup: ${configProblem.problem} · ${configProblem.seen.length ? `variables: ${configProblem.seen.join(", ")}` : "no SUPABASE variables on the server"}`}
              </p>
            )}{next && <Link href={next} className={`${btnPrimary} mt-4`}>Continue without an account</Link>}</div>
        ) : !session ? (
          <div className={card}>
            <h2 className="font-serif text-2xl">Sign in or create your account</h2>
            <p className="mt-1 text-sm text-muted">No password: we send you a code by e-mail.</p>
            {!sent ? (
              <form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); run(() => sendCode(email.trim()).then(() => setSent(true))); }}>
                <label className={label}>E-mail<input className={input} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                <button className={btnPrimary} disabled={busy || !email.includes("@")}>Send me a code</button>
              </form>
            ) : (
              <form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); run(() => verifyCode(email.trim(), code)); }}>
                <p className="text-sm text-ink-2">{`We sent a code to ${email}. Type it here (or open the link in the e-mail).`}</p>
                <label className={label}>Code<input className={`${input} tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={10} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" /></label>
                <button className={btnPrimary} disabled={busy || code.length < 6}>Sign in</button>
                <button type="button" className="text-left text-xs text-muted hover:text-ink" onClick={() => { setSent(false); setCode(""); }}>Use another e-mail</button>
              </form>
            )}
            {!inApp && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-subtle"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
                <button className={`${btnGhost} w-full`} disabled={busy} onClick={() => run(signInWithGoogle)}>Continue with Google</button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className={`${card} flex flex-wrap items-center gap-3`}>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-cta text-lg font-semibold text-cta-ink" data-no-translate>{(displayName(session)[0] ?? "?").toUpperCase()}</span>
              <div className="min-w-0">
                <div className="truncate font-serif text-2xl leading-tight" data-no-translate>{displayName(session)}</div>
                <div className="truncate text-sm text-muted" data-no-translate>{session.user.email}</div>
                <div className="text-xs text-muted">
                  {sync.status === "syncing" ? "Syncing…" : sync.status === "error" ? `Sync failed: ${sync.error}` : sync.at ? `Synced at ${new Date(sync.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Signed in"}
                </div>
              </div>
              <div className="ml-auto flex gap-2">
                <button className={btnGhost} disabled={busy || sync.status === "syncing"} onClick={() => run(syncNow)}>Sync now</button>
                <button className={btnGhost} onClick={() => run(signOut)}>Sign out</button>
              </div>
            </div>

            <ProfileCard key={session.user.id} name={displayName(session)} onSave={(name) => run(() => updateProfile({ name }), "Profile saved.")} busy={busy} />

            <div className={card}>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl">Your farms</h2>
                <button className={`${btnPrimary} ml-auto`} onClick={() => run(async () => { await newFarm(emptyRegister()); router.push("/register?next=%2Fapp"); })}>+ New farm</button>
              </div>
              {farms.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No farms yet. Register your farm and it will appear here.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {farms.map((f) => (
                    <li key={f.cloudId} className="flex flex-wrap items-center gap-2 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium" data-no-translate>{f.farmName}</div>
                        <div className="text-xs text-muted">{`${siteById(f.siteId).name} · ${f.plots.reduce((s, p) => s + (p.areaHa || 0), 0) || f.boundaryHa || "—"} ha`}</div>
                      </div>
                      {f.cloudId === current ? (
                        <span className="rounded-full bg-green-bg px-2.5 py-0.5 text-xs font-medium text-green-fg">On this device</span>
                      ) : (
                        <button className={btnGhost} onClick={() => run(async () => { await switchFarm(f); router.push("/app"); })}>Open</button>
                      )}
                      <button className="px-2 text-xs text-muted hover:text-red-fg" onClick={() => { if (confirm(`Delete "${f.farmName}" from your account?`)) run(async () => { await deleteFarm(f); setFarms((x) => x.filter((y) => y.cloudId !== f.cloudId)); }); }}>Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={card}>
              <h2 className="font-serif text-2xl">Your data</h2>
              <p className="mt-1 text-sm text-muted">Only you can see your farms and sessions. You can take them with you or delete them whenever you want.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={btnGhost} disabled={busy} onClick={download}>Download my data</button>
                {!confirmDelete ? (
                  <button className={`${btnGhost} text-red-fg`} onClick={() => setConfirmDelete(true)}>Delete my account</button>
                ) : (
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    This deletes your account, farms and sessions from the cloud.
                    <button className={`${btnPrimary} !bg-red-fg`} disabled={busy} onClick={() => run(deleteAccount, "Account deleted.")}>Yes, delete</button>
                    <button className={btnGhost} onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {msg && <p className="text-sm text-ink-2" role="status">{msg}</p>}

        <details className="rounded-2xl border border-line p-5 text-sm text-muted">
          <summary className="cursor-pointer font-medium text-ink">Privacy</summary>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>We keep only what you register: your e-mail, your farms and the sessions you save. Satellite and climate data are not stored.</li>
            <li>Each person can only read their own data (protected in the database itself).</li>
            <li>We do not sell or share your data. You can download it or delete it at any time from this page.</li>
            <li>Data protected under Argentina&apos;s Personal Data Protection Law 25.326.</li>
          </ul>
        </details>
      </main>
    </div>
  );
}

/** Personalize the account: the user name (by default, the part of the e-mail before the @). */
function ProfileCard({ name, onSave, busy }: { name: string; onSave: (name: string) => void; busy: boolean }) {
  const [value, setValue] = useState(name);
  const changed = value.trim() !== name && value.trim().length > 0;
  return (
    <form className={card} onSubmit={(e) => { e.preventDefault(); if (changed) onSave(value); }}>
      <h2 className="font-serif text-2xl">Your profile</h2>
      <p className="mt-1 text-sm text-muted">The name shown for you in the app.</p>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className={`${label} min-w-0 flex-1`}>User name
          <input className={input} value={value} maxLength={60} onChange={(e) => setValue(e.target.value)} autoComplete="nickname" />
        </label>
        <button className={btnPrimary} disabled={busy || !changed}>Save</button>
      </div>
    </form>
  );
}
