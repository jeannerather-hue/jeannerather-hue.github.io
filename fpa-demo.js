/*
  FP&A section: renders the case study (from content.js) and the interactive
  budget-planning demo (fictional data, calculations in fpa-model.js).
*/
(function () {
  "use strict";
  const P = window.PORTFOLIO;
  const M = window.FPAModel;
  if (!P || !P.fpa || !M) return;
  const F = P.fpa;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NE = "Not entered";
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);

  /* ---------------- Case study ---------------- */
  function renderCase() {
    const c = F.caseStudy;
    $("#fpa-eyebrow").textContent = F.eyebrow;
    $("#fpa-intro").textContent = F.intro;
    const related = (P.caseStudies || []).find((x) => x.id === c.related);
    $("#fpa-case").innerHTML = `
      <header class="fpa-case-head">
        <p class="card-org">${esc(c.org)}</p>
        <h3 id="fpa-case-title">${esc(c.title)}</h3>
        <p class="fpa-case-summary">${esc(c.summary)}</p>
        <div class="case-badges"><span class="badge b-qualitative">Qualitative result</span><span class="badge b-concept">Real work · no figures claimed</span></div>
      </header>
      <div class="fpa-case-grid">
        <div><h4>Operating challenge</h4><p>${esc(c.challenge)}</p></div>
        <div><h4>My role</h4><p>${esc(c.role)}</p><p class="note">${esc(c.roleNote)}</p></div>
      </div>
      <div>
        <h4>System and controls I created</h4>
        <ul class="fpa-controls">${c.system.map((s) => `<li><strong>${esc(s.title)}</strong><span>${esc(s.text)}</span></li>`).join("")}</ul>
      </div>
      <div>
        <h4>How the process worked</h4>
        <ol class="fpa-process">${c.process.map((s) => `<li><strong>${esc(s.step)}</strong><span>${esc(s.text)}</span></li>`).join("")}</ol>
        <p class="note">${esc(c.processNote)}</p>
      </div>
      <div class="fpa-case-grid">
        <div><h4>Tools and methods</h4><ul class="tags">${c.methods.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>
        <div><h4>Outcome</h4><div class="outcome-box"><div class="case-badges"><span class="badge b-qualitative">Qualitative result</span></div><p>${esc(c.outcome)}</p></div></div>
      </div>
      ${related ? `<p class="fpa-related">Related case study: <a href="#case-${esc(related.id)}">${esc(related.title)}</a></p>` : ""}`;
  }

  /* ---------------- Demo state ---------------- */
  const KEY = "portfolio-fpa-demo-v1";
  let state;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.version === 1 && s.inputs && s.orders) return s; }
    } catch (e) { /* storage unavailable: use sample */ }
    return M.sampleData();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* not saved; demo still works */ } }
  function log(what, detail) {
    state.audit.unshift({ at: new Date().toISOString(), what, detail });
    state.audit = state.audit.slice(0, 60);
  }
  function commit(what, detail) { log(what, detail); save(); update(); }

  const view = { month: "", ws: "", cat: "", tab: "dashboard" };

  /* ---------------- Formatting ---------------- */
  const money = (v) => (isNum(v) ? (v < 0 ? "−$" : "$") + Math.round(Math.abs(v)).toLocaleString("en-US") : NE);
  const moneyShort = (v) => {
    if (!isNum(v)) return NE;
    const a = Math.abs(v), s = v < 0 ? "−$" : "$";
    if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${s}${Math.round(a / 1e3)}K`;
    return `${s}${Math.round(a)}`;
  };
  const pct = (v) => (isNum(v) ? `${v < 0 ? "−" : v > 0 ? "+" : ""}${Math.abs(v * 100).toFixed(1)}%` : NE);
  const signedMoney = (v) => (isNum(v) ? `${v > 0 ? "+" : ""}${money(v)}` : NE);
  const ne = (txt) => (txt === NE ? `<span class="fpa-ne">${NE}</span>` : esc(txt));
  const lineById = (id) => M.BASE_LINES.find((l) => l.id === id);
  const lineName = (id) => { const l = lineById(id); return l ? M.lineLabel(l) : NE; };

  /** Favorable/unfavorable tag. For spend, negative variance (under budget) is favorable. */
  function varTag(v) {
    if (!isNum(v)) return "";
    if (Math.abs(v) < 0.5) return `<span class="fpa-var fpa-even">On budget</span>`;
    return v < 0
      ? `<span class="fpa-var fpa-fav"><span aria-hidden="true">▼</span> Favorable · under budget</span>`
      : `<span class="fpa-var fpa-unfav"><span aria-hidden="true">▲</span> Unfavorable · over budget</span>`;
  }

  /* ---------------- Skeleton (rendered once) ---------------- */
  const opt = (v, l, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(l)}</option>`;
  const lineOptions = (placeholder) => `<option value="">${esc(placeholder)}</option>` + M.BASE_LINES.map((l) => opt(l.id, M.lineLabel(l), "")).join("");

  function renderSkeleton() {
    const d = F.demo;
    $("#fpa-demo").innerHTML = `
      <div class="fpa-banner" role="note">
        <p class="fpa-banner-label"><span class="badge b-progress">Illustrative demo</span> <strong>${esc(d.label)}</strong></p>
        <p>${esc(d.note)}</p>
        <p class="fpa-banner-prog">${esc(d.program)}</p>
      </div>

      <div class="fpa-toolbar" role="group" aria-label="Filters and scenario">
        <div class="fpa-field"><label for="fpa-f-month">Month</label><select id="fpa-f-month">${opt("", "All months", "")}${M.MONTHS.map((m, i) => opt(i, m, "")).join("")}</select></div>
        <div class="fpa-field"><label for="fpa-f-ws">Workstream</label><select id="fpa-f-ws">${opt("", "All workstreams", "")}${M.WORKSTREAMS.map((w) => opt(w, w, "")).join("")}</select></div>
        <div class="fpa-field"><label for="fpa-f-cat">Spend category</label><select id="fpa-f-cat">${opt("", "All categories", "")}${M.CATEGORIES.map((c) => opt(c, c, "")).join("")}</select></div>
        <div class="fpa-field fpa-scen"><span class="fpa-lbl" id="fpa-scen-lbl">Scenario</span>
          <div class="fpa-seg" role="group" aria-labelledby="fpa-scen-lbl">${Object.entries(M.SCENARIOS).map(([k, s]) => `<button type="button" data-scen="${k}" aria-pressed="false">${esc(s.label)}</button>`).join("")}</div>
        </div>
      </div>
      <p class="fpa-scen-note" id="fpa-scen-note"></p>

      <details class="fpa-assume" id="fpa-assume" open>
        <summary>Assumptions and inputs <span class="note">(edit to update every number and chart)</span></summary>
        <div class="fpa-assume-grid">
          <div class="fpa-field"><label for="fpa-i-through">Actuals recorded through</label><select id="fpa-i-through">${M.MONTHS.slice(0, 9).map((m, i) => opt(i + 1, m, "")).join("")}</select><p class="note">Later months use the forecast.</p></div>
          <div class="fpa-field"><label for="fpa-i-adj">Forecast adjustment (%)</label><input id="fpa-i-adj" type="number" step="1" min="-50" max="50" inputmode="decimal"><p class="note">Applied to forecast-to-complete on top of the scenario. Clear it to see “Not entered”.</p></div>
          <div class="fpa-field"><label for="fpa-i-phase">Monthly phasing</label><select id="fpa-i-phase">${opt("plan", "As planned per line", "")}${opt("even", "Even across 12 months", "")}</select></div>
        </div>
        <fieldset class="fpa-catbud"><legend>Approved annual budget by category, before reallocations ($)</legend>
          <div class="fpa-assume-grid">${M.CATEGORIES.map((c, i) => `<div class="fpa-field"><label for="fpa-i-cb${i}">${esc(c)}</label><input id="fpa-i-cb${i}" data-cat="${esc(c)}" type="number" min="0" step="1000" inputmode="numeric"></div>`).join("")}</div>
        </fieldset>
        <div class="fpa-actions-row">
          <button type="button" class="btn" id="fpa-restore">Restore sample data</button>
          <p class="fpa-status" id="fpa-status" role="status"></p>
        </div>
      </details>

      <div class="fpa-kpis" id="fpa-kpis" aria-live="polite"></div>

      <div class="fpa-tabs" role="tablist" aria-label="Demo views">
        ${[["dashboard", "Budget dashboard"], ["realloc", "Reallocation requests"], ["orders", "PR/PO & change orders"], ["audit", "Audit trail"], ["formulas", "How the numbers work"]]
          .map(([k, l]) => `<button type="button" role="tab" id="fpa-tab-${k}" aria-controls="fpa-panel-${k}" data-tab="${k}" aria-selected="false">${l}</button>`).join("")}
      </div>

      <div class="fpa-panel" role="tabpanel" id="fpa-panel-dashboard" aria-labelledby="fpa-tab-dashboard">
        <section class="fpa-card" aria-labelledby="fpa-chart-title">
          <div class="fpa-card-head"><h3 id="fpa-chart-title">Monthly budget vs actual vs forecast</h3>
            <ul class="fpa-legend" aria-label="Legend">
              <li><span class="sw sw-actual" aria-hidden="true"></span>Actual</li>
              <li><span class="sw sw-forecast" aria-hidden="true"></span>Forecast</li>
              <li><span class="sw sw-budget" aria-hidden="true"></span>Budget</li>
            </ul></div>
          <div class="fpa-chart" id="fpa-chart"></div>
        </section>
        <div class="fpa-two">
          <section class="fpa-card" aria-labelledby="fpa-ws-title"><h3 id="fpa-ws-title">By workstream: EAC against budget</h3><div id="fpa-by-ws"></div></section>
          <section class="fpa-card" aria-labelledby="fpa-cat-title"><h3 id="fpa-cat-title">By spend category: EAC against budget</h3><div id="fpa-by-cat"></div></section>
        </div>
        <section class="fpa-card" aria-labelledby="fpa-table-title">
          <div class="fpa-card-head"><h3 id="fpa-table-title">Budget line detail</h3><button type="button" class="btn" id="fpa-export">Export table to CSV</button></div>
          <div class="fpa-table-wrap" id="fpa-table"></div>
        </section>
      </div>

      <div class="fpa-panel" role="tabpanel" id="fpa-panel-realloc" aria-labelledby="fpa-tab-realloc" hidden>
        <section class="fpa-card" aria-labelledby="fpa-ra-title">
          <h3 id="fpa-ra-title">New reallocation request</h3>
          <form id="fpa-ra-form" class="fpa-form" novalidate>
            <div class="fpa-field"><label for="fpa-ra-amount">Amount ($)</label><input id="fpa-ra-amount" type="number" min="1" step="1000" inputmode="numeric" required></div>
            <div class="fpa-field"><label for="fpa-ra-from">Source budget line</label><select id="fpa-ra-from" required>${lineOptions("Choose a source")}</select><p class="note" id="fpa-ra-avail"></p></div>
            <div class="fpa-field"><label for="fpa-ra-to">Destination budget line</label><select id="fpa-ra-to" required>${lineOptions("Choose a destination")}</select></div>
            <div class="fpa-field"><label for="fpa-ra-req">Requester</label><input id="fpa-ra-req" type="text" autocomplete="off" required></div>
            <div class="fpa-field fpa-wide"><label for="fpa-ra-reason">Reason</label><textarea id="fpa-ra-reason" rows="2" required></textarea></div>
            <p class="fpa-error" id="fpa-ra-error" role="alert"></p>
            <div class="fpa-wide"><button type="submit" class="btn btn-primary">Submit for approval</button></div>
          </form>
        </section>
        <section class="fpa-card" aria-labelledby="fpa-ral-title"><h3 id="fpa-ral-title">Requests</h3><p class="note">Approving moves budget from the source line to the destination line. Total approved budget does not change. Approval re-checks the source line’s available funds.</p><div id="fpa-ra-list"></div></section>
      </div>

      <div class="fpa-panel" role="tabpanel" id="fpa-panel-orders" aria-labelledby="fpa-tab-orders" hidden>
        <section class="fpa-card" aria-labelledby="fpa-po-title">
          <h3 id="fpa-po-title">Add a PR, PO or change order</h3>
          <form id="fpa-po-form" class="fpa-form" novalidate>
            <div class="fpa-field"><label for="fpa-po-type">Type</label><select id="fpa-po-type">${opt("PR", "Purchase requisition (PR)", "PR")}${opt("PO", "Purchase order (PO)", "")}${opt("Change order", "Change order", "")}</select></div>
            <div class="fpa-field"><label for="fpa-po-line">Linked workstream / budget line</label><select id="fpa-po-line" required>${lineOptions("Choose a budget line")}</select></div>
            <div class="fpa-field fpa-wide"><label for="fpa-po-desc">Description</label><input id="fpa-po-desc" type="text" autocomplete="off" required></div>
            <div class="fpa-field"><label for="fpa-po-amount">Amount ($)</label><input id="fpa-po-amount" type="number" min="1" step="1000" inputmode="numeric" required></div>
            <div class="fpa-field" id="fpa-po-inv-wrap"><label for="fpa-po-inv">Invoiced to date ($)</label><input id="fpa-po-inv" type="number" min="0" step="1000" inputmode="numeric" value="0"></div>
            <div class="fpa-field"><label for="fpa-po-owner">Owner</label><input id="fpa-po-owner" type="text" autocomplete="off" required></div>
            <div class="fpa-field"><label for="fpa-po-status">Status</label><select id="fpa-po-status"></select></div>
            <div class="fpa-field"><label for="fpa-po-date">Expected date</label><input id="fpa-po-date" type="date"></div>
            <div class="fpa-field" id="fpa-po-link-wrap"><label for="fpa-po-link">Linked PO</label><select id="fpa-po-link"></select></div>
            <p class="fpa-error" id="fpa-po-error" role="alert"></p>
            <div class="fpa-wide"><button type="submit" class="btn btn-primary">Add record</button></div>
          </form>
        </section>
        <section class="fpa-card" aria-labelledby="fpa-pol-title">
          <h3 id="fpa-pol-title">PR/PO and change-order tracker</h3>
          <p class="note">Open commitment = PO amount + approved change orders − invoiced to date. Invoiced amounts are already in actual spend, so they are not counted again. PRs are pipeline only until a PO is raised.</p>
          <div class="fpa-table-wrap" id="fpa-po-table"></div>
        </section>
      </div>

      <div class="fpa-panel" role="tabpanel" id="fpa-panel-audit" aria-labelledby="fpa-tab-audit" hidden>
        <section class="fpa-card" aria-labelledby="fpa-au-title"><h3 id="fpa-au-title">Audit trail</h3><p class="note">Every change to the fictional demo data in this browser, newest first.</p><ol class="fpa-audit" id="fpa-audit"></ol></section>
      </div>

      <div class="fpa-panel" role="tabpanel" id="fpa-panel-formulas" aria-labelledby="fpa-tab-formulas" hidden>
        <section class="fpa-card" aria-labelledby="fpa-fm-title"><h3 id="fpa-fm-title">How the numbers work</h3>
          <dl class="fpa-formulas">
            <div><dt>Estimate at completion (EAC)</dt><dd><code>EAC = actual spend + forecast-to-complete</code></dd></div>
            <div><dt>Forecast variance</dt><dd><code>Forecast variance = EAC − approved budget</code><br>Negative is favorable (under budget). Positive is unfavorable (over budget).</dd></div>
            <div><dt>Forecast variance %</dt><dd><code>Forecast variance % = forecast variance ÷ approved budget</code></dd></div>
            <div><dt>Budget vs actual (to date)</dt><dd><code>Variance = actual to date − budget to date</code>, and <code>÷ budget to date</code> for the percentage.</dd></div>
            <div><dt>Available funds</dt><dd><code>Available funds = approved budget − actual spend − open commitments</code></dd></div>
            <div><dt>Remaining budget</dt><dd><code>Remaining budget = approved budget − actual spend</code></dd></div>
            <div><dt>Open commitments</dt><dd><code>Per PO: PO amount + approved change orders − invoiced to date</code>. Closed POs, PRs and unapproved change orders are not commitments.</dd></div>
            <div><dt>Forecast-to-complete</dt><dd>For each month after the actuals month: phased budget × the line’s forecast factor × the scenario multiplier × (1 + forecast adjustment).</dd></div>
            <div><dt>Avoiding double-counting</dt><dd>Commitments are <strong>not</strong> added to EAC. Future spend on open POs is already part of forecast-to-complete, and invoiced amounts are already in actuals. Commitments are used only for available funds.</dd></div>
            <div><dt>Missing inputs</dt><dd>If an input a calculation needs is blank, the result shows “${NE}” instead of a guessed value.</dd></div>
          </dl></section>
      </div>
      <div class="fpa-tip" id="fpa-tip" role="tooltip" hidden></div>`;
  }

  /* ---------------- Dynamic rendering ---------------- */
  function filtered(comp) {
    return comp.lines.filter((l) => (!view.ws || l.ws === view.ws) && (!view.cat || l.cat === view.cat));
  }

  function kpi(id, label, value, sub, formula, extra = "") {
    return `<div class="fpa-kpi" id="fpa-k-${id}">
      <p class="fpa-kpi-label">${esc(label)}</p>
      <p class="fpa-kpi-value">${ne(value)}</p>
      ${sub ? `<p class="fpa-kpi-sub">${sub}</p>` : ""}${extra}
      <details class="fpa-formula"><summary>Formula</summary><p>${formula}</p></details>
    </div>`;
  }

  function renderKpis(comp, m) {
    const thr = M.MONTHS[comp.through - 1];
    const f = (v) => `<strong>${money(v)}</strong>`;
    const scope = [view.ws, view.cat].filter(Boolean).join(" · ") || "All workstreams and categories";
    $("#fpa-kpis").innerHTML = `
      <p class="fpa-scope">Showing: <strong>${esc(scope)}</strong> · Actuals through <strong>${thr}</strong> · Scenario <strong>${esc(comp.scenario.label)}</strong></p>
      ${kpi("budget", "Approved budget", moneyShort(m.budget), "Annual, after approved reallocations", `Sum of approved annual budget for the lines shown = ${f(m.budget)}`)}
      ${kpi("actual", `Actual spend (Jan–${thr})`, moneyShort(m.actual), "Recorded spend to date", `Sum of monthly actuals Jan–${thr} = ${f(m.actual)}`)}
      ${kpi("commit", "Open commitments", moneyShort(m.commitments), `PR pipeline (not committed): ${moneyShort(m.pipeline)}`, `Σ (PO amount + approved change orders − invoiced) for open POs = ${f(m.commitments)}`)}
      ${kpi("ftc", "Forecast-to-complete", moneyShort(m.ftc), "Forecast spend for the remaining months", `Σ remaining months: phased budget × forecast factor × scenario × (1 + adjustment) = ${f(m.ftc)}`)}
      ${kpi("eac", "Estimate at completion (EAC)", moneyShort(m.eac), "Where spend is expected to finish", `Actual ${f(m.actual)} + forecast-to-complete ${f(m.ftc)} = ${f(m.eac)}`)}
      ${kpi("fv", "Forecast variance", isNum(m.forecastVariance) ? `${signedMoney(m.forecastVariance)}` : NE, `${pct(m.forecastVariancePct)} of approved budget`,
        `EAC ${f(m.eac)} − approved budget ${f(m.budget)} = ${f(m.forecastVariance)}; ÷ budget = <strong>${pct(m.forecastVariancePct)}</strong>`, varTag(m.forecastVariance))}
      ${kpi("bva", "Budget vs actual (to date)", isNum(m.bva) ? signedMoney(m.bva) : NE, `${pct(m.bvaPct)} vs budget to date`,
        `Actual ${f(m.actual)} − budget to date ${f(m.budgetToDate)} = ${f(m.bva)}; ÷ budget to date = <strong>${pct(m.bvaPct)}</strong>`, varTag(m.bva))}
      ${kpi("remaining", "Remaining budget", moneyShort(m.remaining), "Approved budget not yet spent", `Approved budget ${f(m.budget)} − actual ${f(m.actual)} = ${f(m.remaining)}`)}
      ${kpi("avail", "Available funds after commitments", moneyShort(m.available), "Free to commit", `Approved budget ${f(m.budget)} − actual ${f(m.actual)} − open commitments ${f(m.commitments)} = ${f(m.available)}`)}`;
  }

  function niceMax(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }

  function renderChart(comp, lines) {
    const data = M.monthly(lines, comp.through);
    const W = 760, H = 300, L = 64, R = 12, T = 14, B = 34;
    const vals = data.flatMap((d) => [d.budget, d.actual, d.forecast]).filter(isNum);
    if (!vals.length) { $("#fpa-chart").innerHTML = `<p class="fpa-ne-block">Chart unavailable: budget inputs are ${NE.toLowerCase()} for this view.</p>`; return; }
    const max = niceMax(Math.max(...vals));
    const pw = W - L - R, ph = H - T - B, gw = pw / 12;
    const y = (v) => T + ph - (v / max) * ph;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
    const bw = Math.min(34, gw * 0.56);
    const sel = view.month === "" ? -1 : Number(view.month);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="fpa-chart-title fpa-chart-desc" preserveAspectRatio="xMidYMid meet">
      <desc id="fpa-chart-desc">Monthly bars show actual spend through ${M.MONTHS[comp.through - 1]} and forecast after it; a line shows the phased budget. The detail table below lists the same numbers.</desc>
      <defs><pattern id="fpa-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="hatch-bg"/><line x1="0" y1="0" x2="0" y2="6" class="hatch-line"/></pattern></defs>`;
    if (sel >= 0) svg += `<rect x="${L + sel * gw + 2}" y="${T}" width="${gw - 4}" height="${ph}" class="sel-band" rx="4"/>`;
    ticks.forEach((t) => { svg += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${L - 8}" y="${y(t) + 4}" class="axis" text-anchor="end">${moneyShort(t)}</text>`; });
    data.forEach((d, i) => {
      const cx = L + gw * i + gw / 2;
      const v = isNum(d.actual) ? d.actual : d.forecast;
      if (isNum(v) && v > 0) {
        const top = y(v), h = T + ph - top, r = Math.min(4, h);
        const cls = isNum(d.actual) ? "bar-actual" : "bar-forecast";
        svg += `<path class="${cls}" d="M${cx - bw / 2},${T + ph} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${T + ph} Z"/>`;
      }
      svg += `<text x="${cx}" y="${H - 12}" class="axis${i === sel ? " axis-sel" : ""}" text-anchor="middle">${d.name}</text>`;
    });
    // actuals / forecast divider
    const dx = L + gw * comp.through;
    if (comp.through < 12) svg += `<line x1="${dx}" x2="${dx}" y1="${T}" y2="${T + ph}" class="divider"/><text x="${dx + 6}" y="${T + 10}" class="axis">Forecast →</text>`;
    // budget line
    const pts = data.map((d, i) => (isNum(d.budget) ? [L + gw * i + gw / 2, y(d.budget)] : null));
    const path = pts.reduce((acc, p) => (p ? acc + (acc ? " L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1) : acc), "");
    if (path) svg += `<path d="${path}" class="budget-line"/>`;
    pts.forEach((p) => { if (p) svg += `<circle cx="${p[0]}" cy="${p[1]}" r="4" class="budget-dot"/>`; });
    // hit targets
    data.forEach((d, i) => {
      const val = isNum(d.actual) ? d.actual : d.forecast;
      const varc = isNum(val) && isNum(d.budget) ? val - d.budget : null;
      const label = `${d.name}: budget ${money(d.budget)}, ${isNum(d.actual) ? "actual" : "forecast"} ${money(val)}, variance ${signedMoney(varc)}`;
      svg += `<rect class="hit" x="${L + gw * i}" y="${T}" width="${gw}" height="${ph}" tabindex="0" focusable="true" data-i="${i}" aria-label="${esc(label)}"><title>${esc(label)}</title></rect>`;
    });
    svg += `<line x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}" class="baseline"/></svg>`;
    const box = $("#fpa-chart");
    box.innerHTML = svg;
    box._data = data;
  }

  function tip(e, show) {
    const t = $("#fpa-tip");
    const rect = e.target.closest && e.target.closest("rect.hit");
    if (!show || !rect) { t.hidden = true; return; }
    const d = $("#fpa-chart")._data[Number(rect.dataset.i)];
    const val = isNum(d.actual) ? d.actual : d.forecast;
    const varc = isNum(val) && isNum(d.budget) ? val - d.budget : null;
    t.innerHTML = `<strong>${d.name}</strong>
      <span><i class="sw sw-budget"></i>Budget ${money(d.budget)}</span>
      <span><i class="sw ${isNum(d.actual) ? "sw-actual" : "sw-forecast"}"></i>${isNum(d.actual) ? "Actual" : "Forecast"} ${money(val)}</span>
      <span>Variance ${signedMoney(varc)} ${isNum(varc) ? (varc <= 0 ? "(favorable)" : "(unfavorable)") : ""}</span>`;
    t.hidden = false;
    const host = $("#fpa-demo").getBoundingClientRect();
    const r = rect.getBoundingClientRect();
    const x = Math.min(Math.max(r.left - host.left + r.width / 2 - 100, 0), host.width - 210);
    t.style.left = `${x}px`;
    t.style.top = `${r.top - host.top + 8}px`;
  }

  function bars(lines, key, keys) {
    const groups = keys.map((k) => {
      const ls = lines.filter((l) => l[key] === k);
      return { k, m: ls.length ? M.metrics(ls) : null };
    }).filter((g) => g.m);
    if (!groups.length) return `<p class="note">No budget lines match the filters.</p>`;
    const max = niceMax(Math.max(1, ...groups.flatMap((g) => [g.m.budget, g.m.eac]).filter(isNum)));
    return `<ul class="fpa-bars">${groups.map(({ k, m }) => {
      const bp = isNum(m.budget) ? (m.budget / max) * 100 : 0;
      const ep = isNum(m.eac) ? (m.eac / max) * 100 : 0;
      const over = isNum(m.forecastVariance) && m.forecastVariance > 0.5;
      return `<li>
        <div class="fpa-bar-top"><span class="fpa-bar-name">${esc(k)}</span><span class="fpa-bar-val">EAC ${ne(moneyShort(m.eac))} of ${ne(moneyShort(m.budget))}</span></div>
        <div class="fpa-bar-track" role="img" aria-label="${esc(`${k}: EAC ${money(m.eac)}, budget ${money(m.budget)}`)}">
          <span class="fpa-bar-budget" style="width:${bp}%"></span><span class="fpa-bar-eac" style="width:${ep}%"></span>${isNum(m.budget) ? `<span class="fpa-bar-mark" style="left:${bp}%"></span>` : ""}
        </div>
        <div class="fpa-bar-foot">${isNum(m.forecastVariance) ? `${signedMoney(m.forecastVariance)} (${pct(m.forecastVariancePct)}) ${over ? `<span class="fpa-var fpa-unfav"><span aria-hidden="true">▲</span> Over</span>` : `<span class="fpa-var fpa-fav"><span aria-hidden="true">▼</span> Under</span>`}` : `<span class="fpa-ne">${NE}</span>`}</div>
      </li>`;
    }).join("")}</ul>
    <p class="note fpa-bars-key"><span class="sw sw-track" aria-hidden="true"></span>Budget · <span class="sw sw-actual" aria-hidden="true"></span>EAC · tick marks the budget</p>`;
  }

  function tableRows(comp, lines) {
    const mi = view.month === "" ? -1 : Number(view.month);
    return lines.map((l) => {
      const m = M.metrics([l]);
      const row = { line: l.label, budget: m.budget, actual: m.actual, commitments: m.commitments, available: m.available, ftc: m.ftc, eac: m.eac, fv: m.forecastVariance, fvp: m.forecastVariancePct };
      if (mi >= 0) {
        const mb = l.mBudget[mi];
        const isAct = mi < comp.through;
        const mv = isAct ? l.mActual[mi] : l.mForecast[mi];
        Object.assign(row, { mBudget: mb, mType: isAct ? "Actual" : "Forecast", mValue: mv, mVar: isNum(mb) && isNum(mv) ? mv - mb : null });
      }
      return row;
    });
  }

  function renderTable(comp, lines) {
    const mi = view.month === "" ? -1 : Number(view.month);
    const rows = tableRows(comp, lines);
    const tot = M.metrics(lines);
    const mn = mi >= 0 ? M.MONTHS[mi] : "";
    const cell = (v) => `<td class="num">${ne(money(v))}</td>`;
    const vcell = (v, p) => `<td class="num ${isNum(v) ? (v > 0.5 ? "fpa-unfav-t" : "fpa-fav-t") : ""}">${ne(signedMoney(v))}${p !== undefined ? `<br><small>${ne(pct(p))}</small>` : ""}</td>`;
    const mTot = mi >= 0 ? (() => {
      const s = (k) => rows.reduce((a, r) => (a === null || !isNum(r[k]) ? null : a + r[k]), 0);
      return { mBudget: s("mBudget"), mValue: s("mValue"), mVar: s("mVar") };
    })() : null;
    $("#fpa-table").innerHTML = rows.length ? `<table class="fpa-table">
      <caption class="fpa-sr">Budget line detail${mn ? ` with ${mn} columns` : ""}</caption>
      <thead><tr><th scope="col">Budget line</th><th scope="col">Approved budget</th><th scope="col">Actual to date</th><th scope="col">Open commitments</th><th scope="col">Available funds</th><th scope="col">Forecast-to-complete</th><th scope="col">EAC</th><th scope="col">Forecast variance</th>
        ${mi >= 0 ? `<th scope="col">${mn} budget</th><th scope="col">${mn} actual / forecast</th><th scope="col">${mn} variance</th>` : ""}</tr></thead>
      <tbody>${rows.map((r) => `<tr><th scope="row">${esc(r.line)}</th>${cell(r.budget)}${cell(r.actual)}${cell(r.commitments)}${cell(r.available)}${cell(r.ftc)}${cell(r.eac)}${vcell(r.fv, r.fvp)}
        ${mi >= 0 ? `${cell(r.mBudget)}<td class="num">${ne(money(r.mValue))}<br><small>${r.mType}</small></td>${vcell(r.mVar)}` : ""}</tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row">Total</th>${cell(tot.budget)}${cell(tot.actual)}${cell(tot.commitments)}${cell(tot.available)}${cell(tot.ftc)}${cell(tot.eac)}${vcell(tot.forecastVariance, tot.forecastVariancePct)}
        ${mi >= 0 ? `${cell(mTot.mBudget)}${cell(mTot.mValue)}${vcell(mTot.mVar)}` : ""}</tr></tfoot></table>` : `<p class="note">No budget lines match the filters.</p>`;
    $("#fpa-table")._rows = rows;
  }

  const statusBadge = (s) => {
    const cls = { Approved: "b-done", Open: "b-in-development", Closed: "b-concept", Pending: "b-progress", Requested: "b-progress", Submitted: "b-progress", Draft: "b-concept", Rejected: "b-concept" }[s] || "b-concept";
    return `<span class="badge ${cls}">${esc(s)}</span>`;
  };

  function renderRealloc(comp) {
    const list = state.reallocations.slice().reverse();
    $("#fpa-ra-list").innerHTML = list.length ? `<ul class="fpa-ra">${list.map((r) => `<li class="fpa-ra-item">
      <div class="fpa-ra-head"><strong>${esc(r.id)} · ${money(r.amount)}</strong>${statusBadge(r.status)}</div>
      <p><span class="fpa-k">From</span> ${esc(lineName(r.from))} <span aria-hidden="true">→</span><span class="fpa-sr">to</span> <span class="fpa-k">To</span> ${esc(lineName(r.to))}</p>
      <p><span class="fpa-k">Reason</span> ${esc(r.reason)}</p>
      <p><span class="fpa-k">Requester</span> ${esc(r.requester)} · <span class="fpa-k">Raised</span> ${esc(r.created || NE)}${r.decided ? ` · <span class="fpa-k">Decided</span> ${esc(r.decided)}` : ""}</p>
      ${r.status === "Pending" ? `<div class="fpa-decide">
          <label for="fpa-dn-${esc(r.id)}">Decision notes</label>
          <textarea id="fpa-dn-${esc(r.id)}" rows="2"></textarea>
          <div class="actions"><button type="button" class="btn btn-primary" data-ra="approve" data-id="${esc(r.id)}">Approve</button><button type="button" class="btn" data-ra="reject" data-id="${esc(r.id)}">Reject</button></div>
          <p class="fpa-error" id="fpa-de-${esc(r.id)}" role="alert"></p></div>`
        : `<p><span class="fpa-k">Decision notes</span> ${r.notes ? esc(r.notes) : `<span class="fpa-ne">${NE}</span>`}</p>`}
    </li>`).join("")}</ul>` : `<p class="note">No requests yet.</p>`;
    const src = $("#fpa-ra-from").value;
    const l = comp.lines.find((x) => x.id === src);
    $("#fpa-ra-avail").textContent = l ? `Available funds in this line: ${money(M.metrics([l]).available)}` : "";
  }

  function renderOrders(comp) {
    const os = state.orders;
    $("#fpa-po-table").innerHTML = `<table class="fpa-table">
      <caption class="fpa-sr">PR/PO and change-order tracker</caption>
      <thead><tr><th scope="col">ID</th><th scope="col">Type</th><th scope="col">Description</th><th scope="col">Workstream / line</th><th scope="col">Amount</th><th scope="col">Invoiced</th><th scope="col">Open commitment</th><th scope="col">Owner</th><th scope="col">Status</th><th scope="col">Expected</th><th scope="col">Linked PO</th></tr></thead>
      <tbody>${os.map((o) => {
        const c = o.type === "PO" ? M.poCommitment(o, os) : null;
        return `<tr><th scope="row">${esc(o.id)}</th><td>${esc(o.type)}</td><td>${esc(o.desc)}</td><td>${esc(lineName(o.line))}</td><td class="num">${ne(money(o.amount))}</td>
          <td class="num">${o.type === "PO" ? ne(money(o.invoiced)) : "—"}</td><td class="num">${o.type === "PO" ? ne(money(c)) : `<small>${o.type === "PR" ? "Pipeline" : o.status === "Approved" ? "Included in PO" : "Not committed"}</small>`}</td>
          <td>${esc(o.owner)}</td>
          <td><label class="fpa-sr" for="fpa-os-${esc(o.id)}">Status for ${esc(o.id)}</label><select id="fpa-os-${esc(o.id)}" data-order="${esc(o.id)}">${M.STATUSES[o.type].map((s) => opt(s, s, o.status)).join("")}</select></td>
          <td>${o.expected ? esc(o.expected) : `<span class="fpa-ne">${NE}</span>`}</td><td>${o.link ? esc(o.link) : "—"}</td></tr>`;
      }).join("")}</tbody></table>`;
    // keep linked-PO options current
    const link = $("#fpa-po-link"); const cur = link.value;
    link.innerHTML = `<option value="">Choose a PO</option>` + os.filter((o) => o.type === "PO").map((o) => opt(o.id, `${o.id} · ${o.desc}`, cur)).join("");
  }

  function renderAudit() {
    $("#fpa-audit").innerHTML = state.audit.slice(0, 25).map((a) => {
      const d = new Date(a.at);
      const when = isNaN(d) ? a.at : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      return `<li><time datetime="${esc(a.at)}">${esc(when)}</time><strong>${esc(a.what)}</strong><span>${esc(a.detail)}</span></li>`;
    }).join("");
  }

  function syncInputs() {
    const i = state.inputs;
    $("#fpa-i-through").value = String(i.actualsThrough);
    $("#fpa-i-adj").value = isNum(i.fcAdjust) ? i.fcAdjust : "";
    $("#fpa-i-phase").value = i.phasing;
    document.querySelectorAll("[data-cat]").forEach((el) => { const v = i.catBudget[el.dataset.cat]; el.value = isNum(v) ? Math.round(v) : ""; });
  }

  function update() {
    const comp = M.compute(state);
    const lines = filtered(comp);
    const m = M.metrics(lines);
    document.querySelectorAll("[data-scen]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scen === state.inputs.scenario)));
    $("#fpa-scen-note").textContent = `${comp.scenario.label}: ${comp.scenario.note} Scenarios change forecast-to-complete only; the approved budget stays the same.`;
    renderKpis(comp, m);
    renderChart(comp, lines);
    $("#fpa-by-ws").innerHTML = bars(lines, "ws", M.WORKSTREAMS);
    $("#fpa-by-cat").innerHTML = bars(lines, "cat", M.CATEGORIES);
    renderTable(comp, lines);
    renderRealloc(comp);
    renderOrders(comp);
    renderAudit();
  }

  function setTab(k) {
    view.tab = k;
    document.querySelectorAll("[data-tab]").forEach((b) => { const on = b.dataset.tab === k; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    document.querySelectorAll(".fpa-panel").forEach((p) => { p.hidden = p.id !== `fpa-panel-${k}`; });
  }

  function status(msg) { const el = $("#fpa-status"); el.textContent = msg; setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 4000); }

  function poStatusOptions() {
    const t = $("#fpa-po-type").value;
    $("#fpa-po-status").innerHTML = M.STATUSES[t].map((s) => opt(s, s, "")).join("");
    $("#fpa-po-inv-wrap").hidden = t !== "PO";
    $("#fpa-po-link-wrap").hidden = t !== "Change order";
  }

  const nextId = (prefix, list, start) => {
    const n = list.filter((x) => x.id.startsWith(prefix)).map((x) => Number(x.id.split("-")[1]) || 0);
    return `${prefix}${Math.max(start, ...n) + 1}`;
  };
  const today = () => new Date().toISOString().slice(0, 10);

  async function exportCSV() {
    const comp = M.compute(state);
    const rows = tableRows(comp, filtered(comp));
    const mi = view.month === "" ? -1 : Number(view.month);
    const mn = mi >= 0 ? M.MONTHS[mi] : "";
    const num = (v) => (isNum(v) ? Math.round(v) : NE);
    const head = ["Budget line", "Approved budget", "Actual to date", "Open commitments", "Available funds", "Forecast-to-complete", "EAC", "Forecast variance", "Forecast variance %"]
      .concat(mi >= 0 ? [`${mn} budget`, `${mn} actual/forecast`, `${mn} value type`, `${mn} variance`] : []);
    const body = rows.map((r) => [r.line, num(r.budget), num(r.actual), num(r.commitments), num(r.available), num(r.ftc), num(r.eac), num(r.fv), isNum(r.fvp) ? (r.fvp * 100).toFixed(1) + "%" : NE]
      .concat(mi >= 0 ? [num(r.mBudget), num(r.mValue), r.mType, num(r.mVar)] : []));
    const q = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const note = [`Illustrative demo - fictional data, not actual client results. Scenario: ${comp.scenario.label}. Actuals through ${M.MONTHS[comp.through - 1]}.`];
    const csv = [note, head, ...body].map((r) => r.map(q).join(",")).join("\r\n");
    const filename = "fpa-demo-fictional-budget.csv";
    try {
      if (window.claude && typeof window.claude.use === "function") {
        const dl = await window.claude.use("downloads");
        if (dl) { await dl.save({ filename, data: "﻿" + csv }); status("CSV saved."); return; }
      }
    } catch (e) { if (e && e.code === "declined") return; }
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    status("CSV downloaded.");
  }

  /* ---------------- Events ---------------- */
  function bind() {
    const root = $("#fpa-demo");
    $("#fpa-f-month").addEventListener("change", (e) => { view.month = e.target.value; update(); });
    $("#fpa-f-ws").addEventListener("change", (e) => { view.ws = e.target.value; update(); });
    $("#fpa-f-cat").addEventListener("change", (e) => { view.cat = e.target.value; update(); });
    root.addEventListener("click", (e) => {
      const sc = e.target.closest("[data-scen]");
      if (sc && sc.dataset.scen !== state.inputs.scenario) { state.inputs.scenario = sc.dataset.scen; commit("Scenario changed", `Scenario set to ${M.SCENARIOS[sc.dataset.scen].label}.`); return; }
      const tb = e.target.closest("[data-tab]");
      if (tb) { setTab(tb.dataset.tab); return; }
      const ra = e.target.closest("[data-ra]");
      if (ra) {
        const r = state.reallocations.find((x) => x.id === ra.dataset.id);
        const notes = ($(`#fpa-dn-${r.id}`).value || "").trim();
        const err = $(`#fpa-de-${r.id}`);
        if (!notes) { err.textContent = "Add decision notes before approving or rejecting."; $(`#fpa-dn-${r.id}`).focus(); return; }
        if (ra.dataset.ra === "approve") {
          const msg = M.validateRealloc(r, M.compute(state));
          if (msg) { err.textContent = `Can’t approve: ${msg}`; return; }
        }
        r.status = ra.dataset.ra === "approve" ? "Approved" : "Rejected";
        r.notes = notes; r.decided = today();
        commit(`Reallocation ${r.status.toLowerCase()}`, `${r.id}: ${money(r.amount)} from ${lineName(r.from)} to ${lineName(r.to)}.`);
        status(`${r.id} ${r.status.toLowerCase()}.`);
        return;
      }
      if (e.target.closest("#fpa-restore")) {
        const box = $("#fpa-restore-confirm");
        if (box) return;
        e.target.closest("#fpa-restore").insertAdjacentHTML("afterend", `<span id="fpa-restore-confirm" class="fpa-confirm">Replace all demo changes with the sample data? <button type="button" class="btn" id="fpa-restore-yes">Restore</button> <button type="button" class="btn" id="fpa-restore-no">Cancel</button></span>`);
        $("#fpa-restore-yes").focus();
        return;
      }
      if (e.target.closest("#fpa-restore-no")) { $("#fpa-restore-confirm").remove(); return; }
      if (e.target.closest("#fpa-restore-yes")) {
        state = M.sampleData(); save(); syncInputs();
        view.month = ""; view.ws = ""; view.cat = "";
        $("#fpa-f-month").value = ""; $("#fpa-f-ws").value = ""; $("#fpa-f-cat").value = "";
        $("#fpa-restore-confirm").remove(); update(); status("Sample data restored."); return;
      }
      if (e.target.closest("#fpa-export")) { exportCSV(); }
    });
    // Tabs: arrow-key navigation
    $(".fpa-tabs").addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
      const tabs = [...document.querySelectorAll("[data-tab]")];
      const i = tabs.findIndex((t) => t.dataset.tab === view.tab);
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      setTab(n.dataset.tab); n.focus(); e.preventDefault();
    });
    // Assumptions
    $("#fpa-i-through").addEventListener("change", (e) => { state.inputs.actualsThrough = Number(e.target.value); commit("Assumption changed", `Actuals recorded through ${M.MONTHS[state.inputs.actualsThrough - 1]}.`); });
    $("#fpa-i-phase").addEventListener("change", (e) => { state.inputs.phasing = e.target.value; commit("Assumption changed", `Monthly phasing set to ${e.target.value === "even" ? "even across 12 months" : "as planned per line"}.`); });
    $("#fpa-i-adj").addEventListener("change", (e) => {
      const v = e.target.value === "" ? null : Number(e.target.value);
      if (v !== null && (!Number.isFinite(v) || v < -50 || v > 50)) { status("Enter a forecast adjustment between −50 and 50."); syncInputs(); return; }
      state.inputs.fcAdjust = v;
      commit("Assumption changed", v === null ? "Forecast adjustment cleared (not entered)." : `Forecast adjustment set to ${v}%.`);
    });
    document.querySelectorAll("[data-cat]").forEach((el) => el.addEventListener("change", () => {
      const v = el.value === "" ? null : Number(el.value);
      if (v !== null && (!Number.isFinite(v) || v < 0)) { status("Enter a budget of 0 or more."); syncInputs(); return; }
      const prev = state.inputs.catBudget[el.dataset.cat];
      state.inputs.catBudget[el.dataset.cat] = v;
      commit("Budget changed", `${el.dataset.cat} approved budget: ${money(prev)} → ${money(v)}.`);
    }));
    // Chart tooltip
    const chart = $("#fpa-chart");
    chart.addEventListener("mousemove", (e) => tip(e, true));
    chart.addEventListener("mouseleave", (e) => tip(e, false));
    chart.addEventListener("focusin", (e) => tip(e, true));
    chart.addEventListener("focusout", (e) => tip(e, false));
    // Reallocation form
    $("#fpa-ra-from").addEventListener("change", () => update());
    $("#fpa-ra-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const r = {
        id: nextId("RA-", state.reallocations, 100), amount: $("#fpa-ra-amount").value === "" ? null : Number($("#fpa-ra-amount").value),
        from: $("#fpa-ra-from").value, to: $("#fpa-ra-to").value, reason: $("#fpa-ra-reason").value.trim(), requester: $("#fpa-ra-req").value.trim(),
        status: "Pending", notes: "", created: today(), decided: "",
      };
      const msg = M.validateRealloc(r, M.compute(state));
      if (msg) { $("#fpa-ra-error").textContent = msg; return; }
      $("#fpa-ra-error").textContent = "";
      state.reallocations.push(r);
      e.target.reset();
      commit("Reallocation requested", `${r.id}: ${money(r.amount)} from ${lineName(r.from)} to ${lineName(r.to)} by ${r.requester}.`);
      status(`${r.id} submitted for approval.`);
    });
    // PR/PO form
    $("#fpa-po-type").addEventListener("change", poStatusOptions);
    $("#fpa-po-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const type = $("#fpa-po-type").value;
      const o = {
        type, line: $("#fpa-po-line").value, desc: $("#fpa-po-desc").value.trim(),
        amount: $("#fpa-po-amount").value === "" ? null : Number($("#fpa-po-amount").value),
        invoiced: type === "PO" ? Number($("#fpa-po-inv").value || 0) : 0,
        owner: $("#fpa-po-owner").value.trim(), status: $("#fpa-po-status").value, expected: $("#fpa-po-date").value,
        link: type === "Change order" ? $("#fpa-po-link").value : "",
      };
      let err = "";
      if (type !== "Change order" && !o.line) err = "Choose the budget line (workstream) this belongs to.";
      else if (!o.desc) err = "Add a description.";
      else if (!isNum(o.amount) || o.amount <= 0) err = "Enter an amount greater than zero.";
      else if (!o.owner) err = "Add an owner.";
      else if (type === "PO" && (o.invoiced < 0 || o.invoiced > o.amount)) err = "Invoiced to date must be between 0 and the PO amount.";
      else if (type === "Change order" && !o.link) err = "Choose the PO this change order modifies.";
      if (err) { $("#fpa-po-error").textContent = err; return; }
      if (type === "Change order") o.line = state.orders.find((x) => x.id === o.link).line;
      $("#fpa-po-error").textContent = "";
      o.id = nextId({ PR: "PR-", PO: "PO-", "Change order": "CO-" }[type], state.orders, { PR: 2000, PO: 1000, "Change order": 3000 }[type]);
      state.orders.push(o);
      e.target.reset(); poStatusOptions();
      commit(`${type} added`, `${o.id}: ${o.desc}, ${money(o.amount)}, ${o.status}.`);
      status(`${o.id} added.`);
    });
    root.addEventListener("change", (e) => {
      const sel = e.target.closest("[data-order]");
      if (!sel) return;
      const o = state.orders.find((x) => x.id === sel.dataset.order);
      const prev = o.status; o.status = sel.value;
      commit("Status changed", `${o.id}: ${prev} → ${o.status}.`);
      const again = document.getElementById(`fpa-os-${o.id}`); if (again) again.focus();
    });
  }

  /* ---------------- Init ---------------- */
  renderCase();
  state = load();
  renderSkeleton();
  poStatusOptions();
  syncInputs();
  setTab("dashboard");
  bind();
  update();
  // app.js scrolls to the hash before this section has content; re-align once it does.
  if (location.hash === "#fpa") { const el = document.getElementById("fpa"); if (el && !el.hidden) el.scrollIntoView({ block: "start" }); }
})();
