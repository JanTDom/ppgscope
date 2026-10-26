import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/api-auth";
import { scanLiveArticles } from "../../../../lib/server/live-scanner";


export async function GET(req: NextRequest) {
  const unauthorized = requireApiSession(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") || "gazetakrakowska.pl";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const scanResult = await scanLiveArticles(domain);

    const articles = limit > 0 ? scanResult.articles.slice(0, limit) : scanResult.articles;

    return NextResponse.json({
      ok: true,
      source: scanResult.source,
      portal_domain: domain,
      scanned_at: scanResult.scanned_at,
      articles_count: articles.length,
      articles_24h_count: scanResult.articles_24h_count,
      articles,
      note: "Publikacje pobrane w locie na żywo z serwerów wydawcy bez gromadzenia w bazie danych.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd pobierania publikacji w locie.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
