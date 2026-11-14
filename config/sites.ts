import type { SiteConfig } from "@/lib/types";

// Every place Growvia supports. Values are APPROXIMATE regional references: validate with INTA and local data.
// Soil references are used only when the live 250 m soil map is unavailable.
export const SITES: SiteConfig[] = [
  {
    id: "los-antiguos",
    name: "Los Antiguos",
    region: "Santa Cruz, Argentina",
    zone: "patagonia",
    description: "Cold, windy, dry valley on Lake Buenos Aires at ~220 m, irrigated by canals from Andean snowmelt; known for cherries, berries, alfalfa and vegetables.",
    systems: ["orchard", "vegetables", "forage"],
    busyMonths: [12, 1, 2],
    context: [
      "🍒 The National Cherry Festival and summer tourism create a local market for fresh fruit, jams and experiences (lavender fields, berry picking).",
      "🚚 Fresh fruit travels ~1,000 km to big markets: products that store well (frozen, dried, oils, saffron) avoid freight risk.",
      "💧 Water comes from snowmelt through canals: crops with low water need are safer in low-snow years.",
      "👥 Labor peaks in Dec–Jan with cherries: crops harvested in autumn or spring use the same workers in quieter months.",
    ],
    timezone: "America/Argentina/Rio_Gallegos",
    center: [-71.615, -46.55],
    elevation: 220,
    zoom: 12.4,
    bounds: [[-71.95, -46.7], [-71.3, -46.42]],
    watershed: { name: "Upper Los Antiguos river watershed", points: [[-46.72, -71.78], [-46.8, -71.9], [-46.68, -71.95]] },
    irrigation: { defaultMethod: "furrow", grossSupplyMm: 1200 },
    // Alluvial fan of the Los Antiguos river, volcanic-ash influence (Hudson 1991)
    soilReference: { sand: 55, silt: 30, clay: 15, soc: 8, ph: 7.6, nitrogen: 0.8, cec: 14, bulkDensity: 1.35 },
  },
  {
    id: "perito-moreno",
    name: "Perito Moreno",
    region: "Santa Cruz, Argentina",
    zone: "patagonia",
    description: "Steppe town at ~400 m on the Fénix river, 55 km east of Los Antiguos: colder nights, stronger wind and less rain; irrigated chacras with forage, vegetables and small fruit.",
    systems: ["forage", "vegetables", "orchard"],
    busyMonths: [12, 1, 2],
    context: [
      "🐑 Sheep and cattle ranches around town buy hay and alfalfa bales: forage is the safest market.",
      "🥬 Vegetables and greens sell to the town and to mining and oil camps of the region.",
      "💨 Wind is stronger than in Los Antiguos: windbreaks (poplar, calafate, rosehip) come before any orchard.",
      "💧 The Fénix river carries less water than the Los Antiguos river: water-saving crops and drip matter more.",
    ],
    timezone: "America/Argentina/Rio_Gallegos",
    center: [-70.926, -46.59],
    elevation: 400,
    zoom: 12.2,
    bounds: [[-71.25, -46.75], [-70.6, -46.45]],
    watershed: { name: "Fénix river headwaters", points: [[-46.78, -71.35], [-46.85, -71.5], [-46.7, -71.45]] },
    irrigation: { defaultMethod: "furrow", grossSupplyMm: 900 },
    // Sandy alluvial and steppe soils (Aridisols/Entisols), low organic matter, calcareous
    soilReference: { sand: 60, silt: 27, clay: 13, soc: 6, ph: 7.9, nitrogen: 0.6, cec: 12, bulkDensity: 1.4 },
  },
  {
    id: "gobernador-gregores",
    name: "Gobernador Gregores",
    region: "Santa Cruz, Argentina",
    zone: "patagonia",
    description: "Central Santa Cruz town at ~300 m in the Chico river valley: arid steppe, cold winters, irrigated valley chacras with alfalfa, pasture, vegetables and greenhouses.",
    systems: ["forage", "vegetables", "orchard"],
    busyMonths: [1, 2, 3],
    context: [
      "🌾 Alfalfa and pasture bales for the surrounding ranches are the backbone of the valley.",
      "🏠 Greenhouses supply fresh vegetables to a town far from big markets (~400 km to Río Gallegos).",
      "🧂 Valley soils can be saline in low, poorly drained spots: check EC before planting sensitive crops.",
      "💧 Irrigation depends on the Chico river: plan for low-flow years.",
    ],
    timezone: "America/Argentina/Rio_Gallegos",
    center: [-70.247, -48.751],
    elevation: 300,
    zoom: 12.2,
    bounds: [[-70.6, -48.9], [-69.9, -48.6]],
    watershed: { name: "Chico river headwaters", points: [[-48.9, -71.3], [-48.6, -71.6], [-49.1, -71.2]] },
    irrigation: { defaultMethod: "flood", grossSupplyMm: 900 },
    // Alluvial loams of the Chico river valley, alkaline, salinity risk in low spots
    soilReference: { sand: 45, silt: 35, clay: 20, soc: 9, ph: 8.1, nitrogen: 0.8, cec: 16, bulkDensity: 1.35 },
  },
  {
    id: "pampa-ondulada",
    name: "Pampa Ondulada",
    region: "Pergamino, Buenos Aires, Argentina",
    zone: "pampa",
    description: "Rolling Pampa around Pergamino at ~65 m: humid temperate climate (~1,000 mm rain), deep fertile silty loams (Typic Argiudolls); rain-fed soybean, maize and wheat, with water erosion on slopes and soil organic matter loss under soybean monoculture.",
    systems: ["grains", "forage"],
    busyMonths: [3, 4, 5, 12],
    context: [
      "🌱 Soybean monoculture has lowered organic matter and increased water erosion on the gentle slopes.",
      "🌽 Maize and wheat return more residue and carbon; cover crops (vetch, oats, rye) protect the soil in winter.",
      "🚜 Contractors do most field work: labor is rarely the limit, timing and logistics are.",
      "📈 Prices follow Rosario/Chicago markets and export taxes: diversifying crops spreads the price risk.",
    ],
    timezone: "America/Argentina/Buenos_Aires",
    center: [-60.574, -33.89],
    elevation: 65,
    zoom: 11.2,
    bounds: [[-61.0, -34.15], [-60.15, -33.65]],
    watershed: null,
    irrigation: { defaultMethod: "sprinkler", grossSupplyMm: 250 }, // mostly rain-fed: supplemental irrigation only
    // Typic Argiudolls (Pergamino series): silty loam A horizon, slightly acid
    soilReference: { sand: 10, silt: 65, clay: 25, soc: 18, ph: 6.0, nitrogen: 1.6, cec: 20, bulkDensity: 1.25 },
  },
];

export const DEFAULT_SITE_ID = "los-antiguos";
/** Area the satellite maps may show for a site: its town and farmland, plus a small margin (never the whole country). */
export function mapLimits(site: SiteConfig): [[number, number], [number, number]] {
  const [[w, so], [e, n]] = site.bounds;
  const px = (e - w) * 0.12, py = (n - so) * 0.12;
  return [[w - px, so - py], [e + px, n + py]];
}

export const siteById = (id: string | null | undefined) => SITES.find((s) => s.id === id) ?? SITES[0];

/** Closest supported site to a point (used by the server to pick references, time zone and elevation). */
export function siteNear(lat: number, lon: number) {
  return [...SITES].sort((a, b) => Math.hypot(a.center[1] - lat, a.center[0] - lon) - Math.hypot(b.center[1] - lat, b.center[0] - lon))[0];
}

/** Landing-page satellite showcase (real chacras in Los Antiguos). */
export const SHOWCASE = { name: "Chacras west of Los Antiguos", lat: -46.5525, lon: -71.648, widthM: 1400, heightM: 790 };
