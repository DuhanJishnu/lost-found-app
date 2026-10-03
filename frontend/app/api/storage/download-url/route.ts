import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await backendFetch(
      "/storage/download-url",
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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate download URL",
      },
      { status: 500 },
    );
  }
}