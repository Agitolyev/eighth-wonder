/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.9,
  suggestedWindowYears: 3,
  windows: { "1": 8.03, "3": 7.9, "5": 11.65 },
  rateNow: 45.4432,
  rateThen: 36.1705,
  thenDate: "2023-11-06",
  asOf: "2026-11-06",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
