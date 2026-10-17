import { NextResponse } from "next/server";

export async function GET() {
  const geminiKey =
    process.env.PPGSCOPE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://nkeoyouxtschemvpqgmq.supabase.co";

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  return NextResponse.json({
    configured: Boolean(geminiKey && geminiKey.length > 0),
    key: geminiKey || "",
    supabaseUrl,
    supabaseAnonKey,
  });
}
