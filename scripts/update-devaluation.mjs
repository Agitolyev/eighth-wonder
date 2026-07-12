#!/usr/bin/env node
/**
 * Refresh the suggested UAH-devaluation assumption from National Bank of
 * Ukraine history.
 *
 * The calculator lets you assume "UAH loses X% per year against hard
 * currencies" when displaying across ₴/$/€. Nobody publishes tomorrow's
 * devaluation, so the honest, checkable default is the TRAILING one: how fast
 * the official UAH/USD rate actually drifted over the last 1, 3 and 5 years,
 * annualized. The 3-year window is surfaced as the suggested default (long
 * enough to smooth interventions, short enough to stay current); the others
 * are stored alongside for context. The user can always type their own number.
 *
 * Same shape as the FX job: assets/data/devaluation.csv is the source of
 * truth, and the page loads the generated assets/js/devaluation.js — nothing
 * is fetched at runtime, so the app keeps working offline. Every row carries
 * the two NBU rates and dates it was computed from, so the figure is fully
 * auditable.
 *
 *   node scripts/update-devaluation.mjs           fetch NBU history, rewrite CSV + JS
 *   node scripts/update-devaluation.mjs --regen   regenerate JS from the CSV (no network)
 *
 * Safe by construction: a window whose historical rate can't be fetched keeps
 * its previous CSV row (as_of left stale — visible in the UI note), and the
 * script exits non-zero so the workflow run is marked failed. Values are never
 * fabricated.
 *
 * Pure Node built-ins, no dependencies.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV = path.join(ROOT, "assets", "data", "devaluation.csv");
const JS = path.join(ROOT, "assets", "js", "devaluation.js");

const WINDOWS = [1, 3, 5]; // trailing windows, in years
const SUGGESTED_WINDOW = 3;
const SOURCE = "National Bank of Ukraine official rates (bank.gov.ua)";
const NBU = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange";

// Annualized drift of the UAH/USD rate: how fast ₴-per-$ grew per year.
// Positive = UAH devalued; negative = UAH strengthened. Pure — unit-testable.
function annualizedPct(rateNow, rateThen, years) {
  if (!(rateNow > 0) || !(rateThen > 0) || !(years > 0)) {
    throw new Error("annualizedPct needs positive rates and years");
  }
  return (Math.pow(rateNow / rateThen, 1 / years) - 1) * 100;
}

// NBU dates are DD.MM.YYYY; we store ISO YYYY-MM-DD.
function toIso(d) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(d || "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(d || "");
}

function isoToNbu(iso) {
  return iso.replace(/-/g, "");
}

function shiftYears(iso, years) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y - years, m - 1, d));
  return dt.toISOString().slice(0, 10);
}

function shiftDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function csvCell(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCsv(rows) {
  const head = "window_years,annual_pct,uah_per_usd_now,uah_per_usd_then,then_date,as_of,source";
  const body = rows.map((r) =>
    [r.window_years, r.annual_pct, r.uah_per_usd_now, r.uah_per_usd_then, r.then_date, r.as_of, r.source]
      .map(csvCell).join(",")
  );
  return head + "\n" + body.join("\n") + "\n";
}

// Minimal CSV parser (fields may be double-quoted).
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
  const header = lines.shift().split(",").map((h) => h.trim());
  return lines.filter(Boolean).map((line) => {
    const cells = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    const o = {};
    header.forEach((h, i) => (o[h] = (cells[i] ?? "").trim()));
    return o;
  });
}

function toJs(rows) {
  const byWindow = new Map(rows.map((r) => [Number(r.window_years), r]));
  const suggested = byWindow.get(SUGGESTED_WINDOW) || rows[0];
  if (!suggested) throw new Error("devaluation.csv has no rows");
  const windows = rows
    .map((r) => `"${Number(r.window_years)}": ${Number(r.annual_pct)}`)
    .join(", ");
  return (
    "/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.\n" +
    " * Do not edit by hand — the daily \"Update devaluation\" workflow overwrites it.\n" +
    " * Trailing UAH/USD drift from NBU official rates — the calculator's\n" +
    " * SUGGESTED devaluation assumption, not a forecast. Static snapshot:\n" +
    " * nothing is fetched at runtime, so the app runs offline. */\n" +
    "window.DEVAL = {\n" +
    `  suggestedPct: ${Number(suggested.annual_pct)},\n` +
    `  suggestedWindowYears: ${Number(suggested.window_years)},\n` +
    `  windows: { ${windows} },\n` +
    `  rateNow: ${Number(suggested.uah_per_usd_now)},\n` +
    `  rateThen: ${Number(suggested.uah_per_usd_then)},\n` +
    `  thenDate: ${JSON.stringify(suggested.then_date)},\n` +
    `  asOf: ${JSON.stringify(suggested.as_of)},\n` +
    `  source: ${JSON.stringify(suggested.source)},\n` +
    "};\n"
  );
}

// Fetch the official UAH/USD rate on (or just before) an ISO date. NBU has no
// rate for some dates (pre-publication hours, very old gaps), so walk back up
// to `maxBack` days. Returns { rate, date } or throws.
async function nbuUsdOn(iso, maxBack = 14) {
  for (let back = 0; back <= maxBack; back++) {
    const date = shiftDays(iso, -back);
    const url = `${NBU}?valcode=USD&date=${isoToNbu(date)}&json`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`NBU request failed: HTTP ${res.status}`);
    const data = await res.json();
    const r = Array.isArray(data) && data[0];
    if (r && Number(r.rate) > 0) {
      return { rate: Number(r.rate), date: toIso(r.exchangedate) || date };
    }
  }
  throw new Error(`no NBU USD rate found near ${iso}`);
}

async function main() {
  const regen = process.argv.includes("--regen");
  let rows;
  try {
    rows = parseCsv(await readFile(CSV, "utf8"));
  } catch {
    rows = [];
  }
  const failed = [];

  if (!regen) {
    // Latest official rate (no date param = current).
    const res = await fetch(`${NBU}?valcode=USD&json`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`NBU request failed: HTTP ${res.status}`);
    const data = await res.json();
    const nowRow = Array.isArray(data) && data.find((r) => r.cc === "USD");
    if (!nowRow || !(Number(nowRow.rate) > 0)) throw new Error("no current NBU USD rate");
    const now = { rate: Number(nowRow.rate), date: toIso(nowRow.exchangedate) };

    const byWindow = new Map(rows.map((r) => [Number(r.window_years), r]));
    for (const w of WINDOWS) {
      try {
        const then = await nbuUsdOn(shiftYears(now.date, w));
        byWindow.set(w, {
          window_years: w,
          annual_pct: annualizedPct(now.rate, then.rate, w).toFixed(2),
          uah_per_usd_now: now.rate,
          uah_per_usd_then: then.rate,
          then_date: then.date,
          as_of: now.date,
          source: SOURCE,
        });
        console.log(`✓ ${w}y: ${byWindow.get(w).annual_pct}%/yr (₴${then.rate} on ${then.date} → ₴${now.rate})`);
      } catch (err) {
        // Keep the previous row (as_of stays stale — visible in the UI note);
        // never fabricate a figure.
        failed.push(`${w}y (${err.message})`);
        const prev = byWindow.get(w);
        console.log(`! ${w}y: FAILED — ${prev ? `kept ${prev.annual_pct}% from ${prev.as_of}` : "no previous value"}`);
      }
    }
    rows = [...byWindow.values()].sort((a, b) => a.window_years - b.window_years);
    await mkdir(path.dirname(CSV), { recursive: true });
    await writeFile(CSV, toCsv(rows));
  }

  await writeFile(JS, toJs(rows));
  console.log(`devaluation ${regen ? "regenerated" : "updated"}: ` +
    rows.map((r) => `${r.window_years}y=${r.annual_pct}%`).join(", "));

  if (failed.length) {
    console.error(`update-devaluation: ${failed.length} window(s) failed: ${failed.join("; ")}`);
    process.exitCode = 1;
  }
}

export { annualizedPct, toIso, shiftYears, shiftDays, toCsv, parseCsv, toJs, WINDOWS, SUGGESTED_WINDOW };

// Only run when executed directly (not when imported by a test).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error("update-devaluation failed:", err.message);
    process.exit(1);
  });
}
