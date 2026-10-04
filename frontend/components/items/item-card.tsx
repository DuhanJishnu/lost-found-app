import { Badge } from "@/components/ui/badge";

import { Item } from "@/types/items";
import { ItemCardLayout } from "./item-card-layout";
import { ItemTypeBadge } from "./item-type-badge";

export function ItemCard({ item }: { item: Item }) {
  return (
    <ItemCardLayout
      href={`/items/${item.id}`}
      title={item.title}
      description={item.description}
      badgeStart={<ItemTypeBadge type={item.type} />}
      badgeEnd={<Badge variant="outline">{item.category}</Badge>}
    />
  );
}
