"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, LocateFixed } from "lucide-react";
import { useState } from "react";

import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const RADIUS_KM = 5;

export function LocationRow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const active =
    searchParams.get("latitude") !== null &&
    searchParams.get("longitude") !== null;

  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  function handleToggle() {
    setError("");

    if (active) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("latitude");
      params.delete("longitude");
      params.delete("radius_km");
      router.replace(`/found?${params.toString()}`);
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Live location is not supported in this browser.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const params = new URLSearchParams(searchParams.toString());
        params.set("latitude", String(position.coords.latitude));
        params.set("longitude", String(position.coords.longitude));
        params.set("radius_km", String(RADIUS_KM));
        router.replace(`/found?${params.toString()}`);
      },
      (failure) => {
        setLocating(false);
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? "Location permission was denied."
            : "Could not get your live location.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={locating}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm transition-colors hover:bg-accent",
            active && "bg-accent",
          )}
        >
          {locating ? (
            <Spinner className="h-[15px] w-[15px]" />
          ) : (
            <LocateFixed className="h-[15px] w-[15px] text-primary" />
          )}

          <span className="font-medium">
            {active ? `Within ${RADIUS_KM} km` : "Near me"}
          </span>

          <ChevronDown className="h-[14px] w-[14px] text-muted-foreground" />
        </button>

        {active && (
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
              Live radar active
            </span>
          </span>
        )}
      </div>

      {error && (
        <div className="mt-2">
          <FormError message={error} />
        </div>
      )}
    </div>
  );
}
