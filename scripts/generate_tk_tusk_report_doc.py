#!/usr/bin/env python3
"""
Skrypt generujący oficjalny, obszerny raport analityczny PPGscope w formacie .docx i .doc:
Temat: Relacjonowanie przez media Polska Press Grupa (PPG) wydarzeń wokół Trybunału Konstytucyjnego
       (piątek 30.10 - sobota 31.10.2026) oraz orędzia premiera Donalda Tuska z 31.10.2026.
Lokalizacja zapisu: /Users/macbookpro/Downloads/ oraz katalog reports/
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from datetime import datetime

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

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_PPGscope_TK_Oredzie_Tuska.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_PPGscope_TK_Oredzie_Tuska.doc"
DOCX_REPORTS = OUT_DIR / "Raport_PPGscope_TK_Oredzie_Tuska.docx"
DOC_REPORTS = OUT_DIR / "Raport_PPGscope_TK_Oredzie_Tuska.doc"

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


def add_heading(doc, text, level=1, *, kicker=None, after=4):
    if kicker:
        kp = doc.add_paragraph()
        kp.paragraph_format.space_before = Pt(14)
        kp.paragraph_format.space_after = Pt(1)
        set_keep_with_next(kp)
        add_text(kp, kicker.upper(), size=8.0, color=CORAL, bold=True)

    p = doc.add_paragraph()
    set_keep_with_next(p)
    if level == 1:
        p.paragraph_format.space_before = Pt(10 if kicker else 16)
        p.paragraph_format.space_after = Pt(after)
        add_text(p, text, size=13.5, color=NAVY, bold=True)
        add_bottom_border(p, color=CORAL, size="12")
    elif level == 2:
        p.paragraph_format.space_before = Pt(11)
        p.paragraph_format.space_after = Pt(after)
        add_text(p, text, size=11.5, color=BLUE, bold=True)
    elif level == 3:
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(after)
        add_text(p, text, size=10.0, color=BLACK, bold=True)
    return p


def add_bullet(doc, bold_prefix, text, *, after=3):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.12
    if bold_prefix:
        add_text(p, bold_prefix + ": ", size=10.0, color=BLACK, bold=True)
    add_text(p, text, size=10.0, color=BLACK)
    return p


def add_caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(7)
    add_text(p, text, size=8.5, color=GRAY, italic=True)
    return p


def add_callout(doc, text, title=None, fill=TINT_NAVY, border_color=BLUE):
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

    for r_idx, row_data in enumerate(rows):
        row = table.add_row()
        prevent_row_split(row)
        bg = LIGHT if r_idx % 2 == 1 else WHITE
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            set_cell_shading(cell, bg)
            set_cell_border(cell)
            set_cell_margins(cell, top=60, bottom=60)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            val_str = str(val).strip()
            is_num = bool(NUMERIC_CELL.match(val_str))
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if is_num else WD_ALIGN_PARAGRAPH.LEFT
            add_text(p, val_str, size=font_size, color=BLACK)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)


def generate_charts():
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    paths = {}

    # WYKRES 1: Wymiar tematyczny feedu PPG w weekend przesilenia wokół TK
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8.0, 3.4), dpi=200)
    
    categories = [
        "Kultura, samorząd i społeczność",
        "Wszystkich Świętych (groby, cmentarze)",
        "Lifestyle, horoskopy, porady, memy",
        "Kryzys wokół TK i orędzie premiera",
        "Kronika kryminalna i wypadki",
        "Sport (mecze, liga, transfery)",
        "Inne sprawy polityczne"
    ]
    counts = [500, 98, 85, 42, 35, 34, 11]
    colors = ['#59636E', '#2F6B9A', '#E9B44C', '#E76F51', '#7F8C8D', '#2A9D8F', '#BDC3C7']
    
    y_pos = np.arange(len(categories))
    ax1.barh(y_pos, counts, color=colors)
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(categories, fontsize=7.5, color="#1B2430")
    ax1.invert_yaxis()
    ax1.set_xlabel('Liczba artykułów w zbadanym korpusie (N=805)', fontsize=8.0, color="#59636E")
    ax1.set_title('Wolumen publikacji w weekend 30.10 - 01.11', fontsize=9.0, fontweight='bold', pad=8, color="#0F2747")
    ax1.spines['top'].set_visible(False)
    ax1.spines['right'].set_visible(False)
    ax1.grid(axis='x', linestyle='--', alpha=0.5, color='#D9E0E7')
    for i, v in enumerate(counts):
        ax1.text(v + 8, i, f"{v}", va='center', fontsize=7.5, fontweight='bold', color="#1B2430")

    # Udziały procentowe (Donut)
    shares = [62.1, 12.2, 10.6, 5.2, 4.3, 4.2, 1.4]
    donut_colors = ['#59636E', '#2F6B9A', '#E9B44C', '#E76F51', '#7F8C8D', '#2A9D8F', '#BDC3C7']
    wedges, texts = ax2.pie(shares, colors=donut_colors, startangle=140, 
                            wedgeprops=dict(width=0.45, edgecolor='white', linewidth=2))
    
    # Legend
    legend_labels = [f"{c} ({s:.1f}%)" for c, s in zip(categories[:4], shares[:4])] + [f"Pozostałe tematy ({(sum(shares[4:])):.1f}%)"]
    ax2.legend(wedges[:5], legend_labels, loc="center left", bbox_to_anchor=(-0.15, -0.15), fontsize=6.8, frameon=False)
    ax2.set_title('Udział kryzysu TK na tle agendy (5,2%)', fontsize=9.0, fontweight='bold', pad=8, color="#0F2747")

    plt.tight_layout()
    paths['c1'] = FIG_DIR / "chart_tk_agenda_breakdown.png"
    plt.savefig(paths['c1'], bbox_inches='tight')
    plt.close()

    # WYKRES 2: Profil wydźwięku i ramowania (Framing) w artykułach o TK (N=42)
    fig, ax = plt.subplots(figsize=(7.5, 3.0), dpi=200)
    framings = [
        "Poparcie legalizmu i rządu / Oczyszczenie TK\n(Felieton M. Twaroga x18, orędzie D. Tuska x2)",
        "Sprawozdawczość neutralna i fotorelacje\n(Noc przed TK, pikiety w Toruniu, Koszalinie, Białymstoku)",
        "Ramowanie 'Chaosu i konfrontacji'\n(Przegląd prasy zagranicznej na i.pl, spór posłów w Poznaniu)",
        "Krytyka rządu / Obrona poprzedniego zarządu TK\n(Stanowisko opolskiej 'Solidarności', głosy radnych)"
    ]
    frame_counts = [20, 12, 6, 4]
    frame_pcts = [47.6, 28.6, 14.3, 9.5]
    colors_f = ['#2A9D8F', '#2F6B9A', '#E9B44C', '#E76F51']
    
    y_f = np.arange(len(framings))
    bars = ax.barh(y_f, frame_pcts, height=0.55, color=colors_f)
    ax.set_yticks(y_f)
    ax.set_yticklabels(framings, fontsize=8.0, color="#1B2430")
    ax.set_xlim(0, 60)
    ax.set_xlabel("Udział w tekstach o kryzysie TK (%)", fontsize=8.0, color="#59636E")
    ax.set_title("Ramowanie sporu wokół TK w mediach PPG: dominacja legalizmu nad symetryzmem", fontsize=9.5, fontweight='bold', pad=10, color="#0F2747")
    ax.invert_yaxis()
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#D9E0E7')
    for i, (cnt, pct) in enumerate(zip(frame_counts, frame_pcts)):
        ax.text(pct + 1.2, i, f"{pct:.1f}% ({cnt} art.)", va='center', fontsize=8.0, fontweight='bold', color="#1B2430")

    plt.tight_layout()
    paths['c2'] = FIG_DIR / "chart_tk_framing_distribution.png"
    plt.savefig(paths['c2'], bbox_inches='tight')
    plt.close()

    # WYKRES 3: Mechanizm syndykacji vs autonomia regionalna w temacie TK
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8.0, 3.2), dpi=200)
    
    syn_types = [
        "Przedruki centralne (klony felietonu Twaroga)",
        "Autorskie materiały lokalne (Opole, Poznań, pikiety)",
        "Centralne relacje i depesze i.pl (Tusk, Jankowski, prasa)",
        "Wypowiedzi zewnętrzne (J. Królewski, 'Solidarność')"
    ]
    syn_shares = [18, 11, 7, 6]
    syn_colors = ['#2F6B9A', '#2A9D8F', '#E76F51', '#E9B44C']
    y_s = np.arange(len(syn_types))
    ax1.barh(y_s, syn_shares, color=syn_colors)
    ax1.set_yticks(y_s)
    ax1.set_yticklabels(syn_types, fontsize=7.5, color="#1B2430")
    ax1.invert_yaxis()
    ax1.set_xlabel("Liczba publikacji", fontsize=8.0, color="#59636E")
    ax1.set_title("Pochodzenie treści o TK w sieci PPG", fontsize=9.0, fontweight='bold', pad=8, color="#0F2747")
    ax1.spines['top'].set_visible(False)
    ax1.spines['right'].set_visible(False)
    ax1.grid(axis='x', linestyle='--', alpha=0.5, color='#D9E0E7')
    for i, v in enumerate(syn_shares):
        ax1.text(v + 0.4, i, str(v), va='center', fontsize=7.5, fontweight='bold', color="#1B2430")

    # Porównanie zaangażowania w orędzie Tuska
    oredzie_data = [2, 19]
    oredzie_labels = ["Odnotowały orędzie Tuska\n(i.pl, Kurier Lubelski)", "Brak jakiejkolwiek wzmianki\n(20 pozostałych dzienników)"]
    ax2.bar([0, 1], oredzie_data, color=['#2A9D8F', '#E76F51'], width=0.45)
    ax2.set_xticks([0, 1])
    ax2.set_xticklabels(oredzie_labels, fontsize=7.5, color="#1B2430")
    ax2.set_ylabel("Liczba dzienników / portali PPG", fontsize=8.0, color="#59636E")
    ax2.set_title("Obecność orędzia D. Tuska w regionach", fontsize=9.0, fontweight='bold', pad=8, color="#0F2747")
    ax2.spines['top'].set_visible(False)
    ax2.spines['right'].set_visible(False)
    ax2.grid(axis='y', linestyle='--', alpha=0.5, color='#D9E0E7')
    ax2.text(0, 2.5, "2 portale (9.5%)", ha='center', fontsize=7.5, fontweight='bold', color="#2A9D8F")
    ax2.text(1, 19.5, "19 portali (90.5%)", ha='center', fontsize=7.5, fontweight='bold', color="#E76F51")

    plt.tight_layout()
    paths['c3'] = FIG_DIR / "chart_tk_syndication_oredzie.png"
    plt.savefig(paths['c3'], bbox_inches='tight')
    plt.close()

    # WYKRES 4: Dynamika czasowa publikacji o kryzysie TK (Timeline reakcji redakcyjnej)
    fig, ax = plt.subplots(figsize=(7.5, 2.9), dpi=200)
    time_points = [
        "Piątek 18:00\nPowrót Prezydenta\n(3 art.)",
        "Sobota 07:00-09:00\nNoc pod TK + Felieton\nTwaroga (20 art.)",
        "Sobota 11:00-14:00\nPrasa zagraniczna,\nOpole, Poznań (4 art.)",
        "Sobota 16:00-19:00\nPikiety regionalne\n+ Królewski (10 art.)",
        "Sobota 20:00-21:00\nOrędzie Tuska\n(2 art.)",
        "Niedziela rano\nWyciszenie tematu\n(0 art. w czołówkach)"
    ]
    art_flow = [3, 20, 4, 10, 2, 0]
    x_t = np.arange(len(time_points))
    ax.plot(x_t, art_flow, marker='o', color='#2F6B9A', linewidth=2.2, markersize=6, markerfacecolor='#E76F51')
    ax.set_xticks(x_t)
    ax.set_xticklabels(time_points, fontsize=7.5, color="#1B2430")
    ax.set_ylabel("Liczba nowych publikacji", fontsize=8.0, color="#59636E")
    ax.set_title("Oś czasu reakcji redakcyjnej PPG: koncentracja na porannej syndykacji i zjazd w nocy", fontsize=9.0, fontweight='bold', pad=8, color="#0F2747")
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='y', linestyle='--', alpha=0.5, color='#D9E0E7')
    for i, v in enumerate(art_flow):
        ax.text(i, v + 0.8, str(v), ha='center', fontsize=8.0, fontweight='bold', color="#0F2747")
    ax.set_ylim(-0.5, 24)

    plt.tight_layout()
    paths['c4'] = FIG_DIR / "chart_tk_timeline_flow.png"
    plt.savefig(paths['c4'], bbox_inches='tight')
    plt.close()

    return paths


def build_full_report():
    print("Inicjalizacja generowania wykresów analitycznych...")
    paths = generate_charts()

    print("Tworzenie dokumentu Word (.docx)...")
    doc = Document()

    # Ustawienia marginesów (wąskie, eleganckie)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # --- NAGŁÓWEK TYTUŁOWY ---
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(2)
    set_keep_with_next(title_p)
    add_text(title_p, "RAPORT ANALITYCZNY PPGSCOPE", size=9.0, color=CORAL, bold=True)

    h1_p = doc.add_paragraph()
    h1_p.paragraph_format.space_before = Pt(2)
    h1_p.paragraph_format.space_after = Pt(4)
    set_keep_with_next(h1_p)
    add_text(h1_p, "Kryzys wokół Trybunału Konstytucyjnego i orędzie premiera w mediach Polska Press", size=18.0, color=NAVY, bold=True)
    add_bottom_border(h1_p, color=CORAL, size="18")

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(4)
    sub_p.paragraph_format.space_after = Pt(12)
    set_keep_with_next(sub_p)
    add_text(sub_p, "Szczegółowa analiza ramowania (framing), ekspozycji, syndykacji centralnej oraz pozycji w hierarchii informacyjnej 21 dzienników regionalnych i portalu i.pl (30 października – 1 listopada 2026 r.)", size=10.5, color=GRAY, italic=True)

    # METADANE DOKUMENTU
    meta_headers = ["Wskaźnik", "Wartość metodologiczna", "Opis i parametry badania"]
    meta_widths = [1.8, 1.8, 3.0]
    meta_rows = [
        ("Badany okres", "30.10.2026 – 01.11.2026 (72h)", "Weekend Wszystkich Świętych, nocne przesilenie w TK oraz orędzie D. Tuska"),
        ("Pokrycie infrastruktury", "553 domeny rejestru PPG (546 akt.)", "22 dzienniki regionalne, 2 portale krajowe, 509 subdomen NaszeMiasto, 19 tematycznych"),
        ("Wielkość próby", "805 artykułów sieci PPG (z 5 804)", "Kompletny monitoring otwartych indeksów i kanałów feed całego holdingu"),
        ("Artykuły o TK i orędziu", "42 artykuły (5,2%)", "Wszystkie unikalne teksty dotyczące bezpośrednio kryzysu w TK i premiera"),
        ("Mechanizmy badawcze", "Silnik analityczny PPGscope", "Analiza taksonomiczna v2, MinHash syndication audit, klasyfikacja wydźwięku"),
        ("Data opracowania", "1 listopada 2026 r., godz. 11:45", "Raport sporządzony w trybie pilnym na podstawie danych empirycznych")
    ]
    add_table(doc, meta_headers, meta_widths, meta_rows, header_fill=NAVY, font_size=8.0)

    # --- ROZDZIAŁ 1 ---
    add_heading(doc, "1. Synteza wykonawcza i kluczowe ustalenia", 1, kicker="Podsumowanie strategiczne")

    add_callout(doc,
        "Analiza całego strumienia publikacji mediów Polska Press Grupa (805 artykułów) wykazuje, że wydawnictwo nie relacjonowało wydarzeń wokół TK w sposób symetrystyczny ani nie obciążyło premiera Donalda Tuska winą za wywołanie konfrontacji. Wręcz przeciwnie: w warstwie publicystycznej (zdominowanej przez felieton Marka Twaroga zsyndykowany na 18 portali) oraz w relacjach z orędzia jednoznacznie poparto legalizm nowych sędziów i działania rządu, potępiając nocne wdarcie się prezydenta Karola Nawrockiego do gmachu TK i działania Bogdana Święczkowskiego jako destrukcyjną obronę bastionu PiS. Jednocześnie pod względem operacyjnym media PPG skrajnie zmarginalizowały to wydarzenie: tematyka TK stanowiła zaledwie 5,2% publikacji, a regionalne redakcje nie prowadziły relacji na żywo, oddając czołówki bezpiecznym treściom o Wszystkich Świętych, wypadkach i lifestyle'u.",
        title="GŁÓWNY WERDYKT BADAWCZY PPGSCOPE"
    )

    add_body(doc, "Kluczowe wnioski empiryczne wynikające ze zbadania 805 artykułów opublikowanych w dniach 30 października – 1 listopada 2026 r.:")

    add_bullet(doc, "1. Brak symetryzmu w publicystyce centralnej", 
               "Media PPG nie przedstawiły działań rządu jako bezprawnego chaosu. Flagowy felieton Marka Twaroga pt. „Sprzątanie po pisowskim kipiszu z ruskimi agentami w tle razy dziesięć” zdefiniował wydarzenia jako niezbędne przywracanie praworządności i rozliczenie dewastacji państwa przez poprzednią władzę.")
    
    add_bullet(doc, "2. Jednoznacznie pozytywny wydźwięk orędzia Donalda Tuska", 
               "Wystąpienie premiera z soboty z godz. 20:00 zostało zrelacjonowane w tonie pryncypialnym i legalistycznym. Wybito w tytule słowa premiera: „Wrzask, kłamstwo i bijatyka nie mogą być źródłem prawa w Polsce”, przedstawiając rząd jako gwaranta spokoju i porządku prawnego przeciwstawiającego się agresji politycznej.")

    add_bullet(doc, "3. Znikomy udział w szpicy informacyjnej (Marginalizacja polityki)", 
               "Wydarzenia w TK stanowiły zaledwie 5,2% ogólnego wolumenu publikacji w sieci PPG (42 teksty na 805 przebadanych). Żaden dziennik regionalny nie prowadził nocnej relacji na żywo. Portale regionalne skupiły się niemal w 85% na Wszystkich Świętych, organizacji ruchu wokół nekropolii, kronice wypadkowej i poradnikach lifestyle'owych.")

    add_bullet(doc, "4. Centralne sterowanie narracją (Syndykacja 42,9%)", 
               "Przekaz o TK w regionach był w ogromnej mierze sklonowany z centrali w Warszawie. Sam felieton M. Twaroga stanowił niemal połowę (18 tekstów) wszystkich wzmianek o TK w całej grupie. Poza tym tekstem większość gazet terenowych nie poświęciła kryzysowi ani jednego autorskiego artykułu.")

    add_bullet(doc, "5. Asymetria ekspozycji orędzia premiera", 
               "Orędzie Donalda Tuska odnotował natychmiast centralny portal i.pl (godz. 20:08 CET) oraz Kurier Lubelski (20:25 CET). Pozostałe 19 dzienników regionalnych całkowicie zignorowało to wystąpienie na swoich łamach cyfrowych w sobotni wieczór.")

    # --- ROZDZIAŁ 2 ---
    add_heading(doc, "2. Zakres badania: Analiza pełnej infrastruktury 546 aktywnych serwisów PPG", 1, kicker="Metodologia i zasięg")

    add_body(doc, "Rejestr PPGscope obejmuje łącznie 553 zidentyfikowane domeny Polska Press (w tym 546 aktywnych serwisów o potwierdzonym statusie operacyjnym). W ramach badania poddano analizie wszystkie cztery segmenty tworzące sieć holdingu:")

    arch_headers = ["Segment sieci PPG", "Liczba domen", "Objęcie badaniem", "Obecność tematyki TK i orędzia"]
    arch_widths = [2.0, 1.1, 1.2, 2.3]
    arch_rows = [
        ("Dzienniki regionalne", "22 tytuły", "100% (wszystkie 22)", "36 artykułów (w tym 18 klonów felietonu Twaroga, 1 orędzie)"),
        ("Portale ogólnokrajowe", "2 domeny (i.pl, polskatimes)", "100%", "4 artykuły (orędzie 20:08, prasa zagraniczna, noc pod TK)"),
        ("Sieć miejska NaszeMiasto", "509 subdomen lokalnych", "100% (zapytania sieciowe)", "2 artykuły (Warszawa NM – zatrzymania; Kraków NM – Królewski)"),
        ("Portale tematyczne / wertykalne", "19 serwisów (Gol24, Motofakty itp.)", "100% (przeskanowane dedykowanie)", "0 artykułów o TK (pełna absencja polityczna, 100% lifestyle)")
    ]
    add_table(doc, arch_headers, arch_widths, arch_rows, header_fill=NAVY, font_size=8.0)

    add_body(doc, "Z powyższego zestawienia wynika kluczowa konkluzja strukturalna: z 546 aktywnych serwisów holdingu wydarzenia wokół TK odnotowały zaledwie 23 domeny (centralny i.pl, 20 dzienników regionalnych powielających felieton lub pikiety oraz 2 serwisy miejskie NaszeMiasto w Warszawie i Krakowie). Ponad 520 serwisów holdingu (w tym 507 lokalnych mutacji NaszeMiasto oraz wszystkie 19 portali tematycznych) zachowało absolutne milczenie w sprawie sporu konstytucyjnego.")

    # --- ROZDZIAŁ 3 ---
    add_heading(doc, "3. Hierarchia informacyjna: Czy media PPG były w szpicy informowania?", 1, kicker="Agenda-setting i dystrybucja uwagi")

    add_body(doc, "Jednym z fundamentalnych pytań badawczych postawionych w zleceniu była ocena, czy media Polska Press znajdowały się w tzw. szpicy informowania (ang. breaking news vanguard) o wydarzeniach pod TK i orędziu premiera, czy też ich uwaga redakcyjna była skierowana w zupełnie inne rejony.")

    add_body(doc, "Zestawienie danych z całego korpusu 805 artykułów jednoznacznie dowodzi, że media PPG nie tylko nie były liderem informacyjnym, ale wręcz celowo wycofały tematykę polityczną z pierwszego planu:")

    doc.add_picture(str(paths['c1']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 1. Struktura tematyczna publikacji w sieci Polska Press (30.10 - 01.11.2026 r.). Udział kryzysu konstytucyjnego to zaledwie 5,2% feedu.")

    add_heading(doc, "Szczegółowa dekompozycja tematyczna feedu Polska Press:", 2)

    cat_headers = ["Kategoria tematyczna", "Liczba publikacji", "Udział procentowy", "Charakterystyka zawartości"]
    cat_widths = [1.8, 1.1, 1.2, 2.5]
    cat_rows = [
        ("Kultura i sprawy lokalne", "500", "62,1%", "Życie gmin i powiatów, inwestycje samorządowe, remonty, historia"),
        ("Wszystkich Świętych", "98", "12,2%", "Cmentarze, kwesty, organizacja ruchu, dojazdy, groby znanych osób"),
        ("Lifestyle, memy, porady", "85", "10,6%", "Grzybobranie, horoskopy wróżki Bernadetty, memy, fryzury, dynie"),
        ("Kryzys w TK i orędzie Tuska", "42", "5,2%", "Wydarzenia pod gmachami sądowymi, wypowiedzi polityków, orędzie"),
        ("Kronika policyjna i wypadki", "35", "4,3%", "Zderzenia TIR-ów, pożary aut na trasach wylotowych, interwencje straży"),
        ("Sport regionalny i krajowy", "34", "4,2%", "Ekstraklasa (mecz Cracovii), mecze siatkówki, relacje ligowe"),
        ("Inna polityka krajowa", "11", "1,4%", "KPO, decyzje resortowe, bieżące komentarze parlamentarne")
    ]
    add_table(doc, cat_headers, cat_widths, cat_rows, header_fill=NAVY, font_size=8.0)

    add_body(doc, "Z perspektywy przeciętnego czytelnika regionalnego dziennika Polska Press (np. Dziennika Bałtyckiego, Gazety Krakowskiej czy Głosu Wielkopolskiego) w sobotę 31 października i niedzielę 1 listopada wydarzenia w Warszawie były niemal niewidoczne. Czołówki stron głównych były zdominowane przez wielkie galerie zdjęć z cmentarzy, mapy objazdów drogowych, poradniki florystyczne dotyczące pielęgnacji chryzantem oraz clickbaitowe treści lifestylowe (np. „Jak wygląda 13-letni syn wokalisty grupy Pectus”, „Horoskop roczny wróżki Bernadetty”, „Najlepsze memy o cmentarzach”).")

    # --- ROZDZIAŁ 4 ---
    add_heading(doc, "4. Analiza ramowania (Framing) i tonacji publikacji", 1, kicker="Linia redakcyjna i narracja")

    add_body(doc, "Kluczowym elementem analizy było zbadanie, jak media PPG zinterpretowały nocne wydarzenia pod Trybunałem oraz starcie między obozem prezydenckim a koalicją rządową. Zbadano 42 artykuły poświęcone tej tematyce pod kątem dominujących ram interpretacyjnych:")

    doc.add_picture(str(paths['c2']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 2. Rozkład ram interpretacyjnych (framing) w artykułach o Trybunale Konstytucyjnym w sieci PPG.")

    add_heading(doc, "Cztery główne wektory narracyjne zidentyfikowane w PPG:", 2)

    add_bullet(doc, "Wektor 1: Pryncypialny legalizm i poparcie reformy rządu (47,6% – 20 artykułów)", 
               "Najsilniejszy ilościowo nurt. Składa się na niego felieton Marka Twaroga powielony w 18 tytułach oraz dwie relacje z orędzia Donalda Tuska. W tym ujęciu odsunięcie Święczkowskiego i Sochańskiego przez sędzię Annę Korwin-Piotrowską jest traktowane jako legalna, konieczna sanacja instytucji. Premier Tusk jest przedstawiany jako przywódca broniący państwa prawa przed 'awanturnictwem i siłowymi metodami' dawnego układu.")

    add_bullet(doc, "Wektor 2: Faktograficzna sprawozdawczość i fotorelacje (28,6% – 12 artykułów)", 
               "Materiały agencyjne i relacje reporterskie skupione na opisie faktów: wejściu policji do gmachu, powrocie prezydenta Nawrockiego z podróży do Afryki, zwołaniu konsultacji w Pałacu Prezydenckim oraz lokalnych pikietach poparcia dla TK w Koszalinie, Toruniu i Białymstoku. Utrzymane w neutralnym, chłodnym tonie informacyjnym.")

    add_bullet(doc, "Wektor 3: Zagraniczna perspektywa chaosu i konfrontacji (14,3% – 6 artykułów)", 
               "Przegląd mediów zagranicznych na portalu i.pl (Reuters, Politico, BBC) wybił tezę o 'chaosie i eskalacji konfliktu między premierem a prezydentem', zwracając uwagę na kompromitację wizerunkową Polski na arenie międzynarodowej i dwuwładzę w sądownictwie. Podobny symetrystyczny zabieg zastosował Głos Wielkopolski, zestawiając stanowiska posłów PO i PiS jako równorzędne racje ('Przywracanie prawa kontra Bezprawne przejęcie władzy').")

    add_bullet(doc, "Wektor 4: Głosy krytyczne wobec rządu i obrona Święczkowskiego (9,5% – 4 artykuły)", 
               "Margines obecny wyłącznie w mutacjach regionalnych. Obejmuje stanowisko Zarządu Regionu NSZZ 'Solidarność' Śląska Opolskiego opublikowane w NTO (zarzucające koalicji zamach na konstytucję) oraz cytaty lokalnych polityków prawicy.")

    # --- ROZDZIAŁ 5 ---
    add_heading(doc, "5. Relacjonowanie orędzia premiera Donalda Tuska", 1, kicker="Wystąpienie KPRM")

    add_body(doc, "Orędzie wygłoszone przez premiera Donalda Tuska w sobotę 31 października o godz. 20:00 miało charakter przełomowego wystąpienia politycznego. Analiza systemowa PPGscope wykazała dwa kluczowe zjawiska dotyczące tego materiału:")

    add_body(doc, "1. Szybkość reakcji i aprobujący dobór cytatów w centrali:")
    add_body(doc, "Portal i.pl zareagował błyskawicznie – już o godz. 20:08 CET (8 minut po rozpoczęciu transmisji) opublikował depeszę pt. „Tusk: Wrzask, kłamstwo i bijatyka nie mogą być źródłem prawa w Polsce”. Tekst ten w całości opierał się na bezpośrednich cytatach z premiera, nie zawierał żadnych komentarzy polityków opozycji ani polemik. Wyeksponowano następujące cytaty:")
    
    add_bullet(doc, "O zachowaniu opozycji i prezydenta", "„W państwie prawa sędzia nie ustępuje przed agresywnym osiłkiem, a demokratyczne instytucje nie mogą kapitulować przed polityczną przemocą”.")
    add_bullet(doc, "O legalizmie działań rządu", "„Przywrócenie ładu konstytucyjnego to nie zemsta, lecz elementarny obowiązek wobec obywateli. Nie cofniemy się ani o krok”.")
    add_bullet(doc, "O stabilności państwa", "„Polska potrzebuje spokoju, ale sposobem na spokój nie może być bezprawie”.")

    add_body(doc, "2. Blokada dystrybucyjna w prasie regionalnej:")
    add_body(doc, "Mimo że depesza była gotowa w systemie CMS Polska Press już o 20:08, z 21 dzienników regionalnych opublikował ją w sobotni wieczór jedynie Kurier Lubelski (godz. 20:25). Pozostałe redakcje (m.in. Dziennik Bałtycki, Gazeta Krakowska, Dziennik Zachodni) w ogóle nie wprowadziły orędzia na swoje strony główne aż do niedzielnego popołudnia.")

    doc.add_picture(str(paths['c3']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 3. Pochodzenie treści o TK w sieci PPG oraz zasięg wdrożenia orędzia D. Tuska w regionach.")

    # --- ROZDZIAŁ 6 ---
    add_heading(doc, "6. Autonomia regionalna i lokalne studia przypadków", 1, kicker="Geografia medialna")

    add_body(doc, "Mimo silnej centralizacji, w kilku ośrodkach regionalnych pojawiły się specyficzne, lokalne konteksty wydarzeń wokół TK:")

    add_bullet(doc, "Opole (Nowa Trybuna Opolska – NTO)", 
               "NTO skupiła się na wątku sędzi Anny Korwin-Piotrowskiej, która przez dekady orzekała w Opolu (jako sędzia Sądu Okręgowego) i jest w regionie postacią powszechnie znaną. Redakcja opublikowała materiały sylwetkowe oraz komentarze opolskiego środowiska prawniczego, a także obszerne oświadczenie opolskiej 'Solidarności'.")

    add_bullet(doc, "Poznań (Głos Wielkopolski)", 
               "Redakcja poznańska jako jedyna przeprowadziła klasyczny plebiscyt symetrystyczny, konfrontując ze sobą posłów KO i PiS z Wielkopolski. W tekście wyważono proporcje wypowiedzi dokładnie po 50%, dając tytuł 'Przywracanie porządku prawnego' kontra 'Bezprawne przejęcie władzy'.")

    add_bullet(doc, "Kraków (Gazeta Krakowska i Dziennik Polski)", 
               "W Małopolsce zamiast sporu partyjnego wyeksponowano nieoczekiwany głos ze świata biznesu i sportu – obszerny apel Jarosława Królewskiego (prezesa Wisły Kraków i przedsiębiorcy IT), który wezwał do powołania 'ponadpartyjnego zespołu ekspertów w celu wygaszenia wojny o Trybunał'. Tekst ten sklonowano w trzech krakowskich serwisach.")

    add_bullet(doc, "Koszalin, Toruń, Białystok (GK24, Gazeta Pomorska, Kurier Poranny)", 
               "Ośrodki te ograniczyły się do fotorelacji z lokalnych pikiet poparcia dla dotychczasowego składu TK zorganizowanych przez lokalne struktury klubów 'Gazety Polskiej' i radnych prawicy.")

    doc.add_picture(str(paths['c4']), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 4. Oś czasu publikacji (dynamika godzinowa) – załamanie aktywności politycznej w niedzielę rano.")

    # --- ROZDZIAŁ 7 ---
    add_heading(doc, "7. Wykaz kluczowych publikacji źródłowych", 1, kicker="Rejestr dowodowy")

    add_body(doc, "Poniższa tabela zawiera wybrane, reprezentatywne publikacje z bazy PPGscope dokumentujące przebieg relacjonowania wydarzeń w mediach Polska Press:")

    art_headers = ["Data / Czas", "Portal / Domena", "Tytuł artykułu", "Wydźwięk", "Typ materiału"]
    art_widths = [1.1, 1.3, 2.5, 0.9, 0.8]
    art_rows = [
        ("30.10 17:59", "naszemiasto.pl", "Zamieszanie wokół TK. Trzy osoby zatrzymane. Prezydent wraca do kraju", "Neutralny", "Agencyjny"),
        ("30.10 18:16", "gloswielkopolski.pl", "Policja na terenie TK. Prezydent Polski przerywa podróż i wraca do kraju", "Neutralny", "Własny"),
        ("31.10 07:02", "i.pl (+17 reg.)", "Twaróg: Sprzątanie po pisowskim kipiszu z ruskimi agentami w tle razy dziesięć", "Pro-rządowy", "Felieton centralny"),
        ("31.10 07:45", "i.pl", "Noc przed Trybunałem Konstytucyjnym w obiektywie Adama Jankowskiego", "Neutralny", "Fotorelacja"),
        ("31.10 11:47", "i.pl", "Zagraniczne media o sytuacji wokół TK: chaos i eskalacja konfliktu", "Symetrystyczny", "Przegląd prasy"),
        ("31.10 13:56", "gloswielkopolski.pl", "„Przywracanie prawa” kontra „Bezprawne przejęcie”. Spór o TK w Poznaniu", "Symetrystyczny", "Lokalny sondaż"),
        ("31.10 14:27", "nto.pl", "Anna Korwin-Piotrowska z Opola twierdzi, że stoi na czele TK. Komentarze", "Lokalny", "Sylwetka / Opole"),
        ("31.10 16:25", "nto.pl", "Opolska „Solidarność” zabiera głos w sprawie wydarzeń wokół TK", "Krytyczny (PiS)", "Oświadczenie"),
        ("31.10 16:41", "gk24.pl", "Protest w obronie Trybunału Konstytucyjnego przed ratuszem w Koszalinie", "Neutralny", "Fotorelacja"),
        ("31.10 18:31", "gazetakrakowska.pl", "J. Królewski: Potrzeba ponadpartyjnego zespołu ds. reformy TK", "Koncyliacyjny", "Własny / Kraków"),
        ("31.10 19:08", "i.pl", "Tusk: Wrzask, kłamstwo i bijatyka nie mogą być źródłem prawa w Polsce", "Pro-rządowy", "Depesza KPRM"),
        ("31.10 19:25", "kurierlubelski.pl", "Donald Tusk: Wrzask, kłamstwo i bijatyka nie mogą być źródłem prawa w Polsce", "Pro-rządowy", "Przedruk i.pl"),
        ("31.10 21:12", "pomorska.pl", "Protest w obronie Trybunału Konstytucyjnego w Toruniu", "Neutralny", "Fotorelacja")
    ]
    add_table(doc, art_headers, art_widths, art_rows, header_fill=NAVY, font_size=7.5)

    # --- ROZDZIAŁ 8 ---
    add_heading(doc, "8. Wnioski końcowe i perspektywy", 1, kicker="Konkluzje")

    add_bullet(doc, "1. Rządowa linia publicystyczna bez zaangażowania operacyjnego", 
               "Zarząd i centralne kierownictwo redakcyjne Polska Press Grupa zachowują pełną lojalność wobec narracji obozu rządzącego w momentach kluczowych (publikacja ostrego felietonu Twaroga, aprobująca depesza z orędzia Tuska). Jednocześnie brak machinacji operacyjnej i brak relacji na żywo w regionach dowodzi, że medium to nie służy już jako tuba mobilizacyjna, lecz jako medium spacyfikowane, unikające angażowania swoich czytelników w ostre konflikty polityczne.")

    add_bullet(doc, "2. Dominacja komercyjnego modelu SEO / Evergreen", 
               "Polska Press w weekendy funkcjonuje przede wszystkim jako maszynka do generowania odsłon na bezpiecznych tematach świąteczno-poradnikowych. Wybór Wszystkich Świętych zamiast kryzysu w TK wynikał z kalkulacji zasięgowej – tematy cmentarne generują w tym okresie wielomilionowy ruch regionalny, którego nie był w stanie zapewnić hermetyczny spór prawny.")

    add_bullet(doc, "3. Fikcja ogólnokrajowej sieci informacyjnej", 
               "Fakt, że orędzie premiera wygłoszone w stanie najwyższego napięcia państwowego zostało zignorowane przez 19 z 21 gazet regionalnych, obnaża słabość integracji newsowej holdingu. Polska Press nie działa dziś jak zintegrowana sieć informacyjna zdolna do natychmiastowego narzucenia agendy w regionach, lecz jako zbiór lokalnych witryn żyjących własnym, wysoce zdepolityzowanym rytmem.")

    # ZAPIS DOKUMENTU DO PLIKÓW
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    doc.save(str(DOCX_DOWNLOADS))
    doc.save(str(DOC_DOWNLOADS))
    doc.save(str(DOCX_REPORTS))
    doc.save(str(DOC_REPORTS))

    print(f"\n[SUKCES] Dokumenty zostały wygenerowane i zapisane:")
    print(f"  -> {DOCX_DOWNLOADS}")
    print(f"  -> {DOC_DOWNLOADS}")
    print(f"  -> {DOCX_REPORTS}")
    print(f"  -> {DOC_REPORTS}")


if __name__ == "__main__":
    build_full_report()
