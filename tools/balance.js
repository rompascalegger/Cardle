// Balance-Simulation: misst Siegquoten von 10 Team-Aufstellungen an 48 Kampagnenpunkten,
// kalibriert die Gegnerstärke so, dass nur die besten Aufstellungen bestehen, und schlägt neue Kurvenwerte vor.
import { CONFIG } from '../js/config.js';
import { DIMENSIONEN, kampfNachId, basisStaerke, belohnung } from '../js/campaign.js';

const K = CONFIG.kampagne;
const SETUP_NAMEN = ['Stärkste Karten', 'Kosteneffizient', 'Angriff', 'Verteidigung & Heilung', 'Wildheit', 'Gegenpol', 'Elementvorteil', 'Koloss', 'Schwarm', 'Ausgewogen'];
const ZIEL_QUOTE = 0.75; // die beste Aufstellung soll ~75 % gewinnen
const MAX_PACKS = 20000; // darüber ändert sich die Spitze einer Sammlung kaum noch

const $ = (s) => document.querySelector(s);
const log = (t) => { $('#log').textContent += t + '\n'; $('#log').scrollTop = 1e9; };

// ---------- Arbeiter ----------
const ANZAHL = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1));
const arbeiter = Array.from({ length: ANZAHL }, () => new Worker('./balance-worker.js', { type: 'module' }));
let jobId = 0, spieleGesamt = 0, spieleErwartet = 0;
const offen = new Map();
const warteschlange = [];
const frei = [...arbeiter];
arbeiter.forEach((w) => { w.onmessage = (e) => { const j = offen.get(e.data.id); offen.delete(e.data.id); frei.push(w); spieleGesamt += e.data.spiele.reduce((a, b) => a + b, 0); fortschritt(); j.resolve(e.data); pumpe(); }; w.onerror = (e) => log('Fehler im Worker: ' + e.message); });
function pumpe() { while (frei.length && warteschlange.length) { const j = warteschlange.shift(); const w = frei.pop(); offen.set(j.auftrag.id, j); w.postMessage(j.auftrag); } }
const auftrag = (a) => new Promise((resolve) => { a.id = ++jobId; warteschlange.push({ auftrag: a, resolve }); pumpe(); });
let t0 = 0;
function fortschritt() {
  const p = spieleErwartet ? spieleGesamt / spieleErwartet : 0;
  $('#balken').style.width = (Math.min(1, p) * 100).toFixed(1) + '%';
  const s = (performance.now() - t0) / 1000;
  $('#stand').textContent = `${spieleGesamt.toLocaleString('de-DE')} / ${spieleErwartet.toLocaleString('de-DE')} Spiele · ${s.toFixed(0)} s · ${(spieleGesamt / Math.max(1, s)).toFixed(0)} Spiele/s · ${ANZAHL} Worker`;
}

// ---------- Kampagnenpunkte ----------
// linear: ein Spieler, der eine Dimension der Reihe nach spielt. breit: alle 32 Dimensionen bis zur vorigen Welt fertig.
function punkte(P) {
  const out = [];
  for (const szenario of ['linear', 'breit']) for (let w = 1; w <= K.weltenProDimension; w++) for (const l of [1, K.zwischenbossStufe, K.stufenProWelt]) {
    const k = kampfNachId(`d0w${w}l${l}`);
    const mal = szenario === 'breit' ? 32 : 1;
    let packs = CONFIG.wirtschaft.startPacks, muenzen = CONFIG.wirtschaft.startMuenzen, gluecks = 0;
    const element = [];
    for (const k2 of DIMENSIONEN[0].welten.flatMap((x) => x.stufen)) {
      if (!(k2.welt < w || (k2.welt === w && k2.stufe < l))) continue;
      const f = k2.welt < w ? mal : 1;
      const b = belohnung(k2, true);
      packs += b.packs * f; muenzen += b.muenzen * f;
      if (b.welt) { gluecks += b.welt.gluecks * f; muenzen += b.welt.muenzen * f; for (let i = 0; i < b.welt.element * f; i++) element.push(szenario === 'breit' ? i % 32 : 0); }
    }
    packs += Math.floor(muenzen / (CONFIG.wirtschaft.packPreis + CONFIG.autoOeffnen.stufen[0].gebuehr));
    const fertig = (w - 1) * mal;
    out.push({
      szenario, w, l, kampfId: k.id, typ: k.weltBoss ? 'weltboss' : k.zwischenboss ? 'zwischenboss' : 'kampf', index: (w - 1) * K.stufenProWelt + (l - 1),
      fertig, ziel: Math.round(basisStaerke(k, P) * P.fortschrittFaktor(fertig)),
      einkommen: K.gegnerEinkommen(w, l, fertig) + (k.weltBoss ? 2 : 0), startBank: k.startBank, leben: k.leben,
      packs: Math.min(MAX_PACKS, packs), packsEchte: packs, sonder: { gluecks: Math.min(200, gluecks), element: element.slice(0, 300) },
    });
  }
  return out;
}
const aktuelleParameter = () => ({ staerkeBasis: K.staerkeBasis, wachstumProStufe: K.wachstumProStufe, bossFaktor: K.bossFaktor, zwischenbossFaktor: K.zwischenbossFaktor, fortschrittFaktor: K.fortschrittFaktor, steigung: 0.03, deckel: 2.5 });

// ---------- Phase A/C: Messung ----------
async function messen(pk, proben, spiele, setups = [...SETUP_NAMEN.keys()], mult = 1) {
  const jobs = [];
  for (const p of pk) for (let s = 0; s < proben; s++) {
    jobs.push(auftrag({ kampfId: p.kampfId, ziel: Math.round(p.ziel * mult), einkommen: p.einkommen, startBank: p.startBank, leben: p.leben, packs: p.packs, sonder: p.sonder, setups, proben: 1, spiele, seed: `bal-${p.szenario}-${p.kampfId}-s${s}` }).then((r) => ({ p, r })));
  }
  const res = await Promise.all(jobs);
  const quoten = new Map();
  for (const { p, r } of res) {
    if (!quoten.has(p)) quoten.set(p, { siege: new Array(10).fill(0), spiele: new Array(10).fill(0) });
    const q = quoten.get(p);
    r.siege.forEach((x, i) => { q.siege[i] += x; q.spiele[i] += r.spiele[i]; });
  }
  return pk.map((p) => { const q = quoten.get(p); return { p, quote: q.siege.map((x, i) => (q.spiele[i] ? x / q.spiele[i] : 0)) }; });
}

// ---------- Phase B: Kalibrierung ----------
async function kalibrieren(messung, schritte, proben, spiele) {
  const out = [];
  await Promise.all(messung.map(async ({ p, quote }) => {
    const top = quote.map((q, i) => [q, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map((x) => x[1]);
    let lo = Math.log(0.2), hi = Math.log(6);
    let bestes = null;
    for (let s = 0; s < schritte; s++) {
      const m = Math.exp((lo + hi) / 2);
      const [r] = await messen([p], proben, spiele, top, m);
      const beste = Math.max(...top.map((i) => r.quote[i]));
      bestes = { m, beste };
      if (beste > ZIEL_QUOTE) lo = Math.log(m); else hi = Math.log(m);
    }
    out.push({ p, mult: bestes.m, noetig: p.ziel * bestes.m, gesaettigt: p.ziel * bestes.m > 2000 });
  }));
  return out;
}

// Kurve anpassen: ln(Stärke) = ln(Basis) + Index · ln(Wachstum), Bossfaktoren als Mittel, Fortschrittsfaktor aus dem breiten Szenario
function anpassen(kal, P) {
  const normal = kal.filter((x) => x.p.szenario === 'linear' && x.p.typ === 'kampf' && !x.gesaettigt);
  const n = normal.length;
  const xs = normal.map((x) => x.p.index), ys = normal.map((x) => Math.log(x.noetig / P.fortschrittFaktor(x.p.fertig)));
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const steig = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.max(1e-9, xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const basis = Math.exp(my - steig * mx), wachstum = Math.exp(steig);
  const kurve = (x) => basis * wachstum ** x.p.index * P.fortschrittFaktor(x.p.fertig);
  const mittel = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const zb = mittel(kal.filter((x) => x.p.szenario === 'linear' && x.p.typ === 'zwischenboss' && !x.gesaettigt).map((x) => x.noetig / kurve(x)));
  const wb = mittel(kal.filter((x) => x.p.szenario === 'linear' && x.p.typ === 'weltboss' && !x.gesaettigt).map((x) => x.noetig / kurve(x)));
  const breit = kal.filter((x) => x.p.szenario === 'breit' && x.p.typ === 'kampf' && x.p.fertig > 0);
  const faktoren = breit.map((x) => ({ fertig: x.p.fertig, f: x.noetig / (basis * wachstum ** x.p.index) }));
  const steigung = mittel(faktoren.map((x) => Math.max(0, (x.f - 1) / x.fertig))) ?? 0.03;
  const deckel = Math.max(1, ...faktoren.map((x) => x.f));
  return {
    staerkeBasis: Math.round(basis), wachstumProStufe: +wachstum.toFixed(4),
    zwischenbossFaktor: +(zb ?? P.zwischenbossFaktor).toFixed(2), bossFaktor: +(wb ?? P.bossFaktor).toFixed(2),
    steigung: +steigung.toFixed(4), deckel: +deckel.toFixed(2),
    fortschrittFaktor: (f) => Math.min(+deckel.toFixed(2), 1 + +steigung.toFixed(4) * f),
  };
}

// ---------- Anzeige ----------
function tabelle(titel, messung) {
  const farbe = (q) => `hsl(${Math.round(q * 120)} 70% ${28 + q * 14}%)`;
  let html = `<h3>${titel}</h3><table><tr><th>Punkt</th><th>Gegner</th><th>Packs</th>${SETUP_NAMEN.map((n) => `<th>${n}</th>`).join('')}<th>Beste</th><th>Median</th></tr>`;
  for (const { p, quote } of messung) {
    const sort = [...quote].sort((a, b) => b - a);
    html += `<tr><td>${p.szenario} W${p.w} S${p.l}</td><td>${p.ziel}</td><td>${p.packsEchte.toLocaleString('de-DE')}</td>${quote.map((q) => `<td style="background:${farbe(q)}">${Math.round(q * 100)}</td>`).join('')}<td><b>${Math.round(sort[0] * 100)}</b></td><td>${Math.round(sort[5] * 100)}</td></tr>`;
  }
  return html + '</table>';
}
function zusammenfassung(messung) {
  const besten = messung.map((m) => Math.max(...m.quote));
  const mediane = messung.map((m) => [...m.quote].sort((a, b) => b - a)[5]);
  const zaehl = new Array(10).fill(0);
  messung.forEach((m) => { const max = Math.max(...m.quote); m.quote.forEach((q, i) => { if (q >= max - 0.05) zaehl[i]++; }); });
  return { besteMittel: besten.reduce((a, b) => a + b, 0) / besten.length, medianMittel: mediane.reduce((a, b) => a + b, 0) / mediane.length, spitzenReiter: zaehl.map((n, i) => [SETUP_NAMEN[i], n]).sort((a, b) => b[1] - a[1]) };
}

// ---------- Ablauf ----------
async function lauf({ proben, spiele, schritte, kalProben, kalSpiele }) {
  t0 = performance.now(); spieleGesamt = 0;
  const P = aktuelleParameter();
  const pk = punkte(P);
  const kalGames = pk.length * schritte * 3 * kalProben * kalSpiele;
  spieleErwartet = 2 * pk.length * proben * 10 * spiele + kalGames;
  log(`Start: ${pk.length} Kampagnenpunkte × 10 Aufstellungen × ${proben} Sammlungen × ${spiele} Spiele, dazu Kalibrierung. Erwartet ~${spieleErwartet.toLocaleString('de-DE')} Spiele.`);
  const a = await messen(pk, proben, spiele);
  $('#ergebnis').innerHTML = tabelle('Phase A: aktuelle Werte', a);
  const za = zusammenfassung(a);
  log(`Phase A: beste Aufstellung im Mittel ${(za.besteMittel * 100).toFixed(0)} %, Median ${(za.medianMittel * 100).toFixed(0)} %.`);
  const kal = await kalibrieren(a, schritte, kalProben, kalSpiele);
  const neu = anpassen(kal, P);
  log(`Phase B: Vorschlag staerkeBasis ${neu.staerkeBasis}, wachstumProStufe ${neu.wachstumProStufe}, zwischenbossFaktor ${neu.zwischenbossFaktor}, bossFaktor ${neu.bossFaktor}, Fortschritt 1 + ${neu.steigung}·Welten (bis ×${neu.deckel}).`);
  const gesaettigt = kal.filter((x) => x.gesaettigt).map((x) => `${x.p.szenario} W${x.p.w} S${x.p.l}`);
  if (gesaettigt.length) log(`Hinweis: An ${gesaettigt.length} Punkten reicht selbst das größte mögliche Gegnerteam (~2000) nicht: ${gesaettigt.join(', ')}`);
  const pk2 = punkte({ ...P, ...neu });
  const c = await messen(pk2, proben, spiele);
  $('#ergebnis').innerHTML += tabelle('Phase C: vorgeschlagene Werte', c);
  const zc = zusammenfassung(c);
  log(`Phase C: beste Aufstellung im Mittel ${(zc.besteMittel * 100).toFixed(0)} %, Median ${(zc.medianMittel * 100).toFixed(0)} %. Meist vorn: ${zc.spitzenReiter.slice(0, 3).map(([n, z]) => `${n} (${z}×)`).join(', ')}.`);
  log(`Fertig: ${spieleGesamt.toLocaleString('de-DE')} Spiele in ${((performance.now() - t0) / 1000).toFixed(0)} s.`);
  window.BALANCE = { a: a.map((m) => ({ ...m.p, quote: m.quote })), kal: kal.map((x) => ({ punkt: `${x.p.szenario} W${x.p.w} S${x.p.l}`, mult: x.mult, noetig: Math.round(x.noetig), gesaettigt: x.gesaettigt })), neu: { ...neu, fortschrittFaktor: undefined }, c: c.map((m) => ({ ...m.p, quote: m.quote })), za, zc, spiele: spieleGesamt };
}

$('#schnell').onclick = () => lauf({ proben: 1, spiele: 4, schritte: 3, kalProben: 1, kalSpiele: 10 });
$('#voll').onclick = () => lauf({ proben: 4, spiele: 250, schritte: 6, kalProben: 2, kalSpiele: 70 });
window.balanceLauf = lauf;
