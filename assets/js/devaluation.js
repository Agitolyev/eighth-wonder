/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.74,
  suggestedWindowYears: 3,
  windows: { "1": 8.06, "3": 7.74, "5": 11.52 },
  rateNow: 45.3526,
  rateThen: 36.2655,
  thenDate: "2023-11-02",
  asOf: "2026-11-02",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
