# The Eighth Wonder 📈

A tiny, dependency-free calculator that puts **simple interest** (withdraw
your returns) next to **compound interest** (reinvest them) — side by side —
so you can see exactly what "the eighth wonder of the world" is worth over
time.

It comes pre-loaded with the propositions I'm actually investing in:

| Proposition | Projected return | Mechanics |
|---|---|---|
| **Inzhur REIT** | ~9.5% p.a. (USD) | Commercial real estate. Pays **monthly dividends** — withdraw them (simple) or reinvest (compound). |
| **Inzhur Energy** | ≈75% over the 5-year term (USD), modelled as ~11.8% p.a. compounded | Power-plant fund, 5-year term. **No dividends** — value accrues via annual revaluation, so it compounds automatically. (The offer's "15% p.a." is the simple-terms quote: 5 × 15% ≈ 75%. Feeding 15% into a compounding model would double-count.) |
| **Varto Wind** | ~14.29% p.a. (EUR), **5% floor** | Wind turbines in the Carpathians, ~11-year term. Pays **quarterly dividends** with a guaranteed 5% floor — withdraw them (simple) or reinvest (compound). |
| **Твоє Коло · Щорічний дохід** | ~6% p.a. (UAH) | Farmland REIT, 5-year term. Pays **annual dividends** from farm rent (before land-price growth) — withdraw or reinvest. |
| **Твоє Коло · Реінвестиція** | ~15% p.a. (USD) | Farmland REIT, ~10-year term. **No dividends** — rent is plowed back into more land, so it compounds automatically until the fund closes. |
| **Сімейні Молочні Ферми · Позика** | ~21% p.a. (UAH), **10% floor** | Direct loan to a private dairy-farm business (not a fund). **10% guaranteed** paid **quarterly** + ~11% projected premium — withdraw or reinvest. The premium is tied to a business plan running to ~2029, so the model stops assuming 21% after ~4 years. |
| **Сімейні Молочні Ферми · Частка** | ~23% p.a. (UAH) | Equity stake in the same business. **Annual dividends** (~10–12%) plus projected share-value growth (~2× by 2029); modelled here as a compounding hold-to-exit. The 2×-by-2029 target is the entire basis for the rate, so the model stops assuming it after ~4 years. |
| **Custom** | your rate | A blank slate to model any rate, term and payout schedule. |

> Projected returns are illustrative, quoted in each fund's own currency, and
> **not guaranteed**. Do your own research. This tool is for modelling only,
> not investment advice.

**Figures last verified: 2026-07-10.** Each fund's numbers are projections
gathered from public sources on that date and shown with an explicit "Data
as of …" stamp in the app. Rates change — always confirm against the fund's
official offer page before acting, and update the `dataAsOf` field when you
refresh them (see below).

## Features

- Pick a proposition; the rate and payout frequency auto-fill (all editable).
  Your time horizon is preserved when you switch propositions.
- **Withdraw vs Reinvest** compared side by side: total invested, income
  withdrawn / interest earned, and ending net worth. For funds that pay
  nothing out (Energy, Реінвестиція, SMF Частка) there is nothing to
  withdraw, so that column relabels itself as the **hypothetical
  no-compounding baseline** and the Withdraw comparison mode is disabled —
  the tool never plots a choice that doesn't exist.
- The **compounding advantage** — how much extra reinvesting earns you.
- **Devaluation-aware currency comparison.** Each fund's rate compounds in
  its own quote currency (a 21% ₴ loan grows hryvnias; a 9.5% $ REIT grows
  dollars). Displaying across ₴/$/€ applies an editable **expected UAH
  devaluation % per year** on top of the FX snapshot, so high-UAH-rate offers
  no longer look like free money next to hard-currency ones. The suggested
  default is the *actual trailing NBU drift* (see below) — a rear-view
  average, clearly labelled, never a forecast. And it never happens
  silently: whenever results cross between a fund's quote currency and the
  display currency, a callout in the results panel says exactly what's being
  applied and why (eroding a ₴ rate shown in $/€, boosting a $/€ rate shown
  in ₴, or neutral for hard↔hard), and the comparison section explains which
  lines the assumption converts.
- **Fixed terms are respected.** Past a fund's term (or, for open-ended
  offers like SMF, past the horizon its projection is based on) the model
  liquidates and drops to an editable post-term reinvestment rate, with a
  "term ends" marker on the chart — it never silently extrapolates a rate
  beyond what it stands on.
- **Guaranteed floor vs projection.** Funds with a contractual floor (Varto's
  5%, SMF loan's 10%) show a shaded band between the guaranteed outcome and
  the projected one, plus floor rows in the results — the promise and the
  pitch, never conflated.
- **Whole-unit reinvestment** — you can't buy a fraction of a fund unit (a ₴10
  REIT certificate, a ₴6,000 Energy certificate…), so payouts and top-ups are
  pooled and only buy whole units; anything left over waits as **uninvested
  cash** until it can afford the next one. Toggle it off to model ideal,
  fraction-friendly reinvestment.
- Interactive growth chart + a year-by-year breakdown table.
- Optional recurring monthly top-up, credited (and earning) from the month it
  lands — not batched to the next payout date.
- Toggle the display currency between **$ USD**, **₴ UAH** and **€ EUR**.
  Amounts are held internally in UAH and converted with an **FX snapshot**
  (National Bank of Ukraine rates, stamped with an "FX as of …" note) plus
  the devaluation drift — nothing is fetched at runtime, so the app stays
  offline-friendly.
- Saved comparison options and the devaluation assumption **survive a
  refresh** (localStorage); each comparison chip carries a quote-currency
  badge so ₴ and $ lines are never mistaken for like-for-like.
- Runs entirely in your browser — no build step, no dependencies, no data leaves the page.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How the numbers work

The engine (`assets/js/engine.js`, pure functions, unit-tested) steps
month-by-month, accrues returns pro-rata inside each payout period, and
settles them as actual cash flows at the payout dates:

- **Withdraw (simple):** each payout is pocketed as cash income and *not*
  reinvested. Your capital only grows through top-ups. *Net worth =
  remaining capital + all income withdrawn.*
- **Reinvest (compound):** each payout is added back to the balance, so the
  next period earns on a larger base.

**Rate semantics.** Distributing funds quote a *cash yield*, so the rate is
nominal: each period pays `rate/n`, and with no top-ups the two legs
reproduce the textbook formulas exactly — `P·(1 + r·t)` for simple and
`P·(1 + r/n)^(n·t)` for compound. (Reinvesting monthly dividends genuinely
beats annual ones — that effect is real.) Non-distributing funds quote a
*growth rate*, so it's treated as effective annual: value multiplies by
`(1+r)` per year regardless of the revaluation cadence.

**Terms.** Past `termYears` (or `projectionYears` for open-ended offers whose
rate is tied to a dated business plan), the position is liquidated into one
pot that earns the editable post-term rate — the fund's own rate is never
extrapolated beyond its basis.

**Currencies.** The simulation runs in the fund's quote currency. Displaying
in another currency applies `uahPer(hard, t) = uahPer(hard, 0)·(1+d)^t`,
where `d` is the expected UAH devaluation — so a ₴ rate and a $ rate meet on
economically honest terms instead of a frozen exchange rate. Hard↔hard cross
rates stay static; everything is assumed to sit in the fund's currency until
the end of the horizon.

## Hosting on GitHub Pages

The site is the repository root (plain static files), deployed by
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

**Enable Pages once before the first deploy** (this step is required — the
workflow's built-in token can't create the Pages site on its own):

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually) — the site publishes to
   `https://<user>.github.io/eighth-wonder/`.

If you skip step 2 the deploy fails with *"Get Pages site failed … Not
Found"* / *"Resource not accessible by integration"*. Enabling the
**GitHub Actions** source is what fixes it.

A `.nojekyll` file is included so the `assets/` folder is served untouched.

## Project layout

```
index.html                     markup
assets/css/styles.css          styling
assets/js/data.js              company propositions (add your own here) + currencies
assets/js/engine.js            pure calculation engine (simulation, parsing, FX drift)
assets/js/app.js               DOM: inputs, charts, comparisons, persistence
assets/js/fx-rates.js          conversion rates the page loads (auto-generated)
assets/data/fx-rates.csv       conversion rates, source of truth (updated daily)
scripts/update-fx.mjs          fetches NBU rates → rewrites the CSV + regenerates the JS
assets/js/funds-live.js        live per-fund figures the page loads (auto-generated)
assets/data/funds.csv          per-fund certificate prices, source of truth (updated daily)
scripts/update-funds.mjs       fetches official pages → rewrites the CSV + regenerates the JS
assets/js/devaluation.js       trailing UAH/USD drift the page loads (auto-generated)
assets/data/devaluation.csv    devaluation windows, source of truth (updated daily)
scripts/update-devaluation.mjs fetches NBU history → rewrites the CSV + regenerates the JS
tests/                         unit tests (node --test) for the engine + script parsers
```

Adding a new company is a one-object edit in `assets/js/data.js`.

## Tests

```bash
node --test tests/engine.test.mjs tests/update-scripts.test.mjs
```

No dependencies. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))
runs them on every push/PR, and also checks that the generated `assets/js/*.js`
files match their CSV sources.

## Keeping the numbers current

Every proposition in `assets/js/data.js` carries a `dataAsOf` date and a
`source`. These are surfaced verbatim in the UI (a footer line on each card
and a "Data as of …" badge next to the notes), so the app never presents a
stale rate as if it were live. **When you refresh a fund's `rate` — or any
other figure — bump its `dataAsOf` to the date you checked** and, if needed,
update `source`. The `custom` proposition has no date because the numbers are
your own.

### Currency conversion rates

The **conversion rates** are refreshed automatically. Their source of truth is
`assets/data/fx-rates.csv` (`currency,uah_per,as_of,source`), and the page
loads them from `assets/js/fx-rates.js`, which is **generated** from the CSV —
so the app never fetches at runtime and keeps working offline / straight from
disk. A rate is always shown with an "FX as of …" note, so a stale figure is
never presented as live.

A GitHub Action ([`.github/workflows/update-fx.yml`](.github/workflows/update-fx.yml))
runs daily at 06:20 UTC, pulls the latest [National Bank of Ukraine](https://bank.gov.ua)
rates via `scripts/update-fx.mjs`, and commits the updated CSV + JS if anything
changed. The Pages deploy then runs on its own daily schedule (07:00 UTC) to
republish the site with the fresh rates — a commit made by the update job's
built-in token can't trigger the deploy workflow directly, so the two are
scheduled back to back instead.

To refresh or fix the rates by hand:

```bash
node scripts/update-fx.mjs           # fetch the latest NBU rates, rewrite CSV + JS
node scripts/update-fx.mjs --regen   # just regenerate the JS from the CSV (no network)
```

**Adding a currency:** add it to `window.CURRENCIES` in `assets/js/data.js`
(code + symbol) and to the `DISPLAY` list in `scripts/update-fx.mjs` (its NBU
3-letter code), then run the script. UAH is the base and is always `1`.

### Devaluation assumption

Cross-currency comparisons need an assumption about how fast the hryvnia
loses value against hard currencies — without one, a 21% UAH offer looks
strictly better than a 9.5% USD one, which is exactly the wrong lesson. Since
nobody publishes tomorrow's devaluation, the honest default is the **trailing
one**: how fast the official NBU UAH/USD rate actually drifted over the last
1, 3 and 5 years, annualized. The 3-year window is the suggested default;
the UI labels it a rear-view average, and it's editable.

Source of truth is `assets/data/devaluation.csv` (each row carries the two
NBU rates and dates it was computed from, so every figure is auditable), and
the page loads the generated `assets/js/devaluation.js`. A daily Action
([`.github/workflows/update-devaluation.yml`](.github/workflows/update-devaluation.yml),
06:25 UTC) recomputes it from NBU history via
`scripts/update-devaluation.mjs`. If a window can't be fetched, the previous
value is kept, its `as_of` stays stale, and the job is marked failed — no
figure is ever fabricated.

```bash
node scripts/update-devaluation.mjs           # fetch NBU history, rewrite CSV + JS
node scripts/update-devaluation.mjs --regen   # regenerate the JS from the CSV (no network)
```

### Per-fund figures

The one *objective, verifiable* per-fund number — the **certificate / unit
price** — is refreshed the same way. Its source of truth is
`assets/data/funds.csv` (`id,unit_price_uah,as_of,source_url`), loaded via the
generated `assets/js/funds-live.js`; the app uses it as the whole-unit
reinvestment size and shows it with a **clickable link to the official page it
came from**. Projected returns (`rate`) are *not* fetched — they're marketing
projections and stay curated in `data.js` with their own `dataAsOf` / `source`
(also now a link, via `sourceUrl`).

A daily Action ([`.github/workflows/update-funds.yml`](.github/workflows/update-funds.yml),
06:30 UTC) refreshes the prices **one job per fund** — the matrix is read
straight from `funds.csv`, so adding a CSV row (plus an adapter) adds a job with
no workflow edit. Running per fund means a blocked source only fails **its own**
job, and the Actions UI shows exactly which fund's price is going stale. Each
value carries an `as_of` date, surfaced in the UI as **"updated ‹date›"** so
users always know how fresh it is.

**On failure:** the offer sites are bot-protected and may block CI. When a
fund's fetch or parse fails, `scripts/update-funds.mjs --fund <id>` (1) **falls
back to the last-known price** and leaves its `as_of` stale — never fabricating
a value or advancing the date — and (2) **exits non-zero so that fund's job is
marked failed**, a visible per-fund signal that its data is going stale. Funds
that *did* refresh still commit (`if: always()`); each job's status is
independent. Because these sites routinely block automated requests, expect
some of these jobs to fail often — that's the honest signal, not a bug.

```bash
node scripts/update-funds.mjs           # fetch official pages, rewrite CSV + JS
node scripts/update-funds.mjs --regen   # regenerate the JS from the CSV (no network)
```
