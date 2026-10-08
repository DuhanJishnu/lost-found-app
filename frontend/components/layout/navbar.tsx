import Link from "next/link";

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

const LINKS: NavbarLink[] = [
  { href: "/dashboard", label: "My items" },
  { href: "/found", label: "Found items" },
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
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-semibold">
          Lost<span className="text-primary"> & </span>Found
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <LinkButton
              key={link.href}
              href={link.href}
              variant="ghost"
            >
              {link.label}
            </LinkButton>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LinkButton href={REPORT_HREF}>Report item</LinkButton>

          {user ? (
            <>
              <NotificationBell
                initialUnread={initialUnread}
                initialItems={initialItems}
              />

              <span className="flex items-center gap-2">
                <Avatar size="sm">
                  {user.image && <AvatarImage src={user.image} alt="" />}
                  <AvatarFallback>
                    {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {user.name && (
                  <span className="max-w-32 truncate text-sm font-medium">
                    {user.name}
                  </span>
                )}
              </span>

              <form action={signOutEverywhere}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <form action={signInWithGoogle}>
              <Button type="submit" size="sm">
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
