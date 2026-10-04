import { cn } from "@/lib/utils";

const widths = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
} as const;

interface PageShellProps {
  width?: keyof typeof widths;
  className?: string;
  children: React.ReactNode;
}

export function PageShell({
  width = "lg",
  className,
  children,
}: PageShellProps) {
  return (
    <main
      className={cn(
        "mx-auto px-4 py-10 sm:px-6 sm:py-14",
        widths[width],
        className,
      )}
    >
      {children}
    </main>
  );
}
