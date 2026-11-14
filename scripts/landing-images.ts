/**
 * Builds the landing-page comparison images of a real chacra in Los Antiguos:
 *   public/landing/chacra-color.jpg  — high-resolution satellite photo (Esri World Imagery, ~1 m)
 *   public/landing/chacra-ndvi.jpg   — NDVI from Sentinel-2 red (B04) and near-infrared (B08) bands, 10 m,
 *                                      colored and blended with the photo so the parcels stay sharp
 *   public/landing/chacra.json       — scene date, cloud cover and bounding box
 *
 *   npm run landing-images
 *   npm run landing-images -- --lat -46.55 --lon -71.64 --width 1400 --height 790 --from 2025-12-01 --to 2026-03-15
 *
 * Needs internet (Esri tiles, Earth Search STAC catalog and the public Sentinel-2 COG bucket on AWS). No keys required.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fromUrl } from "geotiff";
import jpeg from "jpeg-js";
import { SITE } from "../config/site";

const args = process.argv.slice(2);
const arg = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const S = SITE.showcase;
const lat = Number(arg("lat") ?? S.lat), lon = Number(arg("lon") ?? S.lon);
const widthM = Number(arg("width") ?? S.widthM), heightM = Number(arg("height") ?? S.heightM);
const now = new Date();
const season = now.getUTCMonth() >= 2 ? now.getUTCFullYear() : now.getUTCFullYear() - 1; // last summer that already started
const from = arg("from") ?? `${season - 1}-12-01`;
const to = arg("to") ?? `${season}-03-31`;
const OUT = "public/landing";
const Z = 17;

// ---------- geometry ----------
const R = 6378137;
const mercX = (lo: number) => ((lo + 180) / 360) * 256 * 2 ** Z;
const mercY = (la: number) => {
  const s = Math.sin((la * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** Z;
};
const unX = (x: number) => (x / (256 * 2 ** Z)) * 360 - 180;
const unY = (y: number) => {
  const n = Math.PI - (2 * Math.PI * y) / (256 * 2 ** Z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};
/** WGS84 → UTM (meters) for a given zone, southern hemisphere false northing. */
function utm(la: number, lo: number, zone: number) {
  const a = R, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const phi = (la * Math.PI) / 180, lam = (lo * Math.PI) / 180, lam0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = Math.cos(phi) * (lam - lam0);
  const M = a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) - ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const E = 500000 + k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120);
  let Nn = k0 * (M + N * Math.tan(phi) * ((A * A) / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  if (la < 0) Nn += 10000000;
  return [E, Nn] as const;
}

// Output grid in Web Mercator pixels at zoom Z
const dLat = heightM / 2 / 111320, dLon = widthM / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
const x0 = Math.floor(mercX(lon - dLon)), x1 = Math.ceil(mercX(lon + dLon));
const y0 = Math.floor(mercY(lat + dLat)), y1 = Math.ceil(mercY(lat - dLat));
const W = x1 - x0, H = y1 - y0;

async function getJson(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`${new URL(url).host} → ${r.status}`);
  return r.json();
}

// ---------- 1. high-resolution photo ----------
async function photo() {
  const rgb = new Uint8Array(W * H * 3);
  const tasks: Promise<void>[] = [];
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x1 - 1) / 256); tx++) {
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y1 - 1) / 256); ty++) {
      tasks.push((async () => {
        const r = await fetch(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${ty}/${tx}`, { signal: AbortSignal.timeout(30_000) });
        if (!r.ok) throw new Error(`imagery tile ${Z}/${ty}/${tx} → ${r.status}`);
        const img = jpeg.decode(new Uint8Array(await r.arrayBuffer()), { useTArray: true });
        for (let py = 0; py < 256; py++) for (let px = 0; px < 256; px++) {
          const gx = tx * 256 + px - x0, gy = ty * 256 + py - y0;
          if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
          const s = (py * img.width + px) * 4, d = (gy * W + gx) * 3;
          rgb[d] = img.data[s]; rgb[d + 1] = img.data[s + 1]; rgb[d + 2] = img.data[s + 2];
        }
      })());
    }
  }
  await Promise.all(tasks);
  return rgb;
}

// ---------- 2. Sentinel-2 NDVI ----------
async function ndviGrid() {
  const search = await getJson("https://earth-search.aws.element84.com/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collections: ["sentinel-2-l2a"],
      intersects: { type: "Point", coordinates: [lon, lat] },
      datetime: `${from}T00:00:00Z/${to}T23:59:59Z`,
      query: { "eo:cloud_cover": { lt: 15 } },
      sortby: [{ field: "properties.eo:cloud_cover", direction: "asc" }],
      limit: 10,
    }),
  });
  const item = search.features?.[0];
  if (!item) throw new Error(`no clear Sentinel-2 scene between ${from} and ${to}`);
  const p = item.properties;
  const zone = Number(p["proj:epsg"] ?? p["proj:code"]?.split(":")[1] ?? 32719) % 100;
  const baseline = parseFloat(p["s2:processing_baseline"] ?? "0");
  const offset = p["earthsearch:boa_offset_applied"] ? 0 : baseline >= 4 ? -1000 : 0;
  console.log(`· Sentinel-2 scene ${item.id} · ${p.datetime?.slice(0, 10)} · clouds ${p["eo:cloud_cover"]}% · UTM ${zone}S`);

  // UTM coordinates of every output pixel
  const E = new Float64Array(W * H), N = new Float64Array(W * H);
  let eMin = Infinity, eMax = -Infinity, nMin = Infinity, nMax = -Infinity;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [e, n] = utm(unY(y0 + y + 0.5), unX(x0 + x + 0.5), zone);
    E[y * W + x] = e; N[y * W + x] = n;
    eMin = Math.min(eMin, e); eMax = Math.max(eMax, e); nMin = Math.min(nMin, n); nMax = Math.max(nMax, n);
  }
  const band = async (key: string) => {
    const tif = await fromUrl(item.assets[key].href);
    const img = await tif.getImage();
    const [ox, oy] = img.getOrigin(), [rx, ry] = img.getResolution();
    const c0 = Math.max(0, Math.floor((eMin - ox) / rx) - 1), c1 = Math.min(img.getWidth(), Math.ceil((eMax - ox) / rx) + 2);
    const r0 = Math.max(0, Math.floor((nMax - oy) / ry) - 1), r1 = Math.min(img.getHeight(), Math.ceil((nMin - oy) / ry) + 2);
    const [data] = (await img.readRasters({ window: [c0, r0, c1, r1] })) as unknown as ArrayLike<number>[];
    const w = c1 - c0, h = r1 - r0;
    // bilinear sample at a UTM point
    return (e: number, n: number) => {
      const fx = (e - ox) / rx - c0 - 0.5, fy = (n - oy) / ry - r0 - 0.5;
      const ix = Math.max(0, Math.min(w - 2, Math.floor(fx))), iy = Math.max(0, Math.min(h - 2, Math.floor(fy)));
      const tx = Math.min(1, Math.max(0, fx - ix)), ty = Math.min(1, Math.max(0, fy - iy));
      const v = (i: number, j: number) => data[(iy + j) * w + ix + i] + offset;
      return (v(0, 0) * (1 - tx) + v(1, 0) * tx) * (1 - ty) + (v(0, 1) * (1 - tx) + v(1, 1) * tx) * ty;
    };
  };
  const [red, nir] = await Promise.all([band("red"), band("nir")]);
  const nd = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = red(E[i], N[i]), n = nir(E[i], N[i]);
    nd[i] = n + r > 0 ? (n - r) / (n + r) : 0;
  }
  return { nd, date: p.datetime?.slice(0, 10), cloud: p["eo:cloud_cover"], id: item.id };
}

// NDVI palette (bare soil → dense crop)
const STOPS: [number, [number, number, number]][] = [[0, [140, 90, 45]], [0.2, [205, 170, 100]], [0.35, [235, 225, 140]], [0.5, [150, 205, 95]], [0.65, [55, 155, 65]], [0.85, [10, 90, 40]]];
function color(v: number): [number, number, number] {
  if (v <= STOPS[0][0]) return STOPS[0][1];
  for (let k = 1; k < STOPS.length; k++) if (v <= STOPS[k][0]) {
    const [a, ca] = STOPS[k - 1], [b, cb] = STOPS[k], t = (v - a) / (b - a);
    return [0, 1, 2].map((j) => ca[j] + (cb[j] - ca[j]) * t) as [number, number, number];
  }
  return STOPS.at(-1)![1];
}

async function main() {
  console.log(`Growvia landing images · ${lat}, ${lon} · ${widthM}×${heightM} m · ${W}×${H} px`);
  mkdirSync(OUT, { recursive: true });
  const rgb = await photo();
  const toRgba = (src: (i: number) => [number, number, number]) => {
    const d = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) { const [r, g, b] = src(i); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
    return d;
  };
  writeFileSync(join(OUT, "chacra-color.jpg"), jpeg.encode({ data: toRgba((i) => [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]), width: W, height: H }, 82).data);
  console.log("✓ chacra-color.jpg");

  const { nd, date, cloud, id } = await ndviGrid();
  writeFileSync(join(OUT, "chacra-ndvi.jpg"), jpeg.encode({
    data: toRgba((i) => {
      const lum = (0.3 * rgb[i * 3] + 0.59 * rgb[i * 3 + 1] + 0.11 * rgb[i * 3 + 2]) / 255; // keeps parcel edges sharp
      const c = color(nd[i]);
      const k = 0.55 + 0.6 * lum;
      return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
    }),
    width: W, height: H,
  }, 82).data);
  const vals = Array.from(nd).sort((a, b) => a - b);
  const meta = { name: S.name, lat, lon, widthM, heightM, width: W, height: H, scene: id, date, cloud, ndviMedian: +vals[Math.floor(vals.length / 2)].toFixed(2), ndviP90: +vals[Math.floor(vals.length * 0.9)].toFixed(2) };
  writeFileSync(join(OUT, "chacra.json"), JSON.stringify(meta, null, 2));
  console.log(`✓ chacra-ndvi.jpg · median NDVI ${meta.ndviMedian}, top 10% ${meta.ndviP90}`);
  console.log("✓ chacra.json — commit public/landing/ to publish the images");
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exit(1);
});
