/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.12,
  suggestedWindowYears: 3,
  windows: { "1": 8.99, "3": 7.12, "5": 11.1 },
  rateNow: 44.9857,
  rateThen: 36.6023,
  thenDate: "2023-10-05",
  asOf: "2026-10-05",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
