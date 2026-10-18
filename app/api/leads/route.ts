import { callSupabaseRpc } from "@/lib/server/supabase-admin";


type CreateLeadRow = {
  id: string;
  status: "new";
  created_at: string;
};

const jsonError = (message: string, status: number) =>
  Response.json({ error: message }, { status });

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : null;
}

export async function POST(request: Request) {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return jsonError("We couldn't read the enquiry. Please try again.", 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > 16_384) {
    return jsonError("The enquiry is too large.", 413);
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonError("Send the enquiry as valid JSON.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Send the enquiry as a JSON object.", 400);
  }

  const input = body as Record<string, unknown>;
  const workspaceSlug = readText(input.workspaceSlug, 63)?.toLowerCase();
  const name = readText(input.name, 120);
  const emailValue = readText(input.email ?? "", 254);
  const phoneValue = readText(input.phone ?? "", 40);
  const message = readText(input.message ?? "", 5_000);

  if (!workspaceSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workspaceSlug)) {
    return jsonError("A valid workspace slug is required.", 400);
  }

  if (!name) {
    return jsonError("Name is required.", 400);
  }

  if (emailValue === null || phoneValue === null || message === null) {
    return jsonError("One or more enquiry fields are too long or invalid.", 400);
  }

  const email = emailValue || null;
  const phone = phoneValue || null;

  if (!email && !phone) {
    return jsonError("Provide an email address or phone number.", 400);
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Enter a valid email address.", 400);
  }

  if (phone && !/^[+\d().\-\s]{5,40}$/.test(phone)) {
    return jsonError("Enter a valid phone number.", 400);
  }

  try {
    const rows = await callSupabaseRpc<CreateLeadRow[]>("create_public_lead", {
      p_workspace_slug: workspaceSlug,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_message: message,
    });

    const lead = rows[0];

    if (!lead?.id || !lead.created_at) {
      console.error("create_public_lead returned an unexpected response");
      return jsonError("We couldn't save your enquiry. Please try again.", 500);
    }

    return Response.json(
      {
        id: lead.id,
        status: lead.status,
        createdAt: lead.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    const rpcError = error as Error & { code?: string };

    if (rpcError.code === "P0002") {
      return jsonError("This enquiry form is unavailable.", 404);
    }

    console.error("Failed to create public lead", { code: rpcError.code });
    return jsonError("We couldn't save your enquiry. Please try again.", 500);
  }
}