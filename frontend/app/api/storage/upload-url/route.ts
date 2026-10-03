import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await backendFetch(
      "/storage/upload-url",
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
            : "Upload URL request failed",
      },
      { status: 500 },
    );
  }
}