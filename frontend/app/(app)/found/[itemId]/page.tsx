import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Lock,
  Radar,
  ShieldCheck,
  Tag,
  UserRound,
} from "lucide-react";

import { getFoundItem } from "@/lib/found";
import { timeAgo } from "@/lib/format";
import { LinkButton } from "@/components/ui/link-button";
import { LocationMiniMapLoader } from "@/components/items/location-mini-map-loader";
import { PhotoGallery } from "@/components/found/photo-gallery";
import { ShareButton } from "@/components/found/share-button";

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
  const photos = item.can_view_image
    ? item.images.map((image, index) => ({
        src: image.image_url,
        alt: `${item.title}, photo ${index + 1}`,
      }))
    : [];

  const hasLocation =
    item.latitude !== null && item.longitude !== null;

  const attributes = [
    { icon: Tag, label: "Category", value: item.category },
    {
      icon: Clock3,
      label: "Reported",
      value: timeAgo(item.created_at),
    },
    { icon: Radar, label: "Match", value: `${similarity}%` },
    {
      icon: ShieldCheck,
      label: "Claim",
      value: item.can_claim ? "Claimable" : "Locked",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl pb-32 md:pb-14">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 shadow-sm sm:px-6">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-[18px] w-[18px] text-primary" />
          <span>Item Log #{item.id}</span>
        </div>

        <ShareButton title={item.title} />
      </div>

      {photos.length > 0 ? (
        <PhotoGallery photos={photos} />
      ) : (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-muted text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-inner">
            <Lock className="h-6 w-6 text-primary" />
          </span>

          <span className="mt-2 text-xs font-bold tracking-wider text-secondary uppercase">
            Private
          </span>

          <p className="mt-1 max-w-xs text-sm text-muted-foreground italic">
            Photo hidden to protect privacy until matched or verified.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6 px-4 sm:px-6">
        <div className="relative mt-4 overflow-hidden rounded-xl bg-muted p-4 shadow-md">
          <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/10 blur-xl" />

          <div className="relative z-10 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Radar className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold tracking-wider text-primary uppercase">
                  {similarity >= 70
                    ? "High probability match"
                    : "Possible match"}
                </span>

                <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                  {similarity}%
                </span>
              </div>

              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                {similarity >= 70
                  ? "This item closely resembles one of your lost reports."
                  : "This item resembles one of your lost reports."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold tracking-widest text-secondary-foreground uppercase shadow-sm">
              Found
            </span>

            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              Found {timeAgo(item.created_at)}
            </span>
          </div>

          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            {item.title}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {attributes.map((attribute) => (
            <div
              key={attribute.label}
              className="flex flex-col rounded-xl bg-card p-4 shadow-sm"
            >
              <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                <attribute.icon className="h-4 w-4" />
                <span className="text-xs tracking-wider uppercase">
                  {attribute.label}
                </span>
              </div>

              <span className="truncate text-base font-semibold">
                {attribute.value}
              </span>
            </div>
          ))}
        </div>

        <section className="rounded-xl bg-card p-4 shadow-sm">
          <h2 className="font-display text-xl">Detailed notes</h2>

          <p className="mt-2 leading-relaxed text-muted-foreground">
            {item.description}
          </p>

          {!item.can_view_image && (
            <p className="mt-3 flex gap-2 text-sm text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              Sensitive details are withheld until the similarity check
              passes identity verification.
            </p>
          )}
        </section>

        {hasLocation && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-xl">Recovery area</h2>
              <span className="text-sm text-muted-foreground">
                Approximate
              </span>
            </div>

            <LocationMiniMapLoader
              latitude={item.latitude as number}
              longitude={item.longitude as number}
              title={item.title}
            />

            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {item.latitude}, {item.longitude}
            </p>
          </section>
        )}

        <section className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="h-6 w-6" />
          </span>

          <div className="min-w-0">
            <p className="font-semibold">Reported by a community member</p>
            <p className="truncate text-sm text-muted-foreground">
              The reporter stays anonymous — contact opens after your
              claim is accepted.
            </p>
          </div>
        </section>

        <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Protected by Community Recovery Protocol
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center justify-between text-xs tracking-wider uppercase">
            <span className="text-muted-foreground">Next step</span>
            <span className="font-semibold text-primary">
              Step 1 of 2: Proof match
            </span>
          </div>

          {item.can_claim ? (
            <LinkButton
              href={`/found/${item.id}/claim`}
              className="h-11 w-full text-base"
            >
              Claim This Item (Verify Ownership)
              <ArrowRight className="h-5 w-5" />
            </LinkButton>
          ) : (
            <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              This item does not currently have enough similarity with
              your registered lost items to start a claim.{" "}
              <Link
                href="/items/new"
                className="font-medium text-primary hover:underline"
              >
                Report your lost item
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
