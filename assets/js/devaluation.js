/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.12,
  suggestedWindowYears: 3,
  windows: { "1": 7.84, "3": 7.12, "5": 11.36 },
  rateNow: 45.0013,
  rateThen: 36.6118,
  thenDate: "2023-10-20",
  asOf: "2026-10-20",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
