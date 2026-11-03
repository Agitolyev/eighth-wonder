/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.99,
  suggestedWindowYears: 3,
  windows: { "1": 8.62, "3": 7.99, "5": 11.72 },
  rateNow: 45.666,
  rateThen: 36.2659,
  thenDate: "2023-11-04",
  asOf: "2026-11-04",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
