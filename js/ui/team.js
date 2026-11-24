// Team bauen: Plätze aus Grundvorrat + Teamkapazität. [VORSCHLAG 12.3] Team aus der Sammlung.
import { CONFIG } from '../config.js';
import { S, karte, teamPlaetze, teamSetzen, teamBauen, teamSlotWaehlen, teamSlotUmbenennen } from '../state.js';
import { karteElement } from '../cardview.js';
import { Sound } from '../audio.js';
import { ARTEN } from '../species.js';

const ROLLEN = Object.keys(CONFIG.rollen);
import { staerke, kosten, plaetzeBelegt, plaetzeBringt } from '../rules.js';
import { h, toast, fmt, ICON } from './dom.js';
import { FILTER_STANDARD, SORTEN, datenLaden, passt, kartenWert, vergleich, filterFelder, filterChips, suchFeld, listenAnsicht, ansichtUmschalter, kartenZeile, listenKopf } from './sammlung.js';

// Eigene Filter für den Teambildschirm (gleiche Möglichkeiten wie im Album)
const T_STANDARD = { ...FILTER_STANDARD, team: 'nicht', sort: 'staerke', ab: true, offen: false };
const filter = { ...T_STANDARD };
const bau = { strategie: 'kurve', quelle: 'gefiltert', behalten: false, einmalig: false, maxKarten: 24 };
const STRATEGIEN = [
  ['kurve', 'Kostenkurve (empfohlen)'], ['staerke', 'Stärkste zuerst'], ['effizienz', 'Stärke je Kosten'],
  ['guenstig', 'Günstigste zuerst (viele Karten)'], ['reihenfolge', 'Nach aktueller Sortierung'],
];
const TEAM_SORTEN = SORTEN.filter(([k]) => !['anzahl', 'ausf'].includes(k));
const PRO_SEITE = 24;
// Ansicht „Dein Team“: eigene Suche, Filter und Sortierung [Nutzer, 24.11.2026: nach Rolle und Stärke sortieren]
const TEAM_ANSICHT_STANDARD = { ...FILTER_STANDARD, sort: 'rolle-staerke', ab: true, offen: false };
const teamF = { ...TEAM_ANSICHT_STANDARD };
const TEAM_ANSICHT_SORTEN = [['rolle-staerke', 'Rolle, dann Stärke'], ['staerke', 'Stärke'], ...SORTEN.filter(([k]) => !['anzahl', 'ausf', 'staerke', 'nr'].includes(k))];
const filterAktiv = () => Object.keys(T_STANDARD).some((k) => !['sort', 'ab', 'offen', 'seite'].includes(k) && filter[k] !== T_STANDARD[k]);

export function teamScreen(root, nav) {
  const wrap = h('section', { class: 'screen team' });
  const kopf = h('div', { class: 'panel team-kopf' });
  const teamReihe = h('div', { class: 'team-reihe' });
  const kandKopf = h('div', { class: 'kand-kopf' });
  const kand = h('div', { class: 'kand-grid' });
  const seitenLeiste = h('div', { class: 'seiten' });
  const bauLeiste = h('div', { class: 'team-bau' });
  const teamKopf = h('div', { class: 'kand-kopf' });
  wrap.append(kopf, h('div', { class: 'panel' }, h('h3', { text: 'Team bauen' }), bauLeiste), h('div', { class: 'panel' }, teamKopf, teamReihe), h('div', { class: 'panel' }, kandKopf, kand, seitenLeiste));
  let daten = datenLaden();
  let treffer = [];

  // Automatisch bauen mit Strategie, Quelle (ganze Sammlung oder nur gefilterte Karten) und Optionen
  const bauFelder = () => {
    const wahl = (key, optionen) => h('select', { onchange: (e) => { bau[key] = e.target.value; } }, optionen.map(([v, t]) => h('option', { value: v, selected: bau[key] === v, text: t })));
    const haken = (key, text) => { const i = h('input', { type: 'checkbox', checked: bau[key] }); i.addEventListener('change', () => { bau[key] = i.checked; }); return h('label', { class: 'haken' }, i, h('span', { text })); };
    const max = h('input', { type: 'number', min: 1, max: 24, value: bau.maxKarten });
    max.addEventListener('change', () => { bau.maxKarten = Math.max(1, Math.min(24, Number(max.value) || 24)); max.value = bau.maxKarten; });
    const anzahl = treffer.length;
    return [
      h('label', {}, h('span', { text: 'Strategie' }), wahl('strategie', STRATEGIEN)),
      h('label', {}, h('span', { text: 'Karten aus' }), wahl('quelle', [['gefiltert', `nur gefilterten Karten (${fmt(anzahl)})`], ['alle', 'der ganzen Sammlung']])),
      h('label', {}, h('span', { text: 'Höchstens Karten' }), max),
      haken('behalten', 'Aktuelles Team behalten und auffüllen'),
      haken('einmalig', 'Jedes Monster nur einmal'),
      h('div', { class: 'tk-knoepfe' },
        h('button', { class: 'btn primaer', text: 'Team bauen', onclick: () => {
          const kandidaten = bau.quelle === 'gefiltert' ? treffer.map((x) => x.i) : null;
          const n = teamBauen({ kandidaten, strategie: bau.strategie, behalten: bau.behalten, einmalig: bau.einmalig, maxKarten: bau.maxKarten });
          Sound.klick(); toast(n ? `Team mit ${n} Karten aufgestellt.` : 'Keine passenden Karten.'); neu();
        } }),
        h('button', { class: 'btn', text: 'Sichtbare hinzufügen', onclick: () => {
          const seite = treffer.slice(filter.seite * PRO_SEITE, (filter.seite + 1) * PRO_SEITE);
          const team = [...S.d.team];
          let n = 0;
          for (const x of seite) { if (team.length >= 24) break; if (teamPlaetze([...team, x.i]).ok) { team.push(x.i); n++; } }
          teamSetzen(team); Sound.klick(); toast(n ? `${n} Karten hinzugefügt.` : 'Kein Platz mehr im Team.'); neu();
        } })),
    ];
  };
  const neu = () => { daten = datenLaden(); zeichne(); };
  root.append(wrap);

  const mini = (i, beiKlick, extra = '') => {
    if (listenAnsicht()) { const x = daten[i] || datenLaden()[i]; return kartenZeile(x, { onclick: () => beiKlick(i), klasse: extra }); }
    const c = karte(i);
    const el = karteElement(c, { animiert: false, nurMaus: true });
    const box = h('div', { class: 'team-karte ' + extra }, el, h('div', { class: 'tk-info', html: `<span data-tip="Beschwörungskosten">${ICON.beschwoerung}${kosten(c)}</span><span data-tip="Belegte Teamplätze">▣ ${plaetzeBelegt(c)}</span>${plaetzeBringt(c) ? `<span class="gut" data-tip="Bringt Teamplätze mit">+${plaetzeBringt(c)}</span>` : ''}` }));
    const tg = S.d.tags?.[i];
    if (tg != null) box.append(h('span', { class: 'tag-marke', style: `--tag:${CONFIG.tags[tg].farbe}`, title: `Tag: ${CONFIG.tags[tg].name}` }));
    if (S.d.spitznamen?.[i]) box.querySelector('.tk-info')?.prepend(h('b', { class: 'tk-nick', text: `„${S.d.spitznamen[i]}“` }));
    box.addEventListener('click', () => beiKlick(i));
    return box;
  };

  const zeichne = () => {
    const p = teamPlaetze();
    const sum = S.d.team.reduce((x, i) => x + staerke(karte(i).a), 0);
    kopf.innerHTML = '';
    const balken = h('div', { class: 'platz-balken' + (p.ok ? '' : ' voll') }, h('i', { style: { width: Math.min(100, (p.belegt / Math.max(1, p.gesamt)) * 100) + '%' } }));
    const slots = h('div', { class: 'team-slots' }, S.d.teamSlots.map((sl, n) => h('button', {
      class: 'team-slot' + (n === S.d.teamSlot ? ' an' : ''),
      title: n === S.d.teamSlot ? 'Doppelklick zum Umbenennen' : 'Dieses Team aktivieren',
      ondblclick: () => { if (n !== S.d.teamSlot) return; const name = prompt('Name für dieses Team:', sl.name); if (name != null) { teamSlotUmbenennen(n, name); zeichne(); } },
      onclick: () => { if (n === S.d.teamSlot) return; teamSlotWaehlen(n); Sound.klick(); neu(); },
    }, h('b', { text: sl.name }), h('small', { text: `${sl.team.length} Karten` }))));
    kopf.append(
      slots,
      h('div', { class: 'tk-zeile' },
        h('h2', { text: S.d.teamSlots[S.d.teamSlot].name }),
        h('span', { html: `Plätze <b>${p.belegt}</b> / ${p.gesamt}` }),
        h('span', { html: `${S.d.team.length} Karten · Stärke gesamt <b>${fmt(sum)}</b>` }),
        h('div', { class: 'tk-knoepfe' },
          h('button', { class: 'btn', text: 'Umbenennen', onclick: () => { const sl = S.d.teamSlots[S.d.teamSlot]; const name = prompt('Name für dieses Team:', sl.name); if (name != null) { teamSlotUmbenennen(S.d.teamSlot, name); zeichne(); } } }),
          h('button', { class: 'btn', text: 'Kopieren nach …', onclick: () => {
            const ziel = prompt(`In welchen Slot kopieren? (1–${S.d.teamSlots.length})`, String(((S.d.teamSlot + 1) % S.d.teamSlots.length) + 1));
            const n = Number(ziel) - 1;
            if (!S.d.teamSlots[n] || n === S.d.teamSlot) return;
            S.d.teamSlots[n].team = S.d.team.slice(); toast(`Kopiert nach „${S.d.teamSlots[n].name}“.`); zeichne();
          } }),
          h('button', { class: 'btn', text: 'Leeren', onclick: () => { teamSetzen([]); zeichne(); } }),
          h('button', { class: 'btn primaer', text: 'Zur Kampagne', onclick: () => nav('kampagne') }))),
      balken,
      h('p', { class: 'leise', text: `Jede Karte belegt so viele Plätze wie ihr Teamplatz-Wert (mindestens 1). Grundvorrat ${CONFIG.kampf.teamGrundplaetze}, Karten mit Teamkapazität bringen weitere Plätze mit. Teamplatz wirkt als Angriffsmultiplikator.` }),
    );
    bauLeiste.replaceChildren(...bauFelder());
    zeichneTeamKopf();
    zeichneTeam();
    zeichneKandidaten();
  };

  // „Dein Team“: Standard nach Rolle gruppiert und innerhalb nach Stärke, sonst jede Sortierung; Suche und Filter
  const zeichneTeamKopf = () => {
    teamKopf.replaceChildren(
      h('div', { class: 'kand-leiste' },
        h('h3', { text: 'Dein Team' }),
        suchFeld(teamF, () => { zeichneTeam(); teamChips(); }, 'Im Team suchen …'),
        h('select', { onchange: (e) => { teamF.sort = e.target.value; zeichneTeam(); } }, TEAM_ANSICHT_SORTEN.map(([v, t]) => h('option', { value: v, selected: teamF.sort === v, text: t }))),
        h('button', { class: 'btn klein', text: teamF.ab ? '↓ absteigend' : '↑ aufsteigend', onclick: () => { teamF.ab = !teamF.ab; zeichneTeamKopf(); zeichneTeam(); } }),
        h('button', { class: 'btn klein' + (teamF.offen ? ' an' : ''), text: 'Filter', onclick: () => { teamF.offen = !teamF.offen; zeichneTeamKopf(); } }),
        ansichtUmschalter(() => zeichne()),
        h('span', { class: 'treffer team-treffer' })),
      teamF.offen ? filterFelder(teamF, () => { zeichneTeam(); teamChips(); }, { ohne: ['Name', 'Team', 'Monster'] }) : '',
      filterChips(teamF, TEAM_ANSICHT_STANDARD, () => { zeichneTeamKopf(); zeichneTeam(); }) || '',
    );
  };
  const teamChips = () => { const alt = teamKopf.querySelector('.filter-chips'); const neu = filterChips(teamF, TEAM_ANSICHT_STANDARD, () => { zeichneTeamKopf(); zeichneTeam(); }); if (alt) alt.replaceWith(neu || h('span')); else if (neu) teamKopf.append(neu); };
  const zeichneTeam = () => {
    const entfernen = (j) => { teamSetzen(S.d.team.filter((x) => x !== j)); zeichne(); };
    const imTeam = new Set(S.d.team);
    const liste = daten.filter((x) => imTeam.has(x.i) && passt({ ...x, team: true }, { ...teamF, team: 'alle' }));
    const richtung = teamF.ab ? -1 : 1;
    const t = teamKopf.querySelector('.team-treffer');
    if (t) t.textContent = `${liste.length} / ${S.d.team.length} Karten`;
    if (!S.d.team.length) { teamReihe.replaceChildren(h('p', { class: 'leise', text: 'Noch leer. Tippe unten Karten an oder stelle automatisch auf.' })); return; }
    if (!liste.length) { teamReihe.replaceChildren(h('p', { class: 'leise', text: 'Keine Teamkarte passt zu Suche oder Filter.' })); return; }
    if (teamF.sort === 'rolle-staerke') {
      const gruppen = ROLLEN.map((r) => ({ r, karten: liste.filter((x) => x.art.rolle === r).sort((x, y) => richtung * (x.sum - y.sum)) })).filter((g) => g.karten.length);
      teamReihe.replaceChildren(...gruppen.map((g) => h('div', { class: 'rollen-gruppe' },
        h('h4', { text: `${CONFIG.rollen[g.r].name} · ${g.karten.length} · Stärke ${g.karten.reduce((s, x) => s + x.sum, 0)}` }),
        h('div', { class: 'rollen-karten' + (listenAnsicht() ? ' als-liste' : '') }, ...(listenAnsicht() ? [listenKopf()] : []), ...g.karten.map((x) => mini(x.i, entfernen, 'im-team'))))));
      return;
    }
    liste.sort((a, b) => richtung * vergleich(kartenWert(a, teamF), kartenWert(b, teamF)) || a.i - b.i);
    teamReihe.replaceChildren(h('div', { class: 'rollen-karten' + (listenAnsicht() ? ' als-liste' : '') }, ...(listenAnsicht() ? [listenKopf()] : []), ...liste.map((x) => mini(x.i, entfernen, 'im-team'))));
  };

  const chipsNeu = () => { const alt = kandKopf.querySelector('.filter-chips'); const neu = filterChips(filter, T_STANDARD, zeichneKandidaten); if (alt) alt.replaceWith(neu || h('span')); else if (neu) kandKopf.append(neu); };
  const zeichneKandidaten = () => {
    const nurListe = () => { zeichneListe(); bauLeiste.replaceChildren(...bauFelder()); };
    kandKopf.replaceChildren(
      h('div', { class: 'kand-leiste' },
        h('h3', { text: 'Sammlung' }),
        suchFeld(filter, () => { nurListe(); chipsNeu(); }),
        h('select', { onchange: (e) => { filter.sort = e.target.value; filter.seite = 0; nurListe(); } }, TEAM_SORTEN.map(([v, t]) => h('option', { value: v, selected: filter.sort === v, text: t }))),
        h('button', { class: 'btn klein', text: filter.ab ? '↓ absteigend' : '↑ aufsteigend', onclick: () => { filter.ab = !filter.ab; zeichneKandidaten(); } }),
        h('button', { class: 'btn klein' + (filter.offen ? ' an' : ''), text: filterAktiv() ? 'Filter ●' : 'Filter', onclick: () => { filter.offen = !filter.offen; zeichneKandidaten(); } }),
        h('button', { class: 'btn klein', text: 'Zurücksetzen', onclick: () => { Object.assign(filter, { ...T_STANDARD, offen: filter.offen }); zeichneKandidaten(); } }),
        h('span', { class: 'treffer' })),
      filter.offen ? filterFelder(filter, () => { nurListe(); chipsNeu(); const k = kandKopf.querySelector('.kand-leiste .btn.an'); if (k) k.textContent = filterAktiv() ? 'Filter ●' : 'Filter'; }, { ohne: ['Name', 'Team', 'Monster'] }) : '',
      filterChips(filter, T_STANDARD, zeichneKandidaten) || '',
    );
    nurListe();
  };
  const zeichneListe = () => {
    const imTeam = new Set(S.d.team);
    const richtung = filter.ab ? -1 : 1;
    treffer = daten.filter((x) => !imTeam.has(x.i) && passt(x, filter));
    treffer.sort((a, b) => richtung * vergleich(kartenWert(a, filter), kartenWert(b, filter)) || a.i - b.i);
    const t = kandKopf.querySelector('.treffer');
    if (t) t.textContent = `${fmt(treffer.length)} Karten`;
    const seiten = Math.max(1, Math.ceil(treffer.length / PRO_SEITE));
    filter.seite = Math.min(filter.seite, seiten - 1);
    kand.classList.toggle('als-liste', listenAnsicht());
    kand.replaceChildren(...(listenAnsicht() && treffer.length ? [listenKopf()] : []), ...treffer.slice(filter.seite * PRO_SEITE, (filter.seite + 1) * PRO_SEITE).map((x) => mini(x.i, (j) => {
      const neuTeam = [...S.d.team, j];
      const p = teamPlaetze(neuTeam);
      if (!p.ok) { toast(`Zu wenig Teamplätze (${p.belegt} / ${p.gesamt}).`); return; }
      teamSetzen(neuTeam); Sound.klick(); zeichne();
    })));
    if (!treffer.length) kand.append(h('p', { class: 'leise', text: S.karten.length ? 'Keine passenden Karten.' : 'Noch keine Karten. Öffne zuerst ein paar Packs.' }));
    seitenLeiste.replaceChildren(...(seiten > 1 ? [h('button', { class: 'btn klein', disabled: filter.seite === 0, text: '‹', onclick: () => { filter.seite--; zeichneListe(); } }), h('span', { text: `${filter.seite + 1} / ${seiten}` }), h('button', { class: 'btn klein', disabled: filter.seite >= seiten - 1, text: '›', onclick: () => { filter.seite++; zeichneListe(); } })] : []));
  };
  zeichne();
  return {};
}

