import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

interface ClaimStatusRouteContext {
  params: Promise<{ claimId: string }>;
}

export async function PATCH(
  request: Request,
  context: ClaimStatusRouteContext,
) {
  try {
    const { claimId } = await context.params;
    const body = await request.json();
    const response = await backendFetch(`/claims/${claimId}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update claim",
      },
      { status: 500 },
    );
  }
}
