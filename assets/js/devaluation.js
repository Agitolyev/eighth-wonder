/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7,
  suggestedWindowYears: 3,
  windows: { "1": 8.59, "3": 7, "5": 11.25 },
  rateNow: 44.8639,
  rateThen: 36.6216,
  thenDate: "2023-10-08",
  asOf: "2026-10-08",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
