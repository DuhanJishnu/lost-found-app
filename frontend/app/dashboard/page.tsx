import { getItemImageUrl, getMyItems } from "@/lib/items";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { LinkButton } from "@/components/ui/link-button";
import { ItemCard } from "@/components/items/item-card";
import { ItemGrid } from "@/components/items/item-grid";

export default async function DashboardPage() {
  const items = await getMyItems();

  // Resolve each item's first photo to a short-lived signed URL, just
  // like the detail page does. One bad image must not break the grid.
  const imageUrls = await Promise.all(
    items.map(async (item) => {
      if (item.images.length === 0) return undefined;

      try {
        return await getItemImageUrl(item.images[0].object_key);
      } catch {
        return undefined;
      }
    }),
  );

  return (
    <PageShell>
      <PageHeader
        title="My items"
        description="Manage your lost and found reports."
        action={<LinkButton href="/items/new">Report item</LinkButton>}
      />

      {items.length === 0 ? (
        <EmptyState
          title="No items yet"
          description="Report something you lost or found and we'll start looking for matches."
          action={<LinkButton href="/items/new">Report item</LinkButton>}
        />
      ) : (
        <ItemGrid>
          {items.map((item, index) => (
            <ItemCard
              key={item.id}
              item={item}
              imageUrl={imageUrls[index]}
            />
          ))}
        </ItemGrid>
      )}
    </PageShell>
  );
}
