const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

/**
 * Read a token from localStorage, treating the literal strings "undefined"
 * and "null" as missing. Older builds could persist those values when the API
 * response was not parsed correctly, which made `isAuthenticated()` pass with
 * an invalid token and caused a 401 → logout redirect loop.
 */
function readToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(key);
  if (!value || value === "undefined" || value === "null") return null;
  return value;
}

export function getAccessToken(): string | null {
  return readToken(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return readToken(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function setTokens(accessToken: string, refreshToken?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

let redirectingToLogin = false;

export function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  window.location.replace("/login");
}

export function logout() {
  clearTokens();
  redirectToLogin();
}
