import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/api-auth";
import { invokeIngestFunction } from "../../../../lib/server/edge-ingest";

export async function GET(request: NextRequest) {
  const unauthorized = requireApiSession(request);
  if (unauthorized) return unauthorized;

  try {
    return NextResponse.json(await invokeIngestFunction("status"), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { configured: false, error: error instanceof Error ? error.message : "Ingest storage unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
