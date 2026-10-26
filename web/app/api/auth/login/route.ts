import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSessionToken, SESSION_TTL, verifyPassword } from "../../../../lib/auth";
import { clientKey, createRateLimiter } from "../../../../lib/rate-limit";

const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const loginLimiter = createRateLimiter({ maxAttempts: LOGIN_MAX_ATTEMPTS, windowMs: LOGIN_WINDOW_MS });

export async function POST(request: NextRequest) {
  const attemptKey = clientKey(request);
  const decision = loginLimiter.hit(attemptKey);
  if (!decision.allowed) {
    return NextResponse.json(
      { ok: false, error: "Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(decision.retryAfterSeconds) } },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const password = body?.password;

    if (!process.env.PPGSCOPE_AUTH_SECRET) {
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

    loginLimiter.reset(attemptKey);
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
