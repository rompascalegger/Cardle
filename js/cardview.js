// Kartendarstellung: Aufbau, 3D-Neigung zum Zeiger, ortsabhängige Effekte, Umdrehen. [FEST 13.1] [VORSCHLAG 13.3]
import { CONFIG, KLASSEN, LOOKS, HOLO_NAMEN } from './config.js';
import { ELEMENTE, farbe, farbton, glyphSVG, beziehungen, faktorText } from './elements.js';
import { ATTRIBUTE, attrIcon } from './attributes.js';
import { EFFEKT, effektText } from './effects.js';
import { trivia } from './trivia.js';
import { ARTEN, FORMEN } from './species.js';
import { monsterBild } from './monsterart.js';
import { staerke, kosten, kartenSeltenheit, lookAnzahl, hatLook, seltenheitsChancen, pHolo, pEffekte, prozent, einsVon, plaetzeBelegt, plaetzeBringt, teamplatzMult } from './rules.js';

export const STUFEN_FARBEN = ['#000', '#9aa3ad', '#5fd35f', '#3fa7ff', '#7a6cff', '#c45cff', '#ff5fd2', '#ff9b2f', '#ffd23f', '#5ffff0', '#ff3b5c', '#ffffff', '#ff8af0', '#8affd2', '#ffe9a8'];
export const stufenFarbe = (s) => STUFEN_FARBEN[Math.max(1, Math.min(14, s))];
export const stufenName = (s) => CONFIG.seltenheit.namen[s - 1];
export const stufenKurz = (s) => CONFIG.seltenheit.kurz[s - 1];
const CHANCEN = seltenheitsChancen();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const zahl = (n) => (Math.round(n * 10) / 10).toLocaleString('de-DE');

let bewegungReduziert = globalThis.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;
export function setzeBewegung(modus) {
  const sys = globalThis.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  bewegungReduziert = modus === 'reduziert' || (modus === 'auto' && sys);
  document.documentElement.classList.toggle('wenig-bewegung', bewegungReduziert);
}
export const istBewegungReduziert = () => bewegungReduziert;

// ---------- Aufbau ----------
export function karteHTML(c, opts = {}) {
  const art = ARTEN[c.art];
  const el = art.el;
  const kl = KLASSEN[c.kl];
  const st = kartenSeltenheit(c);
  const sum = staerke(c.a);
  const kost = kosten(c);
  const bild = monsterBild(c.art, opts.animiert !== false);
  const looks = LOOKS.map((l, i) => (hatLook(c.looks, i) ? ' look-' + l.key : '')).join('');
  const attr = ATTRIBUTE.filter((a) => !['kapazitaet', 'heilung'].includes(a.key) || c.a[a.key] > 0).map((a) =>
    `<span class="k-a${c.a[a.key] ? '' : ' null'}" data-tip="${esc(a.name)}: ${c.a[a.key]}">${attrIcon(a.key)}${CONFIG.zahlNebenSymbol ? `<i>${c.a[a.key]}</i>` : ''}</span>`).join('');
  // Effekt-Seltenheit 1–5 färbt die Zeile (grün, blau, violett, golden, rot) [Nutzer, 24.11.2026]
  const fx = c.fx.map((id, i) => { const e = EFFEKT[id]; const st = c.fxs?.[i] || 1; return `<span class="k-fx-b fxs-${st}${e.blitz ? ' blitz' : ''}" style="--fxc:${CONFIG.effektStufen.farben[st - 1]}" data-tip="${esc(e.name)} · ${CONFIG.effektStufen.namen[st - 1]} (+${st} Beschwörung): ${esc(effektText(id, st))}">${e.blitz ? '⚡' : '✦'} ${esc(e.name)}${e.skaliert ? ` <b class="fx-stufe">${'I II III IV V'.split(' ')[st - 1]}</b>` : ''}</span>`; }).join('');
  const kopien = (n, cls) => Array.from({ length: n }, (_, i) => `<img class="${cls} ${cls}${i}" src="${bild.fg}" alt="" draggable="false">`).join('');
  const lookKopien = (hatLook(c.looks, 3) ? kopien(2, 'k-gl') : '') + (hatLook(c.looks, 4) ? kopien(2, 'k-fd') : '');
  const rueck = opts.rueckseite === 'info' ? infoRueckseite(c) : logoRueckseite();
  return `<div class="karte kl-${kl.key} holo-${c.holo} st-${st}${looks}${c.fx.length ? ' hat-fx fx-' + c.fx.length : ''}${opts.verdeckt ? ' gedreht' : ''}${opts.klein ? ' klein' : ''}" style="--elh:${farbton(el).toFixed(0)};--el:${farbe(el)};--stc:${stufenFarbe(st)}" data-stufe="${st}">
<div class="k-dreh"><div class="k-flip">
<div class="k-vorne">
 <div class="k-rahmen"></div>
 <div class="k-panel">
  <div class="k-kopf"><span class="k-name">${esc(art.name)}</span><span class="k-staerke" data-tip="Stärke ${sum} = Lebenspunkte"><b>${sum}</b></span></div>
  <div class="k-bild" title="${esc(trivia(c.art).text)}"><div class="k-bild-inhalt">
   <img class="k-bg" src="${bild.bg}" alt="" draggable="false">
   <div class="k-rh"></div>
   <div class="k-monster"><img class="k-fg" src="${bild.fg}" alt="${esc(art.name)}" draggable="false">${lookKopien}</div>
  </div>
   <div class="k-holo"></div><div class="k-scan"></div>
   ${lookMarken(c)}
   <div class="k-siegel" data-tip="${esc(ELEMENTE[el].name)}">${glyphSVG(el)}</div>
   <div class="k-stufe" data-tip="Kartenseltenheit: ${esc(stufenName(st))} (${einsVon(CHANCEN[st])} pro Karte)">${esc(stufenKurz(st))}</div>
  </div>
  <div class="k-attr">${attr}</div>
  <div class="k-fx">${fx || `<p class="k-trivia">${esc(trivia(c.art).text)}</p>`}</div>
  <div class="k-fuss"><span>${esc(ELEMENTE[el].name)}</span><span class="k-kl">${kl.name}</span>${kost !== sum ? `<span class="k-kost" data-tip="Beschwörungskosten">◆${kost}</span>` : `<span>#${String(c.art + 1).padStart(3, '0')}</span>`}</div>
 </div>
 <div class="k-secret"></div>
 ${c.fx.length ? streifenHTML(c.fx.length) : ''}
 <div class="k-glanz"></div>
</div>
<div class="k-hinten">${rueck}</div>
</div></div></div>`;
}

// Kleine Marken für Holo-Stufe und Zusatzlooks, damit man sieht, was auf der Karte passiert [Nutzer, 21.11.2026]
const LOOK_SYMBOL = ['⇋', '⇅', '◐', '▚', '⧉'];
const HOLO_SYMBOL = { reverse: 'RH', holo: 'H', secret: 'SH', ghost: 'GR' };
function lookMarken(c) {
  const m = [];
  if (c.holo !== 'keins') m.push(`<span class="k-marke holo-${c.holo}" data-tip="${esc(HOLO_NAMEN[c.holo])}">${HOLO_SYMBOL[c.holo]}</span>`);
  LOOKS.forEach((l, i) => { if (hatLook(c.looks, i)) m.push(`<span class="k-marke look" data-tip="${esc(l.name)}">${LOOK_SYMBOL[i]}</span>`); });
  return m.length ? `<div class="k-marken">${m.join('')}</div>` : '';
}

// Rangabzeichen für Effektkarten: ein goldener Winkel je Effekt, links und rechts am Rahmen [Nutzer, 21.11.2026]
function streifenHTML(n) {
  const winkel = Array.from({ length: n }, () => '<svg viewBox="0 0 24 14" aria-hidden="true"><path d="M1 1 L12 8 L23 1 L23 6 L12 13 L1 6Z" fill="url(#fxgold)" stroke="#3a2400" stroke-width="1.1" stroke-linejoin="round"/></svg>').join('');
  const defs = '<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="fxgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".45" stop-color="#ffd447"/><stop offset="1" stop-color="#b8780b"/></linearGradient></defs></svg>';
  return `${defs}<div class="k-streifen links" data-tip="${n} Spezialeffekt${n > 1 ? 'e' : ''}">${winkel}</div><div class="k-streifen rechts">${winkel}</div>`;
}

export function logoRueckseite() {
  return `<div class="rs-logo"><div class="rs-rad"></div><div class="rs-text">${esc(CONFIG.spielname.toUpperCase())}</div><div class="rs-sub">MONSTER · 32 ELEMENTE</div></div>`;
}

export function infoHTML(c) { return infoRueckseite(c); }
function infoRueckseite(c) {
  const art = ARTEN[c.art];
  const el = art.el;
  const kl = KLASSEN[c.kl];
  const st = kartenSeltenheit(c);
  const b = beziehungen(el);
  const k = lookAnzahl(c.looks);
  const pk = CONFIG.lookChance;
  const zeile = (l, r) => `<div class="rs-z"><span>${l}</span><b>${r}</b></div>`;
  const elName = (v) => ELEMENTE[v].name;
  return `<div class="rs-info">
<h4>${esc(art.name)}</h4>
<div class="rs-sub2">${esc(ELEMENTE[el].name)} · ${esc(FORMEN[art.form] || '')} · ${esc(CONFIG.rollen[art.rolle].name)} · ${kl.name}${art.silber ? ' · <b class="silber-art">Silber-Monster (selten, nur Silber)</b>' : ''}</div>
${(() => { const t = trivia(art.id); return `<p class="rs-trivia">${esc(t.text)}</p><div class="rs-masse"><span>Größe ${t.groesse}</span><span>Gewicht ${t.gewicht}</span></div>`; })()}
<div class="rs-attr">${ATTRIBUTE.map((a) => `<div>${attrIcon(a.key)}<span>${a.name}</span><b>${c.a[a.key]}</b></div>`).join('')}</div>
${zeile('Stärke / Leben', staerke(c.a))}${zeile('Beschwörung', kosten(c))}${zeile('Teamplätze', `${plaetzeBelegt(c)} belegt${plaetzeBringt(c) ? `, +${plaetzeBringt(c)}` : ''}`)}${zeile('Angriff ×', zahl(teamplatzMult(c.a.teamplatz)))}
<div class="rs-h">Elementrad</div>
<div class="rs-el"><span class="gut">stark gegen</span> ${b.stark.slice(0, 3).map((x) => `${elName(x.v)} ${faktorText(x.f)}`).join(', ')}</div>
<div class="rs-el"><span class="schlecht">schwach gegen</span> ${b.schwach.slice(0, 3).map((x) => `${elName(x.v)} ${faktorText(x.f)}`).join(', ')}</div>
<div class="rs-el"><span class="erz">Gegenpol</span> ${elName(b.gegenpol)} ×2,5 ↔</div>
<div class="rs-h">Chancen pro Karte</div>
${zeile('Klasse ' + kl.name, prozent(kl.chance))}
${zeile(HOLO_NAMEN[c.holo], prozent(pHolo(c.holo)))}
${zeile(`${k} Zusatzlook${k === 1 ? '' : 's'}`, k ? prozent(pk ** k) + ' je Satz' : '–')}
${zeile(`${c.fx.length} Effekt${c.fx.length === 1 ? '' : 'e'}`, prozent(pEffekte(c.fx.length)))}
${zeile(stufenName(st), einsVon(CHANCEN[st]))}
${c.fx.length ? `<div class="rs-h">Effekte</div>${c.fx.map((id, i) => { const st = c.fxs?.[i] || 1; return `<div class="rs-fx" style="--fxc:${CONFIG.effektStufen.farben[st - 1]}"><b>${esc(EFFEKT[id].name)}</b> <i class="fx-sel">${CONFIG.effektStufen.namen[st - 1]} · +${st}</i> ${esc(effektText(id, st))}</div>`; }).join('')}` : ''}
</div>`;
}

export function karteElement(c, opts = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = karteHTML(c, opts);
  const el = wrap.firstElementChild;
  if (opts.interaktiv !== false) bindeNeigung(el, opts);
  if (opts.drehbar) el.addEventListener('click', (e) => { if (!e.target.closest('button')) el.classList.toggle('gedreht'); });
  return el;
}

// ---------- Neigung mit Federung ----------
const aktive = new Set();
let schleife = false;
function tick() {
  for (const s of aktive) {
    const k = 0.14, d = 0.72;
    s.vx = (s.vx + (s.tx - s.x) * k) * d;
    s.vy = (s.vy + (s.ty - s.y) * k) * d;
    s.x += s.vx; s.y += s.vy;
    s.g += ((s.ziel ? 1 : 0) - s.g) * 0.12;
    const st = s.el.style;
    const max = bewegungReduziert ? 3 : (s.max || 15);
    st.setProperty('--px', (s.x * 100).toFixed(2) + '%');
    st.setProperty('--py', (s.y * 100).toFixed(2) + '%');
    st.setProperty('--rx', ((0.5 - s.y) * 2 * max).toFixed(2) + 'deg');
    st.setProperty('--ry', ((s.x - 0.5) * 2 * max).toFixed(2) + 'deg');
    st.setProperty('--dx', (s.x - 0.5).toFixed(3));
    st.setProperty('--dy', (s.y - 0.5).toFixed(3));
    st.setProperty('--glanz', s.g.toFixed(3));
    st.setProperty('--hyp', Math.min(1, Math.hypot(s.x - 0.5, s.y - 0.5) * 2).toFixed(3));
    if (!s.ziel && Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.x - 0.5) + Math.abs(s.y - 0.5) < 0.002 && s.g < 0.01) {
      aktive.delete(s);
      st.setProperty('--glanz', '0');
    }
  }
  if (aktive.size) requestAnimationFrame(tick); else schleife = false;
}
function starte(s) { aktive.add(s); if (!schleife) { schleife = true; requestAnimationFrame(tick); } }

export function bindeNeigung(el, opts = {}) {
  const s = { el, x: 0.5, y: 0.5, vx: 0, vy: 0, tx: 0.5, ty: 0.5, g: 0, ziel: false, max: opts.maxNeigung };
  el._neigung = s;
  const nurMaus = opts.nurMaus;
  el.addEventListener('pointermove', (e) => {
    if (nurMaus && e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    s.tx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    s.ty = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    s.ziel = true;
    // ortsabhängig [VORSCHLAG 13.3]
    const t = e.target;
    el.classList.toggle('heiss-bild', !!t.closest('.k-bild'));
    el.classList.toggle('heiss-rahmen', !!(t.closest('.k-rahmen') || t.closest('.k-kopf') || t.closest('.k-fuss')));
    starte(s);
  });
  const weg = () => { s.tx = 0.5; s.ty = 0.5; s.ziel = false; el.classList.remove('heiss-bild', 'heiss-rahmen'); starte(s); };
  el.addEventListener('pointerleave', weg);
  el.addEventListener('pointercancel', weg);
  return s;
}

// Gyrosensor [VORSCHLAG 13.3]: neigt alle großen Karten
let gyroAn = false;
export async function aktiviereGyro() {
  if (gyroAn || !globalThis.DeviceOrientationEvent) return false;
  try { if (DeviceOrientationEvent.requestPermission) { const p = await DeviceOrientationEvent.requestPermission(); if (p !== 'granted') return false; } } catch { return false; }
  gyroAn = true;
  addEventListener('deviceorientation', (e) => {
    if (e.beta == null) return;
    const x = Math.max(0, Math.min(1, 0.5 + (e.gamma || 0) / 60));
    const y = Math.max(0, Math.min(1, 0.5 + ((e.beta || 0) - 40) / 60));
    document.querySelectorAll('.karte.gyro').forEach((el) => { const s = el._neigung; if (s) { s.tx = x; s.ty = y; s.ziel = true; starte(s); } });
  });
  return true;
}

// ---------- Tooltip (global) ----------
export function initTooltip() {
  const tip = document.createElement('div');
  tip.id = 'tooltip';
  document.body.appendChild(tip);
  let aktiv = null;
  const zeige = (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t !== aktiv) {
      aktiv = t;
      if (t) { tip.textContent = t.dataset.tip; tip.classList.add('an'); } else tip.classList.remove('an');
    }
    if (aktiv) {
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let x = e.clientX + 14, y = e.clientY - h - 12;
      if (x + w > innerWidth - 8) x = innerWidth - w - 8;
      if (y < 8) y = e.clientY + 18;
      tip.style.transform = `translate(${x}px, ${y}px)`;
    }
  };
  document.addEventListener('pointermove', zeige, { passive: true });
  document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') zeige(e); }, { passive: true });
  document.addEventListener('scroll', () => { aktiv = null; tip.classList.remove('an'); }, { passive: true, capture: true });
}

// Glitzer-Textur einmalig erzeugen
export function initTexturen() {
  let dots = '';
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) dots += `<circle cx="${(rnd() * 200).toFixed(1)}" cy="${(rnd() * 200).toFixed(1)}" r="${(0.4 + rnd() * 1.3).toFixed(2)}" fill="#fff" opacity="${(0.3 + rnd() * 0.7).toFixed(2)}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">${dots}</svg>`;
  document.documentElement.style.setProperty('--glitzer', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  // Facetten für Diamond: unregelmäßige Dreiecke in Weiß, Eisblau und Violett wie ein geschliffener Kristall
  let fac = '';
  const pt = [];
  for (let y = 0; y <= 6; y++) for (let x = 0; x <= 6; x++) pt.push([x * 20 + (x % 6 ? (rnd() - 0.5) * 12 : 0), y * 20 + (y % 6 ? (rnd() - 0.5) * 12 : 0)]);
  const P = (x, y) => pt[y * 7 + x];
  const toene = ['255,255,255', '200,240,255', '225,215,255', '210,255,245', '255,230,250'];
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
    const [a1, b1, c1, d1] = [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)];
    for (const tri of [[a1, b1, c1], [a1, c1, d1]]) fac += `<path d="M${tri.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L')}Z" fill="rgb(${toene[Math.floor(rnd() * toene.length)]})" fill-opacity="${(0.15 + rnd() * 0.8).toFixed(2)}" stroke="#fff" stroke-opacity=".7" stroke-width=".6"/>`;
  }
  document.documentElement.style.setProperty('--facetten', `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">${fac}</svg>`)}")`);
  let rad = '';
  for (let i = 0; i < 32; i++) rad += `hsl(${farbton(i).toFixed(0)} 80% 58%) ${(i / 32 * 100).toFixed(3)}% ${((i + 1) / 32 * 100).toFixed(3)}%,`;
  document.documentElement.style.setProperty('--rad', `conic-gradient(from -5.6deg, ${rad.slice(0, -1)})`);
}

export { esc, zahl };
