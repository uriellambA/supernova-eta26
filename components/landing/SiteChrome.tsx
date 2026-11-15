// Header and footer shared by the landing, "About Growwy" and "About us".
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { DownloadButton } from "@/components/DownloadButton";
import { btnGhost } from "@/components/styles";
import { LangToggle } from "@/components/Translator";
import { ThemeToggle } from "@/components/ui";
import { APP_NAME, APP_TAGLINE } from "@/config/app";
import { RELEASES_URL } from "@/config/downloads";
import { SITES } from "@/config/sites";
import { LandingKeys } from "./LandingKeys";

const REPO_URL = RELEASES_URL.replace(/\/releases\/latest$/, "");

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

const col = "flex flex-col gap-2";
const head = "text-[11px] font-medium uppercase tracking-wider text-subtle";
const link = "text-muted hover:text-ink";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className={col}>
          <span className="font-serif text-2xl text-ink">{APP_NAME}</span>
          <p className="max-w-xs text-muted">{`${APP_TAGLINE}, with open NASA data and Growwy, our SI.`}</p>
          <p className="mt-1 text-xs text-subtle">NASA Space Apps Challenge 2026 · Field Shift: Adapting Farms with NASA Data</p>
        </div>
        <div className={col}>
          <span className={head}>Explore</span>
          <Link href="/#try" className={link}>Try it</Link>
          <Link href="/app" className={link}>Open dashboard</Link>
          <Link href="/growwy" className={link}>About Growwy</Link>
          <Link href="/about" className={link}>About us</Link>
        </div>
        <div className={col}>
          <span className={head}>Places</span>
          {SITES.map((s) => (
            <span key={s.id} className="text-muted">{`${s.name} · ${s.region.replace(/, Argentina$/, "")}`}</span>
          ))}
        </div>
        <div className={col}>
          <span className={head}>Open project</span>
          <Link href="/about#open-data" className={link}>Open data sources</Link>
          <a href={REPO_URL} target="_blank" rel="noopener" className={link}>Source code</a>
          <a href={RELEASES_URL} target="_blank" rel="noopener" className={link}>Downloads</a>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-4 gap-y-1 px-4 py-4 text-xs text-subtle sm:px-6">
          <span>© 2026 Supernovas ETA26</span>
          <span className="sm:ml-auto">Estimates to validate with local experts (INTA) and a soil test</span>
        </div>
      </div>
    </footer>
  );
}
