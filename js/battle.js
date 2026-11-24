// Kampf-Engine (reine Logik, ohne DOM). [FEST 12] mit Zugablauf [VORSCHLAG 12.3]:
// 1. Beschwörungspunkte gutschreiben  2. Beschwören/Umstellen  3. Seltsamkeit  4. Automatischer Kampf (gleichzeitig)  5. Aufräumen
import { CONFIG } from './config.js';
import { faktorInfo, mod, N } from './elements.js';
import { EFFEKT } from './effects.js';
import { ARTEN } from './species.js';
import { staerke, kosten, teamplatzMult, preisFaktor } from './rules.js';

let uidZaehler = 0;
const ATTR_WACHSTUM = ['kraft', 'schutz', 'groesse', 'wildheit', 'seltsamkeit', 'schlagzahl'];

export function neueEinheit(c, seite, rng) {
  const art = ARTEN[c.art];
  const u = {
    uid: ++uidZaehler, seite, c, art: c.art, name: art.name,
    el: art.el, elZug: art.el,
    a: { ...c.a }, basis: staerke(c.a), schaden: 0,
    fx: c.fx.map((id) => EFFEKT[id].key), kopie: null,
    fxStufe: Object.fromEntries(c.fx.map((id, i) => [EFFEKT[id].key, c.fxs?.[i] || 1])), gift: [], bannBis: -1, spiegelTreffer: 0, ersterAngriff: true,
    kost: kosten(c), preis: preisFaktor(c),
    beschworen: -1, aktivAb: Infinity, gebanntZug: -1,
    atemGenutzt: false, enthuellt: false, spiegelZug: -1, ankerZaehler: 0,
    tot: false, todZug: -1, aufruesterZiel: null, buff: [],
    falschEl: null, aktiviert: false, herzAktiv: false,
  };
  if (u.fx.includes('rueckseite')) u.falschEl = mod(u.el + 1 + Math.floor(rng.next() * (N - 1)));
  return u;
}

function neueSeite(id, name, karten, leben, rng, einkommen = CONFIG.kampf.beschwoerungProZug, startBank = 0) {
  return { id, name, leben, maxLeben: leben, bank: startBank, basisEinkommen: einkommen, hand: karten.map((c) => neueEinheit(c, id, rng)), feld: [], friedhof: [], lebenZug: -1, ankerGenutzt: false, angriffe: 0 };
}

export function neuerKampf({ spielerKarten, gegnerKarten, spielerLeben = CONFIG.kampf.spielerLeben, gegnerLeben = CONFIG.kampf.spielerLeben, rng, spielerName = 'Du', gegnerName = 'Gegner', autoSpieler = false, gegnerEinkommen, gegnerStartBank = 0 }) {
  return {
    zug: 0, rng, autoSpieler,
    seiten: [neueSeite(0, spielerName, spielerKarten, spielerLeben, rng), neueSeite(1, gegnerName, gegnerKarten, gegnerLeben, rng, gegnerEinkommen, gegnerStartBank)],
    ende: null, ev: [], log: [],
  };
}

// ---------- Hilfen ----------
const lebend = (s) => s.feld.filter((u) => u && !u.tot);
const gegner = (b, s) => b.seiten[1 - s];
function emit(b, e) { b.ev.push(e); }
function log(b, text) { b.log.push({ zug: b.zug, text }); }

// Effekt wirkt? [FEST 9.1] nur solange die Karte lebt, ab dem nächsten Zug (außer Blitz). Nachbrenner verlängert um einen Zug.
export function aktiv(b, u, key) {
  if (!(u.fx.includes(key) || u.kopie === key)) return false;
  if (b.zug < u.aktivAb) return false;
  if (u.gebanntZug === b.zug) return false;
  if (u.tot) return u.fx.includes('nachbrenner') && b.zug <= u.todZug + 2;
  return true;
}
function quellen(b, s) {
  const seite = b.seiten[s];
  return lebend(seite).concat(seite.friedhof.filter((u) => u.fx.includes('nachbrenner') && b.zug <= u.todZug + 2));
}
export const seiteAktiv = (b, s, key) => quellen(b, s).some((u) => aktiv(b, u, key));
const zaehle = (b, s, key, f = () => true) => quellen(b, s).filter((u) => aktiv(b, u, key) && f(u)).length;
// Stufe (Seltenheit 1–5) eines Effekts auf dieser Einheit
export const stufe = (u, key) => u.fxStufe?.[key] || 1;
const klein = (u) => (u.a.groesse || 0) <= 1;

export function maxLeben(b, u) { return staerke(u.a) + (aktiv(b, u, 'gigant') ? 2 * u.a.groesse : 0); }
export const restLeben = (b, u) => maxLeben(b, u) - u.schaden;

// Wirksame Werte eines Monsters in diesem Zug
export function werte(b, u) {
  const s = u.seite;
  const eigene = lebend(b.seiten[s]);
  let kraft = u.a.kraft;
  kraft += 2 * zaehle(b, s, 'elementverstaerker', (q) => q.el === u.el);
  kraft += 2 * zaehle(b, s, 'nachbarschaft', (q) => q.uid !== u.uid && (mod(q.el - u.el) === 1 || mod(u.el - q.el) === 1));
  kraft += 3 * quellen(b, s).filter((q) => aktiv(b, q, 'aufruester') && q.aufruesterZiel === u.uid).length;
  let schutzBuff = 0;
  for (const bf of u.buff) if (b.zug <= bf.bis) { kraft += bf.kraft || 0; schutzBuff += bf.schutz || 0; }
  if (aktiv(b, u, 'schwarmgeist')) kraft += Math.min(6, 2 * eigene.filter((q) => q.uid !== u.uid && q.el === u.el).length);
  if (aktiv(b, u, 'zielsuche')) kraft += 1;
  if (aktiv(b, u, 'elementwandel')) kraft += 2;
  if (aktiv(b, u, 'fruehstart')) kraft += 1;
  if (aktiv(b, u, 'zeitsprung') && u.beschworen === b.zug) kraft += 2;
  if (aktiv(b, u, 'winzlingswut') && klein(u)) kraft += 2 * stufe(u, 'winzlingswut');
  if (aktiv(b, u, 'rudelbiss')) { const n = stufe(u, 'rudelbiss'); kraft += Math.min(3 * n, n * eigene.filter((q) => q.uid !== u.uid && klein(q)).length); }
  const allein = eigene.length === 1 && eigene[0].uid === u.uid;
  if (allein && aktiv(b, u, 'einzelgaenger')) kraft += 6;
  const gleich = zaehle(b, 1 - s, 'gleichgewicht'); // wirkt nur auf Gegnerkarten
  if (gleich && staerke(u.a) > 20) kraft -= 3 * gleich;
  if (allein && aktiv(b, u, 'schlussakt')) kraft *= 3;
  let schutz = u.a.schutz + 2 * zaehle(b, s, 'elementschild', (q) => q.el === u.el) + (aktiv(b, u, 'ruestung') ? 4 : 0)
    + (aktiv(b, u, 'koeder') ? 2 : 0) + (aktiv(b, u, 'tarnung') ? 1 : 0) + schutzBuff;
  return {
    kraft: Math.max(0, kraft),
    schutz: Math.max(0, schutz),
    wild: u.a.wildheit * (aktiv(b, u, 'wildesherz') ? 3 : 1),
    groesse: u.a.groesse,
    selt: u.a.seltsamkeit * (aktiv(b, u, 'seltsamewelt') ? 3 : 1),
    schlag: u.a.schlagzahl + (aktiv(b, u, 'schnellschlag') ? 2 : 0),
    mult: teamplatzMult(u.a.teamplatz),
  };
}

// Element, das die andere Seite sieht (Rückseite)
const sichtbaresEl = (u) => (u.falschEl != null && !u.enthuellt ? u.falschEl : u.el);
export const angezeigtesEl = (u, betrachter) => (betrachter === u.seite ? u.elZug : (u.falschEl != null && !u.enthuellt ? u.falschEl : u.elZug));
export const lebenVerborgen = (b, u, betrachter) => betrachter !== u.seite && !u.enthuellt && seiteAktiv(b, u.seite, 'nebel');

// Faktor mit Effekten
export function faktorKampf(b, att, ziel, elA = att.elZug, elZ = ziel.elZug) {
  const fi = faktorInfo(elA, elZ);
  let f = fi.f;
  if (fi.art === 'gegenpol') {
    if (seiteAktiv(b, att.seite, 'erzfeindjaeger')) f = 3.5;
    if (seiteAktiv(b, ziel.seite, 'gegenpolbann')) f = 1.0;
  }
  if (aktiv(b, ziel, 'schwarzerwirbel')) f = Math.max(0.1, f - 0.4);
  return { f, art: fi.art };
}
// [FEST 5.4] Schaden = Kraft × Faktor / (Schutz + 1), dazu [OFFEN, Platzhalter] Teamplatz-Multiplikator
export function schadenFuer(b, att, ziel, punkte, wahllos = false, wa = werte(b, att), elA, elZ) {
  const { f, art } = faktorKampf(b, att, ziel, elA, elZ);
  const ff = f * (wahllos ? 2 : 1) * (att.ersterAngriff && aktiv(b, att, 'rueckseite') ? 1.5 : 1);
  const wz = werte(b, ziel);
  const P = Math.max(0, wz.schutz - (aktiv(b, att, 'durchdringen') ? 4 : 0));
  return { schaden: (punkte * ff * wa.mult) / (P + 1), f: ff, art };
}

// ---------- Kosten ----------
export function effektiveKosten(b, s, u) {
  let k = u.kost;
  k -= 3 * zaehle(b, s, 'rudelruf', (q) => q.el === u.el);
  if (staerke(u.a) < 10) k -= 2 * zaehle(b, s, 'sammelrabatt');
  if (staerke(u.a) >= 20) k -= 10 * zaehle(b, s, 'schwergewicht');
  return Math.max(0, k);
}
export function einkommen(b, s) {
  let f = 1, plus = 0;
  for (const q of quellen(b, s)) { if (aktiv(b, q, 'verstaerker')) f *= 3; if (aktiv(b, q, 'doppelrufer')) { f *= 2; plus += 3; } }
  return (b.seiten[s].basisEinkommen ?? CONFIG.kampf.beschwoerungProZug) * f + plus;
}

// ---------- Leben ----------
function verliereLeben(b, s, grund) {
  const seite = b.seiten[s];
  if (seite.lebenZug === b.zug) return; // [ANNAHME 12.5] höchstens 1 pro Runde
  seite.lebenZug = b.zug;
  if ((seite.ankerZaehler || 0) < 2 && seiteAktiv(b, s, 'rettungsanker')) {
    seite.ankerZaehler = (seite.ankerZaehler || 0) + 1;
    emit(b, { t: 'anker', seite: s });
    log(b, `${seite.name}: Rettungsanker fängt den Lebensverlust ab.`);
    return;
  }
  seite.leben--;
  emit(b, { t: 'leben', seite: s, delta: -1, leben: seite.leben, grund });
  log(b, `${seite.name} verliert ein Leben (${grund}). Noch ${seite.leben}.`);
}

// ---------- Tod ----------
function stirb(b, u, killer) {
  const seite = b.seiten[u.seite];
  if (aktiv(b, u, 'zweiteratem') && !u.atemGenutzt) {
    u.atemGenutzt = true;
    u.schaden = Math.floor(maxLeben(b, u) / 2);
    emit(b, { t: 'atem', seite: u.seite, uid: u.uid });
    log(b, `${u.name} kommt mit Zweitem Atem zurück.`);
    return false;
  }
  if (aktiv(b, u, 'auferstehung') && !u.auferstanden) {
    u.auferstanden = true;
    u.schaden = 0;
    emit(b, { t: 'atem', seite: u.seite, uid: u.uid, text: 'Auferstehung!' });
    log(b, `${u.name} steht wieder auf, mit vollen Lebenspunkten!`);
    return false;
  }
  // Todeseffekte vor dem Tod prüfen: danach gilt die Karte als tot und aktiv() wäre falsch (Fehler bis 24.11.2026)
  const todFx = { letzterwille: aktiv(b, u, 'letzterwille'), lebenslicht: aktiv(b, u, 'lebenslicht'), erinnerung: aktiv(b, u, 'erinnerung') };
  u.tot = true; u.todZug = b.zug;
  const sp = seite.feld.indexOf(u);
  if (sp >= 0) seite.feld[sp] = null;
  seite.friedhof.push(u);
  emit(b, { t: 'tod', seite: u.seite, uid: u.uid, spalte: sp });
  log(b, `${u.name} wird ausgeschaltet.`);
  if (todFx.letzterwille) {
    for (const q of lebend(seite)) q.buff.push({ kraft: 4, bis: b.zug + 2 });
    log(b, `${u.name}: Letzter Wille, Verbündete +4 Elementarkraft.`);
    emit(b, { t: 'effekt', seite: u.seite, uid: u.uid, key: 'letzterwille' });
  }
  if (u.herzAktiv) { seite.maxLeben -= 2; seite.leben = Math.min(seite.leben, seite.maxLeben); u.herzAktiv = false; emit(b, { t: 'leben', seite: u.seite, delta: 0, leben: seite.leben, grund: 'Herzstück erlischt' }); }
  if (todFx.lebenslicht) { seite.leben += 2; seite.maxLeben = Math.max(seite.maxLeben, seite.leben); emit(b, { t: 'leben', seite: u.seite, delta: 2, leben: seite.leben, grund: 'Lebenslicht' }); log(b, `${seite.name}: Lebenslicht schenkt zwei Leben.`); }
  if (todFx.erinnerung) freiBeschwoeren(b, u.seite, () => true, 'Erinnerung');
  if (killer && !killer.tot && aktiv(b, killer, 'beutezug')) freiBeschwoeren(b, killer.seite, () => true, 'Beutezug');
  return true;
}

// ---------- Beschwörung ----------
function ersteFreieSpalte(seite, ab = 0) {
  for (let i = ab; i < seite.feld.length; i++) if (!seite.feld[i]) return i;
  return seite.feld.length;
}
function platziere(seite, u, spalte) {
  if (spalte == null || spalte < 0) spalte = ersteFreieSpalte(seite);
  if (seite.feld[spalte]) spalte = ersteFreieSpalte(seite, spalte);
  while (seite.feld.length < spalte) seite.feld.push(null);
  seite.feld[spalte] = u;
  return spalte;
}

export function beschwoere(b, s, handIdx, spalte = null, frei = false, grund = null) {
  const seite = b.seiten[s];
  const u = seite.hand[handIdx];
  if (!u || b.ende) return false;
  const k = frei ? 0 : effektiveKosten(b, s, u);
  if (k > seite.bank) return false;
  seite.bank -= k;
  seite.hand.splice(handIdx, 1);
  const sp = platziere(seite, u, spalte);
  u.beschworen = b.zug;
  u.aktivAb = (u.fx.includes('fruehstart') || u.fx.includes('zeitsprung')) ? b.zug : b.zug + 1;
  u.ersterAngriff = true;
  if (u.aktivAb <= b.zug) aktiviere(b, u);
  emit(b, { t: 'beschwoeren', seite: s, uid: u.uid, spalte: sp, kosten: k, frei, grund });
  log(b, `${seite.name} beschwört ${u.name}${frei ? ` kostenlos (${grund})` : ` für ${k}`}.`);
  // Blitzeffekte wirken sofort [FEST 9.1]
  if (u.fx.includes('blitzschlag')) {
    const ziele = lebend(gegner(b, s));
    if (ziele.length) {
      const z = ziele.reduce((best, t) => (restLeben(b, t) <= 3 && (!best || restLeben(b, best) > 3 || werte(b, t).kraft > werte(b, best).kraft) ? t : best), null) || ziele.reduce((x, y) => (werte(b, y).kraft > werte(b, x).kraft ? y : x));
      z.schaden += 6;
      emit(b, { t: 'blitz', seite: s, uid: u.uid, key: 'blitzschlag', ziel: z.uid, wert: 6, hpNach: restLeben(b, z) });
      log(b, `Blitzschlag trifft ${z.name} für 6.`);
      if (restLeben(b, z) <= 0) { stirb(b, z, u); pruefeAusgeloescht(b, z.seite, 'Blitzschlag'); }
    }
  }
  if (u.fx.includes('blitzheilung')) {
    const v = lebend(seite).filter((q) => q.schaden > 0).sort((x, y) => y.schaden - x.schaden)[0];
    if (v) { const h = Math.min(10, v.schaden); v.schaden -= h; emit(b, { t: 'heilung', seite: s, uid: v.uid, wert: h, quelle: u.uid }); log(b, `Blitzheilung heilt ${v.name} um ${h}.`); }
  }
  if (u.fx.includes('blitzruf')) freiBeschwoeren(b, s, (q) => staerke(q.a) <= 8, 'Blitzruf');
  eintrittsEffekte(b, s, u, sp);
  return true;
}

// Neue Eintrittseffekte (skalieren mit der Stufe) [Nutzer, 24.11.2026]
function eintrittsEffekte(b, s, u, sp) {
  const D = gegner(b, s);
  const gegenueber = () => (D.feld[sp] && !D.feld[sp].tot ? D.feld[sp] : null);
  const staerkster = () => lebend(D).sort((x, y) => werte(b, y).kraft - werte(b, x).kraft)[0] || null;
  if (u.fx.includes('bann')) {
    const z = gegenueber() || staerkster();
    if (z) { const n = stufe(u, 'bann'); z.bannBis = Math.max(z.bannBis, b.zug + n - 1); emit(b, { t: 'effekt', seite: s, uid: u.uid, key: 'bann', ziel: z.uid }); log(b, `Bann: ${z.name} kann ${n} ${n === 1 ? 'Zug' : 'Züge'} nicht angreifen.`); }
  }
  if (u.fx.includes('eintrittsstich')) {
    const z = gegenueber() || staerkster();
    if (z) {
      const n = 2 * stufe(u, 'eintrittsstich');
      z.schaden += n;
      emit(b, { t: 'blitz', seite: s, uid: u.uid, key: 'eintrittsstich', ziel: z.uid, wert: n, hpNach: restLeben(b, z) });
      log(b, `Eintrittsstich trifft ${z.name} für ${n}.`);
      if (restLeben(b, z) <= 0) { stirb(b, z, u); pruefeAusgeloescht(b, z.seite, 'Eintrittsstich'); }
    }
  }
  if (u.fx.includes('schrumpfzauber')) {
    const z = gegenueber() || staerkster();
    if (z) { const n = 2 * stufe(u, 'schrumpfzauber'); z.buff.push({ kraft: -n, bis: b.zug + 1 }); emit(b, { t: 'effekt', seite: s, uid: u.uid, key: 'schrumpfzauber', ziel: z.uid }); log(b, `Schrumpfzauber: ${z.name} −${n} Elementarkraft für zwei Züge.`); }
  }
  if (u.fx.includes('schutzgeist')) {
    const n = stufe(u, 'schutzgeist');
    for (const q of lebend(b.seiten[s])) q.buff.push({ schutz: n, bis: b.zug + 1 });
    emit(b, { t: 'effekt', seite: s, uid: u.uid, key: 'schutzgeist' });
    log(b, `Schutzgeist: eigene Karten +${n} Elementarschutz für zwei Züge.`);
  }
}

function freiBeschwoeren(b, s, filter, grund) {
  const seite = b.seiten[s];
  let best = -1, w = -1;
  seite.hand.forEach((q, i) => { if (filter(q) && staerke(q.a) > w) { w = staerke(q.a); best = i; } });
  if (best >= 0) beschwoere(b, s, best, null, true, grund);
}

export function tausche(b, s, i, j) {
  const f = b.seiten[s].feld;
  while (f.length <= Math.max(i, j)) f.push(null);
  [f[i], f[j]] = [f[j], f[i]];
  while (f.length && !f[f.length - 1]) f.pop();
}

// ---------- KI: Beschwören ----------
function spaltenWert(b, s, u, sp) {
  const opp = gegner(b, s).feld[sp];
  if (!opp || opp.tot) return 0;
  const wo = werte(b, opp);
  const aus = Math.log(faktorInfo(u.el, sichtbaresEl(opp)).f);
  const ein = Math.log(faktorInfo(sichtbaresEl(opp), u.el).f);
  return 1 + aus - ein + (wo.wild === 0 && wo.schlag > 0 ? 0.6 : 0);
}
// Höchster Schaden, den eine Karte in einer Runde abbekommen kann: jeder Angreifer trifft ein Ziel höchstens einmal je Runde
function bedrohung(feindWerte, u) {
  let summe = 0;
  for (const { f, w } of feindWerte) summe += w.kraft * w.mult * faktorInfo(sichtbaresEl(f), u.el).f;
  return summe / ((u.a.schutz || 0) + 1);
}

// KI für das Beschwören (Gegner und "Auto"). Aus der Balance-Simulation: Karten, die die nächste Runde nicht
// überleben, kosten nur Punkte (und trotzdem ein Leben). Also nur Überlebende spielen, sonst sparen.
// Hat der Gegner kein Monster, ist jeder eigene Angreifer ein Leben wert.
export function kiBeschwoeren(b, s) {
  const seite = b.seiten[s];
  for (let n = 0; n < 40 && !b.ende; n++) {
    const kandidaten = seite.hand.map((u, i) => ({ u, i, k: effektiveKosten(b, s, u) }));
    const leistbar = kandidaten.filter((x) => x.k <= seite.bank);
    if (!leistbar.length) break;
    const feinde = lebend(gegner(b, s));
    const feindWerte = feinde.map((f) => ({ f, w: werte(b, f) })).filter((x) => x.w.kraft > 0 && x.w.schlag > 0);
    const eigeneAngreifer = lebend(seite).some((u) => { const w = werte(b, u); return w.kraft > 0 && w.schlag > 0; });
    const ueberlebt = (x) => staerke(x.u.a) > bedrohung(feindWerte, x.u) * 0.95;
    const greiftAn = (x) => x.u.a.kraft > 0 && x.u.a.schlagzahl > 0;
    const wert = (x) => staerke(x.u.a) * x.u.preis + (x.u.fx.length ? 6 : 0);
    let wahl = null;
    if (!feinde.length && !eigeneAngreifer) wahl = leistbar.filter(greiftAn).sort((x, y) => x.k - y.k)[0] || null;
    if (!wahl) {
      const sicher = leistbar.filter(ueberlebt).sort((x, y) => wert(y) - wert(x));
      if (sicher.length) {
        wahl = sicher[0];
        // Sparen, wenn eine deutlich stärkere Karte nächste Runde bezahlbar ist und das Feld schon steht
        const teuerste = kandidaten.reduce((m, x) => Math.max(m, x.k), 0);
        if (n === 0 && lebend(seite).length >= 2 && teuerste > seite.bank && teuerste <= seite.bank + einkommen(b, s) && wahl.k < teuerste * 0.5) break;
      } else {
        // Nichts Bezahlbares überlebt: sparen, wenn eine teurere Karte in höchstens 2 Zügen bezahlbar ist und überlebt
        const bald = seite.bank + 2 * einkommen(b, s);
        if (kandidaten.some((x) => x.k > seite.bank && x.k <= bald && ueberlebt(x))) break;
        wahl = leistbar.sort((x, y) => wert(y) - wert(x))[0];
      }
    }
    const opfer = gegner(b, s).feld;
    let bestSp = ersteFreieSpalte(seite), bestW = -1;
    for (let sp = 0; sp <= Math.max(seite.feld.length, opfer.length); sp++) {
      if (seite.feld[sp]) continue;
      const w = spaltenWert(b, s, wahl.u, sp);
      if (w > bestW) { bestW = w; bestSp = sp; }
    }
    if (!beschwoere(b, s, wahl.i, bestSp)) break;
  }
}

// ---------- Zugbeginn ----------
export function zugBeginn(b) {
  if (b.ende) return;
  b.zug++;
  emit(b, { t: 'zug', zug: b.zug });
  for (const s of [0, 1]) {
    const seite = b.seiten[s];
    // Aktivierungen und Effekte zu Zugbeginn
    for (const u of lebend(seite)) {
      u.elZug = u.el;
      if (b.zug >= u.aktivAb && !u.aktiviert) aktiviere(b, u);
      if (aktiv(b, u, 'elementwandel')) { u.el = mod(u.el + 2); u.elZug = u.el; emit(b, { t: 'effekt', seite: s, uid: u.uid, key: 'elementwandel' }); }
      if (aktiv(b, u, 'regeneration') && u.schaden > 0) { const h = Math.min(3, u.schaden); u.schaden -= h; emit(b, { t: 'heilung', seite: s, uid: u.uid, wert: h }); }
      if (aktiv(b, u, 'wachstum')) for (let n = 0; n < 2 && staerke(u.a) < 3 * u.basis; n++) { const k = ATTR_WACHSTUM[Math.floor(b.rng.next() * ATTR_WACHSTUM.length)]; u.a[k]++; emit(b, { t: 'effekt', seite: s, uid: u.uid, key: 'wachstum', attr: k }); }
      if (aktiv(b, u, 'aufruester')) { const z = lebend(seite).find((q) => q.uid === u.aufruesterZiel); if (!z) waehleAufruestZiel(b, u); }
    }
  }
  for (const s of [0, 1]) for (const u of lebend(b.seiten[s])) {
    if (aktiv(b, u, 'zauberbann')) {
      const ziele = lebend(gegner(b, s)).filter((q) => q.fx.length && q.gebanntZug !== b.zug).sort((x, y) => y.preis - x.preis).slice(0, 2);
      for (const ziel of ziele) { ziel.gebanntZug = b.zug; emit(b, { t: 'effekt', seite: s, uid: u.uid, key: 'zauberbann', ziel: ziel.uid }); log(b, `Zauberbann hebt die Effekte von ${ziel.name} auf.`); }
    }
  }
  // Gift (Giftstachel): Schaden zu Zugbeginn
  for (const s of [0, 1]) for (const u of lebend(b.seiten[s])) {
    const g = u.gift.filter((x) => x.bis >= b.zug);
    u.gift = g;
    const n = g.reduce((x, y) => x + y.n, 0);
    if (n > 0) {
      u.schaden += n;
      emit(b, { t: 'blitz', seite: 1 - s, uid: u.uid, key: 'giftstachel', ziel: u.uid, wert: n, hpNach: restLeben(b, u) });
      log(b, `${u.name} leidet unter Gift: ${n} Schaden.`);
      if (restLeben(b, u) <= 0) { stirb(b, u, null); pruefeAusgeloescht(b, s, 'Gift'); }
    }
  }
  for (const s of [0, 1]) {
    const seite = b.seiten[s];
    const plus = einkommen(b, s);
    seite.bank += plus; // [FEST] ansparen ohne Obergrenze
    emit(b, { t: 'einkommen', seite: s, betrag: plus, bank: seite.bank });
  }
  kiBeschwoeren(b, 1);
  if (b.autoSpieler) kiBeschwoeren(b, 0);
}

function waehleAufruestZiel(b, u) {
  const z = lebend(b.seiten[u.seite]).filter((q) => q.uid !== u.uid).sort((x, y) => werte(b, y).kraft * werte(b, y).schlag - werte(b, x).kraft * werte(b, x).schlag)[0];
  u.aufruesterZiel = z ? z.uid : null;
}

function aktiviere(b, u) {
  u.aktiviert = true;
  const s = u.seite, seite = b.seiten[s];
  if (u.fx.includes('herzstueck')) { seite.maxLeben += 2; seite.leben += 2; u.herzAktiv = true; emit(b, { t: 'leben', seite: s, delta: 2, leben: seite.leben, grund: 'Herzstück' }); log(b, `${seite.name}: Herzstück, maximale Leben +2.`); }
  if (u.fx.includes('zweitesich')) {
    const pool = [];
    for (const q of lebend(seite)) if (q.uid !== u.uid) for (const k of q.fx) if (k !== 'zweitesich' && !EFFEKT_BLITZ.has(k)) pool.push(k);
    if (pool.length) { u.kopie = pool[Math.floor(b.rng.next() * pool.length)]; emit(b, { t: 'effekt', seite: s, uid: u.uid, key: 'zweitesich', kopie: u.kopie }); }
  }
  if (u.fx.includes('aufschub')) {
    const z = lebend(gegner(b, s)).filter((q) => q.fx.length).sort((x, y) => y.preis - x.preis)[0];
    if (z) { z.aktivAb = Math.max(z.aktivAb, b.zug) + 2; emit(b, { t: 'effekt', seite: s, uid: u.uid, key: 'aufschub', ziel: z.uid }); }
  }
  if (u.fx.includes('aufruester')) waehleAufruestZiel(b, u);
  if (u.fx.includes('opferaltar')) {
    const andere = lebend(seite).filter((q) => q.uid !== u.uid).sort((x, y) => restLeben(b, x) - restLeben(b, y));
    const ziel = seite.hand.some((q) => staerke(q.a) <= 10);
    if (andere.length && ziel) {
      const opfer = andere[0];
      emit(b, { t: 'effekt', seite: s, uid: u.uid, key: 'opferaltar', ziel: opfer.uid });
      opfer.atemGenutzt = true;
      stirb(b, opfer, null);
      freiBeschwoeren(b, s, (q) => staerke(q.a) <= 10, 'Opferaltar');
    }
  }
}
const EFFEKT_BLITZ = new Set(['blitzruf', 'blitzschlag', 'blitzheilung']);

// ---------- Seltsamkeit [FEST 5.3] ----------
// Schritt Richtung Schwäche kostet 2, sonst 1. [ANNAHME 5.3] Schwäche liegt in CONFIG.rad.richtung (Uhrzeigersinn).
export function erreichbareElemente(el, budget) {
  const dir = CONFIG.rad.richtung;
  const out = [{ el, kosten: 0, schritte: 0 }];
  for (let k = 1; k <= budget; k++) out.push({ el: mod(el - dir * k), kosten: k, schritte: -k });
  for (let k = 1; 2 * k <= budget; k++) out.push({ el: mod(el + dir * k), kosten: 2 * k, schritte: k });
  return out;
}
function waehleVerschiebung(b, u) {
  const w = werte(b, u);
  if (w.selt <= 0) return u.el;
  const feinde = lebend(gegner(b, u.seite));
  if (!feinde.length) return u.el;
  const sp = b.seiten[u.seite].feld.indexOf(u);
  const greift = w.kraft > 0 && w.schlag > 0 ? 1 : 0;
  let best = u.el, bestS = -Infinity;
  for (const o of erreichbareElemente(u.el, w.selt)) {
    let sc = 0;
    for (const f of feinde) {
      const g = gegner(b, u.seite).feld.indexOf(f) === sp ? 2 : 1;
      const wf = werte(b, f);
      sc += g * greift * Math.log(faktorInfo(o.el, sichtbaresEl(f)).f);
      sc -= g * (wf.kraft > 0 && wf.schlag > 0 ? 1 : 0.3) * Math.log(faktorInfo(sichtbaresEl(f), o.el).f);
    }
    sc -= o.kosten * 1e-4;
    if (sc > bestS + 1e-9) { bestS = sc; best = o.el; }
  }
  return best;
}

// ---------- Angriffsplanung ----------
function geplantesZiel(b, u, D, spalte, w, bereits, geplant) {
  const lebende = lebend(D);
  const gegenueber = D.feld[spalte] && !D.feld[spalte].tot ? D.feld[spalte] : null;
  const zielsuche = aktiv(b, u, 'zielsuche');
  let frei = [];
  if (w.wild >= 1 || zielsuche) {
    // [FEST] Größe n nur frei wählbar mit Wildheit ≥ n; [ANNAHME] freie Wahl braucht Wildheit ≥ 1
    frei = lebende.filter((t) => (zielsuche || t.a.groesse <= w.wild) && (zielsuche || !(aktiv(b, t, 'tarnung') && lebende.length > 1)));
  }
  const kand = [];
  if (gegenueber && !bereits.has(gegenueber.uid)) kand.push(gegenueber);
  for (const t of frei) if (!bereits.has(t.uid) && !kand.includes(t)) kand.push(t);
  const koeder = kand.filter((t) => t !== gegenueber && aktiv(b, t, 'koeder'));
  return { lebende, gegenueber, kand, koeder };
}

// Kurze Erklärung fürs Kampfprotokoll, warum ein Schlag kein Ziel findet [Nutzer, 24.11.2026]
function keinZielGrund(b, u, w, lebende, gegenueber, bereits) {
  const andere = lebende.filter((t) => !bereits.has(t.uid));
  const kurz = `${gegenueber.name} gegenüber wurde in diesem Zug schon getroffen`;
  if (!andere.length) return { kurz: 'alle schon getroffen', text: 'alle Gegner wurden in diesem Zug schon getroffen, jeder Schlag braucht ein neues Ziel' };
  if (w.wild < 1) return { kurz: 'braucht Wildheit', text: `${kurz}, und ohne Wildheit kann es kein anderes Ziel wählen` };
  if (andere.every((t) => aktiv(b, t, 'tarnung'))) return { kurz: 'Ziel getarnt', text: `${kurz}, die übrigen Gegner sind getarnt` };
  const kleinste = Math.min(...andere.map((t) => t.a.groesse));
  return { kurz: 'Ziele zu groß', text: `${kurz}, die übrigen Gegner sind zu groß (Größe ab ${kleinste}, Wildheit nur ${w.wild})` };
}

// Ein einzelner Angriff eines Monsters: Ziel und Aufteilung nach dem aktuellen Stand des Feldes
function planeAngriff(b, u, spalte, w, bereits) {
  const D = gegner(b, u.seite);
  const { lebende, gegenueber, kand, koeder } = geplantesZiel(b, u, D, spalte, w, bereits);
  if (!lebende.length) return { typ: 'leer' };
  if (aktiv(b, u, 'wahllos')) {
    const pool = lebende.filter((t) => !bereits.has(t.uid));
    const t = (pool.length ? pool : lebende)[Math.floor(b.rng.next() * (pool.length || lebende.length))];
    bereits.add(t.uid);
    return { typ: 'wahllos', teile: [{ t, punkte: w.kraft }], wahllos: true };
  }
  if (!kand.length) return gegenueber ? { typ: 'kein', grund: keinZielGrund(b, u, w, lebende, gegenueber, bereits) } : { typ: 'leere', punkte: w.kraft }; // Verteidiger wählt [FEST 12.4]
  const teile = verteile(b, u, w, kand, koeder, new Map());
  for (const tl of teile) bereits.add(tl.t.uid);
  return { typ: w.wild >= 1 ? 'frei' : 'direkt', teile };
}

// Gierige Aufteilung der Kraftpunkte [FEST 12.4] in ganzen Punkten, jeder Teil ≥ 1 [ANNAHME]
function verteile(b, u, w, kand, koeder, geplant) {
  const punkte = Math.floor(w.kraft);
  const sicht = (t) => lebenVerborgen(b, t, u.seite) ? 20 : restLeben(b, t);
  const info = kand.map((t) => {
    const dpp = schadenFuer(b, u, t, 1, false, w, u.elZug, sichtbaresEl(t)).schaden;
    const rest = Math.max(0, sicht(t) - (geplant.get(t.uid) || 0));
    const wt = werte(b, t);
    const drohung = wt.kraft * Math.max(1, wt.schlag) * wt.mult;
    const noetig = dpp > 0 ? Math.ceil(rest / dpp - 1e-9) : Infinity;
    return { t, dpp, rest, drohung, noetig };
  });
  const maxZiele = w.wild >= 2 ? Math.max(1, Math.min(w.wild, punkte, kand.length)) : 1;
  const score = (x, rest) => (x.rest <= 0 ? -1 : (x.noetig <= rest ? 1000 + x.drohung - x.noetig * 0.1 : rest * x.dpp));
  const gewaehlt = [];
  let rest = punkte;
  const pflicht = koeder.length ? info.filter((x) => koeder.includes(x.t)) : null;
  while (gewaehlt.length < maxZiele) {
    const pool = (gewaehlt.length === 0 && pflicht ? pflicht : info).filter((x) => !gewaehlt.some((g) => g.x === x));
    if (!pool.length) break;
    pool.sort((p, q) => score(q, rest) - score(p, rest));
    const x = pool[0];
    if (gewaehlt.length > 0 && (x.rest <= 0 || rest <= 0)) break;
    const letzter = gewaehlt.length === maxZiele - 1;
    const anteil = punkte === 0 ? 0 : letzter || x.noetig > rest ? rest : Math.max(1, x.noetig);
    gewaehlt.push({ x, punkte: anteil });
    rest -= anteil;
    if (rest <= 0) break;
  }
  if (rest > 0 && gewaehlt.length) gewaehlt.sort((p, q) => q.x.dpp - p.x.dpp)[0].punkte += rest;
  for (const g of gewaehlt) geplant.set(g.x.t.uid, (geplant.get(g.x.t.uid) || 0) + g.punkte * g.x.dpp);
  return gewaehlt.map((g) => ({ t: g.x.t, punkte: g.punkte }));
}

// Verteidiger wählt bei Angriff ins Leere [FEST 12.4] [ANNAHME: mit dem Faktor des gewählten Ziels]
function verteidigerWahl(b, u, D, punkte, w) {
  const opt = lebend(D).map((t) => {
    const s = schadenFuer(b, u, t, punkte, false, w).schaden;
    const r = restLeben(b, t) - s;
    return { t, s, r };
  });
  opt.sort((x, y) => (y.r > 0) - (x.r > 0) || x.s / Math.max(1, restLeben(b, x.t)) - y.s / Math.max(1, restLeben(b, y.t)));
  return opt[0]?.t;
}

// ---------- Kampfphase ----------
// [Nutzer, 21.11.2026] Wer 0 Leben hat, stirbt sofort und greift nicht mehr an (statt gleichzeitiger Abrechnung).
// Reihenfolge: Spalte für Spalte, die Seiten wechseln sich ab. Wer zuerst zuschlägt, wechselt jeden Zug.
function pruefeTod(b, einheit, killer) {
  if (!einheit.tot && restLeben(b, einheit) <= 1e-9) stirb(b, einheit, killer && !killer.tot ? killer : null);
}

function treffe(b, u, z, punkte, wahllos, w, typ) {
  const s = u.seite;
  u.enthuellt = true;
  const { schaden, f, art } = schadenFuer(b, u, z, punkte, wahllos, w);
  u.ersterAngriff = false;
  // Flink: Ausweichen (bei kleinen Karten doppelte Chance)
  if (aktiv(b, z, 'flink') && schaden > 0 && b.rng.next() < Math.min(0.9, 0.12 * stufe(z, 'flink') * (klein(z) ? 2 : 1))) {
    emit(b, { t: 'angriff', seite: s, von: u.uid, ziel: z.uid, schaden: 0, f, art, punkte, typ, hpNach: restLeben(b, z), ausgewichen: true });
    log(b, `${z.name} weicht flink aus.`);
    return;
  }
  if (z.spiegelZug !== b.zug) { z.spiegelZug = b.zug; z.spiegelTreffer = 0; }
  if (aktiv(b, z, 'spiegel') && z.spiegelTreffer < 2 && schaden > 0) {
    z.spiegelTreffer++;
    u.schaden += schaden;
    emit(b, { t: 'angriff', seite: s, von: u.uid, ziel: z.uid, schaden, f, art, punkte, typ, gespiegelt: true, hpNach: restLeben(b, z), hpAngreifer: restLeben(b, u) });
    pruefeTod(b, u, z);
    return;
  }
  z.schaden += schaden;
  emit(b, { t: 'angriff', seite: s, von: u.uid, ziel: z.uid, schaden, f, art, punkte, typ, hpNach: restLeben(b, z) });
  if (aktiv(b, u, 'lebensraub') && u.schaden > 0) { const h = Math.min(u.schaden, stufe(u, 'lebensraub')); u.schaden -= h; emit(b, { t: 'heilung', seite: s, uid: u.uid, wert: h }); }
  if (aktiv(b, u, 'giftstachel') && !z.tot) z.gift.push({ n: stufe(u, 'giftstachel'), bis: b.zug + 2 });
  if (aktiv(b, z, 'dornen')) { u.schaden += 3; emit(b, { t: 'dornen', seite: 1 - s, uid: z.uid, ziel: u.uid, hpNach: restLeben(b, u) }); }
  if (aktiv(b, u, 'flaechenwirbel')) {
    const D = gegner(b, s), sp = D.feld.indexOf(z);
    for (const n of [D.feld[sp - 1], D.feld[sp + 1]]) if (n && !n.tot) { n.schaden += schaden * 0.75; emit(b, { t: 'flaeche', seite: s, von: u.uid, ziel: n.uid, schaden: schaden * 0.75, hpNach: restLeben(b, n) }); pruefeTod(b, n, u); }
  }
  pruefeTod(b, z, u);
  pruefeTod(b, u, z);
}

export function kampf(b) {
  if (b.ende) return;
  const vorher = [0, 1].map((s) => lebend(b.seiten[s]).length);
  // 3. Seltsamkeit (für den Gegner sichtbar)
  for (const s of [0, 1]) for (const u of lebend(b.seiten[s])) {
    const neu = waehleVerschiebung(b, u);
    if (neu !== u.elZug) { emit(b, { t: 'verschieben', seite: s, uid: u.uid, von: u.elZug, nach: neu }); u.elZug = neu; }
  }
  // Heilung [Nutzer]: jedes Monster verteilt seine Heilpunkte auf die am stärksten verletzten Verbündeten
  for (const s of [0, 1]) for (const u of lebend(b.seiten[s])) {
    let rest = u.a.heilung || 0;
    while (rest > 0) {
      const z = lebend(b.seiten[s]).filter((q) => q.schaden > 0.01).sort((x, y) => y.schaden - x.schaden)[0];
      if (!z) break;
      const menge = Math.min(rest, z.schaden, Math.max(1, Math.ceil(rest / 2)));
      z.schaden -= menge; rest -= menge;
      emit(b, { t: 'heilung', seite: s, uid: z.uid, wert: menge, quelle: u.uid });
    }
  }
  // 4. Angriffe der Reihe nach, Schaden wirkt sofort
  const versuche = [0, 0];
  const erste = b.zug % 2 === 1 ? 0 : 1;
  const reihenfolge = [];
  const breite = Math.max(b.seiten[0].feld.length, b.seiten[1].feld.length);
  for (let sp = 0; sp < breite; sp++) for (const s of [erste, 1 - erste]) { const u = b.seiten[s].feld[sp]; if (u && !u.tot) reihenfolge.push(u); }
  for (const u of reihenfolge) {
    if (u.tot || b.ende) continue;
    if (u.bannBis >= b.zug) { log(b, `${u.name} ist gebannt und greift nicht an.`); emit(b, { t: 'angriff', seite: u.seite, von: u.uid, kein: true, grund: 'gebannt' }); continue; }
    const s = u.seite, D = gegner(b, s);
    const w = werte(b, u);
    const bereits = new Set();
    for (let k = 0; k < w.schlag && !u.tot; k++) {
      versuche[s]++;
      const tr = planeAngriff(b, u, b.seiten[s].feld.indexOf(u), w, bereits);
      if (tr.typ === 'leer') { emit(b, { t: 'angriff', seite: s, von: u.uid, leer: true }); continue; }
      if (tr.typ === 'kein') { log(b, `${u.name}: Schlag ${k + 1} von ${w.schlag} ohne Ziel – ${tr.grund.text}.`); emit(b, { t: 'angriff', seite: s, von: u.uid, kein: true, grund: tr.grund.kurz }); continue; }
      let teile = tr.teile;
      if (tr.typ === 'leere') { const t = verteidigerWahl(b, u, D, tr.punkte, w); teile = t ? [{ t, punkte: tr.punkte }] : []; }
      for (const tl of teile) { if (u.tot) break; if (!tl.t.tot) treffe(b, u, tl.t, tl.punkte, !!tr.wahllos, w, tr.typ); }
    }
  }
  // 5. Aufräumen: Leben
  for (const s of [0, 1]) for (const u of lebend(b.seiten[s])) pruefeTod(b, u, null);
  for (const s of [0, 1]) {
    const jetzt = lebend(b.seiten[s]).length;
    if (vorher[s] > 0 && jetzt === 0) verliereLeben(b, s, 'alle Monster ausgeschaltet'); // [FEST 12.5]
    else if (vorher[s] === 0 && versuche[1 - s] > 0) verliereLeben(b, s, 'Angriff ohne eigene Monster'); // [FEST 12.5]
  }
  for (const s of [0, 1]) for (const u of lebend(b.seiten[s])) u.buff = u.buff.filter((bf) => bf.bis > b.zug);
  pruefeEnde(b);
}

function pruefeAusgeloescht(b, s, grund) {
  if (lebend(b.seiten[s]).length === 0) verliereLeben(b, s, grund);
  pruefeEnde(b);
}

function gesamtStaerke(b, s) {
  const seite = b.seiten[s];
  return lebend(seite).reduce((x, u) => x + restLeben(b, u), 0) + seite.hand.reduce((x, u) => x + staerke(u.a), 0);
}

function pruefeEnde(b) {
  if (b.ende) return;
  const [p, g] = b.seiten;
  const leer = (s) => lebend(s).length === 0 && s.hand.length === 0;
  let sieger = null, grund = '';
  if (p.leben <= 0 && g.leben <= 0) { sieger = -1; grund = 'beide ohne Leben'; }
  else if (g.leben <= 0) { sieger = 0; grund = `${g.name} hat keine Leben mehr`; }
  else if (p.leben <= 0) { sieger = 1; grund = `${p.name} hat keine Leben mehr`; }
  else if (leer(p) && leer(g)) { sieger = p.leben > g.leben ? 0 : p.leben < g.leben ? 1 : -1; grund = 'keine Monster mehr übrig'; }
  // [Nutzer, 21.11.2026] Hat eine Seite keine Karten mehr (weder Feld noch Hand), ist der Kampf sofort entschieden.
  else if (leer(g)) { sieger = 0; grund = `${g.name} hat keine Karten mehr`; }
  else if (leer(p)) { sieger = 1; grund = `${p.name} hat keine Karten mehr`; }
  else if (b.zug >= CONFIG.kampf.rundenLimit) {
    const a = gesamtStaerke(b, 0), c = gesamtStaerke(b, 1);
    sieger = p.leben !== g.leben ? (p.leben > g.leben ? 0 : 1) : a > c ? 0 : a < c ? 1 : -1;
    grund = 'Rundenlimit erreicht';
  }
  if (sieger !== null) {
    b.ende = { sieger, grund };
    emit(b, { t: 'ende', sieger, grund });
    log(b, `Kampfende: ${sieger === 0 ? p.name : sieger === 1 ? g.name : 'niemand'} gewinnt (${grund}).`);
  }
}

// Ganzer Kampf ohne Eingriffe (für Tests und Simulation)
export function simuliere(b, maxZuege = 200) {
  b.autoSpieler = true;
  for (let i = 0; i < maxZuege && !b.ende; i++) { zugBeginn(b); kampf(b); }
  return b.ende;
}

export const findeEinheit = (b, uid) => {
  for (const s of b.seiten) for (const u of [...s.feld, ...s.hand, ...s.friedhof]) if (u && u.uid === uid) return u;
  return null;
};
export { lebend };
