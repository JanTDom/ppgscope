from __future__ import annotations

import json
import re
import math
import statistics
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


CONTENT_WIDTH = 6.71
FIGURE_WIDTH = 5.8
AUTHOR = "Jan Domaniewski"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "reports"
FIG = OUT / "figures"
DATA_PATH = ROOT / "data" / "dashboard.json"
PROV_PATH = ROOT / "web" / "public" / "data" / "provenance.json"
REPORT_PATH = OUT / "PPGscope_Raport_zywotnosc_546_portali.docx"

NAVY = "0F2747"
BLUE = "2F6B9A"
TEAL = "2A9D8F"
TINT_TEAL = "E8F4F2"
TINT_NAVY = "EAF0F7"
CORAL = "E76F51"
OCHRE = "E9B44C"
PURPLE = "7B61A8"
GRAY = "59636E"
LIGHT = "EEF2F5"
MID = "D9E0E7"
BLACK = "1B2430"
WHITE = "FFFFFF"

STATUS_ORDER = [
    "AKTYWNY_UNIKALNY",
    "AKTYWNY_SYNDYKAT",
    "LEDWO_ZYWY",
    "ZOMBIE_AUTOMAT",
    "MARTWY",
]
STATUS_LABELS = {
    "AKTYWNY_UNIKALNY": "Czynny i unikalny",
    "AKTYWNY_SYNDYKAT": "Czynny syndykatowy",
    "LEDWO_ZYWY": "Ledwo żywy",
    "ZOMBIE_AUTOMAT": "Zombie automat",
    "MARTWY": "Martwy",
}
STATUS_COLORS = {
    "AKTYWNY_UNIKALNY": TEAL,
    "AKTYWNY_SYNDYKAT": BLUE,
    "LEDWO_ZYWY": OCHRE,
    "ZOMBIE_AUTOMAT": PURPLE,
    "MARTWY": CORAL,
}


CALLOUT_TITLE = {TEAL: "1B7A6F", OCHRE: "8A5A00", CORAL: "B4452B", NAVY: NAVY}
NUMERIC_CELL = re.compile(r"^[\d\s,.%|h]+$")


def pct(n: float, d: float) -> str:
    return f"{100 * n / d:.1f}%".replace(".", ",") if d else "0,0%"


def pl_num(value: float, digits: int = 0) -> str:
    if digits == 0:
        return f"{value:,.0f}".replace(",", " ")
    return f"{value:,.{digits}f}".replace(",", "X").replace(".", ",").replace("X", " ")


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def set_cell_border(cell, color=MID, size="6") -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_col_widths(table, widths):
    for idx, width in enumerate(widths):
        table.columns[idx].width = Inches(width)
    for row in table.rows:
        for idx, width in enumerate(widths):
            row.cells[idx].width = Inches(width)


def shade_paragraph(paragraph, fill: str) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    p_pr.append(shd)


def add_bottom_border(paragraph, color=MID, size="8") -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), size)
    bottom.set(qn("w:space"), "6")
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


def style_run(run, size=10.5, color=BLACK, bold=False, italic=False):
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


def add_body(doc, text, *, after=6, first_line=0.0):
    p = doc.add_paragraph(style="Body Text")
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.first_line_indent = Inches(first_line) if first_line else None
    p.paragraph_format.line_spacing = 1.13
    add_text(p, text, size=10.7)
    return p


def add_heading(doc, text, level=1, kicker=None):
    if kicker:
        add_kicker(doc, kicker)
    p = doc.add_paragraph(style=f"Heading {level}")
    p.paragraph_format.space_before = Pt(2 if kicker else (13 if level == 1 else 10))
    p.paragraph_format.space_after = Pt(7 if level == 1 else 4)
    set_keep_with_next(p)
    if level == 1:
        add_text(p, text, size=20, color=NAVY, bold=True)
        add_bottom_border(p, color=TEAL, size="12")
    else:
        add_text(p, text, size=12.5, color="1B7A6F", bold=True)
    return p


def add_caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(8)
    add_text(p, text, size=8.7, color=GRAY, italic=True)
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.left_indent = Inches(0.22)
    add_text(p, text, size=10.6)
    return p


def add_rule(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(8)
    add_bottom_border(p, color=NAVY, size="12")


def add_table(doc, headers, widths, rows, header_fill=NAVY, font_size=9.2):
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
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(0)
        add_text(p, h, size=8.6, color=WHITE, bold=True)
    for r_idx, row in enumerate(rows):
        cells = table.add_row().cells
        prevent_row_split(table.rows[-1])
        for i, val in enumerate(row):
            cell = cells[i]
            set_cell_shading(cell, "FFFFFF" if r_idx % 2 == 0 else LIGHT)
            set_cell_border(cell)
            set_cell_margins(cell, top=90, bottom=90)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if NUMERIC_CELL.match(str(val)) else WD_ALIGN_PARAGRAPH.LEFT
            add_text(p, str(val), size=font_size, color=BLACK)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table



def set_edge_borders(cell, **edges):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right"):
        spec = edges.get(edge)
        element = OxmlElement(f"w:{edge}")
        if spec is None:
            element.set(qn("w:val"), "nil")
        else:
            color, size = spec
            element.set(qn("w:val"), "single")
            element.set(qn("w:sz"), str(size))
            element.set(qn("w:space"), "0")
            element.set(qn("w:color"), color)
        borders.append(element)


def set_row_height(row, twips, rule="exact"):
    tr_pr = row._tr.get_or_add_trPr()
    height = OxmlElement("w:trHeight")
    height.set(qn("w:val"), str(twips))
    height.set(qn("w:hRule"), rule)
    tr_pr.append(height)


def add_kicker(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(0)
    set_keep_with_next(p)
    run = add_text(p, text.upper(), size=8.5, color=TEAL, bold=True)
    rpr = run._element.get_or_add_rPr()
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:val"), "40")
    rpr.append(spacing)
    return p


def add_callout(doc, title, text, accent=TEAL, fill=TINT_TEAL):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.rows[0].cells[0]
    cell.width = Inches(CONTENT_WIDTH)
    set_cell_shading(cell, fill)
    set_edge_borders(cell, left=(accent, 36))
    set_cell_margins(cell, top=160, bottom=160, start=240, end=220)
    prevent_row_split(table.rows[0])
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(3)
    add_text(p, title, size=10.5, color=CALLOUT_TITLE.get(accent, accent), bold=True)
    p2 = cell.add_paragraph()
    p2.paragraph_format.space_after = Pt(0)
    p2.paragraph_format.line_spacing = 1.13
    add_text(p2, text, size=10.4, color=BLACK)
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(4)
    return table


def add_cover_band(doc, kicker, title, subtitle):
    table = doc.add_table(rows=2, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    top, stripe = table.rows[0].cells[0], table.rows[1].cells[0]
    for cell, fill in ((top, NAVY), (stripe, TEAL)):
        cell.width = Inches(CONTENT_WIDTH)
        set_cell_shading(cell, fill)
        set_edge_borders(cell)
    set_cell_margins(top, top=1100, bottom=900, start=420, end=420)
    set_row_height(table.rows[1], 140)
    p = top.paragraphs[0]
    p.paragraph_format.space_after = Pt(12)
    run = add_text(p, kicker.upper(), size=9.5, color="7FD6CB", bold=True)
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:val"), "60")
    run._element.get_or_add_rPr().append(spacing)
    p = top.add_paragraph()
    p.paragraph_format.space_after = Pt(10)
    p.paragraph_format.line_spacing = 1.0
    for i, line in enumerate(title.split("\n")):
        if i:
            p.add_run().add_break()
        add_text(p, line, size=32, color=WHITE, bold=True)
    p = top.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    add_text(p, subtitle, size=13.5, color="C9D6E6")
    return table


def add_metric_table(doc, metrics):
    table = doc.add_table(rows=1, cols=len(metrics))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    width = CONTENT_WIDTH / len(metrics)
    for idx, (value, label, note, color) in enumerate(metrics):
        cell = table.rows[0].cells[idx]
        cell.width = Inches(width)
        set_cell_shading(cell, "F5F7FA")
        set_edge_borders(cell, top=(color, 36), left=("FFFFFF", 24), right=("FFFFFF", 24))
        set_cell_margins(cell, top=200, bottom=180, start=140, end=140)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(0)
        add_text(p, value, size=30, color=color, bold=True)
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_after = Pt(1)
        add_text(p2, label, size=10, color=BLACK, bold=True)
        p3 = cell.add_paragraph()
        p3.paragraph_format.space_after = Pt(0)
        add_text(p3, note, size=8.6, color=GRAY)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_text(paragraph, f"Polska Press Grupa  ·  analiza PPGscope, {AUTHOR}  ·  ", size=8.3, color=GRAY)
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = "PAGE"
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr_text)
    run._r.append(fld_char2)
    style_run(run, size=8.3, color=GRAY)


def create_styles(doc):
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    normal.font.size = Pt(10.7)
    normal.font.color.rgb = RGBColor.from_string(BLACK)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.13

    body = styles["Body Text"]
    body.font.name = "Calibri"
    body._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    body.font.size = Pt(10.7)
    body.font.color.rgb = RGBColor.from_string(BLACK)
    body.paragraph_format.space_after = Pt(6)
    body.paragraph_format.line_spacing = 1.13

    for name, size in (("Heading 1", 16), ("Heading 2", 12.5), ("Heading 3", 11.5)):
        st = styles[name]
        st.font.name = "Calibri"
        st._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.color.rgb = RGBColor.from_string(BLACK)
        st.paragraph_format.keep_with_next = True


def setup_document():
    doc = Document()
    sec = doc.sections[0]
    sec.page_width = Inches(8.27)
    sec.page_height = Inches(11.69)
    sec.top_margin = Inches(0.72)
    sec.bottom_margin = Inches(0.63)
    sec.left_margin = Inches(0.78)
    sec.right_margin = Inches(0.78)
    create_styles(doc)
    footer = sec.footer.paragraphs[0]
    add_page_number(footer)
    props = doc.core_properties
    props.title = "Żywotność portali Polska Press Grupa"
    props.subject = "Analiza aktywności, unikalności i automatyzacji publikacji"
    props.author = AUTHOR
    props.keywords = "Polska Press Grupa, PPGscope, Jan Domaniewski, portale, żywotność, syndykacja, redakcje lokalne"
    return doc


SS = 3  # supersampling: rysujemy 3x większe, potem zmniejszamy dla gładkich krawędzi
_FONT_FILES = {
    "regular": ("/Users/macbookpro/Library/Fonts/Avenir Next.ttc", 7),
    "medium": ("/Users/macbookpro/Library/Fonts/Avenir Next.ttc", 5),
    "bold": ("/Users/macbookpro/Library/Fonts/Avenir Next.ttc", 2),
}
_FALLBACK = {
    "regular": "/System/Library/Fonts/Supplemental/Arial.ttf",
    "medium": "/System/Library/Fonts/Supplemental/Arial.ttf",
    "bold": "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
}
INK = "#16243A"
MUTED = "#6B7683"
GRID = "#E3E8EE"
TRACK = "#EDF1F5"


def _font(size, weight="regular"):
    path, index = _FONT_FILES[weight]
    if Path(path).exists():
        return ImageFont.truetype(path, int(size * SS), index=index)
    return ImageFont.truetype(_FALLBACK[weight], int(size * SS))


class Canvas:
    def __init__(self, w, h, title=None, subtitle=None):
        self.w, self.h = w, h
        self.img = Image.new("RGB", (w * SS, h * SS), "white")
        self.d = ImageDraw.Draw(self.img)
        if title:
            self.text(28, 24, title, 21, INK, "bold")
        if subtitle:
            self.text(28, 54, subtitle, 13, MUTED)

    def _s(self, v):
        return v * SS

    def text(self, x, y, t, size=14, color=INK, weight="regular", anchor="la"):
        self.d.text((self._s(x), self._s(y)), t, font=_font(size, weight), fill=color, anchor=anchor)

    def rect(self, x0, y0, x1, y1, fill, r=0, corners=None):
        box = (self._s(x0), self._s(y0), self._s(x1), self._s(y1))
        if r:
            self.d.rounded_rectangle(box, radius=self._s(r), fill=fill, corners=corners)
        else:
            self.d.rectangle(box, fill=fill)

    def line(self, x0, y0, x1, y1, color=GRID, width=1):
        self.d.line((self._s(x0), self._s(y0), self._s(x1), self._s(y1)), fill=color, width=int(width * SS))

    def circle(self, cx, cy, r, fill, outline=None, width=0):
        self.d.ellipse(
            (self._s(cx - r), self._s(cy - r), self._s(cx + r), self._s(cy + r)),
            fill=fill, outline=outline, width=int(width * SS),
        )

    def save(self, name):
        out = self.img.resize((self.w * 2, self.h * 2), Image.LANCZOS)
        out.save(FIG / name, dpi=(200, 200), optimize=True)


def _pl(value, digits=0):
    return pl_num(value, digits)


def _fig_status(xs, counts):
    n = len(xs)
    c = Canvas(800, 400, "Pięć stanów życia sieci", f"Podział {n} rekordów audytu według żywotności redakcyjnej")
    cx, cy, ro, ri = 215, 232, 138, 88
    start = -90.0
    for s in STATUS_ORDER:
        sweep = 360.0 * counts[s] / n
        c.d.pieslice(
            (c._s(cx - ro), c._s(cy - ro), c._s(cx + ro), c._s(cy + ro)),
            start, start + sweep, fill=f"#{STATUS_COLORS[s]}", outline="white", width=3 * SS,
        )
        start += sweep
    c.circle(cx, cy, ri, "white")
    c.text(cx, cy - 12, str(n), 38, INK, "bold", "mm")
    c.text(cx, cy + 24, "rekordów audytu", 13, MUTED, "regular", "mm")
    lx, ly, step = 440, 118, 52
    for i, s in enumerate(STATUS_ORDER):
        y = ly + i * step
        c.rect(lx, y, lx + 6, y + 36, f"#{STATUS_COLORS[s]}", r=3)
        c.text(lx + 20, y + 2, STATUS_LABELS[s], 15, INK, "bold")
        c.text(lx + 20, y + 21, f"{counts[s]} portali  ·  {pct(counts[s], n)}", 13, MUTED)
    c.save("status_breakdown.png")


def _fig_output(xs):
    totals = [sum(p["daily_articles_count"] for p in xs if p["vitality_status"] == s) for s in STATUS_ORDER]
    unique = [sum(p["unique_articles_count"] for p in xs if p["vitality_status"] == s) for s in STATUS_ORDER]
    clones = [t - u for t, u in zip(totals, unique)]
    c = Canvas(800, 460, "Dużo publikacji nie znaczy dużo własnej pracy",
               "Materiały na dobę według statusu: unikalne i powielone")
    x0, x1, y0, y1 = 80, 770, 130, 360
    max_v = 6500
    for tick in range(0, 7000, 1000):
        y = y1 - (y1 - y0) * tick / max_v
        c.line(x0, y, x1, y, GRID, 1)
        c.text(x0 - 12, y, _pl(tick), 12, MUTED, "regular", "rm")
    labels = ["Czynny\nunikalny", "Czynny\nsyndykatowy", "Ledwo\nżywy", "Zombie\nautomat", "Martwy"]
    slot = (x1 - x0) / len(STATUS_ORDER)
    bw = 84
    for i, s in enumerate(STATUS_ORDER):
        cx = x0 + slot * (i + 0.5)
        hu = (y1 - y0) * unique[i] / max_v
        hc = (y1 - y0) * clones[i] / max_v
        if hc > 0.4:
            c.rect(cx - bw / 2, y1 - hc, cx + bw / 2, y1, "#C4CFDB")
        if hu > 0.4:
            c.rect(cx - bw / 2, y1 - hc - hu, cx + bw / 2, y1 - hc, f"#{TEAL}")
        top = y1 - hc - hu
        c.text(cx, top - 8, _pl(totals[i]), 15, INK, "bold", "ms")
        for j, line in enumerate(labels[i].split("\n")):
            c.text(cx, y1 + 16 + j * 17, line, 13, INK, "medium", "ma")
        share = f"{unique[i] / totals[i]:.0%}" if totals[i] else "0%"
        c.text(cx, y1 + 56, f"unikalne: {share}", 12, MUTED, "regular", "ma")
    c.line(x0, y1, x1, y1, "#B8C3CF", 1.5)
    c.rect(500, 22, 514, 36, f"#{TEAL}", r=3)
    c.text(522, 29, "unikalne", 13, INK, "regular", "lm")
    c.rect(606, 22, 620, 36, "#C4CFDB", r=3)
    c.text(628, 29, "wspólne lub powielone", 13, INK, "regular", "lm")
    c.save("output_unique.png")


def _fig_barely(xs):
    weak = [p for p in xs if p["vitality_status"] == "LEDWO_ZYWY"]
    dist = Counter(p["daily_articles_count"] for p in weak)
    c = Canvas(800, 400, "Ledwo żywe: od 1 do 4 materiałów na dobę",
               f"Rozkład liczby publikacji dobowych w grupie {len(weak)} portali")
    x0, x1, y0, y1 = 80, 770, 120, 320
    max_v = 28
    for tick in range(0, 30, 5):
        y = y1 - (y1 - y0) * tick / max_v
        c.line(x0, y, x1, y, GRID, 1)
        c.text(x0 - 12, y, str(tick), 12, MUTED, "regular", "rm")
    keys = sorted(dist)
    slot = (x1 - x0) / len(keys)
    for i, k in enumerate(keys):
        cx = x0 + slot * (i + 0.5)
        h = (y1 - y0) * dist[k] / max_v
        c.rect(cx - 52, y1 - h, cx + 52, y1, f"#{OCHRE}", r=8, corners=(True, True, False, False))
        c.text(cx, y1 - h - 8, str(dist[k]), 17, INK, "bold", "ms")
        c.text(cx, y1 + 12, f"{k} na dobę", 14, INK, "medium", "ma")
        c.text(cx, y1 + 32, pct(dist[k], len(weak)), 12, MUTED, "regular", "ma")
    c.line(x0, y1, x1, y1, "#B8C3CF", 1.5)
    c.text(x0, 96, "liczba portali", 12, MUTED)
    c.save("barely_alive.png")


def _fig_regional(xs):
    regional = defaultdict(list)
    for p in xs:
        regional[p["region"]].append(p)
    entries = []
    for region, ps in regional.items():
        if region == "Ogólnopolskie":
            continue
        n = len(ps)
        real = sum(p["vitality_status"] == "AKTYWNY_UNIKALNY" for p in ps) / n * 100
        weak_pct = sum(p["vitality_status"] in {"LEDWO_ZYWY", "ZOMBIE_AUTOMAT", "MARTWY"} for p in ps) / n * 100
        entries.append((region, real, weak_pct, n))
    entries.sort(key=lambda t: -t[1])
    row_h = 28
    h = 175 + row_h * len(entries)
    c = Canvas(800, h, "Regiony: tam, gdzie sieć naprawdę pracuje",
               "Udział portali czynnych i unikalnych oraz słabych lub martwych")
    x0, x1, y0 = 250, 760, 120
    max_v = 80
    for tick in range(0, 100, 20):
        x = x0 + (x1 - x0) * tick / max_v
        c.line(x, y0 - 6, x, y0 + row_h * len(entries), GRID, 1)
        c.text(x, y0 - 12, f"{tick}%", 12, MUTED, "regular", "ms")
    for i, (region, real, weak_pct, n) in enumerate(entries):
        y = y0 + i * row_h + row_h / 2
        if i % 2 == 0:
            c.rect(20, y - row_h / 2 + 1, 780, y + row_h / 2 - 1, "#F6F8FA")
        c.text(x0 - 14, y, region, 13, INK, "medium", "rm")
        xr = x0 + (x1 - x0) * real / max_v
        xw = x0 + (x1 - x0) * weak_pct / max_v
        c.line(min(xr, xw), y, max(xr, xw), y, "#C4CFDB", 3)
        c.circle(xr, y, 6.5, f"#{TEAL}")
        c.circle(xw, y, 6.5, f"#{CORAL}")
        c.text(x1 + 8, y, f"n={n}", 11, MUTED, "regular", "lm")
    ly = y0 + row_h * len(entries) + 28
    c.circle(300, ly, 6.5, f"#{TEAL}")
    c.text(314, ly, "czynne i unikalne", 13, INK, "regular", "lm")
    c.circle(470, ly, 6.5, f"#{CORAL}")
    c.text(484, ly, "słabe lub martwe", 13, INK, "regular", "lm")
    c.save("regional_comparison.png")


def save_figures(audit):
    FIG.mkdir(parents=True, exist_ok=True)
    xs = audit["portals"]
    counts = Counter(x["vitality_status"] for x in xs)
    _fig_status(xs, counts)
    _fig_output(xs)
    _fig_barely(xs)
    _fig_regional(xs)


def build_report():
    data = json.loads(DATA_PATH.read_text())
    provenance = json.loads(PROV_PATH.read_text())
    audit = data["portal_vitality_audit"]
    portals = audit["portals"]
    titles = data["titles"]
    counts = Counter(p["vitality_status"] for p in portals)
    registry_n = len(titles)
    audit_n = len(portals)
    audit_only = sorted({p["domain"] for p in portals} - {t["domain"] for t in titles})
    real = [p for p in portals if p["vitality_status"] == "AKTYWNY_UNIKALNY"]
    synd = [p for p in portals if p["vitality_status"] == "AKTYWNY_SYNDYKAT"]
    barely = [p for p in portals if p["vitality_status"] == "LEDWO_ZYWY"]
    zombies = [p for p in portals if p["vitality_status"] == "ZOMBIE_AUTOMAT"]
    dead = [p for p in portals if p["vitality_status"] == "MARTWY"]
    publishing = real + synd
    technical_active = publishing + zombies
    daily_total = sum(p["daily_articles_count"] for p in portals)
    unique_total = sum(p["unique_articles_count"] for p in portals)
    barely_daily = sum(p["daily_articles_count"] for p in barely)
    barely_unique = sum(p["unique_articles_count"] for p in barely)
    barely_zero_unique = sum(p["unique_articles_count"] == 0 for p in barely)
    barely_median_gap = statistics.median(p["hours_since_last_pub"] for p in barely)
    barely_avg_authors = statistics.mean(p["named_authors_count"] for p in barely)
    synd_daily = sum(p["daily_articles_count"] for p in synd)
    synd_unique = sum(p["unique_articles_count"] for p in synd)
    real_daily = sum(p["daily_articles_count"] for p in real)
    real_unique = sum(p["unique_articles_count"] for p in real)
    zombie_daily = sum(p["daily_articles_count"] for p in zombies)
    zombie_unique = sum(p["unique_articles_count"] for p in zombies)
    unique_weighted = unique_total / daily_total
    type_counts = Counter(p["portal_type"] for p in portals)
    region_counts = Counter(p["region"] for p in portals)
    regional = defaultdict(list)
    for p in portals:
        regional[p["region"]].append(p)
    regional_rows = []
    for region, ps in sorted(regional.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        c = Counter(p["vitality_status"] for p in ps)
        n = len(ps)
        real_share = c["AKTYWNY_UNIKALNY"] / n
        weak_share = (c["LEDWO_ZYWY"] + c["ZOMBIE_AUTOMAT"] + c["MARTWY"]) / n
        regional_rows.append((region, n, c["AKTYWNY_UNIKALNY"], real_share, weak_share, c["AKTYWNY_SYNDYKAT"]))
    regional_sorted_real = sorted(regional_rows, key=lambda r: r[3], reverse=True)
    regional_sorted_weak = sorted(regional_rows, key=lambda r: r[4], reverse=True)

    save_figures(audit)
    doc = setup_document()

    # Cover
    add_cover_band(
        doc,
        "Polska Press Grupa  ·  analiza PPGscope",
        "Żywotność portali\nPolska Press Grupa",
        "Co naprawdę publikuje sieć 546 portali i co tylko wygląda na aktywne",
    )
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(2)
    add_text(p, "Autor analizy i systemu PPGscope: ", size=10.5, color=GRAY)
    add_text(p, AUTHOR, size=10.5, color=NAVY, bold=True)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(34)
    add_text(p, "Stan snapshotu 18 października 2026  ·  audyt żywotności v2.1.0  ·  546 portali w rejestrze, 547 rekordów w audycie", size=9.3, color=GRAY)
    add_metric_table(doc, [
        (str(len(real)), "żywe redakcyjnie", f"{pct(len(real), audit_n)} audytu", TEAL),
        (str(len(synd)), "syndykatowe", f"{pct(len(synd), audit_n)} audytu", BLUE),
        (str(len(barely)), "ledwo żywe", f"{pct(len(barely), audit_n)} audytu", OCHRE),
        (str(len(zombies)), "zombie automaty", f"{pct(len(zombies), audit_n)} audytu", PURPLE),
        (str(len(dead)), "martwe", f"{pct(len(dead), audit_n)} audytu", CORAL),
    ])
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    add_callout(doc, "Najkrótszy wniosek", f"Analiza PPGscope pokazuje sieć portali Polska Press Grupa, która jest duża i technicznie ruchliwa, ale znacznie mniejsza po odjęciu syndykacji i automatyzacji. Tylko {len(real)} z {audit_n} rekordów spełnia jednocześnie kryteria wysokiej unikalności, własnej produkcji i obecności podpisanych dziennikarzy. {len(synd)} kolejnych portali regularnie publikuje, lecz ich strumień jest zdominowany przez wspólne treści. Wąski ogon {len(barely)} portali ledwo podtrzymuje aktywność, a {len(dead)} nie publikuje wcale.")
    doc.add_page_break()

    # Executive summary
    add_heading(doc, "Wniosek zarządczy", 1, kicker="01  ·  Podsumowanie")
    add_body(doc, f"Jeżeli przez żywy portal rozumiemy miejsce, w którym widać własną, regularną pracę redakcyjną, sieć ma około {pct(len(real), audit_n)} takich punktów. Jeżeli wystarczy, że portal publikuje cokolwiek, wynik rośnie do {pct(len(technical_active), audit_n)}. Ta różnica wynosząca {pct(len(technical_active) - len(real), audit_n)} całej sieci opisuje sedno zjawiska: część skali jest tworzona przez dystrybucję wspólnego materiału albo przez mechaniczny rytm CMS, a nie przez równoległe lokalne newsroomy.")
    add_body(doc, f"W audycie sieć emituje {pl_num(daily_total)} materiałów na dobę, z czego {pl_num(unique_total)} zostało zaklasyfikowanych jako unikalne po deduplikacji MinHash. To {pct(unique_total, daily_total)} w ujęciu ważonym. Średnia unikalność raportowana w panelu wynosi {pl_num(audit['network_avg_uniqueness_pct'], 1)}%, ponieważ jest średnią prostą po portalach; nie należy jej mieszać z udziałem unikalnych materiałów w całym wolumenie.")
    add_bullet(doc, f"Największa grupa to portale czynne syndykatowo: {len(synd)} rekordy i {pl_num(synd_daily)} materiałów na dobę, ale tylko {pl_num(synd_unique)} unikalnych.")
    add_bullet(doc, f"Grupa ledwo żywa publikuje {pl_num(barely_daily)} materiałów na dobę. {barely_zero_unique} z {len(barely)} portali nie ma w próbce ani jednego materiału unikalnego.")
    add_bullet(doc, f"Portale zombie mają większy wolumen niż ledwo żywe, lecz tylko {pct(zombie_unique, zombie_daily)} ich materiałów jest unikalnych, a w audycie nie ma w nich ani jednego podpisanego autora.")
    add_bullet(doc, f"Sieć jest silnie skupiona na lokalnych serwisach Nasze Miasto: {type_counts['NASZEMIASTO_LOKALNY']} z {audit_n} rekordów audytu.")

    add_heading(doc, "Jak czytać kategorie", 2)
    add_body(doc, "Kategorie nie są oceną jakości tekstów ani dowodem na istnienie lub brak konkretnej redakcji. Są sygnałami z audytu technicznego i treściowego: liczba publikacji, podobieństwo materiałów, udział wpisów o regularnych minutach, obecność podpisanych autorów oraz czas od ostatniej publikacji. W szczególności wysoka syndykacja opisuje sposób dystrybucji, a nie rozstrzyga, gdzie powstał każdy tekst.")
    add_table(doc, ["Kategoria", "Liczba", "Udział", "Jak ją rozumieć"], [1.42, 0.75, 0.75, 4.35], rows=[
        (STATUS_LABELS[s], counts[s], pct(counts[s], audit_n), audit["status_breakdown"][s]["criteria"]) for s in STATUS_ORDER
    ], font_size=8.8)
    doc.add_page_break()

    # The network shape
    add_heading(doc, "Sieć jest aktywna głównie na papierze", 1, kicker="02  ·  Skala")
    add_body(doc, f"Rozkład statusów tworzy trzy warstwy. Pierwsza to {len(real)} portali, które łączą regularny rytm publikacji z relatywnie wysoką unikalnością i podpisanym autorstwem. Druga to {len(synd)} portali, które są widoczne i często publikują, lecz działają przede wszystkim jako końcówki wspólnego strumienia. Trzecia obejmuje {len(barely)} portali ledwo żywych, {len(zombies)} automatów i {len(dead)} rekordów martwych. Razem to {len(barely) + len(zombies) + len(dead)} rekordów, czyli {pct(len(barely) + len(zombies) + len(dead), audit_n)} audytu.")
    doc.add_picture(str(FIG / "status_breakdown.png"), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Rysunek 1. Statusy żywotności według audytu PPGscope. Udziały liczone względem 547 rekordów audytu.")
    add_body(doc, f"Najważniejszy kontrast widać między liczbą portali a ich wkładem redakcyjnym. Grupa czynna i unikalna stanowi {pct(len(real), audit_n)} rekordów, ale generuje {pct(real_daily, daily_total)} całego wolumenu i {pct(real_unique, unique_total)} materiałów unikalnych. Z kolei syndykat stanowi {pct(len(synd), audit_n)} rekordów i dostarcza {pct(synd_daily, daily_total)} wolumenu, lecz tylko {pct(synd_unique, unique_total)} unikalnej produkcji.")
    doc.add_picture(str(FIG / "output_unique.png"), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Rysunek 2. Wolumen dobowy według statusu. Zielony segment pokazuje materiały unikalne w audycie, szary wspólne lub powielone.")
    add_body(doc, "To dlatego sama liczba publikacji może prowadzić do błędnego wniosku o kondycji sieci. Portal z dziesięcioma wpisami dziennie może wyglądać zdrowiej niż portal z trzema, ale oba mogą mieć zbliżony poziom własnej pracy. W danych PPGscope ważniejsze od samego tempa jest to, ile z tego tempa zostaje po deduplikacji i czy za publikacją widać autorstwo.")

    # Barely alive
    add_heading(doc, "Ledwo żywe portale są długim ogonem sieci", 1, kicker="03  ·  Ogon sieci")
    add_body(doc, f"W grupie {len(barely)} portali ledwo żywych mediana wynosi {statistics.median(p['daily_articles_count'] for p in barely):.0f} materiały dziennie, a średnia {pl_num(statistics.mean(p['daily_articles_count'] for p in barely), 2)}. W całej grupie daje to {pl_num(barely_daily)} publikacji na dobę, lecz tylko {pl_num(barely_unique)} unikalnych. Mediana przerwy od ostatniej publikacji to {pl_num(barely_median_gap, 1)} godziny, a średnia liczba podpisanych autorów wynosi {pl_num(barely_avg_authors, 2)} na portal. To obraz serwisów, które formalnie jeszcze nadają, lecz robią to rzadko i bez stabilnej własnej produkcji.")
    doc.add_picture(str(FIG / "barely_alive.png"), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Rysunek 3. Rozkład liczby materiałów na dobę w grupie ledwo żywych portali.")
    add_table(doc, ["Wskaźnik", "Wynik", "Udział", "Co z tego wynika"], [1.55, 1.0, 1.0, 3.25], rows=[
        ("Portale w grupie", len(barely), f"{pct(len(barely), audit_n)} audytu", "To osobna, wyraźna warstwa, a nie pojedyncze anomalie."),
        ("Publikacje na dobę", pl_num(barely_daily), f"{pct(barely_daily, daily_total)} całej sieci", "Skala jest mała mimo 61 adresów."),
        ("Materiały unikalne", pl_num(barely_unique), f"{pct(barely_unique, barely_daily)} grupy", "Własna produkcja jest śladowa."),
        ("Bez unikalnego materiału", barely_zero_unique, f"{pct(barely_zero_unique, len(barely))} grupy", "Dla większości aktywność nie oznacza lokalnego tekstu."),
        ("Mediana przerwy", f"{pl_num(barely_median_gap, 1)} h", "od ostatniej publikacji", "Rytm jest nieregularny i często przekracza dobę."),
    ], font_size=8.9)
    add_callout(doc, "Jak to czytać", "Najbezpieczniejsza interpretacja brzmi więc: to portale podtrzymywane przy życiu, niekoniecznie portale z działającym newsroomem. PPGscope nie pozwala na podstawie tego snapshotu powiedzieć, czy konkretny adres jest przeznaczony do zamknięcia, przekierowania albo odbudowy. Pozwala za to wskazać grupę do ręcznego przeglądu i odróżnić ją od sieci regularnie produkującej lokalne materiały.", accent=OCHRE, fill="FBF3E0")
    doc.add_page_break()

    # Regional
    add_heading(doc, "Rozkład regionalny nie jest równy", 1, kicker="04  ·  Regiony")
    add_body(doc, "Różnice między regionami są duże, ale należy je czytać razem z liczebnością próby. Najwyższy udział portali czynnych i unikalnych ma kategoria Ogólnopolski, jednak obejmuje tylko 17 rekordów. Wśród województw wyróżniają się Zachodniopomorskie i Pomorskie. Na drugim końcu znajdują się Opolskie, Warmińsko-Mazurskie i Mazowieckie, gdzie udział portali rzeczywiście żywych jest wyraźnie niższy.")
    doc.add_picture(str(FIG / "regional_comparison.png"), width=Inches(FIGURE_WIDTH))
    add_caption(doc, "Rysunek 4. Udział portali czynnych i unikalnych oraz słabych lub martwych. Pominięto etykietę „Ogólnopolskie”, która ma tylko jeden rekord (kategoria „Ogólnopolski” ma ich 17).")
    top_real = regional_sorted_real[:4]
    top_weak = regional_sorted_weak[:4]
    add_table(doc, ["Region", "Rekordy", "Czynne i unikalne", "Słabe lub martwe", "Czynne syndykatowo"], [1.8, 0.75, 1.35, 1.25, 1.45], rows=[
        (r, n, f"{c}  |  {share:.1%}".replace(".", ","), f"{weak:.1%}".replace(".", ","), f"{syn}  |  {syn/n:.1%}".replace(".", ",")) for r, n, c, share, weak, syn in sorted(regional_rows, key=lambda x: x[3], reverse=True)
    ], font_size=8.6)
    add_body(doc, f"Warto zauważyć, że Mazowieckie ma największą liczbę rekordów ({region_counts['Mazowieckie']}), ale tylko {regional_rows[[r[0] for r in regional_rows].index('Mazowieckie')][2]} z nich trafia do kategorii czynnych i unikalnych. Lubelskie ma z kolei {sum(p['region']=='Lubelskie' and p['vitality_status']=='LEDWO_ZYWY' for p in portals)} portali ledwo żywych, czyli najwięcej spośród wszystkich regionów w tym snapshotcie (Mazowieckie: {sum(p['region']=='Mazowieckie' and p['vitality_status']=='LEDWO_ZYWY' for p in portals)}). Regiony różnią się więc nie tylko liczbą adresów, ale też strukturą ich aktywności.")
    add_heading(doc, "Gdzie zacząć ręczną weryfikację", 2)
    add_body(doc, f"Jeśli raport ma służyć do dalszej pracy operacyjnej, pierwszeństwo powinny mieć trzy grupy: {len(dead)} rekordów martwych, {len(zombies)} automatów z zerową lub niemal zerową unikalnością oraz {len(barely)} portali ledwo żywych z przerwą publikacyjną przekraczającą dobę. Dopiero potem opłaca się rozstrzygać, czy część grupy syndykatowej zasługuje na osobne traktowanie jako lokalna redakcja korzystająca z centralnego feedu.")

    # Mechanism
    add_heading(doc, "Co wyjaśnia to zjawisko", 1, kicker="05  ·  Wyjaśnienie")
    add_body(doc, "Dane układają się w model sieci z centralnym źródłem treści i długim ogonem lokalnych adresów. Duża grupa portali może publikować często, ponieważ otrzymuje wspólny materiał. To zwiększa zasięg dystrybucji i widoczność sieci, ale nie zwiększa proporcjonalnie liczby niezależnych tematów, reporterów ani lokalnych decyzji redakcyjnych.")
    add_body(doc, "Drugi mechanizm to automatyzacja rytmu publikacji. W grupie zombie średnio {0}% materiałów przypada na teksty powielone, a {1}% wpisów pojawia się w regularnych minutach według audytu. Taki wzór jest sygnałem mechanicznego zasilania CMS. Sam w sobie nie jest dowodem, że każdy wpis powstał bez udziału człowieka, dlatego w raporcie nazywam go sygnałem automatyzacji, a nie rozstrzygnięciem.".format(pl_num(statistics.mean(p["syndicated_clones_pct"] for p in zombies), 1), pl_num(statistics.mean(p["cron_scheduled_pct"] for p in zombies), 1)))
    add_body(doc, "Trzeci mechanizm to utrzymywanie lokalnej obecności przy minimalnej produkcji. Portale ledwo żywe pozostają w rejestrze, mają pojedyncze publikacje i często długie przerwy. Z punktu widzenia mapy sieci wciąż istnieją. Z punktu widzenia codziennej pracy redakcyjnej ich wkład jest jednak mały albo zerowy.")
    add_callout(doc, "Jakiej pomyłki unikać", "Nie należy utożsamiać aktywności technicznej z żywotnością redakcyjną. Licznik publikacji odpowiada na pytanie, czy coś zostało opublikowane. Unikalność, autorstwo i rytm odpowiadają na pytanie, czy za tym strumieniem widać własną pracę. Właśnie połączenie tych sygnałów pozwala oddzielić żywy portal od adresu, który tylko utrzymuje pozór ciągłego działania.", accent=CORAL, fill="FCEDE8")

    # Method and limitations
    add_heading(doc, "Metoda i granice wniosku", 1, kicker="06  ·  Metoda")
    add_callout(doc, "Uwaga o danych", "Raport powstał na podstawie lokalnego payloadu data/dashboard.json, który PPGscope oznacza jako Snapshot demonstracyjny oraz PRECOMPUTED / FIXTURE. Rejestr domen pochodzi z konfiguracji zweryfikowanych serwisów, natomiast artykuły i część wskaźników są prekompilowanym rozkładem demonstracyjnym. Snapshot nie jest bieżącym pomiarem każdego wydawcy.", accent=NAVY, fill=TINT_NAVY)
    add_body(doc, f"PPGscope to autorski system analizy, a {AUTHOR} jest autorem tej analizy. Przedmiotem badania są portale należące do Polska Press Grupa.")
    add_body(doc, "Audyt żywotności opisuje metodologię jako zewnętrzny audyt HTTP, RSS i sitemap, deduplikację MinHash przy J >= 0,80 oraz detekcję automatów CMS. W praktyce oznacza to porównanie podobieństwa treści i obserwowalnych sygnałów publikacji. Wyniki są przydatne do segmentacji i wyboru obiektów do sprawdzenia, ale nie zastępują audytu redakcyjnego, analityki odbiorców ani danych o przychodach.")
    add_table(doc, ["Co raport pokazuje", "Czego nie rozstrzyga"], [3.15, 3.25], rows=[
        ("Liczbę rekordów w statusach żywotności", "Czy konkretny tekst jest plagiatem lub kto jest jego pierwotnym autorem"),
        ("Wolumen publikacji i udział materiałów unikalnych", "Ruch, CTR, zasięg, subskrypcje i konwersję"),
        ("Sygnały syndykacji i automatyzacji", "Czy każda publikacja o pełnej minucie była w pełni automatyczna"),
        ("Czas od ostatniej publikacji w snapshotcie", "Bieżący stan domen po 18 października 2026"),
        ("Różnice między regionami", "Przyczynę różnic ani opłacalność poszczególnych adresów"),
    ], font_size=8.9)
    add_heading(doc, "Niespójność liczby portali", 2)
    add_body(doc, f"W interfejsie i rejestrze PPGscope widocznych jest {registry_n} portali. Moduł audytu żywotności zawiera {audit_n} rekordów, ponieważ dodatkowo obejmuje domenę {audit_only[0] if audit_only else 'poza rejestrem'}, oznaczoną jako martwa. Dlatego w tabelach statusowych zachowuję mianownik 547, którego używa sam audyt, a w tytule i opisie odnoszę się do 546 portali z rejestru. To drobna różnica techniczna, ale warto ją zachować, żeby nie ukrywać jakości danych wejściowych.")

    # Appendix
    doc.add_page_break()
    add_heading(doc, "Aneks: najważniejsze liczby", 1, kicker="07  ·  Aneks")
    add_table(doc, ["Wskaźnik", "Wynik", "Źródło w snapshotcie"], [1.8, 1.25, 3.35], rows=[
        ("Rejestr portali", registry_n, "dashboard.json titles"),
        ("Rekordy audytu żywotności", audit_n, "portal_vitality_audit portals"),
        ("Publikacje sieci na dobę", pl_num(daily_total), "portal_vitality_audit network_daily_articles"),
        ("Unikalne publikacje sieci na dobę", pl_num(unique_total), "portal_vitality_audit network_unique_daily_articles"),
        ("Średnia unikalność po portalach", f"{pl_num(audit['network_avg_uniqueness_pct'], 1)}%", "portal_vitality_audit network_avg_uniqueness_pct"),
        ("Portale typu Nasze Miasto", type_counts["NASZEMIASTO_LOKALNY"], "portal_vitality_audit portal_type"),
        ("Data wygenerowania snapshotu", "18 października 2026", "dashboard.json generated_at"),
    ], font_size=8.9)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(0)
    add_text(p, "Plik źródłowy raportu: data/dashboard.json. Raport nie pobierał nowych danych z sieci i nie powinien być opisywany jako pomiar LIVE.", size=8.5, color=GRAY, italic=True)

    OUT.mkdir(parents=True, exist_ok=True)
    doc.save(REPORT_PATH)
    print(REPORT_PATH)


if __name__ == "__main__":
    build_report()
