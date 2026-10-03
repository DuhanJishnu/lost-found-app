import { Badge } from "@/components/ui/badge";

import { ItemType } from "@/types/item";

interface ItemTypeBadgeProps {
  type: ItemType;
}

export function ItemTypeBadge({
  type,
}: ItemTypeBadgeProps) {
  return (
    <Badge
      variant={
        type === "LOST"
          ? "default"
          : "secondary"
      }
    >
      {type}
    </Badge>
  );
}