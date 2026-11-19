// Basic mode only: on-device OCR with Tesseract.js (free, nothing is uploaded).
// The reader is kept on this site (public/vendor/tesseract) so it works on school networks that block public CDNs; the CDN is only a fallback.
const LOCAL = '/vendor/tesseract';
const SRC = `${LOCAL}/tesseract.min.js`;
const CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let usingLocal = true;
let loading;

function addScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => { s.remove(); reject(new Error('script failed')); };
    document.head.appendChild(s);
  });
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  loading ||= addScript(SRC)
    .catch(() => { usingLocal = false; return addScript(CDN); })
    .catch(() => { loading = null; throw new Error('Could not load the offline reader. Check your internet connection and try again.'); });
  return loading;
}

// Where the reader finds its worker, engine and English data: this site first (nothing is downloaded from elsewhere).
const here = (path) => new URL(path, location.href).href;
const options = () => (usingLocal ? { workerPath: here(`${LOCAL}/worker.min.js`), corePath: here(`${LOCAL}/core`), langPath: here(`${LOCAL}/lang`), gzip: true } : {});

export async function ocrImages(images, onProgress = () => {}) {
  const T = await loadTesseract();
  const out = [];
  for (let i = 0; i < images.length; i++) {
    const { data } = await T.recognize(images[i], 'eng', {
      ...options(),
      logger: (m) => { if (m.status === 'recognizing text') onProgress(`Reading photo ${i + 1} of ${images.length}: ${Math.round(m.progress * 100)}%`); },
    });
    out.push(data.text.trim());
  }
  return out.join('\n---\n');
}
