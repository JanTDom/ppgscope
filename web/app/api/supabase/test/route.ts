import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const effectiveUrl =
      body.url ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "https://nkeoyouxtschemvpqgmq.supabase.co";

    const effectiveKey =
      body.anonKey ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!effectiveKey) {
      return NextResponse.json(
        { ok: false, error: "Brak klucza anonimowego Supabase." },
        { status: 400 }
      );
    }

    const t0 = Date.now();
    const endpoint = `${effectiveUrl.replace(/\/$/, "")}/rest/v1/articles?select=count`;
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: effectiveKey,
        Authorization: `Bearer ${effectiveKey}`,
      },
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
    const count = Array.isArray(data) && data[0]?.count !== undefined ? data[0].count : null;

    return NextResponse.json({
      ok: true,
      latency_ms: latency,
      records_count: count,
      message: `Połączenie z bazą Supabase aktywne (${count !== null ? count : 0} artykułów w tabeli)`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Błąd sieci podczas łączenia z Supabase." },
      { status: 500 }
    );
  }
}
