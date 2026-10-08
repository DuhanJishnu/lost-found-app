export type ItemType = "LOST" | "FOUND";

export type ItemStatus =
  | "ACTIVE"
  | "MATCHED"
  | "CLOSED";

export interface ItemImage {
  id: number;
  object_key: string;
}

export interface Item {
  id: number;
  user_id: number;
  type: ItemType;
  title: string;
  description: string;
  category: string;
  status: ItemStatus;
  latitude: number | null;
  longitude: number | null;
  occurred_at: string | null;
  created_at: string;
  images: ItemImage[];
}