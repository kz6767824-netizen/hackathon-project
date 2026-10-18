import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "lg-access-token";
const REFRESH_COOKIE = "lg-refresh-token";

type RefreshSession = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

function setSessionCookies(response: NextResponse, session: RefreshSession) {
  const secure = process.env.NODE_ENV === "production";

  if (session.access_token) {
    response.cookies.set(ACCESS_COOKIE, session.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: session.expires_in || 3600,
    });
  }

  if (session.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

function clearSessionCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production";

  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

async function isValidAccessToken(
  url: string,
  publishableKey: string,
  accessToken: string,
) {
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  return response.ok;
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const publishableKey =
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const nextResponse = () => NextResponse.next();

  const unauthenticated = () =>
    isApi
      ? NextResponse.json(
          { error: "Sign in to continue." },
          { status: 401 },
        )
      : NextResponse.redirect(new URL("/login", request.url));

  if (!url || !publishableKey) {
    return unauthenticated();
  }

  try {
    if (
      accessToken &&
      (await isValidAccessToken(url, publishableKey, accessToken))
    ) {
      return nextResponse();
    }

    if (refreshToken) {
      const refreshResponse = await fetch(
        `${url}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: {
            apikey: publishableKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
          cache: "no-store",
        },
      );

      const session = (await refreshResponse.json().catch(() => null)) as
        | RefreshSession
        | null;

      if (
        refreshResponse.ok &&
        session?.access_token &&
        session.refresh_token
      ) {
        request.cookies.set(ACCESS_COOKIE, session.access_token);
        request.cookies.set(REFRESH_COOKIE, session.refresh_token);
        const forwarded = new Headers(request.headers);
        forwarded.set("cookie", request.cookies.toString());
        const response = NextResponse.next({ request: { headers: forwarded } });
        setSessionCookies(response, session);
        return response;
      }
    }
  } catch {
    // Fail closed if the authentication service is unavailable.
  }

  const response = unauthenticated();
  clearSessionCookies(response);
  return response;
}

export const config = {
  matcher: [
    "/",
    "/contacts/:path*",
    "/companies/:path*",
    "/pipeline/:path*",
    "/opportunities/:path*",
    "/employees/:path*",
    "/recovery/:path*",
    "/settings/:path*",
    "/api/me",
  ],
};