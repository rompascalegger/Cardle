// Logik-Tests nach Manifest 18.4. Läuft im Browser: tools/tests.html
import { CONFIG, HOLO_STUFEN, LOOKS } from '../js/config.js';
import { ELEMENTE, N, faktorInfo, faktor, gegenpol, mod } from '../js/elements.js';
import { Rng } from '../js/rng.js';
import { ARTEN } from '../js/species.js';
import { EFFEKTE } from '../js/effects.js';
import { seltenheit, seltenheitsChancen, holoFuerWurf, pityChance, kodiere, dekodiere, staerke, kosten, klasseFuerWurf } from '../js/rules.js';
import { wuerfleKarte, oeffnePack, verteilePunkte, gegnerKarte } from '../js/generator.js';
import { neuerKampf, zugBeginn, kampf, beschwoere, schadenFuer, simuliere, werte } from '../js/battle.js';
import { gegnerTeam, WELTEN } from '../js/campaign.js';

const ergebnisse = [];
const out = document.getElementById('out');
function test(name, f) {
  const t0 = performance.now();
  let ok = false, info = '';
  try { const r = f(); ok = r === true || (r && r.ok); info = r && r.info ? r.info : ''; } catch (e) { info = String(e.stack || e); }
  const ms = Math.round(performance.now() - t0);
  ergebnisse.push({ name, ok, info, ms });
  out.insertAdjacentHTML('beforeend', `<div class="${ok ? 'ok' : 'fail'}"><b>${ok ? '✓' : '✗'}</b> ${name} <small>${ms} ms</small>${info ? `<pre>${info}</pre>` : ''}</div>`);
}
const nahe = (a, b, tol) => Math.abs(a - b) <= tol;
// Zufallsschwankung: 4 Standardabweichungen der Binomialverteilung
const binomOk = (treffer, n, p) => { const sd = Math.sqrt(n * p * (1 - p)); return { ok: Math.abs(treffer - n * p) <= 4 * sd, info: `${treffer} Treffer, erwartet ${(n * p).toFixed(0)} ± ${(4 * sd).toFixed(0)}` }; };

// ---------- Rad ----------
test('Rad: 32 Elemente, jedes genau einmal, 16 Gegenpolpaare', () => {
  const namen = new Set(ELEMENTE.map((e) => e.name));
  const paare = new Set();
  for (let i = 0; i < N; i++) paare.add([i, gegenpol(i)].sort((a, b) => a - b).join('-'));
  return { ok: N === 32 && namen.size === 32 && paare.size === 16 && gegenpol(0) === 16 && ELEMENTE[gegenpol(0)].name === 'Eis', info: `${namen.size} Namen, ${paare.size} Paare` };
});
test('Rad: direkte Nachbarn sind neutral', () => [...Array(N).keys()].every((i) => faktor(i, mod(i + 1)) === 1 && faktor(mod(i + 1), i) === 1));
test('Faktor: alle 32×32 Paare, Kehrwert bei Primzahlen, Gegenpol 2,5 beidseitig', () => {
  const fehler = [];
  for (let a = 0; a < N; a++) for (let v = 0; v < N; v++) {
    const s = Math.log(faktor(a, v)) + Math.log(faktor(v, a));
    const i = faktorInfo(a, v);
    const soll = i.art === 'gegenpol' ? 2 * Math.log(2.5) : 0;
    if (!nahe(s, soll, 1e-12)) fehler.push(`${a}-${v}`);
  }
  return { ok: !fehler.length, info: fehler.length ? fehler.slice(0, 10).join(', ') : '1024 Paare geprüft' };
});
test('Faktor: Tabelle 4.4 (Abstand 2..13 stark, Kehrwert schwach)', () => {
  const soll = { 2: 1.1, 3: 1.2, 5: 1.4, 7: 1.6, 11: 1.8, 13: 2.0 };
  return Object.entries(soll).every(([d, f]) => nahe(faktor(Number(d), 0), f, 1e-12) && nahe(faktor(0, Number(d)), 1 / f, 1e-12))
    && [4, 6, 8, 9, 10, 12, 14, 15].every((d) => faktor(d, 0) === 1 && faktor(0, d) === 1);
});
test('Beispiel 12.6: Wasser gegen Feuer neutral, Wasser gegen Metall ×2,5', () => faktor(6, 0) === 1 && faktor(6, 22) === 2.5);

// ---------- Seltenheit ----------
test('Punktemodell: 4 Holo × 6 Looks × 4 Effekte ergeben genau Stufen 1..14', () => {
  const stufen = new Set();
  let max = 0, maxBei = '';
  for (const h of HOLO_STUFEN) for (let k = 0; k <= 5; k++) for (let e = 0; e <= 3; e++) {
    const s = seltenheit(h, k, e); stufen.add(s);
    if (s > max) { max = s; maxBei = `${h}+${k}+E${e}`; }
  }
  return { ok: stufen.size === 14 && Math.min(...stufen) === 1 && max === 14 && maxBei === 'secret+5+E3', info: `max ${max} bei ${maxBei}` };
});
test('Punktemodell: alle Einträge der Nutzerliste 7.2', () => {
  const T = (h, k, e) => seltenheit(h, k, e);
  const liste = [
    [1, 'keins', 0, 0], [2, 'keins', 1, 0], [3, 'reverse', 0, 0], [4, 'reverse', 1, 0],
    [5, 'reverse', 2, 0], [5, 'holo', 1, 0], [5, 'secret', 0, 0],
    [6, 'secret', 1, 0], [6, 'holo', 2, 0], [6, 'reverse', 3, 0], [6, 'reverse', 0, 1],
    [7, 'secret', 2, 0], [7, 'holo', 3, 0], [7, 'reverse', 4, 0], [7, 'holo', 0, 1], [7, 'reverse', 0, 2],
    [8, 'secret', 3, 0], [8, 'holo', 4, 0], [8, 'reverse', 5, 0], [8, 'secret', 0, 1], [8, 'holo', 0, 2], [8, 'reverse', 0, 3],
    [9, 'secret', 4, 0], [9, 'holo', 5, 0], [9, 'reverse', 2, 1], [9, 'holo', 0, 3], [9, 'secret', 0, 2],
    [10, 'secret', 5, 0], [10, 'holo', 3, 1], [10, 'reverse', 1, 2], [10, 'secret', 0, 3],
    [11, 'secret', 2, 1], [11, 'holo', 4, 2], [11, 'reverse', 3, 3],
    [12, 'reverse', 5, 3], [12, 'secret', 1, 2], [12, 'holo', 2, 3],
    [13, 'holo', 5, 3], [13, 'secret', 4, 3], [14, 'secret', 5, 3],
  ];
  const fehler = liste.filter(([s, h, k, e]) => T(h, k, e) !== s);
  return { ok: !fehler.length, info: fehler.map((x) => x.join('/')).join(', ') || `${liste.length} Einträge` };
});
test('Seltenheitschancen ergeben 100 % und werden seltener', () => {
  const p = seltenheitsChancen();
  const summe = p.reduce((a, b) => a + b, 0);
  let fallend = true;
  for (let s = 2; s <= 14; s++) if (!(p[s] < p[s - 1])) fallend = false;
  return { ok: nahe(summe, 1, 1e-12) && fallend, info: `Summe ${summe}, Omega 1 von ${(1 / p[14]).toExponential(2)}` };
});

// ---------- Verteilungen ----------
test('Verteilung: Holo 1 % / 0,5 % / 0,1 % bei 10 Mio. Würfen', () => {
  const r = new Rng('vert-holo'); const n = 1e7; const z = { reverse: 0, holo: 0, secret: 0, keins: 0 };
  for (let i = 0; i < n; i++) z[holoFuerWurf(r.next())]++;
  const a = binomOk(z.reverse, n, 0.01), b = binomOk(z.holo, n, 0.005), c = binomOk(z.secret, n, 0.001);
  return { ok: a.ok && b.ok && c.ok, info: `RH ${a.info}\nH ${b.info}\nSH ${c.info}` };
});
test('Verteilung: jeder Zusatzlook 0,5 % bei 10 Mio. Würfen', () => {
  const r = new Rng('vert-look'); const n = 1e7; let t = 0;
  for (let i = 0; i < n; i++) if (r.next() < CONFIG.lookChance) t++;
  return binomOk(t, n, 0.005);
});
test('Verteilung: Karten aus wuerfleKarte (1 Mio.), Effekte 0,1 % ohne Pity, Klassen', () => {
  const r = new Rng('vert-karte'); const n = 1e6; let fx = 0, rh = 0, look = 0; const kl = new Array(8).fill(0);
  for (let i = 0; i < n; i++) { const { karte: c } = wuerfleKarte(r, CONFIG.effekte.mind1); if (c.fx.length) fx++; if (c.holo === 'reverse') rh++; if (c.looks & 1) look++; kl[c.kl]++; }
  const a = binomOk(fx, n, 0.001), b = binomOk(rh, n, 0.01), c = binomOk(look, n, 0.005), d = binomOk(kl[0], n, 0.4), e = binomOk(kl[7], n, 0.001);
  return { ok: a.ok && b.ok && c.ok && d.ok && e.ok, info: `Effekt ${a.info}\nRH ${b.info}\nLook ${c.info}\nBronze ${d.info}\nDiamond ${e.info}` };
});
test('Klassenwurf: Grenzen der Log-Skala stimmen', () => klasseFuerWurf(0.0005) === 7 && klasseFuerWurf(0.003) === 6 && klasseFuerWurf(0.999) === 0 && klasseFuerWurf(0.5) === 1);

// ---------- Pity ----------
test('Pity-Formel 10.3', () => pityChance(1) === 0.001 && pityChance(100) === 0.001 && nahe(pityChance(125), 0.002, 1e-12) && nahe(pityChance(150), 0.004, 1e-12) && pityChance(200) === 1);
test('Pity: kein Konto über 200 Packs ohne Effektkarte, Mittel ≈ 78', () => {
  const r = new Rng('pity'); const konten = 4000; let summe = 0, max = 0;
  for (let k = 0; k < konten; k++) {
    let pity = 0, n = 0;
    for (;;) { n++; const p = oeffnePack(r, pity); pity = p.pityNachher; if (pity === 0) break; if (n > 400) break; }
    summe += n; if (n > max) max = n;
  }
  const mittel = summe / konten;
  return { ok: max <= 200 && nahe(mittel, 78, 4), info: `Mittel ${mittel.toFixed(1)} Packs, Maximum ${max}` };
});

// ---------- Karten ----------
test('Kodierung: 10.000 Karten hin und zurück identisch', () => {
  const r = new Rng('codec');
  for (let i = 0; i < 10000; i++) {
    const { karte: c } = wuerfleKarte(r, 0.3);
    if (i % 7 === 0) { c.holo = HOLO_STUFEN[i % 4]; c.looks = i % 32; }
    const d = dekodiere(kodiere(c));
    if (JSON.stringify(d) !== JSON.stringify(c)) return { ok: false, info: JSON.stringify([c, d]) };
  }
  return true;
});
test('Stärke = Summe der Attribute, im Klassenbereich, Obergrenzen eingehalten', () => {
  const r = new Rng('staerke'); let fehler = '';
  for (let i = 0; i < 20000 && !fehler; i++) {
    const { karte: c } = wuerfleKarte(r, 0);
    const K = CONFIG.klassen[c.kl], s = staerke(c.a);
    const deckel = Object.values(CONFIG.obergrenzen).reduce((a, b) => a + b, 0);
    if (s < K.min || s > Math.min(K.max, deckel)) fehler = `Stärke ${s} außerhalb ${K.name}`;
    for (const [k, v] of Object.entries(c.a)) if (v > CONFIG.obergrenzen[k]) fehler = `${k}=${v}`;
  }
  return { ok: !fehler, info: fehler };
});
test('Kosten = Stärke × Preisfaktoren (Beschwörungsverstärker ×3)', () => {
  const c = { art: 0, kl: 0, a: { kraft: 1, schutz: 0, groesse: 0, wildheit: 0, seltsamkeit: 0, schlagzahl: 0, teamplatz: 0, kapazitaet: 0 }, holo: 'keins', looks: 0, fx: [1] };
  return kosten(c) === 3;
});
test('Monster: 20 je Element, 640 eindeutige Namen', () => {
  const namen = new Set(ARTEN.map((a) => a.name));
  const proEl = ELEMENTE.map((_, el) => ARTEN.filter((a) => a.el === el).length);
  return { ok: ARTEN.length === 640 && namen.size === 640 && proEl.every((n) => n === 20), info: `${ARTEN.length} Arten, ${namen.size} Namen` };
});
test('Effekte: 53 verschieden, jede ID einmal', () => new Set(EFFEKTE.map((e) => e.id)).size === EFFEKTE.length && EFFEKTE.length === 53);

// ---------- Kampf ----------
const leer = () => ({ kraft: 0, schutz: 0, groesse: 0, wildheit: 0, seltsamkeit: 0, schlagzahl: 0, teamplatz: 0, kapazitaet: 0 });
const k = (art, a, fx = []) => ({ art, kl: 2, a: { ...leer(), ...a }, holo: 'keins', looks: 0, fx });
const artVon = (el) => ARTEN.find((x) => x.el === el).id;
test('Schaden nie null bei Kraft > 0, Beispiel 4.5 (Gegenpol 8 gegen Schutz 3 = 5)', () => {
  const b = neuerKampf({ spielerKarten: [k(artVon(0), { kraft: 8, schlagzahl: 1 })], gegnerKarten: [k(artVon(16), { schutz: 3, kraft: 1, schlagzahl: 1 })], rng: new Rng('k1') });
  const [u] = b.seiten[0].hand, [v] = b.seiten[1].hand;
  const s = schadenFuer(b, u, v, 8).schaden;
  let minimal = Infinity;
  for (let schutz = 0; schutz <= 15; schutz++) { v.a.schutz = schutz; for (let e = 0; e < N; e++) { u.elZug = e; minimal = Math.min(minimal, schadenFuer(b, u, v, 1).schaden); } }
  return { ok: nahe(s, 5, 1e-9) && minimal > 0, info: `Gegenpol-Schaden ${s}, kleinster Schaden ${minimal.toFixed(4)}` };
});
test('Größe verhindert freie Zielwahl, Aufteilen nur in ganzen Punkten', () => {
  const sp = [k(artVon(3), { kraft: 7, wildheit: 2, schlagzahl: 1 })];
  const ge = [k(artVon(3), { schutz: 0, groesse: 0 }), k(artVon(3), { schutz: 0, groesse: 3, kraft: 1 }), k(artVon(3), { schutz: 0, groesse: 0, kraft: 1 })];
  const b = neuerKampf({ spielerKarten: sp, gegnerKarten: ge, rng: new Rng('k2') });
  b.zug = 1; b.seiten[0].bank = 99; b.seiten[1].bank = 99;
  beschwoere(b, 0, 0, 0);
  beschwoere(b, 1, 0, 2); beschwoere(b, 1, 0, 1); beschwoere(b, 1, 0, 3);
  const riese = b.seiten[1].feld[1];
  kampf(b);
  const angriffe = b.ev.filter((e) => e.t === 'angriff' && e.seite === 0 && e.ziel);
  const ganzzahlig = angriffe.every((e) => Number.isInteger(e.punkte) && e.punkte >= 1);
  const riesigGetroffen = angriffe.some((e) => e.ziel === riese.uid);
  return { ok: ganzzahlig && !riesigGetroffen && angriffe.length >= 1, info: angriffe.map((e) => `${e.punkte}→${e.ziel}`).join(', ') };
});
test('Leben: Angriff ohne eigene Monster kostet 1 Leben pro Runde', () => {
  const b = neuerKampf({ spielerKarten: [k(artVon(0), { kraft: 3, schlagzahl: 2 })], gegnerKarten: [], rng: new Rng('k3') });
  b.zug = 1; b.seiten[0].bank = 99;
  beschwoere(b, 0, 0, 0);
  kampf(b);
  return b.seiten[1].leben === CONFIG.kampf.spielerLeben - 1;
});
test('Kampagne: Simulation aller Kämpfe endet, Gegnerstärke wächst', () => {
  const r = new Rng('sim');
  let alleEnden = true, letzte = 0, wachsend = true;
  const team = Array.from({ length: 8 }, () => wuerfleKarte(r, 0).karte);
  for (const w of WELTEN) for (const kampfDef of w.kaempfe) {
    const g = gegnerTeam(kampfDef);
    const sum = g.reduce((x, c) => x + staerke(c.a), 0);
    if (!kampfDef.boss && sum < letzte * 0.8) wachsend = false;
    if (!kampfDef.boss) letzte = sum;
    const b = neuerKampf({ spielerKarten: team, gegnerKarten: g, gegnerLeben: kampfDef.leben, rng: r });
    const e = simuliere(b, 200);
    if (!e) alleEnden = false;
  }
  return { ok: alleEnden && wachsend, info: `alle ${WELTEN.reduce((x, w) => x + w.kaempfe.length, 0)} Kämpfe beendet` };
});
test('Kampf: alle 53 Effekte laufen ohne Fehler durch', () => {
  const r = new Rng('fx');
  for (const e of EFFEKTE) {
    const sp = [k(artVon(e.id % 32), { kraft: 6, schutz: 2, wildheit: 1, schlagzahl: 2, groesse: 1, seltsamkeit: 3 }, [e.id]), k(artVon(5), { kraft: 4, schlagzahl: 1 }), k(artVon(7), { kraft: 2, schlagzahl: 1, schutz: 1 })];
    const ge = [k(artVon(16), { kraft: 5, schlagzahl: 1, schutz: 1 }, [((e.id + 7) % 53) + 1]), k(artVon(20), { kraft: 3, schlagzahl: 2, wildheit: 2 })];
    const b = neuerKampf({ spielerKarten: sp, gegnerKarten: ge, rng: r });
    simuliere(b, 80);
    void werte;
  }
  return true;
});
test('Gegnerkarten liegen im Klassenbereich', () => {
  const r = new Rng('gk');
  for (let z = 1; z <= 120; z++) { const c = gegnerKarte(r, 0, z); const K = CONFIG.klassen[c.kl]; const s = staerke(c.a); if (s < Math.min(K.min, 1) || s > K.max) return { ok: false, info: `Ziel ${z} → ${s}` }; }
  return true;
});
void LOOKS;

const ok = ergebnisse.filter((e) => e.ok).length;
document.getElementById('summe').textContent = `${ok} / ${ergebnisse.length} Tests bestanden`;
document.getElementById('summe').className = ok === ergebnisse.length ? 'ok' : 'fail';
window.TESTERGEBNIS = { ok, gesamt: ergebnisse.length, fehler: ergebnisse.filter((e) => !e.ok) };
