"use client";

import { Suspense, useEffect, useState } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { verifyClaimPair } from "@/lib/claims";

function LoadingState() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-6" />
    </main>
  );
}

function ClaimVerifyContent() {
  const router = useRouter();
  const { itemId } = useParams<{ itemId: string }>();
  const searchParams = useSearchParams();
  const lostItemId = Number(searchParams.get("lostItemId"));
  const foundItemId = Number(itemId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Claim verification:", {
      lostItemId,
      foundItemId,
      pathname: window.location.pathname,
    });

    let active = true;

    async function verify() {
      setLoading(true);
      setError(null);

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

        if (active) {
          setLoading(false);
        }
      } catch (cause) {
        if (!active) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to verify claim",
        );
        setLoading(false);
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [foundItemId, lostItemId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">
          Claim cannot be started
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          {error}
        </p>

        <Button
          className="mt-6"
          onClick={() => router.back()}
        >
          Go Back
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">
        Verify ownership
      </h1>

      <p className="mt-3 text-sm text-muted-foreground">
        This item appears relevant to your lost item. We&apos;ll ask
        a few questions to verify that it belongs to you.
      </p>
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