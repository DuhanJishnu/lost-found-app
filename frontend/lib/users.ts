import { backendFetch } from "@/lib/backend";

export interface UserProfileStats {
  items_lost: number;
  items_found: number;
  active_matches: number;
  pending_claims_made: number;
  pending_claims_received: number;
  successful_returns: number;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  member_since: string;
  stats: UserProfileStats;
}

export async function getUserProfile(): Promise<UserProfile> {
  const response = await backendFetch("/users/me");

  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  return response.json();
}
