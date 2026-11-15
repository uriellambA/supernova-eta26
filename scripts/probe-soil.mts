// Temporary: checks the SoilGrids map service (WCS) against the real ISRIC servers in CI.
import { soilGridsWcs } from "../lib/soilgrids-wcs";
import { soilGridsProfile, topsoilValues, deriveSoil, SOIL_PROPS } from "../lib/soil";
for (const [lat, lon] of [[-46.55, -71.615], [-46.6, -70.93], [-48.75, -70.25], [-48.78, -70.3]]) {
  const t0 = Date.now();
  try {
    const w = await soilGridsWcs(lat, lon, SOIL_PROPS, ["0-5cm", "5-15cm", "15-30cm"]);
    console.log(lat, lon, "WCS", Date.now() - t0, "ms", JSON.stringify(w["0-5cm"]));
    console.log("  topsoil", JSON.stringify(deriveSoil(topsoilValues(w), "soil-map", "0–30 cm")));
  } catch (e) { console.log(lat, lon, "WCS FAIL", (e as Error).message); }
  const t1 = Date.now();
  try { await soilGridsProfile(lat, lon); console.log("  full profile OK", Date.now() - t1, "ms"); } catch (e) { console.log("  full profile FAIL", (e as Error).message); }
}
