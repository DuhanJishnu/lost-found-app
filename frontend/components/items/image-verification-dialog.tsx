"use client";

import { Pencil, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ImageMismatch {
  field: string;
  user_said: string;
  image_shows: string;
  severity: string;
}

export interface VerificationSuggestions {
  suggested_title?: string | null;
  suggested_description?: string | null;
  suggested_category?: string | null;
}

interface ImageVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mismatches: ImageMismatch[];
  suggestedTitle?: string;
  suggestedDescription?: string;
  onGoBackAndEdit: () => void;
  onKeepAiAndSubmit: () => void;
  onKeepWhatITyped: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  color: "Colour",
  object_type: "Item type",
  brand: "Brand",
  shape: "Shape",
  category: "Category",
};

/** Only draw a swatch when the browser can actually parse the value as a colour. */
function isCssColor(value: string) {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("color", value.trim().toLowerCase())
  );
}

function Swatch({ value }: { value: string }) {
  if (!isCssColor(value)) return null;
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] ring-1 ring-inset ring-white/25"
      style={{ backgroundColor: value.trim().toLowerCase() }}
    />
  );
}

function isStrong(severity: string) {
  return ["high", "critical", "major"].includes(severity?.toLowerCase());
}

/** One side of the diff: a gutter sign plus the value, tinted like a code review line. */
function DiffLine({
  kind,
  label,
  value,
  showSwatch,
}: {
  kind: "removed" | "added";
  label: string;
  value: string;
  showSwatch: boolean;
}) {
  const removed = kind === "removed";
  return (
    <div
      className={
        removed
          ? "flex items-stretch bg-red-500/[0.07]"
          : "flex items-stretch bg-emerald-500/[0.09]"
      }
    >
      <span
        aria-hidden
        className={
          removed
            ? "flex w-8 shrink-0 select-none items-center justify-center border-r border-red-500/20 text-base text-red-400/80"
            : "flex w-8 shrink-0 select-none items-center justify-center border-r border-emerald-500/25 text-base text-emerald-400"
        }
      >
        {removed ? "−" : "+"}
      </span>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {showSwatch && <Swatch value={value} />}
          <span
            className={
              removed
                ? "truncate text-sm text-muted-foreground line-through decoration-red-400/60"
                : "truncate text-sm font-semibold text-foreground"
            }
          >
            {value}
          </span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground/70">
          {label}
        </span>
      </div>
    </div>
  );
}

export function ImageVerificationDialog({
  open,
  onOpenChange,
  mismatches,
  suggestedTitle,
  suggestedDescription,
  onGoBackAndEdit,
  onKeepAiAndSubmit,
  onKeepWhatITyped,
}: ImageVerificationDialogProps) {
  const count = mismatches.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="space-y-1.5 px-6 pb-5 pt-6 text-left">
          <DialogTitle className="font-display text-2xl leading-tight text-foreground">
            Your photo says something different
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {count === 1
              ? "One detail you typed doesn’t match the image. Check it before we search."
              : `${count} details you typed don’t match the image. Check them before we search.`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] space-y-4 overflow-y-auto border-y border-border/60 bg-background/40 px-6 py-5">
          {mismatches.map((m, i) => {
            const label = FIELD_LABELS[m.field] ?? m.field;
            const isColour = m.field === "color";
            return (
              <section key={`${m.field}-${i}`} aria-label={`${label} differs`}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    {label}
                  </h3>
                  {isStrong(m.severity) && (
                    <span className="text-xs text-red-400">
                      Clearly different
                    </span>
                  )}
                </div>

                <div className="overflow-hidden rounded-md border border-border/70 font-sans">
                  <DiffLine
                    kind="removed"
                    label="you typed"
                    value={m.user_said}
                    showSwatch={isColour}
                  />
                  <div className="h-px bg-border/70" />
                  <DiffLine
                    kind="added"
                    label="in the photo"
                    value={m.image_shows}
                    showSwatch={isColour}
                  />
                </div>
              </section>
            );
          })}

          {(suggestedTitle || suggestedDescription) && (
            <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Suggested Summary</span>
              </div>
              {suggestedTitle && (
                <div className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Title: </span>
                  <span className="text-foreground/90">{suggestedTitle}</span>
                </div>
              )}
              {suggestedDescription && (
                <div className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Details: </span>
                  <span className="text-foreground/90">{suggestedDescription}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 px-6 py-4 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            onClick={onKeepAiAndSubmit}
            className="h-11 w-full font-semibold shadow-sm"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Keep AI suggestion and submit
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onGoBackAndEdit}
            className="h-11 w-full font-medium"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Go back and edit details
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onKeepWhatITyped}
            className="h-9 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Keep what I typed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
