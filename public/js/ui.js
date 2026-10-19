// Tiny DOM helpers (no innerHTML with user text, so notes can't inject markup).
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  const add = (c) => {
    if (Array.isArray(c)) c.forEach(add);
    else if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3200);
}

export function busy(message) {
  const text = h('p', { class: 'busy-text' }, message);
  const box = h('div', { class: 'overlay', role: 'alert' }, h('div', { class: 'busy' }, h('div', { class: 'spinner' }), text));
  document.body.append(box);
  return { set: (m) => { text.textContent = m; }, close: () => box.remove() };
}

export function modal(title, body, actions = []) {
  const close = () => back.remove();
  const back = h('div', { class: 'overlay', onclick: (e) => { if (e.target === back) close(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-label': title },
      h('h2', {}, title), body,
      h('div', { class: 'row end' }, actions.map((a) => h('button', { class: a.primary ? 'btn primary' : 'btn', onclick: () => { if (a.onClick?.() !== false) close(); } }, a.label)))));
  document.body.append(back);
  return close;
}
