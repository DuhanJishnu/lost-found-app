export interface ClaimVerification {
  valid: boolean;
  found_item_id: number;
  lost_item_id: number;
  similarity_score: number;
}

export interface ClaimQuestion {
  id: number;
  category: string;
  question: string;
}

export interface ClaimAnswersResult {
  passed: boolean;
  score: number;
  verification_token: string | null;
  found_item_id: number;
  lost_item_id: number;
}

export interface CreatedClaim {
  id: number;
  match_id: number;
  claimant_id: number;
  status: string;
}

export async function updateMatchStatus(
  matchId: number,
  status: "CONFIRMED" | "REJECTED",
): Promise<import("@/types/match").MatchResponse> {
  const response = await fetch(`/api/matches/${matchId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = error?.detail ?? error?.error;

    throw new Error(
      typeof detail === "string" ? detail : "Unable to update match",
    );
  }

  return response.json();
}

function extractError(data: unknown, fallback: string): string {
  const detail =
    typeof data === "object" && data !== null
      ? ((data as Record<string, unknown>).detail ??
        (data as Record<string, unknown>).error)
      : null;

  return typeof detail === "string" ? detail : fallback;
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

export async function getClaimQuestions(
  lostItemId: number,
  foundItemId: number,
): Promise<ClaimQuestion[]> {
  const response = await fetch("/api/claims/questions", {
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
    throw new Error(
      extractError(await response.json().catch(() => null),
        "Unable to load questions"),
    );
  }

  return response.json();
}

export async function submitClaimAnswers(
  lostItemId: number,
  foundItemId: number,
  answers: { question_id: number; answer: string }[],
): Promise<ClaimAnswersResult> {
  const response = await fetch("/api/claims/answers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lost_item_id: lostItemId,
      found_item_id: foundItemId,
      answers,
    }),
  });

  if (!response.ok) {
    throw new Error(
      extractError(await response.json().catch(() => null),
        "Unable to submit answers"),
    );
  }

  return response.json();
}

export async function createClaim(
  lostItemId: number,
  foundItemId: number,
  verificationToken: string,
): Promise<CreatedClaim> {
  const response = await fetch("/api/claims", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lost_item_id: lostItemId,
      found_item_id: foundItemId,
      verification_token: verificationToken,
    }),
  });

  if (!response.ok) {
    throw new Error(
      extractError(await response.json().catch(() => null),
        "Unable to create claim"),
    );
  }

  return response.json();
}