import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  BadgeCheck,
  CheckCircle2,
  KeyRound,
  MapPin,
  Package,
  Radar,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import Image from "next/image";
import { LinkButton } from "@/components/ui/link-button";

const PIPELINE = [
  {
    index: "01",
    title: "Report Telemetry",
    description:
      "Log visible traits, upload photos or receipt hash, and geofence the last confirmed sighting zone with sub-block precision.",
    stage: "Step 1 of 3: Initialization",
    progress: "w-1/3",
  },
  {
    index: "02",
    title: "Autonomous Corroboration",
    description:
      "AI cross-examines verified drops at municipal depots, public transit hubs, and commercial lost & found endpoints in real time.",
    stage: "Step 2 of 3: Active Synthesis",
    progress: "w-2/3",
  },
  {
    index: "03",
    title: "Zero-Knowledge Handover",
    description:
      "Blind-verify hidden cues (custom engraving, serial fragments, or unique scuffs) to unlock physical custody at secure hub lockers.",
    stage: "Step 3 of 3: Restitution Complete",
    progress: "w-full",
  },
] as const;

export function DesktopLanding() {
  return (
    <div className="hidden w-full flex-col items-center lg:flex">
      {/* Hero */}
      <div className="flex w-full flex-col items-center text-center">
        <h1 className="mt-5 max-w-4xl font-display text-6xl leading-tight font-normal tracking-tight">
          <span className="relative inline-block">
            {/* clover image */}
            <Image
              src="/clover-light.webp"
              alt=""
              width={60}
              height={60}
              className="absolute -left-14 top-1/2 -translate-y-1/2"
            />
            Every
          </span>{" "}
          lost item has a{" "}
          <span className="text-primary italic">way back home.</span>
        </h1>

        <div className="mt-6 flex items-center gap-3">
          <LinkButton
            href="/register"
            className="h-12 rounded-xl px-6 text-sm font-semibold hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Get Started
            <ArrowRight className="h-4.5 w-4.5" />
          </LinkButton>
        </div>
      </div>

      {/* Resolution matrix */}
      <section className="mt-14 w-full">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="mt-1 font-display text-4xl font-medium tracking-tight">
              Autonomous Visual & Spatial Triangulation
            </h2>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-stretch gap-4">
          {/* Lost card */}
          <article className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase">
              <span className="rounded-sm bg-primary px-2.5 py-1 text-primary-foreground">
                Reported Lost
              </span>
            </div>
            <div className="relative mt-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
              <Backpack className="h-16 w-16 text-primary/60" />
              <span className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-[11px] backdrop-blur">
                Dolores Park • 14:20
              </span>
            </div>
            <h3 className="mt-4 font-display text-2xl">
              Lavie Sport Backpack
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Navy fabric, tan leather straps, front zipper with brass
              carabiner tag attached to left loop.
            </p>
            <p className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                37.7596° N, 122.4269° W
              </span>
              <span className="flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                Reported by Verified Citizen
              </span>
            </p>
          </article>

          {/* Correlation connector */}
          <div className="flex flex-col items-center justify-center gap-2 px-1">
            <span className="font-display text-2xl font-semibold text-primary">
              94%
            </span>
            <span className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase">
              Similarity
            </span>
            <span className="w-px flex-1 bg-linear-to-b from-transparent via-primary/60 to-transparent" />
          </div>

          {/* Found card */}
          <article className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase">
              <span className="rounded-sm bg-secondary px-2.5 py-1 text-secondary-foreground">
                Found & Custody Locked
              </span>
            </div>
            <div className="relative mt-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
              <Package className="h-16 w-16 text-primary/60" />
              <span className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-[11px] backdrop-blur">
                16th St BART Station Hub • 15:04
              </span>
            </div>
            <h3 className="mt-4 font-display text-2xl">
              Black Bag
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Intact fabric, identical brass clip signature verified by
              multi-vector AI feature analysis.
            </p>
            <p className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Handover Token Generated
              </span>
            </p>
          </article>
        </div>
      </section>

      {/* Pipeline */}
      <section className="mt-14 w-full">
        <div className="flex items-end justify-between gap-8">
          <div>
            <h2 className="mt-1 font-display text-4xl font-medium tracking-tight">
              Deterministic three-step physical restitution.
            </h2>
          </div>
        </div>

        <ol className="mt-6 grid grid-cols-3 gap-4">
          {PIPELINE.map((step) => (
            <li
              key={step.index}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-start justify-between">
                <span className="font-display text-4xl font-semibold text-primary/50">
                  {step.index}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              <p className="mt-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                {step.stage}
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full bg-primary ${step.progress}`} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Footer */}
      <footer className="mt-14 grid w-full grid-cols-12 gap-32 border-t border-border pt-8 pb-4 text-sm">
        <div className="col-span-5">
          <p className="flex items-center gap-2 font-display text-xl font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-primary">
              <Radar className="h-4 w-4" />
            </span>
            Lost & Found
          </p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
            An editorial dispatch and high-trust telemetry network for lost
            personal artifacts and definitive community recovery.
          </p>
        </div>

        {/* shift this col of far right */}
        <nav className="col-span-3 flex flex-col " aria-label="Index">
          <p className="text-[10px] pb-1 font-bold tracking-widest text-muted-foreground uppercase">
            Index Directory
          </p>
          <FooterLink href="/found">Public Dispatch Feed</FooterLink>
          <FooterLink href="/matches">Match Telemetry Matrix</FooterLink>
          <FooterLink href="/items/new">Initiate Loss Report</FooterLink>
          <FooterLink href="/matches?tab=confirmed">
            Resolved Custody Claims
          </FooterLink>
        </nav>
      </footer>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="w-fit text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}
