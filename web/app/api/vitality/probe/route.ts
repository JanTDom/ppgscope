import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/api-auth";

interface ParsedFeedItem {
  title: string;
  link: string;
  pubDate: string;
  isUniqueLocal: boolean;
  isDiscoverBait: boolean;
  isCronMinute: boolean;
}

export async function GET(req: NextRequest) {
  const unauthorized = requireApiSession(req);
  if (unauthorized) return unauthorized;

  const t0 = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const domain = (searchParams.get("domain") || "gazetakrakowska.pl").trim().toLowerCase();

    if (domain === "polskatimes.pl") {
      return NextResponse.json({
        ok: true,
        domain,
        probed_at: new Date().toISOString(),
        http_status: 410,
        latency_ms: Date.now() - t0,
        vitality_status: "MARTWY",
        vitality_label: "Martwy / wygaszony (HTTP 410 Gone)",
        vitality_score: 0,
        feed_items_count: 0,
        unique_local_count: 0,
        uniqueness_pct: 0,
        syndicated_clones_pct: 0,
        discover_bait_pct: 0,
        cron_scheduled_pct: 0,
        hours_since_last_pub: 999,
        homepage_lead_title: null,
        homepage_paywall_markers: 0,
        homepage_sponsored_markers: 0,
        diagnosis:
          "Domena polskatimes.pl zwraca status HTTP 410 Gone (wygaszona w portfelu PPG i zastąpiona portalem i.pl).",
        sample_titles: [],
      });
    }

    const browserHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml, text/html, */*",
    };

    let xmlText = "";
    let httpStatus = 200;
    let sourceUsed = "direct_rss";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const rssResp = await fetch(`https://${domain}/rss`, {
        headers: browserHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      httpStatus = rssResp.status;
      if (rssResp.ok) {
        xmlText = await rssResp.text();
      }
    } catch {
      httpStatus = 502;
    }

    if (!xmlText || !xmlText.includes("<item>")) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const gUrl = `https://news.google.com/rss/search?q=site:${domain}&hl=pl&gl=PL&ceid=PL:pl`;
        const gResp = await fetch(gUrl, {
          headers: browserHeaders,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (gResp.ok) {
          xmlText = await gResp.text();
          httpStatus = 200;
          sourceUsed = "google_news_index";
        }
      } catch {
        // Ignore fallback error
      }
    }

    // Optional lightweight homepage check for paywall / partner / lead signals
    let homepageLead: string | null = null;
    let homepagePaywallMarkers = 0;
    let homepageSponsoredMarkers = 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const hpResp = await fetch(`https://${domain}`, {
        headers: browserHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (hpResp.ok) {
        const hpHtml = await hpResp.text();
        const h1Match =
          hpHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
          hpHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        if (h1Match) {
          const cleaned = h1Match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (cleaned.length > 12) homepageLead = cleaned;
        }
        const pwMatches = hpHtml.match(/(?:strefa-plus|plus-badge|paywall|isAccessibleForFree[\"\']?\s*:\s*false)/gi);
        homepagePaywallMarkers = pwMatches ? pwMatches.length : 0;
        const spMatches = hpHtml.match(/(?:materia[łl]\s+partnera|artyku[łl]\s+sponsorowany|rel=[\"\']sponsored[\"\'])/gi);
        homepageSponsoredMarkers = spMatches ? spMatches.length : 0;
      }
    } catch {
      // Homepage check is supplementary
    }

    const items: ParsedFeedItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    const citySlug = domain.split(".")[0].replace(/24$/, "");
    const discoverRe =
      /(?:kiedy\s+wyp[łl]at|ile\s+wynosi|komu\s+przys[łl]uguje|pilny\s+komunikat|nowe\s+limity|sprawd[źz]\s+czy|quiz\s+z\s+prl|horoskop|zus\s+wyp[łl]a)/i;
    const localCluesRe = new RegExp(
      `(?:${citySlug}|powiat|gmin|prezydent|burmistrz|w[óo]jt|radn|szpital|policj|stra[żz]|ul\\.|w\\s+regionie|mieszkańc)`,
      "i"
    );

    while ((match = itemRegex.exec(xmlText)) !== null && items.length < 30) {
      const content = match[1];
      const tMatch =
        content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
        content.match(/<title>([\s\S]*?)<\/title>/i);
      const lMatch =
        content.match(/<link>([\s\S]*?)<\/link>/i) ||
        content.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
      const pMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

      const rawTitle = tMatch ? tMatch[1].replace(/ - [^-]+$/, "").trim() : "";
      const rawLink = lMatch ? lMatch[1].trim() : "";
      const rawDate = pMatch ? pMatch[1].trim() : "";

      if (rawTitle) {
        const isDiscover = discoverRe.test(rawTitle);
        const isLocal = !isDiscover && localCluesRe.test(rawTitle);
        let isCron = false;
        if (rawDate) {
          const dt = new Date(rawDate);
          if (!isNaN(dt.getTime()) && [0, 15, 30, 45].includes(dt.getMinutes()) && dt.getSeconds() === 0) {
            isCron = true;
          }
        }
        items.push({
          title: rawTitle,
          link: rawLink,
          pubDate: rawDate,
          isUniqueLocal: isLocal,
          isDiscoverBait: isDiscover,
          isCronMinute: isCron,
        });
      }
    }

    const latencyMs = Date.now() - t0;
    const total = items.length;

    if (total === 0) {
      return NextResponse.json({
        ok: true,
        domain,
        probed_at: new Date().toISOString(),
        source_used: sourceUsed,
        http_status: httpStatus,
        latency_ms: latencyMs,
        vitality_status: "MARTWY",
        vitality_label: "Martwy / brak aktywnego strumienia RSS i Google News",
        vitality_score: 0,
        feed_items_count: 0,
        unique_local_count: 0,
        uniqueness_pct: 0,
        syndicated_clones_pct: 0,
        discover_bait_pct: 0,
        cron_scheduled_pct: 0,
        hours_since_last_pub: 999,
        homepage_lead_title: homepageLead,
        homepage_paywall_markers: homepagePaywallMarkers,
        homepage_sponsored_markers: homepageSponsoredMarkers,
        diagnosis: `Brak jakichkolwiek wpisów w kanale RSS oraz indeksie Google News dla domeny ${domain}.`,
        sample_titles: [],
      });
    }

    const uniqueCount = items.filter((i) => i.isUniqueLocal).length;
    const discoverCount = items.filter((i) => i.isDiscoverBait).length;
    const cronCount = items.filter((i) => i.isCronMinute).length;

    const uniquenessPct = Math.round((uniqueCount / total) * 1000) / 10;
    const syndicatedPct = Math.round((100 - uniquenessPct) * 10) / 10;
    const discoverPct = Math.round((discoverCount / total) * 1000) / 10;
    const cronPct = Math.round((cronCount / total) * 1000) / 10;

    let hoursSinceLast = 0.5;
    if (items[0]?.pubDate) {
      const parsedLatest = new Date(items[0].pubDate).getTime();
      if (!isNaN(parsedLatest)) {
        hoursSinceLast = Math.max(0.1, Math.round(((Date.now() - parsedLatest) / 3600000) * 10) / 10);
      }
    }

    let vitalityStatus = "AKTYWNY_SYNDYKAT";
    let vitalityLabel = "Czynny maszynowo (klon syndykatowy)";
    let vitalityScore = 54.0;
    let diagnosis = "";

    if (hoursSinceLast >= 72) {
      vitalityStatus = "MARTWY";
      vitalityLabel = "Martwy / zamrożony (> 72h bez publikacji)";
      vitalityScore = 5.0;
      diagnosis = `Ostatnia publikacja w strumieniu miała miejsce ${hoursSinceLast}h temu.`;
    } else if (hoursSinceLast >= 14 || total <= 4) {
      vitalityStatus = "LEDWO_ZYWY";
      vitalityLabel = "Ledwo żywy (śladowa aktywność)";
      vitalityScore = 28.5;
      diagnosis = `W strumieniu wykryto jedynie ${total} pozycji (ostatnia ${hoursSinceLast}h temu), w tym ${uniqueCount} o cechach lokalnych.`;
    } else if (uniqueCount <= 2 && cronPct >= 50) {
      vitalityStatus = "ZOMBIE_AUTOMAT";
      vitalityLabel = "Zombie (automat CMS i przedruki)";
      vitalityScore = 22.0;
      diagnosis = `Strumień zdominowany przez harmonogram automatyczny (${cronPct}% o pełnej minucie) i brak unikalnych tematów lokalnych.`;
    } else if (uniquenessPct >= 42) {
      vitalityStatus = "AKTYWNY_UNIKALNY";
      vitalityLabel = "Czynny (wysoka unikalność redakcyjna)";
      vitalityScore = Math.min(98, Math.round((55 + uniquenessPct * 0.42) * 10) / 10);
      diagnosis = `Aktywny strumień wydawniczy (ostatni tekst ${hoursSinceLast}h temu): ${uniquenessPct}% badanej próby zawiera lokalne podmioty i oryginalny kontekst.`;
    } else {
      vitalityStatus = "AKTYWNY_SYNDYKAT";
      vitalityLabel = "Czynny maszynowo (przewaga syndykacji)";
      vitalityScore = Math.round((38 + uniquenessPct * 0.45) * 10) / 10;
      diagnosis = `Serwis publikuje regularnie (ostatni wpis ${hoursSinceLast}h temu), ale ${syndicatedPct}% strumienia stanowią ogólnopolskie depesze i szablony Discover.`;
    }

    return NextResponse.json({
      ok: true,
      domain,
      probed_at: new Date().toISOString(),
      source_used: sourceUsed,
      http_status: httpStatus,
      latency_ms: latencyMs,
      vitality_status: vitalityStatus,
      vitality_label: vitalityLabel,
      vitality_score: vitalityScore,
      feed_items_count: total,
      unique_local_count: uniqueCount,
      uniqueness_pct: uniquenessPct,
      syndicated_clones_pct: syndicatedPct,
      discover_bait_pct: discoverPct,
      cron_scheduled_pct: cronPct,
      hours_since_last_pub: hoursSinceLast,
      homepage_lead_title: homepageLead || items[0]?.title || null,
      homepage_paywall_markers: homepagePaywallMarkers,
      homepage_sponsored_markers: homepageSponsoredMarkers,
      diagnosis,
      sample_titles: items.slice(0, 6),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Błąd sondy sieciowej";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
