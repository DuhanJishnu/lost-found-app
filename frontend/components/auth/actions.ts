"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google");
}

export async function signOutEverywhere() {
  await signOut({ redirectTo: "/" });
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export async function registerWithPassword(
  input: RegisterInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let response: Response;

  try {
    response = await fetch(`${process.env.BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach the server. Try again." };
  }

  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 409) {
    return {
      ok: false,
      error: "An account with this email already exists. Try signing in instead.",
    };
  }

  const data = await response.json().catch(() => null);
  const detail = Array.isArray(data?.detail)
    ? data.detail.map((issue: { msg?: string }) => issue.msg).join(" ")
    : data?.detail;

  return {
    ok: false,
    error:
      typeof detail === "string" && detail.length > 0
        ? detail
        : "Registration failed. Check your details and try again.",
  };
}
