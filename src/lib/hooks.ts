import { useEffect, useState } from "react";
import { getAccessToken } from "./auth";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Decode basic user info from the JWT access-token.
 * Falls back to a minimal object if the token is missing or malformed.
 */
function decodeUser(): CurrentUser | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const parts = token.split(".");
    const segment = parts[1];
    if (!segment) return { id: "", name: "Admin", email: "", role: "admin" };
    const payload = JSON.parse(atob(segment));
    return {
      id: payload.sub ?? payload.id ?? "",
      name: payload.name ?? payload.firstName ?? (payload.email ? String(payload.email).split("@")[0] : "Admin"),
      email: payload.email ?? "",
      role: payload.role ?? "admin",
    };
  } catch {
    return { id: "", name: "Admin", email: "", role: "admin" };
  }
}

export function isSuperAdminRole(role: string | undefined | null) {
  const r = String(role ?? "").toLowerCase();
  return r === "super_admin" || r === "admin";
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(() => decodeUser());

  useEffect(() => {
    setUser(decodeUser());
  }, []);

  return { user, isAuthenticated: !!user, isSuperAdmin: isSuperAdminRole(user?.role) };
}
