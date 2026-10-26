import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/api-auth";
import type { GeneratedReportData } from "../../../../lib/investigation-report";

export const maxDuration = 30;

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateWordHtml(report: GeneratedReportData): string {
  const casesRows = report.headlineCases
    .map(
      (c) => `
      <tr>
        <td style="padding: 6pt; border: 1pt solid #D9E0E7; font-size: 8.5pt;"><b>${escapeHtml(c.source)}</b></td>
        <td style="padding: 6pt; border: 1pt solid #D9E0E7; font-size: 8.5pt;">${escapeHtml(c.headline)}</td>
        <td style="padding: 6pt; border: 1pt solid #D9E0E7; font-size: 8.5pt;">${escapeHtml(c.protagonist)}</td>
        <td style="padding: 6pt; border: 1pt solid #D9E0E7; font-size: 8.5pt;">${escapeHtml(c.impact)}</td>
      </tr>
    `
    )
    .join("");

  const metricsCards = report.keyMetrics
    .map(
      (m) => `
      <td style="width: 25%; padding: 8pt; border: 1pt solid #D9E0E7; background-color: #F4F6F8; vertical-align: top;">
        <div style="font-size: 7.5pt; text-transform: uppercase; color: #59636E; font-weight: bold;">${escapeHtml(m.label)}</div>
        <div style="font-size: 16pt; font-weight: bold; color: #0F2747; margin: 4pt 0;">${escapeHtml(m.value)}</div>
        <div style="font-size: 7.5pt; color: #59636E;">${escapeHtml(m.sublabel)}</div>
      </td>
    `
    )
    .join("");

  const correctionsRows = report.editorialCorrections
    .map(
      (ec) => `
      <tr>
        <td style="padding: 6pt; border: 1pt solid #D9E0E7; font-size: 8.5pt; font-weight: bold; color: #0F2747;">${escapeHtml(ec.element)}</td>
        <td style="padding: 6pt; border: 1pt solid #D9E0E7; font-size: 8.5pt; color: #E76F51;">${escapeHtml(ec.ppgMistake)}</td>
        <td style="padding: 6pt; border: 1pt solid #D9E0E7; font-size: 8.5pt; color: #2F6B9A;">${escapeHtml(ec.recommendedCorrection)}</td>
        <td style="padding: 6pt; border: 1pt solid #D9E0E7; font-size: 8.5pt; color: #2A9D8F; font-weight: bold;">${escapeHtml(ec.expectedGain)}</td>
      </tr>
    `
    )
    .join("");

  const strategicLossesList = report.strategicLosses
    .map(
      (sl) => `
      <li style="margin-bottom: 4pt; font-size: 9pt; color: #1B2430;">${escapeHtml(sl)}</li>
    `
    )
    .join("");

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(report.topicTitle)}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4 portrait;
          margin: 2cm 2cm 2cm 2cm;
          mso-header-margin: 1cm;
          mso-footer-margin: 1cm;
        }
        body {
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.25;
          color: #1B2430;
        }
        h1 {
          font-size: 16pt;
          color: #0F2747;
          border-bottom: 2pt solid #E76F51;
          padding-bottom: 4pt;
          margin-top: 10pt;
          margin-bottom: 6pt;
        }
        h2 {
          font-size: 12pt;
          color: #2F6B9A;
          border-bottom: 1pt solid #D9E0E7;
          padding-bottom: 2pt;
          margin-top: 14pt;
          margin-bottom: 6pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 6pt 0 10pt 0;
        }
        th {
          background-color: #0F2747;
          color: #FFFFFF;
          font-size: 8pt;
          text-align: left;
          padding: 6pt;
          border: 1pt solid #0F2747;
        }
      </style>
    </head>
    <body>
      <div style="font-size: 8pt; font-weight: bold; color: #E76F51; text-transform: uppercase; letter-spacing: 1pt; margin-bottom: 2pt;">
        PPGSCOPE · STUDIO RAPORTÓW ŚLEDCZYCH I WIZERUNKOWYCH
      </div>
      <h1>${escapeHtml(report.topicTitle)}</h1>
      <div style="font-size: 8.5pt; color: #59636E; margin-bottom: 10pt;">
        Kąt analityczny: <b>${escapeHtml(report.angleLabel)}</b> · Źródło: <b>${escapeHtml(report.sourceInfo.sourceLabel)}</b> · Status: <b>${report.sourceInfo.status}</b>
      </div>

      <div style="background-color: #EAF0F7; border-left: 4pt solid #0F2747; padding: 10pt 12pt; margin-bottom: 12pt;">
        <div style="font-size: 9pt; font-weight: bold; color: #0F2747; margin-bottom: 3pt;">SYNTEZA ANALITYCZNA DLA DECYDENTÓW</div>
        <div style="font-size: 9.5pt; line-height: 1.3;">${escapeHtml(report.summaryExecutive)}</div>
      </div>

      <h2>1. Kluczowe wskaźniki empiryczne</h2>
      <table>
        <tr>
          ${metricsCards}
        </tr>
      </table>

      <h2>2. Zarejestrowane materiały w sieci Polska Press</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Portal / Medium</th>
            <th style="width: 40%;">Tytuł nagłówka</th>
            <th style="width: 18%;">Główny aktor</th>
            <th style="width: 20%;">Wydźwięk / Charakter</th>
          </tr>
        </thead>
        <tbody>
          ${casesRows || '<tr><td colspan="4" style="padding: 8pt; text-align: center; color: #59636E;">Brak jednostkowych nagłówków w bazie</td></tr>'}
        </tbody>
      </table>

      <h2>3. Identyfikacja strat wizerunkowych i asymetrii przekazu</h2>
      <ul>
        ${strategicLossesList}
      </ul>

      <h2>4. Rekomendacje redakcyjne i naprawcze</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 20%;">Element</th>
            <th style="width: 30%;">Zdiagnozowany błąd PPG</th>
            <th style="width: 30%;">Rekomendowana korekta</th>
            <th style="width: 20%;">Oczekiwany zysk</th>
          </tr>
        </thead>
        <tbody>
          ${correctionsRows}
        </tbody>
      </table>

      <div style="margin-top: 20pt; padding-top: 8pt; border-top: 1pt solid #D9E0E7; font-size: 7.5pt; color: #59636E; text-align: center;">
        Raport wygenerowany przez system PPGscope · Prawda danych ponad wszystko · Wygenerowano: ${new Date().toLocaleString("pl-PL")}
      </div>
    </body>
    </html>
  `;
}

export async function POST(req: NextRequest) {
  const unauthorized = requireApiSession(req);
  if (unauthorized) return unauthorized;

  try {
    const reportData: GeneratedReportData = await req.json();
    if (!reportData || !reportData.topicTitle) {
      return NextResponse.json({ ok: false, error: "Brak danych raportu do eksportu." }, { status: 400 });
    }

    const htmlContent = generateWordHtml(reportData);
    const safeSlug = reportData.topicTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 35);
    const filename = `Raport_PPGscope_${safeSlug}.doc`;

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Błąd eksportu dokumentu." },
      { status: 500 }
    );
  }
}
