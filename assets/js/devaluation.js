/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 6.96,
  suggestedWindowYears: 3,
  windows: { "1": 7.08, "3": 6.96, "5": 10.71 },
  rateNow: 44.7488,
  rateThen: 36.5686,
  thenDate: "2023-08-05",
  asOf: "2026-08-05",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
