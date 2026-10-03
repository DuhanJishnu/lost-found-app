import Image from "next/image";
import Link from "next/link";

import { getFoundItem } from "@/lib/found";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FoundItemPageProps {
  params: Promise<{
    itemId: string;
  }>;
}

export default async function FoundItemPage({
  params,
}: FoundItemPageProps) {
  const { itemId } = await params;

  const item = await getFoundItem(Number(itemId));

  const similarity = Math.round(item.similarity_score * 100);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        {item.can_view_image && item.images.length > 0 && (
          <div className="relative aspect-video overflow-hidden rounded-t-xl bg-muted">
            <Image
              src={item.images[0].image_url}
              alt={item.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <Badge variant="secondary">
              {item.category}
            </Badge>

            {item.can_view_image && (
              <Badge variant="outline">
                {similarity}% match
              </Badge>
            )}
          </div>

          <CardTitle className="text-2xl">
            {item.title}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="leading-7 text-muted-foreground">
            {item.description}
          </p>

          {item.can_claim ? (
            <Button className="mt-6 w-full" asChild>
              <Link href={`/found/${item.id}/claim`}>
                Claim This Item
              </Link>
            </Button>
          ) : (
            <div className="mt-6 rounded-lg border p-4 text-sm text-muted-foreground">
              This item does not currently have enough similarity
              with your registered lost items to start a claim.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}