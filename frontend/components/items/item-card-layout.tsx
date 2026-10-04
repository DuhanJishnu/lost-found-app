import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

import { ItemImage } from "./item-image";

interface ItemCardLayoutProps {
  href: string;
  title: string;
  description: string;
  badgeStart: React.ReactNode;
  badgeEnd?: React.ReactNode;
  image?: { src: string; alt: string };
}

/** Shared shell for ItemCard and FoundItemCard. */
export function ItemCardLayout({
  href,
  title,
  description,
  badgeStart,
  badgeEnd,
  image,
}: ItemCardLayoutProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0 transition-colors hover:border-primary/60">
      {image && (
        <ItemImage
          src={image.src}
          alt={image.alt}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      )}

      <CardHeader className="p-5 pb-2">
        <div className="flex items-center justify-between gap-3">
          {badgeStart}
          {badgeEnd}
        </div>

        <CardTitle className="mt-3 font-display text-xl">{title}</CardTitle>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {description}
        </p>

        <LinkButton href={href} className="mt-5 w-full">
          View item
        </LinkButton>
      </CardContent>
    </Card>
  );
}
