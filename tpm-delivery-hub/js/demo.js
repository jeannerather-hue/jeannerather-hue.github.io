// FICTIONAL demo data. All people, teams, and programs are invented for
// exploring the app. Every record carries isDemo: true so it can be removed.
// Dates are relative to "today" so overdue and upcoming flags show up.
import { addDays, todayISO } from './logic.js';

export function buildDemoData(today = todayISO()) {
  const d = (n) => addDays(today, n);
  const ts = (n) => `${d(n)}T15:00:00.000Z`;
  const base = (id, extra, created = -20) => ({ id, isDemo: true, createdAt: ts(created), updatedAt: ts(-1), ...extra });

  const programs = [
    base('demo-p1', {
      name: 'DEMO – Customer Data Hub',
      objective: 'Create one trusted customer record shared by sales, service, and billing teams at the fictional company Example Co.',
      outcome: 'Fewer duplicate customer records and faster onboarding of new data consumers.',
      sponsor: 'Jordan Ellis (fictional)', tpm: 'Alex Rivera (fictional)',
      startDate: d(-70), targetDate: d(110),
      status: 'At Risk',
      statusReason: 'Pipeline build for one priority source is behind plan; recovery plan under review with the integration lead.',
      assumptions: 'Business data owners stay available two hours per week.\nCurrent source systems remain in place for the program duration.',
      inScope: 'Customer domain only; three priority source systems; stewardship workflow.',
      outOfScope: 'Product and supplier domains; replacement of source systems.',
    }, -70),
    base('demo-p2', {
      name: 'DEMO – Cloud Landing Zone Migration',
      objective: 'Move internal reporting workloads at Example Co. (fictional) to a governed cloud landing zone.',
      outcome: 'Lower run cost and faster recovery for reporting services.',
      sponsor: 'Morgan Blake (fictional)', tpm: 'Alex Rivera (fictional)',
      startDate: d(-45), targetDate: d(150),
      status: 'On Track', statusReason: 'Landing zone approved; pilot migration on schedule.',
      assumptions: 'Network team capacity confirmed for the pilot window.',
      inScope: 'Reporting workloads (wave 1 and 2).', outOfScope: 'Customer-facing applications.',
    }, -45),
    base('demo-p3', {
      name: 'DEMO – Support Ticket Triage Model',
      objective: 'Pilot a model that suggests a category for incoming support tickets at Example Co. (fictional).',
      outcome: 'Less manual triage effort for the support team.',
      sponsor: 'Casey Nguyen (fictional)', tpm: 'Taylor Kim (fictional)',
      startDate: d(-60), targetDate: d(60),
      status: 'Off Track', statusReason: 'Pilot launch blocked until the privacy review is scheduled; no confirmed date yet.',
      assumptions: 'Historical tickets can be used for training once approved.',
      inScope: 'Category suggestion for email tickets.', outOfScope: 'Automatic routing without human review.',
    }, -60),
  ];

  const pj = (id, programId, name, extra) => base(id, {
    programId, name, description: '', owner: '', workstreamId: '', startDate: '', endDate: '',
    status: '', statusReason: '', deliverables: '', ...extra,
  });
  const projects = [
    pj('demo-pr1', 'demo-p1', 'Customer data model & stewardship', {
      description: 'Agree the target customer data model and who owns each data element.', owner: 'Riley Park (fictional)', workstreamId: 'demo-w1',
      startDate: d(-70), endDate: d(15), status: 'On Track', statusReason: 'Model approved and stewardship agreed; quality rules in progress.',
      deliverables: 'Target data model\nStewardship model\nData quality rules',
    }),
    pj('demo-pr2', 'demo-p1', 'Priority source integration', {
      description: 'Build ingestion pipelines for the three priority customer sources.', owner: 'Sam Carter (fictional)', workstreamId: 'demo-w2',
      startDate: d(-40), endDate: d(30), status: 'At Risk', statusReason: 'Source B test extract is late; revised date awaiting sponsor decision.',
      deliverables: 'Pipelines for sources A, B and C\nMatch/merge rules',
    }),
    pj('demo-pr3', 'demo-p2', 'Pilot workload migration', {
      description: 'Move one low-risk reporting workload to prove the landing zone and cutover process.', owner: 'Robin Silva (fictional)', workstreamId: 'demo-w5',
      startDate: d(-20), endDate: d(10), status: 'On Track', statusReason: 'Dry-run cutover scheduled.',
    }),
    pj('demo-pr4', 'demo-p3', 'Limited-user pilot', {
      description: 'Run category suggestions with a small group of support agents.', owner: 'Quinn Harper (fictional)', workstreamId: 'demo-w6',
      startDate: d(-30), endDate: d(25), status: 'Off Track', statusReason: 'Cannot start until the privacy review is complete.',
    }),
  ];

  const workstreams = [
    base('demo-w1', { programId: 'demo-p1', name: 'Data model & governance', owner: 'Riley Park (fictional)', deliverables: 'Target data model\nStewardship model' }),
    base('demo-w2', { programId: 'demo-p1', name: 'Integration & pipelines', owner: 'Sam Carter (fictional)', deliverables: 'Pipelines for three priority sources\nMatch/merge rules' }),
    base('demo-w3', { programId: 'demo-p1', name: 'Adoption & change', owner: 'Jamie Patel (fictional)', deliverables: 'Consumer onboarding guide' }),
    base('demo-w4', { programId: 'demo-p2', name: 'Landing zone & networking', owner: 'Drew Okafor (fictional)', deliverables: 'Landing zone\nConnectivity' }),
    base('demo-w5', { programId: 'demo-p2', name: 'Migration waves', owner: 'Robin Silva (fictional)', deliverables: 'Wave plan\nCutover runbooks' }),
    base('demo-w6', { programId: 'demo-p3', name: 'Model development', owner: 'Quinn Harper (fictional)', deliverables: 'Baseline model\nEvaluation report' }),
    base('demo-w7', { programId: 'demo-p3', name: 'Responsible AI & privacy', owner: 'Taylor Kim (fictional)', deliverables: 'Privacy review\nResponsible AI checklist' }),
  ];

  const it = (id, programId, kind, name, ws, due, status, priority, extra = {}) => base(id, {
    programId, kind, name, workstreamId: ws, dueDate: d(due), status, priority,
    description: '', owner: '', dependsOn: [], blockers: '', nextSteps: '', completedDate: '', ...extra,
  });
  const items = [
    it('demo-i1', 'demo-p1', 'Milestone', 'Target data model approved', 'demo-w1', -20, 'Done', 'High', { owner: 'Riley Park (fictional)', completedDate: d(-21) }),
    it('demo-i2', 'demo-p1', 'Milestone', 'Stewardship model agreed', 'demo-w1', -3, 'Done', 'Medium', { owner: 'Riley Park (fictional)', completedDate: d(-2), dependsOn: ['demo-i1'] }),
    it('demo-i3', 'demo-p1', 'Milestone', 'Priority source pipelines built', 'demo-w2', -4, 'In Progress', 'High', {
      owner: 'Sam Carter (fictional)', dependsOn: ['demo-i1'],
      description: 'Ingestion pipelines for the three priority customer sources.',
      blockers: 'Test extract for source B not yet delivered.',
      nextSteps: 'Integration lead to confirm revised date at Thursday sync.',
    }),
    it('demo-i4', 'demo-p1', 'Action', 'Confirm revised pipeline date with source B owner', 'demo-w2', 2, 'Not Started', 'High', { owner: 'Alex Rivera (fictional)' }),
    it('demo-i5', 'demo-p1', 'Milestone', 'Data quality rules live', 'demo-w1', 9, 'Not Started', 'Medium', { owner: 'Riley Park (fictional)', dependsOn: ['demo-i3'] }),
    it('demo-i6', 'demo-p1', 'Milestone', 'First consumer onboarded', 'demo-w3', 40, 'Not Started', 'Medium', { owner: 'Jamie Patel (fictional)', dependsOn: ['demo-i5'] }),
    it('demo-i7', 'demo-p2', 'Milestone', 'Landing zone design approved', 'demo-w4', -15, 'Done', 'High', { owner: 'Drew Okafor (fictional)', completedDate: d(-16) }),
    it('demo-i8', 'demo-p2', 'Milestone', 'Pilot workload migrated', 'demo-w5', 6, 'In Progress', 'High', { owner: 'Robin Silva (fictional)', dependsOn: ['demo-i7'], nextSteps: 'Dry-run cutover scheduled.' }),
    it('demo-i9', 'demo-p2', 'Action', 'Publish cutover runbook for pilot', 'demo-w5', 3, 'In Progress', 'Medium', { owner: 'Robin Silva (fictional)' }),
    it('demo-i10', 'demo-p2', 'Milestone', 'Wave 1 migration complete', 'demo-w5', 60, 'Not Started', 'Medium', { owner: 'Robin Silva (fictional)', dependsOn: ['demo-i8'] }),
    it('demo-i11', 'demo-p3', 'Milestone', 'Baseline model evaluated', 'demo-w6', -10, 'Done', 'High', { owner: 'Quinn Harper (fictional)', completedDate: d(-9) }),
    it('demo-i12', 'demo-p3', 'Milestone', 'Privacy review complete', 'demo-w7', -1, 'Blocked', 'High', {
      owner: 'Taylor Kim (fictional)', blockers: 'Review board has no open slot before month end.',
      nextSteps: 'Sponsor asked to request an expedited slot.',
    }),
    it('demo-i13', 'demo-p3', 'Milestone', 'Pilot deployed to limited users', 'demo-w6', 12, 'Not Started', 'High', { owner: 'Quinn Harper (fictional)', dependsOn: ['demo-i12'] }),
  ];

  const ITEM_PROJECT = {"demo-i1": "demo-pr1", "demo-i2": "demo-pr1", "demo-i5": "demo-pr1", "demo-i3": "demo-pr2", "demo-i4": "demo-pr2", "demo-i8": "demo-pr3", "demo-i9": "demo-pr3", "demo-i12": "demo-pr4", "demo-i13": "demo-pr4"};
  items.forEach((i) => { i.projectId = ITEM_PROJECT[i.id] || ''; });

  const rd = (id, programId, type, title, extra, created = -20) => base(id, {
    programId, type, title, description: '', owner: '', impact: '', likelihood: '', priority: '',
    dueDate: '', mitigation: '', status: 'Open', workstreamId: '', itemId: '', ...extra,
  }, created);
  const raid = [
    rd('demo-r1', 'demo-p1', 'Risk', 'Source B test extract late, delaying pipeline build', {
      owner: 'Sam Carter (fictional)', impact: 'High', likelihood: 'High', priority: 'High', dueDate: d(5),
      mitigation: 'Use sample extract to build mappings in parallel; escalate at steering meeting.', workstreamId: 'demo-w2', itemId: 'demo-i3',
    }),
    rd('demo-r2', 'demo-p1', 'Issue', 'Duplicate matching rules disputed by two business teams', {
      owner: 'Riley Park (fictional)', impact: 'Medium', priority: 'Medium', dueDate: d(-2), status: 'In Progress',
      mitigation: 'Facilitated rules workshop booked.', workstreamId: 'demo-w1',
    }),
    rd('demo-r3', 'demo-p1', 'Assumption', 'Business data owners stay available two hours per week', {
      owner: 'Jordan Ellis (fictional)', impact: 'Medium', likelihood: 'Low', priority: 'Low', status: 'Monitoring', mitigation: 'Check at monthly steering.',
    }),
    rd('demo-r4', 'demo-p2', 'Dependency', 'Network team provisions connectivity before pilot cutover', {
      owner: 'Drew Okafor (fictional)', impact: 'High', likelihood: 'Medium', priority: 'Medium', dueDate: d(4),
      mitigation: 'Ticket raised with network team; confirm at weekly sync.', itemId: 'demo-i8',
    }),
    rd('demo-r5', 'demo-p3', 'Issue', 'Privacy review not scheduled', {
      owner: 'Taylor Kim (fictional)', impact: 'High', priority: 'High', dueDate: d(3),
      mitigation: 'Sponsor to request expedited slot.', workstreamId: 'demo-w7', itemId: 'demo-i12',
    }, -3),
    rd('demo-r6', 'demo-p3', 'Risk', 'Training data does not represent recent ticket categories', {
      owner: 'Quinn Harper (fictional)', impact: 'Medium', likelihood: 'Medium', priority: 'Medium',
      mitigation: 'Add last 90 days of tickets to evaluation set.', workstreamId: 'demo-w6', status: 'Closed',
    }),
  ];

  const RAID_PROJECT = { 'demo-r1': 'demo-pr2', 'demo-r2': 'demo-pr1', 'demo-r4': 'demo-pr3', 'demo-r5': 'demo-pr4' };
  raid.forEach((r) => { r.projectId = RAID_PROJECT[r.id] || ''; });

  const dc = (id, programId, extra) => base(id, {
    programId, title: '', dateRaised: '', neededBy: '', owner: '', options: '', status: 'Pending',
    finalDecision: '', decidedDate: '', rationale: '', impact: '', followUp: '', ...extra,
  });
  const decisions = [
    dc('demo-d1', 'demo-p1', {
      title: 'Approve revised date for priority source pipelines', dateRaised: d(-4), neededBy: d(3), owner: 'Jordan Ellis (fictional)',
      options: 'A) Move milestone by two weeks\nB) Descope source B from first release',
      impact: 'Either option moves the first consumer onboarding date.', followUp: 'TPM to update roadmap once decided.',
    }),
    dc('demo-d2', 'demo-p1', {
      title: 'Choose survivorship rule for customer address', dateRaised: d(-25), owner: 'Riley Park (fictional)',
      options: 'A) Most recent update wins\nB) Billing system always wins', status: 'Decided',
      finalDecision: 'Billing system wins for address; most recent wins for contact details.', decidedDate: d(-18),
      rationale: 'Billing addresses are verified at invoicing.', impact: 'Match rules updated.', followUp: 'Document in data dictionary.',
    }),
    dc('demo-d3', 'demo-p3', {
      title: 'Request expedited privacy review slot', dateRaised: d(-2), neededBy: d(2), owner: 'Casey Nguyen (fictional)',
      options: 'A) Request expedited slot\nB) Wait for next scheduled board',
      impact: 'Waiting moves pilot by about four weeks.',
    }),
  ];

  const DEC_PROJECT = { 'demo-d1': 'demo-pr2', 'demo-d2': 'demo-pr1', 'demo-d3': 'demo-pr4' };
  decisions.forEach((x) => { x.projectId = DEC_PROJECT[x.id] || ''; });

  const sh = (id, programId, name, role, team, responsibilities, cadence, notes = '') =>
    base(id, { programId, name, role, team, responsibilities, cadence, notes });
  const stakeholders = [
    sh('demo-s1', 'demo-p1', 'Jordan Ellis (fictional)', 'Executive sponsor', 'Customer Operations', 'Owns business outcome; approves scope and date changes.', 'Bi-weekly', 'Prefers a one-page summary.'),
    sh('demo-s2', 'demo-p1', 'Riley Park (fictional)', 'Data governance lead', 'Data Office', 'Data model, stewardship, quality rules.', 'Weekly'),
    sh('demo-s3', 'demo-p1', 'Sam Carter (fictional)', 'Integration lead', 'Platform Engineering', 'Pipelines and match/merge rules.', 'Weekly'),
    sh('demo-s4', 'demo-p1', 'Billing team (fictional)', 'Data consumer', 'Finance Systems', 'Validates customer records used in invoicing.', 'Monthly'),
    sh('demo-s5', 'demo-p2', 'Morgan Blake (fictional)', 'Executive sponsor', 'Infrastructure', 'Approves wave plan and budget.', 'Monthly'),
    sh('demo-s6', 'demo-p2', 'Drew Okafor (fictional)', 'Cloud architect', 'Infrastructure', 'Landing zone and networking.', 'Weekly'),
    sh('demo-s7', 'demo-p3', 'Casey Nguyen (fictional)', 'Executive sponsor', 'Customer Support', 'Owns pilot outcome and launch decision.', 'Bi-weekly'),
    sh('demo-s8', 'demo-p3', 'Quinn Harper (fictional)', 'ML engineering lead', 'Applied ML', 'Model build and evaluation.', 'Weekly'),
  ];

  const rc = (id, programId, activity, kind, R, A, C, I) => base(id, { programId, activity, kind, R, A, C, I, notes: '' });
  const raci = [
    rc('demo-c1', 'demo-p1', 'Approve target data model', 'Deliverable', ['Riley Park (fictional)'], ['Jordan Ellis (fictional)'], ['Sam Carter (fictional)'], ['Billing team (fictional)']),
    rc('demo-c2', 'demo-p1', 'Define data quality rules', 'Activity', ['Riley Park (fictional)', 'Sam Carter (fictional)'], ['Riley Park (fictional)'], ['Billing team (fictional)'], ['Jordan Ellis (fictional)']),
    rc('demo-c3', 'demo-p1', 'Approve first consumer go-live', 'Activity', ['Alex Rivera (fictional)'], [], ['Riley Park (fictional)'], ['Billing team (fictional)']),
    rc('demo-c4', 'demo-p2', 'Cutover go/no-go', 'Activity', ['Robin Silva (fictional)'], ['Morgan Blake (fictional)'], ['Drew Okafor (fictional)'], ['Service desk team (fictional)']),
    rc('demo-c5', 'demo-p3', 'Model release go/no-go', 'Activity', ['Quinn Harper (fictional)'], ['Casey Nguyen (fictional)'], ['Privacy team (fictional)'], ['Support agents (fictional)']),
  ];

  const ms = (id, programId, name, unit, direction, baseline, target, current, owner, upd, history) =>
    base(id, { programId, name, unit, direction, baseline, target, current, owner, updatedDate: d(upd), notes: 'Fictional demo values.', history });
  const measures = [
    ms('demo-m1', 'demo-p1', 'Duplicate customer record rate', '%', 'decrease', '18', '5', '15', 'Riley Park (fictional)', -2,
      [{ date: d(-30), value: '18' }, { date: d(-9), value: '16' }, { date: d(-2), value: '15' }]),
    ms('demo-m2', 'demo-p1', 'Priority sources onboarded', 'sources', 'increase', '0', '3', '1', 'Sam Carter (fictional)', -6, [{ date: d(-6), value: '1' }]),
    ms('demo-m3', 'demo-p1', 'Time to provision a dataset', 'days', 'decrease', '20', '5', '', 'Jamie Patel (fictional)', -40, []),
    ms('demo-m4', 'demo-p2', 'Workloads migrated', 'workloads', 'increase', '0', '24', '0', 'Robin Silva (fictional)', -5, [{ date: d(-5), value: '0' }]),
    ms('demo-m5', 'demo-p3', 'Suggested category accuracy (offline evaluation)', '%', 'increase', '62', '85', '81', 'Quinn Harper (fictional)', -9,
      [{ date: d(-20), value: '74' }, { date: d(-9), value: '81' }]),
  ];

  const reports = [
    base('demo-rep1', {
      programId: 'demo-p1', weekEnding: d(-7), periodStart: d(-13), health: 'On Track',
      healthReason: 'Data model approved; pipelines started.', preparedBy: 'Alex Rivera (fictional)',
      sections: {
        changes: 'Sample report saved with the fictional demo data.',
        accomplishments: '- Target data model approved', upcoming: '- Stewardship model agreed',
        raid: '- Source B test extract may be late', help: 'Not entered', measures: '- Duplicate customer record rate: 16%', notes: '',
      },
    }, -7),
  ];

  return { programs, projects, workstreams, items, raid, decisions, stakeholders, raci, measures, reports, customTemplates: [] };
}
