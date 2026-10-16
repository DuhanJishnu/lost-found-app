"use client";

import { usePathname } from "next/navigation";

import { LinkButton } from "@/components/ui/link-button";
import type { NavbarLink } from "./navbar-mobile-menu";

export function NavbarLinks({ links }: { links: NavbarLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <LinkButton
            key={link.href}
            href={link.href}
            variant="ghost"
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "bg-muted font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            {link.label}
          </LinkButton>
        );
      })}
    </nav>
  );
}