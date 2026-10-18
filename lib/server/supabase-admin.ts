/** Server-only Supabase helpers. Never import this file into a client component. */
export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseUser;
};

export type WorkspaceMembership = {
  workspace_id: string;
  role: "Owner" | "Admin" | "User";
  permissions: string[];
  workspace: { id: string; name: string; slug: string };
};

export function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing");
  }

  return { url, anonKey, serviceRoleKey };
}

export async function supabaseAuthRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; accessToken?: string } = {},
): Promise<{ response: Response; payload: T | null }> {
  const { url, anonKey } = getSupabaseAdminConfig();
  const headers = new Headers({ apikey: anonKey, Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);

  const response = await fetch(`${url}/auth/v1/${path.replace(/^\//, "")}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as T | null;
  return { response, payload };
}

export async function getSupabaseUser(accessToken: string): Promise<SupabaseUser | null> {
  const { response, payload } = await supabaseAuthRequest<SupabaseUser>("user", { accessToken });
  return response.ok && payload && typeof payload.id === "string" ? payload : null;
}

export async function getWorkspaceMembership(userId: string): Promise<WorkspaceMembership | null> {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const query = new URLSearchParams({
    select: "workspace_id,role,permissions,workspace:workspaces(id,name,slug)",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const response = await fetch(`${url}/rest/v1/workspace_memberships?${query}`, {
    headers: {
      apikey: serviceRoleKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null) as WorkspaceMembership[] | null;
  if (!response.ok) throw new Error("Could not load workspace membership");
  return rows?.[0] ?? null;
}

export async function callSupabaseRpc<T>(functionName: string, body: unknown): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload as { code?: string; message?: string } | null;
    const rpcError = new Error(error?.message ?? "Supabase request failed");
    Object.assign(rpcError, { code: error?.code, status: response.status });
    throw rpcError;
  }

  return payload as T;
}