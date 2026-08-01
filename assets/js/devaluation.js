/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 6.87,
  suggestedWindowYears: 3,
  windows: { "1": 7.02, "3": 6.87, "5": 10.71 },
  rateNow: 44.6395,
  rateThen: 36.5686,
  thenDate: "2023-08-03",
  asOf: "2026-08-03",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
