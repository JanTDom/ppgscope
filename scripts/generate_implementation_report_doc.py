#!/usr/bin/env python3
"""
Skrypt generujący raport wdrożeniowy PPGscope w najwyższej jakości wydawniczej:
Tytuł: „Nowa architektura mediów regionalnych: jak połączyć siłę newsów z Warszawy z siecią 500 portali lokalnych. Raport wdrożeniowy dla Polska Press Grupy”.
Autor: Jan Domaniewski

Wersja zaktualizowana:
- Horyzont wdrożenia: ekspresowe 60 dni (2 miesiące, 8 tygodni).
- Strategia neutralizacji prezesów makroregionów i wyjęcie kadr redakcyjnych spod ich władzy.
- Wykres Gantta na 60 dni i zaktualizowana matryca ryzyk (bunt prezesów makroregionów).
- Naturalny język doświadczonego dziennikarza i organizatora mediów.
- Sentence case w nagłówkach i tabelach, wyłącznie polskie cudzysłowy „ oraz ”.
"""

import os
import re
import shutil
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
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

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_Wdrozeniowy_PPG_Centralnosc_i_Lokalnosc.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_Wdrozeniowy_PPG_Centralnosc_i_Lokalnosc.doc"
DOCX_REPORTS = OUT_DIR / "Raport_Wdrozeniowy_PPG_Centralnosc_i_Lokalnosc.docx"
DOC_REPORTS = OUT_DIR / "Raport_Wdrozeniowy_PPG_Centralnosc_i_Lokalnosc.doc"

CONTENT_WIDTH = 6.6
FIGURE_WIDTH = 6.3

NAVY = "0F2747"
BLUE = "205493"
TEAL = "1B7A82"
TINT_TEAL = "EBF5F6"
TINT_NAVY = "EDF2F8"
CORAL = "C84B31"
TINT_CORAL = "FDF2E9"
GRAY = "555555"
LIGHT = "F8F9FA"
MID = "D0D7DE"
BLACK = "1A1A1A"
WHITE = "FFFFFF"

NUMERIC_CELL = re.compile(r"^\s*[-+]?[0-9\s,.]+%?\s*$")


def set_cell_margins(cell, top=100, bottom=100, left=130, right=130):
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


def add_bullet(doc, bold_prefix, text, *, after=3):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        add_text(p, bold_prefix, size=10.0, color=NAVY, bold=True)
    add_text(p, text, size=10.0, color=BLACK)
    return p


def add_h1(doc, title, *, before=16, after=5, page_break=False):
    if page_break:
        doc.add_page_break()
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.keep_with_next = True
    add_text(p, title, size=13.0, color=NAVY, bold=True)
    add_bottom_border(p, color=BLUE, size="8")
    return p


def add_h2(doc, title, *, before=11, after=3):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.keep_with_next = True
    add_text(p, title, size=11.0, color=BLUE, bold=True)
    return p


def add_caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(6)
    add_text(p, text, size=8.5, color=GRAY, italic=True)
    return p


def add_callout(doc, text, title=None, color=BLUE, bg_color=TINT_NAVY):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    set_col_widths(tbl, [CONTENT_WIDTH])
    cell = tbl.cell(0, 0)
    set_cell_margins(cell, top=90, bottom=90, left=140, right=140)
    set_cell_shading(cell, bg_color)
    
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = OxmlElement("w:tcBorders")
    
    left_b = OxmlElement("w:left")
    left_b.set(qn("w:val"), "single")
    left_b.set(qn("w:sz"), "24")
    left_b.set(qn("w:space"), "0")
    left_b.set(qn("w:color"), color)
    tc_borders.append(left_b)
    
    for side in ["top", "bottom", "right"]:
        b = OxmlElement(f"w:{side}")
        b.set(qn("w:val"), "none")
        tc_borders.append(b)
    tc_pr.append(tc_borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    if title:
        add_text(p, title + "\n", size=10.0, color=color, bold=True)
    add_text(p, text, size=9.5, color=BLACK)


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
        set_cell_margins(c, top=80, bottom=80, left=90, right=90)
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
            set_cell_margins(c, top=65, bottom=65, left=80, right=80)
            set_cell_shading(c, bg)
            set_cell_border(c, color=MID, size="4")
            p = c.paragraphs[0]
            val_str = str(val).strip()
            is_num = bool(NUMERIC_CELL.match(val_str))
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if is_num else WD_ALIGN_PARAGRAPH.LEFT
            is_bold = (c_idx == 0)
            c_color = NAVY if is_bold else BLACK
            add_text(p, val_str, size=8.0, color=c_color, bold=is_bold)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)


# =============================================================================
# GENERATOR SCHEMATÓW I WYKRESÓW
# =============================================================================
def generate_clean_diagrams():
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    paths = {}

    plt.rcParams["font.sans-serif"] = "DejaVu Sans"
    plt.rcParams["axes.edgecolor"] = "#D0D7DE"
    plt.rcParams["axes.linewidth"] = 0.8

    # -------------------------------------------------------------------------
    # SCHEMAT 1: Nowa organizacja pracy w redakcji
    # -------------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(9.2, 5.2), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6.2)
    ax.axis("off")

    # Warszawa (góra po lewej)
    box_w = FancyBboxPatch((0.5, 4.3), 3.4, 1.6, boxstyle="round,pad=0.15", facecolor="#0F2747", edgecolor="#205493", lw=1.5)
    ax.add_patch(box_w)
    ax.text(2.2, 5.45, "Centralny newsroom w Warszawie", ha="center", va="center", color="white", fontsize=8.5, fontweight="bold")
    ax.text(2.2, 4.85, "• Koordynacja głównych tematów dnia\n• Relacje z rządem, Sejmem i ministerstwami\n• Zespół analizy danych i rejestrów państwa", ha="center", va="center", color="#EAF0F7", fontsize=7.2)

    # 16 Oddziałów regionalnych (góra po prawej)
    box_reg = FancyBboxPatch((6.1, 4.3), 3.4, 1.6, boxstyle="round,pad=0.15", facecolor="#EDF2F8", edgecolor="#1B7A82", lw=1.5)
    ax.add_patch(box_reg)
    ax.text(7.8, 5.45, "Dziennikarze wyjęci spod prezesów", ha="center", va="center", color="#0F2747", fontsize=8.5, fontweight="bold")
    ax.text(7.8, 4.85, "• Bezpośrednia podległość merytoryczna do Warszawy\n• Premie i budżet zadaniowy płacone z centrali\n• Prezesi makroregionów bez wglądu i weta", ha="center", va="center", color="#222222", fontsize=7.2)

    # Poziom środkowy: 5 zespołów tematycznych
    box_z = FancyBboxPatch((0.5, 1.9), 9.0, 1.8, boxstyle="round,pad=0.15", facecolor="#F8F9FA", edgecolor="#0F2747", lw=1.2)
    ax.add_patch(box_z)
    ax.text(5.0, 3.4, "5 ponadregionalnych zespołów tematycznych (dziennikarze ze stolicy i regionów pracują razem)", ha="center", va="center", color="#0F2747", fontsize=8.5, fontweight="bold")

    teams = [
        ("Inwestycje i KPO\n(drogi, kolej, szpitale)", "#205493"),
        ("Bezpieczeństwo\n(Tarcza Wschód, armia)", "#1B7A82"),
        ("Prawo i rozliczenia\n(sądy, walka z korupcją)", "#C84B31"),
        ("Zdrowie i edukacja\n(szkoły, wsparcie rodzin)", "#205493"),
        ("Gospodarka i praca\n(podatki, transformacja)", "#1B7A82")
    ]

    for idx, (t_name, col) in enumerate(teams):
        bx = 0.7 + idx * 1.76
        b_team = FancyBboxPatch((bx, 2.1), 1.66, 1.05, boxstyle="round,pad=0.08", facecolor="white", edgecolor=col, lw=1.2)
        ax.add_patch(b_team)
        ax.text(bx + 0.83, 2.62, t_name, ha="center", va="center", color="#1A1A1A", fontsize=6.8, fontweight="bold")

    # Strzałki z góry do zespołów środkowych
    ax.annotate("", xy=(2.2, 3.8), xytext=(2.2, 4.3), arrowprops=dict(arrowstyle="->", color="#0F2747", lw=1.5))
    ax.annotate("", xy=(7.8, 3.8), xytext=(7.8, 4.3), arrowprops=dict(arrowstyle="->", color="#1B7A82", lw=1.5))

    # Poziom dolny: 500 portali
    box_p = FancyBboxPatch((0.5, 0.3), 9.0, 1.1, boxstyle="round,pad=0.15", facecolor="#0F2747", edgecolor="#0F2747", lw=1.0)
    ax.add_patch(box_p)
    ax.text(5.0, 1.0, "500 portali lokalnych i miejskich (Gazeta Wrocławska, Dziennik Bałtycki, Nasze Miasto)", ha="center", va="center", color="white", fontsize=8.5, fontweight="bold")
    ax.text(5.0, 0.6, "Wspólny artykuł na czołówce + automatyczny blok danych dla konkretnego miasta i powiatu", ha="center", va="center", color="#EAF0F7", fontsize=7.2)

    # Strzałka ze środka na dół
    ax.annotate("", xy=(5.0, 1.45), xytext=(5.0, 1.9), arrowprops=dict(arrowstyle="->", color="#0F2747", lw=2.0))

    plt.tight_layout()
    p1 = FIG_DIR / "ultra_fig1_org_mesh.png"
    plt.savefig(p1, bbox_inches="tight")
    plt.close()
    paths["fig1"] = p1

    # -------------------------------------------------------------------------
    # SCHEMAT 2: Makieta artykułu łączonego
    # -------------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8.2, 5.0), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7.2)
    ax.axis("off")

    frame = FancyBboxPatch((0.5, 0.4), 9.0, 6.4, boxstyle="round,pad=0.15", facecolor="#FFFFFF", edgecolor="#0F2747", lw=1.5)
    ax.add_patch(frame)
    ax.text(5.0, 6.45, "Układ artykułu łączonego w portalu regionalnym (np. Gazeta Wrocławska)", ha="center", va="center", color="#0F2747", fontsize=8.5, fontweight="bold")

    w1 = FancyBboxPatch((0.8, 4.3), 8.4, 1.8, boxstyle="round,pad=0.1", facecolor="#EDF2F8", edgecolor="#205493", lw=1.2)
    ax.add_patch(w1)
    ax.text(1.1, 5.75, "1. Główny news z Warszawy (55% artykułu) – przygotowany przez centralę", ha="left", va="center", color="#205493", fontsize=8.0, fontweight="bold")
    ax.text(1.1, 5.3, "Tytuł: „Rząd odblokowuje 10 mld zł na szpitale. Koniec wielomiesięcznych kolejek do specjalistów”", ha="left", va="center", color="#0F2747", fontsize=7.5, fontweight="bold")
    ax.text(1.1, 4.75, "• Dynamiczna relacja z posiedzenia rządu, ostre starcie w Sejmie, dlaczego te pieniądze były blokowane.\n• Gorący polityczny temat czytany z emocjami w całej Polsce, budujący pozycję rządu jako sprawnego gospodarza.", ha="left", va="center", color="#222222", fontsize=7.0)

    w2 = FancyBboxPatch((0.8, 2.2), 8.4, 1.8, boxstyle="round,pad=0.1", facecolor="#EBF5F6", edgecolor="#1B7A82", lw=1.4)
    ax.add_patch(w2)
    ax.text(1.1, 3.65, "2. Lokalny blok danych (30% artykułu) – wstawiany automatycznie przez system CMS", ha="left", va="center", color="#1B7A82", fontsize=8.0, fontweight="bold")
    ax.text(1.1, 3.2, "Co to oznacza dla Twojego regionu: Dolny Śląsk otrzymuje 820 mln zł", ha="left", va="center", color="#0F2747", fontsize=7.5, fontweight="bold")
    ax.text(1.1, 2.65, "• Szpitale objęte wsparciem: Wrocław (onkologia), Legnica (oddział ratunkowy), Wałbrzych (kardiologia).\n• Terminy: pierwsze przetargi ruszają w marcu, sprzęt trafi na oddziały do końca roku.\n• Czytelnik od razu widzi konkretne korzyści dla swojej rodziny bez czytania nudnych komunikatów urzędowych.", ha="left", va="center", color="#222222", fontsize=7.0)

    w3 = FancyBboxPatch((0.8, 0.7), 8.4, 1.3, boxstyle="round,pad=0.1", facecolor="#FDF2E9", edgecolor="#C84B31", lw=1.2)
    ax.add_patch(w3)
    ax.text(1.1, 1.65, "3. Głos z Twojego regionu (15% artykułu) – zebrany przez dziennikarza w terenie", ha="left", va="center", color="#C84B31", fontsize=8.0, fontweight="bold")
    ax.text(1.1, 1.15, "Komentarz dyrektora szpitala we Wrocławiu: „Czekaliśmy na te środki od lat. To oznacza skrócenie czasu oczekiwania\nna zabiegi onkologiczne w naszym województwie o połowę. Dla setek pacjentów to kwestia życia i zdrowia”.", ha="left", va="center", color="#222222", fontsize=7.0)

    plt.tight_layout()
    p2 = FIG_DIR / "ultra_fig2_article_layers.png"
    plt.savefig(p2, bbox_inches="tight")
    plt.close()
    paths["fig2"] = p2

    # -------------------------------------------------------------------------
    # SCHEMAT 3: Plan dnia w redakcji
    # -------------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(9.2, 3.4), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 4.0)
    ax.axis("off")

    steps = [
        ("08:30\nKolegium", "Wybór głównego tematu\nz planu rządu i Sejmu", "#205493"),
        ("10:00\nZbieranie danych", "Warszawa pobiera liczby,\nregion szuka przykładów", "#1B7A82"),
        ("11:30\nPublikacja", "Jeden mocny artykuł\nna 500 portalach w kraju", "#C84B31"),
        ("15:00\nRozliczenia", "Jak głosowali posłowie\nz danego okręgu", "#205493"),
        ("21:00\nPodsumowanie", "Wideo podsumowujące dzień\ni wydania papierowe", "#0F2747")
    ]

    for idx, (top_txt, btm_txt, col) in enumerate(steps):
        bx = 0.4 + idx * 1.92
        b_top = FancyBboxPatch((bx, 2.1), 1.65, 1.4, boxstyle="round,pad=0.1", facecolor=col, edgecolor="none")
        ax.add_patch(b_top)
        ax.text(bx + 0.82, 2.8, top_txt, ha="center", va="center", color="white", fontsize=8.0, fontweight="bold")
        
        b_btm = FancyBboxPatch((bx, 0.4), 1.65, 1.4, boxstyle="round,pad=0.08", facecolor="#F8F9FA", edgecolor="#D0D7DE", lw=1.0)
        ax.add_patch(b_btm)
        ax.text(bx + 0.82, 1.1, btm_txt, ha="center", va="center", color="#222222", fontsize=6.8)

        ax.annotate("", xy=(bx + 0.82, 1.8), xytext=(bx + 0.82, 2.1), arrowprops=dict(arrowstyle="->", color=col, lw=1.2))

        if idx < len(steps) - 1:
            ax.annotate("", xy=(bx + 1.88, 2.8), xytext=(bx + 1.68, 2.8), arrowprops=dict(arrowstyle="->", color="#0F2747", lw=1.5))

    plt.tight_layout()
    p3 = FIG_DIR / "ultra_fig3_sop_timeline.png"
    plt.savefig(p3, bbox_inches="tight")
    plt.close()
    paths["fig3"] = p3

    # -------------------------------------------------------------------------
    # SCHEMAT 4: Cztery regiony Polski
    # -------------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8.8, 4.4), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5.0)
    ax.axis("off")

    cards = [
        (0.5, 2.6, 4.3, 2.1, "Polska wschodnia i południowa\n(Rzeszów, Lublin, Kielce, Białystok)", 
         "• Co interesuje ludzi: Bezpieczeństwo granic, wojsko, schrony.\n• Jak mówimy o działaniach rządu: Tarcza Wschód, rozbudowa\n  baz, zamówienia dla fabryk broni (Stalowa Wola, Radom).\n• Klucz do czytelnika: Poczucie, że państwo realnie ich chroni.", "#1B7A82", "#EBF5F6"),
        
        (5.2, 2.6, 4.3, 2.1, "Polska zachodnia i północna\n(Wrocław, Poznań, Gdańsk, Szczecin)", 
         "• Co interesuje ludzi: Gospodarka, nowe technologie, Europa.\n• Jak mówimy o działaniach rządu: Pieniądze z KPO, farmy\n  wiatrowe na Bałtyku, nowoczesne pociągi, ułatwienia dla firm.\n• Klucz do czytelnika: Rozwój, nowoczesność i koniec zastoju.", "#205493", "#EDF2F8"),

        (0.5, 0.3, 4.3, 2.1, "Śląsk i Zagłębie\n(Katowice, Częstochowa, Rybnik)", 
         "• Co interesuje ludzi: Miejsca pracy, przemysł, godność.\n• Jak mówimy o działaniach rządu: Bezpieczna transformacja\n  energetyczna, nowe fabryki, osłony dla pracowników.\n• Klucz do czytelnika: Szacunek dla etosu pracy i przyszłość dzieci.", "#0F2747", "#F8F9FA"),

        (5.2, 0.3, 4.3, 2.1, "Polska centralna i mniejsze miasta\n(Łódź, Płock, Włocławek, Radom)", 
         "• Co interesuje ludzi: Portfele rodzin, szkoły, służba zdrowia.\n• Jak mówimy o działaniach rządu: Bon energetyczny, renta\n  wdowia, wsparcie dla rodziców, rozliczenie dawnych nadużyć.\n• Klucz do czytelnika: Elementarna sprawiedliwość i równy start.", "#C84B31", "#FDF2E9")
    ]

    for x, y, w, h, title, body, border_c, bg_c in cards:
        b = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.12", facecolor=bg_c, edgecolor=border_c, lw=1.4)
        ax.add_patch(b)
        ax.text(x + w/2, y + h - 0.38, title, ha="center", va="center", color=border_c, fontweight="bold", fontsize=7.5)
        ax.text(x + 0.25, y + h/2 - 0.2, body, ha="left", va="center", color="#222222", fontsize=6.8)

    plt.tight_layout()
    p4 = FIG_DIR / "ultra_fig4_cultural_codes.png"
    plt.savefig(p4, bbox_inches="tight")
    plt.close()
    paths["fig4"] = p4

    # -------------------------------------------------------------------------
    # SCHEMAT 5: Porównanie wyników
    # -------------------------------------------------------------------------
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8.2, 3.2), dpi=300)
    
    metrics = ["Czas czytania\ntekstu (sekundy)", "Głębokość\nprzewijania (%)"]
    m_przed = [35, 25]
    m_po = [185, 68]
    
    x = np.arange(len(metrics))
    w = 0.32

    ax1.bar(x - w/2, m_przed, w, label="Stary model (sama lokalność)", color="#888888")
    ax1.bar(x + w/2, m_po, w, label="Nowy model (artykuł łączony)", color="#1B7A82")
    ax1.set_title("Zaangażowanie czytelnika", fontsize=8.5, fontweight="bold", color="#0F2747")
    ax1.set_xticks(x)
    ax1.set_xticklabels(metrics, fontsize=7.5)
    ax1.legend(fontsize=7.0)
    ax1.grid(axis="y", linestyle="--", alpha=0.5)
    ax1.spines["top"].set_visible(False)
    ax1.spines["right"].set_visible(False)

    bounce_labels = ["Ucieczki ze strony\n(odrzucenia %)", "Czytelnicy w wieku\n18–34 lata (%)"]
    b_przed = [82, 14]
    b_po = [38, 44]
    ax2.bar(x - w/2, b_przed, w, label="Stary model", color="#C84B31")
    ax2.bar(x + w/2, b_po, w, label="Nowy model", color="#0F2747")
    ax2.set_title("Odmłodzenie i utrzymanie czytelnika", fontsize=8.5, fontweight="bold", color="#0F2747")
    ax2.set_xticks(x)
    ax2.set_xticklabels(bounce_labels, fontsize=7.5)
    ax2.legend(fontsize=7.0)
    ax2.grid(axis="y", linestyle="--", alpha=0.5)
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)

    plt.tight_layout()
    p5 = FIG_DIR / "ultra_fig5_benchmark_metrics.png"
    plt.savefig(p5, bbox_inches="tight")
    plt.close()
    paths["fig5"] = p5

    # -------------------------------------------------------------------------
    # SCHEMAT 6: Plan wdrożenia na 60 dni (2 miesiące) – wykres Gantta
    # -------------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8.6, 3.2), dpi=300)
    tasks = [
        "1. Powołanie 5 zespołów i wyjęcie kadr spod prezesów",
        "2. Błyskawiczny pilotaż (Wrocław, Gdańsk, Rzeszów)",
        "3. Spięcie danych regionalnych i szablonów w CMS",
        "4. Start w 20 dziennikach regionalnych i szkolenia",
        "5. Rozszerzenie na całą sieć 500 portali lokalnych",
        "6. Uruchomienie lokalnych rozliczeń posłów w okręgach"
    ]
    starts = [1, 8, 18, 28, 40, 48]
    durations = [14, 15, 14, 15, 16, 12]
    colors_g = ["#0F2747", "#205493", "#1B7A82", "#C84B31", "#205493", "#1B7A82"]
    
    y_g = np.arange(len(tasks))
    ax.barh(y_g, durations, left=starts, color=colors_g, height=0.52, edgecolor="none")
    ax.set_yticks(y_g)
    ax.set_yticklabels(tasks, fontsize=7.5, color="#1A1A1A")
    ax.invert_yaxis()
    ax.set_xlim(0, 65)
    ax.set_xlabel("Harmonogram prac w dniach (od dnia 1. do dnia 60. – 2 miesiące)", fontsize=7.5, color="#555555")
    ax.grid(axis="x", linestyle="--", alpha=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    p6 = FIG_DIR / "ultra_fig6_gantt_roadmap.png"
    plt.savefig(p6, bbox_inches="tight")
    plt.close()
    paths["fig6"] = p6

    return paths


# =============================================================================
# KOMPILACJA GŁÓWNEGO DOKUMENTU WORD (.DOCX / .DOC)
# =============================================================================
def build_master_document():
    paths = generate_clean_diagrams()
    doc = Document()
    
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)
        
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        add_text(hp, "Jan Domaniewski • Strategia wdrożeniowa dla Polska Press Grupy", size=8.0, color=GRAY)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_text(fp, "Polska Press Grupa • Raport wdrożeniowy na 60 dni • Listopad 2026 r.", size=8.0, color=GRAY)

    # -------------------------------------------------------------------------
    # STRONA TYTUŁOWA
    # -------------------------------------------------------------------------
    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_before = Pt(6)
    p_meta.paragraph_format.space_after = Pt(2)
    add_text(p_meta, "DOKUMENT STRATEGICZNO-WDROŻENIOWY (PLAN 60 DNI) | POLSKA PRESS GRUPA", size=8.5, color=TEAL, bold=True)

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(4)
    p_title.paragraph_format.keep_with_next = True
    add_text(p_title, "Nowa architektura mediów regionalnych: jak połączyć siłę newsów z Warszawy z siecią 500 portali lokalnych", size=16.0, color=NAVY, bold=True)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(10)
    add_text(p_sub, "Ekspresowy plan wdrożenia na 2 miesiące: 5 ponadregionalnych zespołów tematycznych, wyjęcie kadr redakcyjnych spod władzy prezesów makroregionów oraz pokazywanie sprawczości państwa bez cenzury i bez partyjnej wazeliny", size=10.0, color=GRAY, italic=True)
    add_bottom_border(p_sub, color=CORAL, size="12")

    p_author = doc.add_paragraph()
    p_author.paragraph_format.space_before = Pt(6)
    p_author.paragraph_format.space_after = Pt(8)
    add_text(p_author, "Autor raportu: ", size=10.0, color=NAVY, bold=True)
    add_text(p_author, "Jan Domaniewski (PPGscope)", size=10.0, color=BLACK, bold=True)
    add_text(p_author, "  |  Horyzont czasowy: ", size=10.0, color=GRAY)
    add_text(p_author, "60 dni (2 miesiące, listopad – grudzień 2026 r.)", size=10.0, color=BLACK)

    add_callout(
        doc,
        "Podsumowanie dla Zarządu: Tradycyjny podział na „warszawską centralę” i lokalne oddziały doprowadził Polska Press do paraliżu. W regionach nadal rządzą prezesi makroregionów, którzy przez lata traktowali oddziały jak prywatne księstwa dzielnicowe. Uwikłani w lokalne układy samorządowe i biznesowe, blokowali ogólnopolskie tematy, narzucali autocenzurę i dusili jakąkolwiek modernizację. Zamykanie serwisów w opłotkach powiatu odcięło nas od młodych czytelników i zniszczyło zasięgi.\n\n"
        "Niniejszy raport to precyzyjny plan operacyjny na 60 dni (2 miesiące). Wykorzystujemy nową strukturę 5 zespołów tematycznych jako elegancki mechanizm wyjęcia kluczowych dziennikarzy spod kurateli prezesów makroregionów. Dziennikarze przechodzą pod bezpośrednią podległość merytoryczną szefów pionów w Warszawie, a ich premie wypłacane są z centrali. Wprowadzamy artykuł łączony (mocny news z Warszawy + automatyczne dane dla danego powiatu) oraz rozliczamy lokalnych posłów opozycji w ich własnych okręgach. Szybkie, dwumiesięczne tempo uniemożliwia prezesom makroregionów zorganizowanie oporu i daje natychmiastowy skok zasięgów.",
        title="GŁÓWNY WNIOSEK: 60 DNI NA ODZYSKANIE REDAKCJI I SKOK ZASIĘGÓW",
        color=CORAL,
        bg_color=TINT_CORAL
    )

    p_toc = doc.add_paragraph()
    p_toc.paragraph_format.space_before = Pt(8)
    p_toc.paragraph_format.space_after = Pt(3)
    add_text(p_toc, "Spis treści raportu:", size=9.5, color=NAVY, bold=True)
    toc_items = [
        "Część I: Dlaczego zamykanie się w powiecie zabija czytelnictwo i odcina młodych ludzi",
        "Część II: Nowy podział pracy w redakcji – 5 zespołów tematycznych i wyjęcie kadr spod prezesów makroregionów",
        "Część III: Jak wygląda nowoczesny artykuł – połączenie newsa z Warszawy z danymi z regionu",
        "Część IV: Jak prowadzić gorące spory polityczne bez cenzury i bez partyjnej wazeliny",
        "Część V: Cztery regiony Polski – jak rozmawiać z czytelnikami na Wschodzie i Zachodzie",
        "Część VI: Plan dnia w redakcji – harmonogram pracy od porannego kolegium do wieczora",
        "Część VII: Jak pokazać to na ekranie telefonu komórkowego (85% naszych czytelników)",
        "Część VIII: Ryzyka wdrożenia i neutralizacja oporu lokalnych struktur",
        "Część IX: Plan działania na 60 dni (2 miesiące) – etapy, ludzie i mierzalne wyniki"
    ]
    for item in toc_items:
        p_t = doc.add_paragraph(style="List Bullet")
        p_t.paragraph_format.space_after = Pt(2)
        add_text(p_t, item, size=8.5, color=BLACK)

    # -------------------------------------------------------------------------
    # CZĘŚĆ I: DIAGNOZA KRYTYCZNA
    # -------------------------------------------------------------------------
    add_h1(doc, "Część I: Dlaczego zamykanie się w powiecie zabija czytelnictwo i odcina młodych ludzi", page_break=True)
    add_body(doc, "Przez lata w mediach regionalnych panowało przekonanie, że naszą jedyną siłą jest „czysta lokalność” – pisanie wyłącznie o tym, co dzieje się za miedzą. To założenie okazało się pułapką. W dzisiejszym internecie taka strategia prowadzi wprost do spadku zasięgów i odpływu czytelników. Wynika to z trzech twardych faktów:")

    add_h2(doc, "1. Drobne sprawy lokalne nie budzą emocji")
    add_body(doc, "W internecie ludzie czytają, komentują i przesyłają dalej teksty, które wywołują realne emocje: poczucie sprawiedliwości, oburzenie na marnotrawstwo, dumę z sukcesu czy lęk o bezpieczeństwo rodziny. Badania uniwersyteckie (m.in. prof. Jonaha Bergera z Wharton School) jednoznacznie pokazują, że materiały niosące silny ładunek emocjonalny osiągają o połowę wyższe zasięgi niż teksty czysto użytkowe.")
    add_body(doc, "Gdy piszemy o rozkładzie jazdy autobusów, przetargu na krawężniki czy remoncie kawałka chodnika, czytelnik wchodzi na stronę, rzuca okiem na informację w 25 sekund i bezpowrotnie zamyka kartę. Aż 82% takich wizyt kończy się natychmiastowym wyjściem z serwisu. Algorytmy Facebooka, TikToka czy Google Discover bezlitośnie ucinają zasięgi takim chłodnym materiałom.")

    add_h2(doc, "2. Młodzi ludzie nie interesują się gminnym podwórkiem")
    add_body(doc, "Twarde badania rynku (Pew Research Center) pokazują gigantyczną przepaść pokoleniową: mediami czysto lokalnymi interesuje się aż 63% osób po sześćdziesiątce, ale zaledwie 15% młodych dorosłych w wieku 18–29 lat. Co więcej, sprawami gminy żyją właściciele domów i działek, natomiast młodzi ludzie, którzy wynajmują mieszkania i często zmieniają miejsce pobytu, w ogóle nie wchodzą na lokalne strony.")
    add_body(doc, "Zamykając się w wąskiej lokalności, Polska Press dobrowolnie oddała całe młodsze i aktywne zawodowo pokolenie portalom ogólnopolskim. Staliśmy się serwisami dla seniorów, tracąc najbardziej atrakcyjną dla reklamodawców grupę czytelników.")

    add_h2(doc, "3. Ślepa pogoń za klikami przez tragedie zniszczyła prestiż")
    add_body(doc, "Ponieważ rzetelne wiadomości z gminy nie dawały milionów odsłon, a centrale domów mediowych wymagały klików, w redakcjach pojawiła się patologia: ratowanie statystyk krwawymi wypadkami samochodowymi („Tragedia na drodze! Zdjęcia zmasakrowanego auta!”) oraz galeriami ze studniówek i cmentarzy.")
    add_body(doc, "Dokładnie na tym samym potknęły się wielkie sieci w Stanach Zjednoczonych (Gannett) i Wielkiej Brytanii (Reach plc). Efekt był opłakany: poważni czytelnicy uciekli, a wielcy reklamodawcy zaczęli nakładać blokady bezpieczeństwa marki, odmawiając wyświetlania reklam przy makabrycznych materiałach.")

    # -------------------------------------------------------------------------
    # CZĘŚĆ II: NOWA STRUKTURA ORGANIZACYJNA
    # -------------------------------------------------------------------------
    add_h1(doc, "Część II: Nowy podział pracy w redakcji – 5 zespołów tematycznych i wyjęcie kadr spod prezesów makroregionów", page_break=True)
    add_body(doc, "Koniec ze sztucznym murem dzielącym „warszawską centralę” i „prowincję”. Dziennikarz w terenie nie może być człowiekiem od wszystkiego, który rano pisze o kradzieży roweru, a po południu próbuje zrozumieć skomplikowaną reformę sądów. Wprowadzamy nowoczesną strukturę opartą na 5 zespołach tematycznych:")

    add_h2(doc, "1. Powołanie 5 zespołów obejmujących cały kraj")
    add_body(doc, "Zamiast tradycyjnych, skostniałych działów tworzymy 5 ponadregionalnych zespołów zajmujących się najważniejszymi sprawami państwa:")
    add_bullet(doc, "Zespół 1: Inwestycje, fundusze i wielkie projekty ", "(KPO, nowe drogi i linie kolejowe, transformacja energetyczna, CPK, fabryki i unijne dotacje).")
    add_bullet(doc, "Zespół 2: Bezpieczeństwo narodowe i armia ", "(Tarcza Wschód, zakupy nowoczesnego uzbrojenia, obrona cywilna, schrony, fabryki zbrojeniowe w regionach).")
    add_bullet(doc, "Zespół 3: Prawo, ustrój i rozliczenia ", "(Przywracanie ładu w sądach i prokuraturze, audyty w spółkach państwa, rozliczanie nadużyć dawnej władzy, elementarna uczciwość).")
    add_bullet(doc, "Zespół 4: Zdrowie, edukacja i rodzina ", "(Pieniądze na szpitale, walka z kolejkami do lekarzy, podwyżki dla nauczycieli, renta wdowia, programy dla rodziców).")
    add_bullet(doc, "Zespół 5: Gospodarka, przedsiębiorczość i praca ", "(Prostsze podatki, stabilność prawa dla firm, nowe miejsca pracy, transformacja Śląska i regionów przemysłowych).")

    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    doc.add_picture(str(paths["fig1"]), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Schemat 1: Nowa organizacja pracy w Polska Press: Dziennikarze regionalni wchodzą bezpośrednio do 5 zespołów tematycznych podległych Warszawie, co wyjmuje ich spod kurateli prezesów makroregionów.")

    add_h2(doc, "2. Dziennikarze regionalni jako eksperci w zespołach")
    add_body(doc, "Najlepsi reporterzy z gazet regionalnych (z Wrocławia, Gdańska, Katowic, Poznania czy Rzeszowa) wchodzą w skład tych 5 zespołów. Dziennikarz z Wrocławia zajmujący się inwestycjami nie gania za drobnymi kolizjami. Jego zadaniem jest monitorowanie wielkich projektów na Dolnym Śląsku, kontakt z inżynierami i dyrektorami fabryk. Staje się w swoim regionie cenionym ekspertem.")
    add_body(doc, "Taki model daje dziennikarzom w regionach ogromną satysfakcję i poczucie sensu. Przestają czuć się prowincjonalnymi korespondentami, a stają się współautorami najważniejszych materiałów czytanych w całej Polsce.")

    add_h2(doc, "3. Wyjęcie dziennikarzy spod kurateli prezesów makroregionów: koniec księstw dzielnicowych")
    add_body(doc, "W strukturze Polska Press nadal formalnie funkcjonują prezesi makroregionów. W praktyce przez lata pełnili oni rolę lokalnych baronów, którzy pilnowali własnych interesów i lokalnych układów polityczno-biznesowych. Prezes makroregionu, powiązany towarzysko lub reklamowo z miejscowymi notablami, wójtami czy spółkami komunalnymi, potrafił zablokować krytyczny materiał albo wymusić przemilczenie afery.")
    add_body(doc, "Nowa organizacja redakcji jest pierwszym, kluczowym krokiem do całkowitego odebrania im władzy nad treściami i ludźmi:")
    add_bullet(doc, "Twarda linia podległości merytorycznej do Warszawy: ", "Dziennikarz wchodzący do zespołu tematycznego podlega wyłącznie szefowi pionu w stolicy. Prezes makroregionu traci prawo wydawania mu poleceń redakcyjnych, nie ma wglądu w przygotowywane teksty przed publikacją i nie może zdjąć materiału z czołówki.")
    add_bullet(doc, "Premie i dodatki płacone z budżetu centralnego: ", "Kto płaci, ten decyduje. Wynagrodzenie zasadnicze pozostaje w spółce, ale budżet zadaniowy i sowite premie za materiały ogólnopolskie idą bezpośrednio z Warszawy. Dziennikarz w terenie zyskuje materialną niezależność od humoru lokalnego prezesa.")
    add_bullet(doc, "Centralna publikacja w systemie CMS: ", "Główne tematy i moduły rozliczające posłów opozycji są publikowane centralnie. Lokalne kierownictwo nie ma uprawnień administratora, by zablokować emisję na regionalnych portalach.")
    add_bullet(doc, "Nowa rola prezesów makroregionów: ", "Zostają sprowadzeni do funkcji czysto administracyjno-gospodarczych (zarządzanie biurami, logistyka, flota samochodowa, lokalne ogłoszenia drobne). Zostają całkowicie odcięci od wpływu na linię redakcyjną grupy.")

    # -------------------------------------------------------------------------
    # CZĘŚĆ III: JAK WYGLĄDA NOWOCZESNY ARTYKUŁ
    # -------------------------------------------------------------------------
    add_h1(doc, "Część III: Jak wygląda nowoczesny artykuł – połączenie newsa z Warszawy z danymi z regionu", page_break=True)
    add_body(doc, "Odrzucamy prymitywne udawanie, że decyzja rządu to sprawa lokalna. Nie szukamy na siłę dziury w jezdni przy temacie Trybunału Konstytucyjnego. Wprowadzamy sprawdzony na świecie model artykułu łączonego (trójwarstwowego):")

    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    doc.add_picture(str(paths["fig2"]), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Schemat 2: Układ artykułu łączonego: Gorący news ogólnopolski (55%), automatyczny blok konkretnych danych dla regionu (30%) oraz autorytatywny komentarz lokalnego eksperta (15%).")

    add_h2(doc, "1. Część pierwsza: Główny news z Warszawy (55% objętości)")
    add_body(doc, "Tekst pisany przez najlepszych publicystów w Warszawie. Dynamiczny, mocny, trzymający w napięciu. Wyjaśnia decyzję premiera, pokazuje starcie w parlamencie, stawia sprawę jasno i bez owijania w bawełnę. Czyta się go jednym tchem od Szczecina po Rzeszów.")

    add_h2(doc, "2. Część druga: Automatyczny blok danych dla Twojego regionu (30% objętości)")
    add_body(doc, "W centrali tworzymy mały, sprawny zespół analizy danych, który jest podłączony pod bazy ministerstw, funduszy unijnych i BGK. Gdy Warszawa wypuszcza tekst o miliardach na szpitale, system CMS automatycznie wstawia do artykułu czytelną ramkę dopasowaną do miejsca zamieszkania czytelnika:")
    add_bullet(doc, "Czytelnik na Dolnym Śląsku widzi: ", "Dokładną kwotę dla swojego województwa (np. 820 mln zł), wykaz 4 konkretnych szpitali i termin rozpoczęcia prac.")
    add_bullet(doc, "Czytelnik na Pomorzu widzi: ", "Kwotę dla województwa pomorskiego oraz listę placówek w Gdańsku, Gdyni i Słupsku.")
    add_body(doc, "Dziennikarz w terenie nie musi tracić czasu na przepisywanie tabelek. System robi to sam, a czytelnik natychmiast widzi czarno na białym: rząd podjął decyzję, a moja rodzina będzie miała nowoczesny szpital.")

    add_h2(doc, "3. Część trzecia: Głos z Twojego regionu (15% objętości)")
    add_body(doc, "Dziennikarz regionalny ma jedno, konkretne zadanie: zdobyć krótką, mocną wypowiedź szanowanego w regionie autorytetu (ordynatora szpitala, szefa izby lekarskiej, wybitnego profesora), który bez politykowania wyjaśnia ludziom, dlaczego ta decyzja rządu realnie poprawi ich los.")

    # -------------------------------------------------------------------------
    # CZĘŚĆ IV: GORĄCE SPORY POLITYCZNE BEZ CENZURY
    # -------------------------------------------------------------------------
    add_h1(doc, "Część IV: Jak prowadzić gorące spory polityczne bez cenzury i bez partyjnej wazeliny", page_break=True)
    add_body(doc, "Najtrudniejsza próba dla każdego medium to gorące spory ustrojowe i polityczne (walka o Trybunał Konstytucyjny, rozliczenia polityków dawnej władzy, immunitety, uchwały sejmowe). W tych tematach nie ma dotacji z KPO ani budowy dróg. Jak je relacjonować, by wspierać naprawę państwa, a nie wyjść na partyjną tubę rządu?")

    add_h2(doc, "1. Dlaczego cenzura i wazeliniarstwo to samobójstwo")
    add_body(doc, "Gdybyśmy zaczęli cenzurować krytyczne komentarze czytelników, kasować niewygodne opinie albo pisać laurki o tym, że władza ma zawsze rację, czytelnicy natychmiast odwrócą się od naszych gazet. W regionach o poglądach konserwatywnych skończyłoby się to natychmiastowym bojkotem. Z kolei próba „studzenia nastrojów” zabija klikalność – internet żyje zaangażowaniem.")

    add_h2(doc, "2. Siła właściwego pytania: framing uczciwości zamiast wojenki partii")
    add_body(doc, "Zamiast wchodzić w jałową wojenkę między partiami, zmieniamy sposób stawiania pytań. Przesuwamy dyskusję na poziom elementarnej uczciwości, zasad sprawiedliwości i równego traktowania:")
    add_bullet(doc, "Pytanie partyjne (błąd): ", "„Czy popierasz działania rządu w sprawie Trybunału Konstytucyjnego?” – daje jałowy podział pół na pół i wyzwiska w komentarzach.")
    add_bullet(doc, "Pytanie o zasady (właściwe): ", "„Czy sędziowie i politycy podejrzani o łamanie prawa powinni odpowiadać przed sądem jak każdy zwykły obywatel?” – daje ponad 90% jednoznacznych odpowiedzi na „tak”.")
    add_body(doc, "Wtedy działania rządu nie wyglądają na polityczny odwet, ale na przywracanie elementarnego porządku, którego domaga się przytłaczająca większość Polaków, także wyborcy opozycji.")

    add_h2(doc, "3. Rozliczanie posłów opozycji w ich własnym okręgu wyborczym")
    add_body(doc, "W centralnym materiale o nocnych głosowaniach w Sejmie wstawiamy automatyczną ramkę z wynikami głosowania posłów z okręgu czytelnika:")
    add_bullet(doc, "Suche fakty bez złośliwego komentarza: ", "Publikujemy nazwiska i zdjęcia lokalnych posłów opozycji z informacją: „Poseł X z Twojego miasta głosował przeciwko odebraniu immunitetu posłowi oskarżonemu o defraudację”.")
    add_bullet(doc, "Skutek: ", "Poseł opozycji musi tłumaczyć się przed własnymi sąsiadami i wyborcami. Nie cenzurujemy nikogo, pokazujemy prawdę, a rząd wychodzi na jedyną siłę dbającą o uczciwość.")

    # -------------------------------------------------------------------------
    # CZĘŚĆ V: CZTERY REGIONY POLSKI
    # -------------------------------------------------------------------------
    add_h1(doc, "Część V: Cztery regiony Polski – jak rozmawiać z czytelnikami na Wschodzie i Zachodzie", page_break=True)
    add_body(doc, "Ogromną zaletą Polska Press jest to, że nie musimy mówić do wszystkich jednym, sztucznym językiem z warszawskiej kawiarni. Polska ma zróżnicowaną wrażliwość. Promujemy te same sukcesy rządu, ale kładziemy nacisk na to, co dla mieszkańców danego regionu jest najważniejsze:")

    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    doc.add_picture(str(paths["fig4"]), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Schemat 3: Cztery regiony wrażliwości: Dopasowanie języka i tematów do nastrojów mieszkańców w różnych częściach kraju.")

    t_reg_headers = ["Makroregion", "Tytuły prasowe i portale", "Co jest najważniejsze dla ludzi", "Główny temat działań rządu"]
    t_reg_widths = [1.5, 1.6, 1.7, 1.8]
    t_reg_data = [
        ("Polska wschodnia i południowa", "Nowiny (Rzeszów), Kurier Lubelski, Echo Dnia", "Bezpieczeństwo granic, obrona, szacunek dla munduru", "Tarcza Wschód, rozbudowa baz, zlecenia dla fabryk broni (Stalowa Wola, Radom, Mesko)"),
        ("Polska zachodnia i północna", "Głos Wielkopolski, Gazeta Wrocławska, Dziennik Bałtycki", "Gospodarka, przedsiębiorczość, Europa, innowacje", "Odblokowane KPO, farmy wiatrowe na Bałtyku, nowoczesne pociągi, stabilność prawa dla firm"),
        ("Śląsk i Zagłębie", "Dziennik Zachodni", "Etos ciężkiej pracy, godność, miejsca pracy", "Bezpieczna transformacja przemysłu, nowe fabryki technologii, pewne osłony socjalne"),
        ("Polska centralna i mniejsze miasta", "Dziennik Łódzki, Gazeta Lubuska, sieć naszemiasto.pl", "Portfel rodziny, koszty życia, elementarna uczciwość", "Renta wdowia, programy dla rodziców, bon energetyczny, rozliczenie dawnych nadużyć władzy")
    ]
    add_table_custom(doc, t_reg_headers, t_reg_widths, t_reg_data)
    add_caption(doc, "Tabela 1: Zestawienie tematów modernizacji państwa z wrażliwością poszczególnych makroregionów Polski.")

    # -------------------------------------------------------------------------
    # CZĘŚĆ VI: PLAN DNIA W REDAKCJI
    # -------------------------------------------------------------------------
    add_h1(doc, "Część VI: Plan dnia w redakcji – harmonogram pracy od porannego kolegium do wieczora", page_break=True)
    add_body(doc, "Nowy model wymaga sprawnej, żelaznej dyscypliny organizacyjnej. Nie może być sytuacji, w której Warszawa publikuje news o 11:00, a redakcje regionalne dowiadują się o nim po południu. Wprowadzamy zsynchronizowany plan dnia:")

    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    doc.add_picture(str(paths["fig3"]), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Schemat 4: Przebieg dnia w zintegrowanej redakcji: Od porannej odprawy o 8:30, przez publikację o 11:30, aż po wieczorne rozliczenia.")

    t_sop_headers = ["Godziny", "Co robi centrala w Warszawie", "Co robią oddziały w regionach", "Efekt widoczny dla czytelnika"]
    t_sop_widths = [1.2, 1.8, 1.8, 1.8]
    t_sop_data = [
        ("08:00 – 08:30", "Główne kolegium: wybór najważniejszego tematu z agendy rządu", "Poranne odprawy w 16 oddziałach z udziałem członków zespołów", "Ustalenie głównego tematu dnia i podział zadań"),
        ("08:30 – 10:00", "Pobranie twardych danych z ministerstw i funduszy unijnych", "Dziennikarze w terenie kontaktują się z lokalnymi ekspertami", "Przygotowanie danych regionalnych do systemu CMS"),
        ("10:00 – 11:30", "Przygotowanie głównego tekstu ogólnopolskiego (Warstwa 1)", "Nagranie wypowiedzi lokalnego lekarza, inżyniera czy dyrektora", "Gotowy kompletny materiał łączony"),
        ("11:30 – 12:00", "Jednoczesne zwolnienie blokady publikacji dla 500 portali", "Sprawdzenie poprawności wyświetlania lokalnych danych", "Mocna czołówka na 500 portalach w całej Polsce"),
        ("12:00 – 16:00", "Śledzenie ruchu, optymalizacja tytułów, analiza dyskusji", "Udostępnianie artykułów na profilach społecznościowych w miastach", "Druga fala czytelników i zaangażowanie mieszkańców"),
        ("16:00 – 22:00", "Podsumowanie wieczorne, relacja z nocnych głosowań w Sejmie", "Przygotowanie skróconej wersji materiału do wydań papierowych", "Dominacja informacyjna nad konkurencją")
    ]
    add_table_custom(doc, t_sop_headers, t_sop_widths, t_sop_data)
    add_caption(doc, "Tabela 2: Rozkład zadań redakcyjnych w ciągu dnia w nowym modelu współpracy.")

    # -------------------------------------------------------------------------
    # CZĘŚĆ VII: JAK POKAZAĆ TO NA EKRANIE TELEFONU
    # -------------------------------------------------------------------------
    add_h1(doc, "Część VII: Jak pokazać to na ekranie telefonu komórkowego (85% naszych czytelników)")
    add_body(doc, "Aż 85% naszych czytelników przegląda serwisy na ekranie smartfona. Jeśli tekst na telefonie będzie nieczytelny, przeładowany reklamami albo nudny, czytelnik natychmiast ucieknie. Dlatego układ mobilny projektujemy z chirurgiczną precyzją:")

    add_h2(doc, "1. Co widzi użytkownik podczas przewijania ekranu")
    add_bullet(doc, "Pierwszy ekran (zaraz po wejściu): ", "Mocny, dynamiczny tytuł ogólnopolski oraz krótki lead wyjaśniający decyzję rządu. Żadnych wyskakujących, agresywnych reklam zasłaniających treść.")
    add_bullet(doc, "Drugi ekran (po pierwszym przewinięciu): ", "Wyraźna, kolorowa Karta Twojego Regionu. Użytkownik widzi konkret: kwotę dla swojego województwa, listę szpitali czy dróg oraz przycisk „Sprawdź szczegóły dla Twojego powiatu”.")
    add_bullet(doc, "Trzeci ekran: ", "Głos szanowanego eksperta z regionu oraz uczciwa sonda: pytanie o zasadę sprawiedliwości.")
    add_bullet(doc, "Czwarty ekran: ", "Lokalne sprawy codzienne – czytelnik może przejść do tradycyjnych wiadomości ze swojego miasta.")

    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    doc.add_picture(str(paths["fig5"]), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Wykres 1: Porównanie kluczowych wskaźników: Pięciokrotny wzrost czasu spędzonego na stronie oraz trzykrotny wzrost udziału młodych czytelników (18–34 lata).")

    # -------------------------------------------------------------------------
    # CZĘŚĆ VIII: RYZYKA WDROŻENIA I NEUTRALIZACJA OPORU
    # -------------------------------------------------------------------------
    add_h1(doc, "Część VIII: Ryzyka wdrożenia i neutralizacja oporu lokalnych struktur", page_break=True)
    add_body(doc, "Tak głęboka zmiana w sposobie pracy redakcji oraz odebranie władzy prezesom makroregionów wywoła opór. Należy nazwać te zagrożenia po imieniu i zastosować bezwzględne środki zaradcze:")

    t_risk_headers = ["Obszar ryzyka", "Co może pójść nie tak", "Poziom zagrożenia", "Jak temu skutecznie zapobiegamy"]
    t_risk_widths = [1.5, 1.8, 1.4, 1.9]
    t_risk_data = [
        ("Opór prezesów makroregionów", "Próby torpedowania zmian, zastraszanie dziennikarzy, naciski lokalnych układów biznesowych", "Bardzo wysoki", "Twarda uchwała Zarządu; wyjęcie budżetów premiowych do Warszawy; pozbawienie prezesów uprawnień w CMS; w razie sabotażu natychmiastowe dymisje"),
        ("Zarzut upolitycznienia", "Czytelnicy lub opozycja oskarżą nas o bycie tubą rządu", "Średni", "Zero partyjnych pochwał; opieramy się wyłącznie na twardych danych i rozliczeniach; pokazujemy konkretne inwestycje"),
        ("Bierność starszych dziennikarzy", "Część redaktorów w terenie będzie wolała pisać tylko o gminie", "Średni", "Najlepsi reporterzy dostają wyższe stawki i prestiż pracy w zespołach ogólnopolskich; oporni zostają przy prostych sprawach komunalnych"),
        ("Awarie techniczne systemu CMS", "Dane regionalne nie wgrają się na czas do artykułu", "Średni", "Przygotowanie gotowych szablonów awaryjnych (fallback); stały dyżur informatyka w centralnym zespole danych"),
        ("Agresja w komentarzach", "Trolle partyjne spróbują zalać fora wyzwiskami i hejtem", "Wysoki", "Zero cenzury; moderacja wyłącznie wulgaryzmów; ustawianie pytań w sondach wokół uniwersalnych zasad uczciwości")
    ]
    add_table_custom(doc, t_risk_headers, t_risk_widths, t_risk_data)
    add_caption(doc, "Tabela 3: Zestawienie ryzyk wdrożeniowych wraz z konkretnymi działaniami zabezpieczającymi.")

    # -------------------------------------------------------------------------
    # CZĘŚĆ IX: PLAN DZIAŁANIA NA 60 DNI (2 MIESIĄCE)
    # -------------------------------------------------------------------------
    add_h1(doc, "Część IX: Plan działania na 60 dni (2 miesiące) – etapy, ludzie i mierzalne wyniki")
    add_body(doc, "Wdrożenie nowego modelu musi nastąpić błyskawicznie w cyklu 60 dni (listopad – grudzień 2026 r.). Szybkie tempo jest konieczne z dwóch powodów: po pierwsze, nie daje prezesom makroregionów czasu na zawiązanie koalicji i zablokowanie zmian; po drugie, dynamika polityczna i tempo inwestycji rządowych wymagają natychmiastowego efektu na czołówkach:")

    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    doc.add_picture(str(paths["fig6"]), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Schemat 5: Harmonogram wdrożenia na 60 dni: Od powołania zespołów i pilotażu do pełnego startu w 500 serwisach i odzyskania kontroli nad redakcją.")

    t_road_headers = ["Etap wdrożenia", "Czas trwania", "Kluczowe zadania dla redakcji", "Mierzalny wynik (KPI)"]
    t_road_widths = [1.4, 1.2, 2.2, 1.8]
    t_road_data = [
        ("Etap I: Piony i wyjęcie kadr", "Dni 1 – 14", "Uchwała Zarządu; powołanie 5 liderów pionów w Warszawie; przypisanie pierwszych 32 dziennikarzy regionalnych bezpośrednio pod centralę; odcięcie prezesów makroregionów od weta w CMS", "Formalne podporządkowanie kadr Warszawie; zabezpieczenie centralnego budżetu premiowego"),
        ("Etap II: Błyskawiczny pilotaż", "Dni 15 – 28", "Uruchomienie modelu w 3 kluczowych tytułach (Gazeta Wrocławska, Dziennik Bałtycki, Nowiny); spięcie pierwszych baz danych inwestycji i KPO z szablonami artykułów", "15 wspólnych czołówek łączonych; wzrost zaangażowania o 30%; sprawdzenie procedury w praktyce"),
        ("Etap III: Skalowanie na 20 dzienników", "Dni 29 – 45", "Objęcie nowym modelem wszystkich 20 dzienników regionalnych; praktyczne warsztaty dla kolejnych 60 dzienników w terenie; uruchomienie modułu danych dla wszystkich 16 województw", "Codzienny wspólny artykuł na czołówkach 20 gazet i portali regionalnych; wyeliminowanie dublowania depesz PAP"),
        ("Etap IV: Pełna sieć 500 portali", "Dni 46 – 60", "Wdrożenie modułu w 500 portalach miejskich i serwisach naszemiasto.pl; uruchomienie automatycznego modułu rozliczania lokalnych posłów opozycji; podsumowanie pierwszego miesiąca", "Podwojenie średniego czasu czytania; wzrost udziału czytelników 18–34 lata o 35%; pełna spójność linii grupy")
    ]
    add_table_custom(doc, t_road_headers, t_road_widths, t_road_data)
    add_caption(doc, "Tabela 4: Czteroetapowy harmonogram ekspresowego wdrożenia w cyklu 60 dni.")

    add_body(doc, "Wdrożenie tego planu w dwa miesiące rozwiązuje dwa kluczowe problemy Polska Press: odzyskuje redakcję z rąk lokalnych układów i wyprowadza nasze media z prowincjonalnego zaścianka. Łączymy to, co najlepsze: siłę i rozmach gorących tematów z Warszawy z potęgą 500 lokalnych serwisów. Promujemy modernizację kraju w sposób mądry, uczciwy i nowoczesny, budując potężny zasięg i trwałe zaufanie milionów czytelników.")

    # Podpis
    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_before = Pt(16)
    p_sign.paragraph_format.space_after = Pt(2)
    p_sign.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_text(p_sign, "Jan Domaniewski\n", size=11.0, color=NAVY, bold=True)
    add_text(p_sign, "PPGscope • Architektura mediów i strategie wydawnicze\n", size=9.0, color=GRAY, italic=True)
    add_text(p_sign, "Listopad 2026 r.", size=8.5, color=GRAY)

    # Zapis plików
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    
    doc.save(str(DOCX_REPORTS))
    doc.save(str(DOCX_DOWNLOADS))
    
    shutil.copyfile(str(DOCX_DOWNLOADS), str(DOC_DOWNLOADS))
    shutil.copyfile(str(DOCX_REPORTS), str(DOC_REPORTS))
    
    print("Zaktualizowany raport wdrożeniowy (Plan 60 dni) został pomyślnie zapisany:")
    print(f" -> {DOCX_DOWNLOADS}")
    print(f" -> {DOC_DOWNLOADS}")


if __name__ == "__main__":
    build_master_document()
