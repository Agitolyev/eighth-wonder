/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.6,
  suggestedWindowYears: 3,
  windows: { "1": 6.58, "3": 7.6, "5": 11 },
  rateNow: 44.9293,
  rateThen: 36.0675,
  thenDate: "2023-11-23",
  asOf: "2026-11-23",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
