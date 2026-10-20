import React from "react";
import { Info } from "lucide-react";

export function MethodologyView() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4 text-xs font-mono leading-relaxed text-zinc-300">
      <h2 className="text-base font-bold text-white flex items-center gap-2">
        <Info className="h-4 w-4 text-teal-400" /> Standard Kategoryzacji Tematycznej i Lokalności v2.0
      </h2>

      <div className="space-y-3">
        <p>
          <strong>1. 18 Dziedzin tematycznych:</strong> Zamknięta taksonomia 18 dziedzin (od 01 wladza do 18 swiat). Każdy artykuł otrzymuje dokładnie jedną domenę główną (domain) oraz opcjonalnie maksymalnie jedną domenę poboczną (domain_secondary).
        </p>
        <p>
          <strong>2. Warianty lokalności:</strong>
          <br />• <strong>L (lokalne):</strong> Podmiotem w tytule lub leadzie jest miejscowość, osoba albo instytucja z obszaru danego tytułu prasowego, a sprawa ma źródło lokalne.
          <br />• <strong>CL (centralne z rozwinięciem lokalnym):</strong> Sprawa ogólnokrajowa lub światowa (np. ustawa, decyzje rządu, inflacja, stopy NBP) zilustrowana przykładem, danymi lub mieszkańcami z obszaru tytułu.
          <br />• <strong>C (centralne):</strong> Brak lokalnego podmiotu z obszaru tytułu.
          <br />• <strong>other_region = true:</strong> Tekst o sprawie z regionu innego tytułu PPG (np. sprawa ze Śląska w Gazecie Pomorskiej) otrzymuje wariant C oraz znacznik innego regionu.
        </p>
        <p>
          <strong>3. Dwa kluczowe wskaźniki pod wykresem:</strong>
          <br />• <strong>Udział treści lokalnej = (L + CL) / wszystkie</strong> – odsetek materiałów posiadających jakikolwiek wymiar lokalny.
          <br />• <strong>Wskaźnik lokalizacji = CL / (C + CL)</strong> – zdolność redakcji do przekładania spraw centralnych na poziom lokalny.
        </p>
      </div>
    </div>
  );
}
