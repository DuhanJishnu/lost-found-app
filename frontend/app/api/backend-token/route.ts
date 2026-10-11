import { NextResponse } from "next/server";

import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  const googleId = session?.user?.googleId;
  const userId = session?.user?.userId;

  if (!googleId && !userId) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

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

const response = await fetch(
  tokenRequest.url,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify(tokenRequest.body),
  }
);

  if (!response.ok) {
    return NextResponse.json(
      { error: "Backend authentication failed" },
      { status: response.status }
    );
  }

  const data = await response.json();

  return NextResponse.json(data);
}
