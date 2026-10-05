/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.15,
  suggestedWindowYears: 3,
  windows: { "1": 9.28, "3": 7.15, "5": 11.26 },
  rateNow: 45.0564,
  rateThen: 36.6216,
  thenDate: "2023-10-06",
  asOf: "2026-10-06",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
