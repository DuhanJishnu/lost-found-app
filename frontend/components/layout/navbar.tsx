import Link from "next/link";
import { LogOut } from "lucide-react";

import { auth } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import {
  signInWithGoogle,
  signOutEverywhere,
} from "@/components/auth/actions";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  getNotifications,
  getUnreadCount,
} from "@/lib/notifications-server";
import {
  NavbarMobileMenu,
  type NavbarLink,
} from "./navbar-mobile-menu";
import { NavbarLinks } from "./navbar-links";

import Image from "next/image";

const LINKS: NavbarLink[] = [
  { href: "/dashboard", label: "My items" },
  { href: "/found", label: "Found items" },
  { href: "/matches", label: "Matches" },
];

const REPORT_HREF = "/items/new";

export async function Navbar() {
  const session = await auth();
  const user = session?.user ?? null;

  // Notification snapshot for first paint; the bell revalidates on open.
  let initialUnread = 0;
  let initialItems: Awaited<ReturnType<typeof getNotifications>> = [];

  if (user) {
    try {
      [initialUnread, initialItems] = await Promise.all([
        getUnreadCount(),
        getNotifications(),
      ]);
      initialItems = initialItems.filter((item) => !item.is_read);
    } catch {
      // Signed out or backend unreachable — bell stays quiet.
    }
  }

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-background/95 backdrop-blur md:block">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        {/* Left: brand + primary navigation */}
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/" aria-label="Home">
              <Image
                src="/clover-light.webp"
                alt="logo"
                width={50}
                height={50}
              />
            </Link>
            <NavbarLinks links={LINKS} />
          </div>

          {/* Right: user actions */}
          <div className="justify-end ml-auto flex items-center gap-2 w-full">
            <LinkButton href={REPORT_HREF}>Report item</LinkButton>

            {user ? (
              <>
                <NotificationBell
                  initialUnread={initialUnread}
                  initialItems={initialItems}
                />

                <span aria-hidden className="mx-1 h-6 w-px bg-border" />

                <Link
                  href="/profile"
                  aria-label="Your profile"
                  className="flex items-center gap-2 rounded-full py-0.5 pr-2 transition-colors hover:bg-muted"
                >
                  <Avatar size="sm">
                    {user.image && <AvatarImage src={user.image} alt="" />}
                    <AvatarFallback>
                      {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user.name && (
                    <span className="hidden max-w-28 truncate text-sm font-medium xl:block">
                      {user.name}
                    </span>
                  )}
                </Link>

                <form action={signOutEverywhere}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label="Sign out"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <form action={signInWithGoogle}>
                <Button type="submit" variant="outline">
                  Sign in
                </Button>
              </form>
            )}
          </div>

        <NavbarMobileMenu
          links={LINKS}
          user={
            user
              ? { name: user.name, email: user.email, image: user.image }
              : null
          }
          reportHref={REPORT_HREF}
        />
      </div>
    </header>
  );
}