#!/usr/bin/env node
/**
 * Refresh the currency-conversion snapshot from the National Bank of Ukraine.
 *
 * Source of truth is assets/data/fx-rates.csv (human-readable, diffable). The
 * app itself can't fetch at runtime — it must keep working when index.html is
 * opened straight from disk (file://), with no data leaving the page — so we
 * also generate assets/js/fx-rates.js, which is what the page actually loads.
 *
 *   node scripts/update-fx.mjs           fetch latest NBU rates, rewrite CSV + JS
 *   node scripts/update-fx.mjs --regen   regenerate JS from the existing CSV only
 *                                        (no network — use after hand-editing CSV)
 *
 * Adding a display currency: add it to window.CURRENCIES in assets/js/data.js
 * and to DISPLAY below (use the NBU 3-letter code). UAH is the base and is
 * always 1.
 *
 * Pure Node built-ins, no dependencies.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV = path.join(ROOT, "assets", "data", "fx-rates.csv");
const JS = path.join(ROOT, "assets", "js", "fx-rates.js");

const DISPLAY = ["USD", "EUR"]; // UAH is the base (uah_per = 1)
const SOURCE = "National Bank of Ukraine official rates (bank.gov.ua)";
const NBU = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";

// NBU dates are DD.MM.YYYY; we store ISO YYYY-MM-DD.
function toIso(d) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(d || "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(d || "");
}

function csvCell(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCsv(rows) {
  const head = "currency,uah_per,as_of,source";
  const body = rows.map((r) =>
    [r.currency, r.uah_per, r.as_of, r.source].map(csvCell).join(",")
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
  const asOf = rows[0]?.as_of || "";
  const source = rows[0]?.source || SOURCE;
  const uahPer = rows.map((r) => `${r.currency}: ${Number(r.uah_per)}`).join(", ");
  return (
    "/* AUTO-GENERATED from assets/data/fx-rates.csv by scripts/update-fx.mjs.\n" +
    " * Do not edit by hand — the daily \"Update FX rates\" workflow overwrites it.\n" +
    " * Static snapshot: nothing is fetched at runtime, so the app runs offline. */\n" +
    "window.FX = {\n" +
    `  asOf: ${JSON.stringify(asOf)},\n` +
    `  source: ${JSON.stringify(source)},\n` +
    `  uahPer: { ${uahPer} },\n` +
    "};\n"
  );
}

// Turn a raw NBU exchange array into our rate rows. Pure — unit-testable.
function ratesFromNbu(data) {
  if (!Array.isArray(data)) throw new Error("Unexpected NBU response shape");
  const byCc = new Map(data.map((r) => [r.cc, r]));

  let asOf = "";
  const rows = [{ currency: "UAH", uah_per: 1 }];
  for (const cc of DISPLAY) {
    const r = byCc.get(cc);
    if (!r || !(Number(r.rate) > 0)) throw new Error(`Missing NBU rate for ${cc}`);
    rows.push({ currency: cc, uah_per: Number(r.rate) });
    asOf = toIso(r.exchangedate) || asOf;
  }
  for (const r of rows) { r.as_of = asOf; r.source = SOURCE; }
  return rows;
}

async function fetchRates() {
  const res = await fetch(NBU, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`NBU request failed: HTTP ${res.status}`);
  return ratesFromNbu(await res.json());
}

export { toIso, toCsv, parseCsv, toJs, ratesFromNbu, DISPLAY };

async function main() {
  const regen = process.argv.includes("--regen");
  let rows;
  if (regen) {
    rows = parseCsv(await readFile(CSV, "utf8")).map((r) => ({
      currency: r.currency,
      uah_per: Number(r.uah_per),
      as_of: r.as_of,
      source: r.source,
    }));
  } else {
    rows = await fetchRates();
    await mkdir(path.dirname(CSV), { recursive: true });
    await writeFile(CSV, toCsv(rows));
  }
  await writeFile(JS, toJs(rows));
  console.log(
    `FX ${regen ? "regenerated" : "updated"}: ` +
      rows.map((r) => `${r.currency}=${r.uah_per}`).join(", ") +
      ` (as of ${rows[0].as_of})`
  );
}

// Only run when executed directly (not when imported by a test).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error("update-fx failed:", err.message);
    process.exit(1);
  });
}
