import Link from "next/link";

import { getMyItems } from "@/lib/items";
import { ItemCard } from "@/components/items/item-card";

export default async function DashboardPage() {
  const items = await getMyItems();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Items</h1>

          <p className="text-gray-500">Manage your lost and found reports.</p>
        </div>

        <Link
          href="/items/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Report Item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border p-10 text-center">
          <h2 className="text-xl font-semibold">No items yet</h2>

          <p className="mt-2 text-gray-500">
            Report something you lost or found.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
                <ItemCard
                key={item.id}
                item={item}
                />
            ))}
        </div>
      )}
    </main>
  );
}
