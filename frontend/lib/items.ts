import { backendFetch } from "@/lib/backend";
import { Item } from "@/types/item";

export async function getMyItems(): Promise<Item[]> {
  const response = await backendFetch("/items");

  if (!response.ok) {
    throw new Error("Failed to fetch items");
  }

  return response.json();
}

export async function getItem(
  itemId: number,
): Promise<Item> {
  const response = await backendFetch(
    `/items/${itemId}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch item");
  }

  return response.json();
}

export async function createItem(data: {
  type: "LOST" | "FOUND";
  title: string;
  description: string;
  category: string;
  image_keys: string[];
  latitude?: number;
  longitude?: number;
}) {
  const response = await backendFetch("/items", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(
      () => ({ detail: "Failed to create item" }),
    );

    throw new Error(error.detail);
  }

  return response.json();
}

export async function getItemImageUrl(
  objectKey: string,
): Promise<string> {
  const response = await backendFetch(
    "/storage/download-url",
    {
      method: "POST",
      body: JSON.stringify({
        object_key: objectKey,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      "Failed to generate image URL",
    );
  }

  const data = await response.json();

  return data.download_url;
}

export async function getAllMyItems(): Promise<Item[]> {
  const response = await backendFetch("/items/me");

  if (!response.ok) {
    throw new Error("Failed to fetch items");
  }

  return response.json();
}

export async function getMyLostItems(): Promise<Item[]> {
  const items = await getMyItems();

  return items.filter(
    (item) =>
      item.type === "LOST" &&
      item.status === "ACTIVE",
  );
}