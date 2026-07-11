/* =========================================================================
 * The Eighth Wonder — simple vs compound interest calculator
 * Pure vanilla JS, no dependencies. Everything runs client-side.
 * ========================================================================= */
(function () {
  "use strict";

  var PROPS = window.PROPOSITIONS || [];
  var CURRENCIES = window.CURRENCIES || [{ code: "USD", symbol: "$" }, { code: "UAH", symbol: "₴" }];
  var FX = window.FX || { uahPer: { USD: 1, UAH: 1 } };
  // Objective per-fund figures (certificate/unit price) refreshed daily from
  // the official pages by scripts/update-funds.mjs; keyed by proposition id.
  var FUND_LIVE = window.FUND_LIVE || {};

  // ---- State ----
  // Money amounts are the source of truth in UAH (`baseUAH`); the input fields
  // and results are just a view of them in the selected display currency.
  var state = {
    propId: PROPS.length ? PROPS[0].id : "custom",
    currencyCode: "USD",
    currency: "$",
    baseUAH: { principal: 0, contribution: 0, step: 0 },
  };

  // ---- Currency / FX ----
  function uahPer(code) {
    var r = FX.uahPer && FX.uahPer[code];
    return isFinite(r) && r > 0 ? r : 1;
  }
  function convert(amount, fromCode, toCode) {
    return (amount || 0) * uahPer(fromCode) / uahPer(toCode);
  }
  function symbolFor(code) {
    for (var i = 0; i < CURRENCIES.length; i++) {
      if (CURRENCIES[i].code === code) return CURRENCIES[i].symbol;
    }
    return code;
  }
  // Round a UAH amount for display in the active currency: whole numbers for
  // sizeable values, more precision for sub-unit amounts (e.g. a ₴10 step is
  // ~$0.22, which must not round to zero).
  function toDisplay(amountUAH) {
    var v = convert(amountUAH, "UAH", state.currencyCode);
    if (!isFinite(v)) return 0;
    var abs = Math.abs(v);
    var dp = abs >= 100 ? 0 : abs >= 1 ? 2 : 4;
    var f = Math.pow(10, dp);
    return Math.round(v * f) / f;
  }

  // Geometry + data of the most recently drawn chart, for hover interaction.
  var chartHover = null;

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
    fxNote: $("fxNote"),
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
    addCompare: $("addCompare"),
    addCompareLabel: $("addCompareLabel"),
    modeBtns: document.querySelectorAll(".mode-btn"),
    clearCompare: $("clearCompare"),
    compareEmpty: $("compareEmpty"),
    compareBody: $("compareBody"),
    compareList: $("compareList"),
    compareChart: $("compareChart"),
    compareTableBody: document.querySelector("#compareTable tbody"),
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

  // Render `text` as a link to `url` (new tab), or plain escaped text if no url.
  function link(url, text) {
    if (!url) return escapeHtml(text);
    return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
      escapeHtml(text) + "</a>";
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
    // Money comes from the UAH source of truth, converted to the display
    // currency at full precision — so results never drift as you toggle
    // currencies, and a sub-unit step isn't degraded by display rounding.
    return {
      principal: Math.max(0, convert(state.baseUAH.principal, "UAH", state.currencyCode)),
      monthly: Math.max(0, convert(state.baseUAH.contribution, "UAH", state.currencyCode)),
      rate: Math.max(0, parseFloat(els.rate.value) || 0),
      frequency: parseInt(els.frequency.value, 10) || 12,
      years: parseInt(els.years.value, 10) || 1,
      wholeUnits: els.wholeUnits.checked,
      step: Math.max(0, convert(state.baseUAH.step, "UAH", state.currencyCode)),
      distributes: currentProp().distributes !== false,
    };
  }

  // Push the UAH source of truth into the money input fields, in display units.
  function refreshMoneyFields() {
    els.principal.value = toDisplay(state.baseUAH.principal);
    els.contribution.value = toDisplay(state.baseUAH.contribution);
    els.step.value = toDisplay(state.baseUAH.step);
  }

  // Apply a display currency: symbol, input affixes and the "FX as of" note.
  var MONEY_KEYS = { principal: "principal", contribution: "contribution", step: "step" };
  function setCurrency(code) {
    state.currencyCode = code;
    state.currency = symbolFor(code);
    els.affixCur.forEach(function (n) { n.textContent = state.currency; });
    if (els.fxNote) {
      els.fxNote.textContent = code === "UAH"
        ? ""
        : "1 " + code + " = " + uahPer(code).toFixed(2) + " ₴ · updated " +
          (FX.asOf || "unknown") + " · " + (FX.source || "FX");
    }
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
    refreshAddButton();
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
        '" stroke="rgba(10,10,10,0.07)" />';
      yLabels += '<text x="' + (m.left - 10) + '" y="' + (parseFloat(gy) + 4) +
        '" text-anchor="end" fill="#9a9a9d" font-size="11">' + shortMoney(val) + "</text>";
    }

    // x labels (a handful)
    var xLabels = "";
    var step = Math.max(1, Math.round(maxX / 6));
    for (var xi = 0; xi <= maxX; xi += step) {
      xLabels += '<text x="' + x(xi).toFixed(1) + '" y="' + (H - 8) +
        '" text-anchor="middle" fill="#9a9a9d" font-size="11">' + xi + "</text>";
    }
    if ((maxX % step) !== 0) {
      xLabels += '<text x="' + x(maxX).toFixed(1) + '" y="' + (H - 8) +
        '" text-anchor="middle" fill="#9a9a9d" font-size="11">' + maxX + "</text>";
    }

    var svg =
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="fillC" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#0f9d63" stop-opacity="0.16"/>' +
            '<stop offset="100%" stop-color="#0f9d63" stop-opacity="0"/>' +
          '</linearGradient>' +
        '</defs>' +
        grid + yLabels + xLabels +
        '<path d="' + area("compound") + '" fill="url(#fillC)" />' +
        '<path d="' + path("contributed") + '" fill="none" stroke="#b4b4b0" stroke-width="1.5" stroke-dasharray="4 4" />' +
        '<path d="' + path("simpleNet") + '" fill="none" stroke="#6b7280" stroke-width="2.5" />' +
        '<path d="' + path("compound") + '" fill="none" stroke="#0f9d63" stroke-width="2.5" />' +
        endDot(x(maxX), y(rows[rows.length - 1].compound), "#0f9d63") +
        endDot(x(maxX), y(rows[rows.length - 1].simpleNet), "#6b7280") +
        hoverLayer() +
      "</svg>";

    els.chart.innerHTML = svg;

    // Remember everything the hover handler needs to map cursor -> data point.
    chartHover = {
      rows: rows, x: x, y: y, m: m, iw: iw, ih: ih, W: W, H: H, maxX: maxX,
    };
  }

  /* -----------------------------------------------------------------------
   * Hover layer — a crosshair, one dot per series and a tooltip that light
   * up as the cursor moves across the chart. Hidden until first hover.
   * --------------------------------------------------------------------- */
  var TIP_W = 176, TIP_H = 96;
  function hoverLayer() {
    return (
      '<g id="hoverLayer" style="display:none" pointer-events="none">' +
        '<line id="hoverLine" stroke="rgba(10,10,10,0.28)" stroke-width="1" stroke-dasharray="3 3" />' +
        '<circle id="hoverDotI" r="4" fill="#b4b4b0" stroke="#ffffff" stroke-width="2" />' +
        '<circle id="hoverDotS" r="5" fill="#6b7280" stroke="#ffffff" stroke-width="2" />' +
        '<circle id="hoverDotC" r="5" fill="#0f9d63" stroke="#ffffff" stroke-width="2" />' +
        '<g id="hoverTip">' +
          '<rect width="' + TIP_W + '" height="' + TIP_H + '" rx="9" ry="9" ' +
            'fill="rgba(10,10,10,0.96)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />' +
          '<text id="tipYear" x="12" y="21" fill="#ffffff" font-size="12" font-weight="700">' +
          '</text>' +
          '<circle cx="15" cy="38" r="4" fill="#0f9d63" />' +
          '<text x="26" y="42" fill="rgba(255,255,255,0.62)" font-size="11">Reinvest</text>' +
          '<text id="tipC" x="' + (TIP_W - 12) + '" y="42" text-anchor="end" fill="#ffffff" font-size="11" font-weight="600"></text>' +
          '<circle cx="15" cy="58" r="4" fill="#6b7280" />' +
          '<text x="26" y="62" fill="rgba(255,255,255,0.62)" font-size="11">Withdraw</text>' +
          '<text id="tipS" x="' + (TIP_W - 12) + '" y="62" text-anchor="end" fill="#ffffff" font-size="11" font-weight="600"></text>' +
          '<circle cx="15" cy="78" r="4" fill="#b4b4b0" />' +
          '<text x="26" y="82" fill="rgba(255,255,255,0.62)" font-size="11">Contributed</text>' +
          '<text id="tipI" x="' + (TIP_W - 12) + '" y="82" text-anchor="end" fill="#ffffff" font-size="11" font-weight="600"></text>' +
        '</g>' +
      '</g>'
    );
  }

  function onChartHover(e) {
    var h = chartHover;
    if (!h) return;
    var svg = els.chart.querySelector("svg");
    if (!svg || !svg.getScreenCTM) return;
    var ctm = svg.getScreenCTM();
    if (!ctm) return;

    // Map the pointer position into the SVG's own coordinate system.
    var pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    var loc = pt.matrixTransform(ctm.inverse());

    // Nearest whole year (rows are one snapshot per year, indexed by year).
    var frac = h.iw ? (loc.x - h.m.left) / h.iw : 0;
    frac = Math.max(0, Math.min(1, frac));
    var year = Math.round(frac * h.maxX);
    var d = h.rows[year];
    if (!d) return;

    var px = h.x(d.year);
    setAttrs(svg.querySelector("#hoverLine"), {
      x1: px.toFixed(1), x2: px.toFixed(1),
      y1: h.m.top, y2: (h.m.top + h.ih),
    });
    setAttrs(svg.querySelector("#hoverDotC"), { cx: px.toFixed(1), cy: h.y(d.compound).toFixed(1) });
    setAttrs(svg.querySelector("#hoverDotS"), { cx: px.toFixed(1), cy: h.y(d.simpleNet).toFixed(1) });
    setAttrs(svg.querySelector("#hoverDotI"), { cx: px.toFixed(1), cy: h.y(d.contributed).toFixed(1) });

    svg.querySelector("#tipYear").textContent = "Year " + d.year;
    svg.querySelector("#tipC").textContent = fmt(d.compound);
    svg.querySelector("#tipS").textContent = fmt(d.simpleNet);
    svg.querySelector("#tipI").textContent = fmt(d.contributed);

    // Keep the tooltip inside the plot: flip to the left near the right edge.
    var tipX = px + 14;
    if (tipX + TIP_W > h.W - h.m.right) tipX = px - 14 - TIP_W;
    tipX = Math.max(h.m.left, Math.min(tipX, h.W - h.m.right - TIP_W));
    var tipY = Math.max(h.m.top, Math.min(h.m.top + 6, h.m.top + h.ih - TIP_H));
    svg.querySelector("#hoverTip").setAttribute("transform", "translate(" + tipX.toFixed(1) + " " + tipY.toFixed(1) + ")");

    svg.querySelector("#hoverLayer").style.display = "";
  }

  function hideChartHover() {
    if (!chartHover) return;
    var layer = els.chart.querySelector("#hoverLayer");
    if (layer) layer.style.display = "none";
  }

  function setAttrs(node, attrs) {
    if (!node) return;
    for (var k in attrs) node.setAttribute(k, attrs[k]);
  }

  function endDot(cx, cy, color) {
    return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="' + color + '" stroke="#ffffff" stroke-width="2"/>';
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

  /* =======================================================================
   * Multi-option comparison
   *
   * A comparison entry is a frozen snapshot of the current setup: the chosen
   * proposition's identity plus every assumption. Money is stored in the UAH
   * source of truth (like the live inputs) so entries re-express correctly
   * when the display currency changes — they are re-simulated on each render
   * rather than caching currency-specific numbers.
   * ===================================================================== */
  var comparisons = [];
  var compareSeq = 0;
  var COMPARE_MAX = 6;
  // Which single trajectory the next "Add" captures: 'reinvest' or 'withdraw'.
  var plotMode = "reinvest";
  function modeLabel(mode) { return mode === "withdraw" ? "Withdraw" : "Reinvest"; }
  // Distinct, theme-safe line colours; assigned so removals don't recolour.
  var COMPARE_PALETTE = [
    "#0f9d63", "#2563eb", "#f59e0b", "#e11d48",
    "#8b5cf6", "#0891b2", "#65a30d", "#db2777",
  ];
  var compareHover = null;

  // A stable fingerprint of a setup, so the same option isn't added twice.
  // The plot mode is part of the identity: Withdraw and Reinvest of the same
  // setup are two distinct lines you may want side by side.
  function signatureOf(entry) {
    return [
      entry.propId, entry.mode, entry.rate, entry.frequency, entry.years,
      entry.wholeUnits ? 1 : 0, entry.distributes ? 1 : 0,
      Math.round(entry.baseUAH.principal), Math.round(entry.baseUAH.contribution),
      Math.round(entry.baseUAH.step),
    ].join("|");
  }

  // Snapshot the current inputs into a comparison entry (no colour yet).
  function currentSetupEntry() {
    var p = currentProp();
    return {
      propId: state.propId,
      name: p.name || "Custom",
      mode: plotMode,
      rate: Math.max(0, parseFloat(els.rate.value) || 0),
      frequency: parseInt(els.frequency.value, 10) || 12,
      years: parseInt(els.years.value, 10) || 1,
      wholeUnits: els.wholeUnits.checked,
      distributes: currentProp().distributes !== false,
      baseUAH: {
        principal: state.baseUAH.principal,
        contribution: state.baseUAH.contribution,
        step: state.baseUAH.step,
      },
    };
  }

  function pickColor() {
    var used = {};
    comparisons.forEach(function (c) { used[c.color] = true; });
    for (var i = 0; i < COMPARE_PALETTE.length; i++) {
      if (!used[COMPARE_PALETTE[i]]) return COMPARE_PALETTE[i];
    }
    return COMPARE_PALETTE[comparisons.length % COMPARE_PALETTE.length];
  }

  // Is the current setup already saved? Drives the Add button's state.
  function currentIsSaved() {
    var sig = signatureOf(currentSetupEntry());
    return comparisons.some(function (c) { return c.signature === sig; });
  }

  function refreshAddButton() {
    if (!els.addCompare) return;
    var full = comparisons.length >= COMPARE_MAX;
    var saved = currentIsSaved();
    els.addCompare.disabled = full && !saved;
    els.addCompare.classList.toggle("is-added", saved);
    els.addCompareLabel.textContent = saved
      ? "Added to comparison"
      : full
        ? "Comparison full (" + COMPARE_MAX + " max)"
        : "Add " + modeLabel(plotMode) + " to comparison";
  }

  function addComparison() {
    if (comparisons.length >= COMPARE_MAX) return;
    var entry = currentSetupEntry();
    entry.signature = signatureOf(entry);
    if (comparisons.some(function (c) { return c.signature === entry.signature; })) return;
    entry.id = "cmp" + (++compareSeq);
    entry.color = pickColor();
    entry.label = entry.name + " · " + entry.rate + "%";
    entry.modeText = modeLabel(entry.mode);
    comparisons.push(entry);
    renderComparisons();
    refreshAddButton();
  }

  function removeComparison(id) {
    comparisons = comparisons.filter(function (c) { return c.id !== id; });
    renderComparisons();
    refreshAddButton();
  }

  function clearComparisons() {
    comparisons = [];
    renderComparisons();
    refreshAddButton();
  }

  function freqLabel(frequency) {
    return frequency === 1 ? "annual" : frequency === 4 ? "quarterly" : "monthly";
  }

  // Re-simulate every entry in the active currency and return chart/table data.
  // Amount-bearing labels are rebuilt here so they track the display currency.
  function computeComparisons() {
    return comparisons.map(function (c) {
      var principal = Math.max(0, convert(c.baseUAH.principal, "UAH", state.currencyCode));
      var monthly = Math.max(0, convert(c.baseUAH.contribution, "UAH", state.currencyCode));
      var input = {
        principal: principal,
        monthly: monthly,
        rate: c.rate,
        frequency: c.frequency,
        years: c.years,
        wholeUnits: c.wholeUnits,
        step: Math.max(0, convert(c.baseUAH.step, "UAH", state.currencyCode)),
        distributes: c.distributes,
      };
      var r = simulate(input);
      // Describe the assumptions that make this entry distinct from another
      // run of the same fund: starting amount, top-up and payout cadence.
      var money = fmt(principal) + (monthly > 0 ? " +" + fmt(monthly) + "/mo" : "");
      var withdraw = c.mode === "withdraw";
      // One line per entry: the chosen trajectory only.
      var seriesKey = withdraw ? "simpleNet" : "compound";
      var net = withdraw ? r.simpleNet : r.compound;
      return {
        id: c.id,
        color: c.color,
        name: c.name,
        label: c.label,
        modeText: c.modeText,
        rate: c.rate,
        years: c.years,
        moneyFreq: money + " · " + freqLabel(c.frequency),
        chipDetail: money + " · " + c.years + "y · " + freqLabel(c.frequency),
        rows: r.rows.map(function (d) { return { year: d.year, value: d[seriesKey] }; }),
        net: net,
      };
    });
  }

  function renderComparisons() {
    var has = comparisons.length > 0;
    els.compareEmpty.hidden = has;
    els.compareBody.hidden = !has;
    els.clearCompare.hidden = !has;
    if (!has) { compareHover = null; return; }

    var data = computeComparisons();

    // Chips (also the chart legend) + summary table.
    els.compareList.innerHTML = data.map(function (d) {
      var modeClass = d.modeText === "Withdraw" ? " is-withdraw" : "";
      return '<li class="compare-chip">' +
        '<span class="compare-swatch" style="background:' + d.color + '"></span>' +
        '<span class="chip-text">' +
          '<span class="name">' + escapeHtml(d.label) +
            ' <span class="mode-tag' + modeClass + '">' + escapeHtml(d.modeText) + "</span></span>" +
          '<span class="detail">' + escapeHtml(d.chipDetail) + "</span>" +
        "</span>" +
        '<span class="val">' + fmt(d.net) + "</span>" +
        '<button type="button" class="compare-remove" data-id="' + d.id +
        '" aria-label="Remove ' + escapeHtml(d.label) + " (" + escapeHtml(d.modeText) + ')">&times;</button>' +
        "</li>";
    }).join("");

    els.compareTableBody.innerHTML = data.map(function (d) {
      var modeClass = d.modeText === "Withdraw" ? " is-withdraw" : "";
      return "<tr>" +
        '<td><span class="opt-name">' + escapeHtml(d.name) + "</span>" +
          '<span class="opt-detail">' + escapeHtml(d.moneyFreq) + "</span></td>" +
        '<td><span class="mode-tag' + modeClass + '">' + escapeHtml(d.modeText) + "</span></td>" +
        "<td>" + d.rate + "%</td>" +
        "<td>" + d.years + (d.years === 1 ? " yr" : " yrs") + "</td>" +
        "<td>" + fmt(d.net) + "</td>" +
        "</tr>";
    }).join("");

    drawComparisonChart(data);
  }

  /* -----------------------------------------------------------------------
   * Comparison chart — one reinvest (compound) line per saved option, on a
   * shared scale. Options with shorter horizons simply end earlier.
   * --------------------------------------------------------------------- */
  function drawComparisonChart(series) {
    var W = 720, H = 320;
    var m = { top: 18, right: 16, bottom: 30, left: 64 };
    var iw = W - m.left - m.right;
    var ih = H - m.top - m.bottom;

    var maxX = 1, maxY = 0;
    series.forEach(function (s) {
      s.rows.forEach(function (d) {
        maxX = Math.max(maxX, d.year);
        maxY = Math.max(maxY, d.value);
      });
    });
    maxY = niceCeil(maxY);

    function x(v) { return m.left + (maxX ? (v / maxX) * iw : 0); }
    function y(v) { return m.top + ih - (maxY ? (v / maxY) * ih : 0); }

    var ticks = 4, grid = "", yLabels = "";
    for (var t = 0; t <= ticks; t++) {
      var val = (maxY / ticks) * t;
      var gy = y(val).toFixed(1);
      grid += '<line x1="' + m.left + '" y1="' + gy + '" x2="' + (W - m.right) + '" y2="' + gy + '" />';
      yLabels += '<text x="' + (m.left - 10) + '" y="' + (parseFloat(gy) + 4) +
        '" text-anchor="end" fill="#9a9a9d" font-size="11">' + shortMoney(val) + "</text>";
    }

    var xLabels = "";
    var step = Math.max(1, Math.round(maxX / 6));
    for (var xi = 0; xi <= maxX; xi += step) {
      xLabels += '<text x="' + x(xi).toFixed(1) + '" y="' + (H - 8) +
        '" text-anchor="middle" fill="#9a9a9d" font-size="11">' + xi + "</text>";
    }
    if ((maxX % step) !== 0) {
      xLabels += '<text x="' + x(maxX).toFixed(1) + '" y="' + (H - 8) +
        '" text-anchor="middle" fill="#9a9a9d" font-size="11">' + maxX + "</text>";
    }

    var lines = series.map(function (s) {
      var d = s.rows.map(function (pt, i) {
        return (i ? "L" : "M") + x(pt.year).toFixed(1) + " " + y(pt.value).toFixed(1);
      }).join(" ");
      var last = s.rows[s.rows.length - 1];
      return '<path d="' + d + '" fill="none" stroke="' + s.color +
        '" stroke-width="2.5" stroke-linejoin="round" />' +
        endDot(x(last.year), y(last.value), s.color);
    }).join("");

    var svg =
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
        grid + yLabels + xLabels + lines + comparisonHoverLayer(series) +
      "</svg>";

    els.compareChart.innerHTML = svg;
    compareHover = { series: series, x: x, y: y, m: m, iw: iw, ih: ih, W: W, H: H, maxX: maxX };
  }

  var CTIP_W = 244;
  function comparisonHoverLayer(series) {
    var head = 24, rowH = 20, pad = 10;
    var TIP_H = head + series.length * rowH + pad;
    var rows = series.map(function (s, i) {
      var ry = head + i * rowH + 8;
      var tl = s.label + " · " + s.modeText;
      return '<g id="ctipRow' + i + '">' +
        '<circle cx="15" cy="' + ry + '" r="4" fill="' + s.color + '" />' +
        '<text x="26" y="' + (ry + 4) + '" fill="rgba(255,255,255,0.62)" font-size="11">' +
          escapeHtml(tl.length > 26 ? tl.slice(0, 25) + "…" : tl) + "</text>" +
        '<text id="ctipVal' + i + '" x="' + (CTIP_W - 12) + '" y="' + (ry + 4) +
          '" text-anchor="end" fill="#ffffff" font-size="11" font-weight="600"></text>' +
      "</g>";
    }).join("");
    return (
      '<g id="hoverLayer" style="display:none" pointer-events="none">' +
        '<line id="hoverLine" stroke-width="1" stroke-dasharray="3 3" />' +
        '<g id="hoverTip">' +
          '<rect width="' + CTIP_W + '" height="' + TIP_H + '" rx="9" ry="9" ' +
            'fill="rgba(10,10,10,0.96)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />' +
          '<text id="ctipYear" x="12" y="16" fill="#ffffff" font-size="12" font-weight="700"></text>' +
          rows +
        "</g>" +
      "</g>"
    );
  }

  function onComparisonHover(e) {
    var h = compareHover;
    if (!h) return;
    var svg = els.compareChart.querySelector("svg");
    if (!svg || !svg.getScreenCTM) return;
    var ctm = svg.getScreenCTM();
    if (!ctm) return;

    var pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    var loc = pt.matrixTransform(ctm.inverse());

    var frac = h.iw ? (loc.x - h.m.left) / h.iw : 0;
    frac = Math.max(0, Math.min(1, frac));
    var year = Math.round(frac * h.maxX);
    var px = h.x(year);

    setAttrs(svg.querySelector("#hoverLine"), {
      x1: px.toFixed(1), x2: px.toFixed(1), y1: h.m.top, y2: (h.m.top + h.ih),
    });
    svg.querySelector("#ctipYear").textContent = "Year " + year;

    var tipH = 24 + h.series.length * 20 + 10;
    h.series.forEach(function (s, i) {
      var row = s.rows[year]; // rows are one-per-year, indexed by year
      var valNode = svg.querySelector("#ctipVal" + i);
      var rowNode = svg.querySelector("#ctipRow" + i);
      if (row) {
        if (valNode) valNode.textContent = fmt(row.value);
        if (rowNode) rowNode.style.opacity = "1";
      } else {
        if (valNode) valNode.textContent = "—";
        if (rowNode) rowNode.style.opacity = "0.4";
      }
    });

    var tipX = px + 14;
    if (tipX + CTIP_W > h.W - h.m.right) tipX = px - 14 - CTIP_W;
    tipX = Math.max(h.m.left, Math.min(tipX, h.W - h.m.right - CTIP_W));
    var tipY = Math.max(h.m.top, Math.min(h.m.top + 6, h.m.top + h.ih - tipH));
    svg.querySelector("#hoverTip").setAttribute("transform", "translate(" + tipX.toFixed(1) + " " + tipY.toFixed(1) + ")");

    svg.querySelector("#hoverLayer").style.display = "";
  }

  function hideComparisonHover() {
    if (!compareHover) return;
    var layer = els.compareChart.querySelector("#hoverLayer");
    if (layer) layer.style.display = "none";
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
    // minInvestment / unitSize are stored in UAH, matching the baseUAH source
    // of truth; display conversion happens in refreshMoneyFields().
    if (p.minInvestment && state.baseUAH.principal < p.minInvestment) {
      state.baseUAH.principal = p.minInvestment;
    }
    // The unit size drives whole-unit reinvestment. Some funds have an entry
    // ticket larger than one unit (Varto: ~₴125k entry, but you top up one
    // ~₴1,025 certificate at a time), so prefer unitSize and fall back to the
    // entry minimum when a fund's ticket is a single unit. A daily-refreshed
    // live certificate price (FUND_LIVE) overrides the curated unit size.
    var live = FUND_LIVE[p.id];
    var unit = (live && live.unitPriceUAH) || p.unitSize || p.minInvestment;
    if (unit && unit > 0) {
      state.baseUAH.step = unit;
      els.wholeUnits.checked = true;
    } else {
      state.baseUAH.step = 0;
      els.wholeUnits.checked = false;
    }
    refreshMoneyFields();
    syncStepState();

    var meta = p.dataAsOf
      ? '<span class="asof-badge" title="' + escapeHtml(p.source || "") + '">Data as of ' + escapeHtml(p.dataAsOf) + "</span> "
      : "";
    var sourceLine = p.source
      ? '<span class="prop-source">Source: ' + link(p.sourceUrl, p.source) + "</span>"
      : "";
    // Provenance for the auto-tracked certificate price (with its own date/link).
    var priceLine = live && live.unitPriceUAH
      ? '<span class="prop-source">Certificate price ₴' + escapeHtml(live.unitPriceUAH) +
        (live.asOf ? " · updated " + escapeHtml(live.asOf) : "") +
        " · " + link(live.sourceUrl, "official page") + "</span>"
      : "";
    els.propNote.innerHTML = meta + escapeHtml(p.note) + sourceLine + priceLine;

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

    // Seed the display currency, then read the HTML default amounts (typed in
    // that currency) into the UAH source of truth.
    setCurrency(state.currencyCode);
    Object.keys(MONEY_KEYS).forEach(function (k) {
      state.baseUAH[MONEY_KEYS[k]] =
        convert(parseFloat(els[k].value) || 0, state.currencyCode, "UAH");
    });

    // Money fields feed the UAH source of truth as the user types.
    Object.keys(MONEY_KEYS).forEach(function (k) {
      els[k].addEventListener("input", function () {
        state.baseUAH[MONEY_KEYS[k]] =
          convert(parseFloat(els[k].value) || 0, state.currencyCode, "UAH");
        render();
      });
    });
    ["rate", "frequency", "years"].forEach(function (k) {
      els[k].addEventListener("input", render);
    });

    els.wholeUnits.addEventListener("change", function () {
      syncStepState();
      render();
    });

    // Chart hover: highlight the nearest data point and show its numbers.
    els.chart.addEventListener("pointermove", onChartHover);
    els.chart.addEventListener("pointerleave", hideChartHover);

    // Comparison: add / remove / clear + its own chart hover.
    els.modeBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-mode");
        if (!mode || mode === plotMode) return;
        plotMode = mode;
        els.modeBtns.forEach(function (x) {
          x.classList.toggle("is-active", x === b);
        });
        refreshAddButton();
      });
    });
    els.addCompare.addEventListener("click", addComparison);
    els.clearCompare.addEventListener("click", clearComparisons);
    els.compareList.addEventListener("click", function (e) {
      var btn = e.target.closest(".compare-remove");
      if (btn) removeComparison(btn.getAttribute("data-id"));
    });
    els.compareChart.addEventListener("pointermove", onComparisonHover);
    els.compareChart.addEventListener("pointerleave", hideComparisonHover);

    els.curBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var code = b.getAttribute("data-cur");
        if (!code || code === state.currencyCode) return;
        setCurrency(code);          // symbol + affixes + FX note
        refreshMoneyFields();       // re-express the same UAH amounts
        els.curBtns.forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        render();
        renderComparisons();        // saved options re-express in the new currency
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
