import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "../../../../lib/auth";

export function GET(request: NextRequest) {
  return NextResponse.json(
    { ok: true, authenticated: isAuthenticated(request) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
