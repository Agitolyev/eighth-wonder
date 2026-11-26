/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.76,
  suggestedWindowYears: 3,
  windows: { "1": 6.64, "3": 7.76, "5": 10.79 },
  rateNow: 45.1064,
  rateThen: 36.0487,
  thenDate: "2023-11-27",
  asOf: "2026-11-27",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
