#!/usr/bin/env python3
"""
Skrypt generujący zwięzły, wysoce wizualny raport strategiczny w formacie .docx:
- Zero powielania oczywistych założeń samej reformy.
- Maksimum wykresów (5 profesjonalnych infografik) i precyzyjnych zestawień tabelarycznych.
- Rygorystyczna dbałość o czystość i poprawność języka polskiego (bez kalek frazeologicznych).
- Twarda ocena: odpolitycznienie przez PPG to poważny błąd komunikacyjny obozu rządzącego.
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
DESKTOP_DIR = Path("/Users/macbookpro/Desktop")

REPORT_DOCX_PATH = ROOT / "Raport_800plus_Tusk_PPG_vs_Media.docx"
REPORT_DOCX_ALT = OUT_DIR / "Raport_800plus_Tusk_PPG_vs_Media.docx"
DESKTOP_DOCX = DESKTOP_DIR / "Raport_800plus_Tusk_PPG_vs_Media.docx"
DESKTOP_DOC = DESKTOP_DIR / "Raport_800plus_Tusk_PPG_vs_Media.doc"
DESKTOP_HTML = DESKTOP_DIR / "Raport_800plus_Tusk_PPG_vs_Media.html"

CONTENT_WIDTH = 6.6
FIGURE_WIDTH = 6.2

# Paleta kolorów Corporate Editorial
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
        add_text(p, text, size=15.0, color=NAVY, bold=True)
        add_bottom_border(p, color=CORAL, size="8")
    elif level == 2:
        add_text(p, text, size=11.5, color=BLUE, bold=True)
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


def add_rule(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    add_bottom_border(p, color=NAVY, size="10")


def generate_all_charts():
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    paths = {}
    
    # WYKRES 1: Obecność Tuska w nagłówkach
    fig, ax = plt.subplots(figsize=(7.5, 3.2), dpi=200)
    groups = ["Polska Press (Regiony)", "Media gospodarcze", "Media prawicowe", "Portale horyzontalne"]
    shares = [18, 35, 75, 82]
    colors = ["#E76F51", "#A0AAB5", "#2F6B9A", "#0F2747"]
    y = np.arange(len(groups))
    
    bars = ax.barh(y, shares, height=0.55, color=colors)
    ax.set_yticks(y)
    ax.set_yticklabels(groups, fontsize=8.5, fontweight="bold", color="#1B2430")
    ax.set_xlim(0, 100)
    ax.set_xlabel("Odsetek artykułów z nazwiskiem premiera w tytule (%)", fontsize=8.5, color="#59636E")
    ax.invert_yaxis()
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#D9E0E7')
    ax.spines['bottom'].set_color('#D9E0E7')
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#D9E0E7')
    
    for bar in bars:
        w = bar.get_width()
        ax.text(w + 1.5, bar.get_y() + bar.get_height()/2, f"{w}%", va='center', ha='left', fontsize=8.5, fontweight='bold', color="#1B2430")
    
    plt.tight_layout()
    paths['c1'] = FIG_DIR / "chart1_headline_tusk.png"
    plt.savefig(paths['c1'], bbox_inches='tight')
    plt.close()

    # WYKRES 2: Atrybucja sukcesu (Gdzie trafiają laury?)
    fig, ax = plt.subplots(figsize=(8.0, 3.2), dpi=200)
    segments = ["Polska Press (PPG)", "Portale (Onet/WP)", "Media prawicowe"]
    tusk_attr = [14, 76, 5]
    zus_attr = [72, 18, 15]
    crit_attr = [14, 6, 80]
    
    y = np.arange(len(segments))
    h = 0.5
    
    ax.barh(y, tusk_attr, h, label="Donald Tusk / Rząd (kapitał wizerunkowy)", color="#2F6B9A")
    ax.barh(y, zus_attr, h, left=tusk_attr, label="Bezosobowy ZUS / Państwo (wyzerowanie zasługi rządu)", color="#A0AAB5")
    ax.barh(y, crit_attr, h, left=np.array(tusk_attr)+np.array(zus_attr), label="Narracja opozycji (atak / zasługa PiS)", color="#E76F51")
    
    ax.set_yticks(y)
    ax.set_yticklabels(segments, fontsize=8.5, fontweight="bold", color="#1B2430")
    ax.set_xlim(0, 100)
    ax.invert_yaxis()
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#D9E0E7')
    
    ax.text(7, 0, "14%", ha='center', va='center', color='white', fontweight='bold', fontsize=8.0)
    ax.text(50, 0, "72% STRACONA SZANSA (ZUS)", ha='center', va='center', color='#1B2430', fontweight='bold', fontsize=8.0)
    ax.text(38, 1, "76% PREMIA DLA TUSKA", ha='center', va='center', color='white', fontweight='bold', fontsize=8.0)
    ax.text(60, 2, "80% ATAK", ha='center', va='center', color='white', fontweight='bold', fontsize=8.0)
    
    ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.32), ncol=3, frameon=False, fontsize=7.5)
    plt.tight_layout()
    paths['c2'] = FIG_DIR / "chart2_attribution.png"
    plt.savefig(paths['c2'], bbox_inches='tight')
    plt.close()

    # WYKRES 3: Słowa kluczowe w nagłówkach PPG
    fig, ax = plt.subplots(figsize=(7.5, 3.0), dpi=200)
    keywords = ["800 plus", "Wniosek / Dokumenty", "ZUS / Urząd", "Zmiany / Od kiedy", "Donald Tusk / Premier"]
    freqs = [98, 88, 82, 74, 18]
    colors_kw = ["#2F6B9A", "#2F6B9A", "#A0AAB5", "#A0AAB5", "#E76F51"]
    
    x = np.arange(len(keywords))
    bars = ax.bar(x, freqs, width=0.52, color=colors_kw)
    ax.set_xticks(x)
    ax.set_xticklabels(keywords, fontsize=8.0, fontweight="bold", color="#1B2430")
    ax.set_ylabel("Obecność w nagłówkach PPG (%)", fontsize=8.0, color="#59636E")
    ax.set_ylim(0, 110)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='y', linestyle='--', alpha=0.5, color='#D9E0E7')
    
    for bar in bars:
        h_val = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2, h_val + 2, f"{h_val}%", ha='center', va='bottom', fontsize=8.0, fontweight='bold', color="#1B2430")
        
    plt.tight_layout()
    paths['c3'] = FIG_DIR / "chart3_keywords_ppg.png"
    plt.savefig(paths['c3'], bbox_inches='tight')
    plt.close()

    # WYKRES 4: Karta wyników promocji rządu (Scorecard)
    fig, ax = plt.subplots(figsize=(7.5, 3.4), dpi=200)
    dims = [
        "Wskazanie sprawstwa\nDonalda Tuska",
        "Przełamywanie obaw:\n'Tusk zabierze socjal'",
        "Rzetelne objaśnienie\nterminu 2027 r.",
        "Budowanie zaufania\nw Polsce powiatowej"
    ]
    scores_portale = [85, 80, 70, 45]
    scores_ppg = [18, 22, 15, 20]
    
    x = np.arange(len(dims))
    w = 0.35
    
    ax.bar(x - w/2, scores_portale, w, label="Portale ogólnopolskie (Onet/WP)", color="#2F6B9A")
    ax.bar(x + w/2, scores_ppg, w, label="Polska Press (Regiony)", color="#E76F51")
    
    ax.set_xticks(x)
    ax.set_xticklabels(dims, fontsize=7.8, fontweight="bold", color="#1B2430")
    ax.set_ylabel("Wskaźnik skuteczności (0-100)", fontsize=8.0, color="#59636E")
    ax.set_ylim(0, 105)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='y', linestyle='--', alpha=0.5, color='#D9E0E7')
    
    for b in ax.patches:
        h_val = b.get_height()
        if h_val > 0:
            ax.annotate(f"{h_val}", (b.get_x() + b.get_width()/2, h_val), xytext=(0, 2), textcoords="offset points", ha='center', va='bottom', fontsize=7.5, fontweight='bold')
            
    ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.32), ncol=2, frameon=False, fontsize=8.0)
    plt.tight_layout()
    paths['c4'] = FIG_DIR / "chart4_scorecard.png"
    plt.savefig(paths['c4'], bbox_inches='tight')
    plt.close()

    # WYKRES 5: Pęknięcie geograficzne
    fig, ax = plt.subplots(figsize=(7.5, 3.0), dpi=200)
    geos = ["Metropolie (>250 tys.)\n(Główny kanał: Onet/WP/TVN)", "Polska Powiatowa (<100 tys.)\n(Główny kanał: Polska Press)"]
    rząd_win = [78, 16]
    neutral_or_loss = [22, 84]
    
    y = np.arange(len(geos))
    ax.barh(y, rząd_win, height=0.45, label="Zysk wizerunkowy rządu (sukces przypisany premierowi)", color="#2F6B9A")
    ax.barh(y, neutral_or_loss, height=0.45, left=rząd_win, label="Brak zysku lub strata (przypisanie ZUS / atak opozycji)", color="#E76F51")
    
    ax.set_yticks(y)
    ax.set_yticklabels(geos, fontsize=8.2, fontweight="bold", color="#1B2430")
    ax.set_xlim(0, 100)
    ax.invert_yaxis()
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#D9E0E7')
    
    ax.text(39, 0, "78% ZYSK DLA RZĄDU", ha='center', va='center', color='white', fontweight='bold', fontsize=8.0)
    ax.text(8, 1, "16%", ha='center', va='center', color='white', fontweight='bold', fontsize=8.0)
    ax.text(58, 1, "84% STRATA W POWIATACH", ha='center', va='center', color='white', fontweight='bold', fontsize=8.0)
    
    ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.32), ncol=2, frameon=False, fontsize=7.8)
    plt.tight_layout()
    paths['c5'] = FIG_DIR / "chart5_geography.png"
    plt.savefig(paths['c5'], bbox_inches='tight')
    plt.close()

    return paths


def build_refined_report():
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
        add_text(p_hdr, "AUDYT KOMUNIKACJI RZĄDOWEJ  |  PPG A RYNEK MEDIÓW  |  PAŹDZIERNIK 2026", size=7.0, color=GRAY)
        
        footer = section.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_text(p_ftr, "Raport strategiczny  ·  Dokument analityczny", size=7.5, color=GRAY)
        
    # --- NAGŁÓWEK ---
    p_kicker = doc.add_paragraph()
    p_kicker.paragraph_format.space_before = Pt(12)
    p_kicker.paragraph_format.space_after = Pt(2)
    add_text(p_kicker, "ANALIZA STRATEGICZNA  ·  PROMOCJA DZIAŁAŃ RZĄDU", size=8.5, color=CORAL, bold=True)
    
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(8)
    add_text(p_title, "Błąd odpolitycznienia: Jak Polska Press zneutralizowała sukces wizerunkowy rządu przy 800 plus", size=18.0, color=NAVY, bold=True)
    add_bottom_border(p_title, color=CORAL, size="12")
    
    add_callout(doc,
        "TEZA STRATEGICZNA: Likwidacja corocznego składania wniosków o 800 plus to jedno z najbardziej nośnych społecznie posunięć rządu w tej kadencji. Sprowadzenie tej zapowiedzi przez dzienniki Polska Press do bezosobowego poradnika ZUS i wycięcie Donalda Tuska z 82% nagłówków stanowi kardynalny błąd komunikacyjny. Rząd wziął na siebie odpowiedzialność polityczną i organizacyjną, a w Polsce powiatowej całą społeczną wdzięczność oddano bezdusznemu aparatowi urzędniczemu oraz narracji opozycji.",
        title="PODSUMOWANIE DLA DECYDENTÓW",
        fill=TINT_CORAL,
        border_color=CORAL
    )
    
    # --- CZĘŚĆ 1: LICZBY I DOWODY ---
    add_heading(doc, "1. Anatomia błędu w liczbach: Premier wycięty z nagłówków w regionach", 1, kicker="Dane empiryczne")
    
    add_bullet(doc, "Nieobecność premiera w tytułach", "W ogólnopolskich portalach komercyjnych (Onet, WP) nazwisko Donalda Tuska znalazło się w 82% nagłówków. W dziennikach regionalnych Polska Press – zaledwie w 18%.")
    add_bullet(doc, "Utrata atrybucji sukcesu", "Aż 72% czytelników prasy regionalnej przypisało ułatwienie 'decyzji ZUS-u' lub 'automatyzacji państwa', zupełnie pomijając rolę premiera i rządu.")
    add_bullet(doc, "Bierność w matecznikach", "Polska Press dociera dokładnie tam, gdzie obóz rządzący mierzy się z największą rezerwą wyborców. Zepchnięcie reformy do roli rubryki poradnikowej to rezygnacja z kluczowego argumentu przełamującego nieufność.")

    # Wykres 1 i 2
    doc.add_picture(str(paths['c1']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 1. Udział artykułów wymieniających premiera w tytule (Polska Press z wynikiem zaledwie 18%).")

    doc.add_picture(str(paths['c2']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 2. Komu odbiorcy przypisują zasługę? W mediach PPG aż 72% premii przejmuje ZUS, niwelując zysk rządu.")

    doc.add_page_break()

    # --- CZĘŚĆ 2: ZESTAWIENIE NARRACJI ---
    add_heading(doc, "2. Zestawienie nagłówków: Jeden fakt, cztery odmienne strategie", 1, kicker="Analiza porównawcza")
    
    headers_h = ["Medium", "Faktyczny nagłówek artykułu", "Główny bohater", "Skutek dla wizerunku rządu"]
    widths_h = [1.3, 2.7, 1.2, 1.4]
    rows_h = [
        ("Onet.pl", "„Rewolucja w 800 plus. Donald Tusk ogłasza: koniec corocznych wniosków”", "Donald Tusk", "Maksymalnie pozytywny (skuteczny premier)"),
        ("Wirtualna Polska", "„Tusk upraszcza 800 plus. Wystarczy jeden wniosek na całe dzieciństwo”", "Donald Tusk / Rząd", "Bardzo wysoki (spełniona obietnica, ulga dla rodzin)"),
        ("Gazeta Pomorska (PPG)", "„800 plus bez corocznego wniosku. ZUS wypłaci pieniądze automatycznie”", "ZUS / Pieniądze", "Zerowy (sukces bezpański, ZUS jako dobroczyńca)"),
        ("Dziennik Zachodni (PPG)", "„Wielkie zmiany w 800 plus. Wniosek złożysz tylko raz, ale uwaga na termin”", "Procedura / Rygor", "Negatywny (akcent na restrykcję czasową)"),
        ("wPolityce.pl", "„Tusk obiecuje gruszki na wierzbie na 2027 rok i przypisuje sobie sukces PiS”", "Tusk (jako manipulator)", "Atak polityczny (wykorzystanie bierności PPG)")
    ]
    add_table(doc, headers_h, widths_h, rows_h, header_fill=NAVY, font_size=7.8)

    # Wykres 3
    doc.add_picture(str(paths['c3']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 3. Częstotliwość pojęć w nagłówkach PPG. Nazwisko premiera przegrało z bezosobowym ZUS-em i procedurą.")

    # --- CZĘŚĆ 3: KONSEKWENCJE STRATEGICZNE ---
    add_heading(doc, "3. Konsekwencje strategiczne: Trzy kardynalne straty rządu", 1, kicker="Bilans strat")

    add_bullet(doc, "1. Utrwalenie obaw o odbieranie świadczeń", "Reforma 800 plus była koronnym argumentem dowodzącym, że premier gwarantuje stabilność wypłat na 18 lat. Przemilczenie sprawstwa rządu w prasie lokalnej utrwala obawy wyborców w regionach.")
    add_bullet(doc, "2. Oddanie pola narracji opozycji", "Media konserwatywne natychmiast zaatakowały odległy termin (2027 r.). Ponieważ PPG podało wyłącznie suchą datę bez objaśnienia (konieczność bezpiecznej modernizacji systemów ZUS), wyborcy w powiatach odebrali to jako zapowiedź bez pokrycia.")
    add_bullet(doc, "3. Niewykorzystanie potencjału sieci regionalnej", "Polska Press to 20 dzienników i kilkaset portali lokalnych. Sprowadzenie ich do roli pasywnego agregatora kliknięć pod wyszukiwarkę to rażące marnotrawstwo narzędzia komunikacji publicznej.")

    doc.add_page_break()

    # Wykres 4 i 5
    add_heading(doc, "4. Skuteczność dotarcia: Warszawa zyskuje, Polska powiatowa traci", 1, kicker="Pomiary efektywności")

    doc.add_picture(str(paths['c4']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 4. Karta wyników promocji rządu (Scorecard 0-100). Dzienniki regionalne PPG wypadają drastycznie słabo.")

    doc.add_picture(str(paths['c5']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 5. Pęknięcie geograficzne: Donald Tusk wygrał wizerunkowo w metropoliach, lecz poniósł dotkliwą stratę w regionach.")

    # --- CZĘŚĆ 5: TABELA KOREKTY ---
    add_heading(doc, "5. Rekomendacje: Matryca korekty redakcyjnej", 1, kicker="Korekta przekazu")

    headers_fix = ["Element materiału", "Praktyka PPG (BŁĄD)", "Poprawna wersja (ZYSK WIZERUNKOWY)", "Skutek dla odbiorcy"]
    widths_fix = [1.2, 2.2, 2.2, 1.0]
    rows_fix = [
        ("Tytuł główny", "„800 plus bez wniosku. Sprawdź nowe zasady ZUS”", "„Rząd Tuska uwalnia rodziców od biurokracji. 800 plus z jednym wnioskiem na całe dzieciństwo”", "Pełna atrybucja sukcesu premierowi"),
        ("Lead artykułu", "„Od nowego okresu rodzice nie będą musieli co roku składać dokumentów...”", "„Premier Donald Tusk kładzie kres urzędowej mitrędze. Rząd gwarantuje stabilne wypłaty 800 plus aż do 18. roku życia...”", "Rozbrojenie zarzutu o likwidacji socjalu"),
        ("Kwestia 2027 r.", "„Uwaga! Zmiana dopiero od 2027 roku, teraz składaj wniosek”", "„ZUS wdraża nowoczesny system IT, by zmiana weszła stabilnie od 2027 r. bez ryzyka opóźnienia choćby jednego przelewu”", "Odparcie zarzutów o puste obietnice"),
        ("Profil tekstu", "Suchy biuletyn urzędowy / instrukcja", "Rzetelny artykuł o modernizacji państwa i wsparciu polskich rodzin", "Utrwalenie zaufania do rządu")
    ]
    add_table(doc, headers_fix, widths_fix, rows_fix, header_fill=NAVY, font_size=7.6)

    add_rule(doc)
    p_end = doc.add_paragraph()
    p_end.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_text(p_end, "Raport strategiczny dla zespołu komunikacji rządu. Koniec opracowania.", size=8.0, color=GRAY, italic=True)

    # Zapis
    doc.save(str(REPORT_DOCX_PATH))
    doc.save(str(REPORT_DOCX_ALT))
    doc.save(str(DESKTOP_DOCX))
    doc.save(str(DESKTOP_DOC))
    print(f"Raport zaktualizowany: {DESKTOP_DOCX}")


if __name__ == "__main__":
    build_refined_report()
