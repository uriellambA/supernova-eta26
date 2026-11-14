import type { Strategy } from "@/lib/types";

// Rotation strategies per farming system. The first of each system is the EXISTING (current) rotation.
// years: one entry per year → main = growing-season crop (Oct–Apr), winter = what covers the field May–Sep (null = bare).
// alley: ground cover between orchard rows (null = bare / herbicide strip).
export const STRATEGIES: Strategy[] = [
  // ---------- Orchards ----------
  {
    id: "o-current", system: "orchard", current: true, name: "Cherry orchard, bare alleys", short: "Current",
    years: [{ main: "cherry", winter: null }], alley: null,
    idea: "Your existing system: cherries with bare or herbicide-kept alleys.",
    gaps: ["Real alley width and how much ground stays bare", "Current fertilizer and herbicide use"],
    risks: ["Bare alleys lose topsoil to the strong westerly winds", "Low organic matter keeps water holding capacity low"],
  },
  {
    id: "o-clover", system: "orchard", name: "Cherry + clover-grass alleys", short: "Living alleys",
    years: [{ main: "cherry", winter: "clover" }], alley: "clover",
    idea: "A permanent white clover and fescue cover in the alleys, mowed and blown under the trees as mulch.",
    gaps: ["Extra water the alley cover will need in January–February", "Mowing equipment available"],
    risks: ["Clover competes for water if irrigation is short", "Can host voles: monitor near trunks"],
  },
  {
    id: "o-rye", system: "orchard", name: "Cherry + winter rye cover", short: "Winter cover",
    years: [{ main: "cherry", winter: "rye" }], alley: "rye",
    idea: "Sow rye in the alleys after harvest; it protects the soil all winter and is rolled as mulch before bloom.",
    gaps: ["Sowing date that still establishes before the first frosts"],
    risks: ["Rye left too long can raise frost risk at bloom (cover holds cold air): roll it before October"],
  },
  {
    id: "o-diverse", system: "orchard", name: "Cherry + berry hedgerows + clover", short: "Diversify",
    years: [{ main: "cherry", winter: "clover" }, { main: "raspberry", winter: "clover" }], alley: "clover",
    idea: "Add raspberry and currant hedgerows as windbreaks and a second income, with clover alleys.",
    gaps: ["Local demand and price for berries", "Labor available at harvest"],
    risks: ["Berry harvest overlaps with cherry harvest (labor peak)", "Shared pests: check spotted wing drosophila"],
  },
  // ---------- Vegetables ----------
  {
    id: "v-current", system: "vegetables", current: true, name: "Potato → garlic, bare winters", short: "Current",
    years: [{ main: "potato", winter: null }, { main: "garlic", winter: null }],
    idea: "Your existing system: potatoes and garlic alternating, soil left bare after harvest.",
    gaps: ["Fertilizer history and last soil test"],
    risks: ["Bare winters → wind erosion", "Short rotation builds up soil diseases and pests"],
  },
  {
    id: "v-cover", system: "vegetables", name: "Same crops + winter covers", short: "Winter cover",
    years: [{ main: "potato", winter: "rye" }, { main: "garlic", winter: "oats-vetch" }],
    idea: "Keep potatoes and garlic but never leave the soil bare: rye after potatoes, oats + vetch after garlic.",
    gaps: ["Time window between harvest and first frost to sow covers"],
    risks: ["Covers need one or two extra irrigations to establish"],
  },
  {
    id: "v-legume", system: "vegetables", name: "4-year legume rotation", short: "Legume break",
    years: [{ main: "alfalfa", winter: "alfalfa" }, { main: "alfalfa", winter: "alfalfa" }, { main: "potato", winter: "oats-vetch" }, { main: "garlic", winter: "rye" }],
    idea: "Two years of alfalfa rebuild nitrogen and structure, followed by potatoes and garlic.",
    gaps: ["Hay market or own livestock for the alfalfa years"],
    risks: ["Less vegetable income in the alfalfa years", "Alfalfa needs good irrigation in summer"],
  },
  {
    id: "v-water", system: "vegetables", name: "Water-saver rotation", short: "Save water",
    years: [{ main: "garlic", winter: "rye" }, { main: "pea", winter: "oats-vetch" }, { main: "fava", winter: "rye" }],
    idea: "Low-water crops (garlic, peas, fava) plus winter covers, built for dry years.",
    gaps: ["Market for peas and fava beans"],
    risks: ["Lower income per hectare than potatoes"],
  },
  // ---------- Forage ----------
  {
    id: "f-current", system: "forage", current: true, name: "Continuous alfalfa", short: "Current",
    years: [{ main: "alfalfa", winter: "alfalfa" }],
    idea: "Your existing system: alfalfa re-sown every 5–6 years in the same field.",
    gaps: ["Stand age and current yield"],
    risks: ["Alfalfa after alfalfa suffers autotoxicity and disease build-up", "High summer water use"],
  },
  {
    id: "f-break", system: "forage", name: "Alfalfa with a crop break", short: "Crop break",
    years: [{ main: "alfalfa", winter: "alfalfa" }, { main: "alfalfa", winter: "alfalfa" }, { main: "alfalfa", winter: "alfalfa" }, { main: "potato", winter: "oats-vetch" }, { main: "oats-vetch", winter: "oats-vetch" }],
    idea: "After 3 years of alfalfa, a potato cash crop uses the stored nitrogen, then oats + vetch before re-sowing.",
    gaps: ["Equipment for potatoes"],
    risks: ["Potato year needs more labor and frost care"],
  },
  {
    id: "f-mixed", system: "forage", name: "Alfalfa–grass mix, rotational grazing", short: "Mixed pasture",
    years: [{ main: "alfalfa", winter: "pasture" }, { main: "pasture", winter: "pasture" }],
    idea: "Mix alfalfa with orchard grass and graze in paddocks: more ground cover and less water.",
    gaps: ["Fencing and water points for paddocks"],
    risks: ["Bloat risk for cattle on lush alfalfa"],
  },
  {
    id: "f-cash", system: "forage", name: "Alfalfa → garlic → fava", short: "Cash crops",
    years: [{ main: "alfalfa", winter: "alfalfa" }, { main: "alfalfa", winter: "alfalfa" }, { main: "garlic", winter: "oats-vetch" }, { main: "fava", winter: "rye" }],
    idea: "Use the nitrogen alfalfa leaves to grow garlic and fava beans for extra income.",
    gaps: ["Garlic seed availability and buyers"],
    risks: ["More labor than pure forage"],
  },
];

export const SYSTEMS = [
  { id: "orchard", name: "Orchard", emoji: "🍒" },
  { id: "vegetables", name: "Vegetables", emoji: "🥔" },
  { id: "forage", name: "Forage", emoji: "🌿" },
] as const;
