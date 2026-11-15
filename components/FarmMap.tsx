"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type GeoJSONSource, type Map as MLMap, type Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { SATELLITE, STREETS } from "@/config/basemap";


type Props = {
  lat: number;
  lon: number;
  /** [[west, south], [east, north]]: the map cannot leave this area (town + farmland of the chosen site) */
  limits: [[number, number], [number, number]];
  boundary: [number, number][];
  drawing: boolean;
  onPick: (lat: number, lon: number) => void;
  onAddPoint: (p: [number, number]) => void;
  onFinish: () => void;
};

function geo(boundary: [number, number][], drawing: boolean) {
  const feats: GeoJSON.Feature[] = [];
  if (boundary.length >= 3 && !drawing) feats.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...boundary, boundary[0]]] } });
  if (boundary.length >= 2) feats.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: drawing ? boundary : [...boundary, boundary[0]] } });
  boundary.forEach((p, i) => feats.push({ type: "Feature", properties: { first: i === 0 ? 1 : 0 }, geometry: { type: "Point", coordinates: p } }));
  return { type: "FeatureCollection" as const, features: feats };
}

/** Satellite map with street names to place the farm and draw its limit (click to add corners). */
export default function FarmMap({ lat, lon, limits, boundary, drawing, onPick, onAddPoint, onFinish }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const cb = useRef({ onPick, onAddPoint, onFinish, drawing, boundary });
  useEffect(() => {
    cb.current = { onPick, onAddPoint, onFinish, drawing, boundary };
  });

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      center: [lon, lat],
      zoom: 15.5,
      maxBounds: limits,
      doubleClickZoom: false,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          sat: { type: "raster", tiles: SATELLITE.tiles, tileSize: 256, maxzoom: SATELLITE.maxzoom, attribution: SATELLITE.attribution },
          streets: { type: "raster", tiles: STREETS.tiles, tileSize: 256, maxzoom: STREETS.maxzoom, attribution: STREETS.attribution },
        },
        layers: [
          { id: "sat", type: "raster", source: "sat" },
          { id: "streets", type: "raster", source: "streets", layout: { visibility: "none" } },
        ],
      },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    m.on("load", () => {
      m.addSource("limit", { type: "geojson", data: geo(cb.current.boundary, cb.current.drawing) });
      m.addLayer({ id: "limit-fill", type: "fill", source: "limit", filter: ["==", "$type", "Polygon"], paint: { "fill-color": "#22c55e", "fill-opacity": 0.22 } });
      m.addLayer({ id: "limit-casing", type: "line", source: "limit", filter: ["==", "$type", "LineString"], paint: { "line-color": "#111111", "line-width": 5, "line-opacity": 0.55 } });
      m.addLayer({ id: "limit-line", type: "line", source: "limit", filter: ["==", "$type", "LineString"], paint: { "line-color": "#facc15", "line-width": 2.5 } });
      m.addLayer({ id: "limit-pts", type: "circle", source: "limit", filter: ["==", "$type", "Point"], paint: { "circle-radius": ["case", ["==", ["get", "first"], 1], 7, 5], "circle-color": ["case", ["==", ["get", "first"], 1], "#22c55e", "#ffffff"], "circle-stroke-color": "#111111", "circle-stroke-width": 1.5 } });
    });
    m.on("click", (e) => {
      const c = cb.current;
      if (!c.drawing) return c.onPick(+e.lngLat.lat.toFixed(5), +e.lngLat.lng.toFixed(5));
      // clicking the first corner closes the limit
      if (c.boundary.length >= 3) {
        const f = m.project(c.boundary[0] as [number, number]);
        if (Math.hypot(f.x - e.point.x, f.y - e.point.y) < 16) return c.onFinish();
      }
      c.onAddPoint([+e.lngLat.lng.toFixed(6), +e.lngLat.lat.toFixed(6)]);
    });
    m.on("dblclick", () => cb.current.drawing && cb.current.boundary.length >= 3 && cb.current.onFinish());
    const mk = new maplibregl.Marker({ color: "#111111", draggable: true }).setLngLat([lon, lat]).addTo(m);
    mk.on("dragend", () => {
      const p = mk.getLngLat();
      cb.current.onPick(+p.lat.toFixed(5), +p.lng.toFixed(5));
    });
    marker.current = mk;
    map.current = m;
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once
  }, []);

  // Another site chosen: move the allowed area
  const area = useRef(limits.flat().join());
  useEffect(() => {
    const m = map.current;
    const key = limits.flat().join();
    if (!m || area.current === key) return;
    area.current = key;
    m.setMaxBounds(null);
    m.jumpTo({ center: [lon, lat], zoom: 13 });
    m.setMaxBounds(limits);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the area changes
  }, [limits[0][0], limits[0][1], limits[1][0], limits[1][1]]);

  // Move marker (and fly there when far away, e.g. after an address search)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    marker.current?.setLngLat([lon, lat]);
    const c = m.getCenter();
    if (Math.abs(c.lat - lat) > 0.002 || Math.abs(c.lng - lon) > 0.003) m.flyTo({ center: [lon, lat], zoom: Math.max(m.getZoom(), 15.5), duration: 900 });
  }, [lat, lon]);

  // Redraw the limit
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => (m.getSource("limit") as GeoJSONSource | undefined)?.setData(geo(boundary, drawing));
    // isStyleLoaded() stays false while tiles are pending, so check for our source instead
    if (m.getSource("limit")) apply();
    else m.once("load", apply);
    m.getCanvas().style.cursor = drawing ? "crosshair" : "";
  }, [boundary, drawing]);

  // Satellite (Sentinel-2) or streets (OpenStreetMap), to find the farm by its road
  const [layer, setLayer] = useState<"sat" | "streets">("sat");
  const pickLayer = (l: "sat" | "streets") => {
    setLayer(l);
    const m = map.current;
    if (m?.getLayer("streets")) m.setLayoutProperty("streets", "visibility", l === "streets" ? "visible" : "none");
  };
  return (
    <div className="relative h-full w-full">
      <div ref={box} className="h-full w-full" />
      <div className="absolute left-2 top-2 z-10 flex overflow-hidden rounded-lg border border-line bg-surface text-xs font-medium shadow-sm">
        {(["sat", "streets"] as const).map((l) => (
          <button key={l} type="button" onClick={() => pickLayer(l)} aria-pressed={layer === l}
            className={`px-2.5 py-1.5 ${layer === l ? "bg-ink text-canvas" : "text-ink-2 hover:bg-surface-2"}`}>{l === "sat" ? "Satellite" : "Streets"}</button>
        ))}
      </div>
    </div>
  );
}
