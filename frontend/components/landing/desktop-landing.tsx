import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  BadgeCheck,
  CheckCircle2,
  KeyRound,
  Lock,
  MapPin,
  Package,
  Radar,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import { GoogleButton } from "@/components/auth/google-button";
import { DispatchSearch } from "@/components/landing/dispatch-search";
import { LinkButton } from "@/components/ui/link-button";

const STATS = [
  { value: "94.2%", label: "Telemetry Match Rate" },
  { value: "2,480+", label: "Active Beacon Nodes" },
  { value: "<45 min", label: "Avg. Community Recovery" },
  { value: "0 Byte", label: "Plaintext Data Exposed" },
] as const;

const TICKER = [
  "Just Reunited: Nomad Leather AirPods Case (SOMA District)",
  "Cryptographic Match: Subaru Key Fob #RF-982 (North Beach)",
  "Custody Deposited: Leica M6 Titanium (Mission Safe Station #3)",
  "Scanning 2,480 Active Municipal Nodes",
  "Telemetry latency: 42ms worldwide",
] as const;

const PILLARS = [
  {
    icon: KeyRound,
    title: "Cryptographic Ownership Proof",
    description:
      "Private keys, unique serial hash validation, and purchase block metadata prevent false claiming without revealing original receipts or bank information.",
    footer: "View Proof Protocol",
  },
  {
    icon: ShieldCheck,
    title: "Zero-Knowledge Privacy Vault",
    description:
      "Automated courier drop points and verified civic locker relays ensure neither finder nor owner ever exposes their residential address or private phone numbers.",
    footer: "Explore Safe Nodes",
  },
  {
    icon: ScanSearch,
    title: "AI Visual & Spatial Telemetry",
    description:
      "Our neural vision engine isolates micro-scratches, engraving nuances, and spatio-temporal transit paths to achieve 98.7% retrieval precision in dense urban sectors.",
    footer: "Neural Matching Specs",
  },
] as const;

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

/**
 * Desktop landing matching the Stitch desktop design.
 * Telemetry numbers and ticker items are static illustrative copy.
 * Footer items without a real target render as plain text (no dead links).
 */
export function DesktopLanding() {
  return (
    <div className="hidden w-full flex-col items-center lg:flex">
      {/* Hero */}
      <div className="flex w-full flex-col items-center text-center">
        <p className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[11px] font-bold tracking-widest text-primary uppercase">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Investigative Registry // Autonomous Dispatch
        </p>

        <h1 className="mt-5 max-w-4xl font-display text-6xl leading-tight font-normal tracking-tight">
          Every lost item has a{" "}
          <span className="text-primary italic">way back home.</span>
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Autonomous visual telemetry and encrypted zero-knowledge
          verification uniting lost valuables with verified owners across
          modern metropolitan networks.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <LinkButton
            href="/register"
            className="h-12 rounded-xl px-6 text-sm font-semibold"
          >
            Get Started
            <ArrowRight className="h-[18px] w-[18px]" />
          </LinkButton>
          <GoogleButton className="w-auto" />
          <LinkButton
            href="/found"
            variant="outline"
            className="h-12 rounded-xl px-6 text-sm font-semibold"
          >
            Explore Active Feed
          </LinkButton>
        </div>
      </div>

      {/* Stats */}
      <dl className="mt-10 grid w-full grid-cols-4 gap-3">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card px-4 py-5 text-center"
          >
            <dd className="font-display text-3xl font-semibold text-primary">
              {stat.value}
            </dd>
            <dt className="mt-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>

      {/* Resolution matrix */}
      <section className="mt-14 w-full">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
              Real-time Resolution Matrix
            </p>
            <h2 className="mt-1 font-display text-4xl font-medium tracking-tight">
              Autonomous Visual & Spatial Triangulation
            </h2>
          </div>
          <p className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Active Dispatch Feed Live
          </p>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-stretch gap-4">
          {/* Lost card */}
          <article className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase">
              <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">
                Reported Lost
              </span>
              <span className="text-muted-foreground">#TLM-8829-SF</span>
            </div>
            <div className="relative mt-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
              <Backpack className="h-16 w-16 text-primary/60" />
              <span className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-[11px] backdrop-blur">
                Dolores Park • 14:20 PST
              </span>
            </div>
            <h3 className="mt-4 font-display text-2xl">
              Herschel Little America Backpack
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
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Correlation
            </span>
            <span className="w-px flex-1 bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
          </div>

          {/* Found card */}
          <article className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                Found & Custody Locked
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-primary" />
                Vault Node #09
              </span>
            </div>
            <div className="relative mt-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
              <Package className="h-16 w-16 text-primary/60" />
              <span className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-[11px] backdrop-blur">
                16th St BART Station Hub • 15:04 PST
              </span>
            </div>
            <h3 className="mt-4 font-display text-2xl">
              Black / Navy Daypack w/ Brass Buckles
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

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-5 py-3 text-xs text-muted-foreground">
          <span>
            Spatial Vector Variance:{" "}
            <span className="font-semibold text-primary">
              0.42 Miles (9.2 mins pedestrian transit)
            </span>
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Serial Hash Match Verified
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Surface Scuff Geometry Validated
          </span>
        </div>

        {/* Ticker */}
        <div className="mt-4 flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-4 py-2.5">
          <span className="flex shrink-0 items-center gap-1.5 rounded bg-primary/15 px-2 py-1 text-[11px] font-bold tracking-widest text-primary uppercase">
            <Radar className="h-3.5 w-3.5" />
            Live Ticker
          </span>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
            <div className="animate-ticker flex w-max gap-8 text-xs whitespace-nowrap text-muted-foreground">
              {[...TICKER, ...TICKER].map((entry, index) => (
                <span key={index}>• {entry}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mt-14 w-full">
        <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
          Civic Telemetry Protocol
        </p>
        <h2 className="mt-1 max-w-2xl font-display text-4xl font-medium tracking-tight">
          Engineered to eliminate friction, fraud, and public exposure.
        </h2>

        <div className="mt-6 grid grid-cols-3 gap-4">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.title}
              className="flex flex-col rounded-xl border border-border bg-card p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                <pillar.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{pillar.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
              {/* No target page yet — plain text, not a dead link */}
              <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                {pillar.footer}
                <ArrowRight className="h-4 w-4" />
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section className="mt-14 w-full">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
              The Recovery Pipeline
            </p>
            <h2 className="mt-1 font-display text-4xl font-medium tracking-tight">
              Deterministic three-step physical restitution.
            </h2>
          </div>
          <p className="max-w-xs shrink-0 text-right text-xs leading-relaxed text-muted-foreground">
            No awkward public flyers. No unvetted meetup locations. Fully
            automated from loss event to sealed handover.
          </p>
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
                <Lock className="h-4 w-4 text-muted-foreground" />
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

      {/* Dispatch portal */}
      <section className="mt-14 w-full rounded-2xl border border-border bg-gradient-to-b from-card to-muted/40 px-6 py-12 text-center">
        <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
          Precision Dispatch Portal
        </p>
        <h2 className="mx-auto mt-2 max-w-xl font-display text-4xl font-medium tracking-tight">
          Lost something valuable? Let the network find it.
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Over 2,400 neighborhood safe stations and AI vision relays are
          currently scanning incoming lost items across your area.
        </p>

        <div className="mt-6">
          <DispatchSearch />
        </div>

        <div className="mx-auto mt-4 flex max-w-xl flex-col gap-2 sm:flex-row">
          <LinkButton
            href="/items/new"
            className="h-12 flex-1 rounded-xl text-sm font-semibold"
          >
            Report An Item Immediately
          </LinkButton>
          <GoogleButton
            label="Instant Google One-Tap"
            className="flex-1 sm:w-auto"
          />
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-primary" />
          All reports are cryptographically signed and stored with
          Zero-Knowledge proofing.
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-14 grid w-full grid-cols-12 gap-6 border-t border-border pt-8 pb-4 text-sm">
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

        <nav className="col-span-3 flex flex-col gap-2" aria-label="Index">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            Index Directory
          </p>
          <FooterLink href="/found">Public Dispatch Feed</FooterLink>
          <FooterLink href="/matches">Match Telemetry Matrix</FooterLink>
          <FooterLink href="/items/new">Initiate Loss Report</FooterLink>
          <FooterLink href="/matches?tab=confirmed">
            Resolved Custody Claims
          </FooterLink>
        </nav>

        <div className="col-span-2 flex flex-col gap-2">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            Verification Protocol
          </p>
          {[
            "Serial Cryptographic Match",
            "Custody Verification Standard",
            "Geographic Radius Zones",
            "Safe Handover Nodes",
          ].map((entry) => (
            <span key={entry} className="text-xs text-muted-foreground">
              {entry}
            </span>
          ))}
        </div>

        <div className="col-span-2 flex flex-col gap-2">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            Privacy & Trust
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Automated match gating obfuscates photo records below 40%
            threshold confidence.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary" />
            256-Bit Encrypted Chain
          </p>
        </div>
      </footer>

      <div className="flex w-full items-center justify-between border-t border-border py-4 text-xs text-muted-foreground">
        <p>© 2025 Lost & Found Network Corp. Precision Recovery Dispatch.</p>
        <p className="flex gap-4">
          <span>Telemetry Terms</span>
          <span>Privacy Shield</span>
          <span>Security Disclosure</span>
        </p>
      </div>
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
