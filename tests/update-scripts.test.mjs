// Unit tests for the data-update scripts' pure functions.
// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";

import { annualizedPct, toIso, shiftYears, shiftDays, toCsv, parseCsv, toJs }
  from "../scripts/update-devaluation.mjs";
import { parseUahPrice } from "../scripts/update-funds.mjs";
import { ratesFromNbu } from "../scripts/update-fx.mjs";

function approx(actual, expected, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} ≈ ${expected} (±${tolerance})`
  );
}

/* ---------------- update-devaluation ---------------- */

test("annualizedPct: the seeded 3-year window reproduces its CSV value", () => {
  // ₴36.5686/$ (2023-07-09, NBU peg era) → ₴44.47/$ (2026-07-09).
  approx(annualizedPct(44.47, 36.5686, 3), 6.74, 0.005);
});

test("annualizedPct: flat rate = 0, strengthening UAH = negative", () => {
  approx(annualizedPct(40, 40, 5), 0);
  assert.ok(annualizedPct(38, 40, 2) < 0);
});

test("annualizedPct rejects nonsense inputs", () => {
  assert.throws(() => annualizedPct(0, 40, 3));
  assert.throws(() => annualizedPct(40, -1, 3));
  assert.throws(() => annualizedPct(40, 40, 0));
});

test("date helpers: NBU date parsing and ISO arithmetic", () => {
  assert.equal(toIso("09.07.2026"), "2026-07-09");
  assert.equal(shiftYears("2026-07-09", 3), "2023-07-09");
  assert.equal(shiftDays("2026-07-01", -2), "2026-06-29");
  assert.equal(shiftDays("2026-01-01", -1), "2025-12-31");
});

test("devaluation CSV round-trips and the generated JS prefers the 3y window", () => {
  const rows = [
    { window_years: 1, annual_pct: "3.10", uah_per_usd_now: 44.47, uah_per_usd_then: 43.13, then_date: "2025-07-09", as_of: "2026-07-09", source: "NBU" },
    { window_years: 3, annual_pct: "6.74", uah_per_usd_now: 44.47, uah_per_usd_then: 36.5686, then_date: "2023-07-09", as_of: "2026-07-09", source: "NBU" },
  ];
  const parsed = parseCsv(toCsv(rows));
  assert.equal(parsed.length, 2);
  assert.equal(parsed[1].annual_pct, "6.74");

  const js = toJs(rows);
  assert.match(js, /suggestedPct: 6\.74/);
  assert.match(js, /suggestedWindowYears: 3/);
  assert.match(js, /"1": 3\.1/);
});

/* ---------------- update-funds ---------------- */

test("parseUahPrice reads Ukrainian price markup", () => {
  assert.equal(parseUahPrice("<b>₴10,5</b> за сертифікат", { min: 1, max: 1000 }), 10.5);
  assert.equal(parseUahPrice("вартість 6 000 грн", { min: 100, max: 100000 }), 6000);
  assert.equal(parseUahPrice("немає ціни", { min: 1, max: 1000 }), null);
  // Out-of-bounds candidates are rejected rather than guessed at.
  assert.equal(parseUahPrice("₴121800", { min: 200, max: 5000 }), null);
});

/* ---------------- update-fx ---------------- */

test("ratesFromNbu extracts the display currencies and stamps the date", () => {
  const rows = ratesFromNbu([
    { cc: "USD", rate: 44.47, exchangedate: "09.07.2026" },
    { cc: "EUR", rate: 50.69, exchangedate: "09.07.2026" },
    { cc: "PLN", rate: 11.9, exchangedate: "09.07.2026" },
  ]);
  assert.equal(rows[0].currency, "UAH");
  assert.equal(rows[0].uah_per, 1);
  assert.equal(rows.find((r) => r.currency === "USD").uah_per, 44.47);
  assert.equal(rows[0].as_of, "2026-07-09");
  assert.throws(() => ratesFromNbu([{ cc: "USD", rate: 44.47, exchangedate: "09.07.2026" }]));
});
