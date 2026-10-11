import Link from "next/link";

import { getMatches } from "@/lib/matches";
import { getUserProfile } from "@/lib/users";
import { EmptyState } from "@/components/layout/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { MatchesInbox } from "@/components/matches/matches-inbox";
import type { MatchStatus } from "@/types/match";
import { cn } from "@/lib/utils";

type InboxTab = "pending" | "confirmed" | "rejected";

const TABS: { value: InboxTab; label: string; statuses: MatchStatus[] }[] = [
  { value: "pending", label: "Unresolved", statuses: ["PENDING"] },
  { value: "confirmed", label: "Reviewed", statuses: ["CONFIRMED"] },
  { value: "rejected", label: "Archived", statuses: ["REJECTED"] },
];

interface MatchesPageProps {
  searchParams: Promise<{ tab?: string; match?: string }>;
}

export default async function MatchesPage({
  searchParams,
}: MatchesPageProps) {
  const params = await searchParams;

  const [matches, profile] = await Promise.all([
    getMatches(),
    getUserProfile(),
  ]);

  // Deep links (?match=<id>) land on the right tab: the tab follows
  // the linked match's status instead of the default.
  const linkedId = Number(params.match);
  const linked = Number.isInteger(linkedId)
    ? matches.find((match) => match.id === linkedId)
    : undefined;

  const tab: InboxTab =
    linked?.status === "CONFIRMED"
      ? "confirmed"
      : linked?.status === "REJECTED"
        ? "rejected"
        : params.tab === "confirmed" || params.tab === "rejected"
          ? params.tab
          : "pending";

  const counts = {
    pending: matches.filter((m) => m.status === "PENDING").length,
    confirmed: matches.filter((m) => m.status === "CONFIRMED").length,
    rejected: matches.filter((m) => m.status === "REJECTED").length,
  };

  const visible = matches.filter((match) =>
    TABS.find((t) => t.value === tab)?.statuses.includes(match.status),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6 md:pb-14">
      <div className="mt-4 flex rounded-full bg-muted p-1">
        {TABS.map((entry) => (
          <Link
            key={entry.value}
            href={`/matches?tab=${entry.value}`}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-sm transition-colors",
              tab === entry.value
                ? "bg-card font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {entry.label}
            {entry.value === "pending" ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {counts.pending}
              </span>
            ) : (
              <span className="text-xs">{counts[entry.value]}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl sm:text-4xl">
          Detected matches
        </h1>

        <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
            Active sync
          </span>
        </span>
      </div>

      <p className="mt-2 text-muted-foreground">
        Automatic matching compared your lost reports with newly
        submitted found items.
      </p>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={
              tab === "pending"
                ? "No unresolved matches"
                : tab === "confirmed"
                  ? "No confirmed matches yet"
                  : "Nothing archived"
            }
            description={
              tab === "pending"
                ? "New matches appear here when found items resemble your lost reports."
                : "Matches you decide on will show up here."
            }
            action={<LinkButton href="/found">Browse found items</LinkButton>}
          />
        </div>
      ) : (
        <div className="mt-6">
          <MatchesInbox
            matches={visible}
            currentUserId={profile.id}
            initialSelectedId={linked?.id}
          />
        </div>
      )}
    </main>
  );
}
