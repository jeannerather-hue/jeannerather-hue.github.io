/*
  FP&A budget-planning demo: calculation model.
  ILLUSTRATIVE DEMO: all data is fictional and is not connected to any real employer, client or result.

  Formulas used everywhere (no double-counting of commitments):
    EAC (estimate at completion)   = actual spend + forecast-to-complete
    Forecast variance              = EAC − approved budget        (positive = over budget = unfavorable)
    Forecast variance %            = forecast variance ÷ approved budget
    Budget vs actual (to date)     = actual to date − budget to date
    Available funds                = approved budget − actual spend − open commitments
    Remaining budget               = approved budget − actual spend
    Open commitment (per PO)       = PO amount + approved change orders − invoiced to date
      (invoiced amounts are already in actual spend, so only the uninvoiced balance counts)
  Purchase requisitions (PRs) are pipeline only; they are not commitments until a PO is raised.
  Any value whose inputs are missing returns null and is shown as "Not entered".
*/
(function (root) {
  "use strict";

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WORKSTREAMS = ["Platform build", "Data migration", "Analytics & reporting", "Change & adoption"];
  const CATEGORIES = ["Software", "Cloud services", "Implementation", "Workforce", "Training", "Contingency"];

  const PROFILES = {
    even: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ramp: [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.3, 1.3, 1.3],
    front: [1.6, 1.5, 1.4, 1.2, 1.1, 1, 0.9, 0.8, 0.7, 0.6, 0.6, 0.6],
    back: [0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.1, 1.2, 1.4, 1.5, 1.6, 1.6],
  };

  // Scenario multipliers apply to forecast-to-complete only (approved budget is unchanged).
  const SCENARIOS = {
    base: { label: "Base Plan", note: "Forecast follows the current plan.", mult: {} },
    constrained: { label: "Cost-Constrained", note: "Remaining spend is trimmed: deferred licences, lower cloud use, tighter contingency.",
      mult: { Software: 0.9, "Cloud services": 0.85, Implementation: 0.9, Workforce: 0.95, Training: 0.8, Contingency: 0.5 } },
    growth: { label: "Growth", note: "Usage and scope grow: more cloud capacity, licences and implementation effort.",
      mult: { Software: 1.15, "Cloud services": 1.25, Implementation: 1.1, Workforce: 1.1, Training: 1, Contingency: 1 } },
  };

  // Fictional budget lines.
  const BASE_LINES = [
    ["L01", "Platform build", "Software", 600000, "front", 1.0],
    ["L02", "Platform build", "Cloud services", 480000, "ramp", 1.12],
    ["L03", "Platform build", "Implementation", 720000, "even", 1.05],
    ["L04", "Platform build", "Workforce", 540000, "even", 0.97],
    ["L05", "Platform build", "Contingency", 150000, "even", 0.6],
    ["L06", "Data migration", "Cloud services", 240000, "ramp", 1.1],
    ["L07", "Data migration", "Implementation", 420000, "front", 1.08],
    ["L08", "Data migration", "Workforce", 300000, "even", 0.98],
    ["L09", "Data migration", "Contingency", 80000, "even", 0.5],
    ["L10", "Analytics & reporting", "Software", 260000, "even", 1.0],
    ["L11", "Analytics & reporting", "Implementation", 280000, "ramp", 1.02],
    ["L12", "Analytics & reporting", "Workforce", 220000, "even", 0.95],
    ["L13", "Change & adoption", "Training", 180000, "back", 1.0],
    ["L14", "Change & adoption", "Workforce", 160000, "even", 1.0],
    ["L15", "Change & adoption", "Contingency", 40000, "even", 0.5],
  ].map(([id, ws, cat, annual, profile, fcFactor]) => ({ id, ws, cat, annual, profile, fcFactor }));

  const lineLabel = (l) => `${l.ws} · ${l.cat}`;
  const round = (n) => Math.round(n);
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);

  function phase(annual, profile) {
    const w = PROFILES[profile] || PROFILES.even;
    const sum = w.reduce((a, b) => a + b, 0);
    return w.map((x) => (annual * x) / sum);
  }

  // Deterministic "actuals" so the sample is identical on every load.
  function sampleActual(line, m, monthly) {
    if (line.cat === "Contingency") return m === 3 ? round(monthly * 0.4) : 0;
    const seed = (line.id.charCodeAt(2) * 31 + m * 17) % 29;
    return round(monthly * (0.84 + seed / 100));
  }

  function sampleData() {
    const actuals = {};
    BASE_LINES.forEach((l) => {
      const monthly = phase(l.annual, l.profile);
      actuals[l.id] = monthly.slice(0, 9).map((v, m) => sampleActual(l, m, v));
    });
    return {
      version: 1,
      inputs: {
        actualsThrough: 6,
        scenario: "base",
        fcAdjust: 0,
        phasing: "plan",
        catBudget: Object.fromEntries(CATEGORIES.map((c) => [c, BASE_LINES.filter((l) => l.cat === c).reduce((a, l) => a + l.annual, 0)])),
      },
      actuals, // monthly actual spend per line, available for Jan–Sep
      reallocations: [
        { id: "RA-101", amount: 25000, from: "L14", to: "L13", reason: "Extra end-user training sessions for the second release.", requester: "Program TPM (fictional)",
          status: "Approved", notes: "Approved by budget owner (fictional). Workforce line has headroom.", created: "2026-05-12", decided: "2026-05-15" },
        { id: "RA-102", amount: 40000, from: "L05", to: "L07", reason: "Additional migration test cycle after data quality findings.", requester: "Data migration lead (fictional)",
          status: "Pending", notes: "", created: "2026-06-20", decided: "" },
      ],
      orders: [
        { id: "PO-1001", type: "PO", line: "L01", desc: "Platform licences (annual)", amount: 420000, invoiced: 280000, owner: "A. Lee (fictional)", status: "Open", expected: "2026-09-30", link: "" },
        { id: "PO-1002", type: "PO", line: "L03", desc: "Integration partner statement of work, phase 2", amount: 360000, invoiced: 150000, owner: "R. Diaz (fictional)", status: "Open", expected: "2026-11-15", link: "" },
        { id: "PO-1003", type: "PO", line: "L07", desc: "Migration tooling services", amount: 120000, invoiced: 120000, owner: "M. Chen (fictional)", status: "Closed", expected: "2026-04-30", link: "" },
        { id: "PO-1004", type: "PO", line: "L10", desc: "Reporting tool seats", amount: 90000, invoiced: 30000, owner: "S. Patel (fictional)", status: "Open", expected: "2026-08-31", link: "" },
        { id: "PO-1005", type: "PO", line: "L02", desc: "Cloud consumption commitment", amount: 200000, invoiced: 110000, owner: "A. Lee (fictional)", status: "Open", expected: "2026-12-31", link: "" },
        { id: "PR-2001", type: "PR", line: "L13", desc: "Training content vendor", amount: 60000, invoiced: 0, owner: "J. Kim (fictional)", status: "Submitted", expected: "2026-08-15", link: "" },
        { id: "PR-2002", type: "PR", line: "L06", desc: "Reserved cloud capacity for migration", amount: 150000, invoiced: 0, owner: "M. Chen (fictional)", status: "Approved", expected: "2026-07-31", link: "" },
        { id: "CO-3001", type: "Change order", line: "L03", desc: "Additional data mapping scope", amount: 45000, invoiced: 0, owner: "R. Diaz (fictional)", status: "Approved", expected: "2026-09-15", link: "PO-1002" },
        { id: "CO-3002", type: "Change order", line: "L01", desc: "Extra sandbox environment licences", amount: 25000, invoiced: 0, owner: "A. Lee (fictional)", status: "Requested", expected: "2026-08-30", link: "PO-1001" },
      ],
      audit: [{ at: "2026-07-01T09:00:00", what: "Sample data loaded", detail: "Fictional demo data restored to its starting point." }],
    };
  }

  const STATUSES = {
    PO: ["Open", "Closed"],
    PR: ["Draft", "Submitted", "Approved", "Rejected"],
    "Change order": ["Requested", "Approved", "Rejected"],
  };

  /** Per-PO open commitment: (PO amount + approved change orders) − invoiced. Closed POs = 0. */
  function poCommitment(po, orders) {
    if (po.type !== "PO" || po.status !== "Open") return 0;
    if (!isNum(po.amount) || !isNum(po.invoiced)) return null;
    const cos = orders.filter((o) => o.type === "Change order" && o.link === po.id && o.status === "Approved");
    if (cos.some((c) => !isNum(c.amount))) return null;
    const total = po.amount + cos.reduce((a, c) => a + c.amount, 0);
    return Math.max(0, total - po.invoiced);
  }

  /** Approved annual budget per line: base × category scale + approved reallocations. null when its category budget is blank. */
  function lineBudgets(state) {
    const out = {};
    const catBase = {};
    BASE_LINES.forEach((l) => { catBase[l.cat] = (catBase[l.cat] || 0) + l.annual; });
    BASE_LINES.forEach((l) => {
      const cb = state.inputs.catBudget[l.cat];
      out[l.id] = isNum(cb) ? (l.annual * cb) / catBase[l.cat] : null;
    });
    state.reallocations.filter((r) => r.status === "Approved" && isNum(r.amount)).forEach((r) => {
      if (isNum(out[r.from])) out[r.from] -= r.amount;
      if (isNum(out[r.to])) out[r.to] += r.amount;
    });
    return out;
  }

  /** Full computation for every line, with monthly arrays. */
  function compute(state) {
    const inp = state.inputs;
    const through = Math.min(9, Math.max(1, Number(inp.actualsThrough) || 1));
    const scen = SCENARIOS[inp.scenario] || SCENARIOS.base;
    const adj = isNum(inp.fcAdjust) ? inp.fcAdjust : null;
    const budgets = lineBudgets(state);
    const lines = BASE_LINES.map((l) => {
      const annual = budgets[l.id];
      const profile = inp.phasing === "even" ? "even" : l.profile;
      const mBudget = isNum(annual) ? phase(annual, profile) : MONTHS.map(() => null);
      const act = state.actuals[l.id] || [];
      const mActual = MONTHS.map((_, m) => (m < through ? (isNum(act[m]) ? act[m] : null) : null));
      const mult = (scen.mult[l.cat] ?? 1) * (adj === null ? NaN : 1 + adj / 100);
      const mForecast = MONTHS.map((_, m) => (m >= through ? (isNum(mBudget[m]) && Number.isFinite(mult) ? mBudget[m] * l.fcFactor * mult : null) : null));
      const commit = state.orders.filter((o) => o.type === "PO" && o.line === l.id).map((o) => poCommitment(o, state.orders));
      const sumOrNull = (arr) => (arr.some((v) => v === null) ? null : arr.reduce((a, b) => a + b, 0));
      const actual = sumOrNull(mActual.slice(0, through));
      const ftc = sumOrNull(mForecast.slice(through));
      const budgetToDate = sumOrNull(mBudget.slice(0, through));
      const commitments = sumOrNull(commit);
      const pipeline = state.orders.filter((o) => o.type === "PR" && o.line === l.id && (o.status === "Submitted" || o.status === "Approved")).reduce((a, o) => a + (o.amount || 0), 0);
      return { ...l, label: lineLabel(l), annual, mBudget, mActual, mForecast, actual, ftc, budgetToDate, commitments, pipeline };
    });
    return { through, scenario: scen, lines };
  }

  const add = (a, b) => (a === null || b === null ? null : a + b);
  const sub = (a, b) => (a === null || b === null ? null : a - b);
  const div = (a, b) => (a === null || b === null || b === 0 ? null : a / b);

  /** Totals and derived metrics for a set of lines (already filtered). */
  function metrics(lines) {
    const tot = (k) => lines.reduce((acc, l) => add(acc, l[k]), 0);
    const budget = tot("annual");
    const actual = tot("actual");
    const ftc = tot("ftc");
    const commitments = tot("commitments");
    const budgetToDate = tot("budgetToDate");
    const eac = add(actual, ftc);
    const fv = sub(eac, budget);
    const bva = sub(actual, budgetToDate);
    return {
      budget, actual, ftc, commitments, budgetToDate, eac,
      pipeline: lines.reduce((a, l) => a + l.pipeline, 0),
      forecastVariance: fv,
      forecastVariancePct: div(fv, budget),
      bva,
      bvaPct: div(bva, budgetToDate),
      remaining: sub(budget, actual),
      available: sub(sub(budget, actual), commitments),
    };
  }

  /** Monthly series for the chart: budget, actual (to date) and forecast (after). */
  function monthly(lines, through) {
    return MONTHS.map((name, m) => {
      const s = (k) => lines.reduce((acc, l) => (acc === null || l[k][m] === null ? null : acc + l[k][m]), 0);
      return { m, name, budget: s("mBudget"), actual: m < through ? s("mActual") : null, forecast: m >= through ? s("mForecast") : null };
    });
  }

  /** Validation for a reallocation request. Returns an error string or "". */
  function validateRealloc(r, comp) {
    if (!isNum(r.amount) || r.amount <= 0) return "Enter an amount greater than zero.";
    if (!r.from || !r.to) return "Choose a source and a destination budget line.";
    if (r.from === r.to) return "Source and destination must be different budget lines.";
    if (!r.reason || !r.reason.trim()) return "Add a reason for the reallocation.";
    if (!r.requester || !r.requester.trim()) return "Add the requester's name.";
    const src = comp.lines.find((l) => l.id === r.from);
    const avail = src ? sub(sub(src.annual, src.actual), src.commitments) : null;
    if (avail === null) return "The source line's budget is not entered, so available funds can't be checked.";
    if (r.amount > avail) return `The source line has ${Math.round(avail).toLocaleString("en-US")} in available funds, which is less than the requested amount.`;
    return "";
  }

  const api = { MONTHS, WORKSTREAMS, CATEGORIES, PROFILES, SCENARIOS, STATUSES, BASE_LINES, phase, sampleData, poCommitment, lineBudgets, compute, metrics, monthly, validateRealloc, lineLabel };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FPAModel = api;
})(typeof window !== "undefined" ? window : globalThis);
