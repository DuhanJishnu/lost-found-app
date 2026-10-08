"use client";

import { Suspense, useEffect, useState } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { LinkButton } from "@/components/ui/link-button";
import {
  createClaim,
  getClaimQuestions,
  submitClaimAnswers,
  verifyClaimPair,
  type ClaimQuestion,
} from "@/lib/claims";

function LoadingState() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-6" />
    </main>
  );
}

type Step =
  | { name: "verifying" }
  | { name: "answering"; index: number }
  | { name: "submitting" }
  | { name: "failed"; message: string }
  | { name: "succeeded"; score: number; claimId: number };

function ClaimVerifyContent() {
  const router = useRouter();
  const { itemId } = useParams<{ itemId: string }>();
  const searchParams = useSearchParams();
  const lostItemId = Number(searchParams.get("lostItemId"));
  const foundItemId = Number(itemId);

  const [step, setStep] = useState<Step>({ name: "verifying" });
  const [questions, setQuestions] = useState<ClaimQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(true);

  const total = questions.length;
  const currentIndex = step.name === "answering" ? step.index : 0;
  const question = questions[currentIndex];
  const draft = question ? (answers[question.id] ?? "") : "";
  const answeredCount = questions.filter(
    (q) => (answers[q.id] ?? "").trim().length > 0,
  ).length;
  const isLast = currentIndex === total - 1;

  useEffect(() => {
    let active = true;

    async function verify() {
      try {
        if (
          !Number.isInteger(lostItemId) ||
          lostItemId <= 0 ||
          !Number.isInteger(foundItemId) ||
          foundItemId <= 0
        ) {
          throw new Error("Invalid claim items");
        }

        await verifyClaimPair(lostItemId, foundItemId);

        const loaded = await getClaimQuestions(lostItemId, foundItemId);

        if (active) {
          setQuestions(loaded);
          setStep({ name: "answering", index: 0 });
        }
      } catch (cause) {
        if (active) {
          setStep({
            name: "failed",
            message:
              cause instanceof Error ? cause.message : "Unable to verify claim",
          });
        }
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [foundItemId, lostItemId]);

  function goTo(index: number) {
    setError("");
    setStep({ name: "answering", index });
  }

  async function handleSubmit() {
    setError("");
    setStep({ name: "submitting" });

    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] ?? "",
      }));

      const result = await submitClaimAnswers(
        lostItemId,
        foundItemId,
        payload,
      );

      if (!result.passed || !result.verification_token) {
        setStep({ name: "answering", index: total - 1 });
        setError(
          `Those details scored ${Math.round(result.score * 100)}% against your lost-item report — step back through the questions and answer from what you reported.`,
        );
        return;
      }

      const claim = await createClaim(
        lostItemId,
        foundItemId,
        result.verification_token,
      );

      setSheetOpen(true);
      setStep({ name: "succeeded", score: result.score, claimId: claim.id });
    } catch (cause) {
      setStep({ name: "answering", index: currentIndex });
      setError(
        cause instanceof Error ? cause.message : "Something went wrong",
      );
    }
  }

  if (step.name === "verifying" || step.name === "submitting") {
    return <LoadingState />;
  }

  if (step.name === "failed") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Claim cannot be started</h1>

        <p className="mt-3 text-sm text-muted-foreground">{step.message}</p>

        <Button className="mt-6" onClick={() => router.back()}>
          Go Back
        </Button>
      </main>
    );
  }

  if (step.name === "succeeded") {
    const percent = Math.round(step.score * 100);

    return (
      <main className="mx-auto w-full max-w-lg px-4 pb-24">
        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              onClick={() => setSheetOpen(false)}
            />

            <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-t-[28px] bg-muted px-4 pt-4 pb-8 text-center shadow-2xl">
              <div className="mb-1 h-1.5 w-12 rounded-full bg-accent" />

              <div className="relative mt-2 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-card shadow-lg">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-primary">
                    <Check className="h-6 w-6 text-primary" strokeWidth={3} />
                  </span>
                </div>

                <div className="absolute -top-1 -right-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow-md">
                  {percent}% MATCH
                </div>
              </div>

              <div className="max-w-sm space-y-1.5">
                <h2 className="font-display text-3xl">
                  Claim Successfully Submitted!
                </h2>
                <p className="leading-relaxed text-muted-foreground">
                  Verification passed at{" "}
                  <span className="font-semibold text-primary">
                    {percent}%
                  </span>
                  . The finder has been notified to coordinate a secure
                  and verified handover.
                </p>
              </div>

              <div className="flex w-full items-center justify-between rounded-xl bg-card p-3.5 text-left shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                    <Fingerprint className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      Claim Receipt #{step.claimId}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      Answers sealed as hashes only
                    </p>
                  </div>
                </div>

                <ShieldCheck className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              </div>

              <div className="w-full space-y-2 pt-2">
                <LinkButton href="/dashboard" className="h-12 w-full rounded-full">
                  Back to my items
                </LinkButton>

                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="h-10 w-full rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="py-16 text-center">
          <h1 className="font-display text-3xl">Claim submitted</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Claim #{step.claimId} is with the finder for review.
          </p>
          <LinkButton href="/dashboard" className="mt-6">
            Back to my items
          </LinkButton>
        </div>
      </main>
    );
  }

  if (!question) return <LoadingState />;

  const progress = Math.round((answeredCount / Math.max(total, 1)) * 100);

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-24">
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-wider text-muted-foreground uppercase">
            Question {currentIndex + 1} of {total}
          </span>
          <span className="text-xs font-semibold text-primary">
            {progress}% answered
          </span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-muted p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-primary shadow-[0_0_12px_rgba(0,174,187,0.7)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs tracking-wider text-primary uppercase shadow-sm">
          <ShieldCheck className="h-[14px] w-[14px]" />
          Verification step {currentIndex + 1}
        </span>
      </div>

      <h1 className="mt-3 font-display text-3xl leading-tight">
        {question.question}
      </h1>

      <p className="mt-2 text-muted-foreground">
        Answer with details from your own lost-item report — not from the
        found photo.
      </p>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <label
            htmlFor="verification-answer"
            className="font-semibold"
          >
            Your answer
          </label>

          <span className="flex items-center gap-1 text-xs text-primary">
            <Lock className="h-[13px] w-[13px]" />
            Hashed, never stored
          </span>
        </div>

        <div className="mt-2 rounded-xl bg-muted p-0.5 shadow-md transition-all focus-within:ring-2 focus-within:ring-primary/60">
          <Textarea
            id="verification-answer"
            value={draft}
            onChange={(event) =>
              setAnswers((previous) => ({
                ...previous,
                [question.id]: event.target.value,
              }))
            }
            placeholder="Mention colors, marks, contents, or other identifying details…"
            rows={4}
            className="resize-none border-0 bg-transparent p-3.5 focus-visible:ring-0"
          />

          <div className="flex items-center justify-between rounded-b-xl bg-card px-3 py-2 text-muted-foreground">
            <span className="flex items-center gap-1 text-xs">
              <Lock className="h-4 w-4 text-primary" />
              Stored as a hash only
            </span>
            <span className="text-xs">{draft.length} chars</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl bg-card p-4 shadow-sm">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>

        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            Private by design
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your answers are hashed before they leave this screen. The
            finder never sees them — only whether your details check out.
          </p>
        </div>
      </div>

      <FormError message={error} />

      <div className="mt-4 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            currentIndex === 0 ? router.back() : goTo(currentIndex - 1)
          }
          className="h-12 flex-shrink-0 rounded-full px-5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {isLast ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={draft.trim().length === 0}
            className="h-12 flex-1 rounded-full font-semibold"
          >
            Submit answers
            <ArrowRight className="h-[18px] w-[18px]" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => draft.trim().length > 0 && goTo(currentIndex + 1)}
            disabled={draft.trim().length === 0}
            className="h-12 flex-1 rounded-full font-semibold"
          >
            Continue ({currentIndex + 1} of {total})
            <ArrowRight className="h-[18px] w-[18px]" />
          </Button>
        )}
      </div>
    </main>
  );
}

export default function ClaimVerifyPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ClaimVerifyContent />
    </Suspense>
  );
}
