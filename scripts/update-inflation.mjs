#!/usr/bin/env node
/**
 * Refresh the suggested hard-currency inflation figure from US CPI history.
 *
 * The calculator's "show in today's money" mode deflates results by
 * hard-currency inflation — dollars and euros melt too, just slower than
 * hryvnias. Nobody publishes future inflation, so the honest, checkable
 * default is the TRAILING one: annualized US CPI-U drift over the last 1, 3
 * and 10 years. The 10-year window is the suggested default (it smooths the
 * 2021–23 spike, which would otherwise dominate a 30-year projection); the
 * others are stored for context. The user can always type their own number.
 *
 * Same shape as the FX/devaluation jobs: assets/data/inflation.csv is the
 * source of truth, the page loads the generated assets/js/inflation.js, and
 * every row carries the two CPI index values and months it was computed
 * from, so the figure is fully auditable.
 *
 *   node scripts/update-inflation.mjs           fetch BLS history, rewrite CSV + JS
 *   node scripts/update-inflation.mjs --regen   regenerate JS from the CSV (no network)
 *
 * Safe by construction: a window whose CPI can't be fetched keeps its
 * previous CSV row (as_of left stale — visible in the UI note), and the
 * script exits non-zero so the workflow run is marked failed. Values are
 * never fabricated.
 *
 * Pure Node built-ins, no dependencies. Uses the BLS public v1 API (no key;
 * ~25 requests/day, we make 2).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV = path.join(ROOT, "assets", "data", "inflation.csv");
const JS = path.join(ROOT, "assets", "js", "inflation.js");

const WINDOWS = [1, 3, 10]; // trailing windows, in years
const SUGGESTED_WINDOW = 10;
const SERIES = "CUUR0000SA0"; // CPI-U, all items, US city average, NSA
const SOURCE = "US CPI-U (CUUR0000SA0), Bureau of Labor Statistics (bls.gov)";
const BLS = "https://api.bls.gov/publicAPI/v1/timeseries/data/";

// Annualized CPI drift between two index values. Pure — unit-testable.
function annualizedPct(cpiNow, cpiThen, years) {
  if (!(cpiNow > 0) || !(cpiThen > 0) || !(years > 0)) {
    throw new Error("annualizedPct needs positive index values and years");
  }
  return (Math.pow(cpiNow / cpiThen, 1 / years) - 1) * 100;
}

// "2024-06" arithmetic without Date objects (months are all we have).
function shiftMonths(ym, months) {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  return ny + "-" + String(nm).padStart(2, "0");
}

// Turn a BLS series response into a Map("YYYY-MM" -> index value), skipping
// the M13 annual-average pseudo-period. Pure — unit-testable.
function cpiMapFrom(seriesData) {
  const map = new Map();
  for (const d of seriesData || []) {
    const m = /^M(\d{2})$/.exec(d.period || "");
    if (!m || m[1] === "13") continue;
    const v = Number(d.value);
    if (v > 0) map.set(`${d.year}-${m[1]}`, v);
  }
  return map;
}

function csvCell(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCsv(rows) {
  const head = "window_years,annual_pct,cpi_now,cpi_then,then_month,as_of,source";
  const body = rows.map((r) =>
    [r.window_years, r.annual_pct, r.cpi_now, r.cpi_then, r.then_month, r.as_of, r.source]
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
  const suggested = byWindow.get(SUGGESTED_WINDOW) || rows[rows.length - 1];
  if (!suggested) throw new Error("inflation.csv has no rows");
  const windows = rows
    .map((r) => `"${Number(r.window_years)}": ${Number(r.annual_pct)}`)
    .join(", ");
  return (
    "/* AUTO-GENERATED from assets/data/inflation.csv by scripts/update-inflation.mjs.\n" +
    " * Do not edit by hand — the daily \"Update inflation\" workflow overwrites it.\n" +
    " * Trailing US CPI-U drift — the calculator's SUGGESTED hard-currency\n" +
    " * inflation for the today's-money view, not a forecast. Static snapshot:\n" +
    " * nothing is fetched at runtime, so the app runs offline. */\n" +
    "window.INFL = {\n" +
    `  suggestedPct: ${Number(suggested.annual_pct)},\n` +
    `  suggestedWindowYears: ${Number(suggested.window_years)},\n` +
    `  windows: { ${windows} },\n` +
    `  cpiNow: ${Number(suggested.cpi_now)},\n` +
    `  cpiThen: ${Number(suggested.cpi_then)},\n` +
    `  thenMonth: ${JSON.stringify(suggested.then_month)},\n` +
    `  asOf: ${JSON.stringify(suggested.as_of)},\n` +
    `  source: ${JSON.stringify(suggested.source)},\n` +
    "};\n"
  );
}

async function fetchYears(startYear, endYear) {
  const url = `${BLS}${SERIES}?startyear=${startYear}&endyear=${endYear}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`BLS request failed: HTTP ${res.status}`);
  const body = await res.json();
  if (body.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS: ${body.status} ${(body.message || []).join("; ")}`);
  }
  return body.Results?.series?.[0]?.data || [];
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
    // v1 caps each request at 10 calendar years; an 11-year span takes two.
    const thisYear = new Date().getUTCFullYear();
    const data = [
      ...(await fetchYears(thisYear - 5, thisYear)),
      ...(await fetchYears(thisYear - 11, thisYear - 6)),
    ];
    const cpi = cpiMapFrom(data);
    const latest = [...cpi.keys()].sort().pop();
    if (!latest) throw new Error("no CPI data in BLS response");

    const byWindow = new Map(rows.map((r) => [Number(r.window_years), r]));
    for (const w of WINDOWS) {
      try {
        // Same month w years earlier; walk back a bit if it's missing.
        let thenMonth = null;
        for (let back = 0; back <= 3; back++) {
          const cand = shiftMonths(latest, -12 * w - back);
          if (cpi.has(cand)) { thenMonth = cand; break; }
        }
        if (!thenMonth) throw new Error(`no CPI value near ${shiftMonths(latest, -12 * w)}`);
        byWindow.set(w, {
          window_years: w,
          annual_pct: annualizedPct(cpi.get(latest), cpi.get(thenMonth), w).toFixed(2),
          cpi_now: cpi.get(latest),
          cpi_then: cpi.get(thenMonth),
          then_month: thenMonth,
          as_of: latest,
          source: SOURCE,
        });
        console.log(`✓ ${w}y: ${byWindow.get(w).annual_pct}%/yr (${cpi.get(thenMonth)} in ${thenMonth} → ${cpi.get(latest)} in ${latest})`);
      } catch (err) {
        // Keep the previous row (as_of stays stale); never fabricate.
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
  console.log(`inflation ${regen ? "regenerated" : "updated"}: ` +
    rows.map((r) => `${r.window_years}y=${r.annual_pct}%`).join(", "));

  if (failed.length) {
    console.error(`update-inflation: ${failed.length} window(s) failed: ${failed.join("; ")}`);
    process.exitCode = 1;
  }
}

export { annualizedPct, shiftMonths, cpiMapFrom, toCsv, parseCsv, toJs, WINDOWS, SUGGESTED_WINDOW };

// Only run when executed directly (not when imported by a test).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error("update-inflation failed:", err.message);
    process.exit(1);
  });
}
