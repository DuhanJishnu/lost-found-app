import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { FoundFeedItem } from "@/types/found";

import Image from "next/image";
import { Item } from '../../types/items';

interface FoundItemCardProps {
  item: FoundFeedItem;
}

export function FoundItemCard({ item }: FoundItemCardProps) {
  const similarity = Math.round(item.similarity_score * 100);

  return (
    <Card className="overflow-hidden">
      {item.can_view_image && item.images.length > 0 && (
        <div className="relative aspect-video overflow-hidden bg-muted">
          <Image
            src={item.images[0].image_url}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary">{item.category}</Badge>

          {item.can_view_image && (
            <Badge variant="outline">
              {similarity}% match
            </Badge>
          )}
        </div>

        <CardTitle>{item.title}</CardTitle>
      </CardHeader>

      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {item.description}
        </p>
        <Button
            className="mt-4 w-full"
            nativeButton={false}
            render={<Link href={`/found/${item.id}`}></Link>}
            >
            View Item
        </Button>
      </CardContent>
    </Card>
  );
}