import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import { DispatchSearch } from "./dispatch-search";

const STATS = [
  { value: "94.2%", label: "Telemetry Match Rate" },
  { value: "2,480+", label: "Active Beacon Nodes" },
  { value: "<45 min", label: "Avg. Community Recovery" },
  { value: "0 Byte", label: "Plaintext Data Exposed" },
] as const;

const STEPS = [
  {
    index: "01",
    title: "Report Telemetry",
    description:
      "Log traits, upload photos, and geofence the last sighting. Every detail sharpens the match engine.",
  },
  {
    index: "02",
    title: "Autonomous Corroboration",
    description:
      "AI cross-examines incoming found items against your report across depots, hubs, and community endpoints.",
  },
  {
    index: "03",
    title: "Zero-Knowledge Handover",
    description:
      "Verify hidden ownership cues to unlock custody — no addresses or phone numbers exposed.",
  },
] as const;

/** Desktop-only landing sections (hidden below lg). */
export function LandingDesktopSections() {
  return (
    <div className="hidden w-full flex-col items-center lg:flex">
      {/* Stats ribbon */}
      <dl className="grid w-full grid-cols-4 gap-3">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card px-4 py-5 text-center"
          >
            <dt className="order-2 mt-1 block text-xs text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="font-display text-3xl font-semibold text-primary">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* How it works */}
      <section className="mt-14 w-full text-center">
        <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
          The Recovery Pipeline
        </p>
        <h2 className="mt-2 font-display text-4xl font-medium tracking-tight">
          Deterministic three-step physical restitution.
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          No awkward public flyers. No unvetted meetup locations. Fully
          automated from loss event to sealed handover.
        </p>

        <ol className="mt-8 grid grid-cols-3 gap-4 text-left">
          {STEPS.map((step) => (
            <li
              key={step.index}
              className="rounded-xl border border-border bg-card p-6"
            >
              <span className="font-display text-4xl font-semibold text-primary/40">
                {step.index}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Dispatch search CTA */}
      <section className="mt-14 w-full rounded-2xl border border-border bg-gradient-to-b from-card to-muted/40 px-6 py-12 text-center">
        <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
          Precision Dispatch Portal
        </p>
        <h2 className="mx-auto mt-2 max-w-xl font-display text-4xl font-medium tracking-tight">
          Lost something valuable? Let the network find it.
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Report it once — AI vision relays scan every incoming found item
          across your area.
        </p>

        <div className="mt-6">
          <DispatchSearch />
        </div>

        <Link
          href="/items/new"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Report an item immediately
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-14 grid w-full grid-cols-12 gap-6 border-t border-border pt-8 pb-4 text-sm">
        <div className="col-span-5">
          <p className="font-display text-xl font-semibold">Lost & Found</p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
            A high-trust telemetry network for lost personal artifacts and
            definitive community recovery.
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            256-bit encrypted chain
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

        <div className="col-span-4 flex flex-col gap-2">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            Privacy & Trust
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Automated match gating obfuscates photo records below the
            confidence threshold.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileSearch className="h-4 w-4 text-primary" />
            <ScanSearch className="h-4 w-4 text-primary" />
            Serial cryptographic match on every claim
          </p>
        </div>
      </footer>

      <p className="w-full border-t border-border py-4 text-center text-xs text-muted-foreground">
        Lost & Found Network — precision recovery dispatch.
      </p>
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
