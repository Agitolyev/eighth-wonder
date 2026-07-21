/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 6.92,
  suggestedWindowYears: 3,
  windows: { "1": 7.07, "3": 6.92, "5": 10.43 },
  rateNow: 44.703,
  rateThen: 36.5686,
  thenDate: "2023-07-21",
  asOf: "2026-07-21",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
