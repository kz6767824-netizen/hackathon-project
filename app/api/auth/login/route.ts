import { NextResponse } from "next/server";
import { supabaseAuthRequest, type SupabaseSession } from "@/lib/server/supabase-admin";
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

  let input: Record<string, unknown>;

  try {
    const raw = await request.text();

    if (new TextEncoder().encode(raw).byteLength > 16_384) {
      return NextResponse.json(
        { error: "The request is too large." },
        { status: 413 },
      );
    }

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error();
    }

    input = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Send valid login details." },
      { status: 400 },
    );
  }

  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!email || email.length > 254 || !password || password.length > 72) {
    return NextResponse.json(
      { error: "Enter a valid email address and password." },
      { status: 400 },
    );
  }

  try {
    const { response: authResponse, payload } =
      await supabaseAuthRequest<SupabaseSession>("token?grant_type=password", {
        method: "POST",
        body: { email, password },
      });

    if (!authResponse.ok || !payload?.access_token || !payload.refresh_token) {
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 },
      );
    }

    const result = NextResponse.json(
      { authenticated: true },
      { status: 200 },
    );

    result.cookies.set(
      ACCESS_COOKIE,
      payload.access_token,
      authCookieOptions(payload.expires_in || 3600),
    );
    result.cookies.set(
      REFRESH_COOKIE,
      payload.refresh_token,
      authCookieOptions(60 * 60 * 24 * 30),
    );

    return result;
  } catch (error) {
    console.error(
      "Login service failed",
      error instanceof Error ? error.message : "unknown error",
    );

    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}