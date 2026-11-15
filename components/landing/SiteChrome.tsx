// Header and footer shared by the landing, "About Growwy" and "About us".
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { DownloadButton } from "@/components/DownloadButton";
import { LangToggle } from "@/components/Translator";
import { ThemeToggle } from "@/components/ui";
import { APP_NAME } from "@/config/app";
import { RELEASES_URL } from "@/config/downloads";
import { LandingKeys } from "./LandingKeys";
import { SignInButton } from "./SignInButton";

const REPO_URL = RELEASES_URL.replace(/\/releases\/latest$/, "");

export function SiteHeader() {
  return (
    <>
      <LandingKeys />
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Brand />
          <nav className="hidden gap-1 text-sm text-muted md:flex">
            <Link href="/" className="rounded-lg px-2 py-1 hover:text-ink">Home</Link>
            <Link href="/growwy" className="rounded-lg px-2 py-1 hover:text-ink">About Growwy</Link>
            <Link href="/about" className="rounded-lg px-2 py-1 hover:text-ink">About us</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <span className="hidden sm:block"><DownloadButton ghost /></span>
            <SignInButton />
          </div>
        </div>
      </header>
      {/* theme switch: bottom left, out of the way (above the phone action bar) */}
      <div className="fixed bottom-20 left-4 z-40 sm:bottom-5 sm:left-5"><ThemeToggle /></div>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-sm text-muted sm:px-6">
        <span className="font-serif text-xl text-ink">{APP_NAME}</span>
        <Link href="/" className="hover:text-ink">Home</Link>
        <Link href="/growwy" className="hover:text-ink">About Growwy</Link>
        <Link href="/about" className="hover:text-ink">About us</Link>
        <a href={REPO_URL} target="_blank" rel="noopener" className="hover:text-ink">Code</a>
        <span className="text-xs text-subtle sm:ml-auto">© 2026 Supernovas ETA26 · NASA Space Apps 2026</span>
      </div>
    </footer>
  );
}
