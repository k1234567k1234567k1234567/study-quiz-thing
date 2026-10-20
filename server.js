// Study Hub server: serves ./public and forwards AI requests to NVIDIA's API.
// The API key stays here (from .env) and is never sent to the browser.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { forward, hasKey, textModels, visionModels } from './api/_ai.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const PORT = Number(process.env.PORT) || 3000;
const RPM = Number(process.env.RPM_LIMIT) || 35; // free tier is about 40/min
const MAX_BODY = 30 * 1024 * 1024;

const hits = [];
function throttle() {
  const now = Date.now();
  while (hits.length && now - hits[0] > 60000) hits.shift();
  if (hits.length >= RPM) return Math.ceil((60000 - (now - hits[0])) / 1000);
  hits.push(now);
  return 0;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};

function send(res, status, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, { 'Content-Type': isObj ? 'application/json' : 'text/plain', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Request too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleAI(req, res) {
  if (!hasKey()) return send(res, 503, { error: 'no_key', message: 'No NVIDIA_API_KEY set in .env' });
  let payload;
  try { payload = JSON.parse(await readBody(req)); }
  catch (e) { return send(res, e.status || 400, { error: 'bad_request', message: e.message }); }
  if (!Array.isArray(payload.messages) || !payload.messages.length) {
    return send(res, 400, { error: 'bad_request', message: 'messages required' });
  }
  const wait = throttle();
  if (wait) return send(res, 429, { error: 'rate', message: 'Slow down a moment', retryAfter: wait });

  const { status, body } = await forward(payload);
  if (typeof body === 'string') {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    return res.end(body);
  }
  send(res, status, body);
}

function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  });
}

http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');
    if (pathname === '/api/status' && req.method === 'GET') {
      return send(res, 200, { ai: hasKey(), model: textModels()[0], visionModel: visionModels()[0] });
    }
    if (pathname === '/api/ai' && req.method === 'POST') return await handleAI(req, res);
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
    send(res, 405, 'Method not allowed');
  } catch (e) {
    send(res, 500, { error: 'server', message: e.message });
  }
}).listen(PORT, () => {
  console.log(`Study Hub running at http://localhost:${PORT}`);
  console.log(hasKey() ? `AI: on (${textModels().join(', ')} / ${visionModels().join(', ')})` : 'AI: off. Add NVIDIA_API_KEY to .env for AI mode (basic mode still works).');
});
