// Monsterarten. [FEST seit 21.11.2026] 20 Monster je Element (CONFIG.monster.artenProElement).
// [OFFEN] Namen und Kunst: Platzhalter. Namen aus Silben, Bauplan und Aussehen aus einem festen Seed je Art.
import { CONFIG } from './config.js';
import { ELEMENTE } from './elements.js';
import { seeded } from './rng.js';

const SILBEN = [
  ['Flamm', 'Glut', 'Brand', 'Lohe', 'Funk', 'Zünd', 'Asch', 'Fack'],
  ['Magm', 'Schmelz', 'Basalt', 'Lav', 'Krust', 'Glüh', 'Vulk', 'Obsid'],
  ['Koks', 'Ruß', 'Schwel', 'Anthra', 'Brikk', 'Glimm', 'Schlack', 'Ofen'],
  ['Fels', 'Granit', 'Brock', 'Kiesel', 'Klipp', 'Schotter', 'Monol', 'Geröll'],
  ['Quarz', 'Prism', 'Glanzspat', 'Fazett', 'Geod', 'Spat', 'Turmal', 'Opal'],
  ['Halit', 'Sole', 'Pökel', 'Salin', 'Siede', 'Lake', 'Natri', 'Gips'],
  ['Gischt', 'Well', 'Strudel', 'Tropf', 'Aqua', 'Quell', 'Pfütz', 'Lagun'],
  ['Blatt', 'Moos', 'Ranke', 'Knosp', 'Wurz', 'Blüt', 'Farn', 'Dorn'],
  ['Krall', 'Fang', 'Mähn', 'Pranke', 'Reiß', 'Huf', 'Pelz', 'Hauer'],
  ['Kobo', 'Golem', 'Wicht', 'Gnomi', 'Bürgl', 'Zwerg', 'Hob', 'Knirps'],
  ['Pinsel', 'Klecks', 'Muse', 'Farb', 'Skizz', 'Palett', 'Tusch', 'Mosaik'],
  ['Grübel', 'Sinn', 'Sophi', 'Denk', 'Logos', 'Zweifel', 'Ethos', 'Weis'],
  ['Axiom', 'Vektor', 'Summ', 'Prim', 'Zahl', 'Bruch', 'Wurzel', 'Kalkul'],
  ['Grav', 'Schwer', 'Masse', 'Last', 'Orbis', 'Pendel', 'Sog', 'Fall'],
  ['Volt', 'Zapp', 'Ampi', 'Ohm', 'Funkel', 'Spann', 'Watt', 'Funz'],
  ['Lumi', 'Glanz', 'Sonn', 'Schein', 'Strahl', 'Lux', 'Hell', 'Aura'],
  ['Frost', 'Firn', 'Reif', 'Glets', 'Eiszap', 'Hagel', 'Polar', 'Gefrier'],
  ['Press', 'Abyss', 'Tief', 'Quetsch', 'Bar', 'Kompr', 'Tauch', 'Kessel'],
  ['Byte', 'Pixel', 'Kode', 'Netz', 'Bit', 'Daten', 'Avatar', 'Cache'],
  ['Kosmo', 'Orbit', 'Leer', 'Stern', 'Weit', 'Nebul', 'Astro', 'Vaku'],
  ['Nebel', 'Dunst', 'Hauch', 'Wolk', 'Dampf', 'Böe', 'Qualm', 'Brise'],
  ['Isot', 'Gamma', 'Zerfall', 'Uran', 'Becquer', 'Halbw', 'Leucht', 'Plutoni'],
  ['Stahl', 'Chrom', 'Eisen', 'Erz', 'Bronz', 'Zink', 'Kupfer', 'Niete'],
  ['Kurbel', 'Ritzel', 'Kolben', 'Zahnrad', 'Schraub', 'Hebel', 'Feder', 'Getrieb'],
  ['Poly', 'Vinyl', 'Plast', 'Gummi', 'Nylo', 'Acryl', 'Silik', 'Latex'],
  ['Drach', 'Runen', 'Greif', 'Sagen', 'Myth', 'Wyrm', 'Orakel', 'Chimär'],
  ['Ätz', 'Sauer', 'Lauge', 'Gift', 'Zitr', 'Essig', 'Korros', 'Brodel'],
  ['Quark', 'Nukle', 'Proto', 'Neutr', 'Teil', 'Gluon', 'Myon', 'Lepto'],
  ['Quant', 'Qubi', 'Spin', 'Zufall', 'Schrödi', 'Verschr', 'Welle', 'Tunnel'],
  ['Schlund', 'Horiz', 'Singul', 'Kolla', 'Ereign', 'Abgr', 'Spaghett', 'Nichts'],
  ['Chrono', 'Tick', 'Äon', 'Sekund', 'Uhr', 'Epoch', 'Momen', 'Ewig'],
  ['Schatt', 'Finst', 'Umbr', 'Düster', 'Nacht', 'Mitter', 'Dämmer', 'Schemen'],
];
const ENDUNGEN = ['ix', 'o', 'ling', 'or', 'ax', 'ino', 'ara', 'on', 'u', 'ex', 'ira', 'elo', 'ek', 'is', 'orn', 'ida', 'us', 'ani', 'ett', 'umo', 'an', 'ox', 'ini', 'ur', 'ette', 'ius', 'ka', 'ilo'];

export const BAUPLAENE = ['blob', 'zweibeiner', 'vierbeiner', 'schlange', 'schweber', 'flieger', 'humanoid'];
const ROLLEN = Object.keys(CONFIG.rollen);
// [VORSCHLAG] Entwicklungsstufe der Art: Jungtier, jung, ausgewachsen, legendär (nur Aussehen, keine Werte)
export const FORMEN = ['Jungtier', 'Jung', 'Ausgewachsen', 'Legendär'];

// Bevorzugte Baupläne je Element (Platzhalter für die Kunstrichtung), der Rest wird gemischt
const BAUPLAN_VORLIEBE = {
  3: ['blob', 'vierbeiner', 'humanoid'],
  6: ['schlange', 'blob', 'schweber'],
  8: ['vierbeiner', 'vierbeiner', 'zweibeiner'],
  9: ['humanoid', 'humanoid', 'humanoid', 'zweibeiner'],
  19: ['schweber', 'flieger', 'blob'],
  20: ['schweber', 'schweber', 'blob'],
  22: ['humanoid', 'vierbeiner', 'blob'],
  23: ['humanoid', 'zweibeiner', 'vierbeiner'],
  25: ['flieger', 'schlange', 'vierbeiner'],
  29: ['schweber', 'blob', 'schweber'],
};

function namen(el, n, r, vergeben) {
  const silben = r.shuffle(SILBEN[el].slice());
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = silben[i % silben.length];
    const endungen = r.shuffle(ENDUNGEN.slice());
    let name = null;
    for (const e0 of endungen) {
      let e = e0;
      if (/[aeiouäöü]$/i.test(s) && /^[aeiou]/.test(e)) e = e.slice(1) || 'x';
      const kandidat = s + e;
      if (!vergeben.has(kandidat)) { name = kandidat; break; }
    }
    if (!name) { let k = 2; while (vergeben.has(s + 'o' + k)) k++; name = s + 'o' + k; }
    vergeben.add(name);
    out.push(name);
  }
  return out;
}

function bauplaene(el, n, r) {
  const vorliebe = BAUPLAN_VORLIEBE[el];
  const allgemein = BAUPLAENE.filter((b) => b !== 'humanoid' || (vorliebe && vorliebe.includes('humanoid')));
  const liste = [];
  if (vorliebe) while (liste.length < Math.ceil(n * 0.45)) liste.push(...vorliebe);
  while (liste.length < n) liste.push(...r.shuffle(allgemein.slice()));
  return r.shuffle(liste.slice(0, n));
}

function erzeugeArten() {
  const arten = [];
  const vergeben = new Set();
  const proEl = CONFIG.monster.artenProElement;
  for (let el = 0; el < ELEMENTE.length; el++) {
    const r = seeded('arten-' + el);
    const nm = namen(el, proEl, r, vergeben);
    const bp = bauplaene(el, proEl, r);
    const rollen = r.shuffle(Array.from({ length: proEl }, (_, i) => ROLLEN[i % ROLLEN.length]));
    for (let i = 0; i < proEl; i++) {
      const form = Math.min(FORMEN.length - 1, Math.floor((i * FORMEN.length) / proEl));
      arten.push({ id: arten.length, el, nr: i, name: nm[i], bauplan: bp[i], rolle: rollen[i], form, kunstSeed: `art-${el}-${i}` });
    }
  }
  return arten;
}

// Silber-Monster: eigene Arten am Ende der Liste (IDs ab 640), nur Klasse Silber, seltener gezogen
function erzeugeSilberArten(arten) {
  const vergeben = new Set(arten.map((a) => a.name));
  const n = CONFIG.monster.silberArtenProElement;
  for (let el = 0; el < ELEMENTE.length; el++) {
    const r = seeded('silber-' + el);
    const nm = namen(el, n, r, vergeben);
    for (let i = 0; i < n; i++) {
      arten.push({ id: arten.length, el, nr: CONFIG.monster.artenProElement + i, name: nm[i], bauplan: r.pick(BAUPLAENE.filter((b) => b !== 'humanoid' || el === 9)), rolle: r.pick(ROLLEN), form: 2 + (i % 2), kunstSeed: `silber-${el}-${i}`, silber: true, nurKlasse: CONFIG.monster.silberKlasse, gewicht: CONFIG.monster.silberGewicht });
    }
  }
  return arten;
}

export const ARTEN = erzeugeSilberArten(erzeugeArten());
export const REGULAERE_ARTEN = ARTEN.filter((a) => !a.silber);
// Kumulierte Ziehgewichte für die Artwahl beim Öffnen
let summe = 0;
export const ARTEN_GEWICHTE = ARTEN.map((a) => (summe += a.gewicht ?? 1));
export const artenFuerElement = (el) => ARTEN.filter((a) => a.el === el);
