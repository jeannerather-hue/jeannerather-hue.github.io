// Guided TPM Program Lifecycle: phases, playbooks, status rules and draft builders.
// Pure module (no DOM). Everything shown comes from what the user entered:
// - An item is Complete / Blocked / Not applicable ONLY when the user sets it.
// - "Found in app" hints read existing records but never change an item's status.
// - Drafts use "Not entered" for anything missing; nothing is invented.
import * as L from './logic.js?v=1791999075';

const NE = L.NOT_ENTERED;

export const ITEM_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Complete' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'na', label: 'Not applicable' },
];
export const statusLabel = (v) => (ITEM_STATUSES.find((s) => s.value === v) || ITEM_STATUSES[0]).label;

export const GUIDANCE_NOTE = 'Guidance only. These phases and checklists are a generic starting point. Adapt them to your employer’s delivery process, approval gates and terminology.';

// ---------------------------------------------------------------- phases
export const PHASES = [
  { id: 'intake', n: 1, name: 'Intake and problem definition', short: 'Intake',
    purpose: 'Agree what problem the program solves, for whom, and why now, before anyone commits to a solution.',
    draftTitle: 'Intake summary' },
  { id: 'outcomes', n: 2, name: 'Outcomes, scope, and success measures', short: 'Outcomes & scope',
    purpose: 'Turn the problem into measurable outcomes and a clear boundary of what is and is not included.',
    draftTitle: 'Program charter' },
  { id: 'governance', n: 3, name: 'Stakeholders, roles, and governance', short: 'Governance',
    purpose: 'Make sure everyone knows who decides, who does the work, and how and when the program communicates.',
    draftTitle: 'Governance and RACI summary' },
  { id: 'plan', n: 4, name: 'Workstreams, milestones, and dependencies', short: 'Plan',
    purpose: 'Break the work into owned workstreams and dated milestones, and make cross-team dependencies visible.',
    draftTitle: 'Delivery plan' },
  { id: 'readiness', n: 5, name: 'Technical readiness and delivery planning', short: 'Tech readiness',
    purpose: 'Confirm the technical approach, environments, reviews and team setup are ready before build runs at full speed.',
    draftTitle: 'Technical readiness checklist' },
  { id: 'execution', n: 6, name: 'Execution, risks, issues, and decisions', short: 'Execution',
    purpose: 'Run the program week to week: track progress, surface risks early, and get decisions made on time.',
    draftTitle: 'Weekly status report' },
  { id: 'launch', n: 7, name: 'Launch readiness, handoff, and support', short: 'Launch & handoff',
    purpose: 'Decide whether you are ready to go live, and make sure the teams who run it afterwards are ready to own it.',
    draftTitle: 'Launch readiness and handoff checklist' },
  { id: 'closeout', n: 8, name: 'Outcomes review and program closeout', short: 'Closeout',
    purpose: 'Confirm what the program delivered against its measures, hand off what remains, and capture lessons learned.',
    draftTitle: 'Program closeout report' },
];
export const phaseByN = (n) => PHASES.find((p) => p.n === Number(n)) || PHASES[0];

// Item fields: key, label, q (question asked in guided mode), field (program field the
// answer is saved to), type ('date' for date fields), ev (hint read from existing data),
// link (where in the app to enter related data).
const BASE = {
  intake: [
    { key: 'intake-problem', label: 'Problem statement', q: 'In one or two sentences, what problem are we solving, and who has it?' },
    { key: 'intake-why', label: 'Business driver: why now', q: 'Why does this need to happen now? What happens if it does not?' },
    { key: 'intake-requestor', label: 'Requesting team and key users identified', q: 'Which team requested this, and who are the main users or customers?' },
    { key: 'intake-sponsor', label: 'Executive sponsor named', q: 'Who is the executive sponsor?', field: 'sponsor', ev: 'sponsor' },
    { key: 'intake-tpm', label: 'TPM or program lead named', q: 'Who is the TPM or program lead?', field: 'tpm', ev: 'tpm' },
    { key: 'intake-constraints', label: 'Known constraints captured', q: 'What constraints are already known (deadlines, budget, policy, technology)?' },
    { key: 'intake-approval', label: 'Decision to proceed to planning', q: 'Who approved moving into planning, and when? Leave open if not decided yet.' },
  ],
  outcomes: [
    { key: 'out-objective', label: 'Objective agreed', q: 'What will the program deliver? (Objective)', field: 'objective', ev: 'objective' },
    { key: 'out-outcome', label: 'Business outcome agreed', q: 'What measurable business result should this lead to?', field: 'outcome', ev: 'outcome' },
    { key: 'out-measures', label: 'Success measures with baseline and target', q: 'Which 2 to 4 measures will show this worked? Add each under Metrics with a baseline and target.', ev: 'measures', link: 'measures' },
    { key: 'out-inscope', label: 'In scope defined', q: 'What is explicitly in scope?', field: 'inScope', ev: 'inScope' },
    { key: 'out-outscope', label: 'Out of scope defined', q: 'What is explicitly out of scope?', field: 'outOfScope', ev: 'outOfScope' },
    { key: 'out-assumptions', label: 'Key assumptions listed', q: 'What are we assuming is true? One per line.', field: 'assumptions', ev: 'assumptions' },
    { key: 'out-target', label: 'Target date agreed', q: 'What is the agreed target date?', field: 'targetDate', type: 'date', ev: 'dates' },
    { key: 'out-signoff', label: 'Charter reviewed with sponsor', q: 'Has the sponsor reviewed the charter? Note who and when.' },
  ],
  governance: [
    { key: 'gov-stakeholders', label: 'Stakeholder register started', q: 'Who needs to be involved or informed? Add them to the stakeholder register.', ev: 'stakeholders', link: 'stakeholders' },
    { key: 'gov-raci', label: 'RACI for key decisions and deliverables', q: 'For each key decision or deliverable, who is Responsible and who is the one Accountable owner?', ev: 'raci', link: 'raci' },
    { key: 'gov-forums', label: 'Governance forums and cadence set', q: 'Which forums will run the program (for example steering committee, weekly sync), who attends, and how often?' },
    { key: 'gov-rights', label: 'Decision rights agreed', q: 'Who can approve changes to scope, dates and budget?' },
    { key: 'gov-escalation', label: 'Escalation path agreed', q: 'If something is stuck, who does it go to, and in what order?' },
    { key: 'gov-comms', label: 'Status reporting audience and cadence', q: 'Who receives the status report, and how often?' },
  ],
  plan: [
    { key: 'plan-ws', label: 'Workstreams defined', q: 'What are the main workstreams? Add them on the program page.', ev: 'workstreams', link: 'program' },
    { key: 'plan-ws-owners', label: 'Each workstream has an owner', q: 'Who owns each workstream?', ev: 'workstreamOwners', link: 'program' },
    { key: 'plan-milestones', label: 'Key milestones with dates and owners', q: 'What are the key milestones, with a date and an owner for each?', ev: 'milestones', link: 'roadmap' },
    { key: 'plan-deps', label: 'Cross-team dependencies identified', q: 'What does this program need from other teams or systems, and by when? Record them as milestone dependencies or RAID dependencies.', ev: 'dependencies', link: 'raid' },
    { key: 'plan-critical', label: 'Critical path agreed', q: 'Which sequence of milestones sets the end date?' },
    { key: 'plan-baseline', label: 'Plan baselined with sponsor', q: 'Has the sponsor agreed the plan as the baseline? Note who and when.' },
  ],
  readiness: [
    { key: 'tech-approach', label: 'Solution approach or architecture reviewed', q: 'Has the technical approach been reviewed? By whom, and what was the outcome?' },
    { key: 'tech-env', label: 'Environments and access available', q: 'Which environments and access does the team need, and are they ready?' },
    { key: 'tech-reviews', label: 'Security, privacy and compliance reviews planned', q: 'Which reviews are required, and when are they scheduled?' },
    { key: 'tech-method', label: 'Delivery method and team cadence agreed', q: 'How will teams deliver (for example sprints, release trains), and on what cadence?' },
    { key: 'tech-test', label: 'Test strategy agreed', q: 'What levels of testing are needed, and who owns each?' },
    { key: 'tech-capacity', label: 'Team capacity and key people confirmed', q: 'Are the people and capacity needed confirmed? Note any gaps.' },
    { key: 'tech-risks', label: 'Initial risks logged in RAID', q: 'What are the top technical risks? Add them to the RAID log.', ev: 'raid', link: 'raid' },
  ],
  execution: [
    { key: 'exec-status', label: 'Overall status and reason are current', q: 'What is the overall status this week, and why?', ev: 'status', link: 'program' },
    { key: 'exec-report', label: 'Weekly status report sent', q: 'Has this week’s status report been sent?', ev: 'reports', link: 'reports' },
    { key: 'exec-raid', label: 'RAID log reviewed this week', q: 'Have open risks, issues and dependencies been reviewed with their owners?', ev: 'raidOpen', link: 'raid' },
    { key: 'exec-decisions', label: 'Pending decisions have owners and dates', q: 'Does every pending decision have a decision owner and a needed-by date?', ev: 'decisionsPending', link: 'decisions' },
    { key: 'exec-overdue', label: 'Overdue milestones have a recovery plan', q: 'For each overdue milestone, what is the recovery plan?', ev: 'overdue', link: 'roadmap' },
    { key: 'exec-change', label: 'Change control in use', q: 'How are scope, date and budget changes requested and approved?' },
  ],
  launch: [
    { key: 'launch-criteria', label: 'Go/no-go criteria agreed', q: 'What must be true to go live?' },
    { key: 'launch-testing', label: 'Testing complete and signed off', q: 'Which testing is complete, and who signed off?' },
    { key: 'launch-rollback', label: 'Rollback plan ready', q: 'If launch fails, how do you roll back, and who decides?' },
    { key: 'launch-comms', label: 'Launch communications and training ready', q: 'Who needs to be told or trained before launch, and is it done?' },
    { key: 'launch-support', label: 'Support team, runbooks and escalation contacts handed over', q: 'Who supports this after launch? Are runbooks and escalation contacts handed over?' },
    { key: 'launch-hypercare', label: 'Hypercare period and exit criteria set', q: 'How long is hypercare, and what ends it?' },
    { key: 'launch-gonogo', label: 'Go/no-go decision recorded', q: 'Record the go/no-go decision in the decision log, with who decided and when.', link: 'decisions' },
  ],
  closeout: [
    { key: 'close-measures', label: 'Final values recorded for success measures', q: 'What are the final values for each success measure? Update them under Metrics.', ev: 'measuresCurrent', link: 'measures' },
    { key: 'close-review', label: 'Outcomes reviewed with sponsor', q: 'Has the sponsor reviewed results against the target outcomes? Note who and when.' },
    { key: 'close-transfer', label: 'Open items, risks and actions transferred', q: 'Who now owns the remaining open items and risks?', ev: 'openItems', link: 'roadmap' },
    { key: 'close-lessons', label: 'Lessons learned captured', q: 'What worked, what didn’t, and what would you change next time?' },
    { key: 'close-docs', label: 'Documentation archived', q: 'Where are the final documents stored?' },
    { key: 'close-signoff', label: 'Formal closeout approved', q: 'Who approved closing the program, and when?' },
  ],
};

// Playbook extras, added to the base checklist for each phase.
const EXTRAS = {
  'edp-mdm': {
    intake: [
      { key: 'mdm-domains', label: 'Data domains in scope', q: 'Which data domains are in scope (for example customer, product, supplier)?' },
      { key: 'mdm-sources', label: 'Source systems inventoried', q: 'Which source systems hold this data today, and who owns each one?' },
    ],
    governance: [
      { key: 'mdm-owners', label: 'Data owners and stewards named per domain', q: 'Who is the business data owner and the data steward for each domain?' },
      { key: 'mdm-council', label: 'Data governance forum and definition approvals', q: 'Which forum approves data definitions and rule changes, and how often does it meet?' },
    ],
    plan: [
      { key: 'mdm-onboarding', label: 'Source onboarding sequence agreed', q: 'In what order will sources be onboarded, and what does each need from its source team?' },
    ],
    readiness: [
      { key: 'mdm-profiling', label: 'Source data profiled', q: 'Has source data been profiled? What did profiling show about completeness and duplicates?' },
      { key: 'mdm-model', label: 'Target data model and golden record definition approved', q: 'Is the target data model approved? Who approved it?' },
      { key: 'mdm-match', label: 'Match, merge and survivorship rules defined', q: 'How are duplicates matched, and which source wins for each attribute?' },
      { key: 'mdm-dq', label: 'Data quality rules and thresholds defined', q: 'Which data quality rules apply, and what pass rate is acceptable?' },
      { key: 'mdm-test', label: 'Data validation and reconciliation test plan', q: 'How will loaded data be validated and reconciled against sources?' },
    ],
    execution: [
      { key: 'mdm-dq-review', label: 'Data quality results reviewed each cycle', q: 'Who reviews data quality results, and how often?' },
    ],
    launch: [
      { key: 'mdm-uat', label: 'Business data validation (UAT) signed off', q: 'Which business owners validated the data, and did they sign off?' },
      { key: 'mdm-release', label: 'Release readiness: cutover, backfill and consumer notice', q: 'What is the cutover and backfill plan, and have downstream consumers been told?' },
      { key: 'mdm-handoff', label: 'Stewardship operations and support handed to run teams', q: 'Who runs stewardship queues and supports the platform after launch?' },
    ],
    closeout: [
      { key: 'mdm-dq-final', label: 'Final data quality results compared with baseline', q: 'How do final data quality results compare with the baseline?' },
    ],
  },
  software: {
    plan: [
      { key: 'sw-backlog', label: 'Backlog or epics mapped to milestones', q: 'Which epics or backlog items deliver each milestone?' },
    ],
    readiness: [
      { key: 'sw-pipeline', label: 'Build and deployment pipeline ready', q: 'Is the build and deployment pipeline in place for each environment?' },
      { key: 'sw-nfr', label: 'Non-functional requirements agreed', q: 'What performance, availability and security requirements apply?' },
    ],
    launch: [
      { key: 'sw-uat', label: 'User acceptance testing signed off', q: 'Who signed off user acceptance testing?' },
      { key: 'sw-defects', label: 'Open defect threshold for go-live met', q: 'What defect levels are acceptable at go-live, and are you within them?' },
      { key: 'sw-release', label: 'Release plan and deployment window confirmed', q: 'When is the deployment window, and who approves the release?' },
    ],
    closeout: [
      { key: 'sw-adoption', label: 'Adoption measured', q: 'How many intended users are actively using the system?' },
    ],
  },
  cloud: {
    intake: [
      { key: 'cl-inventory', label: 'Workload and application inventory', q: 'Which workloads or applications are in scope, and who owns each?' },
    ],
    plan: [
      { key: 'cl-waves', label: 'Migration waves sequenced', q: 'How are workloads grouped into waves, and in what order?' },
    ],
    readiness: [
      { key: 'cl-landing', label: 'Landing zone and network connectivity ready', q: 'Is the landing zone built and is network connectivity in place?' },
      { key: 'cl-iam', label: 'Security baseline and access model approved', q: 'Who approved the security baseline and access model?' },
      { key: 'cl-cost', label: 'Cost guardrails and tagging standard set', q: 'What budgets, alerts and tagging rules apply?' },
    ],
    launch: [
      { key: 'cl-cutover', label: 'Cutover runbook rehearsed', q: 'Has the cutover been rehearsed? What did the rehearsal show?' },
      { key: 'cl-dr', label: 'Backup and disaster recovery tested', q: 'Have backup restore and failover been tested?' },
      { key: 'cl-ops', label: 'Monitoring, alerting and on-call handed over', q: 'Who is on call after launch, and are alerts routed to them?' },
    ],
    closeout: [
      { key: 'cl-decom', label: 'Legacy decommission plan agreed', q: 'When and how will the old infrastructure be retired?' },
    ],
  },
  aiml: {
    intake: [
      { key: 'ai-usecase', label: 'Use case and human review expectations', q: 'What decision or task will the model support, and where does a person review its output?' },
    ],
    outcomes: [
      { key: 'ai-thresholds', label: 'Model acceptance thresholds agreed', q: 'Which quality metric must the model reach, and what threshold is acceptable?' },
    ],
    governance: [
      { key: 'ai-review', label: 'Responsible AI or model risk review owner named', q: 'Who owns the responsible AI or model risk review?' },
    ],
    readiness: [
      { key: 'ai-data', label: 'Training data sources approved for use', q: 'Which data will be used for training, and who approved its use?' },
      { key: 'ai-eval', label: 'Evaluation dataset and method agreed', q: 'How will the model be evaluated, and on what data?' },
      { key: 'ai-privacy', label: 'Privacy and legal review complete or scheduled', q: 'When is the privacy and legal review, and what is its status?' },
    ],
    execution: [
      { key: 'ai-experiments', label: 'Experiment results logged', q: 'Where are experiment results recorded?' },
    ],
    launch: [
      { key: 'ai-monitoring', label: 'Model monitoring, drift alerts and retraining owner', q: 'Who monitors the model after launch, and what triggers retraining?' },
      { key: 'ai-fallback', label: 'Fallback when the model is unavailable or wrong', q: 'What happens when the model is down or gives a wrong answer?' },
    ],
    closeout: [
      { key: 'ai-perf', label: 'Post-launch model performance compared with threshold', q: 'How does the model perform in production compared with the agreed threshold?' },
    ],
  },
};

const PLAYBOOK_META = [
  { id: 'general', name: 'General technical program', area: 'Any program', description: 'The eight lifecycle phases with a general checklist. Use it when no specific playbook fits.' },
  { id: 'edp-mdm', name: 'EDP / MDM playbook', area: 'Data platforms', description: 'Enterprise data platform and master data management: data sources, ownership, data quality, governance, MDM rules, testing, release readiness and support handoff.' },
  { id: 'software', name: 'General software implementation', area: 'Enterprise technology', description: 'Implementing or upgrading a business application: backlog, pipeline, non-functional requirements, UAT, defects and release.' },
  { id: 'cloud', name: 'Cloud infrastructure program', area: 'Cloud infrastructure', description: 'Landing zone, security baseline, cost guardrails, migration waves, cutover, disaster recovery and operations handover.' },
  { id: 'aiml', name: 'AI/ML delivery program', area: 'AI/ML', description: 'Use case framing, acceptance thresholds, data approval, evaluation, responsible AI review, monitoring and fallback.' },
];

function resolveBuiltIn(meta) {
  const phases = {};
  PHASES.forEach((ph) => {
    phases[ph.id] = [...BASE[ph.id], ...((EXTRAS[meta.id] || {})[ph.id] || [])].map((it) => ({ ...it, playbook: !!((EXTRAS[meta.id] || {})[ph.id] || []).includes(it) }));
  });
  return { ...meta, builtIn: true, guidance: true, phases };
}
export const BUILTIN_PLAYBOOKS = PLAYBOOK_META.map(resolveBuiltIn);

export function allPlaybooks(state) {
  return [...BUILTIN_PLAYBOOKS, ...((state && state.customPlaybooks) || [])];
}
export function getPlaybook(state, id) {
  return allPlaybooks(state).find((p) => p.id === id) || BUILTIN_PLAYBOOKS[0];
}

// ---------------------------------------------------------------- customizing playbooks as text
// One line per item: "Phase number | Item label | Question (optional)".
export function playbookToText(pb) {
  return PHASES.map((ph) => pb.phases[ph.id].map((it) => `${ph.n} | ${it.label} | ${it.q || ''}`.replace(/ \| $/, '')).join('\n')).join('\n');
}
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';

export function parsePlaybookText(text, source) {
  const phases = {};
  PHASES.forEach((ph) => { phases[ph.id] = []; });
  const errors = [];
  const byLabel = new Map();
  if (source) PHASES.forEach((ph) => source.phases[ph.id].forEach((it) => byLabel.set(`${ph.id}|${it.label.toLowerCase()}`, it)));
  const used = new Set();
  String(text || '').split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split('|').map((x) => x.trim());
    const ph = PHASES.find((p) => String(p.n) === parts[0]);
    if (!ph || !parts[1]) { errors.push(`Line ${i + 1}: start with a phase number 1–8, then | and the item label.`); return; }
    const label = parts[1];
    const q = parts.slice(2).join(' | ');
    const prev = byLabel.get(`${ph.id}|${label.toLowerCase()}`);
    let key = prev ? prev.key : `c-${ph.id}-${slug(label)}`;
    while (used.has(key)) key += '-2';
    used.add(key);
    phases[ph.id].push(prev ? { ...prev, q: q || prev.q } : { key, label, q: q || `What is the status of: ${label}?`, custom: true });
  });
  return { phases, errors };
}

// ---------------------------------------------------------------- lifecycle state
export function newLifecycle(programId, playbookId) {
  return { id: `lc-${programId}`, programId, playbookId, currentPhase: 1, items: {}, extra: {}, drafts: {} };
}
export const lifecycleFor = (state, programId) => (state.lifecycles || []).find((l) => l.programId === programId) || null;

/** Checklist for one phase: playbook items plus items the user added to this program. */
export function phaseItems(state, lc, phaseId) {
  const pb = getPlaybook(state, lc.playbookId);
  return [...(pb.phases[phaseId] || []), ...(((lc.extra || {})[phaseId]) || [])];
}
export const itemState = (lc, key) => ({ status: 'open', notes: '', owner: '', dueDate: '', blockedReason: '', ...((lc.items || {})[key] || {}) });

export function phaseSummary(state, lc, phaseId) {
  const items = phaseItems(state, lc, phaseId);
  const out = { total: 0, done: 0, blocked: 0, missing: 0, na: 0 };
  items.forEach((it) => {
    const s = itemState(lc, it.key).status;
    if (s === 'na') { out.na += 1; return; }
    out.total += 1;
    if (s === 'done') out.done += 1;
    else if (s === 'blocked') out.blocked += 1;
    else out.missing += 1;
  });
  return out;
}
export function lifecycleSummary(state, lc) {
  const t = { total: 0, done: 0, blocked: 0, missing: 0, na: 0 };
  PHASES.forEach((ph) => { const s = phaseSummary(state, lc, ph.id); Object.keys(t).forEach((k) => { t[k] += s[k]; }); });
  return t;
}

/** Answer already entered for an item: the mapped program field, else the user's notes. */
export function itemAnswer(program, lc, it) {
  if (it.field) return program?.[it.field] || '';
  return itemState(lc, it.key).notes || '';
}

/**
 * Next suggested action for a phase. Blocked items come first, then the first open item.
 * Owner and due date are only what the user entered on that item.
 */
export function nextAction(state, lc, phaseId) {
  const items = phaseItems(state, lc, phaseId);
  const blocked = items.find((it) => itemState(lc, it.key).status === 'blocked');
  const pick = blocked || items.find((it) => itemState(lc, it.key).status === 'open');
  if (!pick) {
    const ph = PHASES.find((p) => p.id === phaseId);
    const nxt = PHASES.find((p) => p.n === ph.n + 1);
    return { done: true, text: nxt ? `All items in this phase are marked complete or not applicable. Move to phase ${nxt.n}, ${nxt.name}, when you are ready.` : 'All closeout items are marked complete or not applicable.' };
  }
  const st = itemState(lc, pick.key);
  return {
    done: false,
    key: pick.key,
    blocked: !!blocked,
    text: blocked ? `Unblock: ${pick.label}${st.blockedReason ? `. Blocker: ${st.blockedReason}` : ''}` : `${pick.label}: ${pick.q}`,
    owner: st.owner || '',
    dueDate: st.dueDate || '',
  };
}

/** Next guided question: first open item not skipped this session. */
export function nextQuestion(state, lc, phaseId, skipped = new Set()) {
  return phaseItems(state, lc, phaseId).find((it) => itemState(lc, it.key).status === 'open' && !skipped.has(it.key)) || null;
}

// ---------------------------------------------------------------- "found in app" hints (informational only)
export function evidence(state, program, ev, today = L.todayISO(), upcomingDays = 14) {
  if (!ev || !program) return null;
  const pid = program.id;
  const mine = (r) => r.programId === pid;
  const field = (f, label) => (L.isBlank(program[f]) ? { found: false, text: `No ${label} entered on the program yet.` } : { found: true, text: `${label[0].toUpperCase()}${label.slice(1)} on the program: ${String(program[f]).slice(0, 90)}${String(program[f]).length > 90 ? '…' : ''}` });
  switch (ev) {
    case 'sponsor': return field('sponsor', 'sponsor');
    case 'tpm': return field('tpm', 'TPM');
    case 'objective': return field('objective', 'objective');
    case 'outcome': return field('outcome', 'business outcome');
    case 'inScope': return field('inScope', 'in-scope list');
    case 'outOfScope': return field('outOfScope', 'out-of-scope list');
    case 'assumptions': return field('assumptions', 'assumptions');
    case 'dates': return (L.isISODate(program.targetDate)
      ? { found: true, text: `Target date on the program: ${program.targetDate}${L.isISODate(program.startDate) ? ` (start ${program.startDate})` : ''}.` }
      : { found: false, text: 'No target date entered on the program yet.' });
    case 'measures': {
      const m = state.measures.filter(mine);
      const full = m.filter((x) => !L.isBlank(x.baseline) && !L.isBlank(x.target));
      return { found: m.length > 0, text: m.length ? `${m.length} success measure(s); ${full.length} with both baseline and target.` : 'No success measures entered yet.' };
    }
    case 'measuresCurrent': {
      const m = state.measures.filter(mine);
      const cur = m.filter((x) => !L.isBlank(x.current));
      return { found: m.length > 0, text: m.length ? `${cur.length} of ${m.length} success measure(s) have a current value.` : 'No success measures entered yet.' };
    }
    case 'stakeholders': {
      const n = state.stakeholders.filter((s) => s.programId === pid).length;
      return { found: n > 0, text: n ? `${n} stakeholder(s) in the register for this program.` : 'No stakeholders entered for this program yet.' };
    }
    case 'raci': {
      const r = state.raci.filter(mine);
      const gaps = r.filter((x) => L.raciFlags(x).noA).length;
      return { found: r.length > 0, text: r.length ? `${r.length} RACI row(s); ${gaps} without an Accountable owner.` : 'No RACI rows entered yet.' };
    }
    case 'workstreams': {
      const n = state.workstreams.filter(mine).length;
      return { found: n > 0, text: n ? `${n} workstream(s) entered.` : 'No workstreams entered yet.' };
    }
    case 'workstreamOwners': {
      const w = state.workstreams.filter(mine);
      const no = w.filter((x) => L.isBlank(x.owner)).length;
      return { found: w.length > 0, text: w.length ? `${w.length - no} of ${w.length} workstream(s) have an owner.` : 'No workstreams entered yet.' };
    }
    case 'milestones': {
      const m = state.items.filter((i) => mine(i) && i.kind === 'Milestone');
      const noDate = m.filter((i) => !L.isISODate(i.dueDate)).length;
      const noOwner = m.filter((i) => L.isBlank(i.owner)).length;
      return { found: m.length > 0, text: m.length ? `${m.length} milestone(s); ${noDate} without a due date, ${noOwner} without an owner.` : 'No milestones entered yet.' };
    }
    case 'dependencies': {
      const d = state.items.filter((i) => mine(i) && (i.dependsOn || []).length).length;
      const r = state.raid.filter((x) => mine(x) && x.type === 'Dependency').length;
      return { found: d + r > 0, text: `${d} milestone/action link(s) and ${r} RAID dependency record(s) entered.` };
    }
    case 'raid': {
      const n = state.raid.filter(mine).length;
      return { found: n > 0, text: n ? `${n} RAID record(s) entered.` : 'No RAID records entered yet.' };
    }
    case 'raidOpen': {
      const open = state.raid.filter((x) => mine(x) && L.isOpenRaid(x));
      const high = open.filter(L.isHighRaid).length;
      return { found: open.length > 0, text: `${open.length} open RAID record(s), ${high} high priority.` };
    }
    case 'status': return (L.HEALTH.includes(program.status)
      ? { found: true, text: `Program status: ${program.status}. ${program.statusReason || 'No reason entered.'}` }
      : { found: false, text: 'Overall status not set on the program.' });
    case 'reports': {
      const r = L.sortRecords(state.reports.filter(mine), (x) => x.weekEnding, 'desc');
      return { found: r.length > 0, text: r.length ? `${r.length} saved report(s); latest for week ending ${r[0].weekEnding}.` : 'No saved status reports yet.' };
    }
    case 'decisionsPending': {
      const p = state.decisions.filter((d) => mine(d) && d.status === 'Pending');
      const noOwner = p.filter((d) => L.isBlank(d.owner)).length;
      const noDate = p.filter((d) => !L.isISODate(d.neededBy)).length;
      return { found: p.length > 0, text: `${p.length} pending decision(s); ${noOwner} without an owner, ${noDate} without a needed-by date.` };
    }
    case 'overdue': {
      const n = state.items.filter((i) => mine(i) && i.kind === 'Milestone' && L.itemFlag(i, today, upcomingDays) === 'overdue').length;
      return { found: true, text: `${n} overdue milestone(s).` };
    }
    case 'openItems': {
      const i = state.items.filter((x) => mine(x) && L.isOpenItem(x)).length;
      const r = state.raid.filter((x) => mine(x) && L.isOpenRaid(x)).length;
      return { found: true, text: `${i} open milestone(s)/action(s) and ${r} open RAID record(s).` };
    }
    default: return null;
  }
}

// ---------------------------------------------------------------- drafts (Markdown, editable)
const or = (v) => (L.isBlank(v) ? NE : String(v).trim());
const line = (label, v) => `**${label}:** ${or(v)}`;

function checklistAnswers(state, program, lc, phaseId, { checkbox = false } = {}) {
  const items = phaseItems(state, lc, phaseId);
  if (!items.length) return [NE];
  return items.map((it) => {
    const s = itemState(lc, it.key);
    const ans = itemAnswer(program, lc, it);
    if (checkbox) {
      const mark = s.status === 'done' ? '[x]' : '[ ]';
      const tail = s.status === 'blocked' ? ` (Blocked${s.blockedReason ? `: ${s.blockedReason}` : ''})` : s.status === 'na' ? ' (Not applicable)' : s.status === 'open' ? ' (Open)' : '';
      const who = [s.owner && `Owner: ${s.owner}`, s.dueDate && `Due: ${s.dueDate}`].filter(Boolean).join('; ');
      return `- ${mark} ${it.label}${tail}${who ? `. ${who}` : ''}${ans ? `\n  - ${ans.replace(/\n/g, '\n  - ')}` : ''}`;
    }
    const status = s.status === 'blocked' ? `Blocked${s.blockedReason ? `: ${s.blockedReason}` : ''}` : statusLabel(s.status);
    return `### ${it.label}\n${or(ans)}\n_Status: ${status}${s.owner ? ` · Owner: ${s.owner}` : ''}${s.dueDate ? ` · Due: ${s.dueDate}` : ''}_`;
  });
}

function measuresTable(state, pid) {
  const m = state.measures.filter((x) => x.programId === pid);
  if (!m.length) return NE;
  const u = (x, v) => (L.isBlank(v) ? NE : `${v}${x.unit ? ` ${x.unit}` : ''}`);
  return ['| Measure | Baseline | Target | Current | Owner | Updated |', '|---|---|---|---|---|---|',
    ...m.map((x) => `| ${x.name} | ${u(x, x.baseline)} | ${u(x, x.target)} | ${u(x, x.current)} | ${or(x.owner)} | ${or(x.updatedDate)} |`)].join('\n');
}

const footer = '_Draft built from information entered in TPM Delivery Hub. Edit before sharing. Phases and checklists are guidance; adapt them to your organization’s process._';

export function buildPhaseDraft(state, programId, phaseN, opts = {}) {
  const today = opts.today || L.todayISO();
  const upcomingDays = opts.upcomingDays ?? 14;
  const program = state.programs.find((p) => p.id === programId);
  const lc = lifecycleFor(state, programId) || newLifecycle(programId, 'general');
  const ph = phaseByN(phaseN);
  const pb = getPlaybook(state, lc.playbookId);
  const head = [`# ${ph.draftTitle}: ${or(program?.name)}`, '', `${line('Phase', `${ph.n}. ${ph.name}`)}  `, `${line('Playbook', pb.name)}  `, `${line('Prepared by', program?.tpm)}  `, `${line('Date', today)}`, ''];
  const out = [...head];
  const pid = programId;
  const ws = (id) => state.workstreams.find((w) => w.id === id)?.name;

  if (ph.id === 'outcomes') {
    out.push('## Program summary', line('Objective', program?.objective), '', line('Business outcome', program?.outcome), '',
      line('Executive sponsor', program?.sponsor), '', line('TPM', program?.tpm), '', line('Start date', program?.startDate), '', line('Target date', program?.targetDate), '',
      '## Problem and context', ...checklistAnswers(state, program, lc, 'intake'), '',
      '## Scope', line('In scope', program?.inScope), '', line('Out of scope', program?.outOfScope), '', line('Key assumptions', program?.assumptions), '',
      '## Success measures', measuresTable(state, pid), '');
  }
  if (ph.id === 'governance') {
    const sh = state.stakeholders.filter((s) => s.programId === pid);
    out.push('## Stakeholders', sh.length ? ['| Name | Role | Team | Cadence |', '|---|---|---|---|', ...sh.map((s) => `| ${s.name} | ${or(s.role)} | ${or(s.team)} | ${or(s.cadence)} |`)].join('\n') : NE, '');
    const r = state.raci.filter((x) => x.programId === pid);
    const j = (a) => ((a || []).length ? a.join(', ') : NE);
    out.push('## RACI', r.length ? ['| Activity / deliverable | R | A | C | I |', '|---|---|---|---|---|', ...r.map((x) => `| ${x.activity}${L.raciFlags(x).noA ? ' (no Accountable owner)' : ''} | ${j(x.R)} | ${j(x.A)} | ${j(x.C)} | ${j(x.I)} |`)].join('\n') : NE, '');
  }
  if (ph.id === 'plan') {
    const w = state.workstreams.filter((x) => x.programId === pid);
    out.push('## Workstreams', w.length ? w.map((x) => `- ${x.name}. Owner: ${or(x.owner)}`).join('\n') : NE, '');
    const m = L.sortRecords(state.items.filter((i) => i.programId === pid && i.kind === 'Milestone'), (i) => i.dueDate);
    out.push('## Milestones', m.length ? ['| Milestone | Workstream | Owner | Due | Status |', '|---|---|---|---|---|', ...m.map((i) => `| ${i.name} | ${or(ws(i.workstreamId))} | ${or(i.owner)} | ${or(i.dueDate)} | ${i.status} |`)].join('\n') : NE, '');
    const byId = new Map(state.items.map((i) => [i.id, i]));
    const deps = state.items.filter((i) => i.programId === pid && (i.dependsOn || []).length);
    const raidDeps = state.raid.filter((r) => r.programId === pid && r.type === 'Dependency');
    out.push('## Dependencies', [...deps.map((i) => `- ${i.name} depends on ${(i.dependsOn || []).map((d) => byId.get(d)?.name).filter(Boolean).join(', ')}`),
      ...raidDeps.map((r) => `- ${r.title}. Owner: ${or(r.owner)}. Status: ${r.status}`)].join('\n') || NE, '');
  }
  if (ph.id === 'execution') {
    const rep = L.buildReportDraft(state, pid, { today, upcomingDays });
    out.push(L.reportToMarkdown(rep, program?.name).replace(/^# .*\n\n/, ''), '');
  }
  if (ph.id === 'closeout') {
    out.push('## Success measures: baseline, target and final', measuresTable(state, pid), '');
    const d = state.decisions.filter((x) => x.programId === pid && x.status === 'Decided');
    out.push('## Key decisions made', d.length ? d.map((x) => `- ${x.decidedDate || 'Date not entered'}: ${x.title}. Decision: ${or(x.finalDecision)}`).join('\n') : NE, '');
    const openI = state.items.filter((i) => i.programId === pid && L.isOpenItem(i));
    const openR = state.raid.filter((r) => r.programId === pid && L.isOpenRaid(r));
    out.push('## Remaining open items', [...openI.map((i) => `- ${i.kind}: ${i.name}. Owner: ${or(i.owner)}`), ...openR.map((r) => `- ${r.type}: ${r.title}. Owner: ${or(r.owner)}`)].join('\n') || 'None recorded as open.', '');
  }

  const checkbox = ph.id === 'readiness' || ph.id === 'launch';
  if (ph.id === 'execution') out.push('## Execution checklist');
  else if (checkbox) out.push('## Checklist');
  else if (ph.id === 'outcomes') out.push('## Outcomes and scope checklist');
  else out.push('## Checklist answers');
  out.push(...checklistAnswers(state, program, lc, ph.id, { checkbox: checkbox || ph.id === 'execution' }), '', footer);
  return out.join('\n');
}
