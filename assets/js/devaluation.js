/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.77,
  suggestedWindowYears: 3,
  windows: { "1": 6.66, "3": 7.77, "5": 10.91 },
  rateNow: 45.0811,
  rateThen: 36.0143,
  thenDate: "2023-11-24",
  asOf: "2026-11-24",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
