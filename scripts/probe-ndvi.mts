// Temporary: runs the real vegetation reader against NASA (used by the gibs-probe workflow).
import { ndviGibs } from "../lib/ndvi-gibs.ts";
import { gibsDecoder } from "../lib/gibs-decode.ts";
import { getPng } from "../lib/smap-server.ts";
import { tilePixel } from "../lib/smap.ts";
for (const k of [["MODIS_Terra_NDVI_8Day","ndvi"],["MODIS_Terra_Land_Surface_Temp_Day","lst"],["MODIS_Terra_NDSI_Snow_Cover","snow"]] as const) {
  const d = await gibsDecoder(k[0], k[1]); console.log(k[0], "exact colormap:", d.exact);
}
const t = tilePixel(-46.55, -71.6, 9);
const png = await getPng(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2026-10-28/GoogleMapsCompatible_Level9/9/${t.y}/${t.x}.png`);
const px: string[] = [];
for (let dx = -2; dx <= 2; dx++) { const i = (t.py * png.width + t.px + dx) * 4; px.push([...png.data.slice(i, i + 4)].join(",")); }
console.log("pixels near Los Antiguos:", px.join(" | "));
for (const [lat, lon] of [[-46.55, -71.6], [-46.6, -70.93], [-48.75, -70.25]]) {
  const t0 = Date.now();
  try { const r = await ndviGibs(lat, lon); console.log(lat, lon, "OK", r.serie.length, "points, last", r.ultimo, "approx", r.aproximado, Date.now() - t0, "ms"); }
  catch (e) { console.log(lat, lon, "FAIL", (e as Error).message); }
}
