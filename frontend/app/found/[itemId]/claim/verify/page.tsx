"use client";

import { Suspense, useEffect, useState } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

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
  | { name: "answering" }
  | { name: "submitting" }
  | { name: "succeeded"; claimId: number }
  | { name: "failed"; message: string };

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
  const [score, setScore] = useState<number | null>(null);

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
          setStep({ name: "answering" });
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setScore(null);
    setStep({ name: "submitting" });

    try {
      const payload = questions.map((question) => ({
        question_id: question.id,
        answer: answers[question.id] ?? "",
      }));

      const result = await submitClaimAnswers(
        lostItemId,
        foundItemId,
        payload,
      );

      if (!result.passed || !result.verification_token) {
        setScore(result.score);
        setStep({ name: "answering" });
        setError(
          "Those details don't match your lost-item report closely " +
            "enough. Check your answers against what you reported and " +
            "try again.",
        );
        return;
      }

      const claim = await createClaim(
        lostItemId,
        foundItemId,
        result.verification_token,
      );

      setStep({ name: "succeeded", claimId: claim.id });
    } catch (cause) {
      setStep({ name: "answering" });
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
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Claim submitted</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          The finder has been notified and will review your claim.
        </p>

        <LinkButton href="/dashboard" className="mt-6">
          Back to my items
        </LinkButton>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Card className="p-2 sm:p-4">
        <CardHeader>
          <CardTitle className="font-display text-3xl">
            Verify ownership
          </CardTitle>

          <CardDescription>
            Answer from what you reported about your lost item — not from
            the found photo. Your answers are stored as hashes only.
            {score !== null && (
              <> Last attempt score: {Math.round(score * 100)}%.</>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question) => (
              <FormField
                key={question.id}
                label={question.question}
                htmlFor={`question-${question.id}`}
              >
                <Textarea
                  id={`question-${question.id}`}
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((previous) => ({
                      ...previous,
                      [question.id]: event.target.value,
                    }))
                  }
                  placeholder="Your answer…"
                  required
                />
              </FormField>
            ))}

            <FormError message={error} />

            <Button type="submit" className="w-full">
              Submit answers
            </Button>
          </form>
        </CardContent>
      </Card>
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
