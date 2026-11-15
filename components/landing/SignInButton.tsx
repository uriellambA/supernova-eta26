"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { farmIsRegistered } from "@/components/RequireFarm";
import { btnPrimary } from "@/components/styles";
import { leer } from "@/lib/storage";
import type { FarmRegister } from "@/lib/types";

/** The way into the dashboard: register your farm (or, once registered on this device, "My dashboard"). */
export function SignInButton({ className = "" }: { className?: string }) {
  const [registered, setRegistered] = useState(false);
  useEffect(() => {
    let alive = true;
    leer<FarmRegister>("register").then((r) => alive && setRegistered(farmIsRegistered(r?.v)));
    return () => { alive = false; };
  }, []);
  return registered
    ? <Link href="/app" className={`${btnPrimary} ${className}`}>My dashboard</Link>
    : <Link href="/register?next=%2Fapp" className={`${btnPrimary} ${className}`}>Register farm</Link>;
}
