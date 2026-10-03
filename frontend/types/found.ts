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
}