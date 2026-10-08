"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil, X } from "lucide-react";

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
import { ImageUploader, type UploadedPhoto } from "./image-uploader";
import { ItemTypeToggle } from "./item-type-toggle";
import type { PickedLocation } from "./location-picker";
import { cn } from "@/lib/utils";

// Leaflet needs window — never render on the server.
const LocationPicker = dynamic(
  () => import("./location-picker").then((module) => module.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-border">
        <Spinner />
      </div>
    ),
  },
);

const STEPS = ["Recovery type", "Item telemetry", "Pin location"] as const;

const CATEGORIES = [
  "Electronics",
  "Keys",
  "Wallets",
  "Bags",
  "IDs & Cards",
  "Pets",
  "Jewelry",
  "Accessories",
  "Clothing",
  "Documents",
  "Other",
] as const;

export function ItemForm() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [type, setType] = useState<ItemType>("LOST");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [description, setDescription] = useState("");

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [location, setLocation] = useState<PickedLocation | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dateLabel =
    type === "LOST" ? "Date & time lost (optional)" : "Date & time found (optional)";

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
          image_keys: photos.map((photo) => photo.objectKey),
          ...(occurredAt
            ? { occurred_at: new Date(occurredAt).toISOString() }
            : {}),
          ...(location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
              }
            : {}),
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs font-bold tracking-widest uppercase">
          <span className="text-primary">Step {step} of 3</span>
          <span className="text-muted-foreground"> • {STEPS[step - 1]}</span>
        </p>

        <Link
          href="/dashboard"
          aria-label="Cancel report"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>

      <div className="mb-8 flex gap-1.5" aria-hidden>
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index < step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <Card className="p-2 sm:p-4">
          <CardHeader>
            <CardTitle className="font-display text-3xl">
              What happened?
            </CardTitle>

            <CardDescription>
              Are you reporting something you lost, or something you found?
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setStep(2);
              }}
              className="space-y-6"
            >
              <ItemTypeToggle value={type} onChange={setType} />

              <Button type="submit" className="w-full">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-2 sm:p-4">
          <CardHeader>
            <CardTitle className="font-display text-3xl">
              Report an item
            </CardTitle>

            <CardDescription>
              Every detail brings an item closer to home. Quiet precision
              helps our recognition engine discover matches faster.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setStep(3);
              }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] tracking-widest text-muted-foreground uppercase">
                    Recovery type
                  </p>
                  <p className="truncate font-semibold">
                    Selected:{" "}
                    {type === "LOST"
                      ? "I lost something"
                      : "I found something"}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="flex-shrink-0 text-primary"
                >
                  Edit
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>

              <FormField label="Item title" htmlFor="title">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Black iPhone 15"
                  minLength={2}
                  maxLength={200}
                  required
                />
              </FormField>

              <FormField label="Category" htmlFor="category">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm [&>option]:bg-popover"
                >
                  <option value="" disabled>
                    Select a category…
                  </option>
                  {CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label={dateLabel} htmlFor="occurred-at">
                <Input
                  id="occurred-at"
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                />
              </FormField>

              <FormField label="Distinguishing details" htmlFor="description">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Colour, brand, marks, where and when…"
                  className="min-h-32"
                  minLength={5}
                  maxLength={5000}
                  required
                />
              </FormField>

              <FormField label="Photographic evidence (optional, highly recommended)">
                <ImageUploader photos={photos} onChange={setPhotos} />
              </FormField>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                <Button type="submit" className="flex-1">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-2 sm:p-4">
          <CardHeader>
            <CardTitle className="font-display text-3xl">
              Pin the location
            </CardTitle>

            <CardDescription>
              Drop a pin where it was{" "}
              {type === "LOST" ? "last seen" : "found"}. This powers
              nearby matching — you can skip it.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <LocationPicker value={location} onChange={setLocation} />

              <FormError message={error} />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Submit report
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
