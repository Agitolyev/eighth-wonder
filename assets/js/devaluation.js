/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.99,
  suggestedWindowYears: 3,
  windows: { "1": 7.04, "3": 7.99, "5": 10.99 },
  rateNow: 45.3541,
  rateThen: 36.0143,
  thenDate: "2023-11-25",
  asOf: "2026-11-25",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
