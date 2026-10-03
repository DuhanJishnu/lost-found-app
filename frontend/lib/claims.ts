export interface ClaimVerification {
  valid: boolean;
  found_item_id: number;
  lost_item_id: number;
  similarity_score: number;
}

export async function verifyClaimPair(
  lostItemId: number,
  foundItemId: number,
): Promise<ClaimVerification> {
  const response = await fetch("/api/claims/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lost_item_id: lostItemId,
      found_item_id: foundItemId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = error?.detail ?? error?.error;

    throw new Error(
      typeof detail === "string"
        ? detail
        : "Unable to verify claim",
    );
  }

  return response.json();
}