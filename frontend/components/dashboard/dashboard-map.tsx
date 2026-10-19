"use client";

import { useEffect, useMemo, useState } from "react";
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
  CURRENT_LOCATION: "#ef4444",
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

function currentLocationIcon() {
  const color = PIN_COLORS.CURRENT_LOCATION;
  return L.divIcon({
    className: "lf-map-pin",
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 0 0 4px ${color}55,0 2px 8px rgba(0,0,0,.5)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function FitBounds({
  pins,
  location,
}: {
  pins: MapPin[];
  location: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    const locations = pins.map((pin) => L.latLng(pin.latitude, pin.longitude));
    locations.push(L.latLng(location[0], location[1]));

    if (locations.length > 0) {
      map.fitBounds(L.latLngBounds(locations), {
        padding: [32, 32],
        maxZoom: 14,
      });
    }
  }, [location, map, pins]);

  return null;
}

function LocateControl({
  onLocate,
  onLocateError,
}: {
  onLocate: (latitude: number, longitude: number) => void;
  onLocateError: (message: string) => void;
}) {
  const map = useMap();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="absolute top-3 right-3 z-[500] bg-card/90 backdrop-blur"
      onClick={() => {
        map.once("locationfound", (event: L.LocationEvent) => {
          onLocate(event.latlng.lat, event.latlng.lng);
        });
        map.once("locationerror", (event: L.ErrorEvent) => {
          onLocateError(event.message);
        });
        map.locate({ setView: true, maxZoom: 14 });
      }}
    >
      <LocateFixed className="h-4 w-4" />
      Locate me
    </Button>
  );
}

export function DashboardMap({ pins }: DashboardMapProps) {
  const [nearby, setNearby] = useState<MapPin[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const allPins = useMemo(() => [...pins, ...nearby], [pins, nearby]);

  async function handleLocate(latitude: number, longitude: number) {
    setCurrentLocation([latitude, longitude]);
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
          center={[22, 79]}
          zoom={5}
          scrollWheelZoom={false}
          attributionControl={false}
          className="z-0 h-72 w-full rounded-xl border border-border"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds pins={allPins} location={currentLocation} />
          <LocateControl
            onLocate={handleLocate}
            onLocateError={(message) =>
              setNotice(message || "Could not determine your location.")
            }
          />
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
          {currentLocation && (
            <Marker
              position={currentLocation}
              icon={currentLocationIcon()}
              title="Your current location"
              zIndexOffset={1000}
            >
              <Popup>Your current location</Popup>
            </Marker>
          )}
        </MapContainer>

        {loading && (
          <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-card/90 px-3 py-1 text-xs backdrop-blur">
            <Spinner size="sm" />
            Pivoting…
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full ml-1.5"
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
        {currentLocation && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: PIN_COLORS.CURRENT_LOCATION }}
            />
            You
          </span>
        )}
      </div>
      <FormError message={notice || undefined} />
    </div>
  );
}
