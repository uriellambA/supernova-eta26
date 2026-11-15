// Official Growvia apps. Fill each url when the installer is published (GitHub Releases, Phase 4).
// null = "coming soon": the button still works and the /download page explains the alternatives.
export type Platform = "windows" | "mac" | "linux" | "android" | "iphone";

export const RELEASES_URL = "https://github.com/uriellambA/supernova-eta26/releases/latest";

export const DOWNLOADS: Record<Platform, { label: string; file: string; url: string | null }> = {
  windows: { label: "Windows 10 / 11", file: "Growvia_x64-setup.exe", url: null },
  mac: { label: "macOS (Apple Silicon and Intel)", file: "Growvia_universal.dmg", url: null },
  linux: { label: "Linux (AppImage / .deb)", file: "Growvia_amd64.AppImage", url: null },
  android: { label: "Android (APK)", file: "Growvia.apk", url: null },
  iphone: { label: "iPhone / iPad", file: "", url: null }, // no store app: installs the web app
};

/** Best guess of the visitor's device (client only). */
export function detectPlatform(ua: string, platform = ""): Platform {
  const u = ua.toLowerCase();
  if (/android/.test(u)) return "android";
  if (/iphone|ipad|ipod/.test(u) || (/macintosh/.test(u) && /mobile/.test(u))) return "iphone";
  if (/mac/.test(u) || /mac/i.test(platform)) return "mac";
  if (/linux|x11|cros/.test(u)) return "linux";
  return "windows";
}
