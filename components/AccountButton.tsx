"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "@/hooks/useAccount";
import { displayName } from "@/lib/account";
import { btnGhost } from "./styles";

/** Header button, always top right: the person's name and initial (with the sync state), or "Sign in". */
export function AccountButton() {
  const { session, sync, enabled, ready } = useAccount();
  const path = usePathname();
  if (!ready) return <span className={`${btnGhost} w-24 opacity-0`} aria-hidden />;
  const name = displayName(session);
  const dot = sync.status === "error" ? "bg-red-fg" : sync.status === "syncing" ? "bg-amber-fg animate-pulse" : "bg-green-fg";
  if (!session) {
    return <Link href={`/account?next=${encodeURIComponent(path || "/app")}`} className={btnGhost}>{enabled ? "Sign in" : "Account"}</Link>;
  }
  return (
    <Link href="/account" className={`${btnGhost} gap-2 !pl-1.5`} title={session.user.email ?? ""} aria-label="My account">
      <span className="relative grid h-7 w-7 place-items-center rounded-full bg-cta text-xs font-semibold text-cta-ink" data-no-translate>
        {(name[0] ?? "?").toUpperCase()}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${dot}`} />
      </span>
      <span className="hidden max-w-32 truncate sm:inline" data-no-translate>{name}</span>
    </Link>
  );
}
