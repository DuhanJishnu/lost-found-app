import { Badge } from "@/components/ui/badge";

import { ItemType } from "@/types/items";

export function ItemTypeBadge({ type }: { type: ItemType }) {
  return (
    <Badge variant={type === "LOST" ? "default" : "secondary"} className="capitalize">
      {type.toLowerCase()}
    </Badge>
  );
}
