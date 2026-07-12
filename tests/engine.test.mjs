// Unit tests for the pure calculation engine (assets/js/engine.js).
// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseNum, simulate, fxFactorAt, rolloverFactorAt } = require("../assets/js/engine.js");

function approx(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} ≈ ${expected} (±${tolerance})`
  );
}

// Baseline input: fraction-friendly, distributing, no term.
function base(overrides) {
  return Object.assign({
    principal: 1000,
    monthly: 0,
    rate: 12,
    frequency: 12,
    years: 10,
    wholeUnits: false,
    step: 0,
    distributes: true,
    termYears: null,
    postTermRate: 0,
  }, overrides);
}

/* ---------------- parseNum ---------------- */

test("parseNum: plain and decimal-point numbers", () => {
  assert.equal(parseNum("1000"), 1000);
  assert.equal(parseNum("10.5"), 10.5);
  assert.equal(parseNum(""), 0);
  assert.equal(parseNum("abc"), 0);
  assert.equal(parseNum(null), 0);
});

test("parseNum: English thousands grouping is not read as a decimal", () => {
  assert.equal(parseNum("1,000"), 1000);
  assert.equal(parseNum("1,000,000"), 1000000);
  assert.equal(parseNum("12,345,678"), 12345678);
});

test("parseNum: comma decimals still work when the tail is not a 3-digit group", () => {
  assert.equal(parseNum("1,5"), 1.5);
  assert.equal(parseNum("0,75"), 0.75);
  assert.equal(parseNum("12,3456"), 12.3456);
});

test("parseNum: mixed separators — the rightmost is the decimal point", () => {
  assert.equal(parseNum("1,234.56"), 1234.56);
  assert.equal(parseNum("1.234,56"), 1234.56);
});

test("parseNum: spaces and NBSP as grouping", () => {
  assert.equal(parseNum("1 234,56"), 1234.56);
  assert.equal(parseNum("1 000"), 1000);
});

/* ---------------- simulate: textbook fidelity ---------------- */

test("withdraw reproduces simple interest P(1+rt) for a distributing fund", () => {
  const r = simulate(base());
  approx(r.simpleNet, 1000 * (1 + 0.12 * 10), 1e-6);
  approx(r.incomeWithdrawn, 1000 * 0.12 * 10, 1e-6);
});

test("reinvest reproduces compound interest P(1+r/n)^(nt) for a distributing fund", () => {
  const r = simulate(base());
  approx(r.compound, 1000 * Math.pow(1 + 0.12 / 12, 120), 1e-6);
});

test("annual distributing fund: both textbook formulas hold", () => {
  const r = simulate(base({ frequency: 1, rate: 10, years: 7 }));
  approx(r.simpleNet, 1000 * (1 + 0.1 * 7), 1e-6);
  approx(r.compound, 1000 * Math.pow(1.1, 7), 1e-6);
});

test("non-distributing fund grows at the effective rate regardless of frequency", () => {
  const expected = 1000 * Math.pow(1.15, 5);
  for (const frequency of [1, 4, 12]) {
    const r = simulate(base({ distributes: false, rate: 15, years: 5, frequency }));
    approx(r.compound, expected, 1e-6);
  }
});

test("yearly rows are indexed by year and end at the horizon", () => {
  const r = simulate(base({ years: 5 }));
  assert.equal(r.rows.length, 6);
  assert.equal(r.rows[0].year, 0);
  assert.equal(r.rows[5].year, 5);
  approx(r.rows[5].compound, r.compound, 1e-9);
});

/* ---------------- simulate: top-ups ---------------- */

test("monthly top-ups earn pro-rata from the month after deposit", () => {
  // Annual payout, 12% p.a., deposits of 100/mo for one year: the m-th
  // deposit accrues for (12−m) months at 1%/mo → total income 66.
  const r = simulate(base({ principal: 0, monthly: 100, frequency: 1, rate: 12, years: 1 }));
  approx(r.contributed, 1200, 1e-9);
  approx(r.incomeWithdrawn, 66, 1e-6);
  approx(r.simpleNet, 1266, 1e-6);
  approx(r.compound, 1266, 1e-6); // single settle in year 1 → identical
});

/* ---------------- simulate: whole units ---------------- */

test("whole-unit reinvestment pools payouts as idle cash until a unit is affordable", () => {
  // ₴1000 at 10% annual pays ₴100/yr; a ₴1000 unit is never affordable in 2y.
  const r = simulate(base({ rate: 10, frequency: 1, years: 2, wholeUnits: true, step: 1000 }));
  approx(r.compound, 1200, 1e-6);
  approx(r.idleCash, 200, 1e-6);
  // ...and with a ₴100 unit the year-1 payout reinvests immediately; the
  // year-2 payout of ₴110 buys one unit and leaves ₴10 idle.
  const r2 = simulate(base({ rate: 10, frequency: 1, years: 2, wholeUnits: true, step: 100 }));
  approx(r2.compound, 1000 * 1.1 * 1.1, 1e-6);
  approx(r2.idleCash, 10, 1e-6);
});

test("simulation is scale-invariant (whole units included)", () => {
  const a = simulate(base({ principal: 1000, monthly: 50, wholeUnits: true, step: 30, years: 8 }));
  const k = 7;
  const b = simulate(base({ principal: 1000 * k, monthly: 50 * k, wholeUnits: true, step: 30 * k, years: 8 }));
  approx(b.compound / a.compound, k, 1e-9);
  approx(b.simpleNet / a.simpleNet, k, 1e-9);
});

/* ---------------- simulate: fixed term / projection horizon ---------------- */

test("past the term the fund rate stops; post-term rate 0 flatlines the reinvest leg", () => {
  const r = simulate(base({ rate: 10, frequency: 1, years: 10, termYears: 5, postTermRate: 0 }));
  approx(r.compound, 1000 * Math.pow(1.1, 5), 1e-6);
  // Withdraw: 5 years of income, then nothing.
  approx(r.simpleNet, 1000 + 1000 * 0.1 * 5, 1e-6);
});

test("post-term rate compounds the liquidated pot at its effective annual rate", () => {
  const r = simulate(base({ rate: 10, frequency: 1, years: 10, termYears: 5, postTermRate: 10 }));
  approx(r.compound, 1000 * Math.pow(1.1, 10), 1e-6);
});

test("the whole-unit constraint disappears when the fund winds down", () => {
  // Pooled idle cash merges into the liquid pot at term end and starts earning.
  const r = simulate(base({
    rate: 10, frequency: 1, years: 6, termYears: 5,
    wholeUnits: true, step: 1000, postTermRate: 10,
  }));
  // 5 years of ₴100 payouts pool (never affordable), merge to 1500 at term,
  // then grow 10% in year 6.
  approx(r.compound, 1500 * 1.1, 1e-6);
  approx(r.idleCash, 0, 1e-9);
});

test("a term at or past the horizon changes nothing", () => {
  const a = simulate(base({ years: 5 }));
  const b = simulate(base({ years: 5, termYears: 5 }));
  const c = simulate(base({ years: 5, termYears: null }));
  approx(b.compound, a.compound, 1e-9);
  approx(c.compound, a.compound, 1e-9);
});

/* ---------------- fxFactorAt ---------------- */

const UAH_PER = { UAH: 1, USD: 44.47, EUR: 50.69 };

test("fxFactorAt at t=0 is the static snapshot", () => {
  approx(fxFactorAt("UAH", "USD", UAH_PER, 10, 0), 1 / 44.47, 1e-12);
  approx(fxFactorAt("USD", "UAH", UAH_PER, 10, 0), 44.47, 1e-12);
  approx(fxFactorAt("USD", "EUR", UAH_PER, 10, 0), 44.47 / 50.69, 1e-12);
});

test("fxFactorAt: UAH loses value against hard currencies over time", () => {
  const t = 10, d = 10;
  approx(fxFactorAt("UAH", "USD", UAH_PER, d, t), 1 / (44.47 * Math.pow(1.1, t)), 1e-12);
  approx(fxFactorAt("USD", "UAH", UAH_PER, d, t), 44.47 * Math.pow(1.1, t), 1e-9);
});

test("fxFactorAt: hard↔hard cross rates are unaffected by the drift", () => {
  approx(fxFactorAt("USD", "EUR", UAH_PER, 25, 30), 44.47 / 50.69, 1e-12);
  approx(fxFactorAt("EUR", "USD", UAH_PER, 25, 30), 50.69 / 44.47, 1e-12);
});

test("fxFactorAt: zero devaluation reduces to static conversion at any t", () => {
  approx(fxFactorAt("UAH", "USD", UAH_PER, 0, 30), 1 / 44.47, 1e-12);
});

/* ---------------- rolloverFactorAt ---------------- */

test("rollover: no term, same currency, or t within term reduce to fxFactorAt", () => {
  approx(rolloverFactorAt("UAH", "USD", null, "USD", UAH_PER, 10, 20),
    fxFactorAt("UAH", "USD", UAH_PER, 10, 20), 1e-15);
  approx(rolloverFactorAt("UAH", "UAH", 4, "USD", UAH_PER, 10, 20),
    fxFactorAt("UAH", "USD", UAH_PER, 10, 20), 1e-15);
  approx(rolloverFactorAt("UAH", "USD", 4, "USD", UAH_PER, 10, 3),
    fxFactorAt("UAH", "USD", UAH_PER, 10, 3), 1e-15);
});

test("rollover ₴→$ at term: devaluation stops eroding after the exchange", () => {
  // UAH fund, term 4, proceeds moved to USD. Viewed in USD, the factor past
  // the term is frozen at its term-date value: erosion ends there.
  const d = 10, term = 4;
  const atTerm = 1 / (44.47 * Math.pow(1.1, term));
  approx(rolloverFactorAt("UAH", "USD", term, "USD", UAH_PER, d, 10), atTerm, 1e-12);
  approx(rolloverFactorAt("UAH", "USD", term, "USD", UAH_PER, d, 30), atTerm, 1e-12);
});

test("rollover $→₴ at term: a hard-currency fund's proceeds left in ₴ start eroding", () => {
  // USD fund, term 5, proceeds left in UAH. Viewed in USD, value decays by
  // (1+d)^(term−t) after the term.
  const d = 10, term = 5, t = 12;
  approx(rolloverFactorAt("USD", "UAH", term, "USD", UAH_PER, d, t),
    Math.pow(1.1, term - t), 1e-12);
  // ...and viewed in UAH it's flat: the pot IS hryvnia now.
  approx(rolloverFactorAt("USD", "UAH", term, "UAH", UAH_PER, d, t),
    44.47 * Math.pow(1.1, term), 1e-9);
});

test("rollover is continuous at the term boundary", () => {
  const d = 6.74, term = 4;
  approx(
    rolloverFactorAt("UAH", "USD", term, "USD", UAH_PER, d, term),
    rolloverFactorAt("UAH", "USD", term, "USD", UAH_PER, d, term + 1e-9),
    1e-10
  );
});
