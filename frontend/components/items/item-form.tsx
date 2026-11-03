"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil, Sparkles, Undo2, X } from "lucide-react";

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
import {
  ImageVerificationDialog,
  type ImageMismatch,
  type VerificationSuggestions,
} from "./image-verification-dialog";
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
  const [nowSelected, setNowSelected] = useState(false);
  const [description, setDescription] = useState("");

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [location, setLocation] = useState<PickedLocation | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Image verification state
  const [verifying, setVerifying] = useState(false);
  const [showMismatchDialog, setShowMismatchDialog] = useState(false);
  const [mismatches, setMismatches] = useState<ImageMismatch[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<VerificationSuggestions | null>(null);

  // Backup of user's original inputs before applying suggestions so they can undo
  const [originalDetails, setOriginalDetails] = useState<{
    title: string;
    description: string;
    category: string;
  } | null>(null);
  const [aiAppliedBanner, setAiAppliedBanner] = useState(false);

  const dateLabel =
    type === "LOST" ? "Date & time lost (optional)" : "Date & time found (optional)";

  function computeEffectiveReplacements(
    currentTitle: string,
    currentDescription: string,
    currentCategory: string,
    currentMismatches: ImageMismatch[],
    suggestions?: VerificationSuggestions | null,
  ) {
    let newTitle = suggestions?.suggested_title?.trim() || "";
    let newDescription = suggestions?.suggested_description?.trim() || "";
    let newCategory = suggestions?.suggested_category?.trim() || "";

    if (!newTitle) {
      newTitle = currentTitle;
      for (const m of currentMismatches) {
        if (!m.user_said || !m.image_shows) continue;
        const tokens = m.user_said.split(/[\s,()\/]+/).filter((t) => t.length > 2);
        for (const token of tokens) {
          const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const re = new RegExp(`\\b${escaped}\\b`, "gi");
          if (re.test(newTitle)) {
            newTitle = newTitle.replace(re, m.image_shows);
          }
        }
      }
      const brandMismatch = currentMismatches.find((m) => m.field === "brand");
      if (brandMismatch && !newTitle.toLowerCase().includes(brandMismatch.image_shows.toLowerCase())) {
        newTitle = `${brandMismatch.image_shows} ${newTitle}`.trim();
      }
    }

    if (!newDescription) {
      newDescription = currentDescription;
      for (const m of currentMismatches) {
        if (!m.user_said || !m.image_shows) continue;
        const tokens = m.user_said.split(/[\s,()\/]+/).filter((t) => t.length > 2);
        let replaced = false;
        for (const token of tokens) {
          const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const re = new RegExp(`\\b${escaped}\\b`, "gi");
          if (re.test(newDescription)) {
            newDescription = newDescription.replace(re, m.image_shows);
            replaced = true;
          }
        }
        if (!replaced && !newDescription.toLowerCase().includes(m.image_shows.toLowerCase())) {
          newDescription = `${newDescription.trim()} (${m.field}: ${m.image_shows})`.trim();
        }
      }
    }

    if (!newCategory) {
      const catMismatch = currentMismatches.find((m) => m.field === "category");
      if (catMismatch) {
        const found = CATEGORIES.find(
          (c) => c.toLowerCase() === catMismatch.image_shows.toLowerCase(),
        );
        if (found) newCategory = found;
      }
    }
    if (!newCategory) {
      newCategory = currentCategory;
    }

    return {
      title: newTitle,
      description: newDescription,
      category: newCategory,
    };
  }

  function applyAiSuggestions() {
    const computed = computeEffectiveReplacements(
      title,
      description,
      category,
      mismatches,
      aiSuggestions,
    );

    // Save previous user details before overwriting, so they can undo
    setOriginalDetails({
      title,
      description,
      category,
    });

    setTitle(computed.title);
    setDescription(computed.description);
    if (computed.category) {
      setCategory(computed.category);
    }
    return computed;
  }

  // 1. Go back and edit details: loads AI suggestions into the form so they aren't lost
  function handleGoBackAndEdit() {
    applyAiSuggestions();
    setShowMismatchDialog(false);
    setAiAppliedBanner(true);
  }

  // 2. Keep AI suggestion and submit: applies AI suggestions and proceeds directly to location & submit step
  function handleKeepAiAndSubmit() {
    applyAiSuggestions();
    setShowMismatchDialog(false);
    setAiAppliedBanner(true);
    setStep(3);
  }

  // 3. Keep what I typed: leaves user details as typed and proceeds to location & submit step
  function handleKeepWhatITyped() {
    setShowMismatchDialog(false);
    setStep(3);
  }

  function fillOccurredNow() {
    if (nowSelected) {
      setOccurredAt("");
      setNowSelected(false);
      return;
    }

    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    setOccurredAt(
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
        `T${pad(now.getHours())}:${pad(now.getMinutes())}`,
    );
    setNowSelected(true);
  }

  async function verifyAndContinue() {
    // If no photos uploaded, skip verification entirely
    if (photos.length === 0) {
      setStep(3);
      return;
    }

    setVerifying(true);
    setError("");

    try {
      // Verify the first uploaded image against the user-provided details
      const response = await fetch("/api/items/verify-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_key: photos[0].objectKey,
          title,
          description,
          category,
        }),
      });

      const data = await response.json();

      if (!data.match && data.mismatches?.length > 0) {
        // Show mismatch dialog
        setMismatches(data.mismatches);
        setAiSuggestions({
          suggested_title: data.suggested_title,
          suggested_description: data.suggested_description,
          suggested_category: data.suggested_category,
        });
        setShowMismatchDialog(true);
      } else {
        // All good — proceed to step 3
        setStep(3);
      }
    } catch {
      // If verification fails for any reason, don't block — proceed
      setStep(3);
    } finally {
      setVerifying(false);
    }
  }

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
              Be Precise, precision helps our recognition engine discover matches faster.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                verifyAndContinue();
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
                  className="shrink-0 text-primary"
                >
                  Edit
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>

              {aiAppliedBanner && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>
                      AI suggestions applied to your details. You can review or edit them before continuing.
                    </span>
                  </div>
                  {originalDetails && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTitle(originalDetails.title);
                        setDescription(originalDetails.description);
                        setCategory(originalDetails.category);
                        setAiAppliedBanner(false);
                      }}
                      className="h-7 shrink-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Undo2 className="mr-1 h-3.5 w-3.5" />
                      Undo
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
                <div className="space-y-6">
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
                    <div className="flex gap-2">
                      <Input
                        id="occurred-at"
                        type="datetime-local"
                        value={occurredAt}
                        onChange={(e) => {
                          setOccurredAt(e.target.value);
                          setNowSelected(false);
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fillOccurredNow}
                        className="shrink-0"
                      >
                        Now
                      </Button>
                    </div>
                  </FormField>

                  <FormField label="Distinguishing details" htmlFor="description">
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Colour, brand, marks etc..."
                      className="min-h-32"
                      minLength={5}
                      maxLength={5000}
                      required
                    />
                  </FormField>
                </div>

                <div className="space-y-6">
                  <FormField label="Photographic evidence (optional, highly recommended)">
                    <ImageUploader photos={photos} onChange={setPhotos} />
                  </FormField>
                </div>
              </div>

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

                <Button type="submit" className="flex-1" disabled={verifying}>
                  {verifying ? (
                    <>
                      <Spinner size="sm" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
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
              {aiAppliedBanner && (
                <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs text-primary">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>
                    AI suggestions applied to your report details. Pin a location (optional) and submit your report.
                  </span>
                </div>
              )}

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
                      <Spinner size="sm" />
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

      {/* Image verification mismatch dialog */}
      <ImageVerificationDialog
        open={showMismatchDialog}
        onOpenChange={setShowMismatchDialog}
        mismatches={mismatches}
        suggestedTitle={
          mismatches.length > 0
            ? computeEffectiveReplacements(
                title,
                description,
                category,
                mismatches,
                aiSuggestions,
              ).title
            : undefined
        }
        suggestedDescription={
          mismatches.length > 0
            ? computeEffectiveReplacements(
                title,
                description,
                category,
                mismatches,
                aiSuggestions,
              ).description
            : undefined
        }
        onGoBackAndEdit={handleGoBackAndEdit}
        onKeepAiAndSubmit={handleKeepAiAndSubmit}
        onKeepWhatITyped={handleKeepWhatITyped}
      />
    </div>
  );
}
