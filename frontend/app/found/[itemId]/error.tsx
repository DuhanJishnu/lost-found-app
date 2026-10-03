"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const lostItemRequired =
    error.message === "LOST_ITEM_REQUIRED";

  if (lostItemRequired) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-xl border p-8 text-center">
          <h1 className="text-xl font-semibold">
            Register your lost item first
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            To claim a relevant found item, you first need to
            register the item you lost.
          </p>

          <Button asChild className="mt-6">
            <Link href="/items/new">
              Register Lost Item
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border p-8 text-center">
        <h1 className="text-xl font-semibold">
          Found item unavailable
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          This item may no longer be available.
        </p>

        <Button asChild variant="outline" className="mt-6">
          <Link href="/found">
            Back to Found Items
          </Link>
        </Button>
      </div>
    </main>
  );
}