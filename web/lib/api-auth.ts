import { NextResponse } from "next/server";
import { isAuthenticated } from "./auth";

export function requireApiSession(request: Request): NextResponse | null {
  if (isAuthenticated(request)) return null;

  return NextResponse.json(
    { ok: false, error: "Wymagana autoryzowana sesja analityczna." },
    {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
