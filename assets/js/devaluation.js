/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.03,
  suggestedWindowYears: 3,
  windows: { "1": 8.33, "3": 7.03, "5": 11.24 },
  rateNow: 44.8526,
  rateThen: 36.5827,
  thenDate: "2023-10-09",
  asOf: "2026-10-09",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
