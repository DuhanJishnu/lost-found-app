import Link from "next/link";
import {
  ChevronRight,
  History,
  ImageOff,
  Lock,
  LogOut,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { auth } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { ItemImage } from "@/components/items/item-image";
import { signOutEverywhere } from "@/components/auth/actions";
import { getClaims } from "@/lib/claims-server";
import { getItemImageUrl, getMyItems } from "@/lib/items";
import { getMatches } from "@/lib/matches";
import { getUserProfile } from "@/lib/users";
import { formatMemberSince, timeAgo } from "@/lib/format";
import type { ClaimResponse } from "@/types/claim";
import type { Item } from "@/types/items";
import type { MatchResponse } from "@/types/match";
import { cn } from "@/lib/utils";

type ProfileTab = "reports" | "history";

interface ProfilePageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProfilePage({
  searchParams,
}: ProfilePageProps) {
  const params = await searchParams;
  const tab: ProfileTab = params.tab === "history" ? "history" : "reports";

  const [session, profile, items, matches, claims] = await Promise.all([
    auth(),
    getUserProfile(),
    getMyItems(),
    getMatches(),
    getClaims(),
  ]);

  const imageUrls = await Promise.all(
    items.map(async (item) => {
      if (item.images.length === 0) return undefined;
      try {
        return await getItemImageUrl(item.images[0].object_key);
      } catch {
        return undefined;
      }
    }),
  );

  const activeReports = items.filter((item) => item.status === "ACTIVE");
  const handle = profile.email.split("@")[0];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6 md:pb-14">
      <section className="flex flex-col items-center pt-6 text-center">
        <span className="relative">
          <Avatar className="h-20 w-20">
            {session?.user?.image && (
              <AvatarImage src={session.user.image} alt="" />
            )}
            <AvatarFallback className="text-2xl">
              {(profile.name ?? profile.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute right-0 bottom-0 h-4 w-4 rounded-full bg-primary ring-2 ring-background" />
        </span>

        <h1 className="mt-3 font-display text-3xl">{profile.name}</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          @{handle} • {profile.email}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Member since {formatMemberSince(profile.member_since)}
        </p>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold tracking-wider uppercase">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Google verified account
        </span>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <StatCard value={profile.stats.items_lost} label="Reported" />
        <StatCard value={profile.stats.items_found} label="Found" />
        <StatCard value={profile.stats.successful_returns} label="Reunited" />
      </section>

      <div className="mt-6 flex rounded-full bg-muted p-1">
        <TabLink
          href="/profile?tab=reports"
          active={tab === "reports"}
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          label={`My Active Reports (${activeReports.length})`}
        />
        <TabLink
          href="/profile?tab=history"
          active={tab === "history"}
          icon={<History className="h-4 w-4 text-muted-foreground" />}
          label={`Claim History (${claims.length})`}
        />
      </div>

      {tab === "reports" ? (
        <ReportsList
          items={activeReports}
          imageUrls={new Map(
            items.map((item, index) => [item.id, imageUrls[index]]),
          )}
          matches={matches}
          claims={claims}
          userId={profile.id}
        />
      ) : (
        <ClaimHistory
          claims={claims}
          matches={matches}
          userId={profile.id}
        />
      )}

      <Card className="mt-8 gap-0 overflow-hidden py-0">
        <form action={signOutEverywhere}>
          <Button
            type="submit"
            variant="ghost"
            className="flex h-auto w-full items-center justify-center gap-2 rounded-none px-4 py-4 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Signed in with Google • Encrypted session
      </p>
    </main>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-card p-4 text-center shadow-sm">
      <p className="font-display text-3xl text-primary">{value}</p>
      <p className="mt-1 text-xs tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-sm transition-colors",
        active ? "bg-card font-bold shadow-sm" : "text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function ReportsList({
  items,
  imageUrls,
  matches,
  claims,
  userId,
}: {
  items: Item[];
  imageUrls: Map<number, string | undefined>;
  matches: MatchResponse[];
  claims: ClaimResponse[];
  userId: number;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No active reports"
          description="Report something you lost or found and it will show up here."
          action={<LinkButton href="/items/new">Report item</LinkButton>}
        />
      </div>
    );
  }

  const pendingMatches = matches.filter((m) => m.status === "PENDING");
  const pendingClaims = claims.filter((c) => c.status === "PENDING");

  return (
    <div className="mt-4 flex flex-col gap-4">
      {items.map((item) => {
        const itemMatches = pendingMatches.filter(
          (m) =>
            m.lost_item_id === item.id || m.found_item_id === item.id,
        );
        const madeClaim = pendingClaims.find(
          (c) =>
            c.claimant_id === userId &&
            itemMatches.some((m) => m.id === c.match_id),
        );
        const receivedClaim = pendingClaims.find(
          (c) =>
            c.claimant_id !== userId &&
            itemMatches.some((m) => m.id === c.match_id),
        );
        const best = Math.max(
          0,
          ...itemMatches.map((m) => Math.round(m.similarity_score * 100)),
        );

        return (
          <Card key={item.id} className="gap-0 overflow-hidden py-0">
            <div className="relative">
              {imageUrls.get(item.id) ? (
                <ItemImage
                  src={imageUrls.get(item.id) as string}
                  alt={item.title}
                  ratio="landscape"
                  sizes="(max-width: 768px) 100vw, 768px"
                />
              ) : (
                <div className="flex aspect-[4/3] flex-col items-center justify-center bg-muted">
                  <ImageOff className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              <span className="absolute top-2 left-2">
                <ItemTypeBadge type={item.type} />
              </span>

              {receivedClaim ? (
                <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-lg bg-background/85 px-3 py-2 backdrop-blur-sm">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Lock className="h-4 w-4" />
                    Claim pending verification
                  </span>
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-bold tracking-wider text-destructive uppercase">
                    Action needed
                  </span>
                </div>
              ) : (
                itemMatches.length > 0 && (
                  <Link
                    href="/matches?tab=pending"
                    className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-lg bg-background/85 px-3 py-2 backdrop-blur-sm transition-colors hover:bg-background"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-bold text-primary">
                      <Radar className="h-4 w-4" />
                      {best}% match found
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )
              )}
            </div>

            <div className="flex flex-col gap-1 p-4">
              <h2 className="font-display text-2xl leading-tight">
                {item.title}
              </h2>

              <p className="text-sm text-muted-foreground">
                {item.type === "LOST" ? "Lost" : "Found"} • Reported{" "}
                {timeAgo(item.created_at)}
              </p>

              <div className="mt-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item.status === "ACTIVE"
                    ? "Active scanning"
                    : item.status.toLowerCase()}
                </span>
              </div>

              {madeClaim ? (
                <p className="mt-3 rounded-lg border p-3 text-center text-sm text-muted-foreground">
                  Your claim is pending review by the finder.
                </p>
              ) : receivedClaim ? (
                <LinkButton
                  href="/matches?tab=pending"
                  variant="outline"
                  className="mt-3 w-full"
                >
                  Review claim
                </LinkButton>
              ) : (
                itemMatches.length > 0 && (
                  <LinkButton
                    href="/matches?tab=pending"
                    className="mt-3 w-full"
                  >
                    Review {itemMatches.length} Potential Match
                    {itemMatches.length === 1 ? "" : "es"}
                  </LinkButton>
                )
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ClaimHistory({
  claims,
  matches,
  userId,
}: {
  claims: ClaimResponse[];
  matches: MatchResponse[];
  userId: number;
}) {
  if (claims.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No claims yet"
          description="Claims you make or receive will be tracked here."
          action={<LinkButton href="/found">Browse found items</LinkButton>}
        />
      </div>
    );
  }

  const matchById = new Map(matches.map((m) => [m.id, m]));

  return (
    <Card className="mt-4 gap-0 overflow-hidden py-0">
      {claims.map((claim, index) => {
        const match = matchById.get(claim.match_id);
        const made = claim.claimant_id === userId;
        const title =
          match?.found_item?.title ?? `Match #${claim.match_id}`;

        return (
          <div
            key={claim.id}
            className={cn(
              "flex items-center gap-3 p-4",
              index < claims.length - 1 && "border-b border-border",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 flex-shrink-0 rounded-full",
                claim.status === "PENDING"
                  ? "bg-primary"
                  : claim.status === "ACCEPTED"
                    ? "bg-primary"
                    : "bg-muted-foreground",
              )}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{title}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {made ? "You claimed" : "Claim on your find"} •{" "}
                {timeAgo(claim.created_at)}
              </p>
            </div>

            <span
              className={cn(
                "flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                claim.status === "PENDING" &&
                  "bg-muted text-muted-foreground",
                claim.status === "ACCEPTED" &&
                  "bg-primary text-primary-foreground",
                claim.status === "REJECTED" &&
                  "bg-muted text-muted-foreground",
              )}
            >
              {claim.status === "PENDING"
                ? "Pending"
                : claim.status === "ACCEPTED"
                  ? "Accepted"
                  : "Rejected"}
            </span>
          </div>
        );
      })}
    </Card>
  );
}
