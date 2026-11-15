"use client";
import Link from "next/link";
import { btnPrimary } from "@/components/styles";
import { useAccount } from "@/hooks/useAccount";

/** The way into the dashboard: sign in (or, once signed in, "My dashboard"). */
export function SignInButton({ className = "" }: { className?: string }) {
  const { session, enabled, ready } = useAccount();
  if (session) return <Link href="/app" className={`${btnPrimary} ${className}`}>My dashboard</Link>;
  return <Link href={enabled || !ready ? "/account?next=%2Fapp" : "/app"} className={`${btnPrimary} ${className}`}>Sign in</Link>;
}
