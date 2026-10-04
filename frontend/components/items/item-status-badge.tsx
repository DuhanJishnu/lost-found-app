import { Badge } from "@/components/ui/badge";

import { ItemStatus } from "@/types/items";

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return (
    <Badge variant="outline" className="capitalize">
      {status.toLowerCase()}
    </Badge>
  );
}
