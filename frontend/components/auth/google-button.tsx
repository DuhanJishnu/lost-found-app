"use client";

import { signIn } from "next-auth/react";

import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoogleButtonProps {
  className?: string;
  label?: string;
}

/** Full-width Google sign-in. This is the only working auth method. */
export function GoogleButton({
  className,
  label = "Continue with Google",
}: GoogleButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className={cn("h-12 w-full rounded-xl text-sm font-semibold", className)}
    >
      <GoogleIcon className="h-5 w-5" />
      {label}
    </Button>
  );
}
