import { SignInButton } from "@/components/auth/sign-in-button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">
          Lost & Found
        </h1>

        <p className="mt-3 text-gray-600">
          Find what you lost. Return what you found.
        </p>

        <div className="mt-8">
          <SignInButton />
        </div>
      </div>
    </main>
  );
}