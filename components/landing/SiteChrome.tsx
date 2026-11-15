// Header and footer shared by the landing, "About Growwy" and "About us".
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { DownloadButton } from "@/components/DownloadButton";
import { btnGhost } from "@/components/styles";
import { LangToggle } from "@/components/Translator";
import { ThemeToggle } from "@/components/ui";
import { APP_NAME } from "@/config/app";
import { LandingKeys } from "./LandingKeys";

export function SiteHeader() {
  return (
    <>
      <LandingKeys />
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Brand />
          <nav className="hidden gap-1 text-sm text-muted md:flex">
            <Link href="/#try" className="rounded-lg px-2 py-1 hover:text-ink">Try it</Link>
            <Link href="/growwy" className="rounded-lg px-2 py-1 hover:text-ink">About Growwy</Link>
            <Link href="/about" className="rounded-lg px-2 py-1 hover:text-ink">About us</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
            <span className="hidden sm:block"><DownloadButton /></span>
            <span className="hidden lg:block"><Link href="/app" className={btnGhost}>Open dashboard <kbd>D</kbd></Link></span>
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-3 px-4 py-6 text-xs text-subtle sm:px-6">
          <span className="font-serif text-base text-ink">{APP_NAME}</span>
          <span>Smarter crop rotations for resilient soil · Los Antiguos, Santa Cruz · Supernovas ETA26</span>
          <span className="ml-auto">Values to validate with local experts</span>
        </div>
      </footer>
  );
}
