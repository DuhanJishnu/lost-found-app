import Link from "next/link";
import { BadgeCheck, Radar, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthSplit } from "@/components/auth/auth-split";
import { EmailSignInForm } from "@/components/auth/email-signin-form";
import { GoogleButton } from "@/components/auth/google-button";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.googleId ?? session?.user?.userId) {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-8 pb-16 lg:max-w-6xl lg:pt-12">
      <AuthSplit
        badge="Recovery Registry Telemetry"
        title="Welcome back to the Registry."
        description="Sign in to monitor your active scans, verify incoming match alerts, and coordinate secure community handovers."
        pillars={[
          {
            icon: Radar,
            title: "Live Match Telemetry",
            description:
              "Automatic visual and spatial matching compares your lost reports against every new found item.",
          },
          {
            icon: ShieldCheck,
            title: "Zero-Knowledge Handover",
            description:
              "Personal contact info stays sealed until both sides cryptographically approve the claim.",
          },
        ]}
        footnote="End-to-end encrypted session."
      >
        <div className="flex flex-col gap-5">
          {/* Mobile header — hidden on desktop, the split panel covers it */}
          <div className="flex flex-col gap-2 pt-2 lg:hidden">
            <p className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-primary uppercase">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Recovery Registry Telemetry
            </p>
            <h1 className="font-display text-3xl font-medium tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to monitor your active scans and matched claims.
            </p>
          </div>

          <h1 className="hidden font-display text-2xl font-medium tracking-tight lg:block">
            Sign In
          </h1>

          <GoogleButton />

          <div className="relative flex items-center justify-center">
            <div className="h-px w-full bg-border" />
            <span className="absolute bg-background px-3 text-xs text-muted-foreground lg:bg-card">
              or sign in with email
            </span>
          </div>

          <EmailSignInForm />

          {/* Trust card */}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 lg:bg-muted/40">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
              <BadgeCheck className="h-[18px] w-[18px]" />
            </span>
            <span className="flex min-w-0 flex-col">
              <p className="truncate text-xs font-semibold">
                Community Custody Network
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                End-to-end telemetry locks personal contact info until item
                visual proof is matched.
              </p>
            </span>
          </div>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?
            <Link
              href="/register"
              className="ml-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </AuthSplit>
    </main>
  );
}
