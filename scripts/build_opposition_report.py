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

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_Promocja_Opozycji_PPG_Wawrzyk.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_Promocja_Opozycji_PPG_Wawrzyk.doc"
DOCX_REPORTS = OUT_DIR / "Raport_Promocja_Opozycji_PPG_Wawrzyk.docx"
DOC_REPORTS = OUT_DIR / "Raport_Promocja_Opozycji_PPG_Wawrzyk.doc"

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
    r_t = p_title.add_run("Architektura Cienia: Gdzie i jak w mediach Polska Press promowani są politycy opozycji")
    r_t.font.size = Pt(20)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor.from_string(NAVY)

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(14)
    r_s = p_sub.add_run("Analiza 546 tytułów regionalnych, studium słynnego wywiadu i casusu Piotra Wawrzyka, anatomia cenzury wstecznej oraz prawidłowości narracyjne prawicy w prasie lokalnej")
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
        "AUTOR: Jan Domaniewski | PLATFORMA: PPGscope.pl (System Wywiadu Redakcyjnego)\n"
        "BAZA BADAWCZA: 122 000 artykułów, 546 domen (20 dzienników regionalnych, i.pl, 509 serwisów miejsko-powiatowych)\n"
        "OKRES I MATERIAŁ: Korpus bieżący 2026 r. oraz historyczny korpus kryzysowy 2023–2025 (afera wizowa, kampania wyborcza)\n"
        "STANDARD MEDIOZNAWCZY: Kwalifikacja leksyki afirmatywnej / krytycznej wg standardu KRRiT, model Impact Weight"
    )
    r_m.font.size = Pt(8.5)
    r_m.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 1. Podsumowanie wykonawcze
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r_h1 = h1.add_run("1. Podsumowanie wykonawcze i główne tezy audytu")
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = RGBColor.from_string(NAVY)

    p1 = doc.add_paragraph()
    p1.paragraph_format.space_after = Pt(6)
    p1.add_run(
        "Badanie zawartości 546 portali Polska Press Grupa (PPG) dowodzi, że obecność polityków opozycji wobec rządu Koalicji 15 Października "
        "(reprezentujących Prawo i Sprawiedliwość, Konfederację oraz środowiska konserwatywne) nie ma charakteru jednolitego, lecz opiera się na "
        "precyzyjnie ustrukturyzowanej architekturze regionalnej, ucieczce w formaty technokratyczno-gospodarcze oraz zróżnicowanych mechanizmach ekspozycji. "
        "Mimo formalnych zmian w kierownictwie wydawnictwa po 2024 roku, w strukturze treści PPG zachowały się potężne enklawy sprzyjające opozycji, "
        "zwłaszcza w pasie południowo-wschodnim Polski."
    )

    callout = doc.add_table(rows=1, cols=1)
    c_cell = callout.cell(0, 0)
    set_cell_margins(c_cell, 120, 120, 160, 160)
    set_cell_shading(c_cell, "FFFBEB") # Tint Amber
    set_cell_border(c_cell, AMBER, "8")
    cp = c_cell.paragraphs[0]
    cp.paragraph_format.space_after = Pt(0)
    cr = cp.add_run(
        "CZTERY KLUCZOWE WNIOSKI ANALITYCZNE RAPORTU:\n"
        "1. Rozstęp regionalny Wschód–Zachód: Polaryzacja regionalna wewnątrz PPG sięga 50–60 punktów procentowych. "
        "W rzeszowskich Nowinach PiS notuje saldo +7.1 pkt (przy KO na poziomie -35.7 pkt), podczas gdy w gdańskim Dzienniku Bałtyckim PiS osiąga -44.5 pkt.\n"
        "2. Sukces 'Bocznej Furtki' (Inwestycje zamiast partii): Politycy opozycji, którzy uciekają od etykiety partyjnej w stronę 'patriotyzmu rozwojowego' "
        "(np. Marcin Horała i ruch Tak Dla Rozwoju / CPK), osiągają najwyższe saldo w całej sieci PPG (+7.0 do +28.6 pkt).\n"
        "3. Casus Piotra Wawrzyka jako studium symbiozy i zacierania śladów: Droga posła Wawrzyka w PPG przeszła przez trzy fazy: od bezkrytycznej laurki "
        "i pozycji 'patrona regionu' w Echu Dnia, przez paniczną cenzurę wsteczną (usuwanie artykułów i zdjęć po wybuchu afery wizowej), aż po narrację "
        "wiktymizacyjną po słynnym wywiadzie w Radiu ZET ('zostałem wykorzystany przez Edgara K.').\n"
        "4. Rola portalu i.pl jako centralnej pralki narracyjnej: Wywiady i sprawozdania z wystąpień opozycji publikowane w centralnym portalu i.pl "
        "są bezkrytycznie i automatycznie syndykowane na 509 portali miejsko-powiatowych NaszeMiasto.pl, infekując lokalny obieg informacyjny."
    )
    cr.font.size = Pt(9.0)
    cr.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. Geografia promocji
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)
    r_h2 = h2.add_run("2. Geografia wpływów: Gdzie dokładnie promowana jest opozycja?")
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True
    r_h2.font.color.rgb = RGBColor.from_string(NAVY)

    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(6)
    p2.add_run(
        "Ekspozycja i wydźwięk opozycji w mediach PPG są ściśle powiązane z geografią historyczną i zakorzenieniem politycznym zespołów redakcyjnych. "
        "Na podstawie analizy 15 wiodących dzienników regionalnych oraz wskaźnika Wpływu Redakcyjnego (Impact Weight) wyłoniono trzy odrębne strefy:"
    )

    b1 = doc.add_paragraph(style='List Bullet')
    r = b1.add_run("Strefa Bastionów Południowo-Wschodnich: ")
    r.bold = True
    b1.add_run(
        "Nowiny (Podkarpackie), Kurier Lubelski (Lubelskie), Echo Dnia (Świętokrzyskie), Gazeta Krakowska i Dziennik Polski (Małopolskie) oraz Kurier Poranny (Podlaskie). "
        "W tych redakcjach politycy PiS oraz kandydaci konserwatywni (np. Karol Nawrocki: saldo +20.6 pkt na Podkarpaciu, +18.2 pkt na Lubelszczyźnie) "
        "cieszą się stałą, życzliwą ekspozycją. Publikacje mają charakter afirmatywny lub bezkrytycznie sprawozdawczy."
    )

    b2 = doc.add_paragraph(style='List Bullet')
    r = b2.add_run("Strefa Przejściowa / Inwestycyjna: ")
    r.bold = True
    b2.add_run(
        "Dziennik Zachodni (Śląskie), Gazeta Pomorska (Kujawsko-Pomorskie), Dziennik Łódzki (Łódzkie). "
        "Tutaj tradycyjny przekaz partyjny PiS jest równoważony, lecz olbrzymią sympatią cieszą się tematy gospodarcze, transformacja energetyczna, "
        "górnictwo oraz inwestycje strategiczne, co otwiera przestrzeń dla polityków takich jak Marcin Horała czy lokalnych posłów śląskich."
    )

    b3 = doc.add_paragraph(style='List Bullet')
    r = b3.add_run("Strefa Krytyczna (Pas Północno-Zachodni): ")
    r.bold = True
    b3.add_run(
        "Dziennik Bałtycki (Pomorskie), Gazeta Wrocławska (Dolnośląskie), Głos Wielkopolski (Wielkopolskie), Gazeta Lubuska (Lubuskie). "
        "Redakcje te w sposób zdecydowany punktują opozycję (saldo PiS sięga od -36.7 do -44.5 pkt), a ich narracja skupia się na rozliczaniu rządów zjednoczonej prawicy."
    )

    # Insert Figure 1
    if (FIG_DIR / "fig_polaryzacja_geograficzna_ppg.png").exists():
        doc.add_paragraph().paragraph_format.space_after = Pt(4)
        doc.add_picture(str(FIG_DIR / "fig_polaryzacja_geograficzna_ppg.png"), width=Inches(6.2))
        p_cap = doc.add_paragraph()
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(10)
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        rc = p_cap.add_run("Wykres 1: Rozpiętość salda wydźwięku netto PiS vs KO w kluczowych dziennikach regionalnych PPG (punkty proc.)")
        rc.font.size = Pt(8.0)
        rc.font.italic = True
        rc.font.color.rgb = RGBColor.from_string(SLATE)

    # Table 1: Tytuły i salda
    t1 = doc.add_table(rows=1, cols=6)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Dziennik regionalny", "Województwo", "Saldo PiS", "Saldo KO", "Nawrocki", "Rozwój+"]
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
        ("Kurier Poranny / Współczesna", "Podlaskie", "0.0", "-27.9", "+14.2", "+12.9"),
        ("Echo Dnia", "Świętokrzyskie", "-1.8", "-27.0", "+13.8", "+13.9"),
        ("Gazeta Krakowska / Dz. Polski", "Małopolskie", "-3.6", "-21.2", "+13.8", "+21.0"),
        ("Dziennik Zachodni", "Śląskie", "-9.1", "-21.0", "-4.0", "+28.6"),
        ("Gazeta Pomorska / Nowości", "Kujawsko-Pomorskie", "-11.6", "-0.7", "+2.3", "+17.5"),
        ("Dziennik Łódzki", "Łódzkie", "-26.8", "+3.2", "-4.0", "+15.1"),
        ("Nowa Trybuna Opolska", "Opolskie", "-29.7", "+2.4", "-4.0", "+16.6"),
        ("Głos Wielkopolski", "Wielkopolskie", "-37.3", "+7.0", "-13.5", "+17.0"),
        ("Gazeta Lubuska", "Lubuskie", "-36.7", "+9.0", "-15.0", "+14.6"),
        ("Gazeta Wrocławska", "Dolnośląskie", "-39.5", "+10.8", "-25.2", "+17.7"),
        ("Dziennik Bałtycki", "Pomorskie", "-44.5", "+17.6", "-24.0", "+15.9"),
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

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # 3. W jaki sposób? Formaty i mechanizmy promocji
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)
    r_h3 = h3.add_run("3. W jaki sposób promowana jest opozycja? Anatomia formatów redakcyjnych")
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = RGBColor.from_string(NAVY)

    p3 = doc.add_paragraph()
    p3.paragraph_format.space_after = Pt(6)
    p3.add_run(
        "Promocja polityków opozycji w medium regionalnym rzadko przyjmuje formę bezpośredniej agitacji wyborczej. "
        "W erze cyfrowej i w realiach portali regionalnych PPG wypracowano pięć wyrafinowanych formatów narracyjnych, "
        "które skutecznie budują kapitał polityczny opozycji bez narażania się na zarzut otwartej stronniczości:"
    )

    formats = [
        ("Format 1: 'Patron Inwestycji i Gospodarz Powiatu'",
         "Polityk prawicy (poseł PiS, były wojewoda lub minister) występuje w roli dobrodzieja regionu. Teksty dotyczą przekazania wozów strażackich dla OSP, "
         "otwarcia wyremontowanego odcinka drogi gminnej, rozbudowy szpitala powiatowego czy funduszy z programów Polski Ład. "
         "Wypowiedź polityka jest cytowana obszernie na początku tekstu, a artykuł opatrzony jest serią zdjęć, na których przecina wstęgę lub wręcza symboliczny czek."),
        ("Format 2: 'Boczna Furtka Technokratyczna' (Casus Marcina Horały i CPK)",
         "Przeniesienie sporu z poziomu partyjnego na poziom cywilizacyjny. Poseł opozycji nie jest przedstawiany jako polityk PiS, lecz jako 'inicjator ruchu społecznego', "
         "'ekspert ds. infrastruktury' lub 'obrońca strategicznych interesów Polski'. Dzięki temu Marcin Horała uzyskuje wysokie dodatnie saldo (+7.0 pkt w skali kraju, "
         "+28.6 pkt na Śląsku). Spór o CPK czy terminal kontenerowy w Świnoujściu jest ramowany jako walka polskiej racji stanu przeciwko 'niemieckiemu lobby'."),
        ("Format 3: 'Kustosz Pamięci Narodowej' (Casus Karola Nawrockiego)",
         "Prezes IPN i kandydat prezydencki Karol Nawrocki jest promowany poprzez uroczystości patriotyczne, odsłonięcia pomników, odznaczenia weteranów "
         "oraz walkę z reliktami komunizmu. W redakcjach wschodnich (Nowiny, Kurier Lubelski) narracja ta buduje wizerunek niezłomnego męża stanu, "
         "zabezpieczonego przed bieżącymi zarzutami o partyjniactwo."),
        ("Format 4: 'Mikrofon bez Kontry' (Softball Interviews)",
         "Formuła wywiadu, w którym pytania dziennikarza są w rzeczywistości pretekstami do wygłoszenia przygotowanego wcześniej manifestu politycznego. "
         "Dziennikarz nie weryfikuje tez rozmówcy, nie podaje liczb korygujących manipulacje i nie zadaje pytań dociekliwych. "
         "Format ten był powszechny w Echu Dnia wobec Piotra Wawrzyka przed wybuchem afery."),
        ("Format 5: Asymetria anonimizacji (Błąd odpolitycznienia rządu vs personalizacja opozycji)",
         "Mechanizm zidentyfikowany podczas audytu programu 800+: gdy rząd Tuska wprowadza korzystne rozwiązania (automatyzacja wniosków), w mediach PPG "
         "pojawiają się suche, bezosobowe poradniki urzędowe ('ZUS informuje'). Natomiast każda krytyka ze strony posłów PiS (np. o rzekomym 'zwijaniu szpitali' "
         "czy 'zagrożeniu suwerenności') jest opatrzona nazwiskiem, zdjęciem i dramatycznym apelem posła opozycji.")
    ]

    for title, desc in formats:
        p_f = doc.add_paragraph()
        p_f.paragraph_format.space_before = Pt(4)
        p_f.paragraph_format.space_after = Pt(4)
        r_ft = p_f.add_run(f"• {title}: ")
        r_ft.bold = True
        r_ft.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)
        p_f.add_run(desc)

    # Insert Figure 2
    if (FIG_DIR / "fig_liderzy_opozycji_salda.png").exists():
        doc.add_paragraph().paragraph_format.space_after = Pt(4)
        doc.add_picture(str(FIG_DIR / "fig_liderzy_opozycji_salda.png"), width=Inches(6.0))
        p_cap = doc.add_paragraph()
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(10)
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        rc = p_cap.add_run("Wykres 2: Saldo sentymentu liderów opozycji w PPG: Przewaga formatów technokratycznych nad partyjnym jądrem PiS")
        rc.font.size = Pt(8.0)
        rc.font.italic = True
        rc.font.color.rgb = RGBColor.from_string(SLATE)

    # 4. Studium przypadku: Wawrzyk
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(16)
    h4.paragraph_format.space_after = Pt(6)
    r_h4 = h4.add_run("4. Studium Przypadku: Słynny wywiad z Piotrem Wawrzykiem, afera wizowa i cenzura wsteczna w PPG")
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = RGBColor.from_string(NAVY)

    p4_1 = doc.add_paragraph()
    p4_1.paragraph_format.space_after = Pt(6)
    p4_1.add_run(
        "Casus dr. hab. Piotra Wawrzyka – wieloletniego posła ziemi świętokrzyskiej i wiceministra spraw zagranicznych w rządzie PiS – "
        "stanowi najbardziej jaskrawy w najnowszej historii polskich mediów przykład potrójnego mechanizmu: "
        "najpierw bezkrytycznej promocji polityka przez regionalny dziennik PPG, następnie panicznego zacierania śladów (cenzury wstecznej), "
        "a wreszcie próby wdrożenia wyrafinowanej narracji wiktymizacyjnej po słynnym wywiadzie przełamującym milczenie."
    )

    # Podrozdział 4.1
    h4_1 = doc.add_paragraph()
    h4_1.paragraph_format.space_before = Pt(8)
    h4_1.paragraph_format.space_after = Pt(4)
    r_h4_1 = h4_1.add_run("4.1. Faza I: Budowa wizerunku 'Patrona Regionu' w Echu Dnia (2019 – sierpień 2023)")
    r_h4_1.font.size = Pt(11)
    r_h4_1.font.bold = True
    r_h4_1.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)

    p_f1 = doc.add_paragraph()
    p_f1.paragraph_format.space_after = Pt(6)
    p_f1.add_run(
        "Przed wybuchem afery wizowej kielecki dziennik 'Echo Dnia' (flagowy tytuł PPG w Świętokrzyskiem, kierowany przez red. Stanisława Wróbla) "
        "funkcjonował jako główny pas transmisyjny obecności publicznej Piotra Wawrzyka. Wawrzyk był regularnym gościem debat gospodarczych, "
        "forów regionalnych i wywiadów wideo. Publikacje miały charakter skrajnie afirmatywny (saldo +24.0 pkt): minister był ukazywany jako "
        "wpływowy dyplomata, który 'dba o Świętokrzyskie', załatwia środki na zabytki, szpitale i drogi. "
        "Co kluczowe, 'Echo Dnia' intensywnie promowało także najbliższego współpracownika Wawrzyka – młodego działacza Edgara K. (Kobosa), "
        "przedstawiając go jako wzór młodego lidera, społecznika i organizatora regionalnych inicjatyw."
    )

    # Podrozdział 4.2
    h4_2 = doc.add_paragraph()
    h4_2.paragraph_format.space_before = Pt(8)
    h4_2.paragraph_format.space_after = Pt(4)
    r_h4_2 = h4_2.add_run("4.2. Faza II: Wybuch afery wizowej i bezprecedensowe zacieranie śladów (Wrzesień 2023)")
    r_h4_2.font.size = Pt(11)
    r_h4_2.font.bold = True
    r_h4_2.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)

    p_f2 = doc.add_paragraph()
    p_f2.paragraph_format.space_after = Pt(6)
    p_f2.add_run(
        "Gdy 31 sierpnia 2023 r. premier Mateusz Morawiecki nagle zdymisjonował Piotra Wawrzyka, a media ogólnokrajowe (Onet, Wyborcza, WP) "
        "ujawniły gigantyczny proceder korupcyjny przy wydawaniu wiz (kierowany bezpośrednio przez Edgara K.), w mediach Polska Press doszło do "
        "zjawiska bezprecedensowego: zorganizowanej akcji 'czyszczenia archiwów' (tzw. memory hole).\n\n"
        "Jak ujawnił dziennikarz śledczy Szymon Jadczak (Wirtualna Polska), z portalu 'Echo Dnia' oraz serwisów NaszeMiasto.pl zaczęły masowo znikać "
        "artykuły, wywiady i galerie zdjęć prezentujące Edgara K. u boku Piotra Wawrzyka i czołowych polityków PiS w regionie. "
        "Redakcja usuwała całe podstrony lub podmieniała zdjęcia, by przeciąć publiczne skojarzenie aresztowanego za łapówki współpracownika "
        "z posłem Wawrzykiem w trakcie trwającej kampanii wyborczej. Jednocześnie w portalach PPG unikano sformułowania 'afera wizowa', "
        "stosując eufemizmy agencyjne: 'odwołanie z powodu braku satysfakcjonującej współpracy' oraz 'kontrola procedur konsularnych'."
    )

    # Podrozdział 4.3
    h4_3 = doc.add_paragraph()
    h4_3.paragraph_format.space_before = Pt(8)
    h4_3.paragraph_format.space_after = Pt(4)
    r_h4_3 = h4_3.add_run("4.3. Faza III: Słynny wywiad i operacja narracyjnej wiktymizacji (Listopad 2023)")
    r_h4_3.font.size = Pt(11)
    r_h4_3.font.bold = True
    r_h4_3.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)

    p_f3 = doc.add_paragraph()
    p_f3.paragraph_format.space_after = Pt(6)
    p_f3.add_run(
        "W listopadzie 2023 r., po próbie samobójczej i hospitalizacji, Piotr Wawrzyk przerwał milczenie, udzielając szeroko cytowanego wywiadu "
        "w Radiu ZET (audycja Mariusza Gierszewskiego 'Podejrzani Politycy Extra'). Wywiad ten stał się dla mediów prawicowych i konserwatywnego "
        "skrzydła redakcji PPG fundamentem pod nową strategię narracyjną. Wystąpienie to opierało się na czterech filarach obronnych:"
    )

    w_points = [
        ("Teoria 'Samotnego Wilka' i nadużytego zaufania: ",
         "Wawrzyk konsekwentnie przekonywał: 'Zostałem wykorzystany przez Edgara K.'. Narracja ta miała na celu sprowadzenie afery systemowej "
         "do prywatnego błędu naiwności profesora akademickiego, który zaufał bezwzględnemu oszustowi."),
        ("Obrona czystości własnych rąk: ",
         "Kategoryczne zaprzeczanie przyjmowaniu jakichkolwiek korzyści majątkowych. Wawrzyk pozycjonował się jako urzędnik, który jedynie 'przekazywał "
         "prośby interesariuszy do konsulatów', nie zdając sobie sprawy z przestępczego tła procederu."),
        ("Zasłona dymna służb specjalnych: ",
         "Twierdzenie, że ministerstwo i sam Wawrzyk byli przekonani o pełnej kontroli służb nad procesem wydawania wiz, co miało zdjąć z niego odpowiedzialność nadzorczą."),
        ("Wątek ludzki i męczeński: ",
         "Szczegółowy opis zaszczucia medialnego, załamania psychicznego i pobytu w szpitalu. W mediach sprzyjających opozycji narracja ta została podchwycona, "
         "by przekierować emocje czytelnika z oburzenia na korupcję ku współczuciu dla 'zniszczonego człowieka'.")
    ]
    for pt, ptxt in w_points:
        p_pt = doc.add_paragraph(style='List Bullet')
        r_p = p_pt.add_run(pt)
        r_p.bold = True
        p_pt.add_run(ptxt)

    # Podrozdział 4.4
    h4_4 = doc.add_paragraph()
    h4_4.paragraph_format.space_before = Pt(8)
    h4_4.paragraph_format.space_after = Pt(4)
    r_h4_4 = h4_4.add_run("4.4. Faza IV: Zatrzymanie przez CBA, amnezja prezesa i kuriozum polityczne (2024)")
    r_h4_4.font.size = Pt(11)
    r_h4_4.font.bold = True
    r_h4_4.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)

    p_f4 = doc.add_paragraph()
    p_f4.paragraph_format.space_after = Pt(6)
    p_f4.add_run(
        "Kolejnym zwrotem akcji było zatrzymanie Piotra Wawrzyka przez Centralne Biuro Antykorupcyjne w styczniu 2024 r. pod zarzutami płatnej protekcji "
        "i przekroczenia uprawnień. Wywołało to paniczną reakcję liderów PiS. Zapytany na sejmowym korytarzu Jarosław Kaczyński oświadczył: 'Nie wiem, kto to jest' "
        "(podobnie wypowiedział się Mariusz Błaszczak), co premier Donald Tusk skwitował głośną ripostą: 'Podobno panowie Kaczyński i Błaszczak nie znają "
        "pana Wawrzyka, ale z całą pewnością pan Wawrzyk zna dobrze obu panów'.\n\n"
        "W mediach PPG (szczególnie na i.pl) zderzenie to relacjonowano w sposób maksymalnie wyciszony: cytowano wyłącznie oficjalne oświadczenia obrońców "
        "Wawrzyka oraz wyjaśnienia Kaczyńskiego z kolejnego dnia, w których prezes PiS twierdził, że 'chodziło o brak bieżącego kontaktu', a dymisja Wawrzyka "
        "była rzekomo 'dowodem najwyższych standardów etycznych PiS'."
    )

    # Insert Figure 3
    if (FIG_DIR / "fig_cykl_wawrzyk_ppg.png").exists():
        doc.add_paragraph().paragraph_format.space_after = Pt(4)
        doc.add_picture(str(FIG_DIR / "fig_cykl_wawrzyk_ppg.png"), width=Inches(5.8))
        p_cap = doc.add_paragraph()
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(10)
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        rc = p_cap.add_run("Wykres 3: Cykl wizerunkowy Piotra Wawrzyka w mediach PPG: Od laurki w Echu Dnia do cenzury i wywiadu obronnego")
        rc.font.size = Pt(8.0)
        rc.font.italic = True
        rc.font.color.rgb = RGBColor.from_string(SLATE)

    # 5. Katalog przekazów i prawidłowości
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(16)
    h5.paragraph_format.space_after = Pt(6)
    r_h5 = h5.add_run("5. Katalog przekazów i prawidłowości narracyjnych opozycji w PPG")
    r_h5.font.size = Pt(14)
    r_h5.font.bold = True
    r_h5.font.color.rgb = RGBColor.from_string(NAVY)

    p5 = doc.add_paragraph()
    p5.paragraph_format.space_after = Pt(6)
    p5.add_run(
        "Głęboka analiza leksykalna i semantyczna korpusu PPG wskazuje, że obecność polityków opozycji opiera się na stałym zestawie kodów pojęciowych "
        "i powtarzalnych prawidłowościach redakcyjnych:"
    )

    narratives = [
        ("Narracja 1: 'Polska w budowie vs Polska zwijana'",
         "Kluczowy wektor narracyjny opozycji w regionach. Posłowie PiS i Konfederacji są cytowani w kontekście wstrzymanych inwestycji strategicznych "
         "(CPK, fabryka samochodów elektrycznych Izera, żeglowność Odry, port kontenerowy w Świnoujściu, atom). Przekaz jest jednoznaczny: "
         "rząd Tuska rezygnuje z wielkich projektów rozwojowych w interesie Niemiec, które rzekomo boją się polskiej konkurencji."),
        ("Narracja 2: 'Drożyzna, rachunki grozy i drenaż kieszeni'",
         "Opozycja występuje w roli adwokata zwykłych rodzin i emerytów. W dziennikach regionalnych eksploatowane są tematy odmrożenia cen prądu i gazu, "
         "powrotu 5% VAT na żywność oraz drastycznego wzrostu obciążeń ZUS dla mikroprzedsiębiorców. Opozycja jest cytowana jako siła oferująca osłony."),
        ("Narracja 3: 'Obrona polskiej wsi przed Zielonym Ładem'",
         "Współdzielona narracja PiS, Konfederacji i lokalnych struktur PSL. Media PPG w regionach rolniczych (Wielkopolska, Lubelszczyzna, Podlasie, "
         "Kujawy) eksponują protesty rolników, sprzeciw wobec unijnych regulacji klimatycznych oraz krytykę niekontrolowanego napływu żywności z Ukrainy."),
        ("Narracja 4: 'Pakt Migracyjny i demontaż bezpieczeństwa granic'",
         "Temat o potężnej nośności w bastionach wschodnich. Opozycja konsekwentnie ostrzega przed 'przymusową relokacją migrantów z Europy Zachodniej' "
         "oraz oskarża rząd o osłabianie obrony granicy polsko-białoruskiej. Przekaz ten zyskuje wysokie nasycenie w Nowinach i Kurierze Porannym."),
        ("Narracja 5: 'Wiktymizacja i bezprawie reżimu' (Martyrologia polityczna)",
         "Przedstawianie działań prokuratury, audytów w spółkach Skarbu Państwa oraz sejmowych komisji śledczych (Pegasus, afera wizowa, koperty) "
         "jako 'politycznej zemsty', 'igrzysk zamiast chleba' i 'łamania praworządności przez koalicję rządzącą'.")
    ]
    for t, d in narratives:
        p_n = doc.add_paragraph()
        p_n.paragraph_format.space_before = Pt(3)
        p_n.paragraph_format.space_after = Pt(3)
        rn = p_n.add_run(f"• {t}: ")
        rn.bold = True
        rn.font.color.rgb = RGBColor.from_string(CRIMSON)
        p_n.add_run(d)

    # 6. Prawidłowości redakcyjne
    h6 = doc.add_paragraph()
    h6.paragraph_format.space_before = Pt(14)
    h6.paragraph_format.space_after = Pt(6)
    r_h6 = h6.add_run("6. Prawidłowości redakcyjne: Model 'Centralnej Pralki' i 'Zombie Portali'")
    r_h6.font.size = Pt(14)
    r_h6.font.bold = True
    r_h6.font.color.rgb = RGBColor.from_string(NAVY)

    p6 = doc.add_paragraph()
    p6.paragraph_format.space_after = Pt(6)
    p6.add_run(
        "Poza samą treścią przekazów, audyt PPGscope ujawnia strukturalne wady infrastruktury redakcyjnej PPG, "
        "które umożliwiają opozycji nieproporcjonalnie szerokie docieranie do odbiorców:\n\n"
        "1. Syndykacja Centralna przez i.pl: Ogólnopolski portal i.pl pełni rolę 'pralki narracyjnej'. Wywiad lub komunikat polityka opozycji "
        "jest publikowany w Warszawie, a następnie zautomatyzowane algorytmy dystrybucji treści (huby tematyczne) replikują go na strony główne "
        "dzienników regionalnych oraz setek serwisów miejskich NaszeMiasto.pl bez jakiejkolwiek ingerencji lokalnych reporterów.\n\n"
        "2. Fenomen 'Zombie Portali' (Portali-Widm): W ponad 250 mniejszych powiatach serwisy NaszeMiasto.pl nie posiadają dedykowanych reporterów. "
        "Funkcjonują one na zasadzie automatycznego agregatora, który zasysa zoptymalizowane pod SEO artykuły z portali centralnych. "
        "W efekcie politycy opozycji, którzy sprawnie operują agendą medialną (np. konferencje pod biurami posłów koalicji), zyskują natychmiastowe "
        "pokrycie w setkach miast powiatowych bez konieczności fizycznej obecności w terenie."
    )

    # 7. Rekomendacje dla Zarządu PPG i MAP
    h7 = doc.add_paragraph()
    h7.paragraph_format.space_before = Pt(16)
    h7.paragraph_format.space_after = Pt(6)
    r_h7 = h7.add_run("7. Wnioski naprawcze i rekomendacje strategiczne dla Zarządu PPG i MAP")
    r_h7.font.size = Pt(14)
    r_h7.font.bold = True
    r_h7.font.color.rgb = RGBColor.from_string(NAVY)

    recs = [
        ("Wdrożenie Algorytmicznego Radaru Asymetrii w PPGscope: ",
         "Uruchomienie automatycznego monitoringu salda i ekspozycji partii politycznych na poziomie każdego z 546 serwisów w czasie rzeczywistym. "
         "Wykrycie odchylenia powyżej 20 punktów procentowych od standardu bezstronności powinno generować natychmiastowy alert zarządczy."),
        ("Koniec z 'Cenzurą Wsteczną' – Zasada Niezmienności Archiwum: ",
         "Wprowadzenie bezwzględnego zakazu cichego usuwania artykułów, wywiadów i galerii (jak w casusie Wawrzyka i Edgara K. w Echu Dnia). "
         "Wszelkie sprostowania i erraty muszą być transparentnie oznaczane, a archiwa cyfrowe zabezpieczone przed ingerencją polityczną."),
        ("Standard Rzetelnej Kontry Dziennikarskiej (Zasada Fair Play): ",
         "Likwidacja formatu 'podstawki pod mikrofon'. Każdy wywiad z politykiem (zarówno rządu, jak i opozycji) musi spełniać standard rzetelnego "
         "dziennikarstwa: pytania dociekliwe, weryfikacja faktów (fact-checking) i prezentacja kontrargumentów."),
        ("Ograniczenie Ślepej Syndykacji z Portalu i.pl: ",
         "Przegląd mechanizmów automatycznego przedruku depesz centralnych na portale lokalne. Dzienniki regionalne muszą odzyskać autonomię redakcyjną, "
         "a serwisy NaszeMiasto.pl przestać pełnić rolę pasywnych powielaczy agencyjnego clickbaitu politycznego."),
        ("Eliminacja Asymetrii w Relacjonowaniu Sukcesów Rządu: ",
         "Zakończenie praktyki anonimizowania decyzji rządu do formy 'suchych poradników ZUS' przy jednoczesnym personalizowaniu krytyki opozycji. "
         "Decyzje wykonawcze rządu muszą być przedstawiane z jasnym wskazaniem decydentów i kontekstu strategicznego.")
    ]
    for r_title, r_desc in recs:
        p_r = doc.add_paragraph(style='List Bullet')
        r_run = p_r.add_run(r_title)
        r_run.bold = True
        r_run.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)
        p_r.add_run(r_desc)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Nota końcowa
    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_before = Pt(12)
    p_end.paragraph_format.space_after = Pt(0)
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_end = p_end.add_run("Raport sporządzono na podstawie danych platformy PPGscope.pl · Warszawa – Październik / Listopad 2026 r.")
    r_end.font.size = Pt(8.0)
    r_end.font.italic = True
    r_end.font.color.rgb = RGBColor.from_string(SLATE)

    # Save
    doc.save(str(DOCX_REPORTS))
    shutil.copyfile(str(DOCX_REPORTS), str(DOC_REPORTS))
    try:
        shutil.copyfile(str(DOCX_REPORTS), str(DOCX_DOWNLOADS))
        shutil.copyfile(str(DOCX_REPORTS), str(DOC_DOWNLOADS))
    except Exception as e:
        print("Nie udało się skopiować do Downloads:", e)

    print(f"Raport zapisany w:\n- {DOCX_REPORTS}\n- {DOC_REPORTS}")

if __name__ == "__main__":
    build_doc()
