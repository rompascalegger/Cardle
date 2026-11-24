// Tägliche Challenges [Nutzer, 21.11.2026]: je Stärkeklasse eine ("Daily Bronze Challenge" … "Daily Diamond Challenge").
// Gespielt wird nur mit eigenen Karten genau dieser Klasse, der Gegner hat ebenfalls nur diese Klasse.
// Jeden Tag neue Gegner (Seed = Datum), jede Challenge bringt einmal am Tag eine Belohnung.
import { CONFIG, KLASSEN } from './config.js';
import { N } from './elements.js';
import { EFFEKTE } from './effects.js';
import { ARTEN } from './species.js';
import { Rng } from './rng.js';
import { gegnerKarte } from './generator.js';
import { staerke, plaetzeBelegt, plaetzeBringt } from './rules.js';
import { S, karte, teamWaehlen } from './state.js';

export function heute(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function msBisMorgen(d = new Date()) {
  const m = new Date(d); m.setHours(24, 0, 0, 0);
  return m - d;
}

const GEGNER_ARTEN = ARTEN.filter((a) => !a.silber);
const FX = EFFEKTE.filter((e) => !['platzspender', 'platzfresser', 'rudelruf', 'sammelrabatt', 'schwergewicht', 'blitzruf', 'erinnerung', 'beutezug', 'opferaltar', 'zweitesich'].includes(e.key)).map((e) => e.id);

// eigene: Größe deines Daily-Teams. Der Gegner hat höchstens gleich viele Karten (Spielerfeedback 24.11.2026:
// hohe Klassen waren kaum zu schaffen, weil man dort nur wenige Karten besitzt).
export function dailyKampf(kl, datum = heute(), eigene = null) {
  const r = new Rng(`daily-${datum}-${kl}`);
  const els = [Math.floor(r.next() * N), Math.floor(r.next() * N), Math.floor(r.next() * N)];
  const Kl = KLASSEN[kl];
  return {
    id: `daily-${datum}-${kl}`, daily: true, kl, datum, name: `Daily ${Kl.name} Challenge`,
    leben: CONFIG.kampf.spielerLeben, els, dim: els[0], welt: 1 + (kl % 8), stufe: 1, boss: kl >= 6,
    einkommen: 10 + Math.floor(kl / 3), startBank: kl, anzahl: Math.max(1, Math.min(6 + Math.floor(kl / 2), eigene == null ? 99 : eigene)),
  };
}

// Gegnerteam: nur Karten genau dieser Klasse, Effekte häufiger je höher die Klasse
export function dailyGegner(k) {
  const r = new Rng(k.id + '-team');
  const Kl = KLASSEN[k.kl];
  const karten = [];
  for (let n = 0; n < k.anzahl; n++) {
    const el = k.els[Math.floor(r.next() * k.els.length)];
    const pool = GEGNER_ARTEN.filter((a) => a.el === el);
    const art = pool[Math.floor(r.next() * pool.length)];
    const fxAnzahl = n === 0 && k.kl >= 6 ? 1 : r.next() < 0.05 + k.kl * 0.03 ? 1 : 0;
    const fx = [];
    const p = FX.slice();
    for (let i = 0; i < fxAnzahl; i++) fx.push(p.splice(Math.floor(r.next() * p.length), 1)[0]);
    const ziel = Math.round(Kl.min + (Kl.max - Kl.min) * (0.3 + r.next() * 0.5));
    const c = gegnerKarte(r, art.id, ziel, fx, k.kl);
    karten.push(c);
  }
  return karten;
}

// Eigenes Team: Karten genau dieser Klasse, gewählt wie „Team bauen“ mit Kostenkurve und Kampfwert
// [Spielerfeedback 24.11.2026: vorher landeten Kommandanten ohne Angriff im Team]
// Teamplätze zählen in Dailies nicht (beim Gegner werden sie ebenfalls ignoriert), höchstens 12 Karten.
export function dailyTeam(kl) {
  const kandidaten = [];
  for (let i = 0; i < S.karten.length; i++) if (karte(i).kl === kl) kandidaten.push(i);
  // Gewähltes Team (Nummer aus den Teamslots) oder -1 = automatisch [Nutzer, 24.11.2026: Team mit Nummer und Name wählen]
  const wahl = dailyTeamWahl(kl);
  const slot = wahl >= 0 ? S.d.teamSlots?.[wahl] : null;
  if (slot) {
    const team = slot.team.filter((i) => i < S.karten.length && karte(i).kl === kl).slice(0, 12);
    return { team, verfuegbar: kandidaten.length, wahl };
  }
  const team = kandidaten.length ? teamWaehlen({ kandidaten, strategie: 'kurve', maxKarten: 12, ohnePlaetze: true }) : [];
  return { team, verfuegbar: kandidaten.length, wahl: -1 };
}
export const dailyTeamWahl = (kl) => S.d.einst.dailyTeams?.[kl] ?? -1;
export function dailyTeamWaehlen(kl, n) {
  S.d.einst.dailyTeams = { ...(S.d.einst.dailyTeams || {}), [kl]: n };
}

export const dailyBelohnung = (kl) => ({
  packs: 2 + kl * 2,
  muenzen: Math.round(800 * (kl + 1) ** 1.6),
  gluecks: kl >= 6 ? 1 : 0,
  element: kl >= 4 ? 1 : 0,
});

export function dailyStand() {
  const d = (S.d.daily = S.d.daily || { datum: null, geschafft: {}, serie: 0, letzterTag: null });
  if (d.datum !== heute()) { d.datum = heute(); d.geschafft = {}; }
  return d;
}
// Sieg eintragen: gibt true zurück, wenn es der erste Sieg heute für diese Klasse war
export function dailyGeschafft(kl) {
  const d = dailyStand();
  if (d.geschafft[kl]) return false;
  d.geschafft[kl] = true;
  if (d.letzterTag !== d.datum) {
    const gestern = heute(new Date(Date.now() - 864e5));
    d.serie = d.letzterTag === gestern ? (d.serie || 0) + 1 : 1;
    d.letzterTag = d.datum;
  }
  return true;
}
