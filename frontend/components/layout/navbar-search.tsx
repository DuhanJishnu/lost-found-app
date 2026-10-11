"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

/** Compact header search — jumps to the found feed with the query applied. */
export function NavbarSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!value.trim()) return;

    const timeout = setTimeout(() => {
      router.push(`/found?q=${encodeURIComponent(value.trim())}`);
    }, 600);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative hidden w-full max-w-xs lg:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search telemetry or tags..."
        aria-label="Search found items"
        className="h-9 rounded-full bg-muted pr-3 pl-9"
        key={searchParams.get("q") ?? "empty"}
      />
    </div>
  );
}
