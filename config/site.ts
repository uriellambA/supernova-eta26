import type { SiteConfig } from "@/lib/types";

// Everything specific to Los Antiguos lives here. Add another file like this to support a new area.
// Field coordinates are APPROXIMATE: adjust them over the satellite map.
export const SITE: SiteConfig = {
  id: "los-antiguos",
  name: "Los Antiguos",
  region: "Santa Cruz, Argentina",
  timezone: "America/Argentina/Rio_Gallegos",
  center: [-71.615, -46.55],
  elevation: 220, // valley floor next to Lake Buenos Aires
  // Chacras shown on the landing page (real satellite image + vegetation index). Move it to frame the orchards you want.
  showcase: { name: "Chacras west of Los Antiguos", lat: -46.5525, lon: -71.648, widthM: 1400, heightM: 790 },
  zoom: 12.4,
  bounds: [
    [-71.95, -46.7],
    [-71.3, -46.42],
  ],
  fields: [
    { id: "west", name: "West orchards", lat: -46.553, lon: -71.655, note: "Cherry orchards near the Los Antiguos river" },
    { id: "town", name: "Town chacras", lat: -46.556, lon: -71.612, note: "Mixed fruit, vegetables and alfalfa" },
    { id: "east", name: "East chacras", lat: -46.545, lon: -71.57, note: "Alfalfa, pasture and newer orchards" },
  ],
  watershed: {
    name: "Upper Los Antiguos river watershed",
    points: [
      [-46.72, -71.78],
      [-46.8, -71.9],
      [-46.68, -71.95],
    ],
  },
  irrigation: { defaultMethod: "furrow", grossSupplyMm: 1200 }, // canal delivery per season (approx., to validate with the irrigation consortium)
  // Regional reference values (alluvial fan of the Los Antiguos river, volcanic-ash influence from Hudson 1991).
  // Used only when the live soil map is unavailable. TO VALIDATE with a lab soil test / INTA Santa Cruz.
  soilReference: {
    sand: 55,
    silt: 30,
    clay: 15,
    soc: 8,
    ph: 7.6,
    nitrogen: 0.8,
    cec: 14,
    bulkDensity: 1.35,
  },
};
