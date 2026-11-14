"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type GeoJSONSource, type Map as MLMap, type Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { SITE } from "@/config/site";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

type Props = {
  lat: number;
  lon: number;
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
export default function FarmMap({ lat, lon, boundary, drawing, onPick, onAddPoint, onFinish }: Props) {
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
      maxBounds: [[SITE.bounds[0][0] - 0.3, SITE.bounds[0][1] - 0.2], [SITE.bounds[1][0] + 0.3, SITE.bounds[1][1] + 0.2]],
      doubleClickZoom: false,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          sat: { type: "raster", tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
          roads: { type: "raster", tiles: [`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 19 },
          labels: { type: "raster", tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 19 },
        },
        layers: [
          { id: "sat", type: "raster", source: "sat" },
          { id: "roads", type: "raster", source: "roads", paint: { "raster-opacity": 0.8 } },
          { id: "labels", type: "raster", source: "labels" },
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

  return <div ref={box} className="h-full w-full" />;
}
