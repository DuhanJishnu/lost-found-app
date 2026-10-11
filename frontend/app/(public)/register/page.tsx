import Link from "next/link";
import { BadgeCheck, Lock } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GoogleButton } from "@/components/auth/google-button";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user?.googleId ?? session?.user?.userId) {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-8 pb-16">
      <div className="flex flex-col gap-5">
        {/* Status strip */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-primary">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">
              Encrypted Registration
            </span>
          </span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-1 w-6 rounded-full bg-primary" />
            <span className="h-1 w-2 rounded-full bg-muted" />
            <span className="h-1 w-2 rounded-full bg-muted" />
          </span>
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            Join Lost &amp; Found
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Protect your belongings and help reunite community items with
            cryptographic dispatch.
          </p>
        </div>

        <GoogleButton />

        <RegisterForm />

        {/* Privacy card */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
            <BadgeCheck className="h-[18px] w-[18px]" />
          </span>
          <span className="flex flex-col">
            <span className="mb-0.5 text-xs font-semibold">
              Zero-Knowledge Verification
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your contact details are never exposed to potential finders
              without mutual cryptographic consent and ticket confirmation.
            </p>
          </span>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
          Already registered?
          <Link
            href="/login"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
