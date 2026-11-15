"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type Map as MLMap, type Marker } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { SATELLITE } from "@/config/basemap";
import { mapLimits } from "@/config/sites";
import type { SiteConfig } from "@/lib/types";
import { WEATHER_VARS, type WeatherGrid, type WeatherVarId } from "@/lib/weathergrid";
import { probeElevation, probeGibs, probeSalinity, probeWeather, type GibsProbe } from "@/lib/map-probe";

export type OverlayId = "latest" | "vegetation" | "evi" | "temperature" | "snow" | "relief" | "salinity";

const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10);
const eo = (layer: string, date: string, level: number, ext: "png" | "jpg") =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${ext}`;
const TERRAIN = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

// What the cursor reads on each NASA layer (same layer, date and zoom level as the tiles on the map)
const PROBES: Partial<Record<OverlayId, GibsProbe & { label: string; unit: string; digits: number }>> = {
  vegetation: { layer: "MODIS_Terra_NDVI_8Day", date: day(10), level: 9, kind: "ndvi", label: "NDVI", unit: "", digits: 2 },
  evi: { layer: "MODIS_Terra_EVI_8Day", date: day(10), level: 9, kind: "evi", label: "EVI", unit: "", digits: 2 },
  temperature: { layer: "MODIS_Terra_Land_Surface_Temp_Day", date: day(3), level: 7, kind: "lst", label: "Land temperature", unit: "°C", digits: 1 },
  snow: { layer: "MODIS_Terra_NDSI_Snow_Cover", date: day(2), level: 8, kind: "snow", label: "Snow cover", unit: "%", digits: 0 },
};

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

// ---------- Weather overlay: interpolated grid painted on a canvas ----------
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), h.length > 7 ? parseInt(h.slice(7, 9), 16) : 255];
function rampColor(stops: readonly string[], t: number) {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const a = hex(stops[i]), b = hex(stops[i + 1]);
  return a.map((v, k) => v + (b[k] - v) * f);
}
export function renderWeather(g: WeatherGrid, varId: WeatherVarId) {
  const v = WEATHER_VARS.find((x) => x.id === varId)!;
  const vals = g.values[v.param] ?? [];
  const W = 280, H = 200;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const at = (i: number, j: number) => vals[Math.min(g.ny - 1, j) * g.nx + Math.min(g.nx - 1, i)];
  const fallback = vals.find((x) => x !== null) ?? v.min;
  for (let y = 0; y < H; y++) {
    const gy = (y / (H - 1)) * (g.ny - 1), j = Math.floor(gy), fy = gy - j;
    for (let x = 0; x < W; x++) {
      const gx = (x / (W - 1)) * (g.nx - 1), i = Math.floor(gx), fx = gx - i;
      const q = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)].map((z) => z ?? fallback) as number[];
      const val = (q[0] * (1 - fx) + q[1] * fx) * (1 - fy) + (q[2] * (1 - fx) + q[3] * fx) * fy;
      const c = rampColor(v.stops, (val - v.min) / (v.max - v.min));
      const k = (y * W + x) * 4;
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = Math.round(c[3] * 0.62);
    }
  }
  ctx.putImageData(img, 0, 0);
  if (varId === "wind") {
    // arrows show where the wind blows TO
    ctx.strokeStyle = "rgba(17,17,17,0.85)";
    ctx.lineWidth = 2;
    g.windDir.forEach((d, n) => {
      if (d === null) return;
      const cx = ((n % g.nx) / (g.nx - 1)) * (W - 24) + 12, cy = (Math.floor(n / g.nx) / (g.ny - 1)) * (H - 24) + 12;
      const a = ((d + 180) * Math.PI) / 180, L = 10;
      const ex = cx + Math.sin(a) * L, ey = cy - Math.cos(a) * L;
      ctx.beginPath(); ctx.moveTo(cx - Math.sin(a) * L, cy + Math.cos(a) * L); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.sin(a - 0.5) * 5, ey + Math.cos(a - 0.5) * 5); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.sin(a + 0.5) * 5, ey + Math.cos(a + 0.5) * 5); ctx.stroke();
    });
  }
  return cv.toDataURL("image/png");
}

export default function MapView({
  site, field, onPick, is3D, overlays, boundary, weather,
}: {
  site: SiteConfig;
  weather?: { varId: WeatherVarId; grid: WeatherGrid } | null;
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

  // ---------- exact value under the cursor ----------
  type Line = { label: string; value: string; approx?: boolean };
  const [hover, setHover] = useState<{ x: number; y: number; w: number; lat: number; lon: number; lines: Line[] } | null>(null);
  const layers = useRef({ overlays, weather });
  useEffect(() => {
    layers.current = { overlays, weather };
  });
  const probe = useRef<{ timer: ReturnType<typeof setTimeout> | null; seq: number }>({ timer: null, seq: 0 });
  const readAt = useCallback(async (x: number, y: number, w0: number, lat: number, lon: number, seq: number) => {
    const { overlays: ov, weather: w } = layers.current;
    const fmt = (v: number, d: number) => v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
    const jobs: Promise<Line | null>[] = [];
    if (w) {
      const v = WEATHER_VARS.find((q) => q.id === w.varId)!;
      const r = probeWeather(w.grid, w.varId, lat, lon);
      if (r) jobs.push(Promise.resolve({ label: v.name, value: `${fmt(r.value, w.varId === "temperature" || w.varId === "rain" || w.varId === "uv" ? 1 : 0)}${r.unit ? " " + r.unit : ""}${r.from ? ` · ${r.from}` : ""}` }));
    }
    for (const id of ov) {
      const p = PROBES[id];
      if (p) jobs.push(probeGibs(p, lat, lon).then((r) => (r ? { label: p.label, value: `${fmt(r.value, p.digits)}${p.unit ? " " + p.unit : ""}`, approx: !r.exact } : { label: p.label, value: "no data here" })));
      if (id === "salinity") jobs.push(probeSalinity(lat, lon).then((r) => (r === null ? { label: "Salinity risk", value: "no data here" } : { label: "Salinity risk", value: `${fmt(r, 2)} · ${r >= 0.65 ? "high" : r >= 0.35 ? "moderate" : "low"}`, approx: true })));
      if (id === "relief") jobs.push(probeElevation(lat, lon).then((r) => (r === null ? null : { label: "Elevation", value: `${r.toLocaleString()} m` })));
    }
    const lines = (await Promise.all(jobs)).filter((l): l is Line => !!l);
    if (seq !== probe.current.seq) return; // the cursor moved on
    setHover({ x, y, w: w0, lat, lon, lines });
  }, []);

  // Create the map once
  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      center: [field.lon, field.lat],
      zoom: site.zoom,
      maxBounds: mapLimits(site),
      maxPitch: 75,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          sat: { type: "raster", tiles: SATELLITE.tiles, tileSize: 256, maxzoom: SATELLITE.maxzoom, attribution: SATELLITE.attribution },
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
      ready.current = true;
      m.fire("growvia:ready");
    });
    m.on("click", (e) => pick.current(+e.lngLat.lat.toFixed(4), +e.lngLat.lng.toFixed(4)));
    m.on("mousemove", (e) => {
      const { overlays: ov, weather: w } = layers.current;
      if (!w && ![...ov].some((id) => id !== "latest")) return setHover(null);
      const seq = ++probe.current.seq;
      if (probe.current.timer) clearTimeout(probe.current.timer);
      probe.current.timer = setTimeout(() => readAt(e.point.x, e.point.y, m.getContainer().clientWidth, e.lngLat.lat, e.lngLat.lng, seq), 90);
    });
    m.getCanvas().addEventListener("mouseleave", () => {
      probe.current.seq++;
      setHover(null);
    });
    marker.current = new maplibregl.Marker({ color: "#111111" }).setLngLat([field.lon, field.lat]).addTo(m);
    map.current = m;
    return () => {
      ready.current = false;
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once
  }, []);

  // Change of site: fly to its valley
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    // lift the old limit, fly to the new valley, then lock the view to its town and farmland
    m.setMaxBounds(null);
    m.flyTo({ center: site.center, zoom: site.zoom, duration: 1200 });
    m.once("moveend", () => m.setMaxBounds(mapLimits(site)));
  }, [site]);

  // Weather overlay (image source over the site bounds)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      if (!weather) {
        if (m.getLayer("weather")) m.setLayoutProperty("weather", "visibility", "none");
        return;
      }
      const [[w, so], [e, n]] = weather.grid.bounds;
      const coords: [[number, number], [number, number], [number, number], [number, number]] = [[w, n], [e, n], [e, so], [w, so]];
      const url = renderWeather(weather.grid, weather.varId);
      const src = m.getSource("weather") as maplibregl.ImageSource | undefined;
      if (src) src.updateImage({ url, coordinates: coords });
      else {
        m.addSource("weather", { type: "image", url, coordinates: coords });
        m.addLayer({ id: "weather", type: "raster", source: "weather", paint: { "raster-opacity": 0.85, "raster-fade-duration": 0 } }, "field-fill");
      }
      m.setLayoutProperty("weather", "visibility", "visible");
    };
    if (ready.current) apply();
    else m.once("growvia:ready", apply);
  }, [weather]);

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

  return (
    <div className="relative h-full min-h-[320px] w-full">
      <div ref={box} className="h-full min-h-[320px] w-full" />
      {hover && hover.lines.length > 0 && (
        <div className="pointer-events-none absolute z-10 min-w-36 rounded-xl border border-line bg-surface/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
          style={{ left: Math.max(4, Math.min(hover.x + 14, hover.w - 190)), top: Math.max(4, hover.y - 10) }}>
          {hover.lines.map((l) => (
            <div key={l.label} className="flex items-baseline justify-between gap-3">
              <span className="text-muted">{l.label}</span>
              <span className="font-semibold tabular-nums text-ink">{l.approx ? "≈ " : ""}{l.value}</span>
            </div>
          ))}
          <div className="mt-1 text-[10px] tabular-nums text-subtle">{`${hover.lat.toFixed(4)}, ${hover.lon.toFixed(4)}`}</div>
        </div>
      )}
    </div>
  );
}
