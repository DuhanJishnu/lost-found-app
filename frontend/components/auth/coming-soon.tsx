import { cn } from "@/lib/utils";

/** Pill tag marking Stitch UI elements that have no backend yet. */
export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase",
        className,
      )}
    >
      Soon
    </span>
  );
}
