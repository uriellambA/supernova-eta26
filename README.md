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
| `/` | **Portada**: título sobre plata y agua, 3 datos, botón **Download Growvia Desktop**, Growwy con 3 preguntas rápidas, botones **Sobre nosotros** y **Sobre Growwy**, y la demo **Probalo ahora** (sin registrarte). Arranca en español |
| `/growwy` | **Sobre Growwy**: qué es Growwy, la Pachamama, en qué se basa y cómo ayuda a decidir |
| `/about` | **Sobre nosotros**: el desafío (**Field Shift: Adapting Farms with NASA Data**), el equipo, el comparador satelital Sentinel-2 (NDVI vs color real), cómo funciona, qué te llevás, plan PDF de ejemplo y **Nuestros datos abiertos** (cada fuente, para qué se usa y su licencia) |
| `/download` | **Descargas**: app oficial para Windows, macOS, Linux y Android (Rust/Tauri, se completa en `config/downloads.ts` al publicar) e instrucciones para instalar la app web en iPhone o cualquier equipo |
| `/data` | **Datos técnicos**: las capas satelitales, climáticas y de suelo detrás de cada recomendación (antes estaba en la portada) |
| `/plan` | **Plan de acción** de Growwy para guardar como PDF |
| `/app` | **Panel** (con la tarjeta **¿Qué tan efectiva va a ser?**: efectividad de la rotación recomendada, aspecto por aspecto hoy → con el plan, cuándo se ve cada mejora, confianza según los datos medidos y qué podría hacerla menos efectiva; también va en el PDF. Pide registrar la chacra primero: con nombre y ubicación alcanza; después vuelve solo, con la pregunta que traías) dividido en 5 pestañas para no mostrar todo junto: **Resumen** (mapa, SI y 4 indicadores), **Plan de rotación**, **Cultivos y economía**, **Clima y riesgos**, **Suelo y agua** |
| `/register` | **Registro del productor**: chacra (con **búsqueda por calle**, ubicación en el mapa satelital y **dibujo del límite** que calcula hectáreas y perímetro), lotes, qué hubo en cada estación, agua, análisis de suelo, economía y objetivos. Se guarda en el dispositivo y se puede exportar o importar en JSON |

### Pestañas del panel (atajos `1`–`5`)
| Pestaña | Sub-pestañas |
|---|---|
| Resumen | **la mejor rotación para tu campo arriba de todo** (puntaje vs la actual, ranking, estaciones), mapa satelital con el límite de la chacra, SI, vegetación, clima de hoy, salud del suelo, alertas |
| **Rotación de cultivos** (lo central) | Comparar rotaciones (tabla lado a lado, **explorador de 2 escenarios** con ciclo de nutrientes, erosión, materia orgánica, plagas, agua, forraje y mercado, **mapa de qué idea sirve para cada objetivo**, **cómo ayuda al suelo cada tipo de cultivo** + tarjetas con por qué, evidencia, beneficios, vacíos y riesgos) · **Diseñar la tuya** (armás tu rotación año por año, o partís del registro, y se puntúa junto a las demás) · Plan del año · Cómo se calcula (método y glosario) |
| Cultivos y economía | Cultivos nuevos · Viabilidad · Qué podés hacer (geotermia, hidroponía, goteo) |
| Clima y riesgos | Pronóstico · Contingencias · Heladas · Registro climático |
| Suelo y agua | Suelo · Riego |

Atajos: `A` analizar con el SI · `D` vista 3D · `R` registro · `S` guardar registro.

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

Cada sitio está en `config/sites.ts`: centro, límites del mapa (los mapas satelitales solo muestran el pueblo y su zona rural, no se puede alejar a toda la Argentina), altura, cuenca de nieve (si hay), riego, suelo de referencia, sistemas típicos y contexto regional. La Pampa Ondulada suma cultivos (soja, maíz, trigo, cebada, girasol), rotaciones de granos y especies propias (colza, garbanzo, sorgo, pecán), además de contingencias de anegamiento y sequía por La Niña. En el panel se elige el sitio arriba, y al registrar la chacra lo primero es elegir la ubicación. Ya no hay chacras predefinidas.

### Clima en el mapa
Debajo de los filtros satelitales, **Weather now** pinta sobre el mapa la temperatura, el UV, el viento (con flechas), la humedad, la lluvia, la presión y las nubes. Usa las condiciones actuales de Open-Meteo en una grilla de 7×5 puntos sobre el sitio (`/api/weather-grid`).

### Growwy, la Pachamama
Growwy es el SI de Growvia y aparece como la **Pachamama**, con la ilustración del equipo (`public/brand/pachamama/`: `body.webp` sin las hojas y `leaves.webp` con las 5 hojas aparte, para animarlas una por una). `components/Pachamama.tsx` tiene dos variantes: **busto** (tarjeta del panel) y **cuerpo entero** (sección "¿Qué es Growwy?" de la página de inicio).

- **Animaciones:** respira, parpadea, las hojas flotan alrededor del puño; mientras el SI analiza las hojas giran rápido y el brillo late.
- **Boca con la voz:** al escucharla, la mandíbula baja y se abre la boca siguiendo la voz (volumen real con la voz del servidor; cada palabra con la voz del dispositivo, `lib/voz.ts`).
- **Panel:** sale debajo de "Analizar mi campo" con un globo que muestra la respuesta completa (se desliza si es larga) y el botón **Escuchar a Growwy**.
- **Página de inicio:** sección **¿Qué es Growwy?** con la Pachamama de cuerpo entero, qué hace, en qué se basa y que la decisión final es del productor; también puede presentarse en voz alta.
- **Voz sin espera:** apenas llega la respuesta se genera el audio en partes (la primera frase primero, el resto en paralelo) y, con **Voz automática: sí**, Growwy empieza a hablar sola. El audio se habilita en el mismo toque de "Analizar" o "Enviar", así los celulares no lo bloquean. El botón **Escuchar** reutiliza el audio ya generado.
- **Responder:** debajo de la respuesta, **Responder** abre un campo (escribir o dictar) para contestarle a Growwy; la conversación anterior viaja con la pregunta, así el SI sigue el hilo.
- **Gráficos en la conversación:** cada respuesta puede traer hasta 2 gráficos o tablas (rotaciones comparadas, agua necesaria vs lluvia, heladas por mes, clima, cultivos nuevos, dinero por hectárea, estaciones, cómo dividir el campo). Los elige el SI (`visuals`) o, sin clave, se eligen por palabras de la pregunta (`components/growwy/Visuals.tsx`).
- **Pantalla completa:** el botón ⛶ abre a Growwy en grande con toda la conversación, los gráficos, el resumen del plan y el campo para responder (Esc para salir).
- **Plan de acción en PDF:** "Armar mi plan (PDF)" junta la conversación en un documento A4 (`/plan`, `lib/plan.ts`, `components/PlanDoc.tsx`): qué hacer paso a paso, cómo dividir el campo (mapa a escala con lotes, pruebas y cortina rompevientos), calendario, materiales con cantidades y precios de referencia (`config/materials.ts`), inversión, costos anuales, ingresos y en qué año se recupera, estaciones, riesgos, qué verificar y a quién consultar. Se guarda como PDF o se manda por WhatsApp. Después de un ida y vuelta, Growwy invita a armarlo.
- Con "reducir movimiento" activado en el sistema queda quieta.

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
Usa solo datos abiertos: arma la imagen en color real y calcula el NDVI con las bandas roja (B04) e infrarroja cercana (B08) de la misma escena de **Sentinel-2** (10 m, la de verano con menos nubes; `--scene ID` usa una escena conocida directo del bucket público de AWS). Las guarda en `public/landing/` (`chacra-color.jpg`, `chacra-ndvi.jpg`, `chacra.json`). Después hay que commitear esa carpeta. La zona se elige en `config/site.ts` → `showcase` (o con `--lat --lon --width --height`).
Mientras esas imágenes no existan, la página arma la imagen satelital real en vivo en el navegador, con un índice de vegetación de bandas visibles (VARI), porque la foto común no trae infrarrojo.

### Lo nuevo en v0.3
- **Diseño:** paleta monocroma cálida y grilla bento asimétrica. Tarjetas con borde de 1 px `#EAEAEA` y 24 px de padding, CTA `#111111`, badges en azul y verde pastel. Títulos en Instrument Serif y texto en Geist Sans. Animaciones al hacer scroll, atajos `<kbd>`, sin sombras y modo oscuro opcional.
- **Variables nuevas:** índice **EVI** junto a NDVI, **humedad relativa, presión atmosférica, UV**, evaporación y **salinidad** del suelo. La salinidad se estima con aridez, pH, drenaje y riego, o se toma de un análisis o sensor si está cargado.
- **Suelo:** retención de agua y conductividad con las ecuaciones de **Saxton & Rawls**, más un **índice de salud del suelo** (0–100).
- **Cultivos nuevos:** `config/species.ts` reúne 20 especies (cereza y frutilla actuales más haskap, calafate, rosa mosqueta, espino amarillo, azafrán, lavanda, lúpulo, ruibarbo, espárrago, saúco, avellano, quinoa, verduras en túnel, manzana, arándano, nogal). Cada una se evalúa contra la helada en floración, el frío invernal, el calor, las horas de frío, el pH, la salinidad, el agua y el viento.
- **Viabilidad:** rendimiento, precio, margen, inversión y años de recupero, ajustados por la aptitud del lote. Incluye un contexto regional.
- **Contingencias:** heladas tardías, viento, sequía o poca nieve, calor/UV, granizo y ceniza volcánica, con un plan de antes, durante y después. Suma **El Niño / La Niña** (índice ONI en vivo) y qué significó cada fase en ese campo en los últimos 20 años.
- **SI:** también usa el registro, las especies, la salud del suelo y la fase del Pacífico. Devuelve un plan por estación y hasta 3 cultivos nuevos.

En la interfaz no aparecen las marcas de las fuentes de datos, para que se vea como un producto real. Las fuentes están en [`docs/estudio-suelo-los-antiguos.md`](docs/estudio-suelo-los-antiguos.md): NASA POWER (temperatura, lluvia, viento, humedad, presión, UV, humedad del suelo), MODIS MOD13Q1 (NDVI/EVI) y capas GIBS, más SoilGrids, Open-Meteo y el índice ONI de NOAA. **Hay que nombrarlas en el pitch y en la página del proyecto para los jueces.**

## 🔓 Solo datos abiertos
Todo lo que muestra Growvia sale de fuentes abiertas: NASA POWER, MODIS (ORNL DAAC), SMAP y GIBS (NASA); Open-Meteo (pronóstico, altura, ERA5); Copernicus Sentinel-2 (mapa satelital de 10 m, mosaico de EOX, y la comparación de la portada); ISRIC SoilGrids; NOAA ONI; Terrain Tiles (AWS Open Data); OpenStreetMap / Nominatim / Photon (calles y direcciones); FAO-56 y referencias públicas del INTA. El detalle con licencias está en `/about` (`components/landing/OpenData.tsx`). El mapa base se configura en `config/basemap.ts`.

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
**Todas las ciudades de una vez** (centro + 4 puntos por ciudad, cada una con su sistema y riego):
```bash
npm run soil-study:all
```
Genera una carpeta por ciudad en `docs/soil-study/<sitio>/` y un resumen comparativo en `docs/soil-study/summary.md` y `summary.csv`. Si una ciudad falla (por ejemplo, sin internet), sigue con las demás. Acepta las mismas opciones, por ejemplo `npm run soil-study:all -- --offline` o `-- --grid 3`.

Una sola ciudad:
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

## 🖥️ App de escritorio (Rust + Tauri 2)
En `desktop/` está **Growvia Desktop**, la app oficial. El núcleo es Rust: ventana con menú propio, pantalla de carga y sin conexión, recuerda tamaño y posición, una sola instancia, links externos al navegador del sistema e **imprimir / guardar PDF** con el diálogo nativo (también desde el plan de Growwy). Muestra la web oficial, así el SI, la voz y los datos siguen en el servidor. Además avisa en segundo plano **heladas y viento fuerte** de tu chacra (notificación del sistema, cada 3 h), muestra la mínima de esta noche en el **ícono junto al reloj** (al cerrar la ventana sigue ahí) y se **actualiza sola** con versiones firmadas. El instalador para Linux pesa ~2,5 MB. Cómo compilar: [`desktop/README.md`](desktop/README.md). **Publicar una versión:** se carga una vez el secreto `TAURI_SIGNING_PRIVATE_KEY` en GitHub y se sube un tag `desktop-vX.Y.Z`; GitHub Actions arma los instaladores de Windows, macOS y Linux, los publica en Releases y la página `/download` los muestra solos.

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
components/Pachamama.tsx  avatar animado de Growwy (SI); components/Growwy.tsx la tarjeta del panel; components/landing/GrowwyIntro.tsx la sección de inicio
config/materials.ts    precios de referencia de materiales (USD) para el plan
lib/plan.ts            plan de acción: lotes, materiales, números, pasos
scripts/soil-study-all.ts  estudio de suelo de todas las ciudades de una vez + resumen
```

## Pendientes
- Correr `npm run soil-study` con internet y actualizar `docs/estudio-suelo-los-antiguos.md` con los datos reales.
- Validar con INTA y cooperativas los valores de especies, precios y costos, y ubicar los campos sobre chacras reales.
- Sumar SMAP, ECOSTRESS, GPM y GRACE-FO vía AppEEARS (requiere cuenta de Earthdata).
