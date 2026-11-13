#!/usr/bin/env node
/**
 * Headless Browser Hero Scanner dla Niezależnych Portali Lokalnych i Prasy Powiatowej (SGL).
 * Wykorzystuje silnik Chromium (Puppeteer) do detekcji rzeczywistej czołówki redakcyjnej (Slot #1)
 * w renderowanym DOM konkurentów Polska Press Grupa.
 */

const path = require('path');
const puppeteerPath = '/Users/macbookpro/.gemini/mcp-runtime/node_modules/puppeteer';
const puppeteer = require(puppeteerPath);

async function scanCompetitor(browser, target) {
  const { pair_id, domain, url, name } = target;
  let targetUrl = url || `https://${domain}`;
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (PPGscope-Benchmark/1.0)'
    );
    await page.setViewport({ width: 1440, height: 900 });

    // Blokowanie zbędnych ciężkich zasobów dla przyspieszenia skanu
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 14000 });
      await new Promise(r => setTimeout(r, 1000));
    } catch (navErr) {
      console.warn(`[WARN] Timeout nawigacji dla ${targetUrl}: ${navErr.message}`);
    }

    const data = await page.evaluate((domainName) => {
      // Usunięcie nakładek RODO / cookies
      const cmp = document.querySelector('[id*="sp_message"], .sp_veil, #didomi-host, [class*="cookie"], [id*="cookie"], [class*="modal"]');
      if (cmp) {
        try { 
          cmp.remove(); 
        } catch (cmpErr) {
          console.debug('Usunięcie banera cookies:', cmpErr.message);
        }
      }

      // Selekcja wszystkich linków artykułowych na stronie głównej
      const links = Array.from(document.querySelectorAll('a'));
      const candidates = [];

      for (const a of links) {
        const text = a.innerText ? a.innerText.trim().replace(/\s+/g, ' ') : '';
        const href = a.href || '';

        // Filtry długości i jakości tekstu
        if (text.length < 22 || text.length > 250) continue;
        if (!href.startsWith('http')) continue;

        // Odrzucenie linków funkcyjnych / serwisowych
        const isBlacklisted = /reklama|ogłoszenie|regulamin|polityka|pogoda|kurs walut|newsletter|zaloguj|dodaj|korki|kamery|kontakt|redakcja|cennik|rodo|facebook|twitter|instagram|youtube|tiktok/i.test(text + ' ' + href);
        if (isBlacklisted) continue;

        const rect = a.getBoundingClientRect();
        // Ograniczenie do górnego i środkowego obszaru strony głównej
        if (rect.top < 40 || rect.top > 1600) continue;

        const style = window.getComputedStyle(a);
        const fontSize = parseFloat(style.fontSize) || 16;
        const heading = a.querySelector('h1, h2, h3') || a.closest('h1, h2, h3');
        const isHeading = !!heading;

        // Szukanie autora lub kategorii w bloku artykułu
        let author = null;
        let category = null;
        const parent = a.closest('article, .news-item, .card, [class*="post"], [class*="item"]') || a.parentElement;
        if (parent) {
          const authorEl = parent.querySelector('[class*="author"], [class*="byline"], [rel="author"], [class*="user"]');
          if (authorEl) author = authorEl.innerText.trim();

          const catEl = parent.querySelector('[class*="category"], [class*="kicker"], [class*="tag"], [class*="section"], [class*="badge"]');
          if (catEl) category = catEl.innerText.trim();
        }

        // Kalkulacja wagi widoczności (Visual Prominence Score)
        const score = (fontSize * 2.5) +
          (isHeading ? 35 : 0) +
          Math.max(0, 1000 - rect.top) / 10;

        candidates.push({
          title: text,
          url: href,
          fontSize: fontSize,
          top: Math.round(rect.top),
          score: score,
          author: author,
          category: category
        });
      }

      candidates.sort((a, b) => b.score - a.score);

      if (candidates.length > 0) {
        const best = candidates[0];
        // Oczyszczenie tytułu z liczników komentarzy ("13\n") i dat
        let cleanTitle = best.title
          .replace(/^\d+\s*\n+/, '')
          .replace(/Dziś,?\s*\d+:\d+/i, '')
          .replace(/Wczoraj,?\s*\d+:\d+/i, '')
          .replace(/ARTYKUŁ SPONSOROWANY/i, '')
          .replace(/ART\.\s*SPONSOROWANY/i, '')
          .replace(/\[\s*ZDJĘCIA\s*\]/i, '')
          .replace(/\(\s*WIDEO\s*\)/i, '')
          .trim();

        let cleanCat = (best.category || 'Wydarzenia lokalne')
          .split('\n')[0]
          .trim();
        if (cleanCat.length > 40 || cleanCat.length < 3) {
          cleanCat = 'Wydarzenia lokalne';
        }

        return {
          title: cleanTitle,
          url: best.url,
          author: best.author || 'Redakcja lokalna',
          category: cleanCat,
          fontSize: best.fontSize,
          prominenceScore: Math.round(best.score),
          status: 'SUCCESS'
        };
      }

      return {
        title: null,
        url: null,
        author: 'Redakcja lokalna',
        category: 'Wydarzenia lokalne',
        fontSize: 0,
        prominenceScore: 0,
        status: 'NO_HERO_FOUND'
      };
    }, domain);

    await page.close();

    return {
      pair_id: pair_id,
      domain: domain,
      name: name,
      hero_title: data.title,
      hero_url: data.url,
      hero_category: data.category,
      author: data.author,
      fontSize: data.fontSize,
      prominenceScore: data.prominenceScore,
      scanned_at: new Date().toISOString(),
      status: data.status
    };
  } catch (err) {
    try { 
      await page.close(); 
    } catch (closeErr) {
      console.debug('Błąd zamykania strony po błędzie:', closeErr.message);
    }
    console.warn(`[WARN] Błąd skanowania konkurenta ${domain}: ${err.message}`);
    return {
      pair_id: pair_id,
      domain: domain,
      name: name,
      hero_title: null,
      hero_url: null,
      hero_category: 'Wydarzenia lokalne',
      author: 'Redakcja lokalna',
      fontSize: 0,
      prominenceScore: 0,
      scanned_at: new Date().toISOString(),
      status: 'ERROR: ' + err.message
    };
  }
}

async function main() {
  let targets = [];
  if (process.argv[2]) {
    try {
      targets = JSON.parse(process.argv[2]);
    } catch (parseErr) {
      console.debug('Parsowanie jako JSON nie powiodło się, próba parsowania jako URL:', parseErr.message);
      targets = process.argv.slice(2).map(u => ({
        pair_id: 'custom',
        domain: u.replace(/https?:\/\//, '').split('/')[0],
        url: u,
        name: u
      }));
    }
  }

  if (targets.length === 0) {
    console.error('Błąd: Brak celów skanowania.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote'
    ]
  });

  const concurrency = 6;
  const results = [];

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const batchPromises = batch.map(t => scanCompetitor(browser, t));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

main();
