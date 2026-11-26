// Mehr Dopamin [Nutzer, 26.11.2026]: Glücksrad, Login-Truhe, Quests, Goldene Stunde, Element-Sets.
// Reine Logik (ohne DOM). Belohnungen haben ein gemeinsames Format:
// { muenzen, packs, kampfstaub, gluecksstaub, gluecks, kern, element (mit el) }
import { CONFIG } from './config.js';
import { ELEMENTE } from './elements.js';
import { REGULAERE_ARTEN } from './species.js';
import { Rng } from './rng.js';
import { S, aenderung, speichernBald, sonderPacksGeben } from './state.js';

const fmt = (n) => Math.round(n).toLocaleString('de-DE');

// ---------- Belohnungen ----------
export function lohnGeben(l, el = 0) {
  S.d.muenzen += l.muenzen || 0;
  S.d.packs += l.packs || 0;
  S.d.kampfstaub = (S.d.kampfstaub || 0) + (l.kampfstaub || 0);
  S.d.gluecksstaub = (S.d.gluecksstaub || 0) + (l.gluecksstaub || 0);
  sonderPacksGeben({ gluecks: l.gluecks || 0, element: l.element || 0, kern: l.kern || 0 }, l.el ?? el);
  aenderung('packs');
  speichernBald(300);
}
export function lohnText(l) {
  const t = [];
  if (l.packs) t.push(`${fmt(l.packs)} Pack${l.packs > 1 ? 's' : ''}`);
  if (l.muenzen) t.push(`${fmt(l.muenzen)} Münzen`);
  if (l.kampfstaub) t.push(`${fmt(l.kampfstaub)} Kampfstaub`);
  if (l.gluecksstaub) t.push(`${fmt(l.gluecksstaub)} Glücksstaub`);
  if (l.gluecks) t.push(`${l.gluecks} Glückspack${l.gluecks > 1 ? 's' : ''}`);
  if (l.kern) t.push(`${l.kern} Kernpack${l.kern > 1 ? 's' : ''}`);
  if (l.element) t.push(`${l.element} ${l.el != null ? ELEMENTE[l.el].name + '-' : ''}Elementpack${l.element > 1 ? 's' : ''}`);
  return t.join(', ');
}

// ---------- Datum ----------
export const heute = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const tagNummer = (txt) => Math.floor(new Date(txt + 'T12:00:00').getTime() / 864e5);
// ISO-Woche (Montag als Wochenbeginn)
export function wocheVon(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const jahrStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - jahrStart) / 864e5 + 1) / 7)).padStart(2, '0')}`;
}

// ---------- Statistik (für Quests) ----------
export function statWert(key) {
  const st = S.d.stat;
  switch (key) {
    case 'packs': return st.packs || 0;
    case 'siege': return S.d.kampagne.siege || 0;
    case 'holoKarten': return Object.values(st.holo || {}).reduce((a, b) => a + b, 0);
    default: return st[key] || 0;
  }
}
export function statPlus(key, n = 1) { S.d.stat[key] = (S.d.stat[key] || 0) + n; }

// ---------- Glücksrad ----------
// Rang 1..n: steigt mit dem Fortschritt (Welt, Kern, Turm), skaliert Münzen, Staub und Packs
export function radFelder(rang = 1) {
  const f = Math.max(1, rang);
  return CONFIG.gluecksrad.felder.map((x) => {
    if (x.typ === 'jackpot') return { ...x, lohn: { ...CONFIG.gluecksrad.jackpot, muenzen: CONFIG.gluecksrad.jackpot.muenzen * f }, text: 'JACKPOT' };
    if (x.typ === 'gluecks') return { ...x, lohn: { gluecks: x.basis }, text: 'Glückspack' };
    const wert = x.typ === 'packs' ? x.basis + Math.floor((f - 1) / 3) : Math.round(x.basis * (1 + 0.5 * (f - 1)));
    const text = x.typ === 'packs' ? `${wert} Pack${wert > 1 ? 's' : ''}` : x.typ === 'muenzen' ? `${fmt(wert)} Münzen` : `${fmt(wert)} ${x.typ === 'kampfstaub' ? 'Kampfstaub' : 'Glücksstaub'}`;
    return { ...x, lohn: { [x.typ]: wert }, text };
  });
}
export function radDrehen(rang = 1) {
  const felder = radFelder(rang);
  const summe = felder.reduce((s, x) => s + x.gewicht, 0);
  let u = S.rng.next() * summe, i = 0;
  for (; i < felder.length - 1; i++) { if (u < felder[i].gewicht) break; u -= felder[i].gewicht; }
  const feld = felder[i];
  lohnGeben(feld.lohn);
  statPlus('radDrehungen');
  return { index: i, feld, felder };
}

// ---------- Login-Truhe ----------
export function loginStand() {
  const L = (S.d.login = S.d.login || { letzter: null, serie: 0, abgeholt: null });
  const h = heute();
  const offen = L.abgeholt !== h;
  // Serie: gestern abgeholt → weiter, sonst neu
  let serie = L.serie || 0;
  if (offen) serie = L.abgeholt && tagNummer(h) - tagNummer(L.abgeholt) === 1 ? serie + 1 : 1;
  return { offen, serie, tagImZyklus: ((serie - 1) % CONFIG.login.tage.length) + 1 };
}
export function loginAbholen() {
  const st = loginStand();
  if (!st.offen) return null;
  const lohn = { ...CONFIG.login.tage[st.tagImZyklus - 1] };
  if (st.serie % 30 === 0) for (const [k, v] of Object.entries(CONFIG.login.alle30)) lohn[k] = (lohn[k] || 0) + v;
  S.d.login = { letzter: heute(), serie: st.serie, abgeholt: heute() };
  lohnGeben(lohn);
  return { ...st, lohn };
}

// ---------- Quests ----------
function questsErzeugen(vorlagen, seed, n) {
  const r = new Rng(seed);
  const pool = vorlagen.slice();
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const v = pool.splice(Math.floor(r.next() * pool.length), 1)[0];
    const ziel = v.ziele[Math.floor(r.next() * v.ziele.length)];
    out.push({ id: v.id, text: v.text.replace('{n}', ziel), stat: v.stat, ziel, start: statWert(v.stat), lohn: v.lohn, abgeholt: false });
  }
  return out;
}
export function quests() {
  const Q = (S.d.quests = S.d.quests || {});
  const t = heute(), w = wocheVon();
  if (Q.tag?.datum !== t) Q.tag = { datum: t, liste: questsErzeugen(CONFIG.quests.tag, 'quest-' + t, 3) };
  if (Q.woche?.datum !== w) Q.woche = { datum: w, liste: questsErzeugen(CONFIG.quests.woche, 'woche-' + w, 3) };
  const mitStand = (q) => ({ ...q, stand: Math.min(q.ziel, statWert(q.stat) - q.start), fertig: statWert(q.stat) - q.start >= q.ziel });
  return { tag: Q.tag.liste.map(mitStand), woche: Q.woche.liste.map(mitStand) };
}
export function questAbholen(art, id) {
  quests();
  const q = S.d.quests[art].liste.find((x) => x.id === id);
  if (!q || q.abgeholt || statWert(q.stat) - q.start < q.ziel) return null;
  q.abgeholt = true;
  lohnGeben(q.lohn);
  return q;
}
export const questsOffen = () => { const q = quests(); return [...q.tag, ...q.woche].filter((x) => x.fertig && !x.abgeholt).length; };
// Für Hinweise: neu fertige Quests nur einmal melden
export function questsNeuFertig() {
  const q = quests();
  const gemeldet = (S.d.quests.gemeldet = S.d.quests.gemeldet || {});
  const neu = [];
  for (const [art, liste] of [['tag', q.tag], ['woche', q.woche]]) for (const x of liste) {
    const key = `${S.d.quests[art].datum}:${x.id}`;
    if (x.fertig && !x.abgeholt && !gemeldet[key]) { gemeldet[key] = true; neu.push(x); }
  }
  return neu;
}

// ---------- Goldene Stunde ----------
// Für alle Spieler gleich: Datum + Stunde entscheiden, ob gerade eine Goldene Stunde ist
export function goldeneStunde(d = new Date()) {
  const key = `${heute(d)}-${d.getHours()}`;
  const aktiv = new Rng('gold-' + key).next() < CONFIG.goldeneStunde.chance;
  const ende = new Date(d); ende.setMinutes(60, 0, 0);
  return { aktiv, mult: aktiv ? CONFIG.goldeneStunde.mult : 1, endeMs: ende - d };
}
export function naechsteGoldeneStunde(d = new Date()) {
  for (let h = 1; h <= 48; h++) {
    const t = new Date(d); t.setMinutes(0, 0, 0); t.setHours(t.getHours() + h);
    if (goldeneStunde(t).aktiv) return t;
  }
  return null;
}

// ---------- Element-Sets ----------
export function setStand(el) {
  const arten = REGULAERE_ARTEN.filter((a) => a.el === el);
  const gefunden = arten.filter((a) => (S.stapel.get(a.id)?.anzahl || 0) > 0 || S.d.sets?.[el]).length;
  return { gefunden: S.d.sets?.[el] ? arten.length : gefunden, gesamt: arten.length, fertig: !!S.d.sets?.[el] };
}
// Prüft neu vollständige Sets, vergibt Belohnung und merkt sie dauerhaft
export function setsPruefen() {
  S.d.sets = S.d.sets || {};
  const neu = [];
  for (let el = 0; el < ELEMENTE.length; el++) {
    if (S.d.sets[el]) continue;
    const arten = REGULAERE_ARTEN.filter((a) => a.el === el);
    if (arten.every((a) => (S.stapel.get(a.id)?.anzahl || 0) > 0)) {
      S.d.sets[el] = Date.now();
      lohnGeben({ ...CONFIG.elementSet.lohn, el });
      neu.push(el);
    }
  }
  return neu;
}
export const setBoni = () => Object.keys(S.d.sets || {}).map(Number);
