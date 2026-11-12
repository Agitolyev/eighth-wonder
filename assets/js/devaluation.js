/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.95,
  suggestedWindowYears: 3,
  windows: { "1": 7.96, "3": 7.95, "5": 11.7 },
  rateNow: 45.3849,
  rateThen: 36.0779,
  thenDate: "2023-11-13",
  asOf: "2026-11-13",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
