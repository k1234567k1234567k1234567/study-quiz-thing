// Reads lesson PDFs on this device (pdf.js is bundled in /vendor, nothing is uploaded).
// Text pages become plain text; pages with no text (scans) are rendered as images so the
// normal photo path (AI vision or on-device OCR) can read them.
const SRC = '/vendor/pdfjs/pdf.min.js';
const WORKER = '/vendor/pdfjs/pdf.worker.min.js';
let loading;

function loadLib() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  loading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER; resolve(window.pdfjsLib); };
    s.onerror = () => { loading = null; reject(new Error('Could not load the PDF reader.')); };
    document.head.appendChild(s);
  });
  return loading;
}

async function open(file) {
  const lib = await loadLib();
  try { return await lib.getDocument({ data: await file.arrayBuffer() }).promise; }
  catch (e) {
    if (e?.name === 'PasswordException') throw new Error('That PDF is password protected. Remove the password and try again.');
    throw new Error('Could not read that PDF. Is it a valid, un-damaged file?');
  }
}

export async function pdfPageCount(file) {
  const doc = await open(file);
  const n = doc.numPages;
  doc.destroy();
  return n;
}

// Turns pdf.js text items into lines using their positions on the page.
function pageText(items) {
  const lines = [];
  let line = '';
  let lastY = null;
  let lastEnd = null;
  for (const it of items) {
    if (!('str' in it)) continue;
    const [, , , , x, y] = it.transform;
    if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line); line = ''; lastEnd = null; }
    if (lastEnd !== null && x - lastEnd > 1 && line && !line.endsWith(' ') && !it.str.startsWith(' ')) line += ' ';
    line += it.str;
    lastY = y;
    lastEnd = x + (it.width || 0);
    if (it.hasEOL) { lines.push(line); line = ''; lastY = null; lastEnd = null; }
  }
  if (line) lines.push(line);
  return lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

const MIN_TEXT = 25; // fewer characters than this on a page = probably a scan
const MAX_SCANS = 20;

// from/to are 1-based page numbers (inclusive). Returns { text, scans: [dataUrl], pages }.
export async function readPdf(file, { from = 1, to = Infinity, onProgress = () => {} } = {}) {
  const doc = await open(file);
  const last = Math.min(to, doc.numPages);
  const parts = [];
  const scans = [];
  let skipped = 0;
  try {
    for (let n = Math.max(1, from); n <= last; n++) {
      onProgress(`Reading page ${n - from + 1} of ${last - from + 1}...`);
      const page = await doc.getPage(n);
      const text = pageText((await page.getTextContent()).items);
      if (text.replace(/\s/g, '').length >= MIN_TEXT) parts.push(text);
      else if (scans.length < MAX_SCANS) {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        scans.push(canvas.toDataURL('image/jpeg', 0.85));
      } else skipped++;
      page.cleanup();
    }
  } finally { doc.destroy(); }
  return { text: parts.join('\n\n'), scans, pages: last - Math.max(1, from) + 1, skipped };
}
