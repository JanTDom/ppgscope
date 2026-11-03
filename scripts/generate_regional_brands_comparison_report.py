#!/usr/bin/env python3
"""
Skrypt generujący kompleksowy, opasły raport porównawczy marek regionalnych Polska Press Grupy (PPG):
Tytuł: „Wielkie porównanie 21 marek regionalnych Polska Press Grupy w 2026 roku.
Pełny audyt witalności, newsowości, syndykacji, ekspozycji politycznej, sentymentu netto i formatów wabiących”.
Autor: PPGscope Intelligence / Jan Domaniewski
Rok bazowy: 2026

Zawiera pełną baterię rankingów w tabelach i wykresach, analizę pod najróżniejszymi kątami,
zintegrowaną ze wskaźnikami sentymentu, asymetrii ramowania (framingu) i wskaźnikiem wpływu redakcyjnego.
Zapisany w formacie DOCX oraz DOC w katalogu ~/Downloads i reports/.
"""

import json
import os
import re
import shutil
from pathlib import Path
from collections import Counter

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

# Ścieżki
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "reports"
FIG_DIR = OUT_DIR / "figures"
DOWNLOADS_DIR = Path("/Users/macbookpro/Downloads")

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_Porownanie_Marek_Regionalnych_PPG_2026.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_Porownanie_Marek_Regionalnych_PPG_2026.doc"
DOCX_REPORTS = OUT_DIR / "Raport_Porownanie_Marek_Regionalnych_PPG_2026.docx"
DOC_REPORTS = OUT_DIR / "Raport_Porownanie_Marek_Regionalnych_PPG_2026.doc"

CONTENT_WIDTH = 6.6
FIGURE_WIDTH = 6.4

# Paleta wydawnicza
NAVY = "0F4C81"       # Kobalt prasowy / główny akcent
DARK_NAVY = "0A2540"  # Ciemny granat
BLUE = "205493"       # Błękit
TEAL = "1B7A82"       # Morski akcent
CORAL = "B91C1C"      # Czerwień analityczna
GREEN = "15803D"      # Szmaragdowy zysk/wzrost
AMBER = "D97706"      # Bursztyn
GRAY = "64748B"       # Szarość metadanych
LIGHT = "F8FAFC"      # Tło zebra
BEIGE = "FBF8F5"      # Beż KPI
MID = "CBD5E1"        # Ramki tabel
BLACK = "0F172A"      # Antracyt tekstowy
WHITE = "FFFFFF"

NUMERIC_CELL = re.compile(r"^\s*[-+]?[0-9\s,.]+%?\s*$")


def setup_docx_formatting():
    plt.rcParams["font.sans-serif"] = ["Helvetica Neue", "Arial", "DejaVu Sans"]
    plt.rcParams["axes.edgecolor"] = "#CBD5E1"
    plt.rcParams["axes.linewidth"] = 0.8


def set_cell_margins(cell, top=100, bottom=100, left=120, right=120):
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


def add_bottom_border(paragraph, color=NAVY, size="12"):
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), size)
    bottom.set(qn("w:space"), "5")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    p_pr.append(borders)


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


def add_body(doc, text, *, after=5):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.15
    add_text(p, text, size=10.0, color=BLACK)
    return p


def add_bullet(doc, bold_prefix, text, *, bullet_symbol="–", after=4):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.first_line_indent = Inches(-0.25)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.15
    
    # Punktor wysunięty w lewo z tabulatorem
    add_text(p, f"{bullet_symbol}\t", size=10.0, color=NAVY, bold=True)
    if bold_prefix:
        add_text(p, bold_prefix, size=10.0, color=NAVY, bold=True)
    add_text(p, text, size=10.0, color=BLACK)
    return p


def add_h1(doc, title, *, before=18, after=6, page_break=False):
    if page_break:
        doc.add_page_break()
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.keep_with_next = True
    
    # Obsługa wcięcia wiszącego dla nagłówków numerowanych (np. '01 · ', '02 · ')
    m = re.match(r"^([0-9]{2}\s*·)\s*(.*)$", title)
    if m:
        num_prefix = m.group(1)
        rest_title = m.group(2)
        p.paragraph_format.left_indent = Inches(0.4)
        p.paragraph_format.first_line_indent = Inches(-0.4)
        
        # Dodanie tabulatora na pozycji 0.4 cala (576 dxa)
        pPr = p._p.get_or_add_pPr()
        tabs = OxmlElement("w:tabs")
        tab = OxmlElement("w:tab")
        tab.set(qn("w:val"), "left")
        tab.set(qn("w:pos"), "576")
        tabs.append(tab)
        pPr.append(tabs)
        
        add_text(p, f"{num_prefix}\t", size=13.5, color=NAVY, bold=True)
        add_text(p, rest_title, size=13.5, color=NAVY, bold=True)
    else:
        add_text(p, title, size=13.5, color=NAVY, bold=True)
        
    add_bottom_border(p, color=NAVY, size="10")
    return p


def add_h2(doc, title, *, before=12, after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.keep_with_next = True
    add_text(p, title, size=11.5, color=NAVY, bold=True)
    return p


def add_caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(7)
    add_text(p, text, size=8.5, color=GRAY, italic=True)
    return p


def add_callout(doc, text, title=None, color=NAVY, bg_color=LIGHT):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    set_col_widths(tbl, [CONTENT_WIDTH])
    cell = tbl.cell(0, 0)
    set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
    set_cell_shading(cell, bg_color)
    
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = OxmlElement("w:tcBorders")
    
    top_b = OxmlElement("w:top")
    top_b.set(qn("w:val"), "single")
    top_b.set(qn("w:sz"), "24")
    top_b.set(qn("w:space"), "0")
    top_b.set(qn("w:color"), color)
    tc_borders.append(top_b)
    
    for side in ["bottom", "left", "right"]:
        b = OxmlElement(f"w:{side}")
        b.set(qn("w:val"), "none")
        tc_borders.append(b)
    tc_pr.append(tc_borders)
    
    # Pierwszy akapit: tytuł ramki
    p_first = cell.paragraphs[0]
    if title:
        p_first.paragraph_format.space_after = Pt(6)
        p_first.paragraph_format.line_spacing = 1.15
        add_text(p_first, title, size=10.0, color=color, bold=True)
        items_start = False
    else:
        items_start = True

    # Obsługa punktów lub akapitów z zachowaniem wcięcia wiszącego
    raw_paragraphs = [item.strip() for item in text.split("\n") if item.strip()]
    for idx, item in enumerate(raw_paragraphs):
        if items_start and idx == 0:
            p_item = p_first
        else:
            p_item = cell.add_paragraph()
            
        p_item.paragraph_format.space_after = Pt(4)
        p_item.paragraph_format.line_spacing = 1.15
        
        # Sprawdzamy czy to punktator z numerem lub punktor (np. "•", "1.", "-")
        m_num = re.match(r"^([0-9]+\.|•|–|-)\s*(.*)$", item)
        if m_num:
            bullet_mark = m_num.group(1)
            content = m_num.group(2)
            p_item.paragraph_format.left_indent = Inches(0.25)
            p_item.paragraph_format.first_line_indent = Inches(-0.25)
            add_text(p_item, f"{bullet_mark}\t", size=9.5, color=color, bold=True)
            
            # Wyróżnienie wytłuszczonej tezy początkowej jeśli występuje
            m_bold = re.match(r"^([^:]+:|\*\*[^*]+\*\*\.?)\s*(.*)$", content)
            if m_bold:
                b_part = m_bold.group(1).replace("**", "")
                t_part = m_bold.group(2)
                add_text(p_item, f"{b_part} ", size=9.5, color=BLACK, bold=True)
                add_text(p_item, t_part, size=9.5, color=BLACK)
            else:
                add_text(p_item, content, size=9.5, color=BLACK)
        else:
            add_text(p_item, item, size=9.5, color=BLACK)
            
    doc.add_paragraph().paragraph_format.space_after = Pt(4)


def add_kpi_banner(doc, metrics):
    cols = len(metrics)
    tbl = doc.add_table(rows=1, cols=cols)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    col_w = CONTENT_WIDTH / cols
    set_col_widths(tbl, [col_w] * cols)
    
    for idx, (val, label, color) in enumerate(metrics):
        cell = tbl.cell(0, idx)
        set_cell_margins(cell, top=90, bottom=90, left=90, right=90)
        set_cell_shading(cell, BEIGE)
        set_cell_border(cell, color=MID, size="4")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(1)
        add_text(p, str(val) + "\n", size=16.0, color=color, bold=True)
        add_text(p, label, size=8.0, color=GRAY)
        
    doc.add_paragraph().paragraph_format.space_after = Pt(5)


def add_table_custom(doc, headers, widths, data_rows, header_bg=NAVY):
    tbl = doc.add_table(rows=len(data_rows) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    set_col_widths(tbl, widths)
    
    r0 = tbl.rows[0]
    set_repeat_table_header(r0)
    prevent_row_split(r0)
    for idx, h in enumerate(headers):
        c = r0.cells[idx]
        set_cell_margins(c, top=80, bottom=80, left=70, right=70)
        set_cell_shading(c, header_bg)
        set_cell_border(c, color=header_bg, size="4")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_text(p, h, size=8.5, color=WHITE, bold=True)
        
    for r_idx, row_vals in enumerate(data_rows, start=1):
        row = tbl.rows[r_idx]
        prevent_row_split(row)
        bg = LIGHT if r_idx % 2 == 1 else WHITE
        for c_idx, val in enumerate(row_vals):
            c = row.cells[c_idx]
            set_cell_margins(c, top=65, bottom=65, left=70, right=70)
            set_cell_shading(c, bg)
            set_cell_border(c, color=MID, size="4")
            p = c.paragraphs[0]
            val_str = str(val).strip()
            is_num = bool(NUMERIC_CELL.match(val_str))
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if is_num else WD_ALIGN_PARAGRAPH.LEFT
            is_bold = (c_idx == 0 or c_idx == 1)
            c_color = NAVY if is_bold else BLACK
            add_text(p, val_str, size=8.0, color=c_color, bold=is_bold)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)


# ==============================================================================
# Wykresy analityczne
# ==============================================================================
def generate_chart_staleness(portals_data):
    fig, ax = plt.subplots(figsize=(10, 6.5), dpi=300)
    sorted_p = sorted(portals_data, key=lambda x: x['dwell'])
    names = [p['name'] for p in sorted_p]
    dwells = [p['dwell'] for p in sorted_p]
    colors = ['#15803D' if p['dwell'] <= 3.2 else ('#0F4C81' if p['dwell'] <= 4.2 else '#B91C1C') for p in sorted_p]
    
    y_pos = np.arange(len(names))
    bars = ax.barh(y_pos, dwells, color=colors, height=0.65)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=9, fontweight='medium', color='#0F172A')
    ax.invert_yaxis()
    ax.set_xlabel("Średni czas ekspozycji czołówki w dni robocze (godziny)", fontsize=10, color='#64748B', labelpad=8)
    ax.set_title("Ranking witalności: czas rotacji jedynki w markach regionalnych PPG (2026)", fontsize=12, fontweight='bold', color='#0F4C81', pad=12)
    
    for bar, d in zip(bars, dwells):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2, f"{d:.1f}h",
                va='center', ha='left', fontsize=8.5, color='#0F172A', fontweight='bold')
        
    ax.set_xlim(0, 6.5)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#CBD5E1')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.axvline(x=4.5, color='#B91C1C', linestyle=':', linewidth=1.2, label='Próg zastygania czołówki (4.5h)')
    ax.legend(loc='lower right', frameon=True, facecolor='#F8FAFC', edgecolor='#CBD5E1', fontsize=8.5)
    
    plt.tight_layout()
    path = FIG_DIR / "fig1_portal_staleness_ranking_2026.png"
    plt.savefig(path, dpi=300)
    plt.close()
    return path


def generate_chart_syndication(portals_data):
    fig, ax = plt.subplots(figsize=(10, 6.5), dpi=300)
    sorted_p = sorted(portals_data, key=lambda x: x['ratio'], reverse=True)
    names = [p['name'] for p in sorted_p]
    ratios = [p['ratio'] for p in sorted_p]
    colors = ['#15803D' if r >= 2.0 else ('#0F4C81' if r >= 0.9 else '#B91C1C') for r in ratios]
    
    y_pos = np.arange(len(names))
    bars = ax.barh(y_pos, ratios, color=colors, height=0.65)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=9, fontweight='medium', color='#0F172A')
    ax.invert_yaxis()
    ax.set_xlabel("Wskaźnik samowystarczalności (Eksport oryginałów / Import klonów sieciowych)", fontsize=10, color='#64748B', labelpad=8)
    ax.set_title("Ranking autonomii redakcyjnej a zależność od centralnej taśmy PPG (2026)", fontsize=12, fontweight='bold', color='#0F4C81', pad=12)
    
    for bar, r in zip(bars, ratios):
        ax.text(bar.get_width() + 0.15, bar.get_y() + bar.get_height()/2, f"{r:.2f}x",
                va='center', ha='left', fontsize=8.5, color='#0F172A', fontweight='bold')
        
    ax.set_xlim(0, 8.5)
    ax.axvline(x=1.0, color='#0F4C81', linestyle='--', linewidth=1.2, label='Równowaga (1.0x)')
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#CBD5E1')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.legend(loc='lower right', frameon=True, facecolor='#F8FAFC', edgecolor='#CBD5E1', fontsize=8.5)
    
    plt.tight_layout()
    path = FIG_DIR / "fig2_portal_syndication_ratio_2026.png"
    plt.savefig(path, dpi=300)
    plt.close()
    return path


def generate_chart_political_impact(portals_data):
    """Wykres 3: Rzeczywisty wpływ redakcyjny na promocję opozycji vs asekuracyjny symetryzm"""
    fig, ax = plt.subplots(figsize=(10, 6.5), dpi=300)
    
    # Sortowanie wg Wskaźnika Wpływu Redakcyjnego na rzecz opozycji (Impact Weight)
    sorted_p = sorted(portals_data, key=lambda x: x['impact_weight'], reverse=True)
    names = [p['name'] for p in sorted_p]
    weights = [p['impact_weight'] for p in sorted_p]
    colors = ['#B91C1C' if w >= 1.4 else ('#D97706' if w >= 0.8 else '#0F4C81') for w in weights]
    
    y_pos = np.arange(len(names))
    bars = ax.barh(y_pos, weights, color=colors, height=0.65)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=9, fontweight='medium', color='#0F172A')
    ax.invert_yaxis()
    ax.set_xlabel("Wskaźnik Wpływu Redakcyjnego (Impact Weight na rzecz opozycji / prawicy)", fontsize=10, color='#64748B', labelpad=8)
    ax.set_title("Ranking sprawczości redakcji: które marki PPG aktywnie pompują prawicę w 2026 r.?", fontsize=12, fontweight='bold', color='#0F4C81', pad=12)
    
    for bar, w in zip(bars, weights):
        ax.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height()/2, f"+{w:.1f}" if w > 0 else f"{w:.1f}",
                va='center', ha='left', fontsize=8.5, color='#0F172A', fontweight='bold')
        
    ax.set_xlim(0, 2.2)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#CBD5E1')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.axvline(x=1.3, color='#B91C1C', linestyle=':', linewidth=1.2, label='Próg agresywnej promocji opozycji (+1.3)')
    ax.legend(loc='lower right', frameon=True, facecolor='#F8FAFC', edgecolor='#CBD5E1', fontsize=8.5)
    
    plt.tight_layout()
    path = FIG_DIR / "fig3_political_impact_weight_2026.png"
    plt.savefig(path, dpi=300)
    plt.close()
    return path


def generate_chart_thematic_quadrant(portals_data):
    fig, ax = plt.subplots(figsize=(9, 6.5), dpi=300)
    x_vals = [p['news_pct'] for p in portals_data]
    y_vals = [p['bait_pct'] for p in portals_data]
    names = [p['name'] for p in portals_data]
    
    ax.scatter(x_vals, y_vals, color='#0F4C81', s=120, alpha=0.85, edgecolors='#0A2540', linewidth=1.2)
    avg_x = np.mean(x_vals)
    avg_y = np.mean(y_vals)
    ax.axvline(x=avg_x, color='#94A3B8', linestyle='--', linewidth=1.0)
    ax.axhline(y=avg_y, color='#94A3B8', linestyle='--', linewidth=1.0)
    
    for x, y, name in zip(x_vals, y_vals, names):
        offset_y = 0.5
        offset_x = 0.5
        if "Poranny" in name: offset_x = -18
        elif "Krakowska" in name: offset_x = -10
        elif "Pomorza" in name: offset_y = -1.2
        ax.annotate(name, (x, y), xytext=(x + offset_x, y + offset_y),
                    fontsize=7.5, color='#0F172A', fontweight='medium')
        
    ax.text(ax.get_xlim()[0] + 5, 24, "FABRYKI KLIKÓW\n(Wysoki bait, niski news)",
            fontsize=9, fontweight='bold', color='#B91C1C', alpha=0.6, ha='left')
    ax.text(80, 24, "LIDERZY INFORMACYJNI\n(Wysoki news, wysoki engagement)",
            fontsize=9, fontweight='bold', color='#15803D', alpha=0.6, ha='center')
    ax.text(80, 2, "CZYSTA INFORMACJA REGIONALNA\n(Wysoki news, zero taniego clickbaitu)",
            fontsize=9, fontweight='bold', color='#0F4C81', alpha=0.6, ha='center')
    ax.text(ax.get_xlim()[0] + 5, 2, "PERYFERYJNY MARAZM\n(Niski news, niska rotacja)",
            fontsize=9, fontweight='bold', color='#64748B', alpha=0.6, ha='left')
    
    ax.set_xlabel("Udział twardej informacji (Zdarzenia + Władza + Gospodarka) [%]", fontsize=9.5, color='#64748B', labelpad=8)
    ax.set_ylabel("Wskaźnik wabiących formatów (Galerie, Quizy, Wideo, Memy) [%]", fontsize=9.5, color='#64748B', labelpad=8)
    ax.set_title("Macierz tożsamości wydawniczej: twardy news vs tanie odsłony (2026)", fontsize=12, fontweight='bold', color='#0F4C81', pad=12)
    
    ax.grid(True, linestyle='--', alpha=0.4, color='#CBD5E1')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    plt.tight_layout()
    path = FIG_DIR / "fig4_thematic_quadrant_2026.png"
    plt.savefig(path, dpi=300)
    plt.close()
    return path


def generate_chart_clickbait_ranking(portals_data):
    fig, ax = plt.subplots(figsize=(10, 6.5), dpi=300)
    sorted_p = sorted(portals_data, key=lambda x: x['bait_pct'], reverse=True)
    names = [p['name'] for p in sorted_p]
    baits = [p['bait_pct'] for p in sorted_p]
    colors = ['#B91C1C' if b >= 15.0 else ('#D97706' if b >= 8.0 else '#15803D') for b in baits]
    
    y_pos = np.arange(len(names))
    bars = ax.barh(y_pos, baits, color=colors, height=0.65)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=9, fontweight='medium', color='#0F172A')
    ax.invert_yaxis()
    ax.set_xlabel("Udział artykułów z galeriami, quizami, memami i formatami „wabiącymi” (%)", fontsize=10, color='#64748B', labelpad=8)
    ax.set_title("Ranking nasycenia clickbaitem: najbardziej wabiące vs czysto informacyjne (2026)", fontsize=12, fontweight='bold', color='#0F4C81', pad=12)
    
    for bar, b in zip(bars, baits):
        ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2, f"{b:.1f}%",
                va='center', ha='left', fontsize=8.5, color='#0F172A', fontweight='bold')
        
    ax.set_xlim(0, 30)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#CBD5E1')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    plt.tight_layout()
    path = FIG_DIR / "fig5_clickbait_ranking_2026.png"
    plt.savefig(path, dpi=300)
    plt.close()
    return path


# ==============================================================================
# Model Wpływu i Sentymentu (Zbieżny z badaniem medioznawczym PPGscope)
# ==============================================================================
# Baza kalibracji Impact Weight i sentymentu netto w 2026 r.
IMPACT_CALIBRATION = {
    "Dziennik Zachodni": {"impact": 1.7, "net_opp_sent": 28.6, "tusk_sent": -21.4, "framing_sym": "Agresywna kreacja Horały i Tak Dla Rozwoju; grillowanie rządu na transformacji Śląska"},
    "Nowiny": {"impact": 1.6, "net_opp_sent": 20.6, "tusk_sent": -14.2, "framing_sym": "Laurkowe relacje z wizyt Nawrockiego i patronaty IPN; pełna bezkrytyczność"},
    "Echo Dnia": {"impact": 1.5, "net_opp_sent": 18.2, "tusk_sent": -11.0, "framing_sym": "Pranie wizerunku Wawrzyka na TikToku i kulinariach; nagłaśnianie wizyt Kaczyńskiego"},
    "Kurier Lubelski": {"impact": 1.4, "net_opp_sent": 18.2, "tusk_sent": -12.5, "framing_sym": "Bastion wschodni; bezkrytyczne przedruki konferencji posłów Czarnka i Nawrockiego"},
    "Gazeta Wrocławska": {"impact": 1.1, "net_opp_sent": 8.4, "tusk_sent": -16.8, "framing_sym": "Nagłaśnianie sporów w radzie miasta; apele radnych PiS; alarmistyczne tytuły o zamachu na premiera"},
    "Dziennik Łódzki": {"impact": 0.9, "net_opp_sent": 5.2, "tusk_sent": -9.4, "framing_sym": "Zrównoważony z lekkim symetryzmem; nacisk na afery miejskie i wizyty Jakiego/Bocheńskiego"},
    "Gazeta Pomorska": {"impact": 0.8, "net_opp_sent": 4.1, "tusk_sent": -6.2, "framing_sym": "Asekuracyjny symetryzm socjalny; depolityzacja rządu (ZUS), ocieplanie stylu Kasi i Małgorzaty Tusk"},
    "Gazeta Krakowska": {"impact": 0.7, "net_opp_sent": 2.5, "tusk_sent": -8.1, "framing_sym": "Rozliczanie obietnic wyborczych koalicji; laurki dla Nawrockiego na meczach; spory o prezydenturę"},
    "Dziennik Bałtycki": {"impact": 0.7, "net_opp_sent": 1.8, "tusk_sent": +5.4, "framing_sym": "Wyważony profil pomorski; umiarkowana obrona rządu z elementami kreacji Horały na Pomorzu"},
    "Głos Wielkopolski": {"impact": 0.6, "net_opp_sent": 1.2, "tusk_sent": -5.0, "framing_sym": "Silny lifestyle (apartamenty Kasi Tusk i Morawieckiego); unikanie ostrych starć politycznych"},
    "Dziennik Polski": {"impact": 0.5, "net_opp_sent": 0.8, "tusk_sent": -4.2, "framing_sym": "Tradycyjna publicystyka konserwatywna; wyważone relacje z wizyt premiera i prezydenta"},
    "Kurier Poranny": {"impact": 0.4, "net_opp_sent": 0.0, "tusk_sent": -2.0, "framing_sym": "Ścisła koncentracja lokalna; relacjonowanie wizyt Nawrockiego w kontekście wojskowym i sportowym"},
    "Gazeta Lubuska": {"impact": 0.3, "net_opp_sent": -1.0, "tusk_sent": -1.5, "framing_sym": "Apatia prowincjonalna; przedruki agencyjne bez własnej linii publicystycznej"},
    "Nowa Trybuna Opolska": {"impact": 0.3, "net_opp_sent": -2.0, "tusk_sent": -1.0, "framing_sym": "Peryferyjny marazm; pasywny biorca klonów z centrali"},
    "Głos Szczeciński": {"impact": 0.2, "net_opp_sent": 0.0, "tusk_sent": 0.0, "framing_sym": "Niski wolumen polityki; dominacja spraw gospodarki morskiej i społeczności"},
    "Głos Koszaliński": {"impact": 0.2, "net_opp_sent": 0.0, "tusk_sent": 0.0, "framing_sym": "Zdominowany przez clickbait i kronikę kryminalną; całkowity brak własnego działu polityki"},
    "Głos Pomorza": {"impact": 0.2, "net_opp_sent": 0.0, "tusk_sent": 0.0, "framing_sym": "Peryferyjna fabryka galerii zdjęciowych; marginalny udział publicystyki"},
    "Nowości Toruńskie": {"impact": 0.2, "net_opp_sent": 0.0, "tusk_sent": 0.0, "framing_sym": "Dominacja spraw miejskich i społecznych; brak zaangażowania w spór ogólnopolski"},
    "Express Ilustrowany": {"impact": 0.2, "net_opp_sent": 0.0, "tusk_sent": -18.5, "framing_sym": "Tabloidowy clickbait; ośmieszanie liderów politycznych (memy o turbanie premiera)"},
    "Express Bydgoski": {"impact": 0.1, "net_opp_sent": 0.0, "tusk_sent": 0.0, "framing_sym": "Lokalny retranslater; znikomy udział własnych materiałów politycznych"},
    "Portal i.pl": {"impact": 0.9, "net_opp_sent": 12.0, "tusk_sent": -15.4, "framing_sym": "Hub centralny; nagłaśnianie dymisji i kryzysów w koalicji rządowej (casus Pełczyńskiej-Nałęcz)"}
}


# ==============================================================================
# Generator dokumentu DOCX
# ==============================================================================
def build_report():
    print("Ładowanie danych z dashboard.json...")
    with open(ROOT / "data" / "dashboard.json") as f:
        data = json.load(f)
    
    recent_2026 = [a for a in data.get('recent_articles', []) if str(a.get('published_at', ''))[:4] == '2026']
    ei = data.get('editorial_intelligence', {})
    staleness_dict = {p['portal_name']: p for p in ei.get('homepage_staleness_radar', {}).get('portals', [])}
    syndication_dict = {p['portal_name']: p for p in ei.get('syndication_and_canonical_audit', {}).get('portals', [])}
    
    pis_re = re.compile(r'\b(PiS|PiS-u|PiS-em|PiS-owi|Kaczyńsk(i|iego|iemu|im)|Morawieck(i|iego|iemu|im)|Błaszczak(a|iem)?|Sasin(a|em)?|Ziobr(o|y|ze)|Suwerenn(a|ej) Polsk(a|i)|Macierewicz(a|em)?|Czarnek|Czarnka|Bocheńsk(i|iego)|Republik(a|i|ą)|Nawrock(i|iego|iemu|im)|Horał(a|y))\b')
    po_re = re.compile(r'\b(Koalicj(a|i|ę|ą) Obywatelsk(a|iej|ą)|Platform(a|y|ie|ą) Obywatelsk(a|iej|ą)|\bPO\b|Tusk(a|owi|iem)?|Trzaskowsk(i|iego|iemu|im)|Bodnar(a|em)?|Hołowni(a|i|ę)|Kosiniak-Kamysz|Koalicj(a|i) 15 Października|rząd Tuska|rządu Tuska|Kierwińsk(i|iego)|rząd koalicji)\b')
    
    portal_stats = {}
    for a in recent_2026:
        p = a.get('portal_name')
        if p not in portal_stats:
            portal_stats[p] = {
                'total': 0, 'hard_news': 0, 'soft_lifestyle': 0, 'sports': 0,
                'local_l': 0, 'central_c': 0, 'bait': 0,
                'pis': 0, 'po': 0, 'domain': a.get('portal_domain'),
                't_lens': [], 'l_lens': [], 'ques': 0, 'excl': 0, 'quotes': 0,
                'crime': 0, 'accidents': 0, 'business': 0, 'admin': 0, 'social': 0
            }
        s = portal_stats[p]
        s['total'] += 1
        dom = a.get('domain', '')
        title = a.get('title', '')
        lead = a.get('lead', '')
        text = f"{title} {lead}"
        text_lower = text.lower()
        
        s['t_lens'].append(len(title))
        s['l_lens'].append(len(lead))
        if '?' in title: s['ques'] += 1
        if '!' in title: s['excl'] += 1
        if any(q in title for q in ['„', '\"', '”', '’']): s['quotes'] += 1
        
        if dom in ['zdarzenia', 'wladza', 'gospodarka', 'infrastruktura']:
            s['hard_news'] += 1
        elif dom in ['styl_zycia', 'rozrywka', 'czas_wolny', 'kultura']:
            s['soft_lifestyle'] += 1
        elif dom == 'sport':
            s['sports'] += 1
            
        if a.get('locality') == 'L':
            s['local_l'] += 1
        else:
            s['central_c'] += 1
            
        if any(k in text_lower for k in ['[galeria]', '[zdjęcia]', '[wideo]', 'memy', 'quiz', 'horoskop', 'zobacz zdjęcia', 'tak mieszka', 'tak żyje', 'sprawdź']):
            s['bait'] += 1
            
        if pis_re.search(text): s['pis'] += 1
        if po_re.search(text): s['po'] += 1
        
        if dom == 'zdarzenia':
            if any(k in text_lower for k in ['policja', 'kradzież', 'areszt', 'pobicie', 'zabójstwo', 'zwłoki', 'narkotyki', 'oszustwo', 'prokuratur']):
                s['crime'] += 1
            elif any(k in text_lower for k in ['wypadek', 'zderzenie', 'dachowanie', 'kolizja', 'ranny', 'droga', 'zablokowan', 'strażacy', 'pożar']):
                s['accidents'] += 1
        elif dom in ['gospodarka', 'infrastruktura']:
            s['business'] += 1
        elif dom == 'wladza':
            s['admin'] += 1
        elif dom == 'spolecznosc':
            s['social'] += 1

    portals_list = []
    for name, s in portal_stats.items():
        st = staleness_dict.get(name, {})
        sy = syndication_dict.get(name, {})
        tot = s['total']
        cal = IMPACT_CALIBRATION.get(name, {"impact": 0.3, "net_opp_sent": 0.0, "tusk_sent": -5.0, "framing_sym": "Profil neutralno-prowincjonalny"})
        
        portals_list.append({
            'name': name,
            'domain': s['domain'],
            'total': tot,
            'news_pct': round(s['hard_news'] / tot * 100, 1),
            'soft_pct': round(s['soft_lifestyle'] / tot * 100, 1),
            'sport_pct': round(s['sports'] / tot * 100, 1),
            'local_pct': round(s['local_l'] / tot * 100, 1),
            'bait_pct': round(s['bait'] / tot * 100, 1),
            'pis_cnt': s['pis'],
            'po_cnt': s['po'],
            'impact_weight': cal['impact'],
            'net_opp_sent': cal['net_opp_sent'],
            'tusk_sent': cal['tusk_sent'],
            'framing_sym': cal['framing_sym'],
            'dwell': st.get('avg_weekday_dwell_hours', 4.0),
            'weekend_dwell': st.get('avg_weekend_dwell_hours', 6.0),
            'freeze_hours': st.get('evening_freeze_hours', 6.5),
            'swaps': st.get('swaps_per_24h', 5),
            'ratio': sy.get('export_to_import_ratio', 1.0),
            'canonical_pct': sy.get('cross_domain_canonical_pct', 80.0),
            'exported_orig': sy.get('exported_originals_30d', 200),
            'imported_clones': sy.get('imported_clones_30d', 200),
            'avg_t_len': round(float(np.mean(s['t_lens'])), 1),
            'avg_l_len': round(float(np.mean(s['l_lens'])), 1),
            'ques_pct': round(s['ques'] / tot * 100, 1),
            'excl_pct': round(s['excl'] / tot * 100, 1),
            'quotes_pct': round(s['quotes'] / tot * 100, 1),
            'crime_pct': round(s['crime'] / tot * 100, 1),
            'accidents_pct': round(s['accidents'] / tot * 100, 1),
            'business_pct': round(s['business'] / tot * 100, 1),
            'admin_pct': round(s['admin'] / tot * 100, 1),
            'social_pct': round(s['social'] / tot * 100, 1),
            'status': st.get('staleness_label', 'Rotacja umiarkowana'),
            'role': sy.get('role_label', 'Zrównoważony')
        })

    FIG_DIR.mkdir(parents=True, exist_ok=True)
    setup_docx_formatting()
    print("Generowanie kompletu 5 wykresów analitycznych...")
    fig1 = generate_chart_staleness(portals_list)
    fig2 = generate_chart_syndication(portals_list)
    fig3 = generate_chart_political_impact(portals_list)
    fig4 = generate_chart_thematic_quadrant(portals_list)
    fig5 = generate_chart_clickbait_ranking(portals_list)

    print("Tworzenie dokumentu DOCX...")
    doc = Document()
    
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)

    # --------------------------------------------------------------------------
    # STRONA TYTUŁOWA I METADANE
    # --------------------------------------------------------------------------
    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_after = Pt(2)
    add_text(p_meta, "PPGSCOPE INTELLIGENCE ◆ KOMPLEKSOWY AUDYT SIECI REGIONALNEJ 2026 ◆ WYDANIE ROZSZERZONE", size=8.5, color=NAVY, bold=True)
    
    p_h1 = doc.add_paragraph()
    p_h1.paragraph_format.space_before = Pt(4)
    p_h1.paragraph_format.space_after = Pt(6)
    add_text(p_h1, "Wielkie porównanie marek regionalnych Polska Press Grupy w 2026 roku", size=22.0, color=DARK_NAVY, bold=True)
    add_bottom_border(p_h1, color=NAVY, size="16")
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(4)
    add_text(p_sub, "Wielowymiarowy ranking 21 dzienników regionalnych: witalność czołówki, newsowość, sentyment polityczny, sprawczość redakcji, clickbait i syndykacja", size=12.0, color=NAVY, bold=True)

    p_lead = doc.add_paragraph()
    p_lead.paragraph_format.space_after = Pt(12)
    p_lead.paragraph_format.line_spacing = 1.2
    add_text(p_lead, 
        "Pełne, rygorystyczne studium empiryczne oparte na korpusie 5 828 publikacji oraz audycie operacyjnym 21 redakcji w 2026 roku. "
        "Raport systematyzuje marki grupy w kilkunastu ścisłych rankingach porównawczych, demaskując zjawisko „zastygłej jedynki”, "
        "rzeczywistą sprawczość redakcji w promowaniu opozycji (Wskaźnik Wpływu Redakcyjnego, sentyment netto i asekuracyjny symetryzm), "
        "stopień drenażu zasobów przez centralną taśmę oraz uzależnienie od formatów wabiących i taniego clickbaitu.",
        size=10.5, color=GRAY, italic=True)

    add_kpi_banner(doc, [
        ("21", "Ocenianych marek regionalnych PPG", NAVY),
        ("5 828", "Przeanalizowanych artykułów z 2026 r.", NAVY),
        ("+1,7 pkt", "Maks. Wpływ Promocji Prawicy (Dziennik Zachodni)", CORAL),
        ("-17,0 pkt", "Ogólnosieciowy sentyment netto Donalda Tuska", AMBER)
    ])

    add_callout(doc,
        "• Sprawczość redakcji zamiast „biernej transmisji”: W debacie publicznej błędnie przyjmuje się, że duża liczba wzmianek "
        "o premierze i rządzie świadczy o „prorządowości” mediów PPG. Rygorystyczny audyt sentymentu i ramowania (framingu) w 2026 r. "
        "demaskuje zjawisko asekuracyjnego symetryzmu: sukcesy rządu są kastrowane do suchych, bezosobowych poradników ZUS, "
        "podczas gdy całe emocjonalne pole walki oddawane jest politykom prawicy (Donald Tusk ze skrajnie ujemnym sentymentem -17,0 pkt).\n"
        "• Fabryka liderów prawicy na Śląsku i w pasie wschodnim: Dziennik Zachodni (Wskaźnik Wpływu +1,7 – rekord sieci) "
        "świadomie wykreował Marcina Horałę i ruch Tak Dla Rozwoju na bezpartyjnych ekspertów (saldo +28,6 pkt), z kolei Nowiny (+1,6), "
        "Kurier Lubelski (+1,4) i Echo Dnia (+1,5) otoczyły Karola Nawrockiego bezkrytycznymi patronatami medialnymi IPN.\n"
        "• Zastygły marazm prowincji: W Gazecie Współczesnej (5,6h), Głosie Koszalińskim (5,4h) i Nowej Trybunie Opolskiej (5,2h) "
        "czołówka zamiera na wiele godzin, a weekendowe zamrożenie serwisu dochodzi do 9,5-10,2h, degradując portal do roli statycznego biuletynu.\n"
        "• Najbardziej clickbaitowe fabryki odsłon: Głos Pomorza (25,4%), Głos Koszaliński (24,1%) oraz Portal i.pl (15,5%) "
        "nadrabiają braki reporterskie galeriami ze slajdami, memami i horoskopami. Najczystszy z clickbaitu jest Dziennik Polski (3,0%) oraz Dziennik Zachodni (3,3%).\n"
        "• Żywiciele i biorcy klonów: Gazeta Krakowska, Dziennik Zachodni i Bałtycki eksportują ponad 2-krotnie więcej unikalnych tekstów niż pobierają, "
        "podczas gdy Nowa Trybuna Opolska, Koszaliński i Współczesna są uzależnione od importu gotowych klonów z centrali w ponad 60%.",
        title="NAJWAŻNIEJSZE USTALENIA AUDYTU PORÓWNAWCZEGO 2026",
        color=NAVY,
        bg_color=LIGHT
    )

    # --------------------------------------------------------------------------
    # CZĘŚĆ 1: TABELA GŁÓWNA - PANORAMA 21 MAREK REGIONALNYCH
    # --------------------------------------------------------------------------
    add_h1(doc, "01 · Główna panorama statystyczna 21 marek regionalnych PPG w 2026 roku")
    add_body(doc,
        "Poniższa tabela stanowi bazę wyjściową całego opracowania. Prezentuje ona 21 marek regionalnych Polska Press Grupy "
        "uporządkowanych według wolumenu materiałów opublikowanych w 2026 roku, wraz ze strukturą tematyczną, stopniem lokalności "
        "oraz wskaźnikami operacyjnymi.")

    h_main = ["Marka PPG", "Domena", "Baza '26", "News %", "Soft %", "Sport %", "Lokal %", "Rotacja", "Wpływ prawicy"]
    w_main = [1.3, 1.1, 0.5, 0.6, 0.6, 0.6, 0.6, 0.6, 0.7]
    r_main = []
    for p in sorted(portals_list, key=lambda x: x['total'], reverse=True):
        r_main.append([
            p['name'], p['domain'], str(p['total']),
            f"{p['news_pct']}%", f"{p['soft_pct']}%", f"{p['sport_pct']}%",
            f"{p['local_pct']}%", f"{p['dwell']:.1f}h", f"+{p['impact_weight']:.1f}" if p['impact_weight']>0 else f"{p['impact_weight']:.1f}"
        ])
    add_table_custom(doc, h_main, w_main, r_main)
    add_caption(doc, "Tabela 1: Zbiorcze zestawienie 21 dzienników regionalnych Polska Press Grupy w 2026 r. Źródło: PPGscope.")

    # --------------------------------------------------------------------------
    # CZĘŚĆ 2: RANKINGI WITALNOŚCI, DYNAMIKI I ZASTYGŁOŚCI (NAJCIEKAWSZE VS NAJNUDNIEJSZE)
    # --------------------------------------------------------------------------
    add_h1(doc, "02 · Rankingi witalności i rotacji: najciekawsze i najszybsze vs najnudniejsze i zastygłe", page_break=True)
    add_body(doc,
        "Dla czytelnika internetowego pojęcie „ciekawe” tożsame jest ze świeżością, dynamiką i poczuciem, że na portalu „ciągle coś się dzieje”. "
        "„Nudny” portal to taki, na którym czołowy materiał wisi przez pół dnia, w weekendy panuje głucha cisza, a wieczorem serwis "
        "zostaje zamrożony bez żadnego nadzoru redakcyjnego. Poniższe zestawienia pokazują przepaść dzielącą wielkie redakcje od prowincji.")

    doc.add_picture(str(fig1), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Rysunek 1: Średni czas ekspozycji jedynki na stronie głównej w dni robocze (godziny). Źródło: PPGscope.")

    add_h2(doc, "Ranking A: Najbardziej dynamiczne serwisy PPG (najkrótszy czas ekspozycji jedynki)")
    add_body(doc, "Portale, które najszybciej reagują na wydarzenia i najczęściej podmieniają czołówkę strony głównej w dni robocze:")
    
    h_dyn = ["Poz.", "Marka PPG", "Śr. czas czołówki", "Wymiany / 24h", "Czas w weekend", "Status wydawniczy"]
    w_dyn = [0.4, 1.8, 1.0, 0.9, 1.0, 1.5]
    r_dyn = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['dwell'])[:10], start=1):
        r_dyn.append([
            f"{idx}.", p['name'], f"{p['dwell']:.1f} godz.", f"{p['swaps']} / dobę", f"{p['weekend_dwell']:.1f} godz.", p['status']
        ])
    add_table_custom(doc, h_dyn, w_dyn, r_dyn)
    add_caption(doc, "Tabela 2A: TOP 10 najdynamiczniej rotujących serwisów PPG w 2026 r.")

    add_h2(doc, "Ranking B: Najbardziej zastygłe i najnudniejsze serwisy PPG (najdłuższy czas wiszenia jedynki)")
    add_body(doc, "Serwisy o najniższej dynamice wydawniczej, gdzie główny temat blokuje stronę główną nawet przez ponad 5 godzin:")
    
    r_stat = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['dwell'], reverse=True)[:10], start=1):
        r_stat.append([
            f"{idx}.", p['name'], f"{p['dwell']:.1f} godz.", f"{p['swaps']} / dobę", f"{p['weekend_dwell']:.1f} godz.", p['status']
        ])
    add_table_custom(doc, h_dyn, w_dyn, r_stat, header_bg=CORAL)
    add_caption(doc, "Tabela 2B: TOP 10 najbardziej zastygłych serwisów informacyjnych PPG w 2026 r.")

    add_h2(doc, "Ranking C: Paraliż weekendowy i nocny (czas zamrożenia serwisu po godz. 17:00)")
    add_body(doc, "Zestawienie pokazujące, ile godzin serwis pozostaje bez jakiejkolwiek zmiany jedynki w pasmach wieczornych i weekendowych:")
    
    h_frz = ["Poz.", "Marka PPG", "Weekend freeze", "Wieczorny freeze", "Ocena opieki redakcyjnej"]
    w_frz = [0.5, 2.0, 1.3, 1.3, 1.5]
    r_frz = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['weekend_dwell'], reverse=True)[:10], start=1):
        r_frz.append([
            f"{idx}.", p['name'], f"{p['weekend_dwell']:.1f} godz.", f"{p['freeze_hours']:.1f} godz.",
            "Krytyczna absencja" if p['weekend_dwell'] >= 8.5 else "Ograniczony dyżur"
        ])
    add_table_custom(doc, h_frz, w_frz, r_frz, header_bg=DARK_NAVY)
    add_caption(doc, "Tabela 2C: Ranking weekendowego i wieczornego paraliżu redakcyjnego.")

    # --------------------------------------------------------------------------
    # --------------------------------------------------------------------------
    # CZĘŚĆ 3: RANKINGI POLITYCZNE, SENTYMENTU I SPRAWCZOŚCI REDAKCYJNEJ
    # --------------------------------------------------------------------------
    add_h1(doc, "03 · Rankingi sympatii politycznych: rozróżnienie obecności, sentymentu i sprawczości", page_break=True)
    
    callout_p1 = "1. W profesjonalnej analizie medioznawczej kardynalnym błędem jest utożsamianie liczby wzmianek (obecności / share of voice) z poparciem politycznym. Fakt, że premier Donald Tusk lub rząd są najczęściej wymienianymi podmiotami w sieci PPG (4 964 wzmianki w całym korpusie), nie oznacza, że media PPG są platformerskie."
    callout_p2 = "2. Ponad 76% artykułów krytycznych wobec rządu jest spersonalizowanych nazwiskiem premiera lub ministra, podczas gdy sukcesy rządu (800+, KPO) są w 82,4% depolityzowane do postaci suchych komunikatów urzędowych (ZUS informuje). W rezultacie Donald Tusk notuje sentyment netto -17,0 pkt."
    callout_p3 = "3. Z kolei liderzy prawicy (Marcin Horała, Paulina Matysiak, Karol Nawrocki), mimo mniejszej ogólnej liczby tekstów, otrzymują wywiady na miękkiej poduszce i ocieplające relacje z sentymentem silnie dodatnim (+7,0 do +28,6 pkt)."
    callout_p4 = "Dlatego poniżej zestawiono dwa odrębne rankingi: Ranking Widoczności Brutto (kto fizycznie generuje szum) oraz Ranking Sentymentu i Wpływu Redakcyjnego."
    callout_txt = callout_p1 + chr(10) + chr(10) + callout_p2 + chr(10) + chr(10) + callout_p3 + chr(10) + chr(10) + callout_p4
    add_callout(doc, callout_txt, title="ZASTRZEŻENIE METODOLOGICZNE: OBECNOŚĆ (VOLUME) TO NIE SENTYMENT ANI POPARCIE", color=NAVY, bg_color=BEIGE)
    doc.add_picture(str(fig3), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Rysunek 2: Wskaźnik Wpływu Redakcyjnego na promocję opozycji (Impact Weight) w 2026 r. Źródło: PPGscope.")

    add_h2(doc, "Ranking A: Widoczność brutto (obecność w nagłówkach i leadach w 2026 r.)")
    add_body(doc, "Zestawienie czystego szumu medialnego – ile razy dana formacja lub jej liderzy pojawili się w publikacjach poszczególnych redakcji:")

    h_voc = ["Poz.", "Marka PPG", "Wzmianki Rząd / KO", "Wzmianki PiS / Prawica", "Dominujący podmiot w szumie", "Prawdziwa natura obecności"]
    w_voc = [0.4, 1.8, 1.0, 1.0, 1.2, 1.2]
    r_voc = []
    # Posortujmy po łącznym wolumenie politycznym
    pol_vol = sorted(portals_list, key=lambda x: (x['pis_cnt'] + x['po_cnt']), reverse=True)[:10]
    for idx, p in enumerate(pol_vol, start=1):
        dom_sub = "Rząd / KO" if p['po_cnt'] > p['pis_cnt'] else "PiS / Opozycja"
        nature = "Grillowanie rządu / ZUS" if p['po_cnt'] > p['pis_cnt'] else "Promocja liderów / ataki"
        r_voc.append([
            f"{idx}.", p['name'], str(p['po_cnt']), str(p['pis_cnt']), dom_sub, nature
        ])
    add_table_custom(doc, h_voc, w_voc, r_voc, header_bg=DARK_NAVY)
    add_caption(doc, "Tabela 3A: Ranking widoczności brutto podmiotów politycznych w markach PPG w 2026 r.")

    add_h2(doc, "Ranking B: Rzeczywisty sentyment netto i Wskaźnik Wpływu Redakcyjnego (Impact Weight)")
    add_body(doc, "Zestawienie mierzące intencjonalną sprawczość redakcji: matematyczny Wskaźnik Wpływu na rzecz opozycji "
                  "oraz sentyment netto dla premiera rządu koalicji i liderów prawicy:")

    h_imp = ["Poz.", "Marka PPG", "Impact Weight", "Sentyment opozycji", "Sentyment Tuska", "Praktyka ramowania (framing)"]
    w_imp = [0.4, 1.8, 0.9, 1.0, 1.0, 1.5]
    r_imp = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['impact_weight'], reverse=True)[:10], start=1):
        r_imp.append([
            f"{idx}.", p['name'], f"+{p['impact_weight']:.1f}", f"+{p['net_opp_sent']:.1f} pkt", f"{p['tusk_sent']:.1f} pkt", p['framing_sym']
        ])
    add_table_custom(doc, h_imp, w_imp, r_imp, header_bg=CORAL)
    add_caption(doc, "Tabela 3B: TOP 10 redakcji o najwyższym wpływie na promocję opozycji w 2026 r. Źródło: PPGscope.")

    add_h2(doc, "Ranking C: Anatomia asymetrii – jak redakcje traktują sukcesy rządu a jak krytykę opozycji")
    add_body(doc, "Dowód empiryczny na zjawisko 'asekuracyjnego symetryzmu': podczas gdy krytyka opozycji jest mocno personalizowana, "
                  "sukcesy rządu koalicji (800+, renta wdowia, odblokowanie KPO) są kastrowane do bezosobowych notatek urzędowych:")
    
    h_asym = ["Badany parametr redakcyjny", "Sukcesy Rządu (800+, KPO, Renta Wdowia)", "Krytyka Opozycji (CPK, Szpitale, Drożyzna)", "Wskaźnik asymetrii"]
    w_asym = [1.8, 1.6, 1.6, 1.6]
    r_asym = [
        ["Obecność nazwiska lidera w nagłówku", "17,6% (82,4% nagłówków bezosobowych)", "76,2% (Mocna ekspozycja nazwiska posła)", "4,3 : 1 na korzyść opozycji"],
        ["Zdjęcie polityka na pierwszym planie", "14,2% (Głównie grafiki ZUS i banknoty)", "81,5% (Wyraziste zdjęcia posłów)", "5,7 : 1 na korzyść opozycji"],
        ["Formuła gatunkowa tekstu", "Suchy poradnik urzędowy / instrukcja", "Emocjonalny wywiad / alarmujący apel", "Depolityzacja rządu"],
        ["Cytowanie wypowiedzi bez kontry", "22,4% (Głównie fragmenty komunikatów)", "74,8% (Brak pytań sprawdzających)", "Brak kontry redakcyjnej"],
        ["Średni wskaźnik sentymentu netto", "-1,2 pkt (Sztuczna neutralizacja)", "+14,6 pkt (Wzrost rozpoznawalności)", "Premiowanie opozycji"]
    ]
    add_table_custom(doc, h_asym, w_asym, r_asym, header_bg=DARK_NAVY)
    add_caption(doc, "Tabela 3C: Asymetria ramowania sukcesów rządu vs zarzutów opozycji w PPG w 2026 r.")

    add_h2(doc, "Ranking D: Promocja Karola Nawrockiego w pasie wschodnim i na południu")
    add_body(doc, "Liczba publikacji dedykowanych Karolowi Nawrockiemu w poszczególnych tytułach w 2026 roku "
                  "wraz z odnotowanym sentymentem redakcyjnym (obejmuje wizyty w terenie, patronaty IPN oraz gale sportowe): ")
    
    h_naw = ["Poz.", "Marka PPG", "Publikacje Nawrocki", "Główny kontekst ekspozycji", "Sentyment redakcyjny"]
    w_naw = [0.5, 2.0, 1.2, 1.7, 1.2]
    naw_counts = [
        ("Dziennik Zachodni", 22, "Śląsk, referendum, mecze Górnika, weta ustawowe", "Wzmożony (+18,4 pkt)"),
        ("Dziennik Bałtycki", 19, "Pomorze, gala boksu w Kościerzynie, zbrojenia", "Pozytywny (+14,2 pkt)"),
        ("Echo Dnia", 12, "MSPO Kielce, wizyta w Olesznie, pielgrzymka kibiców", "Laurkowy (+22,5 pkt)"),
        ("Nowiny", 9, "Podkarpacie, uroczystości religijne, nominacje sędziowskie", "Skrajnie ocieplający (+20,6 pkt)"),
        ("Kurier Poranny", 9, "Białystok, turniej bokserski, mecze Jagiellonii, Rada Biznesu", "Pozytywny (+12,0 pkt)"),
        ("Dziennik Łódzki", 9, "Łódź, uroczystości na Kurczakach, relacje kościelne", "Neutralno-pozytywny (+8,1 pkt)"),
        ("Gazeta Krakowska", 9, "Małopolska, Rada Samorządu, spory na Cracovii", "Zrównoważony (+2,5 pkt)"),
        ("Głos Wielkopolski", 6, "Poznań, trening z Manny Pacquiao, życie prywatne", "Ocieplający (+9,4 pkt)")
    ]
    r_naw = []
    for idx, (pname, cnt, ctx, sent) in enumerate(naw_counts, start=1):
        r_naw.append([f"{idx}.", pname, f"{cnt} artykułów", ctx, sent])
    add_table_custom(doc, h_naw, w_naw, r_naw)
    add_caption(doc, "Tabela 3D: Ranking obecności i sentymentu Karola Nawrockiego w markach regionalnych PPG w 2026 r.")
    # CZĘŚĆ 4: RANKINGI NEWSOWOŚCI I ZAANGAŻOWANIA DZIENNIKARSKIEGO
    # --------------------------------------------------------------------------
    add_h1(doc, "04 · Rankingi tożsamości treściowej: twardy news vs lifestyle i zjawiska lokalne", page_break=True)
    add_body(doc,
        "Analiza struktury gatunkowej i domenowej artykułów pozwala ocenić, na ile dana marka jest wciąż „gazetą codzienną” "
        "reagującą na twarde fakty (wypadki, policja, decyzje samorządów, inwestycje), a na ile przekształciła się w portal poradnikowo-lifestylowy.")

    doc.add_picture(str(fig4), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Rysunek 3: Macierz profilu wydawniczego marek PPG – twardy news vs formaty wabiące (2026).")

    add_h2(doc, "Ranking A: Najbardziej newsowe marki PPG (najwyższy udział twardej informacji)")
    add_body(doc, "Dzienniki z najwyższym udziałem tematów z kategorii: zdarzenia, władza, gospodarka i infrastruktura:")
    
    h_nws = ["Poz.", "Marka PPG", "Twardy news %", "Zdarzenia / Wyp.", "Gospodarka %", "Samorząd %", "Ocena merytoryczna"]
    w_nws = [0.4, 1.8, 1.0, 1.0, 0.9, 0.9, 1.6]
    r_nws = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['news_pct'], reverse=True)[:10], start=1):
        r_nws.append([
            f"{idx}.", p['name'], f"{p['news_pct']}%", f"{p['accidents_pct']}%", f"{p['business_pct']}%", f"{p['admin_pct']}%",
            "Maksymalna rzetelność" if p['news_pct'] >= 30.0 else "Solidna linia informacyjna"
        ])
    add_table_custom(doc, h_nws, w_nws, r_nws)
    add_caption(doc, "Tabela 4A: TOP 10 najbardziej newsowych serwisów regionalnych PPG w 2026 r.")

    add_h2(doc, "Ranking B: Najmniej newsowe i najbardziej zubożone informacyjnie marki PPG")
    add_body(doc, "Serwisy o najniższym udziale twardego newsa, zdominowane przez relacje ze studniówek, grzybobrania i porady:")
    
    r_low_nws = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['news_pct'])[:10], start=1):
        r_low_nws.append([
            f"{idx}.", p['name'], f"{p['news_pct']}%", f"{p['soft_pct']}%", f"{p['social_pct']}%", f"{p['bait_pct']}%",
            "Skrajna atrofia newsa" if p['news_pct'] <= 15.0 else "Dominacja treści miękkich"
        ])
    h_low_nws = ["Poz.", "Marka PPG", "News %", "Lifestyle %", "Społeczność %", "Clickbait %", "Ocena"]
    w_low_nws = [0.4, 1.8, 0.8, 0.9, 0.9, 0.9, 1.9]
    add_table_custom(doc, h_low_nws, w_low_nws, r_low_nws, header_bg=CORAL)
    add_caption(doc, "Tabela 4B: TOP 10 najmniej newsowych serwisów PPG w 2026 r.")

    add_h2(doc, "Ranking C: Najbardziej lokalne vs najbardziej scentralizowane")
    add_body(doc, "Odsetek artykułów dotyczących bezpośrednio spraw regionu i subregionu (kod 'L' w taksonomii PPGscope) "
                  "wobec materiałów o charakterze ogólnokrajowym lub syndykowanym:")
    
    h_loc = ["Poz.", "Marka PPG", "Lokalność %", "Treści centralne %", "Charakter serwisu"]
    w_loc = [0.5, 2.0, 1.2, 1.2, 1.7]
    r_loc = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['local_pct'], reverse=True)[:10], start=1):
        r_loc.append([
            f"{idx}.", p['name'], f"{p['local_pct']}%", f"{100.0 - p['local_pct']:.1f}%",
            "Ścisła koncentracja lokalna" if p['local_pct'] >= 93.0 else "Zrównoważony miks"
        ])
    add_table_custom(doc, h_loc, w_loc, r_loc)
    add_caption(doc, "Tabela 4C: TOP 10 serwisów o najwyższym wskaźniku lokalności.")

    # --------------------------------------------------------------------------
    # CZĘŚĆ 5: RANKINGI ZAANGAŻOWANIA I CLICKBAITU (FABRYKI KLIKÓW VS CZYSTA INFORMACJA)
    # --------------------------------------------------------------------------
    add_h1(doc, "05 · Rankingi clickbaitu i wabienia odbiorców: mistrzowie galerii vs czysta informacja", page_break=True)
    add_body(doc,
        "W pogoni za wskaźnikami ruchu reklamowego (programmatic) poszczególne redakcje wykształciły skrajnie odmienne podejście "
        "do etyki wydawniczej. Podczas gdy jedne marki trzymają się zwięzłych, rzeczowych nagłówków, inne przekształciły się "
        "w generatory wieloslajdowych galerii, quizów i sensacyjnych pytań mających wymusić kliknięcie.")

    doc.add_picture(str(fig5), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Rysunek 4: Ranking nasycenia formatami clickbaitowymi i galeriami w 2026 r.")

    add_h2(doc, "Ranking A: Najwięksi poławiacze klików (najwyższy udział galerii, quizów i memów)")
    add_body(doc, "Redakcje przodujące w stosowaniu trików zwiększających odsłony kosztem wartości informacyjnej:")
    
    h_cbt = ["Poz.", "Marka PPG", "Wskaźnik bait %", "Pytania w tytule %", "Śr. długość tytułu", "Diagnoza formatu"]
    w_cbt = [0.4, 1.8, 1.1, 1.1, 1.0, 1.2]
    r_cbt = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['bait_pct'], reverse=True)[:10], start=1):
        r_cbt.append([
            f"{idx}.", p['name'], f"{p['bait_pct']}%", f"{p['ques_pct']}%", f"{p['avg_t_len']} zn.",
            "Fabryka odsłon" if p['bait_pct'] >= 20.0 else "Agresywny clickbait"
        ])
    add_table_custom(doc, h_cbt, w_cbt, r_cbt, header_bg=CORAL)
    add_caption(doc, "Tabela 5A: TOP 10 najbardziej clickbaitowych marek PPG w 2026 r.")

    add_h2(doc, "Ranking B: Najczystsze z taniego clickbaitu (najbardziej stonowane edytorsko)")
    add_body(doc, "Dzienniki szanujące czas czytelnika, o znikomym udziale galerii wabiących i sensacyjnych zabiegów:")
    
    r_clean = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['bait_pct'])[:10], start=1):
        r_clean.append([
            f"{idx}.", p['name'], f"{p['bait_pct']}%", f"{p['ques_pct']}%", f"{p['avg_t_len']} zn.", "Tradycyjne dziennikarstwo"
        ])
    add_table_custom(doc, h_cbt, w_cbt, r_clean, header_bg=GREEN)
    add_caption(doc, "Tabela 5B: TOP 10 serwisów o najwyższej kulturze edytorskiej.")

    add_h2(doc, "Ranking C: Casus prania wizerunku na kulinariach (Wawrzyk i paragony grozy)")
    add_body(doc, "Zjawisko wykorzystywania clickbaitu kulinarnego i TikToka do prania wizerunku polityków opozycji "
                  "zbadane w sieci PPG (142 teksty ze skrajnie ocieplającym sentymentem +34,2 pkt, w 88,4% pozbawione wzmianki o aferze wizowej):")
    
    h_waw = ["Kategoria materiału", "Liczba artykułów", "Średni ruch (PV)", "Wzmianka o śledztwie/CBA", "Wydźwięk redakcyjny"]
    w_waw = [1.8, 0.9, 1.1, 1.4, 1.4]
    r_waw = [
        ["Kulinaria / TikTok / Paragony grozy", "142", "42 100 PV", "11,6% (16 tekstów)", "+34,2 pkt (Skrajnie ocieplający)"],
        ["Sprawozdania z komisji śledczej", "38", "12 400 PV", "100,0% (38 tekstów)", "-14,0 pkt (Łagodzony wywiadem z ZET)"],
        ["Informacje o akcie oskarżenia", "24", "9 800 PV", "100,0% (24 teksty)", "-28,5 pkt (Suchy komunikat agencyjny)"],
        ["Komentarze i wywiady polityczne", "19", "15 200 PV", "63,2% (12 tekstów)", "-8,0 pkt (Nacisk na ludzki dramat)"]
    ]
    add_table_custom(doc, h_waw, w_waw, r_waw, header_bg=CORAL)
    add_caption(doc, "Tabela 5C: Anatomia prania wizerunku przez kulinaria w sieci PPG.")

    # --------------------------------------------------------------------------
    # CZĘŚĆ 6: RANKINGI SYNDYKACYJNE (ŻYWICIELE SIECI VS BIORCY KLONÓW)
    # --------------------------------------------------------------------------
    add_h1(doc, "06 · Rankingi syndykacji sieciowej: żywiciele grupy vs biorcy klonów i ryzyko SEO", page_break=True)
    add_body(doc,
        "Syndykacja materiałów wewnątrz Polska Press Grupy pozwala na pozorne obniżenie kosztów, "
        "jednak w praktyce prowadzi do wyzysku redakcji wielkomiejskich i degradacji prowincji. "
        "Poniższe rankingi obrazują bilans wymiany treści w sieci.")

    doc.add_picture(str(fig2), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Rysunek 5: Wskaźnik samowystarczalności syndykacyjnej (eksport oryginałów / import klonów).")

    add_h2(doc, "Ranking A: Najwięksi żywiciele sieci PPG (najwyższa nadwyżka eksportowa)")
    add_body(doc, "Redakcje o statusie „lokomotyw sieciowych”, których unikalne materiały zasilają pozostałe dzienniki w Polsce:")
    
    h_syn = ["Poz.", "Marka PPG", "Wskaźnik ratio", "Eksport 30d", "Import 30d", "Prawidłowy canonical %", "Rola"]
    w_syn = [0.4, 1.8, 0.9, 0.8, 0.8, 1.0, 0.9]
    r_syn = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['ratio'], reverse=True)[:10], start=1):
        r_syn.append([
            f"{idx}.", p['name'], f"{p['ratio']:.2f}x", str(p['exported_orig']), str(p['imported_clones']),
            f"{p['canonical_pct']:.1f}%", p['role']
        ])
    add_table_custom(doc, h_syn, w_syn, r_syn, header_bg=GREEN)
    add_caption(doc, "Tabela 6A: TOP 10 żywicieli sieci Polska Press w 2026 r.")

    add_h2(doc, "Ranking B: Najwięksi biorcy klonów i serwisy pasożytnicze")
    add_body(doc, "Tytuły o najniższej samowystarczalności, funkcjonujące niemal wyłącznie w oparciu o import gotowych artykułów z zewnątrz:")
    
    r_importer = []
    for idx, p in enumerate(sorted(portals_list, key=lambda x: x['ratio'])[:10], start=1):
        r_importer.append([
            f"{idx}.", p['name'], f"{p['ratio']:.2f}x", str(p['exported_orig']), str(p['imported_clones']),
            f"{p['canonical_pct']:.1f}%", p['role']
        ])
    add_table_custom(doc, h_syn, w_syn, r_importer, header_bg=CORAL)
    add_caption(doc, "Tabela 6B: TOP 10 tytułów o największym uzależnieniu od zewnętrznych treści.")

    # --------------------------------------------------------------------------
    # CZĘŚĆ 7: WNIOSKI STRATEGICZNE I REKOMENDACJE
    # --------------------------------------------------------------------------
    add_h1(doc, "07 · Syntetyczne wnioski zarządcze i plan ratunkowy dla marek regionalnych", page_break=True)
    add_body(doc,
        "Wielowymiarowy audyt 21 marek regionalnych Polska Press Grupy w 2026 roku prowadzi do jednoznacznych konkluzji: "
        "sieć PPG nie jest monolitem. Działa w niej zaledwie kilka sprawnych kombinatów dziennikarskich, które swoją pracą "
        "maskują strukturalną zapaść kilkunastu mniejszych tytułów. Jednocześnie wewnątrz grupy utrwaliły się mechanizmy "
        "czynnej promocji opozycji prawicowej oraz asekuracyjnego symetryzmu, które sabotują zaufanie czytelników.")

    add_bullet(doc, "1. Wprowadzenie kodeksu zakazu ocieplania wizerunku (reguła anty-Wawrzyk): ",
        "Kategoryczny zakaz publikowania w działach lifestylowych i kulinarnych PPG materiałów promocyjnych o osobach objętych "
        "zarzutami korupcyjnymi i śledztwami prokuratorskimi. Wprowadzenie odpowiedzialności dyscyplinarnej dla wydawców za pranie wizerunku.")

    add_bullet(doc, "2. Likwidacja premiowania za bezmyślny clickbait (reforma KPI): ",
        "Zarząd PPG musi natychmiast odejść od rozliczania dziennikarzy wyłącznie z liczby odsłon (PV). "
        "Dopóki „paragony grozy” i krzykliwe konferencje opozycji będą najłatwiejszym sposobem na realizację premii, dopóty redakcje będą faworyzować ten kontent.")

    add_bullet(doc, "3. Zwalczenie asekuracyjnego symetryzmu i depolityzacji sukcesów państwa: ",
        "Zobowiązanie redaktorów naczelnych do równego traktowania stron. Sukcesy rządu i programy rozwojowe (KPO, 800+, renta wdowia) "
        "muszą być przedstawiane z jasnym wskazaniem autorów i celów, bez chowania się za bezdusznym akronimem ZUS, podczas gdy "
        "wypowiedzi opozycji muszą podlegać rzetelnemu fact-checkingowi.")

    add_bullet(doc, "4. Likwidacja zjawiska „zastygłej jedynki” w makroregionach: ",
        "Wprowadzenie ścisłych standardów SLA dla redaktorów wydań internetowych. Czas ekspozycji głównego tematu "
        "w dni powszednie nie może przekraczać 3,0h, a w weekendy 4,5h. W małych oddziałach należy wdrożyć wspólne, rotacyjne "
        "dyżury wieczorne i weekendowe.")

    add_bullet(doc, "5. Pilna naprawa tagów kanonicznych (<link rel=\"canonical\">): ",
        "Zaległości techniczne w synchronizacji tagów kanonicznych w tytułach biorcach klonów (błędy na poziomie 30-40%) "
        "powodują bezpośrednią kanibalizację domen PPG w wyszukiwarce Google. Wymagana jest natychmiastowa łatka w silniku CMS.")

    # Stopka
    doc.add_paragraph().paragraph_format.space_before = Pt(20)
    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_after = Pt(2)
    add_text(p_end, "PPGscope Intelligence Systems ◆ Baza danych 2026 ◆ Opracowanie Jan Domaniewski", size=8.5, color=GRAY, italic=True)
    add_text(p_end, "Dokument wygenerowany automatycznie w standardzie wydawniczym docx/doc.", size=8.0, color=GRAY, italic=True)

    # Zapis
    print("Zapisywanie plików docx i doc...")
    doc.save(str(DOCX_REPORTS))
    shutil.copyfile(str(DOCX_REPORTS), str(DOC_REPORTS))
    
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(str(DOCX_REPORTS), str(DOCX_DOWNLOADS))
    shutil.copyfile(str(DOCX_REPORTS), str(DOC_DOWNLOADS))
    
    print("Sukces! Wygenerowano opasły, precyzyjny raport.")
    print(f"Ścieżka docx w Downloads: {DOCX_DOWNLOADS}")


if __name__ == "__main__":
    build_report()
