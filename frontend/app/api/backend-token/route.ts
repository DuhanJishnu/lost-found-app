import { NextResponse } from "next/server";

import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.googleId) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

const response = await fetch(
  `${process.env.BACKEND_URL}/auth/google`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({
      google_id: session.user.googleId,
      name: session.user.name,
      email: session.user.email,
    }),
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