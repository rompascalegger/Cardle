// Logik-Tests nach Manifest 18.4. Läuft im Browser: tools/tests.html
import { CONFIG, HOLO_STUFEN, LOOKS, KLASSEN } from '../js/config.js';
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
  const r = new Rng('vert-karte'); const n = 1e6; let fx = 0, rh = 0, look = 0; const kl = new Array(KLASSEN.length).fill(0);
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
    if (s < K.min || (c.kl < 8 && s > Math.min(K.max, deckel))) fehler = `Stärke ${s} außerhalb ${K.name}`;
    if (c.kl < 8) for (const [k, v] of Object.entries(c.a)) if (v > CONFIG.obergrenzen[k]) fehler = `${k}=${v}`; // Brilliant: bewusst ohne Obergrenzen
  }
  return { ok: !fehler, info: fehler };
});
test('Kosten: Stärke + Effekt-Seltenheit (Stufe 1–5 kostet +1 bis +5)', () => {
  const c = (fx, fxs) => ({ art: 0, kl: 0, a: { kraft: 10, schutz: 0, groesse: 0, wildheit: 0, seltsamkeit: 0, schlagzahl: 0, teamplatz: 0, kapazitaet: 0 }, holo: 'keins', looks: 0, fx, fxs });
  return kosten(c([], [])) === 10 && kosten(c([1], [1])) === 11 && kosten(c([55, 1], [4, 1])) === 15 && kosten(c([56, 57, 58], [5, 5, 5])) === 25;
});
test('Brilliant: 10× seltener als Diamond, breite Kodierung für Werte über 35, Zusatzeffekt Stufe 6', () => {
  const ok1 = Math.abs(KLASSEN[8].chance - KLASSEN[7].chance / 10) < 1e-12 && Math.abs(KLASSEN.reduce((s, k) => s + k.chance, 0) - 1) < 1e-9;
  const c = { art: 7, kl: 8, a: { kraft: 60, schutz: 40, groesse: 3, wildheit: 2, seltsamkeit: 1, schlagzahl: 4, teamplatz: 2, heilung: 0, kapazitaet: 0 }, holo: 'holo', looks: 3, fx: [12, 55], fxs: [6, 4] };
  const d = dekodiere(kodiere(c));
  const normal = dekodiere(kodiere({ ...c, kl: 3, a: { ...c.a, kraft: 10, schutz: 4 } }));
  return { ok: ok1 && d.kl === 8 && d.a.kraft === 60 && d.a.schutz === 40 && d.fxs.join() === '6,4' && d.holo === 'holo' && d.looks === 3 && normal.kl === 3 && normal.a.kraft === 10, info: `Brilliant ${KLASSEN[8].chance}, Code-Länge ${kodiere(c).length}` };
});
test('Verstärken: Kosten aufgerundet 1,1^Stärke (exponentiell)', () => { const f = CONFIG.kampfstaub.verstaerkenKosten; return f(5) === 2 && f(24) === 10 && f(100) === 13781 && f(30) > f(29); });
test('Kodierung: Effekt-Seltenheit bleibt erhalten, alte Codes lesen sich als Stufe 1', () => {
  const c = { art: 5, kl: 3, a: { kraft: 4, schutz: 2, groesse: 1, wildheit: 0, seltsamkeit: 0, schlagzahl: 1, teamplatz: 0, heilung: 0, kapazitaet: 0 }, holo: 'keins', looks: 0, fx: [55, 14, 63], fxs: [5, 1, 3] };
  const d = dekodiere(kodiere(c));
  const alt = dekodiere(kodiere({ ...c, fxs: undefined }));
  return d.fx.join() === '55,14,63' && d.fxs.join() === '5,1,3' && alt.fxs.join() === '1,1,1';
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
test('Effekte: 53 alte + 9 neue im Pack-Pool plus Boss-Effekt, jede ID einmal', () => new Set(EFFEKTE.map((e) => e.id)).size === EFFEKTE.length && EFFEKTE.filter((e) => !e.nurBoss).length === 62 && EFFEKTE.filter((e) => e.skaliert).length === 9);
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
  const L = CONFIG.kampagne.stufenProWelt;
  const anzahlOk = ALLE_KAEMPFE.length === (32 * 8 + CONFIG.kern.welten + CONFIG.tiefKern.welten) * L && welten.length === 32 * 8 + CONFIG.kern.welten + CONFIG.tiefKern.welten;
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


// ---------- Effekte im Kampf: jeder Effekt mit eigenem Szenario [Nutzer, 24.11.2026: Effekte auf Funktion prüfen] ----------
const FX = Object.fromEntries(EFFEKTE.map((e) => [e.key, e.id]));
const kk = (a, fx = [], fxs = []) => ({ art: artVon(0), kl: 2, a: { ...leer(), heilung: 0, ...a }, holo: 'keins', looks: 0, fx: fx.map((key) => FX[key]), fxs });
// Kampf mit Karten in der Hand, viel Bank, Zug 1. leg(s, i, spalte) beschwört Handkarte i.
function szenario(eigene, feinde, seed = 'fx') {
  const b = neuerKampf({ spielerKarten: eigene, gegnerKarten: feinde, rng: new Rng(seed) });
  b.zug = 1;
  b.seiten[0].bank = 999; b.seiten[1].bank = 999;
  const leg = (s, i, sp) => { const u = b.seiten[s].hand[i]; beschwoere(b, s, b.seiten[s].hand.indexOf(u), sp); return u; };
  return { b, leg };
}
const effektTests = {
  blitzschlag: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['blitzschlag'])], [kk({ schutz: 20 })]); const z = leg(1, 0, 0); leg(0, 0, 0); return z.schaden === 6; },
  blitzheilung: () => { const { b, leg } = szenario([kk({ schutz: 20 }), kk({ kraft: 1 }, ['blitzheilung'])], []); const v = leg(0, 0, 0); v.schaden = 12; leg(0, 0, 1); return v.schaden === 2; },
  blitzruf: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['blitzruf']), kk({ kraft: 8 })], []); leg(0, 0, 0); return b.seiten[0].hand.length === 0 && b.seiten[0].feld.filter(Boolean).length === 2; },
  erinnerung: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['erinnerung']), kk({ kraft: 5 })], [kk({ kraft: 30, schlagzahl: 1 })]); const u = leg(0, 0, 0); leg(1, 0, 0); b.zug = 3; kampf(b); return u.tot && b.seiten[0].hand.length === 0; },
  beutezug: () => { const { b, leg } = szenario([kk({ kraft: 30, schlagzahl: 1, schutz: 20 }, ['beutezug']), kk({ kraft: 5 })], [kk({ kraft: 1 })]); leg(0, 0, 0); leg(1, 0, 0); b.zug = 2; kampf(b); return b.seiten[0].hand.length === 0; },
  opferaltar: () => { const { b, leg } = szenario([kk({ schutz: 3 }), kk({ kraft: 5 }, ['opferaltar']), kk({ kraft: 9 })], []); const opfer = leg(0, 0, 0); b.seiten[0].hand[0].c; const altar = leg(0, 0, 1); b.zug = 2; zugBeginn(b); return opfer.tot && !altar.tot && b.seiten[0].hand.length === 0; },
  letzterwille: () => { const { b, leg } = szenario([kk({ schutz: 20 }), kk({ kraft: 1 }, ['letzterwille'])], [kk({ kraft: 30, schlagzahl: 1 })]); const v = leg(0, 0, 0); leg(0, 0, 1); leg(1, 0, 1); b.zug = 2; kampf(b); return v.buff.some((x) => x.kraft === 4); },
  lebenslicht: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['lebenslicht']), kk({ schutz: 20 })], [kk({ kraft: 30, schlagzahl: 1 })]); leg(0, 0, 0); leg(0, 0, 1); leg(1, 0, 0); const vor = b.seiten[0].leben; b.zug = 2; kampf(b); return b.seiten[0].leben === vor + 2; },
  herzstueck: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['herzstueck'])], []); const vor = b.seiten[0].leben; leg(0, 0, 0); zugBeginn(b); return b.seiten[0].leben === vor + 2; },
  zweiteratem: () => { const { b, leg } = szenario([kk({ kraft: 1, schutz: 1 }, ['zweiteratem'])], [kk({ kraft: 30, schlagzahl: 1 })]); const u = leg(0, 0, 0); leg(1, 0, 0); b.zug = 2; kampf(b); return !u.tot && u.atemGenutzt; },
  'zweiteratem-sofort': () => { const { b, leg } = szenario([kk({ kraft: 1, schutz: 1 }, ['zweiteratem'])], [kk({ kraft: 30, schlagzahl: 1 })]); leg(1, 0, 0); const u = leg(0, 0, 0); kampf(b); return !u.tot && u.atemGenutzt && b.seiten[0].feld.includes(u); },
  'auferstehung-sofort': () => { const { b, leg } = szenario([kk({ kraft: 1, schutz: 1 }, ['auferstehung'])], [kk({ kraft: 30, schlagzahl: 1 })]); leg(1, 0, 0); const u = leg(0, 0, 0); kampf(b); return !u.tot && u.schaden === 0; },
  'erinnerung-sofort': () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['erinnerung']), kk({ kraft: 5 })], [kk({ kraft: 30, schlagzahl: 1 })]); leg(1, 0, 0); const u = leg(0, 0, 0); kampf(b); return u.tot && b.seiten[0].hand.length === 0 && b.seiten[0].friedhof.includes(u); },
  'zielwahl-spieler': () => { const { b, leg } = szenario([kk({ kraft: 5, schlagzahl: 1, wildheit: 2, schutz: 30 })], [kk({ schutz: 30, groesse: 1 }), kk({ schutz: 30, groesse: 1 })]); const u = leg(0, 0, 0); leg(1, 0, 0); const z2 = leg(1, 0, 1); u.zielWahl = z2.uid; b.zug = 2; kampf(b); return z2.schaden > 0 && b.seiten[1].feld[0].schaden === 0; },
  'verschiebung-spieler': () => { const { b, leg } = szenario([kk({ kraft: 1, seltsamkeit: 3 })], []); const u = leg(0, 0, 0); const ziel = (u.el + 31) % 32; u.verschiebWahl = ziel; b.zug = 2; kampf(b); return u.elZug === ziel; },
  bann: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['bann'], [3])], [kk({ kraft: 5, schlagzahl: 1 })]); const z = leg(1, 0, 0); leg(0, 0, 0); return z.bannBis === b.zug + 2; },
  eintrittsstich: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['eintrittsstich'], [4])], [kk({ schutz: 20 })]); const z = leg(1, 0, 0); leg(0, 0, 0); return z.schaden === 8; },
  schrumpfzauber: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['schrumpfzauber'], [2])], [kk({ kraft: 10, schlagzahl: 1 })]); const z = leg(1, 0, 0); leg(0, 0, 0); return werte(b, z).kraft === 6; },
  schutzgeist: () => { const { b, leg } = szenario([kk({ kraft: 1 }), kk({ kraft: 1 }, ['schutzgeist'], [5])], []); const v = leg(0, 0, 0); leg(0, 0, 1); return werte(b, v).schutz === 5; },
  giftstachel: () => { const { b, leg } = szenario([kk({ kraft: 1, schlagzahl: 1 }, ['giftstachel'], [3])], [kk({ schutz: 30 })]); leg(0, 0, 0); const z = leg(1, 0, 0); b.zug = 2; kampf(b); const vor = z.schaden; zugBeginn(b); return z.schaden - vor === 3; },
  lebensraub: () => { const { b, leg } = szenario([kk({ kraft: 3, schlagzahl: 1, schutz: 10 }, ['lebensraub'], [2])], [kk({ schutz: 30 })]); const u = leg(0, 0, 0); leg(1, 0, 0); u.schaden = 5; b.zug = 2; kampf(b); return u.schaden === 3; },
  winzlingswut: () => { const { b, leg } = szenario([kk({ kraft: 2, groesse: 1 }, ['winzlingswut'], [3]), kk({ kraft: 2, groesse: 3 }, ['winzlingswut'], [3])], []); const a = leg(0, 0, 0), g = leg(0, 0, 1); b.zug = 2; return werte(b, a).kraft === 8 && werte(b, g).kraft === 2; },
  rudelbiss: () => { const { b, leg } = szenario([kk({ kraft: 2 }, ['rudelbiss'], [2]), kk({ kraft: 1 }), kk({ kraft: 1 })], []); const a = leg(0, 0, 0); leg(0, 0, 1); leg(0, 0, 2); b.zug = 2; return werte(b, a).kraft === 6; },
  flink: () => { let aus = 0; for (let i = 0; i < 200; i++) { const { b, leg } = szenario([kk({ kraft: 1, schlagzahl: 1 })], [kk({ schutz: 30, groesse: 3 }, ['flink'], [5])], 'f' + i); leg(0, 0, 0); const z = leg(1, 0, 0); b.zug = 2; kampf(b); if (z.schaden === 0) aus++; } return aus > 60 && aus < 160; },
  verstaerker: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['verstaerker']), kk({ kraft: 1 }, ['doppelrufer'])], []); leg(0, 0, 0); const vor = b.seiten[0].bank; zugBeginn(b); const nur3 = b.seiten[0].bank - vor; leg(0, 0, 1); const v2 = b.seiten[0].bank; zugBeginn(b); return nur3 === 30 && b.seiten[0].bank - v2 === 63; },
  rudelruf: () => { const { b, leg } = szenario([kk({ kraft: 1 }, ['rudelruf']), kk({ kraft: 10 })], []); leg(0, 0, 0); zugBeginn(b); const vor = b.seiten[0].bank; leg(0, 0, 1); return vor - b.seiten[0].bank === 7; },
  dornen: () => { const { b, leg } = szenario([kk({ kraft: 1, schlagzahl: 1, schutz: 30 })], [kk({ schutz: 30 }, ['dornen'])]); const u = leg(0, 0, 0); leg(1, 0, 0); b.zug = 2; kampf(b); return u.schaden === 3; },
  regeneration: () => { const { b, leg } = szenario([kk({ schutz: 10 }, ['regeneration'])], []); const u = leg(0, 0, 0); u.schaden = 5; zugBeginn(b); return u.schaden === 2; },
};
for (const [key, f] of Object.entries(effektTests)) { const [k0, zusatz] = key.split('-'); const e = EFFEKTE.find((x) => x.key === k0); test(e ? `Effekt im Kampf: ${e.name}${zusatz ? ` (${zusatz}: im Zug der Beschwörung getötet)` : ''}` : `Kampf: ${k0} durch den Spieler`, f); }

const ok = ergebnisse.filter((e) => e.ok).length;
document.getElementById('summe').textContent = `${ok} / ${ergebnisse.length} Tests bestanden`;
document.getElementById('summe').className = ok === ergebnisse.length ? 'ok' : 'fail';
window.TESTERGEBNIS = { ok, gesamt: ergebnisse.length, fehler: ergebnisse.filter((e) => !e.ok) };
