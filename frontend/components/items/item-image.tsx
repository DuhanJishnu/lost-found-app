import Image from "next/image";

import { cn } from "@/lib/utils";

const ratios = {
  video: "aspect-video",
  square: "aspect-square",
} as const;

interface ItemImageProps {
  src: string;
  alt: string;
  ratio?: keyof typeof ratios;
  sizes?: string;
  rounded?: boolean;
  className?: string;
}

export function ItemImage({
  src,
  alt,
  ratio = "video",
  sizes,
  rounded = false,
  className,
}: ItemImageProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        ratios[ratio],
        rounded && "rounded-xl border border-border",
        className,
      )}
    >
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}
