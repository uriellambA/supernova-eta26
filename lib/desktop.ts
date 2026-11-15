// Growvia Desktop (the Rust/Tauri app) loads this same web app. These helpers let the web use what the app adds.
type Tauri = { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
type DesktopInfo = { version: string; platform: string };

const w = () => (typeof window === "undefined" ? null : (window as unknown as { __GROWVIA_DESKTOP__?: DesktopInfo; __TAURI_INTERNALS__?: Tauri }));

/** Running inside Growvia Desktop? (set by the app before the page loads) */
export const desktopInfo = (): DesktopInfo | null => w()?.__GROWVIA_DESKTOP__ ?? null;

async function call(cmd: string, args?: Record<string, unknown>) {
  const t = w()?.__TAURI_INTERNALS__;
  if (!t) return false;
  try {
    await t.invoke(cmd, args);
    return true;
  } catch {
    return false;
  }
}

/** Print / save as PDF: the system dialog in the desktop app, the browser one on the web. */
export async function printPage() {
  if (!(await call("print_page"))) window.print();
}

/** Opens a link outside the app (system browser) when in the desktop app; a new tab on the web. */
export async function openExternal(url: string) {
  if (!(await call("open_external", { url }))) window.open(url, "_blank", "noopener");
}
