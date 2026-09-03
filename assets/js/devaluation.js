/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 6.85,
  suggestedWindowYears: 3,
  windows: { "1": 7.85, "3": 6.85, "5": 10.54 },
  rateNow: 44.6093,
  rateThen: 36.5686,
  thenDate: "2023-09-03",
  asOf: "2026-09-03",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
