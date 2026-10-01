"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";

export function SignInButton() {
  return (
    <Button
      onClick={() => signIn("google")}
      className="cursor-pointer rounded-lg bg-black p-5 text-white"
    >
      <GoogleIcon className="mr-2 h-5 w-5" />
      Continue with Google
    </Button>
  );
}