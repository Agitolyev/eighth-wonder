#!/usr/bin/env node
/**
 * Refresh objective, verifiable per-fund data from the official offer pages.
 *
 * ONLY the certificate/unit price is tracked automatically — it's a concrete,
 * checkable number. Projected returns (`rate`) are marketing/illustrative and
 * stay human-curated in assets/js/data.js; this script never touches them.
 *
 * Same shape as the FX job: assets/data/funds.csv is the source of truth and
 * the page loads a generated assets/js/funds-live.js (so nothing is fetched at
 * runtime and the app still works offline / straight from disk). Every value
 * carries the source_url it came from, surfaced as a clickable "Source" link.
 *
 * Safe by construction: if a fund's page can't be fetched or parsed (the
 * official sites are bot-protected and may block CI), we KEEP the last-known
 * price and DO NOT advance its as_of — so staleness stays visible in the UI
 * and a figure is never fabricated.
 *
 *   node scripts/update-funds.mjs             fetch all funds, rewrite CSV + JS
 *   node scripts/update-funds.mjs --fund ID   fetch just one fund (others untouched)
 *   node scripts/update-funds.mjs --regen     regenerate JS from the CSV (no network)
 *
 * The CI workflow runs one job per fund (--fund), so a blocked source only
 * fails its own job and you can see per-fund which price is going stale.
 *
 * Pure Node built-ins, no dependencies.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV = path.join(ROOT, "assets", "data", "funds.csv");
const JS = path.join(ROOT, "assets", "js", "funds-live.js");

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0 Safari/537.36";

// ---- Per-fund adapters (official pages only) -----------------------------
// Each adapter gets the fetched HTML and returns the unit price in UAH, or
// null if it can't confidently find one (→ keep last-known, don't bump as_of).

// Grab the number following a ₴/грн marker, e.g. "₴10,5" / "10.50 грн".
function parseUahPrice(html, opts) {
  opts = opts || {};
  const patterns = [
    /(?:₴|грн\.?\s*)\s*([\d\s.,]+)/i,
    /([\d\s.,]+)\s*(?:₴|грн)/i,
  ];
  for (const re of patterns) {
    const m = re.exec(html || "");
    if (!m) continue;
    // Ukrainian pages use comma decimals and spaces as thousands separators.
    const raw = m[1].replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    const n = parseFloat(raw);
    if (isFinite(n) && n > 0 && (!opts.max || n <= opts.max) && (!opts.min || n >= opts.min)) {
      return n;
    }
  }
  return null;
}

const ADAPTERS = {
  // Small REIT certificate — a few ₴ each.
  "inzhur-reit": (html) => parseUahPrice(html, { min: 1, max: 1000 }),
  // Energy certificate — thousands of ₴.
  "inzhur-energy": (html) => parseUahPrice(html, { min: 100, max: 100000 }),
  // Varto wind certificate — ~₴1,000.
  "varto-wind": (html) => parseUahPrice(html, { min: 100, max: 100000 }),
  // Твоє Коло land certificates — topped up from ~₴1,000 each. Tight bounds so
  // a parsed value can only be a per-certificate price, never the ₴121,800
  // entry ticket, the ₴300k land minimum or the fund's ₴300M emission.
  "tvoe-kolo-income": (html) => parseUahPrice(html, { min: 200, max: 5000 }),
  "tvoe-kolo-reinvest": (html) => parseUahPrice(html, { min: 200, max: 5000 }),
};

// ---- CSV / JS I/O ---------------------------------------------------------
function csvCell(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCsv(rows) {
  const head = "id,unit_price_uah,as_of,source_url";
  const body = rows.map((r) =>
    [r.id, r.unit_price_uah, r.as_of, r.source_url].map(csvCell).join(",")
  );
  return head + "\n" + body.join("\n") + "\n";
}

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
  const entries = rows.map(
    (r) =>
      `  ${JSON.stringify(r.id)}: { unitPriceUAH: ${Number(r.unit_price_uah)}, ` +
      `asOf: ${JSON.stringify(r.as_of)}, sourceUrl: ${JSON.stringify(r.source_url)} }`
  );
  return (
    "/* AUTO-GENERATED from assets/data/funds.csv by scripts/update-funds.mjs.\n" +
    " * Do not edit by hand — the daily \"Update fund data\" workflow overwrites it.\n" +
    " * Objective per-fund figures (certificate/unit price) fetched from the\n" +
    " * official pages; projected returns stay curated in data.js. */\n" +
    "window.FUND_LIVE = {\n" +
    entries.join(",\n") +
    "\n};\n"
  );
}

async function fetchPrice(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function main() {
  const regen = process.argv.includes("--regen");
  const onlyIdx = process.argv.indexOf("--fund");
  const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null; // update just this fund
  const rows = parseCsv(await readFile(CSV, "utf8"));
  const failed = [];

  if (only && !rows.some((r) => r.id === only)) {
    throw new Error(`unknown fund '${only}' (not in funds.csv)`);
  }

  if (!regen) {
    const today = new Date().toISOString().slice(0, 10);
    for (const row of rows) {
      if (only && row.id !== only) continue; // leave other funds' rows untouched
      const adapter = ADAPTERS[row.id];
      if (!adapter || !row.source_url) {
        console.log(`- ${row.id}: no adapter/source, keeping ₴${row.unit_price_uah} (updated ${row.as_of})`);
        continue;
      }
      try {
        const price = adapter(await fetchPrice(row.source_url));
        if (price == null) throw new Error("no price parsed");
        row.unit_price_uah = price;
        row.as_of = today; // advance the "updated at" only on a real, parsed value
        console.log(`✓ ${row.id}: ₴${price} (updated ${today})`);
      } catch (err) {
        // FALLBACK: keep the last-known price and leave as_of stale, so the UI
        // shows the real age and no value is fabricated. Record the failure.
        failed.push(`${row.id} (${err.message})`);
        console.log(`! ${row.id}: FAILED — kept ₴${row.unit_price_uah} from ${row.as_of}`);
      }
    }
    await mkdir(path.dirname(CSV), { recursive: true });
    await writeFile(CSV, toCsv(rows)); // preserves previous values for failed funds
  }

  await writeFile(JS, toJs(rows));
  const scope = regen ? "regenerated from CSV" : only ? `updated ${only}` : `updated ${rows.length} funds`;
  console.log(`funds ${scope}; ${failed.length} failed`);

  // Mark the job as failed if any fund could not be refreshed. Previous values
  // are already written above, so the site keeps serving the last-known data.
  if (failed.length) {
    console.error(`update-funds: ${failed.length} fund(s) failed: ${failed.join("; ")}`);
    process.exitCode = 1;
  }
}

export { parseUahPrice, parseCsv, toCsv, toJs, ADAPTERS };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error("update-funds failed:", err.message);
    process.exit(1);
  });
}
