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
 *  rate          projected annual return, %. For distributing funds this is
 *                read as a cash yield (rate/frequency paid per period); for
 *                non-distributing funds as an effective annual growth rate.
 *  guaranteedRate contractually guaranteed floor, % p.a. (optional). Shown as
 *                a shaded floor band on the chart and floor rows in the
 *                results, so the guaranteed and projected outcomes are never
 *                conflated. Omit when nothing is guaranteed.
 *  currency      currency the return is quoted in ('USD' | 'UAH' | 'EUR').
 *                The simulation runs in this currency; displaying in another
 *                applies the FX snapshot plus the UAH-devaluation assumption.
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
 *  unitized      set to false for offers that are NOT sold in certificates
 *                (e.g. a direct loan): whole-unit reinvestment then defaults
 *                to OFF instead of misusing the entry minimum as a unit size,
 *                which would silently crush the compounding leg.
 *  termYears     fund lifetime in years (null = open-ended). Beyond it the
 *                model liquidates and drops to the editable post-term rate —
 *                it never silently extrapolates the fund's rate past its term.
 *  projectionYears how far out the *projection itself* has any basis, for
 *                open-ended offers whose rate is tied to a dated business
 *                plan (e.g. SMF's "2× by end of 2029"). Treated like a term
 *                by the model: past it, the rate has no source to stand on.
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
    rate: 11.8,
    currency: "USD",
    payout: "annual",
    distributes: false,
    minInvestment: 6000,
    termYears: 5,
    accent: "#f59e0b",
    highlights: [
      "≈75% over the 5-year term projected in USD (~11.8% p.a. compounded)",
      "No dividends — value accrues via annual revaluation",
      "Certificate from ₴6,000",
      "5-year fund, first 34 MW plant online 2026",
    ],
    note:
      "Inzhur Energy pays no cash distributions — your certificate is " +
      "re-valued once a year, so returns compound automatically inside the " +
      "fund until you exit. The offer is marketed as ~15% p.a. / ≈75% over " +
      "5 years — i.e. 15% × 5 in SIMPLE terms. Since this model compounds " +
      "the rate (as the fund itself does), it uses the compounding-equivalent " +
      "~11.8% p.a., which reproduces the same ≈75% total; feeding 15% into a " +
      "compounding model would double-count and show ≈101% instead.",
    dataAsOf: "2026-07-12",
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
    guaranteedRate: 5,
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
    id: "tvoe-kolo-income",
    name: "Твоє Коло · Щорічний дохід",
    operator: "Твоє Коло (КУА «Профіт»)",
    tagline: "Co-own farmland leased to farmers — yearly rent in hryvnia.",
    rate: 6,
    currency: "UAH",
    payout: "annual",
    distributes: true,
    minInvestment: 121800,
    unitSize: 1000,
    termYears: 5,
    accent: "#ca8a04",
    highlights: [
      "~6% p.a. planned in UAH from rent (before land-price growth)",
      "Annual dividends paid from farmers' lease payments",
      "5-year land REIT — become a co-owner of farmland",
      "Entry from ₴121,800, then top up from ₴1,000",
    ],
    note:
      "A land REIT run by КУА «Профіт»: you co-own agricultural plots already " +
      "leased to vetted farming companies, and the rent is distributed once a " +
      "year — cash you can withdraw (simple) or reinvest (compound). The 6% is " +
      "the planned rental yield in UAH and excludes any appreciation in the " +
      "land itself. Farmland carries wartime, regulatory and land-market risk, " +
      "so returns are not guaranteed.",
    dataAsOf: "2026-07-12",
    source: "tvoekolo.com.ua fund page + public reporting (DIM.RIA, dev.ua, NV)",
    sourceUrl: "https://tvoekolo.com.ua/fondy-zemelnykh-investytsij/",
    url: "https://invest.tvoekolo.com.ua/",
  },
  {
    id: "tvoe-kolo-reinvest",
    name: "Твоє Коло · Реінвестиція",
    operator: "Твоє Коло (КУА «Профіт»)",
    tagline: "Farmland fund that plows all the rent back into more land.",
    rate: 15,
    currency: "USD",
    payout: "annual",
    distributes: false,
    minInvestment: 121800,
    unitSize: 1000,
    termYears: 10,
    accent: "#4d7c0f",
    highlights: [
      "~15% p.a. projected in USD (incl. land capitalisation)",
      "No cash payouts — rent buys more land and compounds",
      "~10-year fund launched 2024, single payout at term end",
      "Entry from ₴121,800, then top up from ₴1,000",
    ],
    note:
      "The compounding sibling of Щорічний дохід: instead of paying the rent " +
      "out, the fund reinvests it into more farmland, so value accrues inside " +
      "the certificate until the fund winds down (around 2033). The 'simple' " +
      "column below shows what the same rate would earn without that yearly " +
      "compounding, for comparison. Projected in USD including land-price " +
      "growth — actual returns depend on the land market and are not guaranteed.",
    dataAsOf: "2026-07-12",
    source: "tvoekolo.com.ua fund page + public reporting (DIM.RIA, dev.ua, NV)",
    sourceUrl: "https://tvoekolo.com.ua/fondy-zemelnykh-investytsij/",
    url: "https://invest.tvoekolo.com.ua/",
  },
  {
    id: "smf-loan",
    name: "Сімейні Молочні Ферми · Позика",
    operator: "Сімейні Молочні Ферми (SMF)",
    tagline: "Lend to a network of small family dairy farms — quarterly cash.",
    rate: 21,
    guaranteedRate: 10,
    currency: "UAH",
    payout: "quarterly",
    distributes: true,
    minInvestment: 50000,
    unitized: false,
    termYears: null,
    // The ~11% "investment premium" above the guaranteed 10% is tied to the
    // business plan running to ~2029 — beyond that the 21% has no source.
    projectionYears: 4,
    accent: "#38bdf8",
    highlights: [
      "~21% p.a. projected in UAH (10% guaranteed + ~11% premium)",
      "Guaranteed 10% floor paid out quarterly in cash",
      "A direct loan to a real dairy-farming business, not a fund",
      "Entry from ₴50,000",
    ],
    note:
      "SMF is a private network of ~160 small family dairy farms that raises " +
      "capital directly from investors. The loan option pays a guaranteed 10% " +
      "p.a. as quarterly cash — withdraw it (simple) or reinvest it (compound) — " +
      "plus an 'investment premium' projected at ~11% p.a. Only the 10% is " +
      "contractually guaranteed; the rest is a projection, so edit the rate down " +
      "if you want the guaranteed-only view. This is a direct loan to a private " +
      "business, not a regulated fund certificate — less liquid and less " +
      "supervised than the REITs above, so returns are not guaranteed. Whether " +
      "interest can be re-lent in small increments (or only in new ₴50,000 " +
      "tranches) isn't public, so reinvestment is modelled fraction-friendly by " +
      "default — tick whole-units with your own step to model minimum tranches.",
    dataAsOf: "2026-07-12",
    source: "invest.smf.org.ua offer page + public reporting (ITC.ua, Mind.ua, AgroPortal)",
    sourceUrl: "https://invest.smf.org.ua/en/investments-in-family-dairy-farms/",
    url: "https://invest.smf.org.ua/",
  },
  {
    id: "smf-equity",
    name: "Сімейні Молочні Ферми · Частка",
    operator: "Сімейні Молочні Ферми (SMF)",
    tagline: "Buy a stake in the dairy business — dividends plus share growth.",
    rate: 23,
    currency: "UAH",
    payout: "annual",
    distributes: false,
    minInvestment: 50000,
    unitized: false,
    termYears: null,
    // "Roughly 2× by the end of 2029" is the entire basis for the ~23% —
    // there is no projection at all past that date.
    projectionYears: 4,
    accent: "#0284c7",
    highlights: [
      "~23% p.a. projected in UAH (~10% dividends + share-value growth)",
      "Business stake projected to roughly double by end of 2029",
      "Annual dividends — already paid in practice (₴1.16M distributed)",
      "Entry from ₴50,000",
    ],
    note:
      "The equity option makes you a part-owner of the SMF business: you get " +
      "annual dividends (~10–12% p.a., and they have paid them in practice) and " +
      "your stake is projected to grow — management targets roughly 2× by the " +
      "end of 2029. This card models the total return as a compounding " +
      "hold-to-exit (dividends reinvested + capital appreciation, ~23% p.a.), so " +
      "the 'simple' column shows the same rate without yearly compounding. In " +
      "reality the dividends are cash you could withdraw instead. These are " +
      "aggressive projections for a private, illiquid equity stake — capital " +
      "growth depends on the business and is not guaranteed.",
    dataAsOf: "2026-07-12",
    source: "invest.smf.org.ua offer page + public reporting (ITC.ua, Mind.ua, Minfin)",
    sourceUrl: "https://invest.smf.org.ua/en/investments-in-family-dairy-farms/",
    url: "https://invest.smf.org.ua/",
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
