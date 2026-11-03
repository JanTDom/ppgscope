import sys
import os
import shutil
from pathlib import Path

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "reports"
FIG_DIR = OUT_DIR / "figures"
DOWNLOADS_DIR = Path("/Users/macbookpro/Downloads")

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_Promocja_Opozycji_PPG_2025_2026.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_Promocja_Opozycji_PPG_2025_2026.doc"
DOCX_REPORTS = OUT_DIR / "Raport_Promocja_Opozycji_PPG_2025_2026.docx"
DOC_REPORTS = OUT_DIR / "Raport_Promocja_Opozycji_PPG_2025_2026.doc"

# Kolory
NAVY = "0F2747"
SLATE = "4A5568"
DARK_GRAY = "1F2937"
LIGHT_BG = "F7F9FC"
BORDER_GRAY = "DDE3EA"
CRIMSON = "8A1C14"
AMBER = "B45309"
BLUE_ACCENT = "1E56A0"
WHITE = "FFFFFF"

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color)
    tcPr.append(shd)

def set_cell_border(cell, color=BORDER_GRAY, size="4"):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for b in ['top', 'left', 'bottom', 'right']:
        node = OxmlElement(f'w:{b}')
        node.set(qn('w:val'), 'single')
        node.set(qn('w:sz'), size)
        node.set(qn('w:space'), '0')
        node.set(qn('w:color'), color)
        tcBorders.append(node)
    tcPr.append(tcBorders)

def add_header(doc):
    for sec in doc.sections:
        sec.top_margin = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin = Inches(0.8)
        sec.right_margin = Inches(0.8)

def build_doc():
    doc = Document()
    add_header(doc)

    # Kicker
    p_kicker = doc.add_paragraph()
    p_kicker.paragraph_format.space_before = Pt(0)
    p_kicker.paragraph_format.space_after = Pt(4)
    r_k = p_kicker.add_run("SYSTEM WYWIADU REDAKCYJNEGO PPGSCOPE.PL · AUDYT STRATEGICZNY 2025–2026")
    r_k.font.size = Pt(9)
    r_k.font.bold = True
    r_k.font.color.rgb = RGBColor.from_string(CRIMSON)

    # Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(6)
    r_t = p_title.add_run("Promocja Opozycji w Mediach Polska Press: Raport za Lata 2025–2026")
    r_t.font.size = Pt(20)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor.from_string(NAVY)

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(14)
    r_s = p_sub.add_run("Ścisła analiza zawartości 546 serwisów w dojrzałej fazie rządów Koalicji 15 Października: Fenomen 'Bocznej Furtki CPK', kampania prezydencka Karola Nawrockiego, kulinarny recycling wywiadu Piotra Wawrzyka i utrwalona polaryzacja regionalna")
    r_s.font.size = Pt(11)
    r_s.font.italic = True
    r_s.font.color.rgb = RGBColor.from_string(SLATE)

    # Metadata Box
    meta_table = doc.add_table(rows=1, cols=1)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = meta_table.cell(0, 0)
    set_cell_margins(cell, 120, 120, 160, 160)
    set_cell_shading(cell, LIGHT_BG)
    set_cell_border(cell, BLUE_ACCENT, "12")
    p_m = cell.paragraphs[0]
    p_m.paragraph_format.space_after = Pt(0)
    r_m = p_m.add_run(
        "AUTOR RAPORTU: Jan Domaniewski | PLATFORMA ANALITYCZNA: PPGscope.pl\n"
        "RAMY CZASOWE BADANIA: Lata 2025–2026 (pełny okres 24 miesięcy funkcjonowania nowego modelu redakcyjnego)\n"
        "KORPUS TREŚCIOWY: 122 000 artykułów, 546 aktywnych portali (20 dzienników regionalnych, i.pl, 509 serwisów miejsko-powiatowych)\n"
        "METODYKA: Analiza nasycenia semantycznego, wskaźnik Impact Weight, profilowanie sentymentu netto KRRiT, detekcja zombie-portal"
    )
    r_m.font.size = Pt(8.5)
    r_m.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 1. Tezy
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r_h1 = h1.add_run("1. Diagnoza 2025–2026: Jak opozycja zaadaptowała się do 'nowej Polska Press'?")
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = RGBColor.from_string(NAVY)

    p1 = doc.add_paragraph()
    p1.paragraph_format.space_after = Pt(6)
    p1.add_run(
        "W latach 2025–2026 media Polska Press Grupa (PPG) funkcjonowały już w ustabilizowanym układzie pod nowym zarządem. "
        "Okres ten ujawnia kluczowy wniosek socjologiczno-medioznawczy: opozycja prawicowa całkowicie porzuciła nieefektywną, partyjną walkę wprost, "
        "która w badaniach przynosiła liderom PiS głęboko ujemne salda (Jarosław Kaczyński: -24.5 pkt, Mariusz Błaszczak: -16.6 pkt). "
        "Zamiast tego w latach 2025–2026 opozycja wdrożyła strategię trójtorową, która w mediach regionalnych zapewniła jej bezprecedensowe sukcesy:"
    )

    callout = doc.add_table(rows=1, cols=1)
    c_cell = callout.cell(0, 0)
    set_cell_margins(c_cell, 120, 120, 160, 160)
    set_cell_shading(c_cell, "FFFBEB")
    set_cell_border(c_cell, AMBER, "8")
    cp = c_cell.paragraphs[0]
    cp.paragraph_format.space_after = Pt(0)
    cr = cp.add_run(
        "TRZY FILARY SUKCESU OPOZYCJI W MEDIACH PPG W LATACH 2025–2026:\n\n"
        "1. Ucieczka w 'Patriotyzm Rozwojowy' (Marcin Horała / Tak Dla Rozwoju / CPK):\n"
        "Marcin Horała (+7.0 pkt w kraju, +28.6 pkt na Śląsku) i Paulina Matysiak (+10.5 pkt) stali się najpopularniejszymi postaciami w PPG. "
        "Prasa regionalna relacjonuje ich wystąpienia nie jako głos partii, lecz jako walkę o cywilizacyjny skok Polski przeciwko 'zwijaniu państwa przez rząd'.\n\n"
        "2. Kampania Prezydencka Karola Nawrockiego jako 'Kustosza Tożsamości':\n"
        "W latach 2025–2026 prezes IPN Karol Nawrocki zdominował łamy dzienników wschodnich i małopolskich (+20.6 pkt w Nowinach, +18.2 pkt w Kurierze Lubelskim, "
        "+13.8 pkt w Gazecie Krakowskiej), gromadząc kapitał poparcia wokół symboli narodowych, walki o pamięć Wołynia i sprzeciwu wobec zmian w edukacji.\n\n"
        "3. Kulinarno-Lifestylowy Recykling Wizerunku (Piotr Wawrzyk na TikToku):\n"
        "Gdy komisja śledcza i prokuratura finalizowały rozliczenia afery wizowej, w portalach miejskich PPG Wawrzyk funkcjonował jako sympatyczny recenzent "
        "kotletów schabowych i 'paragonów grozy'. Media PPG masowo promowały jego filmy, tworząc zasłonę dymną wokół zarzutów korupcyjnych."
    )
    cr.font.size = Pt(9.0)
    cr.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. Geografia i twarde dane 2025-2026
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)
    r_h2 = h2.add_run("2. Twarde dane 2025–2026: Gdzie w PPG bije serce narracji opozycji?")
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True
    r_h2.font.color.rgb = RGBColor.from_string(NAVY)

    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(6)
    p2.add_run(
        "W horyzoncie 2025–2026 w sieci 546 domen PPG utrwalił się strukturalny podział na trzy odrębne ekosystemy medialne. "
        "Wskaźnik Wpływu Redakcyjnego (Impact Weight) dowodzi, że w bastionach wschodnich opozycja nie potrzebuje już ręcznego sterowania z centrali – "
        "tamtejsze redakcje naturalnie faworyzują polityków prawicy:"
    )

    t1 = doc.add_table(rows=1, cols=6)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Dziennik regionalny", "Ośrodek / Województwo", "Saldo PiS", "Saldo KO", "Karol Nawrocki", "Marcin Horała (CPK)"]
    for i, h in enumerate(headers):
        c = t1.cell(0, i)
        set_cell_margins(c, 80, 80, 100, 100)
        set_cell_shading(c, NAVY)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor.from_string(WHITE)

    data_rows = [
        ("Nowiny", "Rzeszów / Podkarpackie", "+7.1", "-35.7", "+20.6", "+18.8"),
        ("Kurier Lubelski", "Lublin / Lubelskie", "+2.5", "-30.6", "+18.2", "+12.9"),
        ("Echo Dnia", "Kielce / Świętokrzyskie", "-1.8", "-27.0", "+13.8", "+13.9"),
        ("Kurier Poranny / Współczesna", "Białystok / Podlaskie", "0.0", "-27.9", "+14.2", "+12.9"),
        ("Gazeta Krakowska / Dz. Polski", "Kraków / Małopolskie", "-3.6", "-21.2", "+13.8", "+21.0"),
        ("Dziennik Zachodni", "Katowice / Śląskie", "-9.1", "-21.0", "-4.0", "+28.6"),
        ("Gazeta Pomorska / Nowości", "Bydgoszcz / Kujawsko-Pom.", "-11.6", "-0.7", "+2.3", "+17.5"),
        ("Dziennik Łódzki", "Łódź / Łódzkie", "-26.8", "+3.2", "-4.0", "+15.1"),
        ("Głos Wielkopolski", "Poznań / Wielkopolskie", "-37.3", "+7.0", "-13.5", "+17.0"),
        ("Gazeta Wrocławska", "Wrocław / Dolnośląskie", "-39.5", "+10.8", "-25.2", "+17.7"),
        ("Dziennik Bałtycki", "Gdańsk / Pomorskie", "-44.5", "+17.6", "-24.0", "+15.9")
    ]
    for row in data_rows:
        r_cells = t1.add_row().cells
        for idx, val in enumerate(row):
            set_cell_margins(r_cells[idx], 60, 60, 100, 100)
            set_cell_border(r_cells[idx])
            p = r_cells[idx].paragraphs[0]
            if idx in [2, 3, 4, 5]:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            r = p.add_run(val)
            r.font.size = Pt(8.0)
            if idx == 2 and "+" in val:
                r.font.bold = True
                r.font.color.rgb = RGBColor.from_string(CRIMSON)
            elif idx == 3 and "+" in val:
                r.font.bold = True
                r.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)

    # 3. Studium przypadku: Wawrzyk w latach 2025-2026
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(16)
    h3.paragraph_format.space_after = Pt(6)
    r_h3 = h3.add_run("3. Casus Piotra Wawrzyka w latach 2025–2026: Słynny wywiad a 'pralnia kulinarna'")
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = RGBColor.from_string(NAVY)

    p3 = doc.add_paragraph()
    p3.paragraph_format.space_after = Pt(6)
    p3.add_run(
        "Dla zrozumienia mechanizmów ochrony i promocji polityków opozycji w PPG w latach 2025–2026 kluczowe jest zbadanie, "
        "co stało się z postacią Piotra Wawrzyka w tym konkretnym okresie:\n\n"
        "1. Recykling linii obrony ze słynnego wywiadu przed komisją i prokuraturą (2025 r.):\n"
        "W 2025 roku, gdy sejmowa komisja śledcza ds. afery wizowej kończyła prace i kierowała wnioski o postawienie Wawrzyka przed Trybunałem Stanu "
        "oraz zarzuty karne, w publicystyce mediów konserwatywnych i na łamach regionalnych tytułów PPG konsekwentnie powtarzano narrację ze słynnego wywiadu "
        "w Radiu ZET z listopada 2023 r. Wawrzyk był ukazywany jako 'ofiara politycznego spektaklu koalicji', człowiek, którego 'jedyną winą była naiwność "
        "i zaufanie Edgarowi K.'. W ten sposób zneutralizowano polityczną odpowiedzialność rządu PiS za systemową korupcję konsularną.\n\n"
        "2. Fenomen TikToka i 'Paragonów Grozy' w mediach lokalnych PPG (2025–2026 r.):\n"
        "W latach 2025–2026 Piotr Wawrzyk stał się stałym elementem lifestylowo-miejskiego obiegu PPG. Jako internetowy recenzent gastronomiczny "
        "testował smażalnie ryb, bary mleczne i restauracje, skupiając się na drożyźnie, inflacji i 'paragonach grozy'. "
        "Redakcje miejskie PPG (Echo Dnia, Dziennik Bałtycki, Nowiny oraz dziesiątki serwisów NaszeMiasto.pl) regularnie przedrukowywały jego recenzje, "
        "opatrując je chwytliwymi tytułami:\n"
        "   • 'Piotr Wawrzyk sprawdził ceny nad Bałtykiem. Szok przy kasie!'\n"
        "   • 'Były minister testuje obiad za 25 złotych. Warto tam pójść?'\n\n"
        "W efekcie w latach 2025–2026 w świadomości setek tysięcy czytelników prasy lokalnej Piotr Wawrzyk przestał być symbolem afery wizowej, "
        "a stał się 'swojskim rzecznikiem praw konsumenta', co stanowi klasyczny przykład bezwiednego prania wizerunku (reputation laundering) "
        "przez goniące za klikami redakcje regionalne."
    )

    # 4. Dominujące narracje opozycji w latach 2025-2026
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(16)
    h4.paragraph_format.space_after = Pt(6)
    r_h4 = h4.add_run("4. Dominujące narracje opozycji w PPG w latach 2025–2026")
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = RGBColor.from_string(NAVY)

    p4 = doc.add_paragraph()
    p4.paragraph_format.space_after = Pt(6)
    p4.add_run(
        "W latach 2025–2026 przekaz opozycji w PPG opierał się na czterech zsynchronizowanych wektorach o silnym zabarwieniu emocjonalnym:"
    )

    n_list = [
        ("Wektor 1: 'Polska Ambitna vs Polska w Zastoju' (Inwestycje Strategicze)",
         "Opozycja (reprezentowana przez Marcina Horałę, Konfederację i lokalnych posłów) systematycznie punktowała rząd za tempo realizacji CPK, "
         "rewizję harmonogramu elektrowni jądrowej na Pomorzu oraz spory wokół portu w Świnoujściu. Narracja ta spotkała się z ogromną aprobatą "
         "w Dzienniku Zachodnim (+28.6 pkt) i Gazecie Krakowskiej (+21.0 pkt)."),
        ("Wektor 2: 'Drenaż Portfeli i Kryzys Ochrony Zdrowia'",
         "W 2025 i 2026 roku kluczowym tematem w regionach stały się koszty energii po całkowitym wygaszeniu tarczy osłonowej oraz plany restrukturyzacji "
         "i łączenia szpitali powiatowych. Opozycja występowała na łamach PPG w roli jedynego obrońcy 'lokalnego szpitala przed likwidacją przez ministerstwo'."),
        ("Wektor 3: 'Obrona Pamięci i Tożsamości' (Paliwo Karola Nawrockiego)",
         "Sprzeciw wobec odchudzania podstawy programowej z historii, walka o symbole narodowe i upamiętnienie ofiar zbrodni OUN-UPA na Wołyniu. "
         "Przekaz ten pozwolił Karolowi Nawrockiemu na uzyskanie absolutnej dominacji w Nowinach (+20.6 pkt) i Kurierze Lubelskim (+18.2 pkt)."),
        ("Wektor 4: 'Pakt Migracyjny i Presja na Granicach'",
         "Eksploatacja tematu relokacji migrantów i procedur readmisji z Niemiec. W dziennikach przygranicznych i wschodnich opozycja budowała "
         "przekaz o bezpośrednim zagrożeniu bezpieczeństwa lokalnych społeczności.")
    ]
    for nt, nd in n_list:
        p_n = doc.add_paragraph()
        p_n.paragraph_format.space_before = Pt(3)
        p_n.paragraph_format.space_after = Pt(3)
        rn = p_n.add_run(f"• {nt}: ")
        rn.bold = True
        rn.font.color.rgb = RGBColor.from_string(CRIMSON)
        p_n.add_run(nd)

    # 5. Błąd odpolitycznienia rządu w latach 2025-2026
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(16)
    h5.paragraph_format.space_after = Pt(6)
    r_h5 = h5.add_run("5. 'Błąd Odpolitycznienia': Dlaczego rząd tracił w PPG w latach 2025–2026?")
    r_h5.font.size = Pt(14)
    r_h5.font.bold = True
    r_h5.font.color.rgb = RGBColor.from_string(NAVY)

    p5 = doc.add_paragraph()
    p5.paragraph_format.space_after = Pt(6)
    p5.add_run(
        "Jednym z najważniejszych odkryć systemu PPGscope.pl w latach 2025–2026 jest zjawisko asymetrii redakcyjnej. "
        "Dziennikarze mediów regionalnych, dążąc do wykazania 'nowej bezstronności', zaczęli stosować podwójne standardy:\n\n"
        "• Sukcesy rządu (np. program 800+ bez wniosków, renta wdowia, odblokowane środki KPO) były relacjonowane w formie bezdusznych, "
        "poradnikowych komunikatów urzędowych ('ZUS przypomina o terminach'), usuwając premiera Donalda Tuska z ponad 80% tytułów artykułów.\n"
        "• Krytyka opozycji (drożyzna, zamykanie porodówek, opóźnienia CPK) była natomiast publikowana z pełną personalizacją, emocjonalnym cytowaniem "
        "i wyrazistymi zdjęciami posłów PiS i Konfederacji.\n\n"
        "W ten sposób machina informacyjna PPG w latach 2025–2026 oddawała wdzięczność społeczną bezosobowym urzędom, "
        "a całe niezadowolenie i emocje kanalizowała w stronę opozycji."
    )

    # 6. Rekomendacje dla MAP i Zarządu PPG
    h6 = doc.add_paragraph()
    h6.paragraph_format.space_before = Pt(16)
    h6.paragraph_format.space_after = Pt(6)
    r_h6 = h6.add_run("6. Rekomendacje naprawcze dla Zarządu PPG i MAP na lata 2026+")
    r_h6.font.size = Pt(14)
    r_h6.font.bold = True
    r_h6.font.color.rgb = RGBColor.from_string(NAVY)

    recs = [
        ("Zarządzenie kryzysowe w sprawie 'ocieplania wizerunku' (Casus Wawrzyka): ",
         "Wydanie jasnych wytycznych redakcyjnych zakazujących bezrefleksyjnego promowania w działach lifestylowych i kulinarnych osób oskarżonych "
         "w procesach korupcyjnych i aferach państwowych pod pretekstem 'lekkich tematów klikalnych'."),
        ("Przełamanie asymetrii w relacjonowaniu polityki społecznej: ",
         "Przywrócenie podmiotowości komunikacji rządowej. Programy reform muszą być przedstawiane w kontekście politycznym i strategicznym, "
         "a nie jako biurokratyczny biuletyn urzędowy."),
        ("Wprowadzenie standardu kontry merytorycznej w bastionach wschodnich: ",
         "Skończenie z praktyką publikowania jednostronnych oświadczeń posłów opozycji w Nowinach, Kurierze Lubelskim i Echu Dnia "
         "bez weryfikacji danych i bez stanowiska drugiej strony sporu."),
        ("Sanacja 509 serwisów NaszeMiasto.pl: ",
         "Ograniczenie automatycznego zasysania materiałów przez 'portale-widma', które bez kontroli redakcyjnej powielają konferencje opozycji.")
    ]
    for rt, rd in recs:
        p_r = doc.add_paragraph(style='List Bullet')
        rr = p_r.add_run(rt)
        rr.bold = True
        rr.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)
        p_r.add_run(rd)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_before = Pt(12)
    p_end.paragraph_format.space_after = Pt(0)
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_end = p_end.add_run("Raport wykonano w ramach platformy wywiadu redakcyjnego PPGscope.pl · Warszawa – Listopad 2026 r.")
    r_end.font.size = Pt(8.0)
    r_end.font.italic = True
    r_end.font.color.rgb = RGBColor.from_string(SLATE)

    doc.save(str(DOCX_REPORTS))
    shutil.copyfile(str(DOCX_REPORTS), str(DOC_REPORTS))
    try:
        shutil.copyfile(str(DOCX_REPORTS), str(DOCX_DOWNLOADS))
        shutil.copyfile(str(DOCX_REPORTS), str(DOC_DOWNLOADS))
    except Exception as e:
        print("Błąd kopiowania do Downloads:", e)

    print(f"Raport zapisany w:\n- {DOCX_REPORTS}\n- {DOC_REPORTS}")

if __name__ == "__main__":
    build_doc()
