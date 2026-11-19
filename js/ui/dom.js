// Kleine DOM-Hilfen: Elemente, Icons, Toasts, Modale, Effekte.
export function h(tag, attrs = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kinder.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const warte = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
export const naechsterFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
export function anim(el, frames, opts) {
  if (!el || !el.animate) return Promise.resolve();
  const a = el.animate(frames, { fill: 'forwards', ...opts });
  return a.finished.catch(() => {});
}
export const fmt = (n) => Math.round(n).toLocaleString('de-DE');
export const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString('de-DE');

export const ICON = {
  muenze: '<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="9.5" fill="#ffcc33" stroke="#9a6a10" stroke-width="1.6"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#c8901a" stroke-width="1.4"/><path d="M10 8.5h3a2 2 0 0 1 0 4h-3m0 0h3.4a2 2 0 0 1 0 4H10V8.5" fill="none" stroke="#9a6a10" stroke-width="1.6" stroke-linecap="round"/></svg>',
  pack: '<svg viewBox="0 0 24 24" class="ico"><path d="M5 3.5h14l-1 1 1 1v13l-1 1 1 1H5l1-1-1-1v-13l1-1z" fill="#8a5cff" stroke="#2a1450" stroke-width="1.4" stroke-linejoin="round"/><path d="M5 6.5h14" stroke="#ffd447" stroke-width="1.4"/><circle cx="12" cy="13" r="3.5" fill="#ffd447"/></svg>',
  staub: '<svg viewBox="0 0 24 24" class="ico"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="#bfa6ff"/><circle cx="18.5" cy="17.5" r="1.8" fill="#ffd447"/><circle cx="6" cy="18" r="1.3" fill="#5ffff0"/></svg>',
  zahnrad: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  laut: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  stumm: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>',
  herz: '<svg viewBox="0 0 24 24" class="ico herz"><path d="M12 20.5s-8-5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 3c0 5.5-8 10.5-8 10.5z" fill="#ff4f72" stroke="#7a0a1e" stroke-width="1.4"/><path d="M8 9.5a2 2 0 0 1 2-1.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7" fill="none"/></svg>',
  herzLeer: '<svg viewBox="0 0 24 24" class="ico herz leer"><path d="M12 20.5s-8-5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 3c0 5.5-8 10.5-8 10.5z" fill="#2a1d3d" stroke="#5a4a70" stroke-width="1.4"/></svg>',
  beschwoerung: '<svg viewBox="0 0 24 24" class="ico"><path d="M12 2.5l7.5 9.5L12 21.5 4.5 12z" fill="#ffd447" stroke="#8a6a10" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 2.5v19M4.5 12h15" stroke="#8a6a10" stroke-width="1" opacity=".6"/></svg>',
  schwert: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5H20v5.5L9.5 19.5l-5-5z"/><path d="M6.5 14.5l-3 3 3 3 3-3M12 12l2.5-2.5"/></svg>',
};

let toastRoot = null;
export function toast(text, art = 'info', dauer = 2600) {
  if (!toastRoot) toastRoot = document.getElementById('toast-root');
  const t = h('div', { class: 'toast ' + art, html: text });
  toastRoot.append(t);
  requestAnimationFrame(() => t.classList.add('an'));
  setTimeout(() => { t.classList.remove('an'); setTimeout(() => t.remove(), 400); }, dauer);
}

export function modal({ titel, inhalt, knoepfe = [], klasse = '', schliessbar = true, onClose }) {
  const root = document.getElementById('modal-root');
  const box = h('div', { class: 'modal ' + klasse, role: 'dialog', 'aria-modal': 'true' });
  const hg = h('div', { class: 'modal-hg' }, box);
  const zu = () => { hg.classList.remove('an'); setTimeout(() => hg.remove(), 250); document.removeEventListener('keydown', esc); onClose && onClose(); };
  const esc = (e) => { if (e.key === 'Escape' && schliessbar) zu(); };
  if (titel) box.append(h('div', { class: 'modal-kopf' }, h('h2', { html: titel }), schliessbar ? h('button', { class: 'x', 'aria-label': 'Schließen', onclick: zu, text: '×' }) : null));
  const body = h('div', { class: 'modal-body' });
  if (typeof inhalt === 'string') body.innerHTML = inhalt; else if (inhalt) body.append(inhalt);
  box.append(body);
  if (knoepfe.length) box.append(h('div', { class: 'modal-fuss' }, knoepfe.map((k) => h('button', { class: 'btn ' + (k.klasse || ''), onclick: () => { if (k.aktion && k.aktion() === false) return; if (k.schliesst !== false) zu(); }, html: k.text, disabled: k.disabled }))));
  if (schliessbar) hg.addEventListener('pointerdown', (e) => { if (e.target === hg) zu(); });
  document.addEventListener('keydown', esc);
  root.append(hg);
  requestAnimationFrame(() => hg.classList.add('an'));
  return { zu, box, body };
}

// Bildschirmerschütterung und Partikel
export function schuetteln(el = document.getElementById('app'), staerke = 1) {
  if (document.documentElement.classList.contains('wenig-bewegung')) return;
  const s = 6 * staerke;
  anim(el, Array.from({ length: 8 }, (_, i) => ({ transform: i === 7 ? 'none' : `translate(${(Math.random() - 0.5) * s}px, ${(Math.random() - 0.5) * s}px)` })), { duration: 420, easing: 'linear', fill: 'none' });
}

export function partikel(x, y, { anzahl = 40, farben = ['#ffd447', '#fff', '#ff5fd2', '#5ffff0'], weite = 260, dauer = 1100, groesse = 8 } = {}) {
  const layer = document.getElementById('fx-layer');
  if (!layer || document.documentElement.classList.contains('wenig-bewegung')) return;
  for (let i = 0; i < anzahl; i++) {
    const a = Math.random() * Math.PI * 2, r = weite * (0.35 + Math.random() * 0.65);
    const p = h('i', { class: 'partikel' });
    const g = groesse * (0.4 + Math.random());
    p.style.cssText = `left:${x}px;top:${y}px;width:${g}px;height:${g}px;background:${farben[i % farben.length]}`;
    layer.append(p);
    anim(p, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r + 60}px)) scale(.2) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: dauer * (0.6 + Math.random() * 0.6), easing: 'cubic-bezier(.15,.7,.3,1)' }).then(() => p.remove());
  }
}

export function blitzLicht(farbe = '#fff', staerke = 0.7) {
  const layer = document.getElementById('fx-layer');
  if (!layer) return;
  const f = h('div', { class: 'blitzlicht' });
  f.style.background = `radial-gradient(circle at 50% 45%, ${farbe}, transparent 70%)`;
  layer.append(f);
  anim(f, [{ opacity: staerke }, { opacity: 0 }], { duration: 700, easing: 'ease-out' }).then(() => f.remove());
}
