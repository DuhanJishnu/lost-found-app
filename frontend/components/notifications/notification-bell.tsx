"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { timeAgo } from "@/lib/format";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import type { AppNotification } from "@/types/notification";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  initialUnread: number;
  initialItems: AppNotification[];
}

export function NotificationBell({
  initialUnread,
  initialItems,
}: NotificationBellProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape — reliable regardless of how the
  // panel stacks against maps, sticky bars, and tab bars.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open ]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);

    if (next) {
      setLoading(true);
      try {
        const [fresh, count] = await Promise.all([
          fetchNotifications(),
          fetchUnreadCount(),
        ]);
        setItems(fresh.filter((item) => !item.is_read));
        setUnread(count);
      } catch {
        // Keep the server-rendered snapshot on failure.
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleOpen(notification: AppNotification) {
    try {
      await markNotificationRead(notification.id);
    } catch {
      // Navigate anyway — the read marker is best-effort here.
    }

    setItems((previous) =>
      previous.filter((item) => item.id !== notification.id),
    );
    setUnread((count) => Math.max(0, count - 1));
    setOpen(false);
    router.push(`/matches?match=${notification.match_id}`);
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setItems([]);
      setUnread(0);
      router.refresh();
    } catch {
      // Leave state untouched on failure.
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
      >
        <Bell className="h-[22px] w-[22px]" />
        {unread > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        )}
      </button>

      {open && (
          <div className="absolute top-full right-0 z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">

              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center px-4 py-8">
                  <Spinner className="size-6" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <BellOff className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 font-medium">You&apos;re all caught up</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    New matches and claim updates will show up here.
                  </p>
                </div>
              ) : (
                items.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpen(item)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
                      index > 0 && "border-t border-border",
                    )}
                  >
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
                        {item.message}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {timeAgo(item.created_at)}
                        {item.claim_id !== null && " • Claim update"}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
      )}
    </div>
  );
}
