export type Zona = {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  perfil: string;
  demo?: boolean;
};

export type Cuenca = {
  id: string;
  nombre: string;
  peso: number; // importancia para el riego de la región (suman 1)
  puntos: [number, number][]; // [lat, lon] de muestreo en la cordillera
};

export type RegionConfig = {
  id: string;
  nombre: string;
  idioma: string;
  timezone: string;
  centro: [number, number];
  zoom: number;
  zonas: Zona[];
  cuencasNieve: Cuenca[];
  riego: {
    sistemaDefault: SistemaRiego;
    turnoDefaultDias: number;
    dotacionBrutaMm: number; // agua bruta que entrega el sistema por temporada
    organismo: string;
  };
  fuentesLocales: string[];
};

export type SistemaRiego = "manto" | "surco" | "aspersion" | "goteo";
export type Nivel = "verde" | "amarillo" | "rojo";

export type Cultivo = {
  id: string;
  nombre: string;
  emoji: string;
  tipo: "perenne" | "anual" | "forraje";
  horasFrio: { min: number; opt: number } | null;
  ventanaCritica: { desde: string; hasta: string; etapa: string } | null; // MM-DD
  umbralHelada: number; // °C que daña en la etapa crítica
  sensibilidad: number; // 0..1
  libreHeladasMin: number; // días
  gddMin: number | null; // grados-día base 10 °C, sep→abr
  agua: "alta" | "media" | "baja";
  salinidad: "alta" | "media" | "baja"; // tolerancia
  raizProfunda: boolean;
  aniosProduccion: number;
  inversion: "alta" | "media" | "baja";
  kc: number[]; // 12 valores, enero..diciembre
  adaptaciones: string[];
};

// ---------- Pilar 1: NASA ----------
export type DiarioClima = {
  fechas: string[]; // YYYY-MM-DD
  tmin: (number | null)[];
  tmax: (number | null)[];
  lluvia: (number | null)[];
  viento: (number | null)[];
  humedadRaiz: (number | null)[];
};

export type Mensual = {
  mes: number;
  tmin: number;
  tmax: number;
  lluvia: number; // mm/mes
  et0: number; // mm/mes (Hargreaves con datos POWER)
  viento: number;
  humedadRaiz: number | null;
};

export type IndicadoresNasa = {
  fuente: string;
  simulado?: boolean;
  celda: { lat: number; lon: number };
  periodo: [number, number];
  calendario: {
    anios: number[];
    dias: string[]; // MM-DD del 01-09 al 30-11
    tmin: (number | null)[][]; // [anio][dia]
  };
  probSemanal: { inicio: string; p0: number; p2: number }[];
  ultimaHeladaMedia: string | null; // MM-DD
  ultimaHeladaP80: string | null;
  aniosHeladaTardia: number; // helada (≤0) después del 10/10
  libreHeladas: number; // días, promedio
  horasFrio: number; // promedio anual (modelo 0-7,2 °C)
  gdd10: number; // sep→abr
  lluviaAnual: number;
  et0Anual: number;
  mensual: Mensual[];
  tendencia: { decada1: number; decada2: number; dif: number } | null;
};

export type PuntoNdvi = { fecha: string; ndvi: number };
export type NdviResumen = {
  fuente: string;
  simulado?: boolean;
  serie: PuntoNdvi[];
  ultimo: PuntoNdvi | null;
  anioAnterior: PuntoNdvi | null;
};

// ---------- Pilar 3: Open-Meteo ----------
export type DiaPronostico = {
  fecha: string;
  tmin: number;
  tmax: number;
  lluvia: number;
  rafagas: number;
  viento: number;
  et0: number;
  horaMin: string | null; // HH:MM de la mínima
  pasado: boolean;
};
export type ClimaResumen = {
  fuente: string;
  simulado?: boolean;
  elevacion: number | null;
  dias: DiaPronostico[];
};

// ---------- Nieve ----------
export type NieveCuenca = {
  id: string;
  nombre: string;
  temporada: number;
  actualCm: number;
  promedioCm: number;
  pct: number; // actual / promedio
  serie: { anio: number; cm: number }[];
};
export type NieveResumen = {
  fuente: string;
  simulado?: boolean;
  hasta: string;
  cuencas: NieveCuenca[];
  indice: number; // ponderado
};

// ---------- Pilar 2: chacrero ----------
export type DatosChacrero = {
  superficieHa: number | null;
  usoActual: string | null;
  edadMonte: number | null;
  riego: SistemaRiego | null;
  turnoDias: number | null;
  diasDesdeRiego: number | null;
  pozo: boolean | null;
  defensaHeladas: "ninguna" | "aspersion" | "calefactores" | "ventiladores" | null;
  mallaAntigranizo: boolean | null;
  cortinas: boolean | null;
  textura: "arenoso" | "franco" | "arcilloso" | null;
  salinidad: "no" | "algo" | "mucha" | null;
  napaAlta: boolean | null;
  bajoHeladizo: boolean | null;
  presupuesto: "bajo" | "medio" | "alto" | null;
  plazoAnios: number | null;
  destino: string | null;
  notas: string | null;
};

export const CHACRERO_VACIO: DatosChacrero = {
  superficieHa: null,
  usoActual: null,
  edadMonte: null,
  riego: null,
  turnoDias: null,
  diasDesdeRiego: null,
  pozo: null,
  defensaHeladas: null,
  mallaAntigranizo: null,
  cortinas: null,
  textura: null,
  salinidad: null,
  napaAlta: null,
  bajoHeladizo: null,
  presupuesto: null,
  plazoAnios: null,
  destino: null,
  notas: null,
};

// ---------- Puntaje e IA ----------
export type Factor = { id: string; nombre: string; valor: number; peso: number; motivo: string };
export type CultivoPuntaje = {
  id: string;
  nombre: string;
  emoji: string;
  puntaje: number;
  semaforo: Nivel;
  factores: Factor[];
  riesgos: string[];
  adaptaciones: string[];
  aniosProduccion: number;
  inversion: string;
};

export type RecomendacionIA = {
  recomendaciones: {
    id: string;
    cultivo: string;
    porQue: string[];
    riesgos: string[];
    adaptaciones: string[];
    calendario: string;
  }[];
  alertaCortoPlazo: string | null;
  agua: string | null;
  resumenVoz: string;
  datosFaltantes: string[];
  confianza: "alta" | "media" | "baja";
  generadoPor: "ia" | "reglas";
};
