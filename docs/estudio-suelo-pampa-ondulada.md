# Estudio de suelo y cultivos — Pampa Ondulada (Pergamino, Buenos Aires)

> Documento interno del equipo (en español). La app Growvia está en inglés y en español.
> **Estado:** los valores son **referencias regionales aproximadas** para arrancar y **hay que validarlos** con el INTA y análisis de laboratorio.
> Los datos reales se extraen con el comando de la sección 5 (requiere internet).

## 1. Área de estudio
- **Ubicación:** región agrícola del norte de Buenos Aires y sur de Santa Fe. Punto de referencia: **Pergamino**, ~65 m de altitud. Centro aproximado: −33,89, −60,57.
- **Paisaje:** lomas suaves ("ondulada") con pendientes cortas, donde la **erosión hídrica** es el principal problema.
- **Clima:** templado húmedo, ~1.000 mm/año de lluvia concentrada en primavera–verano, heladas de junio a agosto. Fuerte influencia de **El Niño / La Niña** (La Niña = sequía).
- **Producción:** agricultura de secano: soja (dominante), maíz, trigo y, en menor medida, cebada, girasol y ganadería.

## 2. Fuentes de datos
Las mismas que en Los Antiguos (ver [`estudio-suelo-los-antiguos.md`](estudio-suelo-los-antiguos.md)): NASA POWER (clima diario de 20 años, humedad, presión, UV), MODIS (NDVI/EVI, temperatura de superficie, nieve), SMAP (humedad superficial → riesgo de salinidad), SRTM (relieve), ISRIC SoilGrids (suelo 250 m, 6 profundidades), Open-Meteo (pronóstico y clima en el mapa) y el índice ONI (El Niño / La Niña).

## 3. Propiedades de los suelos (referencia regional, 0–30 cm, A VALIDAR)
| Propiedad | Valor de referencia | Interpretación |
|---|---|---|
| Textura | Franco limoso (arena ~10 %, limo ~65 %, arcilla ~25 %) — Argiudol típico, serie Pergamino | Muy fértil pero se encostra y erosiona sin cobertura |
| Materia orgánica | ~3,1 % (C orgánico ~18 g/kg) | Buena, pero en caída por el monocultivo de soja |
| pH | ~6,0 | Levemente ácido: adecuado para la mayoría de los cultivos |
| Nitrógeno total | ~1,6 g/kg | Medio |
| CIC | ~20 cmol/kg | Media-alta |
| Densidad aparente | ~1,25 g/cm³ | Riesgo de compactación por tránsito de maquinaria |
| Salinidad | Baja | No limitante salvo bajos |

## 4. Cultivos y rotación
- **Cultivos de la zona y opciones:** Soja, maíz y trigo (actuales); cebada cervecera, colza, garbanzo, sorgo granífero, girasol y pecán como opciones; vicia + avena y centeno como cultivos de cobertura; alfalfa en esquemas mixtos.
- **Rotación:** El sistema por defecto es **granos**. La rotación actual de referencia es la **soja continua**. Con datos de muestra puntúan mejor *trigo/soja de segunda → maíz → soja* y *maíz–soja con cultivos de cobertura*, porque devuelven rastrojo y carbono y cubren el suelo en invierno. La soja continua queda última por la erosión, la pérdida de materia orgánica y la caída de rendimiento del monocultivo.

## 5. Cómo obtener los datos reales
```bash
npm run soil-study -- --site pampa-ondulada
```
Genera `docs/soil-study/pampa-ondulada/` con `report.md`, `data.json`, `points.csv`, `profile.csv` y `species.csv`: el centro del sitio más 4 puntos a ~1,5 km (N, S, E, O).

Para un punto exacto:
```bash
npm run soil-study -- --lat <lat> --lon <lon> --name "Mi chacra"
```
