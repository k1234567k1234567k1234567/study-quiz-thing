// Basic mode only: on-device OCR with Tesseract.js (free, nothing is uploaded).
const SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let loading;

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  loading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => { loading = null; reject(new Error('Could not load the offline reader. Check your internet connection.')); };
    document.head.appendChild(s);
  });
  return loading;
}

export async function ocrImages(images, onProgress = () => {}) {
  const T = await loadTesseract();
  const out = [];
  for (let i = 0; i < images.length; i++) {
    const { data } = await T.recognize(images[i], 'eng', {
      logger: (m) => { if (m.status === 'recognizing text') onProgress(`Reading photo ${i + 1} of ${images.length}: ${Math.round(m.progress * 100)}%`); },
    });
    out.push(data.text.trim());
  }
  return out.join('\n---\n');
}
