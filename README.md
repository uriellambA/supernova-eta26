# 🌱 Growvia — NASA Space Apps Challenge 2026 (supernova-eta26)

Desafío **Adapting Farms with NASA Data** · Sitios: **Los Antiguos, Perito Moreno y Gobernador Gregores (Santa Cruz, Patagonia)** y **Pampa Ondulada (Pergamino, Buenos Aires)**

Growvia es una herramienta de apoyo a la decisión (en inglés) para productores. Compara la **rotación de cultivos actual con tres alternativas** y arma un **plan para las cuatro estaciones**. También propone **cultivos nuevos** para cuando termina la temporada de cerezas y frutillas, y evalúa su **viabilidad económica** y las **contingencias** (heladas, viento, sequía, El Niño / La Niña). Para todo esto usa observaciones de la Tierra, el suelo, el registro del productor y sus prioridades.

| Introducción | Panel (escritorio) | Celular |
|---|---|---|
| ![Inicio](docs/capturas/inicio.png) | ![Escritorio](docs/capturas/escritorio.png) | ![Celular](docs/capturas/celular.png) |

> Las capturas son del modo de prueba (`MOCK_DATA=1`, "Sample data"). El mapa satelital aparece vacío porque el entorno de desarrollo no tenía internet.

## Páginas
| Ruta | Qué es |
|---|---|
| `/` | **Introducción**: qué es Growvia, comparador "índice de vegetación vs imagen original", cómo funciona (con capturas reales), funciones en bento y **la base de datos** que usa |
| `/app` | **Panel** dividido en 5 pestañas para no mostrar todo junto: **Resumen** (mapa, SI y 4 indicadores), **Plan de rotación**, **Cultivos y economía**, **Clima y riesgos**, **Suelo y agua** |
| `/register` | **Registro del productor**: chacra (con **búsqueda por calle**, ubicación en el mapa satelital y **dibujo del límite** que calcula hectáreas y perímetro), lotes, qué hubo en cada estación, agua, análisis de suelo, economía y objetivos. Se guarda en el dispositivo y se puede exportar o importar en JSON |

### Pestañas del panel (atajos `1`–`5`)
| Pestaña | Sub-pestañas |
|---|---|
| Resumen | **la mejor rotación para tu campo arriba de todo** (puntaje vs la actual, ranking, estaciones), mapa satelital con el límite de la chacra, SI, vegetación, clima de hoy, salud del suelo, alertas |
| **Rotación de cultivos** (lo central) | Comparar rotaciones (tabla lado a lado, **explorador de 2 escenarios** con ciclo de nutrientes, erosión, materia orgánica, plagas, agua, forraje y mercado, **mapa de qué idea sirve para cada objetivo**, **cómo ayuda al suelo cada tipo de cultivo** + tarjetas con por qué, evidencia, beneficios, vacíos y riesgos) · **Diseñar la tuya** (armás tu rotación año por año, o partís del registro, y se puntúa junto a las demás) · Plan del año · Cómo se calcula (método y glosario) |
| Cultivos y economía | Cultivos nuevos · Viabilidad · Qué podés hacer (geotermia, hidroponía, goteo) |
| Clima y riesgos | Pronóstico · Contingencias · Heladas · Registro climático |
| Suelo y agua | Suelo · Riego |

Atajos: `A` analizar con el SI · `D` vista 3D · `H` hardware · `R` registro · `S` guardar registro.

### Filtro de riesgo de salinidad (SMAP)
En el mapa, el filtro **Salinity risk · SMAP** pinta el riesgo de acumulación de sales a partir de la humedad del suelo del satélite **SMAP** (primeros 5 cm, 9 km). Las capas se toman de GIBS y se decodifican con su paleta oficial. En la pestaña Suelo, `/api/smap` lee el valor de SMAP en el punto (8 semanas) y lo suma a la estimación de salinidad.
Ojo: **SMAP no mide sal**, mide humedad. En un valle árido, una superficie que se mantiene húmeda con mucha evaporación hace subir el agua y deja sales: eso es el riesgo. Hay que confirmarlo con un análisis de conductividad eléctrica (CE). La resolución de 9 km muestra tendencias del valle, no el detalle de un lote.

### Sitios
| Sitio | Zona | Sistemas | Estudio de suelo |
|---|---|---|---|
| Los Antiguos | Patagonia, valle regado | huerto, hortalizas, forraje | [`docs/estudio-suelo-los-antiguos.md`](docs/estudio-suelo-los-antiguos.md) |
| Perito Moreno | Patagonia, estepa y valle del río Fénix | forraje, hortalizas, huerto | [`docs/estudio-suelo-perito-moreno.md`](docs/estudio-suelo-perito-moreno.md) |
| Gobernador Gregores | Patagonia, valle del río Chico | forraje, hortalizas, huerto | [`docs/estudio-suelo-gobernador-gregores.md`](docs/estudio-suelo-gobernador-gregores.md) |
| Pampa Ondulada | Pampa húmeda, secano (Pergamino) | granos, forraje | [`docs/estudio-suelo-pampa-ondulada.md`](docs/estudio-suelo-pampa-ondulada.md) |

Cada sitio está en `config/sites.ts`: centro, límites del mapa, altura, cuenca de nieve (si hay), riego, suelo de referencia, sistemas típicos y contexto regional. La Pampa Ondulada suma cultivos (soja, maíz, trigo, cebada, girasol), rotaciones de granos y especies propias (colza, garbanzo, sorgo, pecán), además de contingencias de anegamiento y sequía por La Niña. En el panel se elige el sitio arriba, y al registrar la chacra lo primero es elegir la ubicación. Ya no hay chacras predefinidas.

### Clima en el mapa
Debajo de los filtros satelitales, **Weather now** pinta sobre el mapa la temperatura, el UV, el viento (con flechas), la humedad, la lluvia, la presión y las nubes. Usa las condiciones actuales de Open-Meteo en una grilla de 7×5 puntos sobre el sitio (`/api/weather-grid`).

### Temas
El botón de tema alterna **claro → oscuro → tierra**. El tema tierra es rojizo, con los colores del logo.

### Sesiones, WhatsApp y PDF
- Cada vez que tocás **Analizar mi campo** (podés escribir o dictar una pregunta, por ejemplo "¿Qué puedo plantar para verano?"), el resultado se guarda como **sesión** en el dispositivo. Desde **Sesiones guardadas** se vuelve a abrir, compartir o borrar.
- **Compartir:** cada sesión tiene un **link** (`/s#…`). La sesión entera va comprimida dentro del link: no se guarda nada en un servidor. Quien lo abre ve el informe completo y puede guardarlo en su teléfono.
- **WhatsApp:** dos mensajes distintos. *Resumen* (para socios o asesores: pregunta y respuesta, rotación recomendada contra la actual, plan por estación, cultivos nuevos) y *Tareas para el equipo* (para trabajadores: alertas de la semana y tareas de la estación). Los dos incluyen el link.
- **PDF:** informe A4 con un **código QR** que abre el mismo informe en el celular.
- **Voz:** usa la voz más natural del dispositivo al máximo volumen y lee frase por frase. Para una voz más fuerte y clara, cargá `TTS_API_KEY` (API compatible con OpenAI): esa voz se amplifica ×2,5 con compresor.

### Idioma EN / ES
El botón **EN | ES** de cada encabezado traduce toda la página al español (Argentina) o la deja en inglés. Se recuerda en el dispositivo y la primera vez sigue el idioma del navegador. El SI responde en el idioma elegido, y la voz y el dictado también lo usan. Para traducir un texto nuevo, agregalo a `lib/i18n-es.ts` (`{n}` = número, `{x}` = texto).

### Imagen satelital real de una chacra (introducción)
El comparador de la introducción muestra una **chacra real de Los Antiguos**: a la derecha, la foto satelital de alta resolución; a la izquierda, el **NDVI**. Para generar las imágenes definitivas (hace falta internet, no hace falta ninguna clave):
```bash
npm run landing-images
```
Baja la foto satelital (Esri World Imagery, ~1 m) y calcula el NDVI real con las bandas roja (B04) e infrarroja cercana (B08) de **Sentinel-2** (10 m, la escena de verano con menos nubes). Las guarda en `public/landing/` (`chacra-color.jpg`, `chacra-ndvi.jpg`, `chacra.json`). Después hay que commitear esa carpeta. La zona se elige en `config/site.ts` → `showcase` (o con `--lat --lon --width --height`).
Mientras esas imágenes no existan, la página arma la imagen satelital real en vivo en el navegador, con un índice de vegetación de bandas visibles (VARI), porque la foto común no trae infrarrojo.

### Lo nuevo en v0.3
- **Diseño:** paleta monocroma cálida y grilla bento asimétrica. Tarjetas con borde de 1 px `#EAEAEA` y 24 px de padding, CTA `#111111`, badges en azul y verde pastel. Títulos en Instrument Serif y texto en Geist Sans. Animaciones al hacer scroll, atajos `<kbd>`, sin sombras y modo oscuro opcional.
- **Variables nuevas:** índice **EVI** junto a NDVI, **humedad relativa, presión atmosférica, UV**, evaporación y **salinidad** del suelo. La salinidad se estima con aridez, pH, drenaje y riego, o se toma de un análisis o sensor si está cargado.
- **Suelo:** retención de agua y conductividad con las ecuaciones de **Saxton & Rawls**, más un **índice de salud del suelo** (0–100).
- **Cultivos nuevos:** `config/species.ts` reúne 20 especies (cereza y frutilla actuales más haskap, calafate, rosa mosqueta, espino amarillo, azafrán, lavanda, lúpulo, ruibarbo, espárrago, saúco, avellano, quinoa, verduras en túnel, manzana, arándano, nogal). Cada una se evalúa contra la helada en floración, el frío invernal, el calor, las horas de frío, el pH, la salinidad, el agua y el viento.
- **Viabilidad:** rendimiento, precio, margen, inversión y años de recupero, ajustados por la aptitud del lote. Incluye un contexto regional.
- **Contingencias:** heladas tardías, viento, sequía o poca nieve, calor/UV, granizo y ceniza volcánica, con un plan de antes, durante y después. Suma **El Niño / La Niña** (índice ONI en vivo) y qué significó cada fase en ese campo en los últimos 20 años.
- **SI:** también usa el registro, las especies, la salud del suelo y la fase del Pacífico. Devuelve un plan por estación y hasta 3 cultivos nuevos.
- **Hardware:** el Field Node suma sensores de salinidad (EC), aire (temperatura, humedad, presión) y UV.

En la interfaz no aparecen las marcas de las fuentes de datos, para que se vea como un producto real. Las fuentes están en [`docs/estudio-suelo-los-antiguos.md`](docs/estudio-suelo-los-antiguos.md): NASA POWER (temperatura, lluvia, viento, humedad, presión, UV, humedad del suelo), MODIS MOD13Q1 (NDVI/EVI) y capas GIBS, más SoilGrids, Open-Meteo y el índice ONI de NOAA. **Hay que nombrarlas en el pitch y en la página del proyecto para los jueces.**

## 🚀 Correr en local
```bash
npm install
```
```bash
npm run dev
```
Abrir http://localhost:3000 (introducción) o http://localhost:3000/app (panel). Para activar el SI, copiar `.env.example` a `.env.local` y cargar `OPENROUTER_API_KEY`.

Sin internet, con datos de muestra:
```bash
MOCK_DATA=1 npm run dev
```

## 🧪 Estudio de suelo avanzado (un comando)
```bash
npm run soil-study
```
Por cada punto extrae el **perfil completo de suelo** (6 profundidades, 0–200 cm, con rango de incertidumbre). Con eso calcula textura, agua útil y conductividad (Saxton & Rawls), salinidad estimada y salud del suelo. Suma el clima de 20 años, NDVI/EVI, el ranking de las 20 especies con su economía y las rotaciones. Genera `report.md`, `data.json`, `points.csv`, `profile.csv` y `species.csv` en `docs/soil-study/`.

Opciones:
```bash
npm run soil-study -- --site perito-moreno
```
```bash
npm run soil-study -- --all
```
```bash
npm run soil-study -- --lat -46.55 --lon -71.62 --name "Mi chacra"
```
```bash
npm run soil-study -- --grid 3 --system vegetables --irrigation drip
```
```bash
npm run soil-study -- --offline
```
`--offline` usa los valores de referencia y un clima simulado: sirve solo para probar.

## ☁️ Deploy en Vercel
1. En Vercel: **Add New → Project → Import** el repo `supernova-eta26`. El framework se detecta solo: **Next.js**.
2. **No cambies los comandos.** `vercel.json` ya fija `npm install` y `npm run build`. Nunca uses `npm run dev` como comando de build: es un servidor que no termina y el deploy queda colgado.
3. Settings → **Environment Variables**: `OPENROUTER_API_KEY` (opcional; sin ella el SI usa la respuesta por reglas). **No** cargues `MOCK_DATA`.
4. Rama: Vercel publica en producción la rama **main**. Los pushes a otras ramas (por ejemplo `claude/tender-goldberg-h7s3dz`) generan un *Preview* con su propia URL. Para producción, uní la rama a `main` o cambiá la *Production Branch* en Settings → Git.

Si en local aparece un error de *hydration* con textos viejos, limpiá el caché de compilación:
```bash
npm run clean
```

## 🗂️ Dónde está cada cosa
```
config/site.ts         Los Antiguos: campos de referencia, cuenca, riego, suelo de referencia
config/crops.ts        cultivos de las rotaciones (Kc mensual, N, cobertura…)
config/species.ts      20 especies: actuales y nuevas, rasgos agronómicos y economía
config/rotations.ts    estrategias de rotación por sistema
lib/rotation.ts        motor de comparación de rotaciones
components/RotationExplorer.tsx  explorador: 2 escenarios × 7 miradas, mapa de ajuste idea↔objetivo, rol de cada tipo de cultivo
lib/seasons.ts         grilla por estación y plan anual
lib/suitability.ts     aptitud + viabilidad de especies, cobertura de cosecha por mes
lib/soil.ts            SoilGrids, Saxton & Rawls, salinidad, salud del suelo
lib/enso.ts            El Niño / La Niña (ONI) e impactos por fase en el campo
lib/contingency.ts     contingencias con estado en vivo y planes
lib/register.ts        registro del productor → perfil para el motor y el SI
app/page.tsx           introducción · app/app: panel · app/register: registro
app/api/*              climate, vegetation, forecast, snow, soil, enso, farm (SI), advisor (SI)
components/            Growvia (panel bento), PlanSections, Sections, RegisterForm, landing/*, ui
scripts/soil-study.ts  comando de estudio de suelo avanzado
```

## Pendientes
- Correr `npm run soil-study` con internet y actualizar `docs/estudio-suelo-los-antiguos.md` con los datos reales.
- Validar con INTA y cooperativas los valores de especies, precios y costos, y ubicar los campos sobre chacras reales.
- Sumar SMAP, ECOSTRESS, GPM y GRACE-FO vía AppEEARS (requiere cuenta de Earthdata).
