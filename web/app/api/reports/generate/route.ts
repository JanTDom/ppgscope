import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/api-auth";
import {
  generateInvestigationReport,
  type AnalysisAngle,
  type InvestigationArticle,
} from "../../../../lib/investigation-report";

export const maxDuration = 30;

const PPG_DOMAINS = [
  "i.pl",
  "dziennikzachodni.pl",
  "gazetakrakowska.pl",
  "naszemiasto.pl",
  "dziennikbaltycki.pl",
  "pomorska.pl",
  "gloswielkopolski.pl",
  "gazetawroclawska.pl",
  "nowiny24.pl",
  "echodnia.eu",
  "kurierlubelski.pl",
  "dziennikpolski24.pl",
  "strefabiznesu.pl",
  "expressbydgoski.pl",
];

async function fetchLivePPGArticles(topic: string): Promise<InvestigationArticle[]> {
  try {
    const domainQuery = PPG_DOMAINS.map((d) => `site:${d}`).join(" OR ");
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      `"${topic}" (${domainQuery})`
    )}&hl=pl&gl=PL&ceid=PL:pl`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch(googleNewsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) return [];

    const xml = await resp.text();
    const rawItems = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: InvestigationArticle[] = [];
    const seenTitles = new Set<string>();

    for (const it of rawItems) {
      const rawTitle = it.match(/<title>(.*?)<\/title>/)?.[1] || "";
      const cleanTitle = rawTitle
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();

      const link = it.match(/<link>(.*?)<\/link>/)?.[1] || "";
      const pubDate = it.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
      const source = it.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || "Polska Press";

      if (!cleanTitle) continue;

      const normTitle = cleanTitle.toLowerCase();
      // Determine domain
      let domain = "i.pl";
      for (const d of PPG_DOMAINS) {
        if (source.toLowerCase().includes(d.replace(".pl", "")) || link.includes(d)) {
          domain = d;
          break;
        }
      }

      const isDuplicate = seenTitles.has(normTitle.slice(0, 40));
      seenTitles.add(normTitle.slice(0, 40));

      const publishedIso = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();

      articles.push({
        id: `live-${articles.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
        title: cleanTitle,
        url: link,
        portal_name: source,
        portal_domain: domain,
        published_at: publishedIso,
        is_duplicate: isDuplicate,
        byline_type: isDuplicate ? "wire" : "named",
        locality: domain === "i.pl" ? "C" : "L",
      });
    }

    return articles;
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = requireApiSession(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json().catch(() => ({}));
    const topic = (body.topic || "").trim();
    const expectations = (body.expectations || "").trim();
    const angle: AnalysisAngle = body.angle || "GOVERNMENT_PROMOTION";
    const clientArticles: InvestigationArticle[] = Array.isArray(body.clientArticles) ? body.clientArticles : [];

    if (!topic) {
      return NextResponse.json({ ok: false, error: "Brak podanego tematu raportu." }, { status: 400 });
    }

    // 1. Fetch live articles from PPG Google News RSS
    const liveArticles = await fetchLivePPGArticles(topic);

    // 2. Merge client articles with live articles, deduplicating by title
    const mergedMap = new Map<string, InvestigationArticle>();
    for (const art of liveArticles) {
      mergedMap.set(art.title.toLowerCase().slice(0, 45), art);
    }
    for (const art of clientArticles) {
      const key = art.title.toLowerCase().slice(0, 45);
      if (!mergedMap.has(key)) {
        mergedMap.set(key, art);
      }
    }

    const allArticles = Array.from(mergedMap.values());

    // 3. Generate report
    const report = generateInvestigationReport({
      articles: allArticles,
      topic,
      expectations,
      angle,
      datasetMode: liveArticles.length > 0 ? "live_rss_and_snapshot" : "snapshot_only",
      datasetGeneratedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      report,
      liveFound: liveArticles.length,
      totalAnalyzed: allArticles.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Błąd generowania raportu." },
      { status: 500 }
    );
  }
}
