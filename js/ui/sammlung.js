// Album: Stapel je Monster oder alle Einzelkarten, mit Filtern und Sortierung für jede Eigenschaft.
// Ausführungen (Holo × Looks) [FEST 11], Looks ab- und auftragen mit Staub, doppelte schwache Karten verkaufen.
import { CONFIG, KLASSEN, LOOKS, HOLO_NAMEN, HOLO_STUFEN } from '../config.js';
import { S, karte, lookAbtragen, lookAuftragen, verkaufen, doppelteFinden, wertVon } from '../state.js';
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
  ansicht: 'monster', suche: '', el: -1, klMin: 0, klMax: 7, stufeMin: 1, holo: 'alle', look: 'alle', fx: 'alle',
  rolle: 'alle', bauplan: 'alle', form: -1, attr: 'kraft', attrMin: 0, staerkeMin: 0, kostenMax: 0, team: 'alle', besitz: 'alle',
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
  return LOOKS.map((l, i) => `<span class="staub-chip" data-tip="${esc(l.staub)}" style="--sc:${LOOK_FARBEN[i]}">${ICON.staub}<span>${esc(l.kurz)}</span><b>${fmt(S.d.staub[l.key])}</b></span>`).join('');
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
export function datenLaden() {
  const team = new Set(S.d.team);
  return S.karten.map((code, i) => {
    const c = dekodiere(code);
    return { i, c, art: ARTEN[c.art], st: kartenSeltenheit(c), sum: staerke(c.a), kost: kosten(c), team: team.has(i), ak: ausfuehrungsKey(c) };
  });
}

export function passt(x, F = ALBUM_F) {
  const c = x.c;
  if (F.suche && !x.art.name.toLowerCase().includes(F.suche.toLowerCase())) return false;
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
  return true;
}
const kartenFilterAktiv = () => ['suche', 'klMin', 'klMax', 'stufeMin', 'holo', 'look', 'fx', 'attrMin', 'staerkeMin', 'kostenMax', 'team'].some((k) => F[k] !== STANDARD[k]);

export const SORTEN = [
  ['nr', 'Nummer'], ['name', 'Name'], ['element', 'Element'], ['staerke', 'Stärke'], ['klasse', 'Klasse'], ['seltenheit', 'Seltenheit'],
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
  wrap.append(kopf, seitenOben, grid, seitenUnten);
  root.append(wrap);
  let daten = datenLaden();
  const neuLaden = () => { daten = datenLaden(); zeichneKopf(); zeichneGrid(); };

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
        sel('sort', SORTEN, false),
        h('button', { class: 'btn klein', text: F.ab ? '↓ absteigend' : '↑ aufsteigend', onclick: () => { F.ab = !F.ab; zeichneKopf(); zeichneGrid(); } }),
        h('button', { class: 'btn klein' + (F.offen ? ' an' : ''), text: kartenFilterAktiv() || F.el >= 0 ? 'Filter ●' : 'Filter', onclick: () => { F.offen = !F.offen; zeichneKopf(); zeichneGrid(); } }),
        h('button', { class: 'btn klein', text: 'Zurücksetzen', onclick: () => { Object.assign(F, { ...STANDARD, ansicht: F.ansicht, offen: F.offen }); zeichneKopf(); zeichneGrid(); } }),
        h('button', { class: 'btn klein', html: `${ICON.muenze} Doppelte verkaufen …`, onclick: () => verkaufsDialog(neuLaden) }),
        h('span', { class: 'treffer' })),
      F.offen ? filterBox() : null,
    );
  };
  const filterBox = () => filterFelder(F, zeichneGrid);

  const zeichneGrid = () => {
    const treffer = daten.filter(passt);
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
    grid.replaceChildren(...kacheln);
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
    if (!best) {
      return h('div', { class: 'sm-kachel leer', html: `<div class="sm-silhouette"><span class="siegel-klein" style="--el:${farbe(a.el)}">${glyphSVG(a.el)}</span><b>???</b><small>#${String(a.id + 1).padStart(3, '0')} · ${esc(ELEMENTE[a.el].name)}</small></div>` });
    }
    const k = h('div', { class: 'sm-kachel' });
    k.append(karteElement(best.c, { animiert: false, nurMaus: true }));
    if (liste.some((x) => x.team)) k.append(h('span', { class: 'team-marke', text: 'TEAM' }));
    k.append(h('div', { class: 'sm-unter', html: `<b>${esc(a.name)}</b><span>×${fmt(liste.length)}${liste.length !== s.anzahl ? ` / ${fmt(s.anzahl)}` : ''}</span><span data-tip="Ausführungen: Kombinationen aus Holo-Stufe und Zusatzlooks">${s.ausf.size}/${AUSF_GESAMT}</span>` }));
    k.append(h('div', { class: 'sm-versionen', html: versionen(a.id) }));
    k.addEventListener('click', () => kartenPopup(a.id, best.i));
    return k;
  };
  const kartenKachel = (x) => {
    const k = h('div', { class: 'sm-kachel' });
    k.append(karteElement(x.c, { animiert: false, nurMaus: true }));
    if (x.team) k.append(h('span', { class: 'team-marke', text: 'TEAM' }));
    k.append(h('div', { class: 'sm-unter', html: `<b>${esc(x.art.name)}</b><span style="color:${stufenFarbe(x.st)}">${esc(CONFIG.seltenheit.kurz[x.st - 1])}</span><span>${ICON.muenze}${fmt(verkaufswert(x.c))}</span>` }));
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
          text: (c) => `${ICON.muenze} Verkaufen +${fmt(verkaufswert(c))}`,
          deaktiviert: (c) => xVon(c)?.team,
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
  zeichneGrid();
  return {};
}

// Doppelte, schwache Karten gesammelt verkaufen
function verkaufsDialog(nachher) {
  const o = { behalten: 1, bisKlasse: 1, nurNormal: true, ohneEffekte: true };
  const vorschau = h('div', { class: 'verkauf-vorschau' });
  let treffer = [];
  const rechne = () => {
    treffer = doppelteFinden(o);
    const proKlasse = new Array(8).fill(0);
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
  const PRO = 30;
  const links = h('div', { class: 'sd-links' });
  const rechts = h('div', { class: 'sd-rechts' });
  const inhalt = h('div', { class: 'stapel-detail' }, links, rechts);
  const m = modal({ titel: `${esc(a.name)} <small>#${String(a.id + 1).padStart(3, '0')} · ${esc(ELEMENTE[a.el].name)} · ${esc(CONFIG.rollen[a.rolle].name)}</small>`, inhalt, klasse: 'breit', onClose: nachher });

  const alle = () => s.idx.map((i) => ({ i, c: karte(i) })).map((x) => ({ ...x, st: kartenSeltenheit(x.c), sum: staerke(x.c.a), ak: HOLO_STUFEN.indexOf(x.c.holo) * 32 + x.c.looks }));
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
    const verkauf = h('button', {
      class: 'btn klein', disabled: imTeam, html: imTeam ? 'Im Team, nicht verkaufbar' : `${ICON.muenze} Diese Karte verkaufen +${fmt(verkaufswert(c))}`,
      onclick: () => { const ziel = auswahl; sicherVerkaufen([ziel], () => { const r = verkaufen([ziel]); Sound.muenze(); toast(`Verkauft: +${fmt(r.muenzen)} Münzen`); auswahl = s.beste; if (!s.anzahl) { m.zu(); return; } zeichne(); }); },
    });
    links.replaceChildren(gross, h('p', { class: 'leise', text: 'Karte antippen für die große Ansicht mit allen Werten.' }), h('div', { class: 'staub-leiste klein', html: staubHTML() }), h('h4', { text: 'Looks übertragen' }), aktionen, h('p', { class: 'leise', text: 'Nur die fünf Zusatzlooks sind übertragbar. Holo-Stufe und Effekte bleiben fest auf der Karte.' }), verkauf);

    const liste = alle();
    const ausfChips = [...s.ausf.entries()].sort((x, y) => y[0] - x[0]).map(([k, n]) => {
      const { holo, looks } = ausfuehrungAusKey(k);
      return h('button', { class: 'ausf-chip' + (ausfFilter === k ? ' an' : '') + (holo !== 'keins' ? ' holo-' + holo : ''), onclick: () => { ausfFilter = ausfFilter === k ? null : k; seite = 0; zeichne(); }, html: `${esc(ausfName(holo, looks))} <b>×${n}</b>` });
    });
    const gefiltert = ausfFilter == null ? liste : liste.filter((x) => x.ak === ausfFilter);
    gefiltert.sort((x, y) => y.st - x.st || y.c.kl - x.c.kl || y.sum - x.sum || x.i - y.i);
    const seiten = Math.max(1, Math.ceil(gefiltert.length / PRO));
    seite = Math.min(seite, seiten - 1);
    const zeilen = gefiltert.slice(seite * PRO, (seite + 1) * PRO).map((x) => h('button', {
      class: 'inst-zeile' + (x.i === auswahl ? ' an' : ''), onclick: () => { auswahl = x.i; zeichne(); },
      html: `<span class="kl-punkt kl-${KLASSEN[x.c.kl].key}"></span><b>${x.sum}</b><span>${KLASSEN[x.c.kl].name}</span><span class="inst-ausf">${esc(ausfName(x.c.holo, x.c.looks))}${S.d.team.includes(x.i) ? ' · Team' : ''}</span><span class="inst-fx">${x.c.fx.length ? '✦'.repeat(x.c.fx.length) : ''}</span><span class="inst-st" style="color:${stufenFarbe(x.st)}">${esc(stufenName(x.st))}</span>`,
    }));
    rechts.replaceChildren(
      h('h4', { text: `Ausführungen (${s.ausf.size} von ${AUSF_GESAMT})` }),
      h('div', { class: 'ausf-liste' }, ausfChips),
      h('h4', { text: `Karten (${fmt(gefiltert.length)})` }),
      h('div', { class: 'inst-liste' }, zeilen),
      seiten > 1 ? h('div', { class: 'seiten' }, h('button', { class: 'btn klein', disabled: seite === 0, text: '‹', onclick: () => { seite--; zeichne(); } }), h('span', { text: `${seite + 1} / ${seiten}` }), h('button', { class: 'btn klein', disabled: seite >= seiten - 1, text: '›', onclick: () => { seite++; zeichne(); } })) : null,
    );
  };
  zeichne();
  return m;
}
