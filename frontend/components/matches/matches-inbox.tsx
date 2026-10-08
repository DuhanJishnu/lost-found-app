"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronRight,
  Handshake,
  Lock,
  Radar,
  ShieldCheck,
  X,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";
import { ItemImage } from "@/components/items/item-image";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { timeAgo } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import { updateMatchStatus } from "@/lib/claims";
import type {
  MatchItemSummary,
  MatchResponse,
} from "@/types/match";
import { cn } from "@/lib/utils";

interface MatchesInboxProps {
  matches: MatchResponse[];
  currentUserId: number;
  initialSelectedId?: number;
}

export function MatchesInbox({
  matches,
  currentUserId,
  initialSelectedId,
}: MatchesInboxProps) {
  const router = useRouter();

  const [selectedId, setSelectedId] = useState<number | null>(
    initialSelectedId ?? (matches.length > 0 ? matches[0].id : null),
  );
  const [acting, setActing] = useState<"CONFIRMED" | "REJECTED" | null>(null);
  const [error, setError] = useState("");

  const selected =
    matches.find((match) => match.id === selectedId) ?? matches[0] ?? null;

  async function handleDecision(status: "CONFIRMED" | "REJECTED") {
    if (!selected) return;

    setActing(status);
    setError("");

    try {
      await updateMatchStatus(selected.id, status);
      setSelectedId(null);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update match",
      );
    } finally {
      setActing(null);
    }
  }

  if (!selected) return null;

  const score = Math.round(selected.similarity_score * 100);
  const isLostOwner = selected.lost_item?.user_id === currentUserId;
  const isPending = selected.status === "PENDING";

  const categorySame =
    selected.lost_item !== null &&
    selected.found_item !== null &&
    selected.lost_item.category.toLowerCase() ===
      selected.found_item.category.toLowerCase();

  const distanceKm =
    selected.lost_item?.latitude != null &&
    selected.lost_item?.longitude != null &&
    selected.found_item?.latitude != null &&
    selected.found_item?.longitude != null
      ? haversineKm(
          selected.lost_item.latitude,
          selected.lost_item.longitude,
          selected.found_item.latitude,
          selected.found_item.longitude,
        )
      : null;

  const signals = [
    {
      label: "Visual similarity",
      value: `${score}%`,
      strong: score >= 70,
    },
    {
      label: "Category",
      value: categorySame ? "Same" : "Different",
      strong: categorySame,
    },
    {
      label: "Distance",
      value:
        distanceKm === null
          ? "No location"
          : distanceKm < 1
            ? `${Math.round(distanceKm * 1000)} m away`
            : `${distanceKm.toFixed(1)} km away`,
      strong: distanceKm !== null && distanceKm < 5,
    },
  ];
  const strongCount = signals.filter((signal) => signal.strong).length;

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center justify-between p-4 pb-3">
          <p className="flex items-center gap-1.5 font-bold text-primary">
            <Radar className="h-5 w-5" />
            {score}% Match Score
          </p>

          <p className="text-xs tracking-wider text-muted-foreground uppercase">
            Match #{selected.id}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border">
          <MatchPhoto
            label="Your lost report"
            item={selected.lost_item}
            fallbackLabel="Lost"
          />
          <MatchPhoto
            label="Their found item"
            item={selected.found_item}
            fallbackLabel="Found"
          />
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-wider text-muted-foreground uppercase">
                Match signals
              </p>
              <p className="text-sm font-bold text-primary">
                {strongCount} / 3 strong
              </p>
            </div>

            <div className="mt-2 flex flex-col gap-2">
              {signals.map((signal) => (
                <div
                  key={signal.label}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
                >
                  <span className="text-sm font-medium">{signal.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      signal.strong
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground",
                    )}
                  >
                    {signal.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <FormError message={error} />

          {isPending && isLostOwner && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleDecision("REJECTED")}
                disabled={acting !== null}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-muted font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                {acting === "REJECTED" ? (
                  <Spinner />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Not a Match
              </button>

              <button
                type="button"
                onClick={() => handleDecision("CONFIRMED")}
                disabled={acting !== null}
                className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
              >
                {acting === "CONFIRMED" ? (
                  <Spinner />
                ) : (
                  <Handshake className="h-5 w-5" />
                )}
                Confirm & Request
              </button>
            </div>
          )}

          {isPending && !isLostOwner && (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              Only the reporter can confirm this match. You will be
              notified if they confirm or start a claim.
            </p>
          )}

          {!isPending && (
            <p className="flex items-center justify-center gap-2 rounded-lg border p-4 text-center text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {selected.status === "CONFIRMED"
                ? "You confirmed this match."
                : "This match was rejected."}
            </p>
          )}
        </div>
      </Card>

      {matches.length > 1 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs tracking-wider text-muted-foreground uppercase">
              Incoming queue
            </h2>
            <p className="text-xs text-muted-foreground">
              Sorted by confidence
            </p>
          </div>

          <Card className="gap-0 overflow-hidden py-0">
            {matches
              .filter((match) => match.id !== selected.id)
              .map((match, index, rest) => (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => setSelectedId(match.id)}
                  className={cn(
                    "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted",
                    index < rest.length - 1 && "border-b border-border",
                  )}
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />

                  {match.found_item?.image_url ? (
                    <span className="block h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                      <ItemImage
                        src={match.found_item.image_url}
                        alt={match.found_item.title}
                        ratio="square"
                      />
                    </span>
                  ) : (
                    <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">
                        {match.found_item?.title ?? `Match #${match.id}`}
                      </span>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {timeAgo(match.created_at)}
                      </span>
                    </span>

                    <span className="mt-1 flex items-center gap-2">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-bold text-primary">
                        {Math.round(match.similarity_score * 100)}% match
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        {match.found_item?.description ?? ""}
                      </span>
                    </span>
                  </span>

                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                </button>
              ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function MatchPhoto({
  label,
  item,
  fallbackLabel,
}: {
  label: string;
  item: MatchItemSummary | null;
  fallbackLabel: string;
}) {
  return (
    <div className="bg-card">
      <div className="flex items-center justify-between gap-2 p-3 pb-2">
        <p className="truncate text-[11px] tracking-wider text-muted-foreground uppercase">
          {label}
        </p>

        {item && <ItemTypeBadge type={item.type} />}
      </div>

      {item?.image_url ? (
        <div className="relative">
          <ItemImage
            src={item.image_url}
            alt={item.title}
            ratio="landscape"
            sizes="(max-width: 768px) 50vw, 400px"
          />

          <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur-sm">
            {timeAgo(item.created_at)}
          </span>
        </div>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center bg-muted text-center">
          <Lock className="h-6 w-6 text-primary" />
          <p className="mt-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            {item ? "No photo" : fallbackLabel}
          </p>
        </div>
      )}

      <div className="p-3 pt-2">
        <p className="truncate font-display text-lg leading-tight">
          {item?.title ?? "Unknown item"}
        </p>

        {item && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {item.category}
          </p>
        )}
      </div>
    </div>
  );
}
