// Spielstand: Münzen, Packs, Staub, Pity, Sammlung (kompakt kodiert), Team, Kampagne.
// [VORSCHLAG 1.4] Speicherung lokal. Wegen großer Sammlungen (Auto-Öffnen) in IndexedDB, Rückfall localStorage.
import { CONFIG, LOOKS } from './config.js';
import { Rng, zufallsSeed } from './rng.js';
import { ARTEN } from './species.js';
import { kodiere, dekodiere, ausfuehrungsKey, kartenSeltenheit, staubBeimAbtragen, hatLook, plaetzeBelegt, plaetzeBringt, staerke } from './rules.js';
import { oeffnePack } from './generator.js';

const params = new URLSearchParams(globalThis.location ? location.search : '');
export const URL_SEED = params.get('seed');
export const DEBUG = params.has('debug');
const SLOT = 'cardle-save' + (URL_SEED ? '-seed-' + URL_SEED : '');

// ---------- Speicher ----------
const IDB = {
  db: null,
  async open() {
    if (this.db || !globalThis.indexedDB) return this.db;
    this.db = await new Promise((res) => {
      try {
        const req = indexedDB.open('cardle', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      } catch { res(null); }
    });
    return this.db;
  },
  async get(k) {
    const db = await this.open();
    if (!db) return null;
    return new Promise((res) => {
      try {
        const r = db.transaction('kv').objectStore('kv').get(k);
        r.onsuccess = () => res(r.result ?? null);
        r.onerror = () => res(null);
      } catch { res(null); }
    });
  },
  async set(k, v) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((res) => {
      try {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(v, k);
        tx.oncomplete = () => res(true);
        tx.onerror = () => res(false);
      } catch { res(false); }
    });
  },
};

function neuerStand() {
  return {
    v: 1,
    seed: URL_SEED || zufallsSeed(),
    rng: null,
    muenzen: CONFIG.wirtschaft.startMuenzen,
    packs: CONFIG.wirtschaft.startPacks,
    staub: Object.fromEntries(LOOKS.map((l) => [l.key, 0])),
    pity: 0,
    karten: '', // kodierte Karten, ';'-getrennt
    team: [],
    kampagne: { fortschritt: {}, siege: 0, niederlagen: 0 },
    stat: { packs: 0, karten: 0, besteStufe: 1, stufen: new Array(15).fill(0), klassen: new Array(8).fill(0), autoPacks: 0, muenzenAusgegeben: 0 },
    einst: { lautstaerke: 0.45, stumm: false, bewegung: 'auto', aufdecken: 'normal' },
    gesehen: [], // Indizes neuer Karten seit dem letzten Besuch der Sammlung
  };
}

// ---------- Laufzeitzustand ----------
export const S = {
  d: neuerStand(),
  rng: null,
  karten: [], // kodierte Strings
  stapel: new Map(), // artId → { anzahl, ausf: Map(key → anzahl), idx: [] , besteStufe, besteKlasse }
  listeners: new Set(),
  dirty: false,
};

export function aenderung(was = 'alles') {
  S.dirty = true;
  for (const f of S.listeners) f(was);
}
export const beobachte = (f) => { S.listeners.add(f); return () => S.listeners.delete(f); };

function stapelFuer(art) {
  let s = S.stapel.get(art);
  if (!s) { s = { anzahl: 0, ausf: new Map(), idx: [], besteStufe: 0, besteKlasse: -1, beste: -1, besteWert: -1 }; S.stapel.set(art, s); }
  return s;
}
function indexiere(i, c) {
  const s = stapelFuer(c.art);
  s.anzahl++;
  s.idx.push(i);
  const k = ausfuehrungsKey(c);
  s.ausf.set(k, (s.ausf.get(k) || 0) + 1);
  const st = kartenSeltenheit(c);
  if (st > s.besteStufe) s.besteStufe = st;
  if (c.kl > s.besteKlasse) s.besteKlasse = c.kl;
  const w = st * 10000 + c.kl * 1000 + staerke(c.a);
  if (w > s.besteWert) { s.besteWert = w; s.beste = i; }
}
function baueIndex() {
  S.stapel.clear();
  S.karten.forEach((code, i) => indexiere(i, dekodiere(code)));
}

export const karte = (i) => dekodiere(S.karten[i]);
export const anzahlKarten = () => S.karten.length;

// ---------- Laden/Speichern ----------
export async function laden() {
  let roh = await IDB.get(SLOT);
  if (!roh) { try { roh = localStorage.getItem(SLOT); } catch { /* ignore */ } }
  if (roh) {
    try {
      const d = JSON.parse(roh);
      S.d = Object.assign(neuerStand(), d);
      S.d.stat = Object.assign(neuerStand().stat, d.stat || {});
      S.d.einst = Object.assign(neuerStand().einst, d.einst || {});
      S.d.staub = Object.assign(neuerStand().staub, d.staub || {});
    } catch { S.d = neuerStand(); }
  }
  S.karten = S.d.karten ? S.d.karten.split(';') : [];
  S.rng = new Rng(S.d.seed);
  if (S.d.rng) S.rng.setState(S.d.rng);
  if (DEBUG && !roh) { S.d.packs = 500; S.d.muenzen = 100000; }
  baueIndex();
  S.d.team = (S.d.team || []).filter((i) => i < S.karten.length);
}

let speicherTimer = null;
export async function speichern() {
  S.d.karten = S.karten.join(';');
  S.d.rng = S.rng.getState();
  const roh = JSON.stringify(S.d);
  S.d.karten = '';
  const ok = await IDB.set(SLOT, roh);
  if (!ok) { try { localStorage.setItem(SLOT, roh); } catch { /* voll */ } }
  S.dirty = false;
}
export function speichernBald(ms = 1500) {
  S.dirty = true;
  clearTimeout(speicherTimer);
  speicherTimer = setTimeout(speichern, ms);
}
export async function zuruecksetzen() {
  S.d = neuerStand();
  S.karten = [];
  S.rng = new Rng(S.d.seed);
  baueIndex();
  await speichern();
  aenderung();
}

// ---------- Packs ----------
// Öffnet ein Pack: alle Würfe sofort, Pity und Sammlung sofort konsistent. [FEST 10.1]
export function packOeffnen({ quelle = 'vorrat' } = {}) {
  if (quelle === 'vorrat') {
    if (S.d.packs <= 0) return null;
    S.d.packs--;
  }
  const pack = oeffnePack(S.rng, S.d.pity);
  S.d.pity = pack.pityNachher;
  pack.eintraege = pack.karten.map((k) => {
    const c = k.karte;
    const st = stapelFuer(c.art);
    const neuArt = st.anzahl === 0;
    const neuAusf = !st.ausf.has(ausfuehrungsKey(c));
    const i = S.karten.length;
    S.karten.push(kodiere(c));
    indexiere(i, c);
    const stufe = kartenSeltenheit(c);
    S.d.stat.stufen[stufe]++;
    S.d.stat.klassen[c.kl]++;
    if (stufe > S.d.stat.besteStufe) S.d.stat.besteStufe = stufe;
    return { ...k, index: i, neuArt, neuAusf, stufe };
  });
  S.d.stat.packs++;
  S.d.stat.karten += pack.karten.length;
  if (quelle === 'auto') S.d.stat.autoPacks++;
  return pack;
}

export function packKaufen(n = 1) {
  const preis = CONFIG.wirtschaft.packPreis * n;
  if (S.d.muenzen < preis) return false;
  S.d.muenzen -= preis;
  S.d.packs += n;
  S.d.stat.muenzenAusgegeben += preis;
  aenderung('muenzen');
  speichernBald();
  return true;
}

// ---------- Looks abtragen/auftragen [FEST 11.2] ----------
function ersetzeKarte(i, neu) {
  const alt = karte(i);
  const s = stapelFuer(alt.art);
  const ka = ausfuehrungsKey(alt);
  const n = (s.ausf.get(ka) || 1) - 1;
  if (n <= 0) s.ausf.delete(ka); else s.ausf.set(ka, n);
  const kn = ausfuehrungsKey(neu);
  s.ausf.set(kn, (s.ausf.get(kn) || 0) + 1);
  S.karten[i] = kodiere(neu);
  s.besteStufe = 0; s.besteWert = -1;
  for (const j of s.idx) {
    const cj = karte(j), st = kartenSeltenheit(cj);
    if (st > s.besteStufe) s.besteStufe = st;
    const w = st * 10000 + cj.kl * 1000 + staerke(cj.a);
    if (w > s.besteWert) { s.besteWert = w; s.beste = j; }
  }
}
export function lookAbtragen(i, lookIdx) {
  const c = karte(i);
  if (!hatLook(c.looks, lookIdx)) return false;
  const menge = staubBeimAbtragen(c);
  c.looks &= ~(1 << lookIdx);
  ersetzeKarte(i, c);
  S.d.staub[LOOKS[lookIdx].key] += menge;
  aenderung('sammlung');
  speichernBald();
  return menge;
}
export function lookAuftragen(i, lookIdx) {
  const c = karte(i);
  const key = LOOKS[lookIdx].key;
  if (hatLook(c.looks, lookIdx)) return false; // [ANNAHME] nicht doppelt
  if (S.d.staub[key] < CONFIG.staub.auftragKosten) return false;
  S.d.staub[key] -= CONFIG.staub.auftragKosten;
  c.looks |= 1 << lookIdx;
  ersetzeKarte(i, c);
  aenderung('sammlung');
  speichernBald();
  return true;
}

// ---------- Team ----------
export function teamPlaetze(team = S.d.team) {
  let belegt = 0, gesamt = CONFIG.kampf.teamGrundplaetze;
  for (const i of team) { const c = karte(i); belegt += plaetzeBelegt(c); gesamt += plaetzeBringt(c); }
  return { belegt, gesamt, ok: belegt <= gesamt };
}
export function teamSetzen(team) {
  S.d.team = team.slice();
  aenderung('team');
  speichernBald();
}
// Greedy: stärkste Karten zuerst, solange Plätze reichen
export function teamAutomatisch() {
  const kand = [];
  for (let i = 0; i < S.karten.length; i++) { const c = karte(i); kand.push({ i, c, w: staerke(c.a) + plaetzeBringt(c) * 3 }); }
  kand.sort((a, b) => b.w - a.w);
  const team = [];
  let belegt = 0, gesamt = CONFIG.kampf.teamGrundplaetze;
  // erst Kapazitätsbringer, die sich lohnen
  for (const k of kand) {
    if (team.length >= 24) break;
    const b = plaetzeBelegt(k.c), g = plaetzeBringt(k.c);
    if (belegt + b <= gesamt + g) { team.push(k.i); belegt += b; gesamt += g; }
  }
  teamSetzen(team);
}

export const artName = (id) => ARTEN[id].name;
