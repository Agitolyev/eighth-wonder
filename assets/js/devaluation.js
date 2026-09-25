/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.14,
  suggestedWindowYears: 3,
  windows: { "1": 8.6, "3": 7.14, "5": 11.14 },
  rateNow: 44.9729,
  rateThen: 36.5686,
  thenDate: "2023-09-25",
  asOf: "2026-09-25",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
