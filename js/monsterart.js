// Prozedurale Monsterkunst als SVG. [VORSCHLAG 13.2] Ein gemeinsamer Stil für alle 32 Elemente.
// Platzhalter für echte Kunst ([OFFEN] Monster): Jede Art bekommt aus ihrem Seed Bauplan, Augen, Mund und Element-Schmuck.
// Ausgabe: zwei Bilder (Hintergrund, Monster) als data-URL, damit Holo-Schichten dazwischen liegen können.
import { seeded } from './rng.js';
import { ARTEN } from './species.js';
import { spriteUrl } from './sprites.js';

const PAL = [ // Körper, dunkel, Bauch, Akzent, Iris, Hintergrund oben, Hintergrund unten
  ['#ff7a2f', '#c2361a', '#ffd36b', '#ffe14d', '#ffcf3f', '#3a0c06', '#b8400f'],
  ['#5b2b22', '#2f1310', '#ff9b3d', '#ff6a00', '#ffb347', '#1e0603', '#7a1a08'],
  ['#44444e', '#1c1c22', '#62626e', '#ff7b29', '#ff9a3d', '#0e0e11', '#3a2a22'],
  ['#9a8f80', '#5d554b', '#c4baa9', '#86b35a', '#6fd1ff', '#2f2c28', '#7e7466'],
  ['#8fd3ff', '#4a7fd1', '#e3f6ff', '#d58cff', '#b05cff', '#141844', '#4d5bb5'],
  ['#f1ece4', '#a99f92', '#ffffff', '#ff9fb5', '#5aa0ff', '#4a525c', '#b9c2cc'],
  ['#2f8cff', '#1559b5', '#a9e1ff', '#5ff0ff', '#ffd84a', '#041f44', '#1b74c9'],
  ['#5cc947', '#2e7d32', '#d6f5a3', '#ff79b0', '#ffcf3f', '#0b2e10', '#3f8f3a'],
  ['#c07a3e', '#6e4220', '#f0d2a8', '#ffe28a', '#7ad64a', '#2a1d10', '#7a5a2d'],
  ['#cf9f7d', '#8a5f45', '#f3d3b8', '#4c6fff', '#3d8bff', '#241f30', '#6b5a7a'],
  ['#ff5fa2', '#c2337a', '#fff0f6', '#ffd23f', '#3fa7ff', '#2e1640', '#a43f8a'],
  ['#8f7cff', '#5b45c9', '#e2dcff', '#ffd86b', '#ffd86b', '#171332', '#4c3f8f'],
  ['#43c6b5', '#1f7f74', '#d5fff9', '#ffffff', '#ff6b6b', '#082424', '#1e6a66'],
  ['#6b5bd6', '#3a2f8a', '#b7adff', '#ff9f43', '#ff9f43', '#0a081e', '#2a2266'],
  ['#ffe03a', '#c99a00', '#fff6b8', '#4ad6ff', '#3a7bff', '#13133a', '#3c3c8a'],
  ['#fff4c2', '#e8b83a', '#ffffff', '#ffd84a', '#ffb000', '#ffeab0', '#ffc35a'],
  ['#c4ecff', '#6fb6e6', '#ffffff', '#8ff3ff', '#2a8cff', '#0c2440', '#5aa0d6'],
  ['#1f5878', '#0c2a3c', '#4f8fb0', '#7dffcf', '#7dffcf', '#010810', '#0a2a44'],
  ['#30336f', '#15163a', '#4248a0', '#00f0ff', '#ff2bd6', '#04040d', '#141a3a'],
  ['#2a1d58', '#100a2b', '#40308a', '#ffffff', '#9fd8ff', '#020210', '#1a0f3d'],
  ['#d4dcea', '#8e9bb3', '#f4f7fb', '#9ad7ff', '#5a7dff', '#36425c', '#9fb0cc'],
  ['#a4ff3f', '#4f9e12', '#e6ffb0', '#f9ff4a', '#1d1d1d', '#0a1605', '#2c4a10'],
  ['#b9c3cd', '#66717e', '#e8edf2', '#ffcc4d', '#ff4a4a', '#1b2127', '#58626d'],
  ['#c98d3e', '#7a5222', '#f0d39a', '#9aa6b3', '#56e0ff', '#271d12', '#6b5333'],
  ['#ff5d95', '#d02a66', '#ffe0ec', '#4fd2ff', '#4fd2ff', '#ffd9e8', '#ff9cc4'],
  ['#8344e8', '#4a1fa0', '#f0d7ff', '#ffd447', '#ffd447', '#170d30', '#5a2d82'],
  ['#c6ff1a', '#6f9900', '#f3ffb0', '#00ff9c', '#ff3d6e', '#081400', '#2e4a00'],
  ['#5f6cff', '#2c35b3', '#c9ceff', '#ff5f8f', '#ff5f8f', '#080b26', '#262f7a'],
  ['#ff7af6', '#a83fd6', '#ffe1fc', '#5ffff0', '#5ffff0', '#170a2a', '#4b1f6b'],
  ['#1a1028', '#050208', '#2e1b48', '#ff8a2a', '#ffb35a', '#000000', '#1b0b2e'],
  ['#dcb56e', '#8f6a2e', '#f7e7c2', '#5fd0ff', '#3d6bff', '#191729', '#4c4370'],
  ['#2e2142', '#120b1e', '#43325f', '#b45cff', '#ff3b5c', '#040207', '#1c1029'],
];

// ---------- Farbhilfen ----------
const hx = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const hell = (c, t) => mix(c, '#ffffff', t);
const dunkel = (c, t) => mix(c, '#000000', t);
const f1 = (n) => Math.round(n * 10) / 10;
function zuHsl(hex) {
  let [r, g, b] = hx(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function ausHsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
const dreheFarbe = (hex, dh, dl = 0, ds = 0) => { const [h, s, l] = zuHsl(hex); return ausHsl(h + dh, s + ds, l + dl); };
const IRIS = ['#ffcf3f', '#3fd0ff', '#7aff6b', '#ff5fa2', '#b46bff', '#ff8a2a', '#5ffff0', '#ff3b5c'];

// Farbvariante je Art, damit sich die 20 Monster eines Elements unterscheiden. Element bleibt erkennbar.
function variiere(P0, r, form) {
  const P = { ...P0 };
  const v = r.int(0, 9);
  let dh = 0, dl = 0;
  if (v === 1) dh = 16 + r.int(0, 14);
  else if (v === 2) dh = -(16 + r.int(0, 14));
  else if (v === 3) dh = 36 + r.int(0, 22);
  else if (v === 4) dh = -(36 + r.int(0, 22));
  else if (v === 5) dl = 0.1;
  else if (v === 6) dl = -0.1;
  if (v === 7) { const b = P.body; P.body = mix(P.acc, P.body, 0.3); P.dark = dunkel(P.body, 0.38); P.acc = b; }
  else if (dh || dl) { P.body = dreheFarbe(P.body, dh, dl); P.dark = dreheFarbe(P.dark, dh, dl * 0.7); P.belly = dreheFarbe(P.belly, dh * 0.5, dl * 0.5); }
  if (r.chance(0.4)) P.iris = r.pick(IRIS);
  if (form === 3) P.acc = hell(P.acc, 0.1);
  P.O = dunkel(P.dark, 0.55); P.hi = hell(P.body, 0.45);
  return P;
}

export function palette(el) {
  const [body, dark, belly, acc, iris, bg1, bg2] = PAL[el];
  return { body, dark, belly, acc, iris, bg1, bg2, O: dunkel(dark, 0.55), hi: hell(body, 0.45) };
}

// ---------- Formen ----------
function flamme(x, y, s, c1, c2, cls = 'flk') {
  const d = 'M0,0 C-12,0 -16,-12 -10,-22 C-8,-16 -4,-14 -3,-18 C-5,-28 2,-34 0,-42 C10,-34 14,-24 10,-14 C13,-16 15,-20 14,-24 C20,-14 16,0 0,0Z';
  return `<g class="${cls}" transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="${d}" fill="${c1}"/><path d="${d}" transform="translate(0 -2) scale(.58)" fill="${c2}"/></g>`;
}
function kristall(x, y, h, w, rot, c, O) {
  const d = `M0,0 L${-w},${-h * 0.22} L${-w},${-h * 0.78} L0,${-h} L${w},${-h * 0.78} L${w},${-h * 0.22}Z`;
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><path d="${d}" fill="${c}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/><path d="M0,0 L0,${-h} L${-w},${-h * 0.78} L${-w},${-h * 0.22}Z" fill="#fff" opacity=".35"/><path d="M0,${-h} L0,0" stroke="#fff" stroke-width="1" opacity=".6"/></g>`;
}
function blatt(x, y, s, rot, c, O) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0,0 C8,-6 8,-20 0,-30 C-8,-20 -8,-6 0,0Z" fill="${c}" stroke="${O}" stroke-width="2"/><path d="M0,-2 L0,-24" stroke="${dunkel(c, 0.3)}" stroke-width="1.5"/></g>`;
}
function stern(x, y, r, c, cls = '') {
  return `<path class="${cls}" d="M${f1(x)},${f1(y - r)} Q${f1(x)},${f1(y)} ${f1(x + r)},${f1(y)} Q${f1(x)},${f1(y)} ${f1(x)},${f1(y + r)} Q${f1(x)},${f1(y)} ${f1(x - r)},${f1(y)} Q${f1(x)},${f1(y)} ${f1(x)},${f1(y - r)}Z" fill="${c}"/>`;
}
function blitzForm(x, y, s, c, O, rot = 0) {
  return `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})" d="M2,-22 L-8,-2 L-1,-2 L-5,16 L9,-6 L2,-6 L7,-22Z" fill="${c}" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>`;
}
function zahnrad(x, y, r, z, c, O, dauer = 0) {
  let d = '';
  for (let i = 0; i < z * 2; i++) {
    const a0 = (i / (z * 2)) * Math.PI * 2, a1 = ((i + 1) / (z * 2)) * Math.PI * 2;
    const rr = i % 2 ? r : r * 1.22;
    d += `${i ? 'L' : 'M'}${f1(x + Math.cos(a0) * rr)},${f1(y + Math.sin(a0) * rr)} L${f1(x + Math.cos(a1) * rr)},${f1(y + Math.sin(a1) * rr)} `;
  }
  return `<g>${dauer ? spin(x, y, Math.abs(dauer), dauer < 0) : ''}<path d="${d}Z" fill="${c}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.38)}" fill="${dunkel(c, 0.45)}" stroke="${O}" stroke-width="1.5"/></g>`;
}
function tropfen(x, y, s, c, O) {
  return `<path transform="translate(${f1(x)} ${f1(y)}) scale(${s})" d="M0,-9 C3,-4 6,-1 6,3 A6,6 0 0 1 -6,3 C-6,-1 -3,-4 0,-9Z" fill="${c}" stroke="${O}" stroke-width="1.5"/>`;
}
const spin = (cx, cy, dauer, rueck = false) => `<animateTransform attributeName="transform" type="rotate" additive="sum" from="${rueck ? 360 : 0} ${f1(cx)} ${f1(cy)}" to="${rueck ? 0 : 360} ${f1(cx)} ${f1(cy)}" dur="${dauer}s" repeatCount="indefinite"/>`;
const kreis = (x, y, r, fill, extra = '') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${fill}" ${extra}/>`;
const ell = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${fill}" ${extra}/>`;

// ---------- Körper nach Bauplan ----------
function koerper(bp, r, P) {
  const S = `stroke="${P.O}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
  const K = 'url(#kb)', B = 'url(#kc)';
  const back = [], body = [], A = {};
  if (bp === 'blob') {
    const cx = 110, cy = 102, rx = 44 + r.int(-4, 6), ry = 40 + r.int(-3, 4);
    const top = cy - ry, bot = cy + ry * 0.92;
    back.push(ell(cx - rx * 0.45, bot + 1, 13, 8, K, S), ell(cx + rx * 0.45, bot + 1, 13, 8, K, S));
    const d = `M${cx - rx},${cy} C${cx - rx},${top + ry * 0.2} ${cx - rx * 0.55},${top} ${cx},${top} C${cx + rx * 0.55},${top} ${cx + rx},${top + ry * 0.2} ${cx + rx},${cy} C${cx + rx},${bot} ${cx + rx * 0.6},${bot + 4} ${cx},${bot + 4} C${cx - rx * 0.6},${bot + 4} ${cx - rx},${bot} ${cx - rx},${cy}Z`;
    A.pfad = d;
    body.push(`<path d="${d}" fill="${K}" ${S}/>`, ell(cx, cy + ry * 0.42, rx * 0.58, ry * 0.42, B));
    body.push(ell(cx - rx - 1, cy + 14, 9, 13, K, `${S} transform="rotate(25 ${cx - rx - 1} ${cy + 14})"`), ell(cx + rx + 1, cy + 14, 9, 13, K, `${S} transform="rotate(-25 ${cx + rx + 1} ${cy + 14})"`));
    Object.assign(A, { cx, eyeX: cx, eyeY: cy - ry * 0.2, gap: rx * 0.36, eyeR: rx * 0.2, mundY: cy + ry * 0.14, kopfR: Math.min(rx, ry), krone: { x: cx, y: top + 3 }, ohren: [{ x: cx - rx * 0.62, y: top + ry * 0.32 }, { x: cx + rx * 0.62, y: top + ry * 0.32 }], ruecken: { x: cx + rx * 0.72, y: cy - ry * 0.5 }, schwanz: { x: cx + rx * 0.92, y: cy + ry * 0.45 }, brust: { x: cx, y: cy + ry * 0.42 }, haende: [{ x: cx - rx - 3, y: cy + 24 }, { x: cx + rx + 3, y: cy + 24 }], boden: bot + 6, rx, ry, cy });
  } else if (bp === 'zweibeiner') {
    const hr = 30 + r.int(-2, 4), hy = 72;
    back.push(`<path d="M132,128 C158,130 170,112 164,96" fill="none" stroke="${P.O}" stroke-width="13" stroke-linecap="round"/><path d="M132,128 C158,130 170,112 164,96" fill="none" stroke="${P.body}" stroke-width="8" stroke-linecap="round"/>`);
    back.push(ell(97, 141, 11, 9, K, S), ell(123, 141, 11, 9, K, S));
    body.push(ell(110, 117, 28, 25, K, S), ell(110, 122, 18, 15, B));
    body.push(ell(83, 115, 8, 14, K, `${S} transform="rotate(28 83 115)"`), ell(137, 115, 8, 14, K, `${S} transform="rotate(-28 137 115)"`));
    body.push(kreis(110, hy, hr, K, S));
    A.pfad = `M80,${hy} A30,30 0 1 1 140,${hy} A30,30 0 1 1 80,${hy}Z`;
    Object.assign(A, { cx: 110, eyeX: 110, eyeY: hy + 2, gap: hr * 0.4, eyeR: hr * 0.25, mundY: hy + hr * 0.52, kopfR: hr, krone: { x: 110, y: hy - hr + 2 }, ohren: [{ x: 110 - hr * 0.75, y: hy - hr * 0.6 }, { x: 110 + hr * 0.75, y: hy - hr * 0.6 }], ruecken: { x: 132, y: 104 }, schwanz: { x: 164, y: 96 }, brust: { x: 110, y: 122 }, haende: [{ x: 78, y: 126 }, { x: 142, y: 126 }], boden: 150, rx: 28, ry: 25, cy: 117 });
  } else if (bp === 'vierbeiner') {
    const hx0 = 66, hy = 84, hr = 26 + r.int(-1, 3);
    back.push(`<path d="M162,100 C184,96 190,74 178,62" fill="none" stroke="${P.O}" stroke-width="12" stroke-linecap="round"/><path d="M162,100 C184,96 190,74 178,62" fill="none" stroke="${P.body}" stroke-width="7" stroke-linecap="round"/>`);
    for (const [x, dk] of [[104, 0.25], [156, 0.25]]) back.push(`<rect x="${x - 7}" y="112" width="14" height="36" rx="7" fill="${dunkel(P.body, dk)}" ${S}/>`);
    body.push(ell(120, 106, 46, 25, K, S), ell(116, 116, 30, 11, B));
    for (const x of [86, 138]) body.push(`<rect x="${x - 7}" y="114" width="14" height="35" rx="7" fill="${K}" ${S}/>`);
    body.push(kreis(hx0, hy, hr, K, S), ell(hx0 - 14, hy + 12, 14, 10, B, S));
    body.push(ell(hx0 - 22, hy + 8, 3, 2.2, P.O));
    A.pfad = `M74,106 C74,80 120,80 166,106 C166,132 74,132 74,106Z`;
    Object.assign(A, { cx: 110, eyeX: hx0 - 2, eyeY: hy - 3, gap: hr * 0.36, eyeR: hr * 0.24, mundY: hy + 16, mundX: hx0 - 14, kopfR: hr, krone: { x: hx0, y: hy - hr + 2 }, ohren: [{ x: hx0 - hr * 0.7, y: hy - hr * 0.6 }, { x: hx0 + hr * 0.7, y: hy - hr * 0.6 }], ruecken: { x: 124, y: 82 }, schwanz: { x: 178, y: 62 }, brust: { x: 112, y: 112 }, haende: [{ x: 86, y: 148 }, { x: 138, y: 148 }], boden: 150, rx: 46, ry: 25, cy: 106 });
  } else if (bp === 'schlange') {
    const d = 'M178,140 C150,152 100,150 78,134 C58,118 76,98 104,104 C134,110 142,88 116,72';
    back.push(`<path d="${d}" fill="none" stroke="${P.O}" stroke-width="31" stroke-linecap="round"/>`, `<path d="${d}" fill="none" stroke="url(#kl)" stroke-width="25" stroke-linecap="round"/>`, `<path d="${d}" fill="none" stroke="${P.belly}" stroke-width="8" stroke-linecap="round" stroke-dasharray="5 6" opacity=".55" transform="translate(0 5)"/>`, `<path d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".28" transform="translate(-2 -6)"/>`);
    body.push(ell(110, 64, 28, 23, K, S), ell(110, 74, 16, 9, B));
    A.pfad = 'M82,64 A28,23 0 1 1 138,64 A28,23 0 1 1 82,64Z';
    Object.assign(A, { cx: 110, eyeX: 110, eyeY: 60, gap: 11, eyeR: 7, mundY: 76, kopfR: 25, krone: { x: 110, y: 42 }, ohren: [{ x: 90, y: 48 }, { x: 130, y: 48 }], ruecken: { x: 148, y: 116 }, schwanz: { x: 180, y: 140 }, brust: { x: 92, y: 124 }, haende: [{ x: 70, y: 128 }, { x: 150, y: 146 }], boden: 152, rx: 50, ry: 40, cy: 110 });
  } else if (bp === 'schweber') {
    const d = 'M68,90 A42,42 0 0 1 152,90 L152,124 Q145,141 137,126 Q129,143 120,128 Q110,147 100,128 Q91,143 83,126 Q75,141 68,124 Z';
    body.push(`<path d="${d}" fill="${K}" ${S}/>`, ell(110, 110, 26, 16, B, 'opacity=".8"'));
    body.push(ell(64, 104, 7, 12, K, `${S} transform="rotate(35 64 104)"`), ell(156, 104, 7, 12, K, `${S} transform="rotate(-35 156 104)"`));
    A.pfad = d;
    Object.assign(A, { cx: 110, eyeX: 110, eyeY: 86, gap: 15, eyeR: 9.5, mundY: 104, kopfR: 42, krone: { x: 110, y: 50 }, ohren: [{ x: 80, y: 60 }, { x: 140, y: 60 }], ruecken: { x: 148, y: 78 }, schwanz: { x: 110, y: 138 }, brust: { x: 110, y: 110 }, haende: [{ x: 60, y: 112 }, { x: 160, y: 112 }], boden: 152, schwebt: true, rx: 42, ry: 40, cy: 96 });
  } else if (bp === 'flieger') {
    const wing = r.chance(0.5)
      ? 'M92,92 C70,60 44,56 26,66 C34,74 34,80 30,88 C40,88 44,94 42,102 C54,98 60,104 62,112 C72,104 82,104 90,110Z'
      : 'M92,94 C72,62 40,52 22,58 C30,70 26,78 36,84 C28,92 34,100 46,100 C42,110 52,116 64,112 C72,116 82,112 90,108Z';
    back.push(`<path d="${wing}" fill="url(#kw)" ${S}/>`, `<path d="${wing}" transform="translate(220 0) scale(-1 1)" fill="url(#kw)" ${S}/>`);
    back.push(ell(100, 138, 8, 7, P.acc, S), ell(120, 138, 8, 7, P.acc, S));
    body.push(kreis(110, 104, 34, K, S), ell(110, 118, 20, 15, B));
    A.pfad = 'M76,104 A34,34 0 1 1 144,104 A34,34 0 1 1 76,104Z';
    Object.assign(A, { cx: 110, eyeX: 110, eyeY: 97, gap: 13, eyeR: 8.5, mundY: 112, kopfR: 34, krone: { x: 110, y: 72 }, ohren: [{ x: 88, y: 78 }, { x: 132, y: 78 }], ruecken: { x: 110, y: 84 }, schwanz: { x: 128, y: 134 }, brust: { x: 110, y: 120 }, haende: [{ x: 80, y: 120 }, { x: 140, y: 120 }], boden: 148, fluegel: true, rx: 34, ry: 34, cy: 104 });
  } else { // humanoid
    const hr = 22 + r.int(0, 3);
    back.push(`<rect x="94" y="122" width="13" height="27" rx="6" fill="${dunkel(P.body, 0.15)}" ${S}/>`, `<rect x="113" y="122" width="13" height="27" rx="6" fill="${dunkel(P.body, 0.15)}" ${S}/>`);
    back.push(`<path d="M86,90 C76,100 72,112 72,124" fill="none" stroke="${P.O}" stroke-width="14" stroke-linecap="round"/><path d="M86,90 C76,100 72,112 72,124" fill="none" stroke="${P.body}" stroke-width="9" stroke-linecap="round"/>`);
    back.push(`<path d="M134,90 C144,100 148,112 148,124" fill="none" stroke="${P.O}" stroke-width="14" stroke-linecap="round"/><path d="M134,90 C144,100 148,112 148,124" fill="none" stroke="${P.body}" stroke-width="9" stroke-linecap="round"/>`);
    back.push(kreis(72, 126, 7, K, S), kreis(148, 126, 7, K, S));
    const torso = 'M88,84 C96,78 124,78 132,84 C136,100 134,116 128,128 C116,132 104,132 92,128 C86,116 84,100 88,84Z';
    body.push(`<path d="${torso}" fill="${K}" ${S}/>`, ell(110, 108, 13, 14, B, 'opacity=".9"'));
    body.push(kreis(110, 60, hr, K, S));
    A.pfad = torso;
    Object.assign(A, { cx: 110, eyeX: 110, eyeY: 61, gap: hr * 0.4, eyeR: hr * 0.24, mundY: 72, kopfR: hr, krone: { x: 110, y: 60 - hr + 2 }, ohren: [{ x: 110 - hr * 0.95, y: 58 }, { x: 110 + hr * 0.95, y: 58 }], ruecken: { x: 134, y: 92 }, schwanz: { x: 130, y: 126 }, brust: { x: 110, y: 106 }, haende: [{ x: 72, y: 128 }, { x: 148, y: 128 }], boden: 150, rx: 24, ry: 30, cy: 104, guertelY: 120 });
  }
  return { back, body, A };
}

// ---------- Augen und Mund ----------
function augen(A, stil, P) {
  const O = P.O, out = [];
  const { eyeX: x0, eyeY: y, gap } = A;
  let er = A.eyeR;
  if (stil === 'gross') { er *= 1.24; stil = 'rund'; }
  if (stil === 'klein') { er *= 0.74; stil = 'klein'; }
  const pos = stil === 'zyklop' ? [[x0, er * 1.45]] : stil === 'drei' ? [[x0 - gap, er], [x0 + gap, er], [x0, er * 0.7, -er * 1.9]] : [[x0 - gap, er], [x0 + gap, er]];
  if (stil === 'visier') {
    const w = gap + er * 1.6;
    out.push(`<rect x="${f1(x0 - w)}" y="${f1(y - er * 0.85)}" width="${f1(w * 2)}" height="${f1(er * 1.7)}" rx="${f1(er * 0.85)}" fill="#0b0f1a" stroke="${O}" stroke-width="2.2"/>`);
    out.push(ell(x0 - gap, y, er * 0.6, er * 0.42, P.iris, 'filter="url(#gl)"'), ell(x0 + gap, y, er * 0.6, er * 0.42, P.iris, 'filter="url(#gl)"'));
    out.push(`<rect x="${f1(x0 - w + 3)}" y="${f1(y - er * 0.55)}" width="${f1(w * 0.7)}" height="2" rx="1" fill="#fff" opacity=".35"/>`);
    return out.join('');
  }
  pos.forEach(([x, rr, dy = 0], i) => {
    const yy = y + dy;
    if (stil === 'gluehend') {
      out.push(ell(x, yy, rr * 1.05, rr * 0.72, P.iris, 'filter="url(#gl)"'), ell(x - rr * 0.2, yy - rr * 0.15, rr * 0.35, rr * 0.25, '#fff', 'opacity=".85"'));
      return;
    }
    out.push(ell(x, yy, rr, rr * 1.08, '#fff', `stroke="${O}" stroke-width="2.2"`));
    if (stil === 'katze') {
      out.push(kreis(x + rr * 0.05, yy + rr * 0.08, rr * 0.8, 'url(#ir)'));
      out.push(ell(x + rr * 0.05, yy + rr * 0.08, rr * 0.14, rr * 0.58, '#120a18'));
    } else {
      out.push(kreis(x + rr * 0.08, yy + rr * 0.12, rr * (stil === 'klein' ? 0.72 : 0.66), 'url(#ir)'));
      out.push(kreis(x + rr * 0.1, yy + rr * 0.16, rr * (stil === 'klein' ? 0.42 : 0.33), '#120a18'));
    }
    out.push(kreis(x - rr * 0.2, yy - rr * 0.22, rr * 0.24, '#fff'), kreis(x + rr * 0.32, yy + rr * 0.38, rr * 0.11, '#fff', 'opacity=".85"'));
    out.push(`<ellipse class="lid" cx="${f1(x)}" cy="${f1(yy)}" rx="${f1(rr + 1.4)}" ry="${f1(rr * 1.08 + 1.4)}" fill="${P.body}" stroke="${O}" stroke-width="2.2"/>`);
    const links = x < x0 || (pos.length === 1 && false);
    if (stil === 'boese' && i < 2) {
      const s = links ? 1 : -1;
      out.push(`<path d="M${f1(x - s * rr * 1.15)},${f1(yy - rr * 1.15)} L${f1(x + s * rr * 0.9)},${f1(yy - rr * 0.55)}" stroke="${O}" stroke-width="3.4" stroke-linecap="round"/>`);
    }
    if (stil === 'muede') out.push(`<path d="M${f1(x - rr - 1)},${f1(yy - 0.5)} A${f1(rr + 1)},${f1(rr * 1.08 + 1)} 0 0 1 ${f1(x + rr + 1)},${f1(yy - 0.5)}Z" fill="${P.body}" stroke="${O}" stroke-width="2.2"/>`);
  });
  return out.join('');
}

function mund(A, stil, P) {
  const x = A.mundX ?? A.eyeX, y = A.mundY, m = Math.max(0.6, A.kopfR / 32), O = P.O;
  const w = 8 * m;
  switch (stil) {
    case 'zahn': return `<path d="M${f1(x - w)},${f1(y)} Q${f1(x)},${f1(y + 7 * m)} ${f1(x + w)},${f1(y)}" fill="none" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/><path d="M${f1(x + 2 * m)},${f1(y + 2.6 * m)} l${f1(2.6 * m)},${f1(5 * m)} l${f1(2.4 * m)},${f1(-5.6 * m)}z" fill="#fff" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/>`;
    case 'offen': return `<path d="M${f1(x - w)},${f1(y)} Q${f1(x)},${f1(y + 15 * m)} ${f1(x + w)},${f1(y)} Z" fill="#4a1426" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>${ell(x, y + 6 * m, 4.4 * m, 2.6 * m, '#ff6f91')}`;
    case 'zickzack': return `<path d="M${f1(x - w)},${f1(y)} l${f1(w / 2)},${f1(3 * m)} ${f1(w / 2)},${f1(-3 * m)} ${f1(w / 2)},${f1(3 * m)} ${f1(w / 2)},${f1(-3 * m)}" fill="none" stroke="${O}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'schnabel': return `<path d="M${f1(x - 6 * m)},${f1(y - 3 * m)} L${f1(x + 6 * m)},${f1(y - 3 * m)} L${f1(x)},${f1(y + 7 * m)}Z" fill="${P.acc}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`;
    case 'keiner': return '';
    default: return `<path d="M${f1(x - w)},${f1(y)} Q${f1(x)},${f1(y + 8 * m)} ${f1(x + w)},${f1(y)}" fill="none" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
}

function kopfschmuck(A, typ, P) {
  const O = P.O, [l, rr] = A.ohren;
  const S = `stroke="${O}" stroke-width="2.4" stroke-linejoin="round"`;
  switch (typ) {
    case 'ohren': return [l, rr].map((p, i) => { const s = i ? 1 : -1; return `<path d="M${f1(p.x - 9 * s)},${f1(p.y + 8)} L${f1(p.x + 5 * s)},${f1(p.y - 18)} L${f1(p.x + 12 * s)},${f1(p.y + 6)}Z" fill="url(#kb)" ${S}/><path d="M${f1(p.x - 3 * s)},${f1(p.y + 5)} L${f1(p.x + 5 * s)},${f1(p.y - 10)} L${f1(p.x + 8 * s)},${f1(p.y + 4)}Z" fill="#ff9fbf" opacity=".8"/>`; }).join('');
    case 'hoerner': return [l, rr].map((p, i) => { const s = i ? 1 : -1; return `<path d="M${f1(p.x)},${f1(p.y + 6)} C${f1(p.x + 4 * s)},${f1(p.y - 10)} ${f1(p.x + 14 * s)},${f1(p.y - 16)} ${f1(p.x + 18 * s)},${f1(p.y - 26)} C${f1(p.x + 18 * s)},${f1(p.y - 10)} ${f1(p.x + 12 * s)},${f1(p.y)} ${f1(p.x + 8 * s)},${f1(p.y + 8)}Z" fill="${hell(P.acc, 0.2)}" ${S}/>`; }).join('');
    case 'antennen': return [l, rr].map((p, i) => { const s = i ? 1 : -1; return `<path d="M${f1(p.x + 4 * s)},${f1(p.y + 4)} Q${f1(p.x + 2 * s)},${f1(p.y - 14)} ${f1(p.x + 12 * s)},${f1(p.y - 22)}" fill="none" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/>${kreis(p.x + 12 * s, p.y - 22, 4.5, P.acc, S)}`; }).join('');
    case 'rundohren': return [l, rr].map((p) => `${kreis(p.x, p.y - 4, 9, 'url(#kb)', S)}${kreis(p.x, p.y - 4, 4.6, '#ff9fbf', 'opacity=".75"')}`).join('');
    case 'flossen': return [l, rr].map((p, i) => { const s = i ? 1 : -1; return `<path d="M${f1(p.x)},${f1(p.y + 8)} C${f1(p.x + 6 * s)},${f1(p.y - 6)} ${f1(p.x + 20 * s)},${f1(p.y - 12)} ${f1(p.x + 24 * s)},${f1(p.y - 4)} C${f1(p.x + 18 * s)},${f1(p.y)} ${f1(p.x + 16 * s)},${f1(p.y + 6)} ${f1(p.x + 8 * s)},${f1(p.y + 10)}Z" fill="${P.acc}" ${S}/><path d="M${f1(p.x + 6 * s)},${f1(p.y + 4)} L${f1(p.x + 18 * s)},${f1(p.y - 4)}" stroke="${O}" stroke-width="1.2" opacity=".5"/>`; }).join('');
    case 'buschel': return `<path d="M${f1(A.krone.x - 10)},${f1(A.krone.y + 4)} Q${f1(A.krone.x - 8)},${f1(A.krone.y - 14)} ${f1(A.krone.x)},${f1(A.krone.y - 18)} Q${f1(A.krone.x + 2)},${f1(A.krone.y - 8)} ${f1(A.krone.x + 6)},${f1(A.krone.y - 16)} Q${f1(A.krone.x + 12)},${f1(A.krone.y - 6)} ${f1(A.krone.x + 10)},${f1(A.krone.y + 4)}Z" fill="url(#kb)" ${S}/>`;
    default: return '';
  }
}

// ---------- Element-Schmuck ----------
function schmuck(el, A, P, r, bp) {
  const O = P.O, back = [], front = [], top = [];
  let krone = false, augenStil = null, koerperOpacity = 1;
  const k = A.krone, br = A.brust, sw = A.schwanz, rk = A.ruecken;
  const S = `stroke="${O}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
  switch (el) {
    case 0: // Feuer
      top.push(flamme(k.x - 11, k.y + 6, 0.55, '#ff5a1f', '#ffe14d'), flamme(k.x + 11, k.y + 6, 0.6, '#ff5a1f', '#ffe14d'), flamme(k.x, k.y + 4, 0.85, '#ff7a1f', '#fff07a'));
      back.push(flamme(sw.x + 2, sw.y + 6, 0.6, '#ff5a1f', '#ffe14d'));
      for (let i = 0; i < 5; i++) front.push(kreis(40 + r.next() * 140, 20 + r.next() * 60, 1.2 + r.next() * 1.8, '#ffd36b', 'class="tw" opacity=".9"'));
      krone = true; break;
    case 1: { // Lava
      const cx = br.x, cy = br.y;
      front.push(`<path d="M${cx - 18},${cy - 10} l8,6 -4,8 10,4 M${cx + 6},${cy - 16} l-4,10 8,4 -2,10 M${cx - 30},${cy + 6} l10,-2 4,8" fill="none" stroke="${P.acc}" stroke-width="2.6" stroke-linecap="round" filter="url(#gl)"/>`);
      top.push(`<path d="M${k.x - 14},${k.y + 4} L${k.x - 8},${k.y - 8} L${k.x - 2},${k.y + 2} L${k.x + 4},${k.y - 12} L${k.x + 12},${k.y + 4}Z" fill="${dunkel(P.body, 0.2)}" ${S}/>`, tropfen(k.x + 4, k.y + 2, 0.8, P.acc, O));
      back.push(ell(110, A.boden - 2, 60, 8, P.acc, 'opacity=".35" filter="url(#gl)"'));
      krone = true; break;
    }
    case 2: // Kohle
      for (let i = 0; i < 6; i++) front.push(kreis(br.x - 26 + r.next() * 52, br.y - 22 + r.next() * 30, 1.6 + r.next() * 2.2, P.acc, 'filter="url(#gl)" class="tw"'));
      top.push(kreis(k.x - 6, k.y - 12, 7, '#777', 'opacity=".35" class="rauch"'), kreis(k.x + 6, k.y - 22, 9, '#888', 'opacity=".25" class="rauch"'));
      break;
    case 3: // Stein
      for (let i = 0; i < 3; i++) back.push(`<path transform="translate(${f1(rk.x - 10 + i * 9)} ${f1(rk.y + i * 8)}) rotate(${20 + i * 15})" d="M-9,6 L-6,-12 L6,-15 L10,4Z" fill="${dunkel(P.body, 0.25)}" ${S}/>`);
      front.push(`<path d="M${br.x - 20},${br.y - 14} l7,6 -3,7 M${br.x + 14},${br.y - 4} l-6,5 4,6" fill="none" stroke="${dunkel(P.dark, 0.2)}" stroke-width="2" stroke-linecap="round"/>`);
      top.push(`<path d="M${k.x - 12},${k.y + 4} Q${k.x - 6},${k.y - 8} ${k.x},${k.y - 2} Q${k.x + 6},${k.y - 10} ${k.x + 12},${k.y + 4}Z" fill="${P.acc}" ${S}/>`);
      krone = true; break;
    case 4: // Kristall
      back.push(kristall(rk.x - 4, rk.y + 8, 30, 7, 25, '#d58cff', O), kristall(rk.x + 10, rk.y + 16, 22, 6, 50, '#8fd3ff', O));
      top.push(kristall(k.x, k.y + 6, 26, 7, 0, '#e8c6ff', O), kristall(k.x - 13, k.y + 9, 16, 5, -25, '#a9ddff', O), kristall(k.x + 13, k.y + 9, 16, 5, 25, '#a9ddff', O));
      front.push(stern(br.x + 22, br.y - 20, 4, '#fff', 'tw'));
      krone = true; break;
    case 5: { // Salz
      const wuerfel = (x, y, s) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0,-8 L8,-4 L0,0 L-8,-4Z" fill="#fff" ${S}/><path d="M-8,-4 L0,0 L0,9 L-8,5Z" fill="#e2dad0" ${S}/><path d="M8,-4 L0,0 L0,9 L8,5Z" fill="#cfc4b6" ${S}/></g>`;
      top.push(wuerfel(k.x, k.y - 2, 1.1), wuerfel(k.x - 14, k.y + 6, 0.7), wuerfel(k.x + 14, k.y + 5, 0.8));
      back.push(wuerfel(rk.x + 6, rk.y + 6, 0.9));
      front.push(stern(br.x - 20, br.y - 18, 3.5, P.acc, 'tw'), stern(br.x + 18, br.y - 6, 2.8, '#fff', 'tw'));
      krone = true; break;
    }
    case 6: // Wasser
      top.push(`<path d="M${k.x - 14},${k.y + 6} C${k.x - 10},${k.y - 18} ${k.x + 14},${k.y - 22} ${k.x + 18},${k.y - 6} C${k.x + 8},${k.y - 8} ${k.x + 4},${k.y} ${k.x + 6},${k.y + 6}Z" fill="${P.acc}" ${S}/>`);
      back.push(`<path d="M${sw.x - 4},${sw.y} C${sw.x + 10},${sw.y - 18} ${sw.x + 26},${sw.y - 16} ${sw.x + 24},${sw.y - 6} C${sw.x + 16},${sw.y - 2} ${sw.x + 16},${sw.y + 6} ${sw.x + 24},${sw.y + 12} C${sw.x + 12},${sw.y + 18} ${sw.x},${sw.y + 10} ${sw.x - 4},${sw.y}Z" fill="${P.acc}" ${S}/>`);
      for (let i = 0; i < 4; i++) front.push(kreis(150 + r.next() * 40, 30 + r.next() * 60, 2 + r.next() * 3, 'none', `stroke="#bff6ff" stroke-width="1.4" class="blase" opacity=".8"`));
      krone = true; break;
    case 7: // Pflanze
      top.push(blatt(k.x - 4, k.y + 6, 0.8, -35, '#7fe05a', O), blatt(k.x + 4, k.y + 6, 0.9, 30, '#5cc947', O));
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; top.push(ell(k.x + 12 + Math.cos(a) * 5, k.y - 10 + Math.sin(a) * 5, 4.4, 4.4, P.acc, `stroke="${O}" stroke-width="1.4"`)); }
      top.push(kreis(k.x + 12, k.y - 10, 3.2, '#ffe14d', `stroke="${O}" stroke-width="1.2"`));
      front.push(blatt(br.x - 16, br.y + 6, 0.45, -60, '#7fe05a', O));
      krone = true; break;
    case 8: // Bestie
      for (const p of A.ohren) { const s = p.x < A.eyeX ? -1 : 1; back.push(`<path d="M${f1(p.x - 10 * s)},${f1(p.y + 10)} L${f1(p.x + 2 * s)},${f1(p.y - 20)} L${f1(p.x + 12 * s)},${f1(p.y + 8)}Z" fill="url(#kb)" ${S}/>`); }
      for (const h of A.haende) front.push(`<path d="M${f1(h.x - 5)},${f1(h.y)} l-2,6 M${f1(h.x)},${f1(h.y + 1)} l0,6 M${f1(h.x + 5)},${f1(h.y)} l2,6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`);
      back.push(`<path d="M${f1(sw.x - 6)},${f1(sw.y)} C${f1(sw.x + 20)},${f1(sw.y - 6)} ${f1(sw.x + 30)},${f1(sw.y - 30)} ${f1(sw.x + 14)},${f1(sw.y - 36)} C${f1(sw.x + 16)},${f1(sw.y - 20)} ${f1(sw.x + 4)},${f1(sw.y - 12)} ${f1(sw.x - 6)},${f1(sw.y - 8)}Z" fill="${P.belly}" ${S}/>`);
      top.push(`<path d="M${k.x - 14},${k.y + 6} l4,-10 4,6 4,-10 4,8 4,-10 4,12Z" fill="${P.dark}" ${S}/>`);
      krone = true; break;
    case 9: // Humanoid
      top.push(`<path d="M${k.x - 20},${k.y + 10} C${k.x - 16},${k.y - 6} ${k.x - 2},${k.y - 30} ${k.x + 18},${k.y - 30} C${k.x + 8},${k.y - 18} ${k.x + 16},${k.y - 2} ${k.x + 20},${k.y + 10}Z" fill="${P.acc}" ${S}/>`, `<path d="M${k.x - 22},${k.y + 10} Q${k.x},${k.y + 4} ${k.x + 22},${k.y + 10}" fill="none" stroke="${hell(P.acc, 0.5)}" stroke-width="4" stroke-linecap="round"/>`, kreis(k.x + 18, k.y - 30, 3.6, '#ffe14d', S));
      front.push(`<rect x="${A.cx - 22}" y="${(A.guertelY || br.y + 10) - 3}" width="44" height="6" rx="3" fill="${dunkel(P.acc, 0.3)}" ${S}/>`, `<rect x="${A.cx - 4}" y="${(A.guertelY || br.y + 10) - 4}" width="8" height="8" rx="1.5" fill="#ffd447" ${S}/>`);
      krone = true; break;
    case 10: { // Kunst
      const farben = ['#ffd23f', '#3fa7ff', '#62e36a', '#ff7b3d'];
      for (let i = 0; i < 4; i++) front.push(kreis(br.x - 22 + r.next() * 44, br.y - 14 + r.next() * 22, 3 + r.next() * 3, farben[i], `stroke="${O}" stroke-width="1.2"`));
      top.push(ell(k.x + 2, k.y - 2, 22, 8, '#e0245e', S), kreis(k.x + 2, k.y - 10, 3, '#e0245e', S));
      back.push(`<path d="M${f1(sw.x)},${f1(sw.y)} L${f1(sw.x + 20)},${f1(sw.y - 24)}" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/><path d="M${f1(sw.x + 18)},${f1(sw.y - 22)} l6,-8 4,4 -6,8z" fill="${farben[1]}" ${S}/>`);
      krone = true; break;
    }
    case 11: // Philosophie
      top.push(`<ellipse cx="${k.x}" cy="${k.y - 10}" rx="20" ry="5.5" fill="none" stroke="${P.acc}" stroke-width="3.2" filter="url(#gl)" class="schwebe"/>`);
      front.push(`<g transform="translate(${f1(A.eyeX)} ${f1(A.eyeY - A.eyeR * 2.1)})">${ell(0, 0, A.eyeR * 0.7, A.eyeR * 0.45, '#fff', `stroke="${O}" stroke-width="1.6"`)}${kreis(0, 0, A.eyeR * 0.3, P.acc)}</g>`);
      back.push(`<g transform="translate(${f1(rk.x + 18)} ${f1(rk.y - 6)}) rotate(-12)" class="schwebe"><path d="M-12,-8 L0,-5 L12,-8 L12,8 L0,11 L-12,8Z" fill="#f6f0dc" ${S}/><path d="M0,-5 L0,11" stroke="${O}" stroke-width="1.4"/></g>`);
      krone = true; break;
    case 12: // Mathematik
      front.push(`<path d="M${br.x - 12},${br.y + 6} L${br.x},${br.y - 12} L${br.x + 12},${br.y + 6}Z" fill="none" stroke="#fff" stroke-width="2" opacity=".75"/>`);
      for (const [t, x, y] of [['π', 34, 40], ['∑', 178, 52], ['√', 44, 92], ['∞', 176, 104]]) front.push(`<text x="${x + r.int(-6, 6)}" y="${y + r.int(-6, 6)}" font-family="Georgia,serif" font-size="17" font-weight="700" fill="#fff" opacity=".8" class="schwebe">${t}</text>`);
      top.push(`<path d="M${k.x - 12},${k.y + 4} L${k.x},${k.y - 18} L${k.x + 12},${k.y + 4}Z" fill="${P.acc}" ${S}/>`);
      krone = true; break;
    case 13: // Gravitation
      back.push(`<ellipse cx="110" cy="${A.cy}" rx="${A.rx + 26}" ry="12" fill="none" stroke="${P.acc}" stroke-width="2" opacity=".7" transform="rotate(-12 110 ${A.cy})"/>`);
      front.push(`<g>${spin(110, A.cy, 14)}${kreis(110 + A.rx + 20, A.cy - 8, 6, '#7a6f66', S)}${kreis(110 - A.rx - 18, A.cy + 10, 4.5, '#8a7f76', S)}</g>`);
      top.push(`<path class="schwebe" transform="translate(${k.x} ${k.y - 12})" d="M-8,4 L-5,-6 L5,-8 L9,2 L2,8Z" fill="#8a7f76" ${S}/>`);
      krone = true; break;
    case 14: // Elektrizität
      for (const p of A.ohren) back.push(blitzForm(p.x, p.y - 8, 0.95, P.body, O, p.x < A.eyeX ? -25 : 25));
      back.push(blitzForm(sw.x + 6, sw.y - 8, 1.1, P.body, O, 30));
      for (let i = 0; i < 3; i++) front.push(blitzForm(40 + r.next() * 140, 24 + r.next() * 50, 0.42, P.acc, O, r.int(-30, 30)).replace('<path', '<path class="tw"'));
      break;
    case 15: { // Licht
      let rays = '';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; rays += `<path d="M${f1(A.eyeX + Math.cos(a) * 36)},${f1(A.eyeY + Math.sin(a) * 36)} L${f1(A.eyeX + Math.cos(a + 0.12) * 60)},${f1(A.eyeY + Math.sin(a + 0.12) * 60)} L${f1(A.eyeX + Math.cos(a - 0.12) * 60)},${f1(A.eyeY + Math.sin(a - 0.12) * 60)}Z" fill="#fff6c8"/>`; }
      back.push(`<g opacity=".85">${spin(A.eyeX, A.eyeY, 30)}${rays}</g>`);
      top.push(stern(k.x, k.y - 8, 9, '#fff', 'tw'));
      front.push(stern(br.x + 24, br.y - 10, 4, '#fff', 'tw'), stern(br.x - 26, br.y - 20, 3, '#fff', 'tw'));
      krone = true; break;
    }
    case 16: // Eis
      for (let i = 0; i < 3; i++) back.push(kristall(rk.x - 8 + i * 9, rk.y + 6 + i * 7, 22 - i * 4, 5, 35 + i * 12, '#e8fbff', O));
      top.push(kristall(k.x - 9, k.y + 6, 14, 4, -15, '#ffffff', O), kristall(k.x, k.y + 4, 20, 5, 0, '#dff8ff', O), kristall(k.x + 9, k.y + 6, 14, 4, 15, '#ffffff', O));
      for (let i = 0; i < 4; i++) front.push(stern(30 + r.next() * 160, 20 + r.next() * 70, 3, '#fff', 'tw'));
      krone = true; break;
    case 17: // Druck
      top.push(`<path d="M${k.x - 2},${k.y + 4} C${k.x - 4},${k.y - 22} ${k.x + 24},${k.y - 30} ${k.x + 26},${k.y - 8}" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`, kreis(k.x + 26, k.y - 6, 6, P.acc, 'filter="url(#gl)" class="tw"'));
      for (let i = 0; i < 5; i++) front.push(kreis(30 + r.next() * 160, 20 + r.next() * 100, 1.5 + r.next() * 3, 'none', `stroke="${P.acc}" stroke-width="1.2" opacity=".7" class="blase"`));
      front.push(`<path d="M${br.x - 22},${br.y - 18} q-4,6 0,12 M${br.x - 16},${br.y - 20} q-4,6 0,12" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`);
      augenStil = 'gluehend';
      krone = true; break;
    case 18: // Cyber
      augenStil = 'visier';
      front.push(`<path d="M${br.x - 24},${br.y} h10 v-10 h10 M${br.x + 24},${br.y + 4} h-12 v8 h-8" fill="none" stroke="${P.acc}" stroke-width="2" opacity=".9"/>`, kreis(br.x + 4, br.y - 10, 2.4, P.acc), kreis(br.x + 4, br.y + 12, 2.4, P.acc));
      top.push(`<path d="M${k.x},${k.y + 4} L${k.x},${k.y - 18}" stroke="${O}" stroke-width="3"/>`, kreis(k.x, k.y - 20, 4, P.iris, 'filter="url(#gl)" class="blink"'));
      for (let i = 0; i < 5; i++) front.push(`<rect x="${f1(26 + r.next() * 168)}" y="${f1(16 + r.next() * 70)}" width="4" height="4" fill="${i % 2 ? P.acc : P.iris}" opacity=".8" class="tw"/>`);
      krone = true; break;
    case 19: // Raum
      for (let i = 0; i < 9; i++) front.push(kreis(br.x - 28 + r.next() * 56, br.y - 36 + r.next() * 40, 0.8 + r.next() * 1.2, '#fff', 'class="tw"'));
      top.push(`<g class="schwebe">${kreis(k.x + 6, k.y - 14, 8, '#ff9f6b', S)}<ellipse cx="${k.x + 6}" cy="${k.y - 14}" rx="14" ry="3.6" fill="none" stroke="#ffe0b8" stroke-width="2" transform="rotate(-18 ${k.x + 6} ${k.y - 14})"/></g>`);
      augenStil = r.chance(0.5) ? 'gluehend' : null;
      krone = true; break;
    case 20: // Gas
      for (const [x, y, s] of [[A.cx - A.rx - 6, A.cy + 18, 12], [A.cx + A.rx + 4, A.cy + 22, 14], [A.cx - A.rx + 4, A.cy - 26, 9]]) back.push(kreis(x, y, s, '#ffffff', 'opacity=".55"'));
      front.push(`<path d="M${br.x - 16},${br.y} a8,8 0 1 1 10,6" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>`);
      koerperOpacity = 0.92;
      break;
    case 21: // Radioaktivität
      back.push(ell(110, A.cy, A.rx + 22, A.ry + 18, P.acc, 'opacity=".22" filter="url(#gl)"'));
      front.push(`<g transform="translate(${f1(br.x)} ${f1(br.y)}) scale(.6)">${kreis(0, 0, 4, '#1d1d1d')}<path d="M0,-6 L-7,-18 A20,20 0 0 1 7,-18Z M5.2,3 L17.5,9 A20,20 0 0 1 10.5,15.5Z M-5.2,3 L-10.5,15.5 A20,20 0 0 1 -17.5,9Z" fill="#1d1d1d"/></g>`);
      for (let i = 0; i < 4; i++) front.push(kreis(br.x - 26 + r.next() * 52, br.y - 30 + r.next() * 24, 2 + r.next() * 2, P.acc, 'filter="url(#gl)" class="tw"'));
      break;
    case 22: // Metall
      for (let i = 0; i < 5; i++) front.push(kreis(br.x - 20 + i * 10, br.y - 14 + (i % 2) * 4, 1.8, '#fff', `stroke="${O}" stroke-width="1"`));
      top.push(`<path d="M${k.x - 4},${k.y + 6} C${k.x - 2},${k.y - 14} ${k.x + 14},${k.y - 22} ${k.x + 24},${k.y - 20} C${k.x + 16},${k.y - 10} ${k.x + 12},${k.y} ${k.x + 10},${k.y + 6}Z" fill="${P.acc}" ${S}/>`);
      augenStil = r.chance(0.5) ? 'visier' : null;
      krone = true; break;
    case 23: // Mechanik
      back.push(zahnrad(rk.x + 12, rk.y - 4, 13, 8, P.acc, O, 10));
      back.push(`<path d="M${f1(rk.x + 2)},${f1(rk.y + 14)} l14,-4" stroke="${O}" stroke-width="4" stroke-linecap="round"/><path d="M${f1(rk.x + 18)},${f1(rk.y + 4)} l6,-6 4,4 -6,6 4,4 -4,4 -6,-6z" fill="#ffd447" ${S}/>`);
      top.push(zahnrad(k.x, k.y - 6, 7, 6, '#d9b26b', O, 6));
      front.push(kreis(br.x - 14, br.y, 2.4, '#d9d9d9', `stroke="${O}" stroke-width="1.2"`), kreis(br.x + 14, br.y, 2.4, '#d9d9d9', `stroke="${O}" stroke-width="1.2"`));
      augenStil = r.chance(0.4) ? 'visier' : null;
      krone = true; break;
    case 24: // Plastik
      top.push(`<rect x="${k.x - 15}" y="${k.y - 8}" width="10" height="9" rx="2" fill="url(#kb)" ${S}/><rect x="${k.x + 5}" y="${k.y - 8}" width="10" height="9" rx="2" fill="url(#kb)" ${S}/>`);
      front.push(`<path d="M${A.cx - A.rx + 8},${A.cy + 4} Q${A.cx},${A.cy + 12} ${A.cx + A.rx - 8},${A.cy + 4}" fill="none" stroke="${dunkel(P.body, 0.3)}" stroke-width="1.6" stroke-dasharray="3 3"/>`, ell(A.cx - A.rx * 0.4, A.cy - A.ry * 0.45, A.rx * 0.25, A.ry * 0.12, '#fff', 'opacity=".75" transform="rotate(-25 ' + f1(A.cx - A.rx * 0.4) + ' ' + f1(A.cy - A.ry * 0.45) + ')"'));
      krone = true; break;
    case 25: // Mythisch
      if (!A.fluegel) {
        const w = 'M100,96 C82,62 58,52 40,60 C48,68 46,76 42,84 C52,84 56,92 52,100 C64,96 72,102 74,110Z';
        back.push(`<path d="${w}" fill="url(#kw)" ${S}/>`, `<path d="${w}" transform="translate(220 0) scale(-1 1)" fill="url(#kw)" ${S}/>`);
      }
      top.push(`<path d="M${k.x - 12},${k.y + 2} L${k.x - 12},${k.y - 10} L${k.x - 6},${k.y - 4} L${k.x},${k.y - 14} L${k.x + 6},${k.y - 4} L${k.x + 12},${k.y - 10} L${k.x + 12},${k.y + 2}Z" fill="${P.acc}" ${S}/>`, kreis(k.x, k.y - 4, 2.6, '#ff3b6e'));
      top.push(kopfschmuck(A, 'hoerner', P));
      krone = true; break;
    case 26: { // Säure
      const by = A.boden - 8;
      for (let i = 0; i < 4; i++) front.push(tropfen(A.cx - 30 + i * 20 + r.int(-4, 4), by + r.int(0, 6), 0.7, P.acc, O).replace('<path', '<path class="tropf"'));
      for (let i = 0; i < 3; i++) top.push(kreis(k.x - 10 + i * 10, k.y - 4 - i * 4, 3 + i, 'none', `stroke="${P.acc}" stroke-width="1.8" class="blase"`));
      front.push(kreis(br.x - 14, br.y - 6, 4, dunkel(P.body, 0.35)), kreis(br.x + 12, br.y + 2, 3, dunkel(P.body, 0.35)));
      krone = true; break;
    }
    case 27: { // Neutronen
      const c = A.cy;
      for (const rot of [0, 60, 120]) {
        back.push(`<ellipse cx="110" cy="${c}" rx="${A.rx + 24}" ry="13" fill="none" stroke="${P.acc}" stroke-width="1.8" opacity=".6" transform="rotate(${rot} 110 ${c})"/>`);
      }
      front.push(`<g>${spin(110, c, 6)}${kreis(110 + A.rx + 24, c, 4, P.acc, 'filter="url(#gl)"')}${kreis(110 - A.rx - 20, c - 18, 3.4, '#fff', 'filter="url(#gl)"')}</g>`);
      top.push(kreis(k.x, k.y - 6, 6, P.acc, S), kreis(k.x - 3, k.y - 8, 2, '#fff'));
      krone = true; break;
    }
    case 28: // Quantum
      back.push(`<path d="${A.pfad}" fill="${P.acc}" opacity=".28" transform="translate(9 -5)" stroke="${P.acc}" stroke-dasharray="4 3" stroke-width="2"/>`);
      for (let i = 0; i < 10; i++) front.push(kreis(30 + r.next() * 160, 20 + r.next() * 110, 1 + r.next() * 1.5, i % 2 ? P.acc : '#fff', 'opacity=".7" class="tw"'));
      top.push(`<path d="M${k.x - 7},${k.y - 14} a7,7 0 1 1 9,7 v5" fill="none" stroke="${P.acc}" stroke-width="3.4" stroke-linecap="round"/>`, kreis(k.x + 2, k.y + 2, 2, P.acc));
      augenStil = r.chance(0.5) ? 'drei' : null;
      krone = true; break;
    case 29: // Singularität
      back.push(`<ellipse cx="110" cy="${A.cy}" rx="${A.rx + 30}" ry="${A.ry + 20}" fill="none" stroke="${P.acc}" stroke-width="1" opacity=".35"/>`, `<ellipse cx="110" cy="${A.cy}" rx="${A.rx + 18}" ry="${A.ry + 10}" fill="none" stroke="${P.acc}" stroke-width="1.2" opacity=".45"/>`);
      front.push(`<g transform="translate(${f1(br.x)} ${f1(br.y - 4)})"><ellipse rx="16" ry="5" fill="none" stroke="${P.acc}" stroke-width="3" filter="url(#gl)"/>${kreis(0, 0, 7, '#000', `stroke="${P.acc}" stroke-width="1.5"`)}</g>`);
      augenStil = 'gluehend';
      break;
    case 30: { // Zeit
      let ticks = '';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ticks += `<path d="M${f1(Math.cos(a) * 9)},${f1(Math.sin(a) * 9)} L${f1(Math.cos(a) * 11)},${f1(Math.sin(a) * 11)}" stroke="${O}" stroke-width="1.4"/>`; }
      front.push(`<g transform="translate(${f1(br.x)} ${f1(br.y)})">${kreis(0, 0, 13, '#fff8e6', S)}${ticks}<path d="M0,0 L0,-8" stroke="${O}" stroke-width="2" stroke-linecap="round">${spin(0, 0, 8)}</path><path d="M0,0 L5,2" stroke="${O}" stroke-width="2" stroke-linecap="round"/></g>`);
      top.push(`<g transform="translate(${k.x} ${k.y - 10})"><path d="M-7,-9 h14 l-7,9 7,9 h-14 l7,-9z" fill="${hell(P.acc, 0.3)}" ${S}/><path d="M-3,6 h6 l-3,-3z" fill="#e8c56b"/></g>`);
      krone = true; break;
    }
    case 31: // Dunkelheit
      back.push(flamme(A.cx - A.rx + 4, A.cy + 10, 0.9, '#3a1d5c', '#1a0c2b'), flamme(A.cx + A.rx - 4, A.cy + 14, 0.8, '#3a1d5c', '#1a0c2b'));
      top.push(`<path d="M${k.x - 20},${k.y + 6} C${k.x - 26},${k.y - 10} ${k.x - 18},${k.y - 22} ${k.x - 8},${k.y - 24} C${k.x - 14},${k.y - 14} ${k.x - 12},${k.y - 4} ${k.x - 6},${k.y + 4}Z M${k.x + 20},${k.y + 6} C${k.x + 26},${k.y - 10} ${k.x + 18},${k.y - 22} ${k.x + 8},${k.y - 24} C${k.x + 14},${k.y - 14} ${k.x + 12},${k.y - 4} ${k.x + 6},${k.y + 4}Z" fill="${P.acc}" ${S}/>`);
      for (let i = 0; i < 4; i++) front.push(stern(30 + r.next() * 160, 20 + r.next() * 80, 2.6, P.acc, 'tw'));
      augenStil = 'gluehend';
      krone = true; break;
  }
  return { back, front, top, krone, augenStil, koerperOpacity };
}

// ---------- Hintergrund je Element ----------
function hintergrund(el, r, P) {
  const W = 220, H = 160, out = [];
  const rand = (a, b) => a + r.next() * (b - a);
  const sil = (c, op = 1) => `fill="${c}" opacity="${op}"`;
  const dk = dunkel(P.bg1, 0.25);
  switch (el) {
    case 0: for (let i = 0; i < 6; i++) out.push(flamme(rand(0, W), H + 4, rand(0.8, 1.6), '#ff5a1f', '#ffb347', 'flk').replace('<g', '<g opacity=".55"')); for (let i = 0; i < 14; i++) out.push(kreis(rand(0, W), rand(0, H), rand(0.6, 1.8), '#ffd36b', 'class="tw" opacity=".8"')); break;
    case 1: out.push(`<path d="M0,128 Q55,116 110,130 T220,124 V160 H0Z" fill="#ff6a00" filter="url(#gl)"/><path d="M0,138 Q60,128 120,140 T220,134 V160 H0Z" fill="#ffb347" opacity=".8"/>`, `<path d="M0,112 L30,70 50,96 80,50 112,104 140,64 170,100 196,58 220,90 V128 H0Z" ${sil(dk)}/>`); break;
    case 2: for (let i = 0; i < 8; i++) out.push(`<path transform="translate(${rand(0, W)} ${rand(110, 160)}) rotate(${rand(0, 90)})" d="M-12,6 L-6,-10 8,-12 14,4 2,12Z" ${sil('#1a1a1f')}/>`); for (let i = 0; i < 12; i++) out.push(kreis(rand(0, W), rand(0, H), rand(0.6, 1.6), '#ff7b29', 'class="tw"')); break;
    case 3: out.push(`<path d="M0,100 L40,46 70,80 110,30 150,84 180,52 220,92 V160 H0Z" ${sil(mix(P.bg2, '#000', 0.25))}/><path d="M0,124 L50,86 90,116 140,80 190,118 220,100 V160 H0Z" ${sil(mix(P.bg2, '#000', 0.45))}/>`); break;
    case 4: for (let i = 0; i < 7; i++) out.push(kristall(rand(0, W), H + 6, rand(30, 70), rand(6, 12), rand(-30, 30), i % 2 ? '#6a5acd' : '#4d5bb5', dk).replace('<g', '<g opacity=".7"')); for (let i = 0; i < 10; i++) out.push(stern(rand(0, W), rand(0, 100), rand(1.5, 3.5), '#fff', 'tw')); break;
    case 5: out.push(`<rect x="0" y="118" width="220" height="42" fill="#e8ecef" opacity=".55"/><path d="M0,118 H220" stroke="#fff" stroke-width="2" opacity=".7"/>`); for (let i = 0; i < 10; i++) out.push(`<rect x="${rand(0, W)}" y="${rand(120, 158)}" width="${rand(3, 7)}" height="${rand(3, 7)}" fill="#fff" opacity=".7" transform="rotate(${rand(0, 45)})"/>`); break;
    case 6: for (let i = 0; i < 3; i++) out.push(`<path class="welle" d="M-20,${110 + i * 16} Q15,${100 + i * 16} 50,${110 + i * 16} T120,${110 + i * 16} T190,${110 + i * 16} T260,${110 + i * 16} V170 H-20Z" fill="${mix(P.bg2, '#5ff0ff', 0.15 + i * 0.12)}" opacity="${0.5 + i * 0.15}"/>`); for (let i = 0; i < 10; i++) out.push(kreis(rand(0, W), rand(0, 110), rand(1.5, 4), 'none', 'stroke="#bff6ff" stroke-width="1" opacity=".5" class="blase"')); break;
    case 7: for (let i = 0; i < 9; i++) out.push(blatt(rand(0, W), H + 4, rand(1.2, 2.4), rand(-40, 40), i % 2 ? '#2f7a2c' : '#3f8f3a', dk).replace('<g', '<g opacity=".65"')); out.push(`<path d="M150,0 L110,160 H170 L190,0Z" fill="#fff" opacity=".08"/>`); break;
    case 8: out.push(`<path d="M0,126 Q110,110 220,126 V160 H0Z" ${sil('#4a3a1d')}/>`, `<path d="M28,126 v-34 M28,96 c-16,0 -20,-18 0,-22 c20,4 16,22 0,22z M186,126 v-28 M186,100 c-14,0 -18,-16 0,-20 c18,4 14,20 0,20z" fill="#2a1d10" stroke="#2a1d10" stroke-width="4"/>`); break;
    case 9: out.push(`<path d="M0,120 L0,96 20,80 40,96 40,120 M48,120 V88 L72,66 96,88 V120 M150,120 V92 L172,72 194,92 V120 M196,120 V100 L210,88 220,98 V120" ${sil('#1d1828')}/><rect x="0" y="118" width="220" height="42" fill="#1d1828"/>`); for (let i = 0; i < 5; i++) out.push(`<rect x="${[24, 66, 80, 166, 178][i]}" y="${[100, 92, 104, 98, 106][i]}" width="6" height="7" fill="#ffd27a" opacity=".85" class="tw"/>`); break;
    case 10: { const c = ['#ffd23f', '#3fa7ff', '#62e36a', '#ff7b3d', '#ff5fa2']; for (let i = 0; i < 9; i++) out.push(`<path d="M${rand(-20, W)},${rand(0, H)} q${rand(20, 60)},${rand(-30, 30)} ${rand(40, 90)},${rand(-10, 10)}" stroke="${c[i % 5]}" stroke-width="${rand(6, 14)}" stroke-linecap="round" fill="none" opacity=".35"/>`); break; }
    case 11: for (const x of [20, 56, 164, 200]) out.push(`<rect x="${x - 7}" y="40" width="14" height="96" fill="#2c2550" opacity=".85"/><rect x="${x - 10}" y="34" width="20" height="7" fill="#3a3166"/>`); out.push(`<path d="M0,34 L110,8 L220,34Z" fill="#3a3166" opacity=".9"/>`); for (let i = 0; i < 8; i++) out.push(stern(rand(70, 150), rand(30, 100), 1.6, '#ffd86b', 'tw')); break;
    case 12: { let g = ''; for (let x = 0; x <= W; x += 20) g += `<path d="M${x},0 V160" stroke="#43c6b5" stroke-width=".7" opacity=".35"/>`; for (let y = 0; y <= H; y += 20) g += `<path d="M0,${y} H220" stroke="#43c6b5" stroke-width=".7" opacity=".35"/>`; out.push(g, `<circle cx="40" cy="40" r="18" fill="none" stroke="#fff" opacity=".18"/><path d="M160,130 l20,-34 20,34z" fill="none" stroke="#fff" opacity=".18"/>`); break; }
    case 13: for (let i = 1; i < 6; i++) out.push(`<ellipse cx="110" cy="96" rx="${i * 26}" ry="${i * 9}" fill="none" stroke="#6b5bd6" opacity="${0.5 - i * 0.07}"/>`); for (let i = 0; i < 6; i++) out.push(`<path class="schwebe" transform="translate(${rand(0, W)} ${rand(10, 150)}) rotate(${rand(0, 90)}) scale(${rand(0.5, 1.2)})" d="M-8,4 L-5,-6 L5,-8 L9,2 L2,8Z" fill="#3c3470"/>`); break;
    case 14: out.push(`<path d="M0,0 H220 V36 Q190,50 160,38 Q130,52 100,40 Q70,54 40,40 Q20,48 0,40Z" fill="#23234f"/>`); for (let i = 0; i < 2; i++) out.push(`<path class="blitzbg" d="M${rand(20, 200)},30 l-10,34 10,0 -14,40" stroke="#bfeaff" stroke-width="2.4" fill="none" filter="url(#gl)"/>`); break;
    case 15: { let rays = ''; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; rays += `<path d="M110,96 L${f1(110 + Math.cos(a) * 200)},${f1(96 + Math.sin(a) * 200)} L${f1(110 + Math.cos(a + 0.1) * 200)},${f1(96 + Math.sin(a + 0.1) * 200)}Z" fill="#fff"/>`; } out.push(`<g opacity=".35">${spin(110, 96, 40)}${rays}</g>`); break; }
    case 16: out.push(`<path d="M0,110 L30,60 50,90 80,40 110,96 140,52 170,92 200,48 220,80 V160 H0Z" fill="#9fd0f0" opacity=".45"/><path d="M80,40 L88,56 72,56Z M140,52 L148,66 132,66Z" fill="#fff" opacity=".8"/>`); for (let i = 0; i < 14; i++) out.push(kreis(rand(0, W), rand(0, H), rand(0.8, 2), '#fff', 'class="schnee" opacity=".8"')); break;
    case 17: for (let i = 0; i < 16; i++) out.push(kreis(rand(0, W), rand(0, H), rand(0.6, 1.8), '#7dffcf', `opacity="${rand(0.2, 0.7).toFixed(2)}" class="tw"`)); out.push(`<path d="M0,140 Q50,128 100,140 T220,136 V160 H0Z" fill="#031520"/>`); break;
    case 18: { let g = ''; for (let i = -6; i <= 6; i++) g += `<path d="M110,92 L${110 + i * 40},160" stroke="#ff2bd6" stroke-width="1" opacity=".5"/>`; for (let i = 0; i < 6; i++) g += `<path d="M0,${100 + i * i * 2.2} H220" stroke="#00f0ff" stroke-width="1" opacity="${0.25 + i * 0.08}"/>`; out.push(g); for (let i = 0; i < 8; i++) out.push(`<text x="${rand(0, W)}" y="${rand(10, 90)}" font-family="monospace" font-size="9" fill="#00f0ff" opacity=".35" class="tw">${r.next() < 0.5 ? '01' : '10'}</text>`); break; }
    case 19: for (let i = 0; i < 40; i++) out.push(kreis(rand(0, W), rand(0, H), rand(0.3, 1.4), '#fff', `opacity="${rand(0.3, 1).toFixed(2)}" ${i % 4 ? '' : 'class="tw"'}`)); out.push(ell(60, 50, 70, 26, '#7a3fd6', 'opacity=".25" filter="url(#gl)"'), kreis(184, 30, 12, '#c98aff', 'opacity=".7"')); break;
    case 20: for (let i = 0; i < 7; i++) out.push(ell(rand(0, W), rand(20, 150), rand(26, 50), rand(10, 18), '#fff', `opacity="${rand(0.15, 0.35).toFixed(2)}" class="wolke"`)); break;
    case 21: out.push(ell(110, 150, 140, 40, '#9dff3a', 'opacity=".22" filter="url(#gl)"')); for (let i = 0; i < 3; i++) out.push(`<g transform="translate(${30 + i * 80} 128)" opacity=".55"><rect x="-10" y="-18" width="20" height="28" rx="3" fill="#c8b400"/><path d="M-10,-10 h20 M-10,0 h20" stroke="#5a5200" stroke-width="2"/></g>`); break;
    case 22: { let g = ''; for (let x = 0; x < W; x += 44) g += `<rect x="${x + 2}" y="2" width="40" height="156" fill="#2a323b" opacity=".6"/>` + kreis(x + 8, 8, 2, '#8792a0') + kreis(x + 36, 8, 2, '#8792a0') + kreis(x + 8, 152, 2, '#8792a0') + kreis(x + 36, 152, 2, '#8792a0'); out.push(g); break; }
    case 23: out.push(zahnrad(30, 30, 30, 10, '#4a3a22', '#2a2015', 20).replace('<g', '<g opacity=".7"'), zahnrad(196, 130, 36, 12, '#4a3a22', '#2a2015', -24).replace('<g', '<g opacity=".7"'), zahnrad(200, 34, 16, 8, '#5a4528', '#2a2015', -12).replace('<g', '<g opacity=".7"')); break;
    case 24: for (let i = 0; i < 18; i++) out.push(kreis(rand(0, W), rand(0, H), rand(3, 7), ['#fff', '#4fd2ff', '#ffd23f'][i % 3], 'opacity=".55"')); break;
    case 25: out.push(kreis(176, 34, 18, '#ffe9a8', 'opacity=".9"'), `<path d="M0,128 V96 h14 v-8 h8 v8 h10 V72 l10,-14 10,14 v24 h12 v-8 h8 v8 h12 V128Z" fill="#0d0820"/><rect x="0" y="126" width="220" height="34" fill="#0d0820"/>`); break;
    case 26: for (let i = 0; i < 3; i++) out.push(ell(30 + i * 80, 148, 34, 7, '#9cff00', 'opacity=".55"')); for (let i = 0; i < 12; i++) out.push(kreis(rand(0, W), rand(60, 150), rand(1.5, 4), 'none', 'stroke="#c6ff1a" stroke-width="1" opacity=".55" class="blase"')); break;
    case 27: for (const rot of [0, 60, 120]) out.push(`<ellipse cx="110" cy="80" rx="100" ry="30" fill="none" stroke="#5f6cff" opacity=".3" transform="rotate(${rot} 110 80)"/>`); for (let i = 0; i < 12; i++) out.push(kreis(rand(0, W), rand(0, H), rand(0.8, 2), '#ff5f8f', 'opacity=".55" class="tw"')); break;
    case 28: for (let i = 0; i < 4; i++) out.push(`<path d="M0,${40 + i * 30} Q27,${20 + i * 30} 55,${40 + i * 30} T110,${40 + i * 30} T165,${40 + i * 30} T220,${40 + i * 30}" fill="none" stroke="#5ffff0" stroke-width="1.2" opacity="${0.15 + i * 0.06}"/>`); for (let i = 0; i < 20; i++) out.push(kreis(rand(0, W), rand(0, H), rand(0.5, 1.5), '#ff7af6', 'opacity=".55" class="tw"')); break;
    case 29: for (let i = 1; i < 7; i++) out.push(`<ellipse cx="110" cy="92" rx="${i * 22}" ry="${i * 7}" fill="none" stroke="#ff8a2a" stroke-width="${2.4 - i * 0.3}" opacity="${0.55 - i * 0.07}" transform="rotate(-8 110 92)"/>`); for (let i = 0; i < 20; i++) out.push(kreis(rand(0, W), rand(0, H), rand(0.3, 1.1), '#fff', 'opacity=".6"')); break;
    case 30: { let t = ''; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; t += `<path d="M${f1(110 + Math.cos(a) * 64)},${f1(80 + Math.sin(a) * 64)} L${f1(110 + Math.cos(a) * 74)},${f1(80 + Math.sin(a) * 74)}" stroke="#d9b26b" stroke-width="3"/>`; } out.push(`<g opacity=".35">${kreis(110, 80, 76, 'none', 'stroke="#d9b26b" stroke-width="2"')}${t}<path d="M110,80 L110,20" stroke="#d9b26b" stroke-width="3" >${spin(110, 80, 20)}</path></g>`); break; }
    case 31: out.push(kreis(178, 32, 14, '#d8c8ff', 'opacity=".85"'), kreis(184, 28, 13, P.bg1)); for (let i = 0; i < 5; i++) out.push(ell(rand(0, W), rand(110, 160), rand(30, 60), rand(6, 12), '#2a1d3d', 'opacity=".6" class="wolke"')); for (let i = 0; i < 3; i++) out.push(`<path class="schwebe" transform="translate(${rand(20, 200)} ${rand(20, 70)}) scale(.8)" d="M0,0 q-6,-6 -12,0 q4,-2 6,2 q2,-4 6,-2 q2,-4 6,2 q2,-4 6,-2 q-6,-6 -12,0z" fill="#0a0612"/>`); break;
  }
  return out.join('');
}

const STIL_ANIM = `<style>
.m{animation:atmen 3.4s ease-in-out infinite;transform-origin:110px 150px}
.m.schwebt{animation:schweben 3.2s ease-in-out infinite}
@keyframes atmen{50%{transform:scale(1.025,.985)}}
@keyframes schweben{50%{transform:translateY(-5px)}}
.lid{transform-box:fill-box;transform-origin:50% 0;animation:blinz 5.2s infinite;transform:scaleY(0)}
@keyframes blinz{0%,93%,100%{transform:scaleY(0)}96%{transform:scaleY(1)}}
.flk{animation:flk 1.1s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}
@keyframes flk{to{transform:scale(1.06,1.12) skewX(3deg)}}
.tw{animation:tw 2.4s ease-in-out infinite alternate}
@keyframes tw{to{opacity:.15}}
.schwebe{animation:schweben 3.6s ease-in-out infinite}
.blase{animation:blase 4s ease-in infinite}
@keyframes blase{to{transform:translateY(-16px);opacity:0}}
.tropf{animation:tropf 2.6s ease-in infinite}
@keyframes tropf{70%{transform:translateY(5px)}100%{transform:translateY(9px);opacity:0}}
.blink{animation:tw .8s steps(2) infinite}
.welle{animation:welle 6s ease-in-out infinite alternate}
@keyframes welle{to{transform:translateX(-14px)}}
.wolke{animation:welle 9s ease-in-out infinite alternate}
.schnee{animation:blase 6s linear infinite reverse}
.rauch{animation:blase 3.5s ease-out infinite}
.blitzbg{animation:tw .9s steps(3) infinite}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
</style>`;
const STIL_STATISCH = '<style>.lid{display:none}</style>';

function defs(P) {
  return `<defs>
<radialGradient id="kb" cx="36%" cy="28%" r="80%"><stop offset="0" stop-color="${hell(P.body, 0.42)}"/><stop offset=".55" stop-color="${P.body}"/><stop offset="1" stop-color="${P.dark}"/></radialGradient>
<radialGradient id="kc" cx="45%" cy="30%" r="80%"><stop offset="0" stop-color="${hell(P.belly, 0.5)}"/><stop offset="1" stop-color="${P.belly}"/></radialGradient>
<linearGradient id="kl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hell(P.body, 0.25)}"/><stop offset="1" stop-color="${P.dark}"/></linearGradient>
<linearGradient id="kw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hell(P.acc, 0.1)}"/><stop offset="1" stop-color="${dunkel(P.body, 0.15)}"/></linearGradient>
<radialGradient id="ir" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${hell(P.iris, 0.5)}"/><stop offset=".7" stop-color="${P.iris}"/><stop offset="1" stop-color="${dunkel(P.iris, 0.45)}"/></radialGradient>
<filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="sch" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>`;
}

// Farbname auf Englisch (für Bild-Prompts)
export function farbName(hex) {
  const [h, s, l] = zuHsl(hex);
  if (l > 0.93) return 'white';
  if (l < 0.09) return 'black';
  if (s < 0.13) return l > 0.65 ? 'light gray' : l < 0.3 ? 'charcoal gray' : 'gray';
  const namen = [[14, 'red'], [38, 'orange'], [50, 'golden yellow'], [66, 'yellow'], [88, 'lime green'], [150, 'green'], [172, 'teal'], [194, 'cyan'], [215, 'sky blue'], [240, 'blue'], [262, 'indigo'], [285, 'violet'], [312, 'purple'], [336, 'magenta'], [352, 'pink'], [361, 'red']];
  let n = namen.find(([g]) => h < g)[1];
  if (n === 'orange' && l < 0.38) n = 'brown';
  if ((n === 'golden yellow' || n === 'yellow') && l < 0.35) n = 'olive brown';
  if (['red', 'pink', 'magenta'].includes(n) && l > 0.78) n = 'pastel pink';
  const vor = l > 0.8 ? 'pale ' : l > 0.64 ? 'light ' : l < 0.22 ? 'very dark ' : l < 0.36 ? 'dark ' : '';
  return vor + n;
}
export const monsterMerkmale = (artId) => monsterBild(artId, false).merkmale;

const svgUrl = (s) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
const CACHE = new Map();

const AUGEN_STILE = ['rund', 'rund', 'boese', 'muede', 'zyklop', 'katze', 'gross', 'klein', 'boese', 'katze', 'gross', 'drei'];
const MUENDER = ['laecheln', 'zahn', 'offen', 'laecheln', 'zahn', 'zickzack', 'keiner', 'offen'];
const OHREN_TYPEN = ['ohren', 'hoerner', 'antennen', 'rundohren', 'flossen'];
const MUSTER = ['keins', 'keins', 'punkte', 'streifen', 'flecken', 'sterne', 'rauten'];
const SCHWANZ_TYPEN = ['pfeil', 'kugel', 'buschel', 'blatt'];
const SCHWANZ_BELEGT = new Set([0, 6, 8, 10, 14]); // Element-Schmuck nutzt den Schwanz schon
const OHREN_BELEGT = new Set([8, 14, 25]); // Element-Schmuck nutzt die Ohren schon
const FORM_SKALA = [0.82, 0.92, 1, 1.04];

// Bereich, in dem das Körpermuster liegt (passend zu A.pfad)
function musterBox(bp, A) {
  switch (bp) {
    case 'zweibeiner': return { x: 110, y: A.eyeY - 2, rx: A.kopfR, ry: A.kopfR };
    case 'vierbeiner': return { x: 120, y: 106, rx: 46, ry: 25 };
    case 'schlange': return { x: 110, y: 64, rx: 28, ry: 23 };
    case 'humanoid': return { x: 110, y: 104, rx: 24, ry: 24 };
    default: return { x: 110, y: A.cy, rx: A.rx, ry: A.ry };
  }
}
function muster(typ, box, P, r) {
  if (typ === 'keins') return '';
  const c1 = dunkel(P.body, 0.32), c2 = hell(P.body, 0.5);
  const { x: bx, y: by, rx, ry } = box;
  let inhalt = '';
  if (typ === 'punkte') for (let i = 0; i < 8; i++) inhalt += kreis(bx - rx * 0.85 + r.next() * rx * 1.7, by - ry * 0.95 + r.next() * ry * 1.5, 2.2 + r.next() * 3, c1, 'opacity=".45"');
  else if (typ === 'streifen') for (let i = 0; i < 3; i++) { const y = by - ry * 0.75 + i * ry * 0.42; inhalt += `<path d="M${f1(bx - rx * 1.1)},${f1(y)} Q${f1(bx)},${f1(y - 10)} ${f1(bx + rx * 1.1)},${f1(y)}" fill="none" stroke="${c1}" stroke-width="5" opacity=".4" stroke-linecap="round"/>`; }
  else if (typ === 'flecken') for (let i = 0; i < 3; i++) inhalt += ell(bx - rx * 0.6 + r.next() * rx * 1.2, by - ry * 0.75 + r.next() * ry * 1.1, 6 + r.next() * 7, 5 + r.next() * 5, c1, 'opacity=".35"');
  else if (typ === 'sterne') for (let i = 0; i < 5; i++) inhalt += stern(bx - rx * 0.75 + r.next() * rx * 1.5, by - ry * 0.85 + r.next() * ry * 1.3, 2.6 + r.next() * 2.2, c2);
  else if (typ === 'rauten') for (let i = 0; i < 4; i++) { const x = bx - rx * 0.6 + i * rx * 0.4; inhalt += `<path d="M${f1(x)},${f1(by - ry * 0.75)} l5,7 -5,7 -5,-7z" fill="${c2}" opacity=".55"/>`; }
  return `<g clip-path="url(#kp)">${inhalt}</g>`;
}
function schwanz(A, typ, P, bp) {
  if (A.schwebt) return '';
  const O = P.O, S = `stroke="${O}" stroke-width="2.2" stroke-linejoin="round"`;
  let { x, y } = A.schwanz, basis = '';
  if (bp === 'blob' || bp === 'flieger' || bp === 'humanoid') {
    const sx = x - 6, sy = y, ex = x + 22, ey = y - 22;
    const d = `M${f1(sx)},${f1(sy)} Q${f1(x + 22)},${f1(y + 6)} ${f1(ex)},${f1(ey)}`;
    basis = `<path d="${d}" fill="none" stroke="${O}" stroke-width="11" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${P.body}" stroke-width="6.5" stroke-linecap="round"/>`;
    x = ex; y = ey;
  }
  let spitze = '';
  if (typ === 'pfeil') spitze = `<path d="M${f1(x - 8)},${f1(y + 4)} L${f1(x + 1)},${f1(y - 12)} L${f1(x + 10)},${f1(y + 4)} L${f1(x + 1)},${f1(y)}Z" fill="${P.acc}" ${S}/>`;
  else if (typ === 'kugel') spitze = kreis(x, y, 6.5, P.acc, S) + kreis(x - 2, y - 2, 2, '#fff', 'opacity=".7"');
  else if (typ === 'buschel') spitze = [[-6, -4], [0, -9], [6, -4]].map(([dx, dy]) => ell(x + dx, y + dy, 4.2, 7, P.belly, `${S} transform="rotate(${dx * 5} ${f1(x + dx)} ${f1(y + dy)})"`)).join('');
  else if (typ === 'blatt') spitze = blatt(x, y + 4, 0.55, 30, P.acc, O);
  return basis + spitze;
}
function stacheln(A, P) {
  const k = A.krone, rk = A.ruecken, O = P.O;
  const cy = A.cy ?? 100;
  let out = '';
  for (let i = 0; i < 4; i++) {
    const t = 0.25 + i * 0.22;
    const x = k.x + (rk.x - k.x) * t, y = k.y + (rk.y - k.y) * t + 4;
    const dx = x - A.cx, dy = y - cy, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, px = -uy, py = ux;
    const hh = 11 - i * 1.3, w = 5;
    out += `<path d="M${f1(x + px * w)},${f1(y + py * w)} L${f1(x + ux * hh)},${f1(y + uy * hh)} L${f1(x - px * w)},${f1(y - py * w)}Z" fill="${hell(P.acc, 0.1)}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`;
  }
  return out;
}
function aura(A, P, r) {
  const cy = A.cy ?? 100;
  let s = ell(110, cy, A.rx + 34, A.ry + 28, P.acc, 'opacity=".2" filter="url(#gl)"');
  s += `<ellipse cx="110" cy="${f1(cy)}" rx="${f1(A.rx + 30)}" ry="${f1(A.ry + 24)}" fill="none" stroke="${P.acc}" stroke-width="1.6" stroke-dasharray="3 6" opacity=".6"/>`;
  for (let i = 0; i < 4; i++) { const a = r.next() * Math.PI * 2; s += stern(110 + Math.cos(a) * (A.rx + 30), cy + Math.sin(a) * (A.ry + 24), 3 + r.next() * 2, '#fff', 'tw'); }
  return s;
}

export function monsterBild(artId, animiert = true) {
  const key = artId + (animiert ? 'a' : 's');
  if (CACHE.has(key)) return CACHE.get(key);
  const art = ARTEN[artId];
  const el = art.el;
  const form = art.form ?? 2;
  const r = seeded(art.kunstSeed);
  const P = variiere(palette(el), r, form);
  const bp = art.bauplan;
  const { back, body, A } = koerper(bp, r, P);
  const deko = schmuck(el, A, P, r, bp);
  // Mehr Vielfalt: Nicht jede Art trägt den vollen Element-Schmuck. Farbe, Hintergrund und Siegel halten das Element erkennbar.
  if (deko.top.length && r.chance(0.32)) { deko.top = []; deko.krone = false; }
  if (deko.back.length && r.chance(0.2)) deko.back = [];
  if (deko.front.length > 2 && r.chance(0.3)) deko.front = deko.front.slice(0, Math.ceil(deko.front.length / 2));
  let augenStil = deko.augenStil || r.pick(AUGEN_STILE);
  if (form === 0 && ['rund', 'klein', 'boese', 'muede'].includes(augenStil)) augenStil = 'gross';
  let mundStil = bp === 'flieger' && r.chance(0.5) ? 'schnabel' : r.pick(MUENDER);
  if (form === 0 && ['zahn', 'zickzack', 'keiner'].includes(mundStil)) mundStil = 'laecheln';
  if (augenStil === 'visier' && mundStil === 'offen') mundStil = 'zickzack';
  let kopf = 'keiner';
  if (!OHREN_BELEGT.has(el)) {
    if (!deko.krone) kopf = r.pick([...OHREN_TYPEN, 'buschel', 'keiner']);
    else if (r.chance(form === 3 ? 0.7 : 0.45)) kopf = form === 3 && r.chance(0.5) ? 'hoerner' : r.pick(OHREN_TYPEN);
  }
  const musterTyp = r.pick(MUSTER);
  const schwanzTyp = !SCHWANZ_BELEGT.has(el) && r.chance(bp === 'humanoid' ? 0.25 : 0.55) ? r.pick(SCHWANZ_TYPEN) : null;
  const mitStacheln = form > 0 && r.chance(form === 3 ? 0.5 : 0.28);
  const backen = (form === 0 || r.chance(0.5)) && augenStil !== 'visier' && augenStil !== 'gluehend'
    ? ell(A.eyeX - A.gap * 1.55, A.eyeY + A.eyeR * 1.5, A.eyeR * 0.65, A.eyeR * 0.38, '#ff6b9a', 'opacity=".4"') + ell(A.eyeX + A.gap * 1.55, A.eyeY + A.eyeR * 1.5, A.eyeR * 0.65, A.eyeR * 0.38, '#ff6b9a', 'opacity=".4"')
    : '';
  const sk = FORM_SKALA[form] * (0.97 + r.next() * 0.06);
  const sy = 0.96 + r.next() * 0.08;
  const schatten = ell(110, A.boden, (A.schwebt ? 34 : 48) * sk, (A.schwebt ? 5 : 7) * sk, '#000', `opacity="${A.schwebt ? 0.22 : 0.32}" filter="url(#sch)"`);
  const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160" width="220" height="160">${defs(P)}<defs><clipPath id="kp"><path d="${A.pfad}"/></clipPath></defs>${animiert ? STIL_ANIM : STIL_STATISCH}
${schatten}<g class="m${A.schwebt ? ' schwebt' : ''}"><g transform="translate(110 ${f1(A.boden)}) scale(${sk.toFixed(3)} ${(sk * sy).toFixed(3)}) translate(-110 ${f1(-A.boden)})">
${form === 3 ? `<g>${aura(A, P, r)}</g>` : ''}
<g>${deko.back.join('')}</g>
<g>${mitStacheln ? stacheln(A, P) : ''}${schwanzTyp ? schwanz(A, schwanzTyp, P, bp) : ''}</g>
<g>${back.join('')}</g>
<g opacity="${deko.koerperOpacity}">${body.join('')}${muster(musterTyp, musterBox(bp, A), P, r)}</g>
<g>${kopfschmuck(A, kopf, P)}${deko.top.join('')}</g>
<g>${backen}${augen(A, augenStil, P)}${mund(A, mundStil, P)}</g>
<g>${deko.front.join('')}</g>
</g></g></svg>`;
  const rb = seeded(art.kunstSeed + '-bg');
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160" width="220" height="160" preserveAspectRatio="xMidYMid slice">${defs(P)}${animiert ? STIL_ANIM : STIL_STATISCH}
<defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.bg1}"/><stop offset="1" stop-color="${P.bg2}"/></linearGradient>
<radialGradient id="spot" cx="50%" cy="58%" r="55%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>
<rect width="220" height="160" fill="url(#hg)"/>${hintergrund(el, rb, P)}<rect width="220" height="160" fill="url(#spot)"/><rect width="220" height="160" fill="url(#vig)"/></svg>`;
  const ohneAnim = (s) => (animiert ? s : s.replace(/<animateTransform[^>]*\/>/g, ''));
  const merkmale = { augen: augenStil, mund: mundStil, kopf, muster: musterTyp, schwanz: schwanzTyp, stacheln: mitStacheln, elementSchmuck: deko.top.length > 0, P };
  // Importierter Sprite ersetzt die generierte Figur, der Element-Hintergrund bleibt.
  const sprite = spriteUrl(artId);
  const res = { fg: sprite || svgUrl(ohneAnim(fg)), bg: svgUrl(ohneAnim(bg)), fgGeneriert: svgUrl(ohneAnim(fg)), sprite: !!sprite, merkmale };
  CACHE.set(key, res);
  return res;
}
