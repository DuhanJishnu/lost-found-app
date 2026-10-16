import { Plus, Search } from "lucide-react";

import { getMyItems } from "@/lib/items";
import { getMatches } from "@/lib/matches";
import { getCommunityStats } from "@/lib/stats";
import { getUserProfile } from "@/lib/users";
import { QuoteOfDay } from "@/components/dashboard/quote-of-day";
import { LinkButton } from "@/components/ui/link-button";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const [profile, items, matches, community] = await Promise.all([
    getUserProfile(),
    getMyItems(),
    getMatches(),
    getCommunityStats(),
  ]);

  const firstName = profile.name.split(" ")[0];
  const pendingMatches = matches.filter((m) => m.status === "PENDING").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 md:pb-14">
      <header className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
            Hi {firstName}, welcome back.
          </h1>
          <div className="mt-2 max-w-xl">
            <QuoteOfDay />
          </div>
        </div>
        <div className="flex gap-2">
          <LinkButton
            href="/items/new"
            className="h-11 flex-1 rounded-xl sm:flex-none"
          >
            <Plus className="h-5 w-5" />
            Report an item
          </LinkButton>
          <LinkButton
            href="/found"
            variant="outline"
            className="h-11 flex-1 rounded-xl sm:flex-none"
          >
            <Search className="h-5 w-5" />
            Browse found
          </LinkButton>
        </div>
      </header>

      <DashboardClient
        stats={profile.stats}
        community={community}
        pendingMatches={pendingMatches}
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          status: i.status,
          category: i.category,
          created_at: i.created_at,
          latitude: i.latitude,
          longitude: i.longitude,
        }))}
      />
    </main>
  );
}