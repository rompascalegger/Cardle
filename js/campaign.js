// Kampagne v4 [Nutzer, 21.11.2026]: Für jedes Element eine Dimension, je Dimension 8 Welten, je Welt 12 Stufen (seit 24.11.2026).
// 34. Bereich: Tiefer Kern (16 Welten), offen nach dem Kern; Gegnereffekte mit Seltenheit 2–5.
// Dazu die 33. Dimension (Kern des Rads) mit 16 Welten, offen ab 2 fertigen Welten in jeder Dimension.
// Welten haben eigene Namen und Landschafts-Themen. Gegner bauen ihr Team nach denselben Teamregeln wie der Spieler.
import { CONFIG } from './config.js';
import { ELEMENTE, N, mod, gegenpol } from './elements.js';
import { EFFEKTE } from './effects.js';
import { ARTEN } from './species.js';
import { Rng } from './rng.js';
import { gegnerKarte } from './generator.js';
import { staerke, plaetzeBelegt, plaetzeBringt } from './rules.js';
import { palette } from './monsterart.js';

const K = CONFIG.kampagne;
const KERN = CONFIG.kern;
const TIEF = CONFIG.tiefKern;
export const KERN_DIM = N; // Index 32
export const TIEF_DIM = N + 1; // Index 33: Tiefer Kern [Nutzer, 24.11.2026]
export const istKern = (d) => d === KERN_DIM || d === TIEF_DIM;
const kernCfg = (d) => (d === TIEF_DIM ? TIEF : KERN);

// ---------- Weltnamen und Themen ----------
// Acht Landschaften und ein Eigenschaftswort je Element ergeben 256 eindeutige Namen, dazu 16 für den Kern.
export const ORTE = [
  { key: 'ebene', name: 'Ebene', g: 'f' }, { key: 'wald', name: 'Wald', g: 'm' }, { key: 'kueste', name: 'Küste', g: 'f' }, { key: 'hoehlen', name: 'Höhlen', g: 'p' },
  { key: 'gipfel', name: 'Gipfel', g: 'p' }, { key: 'ruinen', name: 'Ruinen', g: 'p' }, { key: 'zitadelle', name: 'Zitadelle', g: 'f' }, { key: 'herz', name: 'Herz', g: 'n' },
];
const ADJ = ['Glühend', 'Geschmolzen', 'Rußig', 'Steinern', 'Kristallen', 'Salzig', 'Flutend', 'Wuchernd', 'Wild', 'Belebt', 'Bunt', 'Grübelnd', 'Geordnet', 'Schwer', 'Knisternd', 'Strahlend',
  'Gefroren', 'Versunken', 'Digital', 'Leer', 'Neblig', 'Verstrahlt', 'Eisern', 'Tickend', 'Künstlich', 'Sagenhaft', 'Ätzend', 'Atomar', 'Ungewiss', 'Verschlungen', 'Zeitlos', 'Finster'];
const KERN_ADJ = ['Ewig', 'Jenseitig'];
const TIEF_ADJ = ['Abgründig', 'Urzeitlich'];
const ENDUNG = { f: 'e', m: 'er', n: 'es', p: 'e' };
const ortVon = (w) => ORTE[(w - 1) % ORTE.length];
export function weltName(d, w) {
  const o = ortVon(w);
  const adj = d === KERN_DIM ? KERN_ADJ[Math.floor((w - 1) / ORTE.length)] : d === TIEF_DIM ? TIEF_ADJ[Math.floor((w - 1) / ORTE.length)] : ADJ[d];
  return `${adj}${ENDUNG[o.g]} ${o.name}`;
}
export const dimensionName = (d) => (d === KERN_DIM ? 'Kern-Dimension' : d === TIEF_DIM ? 'Tiefer Kern' : `${ELEMENTE[d].name}-Dimension`);

// Gegnerelemente: Element der Dimension plus Abstände je Welt. Im Kern kämpfen Gegenpol-Paare.
function weltElemente(d, w) {
  if (d === KERN_DIM) { const a = mod(w * 2), b = mod(w * 2 + 1); return [a, gegenpol(a), b, gegenpol(b)]; }
  if (d === TIEF_DIM) { const a = mod(w * 5 + 1), b = mod(w * 7 + 3); return [a, gegenpol(a), b, gegenpol(b)]; }
  return [d, d, mod(d + w), mod(d - w)];
}
// Farbe/Element für Themen und Siegel
export const themaElement = (d, w) => (d === KERN_DIM ? mod(w * 2) : d === TIEF_DIM ? mod(w * 5 + 1) : d);

// ---------- Aufbau ----------
function aufbauen() {
  const dims = [];
  const alle = [];
  for (let d = 0; d <= TIEF_DIM; d++) {
    const kern = istKern(d), KC = kernCfg(d), tief = d === TIEF_DIM;
    const anzahlWelten = kern ? KC.welten : K.weltenProDimension;
    const welten = [];
    for (let w = 1; w <= anzahlWelten; w++) {
      const stufen = [];
      for (let l = 1; l <= K.stufenProWelt; l++) {
        const weltBoss = l === K.stufenProWelt, zwischenboss = l === K.zwischenbossStufe;
        const index = (w - 1) * K.stufenProWelt + (l - 1);
        const bossMal = weltBoss ? K.bossFaktor : zwischenboss ? K.zwischenbossFaktor : 1;
        const basis = kern ? Math.min(KC.staerkeMax, KC.staerkeStart * KC.wachstumProStufe ** index * bossMal) : K.staerkeBasis * K.wachstumProStufe ** index * bossMal;
        const k = {
          id: `d${d}w${w}l${l}`, dim: d, kern, tief, welt: w, stufe: l, weltBoss, zwischenboss, boss: weltBoss || zwischenboss,
          name: weltBoss ? 'Weltenboss' : zwischenboss ? 'Zwischenboss' : `Stufe ${l}`, basis,
          leben: weltBoss ? K.lebenWeltBoss(w) + (tief ? 6 : kern ? 4 : 0) : zwischenboss ? K.lebenZwischenboss(w) + (tief ? 3 : kern ? 2 : 0) : K.lebenNormal,
          els: weltElemente(d, w),
          startBank: (kern ? KC.gegnerStartBank(w, l) : K.gegnerStartBank(w, l)) + (weltBoss ? 5 : 0),
        };
        stufen.push(k);
        alle.push(k);
      }
      welten.push({ dim: d, nr: w, name: weltName(d, w), ort: ortVon(w), stufen });
    }
    dims.push({ el: kern ? null : d, kern, name: dimensionName(d), welten });
  }
  return { dims, alle };
}
const AUFBAU = aufbauen();
export const DIMENSIONEN = AUFBAU.dims;
export const ALLE_KAEMPFE = AUFBAU.alle;
const NACH_ID = new Map(ALLE_KAEMPFE.map((k) => [k.id, k]));
export const kampfNachId = (id) => NACH_ID.get(id) || null;
export const weltVon = (k) => DIMENSIONEN[k.dim].welten[k.welt - 1];

// ---------- Fortschritt ----------
export const weltFertig = (fort, d, w) => !!fort[`d${d}w${w}l${K.stufenProWelt}`];
export const weltenFertigIn = (fort, d) => DIMENSIONEN[d].welten.filter((w) => weltFertig(fort, d, w.nr)).length;
export const dimensionFertig = (fort, d) => weltenFertigIn(fort, d) === DIMENSIONEN[d].welten.length;
// Kern: offen, wenn in jeder der 32 Dimensionen mindestens 2 Welten fertig sind
export const kernOffen = (fort) => DIMENSIONEN.slice(0, KERN_DIM).every((_, d) => weltenFertigIn(fort, d) >= KERN.freiAbWeltenJeDimension);
// Tiefer Kern: offen, wenn alle Welten der Kern-Dimension fertig sind
export const tiefOffen = (fort) => dimensionFertig(fort, KERN_DIM);
export const dimensionOffen = (fort, d) => (d === KERN_DIM ? kernOffen(fort) : d === TIEF_DIM ? tiefOffen(fort) : true);
export const weltOffen = (fort, d, w) => dimensionOffen(fort, d) && (w === 1 || weltFertig(fort, d, w - 1));
export function freigeschaltet(fort, k) {
  if (!weltOffen(fort, k.dim, k.welt)) return false;
  return k.stufe === 1 || !!fort[`d${k.dim}w${k.welt}l${k.stufe - 1}`];
}
export function weltenFertig(fort) {
  let n = 0;
  for (const id in fort) if (fort[id] && id.endsWith('l' + K.stufenProWelt)) n++;
  return n;
}
export const stufenFertigIn = (fort, d, w) => DIMENSIONEN[d].welten[w - 1].stufen.filter((k) => fort[k.id]).length;
export const naechsterKampf = (fort, d) => (dimensionOffen(fort, d) ? DIMENSIONEN[d].welten.flatMap((w) => w.stufen).find((k) => !fort[k.id] && freigeschaltet(fort, k)) || null : null);
export const aktuelleWelt = (fort, d) => { const k = naechsterKampf(fort, d); return k ? k.welt : DIMENSIONEN[d].welten.length; };
export const weltenGesamt = () => DIMENSIONEN.reduce((s, d) => s + d.welten.length, 0);

// Stärke und Beschwörung hängen vom Gesamtfortschritt ab: je mehr Welten fertig, desto härter
export function kampfWerte(k, fort) {
  const fertig = weltenFertig(fort);
  if (k.kern) return { staerke: Math.round(k.basis), einkommen: kernCfg(k.dim).gegnerEinkommen(k.welt, k.stufe) + (k.weltBoss ? 3 : 0), startBank: k.startBank, faktor: 1 };
  return {
    staerke: Math.round(k.basis * K.fortschrittFaktor(fertig)),
    einkommen: K.gegnerEinkommen(k.welt, k.stufe, fertig) + (k.weltBoss ? 2 : 0),
    startBank: k.startBank,
    faktor: K.fortschrittFaktor(fertig),
  };
}

// ---------- Gegner ----------
const GEGNER_EFFEKTE = EFFEKTE.filter((e) => !['platzspender', 'platzfresser', 'rudelruf', 'sammelrabatt', 'schwergewicht', 'blitzruf', 'erinnerung', 'beutezug', 'opferaltar', 'zweitesich'].includes(e.key)).map((e) => e.id);
const GEGNER_ARTEN = ARTEN.filter((a) => !a.silber);
// Besonders starke Effekte für Bosse [Nutzer, 21.11.2026]
const BOSS_STARK = ['zauberbann', 'gegenpolbann', 'erzfeindjaeger', 'spiegel', 'regeneration', 'schnellschlag', 'flaechenwirbel', 'ruestung', 'durchdringen', 'rettungsanker', 'verstaerker', 'wildesherz', 'zielsuche', 'zweiteratem']
  .map((key) => EFFEKTE.find((e) => e.key === key).id);
const AUFERSTEHUNG = EFFEKTE.find((e) => e.key === 'auferstehung').id;
const SKALIERT = EFFEKTE.filter((e) => e.skaliert).map((e) => e.id);

// Gegnerteam mit Zielstärke, nach denselben Teamregeln wie beim Spieler (Grundplätze + Teamkapazität)
// Stärkekurve als Funktion (für die Balance-Simulation mit anderen Parametern)
export function basisStaerke(k, P = K) {
  const index = (k.welt - 1) * K.stufenProWelt + (k.stufe - 1);
  const bossMal = k.weltBoss ? P.bossFaktor : k.zwischenboss ? P.zwischenbossFaktor : 1;
  const einstieg = k.welt === 1 ? ((P.einstieg ?? K.einstieg)?.[k.stufe - 1] ?? 1) : 1;
  return P.staerkeBasis * P.wachstumProStufe ** index * bossMal * einstieg;
}

export function gegnerTeam(k, fort = {}, zielVorgabe = null) {
  const ziel = zielVorgabe ?? kampfWerte(k, fort).staerke;
  const rng = new Rng(`gegner-v4-${k.id}-${ziel}`);
  const karten = [];
  let rest = ziel;
  let frei = CONFIG.kampf.teamGrundplaetze;
  const gewuenscht = Math.max(3, Math.min(24, Math.round(ziel / 45)));
  const fxChance = k.kern ? kernCfg(k.dim).effektChance(k.welt) : K.effektChance(k.welt, k.stufe);
  // Tiefer Kern: Effekte mit Seltenheit 2–5, vor allem die neuen, skalierenden Effekte
  const fxStufe = k.tief ? TIEF.effektStufe(k.welt) : 1;
  const kommandanten = GEGNER_ARTEN.filter((a) => a.rolle === 'kommandant' && k.els.includes(a.el));
  for (let n = 0; n < 40 && rest > 0; n++) {
    const verbleibend = Math.max(1, gewuenscht - karten.length);
    let z = Math.max(1, Math.min(88, Math.round((rest / verbleibend) * (0.8 + rng.next() * 0.4))));
    let art;
    if (frei <= 2 && rest > z && kommandanten.length) art = kommandanten[Math.floor(rng.next() * kommandanten.length)];
    else { const el = k.els[Math.floor(rng.next() * k.els.length)]; const pool = GEGNER_ARTEN.filter((a) => a.el === el); art = pool[Math.floor(rng.next() * pool.length)]; }
    const fx = [];
    // Weltenboss: Karte 1 mit Auferstehung und zwei starken Effekten, Karte 2 (und im Kern Karte 3) mit zwei starken Effekten
    const bossKarte = k.boss && (karten.length === 0 || (k.weltBoss && karten.length === 1) || (k.kern && k.weltBoss && karten.length === 2));
    if (bossKarte) {
      const stark = BOSS_STARK.slice();
      if (k.weltBoss && karten.length === 0) fx.push(AUFERSTEHUNG);
      while (fx.length < (k.weltBoss && karten.length === 0 ? 3 : 2)) fx.push(stark.splice(Math.floor(rng.next() * stark.length), 1)[0]);
      z = Math.min(88, Math.round(z * (karten.length === 0 ? 1.5 : 1.25)));
      if (k.tief) fx.push(SKALIERT[Math.floor(rng.next() * SKALIERT.length)]);
    } else if (rng.next() < fxChance) {
      const pool = k.tief && rng.next() < 0.8 ? SKALIERT : GEGNER_EFFEKTE;
      fx.push(pool[Math.floor(rng.next() * pool.length)]);
    }
    const c = gegnerKarte(rng, art.id, z, [...new Set(fx)], null, fxStufe);
    while (plaetzeBelegt(c) > frei + plaetzeBringt(c) && c.a.teamplatz > 0) c.a.teamplatz--;
    if (plaetzeBelegt(c) > frei + plaetzeBringt(c)) break;
    frei += plaetzeBringt(c) - plaetzeBelegt(c);
    karten.push(c);
    rest -= staerke(c.a);
  }
  return karten;
}

export function teamInfo(karten) {
  let belegt = 0, gesamt = CONFIG.kampf.teamGrundplaetze;
  for (const c of karten) { belegt += plaetzeBelegt(c); gesamt += plaetzeBringt(c); }
  return { belegt, gesamt, staerke: karten.reduce((s, c) => s + staerke(c.a), 0) };
}

// ---------- Belohnungen ----------
export function belohnung(k, ersterSieg = true) {
  const B = K.belohnung, w = k.tief ? k.welt + 24 : k.kern ? k.welt + 8 : k.welt, l = k.stufe;
  let packs, muenzen;
  if (k.weltBoss) { packs = B.weltBossPacks(w); muenzen = B.weltBossMuenzen(w); }
  else if (k.zwischenboss) { packs = B.zwischenbossPacks(w); muenzen = B.zwischenbossMuenzen(w); }
  else { packs = B.stufePacks(w, l); muenzen = B.stufeMuenzen(w, l); }
  if (!ersterSieg) { packs = Math.max(1, Math.round(packs * K.wiederholungsAnteil)); muenzen = Math.round(muenzen * K.wiederholungsAnteil); }
  const welt = k.weltBoss && ersterSieg ? (k.kern ? kernCfg(k.dim).weltBelohnung(k.welt) : K.weltBelohnung(k.welt)) : null;
  return { packs, muenzen, welt };
}

// Einschätzung im Vergleich zur eigenen Teamstärke
export function schwierigkeit(gegnerStaerke, eigeneStaerke) {
  const r = gegnerStaerke / Math.max(1, eigeneStaerke);
  if (r < 0.6) return { stufe: 0, name: 'leicht', farbe: '#6fe39a' };
  if (r < 1) return { stufe: 1, name: 'machbar', farbe: '#c8f06a' };
  if (r < 1.4) return { stufe: 2, name: 'schwer', farbe: '#ffb347' };
  return { stufe: 3, name: 'sehr schwer', farbe: '#ff6f8c' };
}
export const elementNamen = (els) => [...new Set(els)].map((e) => ELEMENTE[e].name).join(' · ');

// ---------- Landschafts-Themen (SVG) ----------
const THEMA_CACHE = new Map();
export function weltThema(d, w) {
  const key = d + ':' + w;
  if (THEMA_CACHE.has(key)) return THEMA_CACHE.get(key);
  const P = palette(themaElement(d, w));
  const r = new Rng('thema-' + key);
  const W = 320, H = 120, ort = ortVon(w).key;
  const rand = (a, b) => a + r.next() * (b - a);
  const dunkel = P.bg1, mitte = P.bg2, akz = P.acc, koerper = P.body;
  let s = '';
  const sil = (d2, fill, op = 1) => `<path d="${d2}" fill="${fill}" opacity="${op}"/>`;
  switch (ort) {
    case 'ebene':
      s += `<circle cx="${rand(60, 260).toFixed(0)}" cy="44" r="18" fill="${akz}" opacity=".85"/>`;
      s += sil('M0,86 Q80,70 160,84 T320,80 V120 H0Z', mitte, 0.9) + sil('M0,98 Q90,86 180,98 T320,94 V120 H0Z', dunkel);
      for (let i = 0; i < 12; i++) s += `<path d="M${rand(0, W).toFixed(0)},${rand(100, 118).toFixed(0)} l2,-6 2,6" stroke="${koerper}" stroke-width="1.4" fill="none" opacity=".7"/>`;
      break;
    case 'wald':
      for (let row = 0; row < 2; row++) for (let i = 0; i < 14; i++) { const x = i * 24 + rand(-6, 6), hh = rand(30, 55) + row * 10, y = 120 - row * 6; s += sil(`M${x.toFixed(0)},${y} L${(x + 11).toFixed(0)},${(y - hh).toFixed(0)} L${(x + 22).toFixed(0)},${y}Z`, row ? dunkel : mitte, row ? 1 : 0.8); }
      break;
    case 'kueste':
      s += sil('M200,120 L220,50 L260,40 L300,60 L320,50 V120Z', dunkel);
      for (let i = 0; i < 3; i++) s += `<path d="M0,${86 + i * 12} Q40,${78 + i * 12} 80,${86 + i * 12} T160,${86 + i * 12} T240,${86 + i * 12}" stroke="${akz}" stroke-width="3" fill="none" opacity="${(0.7 - i * 0.18).toFixed(2)}"/>`;
      s += `<circle cx="70" cy="36" r="14" fill="${akz}" opacity=".6"/>`;
      break;
    case 'hoehlen':
      s += sil('M0,0 H320 V120 H0Z', dunkel, 0.6);
      for (let i = 0; i < 4; i++) { const x = i * 85 + rand(0, 20); s += `<path d="M${x.toFixed(0)},120 Q${(x + 38).toFixed(0)},${rand(30, 50).toFixed(0)} ${(x + 76).toFixed(0)},120" fill="${mitte}" opacity=".55"/>`; }
      for (let i = 0; i < 12; i++) { const x = rand(0, W); s += sil(`M${(x - 5).toFixed(0)},0 L${x.toFixed(0)},${rand(14, 34).toFixed(0)} L${(x + 5).toFixed(0)},0Z`, mitte, 0.9); }
      for (let i = 0; i < 8; i++) s += `<circle cx="${rand(0, W).toFixed(0)}" cy="${rand(40, 110).toFixed(0)}" r="${rand(1, 2.4).toFixed(1)}" fill="${akz}" opacity=".9"/>`;
      break;
    case 'gipfel':
      s += sil('M0,120 L50,50 L90,80 L150,20 L210,76 L260,36 L320,70 V120Z', mitte);
      s += sil('M150,20 L138,38 L150,34 L162,40Z M260,36 L250,50 L262,46 L270,52Z', '#ffffff', 0.85);
      s += sil('M0,120 L70,84 L130,108 L200,76 L270,104 L320,90 V120Z', dunkel);
      break;
    case 'ruinen':
      s += sil('M0,104 H320 V120 H0Z', dunkel);
      for (let i = 0; i < 6; i++) { const x = (20 + i * 52 + rand(-8, 8)).toFixed(0), hh = rand(30, 70).toFixed(0); s += `<rect x="${x}" y="${104 - hh}" width="12" height="${hh}" fill="${mitte}"/><rect x="${x - 3}" y="${104 - hh}" width="18" height="5" fill="${mitte}"/>`; }
      s += `<path d="M0,30 Q160,10 320,34" stroke="${akz}" stroke-width="2" fill="none" opacity=".5"/>`;
      break;
    case 'zitadelle':
      s += sil('M0,112 H320 V120 H0Z', dunkel);
      s += sil('M110,112 V60 h10 v-8 h8 v8 h12 v-8 h8 v8 h12 V40 l14,-18 14,18 V60 h12 v-8 h8 v8 h12 v-8 h8 v8 h10 V112Z', mitte);
      for (let i = 0; i < 5; i++) s += `<rect x="${150 + i * 8}" y="${74 + (i % 2) * 10}" width="4" height="6" fill="${akz}" opacity=".9"/>`;
      break;
    default: // herz
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; s += `<path d="M160,62 L${(160 + Math.cos(a) * 200).toFixed(0)},${(62 + Math.sin(a) * 200).toFixed(0)} L${(160 + Math.cos(a + 0.12) * 200).toFixed(0)},${(62 + Math.sin(a + 0.12) * 200).toFixed(0)}Z" fill="${akz}" opacity=".12"/>`; }
      s += `<circle cx="160" cy="62" r="30" fill="${akz}" opacity=".35"/><circle cx="160" cy="62" r="18" fill="${akz}" opacity=".8"/><circle cx="160" cy="62" r="8" fill="#fff" opacity=".9"/>`;
  }
  // Kern-Welten: zusätzlich ein Ring aus allen Elementfarben
  if (d === KERN_DIM) s += `<circle cx="160" cy="60" r="${44 + (w % 8) * 3}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 5" opacity=".6"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dunkel}"/><stop offset="1" stop-color="${mitte}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#t)"/>${s}</svg>`;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  THEMA_CACHE.set(key, url);
  return url;
}
