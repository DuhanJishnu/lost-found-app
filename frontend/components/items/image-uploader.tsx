"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";

import { ItemImage } from "./item-image";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface ImageUploaderProps {
  onUpload: (objectKey: string, previewUrl: string) => void;
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

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    // Local preview works even though the R2 bucket is private.
    const localPreview = URL.createObjectURL(file);
    setUploading(true);

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

      // 3. object_key -> database, localPreview -> <Image src>
      onUpload(object_key, localPreview);
    } catch (error) {
      URL.revokeObjectURL(localPreview);
      setError(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
      resetInput();
    }
  }

  function handleRemove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onRemove();
    setError("");
    resetInput();
  }

  return (
    <Card className="border-dashed bg-transparent">
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="space-y-3">
            <ItemImage src={previewUrl} alt="Selected item" rounded />

            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              className="w-full"
              disabled={uploading}
            >
              Remove photo
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
                Uploading…
              </>
            ) : (
              "Add a photo"
            )}
          </Button>
        )}

        <FormError message={error} />
      </CardContent>
    </Card>
  );
}
