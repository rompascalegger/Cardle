// Kartenerzeugung und Pack-Öffnung. [FEST 10.1] Alle Zufallswerte stehen beim Öffnen fest.
import { CONFIG, KLASSEN, LOOKS } from './config.js';
import { ATTR_KEYS, leereAttribute } from './attributes.js';
import { EFFEKTE } from './effects.js';
import { ARTEN } from './species.js';
import { klasseFuerWurf, holoFuerWurf, pityChance, staerke } from './rules.js';

// Punkte auf Attribute verteilen [VORSCHLAG 5.1]: Rollen-Gewichte, Obergrenzen [VORSCHLAG 5.5]
export function verteilePunkte(rng, summe, rolle) {
  const R = CONFIG.rollen[rolle] || CONFIG.rollen.angreifer;
  const cap = CONFIG.obergrenzen;
  const a = leereAttribute();
  const keys = ATTR_KEYS.filter((k) => (R.g[k] || 0) > 0);
  const maxSumme = keys.reduce((s, k) => s + cap[k], 0);
  let rest = Math.min(summe, maxSumme); // Deckel, falls die Klasse mehr verlangt als die Obergrenzen zulassen
  // Mindestpunkte, wenn genug da ist
  const mins = Object.entries(R.min || {});
  const minSumme = mins.reduce((s, [, v]) => s + v, 0);
  if (rest >= minSumme) {
    for (const [k, v] of mins) { a[k] += v; rest -= v; }
  }
  while (rest > 0) {
    const frei = keys.filter((k) => a[k] < cap[k]);
    if (!frei.length) break;
    const k = rng.weighted(frei.map((k) => [k, R.g[k]]));
    a[k]++; rest--;
  }
  return a;
}

// Effektanzahl bei Treffer (bedingte Anteile, auch für Pity-Treffer) [ANNAHME 10.3]
function effektAnzahl(u) {
  const A = CONFIG.effekte.anteilGenau;
  if (u < A[1]) return 1;
  if (u < A[1] + A[2]) return 2;
  return 3;
}

function waehleEffekte(rng, n) {
  // [ANNAHME 9.1] verschieden, gleichverteilt
  const pool = EFFEKTE.map((e) => e.id);
  const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  return out;
}

// Eine Karte auswürfeln. Reihenfolge [VORSCHLAG 10.2]. Gibt Karte und die rohen Würfe zurück (für die Animation).
export function wuerfleKarte(rng, effektChance, erzwingeEffekt = false) {
  const wuerfe = {};
  const art = ARTEN[Math.floor(rng.next() * ARTEN.length)]; // [OFFEN] Verteilung, Platzhalter gleichverteilt
  wuerfe.klasse = rng.next();
  const kl = klasseFuerWurf(wuerfe.klasse);
  const K = KLASSEN[kl];
  const summe = rng.int(K.min, K.max);
  const a = verteilePunkte(rng, summe, art.rolle);
  wuerfe.holo = rng.next();
  const holo = holoFuerWurf(wuerfe.holo);
  wuerfe.looks = [];
  let looks = 0;
  for (let i = 0; i < LOOKS.length; i++) {
    const u = rng.next();
    wuerfe.looks.push(u);
    if (u < CONFIG.lookChance) looks |= 1 << i;
  }
  wuerfe.effekt = rng.next();
  wuerfe.effektChance = effektChance;
  let fx = [];
  const treffer = erzwingeEffekt || wuerfe.effekt < effektChance;
  if (treffer) {
    wuerfe.effektAnzahl = rng.next();
    fx = waehleEffekte(rng, effektAnzahl(wuerfe.effektAnzahl));
  }
  wuerfe.pity = erzwingeEffekt;
  return { karte: { art: art.id, kl, a, holo, looks, fx }, wuerfe };
}

// Ein Pack öffnen. pityZaehler = Packs seit der letzten Effektkarte. [FEST 18.3]
export function oeffnePack(rng, pityZaehler) {
  const n = pityZaehler + 1;
  const p = pityChance(n);
  const P = CONFIG.pity;
  let erzwungen = -1;
  let chance = p;
  if (n >= P.garantie && P.garantieModus === 'eine_karte') {
    erzwungen = Math.floor(rng.next() * CONFIG.packGroesse);
    chance = pityChance(P.garantie - 1);
  }
  const karten = [];
  for (let i = 0; i < CONFIG.packGroesse; i++) karten.push(wuerfleKarte(rng, chance, i === erzwungen));
  const mitEffekt = karten.some((k) => k.karte.fx.length > 0);
  return { karten, pityVorher: pityZaehler, pityNachher: mitEffekt ? 0 : pityZaehler + 1, packNummer: n, chance: p };
}

// Gegnerkarte mit Zielstärke (für Kampagne) – nutzt dieselbe Verteilung, aber feste Klasse
export function gegnerKarte(rng, artId, zielStaerke, effekte = []) {
  const art = ARTEN[artId];
  let kl = 0;
  for (let i = 0; i < KLASSEN.length; i++) if (zielStaerke >= KLASSEN[i].min) kl = i;
  const K = KLASSEN[kl];
  const summe = Math.max(K.min, Math.min(K.max, zielStaerke));
  const a = verteilePunkte(rng, summe, art.rolle);
  return { art: art.id, kl, a, holo: 'keins', looks: 0, fx: effekte.slice(0, 3) };
}

export { staerke };
