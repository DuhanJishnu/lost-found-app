"use client";

import dynamic from "next/dynamic";

const ItemDetailMap = dynamic(
  () =>
    import("./item-detail-map").then(
      (module) => module.ItemDetailMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse rounded-xl border border-border bg-muted sm:h-80" />
    ),
  },
);

interface ItemDetailMapLoaderProps {
  latitude: number;
  longitude: number;
  title: string;
}

export function ItemDetailMapLoader(props: ItemDetailMapLoaderProps) {
  return <ItemDetailMap {...props} />;
}
