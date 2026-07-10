/* =========================================================================
 * The Eighth Wonder — simple vs compound interest calculator
 * Pure vanilla JS, no dependencies. Everything runs client-side.
 * ========================================================================= */
(function () {
  "use strict";

  var PROPS = window.PROPOSITIONS || [];

  // ---- State ----
  var state = {
    propId: PROPS.length ? PROPS[0].id : "custom",
    currency: "$",
  };

  // ---- Element helpers ----
  function $(id) { return document.getElementById(id); }
  var els = {
    cards: $("cards"),
    principal: $("principal"),
    contribution: $("contribution"),
    rate: $("rate"),
    frequency: $("frequency"),
    wholeUnits: $("wholeUnits"),
    step: $("step"),
    stepField: document.querySelector(".reinvest-field"),
    years: $("years"),
    yearsLabel: $("yearsLabel"),
    horizonOut: $("horizonOut"),
    propNote: $("propNote"),
    curBtns: document.querySelectorAll(".cur-btn"),
    affixCur: document.querySelectorAll('[data-affix="currency"]'),
    s_invested: $("s_invested"),
    s_income: $("s_income"),
    s_total: $("s_total"),
    c_invested: $("c_invested"),
    c_interest: $("c_interest"),
    c_idle: $("c_idle"),
    c_idle_row: $("c_idle_row"),
    c_total: $("c_total"),
    advantage: $("advantage"),
    advantagePct: $("advantagePct"),
    chart: $("chart"),
    tableBody: document.querySelector("#table tbody"),
  };

  // ---- Formatting ----
  function fmt(n) {
    if (!isFinite(n)) n = 0;
    var rounded = Math.round(n);
    return state.currency + rounded.toLocaleString("en-US");
  }
  function fmtSigned(n) {
    var s = fmt(Math.abs(n));
    return (n < 0 ? "−" : "+") + s;
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* -----------------------------------------------------------------------
   * Core simulation.
   *
   * We step period-by-period at the chosen payout frequency and record a
   * snapshot at the end of every year.
   *
   *  Withdraw (simple): each period's return is paid out as cash income and
   *    NOT reinvested. Working capital only grows through top-ups. "Net worth"
   *    = working capital + idle cash + all income withdrawn to date.
   *
   *  Reinvest (compound): each period's return is fed back in, so next period
   *    earns on a larger base.
   *
   * Fixed unit step: you can't buy a fraction of a fund unit (a REIT
   * certificate, an Energy certificate, …). Any cash going IN — top-ups, and
   * reinvested payouts — is pooled in a cash buffer and only buys whole units
   * of `step`; the remainder waits as idle cash until it can afford the next
   * unit. Set step <= 0 (checkbox off) for ideal, fraction-friendly investing.
   *
   * Non-distributing funds (Inzhur Energy) pay no cash payout, so their return
   * revalues internally and compounds fractionally regardless of the step; only
   * fresh top-ups have to clear the unit price.
   * --------------------------------------------------------------------- */
  function simulate(input) {
    var periodsPerYear = input.frequency;               // 12 / 4 / 1
    var totalPeriods = input.years * periodsPerYear;
    var periodicRate = input.rate / 100 / periodsPerYear;
    // A monthly top-up spread across each compounding period.
    var contributionPerPeriod = input.monthly * (12 / periodsPerYear);
    var step = input.wholeUnits ? Math.max(0, input.step) : 0;
    var distributes = input.distributes;

    // Move as many whole units as the buffer allows into `invested`.
    // Returns [newInvested, remainingBuffer].
    function buyUnits(investedAmt, buffer) {
      if (step > 0) {
        var amount = Math.floor(buffer / step) * step;
        return [investedAmt + amount, buffer - amount];
      }
      return [investedAmt + buffer, 0]; // fractional: invest everything
    }

    // Withdraw / simple
    var wInvested = input.principal, wBuffer = 0, income = 0;
    // Reinvest / compound
    var rInvested = input.principal, rBuffer = 0;

    var contributed = input.principal;

    var rows = [{
      year: 0,
      contributed: contributed,
      simpleNet: input.principal,
      compound: input.principal,
    }];

    for (var p = 1; p <= totalPeriods; p++) {
      // Interest / payout for this period.
      income += wInvested * periodicRate;              // withdraw: pocketed
      var payout = rInvested * periodicRate;
      if (distributes) {
        rBuffer += payout;                             // cash payout -> buy whole units
      } else {
        rInvested += payout;                           // internal revaluation -> compounds
      }

      // Top-ups arrive as cash and must also clear the unit price.
      contributed += contributionPerPeriod;
      wBuffer += contributionPerPeriod;
      rBuffer += contributionPerPeriod;

      var wb = buyUnits(wInvested, wBuffer); wInvested = wb[0]; wBuffer = wb[1];
      var rb = buyUnits(rInvested, rBuffer); rInvested = rb[0]; rBuffer = rb[1];

      if (p % periodsPerYear === 0) {
        rows.push({
          year: p / periodsPerYear,
          contributed: contributed,
          simpleNet: wInvested + wBuffer + income,
          compound: rInvested + rBuffer,
        });
      }
    }

    return {
      contributed: contributed,
      incomeWithdrawn: income,
      simpleNet: wInvested + wBuffer + income,
      compound: rInvested + rBuffer,
      compoundInterest: (rInvested + rBuffer) - contributed,
      idleCash: rBuffer,
      rows: rows,
    };
  }

  function currentProp() {
    return PROPS.filter(function (x) { return x.id === state.propId; })[0] || {};
  }

  // ---- Read inputs ----
  function readInput() {
    return {
      principal: Math.max(0, parseFloat(els.principal.value) || 0),
      monthly: Math.max(0, parseFloat(els.contribution.value) || 0),
      rate: Math.max(0, parseFloat(els.rate.value) || 0),
      frequency: parseInt(els.frequency.value, 10) || 12,
      years: parseInt(els.years.value, 10) || 1,
      wholeUnits: els.wholeUnits.checked,
      step: Math.max(0, parseFloat(els.step.value) || 0),
      distributes: currentProp().distributes !== false,
    };
  }

  // ---- Render everything ----
  function render() {
    var input = readInput();
    var r = simulate(input);

    els.yearsLabel.textContent = input.years + (input.years === 1 ? " year" : " years");
    els.horizonOut.textContent = input.years;

    els.s_invested.textContent = fmt(r.contributed);
    els.s_income.textContent = fmt(r.incomeWithdrawn);
    els.s_total.textContent = fmt(r.simpleNet);

    els.c_invested.textContent = fmt(r.contributed);
    els.c_interest.textContent = fmt(r.compoundInterest);
    els.c_total.textContent = fmt(r.compound);

    // Idle cash only matters when whole-unit reinvestment leaves a remainder.
    var showIdle = input.wholeUnits && input.step > 0 && Math.round(r.idleCash) > 0;
    els.c_idle.textContent = fmt(r.idleCash);
    els.c_idle_row.classList.toggle("is-hidden", !showIdle);

    var advantage = r.compound - r.simpleNet;
    els.advantage.textContent = fmtSigned(advantage);
    var pct = r.simpleNet > 0 ? (advantage / r.simpleNet) * 100 : 0;
    els.advantagePct.textContent =
      "(" + (advantage >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + "% more from reinvesting)";

    drawChart(r.rows);
    drawTable(r.rows);
  }

  /* -----------------------------------------------------------------------
   * SVG line chart — three series: invested, simple net worth, compound.
   * --------------------------------------------------------------------- */
  function drawChart(rows) {
    var W = 720, H = 320;
    var m = { top: 18, right: 16, bottom: 30, left: 64 };
    var iw = W - m.left - m.right;
    var ih = H - m.top - m.bottom;

    var maxY = 0;
    rows.forEach(function (d) {
      maxY = Math.max(maxY, d.compound, d.simpleNet, d.contributed);
    });
    maxY = niceCeil(maxY);
    var maxX = rows[rows.length - 1].year || 1;

    function x(v) { return m.left + (maxX ? (v / maxX) * iw : 0); }
    function y(v) { return m.top + ih - (maxY ? (v / maxY) * ih : 0); }

    function path(key) {
      return rows.map(function (d, i) {
        return (i ? "L" : "M") + x(d.year).toFixed(1) + " " + y(d[key]).toFixed(1);
      }).join(" ");
    }
    function area(key) {
      return "M" + x(0) + " " + y(0) + " " +
        rows.map(function (d) { return "L" + x(d.year).toFixed(1) + " " + y(d[key]).toFixed(1); }).join(" ") +
        " L" + x(maxX) + " " + y(0) + " Z";
    }

    // gridlines / y ticks
    var ticks = 4, grid = "", yLabels = "";
    for (var t = 0; t <= ticks; t++) {
      var val = (maxY / ticks) * t;
      var gy = y(val).toFixed(1);
      grid += '<line x1="' + m.left + '" y1="' + gy + '" x2="' + (W - m.right) + '" y2="' + gy +
        '" stroke="rgba(148,163,184,0.14)" />';
      yLabels += '<text x="' + (m.left - 10) + '" y="' + (parseFloat(gy) + 4) +
        '" text-anchor="end" fill="#6b7a99" font-size="11">' + shortMoney(val) + "</text>";
    }

    // x labels (a handful)
    var xLabels = "";
    var step = Math.max(1, Math.round(maxX / 6));
    for (var xi = 0; xi <= maxX; xi += step) {
      xLabels += '<text x="' + x(xi).toFixed(1) + '" y="' + (H - 8) +
        '" text-anchor="middle" fill="#6b7a99" font-size="11">' + xi + "</text>";
    }
    if ((maxX % step) !== 0) {
      xLabels += '<text x="' + x(maxX).toFixed(1) + '" y="' + (H - 8) +
        '" text-anchor="middle" fill="#6b7a99" font-size="11">' + maxX + "</text>";
    }

    var svg =
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="fillC" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#34d399" stop-opacity="0.28"/>' +
            '<stop offset="100%" stop-color="#34d399" stop-opacity="0"/>' +
          '</linearGradient>' +
        '</defs>' +
        grid + yLabels + xLabels +
        '<path d="' + area("compound") + '" fill="url(#fillC)" />' +
        '<path d="' + path("contributed") + '" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 4" />' +
        '<path d="' + path("simpleNet") + '" fill="none" stroke="#38bdf8" stroke-width="2.5" />' +
        '<path d="' + path("compound") + '" fill="none" stroke="#34d399" stroke-width="2.5" />' +
        endDot(x(maxX), y(rows[rows.length - 1].compound), "#34d399") +
        endDot(x(maxX), y(rows[rows.length - 1].simpleNet), "#38bdf8") +
      "</svg>";

    els.chart.innerHTML = svg;
  }

  function endDot(cx, cy, color) {
    return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="' + color + '" stroke="#0b1120" stroke-width="2"/>';
  }

  function niceCeil(v) {
    if (v <= 0) return 1;
    var pow = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / pow;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
  }

  function shortMoney(v) {
    var c = state.currency;
    if (v >= 1e6) return c + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M";
    if (v >= 1e3) return c + (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + "k";
    return c + Math.round(v);
  }

  // ---- Table ----
  function drawTable(rows) {
    var html = "";
    rows.forEach(function (d) {
      if (d.year === 0) return;
      var diff = d.compound - d.simpleNet;
      html += "<tr>" +
        "<td>" + d.year + "</td>" +
        "<td>" + fmt(d.contributed) + "</td>" +
        "<td>" + fmt(d.simpleNet) + "</td>" +
        "<td>" + fmt(d.compound) + "</td>" +
        '<td class="diff">' + fmtSigned(diff) + "</td>" +
        "</tr>";
    });
    els.tableBody.innerHTML = html;
  }

  /* -----------------------------------------------------------------------
   * Proposition cards
   * --------------------------------------------------------------------- */
  function renderCards() {
    els.cards.innerHTML = "";
    PROPS.forEach(function (p) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card" + (p.id === state.propId ? " is-active" : "");
      btn.style.setProperty("--card-accent", p.accent);
      btn.setAttribute("aria-pressed", p.id === state.propId ? "true" : "false");

      var rateLine = p.id === "custom"
        ? "your rate"
        : "~" + p.rate + "% p.a. " + p.currency;

      var asOf = p.dataAsOf
        ? '<p class="asof"><span class="asof-dot"></span>Figures as of ' + p.dataAsOf + " · projected, not guaranteed</p>"
        : "";

      btn.innerHTML =
        '<span class="check"></span>' +
        '<span class="op">' + p.operator + "</span>" +
        "<h3>" + p.name + ' <span class="rate">' + rateLine + "</span></h3>" +
        '<p class="tagline">' + p.tagline + "</p>" +
        "<ul>" + p.highlights.map(function (h) { return "<li>" + h + "</li>"; }).join("") + "</ul>" +
        asOf;

      btn.addEventListener("click", function () { selectProp(p.id); });
      els.cards.appendChild(btn);
    });
  }

  function selectProp(id) {
    state.propId = id;
    var p = PROPS.filter(function (x) { return x.id === id; })[0];
    if (!p) return;

    // Apply proposition defaults to inputs.
    els.rate.value = p.rate;
    els.frequency.value = String(payoutToFreq(p.payout));
    if (p.termYears) {
      els.years.max = String(Math.max(30, p.termYears));
      els.years.value = String(p.termYears);
    } else {
      els.years.max = "30";
    }
    if (p.minInvestment && (parseFloat(els.principal.value) || 0) < p.minInvestment) {
      els.principal.value = p.minInvestment;
    }
    // The unit / minimum-investment step drives whole-unit reinvestment.
    if (p.minInvestment && p.minInvestment > 0) {
      els.step.value = p.minInvestment;
      els.wholeUnits.checked = true;
    } else {
      els.step.value = 0;
      els.wholeUnits.checked = false;
    }
    syncStepState();
    var meta = p.dataAsOf
      ? '<span class="asof-badge" title="' + (p.source || "") + '">Data as of ' + p.dataAsOf + "</span> "
      : "";
    els.propNote.innerHTML = meta + escapeHtml(p.note) +
      (p.source ? '<span class="prop-source">Source: ' + escapeHtml(p.source) + "</span>" : "");

    // reflect active state on cards
    var cards = els.cards.querySelectorAll(".card");
    cards.forEach(function (c, i) {
      var active = PROPS[i].id === id;
      c.classList.toggle("is-active", active);
      c.setAttribute("aria-pressed", active ? "true" : "false");
    });

    render();
  }

  function payoutToFreq(payout) {
    return payout === "annual" ? 1 : payout === "quarterly" ? 4 : 12;
  }

  // Grey out the step input when whole-unit reinvestment is disabled.
  function syncStepState() {
    els.stepField.classList.toggle("is-off", !els.wholeUnits.checked);
  }

  /* -----------------------------------------------------------------------
   * Wire up events
   * --------------------------------------------------------------------- */
  function init() {
    renderCards();

    ["principal", "contribution", "rate", "frequency", "years", "step"].forEach(function (k) {
      els[k].addEventListener("input", render);
    });

    els.wholeUnits.addEventListener("change", function () {
      syncStepState();
      render();
    });

    els.curBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var sym = b.getAttribute("data-cur") === "$" ? "$" : "₴";
        state.currency = sym;
        els.affixCur.forEach(function (n) { n.textContent = sym; });
        els.curBtns.forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        render();
      });
    });

    // Apply first proposition's defaults, then render.
    selectProp(state.propId);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
