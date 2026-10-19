import { NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/api-auth";

export async function GET(request: Request) {
  const unauthorized = requireApiSession(request);
  if (unauthorized) return unauthorized;

  const geminiKey =
    process.env.PPGSCOPE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";

  const supabaseConfigured = Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  return NextResponse.json({
    configured: Boolean(geminiKey && geminiKey.length > 0),
    supabaseConfigured,
  }, { headers: { "Cache-Control": "no-store" } });
}
