/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.01,
  suggestedWindowYears: 3,
  windows: { "1": 7.26, "3": 7.01, "5": 10.68 },
  rateNow: 44.8086,
  rateThen: 36.5686,
  thenDate: "2023-07-27",
  asOf: "2026-07-27",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
