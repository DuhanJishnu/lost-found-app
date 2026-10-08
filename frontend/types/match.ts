export type MatchStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export interface MatchItemSummary {
  id: number;
  user_id: number;
  type: "LOST" | "FOUND";
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
}

export interface MatchResponse {
  id: number;
  lost_item_id: number;
  found_item_id: number;
  similarity_score: number;
  status: MatchStatus;
  created_at: string;
  lost_item: MatchItemSummary | null;
  found_item: MatchItemSummary | null;
}
