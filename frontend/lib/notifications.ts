import type { AppNotification } from "@/types/notification";

function extractError(data: unknown, fallback: string): string {
  const detail =
    typeof data === "object" && data !== null
      ? ((data as Record<string, unknown>).detail ??
        (data as Record<string, unknown>).error)
      : null;

  return typeof detail === "string" ? detail : fallback;
}

export async function fetchNotifications(
  limit = 8,
): Promise<AppNotification[]> {
  const response = await fetch(`/api/notifications?limit=${limit}`);

  if (!response.ok) {
    throw new Error(
      extractError(await response.json().catch(() => null),
        "Unable to load notifications"),
    );
  }

  return response.json();
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await fetch("/api/notifications/unread-count");

  if (!response.ok) {
    throw new Error("Unable to load unread count");
  }

  const data = await response.json();
  return data.count ?? 0;
}

export async function markNotificationRead(id: number): Promise<void> {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(
      extractError(await response.json().catch(() => null),
        "Unable to mark notification as read"),
    );
  }
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await fetch("/api/notifications/read-all", {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Unable to mark notifications as read");
  }

  const data = await response.json();
  return data.marked_read ?? 0;
}
