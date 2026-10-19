"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LocateFixed, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";
import { FEED_CATEGORIES } from "./category-chips";
import { cn } from "@/lib/utils";

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100] as const;

export function FeedFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("match");
  const [radiusKm, setRadiusKm] = useState("5");
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const hasLocation =
    searchParams.has("latitude") && searchParams.has("longitude");
  const activeCount =
    Number(Boolean(searchParams.get("category"))) +
    Number(searchParams.get("sort") === "newest") +
    Number(hasLocation);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setCategory(searchParams.get("category") ?? "");
      setSort(searchParams.get("sort") === "newest" ? "newest" : "match");
      setRadiusKm(searchParams.get("radius_km") ?? "5");
      setLatitude(searchParams.get("latitude"));
      setLongitude(searchParams.get("longitude"));
      setError("");
    }

    setOpen(nextOpen);
  }

  function handleLocation() {
    setError("");

    if (latitude !== null && longitude !== null) {
      setLatitude(null);
      setLongitude(null);
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Live location is not supported in this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setLocating(false);
      },
      (failure) => {
        setLocating(false);
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? "Location permission was denied. Allow access to filter nearby items."
            : "Could not get your live location. Try again or continue without a distance filter.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());

    if (category) params.set("category", category);
    else params.delete("category");

    if (sort === "newest") params.set("sort", sort);
    else params.delete("sort");

    if (latitude !== null && longitude !== null) {
      params.set("latitude", latitude);
      params.set("longitude", longitude);
      params.set("radius_km", radiusKm);
    } else {
      params.delete("latitude");
      params.delete("longitude");
      params.delete("radius_km");
    }

    const query = params.toString();
    router.push(`/found${query ? `?${query}` : ""}`);
    setOpen(false);
  }

  function resetFilters() {
    setCategory("");
    setSort("match");
    setRadiusKm("5");
    setLatitude(null);
    setLongitude(null);
    setError("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("sort");
    params.delete("latitude");
    params.delete("longitude");
    params.delete("radius_km");
    const query = params.toString();
    router.push(`/found${query ? `?${query}` : ""}`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={
              activeCount > 0
                ? `Filters, ${activeCount} active`
                : "Filters"
            }
            className={cn(
              "relative h-11 w-11 shrink-0 rounded-xl bg-muted p-0",
              activeCount > 0 && "border-primary text-primary",
            )}
          />
        }
      >
        <SlidersHorizontal className="h-5 w-5" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter discoveries</DialogTitle>
          <DialogDescription>
            Narrow down the feed by category, match order, or distance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="mb-2 block text-sm font-medium">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            >
              <option value="">All categories</option>
              {FEED_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="mb-2 block text-sm font-medium">Sort results</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            >
              <option value="match">Best match</option>
              <option value="newest">Most recent</option>
            </select>
          </label>

          <div className="space-y-2 rounded-xl bg-muted p-3">
            <div>
              <p className="text-sm font-medium">Nearby discoveries</p>
              <p className="text-xs text-muted-foreground">
                Use your location to show found items within a chosen radius.
              </p>
            </div>

            <Button
              type="button"
              variant={latitude !== null ? "secondary" : "outline"}
              onClick={handleLocation}
              disabled={locating}
              className="w-full"
            >
              {locating ? (
                <Spinner size="sm" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              {locating
                ? "Getting location…"
                : latitude !== null
                  ? "Remove my location"
                  : "Use my location"}
            </Button>

            {latitude !== null && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Maximum distance</span>
                <select
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                >
                  {DISTANCE_OPTIONS.map((distance) => (
                    <option key={distance} value={distance}>
                      Within {distance} km
                    </option>
                  ))}
                </select>
              </label>
            )}
            <FormError message={error} />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Reset filters
          </Button>
          <Button type="button" onClick={applyFilters}>
            Show results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
