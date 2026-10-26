import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function authorizedFetch(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    if (typeof window !== "undefined") {
      window.location.assign("/login?reason=session_expired");
    }
    throw new Error("Your session expired. Please sign in again.");
  }

  let response = await authorizedFetch(path, init, data.session.access_token);

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await supabase.auth.refreshSession();
  const refreshedToken = refreshed.data.session?.access_token;

  if (!refreshed.error && refreshedToken) {
    response = await authorizedFetch(path, init, refreshedToken);
    if (response.status !== 401) {
      return response;
    }
  }

  await supabase.auth.signOut({ scope: "local" });
  if (typeof window !== "undefined") {
    window.location.assign("/login?reason=session_expired");
  }
  throw new Error("Your session expired. Please sign in again.");
}

export async function getApiError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail
        .map((item: { msg?: string }) => item.msg ?? "Validation error")
        .join(", ");
    }
  } catch {
    // Fall through to generic message.
  }
  return `Request failed with status ${response.status}.`;
}
