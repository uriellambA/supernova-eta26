// Latest Growvia Desktop release (GitHub Releases), reduced to one download per platform.
import type { Platform } from "@/config/downloads";

export type ReleaseAsset = { url: string; name: string; sizeMb: number };
export type ReleaseInfo = { version: string | null; published: string | null; page: string; assets: Partial<Record<Platform | "linuxDeb", ReleaseAsset>> };

const REPO = "uriellambA/supernova-eta26";
type GhAsset = { name: string; browser_download_url: string; size: number };
type GhRelease = { tag_name: string; published_at: string; html_url: string; assets: GhAsset[] };

/** Picks the installer for each platform (never the .sig signatures or updater archives). */
export function pickAssets(assets: GhAsset[]): ReleaseInfo["assets"] {
  const usable = assets.filter((a) => !a.name.endsWith(".sig") && !a.name.endsWith(".json") && !a.name.endsWith(".tar.gz"));
  const find = (re: RegExp) => usable.find((a) => re.test(a.name));
  const asset = (a?: GhAsset): ReleaseAsset | undefined => (a ? { url: a.browser_download_url, name: a.name, sizeMb: Math.round((a.size / 1048576) * 10) / 10 } : undefined);
  return {
    windows: asset(find(/-setup\.exe$/i) ?? find(/\.msi$/i)),
    mac: asset(find(/universal\.dmg$/i) ?? find(/\.dmg$/i)),
    linux: asset(find(/\.AppImage$/)),
    linuxDeb: asset(find(/\.deb$/)),
    android: asset(find(/\.apk$/i)),
  };
}

export async function latestRelease(): Promise<ReleaseInfo> {
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=10`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "growvia-download-page" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  const list = (await r.json()) as GhRelease[];
  const rel = list.find((x) => x.tag_name.startsWith("desktop-v"));
  if (!rel) return { version: null, published: null, page: `https://github.com/${REPO}/releases`, assets: {} };
  return { version: rel.tag_name.replace("desktop-v", ""), published: rel.published_at, page: rel.html_url, assets: pickAssets(rel.assets) };
}
