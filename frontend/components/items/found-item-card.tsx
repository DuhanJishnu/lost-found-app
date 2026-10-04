import { Badge } from "@/components/ui/badge";

import { FoundFeedItem } from "@/types/found";
import { ItemCardLayout } from "./item-card-layout";

export function FoundItemCard({ item }: { item: FoundFeedItem }) {
  const similarity = Math.round(item.similarity_score * 100);
  const image =
    item.can_view_image && item.images.length > 0
      ? { src: item.images[0].image_url, alt: item.title }
      : undefined;

  return (
    <ItemCardLayout
      href={`/found/${item.id}`}
      title={item.title}
      description={item.description}
      image={image}
      badgeStart={<Badge variant="secondary">{item.category}</Badge>}
      badgeEnd={
        item.can_view_image && (
          <Badge variant="outline" className="border-primary text-primary">
            {similarity}% match
          </Badge>
        )
      }
    />
  );
}
