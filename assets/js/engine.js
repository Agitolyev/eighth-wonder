/* =========================================================================
 * The Eighth Wonder — pure calculation engine.
 *
 * No DOM, no state: everything here is a pure function so it can run both in
 * the browser (window.EighthWonderEngine) and under `node --test` (require).
 * ========================================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EighthWonderEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Parse a number the way people actually type money: many locales (Ukrainian
  // included, and iOS shows a comma on the decimal keypad) use "," as the
  // decimal separator and spaces for grouping — while English typists write
  // "1,000,000" with commas as grouping. Disambiguation rule for comma-only
  // input: when every comma-group after the first has exactly 3 digits, the
  // commas are grouping ("1,000" → 1000, "12,345,678" → 12345678); otherwise
  // the last comma is the decimal point ("1,5" → 1.5, "0,75" → 0.75).
  function parseNum(raw) {
    // Strip whitespace and NBSP / narrow-NBSP used as grouping separators.
    var s = String(raw == null ? "" : raw).replace(/[\s\u00a0\u202f]/g, "");
    if (!s) return 0;
    var lastComma = s.lastIndexOf(",");
    var lastDot = s.lastIndexOf(".");
    if (lastComma > -1 && lastDot > -1) {
      // Both present: the rightmost is the decimal point, the other is grouping.
      s = lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
    } else if (lastComma > -1) {
      var parts = s.split(",");
      var grouping = parts.length > 1 &&
        /^[-+]?\d{1,3}$/.test(parts[0]) &&
        parts.slice(1).every(function (g) { return /^\d{3}$/.test(g); });
      s = grouping
        ? parts.join("")
        : parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  /* -----------------------------------------------------------------------
   * Core simulation.
   *
   * Steps MONTH BY MONTH (so top-ups start earning the month after they land,
   * not at the next payout), accrues returns pro-rata inside each payout
   * period, and settles them as cash flows only at payout boundaries.
   *
   * input = {
   *   principal      starting amount, in the fund's quote currency
   *   monthly        recurring top-up per month (same currency)
   *   rate           quoted annual return, %
   *   frequency      payouts per year: 12 | 4 | 1
   *   years          horizon in whole years
   *   wholeUnits     true = reinvest/top-up only in whole units of `step`
   *   step           unit / certificate price (same currency)
   *   distributes    true  = pays cash out (dividend-style)
   *                  false = value accrues inside the certificate
   *   termYears      stop earning `rate` after this many years (null = never):
   *                  the fund winds down (or the projection has no basis
   *                  beyond it) and everything is liquidated to cash
   *   postTermRate   annual %, earned by the liquidated pot after termYears
   * }
   *
   * Rate semantics — the honest reading of how funds quote returns:
   *   distributes=true  → the rate is a CASH YIELD: each period pays out
   *     rate/frequency (nominal). With no top-ups the withdraw leg reproduces
   *     the textbook P·(1+rt) exactly, and reinvesting monthly payouts really
   *     does beat annual ones — that effect is real for dividend funds.
   *   distributes=false → the rate is a GROWTH RATE (effective annual): value
   *     multiplies by (1+r) per year regardless of the revaluation cadence,
   *     so changing `frequency` does not change the outcome.
   *
   *  Withdraw (simple): each payout is pocketed as cash income and NOT
   *    reinvested. Net worth = working capital + idle cash + income to date.
   *  Reinvest (compound): each payout is fed back in, so the next period
   *    earns on a larger base.
   *
   * Fixed unit step: any cash going IN — top-ups and reinvested payouts — is
   * pooled in a buffer and only buys whole units of `step`; the remainder
   * waits as idle cash (earning nothing) until it can afford the next unit.
   * Non-distributing funds revalue internally, so only fresh cash needs to
   * clear the unit price.
   *
   * After termYears: capital + buffers merge into one liquid pot that earns
   * postTermRate (effective annual, credited monthly). The withdraw leg keeps
   * pocketing that income; the reinvest leg compounds it. The unit-step
   * constraint no longer applies — the fund is gone.
   * --------------------------------------------------------------------- */
  function simulate(input) {
    var n = input.frequency;                       // payouts per year: 12/4/1
    var mpp = 12 / n;                              // months per payout period
    var months = Math.round(input.years * 12);
    var termMonths = (typeof input.termYears === "number" && input.termYears > 0)
      ? Math.round(input.termYears * 12)
      : Infinity;

    var r = Math.max(0, input.rate) / 100;
    var periodic = input.distributes ? r / n : Math.pow(1 + r, 1 / n) - 1;
    var perMonth = periodic / mpp;                 // linear accrual within a period
    var postMonthly = Math.pow(1 + Math.max(0, input.postTermRate || 0) / 100, 1 / 12) - 1;

    var step = input.wholeUnits ? Math.max(0, input.step) : 0;
    var distributes = input.distributes;

    // Move as many whole units as the buffer allows into `invested`.
    // Returns [newInvested, remainingBuffer]. The tiny epsilon keeps a buffer
    // that's a whisker below the unit price from missing the purchase when
    // accumulated float error (12 × r/12 ≠ r exactly) is all that separates them.
    function buyUnits(investedAmt, buffer) {
      if (step > 0) {
        var amount = Math.floor(buffer / step + 1e-9) * step;
        return [investedAmt + amount, Math.max(0, buffer - amount)];
      }
      return [investedAmt + buffer, 0]; // fractional: invest everything
    }

    // Withdraw / simple
    var wInvested = input.principal, wBuffer = 0, wAccrual = 0, income = 0;
    // Reinvest / compound
    var rInvested = input.principal, rBuffer = 0, rAccrual = 0;

    var contributed = input.principal;

    var rows = [{
      year: 0,
      contributed: contributed,
      simpleNet: input.principal,
      compound: input.principal,
    }];

    for (var m = 1; m <= months; m++) {
      var inTerm = m <= termMonths;

      if (inTerm) {
        // Accrue pro-rata on whatever is invested right now; pay at boundary.
        wAccrual += wInvested * perMonth;
        rAccrual += rInvested * perMonth;
      } else {
        // Post-term: one liquid pot earning postTermRate, credited monthly.
        income += wInvested * postMonthly;
        rInvested *= 1 + postMonthly;
      }

      // Monthly top-up.
      if (input.monthly > 0) {
        contributed += input.monthly;
        if (inTerm) {
          wBuffer += input.monthly;
          rBuffer += input.monthly;
        } else {
          wInvested += input.monthly;
          rInvested += input.monthly;
        }
      }

      if (inTerm) {
        // Fresh cash buys units as soon as it can afford them.
        var wb = buyUnits(wInvested, wBuffer); wInvested = wb[0]; wBuffer = wb[1];
        var rb = buyUnits(rInvested, rBuffer); rInvested = rb[0]; rBuffer = rb[1];

        if (m % mpp === 0) {
          // Payout boundary: settle the accrued return as an actual cash flow.
          income += wAccrual; wAccrual = 0;
          if (distributes) rBuffer += rAccrual;   // cash payout → buy whole units
          else rInvested += rAccrual;             // internal revaluation
          rAccrual = 0;
          rb = buyUnits(rInvested, rBuffer); rInvested = rb[0]; rBuffer = rb[1];
        }

        if (m === termMonths) {
          // Fund winds down: capital is returned, idle cash merges in, and the
          // whole-unit constraint disappears with the fund itself.
          wInvested += wBuffer; wBuffer = 0;
          rInvested += rBuffer; rBuffer = 0;
        }
      }

      if (m % 12 === 0) {
        rows.push({
          year: m / 12,
          contributed: contributed,
          simpleNet: wInvested + wBuffer + wAccrual + income,
          compound: rInvested + rBuffer + rAccrual,
        });
      }
    }

    return {
      contributed: contributed,
      incomeWithdrawn: income,
      simpleNet: wInvested + wBuffer + wAccrual + income,
      compound: rInvested + rBuffer + rAccrual,
      compoundInterest: (rInvested + rBuffer + rAccrual) - contributed,
      idleCash: rBuffer,
      rows: rows,
    };
  }

  /* -----------------------------------------------------------------------
   * Cross-currency display with a devaluation assumption.
   *
   * The FX snapshot gives today's ₴-per-unit for each hard currency. A single
   * flat assumption — "UAH loses devalPct % per year against hard currencies"
   * — drifts that snapshot over time:
   *
   *   uahPer(hard, t) = uahPer(hard, 0) · (1 + d)^t      uahPer(UAH, t) = 1
   *
   * fxFactorAt(quote, display, …, t) is what one unit of the QUOTE currency is
   * worth in the DISPLAY currency at year t. Hard↔hard conversions cancel the
   * drift (the cross rate stays the snapshot), UAH↔hard conversions feel it in
   * full, and t=0 reproduces the static snapshot exactly.
   * --------------------------------------------------------------------- */
  function fxFactorAt(quoteCode, displayCode, uahPer0, devalPct, tYears) {
    var d = isFinite(devalPct) ? devalPct / 100 : 0;
    if (d <= -1) d = -0.99;
    function at(code) {
      if (code === "UAH") return 1;
      var base = uahPer0 && isFinite(uahPer0[code]) && uahPer0[code] > 0 ? uahPer0[code] : 1;
      return base * Math.pow(1 + d, tYears);
    }
    return at(quoteCode) / at(displayCode);
  }

  /* -----------------------------------------------------------------------
   * Post-term currency rollover.
   *
   * A fund's currency indexation dies with the fund: when it winds down (or
   * its projection horizon passes), the proceeds land wherever the investor
   * puts them — and THAT currency decides their devaluation exposure from
   * then on. Modelled as an exchange at the term date, at that date's
   * drifted rate:
   *
   *   t ≤ term:  value is in the quote currency        → fx(quote→display, t)
   *   t > term:  exchanged at term, grows in postCode  → fx(quote→postCode, term)
   *                                                      · fx(postCode→display, t)
   *
   * With postCode === quote (or no term) this reduces to fxFactorAt exactly.
   * --------------------------------------------------------------------- */
  function rolloverFactorAt(quoteCode, postCode, termYears, displayCode, uahPer0, devalPct, tYears) {
    var hasTerm = typeof termYears === "number" && termYears > 0;
    if (!hasTerm || tYears <= termYears || !postCode || postCode === quoteCode) {
      return fxFactorAt(quoteCode, displayCode, uahPer0, devalPct, tYears);
    }
    return fxFactorAt(quoteCode, postCode, uahPer0, devalPct, termYears) *
      fxFactorAt(postCode, displayCode, uahPer0, devalPct, tYears);
  }

  /* -----------------------------------------------------------------------
   * Real-terms deflator — "show in today's money".
   *
   * Hard currencies melt too: a nominal $ amount t years out is worth less
   * than the same amount today. Deflating by hard-currency inflation i:
   *
   *   display in $/€:  1 / (1+i)^t
   *   display in ₴:    1 / ((1+i)^t · (1+d)^t)
   *
   * The ₴ deflator adds the devaluation drift because under the flat model a
   * hryvnia price level tracks the hard price level times the FX drift. This
   * makes REAL values display-currency-invariant: the same purchasing power
   * is reported whether you view in $, € or ₴ (they differ only by today's
   * static rate).
   * --------------------------------------------------------------------- */
  function deflatorAt(displayCode, inflPct, devalPct, tYears) {
    var i = isFinite(inflPct) ? inflPct / 100 : 0;
    if (i <= -1) i = -0.99;
    var f = Math.pow(1 + i, tYears);
    if (displayCode === "UAH") {
      var d = isFinite(devalPct) ? devalPct / 100 : 0;
      if (d <= -1) d = -0.99;
      f *= Math.pow(1 + d, tYears);
    }
    return 1 / f;
  }

  return {
    parseNum: parseNum,
    simulate: simulate,
    fxFactorAt: fxFactorAt,
    rolloverFactorAt: rolloverFactorAt,
    deflatorAt: deflatorAt,
  };
});
