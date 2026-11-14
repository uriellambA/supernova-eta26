# Estudio de suelo y cultivos — Perito Moreno (Santa Cruz)

> Documento interno del equipo (en español). La app Growvia está en inglés y en español.
> **Estado:** los valores son **referencias regionales aproximadas** para arrancar y **hay que validarlos** con el INTA y análisis de laboratorio.
> Los datos reales se extraen con el comando de la sección 5 (requiere internet).

## 1. Área de estudio
- **Ubicación:** meseta y valle del **río Fénix**, ~55 km al este de Los Antiguos, a unos 400 m de altitud. Centro aproximado: −46,59, −70,93.
- **Paisaje:** estepa arbustiva patagónica, terrazas y bajos aluviales del río Fénix con chacras regadas.
- **Clima:** más continental que Los Antiguos (el lago ya no modera): noches más frías, viento del oeste más fuerte, lluvia ~200 mm/año.
- **Producción:** forraje (alfalfa, pasturas) para la ganadería ovina y bovina, hortalizas y frutas finas a pequeña escala.

## 2. Fuentes de datos
Las mismas que en Los Antiguos (ver [`estudio-suelo-los-antiguos.md`](estudio-suelo-los-antiguos.md)): NASA POWER (clima diario de 20 años, humedad, presión, UV), MODIS (NDVI/EVI, temperatura de superficie, nieve), SMAP (humedad superficial → riesgo de salinidad), SRTM (relieve), ISRIC SoilGrids (suelo 250 m, 6 profundidades), Open-Meteo (pronóstico y clima en el mapa) y el índice ONI (El Niño / La Niña).

## 3. Propiedades de los suelos (referencia regional, 0–30 cm, A VALIDAR)
| Propiedad | Valor de referencia | Interpretación |
|---|---|---|
| Textura | Franco arenoso a arenoso franco (arena ~60 %, limo ~27 %, arcilla ~13 %) | Drena rápido, muy expuesto a la erosión eólica |
| Materia orgánica | ~1,0 % (C orgánico ~6 g/kg) | Muy baja: prioridad recuperar materia orgánica |
| pH | ~7,9 | Alcalino, con carbonatos: atención al hierro, el zinc y el fósforo |
| Nitrógeno total | ~0,6 g/kg | Bajo |
| CIC | ~12 cmol/kg | Baja |
| Densidad aparente | ~1,40 g/cm³ | Normal a algo compactado |
| Salinidad | Baja en terrazas; moderada en bajos mal drenados | Medir CE antes de implantar |

## 4. Cultivos y rotación
- **Cultivos de la zona y opciones:** Alfalfa y pasturas (base), avena + vicia, ajo, papa, hortalizas de hoja bajo túnel, frutilla y frambuesa protegidas del viento. Opciones nuevas evaluadas: calafate y rosa mosqueta (cortinas), espino amarillo, haskap, azafrán.
- **Rotación:** El sistema por defecto es **forraje**. La rotación que mejor puntúa con datos de muestra es *alfalfa con un cultivo intermedio* (3 años de alfalfa → papa → avena + vicia), porque corta la autotoxicidad de la alfalfa y aprovecha el nitrógeno acumulado.

## 5. Cómo obtener los datos reales
```bash
npm run soil-study -- --site perito-moreno
```
Genera `docs/soil-study/perito-moreno/` con `report.md`, `data.json`, `points.csv`, `profile.csv` y `species.csv`: el centro del sitio más 4 puntos a ~1,5 km (N, S, E, O).

Para un punto exacto:
```bash
npm run soil-study -- --lat <lat> --lon <lon> --name "Mi chacra"
```
