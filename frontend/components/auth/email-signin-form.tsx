"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { ComingSoonBadge } from "@/components/auth/coming-soon";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

/** Email/password sign-in via the NextAuth credentials provider. */
export function EmailSignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      remember: remember ? "true" : "false",
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="alex@example.com"
            required
            className="h-12 rounded-xl pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled
            title="Password reset is not available yet"
          >
            Forgot password?
            <ComingSoonBadge />
          </Button>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="h-12 rounded-xl pr-11 pl-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-1/2 right-1 h-10 w-10 -translate-y-1/2"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-5 w-5 rounded accent-primary"
          />
          Remember this device
        </label>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Safe Session
        </span>
      </div>

      <FormError message={error} />

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl text-sm font-semibold"
      >
        {pending && <Spinner className="text-primary-foreground" />}
        {pending ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
