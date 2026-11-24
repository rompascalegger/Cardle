// Album: Stapel je Monster oder alle Einzelkarten, mit Filtern und Sortierung für jede Eigenschaft.
// Ausführungen (Holo × Looks) [FEST 11], Looks ab- und auftragen mit Staub, doppelte schwache Karten verkaufen.
import { CONFIG, KLASSEN, LOOKS, HOLO_NAMEN, HOLO_STUFEN } from '../config.js';
import { S, karte, lookAbtragen, lookAuftragen, verkaufen, doppelteFinden, wertVon, favoritUmschalten, speichernBald, spitzname, spitznameSetzen, SPITZNAME_MAX, tagVon, tagSetzen, verstaerken, verstaerkenKosten, neuWuerfeln, rerollKosten, ernten, ernteErtrag, ertragText } from '../state.js';
import { karteElement, stufenFarbe, stufenName, esc } from '../cardview.js';
import { ELEMENTE, glyphSVG, farbe } from '../elements.js';
import { ATTRIBUTE } from '../attributes.js';
import { EFFEKTE } from '../effects.js';
import { ARTEN, FORMEN, BAUPLAENE } from '../species.js';
import { Sound } from '../audio.js';
import { staerke, kosten, kartenSeltenheit, ausfuehrungAusKey, ausfuehrungsKey, staubBeimAbtragen, hatLook, dekodiere, verkaufswert } from '../rules.js';
import { h, modal, toast, ICON, fmt } from './dom.js';
import { karteVergroessern } from './lupe.js';

const STANDARD = {
  ansicht: 'monster', suche: '', el: -1, klMin: 0, klMax: KLASSEN.length - 1, stufeMin: 1, holo: 'alle', look: 'alle', fx: 'alle',
  rolle: 'alle', bauplan: 'alle', form: -1, attr: 'kraft', attrMin: 0, staerkeMin: 0, kostenMax: 0, fav: 'alle', tag: 'alle', team: 'alle', besitz: 'alle',
  sort: 'nr', ab: false, seite: 0, offen: false,
};
const F = { ...STANDARD };
const ALBUM_F = F;
export const FILTER_STANDARD = STANDARD;
const PRO_SEITE = { monster: 80, karten: 60 };
const LOOK_FARBEN = ['#7ad8ff', '#9a8cff', '#e8e8e8', '#5ffff0', '#ff9fcf'];
const LOOK_KURZ = ['↔', '↕', 'Inv', 'Gl', 'FD'];
const HOLO_KURZ = { reverse: 'RH', holo: 'H', secret: 'SH', ghost: 'GR' };
const AUSF_GESAMT = HOLO_STUFEN.length * 32;

export function staubHTML() {
  return `<span class="staub-chip kampf" data-tip="Kampfstaub: aus Kampagnen-Siegen und durch Ernten. Verstärkt Karten (+1 Stärke)." style="--sc:#ff9a3d">⚔<span>Kampf</span><b>${fmt(S.d.kampfstaub || 0)}</b></span><span class="staub-chip" data-tip="Glücksstaub: durch Ernten. Würfelt Karten neu, sie werden nie schwächer." style="--sc:#5ffff0">🎲<span>Glück</span><b>${fmt(S.d.gluecksstaub || 0)}</b></span>` + LOOKS.map((l, i) => `<span class="staub-chip" data-tip="${esc(l.staub)}" style="--sc:${LOOK_FARBEN[i]}">${ICON.staub}<span>${esc(l.kurz)}</span><b>${fmt(S.d.staub[l.key])}</b></span>`).join('');
}
function ausfName(holo, looks) {
  const teile = [];
  if (holo !== 'keins') teile.push(HOLO_NAMEN[holo]);
  LOOKS.forEach((l, i) => { if (looks & (1 << i)) teile.push(l.kurz); });
  return teile.length ? teile.join(' + ') : 'Normal';
}
function ausfKurz(holo, looks) {
  const teile = [];
  if (holo !== 'keins') teile.push(HOLO_KURZ[holo]);
  LOOKS.forEach((_, i) => { if (looks & (1 << i)) teile.push(LOOK_KURZ[i]); });
  return teile.length ? teile.join('+') : 'N';
}

// Alle Karten einmal entschlüsseln (für Filter und Sortierung)
// Suchtext: Name, Element, Rolle, Bauplan, Klasse, Holo und Effekte (Suche findet alles davon)
const SUCH_CACHE = new Map();
function suchText(art, c) {
  const basis = SUCH_CACHE.get(art.id) || `${art.name} ${ELEMENTE[art.el].name} ${CONFIG.rollen[art.rolle].name} ${art.bauplan} ${FORMEN[art.form]}`.toLowerCase();
  SUCH_CACHE.set(art.id, basis);
  return `${basis} ${KLASSEN[c.kl].name} ${c.holo !== 'keins' ? HOLO_NAMEN[c.holo] : ''} ${c.fx.map((id) => EFFEKTE.find((e) => e.id === id)?.name || '').join(' ')}`.toLowerCase();
}
// Daten für eine einzelne Karte ohne Sammlungsindex (z. B. Funde im Auto-Öffnen)
export function fundDaten(c) { const art = ARTEN[c.art]; return { i: -1, c, art, st: kartenSeltenheit(c), sum: staerke(c.a), kost: kosten(c), team: false, fav: false, ak: ausfuehrungsKey(c), such: suchText(art, c) }; }
export function datenLaden() {
  const team = new Set(S.d.team);
  const fav = new Set(S.d.favoriten);
  return S.karten.map((code, i) => {
    const c = dekodiere(code);
    const art = ARTEN[c.art];
    const nick = S.d.spitznamen?.[i] || '';
    return { i, c, art, nick, tag: S.d.tags?.[i] ?? null, st: kartenSeltenheit(c), sum: staerke(c.a), kost: kosten(c), team: team.has(i), fav: fav.has(i), ak: ausfuehrungsKey(c), such: suchText(art, c) + (nick ? ' ' + nick.toLowerCase() : '') };
  });
}

export function passt(x, F = ALBUM_F) {
  const c = x.c;
  if (F.suche && !F.suche.toLowerCase().split(/\s+/).filter(Boolean).every((w) => (x.such || x.art.name.toLowerCase()).includes(w))) return false;
  if (F.el >= 0 && x.art.el !== F.el) return false;
  if (c.kl < F.klMin || c.kl > F.klMax) return false;
  if (x.st < F.stufeMin) return false;
  if (F.holo === 'keins' && c.holo !== 'keins') return false;
  if (F.holo === 'irgendein' && c.holo === 'keins') return false;
  if (['reverse', 'holo', 'secret', 'ghost'].includes(F.holo) && c.holo !== F.holo) return false;
  if (F.look === 'keiner' && c.looks) return false;
  if (F.look === 'irgendein' && !c.looks) return false;
  if (/^\d$/.test(F.look) && !hatLook(c.looks, Number(F.look))) return false;
  if (F.fx === 'ohne' && c.fx.length) return false;
  if (F.fx === 'mit' && !c.fx.length) return false;
  if (/^\d+$/.test(F.fx) && !c.fx.includes(Number(F.fx))) return false;
  if (F.rolle !== 'alle' && x.art.rolle !== F.rolle) return false;
  if (F.bauplan !== 'alle' && x.art.bauplan !== F.bauplan) return false;
  if (F.form >= 0 && x.art.form !== F.form) return false;
  if (F.attrMin > 0 && (c.a[F.attr] || 0) < F.attrMin) return false;
  if (F.staerkeMin > 0 && x.sum < F.staerkeMin) return false;
  if (F.kostenMax > 0 && x.kost > F.kostenMax) return false;
  if (F.team === 'im' && !x.team) return false;
  if (F.team === 'nicht' && x.team) return false;
  if (F.fav === 'nur' && !x.fav) return false;
  if (F.fav === 'ohne' && x.fav) return false;
  if (F.tag === 'ohne' && x.tag != null) return false;
  if (F.tag === 'mit' && x.tag == null) return false;
  if (/^\d$/.test(F.tag) && x.tag !== Number(F.tag)) return false;
  return true;
}
const kartenFilterAktiv = () => ['suche', 'klMin', 'klMax', 'stufeMin', 'holo', 'look', 'fx', 'attrMin', 'staerkeMin', 'kostenMax', 'team', 'fav', 'tag'].some((k) => F[k] !== STANDARD[k]);

export const SORTEN = [
  ['nr', 'Nummer'], ['name', 'Name'], ['element', 'Element'], ['rolle', 'Rolle'], ['tag', 'Tag'], ['staerke', 'Stärke'], ['klasse', 'Klasse'], ['seltenheit', 'Seltenheit'],
  ['kosten', 'Beschwörungskosten'], ['wert', 'Verkaufswert'], ['neu', 'Neueste'],
  ...ATTRIBUTE.map((a) => ['attr:' + a.key, a.name]),
  ['anzahl', 'Anzahl (Monster)'], ['ausf', 'Ausführungen (Monster)'],
];
export function kartenWert(x, F = ALBUM_F) {
  switch (F.sort) {
    case 'name': return x.art.name;
    case 'element': return x.art.el;
    case 'staerke': return x.sum;
    case 'klasse': return x.c.kl * 1000 + x.sum;
    case 'seltenheit': return x.st * 100000 + x.c.kl * 1000 + x.sum;
    case 'kosten': return x.kost;
    case 'wert': return verkaufswert(x.c);
    case 'neu': return x.i;
    case 'rolle': return Object.keys(CONFIG.rollen).indexOf(x.art.rolle) * 1000 + x.sum;
    case 'tag': return (x.tag ?? CONFIG.tags.length) * 1000 + x.st * 100 + x.sum; // ohne Tag ans Ende (aufsteigend)
    default:
      if (F.sort.startsWith('attr:')) return x.c.a[F.sort.slice(5)] || 0;
      return x.art.id;
  }
}
export const vergleich = (a, b) => (typeof a === 'string' ? a.localeCompare(b, 'de') : a - b);

// Sicherheitsabfrage: Sind Karten mit Spezialeffekt dabei, muss „VERKAUFEN“ eingetippt werden. [Nutzer, 23.11.2026]
const SICHERHEITSWORT = 'VERKAUFEN';
export function sicherVerkaufen(indizes, weiter) {
  const mitEffekt = indizes.filter((i) => dekodiere(S.karten[i]).fx.length);
  if (!mitEffekt.length) { weiter(); return; }
  const eingabe = h('input', { type: 'text', class: 'sicher-eingabe', autocomplete: 'off', spellcheck: false, placeholder: SICHERHEITSWORT });
  let knopf = null;
  const pruefe = () => { if (knopf) knopf.disabled = eingabe.value.trim().toUpperCase() !== SICHERHEITSWORT; };
  eingabe.addEventListener('input', pruefe);
  eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter' && knopf && !knopf.disabled) knopf.click(); });
  const namen = mitEffekt.slice(0, 6).map((i) => { const c = dekodiere(S.karten[i]); return `<li><b>${esc(ARTEN[c.art].name)}</b> · ${c.fx.map((id) => esc(EFFEKTE.find((e) => e.id === id)?.name || '?')).join(', ')}</li>`; }).join('');
  const m = modal({
    titel: 'Spezialeffekt-Karten verkaufen?',
    inhalt: h('div', { class: 'sicher-box' },
      h('p', { html: `Du verkaufst <b>${fmt(mitEffekt.length)}</b> ${mitEffekt.length === 1 ? 'Karte' : 'Karten'} mit Spezialeffekt. Effekte sind sehr selten und gehen beim Verkauf für immer verloren.` }),
      h('ul', { html: namen + (mitEffekt.length > 6 ? `<li>… und ${fmt(mitEffekt.length - 6)} weitere</li>` : '') }),
      h('p', { html: `Tippe <b>${SICHERHEITSWORT}</b>, um zu bestätigen:` }), eingabe),
    knoepfe: [{ text: 'Abbrechen' }, { text: 'Endgültig verkaufen', klasse: 'gefahr', aktion: () => { if (eingabe.value.trim().toUpperCase() !== SICHERHEITSWORT) return false; weiter(); } }],
  });
  knopf = m.box.querySelector('.modal-fuss .gefahr');
  pruefe();
  setTimeout(() => eingabe.focus(), 50);
}

// Listenansicht [Nutzer, 24.11.2026]: eine Zeile je Karte statt Kartenbild. Umschalter gilt überall (gespeichert).
export const listenAnsicht = () => !!S.d.einst.listenAnsicht;
export function ansichtUmschalter(neu) {
  const an = listenAnsicht();
  return h('div', { class: 'ansicht-umschalter', role: 'group', 'aria-label': 'Ansicht' },
    h('button', { class: an ? '' : 'an', title: 'Kartenansicht', text: '▦', onclick: () => { if (!an) return; S.d.einst.listenAnsicht = false; speichernBald(); neu(); } }),
    h('button', { class: an ? 'an' : '', title: 'Listenansicht', text: '☰', onclick: () => { if (an) return; S.d.einst.listenAnsicht = true; speichernBald(); neu(); } }));
}
export function listenKopf() {
  return h('div', { class: 'karten-zeile kopf', html: '<span></span><span></span><span>Name</span><span>Element</span><span>Rolle</span><span>Klasse</span><span>Stärke</span><span>Kosten</span><span>Seltenheit</span><span>Effekte</span><span>Ausführung</span>' });
}
// Eine Zeile für eine Karte (x aus datenLaden). extra: zusätzlicher Text (z. B. Anzahl), stern: Favoriten-Knopf
export function kartenZeile(x, { onclick, extra = '', stern = null, klasse = '' } = {}) {
  const c = x.c;
  const fx = c.fx.map((id, i) => { const st = c.fxs?.[i] || 1; const e = EFFEKTE.find((q) => q.id === id); return `<i style="color:${CONFIG.effektStufen.farben[st - 1]}" title="${esc(e?.name || '')}">${e?.blitz ? '⚡' : '✦'}</i>`; }).join('');
  const z = h('div', { class: `karten-zeile kl-${KLASSEN[c.kl].key} ${klasse}`, tabindex: 0, role: 'button',
    html: `<span class="kz-el" style="--el:${farbe(x.art.el)}">${glyphSVG(x.art.el)}</span><b>${x.tag != null ? `<i class="tag-punkt" style="--tag:${CONFIG.tags[x.tag].farbe}" title="Tag: ${CONFIG.tags[x.tag].name}"></i>` : ''}${x.nick ? `„${esc(x.nick)}“ <small>${esc(x.art.name)}</small>` : esc(x.art.name)}${x.team ? ' <em class="kz-team">TEAM</em>' : ''}${extra ? ` <small>${esc(extra)}</small>` : ''}</b><span>${esc(ELEMENTE[x.art.el].name)}</span><span>${esc(CONFIG.rollen[x.art.rolle].name)}</span><span class="kz-kl"><i class="kl-punkt kl-${KLASSEN[c.kl].key}"></i>${KLASSEN[c.kl].name}</span><span><b>${x.sum}</b></span><span>${ICON.beschwoerung}${x.kost}</span><span style="color:${stufenFarbe(x.st)}">${esc(stufenName(x.st))}</span><span class="kz-fx">${fx || '–'}</span><span>${esc(ausfName(c.holo, c.looks))}</span>` });
  z.prepend(stern || h('span', { class: 'kz-stern' }));
  if (onclick) { z.addEventListener('click', onclick); z.addEventListener('keydown', (e) => { if (e.key === 'Enter') onclick(e); }); }
  return z;
}

// Verbessern für jede Karte [Nutzer, 24.11.2026]: Verstärken (Kampfstaub), Neu würfeln (Glücksstaub), Ernten.
// geaendert: nach Verstärken/Neu würfeln, weg: nach dem Ernten (Karte existiert nicht mehr)
export function verbessernBox(i, geaendert, weg) {
  const c = karte(i);
  const imTeam = S.d.team.includes(i);
  const box = h('div', { class: 'verbessern' });
  const zeichne = () => {
    const c = karte(i);
    const vk = verstaerkenKosten(i), rk = rerollKosten(i);
    const attrWahl = h('select', {}, ATTRIBUTE.map((at) => h('option', { value: at.key, text: `${at.name} (${c.a[at.key] || 0})`, selected: at.key === (VB.attr || 'kraft') })));
    attrWahl.addEventListener('change', () => { VB.attr = attrWahl.value; });
    const ernteKnopf = h('button', { class: 'btn klein gefahr', disabled: imTeam, text: imTeam ? 'Im Team, nicht erntbar' : `🌾 Ernten: ${ertragText(ernteErtrag(i))}` });
    ernteKnopf.addEventListener('click', () => {
      sicherErnten([i], () => { const r = ernten([i]); if (!r) return; Sound.muenze(); toast(`Geerntet: +${fmt(r.kampfstaub)} Kampfstaub, +${fmt(r.gluecksstaub)} Glücksstaub`); weg && weg(); });
    });
    box.replaceChildren(
      h('h4', { html: `Verbessern <small class="leise">⚔ ${fmt(S.d.kampfstaub || 0)} Kampfstaub · 🎲 ${fmt(S.d.gluecksstaub || 0)} Glücksstaub</small>` }),
      h('div', { class: 'vb-zeile' }, attrWahl, h('button', { class: 'btn klein', disabled: (S.d.kampfstaub || 0) < vk, html: `⚔ +1 verstärken · ${fmt(vk)}`, title: `Kostet aufgerundet 1,1^Stärke Kampfstaub (du hast ${fmt(S.d.kampfstaub || 0)})`,
        onclick: () => { const r = verstaerken(i, attrWahl.value); if (!r) { toast('Zu wenig Kampfstaub.'); return; } Sound.stufe(3); toast(`Verstärkt: ${ATTRIBUTE.find((x) => x.key === attrWahl.value).name} ${r.wert} (−${fmt(r.preis)} Kampfstaub)`); zeichne(); geaendert && geaendert(); } })),
      h('div', { class: 'vb-zeile' }, h('button', { class: 'btn klein', disabled: (S.d.gluecksstaub || 0) < rk, html: `🎲 Neu würfeln · ${fmt(rk)} Glücksstaub`, title: 'Würfelt die Stärke neu. Bisherige Attributpunkte bleiben, zusätzliche Stärke kommt dazu. Die Karte wird nie schwächer, die Klasse kann steigen (bis Brilliant), neue Effekte sind möglich.',
        onclick: () => {
          const r = neuWuerfeln(i);
          if (!r) { toast('Zu wenig Glücksstaub.'); return; }
          const auf = r.nachher.kl > r.vorher.kl;
          if (auf || r.neuerEffekt) { Sound.jackpot(r.nachher.kl >= 7 ? 6 : 3); konfettiWenn(r.nachher.kl); } else Sound.stufe(2);
          toast(`${auf ? `<b>Aufstieg: ${KLASSEN[r.vorher.kl].name} → ${KLASSEN[r.nachher.kl].name}!</b> ` : ''}Stärke ${r.vorher.staerke} → ${r.nachher.staerke}${r.neuerEffekt ? ` · <b>neuer Effekt: ${esc(EFFEKTE.find((e) => e.id === r.neuerEffekt).name)}</b>` : ''}`);
          zeichne(); geaendert && geaendert();
        } })),
      h('div', { class: 'vb-zeile' }, ernteKnopf),
      h('p', { class: 'leise klein', text: 'Ernten zerstört die Karte: je Klassennummer × Stärke Kampfstaub und Glücksstaub, dazu Look-Staub für jeden Look.' }));
  };
  zeichne();
  return box;
}
const VB = {};
// Dialog: Karte groß und Verbessern daneben
export function verbessernDialog(i, nachher) {
  const platz = h('div', { class: 'vb-karte' });
  const zeigeKarte = () => { const el = karteElement(karte(i), { maxNeigung: 14 }); platz.replaceChildren(el); };
  zeigeKarte();
  let m = null;
  const box = verbessernBox(i, () => { zeigeKarte(); nachher && nachher(); }, () => { m.zu(); nachher && nachher(); });
  m = modal({ titel: `⬆ ${esc(spitzname(i) || ARTEN[karte(i).art].name)} verbessern`, klasse: 'breit', inhalt: h('div', { class: 'vb-dialog' }, platz, box) });
}

// Sicherheitsabfrage beim Ernten [Nutzer, 24.11.2026]: Favoriten und Effektkarten nur nach Eintippen von „ERNTEN“
export function sicherErnten(indizes, weiter) {
  const kritisch = indizes.filter((i) => S.d.favoriten.includes(i) || dekodiere(S.karten[i]).fx.length);
  if (!kritisch.length) { weiter(); return; }
  const WORT = 'ERNTEN';
  const eingabe = h('input', { type: 'text', class: 'sicher-eingabe', autocomplete: 'off', spellcheck: false, placeholder: WORT });
  let knopf = null;
  const pruefe = () => { if (knopf) knopf.disabled = eingabe.value.trim().toUpperCase() !== WORT; };
  eingabe.addEventListener('input', pruefe);
  eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter' && knopf && !knopf.disabled) knopf.click(); });
  const namen = kritisch.slice(0, 6).map((i) => { const c = dekodiere(S.karten[i]); return `<li><b>${esc(spitzname(i) || ARTEN[c.art].name)}</b>${S.d.favoriten.includes(i) ? ' · ★ Favorit' : ''}${c.fx.length ? ` · ${c.fx.length} Effekt${c.fx.length > 1 ? 'e' : ''}` : ''}</li>`; }).join('');
  const m = modal({
    titel: 'Wirklich ernten?',
    inhalt: h('div', { class: 'sicher-box' },
      h('p', { html: `Ernten <b>zerstört</b> ${kritisch.length === 1 ? 'diese Karte' : 'diese Karten'} für immer, darunter Favoriten oder Effektkarten:` }),
      h('ul', { html: namen + (kritisch.length > 6 ? `<li>… und ${fmt(kritisch.length - 6)} weitere</li>` : '') }),
      h('p', { html: `Tippe <b>${WORT}</b>, um zu bestätigen:` }), eingabe),
    knoepfe: [{ text: 'Abbrechen' }, { text: 'Endgültig ernten', klasse: 'gefahr', aktion: () => { if (eingabe.value.trim().toUpperCase() !== WORT) return false; weiter(); } }],
  });
  knopf = m.box.querySelector('.modal-fuss .gefahr');
  pruefe();
  setTimeout(() => eingabe.focus(), 50);
}
const konfettiWenn = (kl) => { if (kl >= 6) import('./dom.js').then((d) => d.konfetti(kl >= 8 ? 260 : 120)); };

// Farb-Tag wählen [Nutzer, 24.11.2026]: 10 Farben oder kein Tag
export function tagWahl(i, fertig) {
  const jetzt = tagVon(i);
  const waehle = (t) => { tagSetzen(i, t); m.zu(); fertig && fertig(t); };
  const m = modal({
    titel: 'Tag wählen',
    inhalt: h('div', { class: 'tag-wahl' },
      ...CONFIG.tags.map((t, n) => h('button', { class: 'tag-knopf' + (jetzt === n ? ' an' : ''), style: `--tag:${t.farbe}`, title: t.name, onclick: () => waehle(n) }, h('i', { class: 'tag-punkt gross' }), h('span', { text: t.name }))),
      h('button', { class: 'tag-knopf kein' + (jetzt == null ? ' an' : ''), onclick: () => waehle(null) }, h('span', { text: 'Kein Tag' }))),
  });
}

// Spitzname setzen [Nutzer, 24.11.2026]: im Kampf erscheint er statt des Monsternamens
export function spitznameDialog(i, fertig) {
  const c = karte(i);
  const eingabe = h('input', { type: 'text', class: 'such-feld spitzname-feld', maxlength: SPITZNAME_MAX, value: spitzname(i), placeholder: ARTEN[c.art].name, autocomplete: 'off', spellcheck: false });
  const speichern = () => { const n = spitznameSetzen(i, eingabe.value); toast(n ? `Spitzname: „${esc(n)}“` : 'Spitzname entfernt'); fertig && fertig(n); };
  eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') { speichern(); m.zu(); } });
  const m = modal({
    titel: `Spitzname für ${esc(ARTEN[c.art].name)}`,
    inhalt: h('div', {}, h('p', { class: 'leise', text: `Im Kampf, im Protokoll und im Album steht der Spitzname statt des Monsternamens. Höchstens ${SPITZNAME_MAX} Zeichen, leer lassen zum Entfernen.` }), eingabe),
    knoepfe: [{ text: 'Abbrechen' }, ...(spitzname(i) ? [{ text: 'Entfernen', aktion: () => { eingabe.value = ''; speichern(); } }] : []), { text: 'Speichern', klasse: 'primaer', aktion: speichern }],
  });
  setTimeout(() => { eingabe.focus(); eingabe.select(); }, 60);
}

// Sichtbares Suchfeld (Name, Element, Rolle, Bauplan, Klasse, Holo, Effekte). Behält den Fokus beim Tippen.
export function suchFeld(F, neu, platzhalter = 'Suchen: Name, Element, Rolle, Effekt …') {
  const i = h('input', { type: 'search', class: 'such-feld', value: F.suche || '', placeholder: platzhalter, 'aria-label': 'Suchen' });
  let t = null;
  i.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { F.suche = i.value; F.seite = 0; neu(); }, 120); });
  return i;
}

// Übersicht der aktiven Filter als Chips, jeder mit × zum Entfernen [Spielerfeedback 24.11.2026]
export function filterChips(F, standard, neu) {
  const name = (liste, v) => (liste.find(([k]) => String(k) === String(v)) || [, v])[1];
  const holo = [['keins', 'ohne Holo'], ['irgendein', 'mit Holo'], ['reverse', 'Reverse Holo'], ['holo', 'Holo'], ['secret', 'Secret Holo'], ['ghost', 'Ghost Rare']];
  const chips = [];
  const chip = (text, ...keys) => chips.push(h('button', { class: 'filter-chip', title: 'Filter entfernen', onclick: () => { for (const k of keys) F[k] = standard[k]; F.seite = 0; neu(); } }, h('span', { text }), h('b', { text: '×' })));
  if (F.suche) chip(`Name: „${F.suche}“`, 'suche');
  if (F.el !== standard.el) chip(`Element: ${ELEMENTE[F.el].name}`, 'el');
  if (F.klMin !== standard.klMin || F.klMax !== standard.klMax) chip(F.klMin === F.klMax ? `Klasse: ${KLASSEN[F.klMin].name}` : `Klasse: ${KLASSEN[F.klMin].name}–${KLASSEN[F.klMax].name}`, 'klMin', 'klMax');
  if (F.stufeMin !== standard.stufeMin) chip(`Seltenheit ab ${CONFIG.seltenheit.namen[F.stufeMin - 1]}`, 'stufeMin');
  if (F.holo !== standard.holo) chip(name(holo, F.holo), 'holo');
  if (F.look !== standard.look) chip(F.look === 'keiner' ? 'ohne Look' : F.look === 'irgendein' ? 'mit Look' : `Look: ${LOOKS[Number(F.look)].name}`, 'look');
  if (F.fx !== standard.fx) chip(F.fx === 'ohne' ? 'ohne Effekt' : F.fx === 'mit' ? 'mit Effekt' : `Effekt: ${EFFEKTE.find((e) => String(e.id) === F.fx)?.name}`, 'fx');
  if (F.rolle !== standard.rolle) chip(`Rolle: ${CONFIG.rollen[F.rolle]?.name}`, 'rolle');
  if (F.bauplan !== standard.bauplan) chip(`Bauplan: ${F.bauplan[0].toUpperCase() + F.bauplan.slice(1)}`, 'bauplan');
  if (F.form !== standard.form) chip(`Entwicklung: ${FORMEN[F.form]}`, 'form');
  if (F.attrMin !== standard.attrMin) chip(`${ATTRIBUTE.find((a) => a.key === F.attr)?.name} ≥ ${F.attrMin}`, 'attrMin');
  if (F.staerkeMin !== standard.staerkeMin) chip(`Stärke ≥ ${F.staerkeMin}`, 'staerkeMin');
  if (F.kostenMax !== standard.kostenMax) chip(`Kosten ≤ ${F.kostenMax}`, 'kostenMax');
  if (F.fav !== standard.fav) chip(F.fav === 'nur' ? '★ nur Favoriten' : 'ohne Favoriten', 'fav');
  if (F.tag !== standard.tag && F.tag != null) chip(F.tag === 'mit' ? 'mit Tag' : F.tag === 'ohne' ? 'ohne Tag' : `Tag: ${CONFIG.tags[Number(F.tag)].name}`, 'tag');
  if (F.team !== standard.team) chip(F.team === 'im' ? 'im Team' : 'nicht im Team', 'team');
  if (F.besitz !== standard.besitz) chip(F.besitz === 'entdeckt' ? 'nur entdeckte' : 'nur fehlende', 'besitz');
  if (!chips.length) return null;
  return h('div', { class: 'filter-chips' }, h('span', { class: 'leise', text: 'Aktive Filter:' }), ...chips,
    chips.length > 1 ? h('button', { class: 'filter-chip alle', text: 'Alle entfernen', onclick: () => { for (const k of Object.keys(standard)) if (!['sort', 'ab', 'offen', 'seite', 'ansicht'].includes(k)) F[k] = standard[k]; F.seite = 0; neu(); } }) : null);
}

// Filterfelder für jede Karteneigenschaft (Album und Team nutzen dieselben). neu() zeichnet die Liste neu.
export function filterFelder(F, neu, { ohne = [] } = {}) {
  const geaendert = () => { F.seite = 0; neu(); };
  const sel = (key, optionen, zahl = false) => h('select', {
    onchange: (e) => { F[key] = zahl ? Number(e.target.value) : e.target.value; geaendert(); },
  }, optionen.map(([v, t]) => h('option', { value: v, selected: F[key] === v, text: t })));
  const feld = (titel, ...inhalt) => (ohne.includes(titel) ? null : h('label', {}, h('span', { text: titel }), ...inhalt));
  const suche = h('input', { type: 'search', value: F.suche, placeholder: 'Name …' });
  suche.addEventListener('input', () => { F.suche = suche.value; geaendert(); });
  const zahl = (key, max) => { const i = h('input', { type: 'number', min: 0, max, value: F[key] }); i.addEventListener('change', () => { F[key] = Math.max(0, Number(i.value) || 0); geaendert(); }); return i; };
  return h('div', { class: 'sm-filterbox' },
    feld('Name', suche),
    feld('Element', sel('el', [[-1, 'Alle'], ...ELEMENTE.map((e, i) => [i, e.name])], true)),
    feld('Klasse von – bis', h('div', { class: 'doppel' }, sel('klMin', KLASSEN.map((k, i) => [i, k.name]), true), sel('klMax', KLASSEN.map((k, i) => [i, k.name]), true))),
    feld('Seltenheit ab', sel('stufeMin', CONFIG.seltenheit.namen.map((n, i) => [i + 1, n]), true)),
    feld('Holo-Stufe', sel('holo', [['alle', 'Alle'], ['keins', 'ohne Holo'], ['irgendein', 'mit Holo'], ['reverse', 'Reverse Holo'], ['holo', 'Holo'], ['secret', 'Secret Holo'], ['ghost', 'Ghost Rare']])),
    feld('Zusatzlook', sel('look', [['alle', 'Alle'], ['keiner', 'ohne Look'], ['irgendein', 'mit Look'], ...LOOKS.map((l, i) => [String(i), l.name])])),
    feld('Spezialeffekt', sel('fx', [['alle', 'Alle'], ['ohne', 'ohne Effekt'], ['mit', 'mit Effekt'], ...EFFEKTE.map((e) => [String(e.id), e.name])])),
    feld('Rolle', sel('rolle', [['alle', 'Alle'], ...Object.entries(CONFIG.rollen).map(([k, r]) => [k, r.name])])),
    feld('Bauplan', sel('bauplan', [['alle', 'Alle'], ...BAUPLAENE.map((b) => [b, b[0].toUpperCase() + b.slice(1)])])),
    feld('Entwicklung', sel('form', [[-1, 'Alle'], ...FORMEN.map((f, i) => [i, f])], true)),
    feld('Attribut mindestens', h('div', { class: 'doppel' }, sel('attr', ATTRIBUTE.map((a) => [a.key, a.name])), zahl('attrMin', 99))),
    feld('Stärke mindestens', zahl('staerkeMin', 200)),
    feld('Kosten höchstens', zahl('kostenMax', 999)),
    feld('Favoriten', sel('fav', [['alle', 'Alle'], ['nur', '★ nur Favoriten'], ['ohne', 'ohne Favoriten']])),
    feld('Tag', sel('tag', [['alle', 'Alle'], ['mit', 'mit Tag'], ['ohne', 'ohne Tag'], ...CONFIG.tags.map((t, i) => [String(i), `● ${t.name}`])])),
    feld('Team', sel('team', [['alle', 'Alle'], ['im', 'im Team'], ['nicht', 'nicht im Team']])),
    feld('Monster', sel('besitz', [['alle', 'Alle'], ['entdeckt', 'nur entdeckte'], ['fehlend', 'nur fehlende']])),
  );
}

export function sammlungScreen(root) {
  const wrap = h('section', { class: 'screen sammlung' });
  const kopf = h('div', { class: 'panel sm-kopf' });
  const seitenOben = h('div', { class: 'seiten' });
  const grid = h('div', { class: 'sm-grid' });
  const seitenUnten = h('div', { class: 'seiten' });
  const favBox = h('div', { class: 'panel sm-favoriten' });
  wrap.append(kopf, favBox, seitenOben, grid, seitenUnten);
  root.append(wrap);
  let daten = datenLaden();
  const neuLaden = () => { daten = datenLaden(); zeichneKopf(); zeichneFavoriten(); zeichneGrid(); };
  // Favoriten zuoberst [Nutzer, 24.11.2026]: alle Favoritenkarten, einklappbar, Stern zum Entfernen
  const zeichneFavoriten = () => {
    // Alle Favoritenkarten einzeln (auch mehrere vom selben Monster), nach Tag gruppiert, darin nach Seltenheit
    const favs = daten.filter((x) => x.fav).sort((a, b) => (a.tag ?? 99) - (b.tag ?? 99) || b.st - a.st || b.c.kl - a.c.kl || b.sum - a.sum);
    favBox.hidden = !favs.length;
    if (!favs.length) { favBox.replaceChildren(); return; }
    favBox.replaceChildren(
      h('button', { class: 'sm-fav-kopf', onclick: () => { F.favZu = !F.favZu; zeichneFavoriten(); } }, h('h3', { text: `★ Favoriten (${favs.length})` }), h('span', { class: 'leise', text: F.favZu ? 'anzeigen ▾' : 'einklappen ▴' })),
      F.favZu ? '' : h('div', { class: 'fav-gruppen' }, ...[...new Set(favs.map((x) => x.tag ?? -1))].map((t) => {
        const gruppe = favs.filter((x) => (x.tag ?? -1) === t);
        return h('div', { class: 'fav-gruppe' },
          h('h4', { html: t >= 0 ? `<i class="tag-punkt" style="--tag:${CONFIG.tags[t].farbe}"></i>${CONFIG.tags[t].name} · ${gruppe.length}` : `Ohne Tag · ${gruppe.length}` }),
          h('div', { class: 'sm-grid fav-grid' + (listenAnsicht() ? ' als-liste' : '') }, ...(listenAnsicht() ? [listenKopf()] : []), ...gruppe.map((x) => kartenKachel(x))));
      })),
    );
  };
  // Favorit direkt auf der Kachel umschalten, ohne das Popup zu öffnen
  const favStern = (x) => h('button', {
    class: 'fav-toggle' + (x.fav ? ' an' : ''), title: x.fav ? 'Favorit entfernen' : 'Als Favorit merken', text: x.fav ? '★' : '☆',
    onclick: (e) => { e.stopPropagation(); favoritUmschalten(x.i); Sound.klick(); neuLaden(); },
  });

  const sel = (key, optionen, zahl = false, nachher) => h('select', {
    onchange: (e) => { F[key] = zahl ? Number(e.target.value) : e.target.value; F.seite = 0; nachher ? nachher() : zeichneGrid(); },
  }, optionen.map(([v, t]) => h('option', { value: v, selected: F[key] === v, text: t })));
  const feld = (titel, ...inhalt) => h('label', {}, h('span', { text: titel }), ...inhalt);

  const zeichneKopf = () => {
    const entdeckt = [...S.stapel.values()].filter((s) => s.anzahl > 0).length;
    let ausf = 0;
    for (const s of S.stapel.values()) ausf += s.ausf.size;
    kopf.replaceChildren(
      h('div', { class: 'sm-stats', html: `<h2>Album</h2><span><b>${fmt(S.karten.length)}</b> Karten</span><span><b>${entdeckt}</b>/${ARTEN.length} Monster</span><span><b>${fmt(ausf)}</b> Ausführungen</span>` }),
      h('div', { class: 'staub-leiste', html: staubHTML() }),
      h('div', { class: 'sm-leiste' },
        h('div', { class: 'sm-ansicht' }, [['monster', 'Monster'], ['karten', 'Alle Karten']].map(([v, t]) => h('button', { class: F.ansicht === v ? 'an' : '', text: t, onclick: () => { F.ansicht = v; F.seite = 0; zeichneKopf(); zeichneGrid(); } }))),
        ansichtUmschalter(() => { zeichneKopf(); zeichneFavoriten(); zeichneGrid(); }),
        suchFeld(F, () => { zeichneGrid(); chipsNeu(); }),
        sel('sort', SORTEN, false),
        h('button', { class: 'btn klein', text: F.ab ? '↓ absteigend' : '↑ aufsteigend', onclick: () => { F.ab = !F.ab; zeichneKopf(); zeichneGrid(); } }),
        h('button', { class: 'btn klein' + (F.offen ? ' an' : ''), text: kartenFilterAktiv() || F.el >= 0 ? 'Filter ●' : 'Filter', onclick: () => { F.offen = !F.offen; zeichneKopf(); zeichneGrid(); } }),
        h('button', { class: 'btn klein', text: 'Zurücksetzen', onclick: () => { Object.assign(F, { ...STANDARD, ansicht: F.ansicht, offen: F.offen }); zeichneKopf(); zeichneGrid(); } }),
        h('button', { class: 'btn klein', html: `${ICON.muenze} Doppelte verkaufen …`, onclick: () => verkaufsDialog(neuLaden) }),
        h('button', { class: 'btn klein ernte-btn', text: '🌾 Doppelte ernten …', onclick: () => ernteDoppelteDialog(neuLaden) }),
        h('span', { class: 'treffer' })),
      F.offen ? filterBox() : '',
      filterChips(F, STANDARD, () => { zeichneKopf(); zeichneGrid(); }) || '',
    );
  };
  const chipsNeu = () => { const alt = kopf.querySelector('.filter-chips'); const neu = filterChips(F, STANDARD, () => { zeichneKopf(); zeichneGrid(); }); if (alt) alt.replaceWith(neu || h('span')); else if (neu) kopf.append(neu); };
  const filterBox = () => filterFelder(F, () => { zeichneGrid(); chipsNeu(); }, { ohne: ['Name'] });

  const zeichneGrid = () => {
    const treffer = daten.filter((x) => passt(x));
    const richtung = F.ab ? -1 : 1;
    let kacheln, gesamt, text;
    if (F.ansicht === 'karten') {
      treffer.sort((a, b) => richtung * vergleich(kartenWert(a), kartenWert(b)) || a.i - b.i);
      gesamt = treffer.length;
      text = `${fmt(gesamt)} Karten`;
      const seite = seiteBerechnen(gesamt);
      kacheln = treffer.slice(seite * PRO_SEITE.karten, (seite + 1) * PRO_SEITE.karten).map((x) => kartenKachel(x));
    } else {
      const proArt = new Map();
      for (const x of treffer) { if (!proArt.has(x.art.id)) proArt.set(x.art.id, []); proArt.get(x.art.id).push(x); }
      const artFilter = (a) => (F.el < 0 || a.el === F.el) && (F.rolle === 'alle' || a.rolle === F.rolle) && (F.bauplan === 'alle' || a.bauplan === F.bauplan) && (F.form < 0 || a.form === F.form) && (!F.suche || a.name.toLowerCase().includes(F.suche.toLowerCase()));
      let arten = ARTEN.filter((a) => {
        const hat = (S.stapel.get(a.id)?.anzahl || 0) > 0;
        if (F.besitz === 'fehlend') return !hat && artFilter(a);
        if (proArt.has(a.id)) return true;
        return !hat && F.besitz === 'alle' && !kartenFilterAktiv() && artFilter(a);
      });
      const beste = (a) => { const l = proArt.get(a.id); if (!l) return null; return l.reduce((m, x) => (vergleich(kartenWert(x), kartenWert(m)) * (F.sort === 'nr' || F.sort === 'name' || F.sort === 'element' ? 0 : 1) > 0 || (x.st * 1e5 + x.c.kl * 1e3 + x.sum > m.st * 1e5 + m.c.kl * 1e3 + m.sum && F.sort.match(/^(nr|name|element|anzahl|ausf)$/)) ? x : m), l[0]); };
      const artWert = (a) => {
        if (F.sort === 'name') return a.name;
        if (F.sort === 'element') return a.el * 1000 + a.id;
        if (F.sort === 'nr') return a.id;
        if (F.sort === 'anzahl') return proArt.get(a.id)?.length || 0;
        if (F.sort === 'ausf') return S.stapel.get(a.id)?.ausf.size || 0;
        const b = beste(a);
        return b ? kartenWert(b) : -Infinity;
      };
      arten.sort((a, b) => richtung * vergleich(artWert(a), artWert(b)) || a.id - b.id);
      gesamt = arten.length;
      text = `${fmt(gesamt)} Monster · ${fmt(treffer.length)} Karten`;
      const seite = seiteBerechnen(gesamt);
      kacheln = arten.slice(seite * PRO_SEITE.monster, (seite + 1) * PRO_SEITE.monster).map((a) => monsterKachel(a, proArt.get(a.id) || [], beste(a)));
    }
    grid.classList.toggle('als-liste', listenAnsicht());
    grid.replaceChildren(...(listenAnsicht() && kacheln.length ? [listenKopf()] : []), ...kacheln);
    if (!kacheln.length) grid.append(h('p', { class: 'leise', text: S.karten.length ? 'Keine Karten passen zu diesen Filtern.' : 'Noch keine Karten. Öffne zuerst ein paar Packs.' }));
    const t = kopf.querySelector('.treffer');
    if (t) t.textContent = text;
    const leiste = () => {
      const seiten = Math.max(1, Math.ceil(gesamt / PRO_SEITE[F.ansicht]));
      return seiten > 1 ? [
        h('button', { class: 'btn klein', disabled: F.seite === 0, text: '‹', onclick: () => { F.seite--; zeichneGrid(); } }),
        h('span', { text: `Seite ${F.seite + 1} / ${seiten}` }),
        h('button', { class: 'btn klein', disabled: F.seite >= seiten - 1, text: '›', onclick: () => { F.seite++; zeichneGrid(); } }),
      ] : [];
    };
    seitenOben.replaceChildren(...leiste());
    seitenUnten.replaceChildren(...leiste());
  };
  const seiteBerechnen = (gesamt) => { const seiten = Math.max(1, Math.ceil(gesamt / PRO_SEITE[F.ansicht])); F.seite = Math.max(0, Math.min(F.seite, seiten - 1)); return F.seite; };

  const versionen = (artId) => {
    const s = S.stapel.get(artId);
    if (!s) return '';
    const liste = [...s.ausf.entries()].sort((x, y) => y[0] - x[0]);
    const chips = liste.slice(0, 6).map(([k, n]) => {
      const { holo, looks } = ausfuehrungAusKey(k);
      return `<span class="${holo !== 'keins' ? holo : looks ? 'look' : ''}" data-tip="${esc(ausfName(holo, looks))}: ${n}×">${esc(ausfKurz(holo, looks))}${n > 1 ? ` ×${n}` : ''}</span>`;
    }).join('');
    return chips + (liste.length > 6 ? `<span>+${liste.length - 6}</span>` : '');
  };

  const monsterKachel = (a, liste, best) => {
    const s = S.stapel.get(a.id);
    if (listenAnsicht()) {
      if (!best) return h('div', { class: 'karten-zeile leer', html: `<span class="kz-stern"></span><span class="kz-el" style="--el:${farbe(a.el)}">${glyphSVG(a.el)}</span><b>??? <small>#${String(a.id + 1).padStart(3, '0')}</small></b><span>${esc(ELEMENTE[a.el].name)}</span><span>${esc(CONFIG.rollen[a.rolle].name)}</span><span class="leise">noch nicht entdeckt</span>` });
      return kartenZeile({ ...best, team: liste.some((x) => x.team) }, { onclick: () => kartenPopup(a.id, best.i), extra: `×${liste.length} · ${s.ausf.size} Ausf.`, stern: liste.some((x) => x.fav) ? h('span', { class: 'kz-stern an', text: '★' }) : h('span', { class: 'kz-stern' }) });
    }
    if (!best) {
      return h('div', { class: 'sm-kachel leer', html: `<div class="sm-silhouette"><span class="siegel-klein" style="--el:${farbe(a.el)}">${glyphSVG(a.el)}</span><b>???</b><small>#${String(a.id + 1).padStart(3, '0')} · ${esc(ELEMENTE[a.el].name)}</small></div>` });
    }
    const k = h('div', { class: 'sm-kachel' });
    k.append(karteElement(best.c, { animiert: false, nurMaus: true }));
    if (liste.some((x) => x.team)) k.append(h('span', { class: 'team-marke', text: 'TEAM' }));
    if (liste.some((x) => x.fav)) k.append(h('span', { class: 'fav-marke', text: '★', title: 'Favorit' }));
    k.append(h('div', { class: 'sm-unter', html: `<b>${esc(a.name)}</b><span>×${fmt(liste.length)}${liste.length !== s.anzahl ? ` / ${fmt(s.anzahl)}` : ''}</span><span data-tip="Ausführungen: Kombinationen aus Holo-Stufe und Zusatzlooks">${s.ausf.size}/${AUSF_GESAMT}</span>` }));
    k.append(h('div', { class: 'sm-versionen', html: versionen(a.id) }));
    k.addEventListener('click', () => kartenPopup(a.id, best.i));
    return k;
  };
  const kartenKachel = (x) => {
    if (listenAnsicht()) return kartenZeile(x, { onclick: () => kartenPopup(x.art.id, x.i), stern: favStern(x), klasse: 'mit-stern' });
    const k = h('div', { class: 'sm-kachel' });
    k.append(karteElement(x.c, { animiert: false, nurMaus: true }));
    if (x.team) k.append(h('span', { class: 'team-marke', text: 'TEAM' }));
    k.append(favStern(x));
    if (x.tag != null) k.append(h('span', { class: 'tag-marke', style: `--tag:${CONFIG.tags[x.tag].farbe}`, title: `Tag: ${CONFIG.tags[x.tag].name}` }));
    k.append(h('div', { class: 'sm-unter', html: `<b>${x.nick ? `„${esc(x.nick)}“` : esc(x.art.name)}</b><span style="color:${stufenFarbe(x.st)}">${esc(CONFIG.seltenheit.kurz[x.st - 1])}</span><span>${ICON.muenze}${fmt(verkaufswert(x.c))}</span>` }));
    k.addEventListener('click', () => kartenPopup(x.art.id, x.i));
    return k;
  };

  // Kleines Popup: Karte groß, alle Werte lesbar, eigene Ausführungen zum Umschalten, Verkaufen
  const kartenPopup = (artId, startIndex) => {
    const eigene = daten.filter((x) => x.art.id === artId);
    const gruppen = new Map();
    for (const x of eigene) { if (!gruppen.has(x.ak)) gruppen.set(x.ak, []); gruppen.get(x.ak).push(x); }
    const start = eigene.find((x) => x.i === startIndex);
    const varianten = [...gruppen.entries()].sort((p, q) => q[0] - p[0]).map(([k, l]) => {
      l.sort((p, q) => (p === start ? -1 : q === start ? 1 : q.c.kl * 1000 + q.sum - p.c.kl * 1000 - p.sum));
      const { holo, looks } = ausfuehrungAusKey(k);
      return { label: ausfName(holo, looks), anzahl: l.length, c: l[0].c, x: l[0] };
    });
    const aktiv = Math.max(0, varianten.findIndex((v) => v.x === start));
    const xVon = (c) => varianten.find((v) => v.c === c)?.x || eigene.find((x) => x.c === c);
    let bestaetigen = null;
    karteVergroessern(start.c, {
      varianten, aktiv,
      aktionen: [
        { text: 'Alle Karten &amp; Looks', aktion: (c, zu) => { zu(); stapelDetail(artId, neuLaden); } },
        {
          text: (c) => { const x = xVon(c); return x?.nick ? `✎ „${esc(x.nick)}“` : '✎ Spitzname'; },
          aktion: (c, zu, knopf) => {
            const x = xVon(c);
            if (!x) return;
            spitznameDialog(x.i, (n) => { x.nick = n; knopf.innerHTML = n ? `✎ „${esc(n)}“` : '✎ Spitzname'; neuLaden(); });
          },
        },
        {
          text: (c) => (xVon(c)?.fav ? '★ Favorit' : '☆ Als Favorit merken'),
          klasse: 'fav-knopf',
          aktion: (c, zu, knopf) => {
            const x = xVon(c);
            if (!x) return;
            x.fav = favoritUmschalten(x.i);
            knopf.textContent = x.fav ? '★ Favorit' : '☆ Als Favorit merken';
            knopf.classList.toggle('an', x.fav);
            const vk = knopf.parentElement.querySelector('.verkauf-knopf');
            if (vk) vk.disabled = x.fav || x.team;
            for (const y of daten) if (y.i === x.i) y.fav = x.fav;
            zeichneFavoriten(); zeichneGrid();
          },
        },
        { text: '⬆ Verbessern', klasse: 'primaer', aktion: (c, zu) => { const x = xVon(c); if (!x) return; zu(); verbessernDialog(x.i, neuLaden); } },
        {
          text: (c) => { const t = xVon(c)?.tag; return t != null ? `<i class="tag-punkt" style="--tag:${CONFIG.tags[t].farbe}"></i> ${CONFIG.tags[t].name}` : '🏷 Tag'; },
          aktion: (c, zu, knopf) => {
            const x = xVon(c);
            if (!x) return;
            tagWahl(x.i, (t) => { x.tag = t; knopf.innerHTML = t != null ? `<i class="tag-punkt" style="--tag:${CONFIG.tags[t].farbe}"></i> ${CONFIG.tags[t].name}` : '🏷 Tag'; neuLaden(); });
          },
        },
        {
          text: '🌾 Ernten',
          klasse: 'gefahr ernte-knopf',
          deaktiviert: (c) => xVon(c)?.team,
          aktion: (c, zu) => { const x = xVon(c); if (!x) return; ernteDialog(x.i, () => { zu(); neuLaden(); }); },
        },
        {
          text: (c) => `${ICON.muenze} Verkaufen +${fmt(verkaufswert(c))}`,
          klasse: 'verkauf-knopf',
          deaktiviert: (c) => xVon(c)?.team || xVon(c)?.fav,
          aktion: (c, zu, knopf) => {
            const x = xVon(c);
            if (!x || x.team) return;
            const wertvoll = x.st >= 3 || c.kl >= 4 || c.fx.length;
            if (wertvoll && !c.fx.length && bestaetigen !== x.i) { bestaetigen = x.i; knopf.innerHTML = `Wirklich verkaufen? +${fmt(verkaufswert(c))}`; knopf.classList.add('gefahr'); return; }
            sicherVerkaufen([x.i], () => {
              const r = verkaufen([x.i]);
              Sound.muenze();
              toast(`Verkauft: +${fmt(r.muenzen)} Münzen`);
              zu(); neuLaden();
            });
          },
        },
      ],
    });
  };

  zeichneKopf();
  zeichneFavoriten();
  zeichneGrid();
  return {};
}

// Doppelte, schwache Karten gesammelt verkaufen
// Einzelne Karte ernten aus der Kartenansicht [Nutzer, 24.11.2026]
export function ernteDialog(i, nachher) {
  if (S.d.team.includes(i)) { toast('Karten im Team kann man nicht ernten.'); return; }
  const c = karte(i);
  modal({
    titel: `🌾 ${esc(spitzname(i) || ARTEN[c.art].name)} ernten`,
    inhalt: h('div', { class: 'ernte-dialog' },
      h('p', { html: `Du bekommst <b>${esc(ertragText(ernteErtrag(i)))}</b>. Die Karte wird dabei zerstört.` }),
      h('p', { class: 'leise', text: 'Menge: je Klassennummer × Stärke Kampfstaub und Glücksstaub, dazu Look-Staub für jeden Look der Karte.' })),
    knoepfe: [{ text: 'Abbrechen' }, { text: '🌾 Ernten', klasse: 'gefahr', aktion: () => {
      sicherErnten([i], () => { const r = ernten([i]); if (!r) return; Sound.muenze(); toast(`Geerntet: +${fmt(r.kampfstaub)} Kampfstaub, +${fmt(r.gluecksstaub)} Glücksstaub`); nachher && nachher(); });
    } }],
  });
}

// Alle doppelten Karten ernten [Nutzer, 24.11.2026]: Bestätigung durch Eintippen von „Alle doppelten harvesten“
const ERNTE_SATZ = 'Alle doppelten harvesten';
function ernteDoppelteDialog(nachher) {
  const o = { behalten: 1, bisKlasse: 1, nurNormal: true, ohneEffekte: true };
  const vorschau = h('div', { class: 'verkauf-vorschau' });
  const eingabe = h('input', { type: 'text', class: 'sicher-eingabe', autocomplete: 'off', spellcheck: false, placeholder: ERNTE_SATZ });
  let treffer = [];
  let knopf = null;
  const bereit = () => treffer.length && eingabe.value.trim().toLowerCase() === ERNTE_SATZ.toLowerCase();
  const rechne = () => {
    treffer = doppelteFinden(o);
    let kampf = 0, glueck = 0;
    const looks = {};
    const proKlasse = new Array(KLASSEN.length).fill(0);
    for (const i of treffer) { const e = ernteErtrag(i); kampf += e.kampfstaub; glueck += e.gluecksstaub; for (const l of e.looks) looks[l.name] = (looks[l.name] || 0) + l.menge; proKlasse[karte(i).kl]++; }
    vorschau.innerHTML = treffer.length
      ? `<b>${fmt(treffer.length)}</b> Karten ergeben <b>+${fmt(kampf)} Kampfstaub</b> und <b>+${fmt(glueck)} Glücksstaub</b>${Object.keys(looks).length ? ` und ${Object.entries(looks).map(([n, m]) => `${m} ${esc(n)}`).join(', ')}` : ''}<br><small class="leise">${proKlasse.map((n, k) => (n ? `${KLASSEN[k].name} ${fmt(n)}` : '')).filter(Boolean).join(' · ')}</small>`
      : 'Keine passenden doppelten Karten.';
    if (knopf) knopf.disabled = !bereit();
  };
  eingabe.addEventListener('input', () => { if (knopf) knopf.disabled = !bereit(); });
  const zeile = (text, el) => h('label', {}, h('span', { text }), el);
  const sel = (key, optionen) => h('select', { onchange: (e) => { o[key] = Number(e.target.value); rechne(); } }, optionen.map(([v, t]) => h('option', { value: v, selected: o[key] === v, text: t })));
  const chk = (key) => h('input', { type: 'checkbox', checked: o[key], onchange: (e) => { o[key] = e.target.checked; rechne(); } });
  const inhalt = h('div', {},
    h('p', { class: 'leise', text: 'Je Monster und Ausführung bleiben die stärksten Karten erhalten. Karten im Team und Favoriten werden nie geerntet. Ernten zerstört die Karten.' }),
    h('div', { class: 'verkauf-optionen' },
      zeile('Behalten je Ausführung', sel('behalten', [[1, '1 Karte'], [2, '2 Karten'], [3, '3 Karten'], [5, '5 Karten']])),
      zeile('Nur Klassen bis', sel('bisKlasse', KLASSEN.map((k, i) => [i, k.name]))),
      zeile('Nur normale Karten (ohne Holo und Looks)', chk('nurNormal')),
      zeile('Karten mit Effekten behalten', chk('ohneEffekte'))),
    vorschau,
    h('p', { html: `Zum Bestätigen tippe <b>${ERNTE_SATZ}</b>:` }), eingabe);
  const m = modal({
    titel: '🌾 Doppelte Karten ernten', inhalt,
    knoepfe: [{ text: 'Abbrechen' }, { text: '🌾 Alle ernten', klasse: 'gefahr', aktion: () => {
      if (!bereit()) return false;
      const r = ernten(treffer.slice());
      if (!r) return;
      Sound.muenze();
      toast(`${fmt(r.anzahl)} Karten geerntet: +${fmt(r.kampfstaub)} Kampfstaub, +${fmt(r.gluecksstaub)} Glücksstaub`);
      nachher && nachher();
    } }],
  });
  knopf = m.box.querySelector('.modal-fuss .gefahr');
  rechne();
}

function verkaufsDialog(nachher) {
  const o = { behalten: 1, bisKlasse: 1, nurNormal: true, ohneEffekte: true };
  const vorschau = h('div', { class: 'verkauf-vorschau' });
  let treffer = [];
  const rechne = () => {
    treffer = doppelteFinden(o);
    const proKlasse = new Array(KLASSEN.length).fill(0);
    for (const i of treffer) proKlasse[karte(i).kl]++;
    vorschau.innerHTML = treffer.length
      ? `<b>${fmt(treffer.length)}</b> Karten für <b>${ICON.muenze} ${fmt(wertVon(treffer))}</b> Münzen<br><small class="leise">${proKlasse.map((n, k) => (n ? `${KLASSEN[k].name} ${fmt(n)}` : '')).filter(Boolean).join(' · ')}</small>`
      : 'Keine passenden doppelten Karten.';
    if (knopf) knopf.disabled = !treffer.length;
  };
  const zeile = (text, el) => h('label', {}, h('span', { text }), el);
  const sel = (key, optionen) => h('select', { onchange: (e) => { o[key] = Number(e.target.value); rechne(); } }, optionen.map(([v, t]) => h('option', { value: v, selected: o[key] === v, text: t })));
  const chk = (key) => h('input', { type: 'checkbox', checked: o[key], onchange: (e) => { o[key] = e.target.checked; rechne(); } });
  const inhalt = h('div', {},
    h('p', { class: 'leise', text: 'Je Monster und Ausführung bleiben die stärksten Karten erhalten. Karten im Team werden nie verkauft.' }),
    h('div', { class: 'verkauf-optionen' },
      zeile('Behalten je Ausführung', sel('behalten', [[1, '1 Karte'], [2, '2 Karten'], [3, '3 Karten'], [5, '5 Karten']])),
      zeile('Nur Klassen bis', sel('bisKlasse', KLASSEN.map((k, i) => [i, k.name]))),
      zeile('Nur normale Karten (ohne Holo und Looks)', chk('nurNormal')),
      zeile('Karten mit Effekten behalten', chk('ohneEffekte'))),
    vorschau);
  let knopf = null;
  const m = modal({
    titel: 'Doppelte Karten verkaufen', inhalt,
    knoepfe: [{ text: 'Abbrechen' }, { text: 'Verkaufen', klasse: 'primaer', aktion: () => {
      const liste = treffer.slice();
      sicherVerkaufen(liste, () => {
        const r = verkaufen(liste);
        Sound.muenze();
        toast(`${fmt(r.anzahl)} Karten verkauft: +${fmt(r.muenzen)} Münzen`);
        nachher && nachher();
      });
    } }],
  });
  knopf = m.box.querySelector('.modal-fuss .primaer');
  rechne();
}

export function stapelDetail(artId, nachher) {
  const a = ARTEN[artId];
  const s = S.stapel.get(artId);
  if (!s || !s.anzahl) return null;
  let auswahl = s.beste, ausfFilter = null, seite = 0;
  // Suche, Filter und Sortierung auch hier [Nutzer, 24.11.2026: Filter überall, wo Karten angezeigt werden]
  const SD_STANDARD = { ...STANDARD, sort: 'seltenheit', ab: true, offen: false };
  const sdF = { ...SD_STANDARD };
  const PRO = 30;
  const links = h('div', { class: 'sd-links' });
  const rechts = h('div', { class: 'sd-rechts' });
  const inhalt = h('div', { class: 'stapel-detail' }, links, rechts);
  const m = modal({ titel: `${esc(a.name)} <small>#${String(a.id + 1).padStart(3, '0')} · ${esc(ELEMENTE[a.el].name)} · ${esc(CONFIG.rollen[a.rolle].name)}</small>`, inhalt, klasse: 'breit', onClose: nachher });

  const alle = () => { const team = new Set(S.d.team), fav = new Set(S.d.favoriten); return s.idx.map((i) => { const c = karte(i); return { i, c, art: a, st: kartenSeltenheit(c), sum: staerke(c.a), kost: kosten(c), team: team.has(i), fav: fav.has(i), ak: HOLO_STUFEN.indexOf(c.holo) * 32 + c.looks, such: suchText(a, c) }; }); };
  const zeichne = () => {
    if (!s.idx.includes(auswahl)) auswahl = s.beste;
    if (auswahl < 0 || auswahl == null) { m.zu(); return; }
    const c = karte(auswahl);
    const gross = karteElement(c, { maxNeigung: 16 });
    gross.classList.add('gyro', 'detail-karte');
    gross.addEventListener('click', () => karteVergroessern(c));
    const aktionen = h('div', { class: 'look-aktionen' });
    LOOKS.forEach((l, li) => {
      const hat = hatLook(c.looks, li);
      const vorrat = S.d.staub[l.key];
      aktionen.append(h('button', {
        class: 'btn klein look-btn' + (hat ? ' hat' : ''),
        disabled: !hat && vorrat < CONFIG.staub.auftragKosten,
        'data-tip': hat ? `${l.name} abtragen: +${staubBeimAbtragen(c)} ${l.staub} (Klassennummer). Die Karte bleibt erhalten.` : `${l.name} auftragen: kostet ${CONFIG.staub.auftragKosten} ${l.staub} (du hast ${vorrat}).`,
        html: `<span>${esc(l.kurz)}</span><em>${hat ? `abtragen +${staubBeimAbtragen(c)}` : `auftragen −${CONFIG.staub.auftragKosten}`}</em>`,
        onclick: () => {
          if (hat) { const n = lookAbtragen(auswahl, li); Sound.look(l.key); toast(`${l.name} abgetragen: +${n} Staub`); }
          else if (lookAuftragen(auswahl, li)) { Sound.look(l.key); Sound.stufe(kartenSeltenheit(karte(auswahl))); toast(`${l.name} aufgetragen`); }
          zeichne();
        },
      }));
    });
    const imTeam = S.d.team.includes(auswahl);
    const istFav = S.d.favoriten.includes(auswahl);
    const favKnopf = h('button', { class: 'btn klein fav-knopf' + (istFav ? ' an' : ''), text: istFav ? '★ Favorit' : '☆ Als Favorit merken', onclick: () => { favoritUmschalten(auswahl); zeichne(); } });
    const tagJetzt = tagVon(auswahl);
    const tagKnopf = h('button', { class: 'btn klein', html: tagJetzt != null ? `<i class="tag-punkt" style="--tag:${CONFIG.tags[tagJetzt].farbe}"></i> ${CONFIG.tags[tagJetzt].name}` : '🏷 Tag', onclick: () => tagWahl(auswahl, () => { zeichne(); nachher && nachher(); }) });
    const nickKnopf = h('button', { class: 'btn klein', text: spitzname(auswahl) ? `✎ „${spitzname(auswahl)}“` : '✎ Spitzname', onclick: () => spitznameDialog(auswahl, () => { zeichne(); nachher && nachher(); }) });
    const verkauf = h('button', {
      class: 'btn klein', disabled: imTeam || istFav, html: imTeam ? 'Im Team, nicht verkaufbar' : istFav ? 'Favorit, nicht verkaufbar' : `${ICON.muenze} Diese Karte verkaufen +${fmt(verkaufswert(c))}`,
      onclick: () => { const ziel = auswahl; sicherVerkaufen([ziel], () => { const r = verkaufen([ziel]); Sound.muenze(); toast(`Verkauft: +${fmt(r.muenzen)} Münzen`); auswahl = s.beste; if (!s.anzahl) { m.zu(); return; } zeichne(); }); },
    });
    const verbessern = verbessernBox(auswahl, () => { zeichne(); nachher && nachher(); }, () => { auswahl = s.beste; if (!s.anzahl) { m.zu(); return; } zeichne(); });
    links.replaceChildren(gross, h('p', { class: 'leise', text: 'Karte antippen für die große Ansicht mit allen Werten.' }), h('div', { class: 'staub-leiste klein', html: staubHTML() }), verbessern, h('h4', { text: 'Looks übertragen' }), aktionen, h('p', { class: 'leise', text: 'Nur die fünf Zusatzlooks sind übertragbar. Holo-Stufe und Effekte bleiben fest auf der Karte.' }), nickKnopf, favKnopf, tagKnopf, verkauf);

    const liste = alle();
    const ausfChips = [...s.ausf.entries()].sort((x, y) => y[0] - x[0]).map(([k, n]) => {
      const { holo, looks } = ausfuehrungAusKey(k);
      return h('button', { class: 'ausf-chip' + (ausfFilter === k ? ' an' : '') + (holo !== 'keins' ? ' holo-' + holo : ''), onclick: () => { ausfFilter = ausfFilter === k ? null : k; seite = 0; zeichne(); }, html: `${esc(ausfName(holo, looks))} <b>×${n}</b>` });
    });
    const gefiltert = liste.filter((x) => (ausfFilter == null || x.ak === ausfFilter) && passt(x, sdF));
    const richtung = sdF.ab ? -1 : 1;
    gefiltert.sort((x, y) => richtung * vergleich(kartenWert(x, sdF), kartenWert(y, sdF)) || y.st - x.st || y.c.kl - x.c.kl || y.sum - x.sum || x.i - y.i);
    const seiten = Math.max(1, Math.ceil(gefiltert.length / PRO));
    seite = Math.min(seite, seiten - 1);
    const zeilen = gefiltert.slice(seite * PRO, (seite + 1) * PRO).map((x) => h('button', {
      class: 'inst-zeile' + (x.i === auswahl ? ' an' : ''), onclick: () => { auswahl = x.i; zeichne(); },
      html: `<span class="kl-punkt kl-${KLASSEN[x.c.kl].key}"></span><b>${x.sum}</b><span>${KLASSEN[x.c.kl].name}</span><span class="inst-ausf">${tagVon(x.i) != null ? `<i class="tag-punkt" style="--tag:${CONFIG.tags[tagVon(x.i)].farbe}"></i> ` : ''}${x.fav ? '★ ' : ''}${spitzname(x.i) ? `„${esc(spitzname(x.i))}“ · ` : ''}${esc(ausfName(x.c.holo, x.c.looks))}${x.team ? ' · Team' : ''}</span><span class="inst-fx">${x.c.fx.length ? '✦'.repeat(x.c.fx.length) : ''}</span><span class="inst-st" style="color:${stufenFarbe(x.st)}">${esc(stufenName(x.st))}</span>`,
    }));
    rechts.replaceChildren(
      h('h4', { text: `Ausführungen (${s.ausf.size} von ${AUSF_GESAMT})` }),
      h('div', { class: 'ausf-liste' }, ausfChips),
      h('div', { class: 'kand-leiste sd-leiste' },
        h('h4', { text: `Karten (${fmt(gefiltert.length)} / ${fmt(liste.length)})` }),
        suchFeld(sdF, () => { seite = 0; sdF.fokus = true; zeichne(); }, 'Suchen: Klasse, Holo, Effekt …'),
        h('select', { onchange: (e) => { sdF.sort = e.target.value; zeichne(); } }, SORTEN.filter(([k]) => !['anzahl', 'ausf', 'nr', 'name', 'element', 'rolle'].includes(k)).map(([v, t]) => h('option', { value: v, selected: sdF.sort === v, text: t }))),
        h('button', { class: 'btn klein', text: sdF.ab ? '↓' : '↑', title: sdF.ab ? 'absteigend' : 'aufsteigend', onclick: () => { sdF.ab = !sdF.ab; zeichne(); } }),
        h('button', { class: 'btn klein' + (sdF.offen ? ' an' : ''), text: 'Filter', onclick: () => { sdF.offen = !sdF.offen; zeichne(); } })),
      sdF.offen ? filterFelder(sdF, () => { seite = 0; zeichne(); }, { ohne: ['Name', 'Element', 'Rolle', 'Bauplan', 'Entwicklung', 'Monster'] }) : '',
      filterChips(sdF, SD_STANDARD, () => { seite = 0; zeichne(); }) || '',
      h('div', { class: 'inst-liste' }, zeilen),
      seiten > 1 ? h('div', { class: 'seiten' }, h('button', { class: 'btn klein', disabled: seite === 0, text: '‹', onclick: () => { seite--; zeichne(); } }), h('span', { text: `${seite + 1} / ${seiten}` }), h('button', { class: 'btn klein', disabled: seite >= seiten - 1, text: '›', onclick: () => { seite++; zeichne(); } })) : null,
    );
    // Suchfeld wird neu gezeichnet: Fokus und Cursor zurückgeben
    if (sdF.fokus) { const i = rechts.querySelector('.such-feld'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } sdF.fokus = false; }
  };
  zeichne();
  return m;
}
