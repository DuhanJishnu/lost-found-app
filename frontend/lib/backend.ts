import { auth } from "@/auth";

export async function backendFetch(
  path: string,
  options: RequestInit = {},
) {
  const session = await auth();
  

  if (!session?.user?.googleId) {
    throw new Error("Not authenticated");
  }

  const tokenResponse = await fetch(
    `${process.env.BACKEND_URL}/auth/google`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret":
          process.env.INTERNAL_API_SECRET!,
      },
      body: JSON.stringify({
        google_id: session.user.googleId,
        name: session.user.name,
        email: session.user.email,
      }),
      cache: "no-store",
    },
  );
  
  if (!tokenResponse.ok) {
    throw new Error(
      "Backend authentication failed",
    );
  }

  const { access_token } = await tokenResponse.json();
  
  const headers = new Headers(options.headers);

  headers.set(
    "Authorization",
    `Bearer ${access_token}`,
  );

  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(
    `${process.env.BACKEND_URL}${path}`,
    {
      ...options,
      headers,
      cache: "no-store",
    },
  );
}