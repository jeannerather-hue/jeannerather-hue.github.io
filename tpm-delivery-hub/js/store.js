// Local-only data store. Everything lives in this browser's localStorage
// under STORAGE_KEY. Nothing is sent over the network.
import { COLLECTIONS, emptyState, normalizeState, todayISO, isBlank } from './logic.js?v=1791999075';

export const STORAGE_KEY = 'tpm-delivery-hub:v1';

let state = emptyState();
let storageOK = true;
let lastError = '';
const listeners = new Set();

function storage() {
  try { return window.localStorage; } catch { return null; }
}

export function load() {
  const ls = storage();
  if (!ls) { storageOK = false; state = emptyState(); return state; }
  try {
    const raw = ls.getItem(STORAGE_KEY);
    state = raw ? normalizeState(JSON.parse(raw)) : emptyState();
    // probe write access
    ls.setItem(STORAGE_KEY + ':probe', '1');
    ls.removeItem(STORAGE_KEY + ':probe');
  } catch (e) {
    storageOK = false;
    lastError = String(e && e.message || e);
    if (!state) state = emptyState();
  }
  return state;
}

export const isStorageAvailable = () => storageOK;
export const getLastError = () => lastError;
export const get = () => state;
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

function persist() {
  const ls = storage();
  if (!ls) { storageOK = false; return false; }
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(state));
    storageOK = true;
    lastError = '';
    return true;
  } catch (e) {
    lastError = String(e && e.message || e);
    storageOK = false;
    return false;
  }
}

function commit() {
  const ok = persist();
  listeners.forEach((fn) => fn({ saved: ok }));
  return ok;
}

export function newId() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function byId(collection, id) { return state[collection].find((r) => r.id === id); }

/** Insert or update a record. Returns the saved record. */
export function upsert(collection, data) {
  const now = new Date().toISOString();
  const list = state[collection];
  const idx = data.id ? list.findIndex((r) => r.id === data.id) : -1;
  let rec;
  if (idx >= 0) {
    const prev = list[idx];
    rec = { ...prev, ...data, updatedAt: now };
    applyRules(collection, rec, prev);
    list[idx] = rec;
  } else {
    rec = { ...data, id: data.id || newId(), createdAt: data.createdAt || now, updatedAt: now };
    applyRules(collection, rec, null);
    list.push(rec);
  }
  commit();
  return rec;
}

/** Insert many records at once (one save). */
export function insertMany(collection, records) {
  const now = new Date().toISOString();
  records.forEach((r) => {
    const rec = { ...r, id: r.id || newId(), createdAt: r.createdAt || now, updatedAt: r.updatedAt || now };
    applyRules(collection, rec, null);
    state[collection].push(rec);
  });
  commit();
}

// Transparent data-keeping rules applied on save.
function applyRules(collection, rec, prev) {
  const today = todayISO();
  if (collection === 'items') {
    if (rec.status === 'Done' && isBlank(rec.completedDate)) rec.completedDate = today;
    if (rec.status !== 'Done') rec.completedDate = '';
    rec.dependsOn = (rec.dependsOn || []).filter((d) => d !== rec.id);
  }
  if (collection === 'decisions') {
    if (rec.status === 'Decided' && isBlank(rec.decidedDate)) rec.decidedDate = today;
  }
  if (collection === 'measures') {
    const changed = !prev || String(prev.current ?? '') !== String(rec.current ?? '');
    if (changed && !isBlank(rec.current)) {
      // Keep a date the user typed; otherwise stamp today.
      const userSetDate = prev
        ? !isBlank(rec.updatedDate) && rec.updatedDate !== prev.updatedDate
        : !isBlank(rec.updatedDate);
      if (!userSetDate) rec.updatedDate = today;
      rec.history = [...(prev?.history || rec.history || []), { date: rec.updatedDate, value: rec.current }].slice(-52);
    }
  }
}

export function remove(collection, id) {
  state[collection] = state[collection].filter((r) => r.id !== id);
  if (collection === 'programs') {
    COLLECTIONS.filter((c) => c !== 'programs' && c !== 'customTemplates').forEach((c) => {
      state[c] = state[c].filter((r) => r.programId !== id);
    });
    if (state.settings.focusProgramId === id) state.settings.focusProgramId = '';
  }
  if (collection === 'items') {
    state.items.forEach((i) => { if ((i.dependsOn || []).includes(id)) i.dependsOn = i.dependsOn.filter((d) => d !== id); });
    state.raid.forEach((r) => { if (r.itemId === id) r.itemId = ''; });
  }
  if (collection === 'projects') {
    ['items', 'raid', 'decisions'].forEach((c) => state[c].forEach((r) => { if (r.projectId === id) r.projectId = ''; }));
  }
  if (collection === 'workstreams') {
    ['items', 'raid'].forEach((c) => state[c].forEach((r) => { if (r.workstreamId === id) r.workstreamId = ''; }));
  }
  commit();
}

export function setSetting(key, value) {
  state.settings[key] = value;
  commit();
}

export function replaceAll(next) {
  state = normalizeState(next);
  return commit();
}

export function clearAll() {
  const keepFocus = '';
  state = emptyState();
  state.settings.focusProgramId = keepFocus;
  const ls = storage();
  try { ls && ls.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  listeners.forEach((fn) => fn({ saved: true }));
}

export function hasDemo() {
  return COLLECTIONS.some((c) => state[c].some((r) => r.isDemo));
}

export function removeDemo() {
  COLLECTIONS.forEach((c) => { state[c] = state[c].filter((r) => !r.isDemo); });
  // Drop anything the user attached to a demo program (it would be orphaned).
  const ids = new Set(state.programs.map((p) => p.id));
  COLLECTIONS.filter((c) => !['programs', 'customTemplates', 'customPlaybooks'].includes(c))
    .forEach((c) => { state[c] = state[c].filter((r) => !r.programId || ids.has(r.programId)); });
  if (state.settings.focusProgramId && !state.programs.some((p) => p.id === state.settings.focusProgramId)) {
    state.settings.focusProgramId = '';
  }
  commit();
}

export function addDemo(demo) {
  removeDemoSilently();
  COLLECTIONS.forEach((c) => { state[c].push(...(demo[c] || [])); });
  commit();
}
function removeDemoSilently() {
  COLLECTIONS.forEach((c) => { state[c] = state[c].filter((r) => !r.isDemo); });
}

export function exportJSON() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function storageBytes() {
  try { return new Blob([JSON.stringify(state)]).size; } catch { return JSON.stringify(state).length; }
}

/** Reload from storage (used when another tab changes data). */
export function reloadFromStorage() {
  load();
  listeners.forEach((fn) => fn({ saved: true, external: true }));
}
