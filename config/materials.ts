// Reference prices for the action plan (USD, farm gate / retail in Argentina, 2026 order of magnitude).
// APPROXIMATE values to start the conversation with suppliers: always ask for a current quote.

/** Seed needed to sow one hectare of a crop of the rotation, and its price. */
export const SEED: Record<string, { kgHa: number; usdKg: number; label: string; extra?: { label: string; usd: number } }> = {
  rye: { kgHa: 100, usdKg: 0.7, label: "Rye seed" },
  "oats-vetch": { kgHa: 90, usdKg: 1.1, label: "Oats + vetch seed (60 + 30 kg)" },
  clover: { kgHa: 8, usdKg: 9, label: "White clover seed" },
  alfalfa: { kgHa: 20, usdKg: 8, label: "Alfalfa seed (inoculated)" },
  pasture: { kgHa: 25, usdKg: 4.5, label: "Pasture seed mix" },
  fava: { kgHa: 180, usdKg: 1.8, label: "Fava bean seed" },
  pea: { kgHa: 150, usdKg: 1.4, label: "Pea seed" },
  garlic: { kgHa: 1200, usdKg: 2.2, label: "Garlic cloves for planting" },
  potato: { kgHa: 2500, usdKg: 0.6, label: "Certified seed potato" },
  greens: { kgHa: 3, usdKg: 60, label: "Leafy greens seed" },
  strawberry: { kgHa: 0, usdKg: 0, label: "Strawberry plants" },
  soy: { kgHa: 70, usdKg: 0.9, label: "Soybean seed", extra: { label: "Inoculant", usd: 6 } },
  maize: { kgHa: 22, usdKg: 10, label: "Hybrid maize seed (1 bag/ha)" },
  wheat: { kgHa: 120, usdKg: 0.38, label: "Wheat seed" },
  barley: { kgHa: 110, usdKg: 0.4, label: "Malting barley seed" },
  sunflower: { kgHa: 4.5, usdKg: 40, label: "Sunflower hybrid seed" },
};

export const PRICE = {
  dripTapeUsdM: 0.15, // drip tape, per metre
  dripTapeMHa: 7000, // metres of tape per hectare (rows ~1.4 m apart)
  dripHeadUsd: 380, // filter, valves and main line for one plot
  compostUsdT: 45, // compost / well-rotted manure, per tonne delivered
  gypsumUsdT: 70, // agricultural gypsum (salty or sodic soil)
  limeUsdT: 60, // agricultural lime (acid soil)
  soilTestUsd: 55, // lab analysis per plot (OM, pH, EC, N-P-K)
  windbreakPlantUsd: 2.5, // native shrub / poplar cutting per plant
  windbreakPlantsM: 2, // double row: plants per metre
  dayWageUsd: 35, // one day of farm work
};

/** Who to ask for help, by zone (names only; look up the current contact). */
export const ADVICE_CONTACTS: Record<"patagonia" | "pampa", string[]> = {
  patagonia: ["INTA EEA Santa Cruz (agencies in Los Antiguos and Perito Moreno)", "Consejo Agrario Provincial de Santa Cruz", "Local producers' cooperative and fruit buyers"],
  pampa: ["INTA EEA Pergamino", "AAPRESID (no-till network) and CREA groups", "Grain cooperatives and collectors"],
};
