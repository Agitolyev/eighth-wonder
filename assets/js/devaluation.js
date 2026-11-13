/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.8,
  suggestedWindowYears: 3,
  windows: { "1": 8, "3": 7.8, "5": 11.52 },
  rateNow: 45.4274,
  rateThen: 36.2643,
  thenDate: "2023-11-16",
  asOf: "2026-11-16",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
