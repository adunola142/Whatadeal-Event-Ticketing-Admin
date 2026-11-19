import { clearTokens, getAccessToken, redirectToLogin } from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/** Every successful API response is wrapped as `{ success, data, ... }`. */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: unknown;
}

/**
 * Unwrap the backend's `{ success, data }` envelope.
 *
 * The API's transform interceptor wraps every response, so callers should
 * receive `data` directly. Plain payloads (e.g. from a proxy or mock) are
 * returned unchanged.
 */
export function unwrapApiData<T = unknown>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

/**
 * Unwrap a list response. List endpoints return either:
 *   - `{ success, data: [...] }`
 *   - `{ success, data: { data: [...], meta: {...} } }`
 *   - `{ success, data: { items|results|records|organizations|events|...: [...] } }`
 * Falls back to the first array value in a data object to tolerate shape drift.
 */
export function unwrapApiList<T = unknown>(payload: unknown): T[] {
  const data = unwrapApiData<unknown>(payload);
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj["data"])) return obj["data"] as T[];
    for (const key of ["items", "results", "records", "rows", "list"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

/**
 * Authenticated fetch wrapper.
 * Attaches the JWT access-token header to every request and handles common
 * error patterns (401 → logout, JSON parse, etc.).
 */
export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { body, params, headers: extra, ...rest } = opts;
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra as Record<string, string>),
  };

  const init: RequestInit = { ...rest, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), init);

  if (res.status === 401) {
    // Treat a 401 on an authenticated request as an expired/invalid session.
    // Clear tokens and send the user to login once; avoid cascading redirects
    // from parallel requests.
    if (getAccessToken()) {
      clearTokens();
      redirectToLogin();
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `API error ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.message ?? json.error ?? message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return unwrapApiData<T>(await res.json());
}

/** Convenience helpers */
export const apiGet = <T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
) =>
  params
    ? api<T>(path, { method: "GET", params })
    : api<T>(path, { method: "GET" });

/** GET a paginated/list endpoint and return just the array of items. */
export const apiGetList = async <T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T[]> => {
  const payload = await api<unknown>(
    path,
    params ? { method: "GET", params } : { method: "GET" },
  );
  return unwrapApiList<T>(payload);
};

export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  body !== undefined
    ? api<T>(path, { method: "POST", body })
    : api<T>(path, { method: "POST" });

export const apiPatch = <T = unknown>(path: string, body?: unknown) =>
  body !== undefined
    ? api<T>(path, { method: "PATCH", body })
    : api<T>(path, { method: "PATCH" });

export const apiDelete = <T = unknown>(path: string) =>
  api<T>(path, { method: "DELETE" });
