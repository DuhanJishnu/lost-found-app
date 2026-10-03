const BACKEND_URL = process.env.BACKEND_URL;

export async function getBackendToken(): Promise<string> {
  const response = await fetch("/api/backend-token", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to authenticate with backend");
  }

  const data = await response.json();

  return data.token;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
) {
  const token = await getBackendToken();

  const headers = new Headers(options.headers);

  headers.set("Authorization", `Bearer ${token}`);

  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(
    `${BACKEND_URL}${path}`,
    {
      ...options,
      headers,
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(
      () => ({ detail: "Request failed" }),
    );

    throw new Error(
      error.detail ?? "Request failed",
    );
  }

  return response.json();
}