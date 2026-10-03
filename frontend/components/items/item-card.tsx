import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Item } from "@/types/item";
import { ItemTypeBadge } from "./item-type-badge";

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <ItemTypeBadge type={item.type} />

          <Badge variant="outline">
            {item.category}
          </Badge>
        </div>

        <CardTitle className="mt-2">
          {item.title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {item.description}
        </p>

        <Button
            className="mt-4 w-full"
            nativeButton={false}
            render={<Link href={`/items/${item.id}`} />}
            >
            View Item
        </Button>
      </CardContent>
    </Card>
  );
}