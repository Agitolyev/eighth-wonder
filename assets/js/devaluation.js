/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.05,
  suggestedWindowYears: 3,
  windows: { "1": 8.41, "3": 7.05, "5": 11.08 },
  rateNow: 44.8571,
  rateThen: 36.5686,
  thenDate: "2023-09-24",
  asOf: "2026-09-24",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
