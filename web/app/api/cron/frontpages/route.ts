import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
export const maxDuration = 90;

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const baseDir = path.resolve(process.cwd(), "..");
  const scriptPath = path.join(baseDir, "scripts", "cron_refresh_frontpages.py");
  const venvPython = path.join(baseDir, ".venv", "bin", "python");
  const pythonBin = fs.existsSync(venvPython) ? venvPython : "python3";

  try {
    if (fs.existsSync(scriptPath)) {
      const { stdout, stderr } = await execAsync(`${pythonBin} "${scriptPath}"`, {
        cwd: baseDir,
        timeout: 85000,
      });

      return NextResponse.json(
        {
          ok: true,
          message: "Frontpages audit cycle completed.",
          output: stdout.slice(-500),
          executed_at: new Date().toISOString(),
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    } else {
      // Fallback odczytu z pliku danych w trybie serverless
      const dataFile = path.join(process.cwd(), "public", "data", "dashboard.json");
      if (fs.existsSync(dataFile)) {
        const d = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
        return NextResponse.json({
          ok: true,
          mode: "read_cached",
          audit: d.editorial_intelligence?.editorial_autonomy_audit || null,
        });
      }
      return NextResponse.json({ ok: false, error: "Script not found." }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Frontpage refresh failed.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
