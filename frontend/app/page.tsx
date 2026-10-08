import { SignInButton } from "@/components/auth/sign-in-button";
import { backendFetch } from "@/lib/backend";
import { DashboardButton } from "@/components/DashboardButton";
import { FoundItemButton } from "@/components/FoundItemButton";


export default async function Home() {
  const response = await backendFetch("/auth/me");
  
  const data = await response.json();

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">
          Lost & Found
        </h1>

        <p className="mt-3 text-gray-600">
          Find what you lost. Return what you found.
        </p>
        <p>
          Backend user ID: {data.user_id}
        </p>
        <div className="mt-8">
          <SignInButton />
        </div>
        <div className="p-3">
         <DashboardButton />
        </div>
        <div className="p-3">
         <FoundItemButton />
        </div>
      </div>
    </main>
  );
}