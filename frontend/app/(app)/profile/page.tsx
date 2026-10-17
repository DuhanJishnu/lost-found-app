import { LogOut, ShieldCheck } from "lucide-react";

import { auth } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/components/auth/actions";
import { ProfileContent } from "@/components/profile/profile-content";
import { getClaims } from "@/lib/claims-server";
import { getItemImageUrl, getMyItems } from "@/lib/items";
import { getMatches } from "@/lib/matches";
import { getUserProfile } from "@/lib/users";
import { formatMemberSince } from "@/lib/format";

interface ProfilePageProps {
  searchParams: Promise<{ tab?: string; type?: string }>;
}

function SignOut({ className }: { className?: string }) {
  return (
    <form action={signOutEverywhere} className={className}>
      <Button
        type="submit"
        variant="outline"
        className="h-10 w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </form>
  );
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const tab = params.tab === "history" ? "history" : "reports";
  const reportFilter =
    params.type === "LOST" || params.type === "FOUND" ? params.type : "ALL";

  const [session, profile, items, matches, claims] = await Promise.all([
    auth(),
    getUserProfile(),
    getMyItems(),
    getMatches(),
    getClaims(),
  ]);

  const urls = await Promise.all(
    items.map(async (item) => {
      if (item.images.length === 0) return undefined;
      try {
        return await getItemImageUrl(item.images[0].object_key);
      } catch {
        return undefined;
      }
    }),
  );
  const imageUrls: Record<number, string | undefined> = Object.fromEntries(
    items.map((item, i) => [item.id, urls[i]]),
  );

  const handle = profile.email.split("@")[0];
  const stats = [
    { value: profile.stats.items_lost, label: "Reported" },
    { value: profile.stats.items_found, label: "Found" },
    { value: profile.stats.successful_returns, label: "Reunited" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 md:pb-14">
      <div className="grid gap-6 pt-6 lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-10">
        {/* Identity: centred on mobile, sticky sidebar on desktop */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
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

            <h1 className="mt-3 font-display text-3xl leading-tight">
              {profile.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">@{handle}</p>
            <p className="max-w-full truncate text-sm text-muted-foreground">
              {profile.email}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Member since {formatMemberSince(profile.member_since)}
            </p>

            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold tracking-wider uppercase">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Google verified
            </span>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card py-3">
            {stats.map((s) => (
              <div key={s.label} className="px-2 text-center">
                <dd className="font-display text-2xl font-semibold text-primary tabular-nums">
                  {s.value}
                </dd>
                <dt className="mt-0.5 text-[11px] tracking-wider text-muted-foreground uppercase">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>

          <SignOut className="hidden lg:block" />
        </aside>

        <ProfileContent
          initialTab={tab}
          initialReportFilter={reportFilter}
          items={items}
          matches={matches}
          claims={claims}
          imageUrls={imageUrls}
          userId={profile.id}
        />
      </div>

      <SignOut className="mt-8 lg:hidden" />
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Signed in with Google • Encrypted session
      </p>
    </main>
  );
}