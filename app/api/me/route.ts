import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json(
        { error: "Sign in to continue." },
        { status: 401 },
      );
    }

    const { user, membership } = context;
    const metadataName = user.user_metadata?.full_name;

    return NextResponse.json({
      id: user.id,
      name:
        typeof metadataName === "string" && metadataName.trim()
          ? metadataName
          : user.email ?? "User",
      email: user.email ?? null,
      role: membership.role,
      permissions: membership.permissions,
      workspace: membership.workspace,
    });
  } catch (error) {
    console.error(
      "Could not load signed-in user",
      error instanceof Error ? error.message : "unknown error",
    );

    return NextResponse.json(
      { error: "Sign-in service is temporarily unavailable." },
      { status: 503 },
    );
  }
}