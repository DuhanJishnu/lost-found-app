"use client";

import dynamic from "next/dynamic";

import type { MapPin } from "./dashboard-map";

// Leaflet needs window. next/dynamic with `ssr: false` is only allowed
// inside Client Components, so server pages render this loader instead
// of importing the map directly.
const DashboardMap = dynamic(
  () => import("./dashboard-map").then((module) => module.DashboardMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse rounded-xl border border-border bg-muted" />
    ),
  },
);

export function DashboardMapLoader({ pins }: { pins: MapPin[] }) {
  return <DashboardMap pins={pins} />;
}
