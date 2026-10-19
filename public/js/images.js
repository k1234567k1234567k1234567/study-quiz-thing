// Photos are shrunk before upload/OCR: faster, and well inside request size limits.
const MAX_SIDE = 1600;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = src;
  });
}

function draw(img, rotate = 0) {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  const turned = rotate % 180 !== 0;
  canvas.width = turned ? h : w;
  canvas.height = turned ? w : h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function fileToDataUrl(file) {
  const url = URL.createObjectURL(file);
  try { return draw(await loadImage(url)); }
  finally { URL.revokeObjectURL(url); }
}

export async function rotateDataUrl(dataUrl) {
  return draw(await loadImage(dataUrl), 90);
}
