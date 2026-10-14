// Pure business logic for TPM Delivery Hub.
// No DOM access here, so it runs in the browser and in Node tests.
// Every automatic flag is a plain, documented rule — see FLAG_RULES.

export const NOT_ENTERED = 'Not entered';

export const HEALTH = ['On Track', 'At Risk', 'Off Track'];
export const ITEM_KINDS = ['Milestone', 'Action'];
export const ITEM_STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Done', 'Cancelled'];
export const CLOSED_ITEM_STATUSES = ['Done', 'Cancelled'];
export const LEVELS = ['High', 'Medium', 'Low'];
export const RAID_TYPES = ['Risk', 'Assumption', 'Issue', 'Dependency'];
export const RAID_STATUSES = ['Open', 'In Progress', 'Monitoring', 'Closed'];
export const DECISION_STATUSES = ['Pending', 'Decided', 'Deferred'];
export const RACI_ROLES = ['R', 'A', 'C', 'I'];

export const COLLECTIONS = [
  'programs', 'projects', 'workstreams', 'items', 'raid', 'decisions',
  'stakeholders', 'raci', 'measures', 'reports', 'customTemplates', 'lifecycles', 'customPlaybooks',
];

export const DEFAULT_SETTINGS = { upcomingDays: 14, recentMeasureDays: 30, focusProgramId: '' };

export const FLAG_RULES = [
  { name: 'Overdue', rule: 'A milestone or action whose due date is before today and whose status is not Done or Cancelled.' },
  { name: 'Due soon', rule: 'A milestone or action that is not Done or Cancelled and is due today or within the "upcoming" window (default 14 days, set on the Data & Privacy page).' },
  { name: 'Dependency warning', rule: 'Shown on an item when something it depends on is Blocked, Overdue, Cancelled, deleted, or due after the item itself.' },
  { name: 'High-priority RAID', rule: 'A risk or issue whose status is not Closed and whose priority or impact is High.' },
  { name: 'RAID item overdue', rule: 'A RAID record that is not Closed and whose due date is before today.' },
  { name: 'Decision awaiting action', rule: 'A decision whose status is Pending.' },
  { name: 'No Accountable owner', rule: 'A RACI activity or deliverable with nobody in the A column. More than one A is flagged as a warning because accountability should sit with one person.' },
  { name: 'Recently updated measure', rule: 'A success measure whose "updated" date falls within the last 30 days.' },
];

// ---------- Dates (all stored as YYYY-MM-DD strings) ----------
export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
export function isISODate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(s + 'T00:00:00Z');
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}
function utc(iso) { return isISODate(iso) ? Date.parse(iso + 'T00:00:00Z') : null; }
export function daysUntil(due, today) {
  const a = utc(today), b = utc(due);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86400000);
}
export function addDays(iso, n) {
  const t = utc(iso);
  if (t === null) return '';
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}
export function inRange(iso, start, end) {
  if (!isISODate(iso)) return false;
  return (!start || iso >= start) && (!end || iso <= end);
}
export function dateOf(ts) { return typeof ts === 'string' ? ts.slice(0, 10) : ''; }

// ---------- Small helpers ----------
export const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
export const orNE = (v) => (isBlank(v) ? NOT_ENTERED : String(v).trim());
const levelRank = (l) => ({ High: 0, Medium: 1, Low: 2 }[l] ?? 3);
export function toNumber(v) {
  if (isBlank(v)) return null;
  const n = Number(String(v).replace(/[,\s%$]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ---------- Items (milestones and actions) ----------
export function isOpenItem(item) { return !CLOSED_ITEM_STATUSES.includes(item.status); }

/** Returns 'closed' | 'overdue' | 'upcoming' | null */
export function itemFlag(item, today, upcomingDays = DEFAULT_SETTINGS.upcomingDays) {
  if (!isOpenItem(item)) return 'closed';
  const d = daysUntil(item.dueDate, today);
  if (d === null) return null;
  if (d < 0) return 'overdue';
  if (d <= upcomingDays) return 'upcoming';
  return null;
}

export function dependencyWarnings(item, allItems, today) {
  const byId = new Map(allItems.map((i) => [i.id, i]));
  const out = [];
  for (const depId of item.dependsOn || []) {
    const dep = byId.get(depId);
    if (!dep) { out.push('A linked dependency no longer exists'); continue; }
    if (dep.status === 'Done') continue;
    if (dep.status === 'Cancelled') { out.push(`"${dep.name}" was cancelled`); continue; }
    if (dep.status === 'Blocked') out.push(`"${dep.name}" is blocked`);
    if (itemFlag(dep, today) === 'overdue') out.push(`"${dep.name}" is overdue`);
    if (isISODate(dep.dueDate) && isISODate(item.dueDate) && dep.dueDate > item.dueDate) {
      out.push(`"${dep.name}" is due after this item (${dep.dueDate})`);
    }
  }
  return out;
}

/** True if making `itemId` depend on `dependsOn` would create a loop. */
export function wouldCreateCycle(itemId, dependsOn, allItems) {
  const graph = new Map(allItems.map((i) => [i.id, i.dependsOn || []]));
  graph.set(itemId, dependsOn || []);
  const seen = new Set();
  const stack = [...(dependsOn || [])];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === itemId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(graph.get(cur) || []));
  }
  return false;
}

// ---------- RAID ----------
export function isOpenRaid(r) { return r.status !== 'Closed'; }
export function isHighRaid(r) { return isOpenRaid(r) && (r.priority === 'High' || r.impact === 'High'); }
export function raidFlag(r, today) {
  if (!isOpenRaid(r)) return 'closed';
  const d = daysUntil(r.dueDate, today);
  return d !== null && d < 0 ? 'overdue' : null;
}

// ---------- RACI ----------
export function raciFlags(row) {
  const a = (row.A || []).filter((x) => !isBlank(x));
  const r = (row.R || []).filter((x) => !isBlank(x));
  return { noA: a.length === 0, multiA: a.length > 1, noR: r.length === 0 };
}

// ---------- Measures ----------
export function measureProgress(m) {
  const b = toNumber(m.baseline), t = toNumber(m.target), c = toNumber(m.current);
  if (b === null || t === null || c === null || t === b) return null;
  return Math.round(((c - b) / (t - b)) * 100);
}

// ---------- Generic sorting ----------
export function compareValues(a, b) {
  const ea = isBlank(a), eb = isBlank(b);
  if (ea && eb) return 0;
  if (ea) return 1; // blanks last
  if (eb) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}
export function sortRecords(list, getter, dir = 'asc') {
  const m = dir === 'desc' ? -1 : 1;
  return [...list].sort((x, y) => {
    const a = getter(x), b = getter(y);
    if (isBlank(a) && !isBlank(b)) return 1;
    if (!isBlank(a) && isBlank(b)) return -1;
    return compareValues(a, b) * m;
  });
}
export const priorityRank = levelRank;

// ---------- Portfolio summary (every number derives from entered data) ----------
export function portfolioSummary(state, today, opts = {}) {
  const upcomingDays = opts.upcomingDays ?? DEFAULT_SETTINGS.upcomingDays;
  const recentDays = opts.recentMeasureDays ?? DEFAULT_SETTINGS.recentMeasureDays;
  const focus = opts.programId || '';
  const programs = state.programs.filter((p) => !focus || p.id === focus);
  const ids = new Set(programs.map((p) => p.id));
  const mine = (r) => ids.has(r.programId);

  const items = state.items.filter(mine);
  const milestones = items.filter((i) => i.kind === 'Milestone');
  const byDue = (a, b) => compareValues(a.dueDate, b.dueDate);

  const health = { 'On Track': 0, 'At Risk': 0, 'Off Track': 0, 'Not set': 0 };
  programs.forEach((p) => { health[HEALTH.includes(p.status) ? p.status : 'Not set'] += 1; });

  const overdueMilestones = milestones.filter((i) => itemFlag(i, today, upcomingDays) === 'overdue').sort(byDue);
  const upcomingMilestones = milestones.filter((i) => itemFlag(i, today, upcomingDays) === 'upcoming').sort(byDue);
  const overdueActions = items.filter((i) => i.kind === 'Action' && itemFlag(i, today, upcomingDays) === 'overdue').sort(byDue);
  const blockedItems = items.filter((i) => i.status === 'Blocked');

  const highRaid = state.raid
    .filter((r) => mine(r) && (r.type === 'Risk' || r.type === 'Issue') && isHighRaid(r))
    .sort((a, b) => compareValues(a.dueDate, b.dueDate));
  const pendingDecisions = state.decisions
    .filter((d) => mine(d) && d.status === 'Pending')
    .sort((a, b) => compareValues(a.neededBy, b.neededBy));
  const recentMeasures = state.measures
    .filter((m) => mine(m) && isISODate(m.updatedDate))
    .filter((m) => { const d = daysUntil(m.updatedDate, today); return d !== null && d <= 0 && d >= -recentDays; })
    .sort((a, b) => compareValues(b.updatedDate, a.updatedDate));
  const raciGaps = state.raci.filter((r) => mine(r) && raciFlags(r).noA);
  const projects = (state.projects || []).filter(mine);
  const projectHealth = { 'On Track': 0, 'At Risk': 0, 'Off Track': 0, 'Not set': 0 };
  projects.forEach((p) => { projectHealth[HEALTH.includes(p.status) ? p.status : 'Not set'] += 1; });
  const projectsAtRisk = projects.filter((p) => p.status === 'At Risk' || p.status === 'Off Track');

  return {
    programs, health, overdueMilestones, upcomingMilestones, overdueActions, blockedItems,
    highRaid, pendingDecisions, recentMeasures, raciGaps, upcomingDays, recentDays, projects, projectHealth, projectsAtRisk,
  };
}

/** Counts for one project, from items/RAID/decisions linked to it. */
export function projectCounts(state, projectId, today, upcomingDays) {
  const items = state.items.filter((i) => i.projectId === projectId);
  const milestones = items.filter((i) => i.kind === 'Milestone');
  return {
    milestones: milestones.length,
    milestonesDone: milestones.filter((i) => i.status === 'Done').length,
    openItems: items.filter(isOpenItem).length,
    overdue: items.filter((i) => itemFlag(i, today, upcomingDays) === 'overdue').length,
    upcoming: items.filter((i) => itemFlag(i, today, upcomingDays) === 'upcoming').length,
    blocked: items.filter((i) => i.status === 'Blocked').length,
    openRaid: state.raid.filter((r) => r.projectId === projectId && isOpenRaid(r)).length,
    highRaid: state.raid.filter((r) => r.projectId === projectId && isHighRaid(r)).length,
    pendingDecisions: state.decisions.filter((d) => d.projectId === projectId && d.status === 'Pending').length,
  };
}

export function programCounts(state, programId, today, upcomingDays) {
  const items = state.items.filter((i) => i.programId === programId);
  return {
    openItems: items.filter(isOpenItem).length,
    overdue: items.filter((i) => itemFlag(i, today, upcomingDays) === 'overdue').length,
    upcoming: items.filter((i) => itemFlag(i, today, upcomingDays) === 'upcoming').length,
    openRaid: state.raid.filter((r) => r.programId === programId && isOpenRaid(r)).length,
    highRaid: state.raid.filter((r) => r.programId === programId && isHighRaid(r)).length,
    pendingDecisions: state.decisions.filter((d) => d.programId === programId && d.status === 'Pending').length,
    measures: state.measures.filter((m) => m.programId === programId).length,
  };
}

// ---------- Weekly status report ----------
export const REPORT_SECTIONS = [
  { key: 'changes', label: 'Changes since last report' },
  { key: 'accomplishments', label: 'Accomplishments' },
  { key: 'projects', label: 'Project status' },
  { key: 'upcoming', label: 'Upcoming milestones' },
  { key: 'raid', label: 'Risks, issues and dependencies' },
  { key: 'help', label: 'Decisions or help needed' },
  { key: 'measures', label: 'Success measures' },
  { key: 'notes', label: 'Additional notes (optional)' },
];

export function previousReport(state, programId, weekEnding, excludeId) {
  return state.reports
    .filter((r) => r.programId === programId && r.id !== excludeId && (!weekEnding || r.weekEnding < weekEnding))
    .sort((a, b) => compareValues(b.weekEnding, a.weekEnding))[0] || null;
}

const lines = (arr) => (arr.length ? arr.join('\n') : NOT_ENTERED);

/**
 * Builds an editable draft strictly from stored data. Nothing is invented:
 * any section without data reads "Not entered".
 */
export function buildReportDraft(state, programId, opts = {}) {
  const today = opts.today || todayISO();
  const upcomingDays = opts.upcomingDays ?? DEFAULT_SETTINGS.upcomingDays;
  const weekEnding = opts.weekEnding || today;
  const p = state.programs.find((x) => x.id === programId);
  if (!p) throw new Error('Program not found');
  const prev = previousReport(state, programId, weekEnding, opts.excludeId);
  const periodStart = opts.periodStart || (prev ? addDays(prev.weekEnding, 1) : addDays(weekEnding, -6));
  const ws = (id) => state.workstreams.find((w) => w.id === id)?.name;
  const items = state.items.filter((i) => i.programId === programId);
  const raid = state.raid.filter((r) => r.programId === programId);
  const projectList = (state.projects || []).filter((x) => x.programId === programId);
  const projectLines = projectList.map((x) => {
    const c = projectCounts(state, x.id, today, upcomingDays);
    return `- ${x.name}: ${orNE(x.status)}. ${orNE(x.statusReason)} Owner: ${orNE(x.owner)}. Milestones done: ${c.milestonesDone} of ${c.milestones}; overdue items: ${c.overdue}${isISODate(x.endDate) ? `; target end ${x.endDate}` : ''}`;
  });
  const decisions = state.decisions.filter((d) => d.programId === programId);
  const measures = state.measures.filter((m) => m.programId === programId);

  const completed = items
    .filter((i) => i.status === 'Done' && inRange(i.completedDate, periodStart, weekEnding))
    .sort((a, b) => compareValues(a.completedDate, b.completedDate));
  const newRaid = raid.filter((r) => inRange(dateOf(r.createdAt), periodStart, weekEnding));
  const decided = decisions.filter((d) => d.status === 'Decided' && inRange(d.decidedDate, periodStart, weekEnding));

  // Changes since last report
  const changes = [];
  if (prev) {
    const was = prev.health || NOT_ENTERED;
    const now = p.status || NOT_ENTERED;
    changes.push(was === now
      ? `Overall health unchanged: ${now} (last report: week ending ${prev.weekEnding}).`
      : `Overall health changed from ${was} to ${now} (last report: week ending ${prev.weekEnding}).`);
  } else {
    changes.push('No earlier saved report for this program, so there is nothing to compare against yet.');
  }
  changes.push(`Milestones/actions marked Done in this period: ${completed.length}.`);
  changes.push(`RAID records added in this period: ${newRaid.length}.`);
  changes.push(`Decisions recorded as Decided in this period: ${decided.length}.`);

  const accomplishments = completed.map((i) => {
    const bits = [i.kind, (state.projects || []).find((x) => x.id === i.projectId)?.name, ws(i.workstreamId), i.owner].filter((x) => !isBlank(x)).join(', ');
    return `- ${i.name}${bits ? ` (${bits})` : ''}, completed ${i.completedDate}`;
  });

  const openMilestones = items.filter((i) => i.kind === 'Milestone' && isOpenItem(i));
  const overdueM = openMilestones.filter((i) => itemFlag(i, today, upcomingDays) === 'overdue').sort((a, b) => compareValues(a.dueDate, b.dueDate));
  const soonM = openMilestones.filter((i) => itemFlag(i, today, upcomingDays) === 'upcoming').sort((a, b) => compareValues(a.dueDate, b.dueDate));
  const upcoming = [
    ...overdueM.map((i) => `- OVERDUE: ${i.name}, due ${i.dueDate}, status ${i.status}, owner ${orNE(i.owner)}`),
    ...soonM.map((i) => `- ${i.name}, due ${i.dueDate}, status ${i.status}, owner ${orNE(i.owner)}`),
  ];

  const raidOpen = raid
    .filter((r) => r.type !== 'Assumption' && isOpenRaid(r))
    .sort((a, b) => levelRank(a.priority) - levelRank(b.priority) || levelRank(a.impact) - levelRank(b.impact));
  const raidLines = raidOpen.map((r) =>
    `- [${r.type}; priority ${orNE(r.priority)}; impact ${orNE(r.impact)}] ${r.title}. Owner: ${orNE(r.owner)}. Next action: ${orNE(r.mitigation)}${isISODate(r.dueDate) ? ` (due ${r.dueDate})` : ''}`);

  const help = [
    ...decisions.filter((d) => d.status === 'Pending').map((d) =>
      `- Decision needed: ${d.title}. Decision owner: ${orNE(d.owner)}${isISODate(d.neededBy) ? `, needed by ${d.neededBy}` : ''}`),
    ...items.filter((i) => i.status === 'Blocked').map((i) =>
      `- Blocked: ${i.name}. Blocker: ${orNE(i.blockers)}`),
  ];

  const measureLines = measures.map((m) => {
    const u = isBlank(m.unit) ? '' : ` ${m.unit}`;
    const val = (v) => (isBlank(v) ? NOT_ENTERED : `${v}${u}`);
    return `- ${m.name}: current ${val(m.current)} (baseline ${val(m.baseline)}, target ${val(m.target)}). Updated ${orNE(m.updatedDate)}. Owner: ${orNE(m.owner)}`;
  });

  return {
    programId,
    weekEnding,
    periodStart,
    health: p.status || '',
    healthReason: p.statusReason || '',
    preparedBy: p.tpm || '',
    previousReportId: prev ? prev.id : '',
    sections: {
      changes: changes.join('\n'),
      accomplishments: lines(accomplishments),
      projects: lines(projectLines),
      upcoming: lines(upcoming),
      raid: lines(raidLines),
      help: lines(help),
      measures: lines(measureLines),
      notes: '',
    },
  };
}

export function reportToMarkdown(report, programName) {
  const out = [];
  out.push(`# Weekly Status Report: ${programName || NOT_ENTERED}`);
  out.push('');
  out.push(`**Week ending:** ${orNE(report.weekEnding)}  `);
  out.push(`**Reporting period:** ${orNE(report.periodStart)} to ${orNE(report.weekEnding)}  `);
  out.push(`**Prepared by:** ${orNE(report.preparedBy)}`);
  out.push('');
  out.push('## Overall health');
  out.push(`**${orNE(report.health)}**: ${orNE(report.healthReason)}`);
  for (const s of REPORT_SECTIONS) {
    const text = report.sections?.[s.key];
    if (s.key === 'notes' && isBlank(text)) continue;
    out.push('');
    out.push(`## ${s.label.replace(' (optional)', '')}`);
    out.push(orNE(text));
  }
  out.push('');
  out.push('_Prepared in TPM Delivery Hub from manually entered program data._');
  return out.join('\n');
}

export function reportToRows(report, programName) {
  const rows = [
    { Program: programName, 'Week ending': report.weekEnding, Section: 'Overall health', Content: `${orNE(report.health)}: ${orNE(report.healthReason)}` },
  ];
  for (const s of REPORT_SECTIONS) {
    const text = report.sections?.[s.key];
    if (s.key === 'notes' && isBlank(text)) continue;
    const label = s.label.replace(' (optional)', '');
    for (const line of orNE(text).split('\n')) {
      if (isBlank(line)) continue;
      rows.push({ Program: programName, 'Week ending': report.weekEnding, Section: label, Content: line.replace(/^-\s*/, '') });
    }
  }
  return rows;
}

// ---------- CSV ----------
export function csvEscape(v) {
  let s = v === undefined || v === null ? '' : Array.isArray(v) ? v.join('; ') : String(v);
  // Neutralise spreadsheet formula injection (=, +, @, or - not followed by a digit).
  if (/^[=+@]/.test(s) || /^-(?!\d)/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCSV(rows, columns) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
  const head = cols.map((c) => csvEscape(typeof c === 'string' ? c : c.label)).join(',');
  const body = rows.map((r) => cols.map((c) => {
    if (typeof c === 'string') return csvEscape(r[c]);
    return csvEscape(c.value(r));
  }).join(','));
  return [head, ...body].join('\r\n');
}
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', i = 0, inQ = false;
  const src = String(text).replace(/^﻿/, '');
  while (i < src.length) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const pick = (list, v, fallback) => list.find((x) => norm(x) === norm(v)) || fallback;

/** Maps CSV rows to milestone/action records. Returns {records, skipped, newWorkstreams}. */
export function csvToItems(text, programId, workstreams, today = todayISO()) {
  const rows = parseCSV(text);
  if (!rows.length) return { records: [], skipped: 0, newWorkstreams: [], error: 'The file is empty.' };
  const header = rows[0].map(norm);
  const col = (...names) => header.findIndex((h) => names.includes(h));
  const idx = {
    name: col('name', 'title', 'milestone', 'action'),
    kind: col('type', 'kind'),
    description: col('description', 'details'),
    owner: col('owner'),
    workstream: col('workstream'),
    dueDate: col('duedate', 'due', 'date'),
    status: col('status'),
    priority: col('priority'),
    blockers: col('blockers', 'blocker'),
    nextSteps: col('nextsteps', 'nextstep'),
  };
  if (idx.name < 0) return { records: [], skipped: rows.length - 1, newWorkstreams: [], error: 'No "Name" column found.' };
  const wsByName = new Map(workstreams.filter((w) => w.programId === programId).map((w) => [norm(w.name), w]));
  const newWorkstreams = [];
  const records = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const get = (k) => (idx[k] >= 0 ? (r[idx[k]] || '').trim() : '');
    const name = get('name');
    if (!name) { skipped++; continue; }
    let wsId = '';
    const wsName = get('workstream');
    if (wsName) {
      let w = wsByName.get(norm(wsName));
      if (!w) { w = { id: `new-ws-${newWorkstreams.length}`, programId, name: wsName, owner: '', deliverables: '' }; wsByName.set(norm(wsName), w); newWorkstreams.push(w); }
      wsId = w.id;
    }
    const due = get('dueDate');
    const status = pick(ITEM_STATUSES, get('status'), 'Not Started');
    records.push({
      programId,
      kind: pick(ITEM_KINDS, get('kind'), 'Milestone'),
      name,
      description: get('description'),
      owner: get('owner'),
      workstreamId: wsId,
      dueDate: isISODate(due) ? due : '',
      status,
      priority: pick(LEVELS, get('priority'), 'Medium'),
      dependsOn: [],
      blockers: get('blockers'),
      nextSteps: get('nextSteps'),
      completedDate: status === 'Done' ? today : '',
    });
  }
  return { records, skipped, newWorkstreams };
}

// ---------- Backup validation ----------
export function emptyState() {
  const s = { app: 'tpm-delivery-hub', schemaVersion: 1, settings: { ...DEFAULT_SETTINGS } };
  COLLECTIONS.forEach((c) => { s[c] = []; });
  return s;
}
export function normalizeState(obj) {
  const s = emptyState();
  if (!obj || typeof obj !== 'object') return s;
  COLLECTIONS.forEach((c) => {
    if (Array.isArray(obj[c])) s[c] = obj[c].filter((r) => r && typeof r === 'object' && typeof r.id === 'string');
  });
  s.settings = { ...DEFAULT_SETTINGS, ...(obj.settings && typeof obj.settings === 'object' ? obj.settings : {}) };
  const up = Number(s.settings.upcomingDays);
  s.settings.upcomingDays = Number.isFinite(up) && up >= 1 && up <= 90 ? Math.round(up) : DEFAULT_SETTINGS.upcomingDays;
  return s;
}
export function validateBackup(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['The file is not a TPM Delivery Hub backup (expected a JSON object).'] };
  if (obj.app && obj.app !== 'tpm-delivery-hub') errors.push('The file was created by a different app.');
  const found = COLLECTIONS.filter((c) => Array.isArray(obj[c]));
  if (!found.length) errors.push('No program data found in the file.');
  COLLECTIONS.forEach((c) => {
    if (obj[c] !== undefined && !Array.isArray(obj[c])) errors.push(`"${c}" should be a list.`);
  });
  return { ok: errors.length === 0, errors };
}
export function mergeStates(base, incoming) {
  const out = normalizeState(base);
  const inc = normalizeState(incoming);
  let added = 0;
  COLLECTIONS.forEach((c) => {
    const ids = new Set(out[c].map((r) => r.id));
    inc[c].forEach((r) => { if (!ids.has(r.id)) { out[c].push(r); added++; } });
  });
  return { state: out, added };
}
