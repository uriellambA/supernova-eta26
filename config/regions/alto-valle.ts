import type { RegionConfig } from "@/lib/types";

// Toda la información propia del Alto Valle vive acá.
// Para sumar otra región: copiar este archivo + un catálogo en config/cultivos/.
// Coordenadas APROXIMADAS: ajustarlas sobre la capa satelital para que caigan en chacras.
export const altoValle: RegionConfig = {
  id: "alto-valle",
  nombre: "Alto Valle de Río Negro y Neuquén",
  idioma: "es-AR",
  timezone: "America/Argentina/Buenos_Aires",
  centro: [-38.98, -67.6],
  zoom: 10,
  zonas: [
    { id: "centenario", nombre: "Centenario", lat: -38.82, lon: -68.13, perfil: "Frutales y horticultura periurbana" },
    { id: "plottier", nombre: "Plottier", lat: -38.95, lon: -68.23, perfil: "Frutales y horticultura" },
    { id: "cinco-saltos", nombre: "Cinco Saltos", lat: -38.82, lon: -68.06, perfil: "Peras y manzanas (oeste del valle)" },
    { id: "cipolletti", nombre: "Cipolletti", lat: -38.94, lon: -67.97, perfil: "Peras, manzanas, presión urbana" },
    { id: "fernandez-oro", nombre: "Fernández Oro", lat: -38.96, lon: -67.92, perfil: "Peras" },
    { id: "allen", nombre: "Allen", lat: -38.99, lon: -67.82, perfil: "Capital de la pera", demo: true },
    { id: "roca", nombre: "General Roca", lat: -39.04, lon: -67.56, perfil: "Manzanas, peras, empaque, reconversión", demo: true },
    { id: "cervantes", nombre: "Cervantes / Mainqué", lat: -39.05, lon: -67.35, perfil: "Frutales, cerezas" },
    { id: "huergo", nombre: "Ingeniero Huergo", lat: -39.08, lon: -67.23, perfil: "Frutales" },
    { id: "regina", nombre: "Villa Regina", lat: -39.11, lon: -67.07, perfil: "Frutales y vid (este del valle)", demo: true },
    { id: "chichinales", nombre: "Chichinales", lat: -39.12, lon: -66.94, perfil: "Límite este: frutales y pasturas" },
  ],
  cuencasNieve: [
    {
      id: "neuquen-alta",
      nombre: "Alta cuenca del río Neuquén",
      peso: 0.6, // el Canal Principal del Alto Valle toma agua del Neuquén (dique Ballester)
      puntos: [
        [-36.8, -70.6],
        [-37.0, -70.9],
        [-37.3, -70.7],
      ],
    },
    {
      id: "limay-alta",
      nombre: "Alta cuenca del río Limay",
      peso: 0.4,
      puntos: [
        [-39.2, -71.2],
        [-39.7, -71.4],
        [-41.1, -71.7],
      ],
    },
  ],
  riego: {
    sistemaDefault: "manto",
    turnoDefaultDias: 10,
    dotacionBrutaMm: 1400,
    organismo: "Consorcios de riego / DPA Río Negro",
  },
  fuentesLocales: ["INTA EEA Alto Valle", "Secretaría de Fruticultura de Río Negro", "AIC (Autoridad Interjurisdiccional de Cuencas)"],
};

export const REGION = altoValle;
