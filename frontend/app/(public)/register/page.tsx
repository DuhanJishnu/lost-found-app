import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthSplit } from "@/components/auth/auth-split";
import { GoogleButton } from "@/components/auth/google-button";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user?.googleId ?? session?.user?.userId) {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-8 pb-16 lg:max-w-6xl lg:pt-12">
      <AuthSplit
        title="Join the Lost & Found Protocol."
        description="Protect your belongings, activate neighborhood discovery, and help reunite lost items across your community."
      >
        <div className="flex flex-col gap-5">
          {/* Mobile header — hidden on desktop, the split panel covers it */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="h-1 w-6 rounded-full bg-primary" />
                <span className="h-1 w-2 rounded-full bg-muted" />
                <span className="h-1 w-2 rounded-full bg-muted" />
              </span>
            </div>

            <div className="mt-4">
              <h1 className="font-display text-3xl font-medium tracking-tight">
                Join Lost &amp; Found
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Protect your belongings and help reunite community items with
                automated matching and dispatch.
              </p>
            </div>
          </div>

          <h1 className="hidden font-display text-2xl font-medium tracking-tight lg:block">
            Create Account
          </h1>
          <p className="hidden text-sm text-muted-foreground lg:block">
            Create an account to get started.
          </p>

          <GoogleButton />

          <RegisterForm />

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
      </AuthSplit>
    </main>
  );
}
