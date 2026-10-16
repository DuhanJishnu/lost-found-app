"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { ArrowLeftRight, MapPin, X } from "lucide-react";

import { DashboardMapLoader } from "@/components/dashboard/dashboard-map-loader";
import type { MapPin as DashboardPin } from "@/components/dashboard/dashboard-map";
import { ItemStatusBadge } from "@/components/items/item-status-badge";
import { ItemTypeBadge } from "@/components/items/item-type-badge";
import { LinkButton } from "@/components/ui/link-button";

type ItemType = ComponentProps<typeof ItemTypeBadge>["type"];
type ItemStatus = ComponentProps<typeof ItemStatusBadge>["status"];

interface DashItem {
    id: string | number;
    title: string;
    type: ItemType;
    status: ItemStatus;
    category: string;
    created_at: string;
    latitude: number | null;
    longitude: number | null;
}

interface Props {
    items: DashItem[];
    pendingMatches: number;
    stats: {
        items_lost: number;
        items_found: number;
        active_matches: number;
        successful_returns: number;
    };
    community: {
        total_users: number;
        items_lost: number;
        items_found: number;
        successful_returns: number;
    };
}

type Filter = "ALL" | "LOST" | "FOUND";

const DAY = 86_400_000;
const isLost = (t: unknown) => String(t).toUpperCase() === "LOST";
const panel = "rounded-2xl border border-border bg-card";

/* ---------- small pieces ---------- */

function Segmented<T extends string>({
    value,
    onChange,
    options,
    label,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    label: string;
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className="inline-flex rounded-lg bg-muted p-1 text-sm"
        >
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    aria-pressed={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${value === o.value
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function weekStart(ms: number) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
}

/* ---------- main ---------- */

export function DashboardClient({
    items,
    pendingMatches,
    stats,
    community,
}: Props) {
    const [filter, setFilter] = useState<Filter>("ALL");
    const [weeks, setWeeks] = useState<6 | 12>(12);
    const [activeWeek, setActiveWeek] = useState<number | null>(null);
    const [category, setCategory] = useState<string | null>(null);
    const [hoverSlice, setHoverSlice] = useState<string | null>(null);
    // Dates are computed after mount so server and client markup always match.
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => setNow(Date.now()), []);

    const scoped = useMemo(
        () =>
            items.filter(
                (i) =>
                    filter === "ALL" || (filter === "LOST") === isLost(i.type),
            ),
        [items, filter],
    );

    /* weekly activity */
    const buckets = useMemo(() => {
        if (now === null) return [];
        const start = weekStart(now);
        const list = Array.from({ length: weeks }, (_, k) => {
            const d = new Date(start);
            d.setDate(d.getDate() - 7 * (weeks - 1 - k));
            return { start: d.getTime(), lost: 0, found: 0 };
        });
        for (const it of items) {
            const t = new Date(it.created_at).getTime();
            const b = list.find((x) => t >= x.start && t < x.start + 7 * DAY + DAY / 2);
            if (!b) continue;
            if (isLost(it.type)) b.lost++;
            else b.found++;
        }
        return list;
    }, [items, now, weeks]);

    const showLost = filter !== "FOUND";
    const showFound = filter !== "LOST";
    const maxBar = Math.max(
        2,
        ...buckets.map((b) =>
            Math.max(showLost ? b.lost : 0, showFound ? b.found : 0),
        ),
    );
    const shown = activeWeek ?? buckets.length - 1;
    const focus = buckets[shown];
    const inRange = buckets.reduce(
        (n, b) => n + (showLost ? b.lost : 0) + (showFound ? b.found : 0),
        0,
    );

    /* categories */
    const slices = useMemo(() => {
        const counts = new Map<string, number>();
        scoped.forEach((i) =>
            counts.set(i.category, (counts.get(i.category) ?? 0) + 1),
        );
        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
        const top = sorted.slice(0, 4).map(([label, count]) => ({
            label,
            count,
            keys: [label],
        }));
        const rest = sorted.slice(4);
        if (rest.length)
            top.push({
                label: "Other",
                count: rest.reduce((n, [, c]) => n + c, 0),
                keys: rest.map(([k]) => k),
            });
        return top;
    }, [scoped]);
    const activeSlice = slices.find((s) => s.label === category) ?? null;
    const readoutSlice = slices.find((s) => s.label === hoverSlice) ?? activeSlice;

    /* downstream lists */
    const visible = useMemo(
        () =>
            activeSlice
                ? scoped.filter((i) => activeSlice.keys.includes(i.category))
                : scoped,
        [scoped, activeSlice],
    );
    const recent = useMemo(
        () =>
            [...visible]
                .sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                )
                .slice(0, 5),
        [visible],
    );
    const pins: DashboardPin[] = useMemo(
        () =>
            visible
                .filter((i) => i.latitude !== null && i.longitude !== null)
                .map((i) => ({
                    id: `own-${i.id}`,
                    title: i.title,
                    kind: i.type,
                    latitude: i.latitude as number,
                    longitude: i.longitude as number,
                    href: `/items/${i.id}`,
                })),
        [visible],
    );

    const reunionRate = Math.min(
        100,
        Math.round(
            (community.successful_returns / Math.max(1, community.items_lost)) * 100,
        ),
    );

    const kpis = [
        { label: "Lost reports", value: stats.items_lost, href: "/profile" },
        { label: "Found reports", value: stats.items_found, href: "/profile" },
        { label: "Active matches", value: stats.active_matches, href: "/matches" },
        { label: "Returned to owner", value: stats.successful_returns, href: "/profile" },
    ];

    const total = slices.reduce((n, s) => n + s.count, 0);
    let offset = 0;

    return (
        <div className="mt-6 flex flex-col gap-4">
            {/* Personal numbers: one strip, not four boxes */}
            <section aria-label="Your recovery record" className={`${panel} overflow-hidden`}>
                <dl className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
                    {kpis.map((k, idx) => (
                        <Link
                            key={k.label}
                            href={k.href}
                            className={`group px-4 py-4 transition-colors hover:bg-muted/50 sm:px-6 ${idx === 3 ? "bg-primary/5" : ""
                                }`}
                        >
                            <dd className="font-display text-3xl font-semibold tabular-nums text-primary">
                                {k.value}
                            </dd>
                            <dt className="mt-0.5 text-sm text-muted-foreground">{k.label}</dt>
                        </Link>
                    ))}
                </dl>
            </section>

            {/* One control drives chart, categories, map and list */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl">Your activity</h2>
                <Segmented
                    label="Show reports"
                    value={filter}
                    onChange={(v) => {
                        setFilter(v);
                        setCategory(null);
                    }}
                    options={[
                        { value: "ALL", label: "All" },
                        { value: "LOST", label: "Lost" },
                        { value: "FOUND", label: "Found" },
                    ]}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Weekly chart */}
                <section className={`${panel} p-4 sm:p-5 lg:col-span-2`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm text-muted-foreground">
                                {focus
                                    ? `Week of ${new Date(focus.start).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                                    : "Reports per week"}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 tabular-nums">
                                {showLost && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                        <span className="font-display text-2xl font-semibold">
                                            {focus?.lost ?? 0}
                                        </span>
                                        <span className="text-sm text-muted-foreground">lost</span>
                                    </span>
                                )}
                                {showFound && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-foreground/35" />
                                        <span className="font-display text-2xl font-semibold">
                                            {focus?.found ?? 0}
                                        </span>
                                        <span className="text-sm text-muted-foreground">found</span>
                                    </span>
                                )}
                            </p>
                        </div>
                        <Segmented
                            label="Time range"
                            value={String(weeks) as "6" | "12"}
                            onChange={(v) => {
                                setWeeks(Number(v) as 6 | 12);
                                setActiveWeek(null);
                            }}
                            options={[
                                { value: "6", label: "6w" },
                                { value: "12", label: "12w" },
                            ]}
                        />
                    </div>

                    {items.length === 0 ? (
                        <div className="mt-6 flex h-44 items-center justify-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
                            Your weekly activity will chart here after your first report.
                        </div>
                    ) : (
                        <div className="mt-5">
                            <div className="relative h-44">
                                {buckets.length > 0 && (
                                    <>
                                        <svg
                                            viewBox={`0 0 ${weeks * 40} 160`}
                                            preserveAspectRatio="none"
                                            role="img"
                                            aria-label={`Reports per week over the last ${weeks} weeks: ${inRange} in total`}
                                            className="h-full w-full"
                                        >
                                            {[0.25, 0.5, 0.75, 1].map((g) => (
                                                <line
                                                    key={g}
                                                    x1={0}
                                                    x2={weeks * 40}
                                                    y1={160 - g * 150}
                                                    y2={160 - g * 150}
                                                    className="stroke-border"
                                                    strokeDasharray="2 4"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            ))}
                                            {buckets.map((b, k) => {
                                                const lh = showLost ? (b.lost / maxBar) * 150 : 0;
                                                const fh = showFound ? (b.found / maxBar) * 150 : 0;
                                                const bw = showLost && showFound ? 11 : 18;
                                                const x0 = k * 40 + (showLost && showFound ? 7 : 11);
                                                return (
                                                    <g key={b.start}>
                                                        {shown === k && (
                                                            <rect
                                                                x={k * 40 + 2}
                                                                y={0}
                                                                width={36}
                                                                height={160}
                                                                rx={6}
                                                                className="fill-muted"
                                                            />
                                                        )}
                                                        {showLost && (
                                                            <rect
                                                                x={x0}
                                                                y={160 - Math.max(lh, b.lost ? 4 : 1.5)}
                                                                width={bw}
                                                                height={Math.max(lh, b.lost ? 4 : 1.5)}
                                                                rx={3}
                                                                className="fill-primary"
                                                            />
                                                        )}
                                                        {showFound && (
                                                            <rect
                                                                x={x0 + (showLost ? bw + 2 : 0)}
                                                                y={160 - Math.max(fh, b.found ? 4 : 1.5)}
                                                                width={bw}
                                                                height={Math.max(fh, b.found ? 4 : 1.5)}
                                                                rx={3}
                                                                className="fill-foreground/35"
                                                            />
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                        <div className="absolute inset-0 flex">
                                            {buckets.map((b, k) => (
                                                <button
                                                    key={b.start}
                                                    type="button"
                                                    aria-label={`Week of ${new Date(b.start).toLocaleDateString(undefined, { day: "numeric", month: "short" })}: ${b.lost} lost, ${b.found} found`}
                                                    onMouseEnter={() => setActiveWeek(k)}
                                                    onFocus={() => setActiveWeek(k)}
                                                    onClick={() => setActiveWeek(k)}
                                                    className="h-full flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                                <span>
                                    {buckets[0] &&
                                        new Date(buckets[0].start).toLocaleDateString(undefined, {
                                            day: "numeric",
                                            month: "short",
                                        })}
                                </span>
                                <span>{inRange} reports in this range</span>
                                <span>This week</span>
                            </div>
                        </div>
                    )}
                </section>

                {/* Categories */}
                <section className={`${panel} p-4 sm:p-5`}>
                    <h3 className="font-display text-lg">What you report</h3>
                    {total === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">
                            Categories appear once you have a report in this view.
                        </p>
                    ) : (
                        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
                            <div className="relative h-36 w-36 shrink-0">
                                <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label="Reports by category">
                                    <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5" className="stroke-muted" />
                                    {slices.map((s, k) => {
                                        const len = (s.count / total) * 100;
                                        const dash = Math.max(len - 1, 0.5);
                                        const el = (
                                            <circle
                                                key={s.label}
                                                cx="21"
                                                cy="21"
                                                r="15.9155"
                                                fill="none"
                                                strokeWidth={readoutSlice?.label === s.label ? 6 : 5}
                                                strokeDasharray={`${dash} ${100 - dash}`}
                                                strokeDashoffset={-offset}
                                                className="stroke-primary transition-all"
                                                style={{
                                                    opacity:
                                                        readoutSlice && readoutSlice.label !== s.label
                                                            ? 0.25
                                                            : 1 - k * 0.17,
                                                }}
                                            />
                                        );
                                        offset += len;
                                        return el;
                                    })}
                                </svg>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="font-display text-2xl font-semibold tabular-nums">
                                        {readoutSlice ? readoutSlice.count : total}
                                    </span>
                                    <span className="max-w-20 truncate text-xs text-muted-foreground">
                                        {readoutSlice ? readoutSlice.label : "reports"}
                                    </span>
                                </div>
                            </div>
                            <ul className="w-full min-w-0 flex-1 space-y-1">
                                {slices.map((s, k) => (
                                    <li key={s.label}>
                                        <button
                                            type="button"
                                            aria-pressed={category === s.label}
                                            onClick={() => setCategory(category === s.label ? null : s.label)}
                                            onMouseEnter={() => setHoverSlice(s.label)}
                                            onMouseLeave={() => setHoverSlice(null)}
                                            onFocus={() => setHoverSlice(s.label)}
                                            onBlur={() => setHoverSlice(null)}
                                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary ${category === s.label ? "bg-muted font-medium" : ""
                                                }`}
                                        >
                                            <span
                                                className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                                                style={{ opacity: 1 - k * 0.17 }}
                                            />
                                            <span className="min-w-0 flex-1 truncate">{s.label}</span>
                                            <span className="tabular-nums text-muted-foreground">{s.count}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                        Select a category to filter the map and list below.
                    </p>
                </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Map */}
                <section className={`${panel} p-4 sm:p-5 lg:col-span-2`}>
                    <div className="mb-3">
                        <h3 className="flex items-center gap-2 font-display text-lg">
                            <MapPin className="h-5 w-5 text-primary" />
                            Reports around you
                        </h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Tap Locate me to overlay nearby community finds.
                        </p>
                    </div>
                    <div className="overflow-hidden rounded-xl">
                        <DashboardMapLoader pins={pins} />
                    </div>
                </section>

                {/* Side: matches + community */}
                <div className="flex flex-col gap-4">
                    <section
                        className={`rounded-2xl border p-4 sm:p-5 ${pendingMatches > 0
                                ? "border-primary/40 bg-primary/5"
                                : "border-border bg-card"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                <ArrowLeftRight className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                                <p className="font-display text-lg leading-tight">
                                    {pendingMatches > 0
                                        ? `${pendingMatches} ${pendingMatches === 1 ? "match is" : "matches are"} waiting`
                                        : "No matches to review"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {pendingMatches > 0
                                        ? "Confirm or dismiss them."
                                        : "We'll flag you when one turns up."}
                                </p>
                            </div>
                        </div>
                        <LinkButton
                            href="/matches"
                            variant={pendingMatches > 0 ? "default" : "outline"}
                            className="mt-4 h-10 w-full rounded-xl"
                        >
                            {pendingMatches > 0 ? "Review matches" : "Open matches"}
                        </LinkButton>
                    </section>

                    <section className={`${panel} p-4 sm:p-5`}>
                        <h3 className="font-display text-lg">Community</h3>
                        <div className="mt-3 flex items-center gap-4">
                            <div className="relative h-20 w-20 shrink-0">
                                <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label={`${reunionRate}% of lost reports reunited`}>
                                    <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5" className="stroke-muted" />
                                    <circle
                                        cx="21"
                                        cy="21"
                                        r="15.9155"
                                        fill="none"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeDasharray={`${reunionRate} ${100 - reunionRate}`}
                                        className="stroke-primary"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
                                    {reunionRate}%
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                of lost reports across the registry have been reunited.
                            </p>
                        </div>
                        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                            {[
                                ["Members", community.total_users],
                                ["Lost", community.items_lost],
                                ["Found", community.items_found],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dd className="font-display text-lg font-semibold tabular-nums">{value}</dd>
                                    <dt className="text-xs text-muted-foreground">{label}</dt>
                                </div>
                            ))}
                        </dl>
                    </section>
                </div>
            </div>
        </div>
    );
}