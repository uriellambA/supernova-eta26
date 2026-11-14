import { SITE } from "@/config/site";
import { fetchJson } from "./cache";
import type { SoilResumen, SoilValues } from "./types";

/** USDA texture class (simplified triangle). */
export function textureClass(sand: number, clay: number) {
  const silt = 100 - sand - clay;
  if (clay >= 40) return "Clay";
  if (clay >= 27 && sand <= 45) return "Clay loam";
  if (clay >= 20 && sand > 45) return "Sandy clay loam";
  if (sand >= 85) return "Sand";
  if (sand >= 70) return "Loamy sand";
  if (silt >= 50) return "Silt loam";
  if (sand >= 52) return "Sandy loam";
  return "Loam";
}

// Available water in the top 60 cm (mm), by texture (typical values).
const AWC: Record<string, number> = { Sand: 40, "Loamy sand": 60, "Sandy loam": 80, "Sandy clay loam": 95, Loam: 105, "Silt loam": 115, "Clay loam": 105, Clay: 95 };

export function deriveSoil(v: SoilValues, source: SoilResumen["source"], depth: string): SoilResumen {
  const texture = textureClass(v.sand, v.clay);
  const om = +((v.soc / 10) * 1.72).toFixed(1);
  // organic matter raises available water a bit
  const waterHolding = Math.round((AWC[texture] ?? 80) * (1 + Math.min(0.25, om * 0.05)));
  const infiltration = v.sand >= 60 ? "fast" : v.clay >= 30 ? "slow" : "moderate";
  return { ...v, source, depth, texture, organicMatter: om, waterHolding, infiltration };
}

/** Soil properties at the field (0–30 cm) from the 250 m global soil map (ISRIC SoilGrids). */
export async function soilAt(lat: number, lon: number): Promise<SoilResumen> {
  const props = ["sand", "silt", "clay", "soc", "phh2o", "nitrogen", "cec", "bdod"];
  const depths = ["0-5cm", "5-15cm", "15-30cm"];
  const url =
    `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}` +
    props.map((p) => `&property=${p}`).join("") + depths.map((d) => `&depth=${d}`).join("") + "&value=mean";
  const j = await fetchJson(url, 25_000);
  const out: Record<string, number> = {};
  const espesor: Record<string, number> = { "0-5cm": 5, "5-15cm": 10, "15-30cm": 15 };
  for (const layer of j?.properties?.layers ?? []) {
    const f = layer?.unit_measure?.d_factor ?? 1;
    let s = 0, w = 0;
    for (const d of layer.depths ?? []) {
      const v = d?.values?.mean;
      if (v === null || v === undefined) continue;
      s += (v / f) * (espesor[d.label] ?? 1);
      w += espesor[d.label] ?? 1;
    }
    if (w) out[layer.name] = s / w;
  }
  if (out.sand === undefined || out.clay === undefined) throw new Error("soil map: no data at this point");
  const conv = (gkg: number | undefined) => (gkg === undefined ? undefined : gkg / 10); // g/kg → %
  const v: SoilValues = {
    sand: +conv(out.sand)!.toFixed(0),
    silt: +(conv(out.silt) ?? 100 - conv(out.sand)! - conv(out.clay)!).toFixed(0),
    clay: +conv(out.clay)!.toFixed(0),
    soc: +(out.soc ?? SITE.soilReference.soc).toFixed(1),
    ph: +(out.phh2o ?? SITE.soilReference.ph).toFixed(1),
    nitrogen: +(out.nitrogen ?? SITE.soilReference.nitrogen).toFixed(2),
    cec: +(out.cec ?? SITE.soilReference.cec).toFixed(1),
    bulkDensity: +(out.bdod ?? SITE.soilReference.bulkDensity).toFixed(2),
  };
  return deriveSoil(v, "soil-map", "0–30 cm");
}

export const soilReference = () => deriveSoil(SITE.soilReference, "reference", "0–30 cm");
