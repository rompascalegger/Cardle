// Kampagne: Welten, Kämpfe, Bosse. [FEST] Gegner, progressiv, Endbosse. [VORSCHLAG 12.7] alles Weitere.
import { CONFIG } from './config.js';
import { ELEMENTE, gegenpol } from './elements.js';
import { EFFEKTE } from './effects.js';
import { artenFuerElement } from './species.js';
import { Rng } from './rng.js';
import { gegnerKarte } from './generator.js';

const K = CONFIG.kampagne;
// [OFFEN] Weltnamen: Platzhalter
const WELT_NAMEN = ['Glutgrund', 'Kristallküste', 'Wildes Dorf', 'Turm der Ordnung', 'Frostnetz', 'Rostdunst', 'Mythenlabor', 'Rand der Zeit'];

// Effekte, die sich für Bosse eignen (keine reinen Team- oder Kostenvorteile)
const BOSS_EFFEKTE = EFFEKTE.filter((e) => !['platzspender', 'platzfresser', 'rudelruf', 'sammelrabatt', 'schwergewicht', 'blitzruf', 'erinnerung', 'beutezug', 'opferaltar', 'zweitesich'].includes(e.key)).map((e) => e.id);

export function welten() {
  const out = [];
  for (let w = 1; w <= K.welten; w++) {
    const els = Array.from({ length: K.elementeProWelt }, (_, i) => (w - 1) * K.elementeProWelt + i);
    const basis = K.staerkeBasis * K.staerkeFaktor ** (w - 1);
    const kaempfe = K.kampfAnteile.map((a, i) => ({ id: `w${w}k${i + 1}`, welt: w, nr: i + 1, name: `Kampf ${i + 1}`, staerke: Math.round(basis * a), leben: CONFIG.kampf.spielerLeben, boss: false, els }));
    kaempfe.push({ id: `w${w}b`, welt: w, nr: K.kaempfeProWelt + 1, name: 'Boss', staerke: Math.round(basis * K.bossAnteil), leben: K.bossLebenBasis + w, boss: true, els });
    out.push({ nr: w, name: WELT_NAMEN[w - 1] || `Welt ${w}`, els, kaempfe });
  }
  // Finale: zwei Gegenpolpaare (vier Elemente) [VORSCHLAG]
  const fin = [0, gegenpol(0), 15, gegenpol(15)];
  out.push({ nr: K.welten + 1, name: 'Das Gegenpol-Finale', els: fin, finale: true,
    kaempfe: [{ id: 'finale', welt: K.welten + 1, nr: 1, name: 'Finalboss', staerke: K.finaleStaerke, leben: K.finaleLeben, boss: true, els: fin }] });
  return out;
}

export const WELTEN = welten();
export const kampfNachId = (id) => { for (const w of WELTEN) for (const k of w.kaempfe) if (k.id === id) return k; return null; };

export function freigeschaltet(fortschritt, k) {
  const w = WELTEN.find((x) => x.nr === k.welt);
  const idx = w.kaempfe.indexOf(k);
  if (idx > 0) return !!fortschritt[w.kaempfe[idx - 1].id];
  if (k.welt === 1) return true;
  const vor = WELTEN.find((x) => x.nr === k.welt - 1);
  return !!fortschritt[vor.kaempfe[vor.kaempfe.length - 1].id];
}

// Gegnerteam mit Zielstärke. Deterministisch je Kampf, damit man es vorher ansehen kann.
export function gegnerTeam(k) {
  const rng = new Rng('gegner-' + k.id);
  const karten = [];
  let rest = k.staerke;
  const anzahl = Math.max(2, Math.min(9, Math.round(2 + Math.log2(k.staerke / 6) * 1.2)));
  const proKarte = Math.max(2, Math.round(k.staerke / anzahl));
  while (rest > 0 && karten.length < 12) {
    const el = k.els[Math.floor(rng.next() * k.els.length)];
    const arten = artenFuerElement(el);
    const art = arten[Math.floor(rng.next() * arten.length)];
    const ziel = Math.max(1, Math.min(rest, Math.round(proKarte * (0.7 + rng.next() * 0.6))));
    const fx = [];
    if (k.boss && karten.length === 0) {
      const pool = BOSS_EFFEKTE.slice();
      for (let i = 0; i < K.bossEffekte; i++) fx.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
    }
    const c = gegnerKarte(rng, art.id, k.boss && karten.length === 0 ? Math.round(ziel * 1.4) : ziel, fx);
    karten.push(c);
    rest -= ziel;
  }
  return karten;
}

export function belohnung(k) {
  const B = K.belohnung;
  const w = Math.min(k.welt, K.welten + 1);
  return k.boss ? { packs: B.bossPacks(w), muenzen: B.bossMuenzen(w) } : { packs: B.kampfPacks(w), muenzen: B.kampfMuenzen(w) };
}

export const elementNamen = (els) => els.map((e) => ELEMENTE[e].name).join(' · ');
