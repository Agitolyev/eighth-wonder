/* AUTO-GENERATED from assets/data/inflation.csv by scripts/update-inflation.mjs.
 * Do not edit by hand — the daily "Update inflation" workflow overwrites it.
 * Trailing US CPI-U drift — the calculator's SUGGESTED hard-currency
 * inflation for the today's-money view, not a forecast. Static snapshot:
 * nothing is fetched at runtime, so the app runs offline. */
window.INFL = {
  suggestedPct: 2.8,
  suggestedWindowYears: 10,
  windows: { "1": 4.25, "3": 4.96, "10": 2.8 },
  cpiNow: 314.175,
  cpiThen: 238.343,
  thenMonth: "2014-06",
  asOf: "2024-06",
  source: "US CPI-U (CUUR0000SA0), Bureau of Labor Statistics (bls.gov)",
};
