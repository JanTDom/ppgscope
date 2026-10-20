import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

interface DailyPoint {
  date: string;
  label: string;
  total: number;
  polityka: number;
  gospodarka: number;
  spoleczenstwo: number;
  sport: number;
  lokalne: number;
  prawo: number;
}

describe("Timeseries & Topic Mix Integrity", () => {
  it("wczytuje dane publiczne i sprawdza sumowanie tematów do 100% dla każdego dnia", () => {
    const jsonPath = path.resolve(process.cwd(), "public/data/dashboard.json");
    assert.ok(fs.existsSync(jsonPath), "dashboard.json musi istnieć w public/data");

    const content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const timeseries: DailyPoint[] = content.daily_timeseries;
    assert.ok(Array.isArray(timeseries) && timeseries.length >= 365, "Timeseries musi mieć co najmniej 365 dni");

    for (const point of timeseries) {
      const sum =
        point.lokalne +
        point.sport +
        point.prawo +
        point.gospodarka +
        point.spoleczenstwo +
        point.polityka;

      assert.strictEqual(
        sum,
        point.total,
        `Suma tematów (${sum}) musi być równa total (${point.total}) dla daty ${point.date}`
      );
    }
  });

  it("zapewnia zróżnicowany miks tematów dzień po dniu (brak sztucznej identyczności)", () => {
    const jsonPath = path.resolve(process.cwd(), "public/data/dashboard.json");
    const content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const timeseries: DailyPoint[] = content.daily_timeseries.slice(-14);

    const sportRatios = timeseries.map((p) => p.sport / p.total);
    const polRatios = timeseries.map((p) => p.polityka / p.total);

    // Udziały nie mogą być identyczne dla każdego dnia
    const uniqueSportRatios = new Set(sportRatios.map((r) => r.toFixed(3)));
    const uniquePolRatios = new Set(polRatios.map((r) => r.toFixed(3)));

    assert.ok(uniqueSportRatios.size > 5, "Musi być co najmniej kilka różnych poziomów udziału sportu w 14 dniach");
    assert.ok(uniquePolRatios.size > 5, "Musi być co najmniej kilka różnych poziomów udziału polityki w 14 dniach");
  });

  it("odzwierciedla wzrost zainteresowania sportem w weekendy w stosunku do dni roboczych", () => {
    const jsonPath = path.resolve(process.cwd(), "public/data/dashboard.json");
    const content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const timeseries: DailyPoint[] = content.daily_timeseries.slice(-30);

    const weekendSport = timeseries.filter((p) => p.total < 9000).map((p) => p.sport / p.total);
    const weekdaySport = timeseries.filter((p) => p.total >= 9000).map((p) => p.sport / p.total);

    const avgWeekendSport = weekendSport.reduce((a, b) => a + b, 0) / weekendSport.length;
    const avgWeekdaySport = weekdaySport.reduce((a, b) => a + b, 0) / weekdaySport.length;

    assert.ok(
      avgWeekendSport > avgWeekdaySport * 1.5,
      `Średni udział sportu w weekend (${(avgWeekendSport * 100).toFixed(1)}%) musi być wyraźnie wyższy niż w dni robocze (${(avgWeekdaySport * 100).toFixed(1)}%)`
    );
  });
});
