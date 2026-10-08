import { backendFetch } from "@/lib/backend";
import type { AppNotification } from "@/types/notification";

export async function getNotifications(
  limit = 8,
): Promise<AppNotification[]> {
  const response = await backendFetch(`/notifications?limit=${limit}`);

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
}

export async function getUnreadCount(): Promise<number> {
  const response = await backendFetch("/notifications/unread-count");

  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }

  const data = await response.json();
  return data.count ?? 0;
}
