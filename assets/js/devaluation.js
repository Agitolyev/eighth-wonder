/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 6.9,
  suggestedWindowYears: 3,
  windows: { "1": 6.92, "3": 6.9, "5": 10.33 },
  rateNow: 44.6746,
  rateThen: 36.5686,
  thenDate: "2023-07-14",
  asOf: "2026-07-14",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
