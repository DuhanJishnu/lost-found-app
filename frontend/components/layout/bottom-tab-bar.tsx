"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Home,
  Plus,
  Search,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/found", label: "Search", icon: Search },
  { href: "/matches", label: "Matches", icon: ArrowLeftRight, dot: true },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl md:hidden">
      <div className="relative flex h-16 items-center justify-between px-2">
        {TABS.slice(0, 2).map((tab) => (
          <TabLink
            key={tab.href}
            href={tab.href}
            label={tab.label}
            icon={<tab.icon className="h-[22px] w-[22px]" />}
            active={pathname === tab.href}
          />
        ))}

        <div className="relative -top-3 flex items-center justify-center">
          <Link
            href="/items/new"
            aria-label="Report item"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_16px_rgba(0,174,187,0.35)] transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-[26px] w-[26px]" strokeWidth={2.5} />
          </Link>
        </div>

        {TABS.slice(2).map((tab) => (
          <TabLink
            key={tab.href}
            href={tab.href}
            label={tab.label}
            icon={
              <span className="relative flex items-center justify-center">
                <tab.icon className="h-[22px] w-[22px]" />
                {tab.dot && (
                  <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                )}
              </span>
            }
            active={
              pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            }
          />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 w-14 flex-col items-center justify-center transition-all",
        active
          ? "font-bold text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span className="mt-1 text-[11px]">{label}</span>
    </Link>
  );
}
