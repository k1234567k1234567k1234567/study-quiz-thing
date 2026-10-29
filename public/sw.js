// App-shell cache so the site opens offline. API calls always go to the network.
const CACHE = 'studyhub-v7';
const SHELL = ['/', '/css/styles.css', '/js/app.js', '/js/ui.js', '/js/store.js', '/js/ai.js', '/js/prompts.js', '/js/pipeline.js', '/js/generate.js', '/js/images.js', '/js/ocr.js', '/js/pdf.js', '/js/diagrams.js', '/js/diagramq.js', '/js/aidiagram.js', '/js/dutil.js', '/js/diagrams2.js', '/js/diagramq2.js', '/js/diagramq3.js', '/js/diagramq4.js', '/js/diagramtopics.js', '/js/biopics.js', '/js/topics.js', '/js/figures.js', '/icon.svg'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
