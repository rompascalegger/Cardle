// Team bauen: Plätze aus Grundvorrat + Teamkapazität. [VORSCHLAG 12.3] Team aus der Sammlung.
import { CONFIG, KLASSEN } from '../config.js';
import { S, karte, teamPlaetze, teamSetzen, teamAutomatisch } from '../state.js';
import { karteElement } from '../cardview.js';
import { ELEMENTE } from '../elements.js';
import { ARTEN } from '../species.js';
import { Sound } from '../audio.js';
import { staerke, kosten, plaetzeBelegt, plaetzeBringt } from '../rules.js';
import { h, toast, fmt, ICON } from './dom.js';

const filter = { el: -1, kl: -1, seite: 0 };
const PRO_SEITE = 24;

export function teamScreen(root, nav) {
  const wrap = h('section', { class: 'screen team' });
  const kopf = h('div', { class: 'panel team-kopf' });
  const teamReihe = h('div', { class: 'team-reihe' });
  const kandKopf = h('div', { class: 'kand-kopf' });
  const kand = h('div', { class: 'kand-grid' });
  const seitenLeiste = h('div', { class: 'seiten' });
  wrap.append(kopf, h('div', { class: 'panel' }, h('h3', { text: 'Dein Team' }), teamReihe), h('div', { class: 'panel' }, kandKopf, kand, seitenLeiste));
  root.append(wrap);

  const mini = (i, beiKlick, extra = '') => {
    const c = karte(i);
    const el = karteElement(c, { animiert: false, nurMaus: true });
    const box = h('div', { class: 'team-karte ' + extra }, el, h('div', { class: 'tk-info', html: `<span data-tip="Beschwörungskosten">${ICON.beschwoerung}${kosten(c)}</span><span data-tip="Belegte Teamplätze">▣ ${plaetzeBelegt(c)}</span>${plaetzeBringt(c) ? `<span class="gut" data-tip="Bringt Teamplätze mit">+${plaetzeBringt(c)}</span>` : ''}` }));
    box.addEventListener('click', () => beiKlick(i));
    return box;
  };

  const zeichne = () => {
    const p = teamPlaetze();
    const sum = S.d.team.reduce((x, i) => x + staerke(karte(i).a), 0);
    kopf.innerHTML = '';
    const balken = h('div', { class: 'platz-balken' + (p.ok ? '' : ' voll') }, h('i', { style: { width: Math.min(100, (p.belegt / Math.max(1, p.gesamt)) * 100) + '%' } }));
    kopf.append(
      h('div', { class: 'tk-zeile' },
        h('h2', { text: 'Team' }),
        h('span', { html: `Plätze <b>${p.belegt}</b> / ${p.gesamt}` }),
        h('span', { html: `${S.d.team.length} Karten · Stärke gesamt <b>${fmt(sum)}</b>` }),
        h('div', { class: 'tk-knoepfe' },
          h('button', { class: 'btn', text: 'Automatisch aufstellen', onclick: () => { teamAutomatisch(); Sound.klick(); zeichne(); } }),
          h('button', { class: 'btn', text: 'Leeren', onclick: () => { teamSetzen([]); zeichne(); } }),
          h('button', { class: 'btn primaer', text: 'Zur Kampagne', onclick: () => nav('kampagne') }))),
      balken,
      h('p', { class: 'leise', text: `Jede Karte belegt so viele Plätze wie ihr Teamplatz-Wert (mindestens 1). Grundvorrat ${CONFIG.kampf.teamGrundplaetze}, Karten mit Teamkapazität bringen weitere Plätze mit. Teamplatz wirkt als Angriffsmultiplikator.` }),
    );
    teamReihe.replaceChildren(...(S.d.team.length ? S.d.team.map((i) => mini(i, (j) => { teamSetzen(S.d.team.filter((x) => x !== j)); zeichne(); }, 'im-team')) : [h('p', { class: 'leise', text: 'Noch leer. Tippe unten Karten an oder stelle automatisch auf.' })]));
    zeichneKandidaten();
  };

  const zeichneKandidaten = () => {
    kandKopf.replaceChildren(
      h('h3', { text: 'Sammlung' }),
      h('select', { onchange: (e) => { filter.el = Number(e.target.value); filter.seite = 0; zeichneKandidaten(); } }, h('option', { value: -1, text: 'Alle Elemente' }), ELEMENTE.map((el, i) => h('option', { value: i, selected: filter.el === i, text: el.name }))),
      h('select', { onchange: (e) => { filter.kl = Number(e.target.value); filter.seite = 0; zeichneKandidaten(); } }, h('option', { value: -1, text: 'Alle Klassen' }), KLASSEN.map((k, i) => h('option', { value: i, selected: filter.kl === i, text: k.name }))),
    );
    const imTeam = new Set(S.d.team);
    const liste = [];
    for (let i = 0; i < S.karten.length; i++) {
      if (imTeam.has(i)) continue;
      const c = karte(i);
      if (filter.kl >= 0 && c.kl !== filter.kl) continue;
      if (filter.el >= 0 && ARTEN[c.art].el !== filter.el) continue;
      liste.push({ i, w: staerke(c.a) * 100 + c.kl });
    }
    liste.sort((a, b) => b.w - a.w);
    const seiten = Math.max(1, Math.ceil(liste.length / PRO_SEITE));
    filter.seite = Math.min(filter.seite, seiten - 1);
    kand.replaceChildren(...liste.slice(filter.seite * PRO_SEITE, (filter.seite + 1) * PRO_SEITE).map((x) => mini(x.i, (j) => {
      const neu = [...S.d.team, j];
      const p = teamPlaetze(neu);
      if (!p.ok) { toast(`Zu wenig Teamplätze (${p.belegt} / ${p.gesamt}).`); return; }
      teamSetzen(neu); Sound.klick(); zeichne();
    })));
    if (!liste.length) kand.append(h('p', { class: 'leise', text: S.karten.length ? 'Keine passenden Karten.' : 'Noch keine Karten. Öffne zuerst ein paar Packs.' }));
    seitenLeiste.replaceChildren(...(seiten > 1 ? [h('button', { class: 'btn klein', disabled: filter.seite === 0, text: '‹', onclick: () => { filter.seite--; zeichneKandidaten(); } }), h('span', { text: `${filter.seite + 1} / ${seiten}` }), h('button', { class: 'btn klein', disabled: filter.seite >= seiten - 1, text: '›', onclick: () => { filter.seite++; zeichneKandidaten(); } })] : []));
  };
  zeichne();
  return {};
}

