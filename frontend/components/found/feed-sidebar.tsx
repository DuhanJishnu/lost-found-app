import { Radar } from "lucide-react";

interface FeedSidebarProps {
  topScore: number | null;
  topTitle: string | null;
  totalCount: number;
}

/** Desktop-only feed overview (hidden below lg). */
export function FeedSidebar({
  topScore,
  topTitle,
  totalCount,
}: FeedSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-20 flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Matching discoveries</p>
          <p className="mt-1 font-display text-2xl">{totalCount}</p>
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
