import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function GET() {
  try {
    const response = await backendFetch("/notifications/unread-count");
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load unread count",
      },
      { status: 500 },
    );
  }
}
