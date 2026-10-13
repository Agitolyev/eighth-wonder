/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.4,
  suggestedWindowYears: 3,
  windows: { "1": 8.34, "3": 7.4, "5": 11.34 },
  rateNow: 45.0802,
  rateThen: 36.3931,
  thenDate: "2023-10-14",
  asOf: "2026-10-14",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
