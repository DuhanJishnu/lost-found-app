"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { registerWithPassword } from "@/components/auth/actions";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong Security"];
  return { score, label: labels[score] };
}

/** Email/password registration: creates the account, then signs in. */
export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const { score, label } = passwordStrength(password);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();

    const result = await registerWithPassword({ name, email, password });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      remember: "true",
      redirect: false,
    });

    if (signInResult?.error) {
      setError("Account created, but automatic sign-in failed. Try signing in.");
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex items-center justify-center">
        <div className="h-px w-full bg-border" />
        <span className="absolute bg-background px-3 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase lg:bg-card">
          or register with details
        </span>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="register-name">Full Name</Label>
          <div className="relative">
            <User className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="register-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Name"
              required
              maxLength={100}
              className="h-12 rounded-xl pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">Email Address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="mail@example.com"
              required
              maxLength={255}
              className="h-12 rounded-xl pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="register-password">Password</Label>
            <span className="text-[11px] font-semibold tracking-wider text-primary uppercase">
              {password ? label : "Strength"}
            </span>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create secure password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl pr-11 pl-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 bottom-1 h-10 w-10"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3].map((segment) => (
              <div
                key={segment}
                className={cn(
                  "h-1 rounded-full transition-colors",
                  password && segment < score ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground p-2">
            Use 10+ characters with symbols and numerals.
          </p>
        </div>

        <label className="flex items-center cursor-pointer   gap-3 text-xs leading-relaxed text-muted-foreground select-none">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-5 w-5 shrink-0 rounded accent-primary"
          />
          <span>
            I agree to the{" "}
            <span className="font-medium text-foreground">
              Community Guidelines
            </span>{" "}
            and{" "}
            <span className="font-medium text-foreground">
              Handover Protocol
            </span>
            .
          </span>
        </label>

        <FormError message={error} />

        <Button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl text-sm font-semibold"
        >
          {pending && <Spinner className="text-primary-foreground" />}
          {pending ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </div>
  );
}
