"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";

export interface PickedLocation {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (value: PickedLocation | null) => void;
}

// Lahore default — roughly central for the current user base.
const DEFAULT_CENTER: [number, number] = [31.5204, 74.3587];
const DEFAULT_ZOOM = 12;
const FOCUSED_ZOOM = 15;

const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickToPin({ onPick }: { onPick: (value: PickedLocation) => void }) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

function Recenter({ value }: { value: PickedLocation | null }) {
  const map = useMap();

  useEffect(() => {
    if (value) {
      map.setView([value.latitude, value.longitude], FOCUSED_ZOOM);
    }
  }, [map, value]);

  return null;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  function handleUseLiveLocation() {
    setGeoError("");

    if (!("geolocation" in navigator)) {
      setGeoError("Live location is not supported in this browser.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (failure) => {
        setLocating(false);

        if (failure.code === failure.PERMISSION_DENIED) {
          setGeoError(
            "Location permission was denied. Allow access or tap the map instead.",
          );
        } else {
          setGeoError(
            "Could not get your live location. Tap the map to drop a pin instead.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-3">
      <MapContainer
        center={
          value ? [value.latitude, value.longitude] : DEFAULT_CENTER
        }
        zoom={value ? FOCUSED_ZOOM : DEFAULT_ZOOM}
        className="z-0 h-64 w-full rounded-xl border border-border"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickToPin onPick={onChange} />
        <Recenter value={value} />

        {value && (
          <Marker
            position={[value.latitude, value.longitude]}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target as L.Marker;
                const position = marker.getLatLng();
                onChange({
                  latitude: position.lat,
                  longitude: position.lng,
                });
              },
            }}
          />
        )}
      </MapContainer>

      <p className="text-xs text-muted-foreground">
        {value
          ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)} — tap elsewhere or drag the pin to move it.`
          : "Tap the map to drop a pin where it happened."}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={handleUseLiveLocation}
          disabled={locating}
          className="flex-1"
        >
          {locating ? (
            <>
              <Spinner />
              Locating…
            </>
          ) : (
            "Use my live location"
          )}
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setGeoError("");
              onChange(null);
            }}
            className="flex-1"
          >
            Remove location
          </Button>
        )}
      </div>

      <FormError message={geoError} />
    </div>
  );
}
