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
import { S, karte } from './state.js';

export function heute(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function msBisMorgen(d = new Date()) {
  const m = new Date(d); m.setHours(24, 0, 0, 0);
  return m - d;
}

const GEGNER_ARTEN = ARTEN.filter((a) => !a.silber);
const FX = EFFEKTE.filter((e) => !['platzspender', 'platzfresser', 'rudelruf', 'sammelrabatt', 'schwergewicht', 'blitzruf', 'erinnerung', 'beutezug', 'opferaltar', 'zweitesich'].includes(e.key)).map((e) => e.id);

// eigene: Zahl der eigenen Karten dieser Klasse. Der Gegner hat höchstens eine Karte mehr (Spielerfeedback 24.11.2026:
// hohe Klassen waren kaum zu schaffen, weil man dort nur wenige Karten besitzt).
export function dailyKampf(kl, datum = heute(), eigene = null) {
  const r = new Rng(`daily-${datum}-${kl}`);
  const els = [Math.floor(r.next() * N), Math.floor(r.next() * N), Math.floor(r.next() * N)];
  const Kl = KLASSEN[kl];
  return {
    id: `daily-${datum}-${kl}`, daily: true, kl, datum, name: `Daily ${Kl.name} Challenge`,
    leben: CONFIG.kampf.spielerLeben, els, dim: els[0], welt: 1 + (kl % 8), stufe: 1, boss: kl >= 6,
    einkommen: 10 + Math.floor(kl / 3), startBank: kl, anzahl: Math.max(1, Math.min(6 + Math.floor(kl / 2), eigene == null ? 99 : eigene + 1)),
  };
}

// Gegnerteam: nur Karten genau dieser Klasse, Effekte häufiger je höher die Klasse
export function dailyGegner(k) {
  const r = new Rng(k.id + '-team');
  const Kl = KLASSEN[k.kl];
  const karten = [];
  let frei = CONFIG.kampf.teamGrundplaetze;
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
    while (plaetzeBelegt(c) > frei + plaetzeBringt(c) && c.a.teamplatz > 0) c.a.teamplatz--;
    if (plaetzeBelegt(c) > frei + plaetzeBringt(c)) break;
    frei += plaetzeBringt(c) - plaetzeBelegt(c);
    karten.push(c);
  }
  return karten;
}

// Eigenes Team: die stärksten eigenen Karten dieser Klasse, nach den Teamregeln
export function dailyTeam(kl) {
  const kand = [];
  for (let i = 0; i < S.karten.length; i++) { const c = karte(i); if (c.kl === kl) kand.push({ i, c, w: staerke(c.a) + plaetzeBringt(c) * 3 + c.fx.length * 5 }); }
  kand.sort((a, b) => b.w - a.w);
  const team = [];
  let belegt = 0, gesamt = CONFIG.kampf.teamGrundplaetze;
  for (const x of kand) {
    if (team.length >= 12) break;
    const b = plaetzeBelegt(x.c), g = plaetzeBringt(x.c);
    if (belegt + b <= gesamt + g) { team.push(x.i); belegt += b; gesamt += g; }
  }
  return { team, verfuegbar: kand.length };
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
