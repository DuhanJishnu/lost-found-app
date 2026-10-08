import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

interface ReadRouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: Request, context: ReadRouteContext) {
  try {
    const { id } = await context.params;
    const response = await backendFetch(`/notifications/${id}/read`, {
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
            : "Unable to mark notification as read",
      },
      { status: 500 },
    );
  }
}
