import { Badge } from "@/components/ui/badge";

import { ItemStatus } from "@/types/item";

interface ItemStatusBadgeProps {
  status: ItemStatus;
}

export function ItemStatusBadge({
  status,
}: ItemStatusBadgeProps) {
  return (
    <Badge variant="outline">
      {status}
    </Badge>
  );
}