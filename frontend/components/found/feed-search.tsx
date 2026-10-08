"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

export function FeedSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeQuery = searchParams.get("q") ?? "";

  const [value, setValue] = useState(activeQuery);
  const [lastQuery, setLastQuery] = useState(activeQuery);

  // Reset the input when navigation changes the URL query elsewhere.
  if (activeQuery !== lastQuery) {
    setLastQuery(activeQuery);
    setValue(activeQuery);
  }

  useEffect(() => {
    if (value === activeQuery) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }

      router.replace(`/found?${params.toString()}`);
    }, 400);

    return () => clearTimeout(timeout);
  }, [value, activeQuery, router, searchParams]);

  function handleClearFilters() {
    setValue("");
    router.replace("/found");
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search lost or found items (e.g. keys, airpods)..."
          className="h-11 rounded-xl bg-muted pr-3 pl-10"
          aria-label="Search found items"
        />
      </div>

      <button
        type="button"
        onClick={handleClearFilters}
        aria-label="Clear filters"
        title="Clear filters"
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-muted transition-all hover:text-primary active:scale-95"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>
    </div>
  );
}
