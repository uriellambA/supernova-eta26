// Extracts the soil & climate study for the Los Antiguos reference fields from a running Growvia app.
// Usage:  npm run dev   (in another terminal)   then   node scripts/soil-study.mjs http://localhost:3000
import { writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const FIELDS = [
  { id: "west", name: "West orchards", lat: -46.553, lon: -71.655 },
  { id: "town", name: "Town chacras", lat: -46.556, lon: -71.612 },
  { id: "east", name: "East chacras", lat: -46.545, lon: -71.57 },
];
const get = async (path) => {
  const r = await fetch(base + path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
};

const out = { generated: new Date().toISOString(), fields: [] };
for (const f of FIELDS) {
  const q = `lat=${f.lat.toFixed(2)}&lon=${f.lon.toFixed(2)}`;
  console.log("→", f.name);
  const [soil, climate, ndvi] = await Promise.all([
    get(`/api/soil?${q}`),
    get(`/api/climate?lat=${f.lat.toFixed(1)}&lon=${f.lon.toFixed(1)}`),
    get(`/api/vegetation?${q}`).catch(() => null),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop the heavy arrays
  const { calendario, probSemanal, mensual, ...clim } = climate;
  out.fields.push({ ...f, soil, climate: clim, monthly: mensual, ndviLatest: ndvi?.ultimo ?? null, ndviYearAgo: ndvi?.anioAnterior ?? null });
}
writeFileSync(new URL("../docs/estudio-suelo-datos.json", import.meta.url), JSON.stringify(out, null, 2));

const rows = out.fields.map((f) =>
  `| ${f.name} | ${f.soil.source === "soil-map" ? "mapa de suelos 250 m" : "referencia regional"} | ${f.soil.texture} | ${f.soil.sand}/${f.soil.silt}/${f.soil.clay} | ${f.soil.organicMatter} | ${f.soil.ph} | ${f.soil.nitrogen} | ${f.soil.cec} | ${f.soil.waterHolding} | ${f.climate.libreHeladas} | ${f.climate.lluviaAnual} | ${f.climate.et0Anual} | ${f.ndviLatest?.ndvi ?? "—"} |`,
);
const md = `# Datos extraídos — Los Antiguos (${out.generated.slice(0, 10)})

| Campo | Fuente suelo | Textura | Arena/Limo/Arcilla % | MO % | pH | N g/kg | CIC | Agua útil mm | Días libres de heladas | Lluvia mm | ET0 mm | NDVI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
writeFileSync(new URL("../docs/estudio-suelo-datos.md", import.meta.url), md);
console.log("✓ docs/estudio-suelo-datos.json y docs/estudio-suelo-datos.md");
