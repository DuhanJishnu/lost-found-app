import Link from "next/link";
import { Search } from "lucide-react";

import { auth } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  getNotifications,
  getUnreadCount,
} from "@/lib/notifications-server";

export async function MobileHeader() {
  const session = await auth();
  const user = session?.user ?? null;

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur md:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Search className="h-4 w-4" />
          </span>

          <span className="font-display text-lg font-semibold tracking-tight">
            Lost & Found
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <NotificationBell
            initialUnread={initialUnread}
            initialItems={initialItems}
          />

          <Link
            href="/profile"
            aria-label="User profile"
            className="flex h-11 w-11 items-center justify-center rounded-full"
          >
            <Avatar>
              {user?.image && <AvatarImage src={user.image} alt="" />}
              <AvatarFallback>
                {(user?.name ?? user?.email ?? "G")
                  .charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
