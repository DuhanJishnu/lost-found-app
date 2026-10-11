import { backendFetch } from "@/lib/backend";

export interface CommunityStats {
  total_users: number;
  items_lost: number;
  items_found: number;
  successful_returns: number;
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const response = await backendFetch("/stats/community");

  if (!response.ok) {
    throw new Error("Failed to fetch community stats");
  }

  return response.json();
}
