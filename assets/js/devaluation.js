/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.32,
  suggestedWindowYears: 3,
  windows: { "1": 7.73, "3": 7.32, "5": 11.29 },
  rateNow: 44.9801,
  rateThen: 36.3931,
  thenDate: "2023-10-15",
  asOf: "2026-10-15",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
