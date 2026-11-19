// Monsterarten. [OFFEN 14.3/16] Anzahl, Namen und Verteilung sind offen.
// Platzhalter: CONFIG.monster.artenProElement Arten je Element, Namen aus Silben erzeugt, Bauplan zufällig mit festem Seed.
import { CONFIG } from './config.js';
import { ELEMENTE } from './elements.js';
import { seeded } from './rng.js';

const SILBEN = [
  ['Flamm', 'Glut', 'Brand', 'Lohe', 'Funk'],
  ['Magm', 'Schmelz', 'Basalt', 'Lav', 'Krust'],
  ['Koks', 'Ruß', 'Schwel', 'Anthra', 'Brikk'],
  ['Fels', 'Granit', 'Brock', 'Kiesel', 'Klipp'],
  ['Quarz', 'Prism', 'Glimm', 'Fazett', 'Geod'],
  ['Halit', 'Sole', 'Pökel', 'Salin', 'Siede'],
  ['Gischt', 'Well', 'Strudel', 'Tropf', 'Aqua'],
  ['Blatt', 'Moos', 'Ranke', 'Knosp', 'Wurz'],
  ['Krall', 'Fang', 'Mähn', 'Pranke', 'Reiß'],
  ['Kobo', 'Golem', 'Wicht', 'Gnomi', 'Bürgl'],
  ['Pinsel', 'Klecks', 'Muse', 'Farb', 'Skizz'],
  ['Grübel', 'Sinn', 'Sophi', 'Denk', 'Logos'],
  ['Axiom', 'Vektor', 'Summ', 'Prim', 'Zahl'],
  ['Grav', 'Schwer', 'Masse', 'Last', 'Orbis'],
  ['Volt', 'Zapp', 'Ampi', 'Ohm', 'Funkel'],
  ['Lumi', 'Glanz', 'Sonn', 'Schein', 'Strahl'],
  ['Frost', 'Firn', 'Reif', 'Glets', 'Eiszap'],
  ['Press', 'Abyss', 'Tief', 'Quetsch', 'Bar'],
  ['Byte', 'Pixel', 'Kode', 'Netz', 'Bit'],
  ['Kosmo', 'Orbit', 'Leer', 'Stern', 'Weit'],
  ['Nebel', 'Dunst', 'Hauch', 'Wolk', 'Dampf'],
  ['Isot', 'Gamma', 'Zerfall', 'Uran', 'Becquer'],
  ['Stahl', 'Chrom', 'Eisen', 'Erz', 'Bronz'],
  ['Kurbel', 'Ritzel', 'Kolben', 'Zahnrad', 'Schraub'],
  ['Poly', 'Vinyl', 'Plast', 'Gummi', 'Nylo'],
  ['Drach', 'Runen', 'Greif', 'Sagen', 'Myth'],
  ['Ätz', 'Sauer', 'Lauge', 'Gift', 'Zitr'],
  ['Quark', 'Nukle', 'Proto', 'Neutr', 'Teil'],
  ['Quant', 'Qubi', 'Spin', 'Zufall', 'Schrödi'],
  ['Schlund', 'Horiz', 'Singul', 'Kolla', 'Ereign'],
  ['Chrono', 'Tick', 'Äon', 'Sekund', 'Uhr'],
  ['Schatt', 'Finst', 'Umbr', 'Düster', 'Nacht'],
];
const ENDUNGEN = ['ix', 'o', 'ling', 'or', 'ax', 'ino', 'ara', 'on', 'u', 'ex', 'ira', 'elo', 'ek', 'is', 'orn', 'ida', 'us', 'ani', 'ett', 'umo'];

export const BAUPLAENE = ['blob', 'zweibeiner', 'vierbeiner', 'schlange', 'schweber', 'flieger', 'humanoid'];
const ROLLEN = Object.keys(CONFIG.rollen);

// Bevorzugte Baupläne je Element (Platzhalter für Kunstrichtung)
const BAUPLAN_VORLIEBE = {
  8: ['vierbeiner', 'vierbeiner', 'zweibeiner'],
  9: ['humanoid', 'humanoid', 'humanoid'],
  20: ['schweber', 'schweber', 'blob'],
  6: ['schlange', 'blob', 'schweber'],
  25: ['flieger', 'schlange', 'vierbeiner'],
  29: ['schweber', 'blob', 'schweber'],
  19: ['schweber', 'flieger', 'blob'],
  22: ['humanoid', 'vierbeiner', 'blob'],
  23: ['humanoid', 'zweibeiner', 'vierbeiner'],
  3: ['blob', 'vierbeiner', 'humanoid'],
};

function erzeugeArten() {
  const arten = [];
  const vergeben = new Set();
  const proEl = CONFIG.monster.artenProElement;
  for (let el = 0; el < ELEMENTE.length; el++) {
    const r = seeded('arten-' + el);
    const silben = r.shuffle(SILBEN[el].slice());
    for (let i = 0; i < proEl; i++) {
      let name, tries = 0;
      do {
        const s = silben[(i + tries) % silben.length];
        let e = r.pick(ENDUNGEN);
        if (/[aeiouäöü]$/i.test(s) && /^[aeiou]/.test(e)) e = e.slice(1) || 'x';
        name = s + e;
        tries++;
      } while (vergeben.has(name) && tries < 40);
      vergeben.add(name);
      const vorliebe = BAUPLAN_VORLIEBE[el];
      const bauplan = vorliebe ? vorliebe[i % vorliebe.length] : r.pick(BAUPLAENE.filter((b) => b !== 'humanoid'));
      const rolle = ROLLEN[(el * 3 + i * 5 + r.int(0, 7)) % ROLLEN.length];
      arten.push({ id: arten.length, el, nr: i, name, bauplan, rolle, kunstSeed: `art-${el}-${i}` });
    }
  }
  return arten;
}

export const ARTEN = erzeugeArten();
export const artenFuerElement = (el) => ARTEN.filter((a) => a.el === el);
