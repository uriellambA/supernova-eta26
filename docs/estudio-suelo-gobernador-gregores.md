# Estudio de suelo y cultivos — Gobernador Gregores (Santa Cruz)

> Documento interno del equipo (en español). La app Growvia está en inglés y en español.
> **Estado:** los valores son **referencias regionales aproximadas** para arrancar y **hay que validarlos** con el INTA y análisis de laboratorio.
> Los datos reales se extraen con el comando de la sección 5 (requiere internet).

## 1. Área de estudio
- **Ubicación:** centro de Santa Cruz, valle del **río Chico**, a unos 300 m de altitud. Centro aproximado: −48,75, −70,25.
- **Paisaje:** estepa árida y valle aluvial con chacras regadas por gravedad e inundación.
- **Clima:** frío y seco (lluvia ~150–200 mm/año), inviernos rigurosos, temporada libre de heladas corta.
- **Producción:** alfalfa y pasturas en fardos para las estancias, hortalizas e invernaderos para el pueblo.

## 2. Fuentes de datos
Las mismas que en Los Antiguos (ver [`estudio-suelo-los-antiguos.md`](estudio-suelo-los-antiguos.md)): NASA POWER (clima diario de 20 años, humedad, presión, UV), MODIS (NDVI/EVI, temperatura de superficie, nieve), SMAP (humedad superficial → riesgo de salinidad), SRTM (relieve), ISRIC SoilGrids (suelo 250 m, 6 profundidades), Open-Meteo (pronóstico y clima en el mapa) y el índice ONI (El Niño / La Niña).

## 3. Propiedades de los suelos (referencia regional, 0–30 cm, A VALIDAR)
| Propiedad | Valor de referencia | Interpretación |
|---|---|---|
| Textura | Franco (arena ~45 %, limo ~35 %, arcilla ~20 %) | Retiene más agua que en Los Antiguos |
| Materia orgánica | ~1,5 % (C orgánico ~9 g/kg) | Baja |
| pH | ~8,1 | Alcalino; posible sodicidad en bajos |
| Nitrógeno total | ~0,8 g/kg | Bajo |
| CIC | ~16 cmol/kg | Media |
| Densidad aparente | ~1,35 g/cm³ | Sin compactación severa |
| Salinidad | Riesgo moderado en bajos y con riego por inundación | Clave: medir CE y drenar |

## 4. Cultivos y rotación
- **Cultivos de la zona y opciones:** Alfalfa, pasturas, avena + vicia, papa, ajo, hortalizas de invernadero, quinoa (tolera sal), espino amarillo (tolera sal y viento), ruibarbo.
- **Rotación:** El sistema por defecto es **forraje**. Con datos de muestra puntúa mejor *alfalfa con un cultivo intermedio*. Por el riesgo de salinidad, conviene combinar con el filtro **Riesgo de salinidad · SMAP** y un análisis de CE.

## 5. Cómo obtener los datos reales
```bash
npm run soil-study -- --site gobernador-gregores
```
Genera `docs/soil-study/gobernador-gregores/` con `report.md`, `data.json`, `points.csv`, `profile.csv` y `species.csv`: el centro del sitio más 4 puntos a ~1,5 km (N, S, E, O).

Para un punto exacto:
```bash
npm run soil-study -- --lat <lat> --lon <lon> --name "Mi chacra"
```
