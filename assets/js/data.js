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
 *  minInvestment smallest ticket, in UAH
 *  termYears     fund lifetime in years (null = open-ended)
 *  accent        theme colour for the card
 *  highlights    short bullet facts
 *  note          honesty / risk caveat
 *  dataAsOf      date these figures were last verified (YYYY-MM-DD).
 *                UPDATE THIS whenever you refresh a fund's numbers.
 *  source        where the figures came from
 *  url           official offer page
 */
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
    termYears: 11,
    accent: "#22c55e",
    highlights: [
      "~14.29% p.a. projected in EUR (incl. eventual asset sale)",
      "Guaranteed 5% p.a. floor + variable generation income",
      "Quarterly cash payouts from real electricity sales",
      "Entry from ~₴125,000 (≈122 certificates)",
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
