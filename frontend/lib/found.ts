import { backendFetch } from "@/lib/backend";
import { FoundFeedItem } from "@/types/found";

export async function getFoundFeed(): Promise<FoundFeedItem[]> {
  const response = await backendFetch("/items/found/feed");

  if (!response.ok) {
    throw new Error("Failed to fetch found items");
  }

  return response.json();
}

export async function getFoundItem(
  itemId: number,
): Promise<FoundFeedItem> {
  const response = await backendFetch(`/items/found/${itemId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    if (error?.detail?.code === "LOST_ITEM_REQUIRED") {
      throw new Error("LOST_ITEM_REQUIRED");
    }

    throw new Error("FOUND_ITEM_NOT_AVAILABLE");
  }

  return response.json();
}