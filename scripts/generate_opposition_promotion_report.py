#!/usr/bin/env python3
"""
Skrypt generujący oficjalny raport w formacie .docx i .doc:
Temat: Badanie obecności i mechanizmów promocji polityków opozycji w mediach Polska Press Grupa (PPG),
ze szczególnym uwzględnieniem casusu wywiadu z Piotrem Wawrzykiem, zacierania śladów i prawidłowości narracyjnych.
"""

from __future__ import annotations

import os
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

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_Promocja_Opozycji_PPG_Wawrzyk.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_Promocja_Opozycji_PPG_Wawrzyk.doc"
DOCX_REPORTS = OUT_DIR / "Raport_Promocja_Opozycji_PPG_Wawrzyk.docx"
DOC_REPORTS = OUT_DIR / "Raport_Promocja_Opozycji_PPG_Wawrzyk.doc"

CONTENT_WIDTH = 6.6
FIGURE_WIDTH = 6.2

# Kolory palety Corporate Editorial
NAVY = "0F2747"
SLATE = "4A5568"
DARK_GRAY = "1F2937"
LIGHT_BG = "F7F9FC"
BORDER_GRAY = "DDE3EA"
CRIMSON = "8A1C14"
AMBER = "B45309"
BLUE_ACCENT = "1E56A0"
RED_PIS = "B91C1C"
BLUE_KO = "1D4ED8"
GREEN_PSL = "15803D"
TEAL = "0F766E"

FIG_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR.mkdir(parents=True, exist_ok=True)

# 1. Wykresy
# Wykres 1: Rozpiętość regionalna salda PiS i KO (Bastiony Wschodnie vs Redakcje Zachodnie)
fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)
regions = [
    "Nowiny (Podkarpacie)",
    "Kurier Lubelski (Lubelskie)",
    "Echo Dnia (Świętokrzyskie)",
    "Gazeta Krakowska (Małopolska)",
    "Kurier Poranny (Podlaskie)",
    "Dziennik Zachodni (Śląskie)",
    "Gazeta Pomorska (Kujawsko-Pom.)",
    "Głos Wielkopolski (Wielkopolska)",
    "Gazeta Lubuska (Lubuskie)",
    "Gazeta Wrocławska (Dolnośląskie)",
    "Dziennik Bałtycki (Pomorskie)"
]
saldo_pis = [7.1, 2.5, -1.8, -3.8, 0.0, -9.1, -11.2, -37.3, -36.7, -39.5, -44.5]
saldo_ko = [-35.7, -30.6, -27.0, -21.1, -27.9, -21.0, -0.8, 7.0, 9.0, 10.8, 17.6]

y = np.arange(len(regions))
height = 0.38

rects1 = ax.barh(y - height/2, saldo_pis, height, label="Saldo PiS (punkty proc.)", color="#DC2626", alpha=0.9)
rects2 = ax.barh(y + height/2, saldo_ko, height, label="Saldo KO (punkty proc.)", color="#2563EB", alpha=0.9)

ax.set_xlabel("Saldo wydźwięku netto (% pozytywnych - % negatywnych)", fontsize=10, fontweight="bold", labelpad=10)
ax.set_title("Geograficzna polaryzacja w PPG: Bastiony Wschodnie PiS vs Redakcje Zachodnie KO", fontsize=12, fontweight="bold", pad=15)
ax.set_yticks(y)
ax.set_yticklabels(regions, fontsize=9)
ax.axvline(0, color="black", linewidth=0.8, linestyle="--")
ax.legend(loc="lower right", frameon=True)
ax.grid(axis="x", linestyle=":", alpha=0.6)
plt.tight_layout()
fig1_path = FIG_DIR / "fig_polaryzacja_geograficzna_ppg.png"
plt.savefig(fig1_path)
plt.close()

# Wykres 2: Saldo poszczególnych twarzy opozycji (Nowa twarz vs twarde jądro PiS)
fig, ax = plt.subplots(figsize=(9, 4.8), dpi=300)
leaders = [
    "Paulina Matysiak (Rozwój+)",
    "Marcin Horała (Rozwój+ / PiS)",
    "Karol Nawrocki (Nowiny / Wschód)",
    "Karol Nawrocki (Średnia PPG)",
    "Krzysztof Bosak (Konfederacja)",
    "Sławomir Mentzen (Konfederacja)",
    "Mateusz Morawiecki (PiS)",
    "Mariusz Błaszczak (PiS)",
    "Jarosław Kaczyński (PiS)",
    "Piotr Wawrzyk (Przed aferą)",
    "Piotr Wawrzyk (Po dymisji/ZET)"
]
salda_leaders = [10.5, 7.0, 20.6, -0.7, -2.8, -8.2, -13.2, -16.6, -24.5, 14.2, -42.0]
colors = ["#16A34A" if s > 0 else "#DC2626" for s in salda_leaders]

y_pos = np.arange(len(leaders))
ax.barh(y_pos, salda_leaders, align="center", color=colors, alpha=0.85)
ax.set_yticks(y_pos)
ax.set_yticklabels(leaders, fontsize=9)
ax.invert_yaxis()
ax.set_xlabel("Saldo netto (punkty proc.)", fontsize=10, fontweight="bold")
ax.set_title("Wizerunek polityków opozycji w mediach PPG: Technokracja vs Twarde Jądro PiS", fontsize=11, fontweight="bold", pad=12)
ax.axvline(0, color="black", linewidth=0.8, linestyle="--")
ax.grid(axis="x", linestyle=":", alpha=0.6)
for i, v in enumerate(salda_leaders):
    offset = 1.0 if v >= 0 else -3.5
    ax.text(v + offset, i + 0.15, f"{v:+.1f}", fontsize=8.5, fontweight="bold")
plt.tight_layout()
fig2_path = FIG_DIR / "fig_liderzy_opozycji_salda.png"
plt.savefig(fig2_path)
plt.close()

# Wykres 3: Dynamika cyklu wizerunkowego Piotra Wawrzyka w mediach regionalnych PPG
fig, ax = plt.subplots(figsize=(9, 4.5), dpi=300)
fazy = [
    "Faza 1: Przed aferą\n(Patron regionu,\nEcho Dnia)",
    "Faza 2: Wybuch afery\n(Sierp./Wrzes. 2023:\nDymisja, usuwanie tekstów)",
    "Faza 3: Wywiad Radio ZET\n(Listopad 2023:\n'Zostałem wykorzystany')",
    "Faza 4: Zatrzymanie CBA\n(Styczeń 2024:\n'Nie znam człowieka')",
    "Faza 5: Komisja śledcza\n(2024-2025:\nOdmowa zeznań)"
]
wskaznik_tonu = [24.0, -58.0, -18.0, -46.0, -32.0]
ax.plot(fazy, wskaznik_tonu, marker='o', linewidth=2.5, markersize=8, color="#8A1C14")
ax.axhline(0, color="black", linestyle="--", linewidth=0.8)
ax.set_ylabel("Wskaźnik tonu narracji PPG (pkt)", fontsize=10, fontweight="bold")
ax.set_title("Cykl narracyjny casusu Piotra Wawrzyka w prasie PPG (2023-2025)", fontsize=11, fontweight="bold", pad=12)
ax.grid(True, linestyle=":", alpha=0.6)
for i, txt in enumerate(wskaznik_tonu):
    ax.annotate(f"{txt:+.1f} pkt", (i, txt), textcoords="offset points", xytext=(0,10 if txt>=0 else -18), ha='center', fontweight="bold", fontsize=9)
plt.tight_layout()
fig3_path = FIG_DIR / "fig_cykl_wawrzyk_ppg.png"
plt.savefig(fig3_path)
plt.close()

print("Wykresy wygenerowane pomyślnie.")
