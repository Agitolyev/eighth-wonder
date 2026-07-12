/* =========================================================================
 * The Eighth Wonder — simple vs compound interest calculator
 * Pure vanilla JS, no dependencies. Everything runs client-side.
 * The math lives in assets/js/engine.js (pure, unit-tested); this file is
 * the DOM: inputs, charts, comparison list, persistence.
 * ========================================================================= */
(function () {
  "use strict";

  var Engine = window.EighthWonderEngine;
  var parseNum = Engine.parseNum;
  var simulate = Engine.simulate;
  var fxFactorAt = Engine.fxFactorAt;

  var PROPS = window.PROPOSITIONS || [];
  var CURRENCIES = window.CURRENCIES || [{ code: "USD", symbol: "$" }, { code: "UAH", symbol: "₴" }];
  var FX = window.FX || { uahPer: { USD: 1, UAH: 1 } };
  // Objective per-fund figures (certificate/unit price) refreshed daily from
  // the official pages by scripts/update-funds.mjs; keyed by proposition id.
  var FUND_LIVE = window.FUND_LIVE || {};
  // Trailing UAH/USD drift (NBU history) refreshed daily by
  // scripts/update-devaluation.mjs — the *suggested* devaluation assumption.
  var DEVAL = window.DEVAL || null;

  var STORE_KEY = "eighth-wonder:v1";

  // ---- State ----
  // Money amounts are the source of truth in UAH (`baseUAH`); the input fields
  // and results are just a view of them in the selected display currency.
  var state = {
    propId: PROPS.length ? PROPS[0].id : "custom",
    currencyCode: "USD",
    currency: "$",
    baseUAH: { principal: 0, contribution: 0, step: 0 },
    // Expected UAH devaluation vs hard currencies, % per year. Seeded from
    // the NBU trailing average (editable, persisted).
    devalPct: DEVAL && isFinite(DEVAL.suggestedPct) ? DEVAL.suggestedPct : 0,
  };

  // ---- Currency / FX ----
  function uahPer(code) {
    var r = FX.uahPer && FX.uahPer[code];
    return isFinite(r) && r > 0 ? r : 1;
  }
  // Static (today's) conversion — used for inputs and anything at t=0.
  function convert(amount, fromCode, toCode) {
    return (amount || 0) * uahPer(fromCode) / uahPer(toCode);
  }
  // Time-aware conversion factor from a fund's quote currency into the display
  // currency at year t, under the devaluation assumption. t=0 === static FX.
  function displayFactor(quoteCode, tYears) {
    return fxFactorAt(quoteCode, state.currencyCode, FX.uahPer, state.devalPct, tYears);
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
    termWarning: $("termWarning"),
    postTermField: $("postTermField"),
    postTermRate: $("postTermRate"),
    deval: $("deval"),
    devalNote: $("devalNote"),
    propNote: $("propNote"),
    curBtns: document.querySelectorAll(".cur-btn"),
    fxNote: $("fxNote"),
    affixCur: document.querySelectorAll('[data-affix="currency"]'),
    s_title: $("s_title"),
    s_sub: $("s_sub"),
    s_hint: $("s_hint"),
    s_income_label: $("s_income_label"),
    s_invested: $("s_invested"),
    s_income: $("s_income"),
    s_floor_row: $("s_floor_row"),
    s_floor_label: $("s_floor_label"),
    s_floor: $("s_floor"),
    s_total: $("s_total"),
    c_invested: $("c_invested"),
    c_interest: $("c_interest"),
    c_idle: $("c_idle"),
    c_idle_row: $("c_idle_row"),
    c_floor_row: $("c_floor_row"),
    c_floor_label: $("c_floor_label"),
    c_floor: $("c_floor"),
    c_total: $("c_total"),
    advantage: $("advantage"),
    advantagePct: $("advantagePct"),
    chart: $("chart"),
    legendSimple: $("legendSimple"),
    legendFloor: $("legendFloor"),
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

  function currentProp() {
    return PROPS.filter(function (x) { return x.id === state.propId; })[0] || {};
  }

  // The horizon (in years) beyond which a proposition's rate has nothing to
  // stand on: the fund's fixed term, or — for open-ended offers whose rate is
  // tied to a dated business plan — the projection horizon. null = unbounded.
  function effectiveTerm(p) {
    var vals = [];
    if (typeof p.termYears === "number" && p.termYears > 0) vals.push(p.termYears);
    if (typeof p.projectionYears === "number" && p.projectionYears > 0) vals.push(p.projectionYears);
    return vals.length ? Math.min.apply(null, vals) : null;
  }

  function clampDeval(v) {
    if (!isFinite(v)) return 0;
    return Math.max(-95, Math.min(100, v));
  }

  // ---- Read inputs ----
  // The simulation runs in the PROPOSITION'S QUOTE CURRENCY — a 21% UAH rate
  // compounds hryvnias, a 9.5% USD rate compounds dollars. Money inputs come
  // from the UAH source of truth converted at today's FX (t=0); the yearly
  // results are then re-expressed in the display currency with the
  // devaluation drift applied (see displayFactor).
  function readInput() {
    var p = currentProp();
    var quote = p.currency || state.currencyCode;
    return {
      quote: quote,
      principal: Math.max(0, convert(state.baseUAH.principal, "UAH", quote)),
      monthly: Math.max(0, convert(state.baseUAH.contribution, "UAH", quote)),
      rate: Math.max(0, parseNum(els.rate.value)),
      frequency: parseInt(els.frequency.value, 10) || 12,
      years: parseInt(els.years.value, 10) || 1,
      wholeUnits: els.wholeUnits.checked,
      step: Math.max(0, convert(state.baseUAH.step, "UAH", quote)),
      distributes: p.distributes !== false,
      termYears: effectiveTerm(p),
      postTermRate: Math.max(0, parseNum(els.postTermRate.value)),
      guaranteedRate: typeof p.guaranteedRate === "number" ? p.guaranteedRate : null,
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

  // The devaluation input's provenance note: where the suggested figure comes
  // from, so it reads as a checkable average — never as a forecast.
  function renderDevalNote() {
    if (!els.devalNote) return;
    var base = "Applied when ₴ amounts are shown in $/€ (or vice versa); " +
      "$/€ cross rates stay static.";
    if (DEVAL && isFinite(DEVAL.suggestedPct)) {
      base += " Suggested " + DEVAL.suggestedPct + "%/yr = actual NBU drift " +
        "over the trailing " + (DEVAL.suggestedWindowYears || "?") + " years " +
        "(₴" + DEVAL.rateThen + " → ₴" + DEVAL.rateNow + " per $, updated " +
        (DEVAL.asOf || "unknown") + ") — a rear-view average, not a forecast.";
    }
    els.devalNote.textContent = base;
  }

  /* -----------------------------------------------------------------------
   * Persistence — saved comparison options + the devaluation assumption
   * survive a refresh. Everything else is cheap to re-enter; these are not.
   * --------------------------------------------------------------------- */
  function saveStore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        v: 1,
        devalPct: state.devalPct,
        comparisons: comparisons.map(function (c) {
          return {
            propId: c.propId, name: c.name, mode: c.mode, rate: c.rate,
            frequency: c.frequency, years: c.years, wholeUnits: c.wholeUnits,
            distributes: c.distributes, quote: c.quote, termYears: c.termYears,
            postTermRate: c.postTermRate, baseUAH: c.baseUAH,
          };
        }),
      }));
    } catch (e) { /* storage unavailable — nothing to do */ }
  }

  function loadStore() {
    var data = null;
    try { data = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); }
    catch (e) { return; }
    if (!data || data.v !== 1) return;
    if (isFinite(data.devalPct)) state.devalPct = clampDeval(Number(data.devalPct));
    (Array.isArray(data.comparisons) ? data.comparisons : []).forEach(function (c) {
      if (!c || !c.baseUAH || !isFinite(c.rate) || !isFinite(c.years)) return;
      if (comparisons.length >= COMPARE_MAX) return;
      var entry = {
        propId: String(c.propId || "custom"),
        name: String(c.name || "Custom"),
        mode: c.mode === "withdraw" ? "withdraw" : "reinvest",
        rate: Math.max(0, Number(c.rate)),
        frequency: [12, 4, 1].indexOf(Number(c.frequency)) > -1 ? Number(c.frequency) : 12,
        years: Math.max(1, Math.round(Number(c.years))),
        wholeUnits: !!c.wholeUnits,
        distributes: c.distributes !== false,
        quote: String(c.quote || "USD"),
        termYears: isFinite(c.termYears) && c.termYears > 0 ? Number(c.termYears) : null,
        postTermRate: isFinite(c.postTermRate) ? Math.max(0, Number(c.postTermRate)) : 0,
        baseUAH: {
          principal: Math.max(0, Number(c.baseUAH.principal) || 0),
          contribution: Math.max(0, Number(c.baseUAH.contribution) || 0),
          step: Math.max(0, Number(c.baseUAH.step) || 0),
        },
      };
      entry.signature = signatureOf(entry);
      if (comparisons.some(function (x) { return x.signature === entry.signature; })) return;
      entry.id = "cmp" + (++compareSeq);
      entry.color = pickColor();
      entry.label = entry.name + " · " + entry.rate + "%";
      entry.modeText = modeLabel(entry.mode);
      comparisons.push(entry);
    });
  }

  /* -----------------------------------------------------------------------
   * Render everything
   * --------------------------------------------------------------------- */
  function render() {
    var input = readInput();
    var r = simulate(input);
    // A contractual floor (Varto's 5%, SMF's 10%) gets its own run so the
    // guaranteed outcome is always visible next to the projected one.
    var floor = input.guaranteedRate != null && input.guaranteedRate < input.rate
      ? simulate(assign({}, input, { rate: input.guaranteedRate }))
      : null;

    els.yearsLabel.textContent = input.years + (input.years === 1 ? " year" : " years");
    els.horizonOut.textContent = input.years;
    updateTermWarning(input);
    updateScenarioLabels(input);

    // Re-express the quote-currency simulation in the display currency, with
    // the devaluation drift applied year by year.
    var rows = r.rows.map(function (d, i) {
      var f = displayFactor(input.quote, d.year);
      return {
        year: d.year,
        contributed: d.contributed * f,
        simpleNet: d.simpleNet * f,
        compound: d.compound * f,
        floor: floor ? floor.rows[i].compound * f : null,
      };
    });
    var fT = displayFactor(input.quote, input.years);

    els.s_invested.textContent = fmt(r.contributed * fT);
    els.s_income.textContent = fmt(r.incomeWithdrawn * fT);
    els.s_total.textContent = fmt(r.simpleNet * fT);

    els.c_invested.textContent = fmt(r.contributed * fT);
    els.c_interest.textContent = fmt(r.compoundInterest * fT);
    els.c_total.textContent = fmt(r.compound * fT);

    // Guaranteed-floor rows: what the same plan yields at the contractual
    // minimum, so the projected number never stands alone.
    els.s_floor_row.classList.toggle("is-hidden", !floor);
    els.c_floor_row.classList.toggle("is-hidden", !floor);
    els.legendFloor.hidden = !floor;
    if (floor) {
      els.s_floor_label.textContent = "At " + input.guaranteedRate + "% floor · net worth";
      els.c_floor_label.textContent = "At " + input.guaranteedRate + "% floor · balance";
      els.s_floor.textContent = fmt(floor.simpleNet * fT);
      els.c_floor.textContent = fmt(floor.compound * fT);
    }

    // Idle cash only matters when whole-unit reinvestment leaves a remainder.
    var showIdle = input.wholeUnits && input.step > 0 && Math.round(r.idleCash) > 0;
    els.c_idle.textContent = fmt(r.idleCash * fT);
    els.c_idle_row.classList.toggle("is-hidden", !showIdle);

    var advantage = (r.compound - r.simpleNet) * fT;
    els.advantage.textContent = fmtSigned(advantage);
    var pct = r.simpleNet > 0 ? ((r.compound - r.simpleNet) / r.simpleNet) * 100 : 0;
    els.advantagePct.textContent = input.distributes
      ? "(" + (advantage >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + "% more from reinvesting)"
      : "(" + (advantage >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + "% vs the hypothetical no-compounding baseline)";

    var effTerm = input.termYears;
    drawChart(rows, {
      termYear: effTerm && input.years > effTerm ? effTerm : null,
      hasFloor: !!floor,
      simpleLabel: input.distributes ? "Withdraw" : "Baseline",
    });
    drawTable(rows);
    refreshAddButton();
  }

  // Object.assign for the ES5-style codebase.
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      for (var k in src) target[k] = src[k];
    }
    return target;
  }

  // For funds with no cash payouts there is nothing to withdraw — the
  // "simple" column is only a what-if baseline, and must say so.
  function updateScenarioLabels(input) {
    if (input.distributes) {
      els.s_title.textContent = "Withdraw";
      els.s_sub.textContent = "simple interest";
      els.s_hint.textContent = "You pocket every payout as income. Capital stays flat.";
      els.s_income_label.textContent = "Income withdrawn";
      els.legendSimple.textContent = "Withdraw (net worth)";
    } else {
      els.s_title.textContent = "No compounding";
      els.s_sub.textContent = "hypothetical";
      els.s_hint.textContent = "This fund pays no cash out — there is nothing to " +
        "withdraw. Shown only as a baseline: the same rate without compounding.";
      els.s_income_label.textContent = "Hypothetical income";
      els.legendSimple.textContent = "No-compounding baseline";
    }
  }

  // Fixed-term funds wind down and return capital; open-ended offers with a
  // dated business plan (SMF) have no basis for their rate beyond it. Either
  // way the model refuses to extrapolate silently: it flags the switch and
  // drops to the editable post-term rate.
  function updateTermWarning(input) {
    var p = currentProp();
    var eff = effectiveTerm(p);
    var show = eff != null && input.years > eff;
    els.termWarning.classList.toggle("is-hidden", !show);
    els.postTermField.classList.toggle("is-hidden", !show);
    if (!show) {
      els.termWarning.textContent = "";
      return;
    }
    var isProjectionBound =
      typeof p.projectionYears === "number" && p.projectionYears > 0 &&
      (typeof p.termYears !== "number" || p.projectionYears <= p.termYears);
    if (isProjectionBound) {
      els.termWarning.textContent =
        p.name + "'s ~" + p.rate + "% is tied to a business plan that runs about " +
        eff + " more years — beyond that the figure has no source at all. From year " +
        (eff + 1) + " the model stops assuming it and reinvests everything at the " +
        "rate below instead of extrapolating.";
    } else {
      els.termWarning.textContent =
        p.name + " runs for about " + eff + " years, then winds down and returns " +
        "your capital. There's no guarantee the same return will be available " +
        "again, so from year " + (eff + 1) + " the model reinvests the proceeds " +
        "at the rate below instead of silently extending the fund.";
    }
  }

  /* -----------------------------------------------------------------------
   * SVG line chart — three series (invested, simple net worth, compound),
   * plus an optional guaranteed-floor band and a term-end marker.
   * --------------------------------------------------------------------- */
  function drawChart(rows, opts) {
    opts = opts || {};
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

    // Guaranteed-floor band: the zone between "what's contractual" and
    // "what's projected" — the honest picture of the promise vs the pitch.
    var floorBand = "";
    if (opts.hasFloor) {
      var down = rows.map(function (d, i) {
        return (i ? "L" : "M") + x(d.year).toFixed(1) + " " + y(d.compound).toFixed(1);
      }).join(" ");
      var back = rows.slice().reverse().map(function (d) {
        return "L" + x(d.year).toFixed(1) + " " + y(d.floor).toFixed(1);
      }).join(" ");
      floorBand =
        '<path d="' + down + " " + back + ' Z" fill="rgba(245,158,11,0.10)" />' +
        '<path d="' + path("floor") + '" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5 4" />';
    }

    // Term-end marker: past this point the fund (or its projection) is gone
    // and the post-term rate takes over. Drawn as <path>, not <line>, so the
    // themed gridline CSS doesn't wash it out.
    var termMark = "";
    if (opts.termYear) {
      var tx = x(opts.termYear).toFixed(1);
      termMark =
        '<path d="M' + tx + " " + m.top + " L" + tx + " " + (m.top + ih) +
          '" stroke="#f59e0b" stroke-width="1" stroke-dasharray="2 3" opacity="0.7" fill="none" />' +
        '<text x="' + tx + '" y="' + (m.top - 5) +
          '" text-anchor="middle" fill="#f59e0b" font-size="10">term ends</text>';
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
        floorBand +
        '<path d="' + path("contributed") + '" fill="none" stroke="#b4b4b0" stroke-width="1.5" stroke-dasharray="4 4" />' +
        '<path d="' + path("simpleNet") + '" fill="none" stroke="#6b7280" stroke-width="2.5" />' +
        '<path d="' + path("compound") + '" fill="none" stroke="#0f9d63" stroke-width="2.5" />' +
        termMark +
        endDot(x(maxX), y(rows[rows.length - 1].compound), "#0f9d63") +
        endDot(x(maxX), y(rows[rows.length - 1].simpleNet), "#6b7280") +
        hoverLayer(opts.simpleLabel || "Withdraw") +
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
  function hoverLayer(simpleLabel) {
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
          '<text x="26" y="62" fill="rgba(255,255,255,0.62)" font-size="11">' + escapeHtml(simpleLabel) + '</text>' +
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
   * proposition's identity plus every assumption — including the quote
   * currency, the effective term and the post-term rate. Money is stored in
   * the UAH source of truth (like the live inputs) so entries re-express
   * correctly when the display currency or the devaluation assumption
   * changes — they are re-simulated on each render rather than caching
   * currency-specific numbers.
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
      entry.quote, entry.termYears == null ? "" : entry.termYears, entry.postTermRate,
      Math.round(entry.baseUAH.principal), Math.round(entry.baseUAH.contribution),
      Math.round(entry.baseUAH.step),
    ].join("|");
  }

  // Snapshot the current inputs into a comparison entry (no colour yet).
  function currentSetupEntry() {
    var p = currentProp();
    var input = readInput();
    return {
      propId: state.propId,
      name: p.name || "Custom",
      mode: plotMode,
      rate: input.rate,
      frequency: input.frequency,
      years: input.years,
      wholeUnits: input.wholeUnits,
      distributes: input.distributes,
      quote: input.quote,
      termYears: input.termYears,
      postTermRate: input.postTermRate,
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
    saveStore();
  }

  function removeComparison(id) {
    comparisons = comparisons.filter(function (c) { return c.id !== id; });
    renderComparisons();
    refreshAddButton();
    saveStore();
  }

  function clearComparisons() {
    comparisons = [];
    renderComparisons();
    refreshAddButton();
    saveStore();
  }

  function freqLabel(frequency) {
    return frequency === 1 ? "annual" : frequency === 4 ? "quarterly" : "monthly";
  }

  // Re-simulate every entry (in its own quote currency) and re-express in the
  // active display currency under the current devaluation assumption.
  // Amount-bearing labels are rebuilt here so they track the display currency.
  function computeComparisons() {
    return comparisons.map(function (c) {
      var input = {
        principal: Math.max(0, convert(c.baseUAH.principal, "UAH", c.quote)),
        monthly: Math.max(0, convert(c.baseUAH.contribution, "UAH", c.quote)),
        rate: c.rate,
        frequency: c.frequency,
        years: c.years,
        wholeUnits: c.wholeUnits,
        step: Math.max(0, convert(c.baseUAH.step, "UAH", c.quote)),
        distributes: c.distributes,
        termYears: c.termYears,
        postTermRate: c.postTermRate,
      };
      var r = simulate(input);
      // Describe the assumptions that make this entry distinct from another
      // run of the same fund: starting amount, top-up and payout cadence.
      var principalDisp = convert(c.baseUAH.principal, "UAH", state.currencyCode);
      var monthlyDisp = convert(c.baseUAH.contribution, "UAH", state.currencyCode);
      var money = fmt(principalDisp) + (monthlyDisp > 0 ? " +" + fmt(monthlyDisp) + "/mo" : "");
      var withdraw = c.mode === "withdraw";
      // One line per entry: the chosen trajectory only.
      var seriesKey = withdraw ? "simpleNet" : "compound";
      var rows = r.rows.map(function (d) {
        return { year: d.year, value: d[seriesKey] * displayFactor(c.quote, d.year) };
      });
      return {
        id: c.id,
        color: c.color,
        name: c.name,
        label: c.label,
        modeText: c.modeText,
        quote: c.quote,
        rate: c.rate,
        years: c.years,
        moneyFreq: money + " · " + freqLabel(c.frequency),
        chipDetail: money + " · " + c.years + "y · " + freqLabel(c.frequency),
        rows: rows,
        net: rows[rows.length - 1].value,
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

    // Chips (also the chart legend) + summary table. The quote-currency badge
    // matters: a 21% ₴ line and a 9.5% $ line are only comparable through the
    // devaluation assumption, and the badge keeps that visible.
    els.compareList.innerHTML = data.map(function (d) {
      var modeClass = d.modeText === "Withdraw" ? " is-withdraw" : "";
      var curClass = d.quote === "UAH" ? " is-uah" : "";
      return '<li class="compare-chip">' +
        '<span class="compare-swatch" style="background:' + d.color + '"></span>' +
        '<span class="chip-text">' +
          '<span class="name">' + escapeHtml(d.label) +
            ' <span class="cur-tag' + curClass + '">' + escapeHtml(d.quote) + "</span>" +
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
      var curClass = d.quote === "UAH" ? " is-uah" : "";
      return "<tr>" +
        '<td><span class="opt-name">' + escapeHtml(d.name) + "</span>" +
          '<span class="opt-detail">' + escapeHtml(d.moneyFreq) + "</span></td>" +
        '<td><span class="mode-tag' + modeClass + '">' + escapeHtml(d.modeText) + "</span></td>" +
        "<td>" + d.rate + '% <span class="cur-tag' + curClass + '">' + escapeHtml(d.quote) + "</span></td>" +
        "<td>" + d.years + (d.years === 1 ? " yr" : " yrs") + "</td>" +
        "<td>" + fmt(d.net) + "</td>" +
        "</tr>";
    }).join("");

    drawComparisonChart(data);
  }

  /* -----------------------------------------------------------------------
   * Comparison chart — one line per saved option (the Reinvest or Withdraw
   * trajectory chosen when adding), on a shared scale in the display
   * currency. Options with shorter horizons simply end earlier.
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
    // Widen the slider range to cover longer-term funds, but never overwrite
    // the horizon the user is already modelling. Switching to a fixed-term
    // fund used to snap the horizon down to that fund's term (e.g. Energy's 5
    // years), silently discarding a 30-year horizon — and switching back to an
    // open-ended fund left it stuck there. Keep the current value; only clamp
    // it down if it would exceed the new maximum.
    els.years.max = String(Math.max(30, p.termYears || 0));
    var maxYears = parseInt(els.years.max, 10);
    if (parseInt(els.years.value, 10) > maxYears) {
      els.years.value = String(maxYears);
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
    // Non-unitized offers (a direct loan — no certificates) get no step at
    // all: the entry minimum is not a reinvestment increment.
    var live = FUND_LIVE[p.id];
    var unit = p.unitized === false
      ? 0
      : (live && live.unitPriceUAH) || p.unitSize || p.minInvestment;
    if (unit && unit > 0) {
      state.baseUAH.step = unit;
      els.wholeUnits.checked = true;
    } else {
      state.baseUAH.step = 0;
      els.wholeUnits.checked = false;
    }
    refreshMoneyFields();
    syncStepState();

    // Non-distributing funds have no cash payouts, so a "Withdraw" line for
    // them is a fiction — don't let one into the comparison.
    var distributes = p.distributes !== false;
    els.modeBtns.forEach(function (b) {
      if (b.getAttribute("data-mode") !== "withdraw") return;
      b.disabled = !distributes;
      b.title = distributes ? "" : p.name + " pays no cash out — there is nothing to withdraw.";
    });
    if (!distributes && plotMode === "withdraw") {
      plotMode = "reinvest";
      els.modeBtns.forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-mode") === "reinvest");
      });
    }

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
        convert(parseNum(els[k].value), state.currencyCode, "UAH");
    });

    // Restore what survives a refresh: saved comparisons + the devaluation
    // assumption. Must happen before the first render.
    loadStore();
    els.deval.value = state.devalPct;
    renderDevalNote();

    // Money fields feed the UAH source of truth as the user types.
    Object.keys(MONEY_KEYS).forEach(function (k) {
      els[k].addEventListener("input", function () {
        state.baseUAH[MONEY_KEYS[k]] =
          convert(parseNum(els[k].value), state.currencyCode, "UAH");
        render();
      });
    });
    ["rate", "frequency", "years", "postTermRate"].forEach(function (k) {
      els[k].addEventListener("input", render);
    });

    els.deval.addEventListener("input", function () {
      state.devalPct = clampDeval(parseNum(els.deval.value));
      render();
      renderComparisons();
      saveStore();
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
        if (!mode || mode === plotMode || b.disabled) return;
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
    renderComparisons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
