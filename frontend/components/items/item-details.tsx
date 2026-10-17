import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Clock3,
  MapPin,
  Tag,
} from "lucide-react";

import { formatDateTime, timeAgo } from "@/lib/format";
import { Item } from "@/types/items";

import { PhotoGallery } from "@/components/found/photo-gallery";
import { ShareButton } from "@/components/found/share-button";
import { ItemDetailMapLoader } from "./item-detail-map-loader";
import { ItemImage } from "./item-image";

interface ItemDetailsProps {
  item: Item;
  imageUrls: string[];
}

export function ItemDetails({ item, imageUrls }: ItemDetailsProps) {
  const hasLocation = item.latitude !== null && item.longitude !== null;
  const isLost = item.type === "LOST";

  const photos = imageUrls.map((url, index) => ({
    src: url,
    alt: `${item.title}, photo ${index + 1}`,
  }));

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-primary/20 text-primary",
    MATCHED: "bg-yellow-500/20 text-yellow-400",
    CLOSED: "bg-muted text-muted-foreground",
  };

  const attributes = [
    { icon: Tag, label: "Category", value: item.category },
    {
      icon: Clock3,
      label: "Reported",
      value: timeAgo(item.created_at),
    },
    ...(item.occurred_at
      ? [
          {
            icon: Calendar,
            label: isLost ? "Lost on" : "Found on",
            value: formatDateTime(item.occurred_at),
          },
        ]
      : []),
    ...(hasLocation
      ? [
          {
            icon: MapPin,
            label: "Location",
            value: `${item.latitude!.toFixed(4)}, ${item.longitude!.toFixed(4)}`,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl pb-10 md:pb-14 lg:max-w-6xl">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="hidden items-center gap-1.5 px-6 pt-6 text-sm text-muted-foreground lg:flex"
      >
        <Link href="/dashboard" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href="/profile"
          className="transition-colors hover:text-foreground"
        >
          My Items
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/profile?type=${item.type}`}
          className="transition-colors hover:text-foreground"
        >
          {isLost ? "Lost" : "Found"}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-primary">{item.title}</span>
      </nav>

      {/* Top bar */}
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 shadow-sm sm:px-6 lg:mx-6 lg:mt-4 lg:rounded-xl">
        <div className="flex items-center gap-2 text-lg font-bold">
            {item.title.toUpperCase()}
        </div>
        <ShareButton title={item.title} />
      </div>

      {/* Main grid */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:px-6 lg:pt-4">
        {/* Left column — images, description, map */}
        <div className="lg:col-span-7">
          {/* Photo gallery / placeholder */}
          {photos.length > 0 ? (
            <PhotoGallery photos={photos} />
          ) : (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-muted text-center lg:rounded-xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-inner">
                {isLost ? (
                  <span className="text-2xl">🔍</span>
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </span>
              <span className="mt-2 text-xs font-bold tracking-wider text-secondary uppercase">
                No photos
              </span>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground italic">
                No photos were attached when this item was reported.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-6 px-4 sm:px-6 lg:px-0">
            {/* Title + type badge (mobile) */}
            <div className="flex flex-col gap-2 lg:hidden">
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold tracking-widest uppercase shadow-sm ${
                    isLost
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {item.type}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  {timeAgo(item.created_at)}
                </span>
              </div>
              <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
                {item.title}
              </h1>
            </div>

            {/* Attribute grid */}
            <div className="grid grid-cols-2 gap-3">
              {attributes.map((attr) => (
                <div
                  key={attr.label}
                  className="flex flex-col rounded-xl bg-card p-4 shadow-sm"
                >
                  <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                    <attr.icon className="h-4 w-4" />
                    <span className="text-xs tracking-wider uppercase">
                      {attr.label}
                    </span>
                  </div>
                  <span className="truncate text-base font-semibold">
                    {attr.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Description */}
            <section className="rounded-xl bg-card p-4 shadow-sm">
              <h2 className="font-display text-xl">Description</h2>
              <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground whitespace-pre-line">
                {item.description}
              </p>
            </section>

            {/* Interactive map */}
            {hasLocation && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-display text-xl">
                    {isLost ? "Last seen area" : "Recovery area"}
                  </h2>
                  <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
                      Interactive
                    </span>
                  </span>
                </div>

                <ItemDetailMapLoader
                  latitude={item.latitude as number}
                  longitude={item.longitude as number}
                  title={item.title}
                />

                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <MapPin className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom text-primary" />
                  {item.latitude}, {item.longitude}
                </p>
              </section>
            )}

            {/* Thumbnail strip (visible only when gallery has images, shown below on mobile for quick access) */}
            {photos.length > 1 && (
              <section>
                <h2 className="mb-2 font-display text-xl">All photos</h2>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((photo, index) => (
                    <ItemImage
                      key={photo.src}
                      src={photo.src}
                      alt={photo.alt}
                      ratio="square"
                      rounded
                      sizes="(max-width: 640px) 33vw, 25vw"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Right column — sticky dossier (desktop only) */}
        <aside className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-20 rounded-xl border border-border bg-card p-6 shadow-xl">
            {/* Type + time */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold tracking-widest uppercase shadow-sm ${
                  isLost
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {item.type}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                {timeAgo(item.created_at)}
              </span>
            </div>

            {/* Title */}
            <h1 className="mt-3 font-display text-3xl tracking-tight">
              {item.title}
            </h1>

            {/* Status */}
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[item.status] ?? statusColors.ACTIVE}`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    item.status === "ACTIVE" ? "animate-pulse bg-primary" : "bg-current"
                  }`}
                />
                {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
              </span>
            </div>

            {/* Quick details */}
            <div className="mt-5 space-y-3 border-t border-border pt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{item.category}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reported</span>
                <span className="font-medium">{timeAgo(item.created_at)}</span>
              </div>

              {item.occurred_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isLost ? "Lost on" : "Found on"}
                  </span>
                  <span className="font-medium">
                    {formatDateTime(item.occurred_at)}
                  </span>
                </div>
              )}

              {hasLocation && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Coordinates</span>
                  <span className="font-mono text-xs">
                    {item.latitude!.toFixed(5)}, {item.longitude!.toFixed(5)}
                  </span>
                </div>
              )}
            </div>

            {/* Description preview */}
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">
                Description
              </h3>
              <p className="line-clamp-4 text-sm leading-relaxed text-foreground">
                {item.description}
              </p>
            </div>

            {/* Reference */}
            <p className="mt-5 text-xs text-muted-foreground">
              {formatDateTime(item.created_at)}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
