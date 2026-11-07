#!/usr/bin/env node
/**
 * Headless Browser Hero Scanner dla portali Polska Press.
 * Omija blokady Cloudflare (WAF/JS challenges) dzięki Chromium (Puppeteer),
 * renderuje widok strony i ekstrahuje czołówkę redakcyjną (Hero Story)
 * wraz z analizą syndykacji (origin_domain, article_id, is_cross_domain).
 * Obsługuje pulę równoległych zakładek dla maksymalnej szybkości.
 */

const path = require('path');
const puppeteerPath = '/Users/macbookpro/.gemini/mcp-runtime/node_modules/puppeteer';
const puppeteer = require(puppeteerPath);

async function scanPortal(browser, portalUrl) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1440, height: 900 });

    // Blokowanie zbędnych ciężkich zasobów (obrazy, czcionki, media) dla przyspieszenia skanowania
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
      await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      // Krótkie odczekanie na doładowanie skryptów klocka Hero
      await new Promise(r => setTimeout(r, 1200));
    } catch (navErr) {
      console.warn(`[WARN] Timeout nawigacji dla ${portalUrl}, próba odczytu stanu częściowego: ${navErr.message}`);
    }

    const data = await page.evaluate((url) => {
      // Usunięcie bannera cookies
      const cmp = document.querySelector('[id*="sp_message"], .sp_veil, #didomi-host');
      if (cmp) cmp.remove();

      // Szukanie nadtytułu redakcyjnego (kicker)
      let kicker = null;
      const h2Candidates = Array.from(document.querySelectorAll('h2')).filter(h => {
        const text = h.innerText.trim();
        const r = h.getBoundingClientRect();
        const isPrivacy = /prywatno|cookie|zgód|regulamin/i.test(text);
        return !isPrivacy && text.length > 4 && text.length < 70 && r.top >= 150 && r.top < 700;
      });
      if (h2Candidates.length > 0) {
        kicker = h2Candidates[0].innerText.trim();
      }

      // Szukanie kontenera Hero w Atoms PPG
      const heroTile = document.querySelector('[class*="atomsTileArticleHero"], [class*="Hero"], [data-ea="tile:1"]');
      let title = '';
      let link = '';
      let img = '';
      let componentType = 'unknown';
      let fontSize = 28;
      let articleId = null;

      if (heroTile) {
        componentType = heroTile.className.split(' ')[0] || 'atomsTileArticleHero';
        articleId = heroTile.getAttribute('data-article-id') || null;

        const a = heroTile.querySelector('a[href*="/ar/"]') || heroTile.closest('a') || heroTile.querySelector('a');
        const heading = heroTile.querySelector('h1, h2, h3, [class*="title"]') || a;

        if (a) {
          link = a.href;
          title = a.getAttribute('title') || (heading ? heading.innerText.trim() : a.innerText.trim());
          if (!articleId) {
            const m = link.match(/ar\/(?:c\d+p\d+-)?(\d+)/);
            if (m) articleId = m[1];
          }
        } else if (heading) {
          title = heading.innerText.trim();
        }

        if (heading) {
          const style = window.getComputedStyle(heading);
          fontSize = parseFloat(style.fontSize) || 28;
        }

        const imgEl = heroTile.querySelector('img');
        if (imgEl) {
          img = imgEl.src || imgEl.dataset.src || '';
        }
      }

      // Fallback: największy nagłówek
      if (!title || title.length < 10) {
        const anchors = Array.from(document.querySelectorAll('a[href*="/ar/"]')).map(a => {
          const r = a.getBoundingClientRect();
          const style = window.getComputedStyle(a);
          const fs = parseFloat(style.fontSize) || 16;
          const txt = a.innerText.trim();
          return {
            title: txt,
            url: a.href,
            fontSize: fs,
            top: Math.round(r.top),
            width: Math.round(r.width),
            height: Math.round(r.height),
            score: (fs * 2) + Math.max(0, 1000 - r.top) / 10 + (r.width * r.height) / 10000
          };
        }).filter(c => c.top >= 150 && c.top < 1000 && c.title.length > 20);

        anchors.sort((a, b) => b.score - a.score);
        if (anchors.length > 0) {
          title = anchors[0].title;
          link = anchors[0].url;
          fontSize = anchors[0].fontSize;
          componentType = 'fallbackVisualLargest';
          const m = link.match(/ar\/(?:c\d+p\d+-)?(\d+)/);
          if (m) articleId = m[1];
        }
      }

      // Analiza domeny źródłowej (syndykacja)
      let originDomain = null;
      let isCrossDomain = false;
      const portalHost = url.replace(/https?:\/\//, '').split('/')[0].replace(/^www\./, '');

      if (link) {
        try {
          const linkUrl = new URL(link);
          originDomain = linkUrl.hostname.replace(/^www\./, '');
          isCrossDomain = (originDomain !== portalHost);
        } catch (e) {
          originDomain = portalHost;
          isCrossDomain = false;
        }
      } else {
        originDomain = portalHost;
      }

      return {
        portalUrl: url,
        portalDomain: portalHost,
        title: title.replace(/\s+/g, ' ').trim(),
        kicker: kicker,
        url: link,
        articleId: articleId,
        originDomain: originDomain,
        isCrossDomain: isCrossDomain,
        imageUrl: img,
        componentType: componentType,
        fontSize: fontSize,
        prominenceScore: Math.round((fontSize * 2.5) + (kicker ? 20 : 0))
      };
    }, portalUrl);

    await page.close();
    return data;
  } catch (err) {
    try { 
      await page.close(); 
    } catch (closeErr) {
      console.warn(`[WARN] Błąd zamykania zakładki dla ${portalUrl}: ${closeErr.message}`);
    }
    return {
      portalUrl: portalUrl,
      portalDomain: portalUrl.replace(/https?:\/\//, '').split('/')[0].replace(/^www\./, ''),
      title: 'Błąd skanowania: ' + err.message,
      kicker: null,
      url: null,
      articleId: null,
      originDomain: null,
      isCrossDomain: false,
      imageUrl: null,
      componentType: 'error',
      fontSize: 0,
      prominenceScore: 0
    };
  }
}

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error('Błąd: Podaj listę adresów URL portali jako argumenty.');
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

  const concurrency = 4; // 4 równoległe zakładki
  const results = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(url => scanPortal(browser, url));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

main();
