import Link from "next/link";
import { APP_NAME } from "@/config/app";

/** Growvia mark (hand + satellite) next to the wordmark. Works in server and client components. */
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label={APP_NAME}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static mark */}
      <img src="/brand/growvia-mark-128.png" alt="" width={32} height={32} className="h-8 w-8" />
      <span className="font-serif text-2xl leading-none tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
