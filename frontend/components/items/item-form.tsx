"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { ItemType } from "@/types/items";
import { ImageUploader } from "./image-uploader";
import { ItemTypeToggle } from "./item-type-toggle";

export function ItemForm() {
  const router = useRouter();

  const [type, setType] = useState<ItemType>("LOST");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [imageKey, setImageKey] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          category,
          description,
          image_keys: imageKey ? [imageKey] : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create item");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-2 sm:p-4">
      <CardHeader>
        <CardTitle className="font-display text-3xl">Report an item</CardTitle>

        <CardDescription>
          Tell us what you lost or found. The more detail, the better the match.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField label="What happened?">
            <ItemTypeToggle value={type} onChange={setType} />
          </FormField>

          <FormField label="Item title" htmlFor="title">
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Black iPhone 15"
              required
            />
          </FormField>

          <FormField label="Category" htmlFor="category">
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Electronics"
              required
            />
          </FormField>

          <FormField label="Description" htmlFor="description">
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Colour, brand, marks, where and when…"
              className="min-h-32"
              required
            />
          </FormField>

          <ImageUploader
            previewUrl={imagePreview}
            onUpload={(objectKey, previewUrl) => {
              setImageKey(objectKey);
              setImagePreview(previewUrl);
            }}
            onRemove={() => {
              setImageKey("");
              setImagePreview("");
            }}
          />

          <FormError message={error} />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Spinner />
                Submitting…
              </>
            ) : (
              "Submit report"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
