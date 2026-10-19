type SupabaseRequestInit = RequestInit & { query?: string };

interface SupabaseAdminConfig {
  url: string;
  serviceRoleKey: string;
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server storage is not configured.");
  }

  return { url, serviceRoleKey };
}

export async function supabaseAdminRequest<T>(table: string, init: SupabaseRequestInit = {}): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const endpoint = `${url}/rest/v1/${table}${init.query ? `?${init.query}` : ""}`;
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("Authorization", `Bearer ${serviceRoleKey}`);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(endpoint, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Supabase ${response.status} on ${table}: ${detail}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function supabaseAdminInsert<T>(table: string, rows: unknown[], query = ""): Promise<T> {
  return supabaseAdminRequest<T>(table, {
    method: "POST",
    query,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
}

export async function supabaseAdminUpsert<T>(table: string, rows: unknown[], onConflict: string): Promise<T> {
  return supabaseAdminRequest<T>(table, {
    method: "POST",
    query: `on_conflict=${encodeURIComponent(onConflict)}`,
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });
}

export async function supabaseAdminPatch<T>(table: string, query: string, row: unknown): Promise<T> {
  return supabaseAdminRequest<T>(table, {
    method: "PATCH",
    query,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
}
