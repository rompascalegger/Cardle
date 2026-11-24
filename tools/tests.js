// Logik-Tests nach Manifest 18.4. Läuft im Browser: tools/tests.html
import { CONFIG, HOLO_STUFEN, LOOKS } from '../js/config.js';
import { ELEMENTE, N, faktorInfo, faktor, gegenpol, mod } from '../js/elements.js';
import { Rng } from '../js/rng.js';
import { ARTEN, REGULAERE_ARTEN, ARTEN_GEWICHTE } from '../js/species.js';
import { EFFEKTE } from '../js/effects.js';
import { seltenheit, seltenheitsChancen, holoFuerWurf, pityChance, kodiere, dekodiere, staerke, kosten, klasseFuerWurf } from '../js/rules.js';
import { wuerfleKarte, oeffnePack, verteilePunkte, gegnerKarte } from '../js/generator.js';
import { neuerKampf, zugBeginn, kampf, beschwoere, schadenFuer, simuliere, werte } from '../js/battle.js';
import { gegnerTeam, teamInfo, kampfWerte, DIMENSIONEN, ALLE_KAEMPFE } from '../js/campaign.js';
const REG_ANTEIL = REGULAERE_ARTEN.length / ARTEN_GEWICHTE[ARTEN_GEWICHTE.length - 1];

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
test('Verteilung: Holo 1 % / 0,5 % / 0,1 % / Ghost 0,02 % bei 10 Mio. Würfen', () => {
  const r = new Rng('vert-holo'); const n = 1e7; const z = { reverse: 0, holo: 0, secret: 0, ghost: 0, keins: 0 };
  for (let i = 0; i < n; i++) z[holoFuerWurf(r.next())]++;
  const H = CONFIG.holo;
  const a = binomOk(z.reverse, n, H.reverse), b = binomOk(z.holo, n, H.holo), c = binomOk(z.secret, n, H.secret), d = binomOk(z.ghost, n, H.ghost);
  return { ok: a.ok && b.ok && c.ok && d.ok, info: `RH ${a.info}\nH ${b.info}\nSH ${c.info}\nGhost ${d.info}` };
});
test('Glückspack: Chancen ×10 (Holo, Looks, seltene Klassen)', () => {
  const r = new Rng('gluecks'); const n = 2e5; let rh = 0, look = 0, emerald = 0;
  for (let i = 0; i < n; i++) { const { karte: c } = wuerfleKarte(r, 0, false, 10); if (c.holo === 'reverse') rh++; if (c.looks & 1) look++; if (c.kl === 4) emerald++; }
  const a = binomOk(rh, n, 0.1), b = binomOk(look, n, 0.05), c = binomOk(emerald, n, 0.2 * REG_ANTEIL);
  return { ok: a.ok && b.ok && c.ok, info: `RH ${a.info}\nLook ${b.info}\nEmerald ${c.info}` };
});
test('Verteilung: jeder Zusatzlook 0,5 % bei 10 Mio. Würfen', () => {
  const r = new Rng('vert-look'); const n = 1e7; let t = 0;
  for (let i = 0; i < n; i++) if (r.next() < CONFIG.lookChance) t++;
  return binomOk(t, n, 0.005);
});
test('Verteilung: Karten aus wuerfleKarte (1 Mio.), Effekte ohne Pity, Klassen, Silber-Monster', () => {
  const r = new Rng('vert-karte'); const n = 1e6; let fx = 0, rh = 0, look = 0; const kl = new Array(8).fill(0);
  for (let i = 0; i < n; i++) { const { karte: c } = wuerfleKarte(r, CONFIG.effekte.mind1); if (c.fx.length) fx++; if (c.holo === 'reverse') rh++; if (c.looks & 1) look++; kl[c.kl]++; }
  const a = binomOk(fx, n, CONFIG.effekte.mind1), b = binomOk(rh, n, 0.01), c = binomOk(look, n, 0.005), d = binomOk(kl[0], n, CONFIG.klassen[0].chance * REG_ANTEIL), e = binomOk(kl[7], n, CONFIG.klassen[7].chance * REG_ANTEIL);
  return { ok: a.ok && b.ok && c.ok && d.ok && e.ok, info: `Effekt ${a.info}\nRH ${b.info}\nLook ${c.info}\nBronze ${d.info}\nDiamond ${e.info}` };
});
test('Klassenwurf: Grenzen der Log-Skala stimmen', () => klasseFuerWurf(0.0005) === 7 && klasseFuerWurf(0.003) === 6 && klasseFuerWurf(0.999) === 0 && klasseFuerWurf(0.3) === 1);

// ---------- Pity ----------
test('Pity-Formel 10.3 (mittelweich)', () => { const P = CONFIG.pity, m = CONFIG.effekte.mind1; return pityChance(1) === m && pityChance(P.schwelle) === m && nahe(pityChance(P.schwelle + P.verdopplung), 2 * m, 1e-12) && nahe(pityChance(P.schwelle + 2 * P.verdopplung), 4 * m, 1e-12) && pityChance(P.garantie) === 1; });
test('Pity: kein Konto über die Garantie ohne Effektkarte', () => {
  const r = new Rng('pity'); const konten = 4000; let summe = 0, max = 0;
  for (let k = 0; k < konten; k++) {
    let pity = 0, n = 0;
    for (;;) { n++; const p = oeffnePack(r, pity); pity = p.pityNachher; if (pity === 0) break; if (n > 400) break; }
    summe += n; if (n > max) max = n;
  }
  const mittel = summe / konten;
  const P = CONFIG.pity;
  return { ok: max <= P.garantie && mittel > P.schwelle * 0.5 && mittel < P.schwelle * 1.05, info: `Mittel ${mittel.toFixed(1)} Packs, Maximum ${max} (Garantie ${P.garantie})` };
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
test('Kosten: Effektaufschläge addieren sich gedämpft, höchstens ×2', () => {
  const c = (fx) => ({ art: 0, kl: 0, a: { kraft: 10, schutz: 0, groesse: 0, wildheit: 0, seltsamkeit: 0, schlagzahl: 0, teamplatz: 0, kapazitaet: 0 }, holo: 'keins', looks: 0, fx });
  // Verstärker 3,0 → 1 + 0,3·2 = 1,6; Verstärker + Doppelrufer + Elementverstärker → gedeckelt bei 2
  return kosten(c([])) === 10 && kosten(c([1])) === 16 && kosten(c([1, 2, 3])) === 20;
});
test('Monster: 20 je Element plus Silber-Monster, alle Namen eindeutig', () => {
  const namen = new Set(ARTEN.map((a) => a.name));
  const proEl = ELEMENTE.map((_, el) => REGULAERE_ARTEN.filter((a) => a.el === el).length);
  const silber = ARTEN.filter((a) => a.silber);
  const okSilber = silber.length === 32 * CONFIG.monster.silberArtenProElement && silber.every((a) => a.nurKlasse === CONFIG.monster.silberKlasse);
  return { ok: REGULAERE_ARTEN.length === 640 && namen.size === ARTEN.length && proEl.every((n) => n === 20) && okSilber, info: `${REGULAERE_ARTEN.length} normale + ${silber.length} Silber-Arten, ${namen.size} Namen` };
});
test('Silber-Monster erscheinen nur als Silber', () => {
  const r = new Rng('silber'); let n = 0;
  for (let i = 0; i < 2e5; i++) { const { karte: c } = wuerfleKarte(r, 0); if (ARTEN[c.art].silber) { n++; if (c.kl !== CONFIG.monster.silberKlasse) return { ok: false, info: `Klasse ${c.kl}` }; } }
  return { ok: n > 0, info: `${n} Silber-Monster gezogen` };
});
test('Effekte: 53 im Pack-Pool plus Boss-Effekt, jede ID einmal', () => new Set(EFFEKTE.map((e) => e.id)).size === EFFEKTE.length && EFFEKTE.filter((e) => !e.nurBoss).length === 53);
test('Kodierung: alte Karten ohne Heilung werden weiter gelesen', () => { const alt = '0a2' + '53101010' + '0' + '0'; const c = dekodiere(alt); return c.a.kraft === 5 && c.a.kapazitaet === 0 && c.a.teamplatz === 1 && c.a.heilung === 0 && c.holo === 'keins' && c.fx.length === 0; });

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
test('Kampagne: 32 Dimensionen × 8 Welten × 10 Stufen + Kern, eindeutige Weltnamen, Stärke steigt, Stichprobe endet', () => {
  const welten = DIMENSIONEN.flatMap((d) => d.welten);
  const namen = new Set(welten.map((w) => w.name));
  const anzahlOk = ALLE_KAEMPFE.length === 32 * 8 * 10 + CONFIG.kern.welten * 10 && welten.length === 32 * 8 + CONFIG.kern.welten;
  let wachsend = true, alleEnden = true, regeln = true;
  for (const d of DIMENSIONEN) {
    let letzte = 0;
    for (const w of d.welten) for (const k of w.stufen) { if (!k.boss) { if (k.basis < letzte) wachsend = false; letzte = k.basis; } }
  }
  const r = new Rng('sim');
  const team = Array.from({ length: 8 }, () => wuerfleKarte(r, 0).karte);
  ALLE_KAEMPFE.forEach((k, idx) => {
    if (idx % 97 !== 0 && !(k.kern && k.weltBoss)) return;
    const g = gegnerTeam(k, {});
    const ti = teamInfo(g);
    if (ti.belegt > ti.gesamt) regeln = false;
    const kw = kampfWerte(k, {});
    const b = neuerKampf({ spielerKarten: team, gegnerKarten: g, gegnerLeben: k.leben, rng: r, gegnerEinkommen: kw.einkommen, gegnerStartBank: kw.startBank });
    if (!simuliere(b, 200)) alleEnden = false;
  });
  return { ok: anzahlOk && namen.size === welten.length && wachsend && alleEnden && regeln, info: `${ALLE_KAEMPFE.length} Kämpfe, ${namen.size} Weltnamen, Kern offen ab ${CONFIG.kern.freiAbWeltenJeDimension} Welten je Dimension` };
});
test('Weltenbosse: stärkste Karte mit Auferstehung und 3 Effekten', () => {
  const k = ALLE_KAEMPFE.find((x) => x.weltBoss && x.welt === 3 && x.dim === 5);
  const g = gegnerTeam(k, {});
  return { ok: g[0].fx.length === 3 && g[0].fx.includes(54) && g[1].fx.length >= 2, info: g[0].fx.join(', ') };
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
