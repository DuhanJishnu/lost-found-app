import Link from "next/link";

import { cn } from "@/lib/utils";

export const FEED_CATEGORIES = [
  "Electronics",
  "Keys",
  "Wallets",
  "Bags",
  "IDs & Cards",
  "Pets",
  "Jewelry",
  "Accessories",
] as const;

interface CategoryChipsProps {
  activeCategory?: string;
  baseParams: Record<string, string>;
}

export function CategoryChips({
  activeCategory,
  baseParams,
}: CategoryChipsProps) {
  function hrefFor(category?: string) {
    const params = new URLSearchParams(baseParams);

    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }

    const query = params.toString();
    return `/found${query ? `?${query}` : ""}`;
  }

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={label}
      href={href}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition-all active:scale-95",
        active
          ? "bg-primary font-bold text-primary-foreground shadow-sm"
          : "bg-muted font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="-mx-4 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6">
      <div className="flex min-w-max items-center gap-2">
        {chip("All Items", hrefFor(undefined), !activeCategory)}
        {FEED_CATEGORIES.map((category) =>
          chip(category, hrefFor(category), activeCategory === category),
        )}
      </div>
    </div>
  );
}
