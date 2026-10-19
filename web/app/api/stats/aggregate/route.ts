import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { requireApiSession } from "../../../../lib/api-auth";

interface AggregateArticle {
  published_at?: string;
  portal_domain?: string;
  domain?: string;
  locality?: string;
}

interface AggregateCube {
  global?: unknown;
  per_medium?: Record<string, unknown>;
}

interface DashboardAggregateData {
  generated_at?: string;
  recent_articles?: AggregateArticle[];
  server_aggregates?: Record<string, AggregateCube>;
}

export async function GET(req: NextRequest) {
  const unauthorized = requireApiSession(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const preset = searchParams.get("preset") || "30d";
    const domainFilter = searchParams.get("domain") || "ALL";

    // Read cached server-side dashboard data
    const dataPath = path.join(process.cwd(), "public", "data", "dashboard.json");
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: "Dashboard data not found" }, { status: 404 });
    }

    const rawData = fs.readFileSync(dataPath, "utf-8");
    const dashboard = JSON.parse(rawData) as DashboardAggregateData;

    // If pre-computed server aggregates exist for this preset
    if (dashboard.server_aggregates && dashboard.server_aggregates[preset]) {
      const presetCube = dashboard.server_aggregates[preset];
      if (domainFilter === "ALL" && presetCube.global) {
        return NextResponse.json({
          ok: true,
          source: "server_preaggregated_cube",
          preset,
          domain: domainFilter,
          aggregates: presetCube.global,
        });
      }
      if (domainFilter !== "ALL" && presetCube.per_medium?.[domainFilter]) {
        return NextResponse.json({
          ok: true,
          source: "server_preaggregated_cube",
          preset,
          domain: domainFilter,
          aggregates: presetCube.per_medium[domainFilter],
        });
      }
    }

    // Dynamic server-side aggregation for specific media domain or custom filter
    const articles = dashboard.recent_articles || [];
    const now = new Date(dashboard.generated_at || Date.now());
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
      source: "server_dynamic_aggregation",
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
    const message = err instanceof Error ? err.message : "Błąd agregacji danych.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
