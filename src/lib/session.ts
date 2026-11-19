import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

function apiUrl(path: string) {
  return new URL(path, BASE_URL).toString();
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(apiUrl("/api/v1/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const data = json?.data ?? json;
    if (!data?.accessToken) return false;
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * Confirms the stored session with the API. A token that is only present in
 * localStorage is not proof of login: it may be expired or revoked.
 *
 * - No token: not signed in.
 * - Token accepted: signed in.
 * - Token rejected: try the refresh token; if that fails, clear the session.
 * - Network failure: keep the session so an API outage does not sign people out.
 */
export async function verifySession(): Promise<boolean> {
  const token = getAccessToken();
  if (!token) return false;

  let status: number;
  try {
    const res = await fetch(apiUrl("/api/v1/users/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    status = res.status;
    if (res.ok) return true;
  } catch {
    return true;
  }

  if (status === 401 || status === 403) {
    if (await refreshTokens()) return true;
    clearTokens();
    return false;
  }
  return true;
}
