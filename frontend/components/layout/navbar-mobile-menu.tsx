"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  signInWithGoogle,
  signOutEverywhere,
} from "@/components/auth/actions";

export interface NavbarLink {
  href: string;
  label: string;
}

export interface NavbarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface NavbarMobileMenuProps {
  links: NavbarLink[];
  user: NavbarUser | null;
  reportHref: string;
}

export function NavbarMobileMenu({
  links,
  user,
  reportHref,
}: NavbarMobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        {open ? <X /> : <Menu />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-background px-4 pb-6 pt-2 shadow-lg">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base font-medium hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}

            <Link
              href={reportHref}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-primary px-3 py-2.5 text-center text-base font-medium text-primary-foreground"
            >
              Report item
            </Link>
          </nav>

          <div className="mt-4 border-t border-border pt-4">
            {user ? (
              <div className="flex items-center gap-3 px-3">
                <Avatar>
                  {user.image && <AvatarImage src={user.image} alt="" />}
                  <AvatarFallback>
                    {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  {user.name && (
                    <p className="truncate text-sm font-medium">{user.name}</p>
                  )}
                  {user.email && (
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>

                <form action={signOutEverywhere}>
                  <Button type="submit" variant="outline" size="sm">
                    Sign out
                  </Button>
                </form>
              </div>
            ) : (
              <form action={signInWithGoogle} className="px-3">
                <Button type="submit" className="w-full">
                  Sign in
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
