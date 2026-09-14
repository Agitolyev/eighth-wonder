/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 6.86,
  suggestedWindowYears: 3,
  windows: { "1": 8.08, "3": 6.86, "5": 10.87 },
  rateNow: 44.618,
  rateThen: 36.5686,
  thenDate: "2023-09-15",
  asOf: "2026-09-15",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
