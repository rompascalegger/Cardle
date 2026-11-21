// Erfolge mit Belohnungen [Nutzer, 21.11.2026]: Welten, Dimensionen, Kern, Siege, Sammlung, Funde, Daily.
import { KLASSEN } from './config.js';
import { ELEMENTE } from './elements.js';
import { ARTEN, REGULAERE_ARTEN } from './species.js';
import { S, aenderung, speichernBald, sonderPacksGeben } from './state.js';
import { DIMENSIONEN, KERN_DIM, weltenFertig, weltenFertigIn, dimensionFertig, kernOffen } from './campaign.js';

const fort = () => S.d.kampagne.fortschritt;
const entdeckt = (silber = false) => ARTEN.filter((a) => !!a.silber === silber && (S.stapel.get(a.id)?.anzahl || 0) > 0).length;
const dimsFertig = () => DIMENSIONEN.slice(0, KERN_DIM).filter((_, d) => dimensionFertig(fort(), d)).length;

export const ERFOLGE = [
  ...[1, 5, 10, 25, 50, 100, 150, 200, 256, 272].map((n) => ({ id: 'welten' + n, gruppe: 'Kampagne', name: n === 1 ? 'Erste Welt' : `${n} Welten`, text: `Schließe ${n} Welt${n > 1 ? 'en' : ''} ab.`, ziel: n, wert: () => weltenFertig(fort()), lohn: { muenzen: 1000 * n, packs: 3 + Math.ceil(n / 5), gluecks: n >= 10 ? 1 + Math.floor(n / 100) : 0 } })),
  ...[1, 4, 8, 16, 32].map((n) => ({ id: 'dims' + n, gruppe: 'Kampagne', name: n === 1 ? 'Dimensionsmeister' : `${n} Dimensionen`, text: `Schließe alle Welten von ${n} Dimension${n > 1 ? 'en' : ''} ab.`, ziel: n, wert: dimsFertig, lohn: { gluecks: 2 + Math.floor(n / 4), muenzen: 20000 * n } })),
  { id: 'kern-offen', gruppe: 'Kampagne', name: 'Zum Kern', text: 'Öffne die Kern-Dimension (2 Welten in jeder Dimension).', ziel: 1, wert: () => (kernOffen(fort()) ? 1 : 0), lohn: { gluecks: 3, muenzen: 50000 } },
  { id: 'kern-fertig', gruppe: 'Kampagne', name: 'Herz des Rads', text: 'Schließe alle 16 Welten der Kern-Dimension ab.', ziel: 16, wert: () => weltenFertigIn(fort(), KERN_DIM), lohn: { gluecks: 10, muenzen: 500000 } },
  ...ELEMENTE.map((e, d) => ({ id: 'dim-' + d, gruppe: 'Dimensionen', name: `${e.name}-Bezwinger`, text: `Schließe alle 8 Welten der ${e.name}-Dimension ab.`, ziel: 8, wert: () => weltenFertigIn(fort(), d), lohn: { element: 2, el: d, gluecks: 1, muenzen: 15000 } })),
  ...[10, 100, 500, 1000, 2500].map((n) => ({ id: 'siege' + n, gruppe: 'Kampf', name: `${n} Siege`, text: `Gewinne ${n} Kämpfe.`, ziel: n, wert: () => S.d.kampagne.siege, lohn: { packs: 5 + Math.floor(n / 20), muenzen: 200 * n } })),
  ...[1, 7, 30].map((n) => ({ id: 'daily-serie' + n, gruppe: 'Daily', name: n === 1 ? 'Täglich dabei' : `${n} Tage in Folge`, text: `Gewinne an ${n} Tag${n > 1 ? 'en in Folge' : ''} eine Daily Challenge.`, ziel: n, wert: () => S.d.daily?.serie || 0, lohn: { packs: 3 * n, gluecks: n >= 7 ? 1 : 0 } })),
  ...KLASSEN.map((k, i) => ({ id: 'daily-' + k.key, gruppe: 'Daily', name: `Daily ${k.name}`, text: `Gewinne die Daily ${k.name} Challenge.`, ziel: 1, wert: () => (S.d.erfolgeDaily?.[i] ? 1 : 0), lohn: { packs: 2 + i, muenzen: 1000 * (i + 1) } })),
  ...[25, 100, 300, 640].map((n) => ({ id: 'monster' + n, gruppe: 'Sammlung', name: `${n} Monster`, text: `Entdecke ${n} verschiedene Monster.`, ziel: n, wert: () => entdeckt(false), lohn: { packs: 5 + Math.floor(n / 20), gluecks: n >= 300 ? 1 : 0 } })),
  { id: 'silber1', gruppe: 'Sammlung', name: 'Silberglanz', text: 'Entdecke ein Silber-Monster.', ziel: 1, wert: () => entdeckt(true), lohn: { packs: 5 } },
  { id: 'silber-alle', gruppe: 'Sammlung', name: 'Silberschatz', text: `Entdecke alle ${ARTEN.length - REGULAERE_ARTEN.length} Silber-Monster.`, ziel: ARTEN.length - REGULAERE_ARTEN.length, wert: () => entdeckt(true), lohn: { gluecks: 3 } },
  ...[100, 1000, 10000].map((n) => ({ id: 'packs' + n, gruppe: 'Funde', name: `${n} Packs`, text: `Öffne ${n} Packs.`, ziel: n, wert: () => S.d.stat.packs, lohn: { muenzen: 50 * n } })),
  { id: 'fx1', gruppe: 'Funde', name: 'Spezialeffekt', text: 'Ziehe eine Karte mit Spezialeffekt.', ziel: 1, wert: () => S.d.stat.effektKarten || 0, lohn: { packs: 5 } },
  { id: 'secret', gruppe: 'Funde', name: 'Geheimnisvoll', text: 'Ziehe eine Secret Holo.', ziel: 1, wert: () => S.d.stat.holo?.secret || 0, lohn: { packs: 8 } },
  { id: 'ghost', gruppe: 'Funde', name: 'Geistererscheinung', text: 'Ziehe eine Ghost Rare.', ziel: 1, wert: () => S.d.stat.holo?.ghost || 0, lohn: { gluecks: 2 } },
  { id: 'diamond', gruppe: 'Funde', name: 'Funkelnder Fund', text: 'Ziehe eine Diamond-Karte.', ziel: 1, wert: () => S.d.stat.klassen[7] || 0, lohn: { gluecks: 1 } },
  { id: 'elite', gruppe: 'Funde', name: 'Elite', text: 'Ziehe eine Karte ab elite rare.', ziel: 1, wert: () => (S.d.stat.besteStufe >= 7 ? 1 : 0), lohn: { gluecks: 1, muenzen: 20000 } },
];

export function lohnText(l) {
  const t = [];
  if (l.packs) t.push(`${l.packs} Packs`);
  if (l.muenzen) t.push(`${l.muenzen.toLocaleString('de-DE')} Münzen`);
  if (l.gluecks) t.push(`${l.gluecks} Glückspack${l.gluecks > 1 ? 's' : ''}`);
  if (l.element) t.push(`${l.element} ${ELEMENTE[l.el ?? 0].name}-Elementpack${l.element > 1 ? 's' : ''}`);
  return t.join(' · ');
}

// Prüft alle Erfolge, schreibt neue gut und gibt sie zurück
export function pruefeErfolge() {
  const neu = [];
  for (const e of ERFOLGE) {
    if (S.d.erfolge[e.id]) continue;
    if (e.wert() >= e.ziel) {
      S.d.erfolge[e.id] = Date.now();
      const l = e.lohn;
      S.d.packs += l.packs || 0;
      S.d.muenzen += l.muenzen || 0;
      sonderPacksGeben({ gluecks: l.gluecks || 0, element: l.element || 0 }, l.el ?? 0);
      neu.push(e);
    }
  }
  if (neu.length) { aenderung('erfolge'); speichernBald(300); }
  return neu;
}
