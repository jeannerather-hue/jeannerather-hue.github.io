// Budget & Finance: pure calculations, validation, CSV mapping and summary drafts.
// No DOM access. Every number comes from records the user entered.
//
// Definitions (used everywhere):
//   Actuals                      = expenses already recorded
//   Open commitment (per PR/PO)  = max(0, original amount + approved change orders − amount spent/invoiced),
//                                  only for PR/POs with status Approved or Open. The spent portion is never counted again.
//   Forecast-to-complete (FTC)   = expected future costs NOT already in actuals or open commitments (entered as forecast lines)
//   Estimate at completion (EAC) = actuals + open commitments + forecast-to-complete
//   Forecast variance            = EAC − current approved budget   (positive = over budget)
//   Forecast variance %          = forecast variance ÷ current approved budget
//   Uncommitted budget remaining = current approved budget − actuals − open commitments
//   Projected budget remaining   = current approved budget − EAC
//   Current approved budget      = original baseline + approved budget increases − approved budget decreases
//                                  (reallocations move budget between categories/workstreams; the total is unchanged)
// Missing required inputs give null, which the UI shows as "Not entered".
import { isBlank, isISODate, parseCSV, todayISO } from './logic.js?v=1792079564';

export const FIN_COLLECTIONS = ['budgets', 'phasing', 'expenses', 'commitments', 'changeOrders', 'forecasts', 'reallocations', 'finReviews'];
export const DEFAULT_CATEGORIES = ['Labor', 'Software', 'Cloud services', 'Implementation', 'Travel', 'Training', 'Contingency'];
export const PO_TYPES = ['PR', 'PO'];
export const PO_STATUSES = ['Draft', 'Requested', 'Approved', 'Open', 'Closed', 'Cancelled'];
export const COMMITTED_STATUSES = ['Approved', 'Open'];
export const CO_STATUSES = ['Pending', 'Approved', 'Rejected'];
export const RA_TYPES = ['Reallocation', 'Budget increase', 'Budget decrease'];
export const RA_STATUSES = ['Proposed', 'Pending approval', 'Approved', 'Rejected'];
export const RA_DIMENSIONS = [{ value: 'category', label: 'Cost category' }, { value: 'workstream', label: 'Workstream' }];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
export const toAmount = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/[,\s$€£¥]/g, ''));
  return Number.isFinite(n) ? n : null;
};
export const isMonth = (m) => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
export const monthOf = (d) => (isISODate(d) ? d.slice(0, 7) : (isMonth(d) ? d : ''));
export function monthsBetween(start, end) {
  if (!isMonth(start) || !isMonth(end) || end < start) return [];
  const out = [];
  let [y, m] = start.split('-').map(Number);
  for (let i = 0; i < 120; i++) {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    out.push(k);
    if (k === end) break;
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
export const monthLabel = (m) => (isMonth(m) ? new Date(`${m}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' }) : m);

const add = (a, b) => (a === null || b === null ? null : a + b);
const sub = (a, b) => (a === null || b === null ? null : a - b);
const div = (a, b) => (a === null || b === null || b === 0 ? null : a / b);
const live = (r) => !r.archived;

export const budgetFor = (state, programId) => (state.budgets || []).find((b) => b.programId === programId && !b.archived) || null;
export const categoriesFor = (budget) => (budget && Array.isArray(budget.categories) && budget.categories.length ? budget.categories : DEFAULT_CATEGORIES);

/** Open commitment for one PR/PO, with the parts that produce it. */
export function commitmentDetail(po, changeOrders) {
  const cos = (changeOrders || []).filter((c) => live(c) && c.commitmentId === po.id && c.status === 'Approved');
  const original = num(po.originalAmount);
  const spent = num(po.spentAmount) ?? 0;
  const coTotal = cos.reduce((a, c) => (a === null || num(c.amount) === null ? null : a + c.amount), 0);
  const committed = COMMITTED_STATUSES.includes(po.status) && live(po);
  const current = add(original, coTotal);
  const open = !committed ? 0 : current === null ? null : Math.max(0, current - spent);
  return { original, approvedChangeOrders: coTotal, current, spent, open, counted: committed, changeOrders: cos };
}

/** Does a record match the filters? (period applies to its month) */
function matches(rec, f, month) {
  if (f.ws && (rec.workstreamId || '') !== f.ws) return false;
  if (f.cat && (rec.category || '') !== f.cat) return false;
  if (f.project && (rec.projectId || '') !== f.project) return false;
  if (f.from || f.to) {
    if (!month) return false;
    if (f.from && month < f.from) return false;
    if (f.to && month > f.to) return false;
  }
  return true;
}

/** Approved budget changes (reallocations, increases, decreases), dated. */
export function approvedChanges(state, programId) {
  return (state.reallocations || []).filter((r) => r.programId === programId && live(r) && r.status === 'Approved' && num(r.amount) !== null)
    .sort((a, b) => String(a.decisionDate || '').localeCompare(String(b.decisionDate || '')));
}

/** Delta an approved change applies to a filtered view (category or workstream). */
function changeDelta(ch, f) {
  const dim = ch.dimension || 'category';
  const key = dim === 'workstream' ? f.ws : f.cat;
  const other = dim === 'workstream' ? f.cat : f.ws;
  if (!key) return { delta: null, attributable: !other }; // unfiltered on this dimension
  let d = 0;
  if (ch.to === key && ch.type !== 'Budget decrease') d += ch.amount;
  if (ch.from === key && ch.type !== 'Budget increase') d -= ch.amount;
  return { delta: d, attributable: !other };
}

/**
 * Main computation for one program.
 * filters: { from, to (YYYY-MM), ws, cat, project }
 */
export function computeProgram(state, programId, filters = {}, today = todayISO()) {
  const f = { from: filters.from || '', to: filters.to || '', ws: filters.ws || '', cat: filters.cat || '', project: filters.project || '' };
  const budget = budgetFor(state, programId);
  const notes = [];
  const mine = (r) => r.programId === programId && live(r);
  const phasing = (state.phasing || []).filter(mine);
  const expenses = (state.expenses || []).filter(mine);
  const pos = (state.commitments || []).filter(mine);
  const cos = (state.changeOrders || []).filter(mine);
  const forecasts = (state.forecasts || []).filter(mine);
  const changes = approvedChanges(state, programId);

  const baseline = budget ? num(budget.baseline) : null;
  const increases = changes.filter((c) => c.type === 'Budget increase').reduce((a, c) => a + c.amount, 0);
  const decreases = changes.filter((c) => c.type === 'Budget decrease').reduce((a, c) => a + c.amount, 0);
  const currentTotal = baseline === null ? null : baseline + increases - decreases;

  const months = budget ? monthsBetween(budget.periodStart, budget.periodEnd) : [];
  const periodFiltered = !!(f.from || f.to);
  const dimFiltered = !!(f.ws || f.cat || f.project);

  // Records contributing to this view
  const phIn = phasing.filter((r) => matches(r, f, r.month));
  const exIn = expenses.filter((r) => matches(r, f, monthOf(r.date)));
  const poIn = pos.filter((r) => matches(r, f, monthOf(r.expectedDate)));
  const fcIn = forecasts.filter((r) => matches(r, f, r.month));
  const sumAmt = (rs, k = 'amount') => rs.reduce((a, r) => (a === null || num(r[k]) === null ? null : a + r[k]), 0);

  const phasedTotal = sumAmt(phIn);
  const actuals = sumAmt(exIn);
  const poDetails = poIn.map((po) => ({ po, ...commitmentDetail(po, cos) }));
  const open = poDetails.reduce((a, d) => (a === null || d.open === null ? null : a + d.open), 0);
  const ftc = sumAmt(fcIn);

  // Current approved budget for this view
  let budgetView;
  let changeRows = [];
  if (!budget || baseline === null) {
    budgetView = null;
  } else if (!dimFiltered && !periodFiltered) {
    budgetView = currentTotal;
  } else if (periodFiltered) {
    budgetView = phasedTotal; // monthly phasing only; approved changes are not phased by month
    if (changes.length) notes.push('Approved budget changes are not phased by month, so a period view shows phased budget only.');
  } else if (f.project) {
    budgetView = null;
    notes.push('Budgets are planned by category and workstream, not by project, so a project view shows costs without a budget.');
  } else {
    let d = 0; let unattributable = false;
    changes.forEach((ch) => { const r = changeDelta(ch, f); if (r.delta !== null) { d += r.delta; if (r.delta) changeRows.push({ ch, delta: r.delta }); } if (!r.attributable && r.delta) unattributable = true; });
    budgetView = add(phasedTotal, d);
    if (unattributable) notes.push('Some approved changes are recorded by a different dimension and cannot be split across this filter.');
  }

  // Monthly phasing should add up to the original baseline (approved changes are tracked separately).
  const allPhased = sumAmt(phasing);
  const phasingGap = budget && baseline !== null && allPhased !== null ? baseline - allPhased : null;
  if (!periodFiltered && !dimFiltered && phasingGap !== null && Math.abs(phasingGap) >= 0.5) notes.push(`Monthly phasing adds up to ${Math.round(allPhased).toLocaleString('en-US')}, which differs from the original baseline by ${Math.round(phasingGap).toLocaleString('en-US')}.`);
  const undated = poDetails.filter((d) => d.counted && !monthOf(d.po.expectedDate)).length;
  if (periodFiltered && pos.some((p) => COMMITTED_STATUSES.includes(p.status) && !monthOf(p.expectedDate))) notes.push('Open commitments without an expected date are left out of period views.');

  const eac = add(add(actuals, open), ftc);
  const variance = sub(eac, budgetView);
  const totals = {
    baseline, currentTotal, budget: budgetView, actuals, open, ftc, eac,
    variance, variancePct: div(variance, budgetView),
    uncommitted: sub(sub(budgetView, actuals), open),
    projected: sub(budgetView, eac),
  };

  // Monthly view (whole budget period, honoring ws/cat/project filters and an optional range)
  const fm = { ...f, from: '', to: '' };
  const monthly = months.filter((m) => (!f.from || m >= f.from) && (!f.to || m <= f.to)).map((m) => {
    const b = sumAmt(phasing.filter((r) => r.month === m && matches(r, fm, m)));
    const a = sumAmt(expenses.filter((r) => monthOf(r.date) === m && matches(r, fm, m)));
    const o = pos.filter((p) => monthOf(p.expectedDate) === m && matches(p, fm, m)).reduce((acc, p) => { const d = commitmentDetail(p, cos).open; return acc === null || d === null ? null : acc + d; }, 0);
    const fc = sumAmt(forecasts.filter((r) => r.month === m && matches(r, fm, m)));
    const e = add(add(a, o), fc);
    return { month: m, budget: b, actuals: a, open: o, ftc: fc, eac: e, variance: sub(e, b) };
  });

  // Breakdown by category and by workstream
  const breakdown = (dim, keys) => keys.map((k) => {
    const sub2 = computeProgram(state, programId, { ...f, [dim]: k }, today);
    return { key: k, ...sub2.totals };
  });

  return {
    budget, months, monthly, totals, notes, undated, phasingGap,
    records: { phasing: phIn, expenses: exIn, commitments: poDetails, forecasts: fcIn, changes, changeRows },
    breakdown,
  };
}

/** Records needing attention. */
export function reviewQueue(state, programId, today = todayISO(), thresholdPct = 5) {
  const mine = (r) => r.programId === programId && live(r);
  const cos = (state.changeOrders || []).filter(mine);
  const pending = [
    ...(state.reallocations || []).filter((r) => mine(r) && (r.status === 'Pending approval' || r.status === 'Proposed')).map((r) => ({ kind: 'Reallocation', rec: r })),
    ...cos.filter((c) => c.status === 'Pending').map((c) => ({ kind: 'Change order', rec: c })),
    ...(state.commitments || []).filter((p) => mine(p) && p.status === 'Requested').map((p) => ({ kind: p.type || 'PR', rec: p })),
  ];
  const openPos = (state.commitments || []).filter(mine).map((p) => ({ po: p, ...commitmentDetail(p, cos) })).filter((d) => d.counted && (d.open === null || d.open > 0));
  const overdue = openPos.filter((d) => isISODate(d.po.expectedDate) && d.po.expectedDate < today);
  const comp = computeProgram(state, programId, {}, today);
  const b = comp.budget;
  const variances = [];
  if (b) {
    const t = Math.abs(Number(thresholdPct) || 0) / 100;
    categoriesFor(b).forEach((c) => {
      const r = computeProgram(state, programId, { cat: c }, today).totals;
      if (r.variancePct !== null && Math.abs(r.variancePct) >= t && Math.abs(r.variance) >= 0.5) variances.push({ dim: 'Category', key: c, ...r });
      else if (r.budget === 0 && r.eac > 0) variances.push({ dim: 'Category', key: c, ...r });
    });
    (state.workstreams || []).filter((w) => w.programId === programId).forEach((w) => {
      const r = computeProgram(state, programId, { ws: w.id }, today).totals;
      if (r.variancePct !== null && Math.abs(r.variancePct) >= t && Math.abs(r.variance) >= 0.5) variances.push({ dim: 'Workstream', key: w.name, wsId: w.id, ...r });
    });
  }
  return { pending, openPos, overdue, variances };
}

// ---------------------------------------------------------------- validation
export function validateRecord(kind, r, ctx = {}) {
  const errs = [];
  const amt = (k, label, { allowZero = false, allowNeg = false } = {}) => {
    const v = r[k];
    if (num(v) === null) errs.push(`${label} must be a number.`);
    else if (!allowNeg && (allowZero ? v < 0 : v <= 0)) errs.push(`${label} must be ${allowZero ? 'zero or more' : 'greater than zero'}.`);
  };
  const cats = ctx.categories || DEFAULT_CATEGORIES;
  const cat = () => { if (isBlank(r.category)) errs.push('Category is required.'); else if (!cats.includes(r.category)) errs.push(`Category "${r.category}" is not in this budget's category list.`); };
  if (kind === 'budget') {
    if (!/^[A-Z]{3}$/.test(String(r.currency || ''))) errs.push('Currency must be a 3-letter code such as USD.');
    if (!isMonth(r.periodStart) || !isMonth(r.periodEnd)) errs.push('Budget period needs a start and end month.');
    else if (r.periodEnd < r.periodStart) errs.push('Period end must be on or after the start.');
    else if (monthsBetween(r.periodStart, r.periodEnd).length > 60) errs.push('Budget period can be at most 60 months.');
    if (r.baseline !== null && r.baseline !== undefined && r.baseline !== '') amt('baseline', 'Approved baseline', { allowZero: true });
    if (!r.categories || !r.categories.length) errs.push('Add at least one cost category.');
  }
  if (kind === 'expense') {
    if (!isISODate(r.date)) errs.push('Date must be a valid date (YYYY-MM-DD).');
    amt('amount', 'Amount', { allowNeg: true }); if (num(r.amount) === 0) errs.push('Amount cannot be zero.');
    cat();
    if (isBlank(r.description)) errs.push('Description is required.');
  }
  if (kind === 'commitment') {
    if (isBlank(r.ref)) errs.push('Reference number is required.');
    if (!PO_TYPES.includes(r.type)) errs.push('Type must be PR or PO.');
    if (!PO_STATUSES.includes(r.status)) errs.push(`Status must be one of: ${PO_STATUSES.join(', ')}.`);
    amt('originalAmount', 'Original amount');
    amt('spentAmount', 'Amount spent or invoiced', { allowZero: true });
    cat();
    if (!isBlank(r.expectedDate) && !isISODate(r.expectedDate)) errs.push('Expected date must be a valid date (YYYY-MM-DD).');
  }
  if (kind === 'changeOrder') {
    if (isBlank(r.commitmentId)) errs.push('Choose the PR/PO this change order belongs to.');
    amt('amount', 'Amount', { allowNeg: true }); if (num(r.amount) === 0) errs.push('Amount cannot be zero.');
    if (isBlank(r.reason)) errs.push('Reason is required.');
    if (!CO_STATUSES.includes(r.status)) errs.push(`Status must be one of: ${CO_STATUSES.join(', ')}.`);
    if (r.status === 'Approved' && !isISODate(r.approvalDate)) errs.push('An approved change order needs an approval date.');
  }
  if (kind === 'forecast' || kind === 'phasing') {
    if (!isMonth(r.month)) errs.push('Month must be YYYY-MM.');
    else if (ctx.months && ctx.months.length && !ctx.months.includes(r.month)) errs.push('Month is outside the budget period.');
    amt('amount', 'Amount', { allowZero: true, allowNeg: kind === 'forecast' });
    if (kind === 'forecast') cat();
    if (kind === 'phasing' && isBlank(r.category) && isBlank(r.workstreamId)) errs.push('Phase the budget by a cost category, a workstream, or both.');
    if (kind === 'phasing' && !isBlank(r.category) && !cats.includes(r.category)) errs.push(`Category "${r.category}" is not in this budget's category list.`);
  }
  if (kind === 'reallocation') {
    if (!RA_TYPES.includes(r.type)) errs.push('Choose a change type.');
    amt('amount', 'Amount');
    if (r.type !== 'Budget increase' && isBlank(r.from)) errs.push('Source is required.');
    if (r.type !== 'Budget decrease' && isBlank(r.to)) errs.push('Destination is required.');
    if (r.type === 'Reallocation' && r.from && r.from === r.to) errs.push('Source and destination must be different.');
    if (isBlank(r.reason)) errs.push('Reason is required.');
    if (isBlank(r.requester)) errs.push('Requester is required.');
    if (r.status === 'Approved' || r.status === 'Rejected') {
      if (isBlank(r.approver)) errs.push('Record who approved or rejected it.');
      if (!isISODate(r.decisionDate)) errs.push('A decision needs a decision date.');
    }
  }
  return errs;
}

// ---------------------------------------------------------------- CSV import
export const CSV_SPECS = {
  expenses: { label: 'Actual expenses', kind: 'expense', columns: ['Date', 'Amount', 'Category', 'Workstream', 'Project', 'Description', 'Source'] },
  commitments: { label: 'PR/PO commitments', kind: 'commitment', columns: ['Reference', 'Type', 'Vendor', 'Owner', 'Category', 'Workstream', 'Project', 'Original amount', 'Spent amount', 'Status', 'Expected date', 'Description'] },
  forecasts: { label: 'Forecast-to-complete', kind: 'forecast', columns: ['Month', 'Category', 'Workstream', 'Project', 'Amount', 'Basis'] },
  phasing: { label: 'Monthly budget phasing', kind: 'phasing', columns: ['Month', 'Category', 'Workstream', 'Amount'] },
};
const normH = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

/**
 * Parse and validate a CSV. Returns { records, errors } where errors are row-level messages.
 * Nothing is imported if any row has an error (the caller decides).
 */
export function importCSV(type, text, ctx) {
  const spec = CSV_SPECS[type];
  const rows = parseCSV(text);
  if (!rows.length) return { records: [], errors: ['The file is empty.'] };
  const head = rows[0].map(normH);
  const idx = (name) => head.indexOf(normH(name));
  const required = { expenses: ['Date', 'Amount', 'Category', 'Description'], commitments: ['Reference', 'Type', 'Category', 'Original amount', 'Status'], forecasts: ['Month', 'Category', 'Amount'], phasing: ['Month', 'Amount'] }[type];
  const missingCols = required.filter((c) => idx(c) < 0);
  if (missingCols.length) return { records: [], errors: [`Missing column${missingCols.length > 1 ? 's' : ''}: ${missingCols.join(', ')}. Expected columns: ${spec.columns.join(', ')}.`] };
  const wsByName = new Map((ctx.workstreams || []).map((w) => [w.name.toLowerCase(), w.id]));
  const prByName = new Map((ctx.projects || []).map((p) => [p.name.toLowerCase(), p.id]));
  const records = []; const errors = [];
  rows.slice(1).forEach((row, i) => {
    const get = (c) => (idx(c) >= 0 ? String(row[idx(c)] ?? '').trim() : '');
    const rowErrs = [];
    const wsName = get('Workstream'); const prName = get('Project');
    const workstreamId = wsName ? wsByName.get(wsName.toLowerCase()) : '';
    const projectId = prName ? prByName.get(prName.toLowerCase()) : '';
    if (wsName && !workstreamId) rowErrs.push(`Workstream "${wsName}" does not exist in this program.`);
    if (prName && !projectId) rowErrs.push(`Project "${prName}" does not exist in this program.`);
    let rec;
    if (type === 'expenses') rec = { date: get('Date'), amount: toAmount(get('Amount')), category: get('Category'), workstreamId: workstreamId || '', projectId: projectId || '', description: get('Description'), source: get('Source') };
    if (type === 'commitments') {
      const t = get('Type').toUpperCase();
      const st = PO_STATUSES.find((s) => s.toLowerCase() === get('Status').toLowerCase()) || get('Status');
      rec = { ref: get('Reference'), type: t, vendor: get('Vendor'), owner: get('Owner'), category: get('Category'), workstreamId: workstreamId || '', projectId: projectId || '', originalAmount: toAmount(get('Original amount')), spentAmount: get('Spent amount') === '' ? 0 : toAmount(get('Spent amount')), status: st, expectedDate: get('Expected date'), description: get('Description') };
    }
    if (type === 'forecasts') rec = { month: get('Month'), category: get('Category'), workstreamId: workstreamId || '', projectId: projectId || '', amount: toAmount(get('Amount')), basis: get('Basis') };
    if (type === 'phasing') rec = { month: get('Month'), category: get('Category'), workstreamId: workstreamId || '', amount: toAmount(get('Amount')) };
    rowErrs.push(...validateRecord(spec.kind, rec, ctx));
    if (rowErrs.length) errors.push(`Row ${i + 2}: ${rowErrs.join(' ')}`);
    else records.push(rec);
  });
  if (!records.length && !errors.length) errors.push('The file has a header row but no data rows.');
  return { records, errors };
}

// ---------------------------------------------------------------- record history
export function diffFields(prev, next, ignore = ['updatedAt', 'createdAt', 'history']) {
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  const out = [];
  keys.forEach((k) => {
    if (ignore.includes(k)) return;
    const a = prev ? prev[k] : undefined; const b = next[k];
    if (JSON.stringify(a ?? '') !== JSON.stringify(b ?? '')) out.push({ field: k, from: a ?? '', to: b ?? '' });
  });
  return out;
}

// ---------------------------------------------------------------- monthly review
export const REVIEW_STEPS = [
  { n: 1, title: 'Confirm the approved baseline and monthly phasing', help: 'Check the original baseline, the current approved budget after approved changes, and that monthly phasing adds up.' },
  { n: 2, title: 'Update actuals and open commitments', help: 'Record this month’s expenses and update amounts spent or invoiced on each PR/PO.' },
  { n: 3, title: 'Review PR/POs and change orders', help: 'Check pending requests and change orders, and PR/POs past their expected date.' },
  { n: 4, title: 'Update forecast-to-complete', help: 'Enter expected future costs that are not already actuals or open commitments.' },
  { n: 5, title: 'Review variances and explain material changes', help: 'For each variance above your threshold, write what caused it. Leave it blank if you don’t know yet.' },
  { n: 6, title: 'Record reallocation requests and approvals', help: 'Log new requests and record decisions with approver and date. Only approved changes affect the budget.' },
  { n: 7, title: 'Draft the finance status summary', help: 'A draft built only from what is recorded. Edit it before exporting.' },
];
export const reviewFor = (state, programId, month) => (state.finReviews || []).find((r) => r.programId === programId && r.month === month) || null;

const fmtMoney = (v, cur) => {
  if (num(v) === null) return 'Not entered';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD', maximumFractionDigits: 0 }).format(v); } catch { return `${cur || ''} ${Math.round(v).toLocaleString('en-US')}`; }
};
const fmtPct = (v) => (num(v) === null ? 'Not entered' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);
export const varLabel = (v) => (num(v) === null ? '' : Math.abs(v) < 0.5 ? 'on budget' : v > 0 ? 'over budget' : 'under budget');

/** Draft summary built only from recorded data. Lists what is missing. */
export function buildFinanceSummary(state, programId, month, opts = {}) {
  const today = opts.today || todayISO();
  const program = (state.programs || []).find((p) => p.id === programId);
  const b = budgetFor(state, programId);
  const cur = b?.currency || 'USD';
  const review = reviewFor(state, programId, month) || { explanations: {} };
  const comp = computeProgram(state, programId, {}, today);
  const t = comp.totals;
  const q = reviewQueue(state, programId, today, b?.varianceThreshold ?? 5);
  const missing = [];
  if (!b) missing.push('No budget has been set up for this program.');
  else {
    if (t.baseline === null) missing.push('Approved baseline is not entered.');
    if (!(state.phasing || []).some((r) => r.programId === programId && !r.archived)) missing.push('Monthly phasing is not entered.');
  }
  const monthEx = (state.expenses || []).filter((e) => e.programId === programId && !e.archived && monthOf(e.date) === month);
  if (!monthEx.length) missing.push(`No actual expenses recorded for ${monthLabel(month)}.`);
  if (!(state.forecasts || []).some((r) => r.programId === programId && !r.archived)) missing.push('Forecast-to-complete is not entered.');
  q.variances.forEach((v) => { if (isBlank((review.explanations || {})[`${v.dim}:${v.key}`])) missing.push(`Explanation not entered for the ${v.key} variance.`); });

  const approvedThisMonth = (state.reallocations || []).filter((r) => r.programId === programId && !r.archived && r.status === 'Approved' && monthOf(r.decisionDate) === month);
  const L = [];
  L.push(`# Finance status: ${program?.name || 'Not entered'}, ${monthLabel(month)}`);
  L.push('');
  L.push(`**Currency:** ${b ? cur : 'Not entered'} · **Budget owner:** ${b?.owner || 'Not entered'} · **Prepared:** ${today}`);
  L.push('');
  L.push('## Budget position');
  L.push(`- Original approved baseline: ${fmtMoney(t.baseline, cur)}`);
  L.push(`- Current approved budget: ${fmtMoney(t.currentTotal, cur)}`);
  L.push(`- Actuals to date: ${fmtMoney(t.actuals, cur)}`);
  L.push(`- Open commitments: ${fmtMoney(t.open, cur)}`);
  L.push(`- Forecast-to-complete: ${fmtMoney(t.ftc, cur)}`);
  L.push(`- Estimate at completion: ${fmtMoney(t.eac, cur)}`);
  L.push(`- Forecast variance: ${fmtMoney(t.variance, cur)} (${fmtPct(t.variancePct)})${varLabel(t.variance) ? `, ${varLabel(t.variance)}` : ''}`);
  L.push(`- Uncommitted budget remaining: ${fmtMoney(t.uncommitted, cur)}`);
  L.push(`- Projected budget remaining: ${fmtMoney(t.projected, cur)}`);
  L.push('');
  L.push(`## Material variances (threshold ${b?.varianceThreshold ?? 5}%)`);
  if (!q.variances.length) L.push('None above the threshold in recorded data.');
  q.variances.forEach((v) => {
    const ex = (review.explanations || {})[`${v.dim}:${v.key}`];
    L.push(`- ${v.dim} ${v.key}: ${fmtMoney(v.variance, cur)} (${fmtPct(v.variancePct)}), ${varLabel(v.variance)}. Explanation: ${isBlank(ex) ? 'Not entered' : ex.trim()}`);
  });
  L.push('');
  L.push('## Approvals and commitments');
  L.push(`- Items awaiting approval: ${q.pending.length}${q.pending.length ? ` (${q.pending.map((p) => `${p.kind} ${p.rec.ref || p.rec.id.slice(0, 6)}`).join(', ')})` : ''}`);
  L.push(`- PR/POs past their expected date: ${q.overdue.length}${q.overdue.length ? ` (${q.overdue.map((d) => d.po.ref).join(', ')})` : ''}`);
  L.push(`- Budget changes approved in ${monthLabel(month)}: ${approvedThisMonth.length}`);
  approvedThisMonth.forEach((r) => L.push(`  - ${r.type}: ${fmtMoney(r.amount, cur)}${r.from ? ` from ${r.fromLabel || r.from}` : ''}${r.to ? ` to ${r.toLabel || r.to}` : ''}. Approved by ${r.approver || 'Not entered'} on ${r.decisionDate || 'Not entered'}.`));
  if (!isBlank(review.notes)) { L.push(''); L.push('## Notes'); L.push(review.notes.trim()); }
  L.push('');
  L.push('## Missing information');
  L.push(missing.length ? missing.map((m) => `- ${m}`).join('\n') : 'None identified.');
  L.push('');
  L.push('_Draft built from data recorded in TPM Delivery Hub (stored in this browser only). Review and edit before sharing._');
  return { text: L.join('\n'), missing };
}

// ---------------------------------------------------------------- fictional sample data
/** Fictional budget data for the fictional demo program "demo-p1". Every record has isDemo: true. */
export function buildFinanceDemo(today = todayISO()) {
  const y = Number(today.slice(0, 4));
  const curM = Number(today.slice(5, 7));
  const m = (i) => `${y}-${String(i).padStart(2, '0')}`;
  const d = (i, day = 15) => `${m(i)}-${String(day).padStart(2, '0')}`;
  const ts = new Date().toISOString();
  const base = (id, x) => ({ id, isDemo: true, programId: 'demo-p1', createdAt: ts, updatedAt: ts, archived: false, history: [{ at: ts, changes: 'Fictional sample record created' }], ...x });
  const plan = [
    ['Labor', 'demo-w1', 210000], ['Labor', 'demo-w2', 210000], ['Software', 'demo-w1', 180000], ['Cloud services', 'demo-w2', 150000],
    ['Implementation', 'demo-w2', 300000], ['Travel', 'demo-w3', 20000], ['Training', 'demo-w3', 40000], ['Contingency', '', 90000],
  ];
  const phasing = []; let n = 0;
  plan.forEach(([cat, ws, annual]) => {
    const each = Math.floor(annual / 12);
    for (let i = 1; i <= 12; i++) phasing.push(base(`demo-ph${++n}`, { month: m(i), category: cat, workstreamId: ws, amount: i === 12 ? annual - each * 11 : each }));
  });
  const expenses = []; let e = 0;
  const lastActual = Math.max(1, curM - 1);
  for (let i = 1; i <= lastActual; i++) {
    const f = 0.9 + ((i * 7) % 5) / 20;
    expenses.push(base(`demo-ex${++e}`, { date: d(i, 28), amount: Math.round(17500 * f), category: 'Labor', workstreamId: 'demo-w1', description: 'Program team time (fictional)', source: 'Timesheet export (fictional)' }));
    expenses.push(base(`demo-ex${++e}`, { date: d(i, 28), amount: Math.round(17500 * (2 - f)), category: 'Labor', workstreamId: 'demo-w2', description: 'Integration team time (fictional)', source: 'Timesheet export (fictional)' }));
    expenses.push(base(`demo-ex${++e}`, { date: d(i, 20), amount: Math.round(11000 + i * 900), category: 'Cloud services', workstreamId: 'demo-w2', description: 'Cloud usage (fictional)', source: 'Cloud bill (fictional)', commitmentId: i <= 5 ? 'demo-po3' : '' }));
  }
  expenses.push(base(`demo-ex${++e}`, { date: d(1, 10), amount: 120000, category: 'Software', workstreamId: 'demo-w1', description: 'Platform licence invoice (fictional)', source: 'Invoice (fictional)', commitmentId: 'demo-po1' }));
  expenses.push(base(`demo-ex${++e}`, { date: d(Math.min(3, lastActual), 12), amount: 140000, category: 'Implementation', workstreamId: 'demo-w2', description: 'Integration partner milestone 1 (fictional)', source: 'Invoice (fictional)', commitmentId: 'demo-po2' }));
  expenses.push(base(`demo-ex${++e}`, { date: d(Math.min(2, lastActual), 5), amount: 4200, category: 'Travel', workstreamId: 'demo-w3', description: 'Stakeholder workshop travel (fictional)', source: 'Expense report (fictional)' }));
  const addDays = (n2) => new Date(Date.parse(today + 'T00:00:00Z') + n2 * 86400000).toISOString().slice(0, 10);
  const commitments = [
    base('demo-po1', { ref: 'PO-D101', type: 'PO', vendor: 'Example Software Co. (fictional)', owner: 'Riley Park (fictional)', category: 'Software', workstreamId: 'demo-w1', projectId: 'demo-pr1', originalAmount: 150000, spentAmount: 120000, status: 'Open', expectedDate: m(12) + '-15', description: 'Platform licences (fictional)' }),
    base('demo-po2', { ref: 'PO-D102', type: 'PO', vendor: 'Example Integration Partners (fictional)', owner: 'Sam Carter (fictional)', category: 'Implementation', workstreamId: 'demo-w2', projectId: 'demo-pr2', originalAmount: 260000, spentAmount: 140000, status: 'Open', expectedDate: addDays(45), description: 'Integration statement of work (fictional)' }),
    base('demo-po3', { ref: 'PO-D103', type: 'PO', vendor: 'Example Cloud Provider (fictional)', owner: 'Sam Carter (fictional)', category: 'Cloud services', workstreamId: 'demo-w2', projectId: '', originalAmount: 60000, spentAmount: 60000, status: 'Closed', expectedDate: d(Math.min(5, lastActual)), description: 'Reserved capacity, fully used (fictional)' }),
    base('demo-po4', { ref: 'PR-D104', type: 'PR', vendor: 'Example Training Studio (fictional)', owner: 'Jamie Patel (fictional)', category: 'Training', workstreamId: 'demo-w3', projectId: '', originalAmount: 30000, spentAmount: 0, status: 'Requested', expectedDate: addDays(30), description: 'Consumer onboarding training (fictional)' }),
    base('demo-po5', { ref: 'PO-D105', type: 'PO', vendor: 'Example Data Services (fictional)', owner: 'Riley Park (fictional)', category: 'Implementation', workstreamId: 'demo-w1', projectId: 'demo-pr1', originalAmount: 25000, spentAmount: 5000, status: 'Open', expectedDate: addDays(-10), description: 'Data profiling services (fictional)' }),
  ];
  const changeOrders = [
    base('demo-co1', { commitmentId: 'demo-po2', amount: 30000, reason: 'Additional data mapping scope (fictional)', status: 'Approved', approvalDate: addDays(-40) }),
    base('demo-co2', { commitmentId: 'demo-po1', amount: 10000, reason: 'Extra sandbox licences (fictional)', status: 'Pending', approvalDate: '' }),
  ];
  const forecasts = []; let f2 = 0;
  for (let i = curM; i <= 12; i++) {
    forecasts.push(base(`demo-fc${++f2}`, { month: m(i), category: 'Labor', workstreamId: 'demo-w1', projectId: '', amount: 17500, basis: 'Current team size (fictional)' }));
    forecasts.push(base(`demo-fc${++f2}`, { month: m(i), category: 'Labor', workstreamId: 'demo-w2', projectId: '', amount: 18500, basis: 'Current team size plus one contractor (fictional)' }));
    forecasts.push(base(`demo-fc${++f2}`, { month: m(i), category: 'Cloud services', workstreamId: 'demo-w2', projectId: '', amount: 16000, basis: 'Recent monthly usage trend (fictional)' }));
  }
  forecasts.push(base(`demo-fc${++f2}`, { month: m(Math.min(12, curM + 1)), category: 'Training', workstreamId: 'demo-w3', projectId: '', amount: 8000, basis: 'Workshop materials estimate (fictional)' }));
  const reallocations = [
    base('demo-ra1', { type: 'Reallocation', dimension: 'category', from: 'Contingency', to: 'Implementation', amount: 25000, reason: 'Fund approved change order for data mapping (fictional)', requester: 'Sam Carter (fictional)', approver: 'Jordan Ellis (fictional)', status: 'Approved', decisionDate: addDays(-38) }),
    base('demo-ra2', { type: 'Reallocation', dimension: 'category', from: 'Travel', to: 'Training', amount: 5000, reason: 'Move unused travel to onboarding workshops (fictional)', requester: 'Jamie Patel (fictional)', approver: '', status: 'Pending approval', decisionDate: '' }),
  ];
  const budgets = [base('demo-bud1', { currency: 'USD', periodStart: m(1), periodEnd: m(12), baseline: 1200000, owner: 'Jordan Ellis (fictional)', categories: [...DEFAULT_CATEGORIES], varianceThreshold: 5, notes: 'Fictional sample budget for the fictional demo program.' })];
  return { budgets, phasing, expenses, commitments, changeOrders, forecasts, reallocations, finReviews: [] };
}
