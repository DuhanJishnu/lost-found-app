import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

/** Proxies the found feed for map coordinates (client can't call backend directly). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const latitude = searchParams.get("latitude");
  const longitude = searchParams.get("longitude");
  const radiusKm = searchParams.get("radius_km") ?? "25";

  if (latitude === null || longitude === null) {
    return NextResponse.json(
      { error: "latitude and longitude are required" },
      { status: 400 },
    );
  }

  const query = new URLSearchParams({
    latitude,
    longitude,
    radius_km: radiusKm,
    limit: "50",
  });

  let response: Response;

  try {
    response = await backendFetch(`/items/found/feed?${query.toString()}`);
  } catch {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 },
    );
  }

  const data = await response.json().catch(() => null);

  return NextResponse.json(data, { status: response.status });
}
