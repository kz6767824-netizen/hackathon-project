import { cookies } from "next/headers";
import {
  getSupabaseUser,
  getWorkspaceMembership,
  type SupabaseUser,
  type WorkspaceMembership,
} from "./supabase-admin";

export const ACCESS_COOKIE = "lg-access-token";
export const REFRESH_COOKIE = "lg-refresh-token";

export type AuthContext = {
  user: SupabaseUser;
  membership: WorkspaceMembership;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  const user = await getSupabaseUser(accessToken);
  if (!user) return null;

  const membership = await getWorkspaceMembership(user.id);
  if (!membership) return null;

  return { user, membership };
}

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}