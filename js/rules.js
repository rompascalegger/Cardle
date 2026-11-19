// Reine Regeln: Klassen, Seltenheit, Kosten, Pity, Kodierung der Karten.
import { CONFIG, KLASSEN, HOLO_STUFEN, LOOKS } from './config.js';
import { ATTR_KEYS } from './attributes.js';
import { EFFEKT } from './effects.js';

export const SELTENHEIT_NAMEN = CONFIG.seltenheit.namen;

// ---------- Klassen ----------
// Wurf u in [0,1) → Klassenindex. Seltenste Klasse liegt bei kleinen u (für die Log-Skala der Anzeige).
export function klassenGrenzen() {
  const g = []; // [{i, von, bis}] von selten nach häufig
  let acc = 0;
  for (let i = KLASSEN.length - 1; i >= 0; i--) {
    const von = acc; acc += KLASSEN[i].chance;
    g.push({ i, von, bis: i === 0 ? 1 : acc });
  }
  return g;
}
const GRENZEN = klassenGrenzen();
export function klasseFuerWurf(u) {
  for (const z of GRENZEN) if (u < z.bis) return z.i;
  return 0;
}

// ---------- Holo ----------
export function holoGrenzen() {
  const h = CONFIG.holo;
  return [
    { holo: 'secret', bis: h.secret },
    { holo: 'holo', bis: h.secret + h.holo },
    { holo: 'reverse', bis: h.secret + h.holo + h.reverse },
  ];
}
export function holoFuerWurf(u) {
  for (const z of holoGrenzen()) if (u < z.bis) return z.holo;
  return 'keins';
}

// ---------- Looks ----------
export const lookAnzahl = (mask) => { let n = 0; for (let i = 0; i < LOOKS.length; i++) if (mask & (1 << i)) n++; return n; };
export const hatLook = (mask, i) => !!(mask & (1 << i));

// ---------- Seltenheit [FEST 7.3] ----------
export function seltenheit(holo, k, e) {
  const S = CONFIG.seltenheit;
  const looks = e === 0 ? k : (k === 0 ? 0 : (k <= 4 ? S.looksMitEffekt1bis4 : S.looksMitEffekt5));
  return S.basis[holo] + looks + S.effekt[e];
}
export const kartenSeltenheit = (c) => seltenheit(c.holo, lookAnzahl(c.looks), c.fx.length);

function binom(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - i + 1)) / i; return r; }
export function pHolo(h) {
  const H = CONFIG.holo;
  return h === 'keins' ? 1 - H.reverse - H.holo - H.secret : H[h];
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
export const hatEffekt = (c, key) => c.fx.some((id) => EFFEKT[id].key === key);
export function preisFaktor(c) { return c.fx.reduce((p, id) => p * EFFEKT[id].faktor, 1); }
// [ANNAHME 9.6] Kosten = Stärke × Produkt der Preisfaktoren. [OFFEN] Rundung → Platzhalter.
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

// ---------- Staub ----------
export const staubBeimAbtragen = (c) => c.kl + 1; // [ANNAHME] Klassennummer 1..8

// ---------- Kodierung (kompakt für große Sammlungen) ----------
// Format: art(2) kl(1) 8×attr(1) holo(1) looks(1) [fx(2)]*
const b36 = (n, len) => n.toString(36).padStart(len, '0');
export function kodiere(c) {
  let s = b36(c.art, 2) + c.kl.toString(36);
  for (const k of ATTR_KEYS) s += Math.min(35, c.a[k] || 0).toString(36);
  s += HOLO_STUFEN.indexOf(c.holo).toString(36) + c.looks.toString(36);
  for (const id of c.fx) s += b36(id, 2);
  return s;
}
export function dekodiere(s) {
  const a = {};
  ATTR_KEYS.forEach((k, i) => { a[k] = parseInt(s[3 + i], 36); });
  const fx = [];
  for (let i = 13; i + 1 < s.length; i += 2) fx.push(parseInt(s.slice(i, i + 2), 36));
  return {
    art: parseInt(s.slice(0, 2), 36),
    kl: parseInt(s[2], 36),
    a,
    holo: HOLO_STUFEN[parseInt(s[11], 36)],
    looks: parseInt(s[12], 36),
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
