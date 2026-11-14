// ---------- Site & configuration ----------
export type FieldPreset = { id: string; name: string; lat: number; lon: number; note: string };
export type SiteConfig = {
  id: string;
  name: string;
  region: string;
  timezone: string;
  center: [number, number]; // [lon, lat]
  elevation: number; // typical farm elevation (m), fallback for the temperature correction
  zoom: number;
  bounds: [[number, number], [number, number]];
  fields: FieldPreset[];
  watershed: { name: string; points: [number, number][] }; // [lat, lon]
  irrigation: { defaultMethod: SistemaRiego; grossSupplyMm: number };
  soilReference: SoilValues;
};

export type SistemaRiego = "flood" | "furrow" | "sprinkler" | "drip";
export type Nivel = "good" | "watch" | "alert";

export type Crop = {
  id: string;
  name: string;
  emoji: string;
  family: string;
  kind: "perennial" | "annual" | "forage" | "cover";
  sensitive: { from: string; to: string; stage: string; threshold: number } | null; // MM-DD window
  minFrostFree: number;
  water: number;
  nFix: number;
  root: "shallow" | "medium" | "deep";
  cover: number;
  organicMatter: number;
  forage: number;
  income: number;
  labor: number;
  market: string;
  kc: number[];
};

export type FarmSystem = "orchard" | "vegetables" | "forage";
export type Strategy = {
  id: string;
  system: FarmSystem;
  current?: boolean;
  name: string;
  short: string;
  years: { main: string; winter: string | null }[];
  alley?: string | null;
  idea: string;
  gaps: string[];
  risks: string[];
};

// ---------- Climate record (daily, 20 years) ----------
export type DiarioClima = {
  fechas: string[];
  tmin: (number | null)[];
  tmax: (number | null)[];
  lluvia: (number | null)[];
  viento: (number | null)[];
  humedadRaiz: (number | null)[];
  humedadSup: (number | null)[];
  humedadRel?: (number | null)[]; // relative humidity %
  presion?: (number | null)[]; // surface pressure kPa
  uv?: (number | null)[]; // UV index (daily)
  elevCelda?: number | null; // mean elevation of the climate grid cell (m)
};

export type Mensual = {
  mes: number;
  tmin: number;
  tmax: number;
  lluvia: number;
  et0: number;
  viento: number;
  humedadRaiz: number | null;
  humedadSup: number | null;
  diasHelada: number; // average days/month with tmin ≤ 0
  diasCalor: number; // average days/month with tmax ≥ 30
  humedadRel: number | null; // %
  presion: number | null; // hPa
  uv: number | null; // UV index
};

export type Anual = { anio: number; lluvia: number; diasHelada: number; tMedia: number; heladaTardia: boolean; ultimaHelada: string | null; vientoPrim: number };

export type IndicadoresNasa = {
  simulado?: boolean;
  celda: { lat: number; lon: number };
  periodo: [number, number];
  calendario: { anios: number[]; dias: string[]; tmin: (number | null)[][] };
  probSemanal: { inicio: string; p0: number; p2: number }[];
  ultimaHeladaMedia: string | null;
  ultimaHeladaP80: string | null;
  aniosHeladaTardia: number; // frost after Nov 1
  libreHeladas: number;
  diasHeladaAnio: number;
  horasFrio: number;
  gdd10: number;
  lluviaAnual: number;
  et0Anual: number;
  tempMedia: number;
  vientoPrimavera: number; // m/s Sep–Dec
  mensual: Mensual[];
  tendencia: { decada1: number; decada2: number; dif: number } | null;
  tendenciaLluvia: { antes: number; despues: number; difPct: number } | null;
  anual: Anual[];
  humedadRelMedia: number | null;
  presionMedia: number | null;
  uvVerano: number | null;
  minAnual: number; // average of each year's coldest night (°C)
  altura?: { celda: number; campo: number; deltaC: number } | null; // elevation correction applied to temperatures
};

export type PuntoNdvi = { fecha: string; ndvi: number; evi?: number };
export type NdviResumen = { simulado?: boolean; serie: PuntoNdvi[]; ultimo: PuntoNdvi | null; anioAnterior: PuntoNdvi | null };

// ---------- Forecast ----------
export type DiaPronostico = {
  fecha: string;
  tmin: number;
  tmax: number;
  lluvia: number;
  rafagas: number;
  viento: number;
  et0: number;
  horaMin: string | null;
  pasado: boolean;
  humedad: number | null; // mean relative humidity %
  presion: number | null; // mean surface pressure hPa
  uv: number | null; // max UV index
};
export type ClimaResumen = { simulado?: boolean; elevacion: number | null; dias: DiaPronostico[] };

// ---------- Snowpack ----------
export type NieveCuenca = { id: string; nombre: string; temporada: number; actualCm: number; promedioCm: number; pct: number; serie: { anio: number; cm: number }[] };
export type NieveResumen = { simulado?: boolean; hasta: string; cuencas: NieveCuenca[]; indice: number };

// ---------- Soil ----------
export type SoilValues = {
  sand: number; // %
  silt: number; // %
  clay: number; // %
  soc: number; // g/kg
  ph: number;
  nitrogen: number; // g/kg
  cec: number; // cmol(+)/kg
  bulkDensity: number; // g/cm³
};
export type SoilResumen = SoilValues & {
  simulado?: boolean;
  source: "soil-map" | "reference";
  depth: string;
  texture: string;
  organicMatter: number; // %
  waterHolding: number; // mm in top 60 cm
  infiltration: "fast" | "moderate" | "slow";
  ksat: number; // saturated conductivity mm/h (Saxton & Rawls 2006)
  fieldCapacity: number; // volumetric %
  wiltingPoint: number; // volumetric %
};

// ---------- Soil health & salinity ----------
export type Salinity = { ece: number; cls: "low" | "moderate" | "high"; measured: boolean; reasons: string[] };
export type SoilHealth = { score: number; level: Nivel; parts: { name: string; value: number; note: string }[] };

// ---------- Climate oscillation (El Niño / La Niña) ----------
export type EnsoPhase = "El Niño" | "La Niña" | "Neutral";
export type EnsoResumen = {
  simulado?: boolean;
  live: boolean;
  current: { season: string; year: number; anomaly: number; phase: EnsoPhase } | null;
  years: { year: number; phase: EnsoPhase; anomaly: number | null }[];
};

// ---------- Farmer ----------
export type FarmProfile = {
  system: FarmSystem;
  areaHa: number;
  irrigation: SistemaRiego;
  water: "low" | "medium" | "high";
  notes: string;
};
export const DEFAULT_PROFILE: FarmProfile = { system: "orchard", areaHa: 5, irrigation: "furrow", water: "medium", notes: "" };

export type Priorities = { water: number; income: number; soil: number; forage: number; labor: number };
export const DEFAULT_PRIORITIES: Priorities = { water: 3, income: 2, soil: 3, forage: 1, labor: 1 };

export type GroundReading = { date: string; moisture: number | null; soilTemp: number | null; ec?: number | null; airTemp?: number | null; humidity?: number | null };

// ---------- Farm register (stored on the device) ----------
export type PlotRecord = {
  id: string;
  name: string;
  areaHa: number;
  crop: string; // species id
  plantedYear: number | null;
  history: { spring: string; summer: string; autumn: string; winter: string }; // last 12 months
  irrigation: SistemaRiego;
  yieldTHa: number | null;
};
export type FarmRegister = {
  farmName: string;
  producer: string;
  lat: number;
  lon: number;
  plots: PlotRecord[];
  water: { source: "canal" | "well" | "river" | "mixed"; turnDays: number | null; shortMonths: number[] };
  soilTest: { date: string; ph: number | null; ec: number | null; organicMatter: number | null; notes: string };
  economy: { channel: "export" | "national" | "local" | "tourism" | "processing"; workers: number; budgetUsd: number | null; machinery: string[] };
  livestock: boolean;
  interests: string[];
  priorities: Priorities;
  notes: string;
  updated: string;
};

// ---------- Rotation results ----------
export type StrategyResult = {
  strategy: Strategy;
  score: number;
  level: Nivel;
  metrics: {
    waterMm: number;
    bareMonths: number;
    erosion: number; // 0..1
    nitrogen: number; // kg/ha/yr
    organicMatter: number; // 0..1
    pestBreak: number; // 0..1
    forage: number;
    income: number;
    labor: number;
  };
  scores: Record<keyof Priorities, number>;
  why: string[];
  evidence: string[];
  benefits: string[];
  gaps: string[];
  risks: string[];
};

export type AdvisorResult = {
  summary: string;
  best: string; // strategy id
  notes: { id: string; text: string }[];
  askExpert: string[];
  voice: string;
  confidence: "high" | "medium" | "low";
  source: "ai" | "rules";
  seasons?: { spring: string; summer: string; autumn: string; winter: string };
  newCrops?: { id: string; why: string }[];
};
