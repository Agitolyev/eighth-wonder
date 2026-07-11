/**
 * Company propositions.
 *
 * Each proposition describes a real investment offer so the calculator can
 * pre-fill sensible defaults. All figures below are *projected* / historical
 * numbers gathered from public sources and are NOT guarantees — every field is
 * editable in the UI so you can model your own assumptions.
 *
 * Fields
 *  id            unique slug
 *  name          display name
 *  operator      fund manager
 *  tagline       one-line pitch
 *  rate          projected annual return, % (nominal)
 *  currency      currency the return is quoted in ('USD' | 'UAH')
 *  payout        how returns reach the investor:
 *                  'monthly'   -> distributes cash monthly (can withdraw or reinvest)
 *                  'quarterly' -> distributes cash quarterly
 *                  'annual'    -> accrues once a year
 *  distributes   true  = pays cash you could pocket (dividends)
 *                false = value only accrues inside the certificate (no cash out)
 *  minInvestment entry ticket — the smallest first investment, in UAH.
 *                Also used as the whole-unit reinvestment step unless
 *                unitSize overrides it (see below).
 *  unitSize      price of a single fund unit / certificate, in UAH (optional).
 *                Set this when the entry ticket is several units but you can
 *                subsequently top up one unit at a time (e.g. Varto). When
 *                omitted, the entry ticket is assumed to be one unit.
 *  termYears     fund lifetime in years (null = open-ended)
 *  accent        theme colour for the card
 *  highlights    short bullet facts
 *  note          honesty / risk caveat
 *  dataAsOf      date these figures were last verified (YYYY-MM-DD).
 *                UPDATE THIS whenever you refresh a fund's numbers.
 *  source        where the figures came from (short text)
 *  sourceUrl     link to the page the figures were taken from — shown as a
 *                clickable "Source" in the UI, so every number is traceable.
 *  url           official offer page
 *
 * Objective, verifiable fields (currently the certificate/unit price) can be
 * refreshed automatically from the official pages — see assets/data/funds.csv
 * and scripts/update-funds.mjs. Projected figures like `rate` stay curated here.
 */
/**
 * Currency display options.
 *
 * The calculator's engine is unit-agnostic (it works in pure ratios), so
 * currency only affects *display*: amounts are held internally in UAH and
 * converted to the selected currency. Adding a currency here also means adding
 * its NBU code to scripts/update-fx.mjs so the daily job fetches its rate.
 *
 * The conversion rates themselves live in `window.FX` (assets/js/fx-rates.js),
 * which is auto-generated from assets/data/fx-rates.csv — see that script.
 */
window.CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "UAH", symbol: "₴" },
  { code: "EUR", symbol: "€" },
];

window.PROPOSITIONS = [
  {
    id: "inzhur-reit",
    name: "Inzhur REIT",
    operator: "ІНЖУР",
    tagline: "Commercial real estate — Silpo, McDonald's, retail parks.",
    rate: 9.5,
    currency: "USD",
    payout: "monthly",
    distributes: true,
    minInvestment: 10,
    termYears: null,
    accent: "#2dd4bf",
    highlights: [
      "~9.5% p.a. projected in USD terms",
      "Monthly dividends + asset-value growth",
      "Invest from as little as ₴10",
      "Owns land & buildings leased to blue-chip tenants",
    ],
    note:
      "Dividends are paid monthly, so you can either withdraw them (simple) " +
      "or reinvest them (compound). Actual yield depends on occupancy and the " +
      "property market — returns are not guaranteed.",
    dataAsOf: "2026-07-10",
    source: "inzhur.reit offer page + public reporting (Minfin, Kapitalistka)",
    sourceUrl: "https://www.inzhur.reit/offer/inzhur-reit",
    url: "https://www.inzhur.reit/offer/inzhur-reit",
  },
  {
    id: "inzhur-energy",
    name: "Inzhur Energy",
    operator: "ІНЖУР",
    tagline: "Building maneuvering power plants for Ukraine's grid.",
    rate: 15,
    currency: "USD",
    payout: "annual",
    distributes: false,
    minInvestment: 6000,
    termYears: 5,
    accent: "#f59e0b",
    highlights: [
      "~15% p.a. projected in USD (≈75% over 5 years, simple)",
      "No dividends — value accrues via annual revaluation",
      "Certificate from ₴6,000",
      "5-year fund, first 34 MW plant online 2026",
    ],
    note:
      "Inzhur Energy pays no cash distributions — your certificate is " +
      "re-valued once a year, so returns compound automatically inside the " +
      "fund until you exit. The 'simple' column below shows what the same " +
      "rate would earn without that yearly compounding, for comparison.",
    dataAsOf: "2026-07-10",
    source: "inzhur.reit offer page + public reporting (Forbes.ua, dev.ua, Minfin)",
    sourceUrl: "https://www.inzhur.reit/offer/inzhur-energy",
    url: "https://www.inzhur.reit/offer/inzhur-energy",
  },
  {
    id: "varto-wind",
    name: "Varto Wind",
    operator: "Varto (КУА «Портофін»)",
    tagline: "Co-own operating wind turbines in the Carpathians.",
    rate: 14.29,
    currency: "EUR",
    payout: "quarterly",
    distributes: true,
    minInvestment: 125000,
    unitSize: 1025,
    termYears: 11,
    accent: "#22c55e",
    highlights: [
      "~14.29% p.a. projected in EUR (incl. eventual asset sale)",
      "Guaranteed 5% p.a. floor + variable generation income",
      "Quarterly cash payouts from real electricity sales",
      "Entry from ~₴125,000, then top up one ~₴1,025 certificate at a time",
    ],
    note:
      "Varto sells investment certificates that make you an indirect " +
      "co-owner of two operating wind turbines (10.4 MW) in Zakarpattia. A " +
      "5% p.a. minimum is guaranteed regardless of weather; anything above " +
      "that is variable income from actual generation and market prices. " +
      "Quarterly payouts are cash you can withdraw (simple) or reinvest " +
      "(compound). The fund exits by selling the asset after ~11 years — " +
      "projected returns are not guaranteed.",
    dataAsOf: "2026-07-11",
    source: "varto.investments offer page + public reporting (NV, dev.ua, Epravda)",
    sourceUrl: "https://varto.investments/about-fund",
    url: "https://varto.investments/about-fund",
  },
  {
    id: "custom",
    name: "Custom",
    operator: "You",
    tagline: "Model any rate, term and payout schedule yourself.",
    rate: 12,
    currency: "USD",
    payout: "monthly",
    distributes: true,
    minInvestment: 0,
    termYears: null,
    accent: "#818cf8",
    highlights: [
      "Set your own annual rate",
      "Pick monthly, quarterly or annual payouts",
      "Add a recurring top-up if you like",
      "Compare withdraw vs reinvest instantly",
    ],
    note:
      "A blank slate. Enter any assumptions to see how much compounding — " +
      "\"the eighth wonder of the world\" — adds over time.",
    url: "",
  },
];
