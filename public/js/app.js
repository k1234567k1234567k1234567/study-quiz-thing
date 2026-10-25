import * as store from './store.js';
import * as ai from './ai.js';
import { GRADES, QTYPES } from './prompts.js';
import { readNotes, buildCards, buildQuiz } from './pipeline.js';
import { fileToDataUrl, rotateDataUrl } from './images.js';
import { pdfPageCount, readPdf } from './pdf.js';
import { renderDiagram } from './diagrams.js';
import { h, $, toast, busy, modal } from './ui.js';

const app = $('#app');
const state = { ai: false, offline: false };
let cleanup = null;

const MAX_CHARS = 40000; // keeps one project within the free AI limits
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const mode = () => (state.ai ? 'ai' : 'basic');

/* ---------- theme ---------- */
function applyTheme() {
  document.documentElement.dataset.theme = store.theme() === 'light' ? 'light' : 'dark';
}
applyTheme();

/* ---------- router ---------- */
function go(hash) { location.hash = hash; }

async function route() {
  cleanup?.();
  cleanup = null;
  const [, view, id] = location.hash.split('/');
  window.scrollTo(0, 0);
  if (view === 'new') return renderWizard();
  const p = id && store.get(id);
  if (view === 'p' && p) return renderProject(p);
  if (view === 'cards' && p) return renderCards(p);
  if (view === 'quiz' && p) return renderQuiz(p);
  renderHome();
}
window.addEventListener('hashchange', route);

/* ---------- header ---------- */
function statusChip() {
  const label = state.ai ? 'AI on' : state.offline ? 'Server offline' : 'Basic mode';
  return h('button', { class: `chip ${state.ai ? 'ok' : 'warn'}`, onclick: openSettings, title: 'Settings' }, label);
}

function header() {
  return h('header', { class: 'top' },
    h('a', { class: 'brand', href: '#/' }, h('span', { class: 'logo' }, 'SH'), 'Study Hub'),
    h('div', { class: 'row' },
      store.streak() > 0 && h('span', { class: 'streak', title: 'Days in a row you studied' }, `🔥 ${store.streak()}`),
      statusChip(),
      h('button', { class: 'btn ghost', onclick: openSettings, 'aria-label': 'Settings' }, 'Settings')));
}

function page(...kids) {
  app.replaceChildren(header(), h('main', { class: 'wrap' }, ...kids));
}

function openSettings() {
  const file = h('input', { type: 'file', accept: 'application/json', class: 'hidden', onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { toast(`Imported ${store.importJSON(await f.text())} project(s)`); route(); } catch (err) { toast(err.message); }
  } });
  const body = h('div', { class: 'stack' },
    h('p', {}, state.ai
      ? 'AI mode is on. Photos and prompts go through this server to NVIDIA\'s free API.'
      : state.offline
        ? 'Can\'t reach the Study Hub server, so only basic mode works. Start it with "node server.js".'
        : 'Basic mode: photos are read on your device and questions are made by simple rules. For smarter questions, get a free key at build.nvidia.com, put it in a .env file as NVIDIA_API_KEY, and restart the server (see README).'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => { store.setTheme(store.theme() === 'light' ? 'dark' : 'light'); applyTheme(); } }, 'Switch black / light'),
      h('button', { class: 'btn', onclick: () => {
        const a = h('a', { href: URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' })), download: 'study-hub-backup.json' });
        a.click();
      } }, 'Export backup'),
      h('button', { class: 'btn', onclick: () => file.click() }, 'Import backup'), file,
      h('a', { class: 'btn', href: '/api/test', target: '_blank', rel: 'noopener' }, 'Test AI connection')),
    h('p', { class: 'muted small' }, 'Projects are saved in this browser only. Export a backup to move them to another device.'));
  modal('Settings', body, [{ label: 'Close', primary: true }]);
}

/* ---------- home ---------- */
function renderHome() {
  const projects = store.list();
  page(
    h('div', { class: 'row between' },
      h('h1', {}, 'Your projects'),
      h('a', { class: 'btn primary', href: '#/new' }, '+ Add project')),
    projects.length
      ? h('div', { class: 'grid' }, projects.map((p) => h('a', { class: 'tile', href: `#/p/${p.id}` },
        h('span', { class: `badge ${p.type}` }, p.type === 'quiz' ? 'Quiz' : 'Cue cards'),
        h('h3', {}, p.name),
        h('p', { class: 'muted small' }, p.type === 'quiz'
          ? `${p.questions.length} questions${p.grade ? ` · ${GRADES[p.grade].label}` : ''}${p.lastResult ? ` · last ${p.lastResult.score}/${p.lastResult.total}` : ''}`
          : `${p.cards.length} cards`))))
      : h('div', { class: 'empty' },
        h('h2', {}, 'Nothing here yet'),
        h('p', {}, 'Add a project, snap a photo of your notes, and turn them into a quiz or cue cards.'),
        h('a', { class: 'btn primary', href: '#/new' }, '+ Add your first project')),
  );
  if (!state.ai && !state.offline && !localStorage.getItem('sh.hint')) {
    toast('Tip: add a free NVIDIA key for smarter questions (Settings)');
    try { localStorage.setItem('sh.hint', '1'); } catch {}
  }
}

/* ---------- wizard ---------- */
let wiz = null;
const freshWiz = () => ({ step: 1, type: null, name: '', grade: 'academic', topic: '', details: '', notes: '', images: [], count: 10, types: ['mc', 'tf', 'fill', 'short'], transcript: '', error: '' });

function renderWizard() {
  wiz ||= freshWiz();
  if (wiz.step === 1) return wizType();
  if (wiz.step === 2) return wizSource();
  return wizReview();
}

function cancelWiz() { wiz = null; go('#/'); }

function wizType() {
  const name = h('input', { type: 'text', placeholder: 'e.g. Biology unit 3', value: wiz.name, maxlength: 60, oninput: (e) => { wiz.name = e.target.value; } });
  const choose = (type) => { wiz.type = type; wiz.step = 2; renderWizard(); };
  page(
    h('h1', {}, 'New project'),
    h('label', { class: 'field' }, h('span', {}, 'Project name (optional)'), name),
    h('h2', {}, 'What do you want to make?'),
    h('div', { class: 'choices' },
      h('button', { class: 'choice', onclick: () => choose('cards') }, h('span', { class: 'big' }, '🗂️'), h('strong', {}, 'Cue cards'), h('span', {}, 'Question on the front, answer on the back. Type your answer or tap to flip. No score, just review.')),
      h('button', { class: 'choice', onclick: () => choose('quiz') }, h('span', { class: 'big' }, '📝'), h('strong', {}, 'Quiz'), h('span', {}, 'Pick your level, then get questions with instant feedback and a score at the end.'))),
    h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: cancelWiz }, 'Cancel')));
}

function thumbs() {
  return h('div', { class: 'thumbs' }, wiz.images.map((src, i) => h('div', { class: 'thumb' },
    h('img', { src, alt: `Note photo ${i + 1}` }),
    h('div', { class: 'row' },
      h('button', { class: 'btn small', onclick: async () => { wiz.images[i] = await rotateDataUrl(src); renderWizard(); }, 'aria-label': 'Rotate' }, '⟳'),
      h('button', { class: 'btn small', onclick: () => { wiz.images.splice(i, 1); renderWizard(); }, 'aria-label': 'Remove' }, '✕')))));
}

function wizSource() {
  const isQuiz = wiz.type === 'quiz';
  const addFiles = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const b = busy('Preparing photos...');
    try { for (const f of files) wiz.images.push(await fileToDataUrl(f)); } catch (err) { toast(err.message); }
    b.close();
    keep();
    renderWizard();
  };
  // PDFs and text files: text goes into the notes box, scanned pages become photos.
  const addDocument = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    keep();
    const isPdf = /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
    const append = (t) => { wiz.notes = [wiz.notes.trim(), t.trim()].filter(Boolean).join('\n\n'); };
    try {
      if (!isPdf) { append(await f.text()); renderWizard(); return; }
      const b = busy('Opening your PDF...');
      let total;
      try { total = await pdfPageCount(f); } finally { b.close(); }
      askPages(f.name, total, async (from, to) => {
        const bb = busy('Reading your PDF...');
        try {
          const r = await readPdf(f, { from, to, onProgress: bb.set });
          if (r.text) append(r.text);
          for (const img of r.scans) wiz.images.push(img);
          if (!r.text && !r.scans.length) toast('No readable text found in those pages.');
          else toast(`Read ${r.pages} page${r.pages === 1 ? '' : 's'}${r.scans.length ? ` (${r.scans.length} scanned)` : ''}${r.skipped ? `; skipped ${r.skipped} scanned pages over the limit` : ''}`);
        } catch (err) { toast(err.message); }
        bb.close();
        renderWizard();
      });
    } catch (err) { toast(err.message); }
  };
  const notes = h('textarea', { rows: 6, placeholder: isQuiz ? 'Paste or type notes (optional if you add photos or a topic)' : 'Paste or type your notes (or add photos above)', oninput: (e) => { wiz.notes = e.target.value; } }, wiz.notes);
  const topic = h('input', { type: 'text', placeholder: 'e.g. Photosynthesis, WW1 causes, Quadratic equations', value: wiz.topic, oninput: (e) => { wiz.topic = e.target.value; } });
  const details = h('textarea', { rows: 3, placeholder: isQuiz ? 'Go into detail: subtopics, chapters, or things to focus on (optional)' : 'Anything to focus on? (optional, everything is still covered)', oninput: (e) => { wiz.details = e.target.value; } }, wiz.details);
  const keep = () => { wiz.notes = notes.value; wiz.topic = topic.value; wiz.details = details.value; };
  const typeBoxes = Object.entries(QTYPES).map(([k, label]) => h('label', { class: 'check' },
    h('input', { type: 'checkbox', checked: wiz.types.includes(k), onchange: (e) => { wiz.types = e.target.checked ? [...wiz.types, k] : wiz.types.filter((t) => t !== k); } }), label));

  page(
    h('h1', {}, isQuiz ? 'Set up your quiz' : 'Set up your cue cards'),
    isQuiz && h('section', { class: 'stack' },
      h('h2', {}, 'Your level'),
      h('div', { class: 'seg' }, Object.entries(GRADES).map(([k, g]) => h('button', { class: `segbtn ${wiz.grade === k ? 'on' : ''}`, onclick: () => { keep(); wiz.grade = k; renderWizard(); } }, h('strong', {}, g.label), h('small', {}, g.sub)))),
    ),
    h('section', { class: 'stack' },
      h('h2', {}, 'Your material'),
      isQuiz && h('label', { class: 'field' }, h('span', {}, 'Topic'), topic),
      h('div', { class: 'row' },
        h('label', { class: 'btn' }, '📷 Take photo', h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'hidden', onchange: addFiles })),
        h('label', { class: 'btn' }, '🖼️ Upload photos', h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hidden', onchange: addFiles })),
        h('label', { class: 'btn' }, '📄 Upload PDF or text file', h('input', { type: 'file', accept: '.pdf,application/pdf,.txt,.md,text/plain', class: 'hidden', id: 'docInput', onchange: addDocument }))),
      wiz.images.length > 0 && thumbs(),
      h('label', { class: 'field' }, h('span', {}, isQuiz ? 'Notes' : 'Typed notes'), notes),
      h('label', { class: 'field' }, h('span', {}, 'Details'), details)),
    isQuiz && h('section', { class: 'stack' },
      h('h2', {}, 'Quiz options'),
      h('div', { class: 'row wrapr' }, [5, 10, 15, 20, 30].map((n) => h('button', { class: `pill ${wiz.count === n ? 'on' : ''}`, onclick: () => { keep(); wiz.count = n; renderWizard(); } }, `${n} questions`))),
      h('div', { class: 'row wrapr' }, typeBoxes)),
    wiz.error && h('div', { class: 'error' }, wiz.error),
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: () => { keep(); wiz.step = 1; renderWizard(); } }, 'Back'),
      h('button', { class: 'btn primary', onclick: () => { keep(); next(); } }, state.ai ? 'Continue' : 'Continue (basic mode)')),
    !state.ai && h('p', { class: 'muted small' }, 'Basic mode: photos are read on this device and questions are rule-based. Add an NVIDIA key for AI-written questions.'));
}

function askPages(name, total, onPick) {
  const from = h('input', { type: 'number', min: 1, max: total, value: 1, 'aria-label': 'From page' });
  const to = h('input', { type: 'number', min: 1, max: total, value: Math.min(total, 15), 'aria-label': 'To page' });
  const body = h('div', { class: 'stack' },
    h('p', {}, `${name} has ${total} page${total === 1 ? '' : 's'}. Which pages do you want to study?`),
    h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', {}, 'From page'), from), h('label', { class: 'field' }, h('span', {}, 'To page'), to)),
    h('p', { class: 'muted small' }, 'Big ranges take longer and use more of your free AI requests. For a whole subject, do one chapter at a time.'));
  modal('Choose pages', body, [
    { label: 'Cancel' },
    { label: 'Read these pages', primary: true, onClick: () => {
      const a = Math.min(Math.max(1, Number(from.value) || 1), total);
      const z = Math.min(Math.max(a, Number(to.value) || total), total);
      onPick(a, z);
    } },
  ]);
}

async function next() {
  wiz.error = '';
  const isQuiz = wiz.type === 'quiz';
  if (isQuiz && !wiz.types.length) { wiz.error = 'Pick at least one question type.'; return renderWizard(); }
  if (!wiz.images.length && !wiz.notes.trim() && !(isQuiz && wiz.topic.trim())) {
    wiz.error = isQuiz ? 'Add a topic, some notes, or a photo first.' : 'Add some notes or a photo first.';
    return renderWizard();
  }
  if (wiz.images.length) {
    const b = busy('Reading your notes...');
    try {
      wiz.transcript = await readNotes({ images: wiz.images, notes: wiz.notes, mode: mode(), onProgress: b.set });
      b.close();
      if (!wiz.transcript.trim()) { wiz.error = 'Could not find any text in the photos. Try a clearer, brighter photo.'; return renderWizard(); }
      wiz.step = 3;
      return renderWizard();
    } catch (e) { b.close(); wiz.error = e.message; return renderWizard(); }
  }
  wiz.transcript = wiz.notes.trim();
  if (wiz.transcript.length > MAX_CHARS) {
    wiz.transcript = wiz.transcript.slice(0, MAX_CHARS);
    toast(`Your notes are very long, so only the first ${MAX_CHARS.toLocaleString()} characters are used. Do the rest as a separate project.`);
  }
  generate();
}

function wizReview() {
  const ta = h('textarea', { rows: 16, class: 'mono', oninput: (e) => { wiz.transcript = e.target.value; } }, wiz.transcript);
  page(
    h('h1', {}, 'Check your notes'),
    h('p', { class: 'muted' }, 'This is what was read from your photos. Fix any mistakes, since everything below is made from this text.'),
    ta,
    wiz.error && h('div', { class: 'error' }, wiz.error),
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: () => { wiz.step = 2; renderWizard(); } }, 'Back'),
      h('button', { class: 'btn primary', onclick: () => { wiz.transcript = ta.value; generate(); } }, wiz.type === 'quiz' ? 'Make my quiz' : 'Make my cue cards')));
}

async function generate(forceMode) {
  const m = forceMode || mode();
  const b = busy('Working on it...');
  try {
    const common = { transcript: wiz.transcript.trim(), details: wiz.details.trim(), mode: m, onProgress: b.set };
    let project;
    if (wiz.type === 'cards') {
      const cards = await buildCards(common);
      if (!cards.length) throw new Error('No cards could be made from that text.');
      project = store.add({ name: wiz.name.trim() || autoName(wiz.transcript, 'Cue cards'), type: 'cards', transcript: common.transcript, details: wiz.details, cards: cards.map((c) => ({ id: c.id || store.uid(), ...c, weak: false })), mode: m });
    } else {
      const { questions, source } = await buildQuiz({ ...common, topic: wiz.topic.trim(), grade: wiz.grade, count: wiz.count, types: wiz.types });
      project = store.add({ name: wiz.name.trim() || wiz.topic.trim() || autoName(wiz.transcript, 'Quiz'), type: 'quiz', grade: wiz.grade, topic: wiz.topic.trim(), details: wiz.details, transcript: source || '', count: wiz.count, types: wiz.types, questions, mode: m });
    }
    b.close();
    wiz = null;
    go(`#/${project.type === 'quiz' ? 'quiz' : 'cards'}/${project.id}`);
  } catch (e) {
    b.close();
    wiz.error = e.message;
    wiz.step = wiz.images.length ? 3 : 2;
    renderWizard();
    if (m === 'ai') offerBasic(e);
  }
}

function offerBasic() {
  modal('Try basic mode instead?', h('p', {}, 'The AI had a problem (see the message on the page). Basic mode works without AI, but the questions are simpler.'), [
    { label: 'No thanks' },
    { label: 'Use basic mode', primary: true, onClick: () => { wiz.error = ''; generate('basic'); } },
  ]);
}

const autoName = (text, fallback) => {
  const first = (text || '').split('\n').map((l) => l.trim()).find((l) => l && l !== '---');
  return first ? first.replace(/[:.]$/, '').slice(0, 40) : fallback;
};

/* ---------- project page ---------- */
function renderProject(p) {
  const isQuiz = p.type === 'quiz';
  const rename = () => {
    const input = h('input', { type: 'text', value: p.name, maxlength: 60 });
    modal('Rename project', input, [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: () => { if (input.value.trim()) { store.update(p.id, { name: input.value.trim() }); renderProject(store.get(p.id)); } else return false; } }]);
  };
  const regen = async () => {
    if (!p.transcript.trim() && !p.topic) return toast('No source text saved for this project');
    const b = busy('Working on it...');
    try {
      if (isQuiz) {
        const { questions } = await buildQuiz({ transcript: p.transcript, topic: p.topic, details: p.details, grade: p.grade, count: p.count || 10, types: p.types || Object.keys(QTYPES), mode: mode(), onProgress: b.set });
        store.update(p.id, { questions, lastResult: null });
      } else {
        const cards = await buildCards({ transcript: p.transcript, details: p.details, mode: mode(), onProgress: b.set });
        store.update(p.id, { cards: cards.map((c) => ({ id: c.id || store.uid(), ...c, weak: false })) });
      }
      b.close();
      toast(isQuiz ? 'New quiz ready' : 'Cards regenerated');
      renderProject(store.get(p.id));
    } catch (e) { b.close(); toast(e.message); }
  };
  const del = () => modal('Delete project?', h('p', {}, `"${p.name}" will be removed from this browser.`), [{ label: 'Cancel' }, { label: 'Delete', primary: true, onClick: () => { store.remove(p.id); go('#/'); } }]);
  const showNotes = () => {
    const ta = h('textarea', { rows: 14, class: 'mono' }, p.transcript || '');
    modal('Your notes text', ta, [{ label: 'Close' }, { label: 'Save changes', primary: true, onClick: () => { store.update(p.id, { transcript: ta.value }); toast('Saved. Use regenerate to rebuild from it.'); } }]);
  };

  const items = isQuiz
    ? p.questions.map((q, i) => h('li', {}, h('span', { class: 'muted small' }, `${QTYPES[q.type]} · `), q.diagram ? '[diagram] ' : '', q.q))
    : p.cards.map((c) => cardEditor(p, c));

  page(
    h('div', { class: 'row between' },
      h('div', {}, h('span', { class: `badge ${p.type}` }, isQuiz ? 'Quiz' : 'Cue cards'), h('h1', {}, p.name),
        h('p', { class: 'muted small' }, isQuiz ? `${p.questions.length} questions · ${GRADES[p.grade].label}${p.lastResult ? ` · last score ${p.lastResult.score}/${p.lastResult.total}` : ''}` : `${p.cards.length} cards${p.cards.some((c) => c.weak) ? ` · ${p.cards.filter((c) => c.weak).length} marked for review` : ''}`)),
      h('a', { class: 'btn primary', href: `#/${isQuiz ? 'quiz' : 'cards'}/${p.id}` }, isQuiz ? 'Take quiz' : 'Study cards')),
    h('div', { class: 'row wrapr' },
      h('button', { class: 'btn', onclick: rename }, 'Rename'),
      h('button', { class: 'btn', onclick: showNotes }, 'View notes text'),
      h('button', { class: 'btn', onclick: regen }, isQuiz ? 'New quiz from same notes' : 'Regenerate cards'),
      !isQuiz && h('button', { class: 'btn', onclick: () => printCards(p) }, 'Print cards'),
      !isQuiz && h('button', { class: 'btn', onclick: () => { const c = { id: store.uid(), q: '', a: '', topic: '', weak: false }; p.cards.push(c); store.update(p.id, { cards: p.cards }); renderProject(store.get(p.id)); } }, '+ Add card'),
      h('button', { class: 'btn danger', onclick: del }, 'Delete')),
    isQuiz ? h('ol', { class: 'qlist' }, items) : h('div', { class: 'stack' }, items));
}

function cardEditor(p, c) {
  const save = () => store.update(p.id, { cards: p.cards });
  return h('div', { class: 'editcard' },
    h('textarea', { rows: 2, placeholder: 'Question', oninput: (e) => { c.q = e.target.value; save(); } }, c.q),
    h('textarea', { rows: 2, placeholder: 'Answer', oninput: (e) => { c.a = e.target.value; save(); } }, c.a),
    h('button', { class: 'btn small danger', onclick: () => { p.cards.splice(p.cards.indexOf(c), 1); save(); renderProject(store.get(p.id)); }, 'aria-label': 'Delete card' }, '✕'));
}

function printCards(p) {
  const sheet = h('div', { id: 'print' }, p.cards.map((c) => h('div', { class: 'pcard' }, h('div', {}, h('b', {}, 'Q: '), c.q), c.diagram && renderDiagram(c.diagram), h('div', {}, h('b', {}, 'A: '), c.a))));
  document.body.append(sheet);
  window.print();
  setTimeout(() => sheet.remove(), 500);
}

/* ---------- cue card study (no score) ---------- */
function renderCards(p) {
  const cards = p.cards.filter((c) => c.q && c.a);
  if (!cards.length) { toast('This project has no cards yet'); return go(`#/p/${p.id}`); }
  store.markStudied();
  const s = { order: cards.map((c) => c.id), i: 0, flipped: false, typed: '', onlyMarked: false };
  const byId = (id) => p.cards.find((c) => c.id === id);
  const persist = () => store.update(p.id, { cards: p.cards });

  const draw = () => {
    const done = s.i >= s.order.length;
    const marked = p.cards.filter((c) => c.weak && c.q && c.a).length;
    if (done) {
      page(
        h('div', { class: 'center stack' },
          h('h1', {}, 'End of the deck 🎉'),
          h('p', { class: 'muted' }, `You went through ${s.order.length} cards. There's no score here, just keep reviewing.`),
          h('div', { class: 'row wrapr center' },
            h('button', { class: 'btn primary', onclick: () => restart(false) }, 'Go again'),
            h('button', { class: 'btn', onclick: () => restart(false, true) }, 'Shuffle & go again'),
            marked > 0 && h('button', { class: 'btn', onclick: () => restart(true) }, `Review marked cards (${marked})`),
            h('a', { class: 'btn ghost', href: `#/p/${p.id}` }, 'Back to project'))));
      return;
    }
    const c = byId(s.order[s.i]);
    const ta = h('textarea', { rows: 3, placeholder: 'Type your answer here (optional)...', 'aria-label': 'Your answer', oninput: (e) => { s.typed = e.target.value; } }, s.typed);
    const card = h('div', { class: `flip ${s.flipped ? 'flipped' : ''}`, onclick: () => flip(), role: 'button', tabindex: 0, 'aria-label': s.flipped ? 'Card showing answer, click to see question' : 'Card showing question, click to reveal answer' },
      h('div', { class: 'face front' }, h('small', {}, c.topic || 'Question'), h('p', {}, c.q), c.diagram && renderDiagram(c.diagram), h('small', { class: 'hint' }, 'Tap to reveal')),
      h('div', { class: 'face back' }, h('small', {}, 'Answer'), c.diagram && renderDiagram(c.diagram), h('p', { class: 'pre' }, c.a),
        s.typed.trim() && h('div', { class: 'yours' }, h('small', {}, 'Your answer'), h('p', { class: 'pre' }, s.typed))));
    page(
      h('div', { class: 'row between' },
        h('a', { class: 'btn ghost', href: `#/p/${p.id}` }, '← Project'),
        h('span', { class: 'muted' }, `Card ${s.i + 1} of ${s.order.length}${c.weak ? ' · marked' : ''}`)),
      h('div', { class: 'bar' }, h('span', { style: `width:${((s.i + 1) / s.order.length) * 100}%` })),
      card,
      !s.flipped && ta,
      h('div', { class: 'row center wrapr' },
        h('button', { class: 'btn', onclick: () => go_(-1), disabled: s.i === 0 }, '← Prev'),
        h('button', { class: 'btn primary', onclick: () => flip() }, s.flipped ? 'Show question' : 'Reveal answer'),
        h('button', { class: 'btn', onclick: () => go_(1) }, 'Next →')),
      s.flipped && h('div', { class: 'row center wrapr' },
        h('button', { class: 'btn', onclick: () => { c.weak = false; persist(); go_(1); } }, '👍 Got it'),
        h('button', { class: 'btn', onclick: () => { c.weak = true; persist(); go_(1); } }, '🔁 Review again')),
      h('div', { class: 'row center' }, h('button', { class: 'btn ghost small', onclick: () => { s.order = shuffle(s.order); s.i = 0; s.flipped = false; s.typed = ''; draw(); } }, 'Shuffle'),
        h('span', { class: 'muted small' }, 'Keys: space = flip, ← → = move')));
  };
  const flip = () => { s.flipped = !s.flipped; draw(); };
  const go_ = (d) => { s.i = Math.max(0, s.i + d); s.flipped = false; s.typed = ''; draw(); };
  const restart = (onlyMarked, shuf) => {
    const pool = p.cards.filter((c) => c.q && c.a && (!onlyMarked || c.weak)).map((c) => c.id);
    s.order = shuf ? shuffle(pool) : pool;
    s.i = 0; s.flipped = false; s.typed = '';
    draw();
  };
  const onKey = (e) => {
    if (/^(TEXTAREA|INPUT)$/.test(e.target.tagName)) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); flip(); }
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (s.i < s.order.length) flip(); }
    else if (e.key === 'ArrowRight') go_(1);
    else if (e.key === 'ArrowLeft') go_(-1);
  };
  document.addEventListener('keydown', onKey);
  cleanup = () => document.removeEventListener('keydown', onKey);
  draw();
}

/* ---------- quiz ---------- */
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function fillCorrect(input, answer) {
  const a = norm(input); const b = norm(answer);
  if (!a) return false;
  return a === b || lev(a, b) <= (b.length > 8 ? 2 : b.length > 4 ? 1 : 0);
}

function renderQuiz(p) {
  if (!p.questions.length) { toast('This quiz has no questions'); return go(`#/p/${p.id}`); }
  store.markStudied();
  const s = { qs: shuffle(p.questions), i: 0, result: [], picked: null, submitted: false, revealed: false, full: true };

  const record = (q, ok) => { s.result.push({ q, ok }); s.submitted = true; };

  const draw = () => {
    if (s.i >= s.qs.length) return finish();
    const q = s.qs[s.i];
    let input;
    let body;
    if (q.type === 'mc') {
      body = h('div', { class: 'stack' }, q.options.map((o, k) => h('button', {
        class: `option ${s.submitted ? (k === q.answer ? 'right' : s.picked === k ? 'wrong' : '') : s.picked === k ? 'sel' : ''}`,
        disabled: s.submitted, onclick: () => { s.picked = k; record(q, k === q.answer); draw(); },
      }, h('b', {}, `${'ABCD'[k]}.`), ` ${o}`)));
    } else if (q.type === 'tf') {
      body = h('div', { class: 'row' }, [true, false].map((v) => h('button', {
        class: `option ${s.submitted ? (v === q.answer ? 'right' : s.picked === v ? 'wrong' : '') : ''}`,
        disabled: s.submitted, onclick: () => { s.picked = v; record(q, v === q.answer); draw(); },
      }, v ? 'True' : 'False')));
    } else if (q.type === 'fill') {
      input = h('input', { type: 'text', placeholder: 'Your answer', disabled: s.submitted, value: s.picked || '', onkeydown: (e) => { if (e.key === 'Enter') submit(); } });
      const submit = () => { s.picked = input.value; record(q, fillCorrect(input.value, q.answer)); draw(); };
      body = h('div', { class: 'stack' }, input, !s.submitted && h('button', { class: 'btn primary', onclick: submit }, 'Check'));
    } else {
      input = h('textarea', { rows: 3, placeholder: 'Write your answer, then reveal the model answer', disabled: s.revealed, value: s.picked || '' });
      body = h('div', { class: 'stack' }, input, !s.revealed && h('button', { class: 'btn primary', onclick: () => { s.picked = input.value; s.revealed = true; draw(); } }, 'Reveal answer'),
        s.revealed && !s.submitted && h('div', { class: 'stack' }, h('div', { class: 'feedback' }, h('b', {}, 'Model answer: '), q.answer), h('p', {}, 'Did you get it?'),
          h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { record(q, true); draw(); } }, 'I got it'), h('button', { class: 'btn', onclick: () => { record(q, false); draw(); } }, 'I missed it'))));
    }
    const last = s.result[s.result.length - 1];
    const fb = s.submitted && h('div', { class: `feedback ${last.ok ? 'good' : 'bad'}` },
      h('b', {}, last.ok ? '✓ Correct' : '✗ Not quite'),
      q.type !== 'short' && h('p', {}, `Answer: ${q.type === 'mc' ? q.options[q.answer] : q.type === 'tf' ? (q.answer ? 'True' : 'False') : q.answer}`),
      q.explanation && h('p', { class: 'muted' }, q.explanation));
    page(
      h('div', { class: 'row between' },
        h('a', { class: 'btn ghost', href: `#/p/${p.id}` }, '← Exit'),
        h('span', { class: 'muted' }, `Question ${s.i + 1} of ${s.qs.length}`)),
      h('div', { class: 'bar' }, h('span', { style: `width:${(s.i / s.qs.length) * 100}%` })),
      h('div', { class: 'qcard stack' }, q.topic && h('small', { class: 'muted' }, q.topic), h('h2', {}, q.q), q.diagram && renderDiagram(q.diagram), body, fb,
        s.submitted && h('button', { class: 'btn primary', onclick: () => { s.i++; s.picked = null; s.submitted = false; s.revealed = false; draw(); } }, s.i + 1 >= s.qs.length ? 'See results' : 'Next →')));
    if (input && !s.submitted && !s.revealed) input.focus();
  };

  const finish = () => {
    const score = s.result.filter((r) => r.ok).length;
    const total = s.result.length;
    if (s.full) store.update(p.id, { lastResult: { score, total, date: Date.now() } });
    const missed = s.result.filter((r) => !r.ok).map((r) => r.q);
    const again = (qs, full) => { s.qs = shuffle(qs); s.i = 0; s.result = []; s.picked = null; s.submitted = false; s.revealed = false; s.full = full; draw(); };
    page(h('div', { class: 'stack center' },
      h('h1', {}, `${score} / ${total}`),
      h('p', { class: 'muted' }, `${Math.round((score / total) * 100)}% correct`),
      h('div', { class: 'row wrapr center' },
        missed.length > 0 && h('button', { class: 'btn primary', onclick: () => again(missed, false) }, `Retry missed (${missed.length})`),
        h('button', { class: 'btn', onclick: () => again(p.questions, true) }, 'Retake all'),
        h('a', { class: 'btn ghost', href: `#/p/${p.id}` }, 'Back to project'))),
      missed.length > 0 && h('div', { class: 'stack' }, h('h2', {}, 'Review what you missed'), missed.map((q) => h('div', { class: 'feedback bad' }, h('b', {}, q.q), q.diagram && renderDiagram(q.diagram),
        h('p', {}, `Answer: ${q.type === 'mc' ? q.options[q.answer] : q.type === 'tf' ? (q.answer ? 'True' : 'False') : q.answer}`), q.explanation && h('p', { class: 'muted' }, q.explanation)))));
  };
  draw();
}

/* ---------- start ---------- */
(async () => {
  const st = await ai.status();
  state.ai = Boolean(st.ai);
  state.offline = Boolean(st.offline);
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
