export type EdgeIngestAction = "run" | "status";

export async function invokeIngestFunction(action: EdgeIngestAction): Promise<Record<string, unknown>> {
  const baseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (!baseUrl || !anonKey || !cronSecret) throw new Error("Ingest edge function is not configured.");

  const response = await fetch(`${baseUrl}/functions/v1/ppg-ingest`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      "x-ppg-cron-secret": cronSecret,
    },
    body: JSON.stringify({ action }),
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  const payload = (await response.json().catch(() => ({ error: "Invalid edge function response." }))) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Supabase Edge Function ${response.status}`);
  return payload;
}
