// Spielstand: Münzen, Packs, Staub, Pity, Sammlung (kompakt kodiert), Team, Kampagne.
// [VORSCHLAG 1.4] Speicherung lokal. Wegen großer Sammlungen (Auto-Öffnen) in IndexedDB, Rückfall localStorage.
import { CONFIG, LOOKS } from './config.js';
import { Rng, zufallsSeed } from './rng.js';
import { ARTEN } from './species.js';
import { kodiere, dekodiere, ausfuehrungsKey, kartenSeltenheit, staubBeimAbtragen, hatLook, plaetzeBelegt, plaetzeBringt, staerke, verkaufswert, kosten, kampfWert } from './rules.js';
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
    gluecksPacks: 0, // alt, wird in sonderPacks übernommen
    sonderPacks: [], // [{ typ: 'gluecks' } | { typ: 'element', el }]
    erfolge: {},
    staub: Object.fromEntries(LOOKS.map((l) => [l.key, 0])),
    pity: 0,
    karten: '', // kodierte Karten, ';'-getrennt
    team: [],
    favoriten: [], // Kartenindizes, nie verkaufbar [Spielerfeedback 24.11.2026]
    teamSlots: Array.from({ length: CONFIG.kampf.teamSlots }, (_, n) => ({ name: `Team ${n + 1}`, team: [] })), // gespeicherte Teams, aktives = S.d.team
    teamSlot: 0,
    kampagne: { v: CONFIG.kampagne.version, fortschritt: {}, siege: 0, niederlagen: 0 },
    stat: { packs: 0, karten: 0, besteStufe: 1, stufen: new Array(15).fill(0), klassen: new Array(8).fill(0), autoPacks: 0, muenzenAusgegeben: 0 },
    einst: { lautstaerke: 0.45, stumm: false, bewegung: 'auto', aufdecken: 'normal' },
    gesehen: [], // Indizes neuer Karten seit dem letzten Besuch der Sammlung
    arten: CONFIG.monster.artenProElement, // Arten je Element, mit denen die Karten gespeichert sind
    wirtschaftV: CONFIG.wirtschaft.version,
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
  let gespeicherteArten = CONFIG.monster.artenProElement;
  let gespeicherteWirtschaft = CONFIG.wirtschaft.version;
  let roh = await IDB.get(SLOT);
  if (!roh) { try { roh = localStorage.getItem(SLOT); } catch { /* ignore */ } }
  if (roh) {
    try {
      const d = JSON.parse(roh);
      gespeicherteArten = d.arten || 3;
      gespeicherteWirtschaft = d.wirtschaftV || 1;
      S.d = Object.assign(neuerStand(), d);
      S.d.stat = Object.assign(neuerStand().stat, d.stat || {});
      S.d.einst = Object.assign(neuerStand().einst, d.einst || {});
      S.d.staub = Object.assign(neuerStand().staub, d.staub || {});
    } catch { S.d = neuerStand(); }
  }
  S.karten = S.d.karten ? S.d.karten.split(';') : [];
  migriereArten(gespeicherteArten);
  // Wirtschaft v2: Münzwerte ×10
  if (gespeicherteWirtschaft < 2) { S.d.muenzen = Math.round(S.d.muenzen * 10); S.d.stat.muenzenAusgegeben = Math.round((S.d.stat.muenzenAusgegeben || 0) * 10); }
  S.d.wirtschaftV = CONFIG.wirtschaft.version;
  S.d.sonderPacks = S.d.sonderPacks || [];
  S.d.erfolge = S.d.erfolge || {};
  S.d.erfolgeAbgeholt = S.d.erfolgeAbgeholt || {};
  while (S.d.gluecksPacks > 0) { S.d.sonderPacks.push({ typ: 'gluecks' }); S.d.gluecksPacks--; }
  // Kampagne v2: neue Kampfstruktur, alter Fortschritt passt nicht mehr
  if ((S.d.kampagne.v || 1) < CONFIG.kampagne.version) { S.d.kampagne.fortschritt = {}; S.d.kampagne.v = CONFIG.kampagne.version; }
  S.rng = new Rng(S.d.seed);
  if (S.d.rng) S.rng.setState(S.d.rng);
  if (DEBUG && !roh) { S.d.packs = 500; S.d.muenzen = 1000000; }
  baueIndex();
  S.d.team = (S.d.team || []).filter((i) => i < S.karten.length);
  S.d.favoriten = (S.d.favoriten || []).filter((i) => i < S.karten.length);
  if (!Array.isArray(S.d.teamSlots)) S.d.teamSlots = [];
  while (S.d.teamSlots.length < CONFIG.kampf.teamSlots) S.d.teamSlots.push({ name: `Team ${S.d.teamSlots.length + 1}`, team: [] });
  S.d.teamSlot = Math.min(S.d.teamSlot || 0, S.d.teamSlots.length - 1);
  for (const sl of S.d.teamSlots) sl.team = (sl.team || []).filter((i) => i < S.karten.length);
  S.d.teamSlots[S.d.teamSlot].team = S.d.team.slice();
}

// Ändert sich die Zahl der Arten je Element, bleiben Element und Nummer einer Art erhalten.
function migriereArten(alt) {
  const neu = CONFIG.monster.artenProElement;
  if (alt !== neu) {
    S.karten = S.karten.map((code) => {
      const c = dekodiere(code);
      const el = Math.floor(c.art / alt), nr = c.art % alt;
      c.art = el * neu + Math.min(nr, neu - 1);
      return kodiere(c);
    });
  }
  S.d.arten = neu;
}

let speicherTimer = null;
export async function speichern() {
  if (S.gesperrt) return; // nach einem Import: der importierte Stand darf nicht überschrieben werden
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
// Gedrosselt: speichert spätestens nach ms, auch wenn ständig neue Änderungen kommen (Auto-Öffnen)
let drosselTimer = null;
export function speichernSpaetestens(ms = 3000) {
  S.dirty = true;
  if (drosselTimer) return;
  drosselTimer = setTimeout(() => { drosselTimer = null; speichern(); }, ms);
}
// ---------- Export / Import ----------
// Der Export ist verschlüsselt: AES-256-GCM, Schlüssel = SHA-256 über einen festen Spielschlüssel.
// GCM prüft dabei auch die Echtheit: jede Änderung am Text macht den Import ungültig.
// Hinweis: Der Spielschlüssel steht im Code der Seite. Das schützt vor einfachem Bearbeiten, nicht vor Entschlossenen.
const SICHERUNG_PRAEFIX = 'CARDLE1:';
const SPIELSCHLUESSEL = 'cardle/spielstand/v1/7f3c9a51-e2b4-4d86-9b0e-5a1c3d7e9f24';
let schluesselCache = null;
function sicherungsSchluessel() {
  if (!globalThis.crypto?.subtle) throw new Error('Verschlüsselung ist in diesem Browser nicht verfügbar (nur über https oder localhost).');
  schluesselCache ??= crypto.subtle.digest('SHA-256', new TextEncoder().encode(SPIELSCHLUESSEL))
    .then((hash) => crypto.subtle.importKey('raw', hash, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
  return schluesselCache;
}
const zuB64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const vonB64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));

// Spielstand als verschlüsselter Text. Enthält alles: Karten, Münzen, Packs, Kampagne, Erfolge, Zufallszustand.
export async function spielstandExport() {
  const d = Object.assign({}, S.d, { karten: S.karten.join(';'), rng: S.rng.getState() });
  const klar = new TextEncoder().encode(JSON.stringify({ spiel: 'cardle', format: 1, zeit: new Date().toISOString(), stand: d }));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const geheim = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await sicherungsSchluessel(), klar));
  const alles = new Uint8Array(iv.length + geheim.length);
  alles.set(iv); alles.set(geheim, iv.length);
  return SICHERUNG_PRAEFIX + zuB64(alles);
}
// Entschlüsselt und prüft den Text, gibt eine kurze Übersicht zurück, ohne etwas zu ändern
export async function spielstandPruefen(text) {
  const t = String(text).replace(/\s+/g, '');
  if (!t.startsWith(SICHERUNG_PRAEFIX)) throw new Error('Das ist kein gültiger Cardle-Spielstand.');
  let o;
  try {
    const alles = vonB64(t.slice(SICHERUNG_PRAEFIX.length));
    const klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: alles.subarray(0, 12) }, await sicherungsSchluessel(), alles.subarray(12));
    o = JSON.parse(new TextDecoder().decode(klar));
  } catch (e) {
    if (/nicht verfügbar/.test(e.message)) throw e;
    throw new Error('Der Spielstand ist beschädigt oder wurde verändert.');
  }
  const d = o && o.spiel === 'cardle' ? o.stand : null;
  if (!d || typeof d !== 'object' || typeof d.seed !== 'string' || typeof d.muenzen !== 'number') throw new Error('Das ist kein gültiger Cardle-Spielstand.');
  if (d.karten != null && typeof d.karten !== 'string') throw new Error('Die Kartenliste im Spielstand ist beschädigt.');
  const karten = d.karten ? d.karten.split(';') : [];
  for (const c of karten) if (!/^[0-9a-z]+$/.test(c)) throw new Error('Die Kartenliste im Spielstand ist beschädigt.');
  return { d, karten: karten.length, muenzen: d.muenzen, packs: d.packs || 0, zeit: o.zeit || null };
}
// Schreibt den Stand in den Speicher und lädt die Seite neu (dabei laufen alle Migrationen)
export async function spielstandImport(text) {
  const { d } = await spielstandPruefen(text);
  S.gesperrt = true;
  const roh = JSON.stringify(d);
  const ok = await IDB.set(SLOT, roh);
  if (!ok) { try { localStorage.setItem(SLOT, roh); } catch { S.gesperrt = false; throw new Error('Speichern fehlgeschlagen.'); } }
  location.reload();
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
export function packOeffnen({ quelle = 'vorrat', sonderIndex = null } = {}) {
  if (quelle === 'vorrat') {
    if (S.d.packs <= 0) return null;
    S.d.packs--;
  }
  let sonder = null;
  if (quelle === 'sonder') {
    if (sonderIndex == null || !S.d.sonderPacks[sonderIndex]) return null;
    sonder = S.d.sonderPacks.splice(sonderIndex, 1)[0];
  }
  const G = CONFIG.gluecksPack, E = CONFIG.elementPack, EP = CONFIG.erfolgsPack;
  const optionen = !sonder ? {} : sonder.typ === 'gluecks' ? { mult: G.faktor, groesse: G.karten } : sonder.typ === 'erfolg' ? { mult: EP.faktor, groesse: EP.karten } : { mult: E.faktor, groesse: E.karten, element: sonder.el };
  const pack = oeffnePack(S.rng, S.d.pity, optionen);
  pack.sonder = sonder;
  pack.gluecks = sonder?.typ === 'gluecks';
  pack.besteVorher = S.d.stat.besteStufe;
  pack.besteKlasseVorher = S.d.stat.klassen.reduce((m, n, i) => (n > 0 ? i : m), -1);
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
    if (c.holo !== 'keins') { S.d.stat.holo = S.d.stat.holo || {}; S.d.stat.holo[c.holo] = (S.d.stat.holo[c.holo] || 0) + 1; }
    if (c.fx.length) S.d.stat.effektKarten = (S.d.stat.effektKarten || 0) + 1;
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

// ---------- Verkaufen ----------
// Entfernt Karten aus der Sammlung (Indizes verschieben sich, Team wird umgerechnet). Teamkarten werden nie verkauft.
export function verkaufen(indizes) {
  const fav = new Set(S.d.favoriten);
  const weg = new Set(indizes.filter((i) => !S.d.team.includes(i) && !fav.has(i)));
  if (!weg.size) return { anzahl: 0, muenzen: 0 };
  let muenzen = 0;
  const neu = [], umrechnung = new Map();
  S.karten.forEach((code, i) => {
    if (weg.has(i)) { muenzen += verkaufswert(dekodiere(code)); return; }
    umrechnung.set(i, neu.length);
    neu.push(code);
  });
  S.karten = neu;
  const umrechnen = (liste) => liste.map((i) => umrechnung.get(i)).filter((i) => i != null);
  S.d.team = umrechnen(S.d.team);
  S.d.favoriten = umrechnen(S.d.favoriten);
  for (const sl of S.d.teamSlots) sl.team = umrechnen(sl.team);
  S.d.muenzen += muenzen;
  S.d.stat.verkauft = (S.d.stat.verkauft || 0) + weg.size;
  baueIndex();
  aenderung('sammlung');
  speichernBald(300);
  return { anzahl: weg.size, muenzen };
}

// Doppelte, schwache Karten finden: je Monster und Ausführung bleiben die stärksten `behalten` Karten.
export function doppelteFinden({ behalten = 1, bisKlasse = 1, nurNormal = true, ohneEffekte = true } = {}) {
  const team = new Set([...S.d.team, ...S.d.favoriten]);
  const out = [];
  for (const st of S.stapel.values()) {
    const gruppen = new Map();
    for (const i of st.idx) {
      const c = karte(i);
      const k = ausfuehrungsKey(c);
      if (!gruppen.has(k)) gruppen.set(k, []);
      gruppen.get(k).push({ i, c, w: c.kl * 1000 + staerke(c.a) + (c.fx.length ? 1e6 : 0) });
    }
    for (const liste of gruppen.values()) {
      liste.sort((a, b) => b.w - a.w);
      for (const x of liste.slice(behalten)) {
        if (team.has(x.i) || x.c.kl > bisKlasse) continue;
        if (nurNormal && kartenSeltenheit(x.c) > 1) continue;
        if (ohneEffekte && x.c.fx.length) continue;
        out.push(x.i);
      }
    }
  }
  return out;
}
export const wertVon = (indizes) => indizes.reduce((s, i) => s + verkaufswert(karte(i)), 0);

// ---------- Team ----------
export function teamPlaetze(team = S.d.team) {
  let belegt = 0, gesamt = CONFIG.kampf.teamGrundplaetze;
  for (const i of team) { const c = karte(i); belegt += plaetzeBelegt(c); gesamt += plaetzeBringt(c); }
  return { belegt, gesamt, ok: belegt <= gesamt };
}
export function teamSetzen(team) {
  S.d.team = team.slice();
  if (S.d.teamSlots) S.d.teamSlots[S.d.teamSlot].team = team.slice();
  aenderung('team');
  speichernBald();
}
// Automatisch aufstellen: zuerst einige günstige Karten für die ersten Züge (10 Beschwörungspunkte je Zug),
// dann die stärksten Karten, solange die Plätze reichen [Nutzer, 21.11.2026]
// Team bauen. Strategien:
//   kurve      Kostenkurve: günstige Karten für den Start, dann die stärksten (Balance-Simulation, Standard)
//   staerke    die stärksten Karten zuerst
//   effizienz  meiste Stärke je Beschwörungspunkt
//   guenstig   billigste zuerst: viele Karten, schnell auf dem Feld
//   reihenfolge  genau in der übergebenen Reihenfolge (z. B. Sortierung im Teambildschirm)
// kandidaten: Kartenindizes (null = ganze Sammlung), behalten: aktuelles Team bleibt und wird aufgefüllt,
// einmalig: jedes Monster höchstens einmal, maxKarten: Obergrenze.
export function teamBauen(opts = {}) {
  const team = teamWaehlen(opts);
  teamSetzen(team);
  return team.length;
}
// Wie teamBauen, gibt das Team nur zurück (auch für Daily Challenges)
export function teamWaehlen({ kandidaten = null, strategie = 'kurve', behalten = false, einmalig = false, maxKarten = 24, ohnePlaetze = false } = {}) {
  const idx = kandidaten ?? S.karten.map((_, i) => i);
  const kand = idx.map((i, pos) => { const c = karte(i); const k = kosten(c); return { i, c, pos, k, s: staerke(c.a), w: kampfWert(c) }; });
  const team = [];
  const genommen = new Set();
  const arten = new Set();
  let belegt = 0, gesamt = CONFIG.kampf.teamGrundplaetze;
  const nimm = (x) => {
    const b = plaetzeBelegt(x.c), g = plaetzeBringt(x.c);
    if (team.length >= maxKarten || genommen.has(x.i) || (einmalig && arten.has(x.c.art)) || (!ohnePlaetze && belegt + b > gesamt + g)) return false;
    team.push(x.i); genommen.add(x.i); arten.add(x.c.art); belegt += b; gesamt += g; return true;
  };
  if (behalten) for (const i of S.d.team) { const c = karte(i); team.push(i); genommen.add(i); arten.add(c.art); belegt += plaetzeBelegt(c); gesamt += plaetzeBringt(c); }
  const ordnung = {
    kurve: (a, b) => b.w - a.w,
    staerke: (a, b) => b.s - a.s || b.c.kl - a.c.kl,
    effizienz: (a, b) => b.s / Math.max(1, b.k) - a.s / Math.max(1, a.k),
    guenstig: (a, b) => a.k - b.k || b.s - a.s,
    reihenfolge: (a, b) => a.pos - b.pos,
  }[strategie] || ((a, b) => b.w - a.w);
  kand.sort(ordnung);
  if (strategie === 'kurve') for (const stufe of CONFIG.kampf.teamKurve) {
    let n = 0;
    for (const x of kand) { if (n >= stufe.anzahl) break; if (x.k <= stufe.bis && nimm(x)) n++; }
  }
  for (const x of kand) nimm(x);
  return team;
}
export const teamAutomatisch = () => teamBauen();

// ---------- Teamslots und Favoriten [Spielerfeedback 24.11.2026] ----------
export function teamSlotWaehlen(n) {
  if (!S.d.teamSlots[n]) return;
  S.d.teamSlot = n;
  S.d.team = S.d.teamSlots[n].team.filter((i) => i < S.karten.length);
  aenderung('team');
  speichernBald();
}
export function teamSlotUmbenennen(n, name) {
  const sl = S.d.teamSlots[n];
  if (!sl) return;
  sl.name = String(name).trim().slice(0, 24) || `Team ${n + 1}`;
  aenderung('team');
  speichernBald();
}
export const istFavorit = (i) => S.d.favoriten.includes(i);
export function favoritUmschalten(i) {
  S.d.favoriten = istFavorit(i) ? S.d.favoriten.filter((x) => x !== i) : [...S.d.favoriten, i];
  aenderung('sammlung');
  speichernBald();
  return istFavorit(i);
}

export const artName = (id) => ARTEN[id].name;

// Sonderpacks gutschreiben: { gluecks: n, element: n } mit Element el
export function sonderPacksGeben({ gluecks = 0, element = 0 } = {}, el = 0) {
  for (let i = 0; i < gluecks; i++) S.d.sonderPacks.push({ typ: 'gluecks' });
  for (let i = 0; i < element; i++) S.d.sonderPacks.push({ typ: 'element', el });
  aenderung('packs');
}
