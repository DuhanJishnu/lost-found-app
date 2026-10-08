import { backendFetch } from "@/lib/backend";
import { FoundFeedItem, FoundItemDetail } from "@/types/found";

export interface FoundFeedParams {
  q?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  page?: number;
  limit?: number;
}

export async function getFoundFeed(
  params: FoundFeedParams = {},
): Promise<FoundFeedItem[]> {
  const search = new URLSearchParams();

  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.latitude !== undefined) {
    search.set("latitude", String(params.latitude));
  }
  if (params.longitude !== undefined) {
    search.set("longitude", String(params.longitude));
  }
  if (params.radius_km !== undefined) {
    search.set("radius_km", String(params.radius_km));
  }
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.limit !== undefined) search.set("limit", String(params.limit));

  const query = search.toString();
  const response = await backendFetch(
    `/items/found/feed${query ? `?${query}` : ""}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch found items");
  }

  return response.json();
}

export async function getFoundItem(
  itemId: number,
): Promise<FoundItemDetail> {
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