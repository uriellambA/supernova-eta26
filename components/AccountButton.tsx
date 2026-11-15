"use client";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import { btnGhost } from "./styles";

/** Header button: "Sign in", or the person's initial with the sync state. Hidden while accounts are not set up. */
export function AccountButton() {
  const { session, sync, enabled } = useAccount();
  if (!enabled) return null;
  const email = session?.user.email ?? "";
  const dot = sync.status === "error" ? "bg-red-fg" : sync.status === "syncing" ? "bg-amber-fg animate-pulse" : "bg-green-fg";
  return session ? (
    <Link href="/account" className={`${btnGhost} gap-2`} title={email} aria-label="My account">
      <span className="relative grid h-6 w-6 place-items-center rounded-full bg-ink text-xs font-semibold text-canvas" data-no-translate>
        {(email[0] ?? "?").toUpperCase()}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${dot}`} />
      </span>
      <span className="hidden xl:inline">Account</span>
    </Link>
  ) : (
    <Link href="/account" className={btnGhost}>Sign in</Link>
  );
}
