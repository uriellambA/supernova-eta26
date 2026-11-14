"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, LayersControl, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { REGION } from "@/config/regions/alto-valle";
import type { Zona } from "@/lib/types";

// NASA GIBS: la fecha debe tener imagen disponible (usamos días atrás).
const fechaGibs = (diasAtras: number) => new Date(Date.now() - diasAtras * 86_400_000).toISOString().slice(0, 10);
const gibs = (capa: string, fecha: string, nivel: number, ext: "jpg" | "png") =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${capa}/default/${fecha}/GoogleMapsCompatible_Level${nivel}/{z}/{y}/{x}.${ext}`;
const ATR_NASA = 'Imágenes: <a href="https://earthdata.nasa.gov/gibs">NASA GIBS / EOSDIS</a>';

function Clicks({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPick(+e.latlng.lat.toFixed(4), +e.latlng.lng.toFixed(4)) });
  return null;
}

function Volar({ punto }: { punto: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (punto) map.flyTo(punto, Math.max(map.getZoom(), 12), { duration: 0.8 });
  }, [punto, map]);
  return null;
}

export default function MapaLeaflet({
  punto, zonaId, onPick, onZona, alto = "h-[58vh]",
}: {
  punto: [number, number] | null;
  zonaId: string | null;
  onPick: (lat: number, lon: number) => void;
  onZona: (z: Zona) => void;
  alto?: string;
}) {
  return (
    <MapContainer center={REGION.centro} zoom={REGION.zoom} className={`${alto} w-full rounded-2xl`} scrollWheelZoom>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="🛰️ Satélite (Esri)">
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Imágenes © Esri, Maxar, Earthstar" maxZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="🗺️ Mapa (OpenStreetMap)">
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" maxZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="🌎 NASA MODIS color real">
          <TileLayer url={gibs("MODIS_Terra_CorrectedReflectance_TrueColor", fechaGibs(2), 9, "jpg")} attribution={ATR_NASA} maxNativeZoom={9} maxZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay name="🌱 NASA NDVI (8 días)">
          <TileLayer url={gibs("MODIS_Terra_NDVI_8Day", fechaGibs(10), 9, "png")} attribution={ATR_NASA} maxNativeZoom={9} maxZoom={18} opacity={0.7} />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="❄️ NASA nieve (MODIS NDSI)">
          <TileLayer url={gibs("MODIS_Terra_NDSI_Snow_Cover", fechaGibs(2), 8, "png")} attribution={ATR_NASA} maxNativeZoom={8} maxZoom={18} opacity={0.8} />
        </LayersControl.Overlay>
      </LayersControl>
      <Clicks onPick={onPick} />
      <Volar punto={punto} />
      {REGION.zonas.map((z) => (
        <CircleMarker
          key={z.id}
          center={[z.lat, z.lon]}
          radius={z.id === zonaId ? 9 : 6}
          pathOptions={{ color: "#fff", weight: 2, fillColor: z.demo ? "#f59e0b" : "#10b981", fillOpacity: 0.95 }}
          eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); onZona(z); } }}
        >
          <Tooltip direction="top">{z.nombre}</Tooltip>
        </CircleMarker>
      ))}
      {punto && (
        <CircleMarker center={punto} radius={12} pathOptions={{ color: "#dc2626", weight: 4, fillColor: "#fff", fillOpacity: 0.6 }}>
          <Tooltip permanent direction="top" offset={[0, -10]}>Tu chacra</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
