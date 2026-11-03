import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await backendFetch(
      "/items/verify-image",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    return NextResponse.json(
      data,
      { status: response.status },
    );
  } catch (error) {
    // If verification fails, don't block the user — return match: true
    return NextResponse.json(
      { match: true, mismatches: [] },
      { status: 200 },
    );
  }
}
