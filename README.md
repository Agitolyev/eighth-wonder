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
| **Custom** | your rate | A blank slate to model any rate, term and payout schedule. |

> Projected returns are illustrative, quoted in USD terms, and **not
> guaranteed**. Do your own research. This tool is for modelling only, not
> investment advice.

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
- Toggle between **$ USD** and **₴ UAH** display.
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

To turn it on once this is on the default branch:

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually) — the site publishes to
   `https://<user>.github.io/eighth-wonder/`.

A `.nojekyll` file is included so the `assets/` folder is served untouched.

## Project layout

```
index.html              markup
assets/css/styles.css   styling
assets/js/data.js       company propositions (add your own here)
assets/js/app.js         simulation + rendering
```

Adding a new company is a one-object edit in `assets/js/data.js`.
