import { backendFetch } from "@/lib/backend";
import type { MatchResponse } from "@/types/match";

export async function getMatches(): Promise<MatchResponse[]> {
  const response = await backendFetch("/matches");

  if (!response.ok) {
    throw new Error("Failed to fetch matches");
  }

  return response.json();
}
