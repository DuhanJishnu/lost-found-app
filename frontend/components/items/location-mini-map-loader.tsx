"use client";

import dynamic from "next/dynamic";

// Leaflet needs window. next/dynamic with `ssr: false` is only allowed
// inside Client Components, so server pages render this loader instead
// of importing the map directly.
const LocationMiniMap = dynamic(
  () =>
    import("./location-mini-map").then(
      (module) => module.LocationMiniMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-xl border border-border bg-muted" />
    ),
  },
);

interface LocationMiniMapLoaderProps {
  latitude: number;
  longitude: number;
  title: string;
}

export function LocationMiniMapLoader(props: LocationMiniMapLoaderProps) {
  return <LocationMiniMap {...props} />;
}
