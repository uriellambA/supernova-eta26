import Link from "next/link";
import { btnPrimary } from "@/components/styles";

/** The way into the dashboard (always "Dashboard"; the farm data is loaded from inside it). */
export function SignInButton({ className = "" }: { className?: string }) {
  return <Link href="/app" className={`${btnPrimary} ${className}`} data-no-translate>Dashboard</Link>;
}
