import { NextRequest, NextResponse } from "next/server";
import { invokeIngestFunction } from "../../../../lib/server/edge-ingest";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const summary = await invokeIngestFunction("run");
    return NextResponse.json({ ok: true, ...summary }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Ingest failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
