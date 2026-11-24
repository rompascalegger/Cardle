// Reine Regeln: Klassen, Seltenheit, Kosten, Pity, Kodierung der Karten.
import { CONFIG, KLASSEN, HOLO_STUFEN, LOOKS } from './config.js';
import { ATTR_KEYS } from './attributes.js';
import { EFFEKT } from './effects.js';

export const SELTENHEIT_NAMEN = CONFIG.seltenheit.namen;

// ---------- Klassen ----------
// Wurf u in [0,1) → Klassenindex. Seltenste Klasse liegt bei kleinen u (für die Log-Skala der Anzeige).
// Klassenchancen, optional mit Glücksfaktor: seltene Klassen ×mult, die häufigen anteilig seltener
export function klassenChancen(mult = 1) {
  const ch = KLASSEN.map((k) => k.chance);
  if (mult === 1) return ch;
  const ab = CONFIG.gluecksPack.klasseAb;
  const selten = Math.min(0.95, ch.reduce((s, c, i) => s + (i >= ab ? c * mult : 0), 0));
  const haeufig = ch.reduce((s, c, i) => s + (i < ab ? c : 0), 0);
  return ch.map((c, i) => (i >= ab ? c * mult : (c * (1 - selten)) / haeufig));
}
export function klassenGrenzen(mult = 1) {
  const ch = klassenChancen(mult);
  const g = []; // [{i, von, bis}] von selten nach häufig
  let acc = 0;
  for (let i = KLASSEN.length - 1; i >= 0; i--) {
    const von = acc; acc += ch[i];
    g.push({ i, von, bis: i === 0 ? 1 : acc });
  }
  return g;
}
const GRENZEN = new Map();
export function klasseFuerWurf(u, mult = 1) {
  if (!GRENZEN.has(mult)) GRENZEN.set(mult, klassenGrenzen(mult));
  for (const z of GRENZEN.get(mult)) if (u < z.bis) return z.i;
  return 0;
}

// ---------- Holo ----------
export function holoGrenzen(mult = 1) {
  const h = CONFIG.holo;
  const g = (h.ghost || 0) * mult;
  return [
    { holo: 'ghost', bis: g },
    { holo: 'secret', bis: g + h.secret * mult },
    { holo: 'holo', bis: g + (h.secret + h.holo) * mult },
    { holo: 'reverse', bis: g + (h.secret + h.holo + h.reverse) * mult },
  ].filter((z) => z.bis > 0);
}
const HOLO_G = new Map();
export function holoFuerWurf(u, mult = 1) {
  if (!HOLO_G.has(mult)) HOLO_G.set(mult, holoGrenzen(mult));
  for (const z of HOLO_G.get(mult)) if (u < z.bis) return z.holo;
  return 'keins';
}

// ---------- Looks ----------
export const lookAnzahl = (mask) => { let n = 0; for (let i = 0; i < LOOKS.length; i++) if (mask & (1 << i)) n++; return n; };
export const hatLook = (mask, i) => !!(mask & (1 << i));

// ---------- Seltenheit [FEST 7.3] ----------
export function seltenheit(holo, k, e) {
  const S = CONFIG.seltenheit;
  const looks = e === 0 ? k : (k === 0 ? 0 : (k <= 4 ? S.looksMitEffekt1bis4 : S.looksMitEffekt5));
  return Math.min(S.namen.length, S.basis[holo] + looks + S.effekt[e]);
}
export const kartenSeltenheit = (c) => seltenheit(c.holo, lookAnzahl(c.looks), c.fx.length);

function binom(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - i + 1)) / i; return r; }
export function pHolo(h) {
  const H = CONFIG.holo;
  return h === 'keins' ? 1 - H.reverse - H.holo - H.secret - (H.ghost || 0) : H[h];
}
export function pLooks(k) { const p = CONFIG.lookChance; return binom(LOOKS.length, k) * p ** k * (1 - p) ** (LOOKS.length - k); }
export function pEffekte(e) {
  const m = CONFIG.effekte.mind1;
  return e === 0 ? 1 - m : m * CONFIG.effekte.anteilGenau[e];
}
// Exakte Chance pro Karte für jede Seltenheitsstufe (ohne Pity)
export function seltenheitsChancen() {
  const p = new Array(15).fill(0);
  for (const h of HOLO_STUFEN) for (let k = 0; k <= 5; k++) for (let e = 0; e <= 3; e++) {
    p[seltenheit(h, k, e)] += pHolo(h) * pLooks(k) * pEffekte(e);
  }
  return p; // Index = Stufe 1..14
}

// ---------- Stärke, Kosten, Teamplätze ----------
export const staerke = (a) => ATTR_KEYS.reduce((s, k) => s + (a[k] || 0), 0);
// Kampfwert für die automatische Teamwahl: Schaden zählt am meisten, Teamkapazität kaum.
// [Spielerfeedback 24.11.2026] Vorher zählte Kapazität ×3, das Team bestand dann aus Kommandanten ohne Angriff.
export function kampfWert(c) {
  const a = c.a;
  const schaden = (a.kraft || 0) * Math.max(a.schlagzahl > 0 ? 1 : 0, 1 + 0.6 * ((a.schlagzahl || 0) - 1));
  return schaden * 2.2 + (a.schutz || 0) * 1.2 + (a.heilung || 0) * 1.2 + (a.groesse || 0) * 0.6 + (a.wildheit || 0) * 0.6
    + (a.seltsamkeit || 0) * 0.5 + (a.teamplatz || 0) * 0.8 + (a.kapazitaet || 0) * 0.3 + (c.fx?.length || 0) * 3;
}
export const hatEffekt = (c, key) => c.fx.some((id) => EFFEKT[id].key === key);
// [ANNAHME 9.6, geändert 24.11.2026 nach Spielerfeedback] Früher: Produkt der Preisfaktoren (3 Effekte bis ×24, Karten mit 288 Kosten).
// Jetzt: Aufschläge addieren sich und werden gedämpft, mit Deckel. Ein Effekt ×1,15–×1,9, höchstens ×2.
export function preisFaktor(c) {
  const P = CONFIG.kampf.effektPreis;
  const aufschlag = c.fx.reduce((s, id) => s + (EFFEKT[id].faktor - 1), 0);
  return Math.min(P.deckel, 1 + P.daempfung * aufschlag);
}
// Kosten = Stärke × Preisfaktor. [OFFEN] Rundung → Platzhalter.
export function kosten(c) {
  const roh = staerke(c.a) * preisFaktor(c);
  const r = CONFIG.kampf.kostenRundung === 'ceil' ? Math.ceil(roh) : Math.round(roh);
  return Math.max(1, r);
}
export function plaetzeBelegt(c) {
  let n = Math.max(CONFIG.kampf.teamplatzMinPlaetze, c.a.teamplatz || 0);
  if (hatEffekt(c, 'platzfresser')) n += 2;
  return n;
}
export function plaetzeBringt(c) {
  let n = c.a.kapazitaet || 0;
  if (hatEffekt(c, 'platzspender')) n += 2;
  if (hatEffekt(c, 'platzfresser')) n += 5;
  return n;
}
export const teamplatzMult = (tp) => 1 + CONFIG.kampf.teamplatzMultProPunkt * (tp || 0);

// ---------- Pity [FEST 10.3] ----------
export function pityChance(n) {
  const P = CONFIG.pity, base = CONFIG.effekte.mind1;
  if (n <= P.schwelle) return base;
  if (n >= P.garantie) return 1;
  return Math.min(1, base * 2 ** ((n - P.schwelle) / P.verdopplung));
}

// ---------- Verkauf [OFFEN, Platzhalter] ----------
export function verkaufswert(c) {
  const W = CONFIG.wirtschaft;
  return W.verkaufKlasse[c.kl] * W.verkaufStufe[kartenSeltenheit(c)] * (c.fx.length ? 5 : 1);
}

// ---------- Staub ----------
export const staubBeimAbtragen = (c) => c.kl + 1; // [ANNAHME] Klassennummer 1..8

// ---------- Kodierung (kompakt für große Sammlungen) ----------
// Format: art(2) kl(1) 9×attr(1) holo(1) looks(1) [fx(2)]*  (gerade Länge)
// Altes Format mit 8 Attributen (ohne Heilung) hat ungerade Länge und wird weiter gelesen.
const b36 = (n, len) => n.toString(36).padStart(len, '0');
export function kodiere(c) {
  let s = b36(c.art, 2) + c.kl.toString(36);
  for (const k of ATTR_KEYS) s += Math.min(35, c.a[k] || 0).toString(36);
  s += HOLO_STUFEN.indexOf(c.holo).toString(36) + c.looks.toString(36);
  for (const id of c.fx) s += b36(id, 2);
  return s;
}
const ALTE_KEYS = ATTR_KEYS.filter((k) => k !== 'heilung');
export function dekodiere(s) {
  const alt = s.length % 2 === 1;
  const keys = alt ? ALTE_KEYS : ATTR_KEYS;
  const a = {};
  keys.forEach((k, i) => { a[k] = parseInt(s[3 + i], 36); });
  if (alt) a.heilung = 0;
  const h = 3 + keys.length;
  const fx = [];
  for (let i = h + 2; i + 1 < s.length; i += 2) fx.push(parseInt(s.slice(i, i + 2), 36));
  return {
    art: parseInt(s.slice(0, 2), 36),
    kl: parseInt(s[2], 36),
    a,
    holo: HOLO_STUFEN[parseInt(s[h], 36)],
    looks: parseInt(s[h + 1], 36),
    fx,
  };
}
// Stapel = Monsterart, Ausführung = (Holo, Looks) [FEST 11.1]
export const ausfuehrungsKey = (c) => HOLO_STUFEN.indexOf(c.holo) * 32 + c.looks;
export function ausfuehrungAusKey(k) { return { holo: HOLO_STUFEN[Math.floor(k / 32)], looks: k % 32 }; }

export function prozent(p, stellen = 2) {
  if (p >= 0.01) return (p * 100).toLocaleString('de-DE', { maximumFractionDigits: stellen }) + ' %';
  if (p <= 0) return '0 %';
  const sig = Math.max(0, -Math.floor(Math.log10(p * 100)) + 1);
  return (p * 100).toLocaleString('de-DE', { maximumFractionDigits: Math.min(12, sig + 1) }) + ' %';
}
export function einsVon(p) {
  if (p <= 0) return '–';
  const n = 1 / p;
  if (n < 1.05) return 'fast immer';
  if (n >= 1e9) {
    const e = Math.floor(Math.log10(n));
    return `1 von ${(n / 10 ** e).toLocaleString('de-DE', { maximumFractionDigits: 1 })}·10^${e}`;
  }
  if (n >= 1e6) return `1 von ${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.`;
  return `1 von ${Math.round(n).toLocaleString('de-DE')}`;
}
