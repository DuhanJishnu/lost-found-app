import Link from "next/link";
import { ArrowUpDown, Radar } from "lucide-react";

import { getFoundFeed } from "@/lib/found";
import { EmptyState } from "@/components/layout/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { FoundItemCard } from "@/components/items/found-item-card";
import { CategoryChips } from "@/components/found/category-chips";
import { FeedSearch } from "@/components/found/feed-search";
import { LocationRow } from "@/components/found/location-row";
import { cn } from "@/lib/utils";

interface FoundPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    latitude?: string;
    longitude?: string;
    radius_km?: string;
  }>;
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function FoundPage({ searchParams }: FoundPageProps) {
  const params = await searchParams;

  const sort = params.sort === "newest" ? "newest" : "match";

  let items = await getFoundFeed({
    q: params.q || undefined,
    category: params.category || undefined,
    latitude: toNumber(params.latitude),
    longitude: toNumber(params.longitude),
    radius_km: toNumber(params.radius_km),
  });

  if (sort === "newest") {
    items = [...items].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  const sortHref = (value: string) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.category) next.set("category", params.category);
    if (params.latitude) next.set("latitude", params.latitude);
    if (params.longitude) next.set("longitude", params.longitude);
    if (params.radius_km) next.set("radius_km", params.radius_km);
    next.set("sort", value);
    return `/found?${next.toString()}`;
  };

  const keptParams: Record<string, string> = {};
  if (params.q) keptParams.q = params.q;
  if (params.sort) keptParams.sort = params.sort;
  if (params.latitude) keptParams.latitude = params.latitude;
  if (params.longitude) keptParams.longitude = params.longitude;
  if (params.radius_km) keptParams.radius_km = params.radius_km;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 md:pb-14">
      <div className="sticky top-16 z-30 -mx-4 bg-background/95 px-4 pt-2 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:top-16">
        <div className="flex flex-col gap-3">
          <FeedSearch />
          <LocationRow />
        </div>
      </div>

      <CategoryChips
        activeCategory={params.category}
        baseParams={keptParams}
      />

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-2xl sm:text-3xl">
            Recent discoveries
          </h1>
          <span className="text-sm font-bold text-primary">
            ({items.length})
          </span>
        </div>

        <Link
          href={sortHref(sort === "newest" ? "match" : "newest")}
          className={cn(
            "inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
          )}
        >
          Sort: {sort === "newest" ? "Newest" : "Best match"}
          <ArrowUpDown className="h-4 w-4" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No found items yet"
            description="Try clearing your search or report a lost item so matching found items show up here."
            action={<LinkButton href="/items/new">Report lost item</LinkButton>}
          />
        </div>
      ) : (
        <div className="mt-4 grid w-full grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {items.map((item) => (
            <FoundItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <section className="mt-8 flex items-center justify-between gap-3 rounded-xl bg-muted p-4 shadow-md">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-background text-primary">
            <Radar className="h-[22px] w-[22px]" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-display text-lg">
              Can&apos;t spot your item?
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              Report it so the radar can start matching.
            </p>
          </div>
        </div>

        <LinkButton href="/items/new" className="flex-shrink-0">
          Report item
        </LinkButton>
      </section>
    </main>
  );
}
