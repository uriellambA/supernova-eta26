/**
 * Growvia — advanced soil study for Los Antiguos (or any point).
 *
 *   npm run soil-study                          # Los Antiguos: centre + 4 points around it
 *   npm run soil-study -- --site perito-moreno  # also gobernador-gregores, pampa-ondulada
 *   npm run soil-study -- --all                 # one point per site
 *   npm run soil-study -- --lat -46.55 --lon -71.62 --name "My chacra"
 *   npm run soil-study -- --grid 3              # 3×3 grid around the valley centre (~1 km spacing)
 *   npm run soil-study -- --timeout 10           # wait up to 10 min per data source (default 5) and retry 3 times
 *   npm run soil-study -- --offline             # no internet: regional reference + simulated climate
 *   npm run soil-study -- --out docs/soil-study --system vegetables --irrigation drip
 *
 * For every point it extracts: the full soil profile (6 depths, 0–200 cm, with uncertainty range),
 * texture, water retention (Saxton & Rawls), infiltration, organic matter, salinity indicator, soil-health index,
 * 20 years of climate (frost, heat, chill, rain, evaporation, humidity, pressure, UV), the vegetation index (NDVI/EVI),
 * the ranking of every crop species (agronomic fit + economics) and the rotation strategies for the chosen system.
 * Output: report.md, data.json, points.csv, species.csv, profile.csv in the output folder.
 */
import { ndviGibs } from "../lib/ndvi-gibs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STRATEGIES } from "../config/rotations";
import { SITES, siteById, siteNear } from "../config/sites";
import { calcularIndicadores, shortDate } from "../lib/agro";
import { corregirAltura, elevacionCampo, ndviModis, powerDiario } from "../lib/nasa";
import { compareStrategies } from "../lib/rotation";
import { diarioSimulado, ndviSimulado } from "../lib/simulado";
import { SOIL_DEPTHS, deriveSoil, salinityEstimate, saxtonRawls, soilGridsProfile, soilHealth, textureClass, topsoilValues } from "../lib/soil";
import { rankSpecies } from "../lib/suitability";
import { DEFAULT_PRIORITIES, type FarmProfile, type FarmSystem, type IndicadoresNasa, type NdviResumen, type SistemaRiego, type SoilResumen } from "../lib/types";

// ---------- arguments ----------
const args = process.argv.slice(2);
const arg = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const offline = args.includes("--offline");
const SITE = siteById(arg("site") ?? (arg("lat") && arg("lon") ? siteNear(Number(arg("lat")), Number(arg("lon"))).id : undefined));
const all = args.includes("--all"); // one point per supported site
const out = arg("out") ?? `docs/soil-study/${all ? "all-sites" : SITE.id}`;
const system = (arg("system") ?? SITE.systems[0]) as FarmSystem;
const irrigation = (arg("irrigation") ?? SITE.irrigation.defaultMethod) as SistemaRiego;
const grid = Number(arg("grid") ?? 0);

type Pt = { name: string; lat: number; lon: number };
// Default: the site centre plus 4 points ~1.5 km around it (N, S, E, W)
const [c0lon, c0lat] = SITE.center;
let points: Pt[] = [
  { name: `${SITE.name} centre`, lat: c0lat, lon: c0lon },
  { name: "North", lat: +(c0lat + 0.014).toFixed(4), lon: c0lon },
  { name: "South", lat: +(c0lat - 0.014).toFixed(4), lon: c0lon },
  { name: "East", lat: c0lat, lon: +(c0lon + 0.02).toFixed(4) },
  { name: "West", lat: c0lat, lon: +(c0lon - 0.02).toFixed(4) },
];
if (all) points = SITES.map((x) => ({ name: x.name, lat: x.center[1], lon: x.center[0] }));
if (arg("lat") && arg("lon")) points = [{ name: arg("name") ?? "Point", lat: Number(arg("lat")), lon: Number(arg("lon")) }];
if (grid > 1) {
  const [lon0, lat0] = SITE.center;
  const step = 0.01;
  points = [];
  for (let i = 0; i < grid; i++) for (let j = 0; j < grid; j++) {
    const lat = +(lat0 + (i - (grid - 1) / 2) * step).toFixed(4), lon = +(lon0 + (j - (grid - 1) / 2) * step * 1.45).toFixed(4);
    points.push({ name: `G${i + 1}-${j + 1}`, lat, lon });
  }
}

// Patience with slow sources (SoilGrids, NASA): each request waits up to --timeout minutes (default 5)
// and a failed source is retried --retries times (default 3), pausing longer each time.
const timeoutMin = Number(arg("timeout") ?? 5), retries = Number(arg("retries") ?? 3);
process.env.GROWVIA_MIN_TIMEOUT_MS = String(Math.round(timeoutMin * 60_000));
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const farm: FarmProfile = { system, areaHa: 5, irrigation, water: "medium", notes: "" };
const log = (...a: unknown[]) => console.log("·", ...a);

async function tryOr<T>(label: string, fn: () => Promise<T>, fb: () => T): Promise<{ v: T; live: boolean }> {
  if (offline) return { v: fb(), live: false };
  for (let k = 1; ; k++) {
    try {
      return { v: await fn(), live: true };
    } catch (e) {
      if (k > retries) {
        log(`${label}: ${(e as Error).message} → fallback`);
        return { v: fb(), live: false };
      }
      const wait = 30 * k;
      log(`${label}: ${(e as Error).message} → retry ${k}/${retries} in ${wait} s`);
      await pause(wait * 1000);
    }
  }
}

type Layer = { depth: string; sand: number | null; silt: number | null; clay: number | null; soc: number | null; ph: number | null; cec: number | null; bdod: number | null; cfvo: number | null; texture: string; fc: number | null; wp: number | null; awcMm: number | null; ksat: number | null; range: string };

async function study(p: Pt) {
  log(`${p.name} (${p.lat}, ${p.lon})`);
  const prof = await tryOr("soil map", () => soilGridsProfile(p.lat, p.lon), () => null);
  const climateRaw = await tryOr("climate", () => powerDiario(p.lat, p.lon), () => diarioSimulado(p.lat, p.lon));
  // NASA GIBS images first (fast), the ORNL point service if they fail
  const veg = await tryOr<NdviResumen>("vegetation", () => ndviGibs(p.lat, p.lon, 60_000).catch(() => ndviModis(p.lat, p.lon)), () => ndviSimulado());

  // Profile by depth
  const thick: Record<string, number> = { "0-5cm": 50, "5-15cm": 100, "15-30cm": 150, "30-60cm": 300, "60-100cm": 400, "100-200cm": 1000 };
  const layers: Layer[] = SOIL_DEPTHS.map((d) => {
    const g = (k: string) => prof.v?.[d]?.[k]?.mean ?? null;
    const sand = g("sand"), clay = g("clay"), silt = g("silt"); // % already
    const om = g("soc") !== null ? (g("soc")! / 10) * 1.72 : null;
    const sr = sand !== null && clay !== null ? saxtonRawls(sand, clay, om ?? 1) : null;
    const q = (k: string) => prof.v?.[d]?.[k];
    const range = q("clay")?.q05 != null ? `clay ${q("clay")!.q05!.toFixed(0)}–${(q("clay")!.q95 ?? 0).toFixed(0)}%` : "";
    return {
      depth: d.replace("cm", " cm"), sand, silt, clay, soc: g("soc"), ph: g("phh2o"), cec: g("cec"), bdod: g("bdod"), cfvo: g("cfvo"),
      texture: sand !== null && clay !== null ? textureClass(sand, clay) : "—",
      fc: sr ? +(sr.fc * 100).toFixed(1) : null, wp: sr ? +(sr.wp * 100).toFixed(1) : null,
      awcMm: sr ? Math.round((sr.fc - sr.wp) * thick[d] * (1 - (g("cfvo") ?? 0) / 100)) : null, ksat: sr ? +sr.ksat.toFixed(1) : null, range,
    };
  });
  let soil: SoilResumen;
  try {
    soil = prof.v ? deriveSoil(topsoilValues(prof.v, undefined, siteNear(p.lat, p.lon).soilReference), "soil-map", "0–30 cm") : deriveSoil(siteNear(p.lat, p.lon).soilReference, "reference", "0–30 cm");
  } catch {
    soil = deriveSoil(siteNear(p.lat, p.lon).soilReference, "reference", "0–30 cm");
  }
  const ps = siteNear(p.lat, p.lon);
  const elev = offline ? ps.elevation : await elevacionCampo(p.lat, p.lon);
  const { d: daily, altura } = corregirAltura(climateRaw.v, elev);
  const c: IndicadoresNasa = { ...calcularIndicadores(daily, p.lat, p.lon), altura };
  const sal = salinityEstimate(soil, c, irrigation, null);
  const results = compareStrategies({ climate: c, soil, snow: null, cfg: ps }, { ...farm, system: ps.systems.includes(farm.system) ? farm.system : ps.systems[0] }, DEFAULT_PRIORITIES).sort((a, b) => b.score - a.score);
  const current = results.find((r) => r.strategy.current);
  const health = soilHealth(soil, sal, current?.metrics.bareMonths ?? 0, c.vientoPrimavera, veg.v);
  const species = rankSpecies(c, soil, sal, farm, ps);
  const rootZoneAwc = layers.slice(0, 4).reduce((s, l) => s + (l.awcMm ?? 0), 0);
  return { point: p, sources: { soil: prof.live ? "SoilGrids 250 m" : "regional reference", climate: climateRaw.live ? "daily record 20 yr" : "simulated", vegetation: veg.live ? "MODIS 250 m" : "simulated" }, layers, rootZoneAwc, soil, sal, health, climate: c, veg: veg.v, results, species };
}

const f1 = (x: number | null | undefined, d = 1) => (x === null || x === undefined ? "—" : (+x).toFixed(d));

async function main() {
  console.log(`Growvia soil study · ${points.length} point(s) · system ${system} · ${offline ? "OFFLINE" : "online"}`);
  const studies = [];
  for (const p of points) studies.push(await study(p));
  mkdirSync(out, { recursive: true });

  // JSON (without the heavy daily calendar)
  writeFileSync(join(out, "data.json"), JSON.stringify(studies.map((s) => ({ ...s, climate: { ...s.climate, calendario: undefined, probSemanal: undefined }, veg: { latest: s.veg.ultimo, points: s.veg.serie.length }, results: s.results.map((r) => ({ id: r.strategy.id, name: r.strategy.name, current: !!r.strategy.current, score: r.score, metrics: r.metrics })), species: s.species.map((x) => ({ id: x.species.id, name: x.species.name, viability: x.viability, agro: x.agro, margin: x.economy.margin, payback: x.economy.paybackYears, limits: x.limits })) })), null, 2));

  // CSVs
  const csv = (rows: (string | number | null)[][]) => rows.map((r) => r.map((v) => (v === null ? "" : typeof v === "string" && /[,"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n") + "\n";
  writeFileSync(join(out, "points.csv"), csv([
    ["name", "lat", "lon", "soil_source", "texture", "sand", "silt", "clay", "om_pct", "ph", "n_gkg", "cec", "bulk_density", "fc_pct", "wp_pct", "awc_60cm_mm", "awc_root_zone_mm", "ksat_mmh", "salinity_dsm_est", "soil_health", "frost_free_days", "last_frost", "chill_h", "gdd10", "rain_mm", "et0_mm", "rh_pct", "pressure_hpa", "uv_summer", "ndvi_latest", "evi_latest", "best_rotation", "top_new_species"],
    ...studies.map((s) => [s.point.name, s.point.lat, s.point.lon, s.sources.soil, s.soil.texture, s.soil.sand, s.soil.silt, s.soil.clay, s.soil.organicMatter, s.soil.ph, s.soil.nitrogen, s.soil.cec, s.soil.bulkDensity, s.soil.fieldCapacity, s.soil.wiltingPoint, s.soil.waterHolding, s.rootZoneAwc, s.soil.ksat, s.sal.ece, s.health.score, s.climate.libreHeladas, shortDate(s.climate.ultimaHeladaMedia), s.climate.horasFrio, s.climate.gdd10, s.climate.lluviaAnual, s.climate.et0Anual, s.climate.humedadRelMedia, s.climate.presionMedia, s.climate.uvVerano, s.veg.ultimo?.ndvi ?? null, s.veg.ultimo?.evi ?? null, s.results[0]?.strategy.name ?? "", s.species.filter((x) => x.species.status === "new").slice(0, 3).map((x) => x.species.name).join(" | ")]),
  ]));
  writeFileSync(join(out, "profile.csv"), csv([
    ["point", "depth", "sand", "silt", "clay", "soc_gkg", "ph", "cec", "bulk_density", "coarse_frag_pct", "texture", "fc_pct", "wp_pct", "awc_mm", "ksat_mmh", "uncertainty"],
    ...studies.flatMap((s) => s.layers.map((l) => [s.point.name, l.depth, l.sand, l.silt, l.clay, l.soc, l.ph, l.cec, l.bdod, l.cfvo, l.texture, l.fc, l.wp, l.awcMm, l.ksat, l.range])),
  ]));
  writeFileSync(join(out, "species.csv"), csv([
    ["point", "species", "status", "viability", "soil_climate_fit", "margin_usd_ha", "payback_years", "fills_off_season", "main_limit"],
    ...studies.flatMap((s) => s.species.map((x) => [s.point.name, x.species.name, x.species.status, x.viability, x.agro, x.economy.margin, x.economy.paybackYears, x.fillsGap ? "yes" : "no", x.limits[0] ?? ""])),
  ]));

  // Markdown report
  const md: string[] = [];
  md.push(all ? "# Soil study — all Growvia sites" : `# Soil study — ${SITE.name} (${SITE.region})`, "");
  md.push(`Generated with \`npm run soil-study\` · ${points.length} point(s) · rotation system: **${system}**, irrigation: **${irrigation}**${offline ? " · ⚠️ OFFLINE (reference values + simulated climate)" : ""}.`, "");
  md.push("> Decision support only. Validate with a lab soil test (pH, EC, organic matter, texture) and local experts (INTA Santa Cruz).", "");
  md.push("## Summary by point", "");
  md.push("| Point | Soil source | Texture | OM % | pH | Water 60 cm | Infiltration | Salinity (est.) | Soil health | Frost-free | Best rotation |", "|---|---|---|---|---|---|---|---|---|---|---|");
  for (const s of studies) md.push(`| ${s.point.name} | ${s.sources.soil} | ${s.soil.texture} | ${s.soil.organicMatter} | ${s.soil.ph} | ${s.soil.waterHolding} mm | ${s.soil.ksat} mm/h | ~${s.sal.ece} dS/m (${s.sal.cls}) | ${s.health.score}/100 | ${s.climate.libreHeladas} d | ${s.results[0]?.strategy.name} (${s.results[0]?.score}) |`);
  for (const s of studies) {
    md.push("", `## ${s.point.name} · ${s.point.lat}, ${s.point.lon}`, "");
    md.push(`Sources: soil ${s.sources.soil} · climate ${s.sources.climate} (${s.climate.periodo.join("–")}) · vegetation ${s.sources.vegetation}.`, "");
    md.push("### Soil profile", "", "| Depth | Sand % | Silt % | Clay % | SOC g/kg | pH | CEC | Density | Texture | FC % | WP % | Avail. water mm | Ksat mm/h |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const l of s.layers) md.push(`| ${l.depth} | ${f1(l.sand, 0)} | ${f1(l.silt, 0)} | ${f1(l.clay, 0)} | ${f1(l.soc)} | ${f1(l.ph)} | ${f1(l.cec)} | ${f1(l.bdod, 2)} | ${l.texture} | ${f1(l.fc)} | ${f1(l.wp)} | ${l.awcMm ?? "—"} | ${f1(l.ksat)} |`);
    md.push("", `Root zone (0–60 cm) available water: **${s.rootZoneAwc || s.soil.waterHolding} mm**.`, "");
    md.push("### Soil health", "", ...s.health.parts.map((x) => `- ${x.name}: ${Math.round(x.value * 100)}/100 — ${x.note}`), "", "Salinity indicator:", ...s.sal.reasons.map((r) => `- ${r}`), "");
    const c = s.climate;
    md.push("### Climate (20-year record)", "");
    if (c.altura) md.push(`- Temperatures corrected ${c.altura.deltaC > 0 ? "+" : ""}${c.altura.deltaC} °C from the climate cell's mean elevation (${c.altura.celda} m) to the field (${c.altura.campo} m).`);
    md.push(`- Frost-free season **${c.libreHeladas} days**; last spring frost on average **${shortDate(c.ultimaHeladaMedia)}** (4 of 5 years before ${shortDate(c.ultimaHeladaP80)}); frost after Nov 1 in ${c.aniosHeladaTardia} years.`);
    md.push(`- Coldest night (yearly average) ${c.minAnual} °C · chill hours ${c.horasFrio} · degree-days (base 10) ${c.gdd10}.`);
    md.push(`- Rain ${c.lluviaAnual} mm vs evaporation ${c.et0Anual} mm · spring wind ${c.vientoPrimavera} m/s · humidity ${c.humedadRelMedia ?? "—"}% · pressure ${c.presionMedia ?? "—"} hPa · summer UV ${c.uvVerano ?? "—"}.`);
    md.push(`- Vegetation: latest NDVI ${s.veg.ultimo?.ndvi ?? "—"}${s.veg.ultimo?.evi !== undefined ? `, EVI ${s.veg.ultimo.evi}` : ""} (${s.veg.serie.length} passes).`, "");
    md.push("### Crops for this soil and climate", "", "| Species | Today / new | Viability | Soil & climate | Margin USD/ha | Payback | Main limit |", "|---|---|---|---|---|---|---|");
    for (const x of s.species) md.push(`| ${x.species.emoji} ${x.species.name} | ${x.species.status === "current" ? "today" : "new"} | ${x.viability} | ${x.agro} | ${x.economy.margin.toLocaleString("en-US")} | ${x.economy.paybackYears ?? "—"} yr | ${x.limits[0] ?? "—"} |`);
    md.push("", `### Rotation strategies (${system})`, "", "| Strategy | Score | Water mm | Bare months | Erosion | N kg/ha |", "|---|---|---|---|---|---|");
    for (const r of s.results) md.push(`| ${r.strategy.name}${r.strategy.current ? " (current)" : ""} | ${r.score} | ${r.metrics.waterMm} | ${r.metrics.bareMonths} | ${Math.round(r.metrics.erosion * 100)}% | ${r.metrics.nitrogen} |`);
  }
  md.push("", "## Methods", "",
    "- Soil: ISRIC SoilGrids 2.0 (250 m, mean and 5–95% range), depth-weighted 0–30 cm for the topsoil.",
    "- Water retention and conductivity: Saxton & Rawls (2006) pedotransfer equations from sand, clay and organic matter.",
    "- Salinity: indicator from aridity (rain/ET0), pH, drainage and irrigation method — soil maps do not measure EC.",
    "- Climate: daily agro-climate record (20 years); ET0 by Hargreaves; chill hours 0–7.2 °C; degree-days base 10 °C.",
    "- Vegetation: MOD13Q1 NDVI/EVI, 250 m, 16 days.",
    "- Species and rotation scores: Growvia rules engine (`lib/suitability.ts`, `lib/rotation.ts`) with approximate regional values.",
    `- Strategies available: ${STRATEGIES.filter((x) => x.system === system).map((x) => x.name).join("; ")}.`);
  writeFileSync(join(out, "report.md"), md.join("\n") + "\n");
  console.log(`✓ Wrote ${out}/report.md, data.json, points.csv, profile.csv, species.csv`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
