import { notFound } from "next/navigation";

import {
  getItem,
  getItemImageUrl,
} from "@/lib/items";

import { ItemDetails } from "@/components/items/item-details";

interface ItemPageProps {
  params: Promise<{
    itemId: string;
  }>;
}

export default async function ItemPage({
  params,
}: ItemPageProps) {
  const { itemId } = await params;

  const id = Number(itemId);

  if (!Number.isInteger(id)) {
    notFound();
  }

  let item;
  let imageUrls: string[] = [];

  try {
    item = await getItem(id);

    imageUrls = await Promise.all(
      item.images.map((image) =>
        getItemImageUrl(image.object_key)
      )
    );
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <ItemDetails
        item={item}
        imageUrls={imageUrls}
      />
    </main>
  );
}