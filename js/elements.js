// Elementrad: 32 Elemente in Kreisreihenfolge (Uhrzeigersinn). [FEST 4.2]
import { CONFIG } from './config.js';

export const ELEMENTE = [
  { name: 'Feuer', bed: 'Hitze, Flamme' },
  { name: 'Lava', bed: 'glühendes, fließendes Gestein' },
  { name: 'Kohle', bed: 'Rohstoff, Ruß, Glut' },
  { name: 'Stein', bed: 'festes Gestein' },
  { name: 'Kristall', bed: 'Struktur, kristalline Stoffe' },
  { name: 'Salz', bed: 'Mineral, Verbindung' },
  { name: 'Wasser', bed: 'flüssig' },
  { name: 'Pflanze', bed: 'Wachstum, Pflanzen' },
  { name: 'Bestie', bed: 'Tiere' },
  { name: 'Humanoid', bed: 'Menschenähnliche, Kobolde, Golems' },
  { name: 'Kunst', bed: 'Kreativität, Farbe, Inspiration' },
  { name: 'Philosophie', bed: 'Denken, Sinn' },
  { name: 'Mathematik', bed: 'Ordnung, Logik' },
  { name: 'Gravitation', bed: 'Schwerkraft' },
  { name: 'Elektrizität', bed: 'Naturkraft, Blitz' },
  { name: 'Licht', bed: 'Licht' },
  { name: 'Eis', bed: 'Kälte' },
  { name: 'Druck', bed: 'Pressen, Tiefsee, Vulkane' },
  { name: 'Cyber', bed: 'die virtuelle, digitale Welt' },
  { name: 'Raum', bed: 'Leere, Weite' },
  { name: 'Gas', bed: 'Luft, Wind, Dampf, Nebel' },
  { name: 'Radioaktivität', bed: 'Strahlung, Zerfall' },
  { name: 'Metall', bed: 'hart, Metall' },
  { name: 'Mechanik', bed: 'Maschinen und Mechanik' },
  { name: 'Plastik', bed: 'künstliches Material' },
  { name: 'Mythisch', bed: 'Drachen, Götter, Legenden' },
  { name: 'Säure', bed: 'ätzende Chemie' },
  { name: 'Neutronen', bed: 'Atom- und Teilchenphysik' },
  { name: 'Quantum', bed: 'Wahrscheinlichkeit, Zufall' },
  { name: 'Singularität', bed: 'Schwarzes Loch, wo alle Regeln brechen' },
  { name: 'Zeit', bed: 'Zeit' },
  { name: 'Dunkelheit', bed: 'Dunkelheit' },
];

export const N = ELEMENTE.length;

export const mod = (a, n = N) => ((a % n) + n) % n;
export const gegenpol = (p) => mod(p + CONFIG.rad.gegenpolAbstand);

// [VORSCHLAG 4.8] Farbrad: Nachbarn ähnlich, Gegenpole komplementär
export const farbton = (p) => (15 + mod(p) * (360 / N)) % 360;
export const farbe = (p, s = 78, l = 56) => `hsl(${farbton(p).toFixed(1)} ${s}% ${l}%)`;

// Faktor Angreifer-Element a gegen Verteidiger-Element v. [FEST 4.4] mit Richtung [ANNAHME 4.5]
export function faktorInfo(a, v) {
  const d = mod((a - v) * CONFIG.rad.richtung);
  const P = CONFIG.rad.primFaktoren;
  if (d === 0) return { f: 1, d, art: 'gleich' };
  if (d === CONFIG.rad.gegenpolAbstand) return { f: CONFIG.rad.gegenpolFaktor, d, art: 'gegenpol' };
  if (P[d]) return { f: P[d], d, art: 'stark' };
  if (P[N - d]) return { f: 1 / P[N - d], d, art: 'schwach' };
  return { f: 1, d, art: 'neutral' };
}
export const faktor = (a, v) => faktorInfo(a, v).f;

// Kreisabstand (kürzester Weg) für Anzeigen
export const abstand = (a, b) => { const d = mod(a - b); return Math.min(d, N - d); };

// Elemente, gegen die p stark / schwach ist (als Angreifer)
export function beziehungen(p) {
  const stark = [], schwach = [];
  for (let v = 0; v < N; v++) {
    const i = faktorInfo(p, v);
    if (i.art === 'stark') stark.push({ v, f: i.f });
    if (i.art === 'schwach') schwach.push({ v, f: i.f });
  }
  stark.sort((x, y) => y.f - x.f);
  schwach.sort((x, y) => x.f - y.f);
  return { stark, schwach, gegenpol: gegenpol(p) };
}

// 24×24-Glyphen, Strichzeichnung mit currentColor
export const GLYPHEN = [
  '<path d="M12 2.5c2.4 4 6.5 6.2 6.5 11.3a6.5 6.5 0 0 1-13 0c0-3 1.7-5.2 3-7 .3 2.2 1.3 3.4 2.6 3.6-.3-3.1.3-5.6.9-7.9z"/>',
  '<path d="M12 3l3.2 5.6a3.7 3.7 0 1 1-6.4 0z"/><path d="M3 18c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/>',
  '<path d="M5 15.5l3-7.5 6.5-2 5 5-2 7.5-8 1z"/><path d="M10 12l2 1.5 2.5-1"/>',
  '<path d="M2.5 19l4.5-9.5 5-3.5 6.5 4.5 3 8.5z"/><path d="M7 9.5l3 4 2-3 2.5 3"/>',
  '<path d="M12 2l5 6.5-5 13.5-5-13.5z"/><path d="M7 8.5h10M12 2v20"/>',
  '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  '<path d="M12 2.5c3.2 5 6.5 8 6.5 12a6.5 6.5 0 0 1-13 0c0-4 3.3-7 6.5-12z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  '<path d="M5 19.5C5 9.5 11 5 20 4c0 9.5-5 15.5-15 15.5z"/><path d="M5 19.5l9-9"/>',
  '<circle cx="6.5" cy="9.5" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17.5" cy="9.5" r="2"/><path d="M12 11.5c-3.3 0-6 3.4-6 6.2 0 1.8 2 2.8 6 2.8s6-1 6-2.8c0-2.8-2.7-6.2-6-6.2z"/>',
  '<circle cx="12" cy="6.5" r="3.5"/><path d="M4.5 21c0-5 3.3-8.5 7.5-8.5s7.5 3.5 7.5 8.5"/>',
  '<path d="M12 3a9 9 0 1 0 0 18c1.6 0 2.2-1 2.2-2.1 0-1.6 1-2.4 2.6-2.4H18a3 3 0 0 0 3-3C21 7.4 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  '<path d="M4 6.5h16M8.5 6.5V20M15.5 6.5v10c0 2 1 3.5 3.5 3.5"/>',
  '<path d="M12 2.5v13M7 10.5l5 5 5-5M4 20.5h16"/>',
  '<path d="M13.5 2L4 14h7l-1.5 8L20 10h-7z"/>',
  '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  '<path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>',
  '<path d="M12 2v7M8.5 5.5L12 9l3.5-3.5M12 22v-7M8.5 18.5L12 15l3.5 3.5M3 12h18"/>',
  '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 7V3.5M14 7V3.5M10 20.5V17M14 20.5V17M7 10H3.5M7 14H3.5M20.5 10H17M20.5 14H17"/><rect x="10" y="10" width="4" height="4"/>',
  '<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10.5" ry="3.5" transform="rotate(-20 12 12)"/>',
  '<path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h7"/>',
  '<circle cx="12" cy="12" r="2"/><path d="M12 9.5L9 3.8a9.5 9.5 0 0 1 6 0zM14.2 13.3l6.2.3a9.5 9.5 0 0 1-3 5.2zM9.8 13.3L6.6 18.8a9.5 9.5 0 0 1-3-5.2z"/>',
  '<path d="M3.5 17.5l3-8h11l3 8z"/><path d="M6.5 9.5l2-3.5h7l2 3.5"/>',
  '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.5"/>',
  '<rect x="3" y="9.5" width="18" height="10" rx="1.5"/><rect x="6" y="6" width="4" height="3.5" rx=".8"/><rect x="14" y="6" width="4" height="3.5" rx=".8"/>',
  '<path d="M3 18.5l2-11 5 5 2-8.5 2 8.5 5-5 2 11z"/><path d="M3 21h18"/>',
  '<path d="M9 2.5h6M10 2.5v6.5L4.8 18a2 2 0 0 0 1.8 3h10.8a2 2 0 0 0 1.8-3L14 9V2.5"/><path d="M7.5 15h9"/>',
  '<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5" stroke-dasharray="2 2"/>',
  '<path d="M12 12a1.2 1.2 0 1 1 2.4 0 3.4 3.4 0 1 1-6.8 0 5.6 5.6 0 1 1 11.2 0 7.8 7.8 0 1 1-15.6 0"/>',
  '<path d="M6.5 2.5h11M6.5 21.5h11M7.5 2.5v3l4.5 6.5-4.5 6.5v3M16.5 2.5v3L12 12l4.5 6.5v3"/>',
  '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
];

export function glyphSVG(p, cls = '') {
  return `<svg class="glyph ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHEN[mod(p)]}</svg>`;
}

export function faktorText(f) {
  return '×' + (Math.round(f * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}
