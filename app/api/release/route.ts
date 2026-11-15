import { conCache, jsonCacheado } from "@/lib/cache";
import { latestRelease } from "@/lib/release";

/** Latest Growvia Desktop installers (cached 10 minutes, so GitHub's rate limit is never hit). */
export async function GET(req: Request) {
  void req.url; // run on every request (no prerender)
  try {
    return jsonCacheado(await conCache("release", 10 * 60_000, latestRelease), 600);
  } catch {
    return jsonCacheado({ version: null, published: null, page: "https://github.com/uriellambA/supernova-eta26/releases", assets: {} }, 60);
  }
}
