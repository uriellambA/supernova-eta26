// Open base maps only (see "Our open data" on /about).
// Satellite: Sentinel-2 cloudless mosaic by EOX (ESA Copernicus Sentinel-2, 10 m), CC BY-NC-SA 4.0.
// Streets: OpenStreetMap standard tiles, data © OpenStreetMap contributors (ODbL).
export const SATELLITE = {
  tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg"],
  maxzoom: 15, // native detail (10 m); closer zooms enlarge the same pixels
  attribution: "Sentinel-2 cloudless 2023 by EOX (Copernicus Sentinel data 2023, CC BY-NC-SA 4.0)",
};
export const STREETS = {
  tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  maxzoom: 19,
  attribution: "© OpenStreetMap contributors (ODbL)",
};
