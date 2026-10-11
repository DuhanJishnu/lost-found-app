import type { LucideIcon } from "lucide-react";

interface AuthPillar {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface AuthSplitProps {
  badge: string;
  title: string;
  description: string;
  pillars: AuthPillar[];
  footnote: string;
  children: React.ReactNode;
}

/**
 * Desktop (lg+) two-column editorial split for auth pages.
 * Below lg only `children` renders, so the mobile UI is untouched.
 */
export function AuthSplit({
  badge,
  title,
  description,
  pillars,
  footnote,
  children,
}: AuthSplitProps) {
  return (
    <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
      <div className="hidden lg:col-span-5 lg:flex lg:flex-col lg:gap-5 lg:pt-4">
        <p className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-primary uppercase">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          {badge}
        </p>

        <div>
          <h2 className="font-display text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <pillar.icon className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">{pillar.title}</span>
                <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {pillar.description}
                </span>
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">{footnote}</p>
      </div>

      <div className="lg:col-span-7">
        <div className="lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-8 lg:shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
