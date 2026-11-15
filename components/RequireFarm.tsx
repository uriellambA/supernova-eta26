"use client";
// The dashboard needs a registered farm: without one, go to the register first (and come back after).
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { leer } from "@/lib/storage";
import type { FarmRegister } from "@/lib/types";

export const farmIsRegistered = (r: FarmRegister | null | undefined) => !!r?.farmName?.trim();

export function RequireFarm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    leer<FarmRegister>("register").then((r) => {
      if (!alive) return;
      if (farmIsRegistered(r?.v)) return setOk(true);
      // keep the question / site that came with the link, to continue after registering
      const next = window.location.pathname + window.location.search;
      router.replace(`/register?next=${encodeURIComponent(next)}`);
    });
    return () => {
      alive = false;
    };
  }, [router]);
  if (!ok) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />Growvia</span>
      </div>
    );
  }
  return <>{children}</>;
}
