import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

interface StatusRouteContext {
  params: Promise<{ matchId: string }>;
}

export async function PATCH(request: Request, context: StatusRouteContext) {
  try {
    const { matchId } = await context.params;
    const body = await request.json();
    const response = await backendFetch(`/matches/${matchId}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update match",
      },
      { status: 500 },
    );
  }
}
