// "Our open data": every source behind Growvia, what we use it for and its license (all open).
import { Reveal } from "@/components/ui";

type Source = { name: string; by: string; use: string; license: string; url: string; group: "NASA" | "Open-Meteo" | "Other open sources" };

const SOURCES: Source[] = [
  { group: "NASA", name: "NASA POWER", by: "NASA Langley Research Center", use: "20 years of daily climate for each farm: temperature, rain, wind, humidity, pressure, UV and soil moisture (frost calendar, evaporation, irrigation).", license: "Public domain · NASA open data", url: "https://power.larc.nasa.gov" },
  { group: "NASA", name: "MODIS MOD13Q1 (NDVI · EVI)", by: "NASA EOSDIS · ORNL DAAC", use: "Vegetation index every 16 days at 250 m: crop vigor and bare soil.", license: "NASA open data", url: "https://modis.ornl.gov" },
  { group: "NASA", name: "SMAP soil moisture", by: "NASA · JPL", use: "Surface soil moisture for the salinity-risk map layer.", license: "NASA open data", url: "https://smap.jpl.nasa.gov" },
  { group: "NASA", name: "GIBS map layers", by: "NASA EOSDIS", use: "Map filters: vegetation, land surface temperature and snow cover.", license: "NASA open data", url: "https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api" },
  { group: "Open-Meteo", name: "Open-Meteo forecast and weather map", by: "Open-Meteo.com", use: "16-day forecast, frost and wind alerts, current weather layers on the map.", license: "Data CC BY 4.0 · open-source software", url: "https://open-meteo.com" },
  { group: "Open-Meteo", name: "Open-Meteo elevation and historical weather (ERA5)", by: "Open-Meteo.com · Copernicus", use: "Farm altitude (climate correction) and snowpack history of the watersheds that feed the canals.", license: "CC BY 4.0", url: "https://open-meteo.com" },
  { group: "Other open sources", name: "Copernicus Sentinel-2", by: "ESA · European Union (AWS Open Data); mosaic by EOX", use: "Satellite base map (10 m) and the true color / NDVI comparison of a real chacra.", license: "Copernicus free and open data · mosaic CC BY-NC-SA 4.0", url: "https://registry.opendata.aws/sentinel-2-l2a-cogs/" },
  { group: "Other open sources", name: "SoilGrids 250 m", by: "ISRIC World Soil Information", use: "Soil texture, organic carbon, pH, nitrogen, CEC and density at 6 depths: soil study and soil health.", license: "CC BY 4.0", url: "https://soilgrids.org" },
  { group: "Other open sources", name: "Oceanic Niño Index (ONI)", by: "NOAA Climate Prediction Center", use: "El Niño / La Niña phase and what each phase meant on your farm.", license: "Public domain", url: "https://www.cpc.ncep.noaa.gov" },
  { group: "Other open sources", name: "Terrain Tiles", by: "Mapzen / Tilezen (AWS Open Data), from SRTM and others", use: "Relief and the 3D view (slopes, cold low spots).", license: "Open data (public domain and CC BY sources)", url: "https://registry.opendata.aws/terrain-tiles/" },
  { group: "Other open sources", name: "OpenStreetMap · Nominatim · Photon", by: "OpenStreetMap contributors", use: "Street map and address search when registering the farm.", license: "ODbL", url: "https://www.openstreetmap.org/copyright" },
  { group: "Other open sources", name: "FAO-56 and public agronomic references", by: "FAO · INTA (public reports)", use: "Crop water coefficients (Kc) and the traits of each crop and species, compiled by us as approximate references.", license: "Open publications", url: "https://www.fao.org/4/x0490e/x0490e00.htm" },
];

export function OpenData() {
  const groups = ["NASA", "Open-Meteo", "Other open sources"] as const;
  return (
    <section id="open-data" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <Reveal>
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Our open data</div>
        <h2 className="mt-2 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">Only open data, so anyone can check it</h2>
        <p className="mt-4 max-w-3xl text-ink-2">Every number Growvia shows comes from open, free sources that anyone can download and verify. No private data and no paid databases.</p>
      </Reveal>
      <div className="mt-10 space-y-8">
        {groups.map((g) => (
          <div key={g}>
            <div className="mb-3 text-sm font-semibold">{g}</div>
            <div className="grid gap-3 md:grid-cols-2">
              {SOURCES.filter((s) => s.group === g).map((s, i) => (
                <Reveal key={s.name} delay={i * 50} className="rounded-2xl border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <a href={s.url} target="_blank" rel="noopener" className="font-medium underline-offset-4 hover:underline">{s.name}</a>
                    <span className="rounded-full bg-green-bg px-2 py-0.5 text-[11px] font-medium text-green-fg">{s.license}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{s.by}</div>
                  <p className="mt-2 text-sm text-ink-2">{s.use}</p>
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 max-w-3xl text-sm text-muted">
        The SI that explains the results and the server voice are optional services: they put the open data into words, they do not add data. Without them Growvia still works with its open rules. Our code is public on GitHub.
      </p>
    </section>
  );
}
