// Sprite-Werkstatt: 1. Bild-Prompts für alle 640 Monster erzeugen, 2. fertige Bilder importieren.
// Bilder werden im Browser freigestellt, zugeschnitten und in das Kartenformat (880×640) gesetzt.
import { ELEMENTE } from '../js/elements.js';
import { ARTEN, FORMEN } from '../js/species.js';
import { CONFIG } from '../js/config.js';
import { monsterBild, monsterMerkmale, farbName } from '../js/monsterart.js';
import { ladeSprites, spriteUrl, spriteAnzahl } from '../js/sprites.js';
import { initTexturen } from '../js/cardview.js';

// ---------- Prompt-Bausteine (Englisch, damit Bildgeneratoren sie gut verstehen) ----------
const STIL_STANDARD = 'Original monster creature for a collectible card game, cute but cool, chunky readable silhouette, clean bold dark outlines, soft cel shading with gentle highlights, vibrant saturated colors, expressive face, polished 2D game sprite, consistent art style';
const NEGATIV_STANDARD = 'text, letters, watermark, signature, logo, card frame, border, multiple creatures, human, photo, realistic, 3d render, blurry, cropped, cut off, existing franchise characters';
const BILDAUFBAU = 'single creature, full body visible with some margin, centered, three-quarter view facing left, plain white background';

const ELEMENT_EN = [
  ['fire', 'living flames, a fiery crest, glowing embers'],
  ['lava', 'molten rock skin with glowing lava cracks'],
  ['coal', 'charcoal-black body with smoldering ember spots and wisps of smoke'],
  ['stone', 'rocky stone plates and mossy patches'],
  ['crystal', 'translucent crystal spikes with prismatic facets'],
  ['salt', 'white salt-crystal cubes with pale pink mineral accents'],
  ['water', 'aquatic fins, glossy wet skin, water droplets'],
  ['plant', 'leaves and a flower growing from its body, little vines'],
  ['beast', 'wild animal traits, fur, claws and a mane'],
  ['humanoid', 'kobold, gnome or small golem features with simple clothing'],
  ['art', 'paint splashes, a paintbrush tail, playful artistic flair'],
  ['philosophy', 'a wise look, a third eye, a floating halo or book'],
  ['math', 'geometric shapes and glowing math symbols floating around it'],
  ['gravity', 'small rocks orbiting it, a heavy grounded stance'],
  ['electric', 'lightning-bolt shapes, crackling sparks, electric glow'],
  ['light', 'a radiant glow and a halo of light rays'],
  ['ice', 'icy spikes, frost and snowflakes, translucent ice'],
  ['deep-sea pressure', 'deep-sea features, a bioluminescent lure, bubbles'],
  ['cyber', 'glowing circuit lines, digital pixels, holographic details'],
  ['space', 'starry cosmic skin, a tiny ringed planet orbiting it'],
  ['gas', 'a body made of mist and clouds, wispy and semi-transparent'],
  ['radioactive', 'glowing toxic green spots and a radiation glow'],
  ['metal', 'polished steel armor plates with rivets'],
  ['mechanical', 'clockwork gears, brass parts and a wind-up key'],
  ['plastic', 'a glossy toy-like plastic body with visible seams and studs'],
  ['mythical', 'dragon wings, horns and a small golden crown'],
  ['acid', 'dripping corrosive slime and bubbling acid'],
  ['neutron', 'glowing particles orbiting it like an atom'],
  ['quantum', 'a ghostly blurred duplicate and flickering probability dots'],
  ['singularity', 'a tiny black hole with an accretion disc in its chest'],
  ['time', 'a clock face on its belly and hourglass details'],
  ['darkness', 'shadowy wisps, glowing eyes, crescent-moon horns'],
];
const FORM_EN = [
  ['baby-stage', 'small and adorable with an oversized head'],
  ['young', 'playful and energetic'],
  ['adult', 'confident and strong'],
  ['legendary', 'majestic and imposing with a faint glowing aura'],
];
const ROLLE_EN = {
  angreifer: ['aggressive', 'sharp claws and fangs'], tank: ['armored', 'thick protective armor plates'],
  wildling: ['feral', 'wild untamed spines or fur'], riese: ['giant', 'a heavy towering build'],
  sonderling: ['strange', 'odd mysterious proportions'], wirbler: ['nimble', 'a quick restless pose'],
  koloss: ['colossal', 'a massive bulky body'], kommandant: ['regal', 'a proud posture and a small crest'],
};
// Jungtiere sind klein: Größen-Rollen werden dort weicher beschrieben
const ROLLE_JUNG = { riese: ['chubby', 'a sturdy little build'], koloss: ['plump', 'a round heavy little body'] };
const KOERPER_EN = {
  blob: 'round squishy blob-shaped body with stubby feet and tiny arms',
  zweibeiner: 'small bipedal body with a big head, short legs and a tail',
  vierbeiner: 'four-legged body with a sturdy torso and a tail',
  schlange: 'long serpentine coiled body without legs',
  schweber: 'floating ghost-like body with a wispy lower half and no legs',
  flieger: 'round body with two large wings',
  humanoid: 'small humanoid body standing upright with arms and legs',
};
const AUGEN_EN = { rund: 'big round eyes', boese: 'fierce eyes with angry brows', muede: 'sleepy half-closed eyes', zyklop: 'a single large cyclops eye', katze: 'cat-like slit-pupil eyes', gross: 'huge sparkling eyes', klein: 'small beady eyes', drei: 'three eyes', visier: 'a glowing visor instead of eyes', gluehend: 'glowing eyes without pupils' };
const MUND_EN = { laecheln: 'a friendly smile', zahn: 'a grin with one small fang', offen: 'an open happy mouth', zickzack: 'a jagged zigzag mouth', schnabel: 'a small beak', keiner: '' };
const KOPF_EN = { ohren: 'pointed ears', hoerner: 'curved horns', antennen: 'two antennae tipped with glowing orbs', rundohren: 'round ears', flossen: 'fin-shaped ears', buschel: 'a tuft of hair on top', keiner: '' };
const MUSTER_EN = { keins: '', punkte: 'spotted skin', streifen: 'striped markings', flecken: 'patchy markings', sterne: 'small star-shaped markings', rauten: 'diamond-shaped markings' };
const SCHWANZ_EN = { pfeil: 'a tail ending in an arrowhead tip', kugel: 'a tail ending in a round orb', buschel: 'a fluffy tail tip', blatt: 'a leaf-shaped tail tip' };

const LS = 'cardle-werkstatt';
const einst = Object.assign({ stil: STIL_STANDARD, negativ: NEGATIV_STANDARD, el: 0, nurOhne: false }, (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } })());
const merke = () => { try { localStorage.setItem(LS, JSON.stringify(einst)); } catch { /* egal */ } };

export const dateiName = (id) => String(id).padStart(3, '0') + '.webp';

export function promptFuer(art, stil = einst.stil) {
  const m = monsterMerkmale(art.id);
  const P = m.P;
  const [elWort, elMotiv] = ELEMENT_EN[art.el];
  const [formWort, formText] = FORM_EN[art.form];
  const [rolleWort, rolleText] = (art.form === 0 && ROLLE_JUNG[art.rolle]) || ROLLE_EN[art.rolle] || ['', ''];
  const teile = [
    `${/^[aeiou]/i.test(formWort) ? 'an' : 'a'} ${formWort} ${rolleWort} ${elWort} monster`,
    KOERPER_EN[art.bauplan], elMotiv, formText, rolleText,
    `main color ${farbName(P.body)}, ${farbName(P.belly)} belly, ${farbName(P.acc)} accents, ${farbName(P.iris)} eyes`,
    AUGEN_EN[m.augen], MUND_EN[m.mund], KOPF_EN[m.kopf], MUSTER_EN[m.muster],
    m.schwanz ? SCHWANZ_EN[m.schwanz] : '', m.stacheln ? 'a row of spikes along its back' : '',
  ].filter(Boolean);
  return `${stil.trim().replace(/\.$/, '')}. Subject: ${teile.join(', ')}. ${BILDAUFBAU}.`;
}

function alleZeilen() {
  return ARTEN.map((a) => ({
    id: a.id, datei: dateiName(a.id), name: a.name, element: ELEMENTE[a.el].name, bauplan: a.bauplan,
    form: FORMEN[a.form], rolle: CONFIG.rollen[a.rolle].name, prompt: promptFuer(a), negativ: einst.negativ.trim(),
  }));
}
const csvFeld = (v) => `"${String(v).replace(/"/g, '""')}"`;
function exporte() {
  const zeilen = alleZeilen();
  const kopf = ['id', 'datei', 'name', 'element', 'bauplan', 'form', 'rolle', 'prompt', 'negativ'];
  return {
    'prompts.csv': '﻿' + [kopf.join(','), ...zeilen.map((z) => kopf.map((k) => csvFeld(z[k])).join(','))].join('\r\n') + '\r\n',
    'prompts.txt': zeilen.map((z) => z.prompt).join('\n') + '\n',
    'prompts.json': JSON.stringify({ stil: einst.stil, negativ: einst.negativ, bildaufbau: BILDAUFBAU, format: 'PNG oder WebP, Zielname laut Feld "datei", Motiv auf weißem oder transparentem Hintergrund', monster: zeilen }, null, 1),
  };
}

// ---------- Server ----------
let serverKannSpeichern = false;
async function pruefeServer() {
  try { const r = await fetch('/__index', { method: 'POST' }); serverKannSpeichern = r.ok; } catch { serverKannSpeichern = false; }
  return serverKannSpeichern;
}
async function speichereImProjekt(name, inhalt) {
  const r = await fetch('/__speichern?datei=' + encodeURIComponent(name), { method: 'POST', body: inhalt });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).fehler || r.status);
  return r.json();
}
function herunterladen(name, inhalt, typ = 'text/plain') {
  const blob = inhalt instanceof Blob ? inhalt : new Blob([inhalt], { type: typ });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- Freistellen und Einpassen ----------
const ZIEL_B = 880, ZIEL_H = 640, BODEN = 604;
function ladeBild(datei) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('Bild nicht lesbar')); img.src = URL.createObjectURL(datei); });
}
// Hintergrund ab den Rändern per Flutfüllung entfernen (für einfarbige Hintergründe, z. B. weiß)
function freistellen(ctx, w, h, toleranz) {
  const bild = ctx.getImageData(0, 0, w, h), d = bild.data;
  const ecken = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => (y * w + x) * 4);
  if (ecken.every((i) => d[i + 3] < 20)) return false; // schon transparent
  const ref = [0, 1, 2].map((k) => ecken.reduce((s, i) => s + d[i + k], 0) / 4);
  const t2 = toleranz * toleranz * 3;
  const nah = (i) => { const a = d[i] - ref[0], b = d[i + 1] - ref[1], c = d[i + 2] - ref[2]; return a * a + b * b + c * c <= t2; };
  const besucht = new Uint8Array(w * h);
  const stapel = [];
  for (let x = 0; x < w; x++) { stapel.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stapel.push(y * w, y * w + w - 1); }
  while (stapel.length) {
    const p = stapel.pop();
    if (besucht[p]) continue;
    besucht[p] = 1;
    const i = p * 4;
    if (!nah(i)) continue;
    d[i + 3] = 0;
    const x = p % w, y = (p - x) / w;
    if (x > 0) stapel.push(p - 1);
    if (x < w - 1) stapel.push(p + 1);
    if (y > 0) stapel.push(p - w);
    if (y < h - 1) stapel.push(p + w);
  }
  // Kanten weich: halbtransparente Säume an freigestellten Nachbarn
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (d[i + 3] === 0) continue;
    const x = p % w;
    const n = (x > 0 && d[i - 1] === 0) + (x < w - 1 && d[i + 7] === 0) + (p >= w && d[i - w * 4 + 3] === 0) + (p < w * (h - 1) && d[i + w * 4 + 3] === 0);
    if (n) d[i + 3] = Math.round(d[i + 3] * (1 - n * 0.18));
  }
  ctx.putImageData(bild, 0, 0);
  return true;
}
function umriss(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
export async function verarbeite(datei, { entfernen = true, toleranz = 38 } = {}) {
  const img = await ladeBild(datei);
  const s0 = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * s0), h = Math.round(img.naturalHeight * s0);
  const roh = document.createElement('canvas'); roh.width = w; roh.height = h;
  const rc = roh.getContext('2d', { willReadFrequently: true });
  rc.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  const freigestellt = entfernen ? freistellen(rc, w, h, toleranz) : false;
  const box = umriss(rc, w, h) || { x: 0, y: 0, w, h };
  const s = Math.min(760 / box.w, 560 / box.h);
  const bw = box.w * s, bh = box.h * s;
  const ziel = document.createElement('canvas'); ziel.width = ZIEL_B; ziel.height = ZIEL_H;
  const zc = ziel.getContext('2d');
  zc.save(); zc.filter = 'blur(9px)'; zc.fillStyle = 'rgba(0,0,0,.32)';
  zc.beginPath(); zc.ellipse(ZIEL_B / 2, BODEN, bw * 0.42, 18, 0, 0, Math.PI * 2); zc.fill(); zc.restore();
  zc.imageSmoothingQuality = 'high';
  zc.drawImage(roh, box.x, box.y, box.w, box.h, (ZIEL_B - bw) / 2, BODEN - bh, bw, bh);
  const blob = await new Promise((r) => ziel.toBlob(r, 'image/webp', 0.9));
  const webp = blob && blob.type === 'image/webp';
  return { blob: webp ? blob : await new Promise((r) => ziel.toBlob(r, 'image/png')), endung: webp ? 'webp' : 'png', vorschau: ziel.toDataURL('image/png'), freigestellt };
}

// Monster-ID aus dem Dateinamen: führende Zahl (007.png, 7_feuer.png) oder Monstername
const normal = (t) => t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
export function erkenneId(name) {
  const m = name.match(/^(\d{1,3})(?!\d)/);
  if (m && Number(m[1]) < ARTEN.length) return Number(m[1]);
  const n = normal(name.replace(/\.[a-z0-9]+$/i, ''));
  const treffer = ARTEN.filter((a) => n.includes(normal(a.name))).sort((a, b) => b.name.length - a.name.length)[0];
  return treffer ? treffer.id : null;
}

// ---------- Oberfläche ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function zeichneStatus() {
  $('#status').innerHTML = `<b>${spriteAnzahl()}</b> / ${ARTEN.length} Monster haben ein importiertes Bild · ${serverKannSpeichern ? '<span class="gut">Speichern ins Projekt aktiv</span>' : '<span class="warn">Kein Werkstatt-Server: Dateien werden heruntergeladen. Starte <code>python tools/serve.py</code>.</span>'}`;
}

function zeichnePrompts() {
  const liste = $('#prompt-liste');
  const arten = ARTEN.filter((a) => (einst.el < 0 || a.el === einst.el) && (!einst.nurOhne || !spriteUrl(a.id)));
  liste.innerHTML = arten.map((a) => {
    const b = monsterBild(a.id, false);
    return `<div class="zeile">
  <div class="vorschau" style="background-image:url('${b.bg}')"><img src="${b.fgGeneriert}" alt=""></div>
  <div class="vorschau ${b.sprite ? '' : 'leer'}" style="background-image:url('${b.bg}')">${b.sprite ? `<img src="${b.fg}" alt="">` : '<span>noch kein Bild</span>'}</div>
  <div class="info"><b>#${String(a.id).padStart(3, '0')} ${esc(a.name)}</b><small>${esc(ELEMENTE[a.el].name)} · ${esc(a.bauplan)} · ${esc(FORMEN[a.form])} · ${esc(CONFIG.rollen[a.rolle].name)} · Datei <code>${dateiName(a.id)}</code></small>
  <textarea readonly rows="3">${esc(promptFuer(a))}</textarea></div>
  <button class="btn klein kopieren" data-id="${a.id}">Kopieren</button>
</div>`;
  }).join('') || '<p class="leise">Keine Monster für diesen Filter.</p>';
  $('#anzahl').textContent = `${arten.length} Monster`;
}

const importe = [];
function zeichneImporte() {
  const box = $('#import-liste');
  box.innerHTML = importe.map((x, i) => {
    const a = x.id != null ? ARTEN[x.id] : null;
    const bg = a ? monsterBild(a.id, false).bg : '';
    return `<div class="imp ${x.status}">
  <div class="vorschau gross" style="${bg ? `background-image:url('${bg}')` : ''}"><img src="${x.vorschau}" alt=""></div>
  <div class="imp-info"><small>${esc(x.name)}${x.freigestellt ? ' · Hintergrund entfernt' : ''}</small>
  <label>Monster-Nr. <input type="number" min="0" max="${ARTEN.length - 1}" value="${x.id ?? ''}" data-i="${i}" class="id-feld"></label>
  <b>${a ? `${esc(a.name)} · ${esc(ELEMENTE[a.el].name)}` : '<span class="warn">Nummer eintragen</span>'}</b>
  <span class="imp-status">${esc(x.meldung || '')}</span></div>
  <div class="imp-knoepfe"><button class="btn klein primaer" data-speichern="${i}" ${x.id == null ? 'disabled' : ''}>${serverKannSpeichern ? 'Speichern' : 'Herunterladen'}</button><button class="btn klein" data-weg="${i}">Entfernen</button></div>
</div>`;
  }).join('');
  $('#alle-speichern').disabled = !importe.some((x) => x.id != null && x.status !== 'gespeichert');
}

async function speichereImport(i) {
  const x = importe[i];
  if (x.id == null) return;
  const name = String(x.id).padStart(3, '0') + '.' + x.endung;
  try {
    if (serverKannSpeichern) { await speichereImProjekt(name, x.blob); await ladeSprites(); x.meldung = `gespeichert als assets/monster/${name}`; }
    else { herunterladen(name, x.blob); x.meldung = `heruntergeladen: ${name} nach assets/monster/ legen`; }
    x.status = 'gespeichert';
  } catch (e) { x.status = 'fehler'; x.meldung = 'Fehler: ' + e.message; }
  zeichneImporte(); zeichneStatus();
}

async function dateienAufnehmen(dateien) {
  for (const datei of dateien) {
    if (!/^image\//.test(datei.type)) continue;
    const eintrag = { name: datei.name, id: erkenneId(datei.name), status: 'neu', meldung: 'wird verarbeitet …', vorschau: '' };
    importe.push(eintrag); zeichneImporte();
    try {
      Object.assign(eintrag, await verarbeite(datei, { entfernen: $('#entfernen').checked, toleranz: Number($('#toleranz').value) }));
      eintrag.meldung = eintrag.id == null ? 'Nummer nicht erkannt' : 'bereit';
    } catch (e) { eintrag.status = 'fehler'; eintrag.meldung = e.message; }
    zeichneImporte();
  }
}

async function start() {
  initTexturen();
  await ladeSprites();
  await pruefeServer();
  zeichneStatus();
  // Prompts
  const elWahl = $('#el-wahl');
  elWahl.innerHTML = `<option value="-1">Alle Elemente</option>` + ELEMENTE.map((e, i) => `<option value="${i}">${esc(e.name)}</option>`).join('');
  elWahl.value = einst.el;
  elWahl.onchange = () => { einst.el = Number(elWahl.value); merke(); zeichnePrompts(); };
  $('#nur-ohne').checked = einst.nurOhne;
  $('#nur-ohne').onchange = (e) => { einst.nurOhne = e.target.checked; merke(); zeichnePrompts(); };
  $('#stil').value = einst.stil;
  $('#negativ').value = einst.negativ;
  $('#stil').onchange = (e) => { einst.stil = e.target.value; merke(); zeichnePrompts(); };
  $('#negativ').onchange = (e) => { einst.negativ = e.target.value; merke(); };
  $('#stil-reset').onclick = () => { einst.stil = STIL_STANDARD; einst.negativ = NEGATIV_STANDARD; $('#stil').value = einst.stil; $('#negativ').value = einst.negativ; merke(); zeichnePrompts(); };
  $('#prompt-liste').addEventListener('click', async (e) => {
    const b = e.target.closest('.kopieren'); if (!b) return;
    const text = promptFuer(ARTEN[Number(b.dataset.id)]);
    try { await navigator.clipboard.writeText(text); b.textContent = 'Kopiert ✓'; } catch { b.closest('.zeile').querySelector('textarea').select(); b.textContent = 'Markiert'; }
    setTimeout(() => (b.textContent = 'Kopieren'), 1500);
  });
  for (const [knopf, datei, typ] of [['#dl-csv', 'prompts.csv', 'text/csv'], ['#dl-txt', 'prompts.txt', 'text/plain'], ['#dl-json', 'prompts.json', 'application/json']]) {
    $(knopf).onclick = () => herunterladen(datei, exporte()[datei], typ + ';charset=utf-8');
  }
  $('#ins-projekt').onclick = async () => {
    const b = $('#ins-projekt');
    if (!serverKannSpeichern) { b.textContent = 'Nur mit tools/serve.py'; return; }
    const ex = exporte();
    for (const [name, inhalt] of Object.entries(ex)) await speichereImProjekt(name, new Blob([inhalt]));
    b.textContent = 'Gespeichert in assets/monster/ ✓';
  };
  zeichnePrompts();
  // Import
  const zone = $('#drop');
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('an'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('an'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('an'); dateienAufnehmen([...e.dataTransfer.files]); });
  $('#datei-wahl').onchange = (e) => dateienAufnehmen([...e.target.files]);
  $('#import-liste').addEventListener('click', (e) => {
    const s = e.target.closest('[data-speichern]'); if (s) return speichereImport(Number(s.dataset.speichern));
    const w = e.target.closest('[data-weg]'); if (w) { importe.splice(Number(w.dataset.weg), 1); zeichneImporte(); }
  });
  $('#import-liste').addEventListener('change', (e) => {
    const f = e.target.closest('.id-feld'); if (!f) return;
    const v = f.value === '' ? null : Math.max(0, Math.min(ARTEN.length - 1, Number(f.value)));
    importe[Number(f.dataset.i)].id = v; importe[Number(f.dataset.i)].status = 'neu';
    zeichneImporte();
  });
  $('#alle-speichern').onclick = async () => { for (let i = 0; i < importe.length; i++) if (importe[i].id != null && importe[i].status !== 'gespeichert') await speichereImport(i); };
  document.querySelectorAll('.reiter button').forEach((b) => b.onclick = () => {
    document.querySelectorAll('.reiter button').forEach((x) => x.classList.toggle('an', x === b));
    document.querySelectorAll('.tab').forEach((t) => (t.hidden = t.id !== b.dataset.tab));
  });
}

start();
