#!/usr/bin/env python3
"""
Generate a 1-page executive one-pager PDF:
- Consistently phrased as "projekt platformy", "projekt systemu"
- Built for the Management Board of Polska Press Grupa (dla Zarządu Polska Press Grupa)
- Author and creator: Jan Domaniewski
- Clickable interactive hyperlink for https://ppgscope.pl
- Access password: MWB2026
- Executive briefing for the Minister of State Assets (MAP)
- Single A4 page strictly
"""
import base64
import os
import subprocess
import re

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_path = os.path.join(root_dir, "web", "public", "logo.png")
    output_pdf = os.path.join(root_dir, "PPGscope_OnePager_Minister_MAP.pdf")
    html_path = os.path.join(root_dir, "PPGscope_OnePager_Minister_MAP.html")

    with open(logo_path, "rb") as f:
        logo_b64 = base64.b64encode(f.read()).decode("utf-8")

    html_content = f"""<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>PPGscope.pl — Projekt Platformy dla Zarządu PPG</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 7mm 11mm 7mm 11mm;
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    line-height: 1.34;
    font-size: 10.8px;
    height: 100%;
  }}

  .page-container {{
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 283mm;
    max-height: 283mm;
    overflow: hidden;
  }}

  /* HEADER */
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 7px;
    margin-bottom: 9px;
  }}

  .logo-box {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}

  .logo-img {{
    height: 38px;
    width: auto;
    object-fit: contain;
  }}

  .header-badge {{
    text-align: right;
  }}

  .badge-tag {{
    display: inline-block;
    background: #0f172a;
    color: #ffffff;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 4px;
    margin-bottom: 2px;
  }}

  .badge-sub {{
    font-size: 9px;
    color: #475569;
    font-weight: 600;
    letter-spacing: 0.2px;
  }}

  /* HERO / TITLE */
  .title-section {{
    margin-bottom: 9px;
  }}

  .main-title {{
    font-size: 18px;
    font-weight: 800;
    color: #0b192c;
    letter-spacing: -0.3px;
    line-height: 1.2;
    margin-bottom: 3px;
  }}

  .main-subtitle {{
    font-size: 10.8px;
    color: #334155;
    font-weight: 500;
    line-height: 1.35;
  }}

  /* SECTION BOX: WHAT IS THE PROJECT */
  .purpose-card {{
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #008b9b;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 9px;
  }}

  .section-label-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }}

  .section-label {{
    font-size: 8.8px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #008b9b;
    display: flex;
    align-items: center;
    gap: 6px;
  }}

  .author-badge {{
    font-size: 8.8px;
    font-weight: 700;
    color: #0f172a;
    background: #e2e8f0;
    padding: 2px 7px;
    border-radius: 4px;
  }}

  .author-badge span {{
    color: #0369a1;
  }}

  .purpose-text {{
    font-size: 10.5px;
    color: #1e293b;
    line-height: 1.38;
    margin-bottom: 5px;
  }}

  .purpose-pillars {{
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px dashed #cbd5e1;
  }}

  .pillar-item {{
    font-size: 9.6px;
    color: #334155;
    line-height: 1.3;
  }}

  .pillar-item strong {{
    color: #0f172a;
    display: block;
    margin-bottom: 1px;
    font-size: 10px;
  }}

  /* CAPABILITIES GRID */
  .capabilities-section {{
    margin-bottom: 9px;
  }}

  .cap-header {{
    font-size: 10.8px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: #0b192c;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 3px;
  }}

  .cap-count {{
    font-size: 9.2px;
    font-weight: 600;
    color: #64748b;
    text-transform: none;
    letter-spacing: normal;
  }}

  .cap-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6.5px;
  }}

  .cap-card {{
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 7px 8px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }}

  .cap-tag {{
    font-size: 8px;
    font-weight: 800;
    color: #0284c7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }}

  .cap-title {{
    font-size: 10.3px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 3px;
    line-height: 1.25;
  }}

  .cap-desc {{
    font-size: 9.2px;
    color: #475569;
    line-height: 1.32;
  }}

  /* ACCESS BOX (VERY PROMINENT WITH HYPERLINK) */
  .access-box {{
    background: linear-gradient(135deg, #071224 0%, #0c1e38 100%);
    border: 1.5px solid #1e3a5f;
    border-radius: 8px;
    padding: 11px 16px;
    color: #ffffff;
    box-shadow: 0 6px 16px rgba(11, 25, 44, 0.15);
    margin-bottom: 8px;
  }}

  .access-top {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.12);
    padding-bottom: 5px;
    margin-bottom: 8px;
  }}

  .access-headline {{
    font-size: 9.8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.1px;
    color: #38bdf8;
    display: flex;
    align-items: center;
    gap: 6px;
  }}

  .access-note {{
    font-size: 8.8px;
    color: #94a3b8;
  }}

  .access-body {{
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 14px;
    align-items: center;
  }}

  .domain-col {{
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 6px;
    padding: 8px 12px;
  }}

  .domain-label {{
    font-size: 8.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
    margin-bottom: 2px;
  }}

  .domain-link {{
    display: inline-block;
    text-decoration: none;
    cursor: pointer;
  }}

  .domain-value {{
    font-size: 23px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 0.3px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.15;
  }}

  .domain-value span {{
    color: #38bdf8;
    text-decoration: underline;
    text-decoration-color: rgba(56, 189, 248, 0.6);
  }}

  .domain-hint {{
    font-size: 8.3px;
    color: #cbd5e1;
    margin-top: 3px;
    display: flex;
    align-items: center;
    gap: 4px;
  }}

  .domain-hint strong {{
    color: #38bdf8;
  }}

  .password-col {{
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    border: 1px solid #38bdf8;
    border-radius: 6px;
    padding: 8px 12px;
    text-align: center;
  }}

  .password-label {{
    font-size: 8.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #e0f2fe;
    margin-bottom: 2px;
  }}

  .password-value {{
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 3px;
    color: #ffffff;
    font-family: ui-monospace, "SF Mono", Monaco, "Cascadia Mono", monospace;
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }}

  .password-hint {{
    font-size: 8px;
    color: #bae6fd;
    margin-top: 2px;
    font-weight: 500;
  }}

  /* FOOTER */
  .footer {{
    border-top: 1px solid #e2e8f0;
    padding-top: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.2px;
    color: #64748b;
  }}

  .footer-left {{
    font-weight: 600;
    color: #334155;
  }}

  .footer-left strong {{
    color: #0f172a;
  }}

  .footer-right {{
    font-family: ui-monospace, monospace;
    font-size: 7.8px;
    color: #94a3b8;
  }}
</style>
</head>
<body>

<div class="page-container">

  <!-- HEADER -->
  <div class="header">
    <div class="logo-box">
      <img src="data:image/png;base64,{logo_b64}" class="logo-img" alt="PPGscope Logo">
    </div>
    <div class="header-badge">
      <div class="badge-tag">Briefing dla Ministra MAP</div>
      <div class="badge-sub">Projekt Systemu · Polska Press Grupa</div>
    </div>
  </div>

  <!-- TITLE -->
  <div class="title-section">
    <h1 class="main-title">PPGscope.pl — Projekt Platformy i Systemu Wywiadu Redakcyjnego dla Zarządu Polska Press Grupa</h1>
    <p class="main-subtitle">
      Koncepcja oraz działający prototyp roboczy projektowanego systemu analityczno-zarządczego do ciągłego monitoringu struktury treści, czystej lokalności, bezstronności oraz kondycji 546 mediów wydawnictwa w 16 województwach.
    </p>
  </div>

  <!-- PURPOSE & CONTEXT -->
  <div class="purpose-card">
    <div class="section-label-bar">
      <div class="section-label">
        <span>●</span> Do czego służy ten projekt platformy i systemu?
      </div>
      <div class="author-badge">
        Autor i wykonawca projektu: <span>Jan Domaniewski</span>
      </div>
    </div>
    <p class="purpose-text">
      <strong>PPGscope</strong> to autorski <strong>projekt platformy</strong> i <strong>projekt systemu</strong> wywiadu redakcyjnego (<em>Editorial Intelligence</em>), przygotowywany dla <strong>Zarządu Polska Press Grupa</strong>. Docelowo ma stanowić dla kierownictwa spółki nowoczesne narzędzie zarządcze do bieżącego audytu i nawigacji całym ekosystemem wydawnictwa (20 dzienników regionalnych, 509 serwisów miejsko-powiatowych <em>NaszeMiasto</em> oraz portali tematycznych) w oparciu o twarde dane.
    </p>
    <div class="purpose-pillars">
      <div class="pillar-item">
        <strong>1. Projekt pulpitu zarządczego</strong>
        Bieżący odczyt strumienia 10–15 tys. artykułów na dobę, dający Zarządowi natychmiastowy wgląd w to, czym żyją redakcje w regionach.
      </div>
      <div class="pillar-item">
        <strong>2. Weryfikacja misji regionalnej</strong>
        Projektowany algorytm odróżniania autorskiej pracy reporterów w terenie od masowych przedruków i centralnego clickbaitu.
      </div>
      <div class="pillar-item">
        <strong>3. Standardy pluralizmu i rzetelności</strong>
        Projekt stałego badania ekspozycji sceny politycznej (władza vs opozycja), ochrona bezstronności i wczesne wykrywanie asymetrii.
      </div>
    </div>
  </div>

  <!-- CAPABILITIES (6 MODULES) -->
  <div class="capabilities-section">
    <div class="cap-header">
      <span>Założenia i Możliwości Projektu Platformy</span>
      <span class="cap-count">Docelowy zasięg projektu: 546 portali · 380 powiatów · 18 dziedzin</span>
    </div>
    <div class="cap-grid">
      
      <div class="cap-card">
        <div class="cap-tag">Taksonomia Treści</div>
        <div class="cap-title">Struktura 18 Dziedzin v2.0</div>
        <div class="cap-desc">
          Automatyczna kategoryzacja AI każdego artykułu: gospodarka, samorząd, inwestycje, zdrowie vs kronika kryminalna i rozrywka. Pełna mapa nakładu sił redakcji.
        </div>
      </div>

      <div class="cap-card">
        <div class="cap-tag">Jakość Dziennikarska</div>
        <div class="cap-title">Wskaźnik Czystej Lokalności</div>
        <div class="cap-desc">
          Trójstopniowy podział: <strong>L</strong> (czysto lokalny, reporter w terenie), <strong>CL</strong> (temat krajowy z regionalnym kontekstem), <strong>C</strong> (surowy przedruk z centralnego huba).
        </div>
      </div>

      <div class="cap-card">
        <div class="cap-tag">Nadzór Pluralizmu</div>
        <div class="cap-title">Audyt Bezstronności i Sentymentu</div>
        <div class="cap-desc">
          Ilościowy i jakościowy pomiar ekspozycji partii politycznych, rządu, samorządów i opozycji. Wczesne wykrywanie anomalii i przechyłów w poszczególnych tytułach.
        </div>
      </div>

      <div class="cap-card">
        <div class="cap-tag">Analiza Stron Głównych</div>
        <div class="cap-title">Radar „Jedynek” i Forensics Tytułów</div>
        <div class="cap-desc">
          Śledzenie w trybie ciągłym głównych slotów otwierających (artykułów na SG), historii podmian nagłówków (testy clickbaitowe) oraz oznaczania płatnych treści i subskrypcji.
        </div>
      </div>

      <div class="cap-card">
        <div class="cap-tag">Audyt Infrastruktury</div>
        <div class="cap-title">Detekcja „Portali-Widm” (Zombie)</div>
        <div class="cap-desc">
          Algorytmy MinHash LSH badające unikalność treści w 509 powiatach. Natychmiastowe wskazanie, które redakcje faktycznie pracują, a które działają na automacie.
        </div>
      </div>

      <div class="cap-card">
        <div class="cap-tag">Benchmarking 360°</div>
        <div class="cap-title">Karta Medium i Porównywarka</div>
        <div class="cap-desc">
          Wielowymiarowy profil diagnostyczny każdego z 546 serwisów oraz bezpośrednie porównywanie dowolnych dwóch tytułów obok siebie (<em>Medium A vs Medium B</em>).
        </div>
      </div>

    </div>
  </div>

  <!-- ACCESS BANNER (PROMINENT DOMAIN WITH HYPERLINK & PASSWORD) -->
  <div class="access-box">
    <div class="access-top">
      <div class="access-headline">
        <span>🔒</span> Dostęp do Działającego Prototypu Projektu
      </div>
      <div class="access-note">
        Dostęp przez przeglądarkę · Desktop / Tablet / Smartfon · Nie wymaga sieci VPN
      </div>
    </div>
    <div class="access-body">
      <div class="domain-col">
        <div class="domain-label">Adres prototypu projektu (kliknij, aby otworzyć):</div>
        <a href="https://ppgscope.pl" target="_blank" class="domain-link" title="Otwórz prototyp projektu PPGscope.pl w przeglądarce">
          <div class="domain-value"><span>https://</span>PPGscope.pl</div>
        </a>
        <div class="domain-hint">
          🔗 <strong>Aktywny link:</strong> kliknij adres, aby otworzyć prototyp projektu w przeglądarce
        </div>
      </div>
      <div class="password-col">
        <div class="password-label">Klucz dostępu (hasło):</div>
        <div class="password-value">MWB2026</div>
        <div class="password-hint">Wprowadź na ekranie logowania do prototypu</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-left">
      Autor i wykonawca projektu: <strong>Jan Domaniewski</strong> · Materiał informacyjny przygotowany dla Ministra Aktywów Państwowych
    </div>
    <div class="footer-right">
      PPGscope · Projekt platformy i projekt systemu dla Zarządu Polska Press Grupa
    </div>
  </div>

</div>

</body>
</html>
"""

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Generated HTML: {html_path}")

    # Generate PDF using Chrome
    chrome_cmd = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={output_pdf}",
        html_path
    ]
    subprocess.run(chrome_cmd, check=True)
    print(f"Generated PDF: {output_pdf}")

    # Verify page count
    with open(output_pdf, "rb") as f:
        pdf_bytes = f.read()
    page_count = len(re.findall(rb'/Type\s*/Page\b', pdf_bytes))
    print(f"Verified PDF page count: {page_count}")

    # Copy directly to Downloads and Desktop
    downloads_path = os.path.expanduser("~/Downloads/PPGscope_OnePager_Minister_MAP.pdf")
    desktop_path = os.path.expanduser("~/Desktop/PPGscope_OnePager_Minister_MAP.pdf")
    
    with open(output_pdf, "rb") as src:
        data = src.read()
    with open(downloads_path, "wb") as dst:
        dst.write(data)
    with open(desktop_path, "wb") as dst:
        dst.write(data)
    print(f"Copied to {downloads_path} and {desktop_path}")

    # Check for URI link annotations in the PDF
    has_hyperlink = b'https://ppgscope.pl' in pdf_bytes
    print(f"Hyperlink verified in PDF: {has_hyperlink}")

if __name__ == "__main__":
    main()
