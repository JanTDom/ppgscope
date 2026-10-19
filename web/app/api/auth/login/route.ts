import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSessionToken, SESSION_TTL, verifyPassword } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = body?.password;

    if (!process.env.PPGSCOPE_AUTH_PASSWORD || !process.env.PPGSCOPE_AUTH_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Autoryzacja nie jest skonfigurowana na serwerze." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { ok: false, error: "Nieprawidłowe hasło." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const token = createSessionToken();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Nie można utworzyć bezpiecznej sesji." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL,
    });
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Nieprawidłowe żądanie logowania." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
