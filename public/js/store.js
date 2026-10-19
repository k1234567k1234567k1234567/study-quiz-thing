// Projects live in localStorage; no accounts, no sync (use export/import to move devices).
const KEY = 'studyhub.v1';

let data = load();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.projects)) return { projects: d.projects, days: d.days || [], theme: d.theme || '' };
  } catch {}
  return { projects: [], days: [], theme: '' };
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch { alert('Could not save: browser storage is full. Export a backup and delete old projects.'); }
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const list = () => [...data.projects].sort((a, b) => b.updated - a.updated);
export const get = (id) => data.projects.find((p) => p.id === id);

export function add(p) {
  const project = { id: uid(), created: Date.now(), updated: Date.now(), cards: [], questions: [], ...p };
  data.projects.push(project);
  save();
  return project;
}

export function update(id, patch) {
  const p = get(id);
  if (!p) return null;
  Object.assign(p, patch, { updated: Date.now() });
  save();
  return p;
}

export function remove(id) {
  data.projects = data.projects.filter((p) => p.id !== id);
  save();
}

export function theme() { return data.theme; }
export function setTheme(t) { data.theme = t; save(); }

// Study streak: one entry per day the user studied something.
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export function markStudied() {
  const k = dayKey();
  if (!data.days.includes(k)) { data.days.push(k); save(); }
}
export function streak() {
  let n = 0;
  const d = new Date();
  if (!data.days.includes(dayKey(d))) d.setDate(d.getDate() - 1);
  while (data.days.includes(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export const exportJSON = () => JSON.stringify(data, null, 2);

export function importJSON(text) {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.projects)) throw new Error('Not a Study Hub backup file');
  const ids = new Set(data.projects.map((p) => p.id));
  for (const p of d.projects) if (p && p.id && !ids.has(p.id)) data.projects.push(p);
  save();
  return d.projects.length;
}
