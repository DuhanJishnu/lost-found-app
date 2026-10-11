"use client";

import { useMemo, useState } from "react";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";

export interface MapPin {
  id: string;
  title: string;
  kind: "LOST" | "FOUND";
  latitude: number;
  longitude: number;
  href?: string;
}

interface DashboardMapProps {
  pins: MapPin[];
}

const PIN_COLORS = {
  LOST: "#00aebb",
  FOUND: "#e8e4d3",
} as const;

function dotIcon(kind: "LOST" | "FOUND") {
  const color = PIN_COLORS[kind];
  return L.divIcon({
    className: "lf-map-pin",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid #031211;box-shadow:0 0 0 2px ${color}55,0 2px 8px rgba(0,0,0,.5)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();

  useMemo(() => {
    if (pins.length > 0) {
      map.fitBounds(
        L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude])),
        { padding: [32, 32] },
      );
    }
  }, [map, pins]);

  return null;
}

function LocateControl({
  onLocate,
}: {
  onLocate: (latitude: number, longitude: number) => void;
}) {
  const map = useMap();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="absolute top-3 right-3 z-[500] bg-card/90 backdrop-blur"
      onClick={() => {
        map.locate({ setView: true, maxZoom: 14 });
        map.once("locationfound", (event: L.LocationEvent) => {
          onLocate(event.latlng.lat, event.latlng.lng);
        });
      }}
    >
      <LocateFixed className="h-4 w-4" />
      Locate me
    </Button>
  );
}

export function DashboardMap({ pins }: DashboardMapProps) {
  const [nearby, setNearby] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const allPins = useMemo(() => [...pins, ...nearby], [pins, nearby]);

  async function handleLocate(latitude: number, longitude: number) {
    setLoading(true);
    setNotice("");

    try {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        radius_km: "25",
      });
      const response = await fetch(`/api/nearby?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !Array.isArray(data)) {
        setNotice(
          "Nearby community reports need a lost report on file — showing your pins.",
        );
        return;
      }

      setNearby(
        data
          .filter(
            (item: { latitude: number | null; longitude: number | null }) =>
              item.latitude !== null && item.longitude !== null,
          )
          .map(
            (item: {
              id: number;
              title: string;
              latitude: number;
              longitude: number;
            }) => ({
              id: `nearby-${item.id}`,
              title: item.title,
              kind: "FOUND" as const,
              latitude: item.latitude,
              longitude: item.longitude,
              href: `/found/${item.id}`,
            }),
          ),
      );
    } catch {
      setNotice("Could not load nearby reports — showing your pins.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="relative">
        <MapContainer
          center={[37.7749, -122.4194]}
          zoom={12}
          scrollWheelZoom={false}
          attributionControl={false}
          className="z-0 h-72 w-full rounded-xl border border-border"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds pins={allPins} />
          <LocateControl onLocate={handleLocate} />
          {allPins.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={dotIcon(pin.kind)}
              title={pin.title}
            >
              <Popup>
                <span style={{ fontWeight: 600 }}>{pin.title}</span>
                <br />
                <span>{pin.kind === "LOST" ? "Lost report" : "Found report"}</span>
                {pin.href && (
                  <>
                    <br />
                    <a href={pin.href}>Open report</a>
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {loading && (
          <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-card/90 px-3 py-1 text-xs backdrop-blur">
            <Spinner className="h-3.5 w-3.5" />
            Scanning nearby…
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: PIN_COLORS.LOST }}
          />
          Lost ({pins.filter((pin) => pin.kind === "LOST").length})
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: PIN_COLORS.FOUND }}
          />
          Found ({pins.filter((pin) => pin.kind === "FOUND").length + nearby.length})
        </span>
      </div>

      {allPins.length === 0 && !loading && (
        <p className="mt-2 text-sm text-muted-foreground">
          No pinned reports yet. Report an item with a location, or tap
          Locate me to scan around you.
        </p>
      )}

      <FormError message={notice || undefined} />
    </div>
  );
}
