import { siteNear } from "@/config/sites";
import { fetchJson } from "./cache";
import { soilGridsWcs } from "./soilgrids-wcs";
import type { SmapResumen } from "./smap";
import type { FarmProfile, IndicadoresNasa, Nivel, NdviResumen, Salinity, SoilHealth, SoilResumen, SoilValues } from "./types";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

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

/**
 * Soil water from texture and organic matter (Saxton & Rawls 2006 pedotransfer equations).
 * Returns volumetric fractions and saturated conductivity (mm/h).
 */
export function saxtonRawls(sandPct: number, clayPct: number, omPct: number) {
  const S = sandPct / 100, C = clayPct / 100, OM = Math.min(8, omPct);
  const t1500 = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031;
  const wp = t1500 + (0.14 * t1500 - 0.02);
  const t33 = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299;
  const fc = t33 + (1.283 * t33 * t33 - 0.374 * t33 - 0.015);
  const ts33 = 0.278 * S + 0.034 * C + 0.022 * OM - 0.018 * S * OM - 0.027 * C * OM - 0.584 * S * C + 0.078;
  const s33 = ts33 + (0.636 * ts33 - 0.107);
  const sat = fc + s33 - 0.097 * S + 0.043;
  const B = (Math.log(1500) - Math.log(33)) / (Math.log(fc) - Math.log(Math.max(0.01, wp)));
  const lambda = 1 / B;
  const ksat = 1930 * Math.pow(Math.max(0.001, sat - fc), 3 - lambda);
  return { wp, fc, sat, ksat };
}

export function deriveSoil(v: SoilValues, source: SoilResumen["source"], depth: string): SoilResumen {
  const texture = textureClass(v.sand, v.clay);
  const om = +((v.soc / 10) * 1.72).toFixed(1);
  const sr = saxtonRawls(v.sand, v.clay, om);
  const waterHolding = Math.round(Math.max(0.03, sr.fc - sr.wp) * 600); // mm in 60 cm
  const ksat = +sr.ksat.toFixed(1);
  const infiltration = ksat >= 30 ? "fast" : ksat >= 8 ? "moderate" : "slow";
  return {
    ...v, source, depth, texture, organicMatter: om, waterHolding, infiltration, ksat,
    fieldCapacity: +(sr.fc * 100).toFixed(1), wiltingPoint: +(sr.wp * 100).toFixed(1),
  };
}

export const SOIL_PROPS = ["sand", "silt", "clay", "soc", "phh2o", "nitrogen", "cec", "bdod", "cfvo"] as const;
export const SOIL_DEPTHS = ["0-5cm", "5-15cm", "15-30cm", "30-60cm", "60-100cm", "100-200cm"] as const;
const THICK: Record<string, number> = { "0-5cm": 5, "5-15cm": 10, "15-30cm": 15, "30-60cm": 30, "60-100cm": 40, "100-200cm": 100 };

/**
 * SoilGrids profile: every property at each requested depth, in conventional units
 * (sand/silt/clay/cfvo %, soc g/kg, pH, nitrogen g/kg, cec cmol/kg, bdod kg/dm³).
 * The REST API and the map service (WCS) are asked at the same time; the first good answer wins.
 */
export async function soilGridsProfile(lat: number, lon: number, depths: readonly string[] = SOIL_DEPTHS) {
  try {
    return await Promise.any([soilGridsRest(lat, lon, depths), soilGridsWcs(lat, lon, SOIL_PROPS, depths)]);
  } catch (e) {
    throw new Error((e as AggregateError).errors?.map((x: Error) => x.message).join(" · ") ?? (e as Error).message);
  }
}

async function soilGridsRest(lat: number, lon: number, depths: readonly string[]) {
  const url =
    `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}` +
    SOIL_PROPS.map((p) => `&property=${p}`).join("") + depths.map((d) => `&depth=${d}`).join("") + "&value=mean&value=Q0.05&value=Q0.95";
  const j = await fetchJson(url, 30_000);
  const out: Record<string, Record<string, { mean: number | null; q05: number | null; q95: number | null }>> = {};
  for (const layer of j?.properties?.layers ?? []) {
    const f = layer?.unit_measure?.d_factor ?? 1;
    for (const d of layer.depths ?? []) {
      const conv = (x: number | null | undefined) => (x === null || x === undefined ? null : x / f);
      (out[d.label] ??= {})[layer.name] = { mean: conv(d.values?.mean), q05: conv(d.values?.["Q0.05"]), q95: conv(d.values?.["Q0.95"]) };
    }
  }
  return out;
}

/** Depth-weighted average of a property over the given depths. */
export function weighted(profile: Awaited<ReturnType<typeof soilGridsProfile>>, prop: string, depths: readonly string[]) {
  let s = 0, w = 0;
  for (const d of depths) {
    const v = profile[d]?.[prop]?.mean;
    if (v === null || v === undefined) continue;
    s += v * THICK[d];
    w += THICK[d];
  }
  return w ? s / w : undefined;
}

/** Converts a SoilGrids profile (topsoil 0–30 cm) to Growvia soil values. */
export function topsoilValues(profile: Awaited<ReturnType<typeof soilGridsProfile>>, depths: readonly string[] = ["0-5cm", "5-15cm", "15-30cm"], ref: SoilValues = siteNear(-46.55, -71.6).soilReference): SoilValues {
  const g = (p: string) => weighted(profile, p, depths);
  const sand = g("sand"), clay = g("clay");
  if (sand === undefined || clay === undefined) throw new Error("soil map: no data at this point");
  const pct = (x: number) => x; // already % (SoilGrids g/kg ÷ 10)
  return {
    sand: +pct(sand).toFixed(0),
    silt: +(g("silt") !== undefined ? pct(g("silt")!) : 100 - pct(sand) - pct(clay)).toFixed(0),
    clay: +pct(clay).toFixed(0),
    soc: +(g("soc") ?? ref.soc).toFixed(1),
    ph: +(g("phh2o") ?? ref.ph).toFixed(1),
    nitrogen: +(g("nitrogen") ?? ref.nitrogen).toFixed(2),
    cec: +(g("cec") ?? ref.cec).toFixed(1),
    bulkDensity: +(g("bdod") ?? ref.bulkDensity).toFixed(2),
  };
}

/** Soil properties at the field (0–30 cm) from the 250 m global soil map (ISRIC SoilGrids). */
export async function soilAt(lat: number, lon: number): Promise<SoilResumen> {
  const depths = ["0-5cm", "5-15cm", "15-30cm"];
  const profile = await soilGridsProfile(lat, lon, depths);
  return deriveSoil(topsoilValues(profile, depths, siteNear(lat, lon).soilReference), "soil-map", "0–30 cm");
}

/** Regional reference soil of the closest site (used when the soil map is unavailable). */
export const soilReference = (lat = -46.55, lon = -71.6) => deriveSoil(siteNear(lat, lon).soilReference, "reference", "0–30 cm");

/**
 * Salinity estimate (ECe, dS/m). Global soil maps do not include salinity, so this is an
 * INDICATOR built from aridity, pH, drainage and irrigation method — or the farmer's own test.
 */
export function salinityEstimate(s: SoilResumen, c: IndicadoresNasa, irrigation: FarmProfile["irrigation"], measured?: number | null, smap?: SmapResumen | null): Salinity {
  if (measured !== null && measured !== undefined && measured >= 0) {
    return { ece: measured, cls: measured < 2 ? "low" : measured < 4 ? "moderate" : "high", measured: true, reasons: ["From your own soil test (electrical conductivity)."] };
  }
  const aridity = c.et0Anual ? c.lluviaAnual / c.et0Anual : 0.3; // < 0.2 = arid
  const reasons: string[] = [];
  let ece = 0.8;
  if (aridity < 0.35) { ece += (0.35 - aridity) * 4; reasons.push(`Dry climate: rain is only ${Math.round(aridity * 100)}% of evaporation, so salts are not washed down naturally.`); }
  if (s.ph >= 7.8) { ece += (s.ph - 7.8) * 2.5; reasons.push(`pH ${s.ph}: alkaline soils often carry carbonates and some sodium.`); }
  if (s.infiltration === "slow") { ece += 0.8; reasons.push("Slow drainage lets salts build up near the surface."); }
  if (s.infiltration === "fast") { ece -= 0.3; reasons.push("Fast drainage helps irrigation water flush salts below the roots."); }
  if (irrigation === "drip") { ece += 0.3; reasons.push("Drip wets a small bulb: salts gather at its edges (flush once a season)."); }
  if (irrigation === "flood" || irrigation === "furrow") reasons.push("Surface irrigation leaches salts if fields drain well; watch low, wet corners.");
  if (smap?.mean != null && smap.risk != null) {
    // Wet surface under strong evaporation → capillary rise brings salts up (SMAP, top 5 cm)
    ece += (smap.risk - 0.3) * 1.5;
    reasons.push(smap.risk >= 0.5
      ? `SMAP satellite: the surface stays wet (${smap.mean} m³/m³ on average over the last weeks). With this much evaporation, water rising from below can leave salts at the surface.`
      : `SMAP satellite: the surface is mostly dry (${smap.mean} m³/m³ on average over the last weeks), so salts are not being pulled up from below.`);
  }
  ece = +clamp(ece, 0.3, 8).toFixed(1);
  return { ece, cls: ece < 2 ? "low" : ece < 4 ? "moderate" : "high", measured: false, reasons };
}

/** Soil health index (0–100) from properties, salinity, erosion pressure and vegetation. */
export function soilHealth(s: SoilResumen, sal: Salinity, bareMonths: number, wind: number, ndvi: NdviResumen | null): SoilHealth {
  const parts = [
    { name: "Organic matter", value: clamp(s.organicMatter / 4), note: `${s.organicMatter}% (target > 3%)` },
    { name: "pH", value: clamp(1 - Math.abs(s.ph - 6.8) / 2), note: `${s.ph} (best 6.0–7.5)` },
    { name: "Nutrient holding", value: clamp(s.cec / 25), note: `CEC ${s.cec} cmol/kg` },
    { name: "Water holding", value: clamp(s.waterHolding / 120), note: `${s.waterHolding} mm in 60 cm` },
    { name: "Compaction", value: clamp((1.7 - s.bulkDensity) / 0.5), note: `${s.bulkDensity} g/cm³ (< 1.5 is loose)` },
    { name: "Salinity", value: clamp(1 - (sal.ece - 1) / 4), note: `${sal.measured ? "" : "~"}${sal.ece} dS/m${sal.measured ? "" : " (estimated)"}` },
    { name: "Ground cover", value: clamp(1 - (bareMonths / 12) * (0.5 + wind / 14)), note: `${bareMonths} bare months/yr` },
  ];
  if (ndvi?.serie.length) {
    const mean = ndvi.serie.reduce((a, p) => a + p.ndvi, 0) / ndvi.serie.length;
    parts.push({ name: "Plant activity", value: clamp((mean - 0.1) / 0.5), note: `average NDVI ${mean.toFixed(2)}` });
  }
  const score = Math.round((100 * parts.reduce((a, p) => a + p.value, 0)) / parts.length);
  const level: Nivel = score >= 65 ? "good" : score >= 45 ? "watch" : "alert";
  return { score, level, parts: parts.map((p) => ({ ...p, value: +p.value.toFixed(2) })) };
}
