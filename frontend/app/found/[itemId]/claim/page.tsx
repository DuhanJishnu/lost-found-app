import Link from "next/link";

import { getMyLostItems } from "@/lib/items";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ClaimPageProps {
  params: Promise<{
    itemId: string;
  }>;
}

export default async function ClaimPage({
  params,
}: ClaimPageProps) {
  const { itemId } = await params;
  const lostItems = await getMyLostItems();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Select your lost item
        </h1>

        <p className="mt-2 text-muted-foreground">
          Select the item you registered as lost that you believe
          matches this found item.
        </p>
      </div>

      {lostItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Register your lost item first</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-muted-foreground">
              You need to have an active lost-item report before
              you can start a claim.
            </p>

            <Button asChild className="mt-6">
              <Link href="/items/new">
                Register Lost Item
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lostItems.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="default">
                    LOST
                  </Badge>

                  <Badge variant="outline">
                    {item.category}
                  </Badge>
                </div>

                <CardTitle>{item.title}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {item.description}
                </p>

                <Button
                  asChild
                  className="mt-4 w-full"
                >
                  <Link
                    href={`/found/${itemId}/claim/verify?lostItemId=${item.id}`}
                  >
                    Select This Item
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}