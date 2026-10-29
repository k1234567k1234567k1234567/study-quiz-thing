// Decorative banner for a project page (made by /api/art when HF_TOKEN is set; otherwise nothing is shown).
// The space is reserved first and the picture fades in once it has loaded, so the page never jumps or flashes.
import { hasArt } from './ai.js';

export const artUrl = (name) => `/api/art?q=${encodeURIComponent(String(name).trim().slice(0, 60))}`;

export function banner(project, onLoaded) {
  if (!hasArt()) return null;
  const box = document.createElement('div');
  box.className = 'art';
  const img = new Image();
  img.alt = '';
  img.decoding = 'async';
  img.addEventListener('load', () => { box.classList.add('ready'); onLoaded?.(); });
  img.addEventListener('error', () => box.remove()); // no picture is better than a broken one
  img.src = artUrl(project.name);
  box.append(img);
  return box;
}
