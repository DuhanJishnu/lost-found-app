"use client";

import { useState } from "react";

import { ItemImage } from "@/components/items/item-image";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  photos: { src: string; alt: string }[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [index, setIndex] = useState(0);
  const total = photos.length;

  function go(delta: number) {
    setIndex((current) => (current + delta + total) % total);
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted select-none sm:rounded-xl">
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {photos.map((photo) => (
          <div key={photo.src} className="h-full min-w-full">
            <ItemImage
              src={photo.src}
              alt={photo.alt}
              ratio="landscape"
              sizes="(max-width: 768px) 100vw, 768px"
              className="h-full"
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background via-background/40 to-transparent" />

      {total > 1 && (
        <>
          <div className="absolute right-4 bottom-3 left-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 backdrop-blur-md">
              {photos.map((photo, dot) => (
                <span
                  key={photo.src}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    dot === index
                      ? "w-2 bg-primary"
                      : "w-1.5 bg-muted-foreground/40",
                  )}
                />
              ))}
            </div>

            <div className="rounded-full bg-background/80 px-3 py-1 backdrop-blur-md">
              <span className="text-xs font-semibold tracking-wider text-primary">
                {index + 1} / {total}
              </span>
            </div>
          </div>

          <div className="absolute inset-0 flex">
            <button
              type="button"
              aria-label="Previous photo"
              className="h-full w-1/2 cursor-default opacity-0"
              onClick={() => go(-1)}
            />
            <button
              type="button"
              aria-label="Next photo"
              className="h-full w-1/2 cursor-default opacity-0"
              onClick={() => go(1)}
            />
          </div>
        </>
      )}
    </div>
  );
}
