// Starter templates. Generic, editable scaffolding only — no real company,
// vendor, or project claims. Measure values are left blank on purpose.
import { addDays, isISODate, RAID_TYPES } from './logic.js?v=1792079564';

export const BUILTIN_TEMPLATES = [
  {
    id: 'tpl-data-platform',
    builtIn: true,
    name: 'Data platform / MDM program',
    area: 'Data platforms',
    description: 'Consolidate and govern core data (for example customer, product, or supplier records) on a shared platform with clear stewardship.',
    workstreams: [
      { name: 'Data discovery & profiling', deliverables: 'Source system inventory; Data profiling results' },
      { name: 'Data model & governance', deliverables: 'Target data model; Data ownership and stewardship model' },
      { name: 'Integration & pipelines', deliverables: 'Ingestion pipelines for priority sources; Match/merge rules' },
      { name: 'Data quality & stewardship', deliverables: 'Data quality rules; Stewardship workflows' },
      { name: 'Adoption & change', deliverables: 'Consumer onboarding guide; Training sessions' },
    ],
    milestones: [
      { week: 2, name: 'Source system inventory complete', workstream: 'Data discovery & profiling' },
      { week: 6, name: 'Target data model approved', workstream: 'Data model & governance' },
      { week: 8, name: 'Stewardship model agreed', workstream: 'Data model & governance' },
      { week: 14, name: 'Priority source pipelines built', workstream: 'Integration & pipelines' },
      { week: 18, name: 'Data quality rules live', workstream: 'Data quality & stewardship' },
      { week: 22, name: 'First data domain go-live', workstream: 'Adoption & change' },
    ],
    measures: [
      { name: 'Duplicate record rate', unit: '%', direction: 'decrease' },
      { name: 'Data quality rule pass rate', unit: '%', direction: 'increase' },
      { name: 'Priority sources onboarded', unit: 'sources', direction: 'increase' },
      { name: 'Time to provision a dataset', unit: 'days', direction: 'decrease' },
    ],
    raid: [
      { type: 'Risk', title: 'Source data quality is worse than expected and slows matching rules' },
      { type: 'Dependency', title: 'Source system owners available for profiling and integration work' },
      { type: 'Assumption', title: 'A business data owner is named for each data domain' },
    ],
    raci: ['Approve target data model', 'Define data quality rules', 'Approve domain go-live', 'Run ongoing data stewardship'],
  },
  {
    id: 'tpl-cloud',
    builtIn: true,
    name: 'Cloud infrastructure program',
    area: 'Cloud infrastructure',
    description: 'Stand up a secure cloud foundation and move workloads in planned waves with operational handover.',
    workstreams: [
      { name: 'Landing zone & networking', deliverables: 'Landing zone design; Network connectivity' },
      { name: 'Security & compliance', deliverables: 'Security baseline; Access model' },
      { name: 'Migration waves', deliverables: 'Wave plan; Cutover runbooks' },
      { name: 'Observability & operations', deliverables: 'Monitoring and alerting; Operations runbooks' },
      { name: 'Cost management', deliverables: 'Tagging standard; Budget alerts' },
    ],
    milestones: [
      { week: 3, name: 'Landing zone design approved', workstream: 'Landing zone & networking' },
      { week: 6, name: 'Security baseline validated', workstream: 'Security & compliance' },
      { week: 9, name: 'Pilot workload migrated', workstream: 'Migration waves' },
      { week: 16, name: 'Wave 1 migration complete', workstream: 'Migration waves' },
      { week: 20, name: 'Operational handover complete', workstream: 'Observability & operations' },
      { week: 24, name: 'Legacy decommission plan approved', workstream: 'Migration waves' },
    ],
    measures: [
      { name: 'Workloads migrated', unit: 'workloads', direction: 'increase' },
      { name: 'Service availability', unit: '%', direction: 'increase' },
      { name: 'Mean time to recover', unit: 'minutes', direction: 'decrease' },
      { name: 'Monthly infrastructure run cost', unit: 'currency', direction: 'decrease' },
    ],
    raid: [
      { type: 'Risk', title: 'Hidden application dependencies discovered late in a migration wave' },
      { type: 'Dependency', title: 'Network connectivity provisioned before pilot migration' },
      { type: 'Assumption', title: 'Application owners can support cutover windows' },
    ],
    raci: ['Approve landing zone design', 'Security sign-off per wave', 'Cutover go/no-go', 'Set cost guardrails'],
  },
  {
    id: 'tpl-aiml',
    builtIn: true,
    name: 'AI/ML delivery program',
    area: 'AI/ML',
    description: 'Take a machine learning use case from problem framing through evaluation, responsible-AI review, pilot, and monitored launch.',
    workstreams: [
      { name: 'Problem framing & data', deliverables: 'Use case brief; Approved training data sources' },
      { name: 'Model development', deliverables: 'Baseline model; Experiment log' },
      { name: 'Evaluation & responsible AI', deliverables: 'Evaluation report; Responsible AI review' },
      { name: 'MLOps & deployment', deliverables: 'Deployment pipeline; Rollback plan' },
      { name: 'Adoption & monitoring', deliverables: 'Pilot feedback; Monitoring dashboard' },
    ],
    milestones: [
      { week: 2, name: 'Use case and success criteria approved', workstream: 'Problem framing & data' },
      { week: 4, name: 'Training data access approved', workstream: 'Problem framing & data' },
      { week: 9, name: 'Baseline model evaluated', workstream: 'Model development' },
      { week: 12, name: 'Responsible AI review complete', workstream: 'Evaluation & responsible AI' },
      { week: 15, name: 'Pilot deployed to limited users', workstream: 'MLOps & deployment' },
      { week: 20, name: 'Production launch decision', workstream: 'Adoption & monitoring' },
    ],
    measures: [
      { name: 'Model quality metric vs agreed threshold', unit: 'score', direction: 'increase' },
      { name: 'Inference latency (p95)', unit: 'ms', direction: 'decrease' },
      { name: 'Pilot user adoption', unit: '%', direction: 'increase' },
      { name: 'Manual effort reduced', unit: 'hours/week', direction: 'increase' },
    ],
    raid: [
      { type: 'Risk', title: 'Training data does not represent production conditions' },
      { type: 'Assumption', title: 'Labelled data is available at the volume needed' },
      { type: 'Dependency', title: 'Privacy and legal review capacity for the pilot' },
    ],
    raci: ['Approve use case and success criteria', 'Approve training data use', 'Model release go/no-go', 'Own monitoring and retraining'],
  },
  {
    id: 'tpl-software',
    builtIn: true,
    name: 'General software implementation',
    area: 'Enterprise technology',
    description: 'Implement or upgrade a business application: requirements, build, testing, cutover, and hypercare.',
    workstreams: [
      { name: 'Requirements & design', deliverables: 'Requirements; Solution design' },
      { name: 'Build & configuration', deliverables: 'Configured system; Integrations' },
      { name: 'Testing', deliverables: 'Test plan; UAT sign-off' },
      { name: 'Deployment & cutover', deliverables: 'Cutover plan; Go-live checklist' },
      { name: 'Training & change', deliverables: 'Training materials; Communications plan' },
    ],
    milestones: [
      { week: 3, name: 'Requirements signed off', workstream: 'Requirements & design' },
      { week: 5, name: 'Solution design approved', workstream: 'Requirements & design' },
      { week: 12, name: 'Build complete', workstream: 'Build & configuration' },
      { week: 16, name: 'User acceptance testing complete', workstream: 'Testing' },
      { week: 18, name: 'Go-live', workstream: 'Deployment & cutover' },
      { week: 22, name: 'Hypercare exit', workstream: 'Training & change' },
    ],
    measures: [
      { name: 'Open defects at go-live', unit: 'defects', direction: 'decrease' },
      { name: 'Active user adoption', unit: '%', direction: 'increase' },
      { name: 'Process cycle time', unit: 'days', direction: 'decrease' },
    ],
    raid: [
      { type: 'Risk', title: 'Scope grows during build without change control' },
      { type: 'Dependency', title: 'Test environment available for system and user testing' },
      { type: 'Assumption', title: 'Key business users are available for UAT' },
    ],
    raci: ['Sign off requirements', 'UAT sign-off', 'Go-live decision', 'Deliver end-user training'],
  },
];

// ----- Text <-> structure, so users can edit templates in plain text -----
export function templateToText(t) {
  return {
    workstreams: t.workstreams.map((w) => [w.name, w.deliverables].filter(Boolean).join(' | ')).join('\n'),
    milestones: t.milestones.map((m) => [m.week ? `Week ${m.week}` : '', m.name, m.workstream || ''].join(' | ').replace(/\s\|\s$/, '')).join('\n'),
    measures: t.measures.map((m) => [m.name, m.unit || '', m.direction || 'increase'].join(' | ')).join('\n'),
    raid: t.raid.map((r) => `${r.type} | ${r.title}`).join('\n'),
    raci: t.raci.join('\n'),
  };
}

const split = (line) => line.split('|').map((s) => s.trim());
const nonEmptyLines = (text) => String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);

export function parseTemplateText(txt) {
  const workstreams = nonEmptyLines(txt.workstreams).map((l) => {
    const [name, deliverables = ''] = split(l);
    return { name, deliverables };
  }).filter((w) => w.name);
  const milestones = nonEmptyLines(txt.milestones).map((l) => {
    const parts = split(l);
    const wk = /^week\s*(\d+)$/i.exec(parts[0] || '');
    if (wk) return { week: Number(wk[1]), name: parts[1] || '', workstream: parts[2] || '' };
    return { week: null, name: parts[0], workstream: parts[1] || '' };
  }).filter((m) => m.name);
  const measures = nonEmptyLines(txt.measures).map((l) => {
    const [name, unit = '', dir = 'increase'] = split(l);
    return { name, unit, direction: /dec/i.test(dir) ? 'decrease' : 'increase' };
  }).filter((m) => m.name);
  const raid = nonEmptyLines(txt.raid).map((l) => {
    const parts = split(l);
    const type = RAID_TYPES.find((t) => t.toLowerCase() === (parts[0] || '').toLowerCase());
    return type ? { type, title: parts.slice(1).join(' | ') } : { type: 'Risk', title: l };
  }).filter((r) => r.title);
  const raci = nonEmptyLines(txt.raci);
  return { workstreams, milestones, measures, raid, raci };
}

/**
 * Turns a template into records for a new program.
 * Due dates are placeholders (start date + N weeks) only when setDates is true.
 */
export function instantiateTemplate(tpl, { programId, startDate, setDates, makeId }) {
  const wsIdByName = new Map();
  const workstreams = tpl.workstreams.map((w) => {
    const id = makeId();
    wsIdByName.set(w.name.toLowerCase(), id);
    return { id, programId, name: w.name, owner: '', deliverables: (w.deliverables || '').split(';').map((s) => s.trim()).filter(Boolean).join('\n') };
  });
  const items = tpl.milestones.map((m) => ({
    id: makeId(),
    programId,
    kind: 'Milestone',
    name: m.name,
    description: '',
    owner: '',
    workstreamId: wsIdByName.get((m.workstream || '').toLowerCase()) || '',
    dueDate: setDates && isISODate(startDate) && m.week ? addDays(startDate, m.week * 7) : '',
    status: 'Not Started',
    priority: 'Medium',
    dependsOn: [],
    blockers: '',
    nextSteps: '',
    completedDate: '',
  }));
  // Chain milestones in order so the dependency view is useful; users can edit.
  for (let i = 1; i < items.length; i++) items[i].dependsOn = [items[i - 1].id];
  const measures = tpl.measures.map((m) => ({
    id: makeId(), programId, name: m.name, unit: m.unit || '', direction: m.direction || 'increase',
    baseline: '', target: '', current: '', owner: '', updatedDate: '', notes: '', history: [],
  }));
  const raid = tpl.raid.map((r) => ({
    id: makeId(), programId, type: r.type, title: r.title,
    description: 'Starter item from template. Confirm, edit, or delete.',
    owner: '', impact: '', likelihood: '', priority: '', dueDate: '', mitigation: '',
    status: 'Open', workstreamId: '', itemId: '',
  }));
  const raci = tpl.raci.map((a) => ({ id: makeId(), programId, activity: a, kind: 'Activity', R: [], A: [], C: [], I: [], notes: '' }));
  return { workstreams, items, measures, raid, raci };
}
