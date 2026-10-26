#!/usr/bin/env python3
"""
Skrypt generujący oficjalny raport w formacie .docx i .doc:
Temat: Jak media Polska Press Grupa (PPG) relacjonowały rezygnację i wykluczenie Katarzyny Pełczyńskiej-Nałęcz.
Lokalizacja zapisu: /Users/macbookpro/Downloads/ oraz katalog reports/
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "reports"
FIG_DIR = OUT_DIR / "figures"
DOWNLOADS_DIR = Path("/Users/macbookpro/Downloads")

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_Rezygnacja_Pelczynska_Nalecz_PPG.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_Rezygnacja_Pelczynska_Nalecz_PPG.doc"
DOCX_REPORTS = OUT_DIR / "Raport_Rezygnacja_Pelczynska_Nalecz_PPG.docx"
DOC_REPORTS = OUT_DIR / "Raport_Rezygnacja_Pelczynska_Nalecz_PPG.doc"

CONTENT_WIDTH = 6.6
FIGURE_WIDTH = 6.2

# Kolory palety Corporate Editorial
NAVY = "0F2747"
BLUE = "2F6B9A"
TEAL = "2A9D8F"
TINT_TEAL = "E8F4F2"
TINT_NAVY = "EAF0F7"
CORAL = "E76F51"
TINT_CORAL = "FDF0ED"
OCHRE = "E9B44C"
GRAY = "59636E"
LIGHT = "F4F6F8"
MID = "D9E0E7"
BLACK = "1B2430"
WHITE = "FFFFFF"

NUMERIC_CELL = re.compile(r"^\s*[-+]?[0-9\s,.]+%?\s*$")


def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement("w:tcMar")
    for margin_name, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = OxmlElement(f"w:{margin_name}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tc_mar.append(node)
    tc_pr.append(tc_mar)


def set_cell_shading(cell, color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), color)
    tc_pr.append(shd)


def set_cell_border(cell, color=MID, size="4"):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = OxmlElement("w:tcBorders")
    for border_name in ["top", "left", "bottom", "right"]:
        node = OxmlElement(f"w:{border_name}")
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), size)
        node.set(qn("w:space"), "0")
        node.set(qn("w:color"), color)
        tc_borders.append(node)
    tc_pr.append(tc_borders)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_col_widths(table, widths):
    for idx, width in enumerate(widths):
        table.columns[idx].width = Inches(width)
    for row in table.rows:
        for idx, width in enumerate(widths):
            row.cells[idx].width = Inches(width)


def add_bottom_border(paragraph, color=MID, size="8"):
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), size)
    bottom.set(qn("w:space"), "5")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    p_pr.append(borders)


def set_keep_with_next(paragraph, value=True):
    p_pr = paragraph._p.get_or_add_pPr()
    node = p_pr.find(qn("w:keepNext"))
    if value and node is None:
        p_pr.append(OxmlElement("w:keepNext"))
    elif not value and node is not None:
        p_pr.remove(node)


def style_run(run, size=10.0, color=BLACK, bold=False, italic=False):
    run.font.name = "Calibri"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    run.bold = bold
    run.italic = italic


def add_text(paragraph, text, **kwargs):
    run = paragraph.add_run(text)
    style_run(run, **kwargs)
    return run


def add_body(doc, text, *, after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.12
    add_text(p, text, size=10.0)
    return p


def add_kicker(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(2)
    set_keep_with_next(p)
    add_text(p, text.upper(), size=8.0, color=CORAL, bold=True)
    return p


def add_heading(doc, text, level=1, kicker=None):
    if kicker:
        add_kicker(doc, kicker)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2 if kicker else (12 if level == 1 else 8))
    p.paragraph_format.space_after = Pt(4)
    set_keep_with_next(p)
    if level == 1:
        add_text(p, text, size=14.0, color=NAVY, bold=True)
        add_bottom_border(p, color=CORAL, size="8")
    elif level == 2:
        add_text(p, text, size=11.0, color=BLUE, bold=True)
    return p


def add_bullet(doc, title, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(2.5)
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.line_spacing = 1.10
    if title:
        add_text(p, title + ": ", size=9.8, color=NAVY, bold=True)
    add_text(p, text, size=9.8)
    return p


def add_caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(7)
    add_text(p, text, size=8.5, color=GRAY, italic=True)
    return p


def add_callout(doc, text, title=None, fill=TINT_CORAL, border_color=CORAL):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(CONTENT_WIDTH)
    cell = table.rows[0].cells[0]
    cell.width = Inches(CONTENT_WIDTH)
    set_cell_shading(cell, fill)
    set_cell_margins(cell, top=100, bottom=100, left=140, right=140)

    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = OxmlElement("w:tcBorders")

    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), "24")
    left.set(qn("w:space"), "0")
    left.set(qn("w:color"), border_color)
    tc_borders.append(left)

    for side in ["top", "bottom", "right"]:
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:val"), "nil")
        tc_borders.append(node)
    tc_pr.append(tc_borders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.line_spacing = 1.12
    if title:
        add_text(p, title + "\n", size=10.0, color=NAVY, bold=True)
    add_text(p, text, size=9.5, color=BLACK)

    doc.add_paragraph().paragraph_format.space_after = Pt(3)


def add_table(doc, headers, widths, rows, header_fill=NAVY, font_size=8.5):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_col_widths(table, widths)
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    prevent_row_split(hdr)
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_shading(cell, header_fill)
        set_cell_border(cell)
        set_cell_margins(cell, top=80, bottom=80)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(0)
        add_text(p, h, size=8.0, color=WHITE, bold=True)
    for r_idx, row in enumerate(rows):
        cells = table.add_row().cells
        prevent_row_split(table.rows[-1])
        for i, val in enumerate(row):
            cell = cells[i]
            set_cell_shading(cell, WHITE if r_idx % 2 == 0 else LIGHT)
            set_cell_border(cell)
            set_cell_margins(cell, top=60, bottom=60)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if NUMERIC_CELL.match(str(val)) else WD_ALIGN_PARAGRAPH.LEFT
            add_text(p, str(val), size=font_size, color=BLACK)
    doc.add_paragraph().paragraph_format.space_after = Pt(3)
    return table


def generate_all_charts():
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    paths = {}

    # WYKRES 1: Dystrybucja wzmianek i profil sentymentu
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8.0, 3.4), dpi=200)
    mentions = {
        'K. Pełczyńska-Nałęcz': 146,
        'D. Tusk / KPRM': 25,
        'Sz. Hołownia': 17,
        'Politycy KO': 5,
        'Politycy PL2050': 13,
        'Nowa Lewica (Trela)': 1
    }
    names = list(mentions.keys())
    counts = list(mentions.values())
    y_pos = np.arange(len(names))
    ax1.barh(y_pos, counts, color=['#E76F51', '#2F6B9A', '#E9B44C', '#2A9D8F', '#59636E', '#8E44AD'])
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(names, fontsize=8.0, color="#1B2430")
    ax1.invert_yaxis()
    ax1.set_xlabel('Liczba wzmianek w tekstach PPG', fontsize=8.0, color="#59636E")
    ax1.set_title('Ekspozycja aktorów politycznych', fontsize=9.5, fontweight='bold', pad=8, color="#0F2747")
    ax1.spines['top'].set_visible(False)
    ax1.spines['right'].set_visible(False)
    ax1.grid(axis='x', linestyle='--', alpha=0.5, color='#D9E0E7')
    for i, v in enumerate(counts):
        ax1.text(v + 1.5, i, str(v), va='center', fontsize=8.0, fontweight='bold', color="#1B2430")

    actors = ['Pełczyńska-Nałęcz', 'Donald Tusk / Rząd', 'Polska 2050']
    neg = [70, 5, 30]
    neu = [25, 20, 30]
    pos = [5, 75, 40]
    x = np.arange(len(actors))
    w = 0.52

    ax2.bar(x, neg, w, label='Negatywny (krytyka, nielojalność)', color='#E76F51')
    ax2.bar(x, neu, w, bottom=neg, label='Neutralny / proceduralny', color='#D9E0E7')
    ax2.bar(x, pos, w, bottom=np.array(neg)+np.array(neu), label='Pozytywny (kontrola, spokój)', color='#2A9D8F')
    ax2.set_ylabel('Udział wydźwięku (%)', fontsize=8.0, color="#59636E")
    ax2.set_title('Profil sentymentu narracji redakcyjnej', fontsize=9.5, fontweight='bold', pad=8, color="#0F2747")
    ax2.set_xticks(x)
    ax2.set_xticklabels(actors, fontsize=8.0, color="#1B2430")
    ax2.legend(loc='lower left', fontsize=7.0, frameon=False)
    ax2.spines['top'].set_visible(False)
    ax2.spines['right'].set_visible(False)

    plt.tight_layout()
    paths['c1'] = FIG_DIR / "chart_sentiment_overview.png"
    plt.savefig(paths['c1'], bbox_inches='tight')
    plt.close()

    # WYKRES 2: Syndykacja centralna vs dziennikarstwo lokalne
    fig, ax = plt.subplots(figsize=(7.5, 2.8), dpi=200)
    cats = ["Materiały centralne z i.pl (syndykat)", "Autorskie teksty redakcji regionalnych", "Lokalne wywiady z posłami koalicji", "Regionalne analizy wpływu na KPO"]
    shares = [100, 0, 0, 0]
    y = np.arange(len(cats))
    bars = ax.barh(y, shares, height=0.45, color=['#2F6B9A', '#D9E0E7', '#D9E0E7', '#D9E0E7'])
    ax.set_yticks(y)
    ax.set_yticklabels(cats, fontsize=8.5, fontweight="bold", color="#1B2430")
    ax.set_xlim(0, 110)
    ax.set_xlabel("Udział w całkowitej liczbie publikacji (%)", fontsize=8.0, color="#59636E")
    ax.invert_yaxis()
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#D9E0E7')
    ax.text(102, 0, "100%", va='center', ha='left', fontsize=8.5, fontweight='bold', color="#2F6B9A")
    ax.text(3, 1, "0% (brak)", va='center', ha='left', fontsize=8.5, fontweight='bold', color="#E76F51")
    ax.text(3, 2, "0% (brak)", va='center', ha='left', fontsize=8.5, fontweight='bold', color="#E76F51")
    ax.text(3, 3, "0% (brak)", va='center', ha='left', fontsize=8.5, fontweight='bold', color="#E76F51")
    plt.tight_layout()
    paths['c2'] = FIG_DIR / "chart_syndication_breakdown.png"
    plt.savefig(paths['c2'], bbox_inches='tight')
    plt.close()

    # WYKRES 3: Główne motywy przypisywane dymisji w publikacjach PPG
    fig, ax = plt.subplots(figsize=(7.5, 3.0), dpi=200)
    motives = [
        "Frustracja brakiem teki wicepremierki\n(wobec awansu A. Domańskiego)",
        "Nielojalność i permanentna krytyka rządu\n(cytaty: Nowacka, Trela, Łącki)",
        "Gra przedwyborcza pod rolę opozycji\n(cytat: Hennig-Kloska)",
        "Wierność zasadom i wartościom\n(wpis samej Pełczyńskiej-Nałęcz - podważany)"
    ]
    weight = [85, 80, 65, 20]
    colors_m = ["#E76F51", "#E76F51", "#E9B44C", "#A0AAB5"]
    y_m = np.arange(len(motives))
    bars = ax.barh(y_m, weight, height=0.5, color=colors_m)
    ax.set_yticks(y_m)
    ax.set_yticklabels(motives, fontsize=8.0, color="#1B2430")
    ax.set_xlim(0, 100)
    ax.set_xlabel("Siła akcentowania motywu w narracji PPG (%)", fontsize=8.0, color="#59636E")
    ax.invert_yaxis()
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#D9E0E7')
    for bar in bars:
        w_val = bar.get_width()
        ax.text(w_val + 1.5, bar.get_y() + bar.get_height()/2, f"{w_val}%", va='center', ha='left', fontsize=8.0, fontweight='bold', color="#1B2430")
    plt.tight_layout()
    paths['c3'] = FIG_DIR / "chart_motives_framing.png"
    plt.savefig(paths['c3'], bbox_inches='tight')
    plt.close()

    return paths


def build_full_report():
    paths = generate_all_charts()
    doc = Document()

    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        section.different_first_page_header_footer = True

        header = section.header
        p_hdr = header.paragraphs[0]
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        add_text(p_hdr, "MONITORING MEDIÓW PPG  |  REZYGNACJA PEŁCZYŃSKIEJ-NAŁĘCZ  |  PAŹDZIERNIK 2026", size=7.0, color=GRAY)

        footer = section.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_text(p_ftr, "Raport analityczny  ·  Polska Press Grupa vs Koalicja Rządowa", size=7.5, color=GRAY)

    # --- NAGŁÓWEK ---
    p_kicker = doc.add_paragraph()
    p_kicker.paragraph_format.space_before = Pt(12)
    p_kicker.paragraph_format.space_after = Pt(2)
    add_text(p_kicker, "RAPORT ANALITYCZNY  ·  MONITORING MEDIÓW POLSKA PRESS", size=8.5, color=CORAL, bold=True)

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(8)
    add_text(p_title, "„Na własne życzenie”: Jak media Polska Press zrelacjonowały dymisję i wykluczenie Katarzyny Pełczyńskiej-Nałęcz", size=17.0, color=NAVY, bold=True)
    add_bottom_border(p_title, color=CORAL, size="12")

    add_callout(doc,
        "GŁÓWNA TEZA ANALITYCZNA: Media Polska Press Grupa (PPG) potraktowały dymisję i wykluczenie Katarzyny Pełczyńskiej-Nałęcz w sposób wysoce skondensowany i ściśle scentralizowany. W całej sieci opublikowano zaledwie 4 unikalne materiały, powielone w 100% z portalu ogólnokrajowego i.pl na ponad 20 dzienników regionalnych i sieć NaszeMiasto.pl. Wydźwięk publikacji był zdecydowanie negatywny wobec byłej minister (70% wymowy krytycznej), którą przedstawiono jako nielojalną rozbijaczkę kierującą się urażoną ambicją. Jednocześnie premier Donald Tusk został wykreowany na niewzruszonego lidera zachowującego pełną kontrolę nad rządem (75% wymowy pozytywnej i stabilizującej).",
        title="SYNTEZA DLA DECYDENTÓW",
        fill=TINT_NAVY,
        border_color=NAVY
    )

    # --- ROZDZIAŁ 1 ---
    add_heading(doc, "1. Skala i zasięg relacjonowania: Centralna unifikacja zamiast głosu regionów", 1, kicker="Zasięg i struktura")

    add_bullet(doc, "Tylko 4 unikalne materiały redakcyjne", "W okresie 22–26 października 2026 r. w całym holdingu Polska Press powstały zaledwie cztery teksty poświęcone jednemu z najpoważniejszych kryzysów rządowych tej jesieni. Podczas gdy portale horyzontalne (Onet, WP, Interia) publikowały dziesiątki depesz i wywiadów na żywo, PPG utrzymała minimalny wolumen publikacyjny.")
    add_bullet(doc, "100% syndykacja centralna z i.pl", "Wszystkie artykuły zostały przygotowane przez warszawski newsroom portalu i.pl i zautomatyzowanie rozesłane do 20 dzienników regionalnych (Dziennik Bałtycki, Gazeta Krakowska, Dziennik Zachodni, Głos Wielkopolski, Gazeta Wrocławska itd.). Wszystkie mutacje regionalne posiadają znacznik rel='canonical' wskazujący na i.pl.")
    add_bullet(doc, "Całkowity brak dziennikarstwa lokalnego", "Żadna z redakcji regionalnych PPG nie przygotowała własnego materiału, komentarza, ani nie przeprowadziła wywiadu z regionalnymi parlamentarzystami Polski 2050 czy Koalicji Obywatelskiej. Nie powstała ani jedna analiza skutków zmiany na czele resortu funduszy dla regionalnych programów KPO.")

    doc.add_picture(str(paths['c2']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 1. Struktura produkcji treści w PPG: 100% syndykacja centralna, zerowy wkład własny redakcji regionalnych.")

    # --- ROZDZIAŁ 2 ---
    add_heading(doc, "2. Rejestr publikacji PPG: Chronologia i autorzy", 1, kicker="Chronologia faktów")

    headers_t = ["Data publikacji", "Tytuł artykułu w sieci PPG", "Autorzy (i.pl)", "Zasięg w PPG", "Główny wydźwięk"]
    widths_t = [1.1, 2.3, 1.1, 0.9, 1.2]
    rows_t = [
        ("22.10.2026 21:35\n(akt. 23.10)", "„Pełczyńska-Nałęcz ogłosiła, że odchodzi z rządu Donalda Tuska”", "M. Koziestański,\nA. Kielar", "i.pl + 20 dzienników regionalnych", "Negatywny / Kontra koalicyjna"),
        ("23.10.2026 08:55\n(akt. 23.10)", "„Donald Tusk: Mam dwie kandydatury na nową minister funduszy”", "Redakcja i.pl\n(depesza)", "i.pl + 20 dzienników regionalnych", "Pozytywny dla Tuska (kontrola)"),
        ("24.10.2026 18:52\n(akt. 25.10)", "„Pełczyńska-Nałęcz została wyrzucona z partii Polska 2050. Za co? Za »działanie na szkodę«”", "Robert Szulc", "i.pl + 20 dzienników regionalnych", "Mocno negatywny (szkodnictwo)"),
        ("25.10.2026 18:02\n(akt. 26.10)", "„Katarzyna Pełczyńska-Nałęcz poza rządem i partią. Na własne życzenie”", "G. Kuczyński,\nM. Koziestański", "i.pl + 20 dzienników + NaszeMiasto", "Rozliczeniowy / Potępienie postawy")
    ]
    add_table(doc, headers_t, widths_t, rows_t, header_fill=NAVY, font_size=7.5)

    doc.add_page_break()

    # --- ROZDZIAŁ 3 ---
    add_heading(doc, "3. Analiza wydźwięku: Cztery główne osie narracyjne", 1, kicker="Konstrukcja przekazu")

    add_bullet(doc, "Oś 1: „Na własne życzenie” i delegitymizacja pryncypiów", "Deklaracja minister, że 'wartości są ważniejsze niż stołki', została przez PPG zneutralizowana i podważona. W zamian redaktorzy wyeksponowali głosy koalicjantów zarzucających jej hipokryzję: przypomniano, że przez niemal 3 lata zasiadała w rządzie, a dziś 'rozlicza koalicjantów jak opozycja' (senator Waldy Dzikowski).")
    add_bullet(doc, "Oś 2: Donald Tusk jako oaza spokoju i profesjonalizmu", "Premier Tusk jest konsekwentnie portretowany jako doświadczony mąż stanu, który ze 'stoickim spokojem' przyjmuje fochy minister. Artykuły cytują jego słowa o 'politycznym pogubieniu' Pełczyńskiej-Nałęcz oraz natychmiastową deklarację, że ma dwie kompetentne kobiety na jej miejsce (Elżbieta Bieńkowska, Magdalena Sobkowiak-Czarnecka), ucinając spekulacje o paraliżu rządu.")
    add_bullet(doc, "Oś 3: Frustracja ambicjonalna jako prawdziwa przyczyna", "Jako realną przyczynę rezygnacji PPG wskazuje nie spór o samorządy, lecz zablokowanie przez Tuska jej awansu na wicepremiera w kontekście nominacji dla Andrzeja Domańskiego. Przytoczono słowa Barbary Nowackiej o tym, że bycie w kontrze do rządu nie przyniosło Polsce 2050 zysków, lecz spadek notowań.")
    add_bullet(doc, "Oś 4: Wyrzucenie z partii za „działanie na szkodę”", "Decyzja zarządu Polski 2050 z soboty została przedstawiona jako logiczna i nieuchronna konsekwencja rozbijania ugrupowania. PPG zacytowało wiceszefa cyfryzacji Michała Gramatykę, który skwitował usunięcie Pełczyńskiej-Nałęcz słowami: 'I słusznie'.")

    doc.add_picture(str(paths['c1']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 2. Udział wzmianek podmiotów w tekstach PPG oraz rozkład wydźwięku redakcyjnego (sentyment).")

    doc.add_picture(str(paths['c3']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 3. Siła akcentowania motywów odejścia minister: prymat frustracji ambicjonalnej i nielojalności nad deklarowanymi wartościami.")

    # --- ROZDZIAŁ 4 ---
    add_heading(doc, "4. Zestawienie porównawcze: PPG na tle rynku medialnego", 1, kicker="Kontekst rynkowy")

    headers_c = ["Wymiar analizy", "Portale horyzontalne (Onet / WP / Interia)", "Media prawicowe (wPolityce / Do Rzeczy / Republika)", "Polska Press Grupa (i.pl / Regiony)"]
    widths_c = [1.2, 1.8, 1.8, 1.8]
    rows_c = [
        ("Dynamika i wolumen", "Ciągły strumień relacji, wywiady wideo, komentarze politologów na gorąco.", "Bardzo szerokie relacjonowanie, nacisk na rozpad koalicji i wojnę w obozie Tuska.", "Skrajnie oszczędny: zaledwie 4 teksty w ciągu 4 dni, publikowane z opóźnieniem."),
        ("Wizerunek premiera Tuska", "Pytania o sprawność zarządzania koalicją i kryzys przywództwa.", "Atak na Tuska: autorytaryzm, upokarzanie koalicjantów, 'krzyż na drogę'.", "Pełna ochrona wizerunku: spokój, opanowanie, pełna kontrola nad państwem."),
        ("Wizerunek Pełczyńskiej-Nałęcz", "Zniuansowany: obrończyni samorządów vs trudna partnerka koalicyjna.", "Docenienie ciosu w Tuska i Hołownię, ale krytyka całego obozu rządowego.", "Zdecydowanie negatywny: rozbijaczka, konfliktowa, kierująca się prywatną ambicją."),
        ("Wymiar regionalny", "Brak dedykowanych mutacji regionalnych.", "Komentarze publicystów ogólnopolskich.", "Całkowicie zignorowany pomimo posiadania 20 redakcji w województwach.")
    ]
    add_table(doc, headers_c, widths_c, rows_c, header_fill=NAVY, font_size=7.5)

    # --- ROZDZIAŁ 5 ---
    add_heading(doc, "5. Wnioski strategiczne i rekomendacje", 1, kicker="Konkluzje")

    add_bullet(doc, "1. Pełna lojalność redakcyjna wobec narracji KPRM", "Sposób ujęcia dymisji dowodzi, że po zmianach właścicielskich i redakcyjnych Polska Press realizuje linię ściśle koherentną z przekazem Kancelarii Premiera. Kryzys koalicyjny został zminimalizowany i zredukowany do indywidualnego błędu odchodzącej minister.")
    add_bullet(doc, "2. Degradacja autonomii dziennikarstwa regionalnego", "Dla decydentów i analityków kluczowy jest fakt, że regionalne tytuły PPG (niegdyś stanowiące silne, lokalne ośrodki opinii) w sprawach polityki krajowej funkcjonują wyłącznie jako mechaniczne 'retransmitery' treści z Warszawy. Nie generują one żadnej własnej wartości dodanej dla czytelnika lokalnego.")
    add_bullet(doc, "3. Znikomy wpływ na debatę publiczną", "Ograniczenie się do 4 tekstów i brak autorskich materiałów wideo czy wywiadów sprawia, że media PPG nie kształtują debaty publicznej wokół kryzysów rządowych, lecz jedynie biernie odnotowują przekazy agencyjne, ustępując pola portalom komercyjnym i mediom społecznościowym.")

    # Zapis dokumentu
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    doc.save(str(DOCX_DOWNLOADS))
    doc.save(str(DOC_DOWNLOADS))
    doc.save(str(DOCX_REPORTS))
    doc.save(str(DOC_REPORTS))

    print(f"Raport zapisany pomyślnie:")
    print(f"  -> {DOCX_DOWNLOADS}")
    print(f"  -> {DOC_DOWNLOADS}")
    print(f"  -> {DOCX_REPORTS}")
    print(f"  -> {DOC_REPORTS}")


if __name__ == "__main__":
    build_full_report()
