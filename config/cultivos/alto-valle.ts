import type { Cultivo } from "@/lib/types";

// Valores ORIENTATIVOS para el Alto Valle. Validar con bibliografía de INTA EEA Alto Valle.
// kc: enero..diciembre (FAO-56 adaptado, interfilar empastado en frutales).
const KC_PEPITA = [1.15, 1.15, 0.95, 0.75, 0.4, 0, 0, 0, 0.5, 0.65, 0.85, 1.05];
const KC_CAROZO = [1.0, 0.95, 0.85, 0.6, 0.3, 0, 0, 0, 0.5, 0.7, 0.95, 1.05];

export const CULTIVOS: Cultivo[] = [
  {
    id: "peral", nombre: "Peral (Williams, Packham's)", emoji: "🍐", tipo: "perenne",
    horasFrio: { min: 600, opt: 900 }, ventanaCritica: { desde: "09-15", hasta: "10-10", etapa: "floración" },
    umbralHelada: -2, sensibilidad: 0.9, libreHeladasMin: 150, gddMin: null, agua: "alta", salinidad: "media",
    raizProfunda: true, aniosProduccion: 4, inversion: "alta", kc: KC_PEPITA,
    adaptaciones: ["Defensa activa contra heladas en floración", "Variedades y portainjertos de alta densidad", "Malla antigranizo"],
  },
  {
    id: "manzano", nombre: "Manzano (Gala, Red, Granny)", emoji: "🍎", tipo: "perenne",
    horasFrio: { min: 800, opt: 1000 }, ventanaCritica: { desde: "09-25", hasta: "10-20", etapa: "floración" },
    umbralHelada: -2, sensibilidad: 0.85, libreHeladasMin: 150, gddMin: null, agua: "alta", salinidad: "baja",
    raizProfunda: true, aniosProduccion: 3, inversion: "alta", kc: KC_PEPITA,
    adaptaciones: ["Portainjerto enanizante (alta densidad)", "Defensa por aspersión", "Malla antigranizo"],
  },
  {
    id: "cerezo", nombre: "Cerezo (variedades tardías)", emoji: "🍒", tipo: "perenne",
    horasFrio: { min: 800, opt: 1100 }, ventanaCritica: { desde: "09-10", hasta: "10-05", etapa: "floración" },
    umbralHelada: -2, sensibilidad: 1, libreHeladasMin: 140, gddMin: null, agua: "media", salinidad: "baja",
    raizProfunda: true, aniosProduccion: 3, inversion: "alta", kc: KC_CAROZO,
    adaptaciones: ["Variedades de floración tardía", "Defensa activa contra heladas", "Riego por goteo", "Techos o malla contra lluvia en cosecha"],
  },
  {
    id: "nogal", nombre: "Nogal (Chandler, brotación tardía)", emoji: "🌰", tipo: "perenne",
    horasFrio: { min: 400, opt: 800 }, ventanaCritica: { desde: "10-01", hasta: "10-30", etapa: "brotación" },
    umbralHelada: -1.5, sensibilidad: 0.8, libreHeladasMin: 180, gddMin: null, agua: "alta", salinidad: "baja",
    raizProfunda: true, aniosProduccion: 6, inversion: "media",
    kc: [1.1, 1.1, 1.0, 0.7, 0.3, 0, 0, 0, 0, 0.5, 0.8, 1.1],
    adaptaciones: ["Variedades de brotación tardía", "Riego por goteo o microaspersión", "Cortinas rompevientos"],
  },
  {
    id: "vid", nombre: "Vid para vino (Malbec, Pinot Noir)", emoji: "🍇", tipo: "perenne",
    horasFrio: { min: 100, opt: 300 }, ventanaCritica: { desde: "09-25", hasta: "10-25", etapa: "brotación" },
    umbralHelada: -1, sensibilidad: 0.7, libreHeladasMin: 170, gddMin: 1300, agua: "baja", salinidad: "media",
    raizProfunda: true, aniosProduccion: 3, inversion: "media",
    kc: [0.75, 0.75, 0.6, 0.4, 0.2, 0, 0, 0, 0, 0.3, 0.5, 0.7],
    adaptaciones: ["Riego por goteo deficitario", "Poda tardía para retrasar la brotación", "Malla antigranizo"],
  },
  {
    id: "durazno", nombre: "Durazno / nectarina", emoji: "🍑", tipo: "perenne",
    horasFrio: { min: 400, opt: 700 }, ventanaCritica: { desde: "08-25", hasta: "09-25", etapa: "floración" },
    umbralHelada: -2, sensibilidad: 1, libreHeladasMin: 150, gddMin: null, agua: "media", salinidad: "baja",
    raizProfunda: false, aniosProduccion: 3, inversion: "media", kc: KC_CAROZO,
    adaptaciones: ["Defensa activa contra heladas (floración temprana)", "Ubicar en las partes altas de la chacra"],
  },
  {
    id: "ciruelo", nombre: "Ciruelo (industria)", emoji: "🟣", tipo: "perenne",
    horasFrio: { min: 700, opt: 900 }, ventanaCritica: { desde: "09-01", hasta: "09-30", etapa: "floración" },
    umbralHelada: -2, sensibilidad: 0.9, libreHeladasMin: 140, gddMin: null, agua: "media", salinidad: "baja",
    raizProfunda: false, aniosProduccion: 3, inversion: "media", kc: KC_CAROZO,
    adaptaciones: ["Defensa contra heladas", "Contrato con industria antes de plantar"],
  },
  {
    id: "membrillo", nombre: "Membrillo", emoji: "🟡", tipo: "perenne",
    horasFrio: { min: 300, opt: 450 }, ventanaCritica: { desde: "10-10", hasta: "11-05", etapa: "floración" },
    umbralHelada: -2, sensibilidad: 0.5, libreHeladasMin: 160, gddMin: null, agua: "media", salinidad: "media",
    raizProfunda: false, aniosProduccion: 3, inversion: "baja", kc: KC_PEPITA,
    adaptaciones: ["Floración tardía: menos riesgo de helada", "Valor agregado (dulce artesanal)"],
  },
  {
    id: "alfalfa", nombre: "Alfalfa", emoji: "🌿", tipo: "forraje",
    horasFrio: null, ventanaCritica: null, umbralHelada: -6, sensibilidad: 0.2, libreHeladasMin: 90, gddMin: null,
    agua: "alta", salinidad: "media", raizProfunda: true, aniosProduccion: 1, inversion: "baja",
    kc: [0.95, 0.95, 0.95, 0.7, 0.4, 0, 0, 0, 0.6, 0.9, 0.95, 0.95],
    adaptaciones: ["Cultivo puente durante la reconversión", "Mejora el suelo antes de replantar frutales"],
  },
  {
    id: "tomate", nombre: "Tomate para industria", emoji: "🍅", tipo: "anual",
    horasFrio: null, ventanaCritica: { desde: "10-20", hasta: "11-30", etapa: "trasplante" },
    umbralHelada: 0, sensibilidad: 1, libreHeladasMin: 140, gddMin: 1200, agua: "alta", salinidad: "media",
    raizProfunda: false, aniosProduccion: 0, inversion: "media",
    kc: [1.15, 1.1, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.9],
    adaptaciones: ["Trasplantar después de la última helada", "Riego por goteo con fertirriego", "Contrato con industria"],
  },
  {
    id: "cebolla", nombre: "Cebolla", emoji: "🧅", tipo: "anual",
    horasFrio: null, ventanaCritica: null, umbralHelada: -4, sensibilidad: 0.2, libreHeladasMin: 130, gddMin: null,
    agua: "media", salinidad: "baja", raizProfunda: false, aniosProduccion: 0, inversion: "baja",
    kc: [0.9, 0.75, 0, 0, 0, 0, 0, 0.5, 0.6, 0.8, 1.0, 1.05],
    adaptaciones: ["Riego frecuente: requiere turnos cortos o goteo", "Evitar suelos salinos"],
  },
  {
    id: "zapallo", nombre: "Zapallo y hortalizas de verano", emoji: "🎃", tipo: "anual",
    horasFrio: null, ventanaCritica: { desde: "11-01", hasta: "11-30", etapa: "siembra" },
    umbralHelada: 0, sensibilidad: 1, libreHeladasMin: 110, gddMin: 1000, agua: "media", salinidad: "media",
    raizProfunda: false, aniosProduccion: 0, inversion: "baja",
    kc: [1.0, 0.95, 0.75, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.8],
    adaptaciones: ["Sembrar con suelo > 12 °C", "Venta en mercado local", "Rápido retorno de la inversión"],
  },
  {
    id: "frutilla", nombre: "Frutilla", emoji: "🍓", tipo: "anual",
    horasFrio: null, ventanaCritica: { desde: "10-01", hasta: "10-31", etapa: "floración" },
    umbralHelada: -1, sensibilidad: 0.7, libreHeladasMin: 100, gddMin: null, agua: "media", salinidad: "baja",
    raizProfunda: false, aniosProduccion: 1, inversion: "media",
    kc: [0.85, 0.8, 0.75, 0.6, 0, 0, 0, 0, 0.5, 0.7, 0.85, 0.85],
    adaptaciones: ["Mulching y microtúnel contra heladas", "Goteo obligatorio", "Venta directa o agroturismo"],
  },
];
