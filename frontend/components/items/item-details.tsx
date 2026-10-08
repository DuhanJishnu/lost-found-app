import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { formatDateTime } from "@/lib/format";
import { Item } from "@/types/items";
import { DetailSection } from "./detail-section";
import { ItemImage } from "./item-image";
import { ItemStatusBadge } from "./item-status-badge";
import { ItemTypeBadge } from "./item-type-badge";
import { LocationMiniMapLoader } from "./location-mini-map-loader";

interface ItemDetailsProps {
  item: Item;
  imageUrls: string[];
}

export function ItemDetails({ item, imageUrls }: ItemDetailsProps) {
  const hasLocation = item.latitude !== null && item.longitude !== null;

  return (
    <Card className="gap-6 p-2 sm:p-4">
      <CardHeader className="gap-4">
        <div className="flex items-center justify-between">
          <ItemTypeBadge type={item.type} />
          <ItemStatusBadge status={item.status} />
        </div>

        <CardTitle className="font-display text-3xl sm:text-4xl">
          {item.title}
        </CardTitle>

        <div>
          <Badge variant="outline">{item.category}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {imageUrls.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {imageUrls.map((url, index) => (
              <ItemImage
                key={url}
                src={url}
                alt={`${item.title}, photo ${index + 1}`}
                ratio="square"
                rounded
              />
            ))}
          </div>
        )}

        <DetailSection title="Description">
          <p className="max-w-prose leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </DetailSection>

        {item.occurred_at && (
          <DetailSection
            title={item.type === "LOST" ? "Lost on" : "Found on"}
          >
            <p className="text-sm text-muted-foreground">
              {formatDateTime(item.occurred_at)}
            </p>
          </DetailSection>
        )}

        {hasLocation && (
          <DetailSection title="Location">
            <div className="space-y-3">
              <LocationMiniMapLoader
                latitude={item.latitude as number}
                longitude={item.longitude as number}
                title={item.title}
              />

              <p className="text-sm text-muted-foreground">
                {item.latitude}, {item.longitude}
              </p>
            </div>
          </DetailSection>
        )}
      </CardContent>
    </Card>
  );
}
