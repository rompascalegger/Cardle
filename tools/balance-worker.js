// Balance-Simulation (Worker): echte Spiel-Engine, Sammlung je Kampagnenpunkt, 10 Team-Aufstellungen.
import { CONFIG } from '../js/config.js';
import { Rng } from '../js/rng.js';
import { oeffnePack } from '../js/generator.js';
import { neuerKampf, simuliere } from '../js/battle.js';
import { kampfNachId, gegnerTeam } from '../js/campaign.js';
import { staerke, kosten, plaetzeBelegt, plaetzeBringt, teamplatzMult } from '../js/rules.js';
import { faktor, gegenpol } from '../js/elements.js';
import { ARTEN } from '../js/species.js';

export const SETUPS = [
  { key: 'staerkste', name: 'Stärkste Karten', score: (c) => staerke(c.a) },
  { key: 'effizient', name: 'Kosteneffizient', score: (c) => staerke(c.a) ** 1.5 / kosten(c) },
  { key: 'angriff', name: 'Angriff', score: (c) => (c.a.kraft + 1) * Math.max(1, c.a.schlagzahl) * teamplatzMult(c.a.teamplatz) },
  { key: 'verteidigung', name: 'Verteidigung & Heilung', score: (c) => staerke(c.a) * (1 + c.a.schutz * 0.3) + c.a.heilung * 8 },
  { key: 'wildheit', name: 'Wildheit', score: (c) => (c.a.wildheit + 1) * (c.a.kraft + 1) * Math.max(1, c.a.schlagzahl) },
  { key: 'gegenpol', name: 'Gegenpol', score: (c, els) => staerke(c.a) * (els.some((e) => gegenpol(e) === ARTEN[c.art].el) ? 2.2 : 1) },
  { key: 'element', name: 'Elementvorteil', score: (c, els) => staerke(c.a) * vorteil(ARTEN[c.art].el, els) },
  { key: 'koloss', name: 'Koloss', score: (c) => staerke(c.a) * teamplatzMult(c.a.teamplatz) ** 2 },
  { key: 'schwarm', name: 'Schwarm', score: (c) => c.a.kapazitaet * 30 + staerke(c.a) / Math.max(1, kosten(c)) * 10 },
  { key: 'ausgewogen', name: 'Ausgewogen', score: (c, els) => staerke(c.a) * Math.sqrt(vorteil(ARTEN[c.art].el, els)) * (1 + c.a.schutz * 0.08) * (1 + c.a.wildheit * 0.08) * (1 + c.a.heilung * 0.05) },
];

function vorteil(el, els) {
  let s = 0;
  for (const e of els) s += Math.log(faktor(el, e)) - Math.log(faktor(e, el));
  return Math.exp(s / els.length);
}

// Wie ein guter Spieler: bis zu 3 günstige Starter für die ersten Züge, dann nach der Wertung der Aufstellung
function waehle(karten, score, els) {
  const kand = karten.map((c) => ({ c, s: score(c, els), k: kosten(c) })).sort((a, b) => b.s - a.s);
  const team = [];
  const drin = new Set();
  let belegt = 0, gesamt = CONFIG.kampf.teamGrundplaetze;
  const nimm = (x) => {
    const b = plaetzeBelegt(x.c), g = plaetzeBringt(x.c);
    if (drin.has(x) || belegt + b > gesamt + g) return false;
    team.push(x.c); drin.add(x); belegt += b; gesamt += g; return true;
  };
  for (const stufe of CONFIG.kampf.teamKurve) {
    let n = 0;
    for (const x of kand) { if (n >= stufe.anzahl) break; if (x.k <= stufe.bis && nimm(x)) n++; }
  }
  for (const x of kand) { if (team.length >= 14) break; nimm(x); }
  return team;
}

// Sammlung eines Spielers an diesem Punkt (behält starke und nützliche Karten, wenige Bronze)
const SAMMLUNGEN = new Map();
function sammlung(seed, packs, sonder) {
  const key = `${seed}|${packs}|${JSON.stringify(sonder)}`;
  if (SAMMLUNGEN.has(key)) return SAMMLUNGEN.get(key);
  const r = new Rng(seed);
  let pity = 0;
  const karten = [];
  const nimm = (c) => { if (c.kl >= 1 || c.fx.length || c.a.kapazitaet || karten.length < 300 || r.next() < 0.01) karten.push(c); };
  const oeffne = (opt) => { const p = oeffnePack(r, pity, opt); pity = p.pityNachher; for (const k of p.karten) nimm(k.karte); };
  for (let i = 0; i < packs; i++) oeffne({});
  for (let i = 0; i < (sonder.gluecks || 0); i++) oeffne({ mult: CONFIG.gluecksPack.faktor, groesse: CONFIG.gluecksPack.karten });
  for (const el of sonder.element || []) oeffne({ mult: CONFIG.elementPack.faktor, groesse: CONFIG.elementPack.karten, element: el });
  if (SAMMLUNGEN.size > 6) SAMMLUNGEN.delete(SAMMLUNGEN.keys().next().value);
  SAMMLUNGEN.set(key, karten);
  return karten;
}

// Auftrag: { id, kampfId, ziel, einkommen, startBank, leben, packs, sonder, setups: [Index], proben, spiele, seed }
self.onmessage = (e) => {
  const a = e.data;
  const k = kampfNachId(a.kampfId);
  const siege = new Array(SETUPS.length).fill(0), spiele = new Array(SETUPS.length).fill(0);
  let zuege = 0;
  const t0 = performance.now();
  for (let p = 0; p < a.proben; p++) {
    const karten = sammlung(`${a.seed}-s${p}`, a.packs, a.sonder);
    const gegner = gegnerTeam(k, {}, a.ziel);
    for (const si of a.setups) {
      const team = waehle(karten, SETUPS[si].score, k.els);
      if (!team.length) continue;
      for (let g = 0; g < a.spiele; g++) {
        const b = neuerKampf({ spielerKarten: team, gegnerKarten: gegner, gegnerLeben: a.leben, rng: new Rng(`${a.seed}-${p}-${si}-${g}`), gegnerEinkommen: a.einkommen, gegnerStartBank: a.startBank });
        const ende = simuliere(b, 120);
        zuege += b.zug;
        spiele[si]++;
        if (ende && ende.sieger === 0) siege[si]++;
      }
    }
  }
  self.postMessage({ id: a.id, siege, spiele, zuege, ms: performance.now() - t0 });
};
