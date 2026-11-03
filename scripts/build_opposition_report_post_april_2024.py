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

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_Promocja_Opozycji_PPG_od_kwietnia_2024.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_Promocja_Opozycji_PPG_od_kwietnia_2024.doc"
DOCX_REPORTS = OUT_DIR / "Raport_Promocja_Opozycji_PPG_od_kwietnia_2024.docx"
DOC_REPORTS = OUT_DIR / "Raport_Promocja_Opozycji_PPG_od_kwietnia_2024.doc"

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
    r_k = p_kicker.add_run("SYSTEM WYWIADU REDAKCYJNEGO PPGSCOPE.PL · RAPORT SPECJALNY")
    r_k.font.size = Pt(9)
    r_k.font.bold = True
    r_k.font.color.rgb = RGBColor.from_string(CRIMSON)

    # Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(6)
    r_t = p_title.add_run("Promocja Opozycji w Mediach Polska Press po Kwietniu 2024 r.")
    r_t.font.size = Pt(20)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor.from_string(NAVY)

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(14)
    r_s = p_sub.add_run("Audyt zawartości 546 portali w erze nowego zarządu: Gdzie i jak promowana jest opozycja, drugie życie wywiadu z Wawrzykiem, recykling wizerunku oraz prawidłowości narracyjne prawicy (2024–2026)")
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
        "AUTOR RAPORTU: Jan Domaniewski | PLATFORMA: System Wywiadu Redakcyjnego PPGscope.pl\n"
        "ZAKRES CZASOWY: Od kwietnia 2024 r. (powołanie nowego zarządu PPG pod kierownictwem Zenona Nowaka) do listopada 2026 r.\n"
        "KORPUS BADAWCZY: 122 000 artykułów, 546 aktywnych domen (20 dzienników regionalnych, i.pl, 509 serwisów NaszeMiasto.pl)\n"
        "APARATURA BADAWCZA: Matematyczny Wskaźnik Wpływu Redakcyjnego (Impact Weight), kategoryzacja dziedzinowa v2.0, standard KRRiT"
    )
    r_m.font.size = Pt(8.5)
    r_m.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 1. Podsumowanie wykonawcze
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r_h1 = h1.add_run("1. Wprowadzenie: Cezura kwietnia 2024 r. i paradoks 'nowej Polska Press'")
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = RGBColor.from_string(NAVY)

    p1 = doc.add_paragraph()
    p1.paragraph_format.space_after = Pt(6)
    p1.add_run(
        "Kwiecień 2024 roku stanowił kluczową cezurę w historii grupy Polska Press. Po zmianie władzy w Polsce i wymianie zarządu PKN Orlen, "
        "nowy zarząd PPG z prezesem Zenonem Nowakiem na czele oraz nowi redaktorzy naczelni ogłosili program 'odpolitycznienia', "
        "likwidacji partyjnej propagandy czasów Doroty Kani i powrotu do korzeni lokalnego dziennikarstwa. "
        "Jednak głęboki empiryczny audyt bazy 122 tys. artykułów w systemie PPGscope.pl dowodzi, że po kwietniu 2024 roku doszło do zjawiska paradoksalnego: "
        "politycy opozycji (PiS, Konfederacja, ruchy konserwatywne) wcale nie zniknęli z mediów PPG, lecz zmienili wektory wejścia, "
        "wykorzystując inercję terenową, błędy komunikacyjne rządu oraz nowe formaty technokratyczne."
    )

    callout = doc.add_table(rows=1, cols=1)
    c_cell = callout.cell(0, 0)
    set_cell_margins(c_cell, 120, 120, 160, 160)
    set_cell_shading(c_cell, "FFFBEB")
    set_cell_border(c_cell, AMBER, "8")
    cp = c_cell.paragraphs[0]
    cp.paragraph_format.space_after = Pt(0)
    cr = cp.add_run(
        "GŁÓWNE ODKRYCIA DLA OKRESU OD KWIETNIA 2024 ROKU:\n"
        "1. Trwałość Bastionów Południowo-Wschodnich: Wymiana władz w Warszawie nie zneutralizowała przechyłu redakcji w Nowinach (Podkarpacie, saldo PiS +7.1), "
        "Kurierze Lubelskim (+2.5) czy Echu Dnia (-1.8 wobec średniej krajowej -18.0). Lokalna kadra reporterska pozostała związana z dotychczasowymi źródłami.\n"
        "2. Fenomen ruchu 'Tak Dla Rozwoju' (od czerwca 2024 r.): Opozycja znalazła idealną 'boczną furtkę' – Marcin Horała (PiS) i Paulina Matysiak (Lewica) "
        "przenieśli spór na pole infrastruktury (CPK, porty, atom). W PPG Horała osiągnął rekordowe dodatnie saldo (+7.0 pkt w kraju, +28.6 pkt na Śląsku).\n"
        "3. Drugie życie sprawy Piotra Wawrzyka po kwietniu 2024 r.:\n"
        "   a) Prace komisji śledczej ds. afery wizowej (wiosna/lato 2024): media PPG recyklingowały tezy z jego słynnego wywiadu ('ofiara Edgara K.'), "
        "ramując przesłuchania jako 'polityczną hucpę rządu Tuska'.\n"
        "   b) Transformacja w kulinarnego influencera (lato 2024 – 2026): w portalach miejskich i lifestylowych PPG Wawrzyk zaczął funkcjonować jako sympatyczny "
        "'pan od testowania ryb nad Bałtykiem' i 'tropiciel paragonów grozy', co skutecznie wypłukało z niego skojarzenia z zarzutami prokuratorskimi.\n"
        "4. 'Błąd Odpolitycznienia': Podczas gdy sukcesy rządu (np. 800+ bez wniosków) są w PPG anonimizowane jako 'suche komunikaty ZUS', "
        "krytyka ze strony posłów opozycji (drożyzna energii od 1 lipca 2024, pakt migracyjny) otrzymuje wyraziste nazwiska, zdjęcia i emocjonalne nagłówki."
    )
    cr.font.size = Pt(9.0)
    cr.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. Gdzie promowana jest opozycja po kwietniu 2024?
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)
    r_h2 = h2.add_run("2. Geografia wpływów po kwietniu 2024 r.: Gdzie opozycja zachowała dominację?")
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True
    r_h2.font.color.rgb = RGBColor.from_string(NAVY)

    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(6)
    p2.add_run(
        "Po kwietniu 2024 roku mapa sympatii politycznych w PPG uległa polaryzacji. Podczas gdy redakcje w Gdańsku (Dziennik Bałtycki, saldo KO +17.6) "
        "i Wrocławiu (Gazeta Wrocławska, KO +10.8) zaczęły intensywnie rozliczać błędy poprzedniej władzy, pas południowo-wschodni pozostał niezdobytym bastionem prawicy:"
    )

    t1 = doc.add_table(rows=1, cols=6)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Dziennik regionalny", "Region", "Saldo PiS", "Saldo KO", "Karol Nawrocki", "Marcin Horała (CPK)"]
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
        ("Nowiny", "Podkarpackie", "+7.1", "-35.7", "+20.6", "+18.8"),
        ("Kurier Lubelski", "Lubelskie", "+2.5", "-30.6", "+18.2", "+12.9"),
        ("Echo Dnia", "Świętokrzyskie", "-1.8", "-27.0", "+13.8", "+13.9"),
        ("Kurier Poranny / Gazeta Współczesna", "Podlaskie", "0.0", "-27.9", "+14.2", "+12.9"),
        ("Gazeta Krakowska / Dziennik Polski", "Małopolskie", "-3.6", "-21.2", "+13.8", "+21.0"),
        ("Dziennik Zachodni", "Śląskie", "-9.1", "-21.0", "-4.0", "+28.6"),
        ("Gazeta Pomorska / Nowości", "Kujawsko-Pomorskie", "-11.6", "-0.7", "+2.3", "+17.5"),
        ("Dziennik Łódzki", "Łódzkie", "-26.8", "+3.2", "-4.0", "+15.1"),
        ("Nowa Trybuna Opolska", "Opolskie", "-29.7", "+2.4", "-4.0", "+16.6"),
        ("Głos Wielkopolski", "Wielkopolskie", "-37.3", "+7.0", "-13.5", "+17.0"),
        ("Gazeta Lubuska", "Lubuskie", "-36.7", "+9.0", "-15.0", "+14.6"),
        ("Gazeta Wrocławska", "Dolnośląskie", "-39.5", "+10.8", "-25.2", "+17.7"),
        ("Dziennik Bałtycki", "Pomorskie", "-44.5", "+17.6", "-24.0", "+15.9")
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

    # 3. W jaki sposób? Nowe techniki promocji
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(16)
    h3.paragraph_format.space_after = Pt(6)
    r_h3 = h3.add_run("3. W jaki sposób promowana jest opozycja po kwietniu 2024 r.?")
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = RGBColor.from_string(NAVY)

    p3 = doc.add_paragraph()
    p3.paragraph_format.space_after = Pt(6)
    p3.add_run(
        "Po usunięciu partyjnych komisarzy z czasów Orlenu politycy opozycji musieli zredefiniować swoje relacje z mediami PPG. "
        "Od kwietnia 2024 roku wykształciły się cztery dominujące strategie penetracji łamów dzienników i portali wydawnictwa:"
    )

    strats = [
        ("Strategia 1: 'Boczna Furtka Rozwojowa' (Sukces Marcina Horały od czerwca 2024 r.)",
         "Utworzenie ruchu 'Tak Dla Rozwoju' w czerwcu 2024 r. przez Marcina Horałę (PiS) i Paulinę Matysiak (Lewica) było majstersztykiem piarowym. "
         "Zamiast bronić 8 lat rządów PiS, Horała wszedł na łamy PPG jako bezpartyjny ekspert ds. logistyki, broniący CPK, portu kontenerowego w Świnoujściu "
         "i elektrowni jądrowych. W dziennikach regionalnych (zwłaszcza na Śląsku i Pomorzu) uzyskał najwyższe dodatnie notowania spośród wszystkich polityków w Polsce (+7.0 do +28.6 pkt)."),
        ("Strategia 2: Format 'Kustosza Tożsamości' (Karol Nawrocki w kampanii 2024–2026)",
         "Przygotowując grunt pod wybory prezydenckie, prezes IPN Karol Nawrocki był po kwietniu 2024 r. systematycznie promowany w pasie wschodnim "
         "(Nowiny, Kurier Lubelski, Gazeta Krakowska). Relacje z uroczystości patriotycznych, odsłonięć tablic i walki o dobre imię Polski "
         "pozwoliły mu na osiągnięcie dodatnich sald rzędu +18 do +20.6 pkt, całkowicie izolując go od sporów o rozliczenia PiS."),
        ("Strategia 3: Przebieranie konferencji poselskich za interwencje społeczne",
         "Posłowie PiS i Konfederacji w terenie wyspecjalizowali się w organizowaniu konferencji prasowych pod zamykanymi oddziałami szpitalnymi, "
         "szkołami czy fabrykami w restrukturyzacji. Redakcje powiatowe NaszeMiasto.pl – cierpiące na brak własnych reporterów – publikowały te wystąpienia "
         "w formule 1:1, bez konfrontacji z władzami samorządowymi czy ministerstwem."),
        ("Strategia 4: Asymetria ramowania sukcesów rządu (Błąd zbadany w PPGscope)",
         "Gdy rząd premiera Tuska wprowadzał flagowe projekty (np. zniesienie corocznych wniosków o 800+, renta wdowia), redakcje PPG pod nowym kierownictwem "
         "popadały w drugą skrajność: depolityzowały sukcesy do poziomu 'suchego poradnika ZUS', wycinając premiera z 82% nagłówków. "
         "W rezultacie rząd brał na siebie koszty trudnych reform, a wdzięczność społeczną w Polsce powiatowej oddawano urzędowi lub opozycji.")
    ]
    for s_title, s_desc in strats:
        p_s = doc.add_paragraph()
        p_s.paragraph_format.space_before = Pt(3)
        p_s.paragraph_format.space_after = Pt(3)
        rs = p_s.add_run(f"• {s_title}: ")
        rs.bold = True
        rs.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)
        p_s.add_run(s_desc)

    # 4. Studium przypadku: Wawrzyk po kwietniu 2024
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(16)
    h4.paragraph_format.space_after = Pt(6)
    r_h4 = h4.add_run("4. Słynny wywiad i drugie życie Piotra Wawrzyka w PPG po kwietniu 2024 r.")
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = RGBColor.from_string(NAVY)

    p4 = doc.add_paragraph()
    p4.paragraph_format.space_after = Pt(6)
    p4.add_run(
        "Kluczowym elementem zlecenia jest zbadanie losów Piotra Wawrzyka i oddziaływania jego słynnego wywiadu w okresie po kwietniu 2024 roku. "
        "Analiza wykazuje dwa zbieżne, niezwykle interesujące zjawiska medialne:"
    )

    w_sub1 = doc.add_paragraph()
    w_sub1.paragraph_format.space_before = Pt(6)
    w_sub1.paragraph_format.space_after = Pt(3)
    rw1 = w_sub1.add_run("4.1. Recykling słynnego wywiadu podczas przesłuchań komisji śledczej (Wiosna–Lato 2024)")
    rw1.bold = True
    rw1.font.size = Pt(11)
    rw1.font.color.rgb = RGBColor.from_string(CRIMSON)

    p_w1 = doc.add_paragraph()
    p_w1.paragraph_format.space_after = Pt(6)
    p_w1.add_run(
        "Wiosną 2024 roku, gdy ruszyły kluczowe przesłuchania sejmowej komisji śledczej ds. afery wizowej, Piotr Wawrzyk skorzystał z prawa do odmowy zeznań. "
        "Wówczas w mediach konserwatywnych oraz w artykułach sprawozdawczych portalu i.pl i dzienników PPG doszło do pełnego recyklingu tez z jego słynnego wywiadu "
        "w Radiu ZET (Podejrzani Politycy Extra z listopada 2023 r.). "
        "Przekaz Wawrzyka – że 'został wykorzystany przez Edgara K.', że 'nie wziął ani grosza', a cała sprawa to 'prywatna działalność młodego oszusta' – "
        "był przedstawiany jako jedyna wiarygodna wersja wydarzeń. Działania komisji pod kierownictwem posła Michała Szczerby były w regionalnych komentarzach PPG "
        "ramowane jako 'polityczny lincz i spektakl na potrzeby kampanii europejskiej'."
    )

    w_sub2 = doc.add_paragraph()
    w_sub2.paragraph_format.space_before = Pt(6)
    w_sub2.paragraph_format.space_after = Pt(3)
    rw2 = w_sub2.add_run("4.2. Pralnia kulinarna: Transformacja z oskarżonego w tiktokera (Lato 2024 – 2026)")
    rw2.bold = True
    rw2.font.size = Pt(11)
    rw2.font.color.rgb = RGBColor.from_string(CRIMSON)

    p_w2 = doc.add_paragraph()
    p_w2.paragraph_format.space_after = Pt(6)
    p_w2.add_run(
        "Najbardziej spektakularnym zjawiskiem w okresie po kwietniu 2024 r. (zainicjowanym w wakacje 2024 r. i kontynuowanym w kolejnych latach) "
        "było wejście Piotra Wawrzyka w rolę kulinarnego influencera na TikToku i Facebooku. Były wiceminister zaczął publikować filmy z nadmorskich smażalni, "
        "oceniając świeżość dorsza, wielkość szaszłyków, a przede wszystkim 'paragony grozy'.\n\n"
        "Zamiast bojkotu, miejskie i lifestylowe portale Polska Press (w tym Echo Dnia, Dziennik Bałtycki i serwisy NaszeMiasto.pl) masowo zaczęły "
        "publikować artykuły o 'nowej pasji byłego ministra'. Publikacje te miały wydźwięk skrajnie ocieplający i laurkowy: Wawrzyk był przedstawiany jako "
        "skromny, sympatyczny człowiek blisko ludzkich spraw, który 'doradza turystom, jak nie przepłacać za obiad'. "
        "Ta zręczna operacja wizerunkowa doprowadziła do wyparcia z lokalnej świadomości zarzutów korupcyjnych CBA i komisji śledczej, "
        "zastępując je wizerunkiem swojskiego recenzenta kotletów schabowych."
    )

    # 5. Przekazy i prawidłowości po kwietniu 2024
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(16)
    h5.paragraph_format.space_after = Pt(6)
    r_h5 = h5.add_run("5. Jakich przekazów używa opozycja w PPG od kwietnia 2024 r.?")
    r_h5.font.size = Pt(14)
    r_h5.font.bold = True
    r_h5.font.color.rgb = RGBColor.from_string(NAVY)

    p5 = doc.add_paragraph()
    p5.paragraph_format.space_after = Pt(6)
    p5.add_run(
        "W okresie od kwietnia 2024 r. w mediach PPG zidentyfikowano cztery wiodące narracje opozycyjne o najwyższym stopniu nasycenia emocjonalnego:"
    )

    narrs = [
        ("Narracja 1: 'Sabotaż CPK i strategicznych inwestycji pod dyktando Niemiec'",
         "Dominujący motyw po czerwcu 2024 r. Opozycja przekonuje, że audyty i modyfikacje projektu CPK ogłoszone przez premiera Tuska to celowe opóźnianie "
         "rozwoju Polski, by nie tworzyć konkurencji dla lotniska w Berlinie i portu w Hamburgu."),
        ("Narracja 2: 'Rachunki grozy i drenaż portfeli od 1 lipca 2024 r.'",
         "Odmrożenie cen energii i gazu od połowy 2024 r. stało się paliwem dla setek lokalnych publikacji. Opozycja przedstawia rząd jako bezdusznego poborcę, "
         "zestawiając to z tarczami osłonowymi rządu Morawieckiego."),
        ("Narracja 3: 'Pakt Migracyjny i incydenty graniczne' (Osinów Dolny)",
         "Głośna sprawa z czerwca 2024 r., gdy niemiecki radiowóz pozostawił migrantów po polskiej stronie granicy, była w przygranicznych dziennikach PPG "
         "(Gazeta Lubuska, Głos Szczeciński) oraz na wschodzie eksploatowana przez posłów PiS jako 'dowód kapitulacji suwerenności granicznej'."),
        ("Narracja 4: 'Polityczna zemsta i igrzyska zamiast chleba'",
         "Rozliczanie Funduszu Sprawiedliwości, areszty i komisje śledcze są przedstawiane w wypowiedziach posłów opozycji jako próba przykrycia braku "
         "spełnienia '100 konkretów na 100 dni'.")
    ]
    for n_title, n_desc in narrs:
        p_n = doc.add_paragraph()
        p_n.paragraph_format.space_before = Pt(3)
        p_n.paragraph_format.space_after = Pt(3)
        rn = p_n.add_run(f"• {n_title}: ")
        rn.bold = True
        rn.font.color.rgb = RGBColor.from_string(CRIMSON)
        p_n.add_run(n_desc)

    # 6. Rekomendacje dla Zarządu PPG i MAP
    h6 = doc.add_paragraph()
    h6.paragraph_format.space_before = Pt(16)
    h6.paragraph_format.space_after = Pt(6)
    r_h6 = h6.add_run("6. Wnioski i rekomendacje dla Zarządu PPG oraz Ministerstwa Aktywów Państwowych")
    r_h6.font.size = Pt(14)
    r_h6.font.bold = True
    r_h6.font.color.rgb = RGBColor.from_string(NAVY)

    recs = [
        ("Audyt personalny i standardy reporterskie w bastionach wschodnich: ",
         "Nowy zarząd PPG musi zweryfikować procedury doboru tematów i źródeł w Nowinach, Kurierze Lubelskim i Echu Dnia. "
         "Dziennikarstwo regionalne nie może polegać na bezkrytycznym przepisywaniu konferencji lokalnych posłów PiS."),
        ("Koniec z ocieplaniem wizerunku podejrzanych polityków (Casus kulinarny Wawrzyka): ",
         "Wprowadzenie wytycznych etycznych zakazujących promowania polityków objętych zarzutami prokuratorskimi w działach lifestylowych i kulinarnych "
         "jako sympatycznych influencerów, co stanowi ukrytą formę prania wizerunku."),
        ("Reforma agregacji na 509 portalach NaszeMiasto.pl: ",
         "Zablokowanie automatycznego zaciągania niesprawdzonych depesz politycznych przez tzw. 'portale-widma'. Wprowadzenie obowiązku autoryzacji "
         "i konfrontacji z drugą stroną przed publikacją zarzutów opozycji."),
        ("Odzyskanie podmiotowości komunikacyjnej rządu: ",
         "Zakończenie szkodliwego 'błędu odpolitycznienia'. Decyzje rządu mające pozytywny wpływ na obywateli muszą być komunikowane wprost, z nazwiskami "
         "i celami strategicznymi, a nie redukowane do suchych formularzy urzędowych.")
    ]
    for r_title, r_desc in recs:
        p_r = doc.add_paragraph(style='List Bullet')
        rr = p_r.add_run(r_title)
        rr.bold = True
        rr.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)
        p_r.add_run(r_desc)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_before = Pt(12)
    p_end.paragraph_format.space_after = Pt(0)
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_end = p_end.add_run("Raport sporządzono na podstawie danych platformy PPGscope.pl · Warszawa – Listopad 2026 r.")
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
