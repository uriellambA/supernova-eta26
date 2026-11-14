# 🌱 Growvia — NASA Space Apps Challenge 2026 (supernova-eta26)

Desafío **Adapting Farms with NASA Data** · Zona piloto: **Los Antiguos, Santa Cruz (Patagonia)**

Growvia es una herramienta de apoyo a la decisión (en inglés) que compara **estrategias de rotación de cultivos**: la rotación actual contra tres alternativas. Usa observaciones de la Tierra, datos locales de suelo, las características de cada cultivo y las prioridades del productor (agua, ingresos, salud del suelo, forraje, trabajo).

| Escritorio | Celular |
|---|---|
| ![Escritorio](docs/capturas/escritorio.png) | ![Celular](docs/capturas/celular.png) |

> Las capturas son del modo de prueba (`MOCK_DATA=1`, "Sample data"). El mapa satelital aparece negro porque el entorno de desarrollo no tenía acceso a internet. En un navegador normal se ve la imagen satelital.

## Pantalla (según el prototipo)
- **Encabezado:** Growvia, selector de campo (Los Antiguos), **🏔️ 3D View** y **🔌 Hardware**.
- **Izquierda, IA:** botón *AI · Analyze my field*, perfil de la chacra (sistema, ha, riego, agua) y notas libres o **por voz** (EN/ES). Después muestra la recomendación con 🔊 *Listen*, *Share* (WhatsApp) y *PDF*.
- **Centro:** mapa satelital (MapLibre). Se toca el mapa para ubicar el campo. Vista 3D con relieve.
- **Derecha, filtros del mapa:** salud de la vegetación (NDVI), temperatura de superficie, nieve, relieve y última pasada del satélite.
- **Botones bajo el mapa y panel inferior:**

| Botón | Qué muestra |
|---|---|
| Overview | Indicadores y **calendario del campo**: meses con helada, calor, déficit hídrico, viento y suelo desnudo |
| Soil | Estudio de suelo: textura, MO, pH, N, CIC, agua útil, humedad del suelo y NDVI |
| Rotations | Prioridades del productor y **4 estrategias comparadas**, con por qué, evidencia, beneficios, vacíos de información y riesgos |
| What you can do | **Geotermia, hidroponía y riego por goteo**, evaluados con los datos del campo |
| Forecast | Pronóstico de 14 días y alertas |
| Frost | Calendario de heladas de 20 años y probabilidad semanal |
| Water | Calculadora de riego por método y termómetro de nieve |

En la interfaz no aparecen las marcas de las fuentes de datos, para que se vea como un producto real. Las fuentes están documentadas en [`docs/estudio-suelo-los-antiguos.md`](docs/estudio-suelo-los-antiguos.md): NASA POWER, MODIS, SRTM, más SoilGrids y Open-Meteo. **Hay que nombrarlas en el pitch y en la página del proyecto para los jueces.**

## 🚀 Correr en local
```bash
npm install
```
```bash
npm run dev
```
Abrir http://localhost:3000. Para activar la IA, copiar `.env.example` a `.env.local` y cargar `OPENROUTER_API_KEY`.

Sin internet, con datos de muestra:
```bash
MOCK_DATA=1 npm run dev
```

Para extraer el estudio de suelo con datos reales (con la app corriendo):
```bash
node scripts/soil-study.mjs http://localhost:3000
```

## ☁️ Deploy en Vercel
1. Importar el repo en Vercel (Next.js, sin cambios en la configuración).
2. Cargar `OPENROUTER_API_KEY` en Settings → Environment Variables.
3. No cargar `MOCK_DATA` en producción.

## 🗂️ Dónde está cada cosa
```
config/site.ts        Los Antiguos: campos de referencia, cuenca, riego, suelo de referencia
config/crops.ts       características de los 14 cultivos
config/rotations.ts   estrategias de rotación por sistema (huerto, hortalizas, forraje)
lib/rotation.ts       motor que compara las rotaciones (agua, erosión, N, MO, plagas, forraje, ingresos)
lib/options.ts        geotermia, hidroponía, goteo
lib/soil.ts           suelo (SoilGrids + valores derivados)
lib/agro.ts           indicadores climáticos (heladas, ET0, viento, tendencias)
app/api/*             climate, vegetation, forecast, snow, soil, farm (IA), advisor (IA)
components/           Growvia (pantalla), MapView (3D), AIPanel, Sections, HardwareModal, Report
docs/                 plan, estudio de suelo de Los Antiguos
```

## Pendientes
- Ubicar los tres campos de referencia sobre chacras reales y validar los valores de suelo y cultivos con INTA.
- Sumar SMAP, ECOSTRESS, GPM y GRACE-FO vía AppEEARS (requiere cuenta de Earthdata).
- Correr `scripts/soil-study.mjs` con internet y actualizar el estudio de suelo.
