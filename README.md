# The Eighth Wonder 📈

A tiny, dependency-free calculator that puts **simple interest** (withdraw
your returns) next to **compound interest** (reinvest them) — side by side —
so you can see exactly what "the eighth wonder of the world" is worth over
time.

It comes pre-loaded with the propositions I'm actually investing in:

| Proposition | Projected return | Mechanics |
|---|---|---|
| **Inzhur REIT** | ~9.5% p.a. (USD) | Commercial real estate. Pays **monthly dividends** — withdraw them (simple) or reinvest (compound). |
| **Inzhur Energy** | ~15% p.a. (USD) | Power-plant fund, 5-year term. **No dividends** — value accrues via annual revaluation, so it compounds automatically. |
| **Varto Wind** | ~14.29% p.a. (EUR) | Wind turbines in the Carpathians, ~11-year term. Pays **quarterly dividends** with a guaranteed 5% floor — withdraw them (simple) or reinvest (compound). |
| **Custom** | your rate | A blank slate to model any rate, term and payout schedule. |

> Projected returns are illustrative, quoted in USD terms, and **not
> guaranteed**. Do your own research. This tool is for modelling only, not
> investment advice.

**Figures last verified: 2026-07-10.** Each fund's numbers are projections
gathered from public sources on that date and shown with an explicit "Data
as of …" stamp in the app. Rates change — always confirm against the fund's
official offer page before acting, and update the `dataAsOf` field when you
refresh them (see below).

## Features

- Pick a proposition; the rate, payout frequency and term auto-fill (all editable).
- **Withdraw vs Reinvest** compared side by side: total invested, income
  withdrawn / interest earned, and ending net worth.
- The **compounding advantage** — how much extra reinvesting earns you.
- **Whole-unit reinvestment** — you can't buy a fraction of a fund unit (a ₴10
  REIT certificate, a ₴6,000 Energy certificate…), so payouts and top-ups are
  pooled and only buy whole units; anything left over waits as **uninvested
  cash** until it can afford the next one. Toggle it off to model ideal,
  fraction-friendly reinvestment.
- Interactive growth chart + a year-by-year breakdown table.
- Optional recurring monthly top-up.
- Toggle the display currency between **$ USD**, **₴ UAH** and **€ EUR**.
  Amounts are held internally in UAH and converted with a **static FX
  snapshot** (National Bank of Ukraine rates, stamped with an "FX as of …"
  note) — nothing is fetched at runtime, so the app stays offline-friendly.
  The `%` rate is currency-independent and is never converted.
- Runs entirely in your browser — no build step, no dependencies, no data leaves the page.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How the numbers work

The calculator steps period-by-period at the chosen payout frequency and
records a yearly snapshot:

- **Withdraw (simple):** each period's return is paid out as cash income and
  *not* reinvested. Your capital only grows through top-ups. *Net worth =
  remaining capital + all income withdrawn.*
- **Reinvest (compound):** each period's return is added back to the balance,
  so the next period earns on a larger base.

With no top-ups this reproduces the textbook formulas exactly —
`P·(1 + r·t)` for simple and `P·(1 + r/n)^(n·t)` for compound.

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
index.html                markup
assets/css/styles.css     styling
assets/js/data.js         company propositions (add your own here) + currencies
assets/js/app.js          simulation + rendering
assets/js/fx-rates.js     conversion rates the page loads (auto-generated)
assets/data/fx-rates.csv  conversion rates, source of truth (updated daily)
scripts/update-fx.mjs     fetches NBU rates → rewrites the CSV + regenerates the JS
assets/js/funds-live.js   live per-fund figures the page loads (auto-generated)
assets/data/funds.csv     per-fund certificate prices, source of truth (updated daily)
scripts/update-funds.mjs  fetches official pages → rewrites the CSV + regenerates the JS
```

Adding a new company is a one-object edit in `assets/js/data.js`.

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
06:30 UTC) runs `scripts/update-funds.mjs`, which reads each fund's official
page and parses the price. Each value carries an `as_of` date, surfaced in the
UI as **"updated ‹date›"** so users always know how fresh it is. Each fund has
an adapter in the `ADAPTERS` map; point a new fund at its official page with a
row in the CSV plus an adapter entry.

**On failure:** the offer sites are bot-protected and may block CI. When a
fetch or parse fails, the script (1) **falls back to the last-known price** and
leaves its `as_of` stale — never fabricating a value or advancing the date —
and (2) **exits non-zero so the workflow run is marked failed**, a visible
signal that the data is going stale. Funds that *did* refresh are still
committed (the commit step runs `if: always()`); the run's status stays failed.
Because these sites routinely block automated requests, expect this job to fail
often — that's the honest signal, not a bug.

```bash
node scripts/update-funds.mjs           # fetch official pages, rewrite CSV + JS
node scripts/update-funds.mjs --regen   # regenerate the JS from the CSV (no network)
```
