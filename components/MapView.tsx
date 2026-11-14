"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type Map as MLMap, type Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { SITE } from "@/config/site";

export type OverlayId = "latest" | "vegetation" | "evi" | "temperature" | "snow" | "relief" | "salinity";

const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10);
const eo = (layer: string, date: string, level: number, ext: "png" | "jpg") =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${ext}`;
const TERRAIN = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

const OVERLAYS: Record<Exclude<OverlayId, "relief" | "salinity">, { url: string; maxzoom: number; opacity: number }> = {
  latest: { url: eo("MODIS_Terra_CorrectedReflectance_TrueColor", day(2), 9, "jpg"), maxzoom: 9, opacity: 0.85 },
  vegetation: { url: eo("MODIS_Terra_NDVI_8Day", day(10), 9, "png"), maxzoom: 9, opacity: 0.7 },
  evi: { url: eo("MODIS_Terra_EVI_8Day", day(10), 9, "png"), maxzoom: 9, opacity: 0.7 },
  temperature: { url: eo("MODIS_Terra_Land_Surface_Temp_Day", day(3), 7, "png"), maxzoom: 7, opacity: 0.65 },
  snow: { url: eo("MODIS_Terra_NDSI_Snow_Cover", day(2), 8, "png"), maxzoom: 8, opacity: 0.8 },
};

/** ~200 m radius polygon around the field (visual footprint). */
function footprint(lat: number, lon: number, r = 0.0018) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    pts.push([lon + (r / Math.cos((lat * Math.PI) / 180)) * Math.cos(a), lat + r * Math.sin(a)]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [pts] } };
}

function shape(lat: number, lon: number, boundary?: [number, number][] | null) {
  if (boundary && boundary.length >= 3) return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [[...boundary, boundary[0]]] } };
  return footprint(lat, lon);
}

export default function MapView({
  field, onPick, is3D, overlays, boundary,
}: {
  boundary?: [number, number][] | null;
  field: { lat: number; lon: number; name: string };
  onPick: (lat: number, lon: number) => void;
  is3D: boolean;
  overlays: Set<OverlayId>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const ready = useRef(false);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });

  // Create the map once
  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      center: [field.lon, field.lat],
      zoom: SITE.zoom,
      maxBounds: [
        [SITE.bounds[0][0] - 0.3, SITE.bounds[0][1] - 0.2],
        [SITE.bounds[1][0] + 0.3, SITE.bounds[1][1] + 0.2],
      ],
      maxPitch: 75,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          sat: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 18, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
          dem: { type: "raster-dem", tiles: [TERRAIN], tileSize: 256, encoding: "terrarium", maxzoom: 14 },
          demShade: { type: "raster-dem", tiles: [TERRAIN], tileSize: 256, encoding: "terrarium", maxzoom: 14 },
        },
        layers: [{ id: "sat", type: "raster", source: "sat" }],
      },
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    m.on("load", () => {
      for (const [id, o] of Object.entries(OVERLAYS)) {
        m.addSource(id, { type: "raster", tiles: [o.url], tileSize: 256, maxzoom: o.maxzoom });
        m.addLayer({ id, type: "raster", source: id, layout: { visibility: "none" }, paint: { "raster-opacity": o.opacity } });
      }
      // Salinity risk tiles are built on the server from SMAP soil moisture (see app/api/smap/tile)
      m.addSource("salinity", { type: "raster", tiles: [`${window.location.origin}/api/smap/tile/{z}/{x}/{y}`], tileSize: 256, maxzoom: 6, attribution: "Soil moisture: SMAP" });
      m.addLayer({ id: "salinity", type: "raster", source: "salinity", layout: { visibility: "none" }, paint: { "raster-opacity": 0.7, "raster-resampling": "nearest" } });
      m.addLayer({ id: "relief", type: "hillshade", source: "demShade", layout: { visibility: "none" }, paint: { "hillshade-exaggeration": 0.6, "hillshade-shadow-color": "#020617" } });
      m.addSource("field", { type: "geojson", data: shape(field.lat, field.lon, boundary) });
      m.addLayer({ id: "field-fill", type: "fill", source: "field", paint: { "fill-color": "#ffffff", "fill-opacity": 0.18 } });
      m.addLayer({ id: "field-line", type: "line", source: "field", paint: { "line-color": "#ffffff", "line-width": 2 } });
      for (const f of SITE.fields) {
        const el = document.createElement("button");
        el.className = "rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-ink";
        el.textContent = f.name;
        el.title = f.note;
        el.onclick = (e) => {
          e.stopPropagation();
          pick.current(f.lat, f.lon);
        };
        new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -14] }).setLngLat([f.lon, f.lat]).addTo(m);
      }
      ready.current = true;
      m.fire("growvia:ready");
    });
    m.on("click", (e) => pick.current(+e.lngLat.lat.toFixed(4), +e.lngLat.lng.toFixed(4)));
    marker.current = new maplibregl.Marker({ color: "#111111" }).setLngLat([field.lon, field.lat]).addTo(m);
    map.current = m;
    return () => {
      ready.current = false;
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once
  }, []);

  // Move the field
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    marker.current?.setLngLat([field.lon, field.lat]);
    const apply = () => (m.getSource("field") as maplibregl.GeoJSONSource | undefined)?.setData(shape(field.lat, field.lon, boundary));
    if (ready.current) apply();
    else m.once("growvia:ready", apply);
    m.easeTo({ center: [field.lon, field.lat], duration: 700 });
  }, [field.lat, field.lon, boundary]);

  // Overlays
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      for (const id of ["latest", "vegetation", "evi", "temperature", "snow", "relief", "salinity"] as OverlayId[]) {
        if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", overlays.has(id) ? "visible" : "none");
      }
    };
    if (ready.current) apply();
    else m.once("growvia:ready", apply);
  }, [overlays]);

  // 3D view
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      if (is3D) {
        m.setTerrain({ source: "dem", exaggeration: 1.8 });
        m.easeTo({ pitch: 62, bearing: -25, zoom: Math.min(m.getZoom(), 13), duration: 1000 });
      } else {
        m.setTerrain(null);
        m.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      }
    };
    if (ready.current) apply();
    else m.once("growvia:ready", apply);
  }, [is3D]);

  return <div ref={box} className="h-full min-h-[320px] w-full" />;
}
