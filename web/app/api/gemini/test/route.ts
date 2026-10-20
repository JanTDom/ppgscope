import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/api-auth";

export async function POST(req: NextRequest) {
  const unauthorized = requireApiSession(req);
  if (unauthorized) return unauthorized;

  try {
    const effectiveKey =
      process.env.PPGSCOPE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!effectiveKey) {
      return NextResponse.json(
        { ok: false, error: "Brak klucza API Gemini." },
        { status: 400 }
      );
    }

    const t0 = Date.now();
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "Odpowiedz dokładnie jednym słowem: POŁĄCZENIE_ZWERYFIKOWANE" }],
          },
        ],
      }),
    });

    const latency = Date.now() - t0;

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { ok: false, status: response.status, error: errText, latency_ms: latency },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return NextResponse.json({
      ok: true,
      model,
      latency_ms: latency,
      reply,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd sieciowy podczas sprawdzania Gemini API";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
