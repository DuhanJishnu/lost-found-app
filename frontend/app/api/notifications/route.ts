import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ?? "8";
    const response = await backendFetch(
      `/notifications?limit=${encodeURIComponent(limit)}`,
    );
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load notifications",
      },
      { status: 500 },
    );
  }
}
