import { backendFetch } from "@/lib/backend";
import type { ClaimResponse } from "@/types/claim";

export async function getClaims(): Promise<ClaimResponse[]> {
  const response = await backendFetch("/claims");

  if (!response.ok) {
    throw new Error("Failed to fetch claims");
  }

  return response.json();
}
