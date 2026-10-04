import { cn } from "@/lib/utils";

const columns = {
  two: "md:grid-cols-2",
  three: "sm:grid-cols-2 lg:grid-cols-3",
} as const;

interface ItemGridProps {
  columns?: keyof typeof columns;
  children: React.ReactNode;
}

export function ItemGrid({ columns: cols = "two", children }: ItemGridProps) {
  return <div className={cn("grid gap-5", columns[cols])}>{children}</div>;
}
