import { getFoundFeed } from "@/lib/found";
import { FoundItemCard } from "@/components/items/found-item-card";

export default async function FoundPage() {
  const items = await getFoundFeed();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Found Items
        </h1>

        <p className="mt-2 text-muted-foreground">
          Browse items found by other people that may match
          something you lost.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="font-medium">
            No found items available yet.
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Register a lost item to discover relevant found items.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <FoundItemCard
              key={item.id}
              item={item}
            />
          ))}
        </div>
      )}
    </main>
  );
}