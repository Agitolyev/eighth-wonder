/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 8.01,
  suggestedWindowYears: 3,
  windows: { "1": 8.18, "3": 8.01, "5": 11.72 },
  rateNow: 45.4123,
  rateThen: 36.036,
  thenDate: "2023-11-10",
  asOf: "2026-11-10",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
