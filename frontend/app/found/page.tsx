import { getFoundFeed } from "@/lib/found";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { LinkButton } from "@/components/ui/link-button";
import { FoundItemCard } from "@/components/items/found-item-card";
import { ItemGrid } from "@/components/items/item-grid";

export default async function FoundPage() {
  const items = await getFoundFeed();

  return (
    <PageShell width="xl">
      <PageHeader
        title="Found items"
        description="Items other people have found that may match something you lost."
      />

      {items.length === 0 ? (
        <EmptyState
          title="No found items yet"
          description="Report a lost item and matching found items will show up here."
          action={<LinkButton href="/items/new">Report lost item</LinkButton>}
        />
      ) : (
        <ItemGrid columns="three">
          {items.map((item) => (
            <FoundItemCard key={item.id} item={item} />
          ))}
        </ItemGrid>
      )}
    </PageShell>
  );
}
