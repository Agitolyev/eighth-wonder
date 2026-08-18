/* AUTO-GENERATED from assets/data/devaluation.csv by scripts/update-devaluation.mjs.
 * Do not edit by hand — the daily "Update devaluation" workflow overwrites it.
 * Trailing UAH/USD drift from NBU official rates — the calculator's
 * SUGGESTED devaluation assumption, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.DEVAL = {
  suggestedPct: 6.92,
  suggestedWindowYears: 3,
  windows: { "1": 8.11, "3": 6.92, "5": 10.87 },
  rateNow: 44.6938,
  rateThen: 36.5686,
  thenDate: "2023-08-18",
  asOf: "2026-08-18",
  source: "National Bank of Ukraine official rates (bank.gov.ua)",
};
