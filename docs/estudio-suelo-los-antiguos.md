# Estudio de suelo y cultivos de Los Antiguos (Santa Cruz)

> Documento interno del equipo (en español). La app Growvia está en inglés.
> **Estado:** los valores de las tablas 3 y 4 son **referencias regionales aproximadas** para arrancar y **hay que validarlos**.
> Los datos reales de cada campo se extraen con el script de la [sección 7](#7-cómo-obtener-los-datos-reales). No pudimos ejecutarlo al escribir este documento porque el entorno no tenía acceso a las APIs.

## 1. Área de estudio
- **Ubicación:** valle de Los Antiguos, noroeste de Santa Cruz, sobre la costa sur del **lago Buenos Aires**, a unos 220 m de altitud. Centro aproximado: −46,55, −71,62.
- **Paisaje:** abanico aluvial y terrazas del **río Los Antiguos**, con chacras regadas por canales. Alrededor, estepa patagónica árida.
- **Microclima:** el lago modera las temperaturas, por eso hay un "oasis" frutícola (la "capital de la cereza"). Aun así:
  - temporada libre de heladas corta;
  - viento del oeste fuerte en primavera y verano;
  - lluvia muy baja (~200 mm/año): sin riego no hay agricultura.
- **Historia del suelo:** la erupción del volcán **Hudson (1991)** depositó ceniza en la zona, lo que modificó la textura superficial y aumentó el riesgo de erosión eólica.

## 2. Fuentes de datos (lo que usa la app)
| Qué | Dataset | Cómo lo usamos |
|---|---|---|
| Clima de 20 años: temperatura, lluvia, viento | **NASA POWER** (diario, comunidad AG) | Heladas, días libres de heladas, ET0 (Hargreaves), viento de primavera, tendencias |
| Humedad del suelo superficial y de raíces | **NASA POWER GWETTOP / GWETROOT** (derivados de MERRA-2) | Curva mensual de humedad del suelo |
| Vigor de la vegetación | **MODIS MOD13Q1 NDVI** (250 m, 16 días) | Estado de los lotes y meses de suelo desnudo |
| Capas del mapa | **MODIS** NDVI, temperatura de superficie (LST), cobertura de nieve (vía GIBS) | Filtros del mapa |
| Relieve | **SRTM** (vía *terrain tiles*) | Vista 3D y sombreado del relieve (bajos heladizos) |
| Propiedades del suelo | **ISRIC SoilGrids** (250 m), información local de suelo | Textura, carbono orgánico, pH, N, CIC y densidad aparente entre 0 y 30 cm |
| Nieve que alimenta el riego | Reanálisis ERA5 (Open-Meteo) + capa MODIS de nieve | Índice de nieve de la cuenca |
| Pronóstico | Open-Meteo | Alertas de helada, viento y riego |
| **Próximos (pendiente)** | **SMAP** L3/L4, **ECOSTRESS**, **GPM IMERG**, **GRACE-FO** | Vía AppEEARS o Earthdata (requiere cuenta). Mejoran humedad, estrés térmico, lluvia y tendencia hídrica |

**Satélite vs. medición en el campo:** POWER tiene una resolución de ~50 km y SoilGrids de 250 m, así que describen la zona y no cada lote. Por eso la app agrega el botón **Hardware**, para cargar lecturas de un sensor o una sonda en el lote, y un descuento de −1,5 °C para los bajos heladizos. La combinación de las dos fuentes es la que mejora la precisión.

## 3. Propiedades de los suelos (referencia regional, 0–30 cm, A VALIDAR)
| Propiedad | Valor de referencia | Interpretación para el productor |
|---|---|---|
| Textura | Franco arenoso (arena ~55 %, limo ~30 %, arcilla ~15 %) | Drena rápido y se vuela cuando queda desnudo |
| Materia orgánica | ~1,4 % (C orgánico ~8 g/kg) | Baja: retiene poca agua y nutrientes |
| pH | ~7,6 | Levemente alcalino: atención al hierro y al zinc |
| Nitrógeno total | ~0,8 g/kg | Bajo: las leguminosas suman mucho |
| CIC | ~14 cmol/kg | Media-baja |
| Densidad aparente | ~1,35 g/cm³ | Sin compactación severa |
| Agua útil (60 cm) | ~85 mm | En enero alcanza para ~2 semanas sin riego |
| Pedregosidad | Frecuente en terrazas altas, sobre gravas | Limita el desarrollo de raíces profundas en algunos lotes |
| Riesgo de erosión eólica | Alto con el suelo desnudo (septiembre–diciembre) | Prioridad: cobertura en invierno y primavera |

Valores de configuración en el código: `config/site.ts → soilReference`. La app usa SoilGrids cuando hay datos para el punto. Si no, usa estos valores y lo avisa en pantalla.

## 4. Características de los cultivos (resumen de `config/crops.ts`)
| Cultivo | Tipo | Riego neto/temporada | Fija N | Raíz | Cobertura | Aporte de MO | Etapa sensible a la helada | Mercado |
|---|---|---|---|---|---|---|---|---|
| Cereza | Perenne | ~650 mm | No | Profunda | Baja | Baja | Floración (octubre), −2 °C | Exportación |
| Frambuesa | Perenne | ~500 mm | No | Media | Media | Media | Floración (noviembre–diciembre), −1 °C | Local / congelado |
| Grosella / corinto | Perenne | ~420 mm | No | Media | Media | Media | Floración (octubre), −2,5 °C | Local / industria |
| Frutilla | Anual | ~450 mm | No | Superficial | Media | Baja | Floración, −1 °C | Local / turismo |
| Alfalfa | Forrajera | ~700 mm | 150 kg/ha | Profunda | Alta | Alta | — | Fardos / ganado |
| Pastura de gramíneas | Forrajera | ~550 mm | No | Media | Muy alta | Alta | — | Pastoreo |
| Ajo | Anual | ~330 mm | No | Superficial | Baja | Muy baja | — (muy rústico) | Nacional |
| Papa | Anual | ~480 mm | No | Superficial | Media | Muy baja | Emergencia, 0 °C | Regional |
| Hojas verdes | Anual | ~280 mm | No | Superficial | Media | Muy baja | Implantación, −1 °C | Local |
| Haba | Anual | ~340 mm | 60 kg/ha | Media | Media | Media | — | Local |
| Arveja | Anual | ~300 mm | 50 kg/ha | Superficial | Media | Media | — | Local |
| Avena + vicia | Cobertura / forraje | ~220 mm | 70 kg/ha | Media | Alta | Alta | — | Forraje / abono verde |
| Centeno | Cobertura | ~120 mm | No | Profunda | Muy alta | Alta | — | Cobertura |
| Trébol blanco (interfilar) | Cobertura | ~380 mm | 80 kg/ha | Superficial | Muy alta | Alta | — | Cobertura / abejas |

## 5. Cultivos de la zona
- **Principal:** **cereza**, con destino a exportación y mercado nacional; es la base de la Fiesta Nacional de la Cereza.
- **Frutas finas:** frambuesa, frutilla, grosella, corinto y zarzaparrilla, para dulces y turismo.
- **Forrajeras:** **alfalfa** y pasturas, para fardos y ganado ovino y bovino.
- **Hortalizas:** papa, ajo, hojas verdes y hortalizas de invernadero para el mercado local.
- Frutales de pepita (manzana, pera) en menor escala.

## 6. Implicancias para las rotaciones (lo que la app compara)
1. **El suelo desnudo en invierno y primavera es el principal problema.** El viento, la arena y la poca materia orgánica se combinan en erosión. Los cultivos de cobertura (centeno, avena + vicia, trébol) son la mejora más barata.
2. **Las leguminosas** (alfalfa, vicia, trébol, arveja, haba) reponen el N de un suelo pobre.
3. **El agua es el límite.** Hay que comparar los mm/año de cada rotación con lo que entrega el canal y con el índice de nieve.
4. **La temporada es corta.** Los cultivos que necesitan más días libres de heladas, o que florecen en octubre, tienen riesgo. Las herramientas son el calendario de heladas y la vista 3D, que muestra los bajos.
5. **Opciones de adaptación:** goteo (ahorro de agua), invernadero hidropónico (alarga la temporada) y geotermia de baja profundidad (calefacción del invernadero).

## 7. Cómo obtener los datos reales
Con internet, en dos terminales:
```bash
npm run dev
```
```bash
npm run soil-study
```
El script genera `docs/estudio-suelo-datos.json` y `docs/estudio-suelo-datos.md`, con los datos de suelo, clima y NDVI de los tres campos de referencia. Con esos números hay que actualizar la tabla 3 de este documento.

## 8. Validación pendiente
- [ ] Ubicar los tres campos de referencia sobre chacras reales (`config/site.ts`).
- [ ] Contrastar los valores de suelo con un análisis de laboratorio o con datos de INTA (EEA Santa Cruz / AER Los Antiguos).
- [ ] Confirmar las fechas de floración y los requerimientos hídricos con productores locales.
- [ ] Confirmar la dotación de riego por temporada con el consorcio de riego (hoy se asumen 1.200 mm brutos).
