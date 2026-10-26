import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/api-auth";
import { scanLiveArticles } from "../../../../lib/server/live-scanner";


export async function GET(req: NextRequest) {
  const unauthorized = requireApiSession(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const preset = searchParams.get("preset") || "24h";
    const domainFilter = searchParams.get("domain") || "ALL";

    // 1. Fetch live scanned articles directly in-flight from publisher feeds (no database)
    const scan = await scanLiveArticles(domainFilter);
    const articles = scan.articles;

    const now = new Date();
    let start: Date;

    if (preset === "24h") {
      start = new Date(now.getTime() - 24 * 3600 * 1000);
    } else if (preset === "7d") {
      start = new Date(now.getTime() - 7 * 86400 * 1000);
    } else if (preset === "30d") {
      start = new Date(now.getTime() - 30 * 86400 * 1000);
    } else if (preset === "90d") {
      start = new Date(now.getTime() - 90 * 86400 * 1000);
    } else if (preset === "1y") {
      start = new Date(now.getTime() - 365 * 86400 * 1000);
    } else {
      start = new Date("2024-03-09T08:00:00+01:00");
    }

    const filtered = articles.filter((a) => {
      const pub = new Date(a.published_at ?? "");
      const matchesTime = pub >= start && pub <= now;
      const matchesDomain = domainFilter === "ALL" || a.portal_domain === domainFilter;
      return matchesTime && matchesDomain;
    });

    const DOMAINS = [
      "wladza", "zdarzenia", "obronnosc", "gospodarka", "infrastruktura", "przestrzen",
      "zdrowie", "edukacja", "srodowisko", "spolecznosc", "kultura", "historia",
      "czas_wolny", "sport", "rozrywka", "styl_zycia", "rolnictwo", "swiat"
    ];

    const counts: Record<string, { c: number; cl: number; l: number; total: number }> = {};
    DOMAINS.forEach((d) => {
      counts[d] = { c: 0, cl: 0, l: 0, total: 0 };
    });

    let countC = 0;
    let countCL = 0;
    let countL = 0;

    filtered.forEach((a) => {
      const dom = a.domain || "spolecznosc";
      const loc = a.locality || "C";
      if (!counts[dom]) {
        counts[dom] = { c: 0, cl: 0, l: 0, total: 0 };
      }
      if (loc === "L") {
        counts[dom].l += 1;
        countL += 1;
      } else if (loc === "CL") {
        counts[dom].cl += 1;
        countCL += 1;
      } else {
        counts[dom].c += 1;
        countC += 1;
      }
      counts[dom].total += 1;
    });

    const totalCount = filtered.length;
    const localContentShare = totalCount > 0 ? (countL + countCL) / totalCount : 0.0;
    const localizationIndex = countC + countCL > 0 ? countCL / (countC + countCL) : 0.0;

    return NextResponse.json({
      ok: true,
      source: "live_in_flight_aggregation_no_db",
      scanned_at: scan.scanned_at,
      preset,
      domain: domainFilter,
      aggregates: {
        total_articles: totalCount,
        count_c: countC,
        count_cl: countCL,
        count_l: countL,
        local_content_share: Math.round(localContentShare * 1000) / 10,
        localization_index: Math.round(localizationIndex * 1000) / 10,
        domains: counts,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd dynamicznej agregacji danych.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
