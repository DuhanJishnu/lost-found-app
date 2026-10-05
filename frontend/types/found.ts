export interface FoundFeedImage {
  id: number;
  image_url: string;
}

export interface FoundFeedItem {
  id: number;
  title: string;
  description: string;
  category: string;
  similarity_score: number;
  can_view_image: boolean;
  can_claim: boolean;
  images: FoundFeedImage[];
  // Phase 7.5: km from the feed's reference point; null when the feed
  // was not requested with ?latitude=&longitude=. Display as "X km away".
  distance_km: number | null;
}