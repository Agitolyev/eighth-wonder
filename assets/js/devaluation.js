/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.36,
  suggestedWindowYears: 3,
  windows: { "1": 7.89, "3": 7.36, "5": 11.4 },
  rateNow: 45.2021,
  rateThen: 36.5312,
  thenDate: "2023-10-26",
  asOf: "2026-10-26",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
