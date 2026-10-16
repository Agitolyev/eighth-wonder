/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 7.27,
  suggestedWindowYears: 3,
  windows: { "1": 7.49, "3": 7.27, "5": 11.24 },
  rateNow: 44.8871,
  rateThen: 36.3688,
  thenDate: "2023-10-16",
  asOf: "2026-10-16",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
