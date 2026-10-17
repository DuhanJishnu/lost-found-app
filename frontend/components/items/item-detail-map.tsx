"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Navigation } from "lucide-react";

import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "lf-detail-pin",
  html: `<span style="display:block;width:20px;height:20px;border-radius:9999px;background:#00aebb;border:3px solid #031211;box-shadow:0 0 0 4px rgba(0,174,187,.35),0 2px 12px rgba(0,0,0,.5)"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1.2 });
  }, [lat, lng, map]);

  return null;
}

interface ItemDetailMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export function ItemDetailMap({
  latitude,
  longitude,
  title,
}: ItemDetailMapProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom
        dragging
        touchZoom
        doubleClickZoom
        zoomControl={false}
        attributionControl={false}
        className="z-0 h-72 w-full sm:h-80"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyTo lat={latitude} lng={longitude} />
        <Marker position={[latitude, longitude]} icon={pinIcon}>
          <Popup>
            <span style={{ fontWeight: 600 }}>{title}</span>
            <br />
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Open in maps link */}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 z-[500] flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur-md transition-colors hover:bg-card"
      >
        <Navigation className="h-3.5 w-3.5" />
        Open in Maps
      </a>
    </div>
  );
}
