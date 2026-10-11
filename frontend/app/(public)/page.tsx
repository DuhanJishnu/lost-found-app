import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Lock,
  MapPin,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GoogleButton } from "@/components/auth/google-button";
import { LinkButton } from "@/components/ui/link-button";

const FEATURES = [
  {
    icon: Lock,
    title: "Cryptographic Ownership Proof",
    description:
      "Private keys and serial hash validation prevent false claims without exposing sensitive receipts.",
  },
  {
    icon: ShieldCheck,
    title: "Zero Personal Data Leaked",
    description:
      "Anonymized courier drop points ensure neither party reveals home addresses or personal contacts.",
  },
  {
    icon: ScanSearch,
    title: "AI Visual & Telemetry Matching",
    description:
      "Vector vision correlates scuffs, engraving marks, and location history with 98.7% retrieval accuracy.",
  },
] as const;

export default async function Home() {
  const session = await auth();

  if (session?.user?.googleId ?? session?.user?.userId) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-8 pb-16">
      <div className="relative flex flex-col items-center">
        <div className="pointer-events-none absolute -top-12 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        {/* Brand header */}
        <header className="relative z-10 mb-5 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
            <Radar className="h-[22px] w-[22px]" />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-lg font-semibold tracking-tight">
              Lost &amp; Found
            </span>
            <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
              Investigative Registry
            </span>
          </span>
        </header>

        {/* Headline */}
        <div className="relative z-10 mb-5 w-full max-w-sm text-center">
          <h1 className="font-display text-4xl leading-tight font-normal tracking-tight">
            Every lost item has a{" "}
            <span className="font-display text-primary italic">
              way back home.
            </span>
          </h1>
          <p className="mt-2 px-1 text-sm leading-relaxed text-muted-foreground">
            Autonomous visual telemetry and encrypted zero-knowledge
            verification uniting lost valuables with verified owners across
            cities.
          </p>
        </div>

        {/* Live telemetry showcase */}
        <section
          aria-label="Live Match Telemetry"
          className="relative mb-5 w-full overflow-hidden rounded-xl border border-border bg-card p-4"
        >
          <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                Live Telemetry
              </span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              94% Confidence
            </span>
          </div>

          <div className="mb-3 flex items-center gap-3">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              <Wallet className="h-8 w-8 text-primary" />
              <span className="absolute right-1 bottom-1 rounded bg-card/90 p-0.5 text-primary">
                <BadgeCheck className="h-3 w-3" />
              </span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Active Match Signal
              </span>
              <h2 className="truncate text-lg font-semibold">
                Bifold Leather Wallet
              </h2>
              <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Matched near SOMA • 4 mins ago
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Signal Spectrum Alignment</span>
              <span className="font-semibold text-primary">
                Verified Safe Handover
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
              <div className="h-full w-[94%] rounded-full bg-primary" />
            </div>
          </div>
        </section>

        {/* Value props */}
        <div className="mb-8 flex w-full flex-col gap-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <feature.icon className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <h3 className="text-sm font-semibold">{feature.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col items-center gap-2">
          <LinkButton
            href="/register"
            className="h-12 w-full rounded-xl text-sm font-semibold"
          >
            Get Started
            <ArrowRight className="h-[18px] w-[18px]" />
          </LinkButton>
          <GoogleButton />
          <p className="flex min-h-11 items-center gap-1 py-1 text-sm text-muted-foreground">
            Already have an account?
            <Link
              href="/login"
              className="font-semibold text-primary underline underline-offset-4"
            >
              Sign In
            </Link>
          </p>
        </div>

        <footer className="mt-6 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary" />
            Encrypted &amp; Community-verified
          </p>
        </footer>
      </div>
    </main>
  );
}
