/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.94,
  suggestedWindowYears: 3,
  windows: { "1": 7.87, "3": 7.94, "5": 11.67 },
  rateNow: 45.3222,
  rateThen: 36.036,
  thenDate: "2023-11-12",
  asOf: "2026-11-12",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
