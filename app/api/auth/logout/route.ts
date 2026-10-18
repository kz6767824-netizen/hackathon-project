import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAuthRequest } from "@/lib/server/supabase-admin";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  authCookieOptions,
  isSameOriginRequest,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

  if (accessToken) {
    try {
      await supabaseAuthRequest("logout", {
        method: "POST",
        accessToken,
      });
    } catch (error) {
      console.error(
        "Logout provider request failed",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  const result = NextResponse.json(
    { authenticated: false },
    { status: 200 },
  );

  result.cookies.set(ACCESS_COOKIE, "", authCookieOptions(0));
  result.cookies.set(REFRESH_COOKIE, "", authCookieOptions(0));

  return result;
}