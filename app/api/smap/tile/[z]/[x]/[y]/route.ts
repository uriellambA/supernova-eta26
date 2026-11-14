import { usarSimulado } from "@/lib/cache";
import { emptyTile, riskTile } from "@/lib/smap-server";

export const maxDuration = 60;

/** Salinity-risk map tile from SMAP soil moisture. Always answers with a PNG (transparent when there is no data). */
export async function GET(_req: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z, x, y } = await params;
  const png = (body: Buffer, status: string, maxAge: number) =>
    new Response(new Uint8Array(body), { headers: { "Content-Type": "image/png", "Cache-Control": `public, max-age=${maxAge}`, "X-Smap": status } });
  if (usarSimulado()) return png(emptyTile(), "sample-mode", 60);
  try {
    return png(await riskTile(+z, +x, parseInt(y, 10)), "ok", 21_600);
  } catch (e) {
    return png(emptyTile(), `unavailable: ${(e as Error).message}`.slice(0, 200), 300);
  }
}
