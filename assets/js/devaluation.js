/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.72,
  suggestedWindowYears: 3,
  windows: { "1": 8.37, "3": 7.72, "5": 11.58 },
  rateNow: 45.5293,
  rateThen: 36.4216,
  thenDate: "2023-10-30",
  asOf: "2026-10-30",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
