export type ClaimStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface ClaimResponse {
  id: number;
  match_id: number;
  claimant_id: number;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
}
