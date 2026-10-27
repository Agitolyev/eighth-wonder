/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.65,
  suggestedWindowYears: 3,
  windows: { "1": 8.43, "3": 7.65, "5": 11.5 },
  rateNow: 45.5382,
  rateThen: 36.5082,
  thenDate: "2023-10-27",
  asOf: "2026-10-27",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
