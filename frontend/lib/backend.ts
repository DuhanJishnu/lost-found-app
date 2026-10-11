import { auth } from "@/auth";

export async function backendFetch(
  path: string,
  options: RequestInit = {},
) {
  const session = await auth();

  const googleId = session?.user?.googleId;
  const userId = session?.user?.userId;

  if (!googleId && !userId) {
    throw new Error("Not authenticated");
  }

  // Google sessions exchange identity for a token; credentials sessions
  // mint one directly for the stored user id. Both stay server-side.
  const tokenRequest = googleId
    ? {
        url: `${process.env.BACKEND_URL}/auth/google`,
        body: {
          google_id: googleId,
          name: session!.user.name,
          email: session!.user.email,
        },
      }
    : {
        url: `${process.env.BACKEND_URL}/auth/token`,
        body: { user_id: Number(userId) },
      };

  const tokenResponse = await fetch(
    tokenRequest.url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret":
          process.env.INTERNAL_API_SECRET!,
      },
      body: JSON.stringify(tokenRequest.body),
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
