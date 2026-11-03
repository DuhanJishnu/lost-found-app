export type ClaimStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface UserContactInfo {
  name: string;
  email: string;
}

export interface ClaimResponse {
  id: number;
  match_id: number;
  claimant_id: number;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
  finder_contact?: UserContactInfo | null;
  claimant_contact?: UserContactInfo | null;
}
