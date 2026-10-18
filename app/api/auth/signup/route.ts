import { NextResponse } from "next/server";
import { supabaseAuthRequest, type SupabaseSession } from "@/lib/server/supabase-admin";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  authCookieOptions,
  isSameOriginRequest,
} from "@/lib/server/session";


const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      { error: "Send valid signup details." },
      { status: 400 },
    );
  }

  const fullName =
    typeof input.fullName === "string" ? input.fullName.trim() : "";
  const workspaceName =
    typeof input.workspaceName === "string" ? input.workspaceName.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (
    !fullName ||
    fullName.length > 100 ||
    !workspaceName ||
    workspaceName.length > 120 ||
    !emailPattern.test(email) ||
    email.length > 254 ||
    password.length < 8 ||
    password.length > 72
  ) {
    return NextResponse.json(
      { error: "Check your name, workspace, email, and password, then try again." },
      { status: 400 },
    );
  }

  try {
    const { response: authResponse, payload } =
      await supabaseAuthRequest<
        SupabaseSession & { session?: SupabaseSession | null }
      >("signup", {
        method: "POST",
        body: {
          email,
          password,
          data: {
            full_name: fullName,
            workspace_name: workspaceName,
          },
        },
      });

    if (!authResponse.ok || !payload) {
      return NextResponse.json(
        {
          error:
            "Unable to create the account. Check your details or try logging in.",
        },
        { status: 400 },
      );
    }

    const session =
      payload.session ??
      (payload.access_token ? (payload as SupabaseSession) : null);

    if (!session?.access_token || !session.refresh_token) {
      return NextResponse.json(
        { requiresEmailConfirmation: true },
        { status: 200 },
      );
    }

    const result = NextResponse.json(
      { authenticated: true },
      { status: 200 },
    );

    result.cookies.set(
      ACCESS_COOKIE,
      session.access_token,
      authCookieOptions(session.expires_in || 3600),
    );
    result.cookies.set(
      REFRESH_COOKIE,
      session.refresh_token,
      authCookieOptions(60 * 60 * 24 * 30),
    );

    return result;
  } catch (error) {
    console.error(
      "Signup service failed",
      error instanceof Error ? error.message : "unknown error",
    );

    return NextResponse.json(
      { error: "Sign-up is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}