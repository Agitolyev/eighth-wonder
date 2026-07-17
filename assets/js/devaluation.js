/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 6.86,
  suggestedWindowYears: 3,
  windows: { "1": 6.71, "3": 6.86, "5": 10.33 },
  rateNow: 44.6173,
  rateThen: 36.5686,
  thenDate: "2023-07-17",
  asOf: "2026-07-17",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
