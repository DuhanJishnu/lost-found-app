"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="rounded-lg bg-black px-5 py-3 text-white"
    >
      Continue with Google
    </button>
  );
}