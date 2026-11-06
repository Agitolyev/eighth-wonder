/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.94,
  suggestedWindowYears: 3,
  windows: { "1": 7.69, "3": 7.94, "5": 11.69 },
  rateNow: 45.3206,
  rateThen: 36.0407,
  thenDate: "2023-11-09",
  asOf: "2026-11-09",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
