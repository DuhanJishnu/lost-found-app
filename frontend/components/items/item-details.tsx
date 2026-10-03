import Image from "next/image";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Item } from "@/types/item";
import { ItemTypeBadge } from "./item-type-badge";
import { ItemStatusBadge } from "./item-status-badge";

interface ItemDetailsProps {
  item: Item;
  imageUrls: string[];
}

export function ItemDetails({
  item,
  imageUrls,
}: ItemDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <ItemTypeBadge type={item.type} />

          <ItemStatusBadge status={item.status} />
        </div>

        <CardTitle className="text-2xl">
          {item.title}
        </CardTitle>

        <Badge variant="outline">
          {item.category}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {imageUrls.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {imageUrls.map((url, index) => (
              <div
                key={url}
                className="relative aspect-square overflow-hidden rounded-xl border"
              >
                <Image
                  src={url}
                  alt={`${item.title} image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <h2 className="mb-2 font-semibold">
            Description
          </h2>

          <p className="text-muted-foreground">
            {item.description}
          </p>
        </div>

        {item.latitude !== null &&
          item.longitude !== null && (
            <div>
              <h2 className="mb-2 font-semibold">
                Location
              </h2>

              <p className="text-sm text-muted-foreground">
                {item.latitude}, {item.longitude}
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  );
}