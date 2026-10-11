"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Quick dispatch search — jumps to the found feed with the query applied. */
export function DispatchSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/found?q=${encodeURIComponent(q)}` : "/found");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-xl flex-col gap-2 sm:flex-row"
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by brand, item, or location (e.g. AirPods, Mission District)..."
        aria-label="Quick search found items"
        className="h-12 flex-1 rounded-xl bg-muted pl-4"
      />
      <Button
        type="submit"
        className="h-12 rounded-xl px-6 text-sm font-semibold"
      >
        <Radar className="h-5 w-5" />
        Scan Database
      </Button>
    </form>
  );
}
