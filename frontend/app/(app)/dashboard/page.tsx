import Link from "next/link";
import {
  ArrowRight,
  ArrowLeftRight,
  Handshake,
  MapPin,
  PackageSearch,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { getMyItems } from "@/lib/items";
import { getMatches } from "@/lib/matches";
import { getCommunityStats } from "@/lib/stats";
import { getUserProfile } from "@/lib/users";
import { timeAgo } from "@/lib/format";
import { DashboardMapLoader } from "@/components/dashboard/dashboard-map-loader";
import type { MapPin as DashboardPin } from "@/components/dashboard/dashboard-map";
import { QuoteOfDay } from "@/components/dashboard/quote-of-day";
import { ItemStatusBadge } from "@/components/items/item-status-badge";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { LinkButton } from "@/components/ui/link-button";

export default async function DashboardPage() {
  const [profile, items, matches, community] = await Promise.all([
    getUserProfile(),
    getMyItems(),
    getMatches(),
    getCommunityStats(),
  ]);

  const firstName = profile.name.split(" ")[0];
  const pendingMatches = matches.filter((m) => m.status === "PENDING").length;

  const personalStats = [
    { label: "My lost reports", value: profile.stats.items_lost },
    { label: "My found reports", value: profile.stats.items_found },
    { label: "Active matches", value: profile.stats.active_matches },
    { label: "My successful returns", value: profile.stats.successful_returns },
  ];

  const communityStats = [
    { icon: Users, label: "Community members", value: community.total_users },
    { icon: PackageSearch, label: "Lost reported", value: community.items_lost },
    { icon: Search, label: "Found reported", value: community.items_found },
    { icon: Handshake, label: "Reunited", value: community.successful_returns },
  ];

  const pins: DashboardPin[] = items
    .filter((item) => item.latitude !== null && item.longitude !== null)
    .map((item) => ({
      id: `own-${item.id}`,
      title: item.title,
      kind: item.type,
      latitude: item.latitude as number,
      longitude: item.longitude as number,
      href: `/items/${item.id}`,
    }));

  const recent = [...items]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 md:pb-14">
      {/* Welcome */}
      <section className="pt-6">
        <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
          Command Deck
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
          Hi {firstName}, welcome back.
        </h1>
        <div className="mt-2 max-w-xl">
          <QuoteOfDay />
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LinkButton href="/items/new" className="h-12 rounded-xl">
          <Plus className="h-5 w-5" />
          Report an item
        </LinkButton>
        <LinkButton href="/found" variant="outline" className="h-12 rounded-xl">
          <Search className="h-5 w-5" />
          Browse found items
        </LinkButton>
        <LinkButton
          href="/matches"
          variant="outline"
          className="h-12 rounded-xl"
        >
          <ArrowLeftRight className="h-5 w-5" />
          Check matches
          {pendingMatches > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
              {pendingMatches}
            </span>
          )}
        </LinkButton>
      </section>

      {/* Personal stats */}
      <section className="mt-8">
        <h2 className="font-display text-xl">Your recovery record</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {personalStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-4"
            >
              <dd className="font-display text-3xl font-semibold text-primary">
                {stat.value}
              </dd>
              <dt className="mt-1 text-xs text-muted-foreground">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Community analytics */}
      <section className="mt-8">
        <h2 className="font-display text-xl">Network pulse</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Real totals across every member of the registry.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {communityStats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <stat.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <dd className="font-display text-2xl leading-none font-semibold">
                  {stat.value}
                </dd>
                <dt className="mt-1 truncate text-xs text-muted-foreground">
                  {stat.label}
                </dt>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* Map */}
      <section className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl">
              <MapPin className="h-5 w-5 text-primary" />
              Reports around you
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your pinned reports in color — tap Locate me to overlay nearby
              community finds.
            </p>
          </div>
        </div>
        <DashboardMapLoader pins={pins} />
      </section>

      {/* Recent reports */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">My recent reports</h2>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Full history
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="font-semibold">No reports yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Report something you lost or found and it will show up here —
              and on your map.
            </p>
            <LinkButton href="/items/new" className="mt-4">
              Report item
            </LinkButton>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/items/${item.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <ItemTypeBadge type={item.type} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {item.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {item.category} · {timeAgo(item.created_at)}
                    </span>
                  </span>
                  <ItemStatusBadge status={item.status} />
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
