import Link from "next/link";
import { Lock, Radar, RotateCcw } from "lucide-react";

import { LocationRow } from "./location-row";

interface FeedSidebarProps {
  topScore: number | null;
  topTitle: string | null;
  totalCount: number;
}

/** Desktop-only precision filter sidebar (hidden below lg). */
export function FeedSidebar({
  topScore,
  topTitle,
  totalCount,
}: FeedSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-20 flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Precision Filters</h2>
            <Link
              href="/found"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Link>
          </div>

          <p className="mb-2 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            Max Distance
          </p>
          <LocationRow />
          <p className="mt-2 text-xs text-muted-foreground">
            Enable live radar to limit results to 5 km around you.
          </p>
        </div>

        {topScore !== null && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
              <Radar className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Highest match</p>
              <p className="truncate text-sm font-bold text-primary">
                {topScore}%{topTitle ? ` · ${topTitle}` : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
