import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
export const maxDuration = 90;

export async function GET(request: NextRequest) {
  const baseDir = path.resolve(process.cwd(), "..");
  const dataFile = path.join(process.cwd(), "public", "data", "local_benchmark.json");
  const refreshRequested = request.nextUrl.searchParams.get("refresh") === "true";

  if (refreshRequested) {
    const scriptPath = path.join(baseDir, "scripts", "refresh_local_benchmark_live.py");
    const venvPython = path.join(baseDir, ".venv", "bin", "python");
    const pythonBin = fs.existsSync(venvPython) ? venvPython : "python3";

    if (fs.existsSync(scriptPath)) {
      try {
        const { stdout } = await execAsync(`${pythonBin} "${scriptPath}"`, {
          cwd: baseDir,
          timeout: 85000,
        });

        if (fs.existsSync(dataFile)) {
          const freshData = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
          return NextResponse.json(
            {
              ok: true,
              benchmark: freshData,
              message: "Pomyślnie wykonano skan live czołówek przez Chromium Puppeteer.",
              output: stdout.slice(-400),
            },
            { headers: { "Cache-Control": "no-store" } }
          );
        }
      } catch (err) {
        console.warn("Błąd wykonania skryptu refresh_local_benchmark_live:", err);
      }
    }
  }

  // Odczyt z pliku statycznego
  if (fs.existsSync(dataFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
      return NextResponse.json({ ok: true, benchmark: data }, { headers: { "Cache-Control": "no-store" } });
    } catch (readErr) {
      console.error("Błąd odczytu local_benchmark.json:", readErr);
    }
  }

  return NextResponse.json({ ok: false, error: "Brak danych benchmarku." }, { status: 404 });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
