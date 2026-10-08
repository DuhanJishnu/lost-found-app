"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PHOTOS = 5;

export interface UploadedPhoto {
  objectKey: string;
  previewUrl: string;
}

interface ImageUploaderProps {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
}

export function ImageUploader({
  photos,
  onChange,
  maxPhotos = MAX_PHOTOS,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadFile(file: File): Promise<UploadedPhoto> {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Only JPEG, PNG, and WebP images are allowed.");
    }

    if (file.size > MAX_SIZE) {
      throw new Error("Each image must be smaller than 5 MB.");
    }

    // Local preview works even though the R2 bucket is private.
    const localPreview = URL.createObjectURL(file);

    try {
      // 1. Get a presigned R2 upload URL
      const urlResponse = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: file.type }),
      });

      if (!urlResponse.ok) throw new Error("Failed to get upload URL");

      const { upload_url, object_key } = await urlResponse.json();

      // 2. Upload straight to R2
      const uploadResponse = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload image");

      // 3. object_key -> database, localPreview -> <img src>
      return { objectKey: object_key, previewUrl: localPreview };
    } catch (error) {
      URL.revokeObjectURL(localPreview);
      throw error;
    }
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setError("");

    const room = maxPhotos - photos.length;
    const accepted = files.slice(0, room);
    setUploading(true);

    try {
      const uploaded = await Promise.all(accepted.map(uploadFile));
      onChange([...photos, ...uploaded]);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Image upload failed",
      );
    } finally {
      setUploading(false);
      resetInput();
    }
  }

  function handleRemove(index: number) {
    const removed = photos[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    onChange(photos.filter((_, i) => i !== index));
    setError("");
    resetInput();
  }

  const full = photos.length >= maxPhotos;

  return (
    <Card className="border-dashed bg-transparent">
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div
                key={photo.objectKey}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt={`Selected photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />

                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-destructive hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {!full && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {uploading ? <Spinner /> : <Plus className="h-5 w-5" />}
                Add more
              </button>
            )}
          </div>
        )}

        {photos.length === 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center gap-2 rounded-lg px-4 py-8 text-center transition-colors hover:text-primary disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Spinner />
                Uploading…
              </>
            ) : (
              <>
                <span className="text-base font-medium">
                  Tap to add reference images
                </span>
                <span className="text-sm text-muted-foreground">
                  Device photos, past receipts, or matching stock visuals
                </span>
              </>
            )}
          </button>
        )}

        <FormError message={error} />
      </CardContent>
    </Card>
  );
}
