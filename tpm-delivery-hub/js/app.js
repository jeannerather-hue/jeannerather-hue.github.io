// TPM Delivery Hub — UI layer (hash router, views, forms, exports).
import * as L from './logic.js';
import * as S from './store.js';
import { BUILTIN_TEMPLATES, templateToText, parseTemplateText, instantiateTemplate } from './templates.js';
import { buildDemoData } from './demo.js';

// ---------------------------------------------------------------- helpers
const NE = L.NOT_ENTERED;
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const blank = L.isBlank;
const ne = `<span class="ne">${NE}</span>`;
const show = (v) => (blank(v) ? ne : esc(v));
const showML = (v) => (blank(v) ? ne : esc(v).replace(/\n/g, '<br>'));
const st = () => S.get();
const today = () => L.todayISO();
const settings = () => st().settings;
const win = () => settings().upcomingDays || 14;
const focusId = () => {
  const f = settings().focusProgramId || '';
  return f && st().programs.some((p) => p.id === f) ? f : '';
};
const inFocus = (r) => !focusId() || r.programId === focusId();
const programName = (id) => st().programs.find((p) => p.id === id)?.name || '';
const wsName = (id) => st().workstreams.find((w) => w.id === id)?.name || '';
const itemById = (id) => st().items.find((i) => i.id === id);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const truncate = (s, n = 120) => (String(s || '').length > n ? String(s).slice(0, n - 1) + '…' : String(s || ''));

function fmtDate(iso) {
  if (!L.isISODate(iso)) return '';
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
const dateCell = (iso) => (L.isISODate(iso) ? `<time datetime="${iso}">${fmtDate(iso)}</time>` : '<span class="muted">No date</span>');
const updatedCell = (r) => (r.updatedAt ? `<time datetime="${esc(L.dateOf(r.updatedAt))}">${fmtDate(L.dateOf(r.updatedAt))}</time>` : '');

const ICONS = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  programs: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  roadmap: '<path d="M4 21V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
  raid: '<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v4"/><path d="M12 17.5v.5"/>',
  decisions: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8"/><path d="M8 6h3a5 5 0 0 1 5 5"/>',
  stakeholders: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>',
  reports: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  templates: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  data: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.5"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ''}</svg>`;

const NAV = [
  { id: 'overview', label: 'Portfolio Overview' },
  { id: 'programs', label: 'Programs' },
  { id: 'roadmap', label: 'Roadmap & Milestones' },
  { id: 'raid', label: 'RAID Log' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'stakeholders', label: 'Stakeholders & RACI' },
  { id: 'reports', label: 'Metrics & Status Reports' },
  { id: 'templates', label: 'Templates' },
];
const NAV2 = [
  { id: 'data', label: 'Data & Privacy' },
  { id: 'help', label: 'Help & Definitions' },
];

// Per-view UI state (filters, sorting, tabs). Session only.
const ui = {
  roadmap: { q: '', kind: '', status: 'open', priority: '', owner: '', ws: '', due: '', sort: 'dueDate', dir: 'asc', mode: 'table' },
  raid: { q: '', type: '', status: 'open', level: '', sort: 'priority', dir: 'asc' },
  decisions: { q: '', status: '', sort: 'neededBy', dir: 'asc' },
  stakeholders: { tab: 'register', q: '', sort: 'name', dir: 'asc' },
  measures: { q: '', sort: 'updatedDate', dir: 'desc' },
  reports: { tab: 'reports', programId: '', draft: null },
};

// ---------------------------------------------------------------- badges
const HEALTH_CLASS = { 'On Track': 'ok', 'At Risk': 'warn', 'Off Track': 'bad' };
const HEALTH_ICON = { ok: '●', warn: '▲', bad: '■', none: '○' };
function healthBadge(h) {
  const c = HEALTH_CLASS[h] || 'none';
  return `<span class="badge health-${c}"><span aria-hidden="true">${HEALTH_ICON[c]}</span>${esc(h || 'Health not set')}</span>`;
}
const STATUS_CLASS = {
  'Not Started': 'neutral', 'In Progress': 'info', Blocked: 'bad', Done: 'ok', Cancelled: 'muted',
  Open: 'info', Monitoring: 'neutral', Closed: 'muted', Pending: 'warn', Decided: 'ok', Deferred: 'neutral',
};
const statusBadge = (s) => (blank(s) ? ne : `<span class="badge s-${STATUS_CLASS[s] || 'neutral'}">${esc(s)}</span>`);
const levelBadge = (l) => (blank(l) ? '<span class="muted">—</span>' : `<span class="badge lvl-${esc(String(l).toLowerCase())}">${esc(l)}</span>`);
function flagTag(item) {
  const f = L.itemFlag(item, today(), win());
  const d = L.daysUntil(item.dueDate, today());
  if (f === 'overdue') return `<span class="flag flag-overdue">Overdue by ${plural(-d, 'day')}</span>`;
  if (f === 'upcoming') return `<span class="flag flag-soon">${d === 0 ? 'Due today' : `Due in ${plural(d, 'day')}`}</span>`;
  return '';
}
const chips = (arr) => ((arr || []).filter((x) => !blank(x)).length
  ? `<span class="chips">${arr.filter((x) => !blank(x)).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</span>`
  : '<span class="muted">—</span>');

// ---------------------------------------------------------------- toast / download
let toastTimer;
function toast(msg, kind = 'ok') {
  const t = $('#toast');
  t.className = `toast show toast-${kind}`;
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 4200);
}
// When embedded in a host that provides a save bridge, files go through its save prompt;
// when served locally, a normal browser download is used.
const inArtifact = () => !!(window.hostBridge && typeof window.hostBridge.use === 'function');
let downloadsNS = null;
async function download(filename, text, mime, okMsg = 'File downloaded.') {
  if (inArtifact()) {
    downloadsNS = downloadsNS || window.hostBridge.use('downloads');
    const ns = await downloadsNS;
    if (!ns) { toast('Saving files is not available in this view. Open the app locally to export.', 'warn'); return; }
    try { await ns.save({ filename, data: mime.startsWith('text/csv') ? '\uFEFF' + text : text }); toast(okMsg); }
    catch (e) { toast(e && e.code === 'declined' ? 'Save cancelled.' : 'The file could not be saved. Try again.', 'warn'); }
    return;
  }
  browserDownload(filename, text, mime);
  toast(okMsg);
}
function browserDownload(filename, text, mime) {
  const isCSV = mime.startsWith('text/csv');
  const blob = new Blob([isCSV ? '﻿' + text : text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const safeName = (s) => String(s || 'program').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'program';

// ---------------------------------------------------------------- modal forms
const modal = $('#modal');
let formCtx = null;

function openForm(cfg) {
  formCtx = { ...cfg, values: { ...(cfg.values || {}) } };
  drawForm();
  if (!modal.open) modal.showModal();
  const first = modal.querySelector('.form-grid input:not([type=hidden]):not([type=checkbox]), .form-grid select, .form-grid textarea');
  first && first.focus();
}
function closeForm() { if (modal.open) modal.close(); formCtx = null; }
/** In-page confirmation (browser confirm() pop-ups are blocked in some viewers). */
function askConfirm(message, confirmLabel, onConfirm) {
  openForm({ title: 'Please confirm', intro: esc(message), fields: [], submitLabel: confirmLabel, danger: true, onSave: onConfirm });
}
const fieldsOf = (c) => (typeof c.fields === 'function' ? c.fields(c.values) : c.fields);

function optionList(options) {
  return (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}
function fieldHTML(f, v) {
  const id = `f-${f.name}`;
  const label = f.label ?? f.name;
  const req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
  const help = f.help ? `<p class="help" id="${id}-help">${f.help}</p>` : '';
  const desc = f.help ? ` aria-describedby="${id}-help"` : '';
  const reqAttr = f.required ? ' aria-required="true"' : '';
  const cls = `field${f.full ? ' full' : ''}`;
  switch (f.type) {
    case 'info':
      return `<div class="${cls} full info-box">${f.html}</div>`;
    case 'textarea':
      return `<div class="${cls}"><label for="${id}">${esc(label)}${req}</label><textarea id="${id}" name="${f.name}" rows="${f.rows || 3}"${desc}${reqAttr} placeholder="${esc(f.placeholder || '')}">${esc(v ?? '')}</textarea>${help}</div>`;
    case 'select': {
      const opts = optionList(f.options);
      const emptyOpt = f.empty !== undefined ? `<option value="">${esc(f.empty)}</option>` : '';
      return `<div class="${cls}"><label for="${id}">${esc(label)}${req}</label><select id="${id}" name="${f.name}"${desc}${reqAttr}>${emptyOpt}${opts.map((o) => `<option value="${esc(o.value)}"${String(v ?? '') === String(o.value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${help}</div>`;
    }
    case 'checks': {
      const opts = optionList(f.options);
      const vals = new Set(v || []);
      const body = opts.length
        ? `<div class="check-list">${opts.map((o, i) => `<label class="check"><input type="checkbox" name="${f.name}" value="${esc(o.value)}" id="${id}-${i}"${vals.has(o.value) ? ' checked' : ''}> <span>${esc(o.label)}</span></label>`).join('')}</div>`
        : `<p class="muted small">${esc(f.emptyText || 'Nothing to choose yet.')}</p>`;
      return `<fieldset class="${cls}"${desc}><legend>${esc(label)}</legend>${body}${help}</fieldset>`;
    }
    case 'people': {
      const opts = optionList(f.options);
      const vals = v || [];
      const known = new Set(opts.map((o) => o.value));
      const others = vals.filter((x) => !known.has(x));
      return `<fieldset class="${cls} people"${desc}><legend>${esc(label)}</legend>
        ${opts.length ? `<div class="check-list compact">${opts.map((o, i) => `<label class="check"><input type="checkbox" name="${f.name}" value="${esc(o.value)}" id="${id}-${i}"${vals.includes(o.value) ? ' checked' : ''}> <span>${esc(o.label)}</span></label>`).join('')}</div>` : ''}
        <label for="${id}-other" class="small">${opts.length ? 'Other people or teams' : 'People or teams'} (comma-separated)</label>
        <input id="${id}-other" type="text" value="${esc(others.join(', '))}" autocomplete="off">${help}</fieldset>`;
    }
    case 'checkbox':
      return `<div class="${cls} checkbox-field"><label class="check"><input type="checkbox" id="${id}" name="${f.name}"${v ? ' checked' : ''}${desc}> <span>${esc(label)}</span></label>${help}</div>`;
    default: {
      const type = f.type || 'text';
      const extra = type === 'number' ? ` min="${f.min ?? ''}" max="${f.max ?? ''}" step="${f.step ?? 'any'}"` : '';
      return `<div class="${cls}"><label for="${id}">${esc(label)}${req}</label><input id="${id}" name="${f.name}" type="${type}" value="${esc(v ?? '')}"${extra}${desc}${reqAttr} placeholder="${esc(f.placeholder || '')}" autocomplete="off">${help}</div>`;
    }
  }
}
function drawForm() {
  const c = formCtx;
  const fields = fieldsOf(c);
  modal.setAttribute('aria-labelledby', 'modal-title');
  modal.innerHTML = `<form id="modal-form" novalidate>
    <header class="modal-head"><h2 id="modal-title">${esc(c.title)}</h2>
      <button type="button" class="icon-btn" data-modal-close aria-label="Close dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
    <div class="modal-body">
      ${c.intro ? `<p class="modal-intro">${c.intro}</p>` : ''}
      <div class="form-error" role="alert" id="form-error" hidden></div>
      <div class="form-grid">${fields.map((f) => fieldHTML(f, c.values[f.name])).join('')}</div>
      ${fields.some((f) => f.required) ? '<p class="small muted req-note">Fields marked <span class="req">*</span> are required.</p>' : ''}
    </div>
    <footer class="modal-foot">
      ${c.onDelete ? `<button type="button" class="btn danger-ghost" data-modal-delete>${esc(c.deleteLabel || 'Delete')}</button>` : ''}
      <span class="spacer"></span>
      <button type="button" class="btn ghost" data-modal-close>Cancel</button>
      <button type="submit" class="btn ${c.danger ? 'danger' : 'primary'}">${esc(c.submitLabel || 'Save')}</button>
    </footer></form>`;
}
function collectForm() {
  const c = formCtx;
  const form = $('#modal-form');
  const out = { ...c.values };
  for (const f of fieldsOf(c)) {
    if (f.type === 'info') continue;
    if (f.type === 'checks') {
      out[f.name] = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map((x) => x.value);
    } else if (f.type === 'people') {
      const picked = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map((x) => x.value);
      const other = (form.querySelector(`#f-${f.name}-other`)?.value || '').split(',').map((s) => s.trim()).filter(Boolean);
      out[f.name] = [...new Set([...picked, ...other])];
    } else if (f.type === 'checkbox') {
      out[f.name] = form.querySelector(`#f-${f.name}`).checked;
    } else {
      const el = form.querySelector(`#f-${f.name}`);
      if (el) out[f.name] = typeof el.value === 'string' ? el.value.trim() : el.value;
    }
  }
  return out;
}
function formError(msg, fieldName) {
  const box = $('#form-error');
  box.hidden = false;
  box.textContent = msg;
  const el = fieldName && $(`#f-${fieldName}`);
  if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } else box.scrollIntoView({ block: 'nearest' });
}

modal.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!formCtx) return;
  const vals = collectForm();
  for (const f of fieldsOf(formCtx)) {
    if (f.required && blank(vals[f.name])) return formError(`"${f.label}" is required.`, f.name);
    if (f.type === 'date' && !blank(vals[f.name]) && !L.isISODate(vals[f.name])) return formError(`"${f.label}" must be a valid date.`, f.name);
  }
  const err = formCtx.validate && formCtx.validate(vals);
  if (err) return formError(typeof err === 'string' ? err : err.message, err.field);
  const cb = formCtx.onSave;
  closeForm();
  cb(vals);
});
modal.addEventListener('click', (e) => {
  if (e.target.closest('[data-modal-close]')) { closeForm(); return; }
  if (e.target.closest('[data-modal-delete]') && formCtx) {
    const msg = formCtx.confirmDelete || 'Delete this record? This cannot be undone.';
    const cb = formCtx.onDelete; const label = formCtx.deleteLabel || 'Delete';
    closeForm(); askConfirm(msg, label, cb);
    return;
  }
  if (e.target === modal) closeForm(); // backdrop click
});
modal.addEventListener('change', (e) => {
  if (!formCtx) return;
  const name = e.target.name;
  const f = name && fieldsOf(formCtx).find((x) => x.name === name);
  if (f && f.refresh) {
    const vals = collectForm();
    (f.resets || []).forEach((k) => { vals[k] = Array.isArray(vals[k]) ? [] : ''; });
    formCtx.values = vals;
    const focused = e.target.id;
    drawForm();
    const el = document.getElementById(focused);
    el && el.focus();
  }
});
modal.addEventListener('close', () => { if (!modal.open) formCtx = null; });

// ---------------------------------------------------------------- record forms
const programOptions = () => st().programs.map((p) => ({ value: p.id, label: p.name }));
const defaultProgram = () => focusId() || (st().programs.length === 1 ? st().programs[0].id : '');
function needProgram() {
  if (st().programs.length) return true;
  toast('Create a program first. Records always belong to a program.', 'warn');
  location.hash = '#/programs';
  return false;
}

function programForm(p = null) {
  openForm({
    title: p ? 'Edit program' : 'New program',
    intro: p ? '' : 'Start blank, or use <a href="#/templates" data-modal-close>a starter template</a> to pre-fill workstreams and milestones.',
    values: p || { status: '' },
    fields: [
      { name: 'name', label: 'Program name', required: true, full: true },
      { name: 'objective', label: 'Objective', type: 'textarea', full: true, help: 'What the program will deliver.' },
      { name: 'outcome', label: 'Business outcome', type: 'textarea', full: true, help: 'The measurable business result the work should lead to.' },
      { name: 'sponsor', label: 'Executive sponsor' },
      { name: 'tpm', label: 'TPM' },
      { name: 'startDate', label: 'Start date', type: 'date' },
      { name: 'targetDate', label: 'Target date', type: 'date' },
      { name: 'status', label: 'Overall status', type: 'select', options: L.HEALTH, empty: 'Not set', help: 'Your judgement. See Help & Definitions for suggested meanings.' },
      { name: 'statusReason', label: 'Reason for status', type: 'textarea', help: 'Why the program has this status right now.' },
      { name: 'assumptions', label: 'Key assumptions', type: 'textarea', full: true, help: 'One per line. Track assumptions that need validating in the RAID log too.' },
      { name: 'inScope', label: 'In scope', type: 'textarea' },
      { name: 'outOfScope', label: 'Out of scope', type: 'textarea' },
    ],
    validate: (v) => {
      if (v.startDate && v.targetDate && v.targetDate < v.startDate) return { message: 'Target date must be on or after the start date.', field: 'targetDate' };
      if (v.status && blank(v.statusReason)) return { message: 'Add a short reason for the status so readers know why.', field: 'statusReason' };
      return null;
    },
    onSave: (v) => {
      const rec = S.upsert('programs', v);
      toast(p ? 'Program updated.' : 'Program created.');
      if (!p) location.hash = `#/programs/${rec.id}`;
    },
    onDelete: p ? () => {
      S.remove('programs', p.id);
      toast('Program and its records deleted.');
      location.hash = '#/programs';
    } : null,
    deleteLabel: 'Delete program',
    confirmDelete: p ? `Delete "${p.name}" and all of its workstreams, milestones, RAID records, decisions, stakeholders, RACI rows, measures and reports? This cannot be undone.` : '',
  });
}

function workstreamForm(programId, w = null) {
  openForm({
    title: w ? 'Edit workstream' : 'New workstream',
    values: w || { programId },
    fields: [
      { name: 'name', label: 'Workstream name', required: true, full: true },
      { name: 'owner', label: 'Owner' },
      { name: 'deliverables', label: 'Deliverables', type: 'textarea', full: true, help: 'One deliverable per line.' },
    ],
    onSave: (v) => { S.upsert('workstreams', v); toast(w ? 'Workstream updated.' : 'Workstream added.'); },
    onDelete: w ? () => { S.remove('workstreams', w.id); toast('Workstream deleted. Linked items were kept and unlinked.'); } : null,
  });
}

function itemFields(v) {
  const wsOpts = st().workstreams.filter((w) => w.programId === v.programId).map((w) => ({ value: w.id, label: w.name }));
  const depOpts = st().items.filter((i) => i.programId === v.programId && i.id !== v.id)
    .map((i) => ({ value: i.id, label: `${i.kind}: ${i.name}${i.dueDate ? ` (due ${fmtDate(i.dueDate)})` : ''}` }));
  return [
    { name: 'programId', label: 'Program', type: 'select', options: programOptions(), empty: 'Choose a program', required: true, refresh: true, resets: ['workstreamId', 'dependsOn'] },
    { name: 'kind', label: 'Type', type: 'select', options: L.ITEM_KINDS, help: 'Milestone: a significant checkpoint. Action: a task that moves work forward.' },
    { name: 'name', label: 'Name', required: true, full: true },
    { name: 'description', label: 'Description', type: 'textarea', full: true },
    { name: 'owner', label: 'Owner' },
    { name: 'workstreamId', label: 'Workstream', type: 'select', options: wsOpts, empty: wsOpts.length ? 'No workstream' : 'No workstreams in this program yet' },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: L.ITEM_STATUSES },
    { name: 'priority', label: 'Priority', type: 'select', options: L.LEVELS },
    { name: 'completedDate', label: 'Completed date', type: 'date', help: 'Filled with today when status becomes Done (edit if needed). Used for "Accomplishments" in status reports.' },
    { name: 'dependsOn', label: 'Depends on', type: 'checks', options: depOpts, full: true, emptyText: v.programId ? 'No other milestones or actions in this program yet.' : 'Choose a program first.', help: 'Items that must finish before this one can.' },
    { name: 'blockers', label: 'Blockers', type: 'textarea' },
    { name: 'nextSteps', label: 'Next steps', type: 'textarea' },
  ];
}
function itemForm(item = null, preset = {}) {
  if (!needProgram()) return;
  openForm({
    title: item ? `Edit ${item.kind.toLowerCase()}` : `New ${(preset.kind || 'Milestone').toLowerCase()}`,
    values: item ? { ...item, dependsOn: [...(item.dependsOn || [])] } : { programId: defaultProgram(), kind: 'Milestone', status: 'Not Started', priority: 'Medium', dependsOn: [], ...preset },
    fields: itemFields,
    validate: (v) => {
      if (v.status === 'Blocked' && blank(v.blockers)) return { message: 'Describe the blocker so others know what is needed.', field: 'blockers' };
      if (L.wouldCreateCycle(v.id || '__new__', v.dependsOn, st().items)) return { message: 'Those dependencies would create a loop (A waits for B, B waits for A). Remove one.', field: null };
      return null;
    },
    onSave: (v) => { S.upsert('items', v); toast(item ? 'Saved.' : `${v.kind} added.`); },
    onDelete: item ? () => { S.remove('items', item.id); toast('Deleted. Dependencies pointing to it were removed.'); } : null,
  });
}

function raidFields(v) {
  const wsOpts = st().workstreams.filter((w) => w.programId === v.programId).map((w) => ({ value: w.id, label: w.name }));
  const itOpts = st().items.filter((i) => i.programId === v.programId).map((i) => ({ value: i.id, label: `${i.kind}: ${i.name}` }));
  return [
    { name: 'programId', label: 'Program', type: 'select', options: programOptions(), empty: 'Choose a program', required: true, refresh: true, resets: ['workstreamId', 'itemId'] },
    { name: 'type', label: 'Type', type: 'select', options: L.RAID_TYPES, required: true, help: 'Risk: might happen. Assumption: believed true, needs checking. Issue: happening now. Dependency: relies on someone or something else.' },
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'description', label: 'Description', type: 'textarea', full: true },
    { name: 'owner', label: 'Owner' },
    { name: 'status', label: 'Status', type: 'select', options: L.RAID_STATUSES },
    { name: 'impact', label: 'Impact', type: 'select', options: L.LEVELS, empty: 'Not set' },
    { name: 'likelihood', label: 'Likelihood', type: 'select', options: L.LEVELS, empty: 'Not set', help: 'Mainly for risks and assumptions.' },
    { name: 'priority', label: 'Priority', type: 'select', options: L.LEVELS, empty: 'Not set' },
    { name: 'dueDate', label: 'Due / review date', type: 'date' },
    { name: 'mitigation', label: 'Mitigation or next action', type: 'textarea', full: true },
    { name: 'workstreamId', label: 'Linked workstream', type: 'select', options: wsOpts, empty: 'None' },
    { name: 'itemId', label: 'Linked milestone or action', type: 'select', options: itOpts, empty: 'None' },
  ];
}
function raidForm(r = null) {
  if (!needProgram()) return;
  openForm({
    title: r ? `Edit ${r.type.toLowerCase()}` : 'New RAID record',
    values: r || { programId: defaultProgram(), type: 'Risk', status: 'Open' },
    fields: raidFields,
    onSave: (v) => { S.upsert('raid', v); toast(r ? 'RAID record updated.' : 'RAID record added.'); },
    onDelete: r ? () => { S.remove('raid', r.id); toast('RAID record deleted.'); } : null,
  });
}

function decisionForm(d = null) {
  if (!needProgram()) return;
  openForm({
    title: d ? 'Edit decision' : 'New decision',
    values: d || { programId: defaultProgram(), status: 'Pending', dateRaised: today() },
    fields: [
      { name: 'programId', label: 'Program', type: 'select', options: programOptions(), empty: 'Choose a program', required: true },
      { name: 'title', label: 'Decision needed', required: true, full: true, help: 'Phrase as a question or choice, e.g. "Approve revised go-live date".' },
      { name: 'dateRaised', label: 'Date raised', type: 'date' },
      { name: 'neededBy', label: 'Needed by', type: 'date' },
      { name: 'owner', label: 'Decision owner', help: 'The one person who makes the call.' },
      { name: 'status', label: 'Status', type: 'select', options: L.DECISION_STATUSES },
      { name: 'options', label: 'Options considered', type: 'textarea', full: true, help: 'One option per line.' },
      { name: 'finalDecision', label: 'Final decision', type: 'textarea', full: true },
      { name: 'decidedDate', label: 'Date decided', type: 'date', help: 'Filled with today when status becomes Decided (edit if needed).' },
      { name: 'rationale', label: 'Rationale', type: 'textarea' },
      { name: 'impact', label: 'Impact', type: 'textarea' },
      { name: 'followUp', label: 'Follow-up action', type: 'textarea', full: true },
    ],
    validate: (v) => (v.status === 'Decided' && blank(v.finalDecision) ? { message: 'Enter the final decision, or keep the status as Pending.', field: 'finalDecision' } : null),
    onSave: (v) => { S.upsert('decisions', v); toast(d ? 'Decision updated.' : 'Decision logged.'); },
    onDelete: d ? () => { S.remove('decisions', d.id); toast('Decision deleted.'); } : null,
  });
}

const CADENCES = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'As needed'];
function stakeholderForm(s = null) {
  openForm({
    title: s ? 'Edit stakeholder' : 'New stakeholder',
    values: s || { programId: defaultProgram(), cadence: 'Weekly' },
    fields: [
      { name: 'name', label: 'Name (person or team)', required: true, full: true },
      { name: 'programId', label: 'Program', type: 'select', options: programOptions(), empty: 'Shared across programs' },
      { name: 'role', label: 'Role', placeholder: 'e.g. Executive sponsor' },
      { name: 'team', label: 'Team' },
      { name: 'cadence', label: 'Communication cadence', type: 'select', options: CADENCES, empty: 'Not set' },
      { name: 'responsibilities', label: 'Responsibilities', type: 'textarea', full: true },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true, help: 'Preferences, channels, context. Avoid sensitive personal information.' },
    ],
    onSave: (v) => { S.upsert('stakeholders', v); toast(s ? 'Stakeholder updated.' : 'Stakeholder added.'); },
    onDelete: s ? () => { S.remove('stakeholders', s.id); toast('Stakeholder deleted. RACI assignments by name were kept.'); } : null,
  });
}

function peopleFor(programId) {
  const names = st().stakeholders.filter((s) => !s.programId || s.programId === programId).map((s) => s.name);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}
function raciForm(row = null) {
  if (!needProgram()) return;
  openForm({
    title: row ? 'Edit RACI row' : 'New RACI row',
    intro: 'Pick people from the stakeholder register or type other names or teams. More than one is allowed in each column.',
    values: row ? { ...row } : { programId: defaultProgram(), kind: 'Activity', R: [], A: [], C: [], I: [] },
    fields: (v) => {
      const ppl = peopleFor(v.programId);
      return [
        { name: 'programId', label: 'Program', type: 'select', options: programOptions(), empty: 'Choose a program', required: true, refresh: true },
        { name: 'kind', label: 'Type', type: 'select', options: ['Activity', 'Deliverable'] },
        { name: 'activity', label: 'Activity or deliverable', required: true, full: true },
        { name: 'R', label: 'R — Responsible (does the work)', type: 'people', options: ppl, full: true },
        { name: 'A', label: 'A — Accountable (owns the outcome; ideally one)', type: 'people', options: ppl, full: true },
        { name: 'C', label: 'C — Consulted (input before)', type: 'people', options: ppl, full: true },
        { name: 'I', label: 'I — Informed (told after)', type: 'people', options: ppl, full: true },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ];
    },
    onSave: (v) => {
      S.upsert('raci', v);
      const f = L.raciFlags(v);
      toast(f.noA ? 'Saved. No Accountable owner yet, so this row is flagged.' : f.multiA ? 'Saved. More than one Accountable owner is flagged as a warning.' : 'RACI row saved.', f.noA || f.multiA ? 'warn' : 'ok');
    },
    onDelete: row ? () => { S.remove('raci', row.id); toast('RACI row deleted.'); } : null,
  });
}

function measureForm(m = null, presetProgram = '') {
  if (!needProgram()) return;
  openForm({
    title: m ? 'Update success measure' : 'New success measure',
    values: m || { programId: presetProgram || defaultProgram(), direction: 'increase' },
    fields: [
      { name: 'programId', label: 'Program', type: 'select', options: programOptions(), empty: 'Choose a program', required: true },
      { name: 'name', label: 'Measure', required: true, full: true, placeholder: 'e.g. Duplicate record rate' },
      { name: 'unit', label: 'Unit', placeholder: 'e.g. %, days, count' },
      { name: 'direction', label: 'Better when it…', type: 'select', options: [{ value: 'increase', label: 'Goes up' }, { value: 'decrease', label: 'Goes down' }] },
      { name: 'baseline', label: 'Baseline', help: 'Value before the program started.' },
      { name: 'target', label: 'Target' },
      { name: 'current', label: 'Current value', help: 'Leave blank if not measured yet. It will show as "Not entered".' },
      { name: 'updatedDate', label: 'Date of current value', type: 'date', help: 'Set to today automatically when you change the current value, unless you enter a date.' },
      { name: 'owner', label: 'Owner' },
      { name: 'notes', label: 'Notes / data source', type: 'textarea', full: true },
    ],
    onSave: (v) => { S.upsert('measures', v); toast(m ? 'Measure updated.' : 'Measure added.'); },
    onDelete: m ? () => { S.remove('measures', m.id); toast('Measure deleted.'); } : null,
  });
}

// ---------------------------------------------------------------- page building blocks
const pageHead = (title, sub, actions = '') =>
  `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}</div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</div>`;
const emptyBox = (title, text, actions = '') =>
  `<div class="empty"><h2 class="empty-title">${title}</h2><p>${text}</p>${actions ? `<div class="empty-actions">${actions}</div>` : ''}</div>`;
const btn = (label, action, data = {}, cls = 'btn') =>
  `<button type="button" class="${cls}" data-action="${action}"${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}>${label}</button>`;
const focusNote = () => (focusId()
  ? `<p class="focus-note">Showing <strong>${esc(programName(focusId()))}</strong> only. ${btn('Show all programs', 'set-focus', { id: '' }, 'link-btn')}</p>` : '');
const noProgramsBox = () => emptyBox('No programs yet', 'Everything in TPM Delivery Hub belongs to a program. Create one to start tracking.',
  `${btn('Create a program', 'new-program', {}, 'btn primary')} <a class="btn" href="#/templates">Start from a template</a> ${btn('Load fictional demo data', 'load-demo', {}, 'btn ghost')}`);

function sortHeader(view, c) {
  if (c.sort === false) return `<th scope="col">${c.label}</th>`;
  const s = ui[view];
  const active = s.sort === c.key;
  const aria = active ? (s.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return `<th scope="col" aria-sort="${aria}"><button type="button" class="th-sort" data-action="sort" data-view="${view}" data-key="${c.key}">${c.label}<span class="sort-ind" aria-hidden="true">${active ? (s.dir === 'asc' ? '▲' : '▼') : '↕'}</span></button></th>`;
}
function dataTable(view, cols, rows, opts = {}) {
  return `<div class="table-wrap"><table class="data ${opts.cls || ''}">
    ${opts.caption ? `<caption class="sr-only">${esc(opts.caption)}</caption>` : ''}
    <thead><tr>${cols.map((c) => sortHeader(view, c)).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr class="${opts.rowClass ? opts.rowClass(r) : ''}">${cols.map((c) => `<td data-label="${esc(c.label)}"${c.cls ? ` class="${c.cls}"` : ''}>${c.cell(r)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}
function applySort(view, cols, rows) {
  const s = ui[view];
  const c = cols.find((x) => x.key === s.sort);
  if (!c) return rows;
  return L.sortRecords(rows, c.val || ((r) => r[c.key]), s.dir);
}
const filterSelect = (view, key, label, options, emptyLabel = 'All') => {
  const id = `flt-${view}-${key}`;
  return `<div class="filter"><label for="${id}">${label}</label><select id="${id}" data-bind="${view}.${key}"><option value="">${esc(emptyLabel)}</option>${optionList(options).map((o) => `<option value="${esc(o.value)}"${ui[view][key] === o.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>`;
};
const searchBox = (view, placeholder) => {
  const id = `q-${view}`;
  return `<div class="filter search"><label for="${id}">Search</label><input id="${id}" type="search" data-bind="${view}.q" value="${esc(ui[view].q)}" placeholder="${esc(placeholder)}" autocomplete="off"></div>`;
};
const matches = (q, ...fields) => !q || fields.some((f) => String(f || '').toLowerCase().includes(q.toLowerCase()));

// ---------------------------------------------------------------- view: overview
function viewOverview() {
  const s = st();
  if (!s.programs.length) {
    return `${pageHead('Portfolio Overview', 'A summary across all of your programs, calculated from what you enter.')}
      <section class="welcome card">
        <h2>Welcome to TPM Delivery Hub</h2>
        <p>A local workspace for organizing delivery and communicating program status. It complements your engineering tools; it does not replace or connect to Jira, Azure DevOps, or similar systems.</p>
        <ol class="steps">
          <li><strong>Create a program</strong> (blank or from a starter template).</li>
          <li><strong>Add milestones, RAID records, decisions, stakeholders and success measures.</strong></li>
          <li><strong>Generate a weekly status report</strong> from that data, edit it, and export it.</li>
        </ol>
        <div class="empty-actions">
          ${btn('Create a program', 'new-program', {}, 'btn primary')}
          <a class="btn" href="#/templates">Start from a template</a>
          ${btn('Explore with fictional demo data', 'load-demo', {}, 'btn ghost')}
        </div>
        <p class="small muted">Your data is saved only in this browser on this device. <a href="#/data">How storage works</a>.</p>
      </section>`;
  }
  const sum = L.portfolioSummary(s, today(), { upcomingDays: win(), recentMeasureDays: settings().recentMeasureDays, programId: focusId() });
  const kpi = (n, label, def, preset, tone = '') =>
    `<li class="kpi ${tone}"><button type="button" class="kpi-btn" data-action="goto" data-preset="${preset}">
      <span class="kpi-num">${n}</span><span class="kpi-label">${label}</span><span class="kpi-def">${def}</span></button></li>`;
  const h = sum.health;
  const health = `<li class="kpi"><div class="kpi-static">
      <span class="kpi-label">Program health</span>
      <span class="health-row">${L.HEALTH.map((x) => `<span class="health-count health-${HEALTH_CLASS[x]}"><b>${h[x]}</b> ${x}</span>`).join('')}${h['Not set'] ? `<span class="health-count health-none"><b>${h['Not set']}</b> Not set</span>` : ''}</span>
      <span class="kpi-def">Count of ${plural(sum.programs.length, 'program')} by the overall status you set on each program.</span></div></li>`;

  const msRow = (i) => `<li class="list-row ${L.itemFlag(i, today(), win())}">
      <div><button type="button" class="link" data-action="edit-item" data-id="${i.id}">${esc(i.name)}</button>
      <div class="small muted">${esc(programName(i.programId))}${i.owner ? ` · ${esc(i.owner)}` : ''}</div></div>
      <div class="row-meta">${flagTag(i)} ${statusBadge(i.status)}</div></li>`;
  const raidRow = (r) => `<li class="list-row"><div><button type="button" class="link" data-action="edit-raid" data-id="${r.id}">${esc(r.title)}</button>
      <div class="small muted">${esc(r.type)} · ${esc(programName(r.programId))} · Owner: ${show(r.owner)}</div></div>
      <div class="row-meta">${L.raidFlag(r, today()) === 'overdue' ? '<span class="flag flag-overdue">Past due</span>' : ''} ${levelBadge(r.priority || r.impact)}</div></li>`;
  const decRow = (d) => {
    const late = L.daysUntil(d.neededBy, today());
    return `<li class="list-row"><div><button type="button" class="link" data-action="edit-decision" data-id="${d.id}">${esc(d.title)}</button>
      <div class="small muted">${esc(programName(d.programId))} · Owner: ${show(d.owner)}</div></div>
      <div class="row-meta">${late !== null && late < 0 ? '<span class="flag flag-overdue">Past needed-by date</span>' : d.neededBy ? `<span class="small">Needed by ${fmtDate(d.neededBy)}</span>` : ''}</div></li>`;
  };
  const msrRow = (m) => {
    const prog = L.measureProgress(m);
    return `<li class="list-row"><div><button type="button" class="link" data-action="edit-measure" data-id="${m.id}">${esc(m.name)}</button>
      <div class="small muted">${esc(programName(m.programId))} · updated ${fmtDate(m.updatedDate)}</div></div>
      <div class="row-meta measure-val"><b>${blank(m.current) ? ne : esc(m.current + (m.unit ? ' ' + m.unit : ''))}</b>
      <span class="small muted">target ${blank(m.target) ? NE : esc(m.target)}</span>${prog !== null ? `<span class="small">${prog}% of the way to target</span>` : ''}</div></li>`;
  };
  const panel = (title, def, list, rowFn, emptyText, link) => `<section class="card panel"><div class="panel-head"><h2>${title}</h2>${link || ''}</div>
      <p class="panel-def">${def}</p>
      ${list.length ? `<ul class="list">${list.slice(0, 8).map(rowFn).join('')}</ul>${list.length > 8 ? `<p class="small muted">${list.length - 8} more not shown.</p>` : ''}` : `<p class="panel-empty">${emptyText}</p>`}</section>`;

  const progRows = sum.programs.map((p) => {
    const c = L.programCounts(s, p.id, today(), win());
    return `<tr><th scope="row" data-label="Program"><a href="#/programs/${p.id}">${esc(p.name)}</a>${p.isDemo ? ' <span class="tag demo">Demo</span>' : ''}</th>
      <td data-label="Health">${healthBadge(p.status)}</td>
      <td data-label="Reason">${show(p.statusReason)}</td>
      <td data-label="Overdue items" class="num">${c.overdue}</td>
      <td data-label="Open high RAID" class="num">${c.highRaid}</td>
      <td data-label="Pending decisions" class="num">${c.pendingDecisions}</td>
      <td data-label="Target date">${dateCell(p.targetDate)}</td></tr>`;
  }).join('');

  return `${pageHead('Portfolio Overview', `Calculated from your entered data as of ${fmtDate(today())}. Select a card to see the underlying records.`,
    `${btn('New program', 'new-program', {}, 'btn primary')}`)}
    ${focusNote()}
    <ul class="kpis" aria-label="Portfolio summary">
      ${health}
      ${kpi(sum.overdueMilestones.length, 'Overdue milestones', 'Open milestones with a due date before today.', 'overdue', sum.overdueMilestones.length ? 'tone-bad' : '')}
      ${kpi(sum.upcomingMilestones.length, `Milestones due in ${win()} days`, `Open milestones due today or within the next ${win()} days.`, 'upcoming', sum.upcomingMilestones.length ? 'tone-warn' : '')}
      ${kpi(sum.highRaid.length, 'Open high-priority risks & issues', 'Risks and issues not Closed with priority or impact High.', 'high-raid', sum.highRaid.length ? 'tone-bad' : '')}
      ${kpi(sum.pendingDecisions.length, 'Decisions awaiting action', 'Decisions with status Pending.', 'pending-decisions', sum.pendingDecisions.length ? 'tone-warn' : '')}
      ${kpi(sum.overdueActions.length, 'Overdue actions', 'Open actions with a due date before today.', 'overdue-actions', sum.overdueActions.length ? 'tone-bad' : '')}
      ${kpi(sum.raciGaps.length, 'RACI rows without an Accountable', 'Activities or deliverables with nobody in the A column.', 'raci', sum.raciGaps.length ? 'tone-warn' : '')}
    </ul>

    <section class="card">
      <div class="panel-head"><h2>Program health</h2><a href="#/programs" class="small">All programs</a></div>
      <div class="table-wrap"><table class="data"><caption class="sr-only">Program health summary</caption>
        <thead><tr><th scope="col">Program</th><th scope="col">Health</th><th scope="col">Reason</th><th scope="col">Overdue items</th><th scope="col">Open high RAID</th><th scope="col">Pending decisions</th><th scope="col">Target date</th></tr></thead>
        <tbody>${progRows}</tbody></table></div>
    </section>

    <div class="panel-grid">
      ${panel('Overdue milestones', 'Not Done or Cancelled, due date before today.', sum.overdueMilestones, msRow, 'No overdue milestones.', '<button type="button" class="link small" data-action="goto" data-preset="overdue">Open in roadmap</button>')}
      ${panel(`Upcoming milestones (next ${win()} days)`, 'Not Done or Cancelled, due today or soon.', sum.upcomingMilestones, msRow, 'Nothing due in this window.', '<button type="button" class="link small" data-action="goto" data-preset="upcoming">Open in roadmap</button>')}
      ${panel('Open high-priority risks & issues', 'Status not Closed and priority or impact High.', sum.highRaid, raidRow, 'No open high-priority risks or issues.', '<button type="button" class="link small" data-action="goto" data-preset="high-raid">Open RAID log</button>')}
      ${panel('Decisions awaiting action', 'Status Pending, earliest needed-by date first.', sum.pendingDecisions, decRow, 'No pending decisions.', '<button type="button" class="link small" data-action="goto" data-preset="pending-decisions">Open decision log</button>')}
      ${panel(`Recently updated success measures`, `Measures whose value date is within the last ${sum.recentDays} days.`, sum.recentMeasures, msrRow, 'No measures updated recently. Update current values under Metrics & Status Reports.', '<button type="button" class="link small" data-action="goto" data-preset="measures">All measures</button>')}
    </div>`;
}

// ---------------------------------------------------------------- view: programs
function viewPrograms(route) {
  if (route.id) return viewProgramDetail(route.id);
  const s = st();
  const list = s.programs.filter((p) => !focusId() || p.id === focusId());
  const actions = `${btn('New program', 'new-program', {}, 'btn primary')} <a class="btn" href="#/templates">From a template</a>`;
  if (!s.programs.length) return pageHead('Programs', 'Each program has its own objective, workstreams, milestones and measures.', actions) + noProgramsBox();
  const cards = list.map((p) => {
    const c = L.programCounts(s, p.id, today(), win());
    return `<article class="card program-card">
      <div class="program-card-head"><h2><a href="#/programs/${p.id}">${esc(p.name)}</a></h2>${p.isDemo ? '<span class="tag demo">Fictional demo</span>' : ''}</div>
      <div>${healthBadge(p.status)}</div>
      <p class="reason">${show(p.statusReason)}</p>
      <dl class="facts compact">
        <div><dt>TPM</dt><dd>${show(p.tpm)}</dd></div>
        <div><dt>Sponsor</dt><dd>${show(p.sponsor)}</dd></div>
        <div><dt>Target</dt><dd>${L.isISODate(p.targetDate) ? fmtDate(p.targetDate) : ne}</dd></div>
      </dl>
      <ul class="mini-stats">
        <li><b>${c.openItems}</b> open items</li>
        <li class="${c.overdue ? 'bad' : ''}"><b>${c.overdue}</b> overdue</li>
        <li><b>${c.openRaid}</b> open RAID</li>
        <li class="${c.pendingDecisions ? 'warn' : ''}"><b>${c.pendingDecisions}</b> pending decisions</li>
      </ul>
      <div class="card-actions"><a class="btn small" href="#/programs/${p.id}">Open workspace</a>${btn('Edit', 'edit-program', { id: p.id }, 'btn ghost small')}</div>
    </article>`;
  }).join('');
  return `${pageHead('Programs', 'Each program has its own objective, workstreams, milestones and measures.', actions)}${focusNote()}<div class="card-grid">${cards}</div>`;
}

function viewProgramDetail(id) {
  const s = st();
  const p = s.programs.find((x) => x.id === id);
  if (!p) return pageHead('Program not found') + emptyBox('This program does not exist', 'It may have been deleted.', '<a class="btn" href="#/programs">Back to programs</a>');
  const ws = s.workstreams.filter((w) => w.programId === id);
  const items = L.sortRecords(s.items.filter((i) => i.programId === id), (i) => i.dueDate);
  const measures = s.measures.filter((m) => m.programId === id);
  const c = L.programCounts(s, id, today(), win());
  const daysLeft = L.daysUntil(p.targetDate, today());

  const wsRows = ws.map((w) => {
    const wi = items.filter((i) => i.workstreamId === w.id);
    const od = wi.filter((i) => L.itemFlag(i, today(), win()) === 'overdue').length;
    return `<tr><th scope="row" data-label="Workstream"><button type="button" class="link" data-action="edit-ws" data-id="${w.id}">${esc(w.name)}</button></th>
      <td data-label="Owner">${show(w.owner)}</td>
      <td data-label="Deliverables">${showML(w.deliverables)}</td>
      <td data-label="Open items" class="num">${wi.filter(L.isOpenItem).length}</td>
      <td data-label="Overdue" class="num ${od ? 'text-bad' : ''}">${od}</td></tr>`;
  }).join('');
  const itemRows = items.map((i) => `<tr class="${L.itemFlag(i, today(), win()) || ''}">
      <th scope="row" data-label="Item"><button type="button" class="link" data-action="edit-item" data-id="${i.id}">${esc(i.name)}</button> <span class="tag">${esc(i.kind)}</span> ${flagTag(i)}</th>
      <td data-label="Workstream">${esc(wsName(i.workstreamId)) || '<span class="muted">—</span>'}</td>
      <td data-label="Owner">${show(i.owner)}</td>
      <td data-label="Due">${dateCell(i.dueDate)}</td>
      <td data-label="Status">${statusBadge(i.status)}</td></tr>`).join('');
  const mRows = measures.map((m) => measureRow(m, false)).join('');

  return `${pageHead(esc(p.name), `${p.isDemo ? '<span class="tag demo">Fictional demo program</span> ' : ''}Program workspace`,
      `${btn('Edit program', 'edit-program', { id }, 'btn')} ${btn('Weekly status report', 'report-new', { program: id }, 'btn primary')}`)}
    <p class="breadcrumb"><a href="#/programs">Programs</a> / ${esc(p.name)}</p>
    <section class="card status-card">
      <div class="status-line">${healthBadge(p.status)} <span>${show(p.statusReason)}</span></div>
      <dl class="facts">
        <div><dt>Objective</dt><dd>${showML(p.objective)}</dd></div>
        <div><dt>Business outcome</dt><dd>${showML(p.outcome)}</dd></div>
        <div><dt>Executive sponsor</dt><dd>${show(p.sponsor)}</dd></div>
        <div><dt>TPM</dt><dd>${show(p.tpm)}</dd></div>
        <div><dt>Start date</dt><dd>${L.isISODate(p.startDate) ? fmtDate(p.startDate) : ne}</dd></div>
        <div><dt>Target date</dt><dd>${L.isISODate(p.targetDate) ? `${fmtDate(p.targetDate)} <span class="small muted">(${daysLeft >= 0 ? `${plural(daysLeft, 'day')} away` : `${plural(-daysLeft, 'day')} ago`})</span>` : ne}</dd></div>
      </dl>
      <ul class="mini-stats">
        <li><a href="#/roadmap" data-action="goto" data-preset="program-items" data-id="${id}"><b>${c.openItems}</b> open items</a></li>
        <li class="${c.overdue ? 'bad' : ''}"><b>${c.overdue}</b> overdue</li>
        <li><a href="#/raid" data-action="goto" data-preset="program-raid" data-id="${id}"><b>${c.openRaid}</b> open RAID</a></li>
        <li><a href="#/decisions" data-action="goto" data-preset="program-decisions" data-id="${id}"><b>${c.pendingDecisions}</b> pending decisions</a></li>
        <li><a href="#/stakeholders" data-action="goto" data-preset="program-stakeholders" data-id="${id}"><b>${s.stakeholders.filter((x) => x.programId === id).length}</b> stakeholders</a></li>
      </ul>
    </section>

    <div class="two-col">
      <section class="card"><h2>Key assumptions</h2><p>${showML(p.assumptions)}</p></section>
      <section class="card"><h2>Scope boundaries</h2>
        <h3 class="h-sm">In scope</h3><p>${showML(p.inScope)}</p>
        <h3 class="h-sm">Out of scope</h3><p>${showML(p.outOfScope)}</p></section>
    </div>

    <section class="card">
      <div class="panel-head"><h2>Workstreams</h2>${btn('Add workstream', 'new-ws', { program: id }, 'btn small')}</div>
      ${ws.length ? `<div class="table-wrap"><table class="data"><caption class="sr-only">Workstreams</caption><thead><tr><th scope="col">Workstream</th><th scope="col">Owner</th><th scope="col">Deliverables</th><th scope="col">Open items</th><th scope="col">Overdue</th></tr></thead><tbody>${wsRows}</tbody></table></div>`
        : '<p class="panel-empty">No workstreams yet. Workstreams group related deliverables under one owner.</p>'}
    </section>

    <section class="card">
      <div class="panel-head"><h2>Milestones &amp; actions</h2>
        <div class="btn-row">${btn('Add milestone', 'new-item', { program: id, kind: 'Milestone' }, 'btn small')} ${btn('Add action', 'new-item', { program: id, kind: 'Action' }, 'btn small ghost')}
        <button type="button" class="btn small ghost" data-action="goto" data-preset="program-items" data-id="${id}">Search &amp; filter in roadmap</button></div></div>
      ${items.length ? `<div class="table-wrap"><table class="data"><caption class="sr-only">Milestones and actions</caption><thead><tr><th scope="col">Item</th><th scope="col">Workstream</th><th scope="col">Owner</th><th scope="col">Due</th><th scope="col">Status</th></tr></thead><tbody>${itemRows}</tbody></table></div>`
        : '<p class="panel-empty">No milestones or actions yet.</p>'}
    </section>

    <section class="card">
      <div class="panel-head"><h2>Success measures</h2>${btn('Add measure', 'new-measure', { program: id }, 'btn small')}</div>
      ${measures.length ? measuresTable(mRows, false) : '<p class="panel-empty">No success measures yet. Add a baseline and target so progress can be reported.</p>'}
    </section>`;
}

function measureRow(m, withProgram = false) {
  const prog = L.measureProgress(m);
  const u = m.unit ? ` ${esc(m.unit)}` : '';
  const val = (v) => (blank(v) ? ne : `${esc(v)}${u}`);
  const hist = (m.history || []);
  const prev = hist.length > 1 ? hist[hist.length - 2] : null;
  const ago = L.daysUntil(m.updatedDate, today());
  return `<tr>
    <th scope="row" data-label="Measure"><button type="button" class="link" data-action="edit-measure" data-id="${m.id}">${esc(m.name)}</button>
      <div class="small muted">Better when it ${m.direction === 'decrease' ? 'goes down' : 'goes up'}</div></th>
    ${withProgram ? `<td data-label="Program">${esc(programName(m.programId))}</td>` : ''}
    <td data-label="Baseline">${val(m.baseline)}</td>
    <td data-label="Target">${val(m.target)}</td>
    <td data-label="Current"><b>${val(m.current)}</b>${prog !== null ? `<div class="progress-line"><meter min="0" max="100" value="${Math.max(0, Math.min(100, prog))}" aria-label="Progress toward target"></meter><span class="small">${prog}%</span></div>` : ''}</td>
    <td data-label="Previous">${prev ? `${esc(prev.value)}${u} <span class="small muted">(${fmtDate(prev.date)})</span>` : '<span class="muted">—</span>'}</td>
    <td data-label="Owner">${show(m.owner)}</td>
    <td data-label="Updated">${L.isISODate(m.updatedDate) ? `${fmtDate(m.updatedDate)}${ago !== null && ago < 0 ? ` <span class="small muted">(${plural(-ago, 'day')} ago)</span>` : ''}` : ne}</td>
  </tr>`;
}
function measuresTable(rowsHTML, withProgram) {
  return `<div class="table-wrap"><table class="data"><caption class="sr-only">Success measures</caption><thead><tr>
    <th scope="col">Measure</th>${withProgram ? '<th scope="col">Program</th>' : ''}<th scope="col">Baseline</th><th scope="col">Target</th><th scope="col">Current</th><th scope="col">Previous value</th><th scope="col">Owner</th><th scope="col">Updated</th>
    </tr></thead><tbody>${rowsHTML}</tbody></table></div>
    <p class="small muted">Progress % = (current − baseline) ÷ (target − baseline), shown only when all three are numbers.</p>`;
}

// ---------------------------------------------------------------- view: roadmap
const ITEM_COLS = [
  { key: 'name', label: 'Milestone / action', val: (i) => i.name, cell: (i) => {
    const warns = L.dependencyWarnings(i, st().items, today());
    return `<button type="button" class="link strong" data-action="edit-item" data-id="${i.id}">${esc(i.name)}</button> <span class="tag">${esc(i.kind)}</span> ${flagTag(i)}
      ${i.description ? `<div class="small muted">${esc(truncate(i.description))}</div>` : ''}
      ${warns.length ? `<div class="dep-warn" role="note"><span aria-hidden="true">⚠</span> ${warns.map(esc).join('; ')}</div>` : ''}`;
  } },
  { key: 'program', label: 'Program', val: (i) => programName(i.programId), cell: (i) => esc(programName(i.programId)) },
  { key: 'ws', label: 'Workstream', val: (i) => wsName(i.workstreamId), cell: (i) => esc(wsName(i.workstreamId)) || '<span class="muted">—</span>' },
  { key: 'owner', label: 'Owner', cell: (i) => show(i.owner) },
  { key: 'dueDate', label: 'Due', cell: (i) => dateCell(i.dueDate) },
  { key: 'status', label: 'Status', val: (i) => L.ITEM_STATUSES.indexOf(i.status), cell: (i) => statusBadge(i.status) },
  { key: 'priority', label: 'Priority', val: (i) => L.priorityRank(i.priority), cell: (i) => levelBadge(i.priority) },
  { key: 'deps', label: 'Depends on', sort: false, cell: (i) => chips((i.dependsOn || []).map((d) => itemById(d)?.name).filter(Boolean)) },
  { key: 'blockers', label: 'Blockers / next steps', sort: false, cell: (i) => `${i.blockers ? `<div><span class="lbl">Blocker:</span> ${esc(truncate(i.blockers, 90))}</div>` : ''}${i.nextSteps ? `<div><span class="lbl">Next:</span> ${esc(truncate(i.nextSteps, 90))}</div>` : ''}${!i.blockers && !i.nextSteps ? '<span class="muted">—</span>' : ''}` },
  { key: 'updatedAt', label: 'Last updated', val: (i) => i.updatedAt, cell: updatedCell },
];
function roadmapRows() {
  const f = ui.roadmap;
  return st().items.filter(inFocus).filter((i) => {
    if (f.kind && i.kind !== f.kind) return false;
    if (f.status === 'open' && !L.isOpenItem(i)) return false;
    if (f.status && f.status !== 'open' && i.status !== f.status) return false;
    if (f.priority && i.priority !== f.priority) return false;
    if (f.owner && i.owner !== f.owner) return false;
    if (f.ws && i.workstreamId !== f.ws) return false;
    const flag = L.itemFlag(i, today(), win());
    if (f.due === 'overdue' && flag !== 'overdue') return false;
    if (f.due === 'upcoming' && flag !== 'upcoming') return false;
    if (f.due === 'nodate' && L.isISODate(i.dueDate)) return false;
    return matches(f.q, i.name, i.description, i.owner, i.blockers, i.nextSteps, wsName(i.workstreamId));
  });
}
function viewRoadmap() {
  const s = st();
  const actions = `${btn('Add milestone', 'new-item', { kind: 'Milestone' }, 'btn primary')} ${btn('Add action', 'new-item', { kind: 'Action' }, 'btn')}`;
  const head = pageHead('Roadmap &amp; Milestones', 'Milestones are major checkpoints; actions are the tasks that move them. Track owners, dates, dependencies and blockers.', actions);
  if (!s.programs.length) return head + noProgramsBox();
  const f = ui.roadmap;
  const all = s.items.filter(inFocus);
  const cols = ITEM_COLS.filter((c) => !(focusId() && c.key === 'program'));
  const rows = applySort('roadmap', cols, roadmapRows());
  const owners = [...new Set(all.map((i) => i.owner).filter(Boolean))].sort();
  const wsOpts = s.workstreams.filter(inFocus).map((w) => ({ value: w.id, label: focusId() ? w.name : `${programName(w.programId)} › ${w.name}` }));
  const overdue = rows.filter((i) => L.itemFlag(i, today(), win()) === 'overdue').length;
  const soon = rows.filter((i) => L.itemFlag(i, today(), win()) === 'upcoming').length;

  const toolbar = `<div class="toolbar" role="search" aria-label="Filter milestones and actions">
      ${searchBox('roadmap', 'Name, owner, blocker…')}
      ${filterSelect('roadmap', 'kind', 'Type', L.ITEM_KINDS)}
      ${filterSelect('roadmap', 'status', 'Status', [{ value: 'open', label: 'Open (not Done/Cancelled)' }, ...L.ITEM_STATUSES])}
      ${filterSelect('roadmap', 'due', 'Due', [{ value: 'overdue', label: 'Overdue' }, { value: 'upcoming', label: `Due within ${win()} days` }, { value: 'nodate', label: 'No due date' }])}
      ${filterSelect('roadmap', 'priority', 'Priority', L.LEVELS)}
      ${filterSelect('roadmap', 'owner', 'Owner', owners)}
      ${filterSelect('roadmap', 'ws', 'Workstream', wsOpts)}
      <div class="filter filter-btns">${btn('Clear filters', 'clear-filters', { view: 'roadmap' }, 'btn ghost small')}</div>
    </div>`;
  const viewSwitch = `<div class="seg" role="group" aria-label="Display">
      <button type="button" class="seg-btn" data-action="set-ui" data-view="roadmap" data-key="mode" data-value="table" aria-pressed="${f.mode === 'table'}">Table</button>
      <button type="button" class="seg-btn" data-action="set-ui" data-view="roadmap" data-key="mode" data-value="timeline" aria-pressed="${f.mode === 'timeline'}">Timeline by month</button></div>`;
  const tools = `<div class="subbar">${viewSwitch}<div class="btn-row">
      ${btn('Import CSV', 'import-items-csv', {}, 'btn ghost small')} ${btn('CSV template', 'csv-template', {}, 'btn ghost small')} ${btn('Export CSV', 'export-csv', { kind: 'items' }, 'btn ghost small')}</div></div>`;
  const summary = `<p class="result-count" aria-live="polite">Showing ${rows.length} of ${all.length} · <span class="text-bad">${overdue} overdue</span> · <span class="text-warn">${soon} due within ${win()} days</span></p>`;

  let body;
  if (!all.length) {
    body = emptyBox('No milestones or actions yet', 'Add your first milestone, import a CSV, or create a program from a template to get a starter set.',
      `${btn('Add milestone', 'new-item', { kind: 'Milestone' }, 'btn primary')} ${btn('Import CSV', 'import-items-csv', {}, 'btn')}`);
  } else if (!rows.length) {
    body = emptyBox('No items match these filters', 'Try clearing a filter or the search box.', btn('Clear filters', 'clear-filters', { view: 'roadmap' }, 'btn'));
  } else if (f.mode === 'timeline') {
    body = timelineHTML(rows);
  } else {
    body = dataTable('roadmap', cols, rows, { caption: 'Milestones and actions', cls: 'items-table', rowClass: (i) => L.itemFlag(i, today(), win()) || '' });
  }
  return `${head}${focusNote()}${toolbar}${tools}${summary}${body}
    <p class="legend small"><span class="flag flag-overdue">Overdue</span> due date before today and not Done/Cancelled ·
      <span class="flag flag-soon">Due soon</span> due within ${win()} days · <span aria-hidden="true">⚠</span> dependency warning. <a href="#/help">How flags work</a></p>`;
}
function timelineHTML(rows) {
  const groups = new Map();
  L.sortRecords(rows, (i) => i.dueDate).forEach((i) => {
    const k = L.isISODate(i.dueDate) ? i.dueDate.slice(0, 7) : 'none';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });
  const monthLabel = (k) => (k === 'none' ? 'No due date' : new Date(k + '-01T00:00:00Z').toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }));
  const curMonth = today().slice(0, 7);
  return `<ol class="timeline">${[...groups.entries()].map(([k, list]) => `<li class="tl-month${k === curMonth ? ' current' : ''}">
      <h2 class="tl-head">${monthLabel(k)}${k === curMonth ? ' <span class="tag">This month</span>' : ''}</h2>
      <ul class="tl-items">${list.map((i) => `<li class="tl-item ${L.itemFlag(i, today(), win()) || ''} kind-${i.kind.toLowerCase()}">
        <span class="tl-date">${L.isISODate(i.dueDate) ? fmtDate(i.dueDate) : '—'}</span>
        <div class="tl-body"><button type="button" class="link strong" data-action="edit-item" data-id="${i.id}">${esc(i.name)}</button> <span class="tag">${esc(i.kind)}</span> ${flagTag(i)}
          <div class="small muted">${focusId() ? '' : `${esc(programName(i.programId))} · `}${esc(wsName(i.workstreamId) || 'No workstream')} · ${show(i.owner)}</div></div>
        <div class="tl-status">${statusBadge(i.status)}</div></li>`).join('')}</ul></li>`).join('')}</ol>`;
}

// ---------------------------------------------------------------- view: RAID
const RAID_COLS = [
  { key: 'type', label: 'Type', cell: (r) => `<span class="tag raid-${r.type.toLowerCase()}">${esc(r.type)}</span>` },
  { key: 'title', label: 'Title', cell: (r) => `<button type="button" class="link strong" data-action="edit-raid" data-id="${r.id}">${esc(r.title)}</button>${L.raidFlag(r, today()) === 'overdue' ? ' <span class="flag flag-overdue">Past due</span>' : ''}${r.description ? `<div class="small muted">${esc(truncate(r.description))}</div>` : ''}` },
  { key: 'program', label: 'Program', val: (r) => programName(r.programId), cell: (r) => esc(programName(r.programId)) },
  { key: 'owner', label: 'Owner', cell: (r) => show(r.owner) },
  { key: 'impact', label: 'Impact', val: (r) => L.priorityRank(r.impact), cell: (r) => levelBadge(r.impact) },
  { key: 'likelihood', label: 'Likelihood', val: (r) => L.priorityRank(r.likelihood), cell: (r) => levelBadge(r.likelihood) },
  { key: 'priority', label: 'Priority', val: (r) => L.priorityRank(r.priority), cell: (r) => levelBadge(r.priority) },
  { key: 'dueDate', label: 'Due', cell: (r) => dateCell(r.dueDate) },
  { key: 'mitigation', label: 'Mitigation / next action', sort: false, cell: (r) => show(truncate(r.mitigation, 140)) },
  { key: 'status', label: 'Status', cell: (r) => statusBadge(r.status) },
  { key: 'link', label: 'Linked to', sort: false, cell: (r) => [wsName(r.workstreamId), itemById(r.itemId)?.name].filter(Boolean).map(esc).join('<br>') || '<span class="muted">—</span>' },
  { key: 'updatedAt', label: 'Last updated', cell: updatedCell },
];
function raidRows() {
  const f = ui.raid;
  return st().raid.filter(inFocus).filter((r) => {
    if (f.type && r.type !== f.type) return false;
    if (f.status === 'open' && !L.isOpenRaid(r)) return false;
    if (f.status && f.status !== 'open' && r.status !== f.status) return false;
    if (f.level === 'high' && !L.isHighRaid(r)) return false;
    if (f.level === 'overdue' && L.raidFlag(r, today()) !== 'overdue') return false;
    return matches(f.q, r.title, r.description, r.owner, r.mitigation);
  });
}
function viewRaid() {
  const s = st();
  const head = pageHead('RAID Log', 'Risks, Assumptions, Issues and Dependencies in one place, each with an owner and next action.', btn('Add RAID record', 'new-raid', {}, 'btn primary'));
  if (!s.programs.length) return head + noProgramsBox();
  const all = s.raid.filter(inFocus);
  const cols = RAID_COLS.filter((c) => !(focusId() && c.key === 'program'));
  const rows = applySort('raid', cols, raidRows());
  const defs = `<details class="defs card"${all.length ? '' : ' open'}><summary>What goes in a RAID log?</summary>
      <dl class="def-grid">
        <div><dt>Risk</dt><dd>Something that <em>might</em> happen and would hurt delivery. Record likelihood, impact and a mitigation.</dd></div>
        <div><dt>Assumption</dt><dd>Something you are treating as true without proof. Record how and when you will validate it.</dd></div>
        <div><dt>Issue</dt><dd>A problem that is happening <em>now</em>. Record the impact and the next action to resolve it.</dd></div>
        <div><dt>Dependency</dt><dd>Work or a decision from another team or system that you need. Record who provides it and by when.</dd></div>
      </dl></details>`;
  const toolbar = `<div class="toolbar" role="search" aria-label="Filter RAID log">
      ${searchBox('raid', 'Title, owner, mitigation…')}
      ${filterSelect('raid', 'type', 'Type', L.RAID_TYPES)}
      ${filterSelect('raid', 'status', 'Status', [{ value: 'open', label: 'Not Closed' }, ...L.RAID_STATUSES])}
      ${filterSelect('raid', 'level', 'Flag', [{ value: 'high', label: 'High priority or impact' }, { value: 'overdue', label: 'Past due date' }])}
      <div class="filter filter-btns">${btn('Clear filters', 'clear-filters', { view: 'raid' }, 'btn ghost small')} ${btn('Export CSV', 'export-csv', { kind: 'raid' }, 'btn ghost small')}</div>
    </div>`;
  const counts = L.RAID_TYPES.map((t) => `${all.filter((r) => r.type === t && L.isOpenRaid(r)).length} open ${t.toLowerCase()}${t === 'Dependency' ? '' : ''}`).join(' · ');
  let body;
  if (!all.length) body = emptyBox('Your RAID log is empty', 'Add the risks, assumptions, issues and dependencies that could affect delivery. Templates include a few generic starters.', btn('Add RAID record', 'new-raid', {}, 'btn primary'));
  else if (!rows.length) body = emptyBox('No RAID records match these filters', 'Try clearing a filter or the search box.', btn('Clear filters', 'clear-filters', { view: 'raid' }, 'btn'));
  else body = dataTable('raid', cols, rows, { caption: 'RAID log', rowClass: (r) => `${L.isHighRaid(r) ? 'high' : ''} ${L.raidFlag(r, today()) || ''}` });
  return `${head}${focusNote()}${defs}${toolbar}<p class="result-count" aria-live="polite">Showing ${rows.length} of ${all.length} · ${counts}</p>${body}`;
}

// ---------------------------------------------------------------- view: decisions
const DEC_COLS = [
  { key: 'title', label: 'Decision needed', cell: (d) => `<button type="button" class="link strong" data-action="edit-decision" data-id="${d.id}">${esc(d.title)}</button>${d.options ? `<div class="small muted"><span class="lbl">Options:</span> ${esc(truncate(d.options.replace(/\n/g, ' · '), 160))}</div>` : ''}` },
  { key: 'program', label: 'Program', val: (d) => programName(d.programId), cell: (d) => esc(programName(d.programId)) },
  { key: 'owner', label: 'Decision owner', cell: (d) => show(d.owner) },
  { key: 'dateRaised', label: 'Raised', cell: (d) => dateCell(d.dateRaised) },
  { key: 'neededBy', label: 'Needed by', cell: (d) => {
    const late = d.status === 'Pending' && L.daysUntil(d.neededBy, today()) !== null && L.daysUntil(d.neededBy, today()) < 0;
    return `${dateCell(d.neededBy)}${late ? ' <span class="flag flag-overdue">Past due</span>' : ''}`;
  } },
  { key: 'status', label: 'Status', cell: (d) => statusBadge(d.status) },
  { key: 'finalDecision', label: 'Final decision & rationale', sort: false, cell: (d) => (d.status === 'Decided'
    ? `${showML(d.finalDecision)}${d.rationale ? `<div class="small muted"><span class="lbl">Why:</span> ${esc(truncate(d.rationale, 140))}</div>` : ''}${d.decidedDate ? `<div class="small muted">Decided ${fmtDate(d.decidedDate)}</div>` : ''}`
    : '<span class="muted">Not decided yet</span>') },
  { key: 'impact', label: 'Impact & follow-up', sort: false, cell: (d) => `${d.impact ? `<div>${esc(truncate(d.impact, 120))}</div>` : ''}${d.followUp ? `<div class="small"><span class="lbl">Follow-up:</span> ${esc(truncate(d.followUp, 120))}</div>` : ''}${!d.impact && !d.followUp ? ne : ''}` },
];
function decisionRows() {
  const f = ui.decisions;
  return st().decisions.filter(inFocus).filter((d) => (!f.status || d.status === f.status)
    && matches(f.q, d.title, d.owner, d.options, d.finalDecision, d.rationale, d.impact, d.followUp));
}
function viewDecisions() {
  const s = st();
  const head = pageHead('Decisions', 'A log of decisions needed and made: who decides, the options, the outcome and why.', btn('Log a decision', 'new-decision', {}, 'btn primary'));
  if (!s.programs.length) return head + noProgramsBox();
  const all = s.decisions.filter(inFocus);
  const cols = DEC_COLS.filter((c) => !(focusId() && c.key === 'program'));
  const rows = applySort('decisions', cols, decisionRows());
  const toolbar = `<div class="toolbar" role="search" aria-label="Filter decisions">
      ${searchBox('decisions', 'Decision, owner, rationale…')}
      ${filterSelect('decisions', 'status', 'Status', L.DECISION_STATUSES)}
      <div class="filter filter-btns">${btn('Clear filters', 'clear-filters', { view: 'decisions' }, 'btn ghost small')} ${btn('Export CSV', 'export-csv', { kind: 'decisions' }, 'btn ghost small')}</div></div>`;
  let body;
  if (!all.length) body = emptyBox('No decisions logged yet', 'Log decisions that need an owner and a date, and record the outcome and rationale once made. Pending decisions appear on the overview and in status reports.', btn('Log a decision', 'new-decision', {}, 'btn primary'));
  else if (!rows.length) body = emptyBox('No decisions match these filters', 'Try clearing a filter or the search box.', btn('Clear filters', 'clear-filters', { view: 'decisions' }, 'btn'));
  else body = dataTable('decisions', cols, rows, { caption: 'Decision log', rowClass: (d) => (d.status === 'Pending' ? 'pending' : '') });
  const pending = all.filter((d) => d.status === 'Pending').length;
  return `${head}${focusNote()}${toolbar}<p class="result-count" aria-live="polite">Showing ${rows.length} of ${all.length} · ${pending} pending</p>${body}`;
}

// ---------------------------------------------------------------- view: stakeholders & RACI
const SH_COLS = [
  { key: 'name', label: 'Name', cell: (x) => `<button type="button" class="link strong" data-action="edit-stakeholder" data-id="${x.id}">${esc(x.name)}</button>` },
  { key: 'role', label: 'Role', cell: (x) => show(x.role) },
  { key: 'team', label: 'Team', cell: (x) => show(x.team) },
  { key: 'program', label: 'Program', val: (x) => programName(x.programId), cell: (x) => (x.programId ? esc(programName(x.programId)) : '<span class="muted">Shared</span>') },
  { key: 'responsibilities', label: 'Responsibilities', sort: false, cell: (x) => show(truncate(x.responsibilities, 160)) },
  { key: 'cadence', label: 'Cadence', val: (x) => CADENCES.indexOf(x.cadence), cell: (x) => show(x.cadence) },
  { key: 'notes', label: 'Notes', sort: false, cell: (x) => (x.notes ? esc(truncate(x.notes, 120)) : '<span class="muted">—</span>') },
];
function stakeholderRows() {
  const q = ui.stakeholders.q;
  return st().stakeholders.filter((x) => !focusId() || !x.programId || x.programId === focusId())
    .filter((x) => matches(q, x.name, x.role, x.team, x.responsibilities, x.notes));
}
function viewStakeholders() {
  const s = st();
  const tab = ui.stakeholders.tab;
  const head = pageHead('Stakeholders &amp; RACI', 'Who is involved, how often to communicate with them, and who is Responsible, Accountable, Consulted and Informed.',
    tab === 'register' ? btn('Add stakeholder', 'new-stakeholder', {}, 'btn primary') : btn('Add RACI row', 'new-raci', {}, 'btn primary'));
  const tabs = `<div class="tabs" role="tablist" aria-label="Stakeholder views">
      <button type="button" role="tab" id="tab-register" aria-selected="${tab === 'register'}" aria-controls="panel-stake" data-action="set-ui" data-view="stakeholders" data-key="tab" data-value="register">Stakeholder register</button>
      <button type="button" role="tab" id="tab-raci" aria-selected="${tab === 'raci'}" aria-controls="panel-stake" data-action="set-ui" data-view="stakeholders" data-key="tab" data-value="raci">RACI matrix${raciGapCount() ? ` <span class="count-pill bad">${raciGapCount()}</span>` : ''}</button></div>`;
  let body;
  if (tab === 'register') {
    const all = s.stakeholders.filter((x) => !focusId() || !x.programId || x.programId === focusId());
    const cols = SH_COLS.filter((c) => !(focusId() && c.key === 'program'));
    const rows = applySort('stakeholders', cols, stakeholderRows());
    body = `<div class="toolbar" role="search" aria-label="Filter stakeholders">${searchBox('stakeholders', 'Name, role, team…')}
      <div class="filter filter-btns">${btn('Export CSV', 'export-csv', { kind: 'stakeholders' }, 'btn ghost small')}</div></div>
      ${!all.length ? emptyBox('No stakeholders yet', 'Record sponsors, leads, partner teams and consumers, with their responsibilities and how often you update them.', btn('Add stakeholder', 'new-stakeholder', {}, 'btn primary'))
        : !rows.length ? emptyBox('No stakeholders match your search', 'Try a different search.', '')
          : dataTable('stakeholders', cols, rows, { caption: 'Stakeholder register' })}`;
  } else {
    body = raciHTML();
  }
  return `${head}${focusNote()}${tabs}<div id="panel-stake" role="tabpanel" aria-labelledby="tab-${tab}">${body}</div>`;
}
const raciGapCount = () => st().raci.filter((r) => inFocus(r) && L.raciFlags(r).noA).length;
function raciHTML() {
  const s = st();
  if (!s.programs.length) return noProgramsBox();
  const rows = s.raci.filter(inFocus);
  const legend = `<dl class="raci-legend">
      <div><dt><span class="raci-key r">R</span> Responsible</dt><dd>Does the work.</dd></div>
      <div><dt><span class="raci-key a">A</span> Accountable</dt><dd>Owns the outcome and signs off. Ideally exactly one.</dd></div>
      <div><dt><span class="raci-key c">C</span> Consulted</dt><dd>Gives input before the work is done.</dd></div>
      <div><dt><span class="raci-key i">I</span> Informed</dt><dd>Kept up to date after.</dd></div></dl>`;
  if (!rows.length) return legend + emptyBox('No RACI rows yet', 'Add the key activities and deliverables, then assign people or teams. Rows without an Accountable owner are flagged.', btn('Add RACI row', 'new-raci', {}, 'btn primary'));
  const gaps = rows.filter((r) => L.raciFlags(r).noA).length;
  const multi = rows.filter((r) => L.raciFlags(r).multiA).length;
  const programIds = [...new Set(rows.map((r) => r.programId))];
  const groups = programIds.map((pid) => {
    const list = L.sortRecords(rows.filter((r) => r.programId === pid), (r) => r.activity);
    return `<section class="card raci-group"><h2>${esc(programName(pid))}</h2>
      <div class="table-wrap"><table class="data raci-table"><caption class="sr-only">RACI for ${esc(programName(pid))}</caption>
      <thead><tr><th scope="col">Activity / deliverable</th><th scope="col"><abbr title="Responsible">R</abbr></th><th scope="col"><abbr title="Accountable">A</abbr></th><th scope="col"><abbr title="Consulted">C</abbr></th><th scope="col"><abbr title="Informed">I</abbr></th></tr></thead>
      <tbody>${list.map((r) => {
        const fl = L.raciFlags(r);
        return `<tr class="${fl.noA ? 'raci-gap' : ''}"><th scope="row" data-label="Activity"><button type="button" class="link strong" data-action="edit-raci" data-id="${r.id}">${esc(r.activity)}</button> <span class="tag">${esc(r.kind || 'Activity')}</span>
          ${fl.noA ? '<div class="flag flag-overdue">No Accountable owner</div>' : ''}${fl.multiA ? '<div class="flag flag-soon">More than one Accountable</div>' : ''}${fl.noR ? '<div class="small muted">No one Responsible yet</div>' : ''}</th>
          ${L.RACI_ROLES.map((k) => `<td data-label="${k}">${chips(r[k])}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table></div></section>`;
  }).join('');
  return `${legend}<div class="subbar"><p class="result-count" aria-live="polite">${plural(rows.length, 'row')} · <span class="${gaps ? 'text-bad' : ''}">${gaps} without an Accountable owner</span> · ${multi} with more than one</p>
    <div class="btn-row">${btn('Export CSV', 'export-csv', { kind: 'raci' }, 'btn ghost small')}</div></div>${groups}`;
}

// ---------------------------------------------------------------- view: metrics & reports
function viewReports() {
  const s = st();
  const tab = ui.reports.tab;
  const head = pageHead('Metrics &amp; Status Reports', 'Keep success measures current and build the weekly executive status report from your program data.');
  const tabs = `<div class="tabs" role="tablist" aria-label="Metrics and reports">
      <button type="button" role="tab" id="tab-reports" aria-selected="${tab === 'reports'}" aria-controls="panel-reports" data-action="set-ui" data-view="reports" data-key="tab" data-value="reports">Weekly status reports</button>
      <button type="button" role="tab" id="tab-measures" aria-selected="${tab === 'measures'}" aria-controls="panel-reports" data-action="set-ui" data-view="reports" data-key="tab" data-value="measures">Success measures</button></div>`;
  if (!s.programs.length) return head + noProgramsBox();
  const body = tab === 'measures' ? measuresTab() : reportsTab();
  return `${head}${focusNote()}${tabs}<div id="panel-reports" role="tabpanel" aria-labelledby="tab-${tab}">${body}</div>`;
}
function measureRowsFiltered() {
  const q = ui.measures.q;
  return st().measures.filter(inFocus).filter((m) => matches(q, m.name, m.owner, m.notes, programName(m.programId)));
}
function measuresTab() {
  const all = st().measures.filter(inFocus);
  const rows = L.sortRecords(measureRowsFiltered(), (m) => m.updatedDate, 'desc');
  return `<div class="toolbar" role="search" aria-label="Filter measures">${searchBox('measures', 'Measure, owner, program…')}
      <div class="filter filter-btns">${btn('Add measure', 'new-measure', {}, 'btn primary small')} ${btn('Export CSV', 'export-csv', { kind: 'measures' }, 'btn ghost small')}</div></div>
    ${!all.length ? emptyBox('No success measures yet', 'Success measures show whether the program is delivering its business outcome. Record a baseline, a target and the current value.', btn('Add measure', 'new-measure', {}, 'btn primary'))
      : !rows.length ? emptyBox('No measures match your search', '', '')
        : `<p class="result-count">Most recently updated first. Select a measure to update its current value.</p>${measuresTable(rows.map((m) => measureRow(m, !focusId())).join(''), !focusId())}`}`;
}
function reportsTab() {
  const s = st();
  let pid = focusId() || ui.reports.programId || s.programs[0].id;
  if (!s.programs.some((p) => p.id === pid)) pid = s.programs[0].id;
  ui.reports.programId = pid;
  const p = s.programs.find((x) => x.id === pid);
  const saved = L.sortRecords(s.reports.filter((r) => r.programId === pid), (r) => r.weekEnding, 'desc');
  const picker = `<div class="toolbar"><div class="filter"><label for="rep-program">Program</label>
      <select id="rep-program" data-bind="reports.programId">${s.programs.filter((x) => !focusId() || x.id === focusId()).map((x) => `<option value="${x.id}"${x.id === pid ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="filter filter-btns">${btn("Start this week's report", 'report-new', { program: pid }, 'btn primary')}</div></div>
    <p class="small muted">The draft is built only from what is recorded for this program. Anything missing shows “${NE}” so you can fill it in. Nothing is invented.</p>`;
  const list = saved.length
    ? `<section class="card"><h2>Saved reports for ${esc(p.name)}</h2><div class="table-wrap"><table class="data"><caption class="sr-only">Saved reports</caption>
        <thead><tr><th scope="col">Week ending</th><th scope="col">Health</th><th scope="col">Prepared by</th><th scope="col">Last saved</th><th scope="col">Actions</th></tr></thead>
        <tbody>${saved.map((r) => `<tr><th scope="row" data-label="Week ending">${fmtDate(r.weekEnding)}${r.isDemo ? ' <span class="tag demo">Demo</span>' : ''}</th>
          <td data-label="Health">${healthBadge(r.health)}</td><td data-label="Prepared by">${show(r.preparedBy)}</td><td data-label="Last saved">${updatedCell(r)}</td>
          <td data-label="Actions"><div class="btn-row">${btn('Open', 'report-open', { id: r.id }, 'btn small')} ${btn('Markdown', 'report-saved-md', { id: r.id }, 'btn ghost small')} ${btn('CSV', 'report-saved-csv', { id: r.id }, 'btn ghost small')} ${btn('Delete', 'report-delete', { id: r.id }, 'btn danger-ghost small')}</div></td></tr>`).join('')}</tbody></table></div></section>`
    : `<p class="panel-empty">No saved reports for this program yet. Saved reports are used to show “changes since last report”.</p>`;
  const draft = ui.reports.draft && ui.reports.draft.programId === pid ? reportEditor(ui.reports.draft, p) : '';
  return picker + draft + list;
}
function reportEditor(d, p) {
  const rows = (t) => Math.min(14, Math.max(3, String(t || '').split('\n').length + 1));
  return `<section class="card report-editor" aria-labelledby="re-h">
    <div class="panel-head"><h2 id="re-h">${d.id ? 'Edit saved report' : 'New report draft'}: ${esc(p.name)}</h2>${btn('Close draft', 'report-close', {}, 'btn ghost small')}</div>
    <p class="hint">Edit any section before exporting. Sections that say “${NE}” had no matching data in the app. Replace them with your update, or leave them so readers know. ${d.id ? '' : '<strong>Not saved yet.</strong>'}</p>
    <div class="form-grid">
      <div class="field"><label for="rd-week">Week ending</label><input id="rd-week" type="date" data-draft="weekEnding" value="${esc(d.weekEnding)}"></div>
      <div class="field"><label for="rd-start">Reporting period starts</label><input id="rd-start" type="date" data-draft="periodStart" value="${esc(d.periodStart)}"></div>
      <div class="field"><label for="rd-by">Prepared by</label><input id="rd-by" type="text" data-draft="preparedBy" value="${esc(d.preparedBy)}" placeholder="${NE}"></div>
      <div class="field"><label for="rd-health">Overall health</label><select id="rd-health" data-draft="health"><option value="">${NE}</option>${L.HEALTH.map((h) => `<option${d.health === h ? ' selected' : ''}>${h}</option>`).join('')}</select></div>
      <div class="field full"><label for="rd-reason">Health reason</label><textarea id="rd-reason" rows="2" data-draft="healthReason" placeholder="${NE}">${esc(d.healthReason)}</textarea></div>
      ${L.REPORT_SECTIONS.map((sec) => `<div class="field full"><label for="rd-${sec.key}">${sec.label}</label>
        <textarea id="rd-${sec.key}" rows="${rows(d.sections[sec.key])}" data-draft="sections.${sec.key}" placeholder="${sec.key === 'notes' ? 'Optional' : NE}">${esc(d.sections[sec.key])}</textarea></div>`).join('')}
    </div>
    <p class="small muted">Rebuild re-reads current program data for the dates above and replaces all section text, including your edits.</p>
    <div class="btn-row report-actions">
      ${btn('Save report', 'report-save', {}, 'btn primary')}
      ${btn('Export Markdown', 'report-md', {}, 'btn')}
      ${btn('Export CSV', 'report-csv', {}, 'btn')}
      ${inArtifact() ? '' : btn('Print / Save as PDF', 'report-print', {}, 'btn')}
      ${btn('Copy as Markdown', 'report-copy', {}, 'btn ghost')}
      ${btn('Rebuild from current data', 'report-rebuild', {}, 'btn ghost')}
    </div></section>`;
}
function newDraft(programId, extra = {}) {
  return L.buildReportDraft(st(), programId, { today: today(), upcomingDays: win(), ...extra });
}

// ---------------------------------------------------------------- view: templates
const allTemplates = () => [...BUILTIN_TEMPLATES, ...st().customTemplates];
function viewTemplates() {
  const cards = allTemplates().map((t) => `<article class="card template-card">
      <div class="program-card-head"><h2>${esc(t.name)}</h2><span class="tag">${t.builtIn ? esc(t.area) : 'My template'}</span></div>
      <p>${esc(t.description || '')}</p>
      <p class="small muted">${plural(t.workstreams.length, 'workstream')} · ${plural(t.milestones.length, 'milestone')} · ${plural(t.measures.length, 'success measure')} · ${plural(t.raid.length, 'RAID starter')} · ${plural(t.raci.length, 'RACI activity', 'RACI activities')}</p>
      <details><summary>Preview contents</summary>
        <h3 class="h-sm">Workstreams</h3><ul>${t.workstreams.map((w) => `<li>${esc(w.name)}</li>`).join('')}</ul>
        <h3 class="h-sm">Milestones</h3><ul>${t.milestones.map((m) => `<li>${m.week ? `Week ${m.week}: ` : ''}${esc(m.name)}</li>`).join('')}</ul>
        <h3 class="h-sm">Success measures (values start blank)</h3><ul>${t.measures.map((m) => `<li>${esc(m.name)}${m.unit ? ` (${esc(m.unit)})` : ''}</li>`).join('')}</ul>
        <h3 class="h-sm">RAID starters</h3><ul>${t.raid.map((r) => `<li>${esc(r.type)}: ${esc(r.title)}</li>`).join('')}</ul>
        <h3 class="h-sm">RACI activities</h3><ul>${t.raci.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      </details>
      <div class="card-actions">${btn('Use this template', 'use-template', { id: t.id }, 'btn primary small')}${t.builtIn ? '' : btn('Delete', 'delete-template', { id: t.id }, 'btn danger-ghost small')}</div>
    </article>`).join('');
  return `${pageHead('Templates', 'Optional starting points for common TPM program types. You can edit everything before and after creating the program.')}
    <div class="callout">Templates are generic. They contain no company, client, vendor or project information, and success measures start with no values. Milestone dates are optional placeholders calculated from your start date.</div>
    <div class="card-grid">${cards}</div>`;
}
function templateForm(t) {
  const txt = templateToText(t);
  openForm({
    title: `New program from: ${t.name}`,
    intro: 'Edit anything below. Format hints are under each box. Items are created as normal records you can change later.',
    values: { name: '', tpm: '', sponsor: '', startDate: today(), targetDate: '', setDates: true, ...txt, saveAs: false, saveName: '' },
    fields: [
      { name: 'name', label: 'Program name', required: true, full: true },
      { name: 'tpm', label: 'TPM' },
      { name: 'sponsor', label: 'Executive sponsor' },
      { name: 'startDate', label: 'Start date', type: 'date' },
      { name: 'targetDate', label: 'Target date', type: 'date' },
      { name: 'setDates', label: 'Set placeholder milestone dates from the start date (start + N weeks)', type: 'checkbox', full: true },
      { name: 'workstreams', label: 'Workstreams', type: 'textarea', rows: 5, full: true, help: 'One per line: <code>Name | deliverable; deliverable</code>' },
      { name: 'milestones', label: 'Milestones', type: 'textarea', rows: 6, full: true, help: 'One per line: <code>Week N | Milestone name | Workstream name</code>. Leave out “Week N” for no date.' },
      { name: 'measures', label: 'Success measures', type: 'textarea', rows: 4, full: true, help: 'One per line: <code>Measure | unit | increase or decrease</code>. Values start blank.' },
      { name: 'raid', label: 'RAID starters', type: 'textarea', rows: 3, full: true, help: 'One per line: <code>Risk | title</code> (or Assumption, Issue, Dependency).' },
      { name: 'raci', label: 'RACI activities', type: 'textarea', rows: 4, full: true, help: 'One activity per line. Assign people afterwards.' },
      { name: 'saveAs', label: 'Also save these lists as my own reusable template', type: 'checkbox', full: true },
      { name: 'saveName', label: 'My template name', full: true, placeholder: `${t.name} (my version)` },
    ],
    validate: (v) => (v.startDate && v.targetDate && v.targetDate < v.startDate ? { message: 'Target date must be on or after the start date.', field: 'targetDate' } : null),
    submitLabel: 'Create program',
    onSave: (v) => {
      const parsed = parseTemplateText(v);
      const prog = S.upsert('programs', { name: v.name, tpm: v.tpm, sponsor: v.sponsor, startDate: v.startDate, targetDate: v.targetDate, status: '', statusReason: '', template: t.name });
      const recs = instantiateTemplate(parsed, { programId: prog.id, startDate: v.startDate, setDates: v.setDates, makeId: S.newId });
      ['workstreams', 'items', 'measures', 'raid', 'raci'].forEach((c) => recs[c].length && S.insertMany(c, recs[c]));
      if (v.saveAs) {
        S.upsert('customTemplates', { ...parsed, name: v.saveName || `${t.name} (my version)`, area: t.area || 'Custom', description: `Based on ${t.name}.`, builtIn: false });
      }
      toast(`Program created from template${v.saveAs ? ' and your template was saved' : ''}. Review dates and owners next.`);
      location.hash = `#/programs/${prog.id}`;
    },
  });
}

// ---------------------------------------------------------------- view: data & privacy
function viewData() {
  const s = st();
  const counts = [['Programs', 'programs'], ['Workstreams', 'workstreams'], ['Milestones & actions', 'items'], ['RAID records', 'raid'], ['Decisions', 'decisions'], ['Stakeholders', 'stakeholders'], ['RACI rows', 'raci'], ['Success measures', 'measures'], ['Saved reports', 'reports'], ['My templates', 'customTemplates']];
  const kb = (S.storageBytes() / 1024).toFixed(1);
  const demo = S.hasDemo();
  return `${pageHead('Data &amp; Privacy', 'Where your information is stored and how to back it up, move it, or delete it.')}
    <section class="card">
      <h2>Where your data is stored</h2>
      <ul class="plain">
        <li>Everything you enter is saved in this browser's <strong>local storage</strong> on this device, under the key <code>${S.STORAGE_KEY}</code>.</li>
        <li>There is no sign-in, no server database, no cloud sync, no analytics and no AI service. The app makes no network requests after loading its own files.</li>
        <li>Data does not move between browsers or devices. Use <strong>Export backup</strong> to move it, and keep backups of anything important; clearing browser data erases it.</li>
        <li>Anyone with access to this browser profile can open the app and see the data. Avoid confidential or regulated information, and follow your organization's data policies.</li>
      </ul>
      <p class="small muted">Currently using about ${kb} KB. ${S.isStorageAvailable() ? 'Saving is working.' : '<strong class="text-bad">Saving is not available in this browser session.</strong>'}</p>
    </section>

    <div class="two-col">
      <section class="card">
        <h2>Back up and restore</h2>
        <p>The backup is a single JSON file containing all programs and records.</p>
        <div class="btn-row">${btn('Export backup (JSON)', 'data-export', {}, 'btn primary')} ${btn('Import backup…', 'data-import', {}, 'btn')}</div>
        <p class="small muted">Import lets you choose to merge with existing data (records with the same ID are skipped) or replace everything.</p>
      </section>
      <section class="card">
        <h2>Fictional demo data</h2>
        <p>Three invented programs at a fictional company, with people marked “(fictional)”. Every demo record is tagged so it can be removed without touching your own data.</p>
        <div class="btn-row">${demo ? btn('Remove demo data', 'remove-demo', {}, 'btn') : btn('Load demo data', 'load-demo', {}, 'btn')}</div>
      </section>
    </div>

    <section class="card">
      <h2>What is stored</h2>
      <dl class="count-grid">${counts.map(([l, k]) => `<div><dt>${l}</dt><dd>${s[k].length}</dd></div>`).join('')}</dl>
    </section>

    <section class="card">
      <h2>Settings</h2>
      <form class="inline-form" data-form="settings">
        <div class="field"><label for="set-upcoming">“Due soon” window (days)</label>
          <input id="set-upcoming" type="number" min="1" max="90" step="1" value="${win()}" aria-describedby="set-upcoming-help">
          <p class="help" id="set-upcoming-help">Open items due within this many days are highlighted as due soon and counted on the overview. Default 14.</p></div>
        <button type="submit" class="btn">Save setting</button>
      </form>
    </section>

    <section class="card danger-zone">
      <h2>Delete all data</h2>
      <p>Permanently removes every program and record from this browser. Export a backup first if you might need it.</p>
      ${btn('Delete all data…', 'delete-all', {}, 'btn danger')}
    </section>`;
}

// ---------------------------------------------------------------- view: help
function viewHelp() {
  const terms = [
    ['Program', 'A coordinated set of workstreams delivering a shared business outcome, usually across several teams.'],
    ['Workstream', 'A group of related work under one owner, such as “Integration & pipelines”.'],
    ['Milestone', 'A significant, dated checkpoint, such as “Design approved” or “Go-live”.'],
    ['Action', 'A specific task with an owner that moves a milestone forward.'],
    ['Dependency (between items)', 'Item B depends on item A when B cannot finish until A is done.'],
    ['RAID log', 'A register of Risks (might happen), Assumptions (believed true, unproven), Issues (happening now) and Dependencies (needed from others).'],
    ['Impact / likelihood / priority', 'High, Medium or Low. Impact is how bad the effect would be; likelihood is how probable a risk is; priority is how urgently you will act.'],
    ['Mitigation', 'The action that reduces a risk’s likelihood or impact, or resolves an issue.'],
    ['RACI', 'Responsible (does the work), Accountable (owns the outcome, ideally one person), Consulted (input before), Informed (told after).'],
    ['Success measure', 'A metric showing whether the program achieves its business outcome. Baseline is the starting value, target is the goal, current is the latest reading.'],
    ['Executive sponsor', 'The senior leader who owns the business outcome and resolves escalations.'],
    ['Scope boundary', 'What is explicitly in and out of the program, to prevent scope creep.'],
  ];
  const healthDefs = [
    ['On Track', 'Expected to meet scope, dates and outcomes with current plans.'],
    ['At Risk', 'Meaningful risk to scope, dates or outcomes; a recovery plan exists or is being worked.'],
    ['Off Track', 'Will miss scope, dates or outcomes without a decision, help, or re-plan.'],
  ];
  return `${pageHead('Help &amp; Definitions', 'Plain-language definitions and the exact rules behind every automatic flag.')}
    <section class="card"><h2>What this app is (and is not)</h2>
      <ul class="plain">
        <li>A personal command center for organizing delivery and communicating status across programs.</li>
        <li>It does <strong>not</strong> replace or connect to Jira, Azure DevOps, Rally, Aha! or other engineering systems. All data is entered by hand or imported from a CSV/JSON file.</li>
        <li>It does not use AI or machine learning. Flags and counts come from the simple rules below.</li>
      </ul></section>
    <section class="card"><h2>How automatic flags work</h2>
      <dl class="def-list">${L.FLAG_RULES.map((r) => `<div><dt>${esc(r.name)}</dt><dd>${esc(r.rule.replace('within the last 30 days', `within the last ${settings().recentMeasureDays} days`))}</dd></div>`).join('')}
        <div><dt>Status report draft</dt><dd>Accomplishments are milestones/actions marked Done with a completed date inside the reporting period. Upcoming milestones are open milestones that are overdue or due within the “due soon” window. Risks, issues and dependencies are RAID records that are not Closed. Help needed lists Pending decisions and Blocked items. Missing information shows “${NE}”.</dd></div></dl></section>
    <section class="card"><h2>Suggested meaning of overall status</h2>
      <dl class="def-list">${healthDefs.map(([t, d]) => `<div><dt>${healthBadge(t)}</dt><dd>${d}</dd></div>`).join('')}</dl>
      <p class="small muted">Overall status is always your judgement. The app never changes it automatically.</p></section>
    <section class="card"><h2>TPM terms</h2><dl class="def-list">${terms.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl></section>
    <section class="card"><h2>Importing milestones from a spreadsheet</h2>
      <p>On Roadmap &amp; Milestones choose <em>Import CSV</em>. Recognized columns: Name (required), Type (Milestone/Action), Description, Owner, Workstream, Due date (YYYY-MM-DD), Status, Priority, Blockers, Next steps. New workstream names are created automatically. Use <em>CSV template</em> to download an example file.</p></section>`;
}

// ---------------------------------------------------------------- router & chrome
const VIEWS = {
  overview: viewOverview, programs: viewPrograms, roadmap: viewRoadmap, raid: viewRaid, decisions: viewDecisions,
  stakeholders: viewStakeholders, reports: viewReports, templates: viewTemplates, data: viewData, help: viewHelp,
};
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path] = h.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const view = VIEWS[parts[0]] ? parts[0] : 'overview';
  return { view, id: parts[1] || '' };
}
const main = $('#main');
let lastRouteKey = '';

function renderNav() {
  const item = (n) => `<li><a href="#/${n.id}" class="nav-link" data-nav="${n.id}">${icon(n.id)}<span>${n.label}</span></a></li>`;
  $('#nav-main').innerHTML = NAV.map(item).join('');
  $('#nav-secondary').innerHTML = NAV2.map(item).join('');
}
function updateChrome(route) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === route.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const label = [...NAV, ...NAV2].find((n) => n.id === route.view)?.label || '';
  document.title = `${label} · TPM Delivery Hub`;
  const sel = $('#focus-select');
  const progs = st().programs;
  sel.innerHTML = `<option value="">All programs (${progs.length})</option>${progs.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}`;
  sel.value = focusId();
  sel.disabled = !progs.length;
  const banners = [];
  if (!S.isStorageAvailable()) banners.push(`<div class="banner bad" role="alert"><strong>Changes are not being saved.</strong> This browser blocked or filled local storage. Export a backup from <a href="#/data">Data &amp; Privacy</a> before closing the tab.</div>`);
  if (S.hasDemo()) banners.push(`<div class="banner demo"><span><strong>Fictional demo data is loaded.</strong> All people, teams and programs marked DEMO or “(fictional)” are invented.</span> ${btn('Remove demo data', 'remove-demo', {}, 'btn small')}</div>`);
  $('#banners').innerHTML = banners.join('');
}

function render() {
  const route = parseRoute();
  const key = `${route.view}/${route.id}`;
  const routeChanged = key !== lastRouteKey;
  lastRouteKey = key;
  const ae = document.activeElement;
  const fid = !routeChanged && ae && ae.id && main.contains(ae) ? ae.id : null;
  const sel = fid && typeof ae.selectionStart === 'number' ? [ae.selectionStart, ae.selectionEnd] : null;
  const scrollY = window.scrollY;
  main.innerHTML = VIEWS[route.view](route);
  updateChrome(route);
  if (routeChanged) {
    closeNav();
    window.scrollTo(0, 0);
    const h1 = main.querySelector('h1');
    if (h1 && lastRouteKey && document.body.dataset.ready) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  } else {
    window.scrollTo(0, scrollY);
    if (fid) {
      const el = document.getElementById(fid);
      if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) { try { el.setSelectionRange(sel[0], sel[1]); } catch { /* not a text input */ } } }
    }
  }
  document.body.dataset.ready = '1';
}

// ---------------------------------------------------------------- mobile nav
function openNav() {
  document.body.classList.add('nav-open');
  $('.menu-btn').setAttribute('aria-expanded', 'true');
  $('.scrim').hidden = false;
  const first = $('#sidebar a'); first && first.focus();
}
function closeNav() {
  if (!document.body.classList.contains('nav-open')) return;
  document.body.classList.remove('nav-open');
  $('.menu-btn').setAttribute('aria-expanded', 'false');
  $('.scrim').hidden = true;
}

// ---------------------------------------------------------------- exports
function exportRows(kind) {
  const s = st();
  const P = (r) => programName(r.programId);
  const cfg = {
    items: { rows: L.sortRecords(roadmapRows(), (i) => i.dueDate), cols: [
      { label: 'Program', value: P }, { label: 'Type', value: (i) => i.kind }, { label: 'Name', value: (i) => i.name },
      { label: 'Description', value: (i) => i.description }, { label: 'Owner', value: (i) => i.owner }, { label: 'Workstream', value: (i) => wsName(i.workstreamId) },
      { label: 'Due date', value: (i) => i.dueDate }, { label: 'Status', value: (i) => i.status }, { label: 'Priority', value: (i) => i.priority },
      { label: 'Depends on', value: (i) => (i.dependsOn || []).map((d) => itemById(d)?.name).filter(Boolean).join('; ') },
      { label: 'Blockers', value: (i) => i.blockers }, { label: 'Next steps', value: (i) => i.nextSteps },
      { label: 'Completed date', value: (i) => i.completedDate }, { label: 'Last updated', value: (i) => L.dateOf(i.updatedAt) },
      { label: 'Flag', value: (i) => ({ overdue: 'Overdue', upcoming: 'Due soon' }[L.itemFlag(i, today(), win())] || '') },
    ] },
    raid: { rows: raidRows(), cols: [
      { label: 'Program', value: P }, { label: 'Type', value: (r) => r.type }, { label: 'Title', value: (r) => r.title },
      { label: 'Description', value: (r) => r.description }, { label: 'Owner', value: (r) => r.owner }, { label: 'Impact', value: (r) => r.impact },
      { label: 'Likelihood', value: (r) => r.likelihood }, { label: 'Priority', value: (r) => r.priority }, { label: 'Due date', value: (r) => r.dueDate },
      { label: 'Mitigation / next action', value: (r) => r.mitigation }, { label: 'Status', value: (r) => r.status },
      { label: 'Workstream', value: (r) => wsName(r.workstreamId) }, { label: 'Linked item', value: (r) => itemById(r.itemId)?.name || '' },
      { label: 'Last updated', value: (r) => L.dateOf(r.updatedAt) },
    ] },
    decisions: { rows: decisionRows(), cols: [
      { label: 'Program', value: P }, { label: 'Date raised', value: (d) => d.dateRaised }, { label: 'Decision needed', value: (d) => d.title },
      { label: 'Decision owner', value: (d) => d.owner }, { label: 'Options considered', value: (d) => d.options }, { label: 'Needed by', value: (d) => d.neededBy },
      { label: 'Status', value: (d) => d.status }, { label: 'Final decision', value: (d) => d.finalDecision }, { label: 'Date decided', value: (d) => d.decidedDate },
      { label: 'Rationale', value: (d) => d.rationale }, { label: 'Impact', value: (d) => d.impact }, { label: 'Follow-up action', value: (d) => d.followUp },
    ] },
    stakeholders: { rows: stakeholderRows(), cols: [
      { label: 'Program', value: (x) => (x.programId ? P(x) : 'Shared') }, { label: 'Name', value: (x) => x.name }, { label: 'Role', value: (x) => x.role },
      { label: 'Team', value: (x) => x.team }, { label: 'Responsibilities', value: (x) => x.responsibilities }, { label: 'Cadence', value: (x) => x.cadence },
      { label: 'Notes', value: (x) => x.notes },
    ] },
    raci: { rows: s.raci.filter(inFocus), cols: [
      { label: 'Program', value: P }, { label: 'Activity / deliverable', value: (r) => r.activity }, { label: 'Type', value: (r) => r.kind },
      { label: 'Responsible', value: (r) => r.R }, { label: 'Accountable', value: (r) => r.A }, { label: 'Consulted', value: (r) => r.C }, { label: 'Informed', value: (r) => r.I },
      { label: 'Flag', value: (r) => (L.raciFlags(r).noA ? 'No Accountable owner' : L.raciFlags(r).multiA ? 'More than one Accountable' : '') },
    ] },
    measures: { rows: measureRowsFiltered(), cols: [
      { label: 'Program', value: P }, { label: 'Measure', value: (m) => m.name }, { label: 'Unit', value: (m) => m.unit },
      { label: 'Better when', value: (m) => (m.direction === 'decrease' ? 'Lower' : 'Higher') }, { label: 'Baseline', value: (m) => m.baseline },
      { label: 'Target', value: (m) => m.target }, { label: 'Current', value: (m) => (blank(m.current) ? NE : m.current) }, { label: 'Owner', value: (m) => m.owner },
      { label: 'Updated', value: (m) => m.updatedDate },
    ] },
  }[kind];
  if (!cfg.rows.length) { toast('Nothing to export with the current filters.', 'warn'); return; }
  download(`tpm-hub-${kind}-${today()}.csv`, L.toCSV(cfg.rows, cfg.cols), 'text/csv;charset=utf-8', `Exported ${plural(cfg.rows.length, 'row')} to CSV.`);
}

function reportFiles(report) {
  const name = programName(report.programId);
  return {
    md: L.reportToMarkdown(report, name),
    csv: L.toCSV(L.reportToRows(report, name), ['Program', 'Week ending', 'Section', 'Content']),
    base: `status-report-${safeName(name)}-${report.weekEnding || today()}`,
  };
}
function mdToPrintHTML(md) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/_(.+?)_/g, '<em>$1</em>');
  const out = []; let inList = false;
  md.split('\n').forEach((line) => {
    if (/^- /.test(line)) { if (!inList) { out.push('<ul>'); inList = true; } out.push(`<li>${inline(line.slice(2))}</li>`); return; }
    if (inList) { out.push('</ul>'); inList = false; }
    if (/^# /.test(line)) out.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (/^## /.test(line)) out.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.trim()) out.push(`<p>${inline(line.trim())}</p>`);
  });
  if (inList) out.push('</ul>');
  return out.join('');
}
function printReport(report) {
  const area = $('#print-area');
  area.innerHTML = mdToPrintHTML(reportFiles(report).md);
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); area.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(() => { if (document.body.classList.contains('printing') && !window.matchMedia('print').matches) done(); }, 1500);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'sr-only';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); return ok;
  }
}
function readDraftFromDOM() {
  const d = ui.reports.draft;
  if (!d) return null;
  document.querySelectorAll('[data-draft]').forEach((el) => setDraftValue(el.dataset.draft, el.value));
  return d;
}
function setDraftValue(path, value) {
  const d = ui.reports.draft;
  if (!d) return;
  if (path.startsWith('sections.')) d.sections[path.slice(9)] = value; else d[path] = value;
}

// ---------------------------------------------------------------- actions
let pendingCSVProgram = '';
const PRESETS = {
  overdue: () => { Object.assign(ui.roadmap, { kind: 'Milestone', status: 'open', due: 'overdue', q: '', priority: '', owner: '', ws: '' }); return 'roadmap'; },
  'overdue-actions': () => { Object.assign(ui.roadmap, { kind: 'Action', status: 'open', due: 'overdue', q: '', priority: '', owner: '', ws: '' }); return 'roadmap'; },
  upcoming: () => { Object.assign(ui.roadmap, { kind: 'Milestone', status: 'open', due: 'upcoming', q: '', priority: '', owner: '', ws: '' }); return 'roadmap'; },
  'high-raid': () => { Object.assign(ui.raid, { type: '', status: 'open', level: 'high', q: '' }); return 'raid'; },
  'pending-decisions': () => { Object.assign(ui.decisions, { status: 'Pending', q: '' }); return 'decisions'; },
  measures: () => { ui.reports.tab = 'measures'; return 'reports'; },
  raci: () => { ui.stakeholders.tab = 'raci'; return 'stakeholders'; },
  'program-items': (id) => { S.setSetting('focusProgramId', id); Object.assign(ui.roadmap, { kind: '', status: '', due: '', q: '', priority: '', owner: '', ws: '' }); return 'roadmap'; },
  'program-raid': (id) => { S.setSetting('focusProgramId', id); Object.assign(ui.raid, { type: '', status: 'open', level: '', q: '' }); return 'raid'; },
  'program-decisions': (id) => { S.setSetting('focusProgramId', id); Object.assign(ui.decisions, { status: '', q: '' }); return 'decisions'; },
  'program-stakeholders': (id) => { S.setSetting('focusProgramId', id); ui.stakeholders.tab = 'register'; return 'stakeholders'; },
};
const RESETS = {
  roadmap: { q: '', kind: '', status: 'open', priority: '', owner: '', ws: '', due: '' },
  raid: { q: '', type: '', status: 'open', level: '' },
  decisions: { q: '', status: '' },
};
const find = (c, id) => st()[c].find((r) => r.id === id);

const ACTIONS = {
  'nav-toggle': () => (document.body.classList.contains('nav-open') ? closeNav() : openNav()),
  'nav-close': closeNav,
  'set-focus': (d) => S.setSetting('focusProgramId', d.id || ''),
  goto: (d) => { const v = PRESETS[d.preset](d.id); if (location.hash === `#/${v}`) render(); else location.hash = `#/${v}`; },
  sort: (d) => {
    const s = ui[d.view];
    if (s.sort === d.key) s.dir = s.dir === 'asc' ? 'desc' : 'asc'; else { s.sort = d.key; s.dir = 'asc'; }
    render();
  },
  'set-ui': (d) => { ui[d.view][d.key] = d.value; render(); },
  'clear-filters': (d) => { Object.assign(ui[d.view], RESETS[d.view]); render(); },

  'new-program': () => programForm(),
  'edit-program': (d) => programForm(find('programs', d.id)),
  'new-ws': (d) => workstreamForm(d.program),
  'edit-ws': (d) => { const w = find('workstreams', d.id); workstreamForm(w.programId, w); },
  'new-item': (d) => itemForm(null, { kind: d.kind || 'Milestone', ...(d.program ? { programId: d.program } : {}) }),
  'edit-item': (d) => itemForm(find('items', d.id)),
  'new-raid': () => raidForm(),
  'edit-raid': (d) => raidForm(find('raid', d.id)),
  'new-decision': () => decisionForm(),
  'edit-decision': (d) => decisionForm(find('decisions', d.id)),
  'new-stakeholder': () => stakeholderForm(),
  'edit-stakeholder': (d) => stakeholderForm(find('stakeholders', d.id)),
  'new-raci': () => raciForm(),
  'edit-raci': (d) => raciForm(find('raci', d.id)),
  'new-measure': (d) => measureForm(null, d.program || ''),
  'edit-measure': (d) => measureForm(find('measures', d.id)),

  'export-csv': (d) => exportRows(d.kind),
  'csv-template': () => {
    const sample = L.toCSV([
      { Name: 'Design approved', Type: 'Milestone', Description: 'Example row: replace with your own', Owner: '', Workstream: 'Design', 'Due date': L.addDays(today(), 14), Status: 'Not Started', Priority: 'High', Blockers: '', 'Next steps': '' },
      { Name: 'Schedule design review', Type: 'Action', Description: '', Owner: '', Workstream: 'Design', 'Due date': L.addDays(today(), 7), Status: 'In Progress', Priority: 'Medium', Blockers: '', 'Next steps': '' },
    ]);
    download('tpm-hub-milestones-template.csv', sample, 'text/csv;charset=utf-8');
  },
  'import-items-csv': () => {
    if (!needProgram()) return;
    openForm({
      title: 'Import milestones & actions from CSV',
      intro: 'Choose the program to import into, then pick a CSV file. Recognized columns: Name (required), Type, Description, Owner, Workstream, Due date (YYYY-MM-DD), Status, Priority, Blockers, Next steps.',
      values: { programId: defaultProgram() },
      fields: [{ name: 'programId', label: 'Import into program', type: 'select', options: programOptions(), empty: 'Choose a program', required: true }],
      submitLabel: 'Choose CSV file…',
      onSave: (v) => { pendingCSVProgram = v.programId; $('#file-csv').value = ''; $('#file-csv').click(); },
    });
  },

  'report-new': (d) => {
    const pid = d.program || ui.reports.programId || focusId() || st().programs[0]?.id;
    if (!pid) { needProgram(); return; }
    ui.reports.programId = pid; ui.reports.tab = 'reports';
    ui.reports.draft = newDraft(pid);
    if (location.hash !== '#/reports') location.hash = '#/reports'; else render();
    setTimeout(() => { const el = $('#re-h'); el && el.scrollIntoView({ block: 'start' }); }, 0);
  },
  'report-open': (d) => {
    const r = find('reports', d.id);
    ui.reports.draft = JSON.parse(JSON.stringify({ ...r, sections: { notes: '', ...r.sections } }));
    render();
    setTimeout(() => { const el = $('#re-h'); el && el.scrollIntoView({ block: 'start' }); }, 0);
  },
  'report-close': () => { ui.reports.draft = null; render(); },
  'report-rebuild': () => {
    const d = readDraftFromDOM();
    askConfirm('Replace all section text with a fresh draft from current data? Your edits in this draft will be lost.', 'Rebuild draft', () => {
    const fresh = newDraft(d.programId, { weekEnding: d.weekEnding, periodStart: d.periodStart, excludeId: d.id });
    ui.reports.draft = { ...d, ...fresh, id: d.id, createdAt: d.createdAt, preparedBy: d.preparedBy || fresh.preparedBy };
    render(); toast('Draft rebuilt from current data.');
    });
  },
  'report-save': () => {
    const d = readDraftFromDOM();
    if (!L.isISODate(d.weekEnding)) { toast('Enter a valid week-ending date before saving.', 'warn'); $('#rd-week')?.focus(); return; }
    const saved = S.upsert('reports', JSON.parse(JSON.stringify(d)));
    ui.reports.draft = JSON.parse(JSON.stringify(saved));
    toast('Report saved. It will be used for “changes since last report” next time.');
  },
  'report-md': () => { const f = reportFiles(readDraftFromDOM()); download(`${f.base}.md`, f.md, 'text/markdown;charset=utf-8', 'Markdown saved.'); },
  'report-csv': () => { const f = reportFiles(readDraftFromDOM()); download(`${f.base}.csv`, f.csv, 'text/csv;charset=utf-8', 'CSV saved.'); },
  'report-print': () => printReport(readDraftFromDOM()),
  'report-copy': async () => { const ok = await copyText(reportFiles(readDraftFromDOM()).md); toast(ok ? 'Report copied as Markdown.' : 'Copy failed. Use Export Markdown instead.', ok ? 'ok' : 'warn'); },
  'report-saved-md': (d) => { const f = reportFiles(find('reports', d.id)); download(`${f.base}.md`, f.md, 'text/markdown;charset=utf-8'); },
  'report-saved-csv': (d) => { const f = reportFiles(find('reports', d.id)); download(`${f.base}.csv`, f.csv, 'text/csv;charset=utf-8'); },
  'report-delete': (d) => {
    askConfirm('Delete this saved report? This cannot be undone.', 'Delete report', () => {
      if (ui.reports.draft?.id === d.id) ui.reports.draft = null;
      S.remove('reports', d.id); toast('Report deleted.');
    });
  },

  'use-template': (d) => templateForm(allTemplates().find((t) => t.id === d.id)),
  'delete-template': (d) => {
    const t = find('customTemplates', d.id);
    askConfirm(`Delete your template "${t.name}"? Programs already created from it are not affected.`, 'Delete template', () => { S.remove('customTemplates', d.id); toast('Template deleted.'); });
  },

  'data-export': () => { download(`tpm-delivery-hub-backup-${today()}.json`, S.exportJSON(), 'application/json', 'Backup saved. Store it somewhere safe.'); },
  'data-import': () => { $('#file-json').value = ''; $('#file-json').click(); },
  'load-demo': () => {
    S.addDemo(buildDemoData(today()));
    toast('Fictional demo data loaded. Remove it any time from the banner or Data & Privacy.');
    if (parseRoute().view !== 'overview') location.hash = '#/overview';
  },
  'remove-demo': () => {
    askConfirm('Remove all fictional demo records? Your own records are kept.', 'Remove demo data', () => {
    if (ui.reports.draft && String(ui.reports.draft.programId).startsWith('demo-')) ui.reports.draft = null;
    S.removeDemo(); toast('Demo data removed.');
    const r = parseRoute();
    if (r.view === 'programs' && r.id && !find('programs', r.id)) location.hash = '#/programs';
    });
  },
  'delete-all': () => {
    openForm({
      title: 'Delete all data',
      intro: 'This permanently removes every program and record stored by TPM Delivery Hub in this browser. Type <strong>DELETE</strong> to confirm.',
      fields: [{ name: 'confirm', label: 'Type DELETE to confirm', required: true, full: true }],
      validate: (v) => (v.confirm !== 'DELETE' ? { message: 'Type DELETE in capital letters to confirm.', field: 'confirm' } : null),
      submitLabel: 'Delete everything',
      onSave: () => { ui.reports.draft = null; S.clearAll(); toast('All data deleted.'); location.hash = '#/overview'; },
    });
  },
};

document.addEventListener('click', (e) => {
  if (e.target.closest('#sidebar a')) closeNav();
  const el = e.target.closest('[data-action]');
  if (!el || modal.contains(el)) return;
  const fn = ACTIONS[el.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(el.dataset, el, e);
});
// Filter/search bindings (data-bind="view.key") and report draft edits.
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.draft) { setDraftValue(t.dataset.draft, t.value); return; }
  if (t.dataset.bind && t.type === 'search') { const [v, k] = t.dataset.bind.split('.'); ui[v][k] = t.value; render(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'focus-select') {
    if (t.value && ui.reports.draft && ui.reports.draft.programId !== t.value) ui.reports.draft = null;
    if (t.value) ui.reports.programId = t.value;
    S.setSetting('focusProgramId', t.value);
    return;
  }
  if (t.dataset.draft) { setDraftValue(t.dataset.draft, t.value); return; }
  if (t.dataset.bind && t.type !== 'search') {
    const [v, k] = t.dataset.bind.split('.'); ui[v][k] = t.value;
    if (v === 'reports' && k === 'programId' && ui.reports.draft && ui.reports.draft.programId !== t.value) ui.reports.draft = null;
    render();
  }
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.dataset.form === 'settings') {
    e.preventDefault();
    const n = Math.round(Number($('#set-upcoming').value));
    if (!Number.isFinite(n) || n < 1 || n > 90) { toast('Enter a whole number from 1 to 90.', 'warn'); return; }
    S.setSetting('upcomingDays', n); toast('Setting saved.');
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { closeNav(); $('.menu-btn').focus(); } });

// File imports
$('#file-json').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('That file is not valid JSON.', 'bad'); return; }
  const check = L.validateBackup(data);
  if (!check.ok) { toast(check.errors.join(' '), 'bad'); return; }
  const hasData = L.COLLECTIONS.some((c) => st()[c].length);
  openForm({
    title: 'Import backup',
    intro: `File: <strong>${esc(file.name)}</strong> with ${L.COLLECTIONS.reduce((n, c) => n + (Array.isArray(data[c]) ? data[c].length : 0), 0)} records.`,
    values: { mode: hasData ? 'merge' : 'replace' },
    fields: [{ name: 'mode', label: 'How should it be imported?', type: 'select', options: [
      { value: 'merge', label: 'Merge: add records not already here (keep existing data)' },
      { value: 'replace', label: 'Replace: delete current data and use the file' },
    ] }],
    submitLabel: 'Import',
    onSave: (v) => {
      if (v.mode === 'replace') {
        const doReplace = () => { ui.reports.draft = null; S.replaceAll(data); toast('Backup imported. Current data replaced.'); location.hash = '#/overview'; };
        if (hasData) askConfirm('Replace all current data with the backup? Current data will be lost.', 'Replace data', doReplace); else doReplace();
        return;
      } else {
        const { state, added } = L.mergeStates(st(), data);
        state.settings = st().settings;
        S.replaceAll(state); toast(`Merged ${plural(added, 'new record')}.`);
      }
      location.hash = '#/overview';
    },
  });
});
$('#file-csv').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !pendingCSVProgram) return;
  const res = L.csvToItems(await file.text(), pendingCSVProgram, st().workstreams, today());
  if (res.error) { toast(res.error, 'bad'); return; }
  const idMap = new Map();
  const newWs = res.newWorkstreams.map((w) => { const id = S.newId(); idMap.set(w.id, id); return { ...w, id }; });
  if (newWs.length) S.insertMany('workstreams', newWs);
  const recs = res.records.map((r) => ({ ...r, workstreamId: idMap.get(r.workstreamId) || r.workstreamId }));
  if (recs.length) S.insertMany('items', recs);
  toast(`Imported ${plural(recs.length, 'item')}${newWs.length ? ` and ${plural(newWs.length, 'new workstream')}` : ''}${res.skipped ? `; skipped ${res.skipped} row(s) without a name` : ''}.`, recs.length ? 'ok' : 'warn');
  pendingCSVProgram = '';
});

// ---------------------------------------------------------------- boot
S.load();
renderNav();
S.onChange(({ saved }) => {
  if (!saved) toast('Could not save to browser storage. Export a backup to avoid losing changes.', 'bad');
  render();
});
window.addEventListener('hashchange', render);
window.addEventListener('storage', (e) => { if (e.key === S.STORAGE_KEY) S.reloadFromStorage(); });
if (!location.hash) history.replaceState(null, '', '#/overview');
render();
