"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

interface ImageUploaderProps {
  onUpload: (
    objectKey: string,
    previewUrl: string,
  ) => void;
  onRemove: () => void;
  previewUrl?: string;
}

export function ImageUploader({
  onUpload,
  onRemove,
  previewUrl,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Only JPEG, PNG, and WebP images are allowed.",
      );
      return;
    }

    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    // Create a local browser preview.
    // This works even though the R2 bucket is private.
    const localPreview = URL.createObjectURL(file);

    setUploading(true);

    try {
      // 1. Get a presigned R2 upload URL
      const urlResponse = await fetch(
        "/api/storage/upload-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content_type: file.type,
          }),
        },
      );

      if (!urlResponse.ok) {
        throw new Error(
          "Failed to get upload URL",
        );
      }

      const {
        upload_url,
        object_key,
      } = await urlResponse.json();

      // 2. Upload the image directly to R2
      const uploadResponse = await fetch(
        upload_url,
        {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error(
          "Failed to upload image",
        );
      }

      // 3. Return both:
      //    - object_key -> save this in the database
      //    - localPreview -> use this for <Image src>
      onUpload(
        object_key,
        localPreview,
      );
    } catch (error) {
      // The upload failed, so the preview is no longer needed.
      URL.revokeObjectURL(localPreview);

      setError(
        error instanceof Error
          ? error.message
          : "Image upload failed",
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleRemove() {
    onRemove();
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-lg border">
              <Image
                src={previewUrl}
                alt="Selected item"
                fill
                className="object-cover"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              className="w-full"
              disabled={uploading}
            >
              Remove Image
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Spinner />
                Uploading...
              </>
            ) : (
              "Choose Image"
            )}
          </Button>
        )}

        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}