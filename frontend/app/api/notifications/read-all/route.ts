import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function PATCH() {
  try {
    const response = await backendFetch("/notifications/read-all", {
      method: "PATCH",
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to mark notifications as read",
      },
      { status: 500 },
    );
  }
}
