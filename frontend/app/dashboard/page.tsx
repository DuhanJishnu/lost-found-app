import { getMyItems } from "@/lib/items";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { LinkButton } from "@/components/ui/link-button";
import { ItemCard } from "@/components/items/item-card";
import { ItemGrid } from "@/components/items/item-grid";

export default async function DashboardPage() {
  const items = await getMyItems();

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
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </ItemGrid>
      )}
    </PageShell>
  );
}
