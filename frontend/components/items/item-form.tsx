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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

import { ImageUploader } from "./image-uploader";
import { ItemType } from "@/types/item";

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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        throw new Error(
          data.error ?? "Failed to create item",
        );
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          Report an Item
        </CardTitle>

        <CardDescription>
          Report something you've lost or found.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="space-y-3">
            <Label>What happened?</Label>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={
                  type === "LOST"
                    ? "default"
                    : "outline"
                }
                onClick={() => setType("LOST")}
              >
                I Lost Something
              </Button>

              <Button
                type="button"
                variant={
                  type === "FOUND"
                    ? "default"
                    : "outline"
                }
                onClick={() => setType("FOUND")}
              >
                I Found Something
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Item title
            </Label>

            <Input
              id="title"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Black iPhone 15"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category
            </Label>

            <Input
              id="category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              placeholder="e.g. Electronics"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description
            </Label>

            <Textarea
              id="description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Describe the item in detail..."
              className="min-h-32"
              required
            />
          </div>

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

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner />
                Reporting...
              </>
            ) : (
              "Report Item"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}