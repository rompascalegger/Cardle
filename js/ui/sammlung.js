// Sammlung: Stapel je Monster, Ausführungen (Holo × Looks), Looks ab- und auftragen mit Staub. [FEST 11]
import { CONFIG, KLASSEN, LOOKS, HOLO_NAMEN, HOLO_STUFEN } from '../config.js';
import { S, karte, lookAbtragen, lookAuftragen } from '../state.js';
import { karteElement, stufenFarbe, stufenName, esc } from '../cardview.js';
import { ELEMENTE, glyphSVG, farbe } from '../elements.js';
import { ARTEN } from '../species.js';
import { Sound } from '../audio.js';
import { staerke, kartenSeltenheit, ausfuehrungAusKey, staubBeimAbtragen, hatLook, lookAnzahl } from '../rules.js';
import { h, modal, toast, ICON, fmt } from './dom.js';

const filter = { el: -1, sort: 'nr', nurEntdeckt: false };
const LOOK_FARBEN = ['#7ad8ff', '#9a8cff', '#e8e8e8', '#5ffff0', '#ff9fcf'];

export function staubHTML() {
  return LOOKS.map((l, i) => `<span class="staub-chip" data-tip="${esc(l.staub)}" style="--sc:${LOOK_FARBEN[i]}">${ICON.staub}<span>${esc(l.kurz)}</span><b>${fmt(S.d.staub[l.key])}</b></span>`).join('');
}

export function sammlungScreen(root) {
  const wrap = h('section', { class: 'screen sammlung' });
  const kopf = h('div', { class: 'panel sm-kopf' });
  const grid = h('div', { class: 'sm-grid' });
  wrap.append(kopf, grid);
  root.append(wrap);

  const zeichneKopf = () => {
    const entdeckt = [...S.stapel.values()].filter((s) => s.anzahl > 0).length;
    let ausf = 0;
    for (const s of S.stapel.values()) ausf += s.ausf.size;
    kopf.innerHTML = '';
    kopf.append(
      h('div', { class: 'sm-stats', html: `<h2>Sammlung</h2><span><b>${fmt(S.karten.length)}</b> Karten</span><span><b>${entdeckt}</b>/${ARTEN.length} Monster</span><span><b>${fmt(ausf)}</b> Ausführungen</span>` }),
      h('div', { class: 'staub-leiste', html: staubHTML() }),
      h('div', { class: 'sm-filter' },
        h('select', { 'aria-label': 'Element', onchange: (e) => { filter.el = Number(e.target.value); zeichneGrid(); } },
          h('option', { value: -1, text: 'Alle Elemente' }), ELEMENTE.map((el, i) => h('option', { value: i, selected: filter.el === i, text: el.name }))),
        h('select', { 'aria-label': 'Sortierung', onchange: (e) => { filter.sort = e.target.value; zeichneGrid(); } },
          [['nr', 'Nummer'], ['seltenheit', 'Beste Seltenheit'], ['anzahl', 'Anzahl'], ['ausf', 'Ausführungen']].map(([v, t]) => h('option', { value: v, selected: filter.sort === v, text: t }))),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: filter.nurEntdeckt, onchange: (e) => { filter.nurEntdeckt = e.target.checked; zeichneGrid(); } }), h('span', { text: 'nur entdeckte' }))),
    );
  };
  const zeichneGrid = () => {
    let arten = ARTEN.filter((a) => filter.el < 0 || a.el === filter.el);
    const st = (a) => S.stapel.get(a.id);
    if (filter.nurEntdeckt) arten = arten.filter((a) => st(a)?.anzahl);
    const key = { nr: () => 0, seltenheit: (a) => -(st(a)?.besteWert ?? -1), anzahl: (a) => -(st(a)?.anzahl || 0), ausf: (a) => -(st(a)?.ausf.size || 0) }[filter.sort];
    arten.sort((a, b) => key(a) - key(b) || a.id - b.id);
    grid.replaceChildren(...arten.map((a) => kachel(a)));
  };
  const kachel = (a) => {
    const s = S.stapel.get(a.id);
    if (!s || !s.anzahl) {
      return h('div', { class: 'sm-kachel leer', style: `--el:${farbe(a.el)}`, html: `<div class="sm-silhouette"><span class="siegel-klein" style="--el:${farbe(a.el)}">${glyphSVG(a.el)}</span><b>???</b><small>#${String(a.id + 1).padStart(3, '0')} · ${esc(ELEMENTE[a.el].name)}</small></div>` });
    }
    const c = karte(s.beste);
    const k = h('div', { class: 'sm-kachel' });
    const el = karteElement(c, { animiert: false, nurMaus: true });
    k.append(el, h('div', { class: 'sm-unter', html: `<b>${esc(a.name)}</b><span>×${fmt(s.anzahl)}</span><span data-tip="Ausführungen: verschiedene Kombinationen aus Holo-Stufe und Zusatzlooks">${s.ausf.size}/128</span>` }));
    k.addEventListener('click', () => { Sound.klick(); stapelDetail(a.id, () => { zeichneKopf(); zeichneGrid(); }); });
    return k;
  };
  zeichneKopf();
  zeichneGrid();
  return {};
}

function ausfName(holo, looks) {
  const teile = [];
  if (holo !== 'keins') teile.push(HOLO_NAMEN[holo]);
  LOOKS.forEach((l, i) => { if (looks & (1 << i)) teile.push(l.kurz); });
  return teile.length ? teile.join(' + ') : 'Normal';
}

export function stapelDetail(artId, nachher) {
  const a = ARTEN[artId];
  const s = S.stapel.get(artId);
  let auswahl = s.beste, ausfFilter = null, seite = 0;
  const PRO_SEITE = 30;
  const links = h('div', { class: 'sd-links' });
  const rechts = h('div', { class: 'sd-rechts' });
  const inhalt = h('div', { class: 'stapel-detail' }, links, rechts);
  const m = modal({ titel: `${esc(a.name)} <small>#${String(a.id + 1).padStart(3, '0')} · ${esc(ELEMENTE[a.el].name)} · ${esc(CONFIG.rollen[a.rolle].name)}</small>`, inhalt, klasse: 'breit', onClose: nachher });

  const alle = () => s.idx.map((i) => ({ i, c: karte(i) })).map((x) => ({ ...x, st: kartenSeltenheit(x.c), sum: staerke(x.c.a), ak: HOLO_STUFEN.indexOf(x.c.holo) * 32 + x.c.looks }));
  const zeichne = () => {
    const c = karte(auswahl);
    const gross = karteElement(c, { rueckseite: 'info', drehbar: true, maxNeigung: 16 });
    gross.classList.add('gyro', 'detail-karte');
    const aktionen = h('div', { class: 'look-aktionen' });
    LOOKS.forEach((l, li) => {
      const hat = hatLook(c.looks, li);
      const vorrat = S.d.staub[l.key];
      const b = h('button', {
        class: 'btn klein look-btn' + (hat ? ' hat' : ''),
        disabled: !hat && vorrat < CONFIG.staub.auftragKosten,
        'data-tip': hat ? `${l.name} abtragen: +${staubBeimAbtragen(c)} ${l.staub} (Klassennummer). Die Karte bleibt erhalten.` : `${l.name} auftragen: kostet ${CONFIG.staub.auftragKosten} ${l.staub} (du hast ${vorrat}).`,
        html: `<span>${esc(l.kurz)}</span><em>${hat ? `abtragen +${staubBeimAbtragen(c)}` : `auftragen −${CONFIG.staub.auftragKosten}`}</em>`,
        onclick: () => {
          if (hat) { const n = lookAbtragen(auswahl, li); Sound.look(l.key); toast(`${l.name} abgetragen: +${n} Staub`); }
          else if (lookAuftragen(auswahl, li)) { Sound.look(l.key); Sound.stufe(kartenSeltenheit(karte(auswahl))); toast(`${l.name} aufgetragen`); }
          zeichne();
        },
      });
      aktionen.append(b);
    });
    links.replaceChildren(gross, h('div', { class: 'staub-leiste klein', html: staubHTML() }), h('h4', { text: 'Looks übertragen' }), aktionen, h('p', { class: 'leise', text: 'Nur die fünf Zusatzlooks sind übertragbar. Holo-Stufe und Effekte bleiben fest auf der Karte.' }));

    // Ausführungen
    const liste = alle();
    const ausfChips = [...s.ausf.entries()].sort((x, y) => y[0] - x[0]).map(([k, n]) => {
      const { holo, looks } = ausfuehrungAusKey(k);
      return h('button', { class: 'ausf-chip' + (ausfFilter === k ? ' an' : '') + (holo !== 'keins' ? ' holo-' + holo : ''), onclick: () => { ausfFilter = ausfFilter === k ? null : k; seite = 0; zeichne(); }, html: `${esc(ausfName(holo, looks))} <b>×${n}</b>` });
    });
    let gefiltert = ausfFilter == null ? liste : liste.filter((x) => x.ak === ausfFilter);
    gefiltert.sort((x, y) => y.st - x.st || y.c.kl - x.c.kl || y.sum - x.sum || x.i - y.i);
    const seiten = Math.max(1, Math.ceil(gefiltert.length / PRO_SEITE));
    seite = Math.min(seite, seiten - 1);
    const zeilen = gefiltert.slice(seite * PRO_SEITE, (seite + 1) * PRO_SEITE).map((x) => h('button', {
      class: 'inst-zeile' + (x.i === auswahl ? ' an' : ''), onclick: () => { auswahl = x.i; zeichne(); },
      html: `<span class="kl-punkt kl-${KLASSEN[x.c.kl].key}"></span><b>${x.sum}</b><span>${KLASSEN[x.c.kl].name}</span><span class="inst-ausf">${esc(ausfName(x.c.holo, x.c.looks))}</span><span class="inst-fx">${x.c.fx.length ? '✦'.repeat(x.c.fx.length) : ''}</span><span class="inst-st" style="color:${stufenFarbe(x.st)}">${esc(stufenName(x.st))}</span>`,
    }));
    rechts.replaceChildren(
      h('h4', { text: `Ausführungen (${s.ausf.size} von 128)` }),
      h('div', { class: 'ausf-liste' }, ausfChips),
      h('h4', { text: `Karten (${fmt(gefiltert.length)})` }),
      h('div', { class: 'inst-liste' }, zeilen),
      seiten > 1 ? h('div', { class: 'seiten' }, h('button', { class: 'btn klein', disabled: seite === 0, text: '‹', onclick: () => { seite--; zeichne(); } }), h('span', { text: `${seite + 1} / ${seiten}` }), h('button', { class: 'btn klein', disabled: seite >= seiten - 1, text: '›', onclick: () => { seite++; zeichne(); } })) : null,
    );
  };
  zeichne();
  return m;
}
