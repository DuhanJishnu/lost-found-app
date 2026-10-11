"use client";

import { LinkButton } from "@/components/ui/link-button";

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

          <LinkButton href="/items/new" className="mt-6">
            Register Lost Item
          </LinkButton>
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

        <LinkButton href="/found" variant="outline" className="mt-6">
          Back to Found Items
        </LinkButton>
      </div>
    </main>
  );
}