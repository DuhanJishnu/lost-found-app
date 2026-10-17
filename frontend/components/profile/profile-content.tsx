"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  History,
  ImageOff,
  Lock,
  Radar,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { ItemImage } from "@/components/items/item-image";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClaimResponse } from "@/types/claim";
import type { Item } from "@/types/items";
import type { MatchResponse } from "@/types/match";

type Tab = "reports" | "history";
type ReportFilter = "ALL" | "LOST" | "FOUND" | "MATCHED";
type ReportSort = "NEW" | "MATCH";
type ClaimFilter = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED";

interface Props {
  initialTab: Tab;
  initialReportFilter: ReportFilter;
  items: Item[];
  matches: MatchResponse[];
  claims: ClaimResponse[];
  imageUrls: Record<number, string | undefined>;
  userId: number;
}

function Chips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary",
            value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ml-1.5 tabular-nums opacity-70">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ProfileContent({
  initialTab,
  initialReportFilter,
  items,
  matches,
  claims,
  imageUrls,
  userId,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [reportFilter, setReportFilter] =
    useState<ReportFilter>(initialReportFilter);
  const [sort, setSort] = useState<ReportSort>("NEW");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("ALL");

  const active = useMemo(
    () => items.filter((i) => i.status === "ACTIVE"),
    [items],
  );
  const pendingMatches = useMemo(
    () => matches.filter((m) => m.status === "PENDING"),
    [matches],
  );
  const pendingClaims = useMemo(
    () => claims.filter((c) => c.status === "PENDING"),
    [claims],
  );

  // Everything the card needs, computed once per item
  const rows = useMemo(
    () =>
      active.map((item) => {
        const itemMatches = pendingMatches.filter(
          (m) => m.lost_item_id === item.id || m.found_item_id === item.id,
        );
        const inMatch = (c: ClaimResponse) =>
          itemMatches.some((m) => m.id === c.match_id);
        return {
          item,
          itemMatches,
          best: Math.max(
            0,
            ...itemMatches.map((m) => Math.round(m.similarity_score * 100)),
          ),
          madeClaim: pendingClaims.some(
            (c) => c.claimant_id === userId && inMatch(c),
          ),
          receivedClaim: pendingClaims.some(
            (c) => c.claimant_id !== userId && inMatch(c),
          ),
        };
      }),
    [active, pendingMatches, pendingClaims, userId],
  );

  const needsAction = rows.filter((r) => r.receivedClaim).length;

  const shownRows = useMemo(() => {
    const list = rows.filter((r) => {
      if (reportFilter === "LOST") return r.item.type === "LOST";
      if (reportFilter === "FOUND") return r.item.type === "FOUND";
      if (reportFilter === "MATCHED") return r.itemMatches.length > 0;
      return true;
    });
    return [...list].sort((a, b) =>
      sort === "MATCH"
        ? b.best - a.best
        : new Date(b.item.created_at).getTime() -
          new Date(a.item.created_at).getTime(),
    );
  }, [rows, reportFilter, sort]);

  const matchById = useMemo(
    () => new Map(matches.map((m) => [m.id, m])),
    [matches],
  );
  const shownClaims = claims.filter(
    (c) => claimFilter === "ALL" || c.status === claimFilter,
  );

  function switchTab(next: Tab) {
    setTab(next);
    window.history.replaceState(null, "", `/profile?tab=${next}`);
  }

  const tabs = [
    { id: "reports" as const, label: "Active reports", count: active.length, icon: Sparkles },
    { id: "history" as const, label: "Claim history", count: claims.length, icon: History },
  ];

  return (
    <section className="min-w-0">
      <div role="tablist" aria-label="Profile sections" className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:px-4",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className={cn("h-4 w-4", tab === t.id && "text-primary")} />
            {t.label}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "reports" ? (
        <div className="mt-4 flex flex-col gap-4">
          {needsAction > 0 && (
            <Link
              href="/matches?tab=pending"
              className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm transition-colors hover:bg-destructive/10"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              <span className="flex-1 font-medium">
                {needsAction} {needsAction === 1 ? "claim needs" : "claims need"} your review
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}

          {rows.length === 0 ? (
            <EmptyState
              title="No active reports"
              description="Report something you lost or found and it will show up here."
              action={<LinkButton href="/items/new">Report item</LinkButton>}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Chips
                  label="Filter reports"
                  value={reportFilter}
                  onChange={setReportFilter}
                  options={[
                    { value: "ALL", label: "All", count: rows.length },
                    { value: "LOST", label: "Lost" },
                    { value: "FOUND", label: "Found" },
                    { value: "MATCHED", label: "Has matches", count: rows.filter((r) => r.itemMatches.length > 0).length },
                  ]}
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  Sort
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as ReportSort)}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
                  >
                    <option value="NEW">Newest</option>
                    <option value="MATCH">Best match</option>
                  </select>
                </label>
              </div>

              {shownRows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nothing matches this filter.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {shownRows.map(({ item, itemMatches, best, madeClaim, receivedClaim }) => {
                    const src = imageUrls[item.id];
                    return (
                      <Card
                        key={item.id}
                        className="group gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md"
                      >
                        <Link href={`/items/${item.id}`} className="relative block">
                          {src ? (
                            <ItemImage
                              src={src}
                              alt={item.title}
                              ratio="landscape"
                              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 300px"
                            />
                          ) : (
                            <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                              <ImageOff className="h-7 w-7 text-muted-foreground" />
                            </div>
                          )}
                          <span className="absolute top-2 left-2">
                            <ItemTypeBadge type={item.type} />
                          </span>
                          {itemMatches.length > 0 && !receivedClaim && (
                            <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold text-primary backdrop-blur-sm">
                              <Radar className="h-3.5 w-3.5" />
                              {best}% match
                            </span>
                          )}
                          {receivedClaim && (
                            <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold text-destructive backdrop-blur-sm">
                              <Lock className="h-3.5 w-3.5" />
                              Action needed
                            </span>
                          )}
                        </Link>

                        <div className="flex flex-1 flex-col gap-1 p-4">
                          <h2 className="truncate font-display text-lg leading-tight">
                            {item.title}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Reported {timeAgo(item.created_at)}
                          </p>

                          {madeClaim ? (
                            <p className="mt-3 rounded-lg border p-2 text-center text-xs text-muted-foreground">
                              Claim pending review by the finder
                            </p>
                          ) : receivedClaim ? (
                            <LinkButton href="/matches?tab=pending" variant="outline" className="mt-3 w-full">
                              Review claim
                            </LinkButton>
                          ) : itemMatches.length > 0 ? (
                            <LinkButton href="/matches?tab=pending" className="mt-3 w-full">
                              Review {itemMatches.length} match{itemMatches.length === 1 ? "" : "es"}
                            </LinkButton>
                          ) : (
                            <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                              Active scanning
                            </span>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {claims.length === 0 ? (
            <EmptyState
              title="No claims yet"
              description="Claims you make or receive will be tracked here."
              action={<LinkButton href="/found">Browse found items</LinkButton>}
            />
          ) : (
            <>
              <Chips
                label="Filter claims"
                value={claimFilter}
                onChange={setClaimFilter}
                options={[
                  { value: "ALL", label: "All", count: claims.length },
                  { value: "PENDING", label: "Pending" },
                  { value: "ACCEPTED", label: "Accepted" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
              />
              <Card className="gap-0 overflow-hidden py-0">
                {shownClaims.length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    No claims with this status.
                  </p>
                )}
                {shownClaims.map((claim, index) => {
                  const match = matchById.get(claim.match_id);
                  const made = claim.claimant_id === userId;
                  return (
                    <div
                      key={claim.id}
                      className={cn(
                        "flex items-center gap-3 p-4",
                        index < shownClaims.length - 1 && "border-b border-border",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          claim.status === "REJECTED" ? "bg-muted-foreground" : "bg-primary",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {match?.found_item?.title ?? `Match #${claim.match_id}`}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {made ? "You claimed" : "Claim on your find"} • {timeAgo(claim.created_at)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold",
                          claim.status === "ACCEPTED"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {claim.status === "PENDING" ? "Pending" : claim.status === "ACCEPTED" ? "Accepted" : "Rejected"}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </div>
      )}
    </section>
  );
}