import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";

import { timeAgo } from "@/lib/format";
import { FoundFeedItem } from "@/types/found";
import { ItemImage } from "./item-image";

export function FoundItemCard({ item }: { item: FoundFeedItem }) {
  const similarity = Math.round(item.similarity_score * 100);
  const visible = item.can_view_image && item.images.length > 0;

  return (
    <Card className="gap-0 overflow-hidden py-0 transition-transform hover:-translate-y-0.5">
      {visible ? (
        <div className="relative">
          <ItemImage
            src={item.images[0].image_url}
            alt={item.title}
            ratio="landscape"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-black/30" />

          <span className="absolute top-2 left-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold tracking-wider text-secondary-foreground uppercase">
            Found
          </span>

          <span className="absolute right-2 bottom-2 inline-flex items-center rounded-full bg-muted/90 px-2 py-0.5 text-xs font-bold text-primary backdrop-blur-sm">
            {similarity}% match
          </span>
        </div>
      ) : (
        <div className="relative flex aspect-[4/3] flex-col items-center justify-center bg-muted p-3 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-inner">
            <Lock className="h-[22px] w-[22px] text-primary" />
          </span>

          <span className="mt-1.5 text-xs font-bold tracking-wider text-secondary uppercase">
            Private
          </span>

          <span className="absolute top-2 left-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold tracking-wider text-secondary-foreground uppercase">
            Found
          </span>

          <span className="absolute right-2 bottom-2 inline-flex items-center rounded-full bg-card px-2 py-0.5 text-xs font-bold text-primary/70">
            {similarity}% match
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
        <div>
          <span className="block text-xs tracking-widest text-muted-foreground uppercase">
            {item.category}
          </span>

          <h3 className="mt-0.5 truncate font-display text-lg leading-tight">
            {item.title}
          </h3>

          <p
            className={
              visible
                ? "mt-1 line-clamp-2 text-sm text-muted-foreground"
                : "mt-1 line-clamp-2 text-sm text-muted-foreground italic"
            }
          >
            {visible
              ? item.description
              : "Photo hidden to protect privacy until matched or verified."}
          </p>
        </div>

        <div className="flex items-center justify-between pt-1.5">
          <span className="text-xs text-muted-foreground">
            {timeAgo(item.created_at)}
          </span>

          <Link
            href={`/found/${item.id}`}
            aria-label={`View ${item.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {visible ? (
              <ArrowRight className="h-[18px] w-[18px]" />
            ) : (
              <ShieldCheck className="h-[18px] w-[18px] text-muted-foreground" />
            )}
          </Link>
        </div>
      </div>
    </Card>
  );
}
