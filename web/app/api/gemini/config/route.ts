import { NextResponse } from "next/server";

export async function GET() {
  const key =
    process.env.PPGSCOPE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";

  return NextResponse.json({
    configured: Boolean(key && key.length > 0),
    key: key || "",
  });
}
