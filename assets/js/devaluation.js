/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.18,
  suggestedWindowYears: 3,
  windows: { "1": 7.96, "3": 7.18, "5": 11.46 },
  rateNow: 45.0791,
  rateThen: 36.6118,
  thenDate: "2023-10-21",
  asOf: "2026-10-21",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
