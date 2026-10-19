import { NextRequest, NextResponse } from "next/server";

import { runForensics, type ForensicsPayload } from "@/lib/forensics/run";

const CACHE_TTL_MS = 5 * 60_000;

let cached: { payload: ForensicsPayload; storedAtMs: number } | null = null;

/**
 * Szyba śledcza: pobiera na żywo kanały RSS dzienników PPG, konkurentów i instytucji oraz zwraca
 * wyniki analizy. Wynik jest trzymany w pamięci przez 5 minut, żeby odświeżanie widoku nie
 * generowało lawiny zapytań do cudzych serwerów; `?refresh=1` pomija pamięć podręczną.
 */
export async function GET(req: NextRequest) {
  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";
  const nowMs = Date.now();
  try {
    if (!forceRefresh && cached && nowMs - cached.storedAtMs < CACHE_TTL_MS) {
      return NextResponse.json({ ok: true, cached: true, ...cached.payload });
    }
    const payload = await runForensics(nowMs);
    cached = { payload, storedAtMs: nowMs };
    return NextResponse.json({ ok: true, cached: false, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany błąd";
    return NextResponse.json({ ok: false, error: `Nie udało się wykonać analizy: ${message}` }, { status: 502 });
  }
}
