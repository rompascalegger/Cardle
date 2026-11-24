// Kampagne (Welten, Bosse) und Kampfansicht. [FEST 12] automatischer Kampf, Beschwörung, 5 Leben.
import { CONFIG, KLASSEN } from '../config.js';
import { S, karte, teamPlaetze, aenderung, speichernBald, sonderPacksGeben, teamSlotWaehlen } from '../state.js';
import { karteElement, esc, zahl } from '../cardview.js';
import { ELEMENTE, N, GLYPHEN, glyphSVG, farbe, farbton, faktorText } from '../elements.js';
import { attrIcon } from '../attributes.js';
import { EFFEKT_BY_KEY, effektText, PACK_EFFEKTE } from '../effects.js';
import { monsterBild } from '../monsterart.js';
import { Sound } from '../audio.js';
import { Rng } from '../rng.js';
import { staerke, dekodiere } from '../rules.js';
import { DIMENSIONEN, KERN_DIM, TIEF_DIM, istKern, tiefOffen, kampfNachId, freigeschaltet, naechsterKampf, aktuelleWelt, gegnerTeam, teamInfo, belohnung, schwierigkeit, elementNamen, kampfWerte, weltenFertig, weltenFertigIn, weltenGesamt, weltFertig, weltOffen, dimensionOffen, kernOffen, stufenFertigIn, weltName, dimensionName, weltThema, themaElement } from '../campaign.js';
import { dailyKampf, dailyGegner, dailyTeam, dailyTeamWaehlen, dailyBelohnung, dailyStand, dailyGeschafft, msBisMorgen } from '../daily.js';
import { ERFOLGE, pruefeErfolge, lohnText } from '../erfolge.js';
import { karteVergroessern } from './lupe.js';
import { neuerKampf, zugBeginn, kampf, beschwoere, tausche, kiBeschwoeren, werte, restLeben, maxLeben, effektiveKosten, einkommen, angezeigtesEl, lebenVerborgen, findeEinheit, lebend } from '../battle.js';
import { h, modal, toast, warte, anim, ICON, fmt, fmt1, schuetteln, partikel, konfetti } from './dom.js';

// ---------- Weltkarte ----------
// ---------- Karte: Dimensionen auf dem Elementrad ----------
const teamStaerke = () => S.d.team.reduce((x, i) => x + staerke(karte(i).a), 0);

export function kampagneScreen(root, nav) {
  const fort = S.d.kampagne.fortschritt;
  const K = S.d.kampagne;
  K.weltWahl = K.weltWahl || {};
  let dim = K.dim ?? 0;
  if (!dimensionOffen(fort, dim)) dim = 0;
  let welt = K.weltWahl[dim] || aktuelleWelt(fort, dim);
  const wrap = h('section', { class: 'screen kampagne' });
  const kopf = h('div', { class: 'panel kp-kopf' });
  const karteBox = h('div', { class: 'kp-karte' });
  const radBox = h('div', { class: 'panel kp-rad' });
  const dimBox = h('div', { class: 'panel kp-dim' });
  const weltBox = h('div', { class: 'panel kp-welt' });
  karteBox.append(radBox, dimBox);
  wrap.append(kopf, karteBox, weltBox);
  root.append(wrap);

  const zeichneKopf = () => {
    const eigene = teamStaerke();
    const fertig = weltenFertig(fort);
    const p = teamPlaetze();
    const naechster = naechsterKampf(fort, dim);
    kopf.replaceChildren(
      h('div', { class: 'kp-titel', html: `<h2>Kampagne</h2><span>Welten <b>${fertig}</b> / ${weltenGesamt()}</span><span>Siege <b>${fmt(K.siege)}</b></span><span data-tip="Je mehr Welten fertig sind, desto stärker werden alle Gegner">Gegnerstärke <b>×${zahl(CONFIG.kampagne.fortschrittFaktor(fertig))}</b></span>` }),
      h('div', { class: 'kp-balken' }, h('i', { style: { width: (fertig / weltenGesamt()) * 100 + '%' } })),
      h('div', { class: 'kp-team', html: `Team ${S.d.teamSlot + 1} · ${esc(S.d.teamSlots[S.d.teamSlot].name)}: <b>${S.d.team.length}</b> Karten · Stärke <b>${fmt(eigene)}</b> · Plätze ${p.belegt}/${p.gesamt}` }),
      h('div', { class: 'kp-knoepfe' },
        h('button', { class: 'btn', text: 'Team', onclick: () => nav('team') }),
        h('button', { class: 'btn', text: 'Erfolge', onclick: () => nav('erfolge') }),
        naechster ? h('button', { class: 'btn primaer', html: `${ICON.schwert} Weiter: ${esc(weltName(naechster.dim, naechster.welt))} · ${esc(naechster.name)}`, onclick: () => vorschau(naechster, nav) }) : null),
    );
  };

  // Rad: 32 Dimensionen außen, Kern in der Mitte. Gold zeigt den Fortschritt je Dimension.
  const zeichneRad = () => {
    const R = 200, r1 = 120, r2 = 192;
    const p = (r, a) => `${(R + Math.cos(a) * r).toFixed(1)},${(R + Math.sin(a) * r).toFixed(1)}`;
    const seg = (i, ra, rb, anteil = 1) => {
      const a0 = ((i - 0.5) / N) * Math.PI * 2 - Math.PI / 2, a1 = a0 + ((1 / N) * Math.PI * 2);
      const rr = ra + (rb - ra) * anteil;
      return `M${p(ra, a0)} L${p(rr, a0)} A${rr},${rr} 0 0 1 ${p(rr, a1)} L${p(ra, a1)} A${ra},${ra} 0 0 0 ${p(ra, a0)}Z`;
    };
    let svg = `<svg viewBox="0 0 400 400" class="kp-rad-svg" role="img" aria-label="Karte der Dimensionen">`;
    for (let d = 0; d < N; d++) {
      const anteil = weltenFertigIn(fort, d) / DIMENSIONEN[d].welten.length;
      const a = (d / N) * Math.PI * 2 - Math.PI / 2;
      svg += `<g class="kp-seg${d === dim ? ' an' : ''}${anteil === 1 ? ' fertig' : ''}" data-d="${d}"><path d="${seg(d, r1, r2)}" fill="${farbe(d, 60, anteil ? 42 : 24)}"/>`;
      if (anteil) svg += `<path d="${seg(d, r1, r2, anteil)}" fill="url(#gold)" opacity=".55"/>`;
      svg += `<g transform="translate(${(R + Math.cos(a) * 156 - 9).toFixed(1)} ${(R + Math.sin(a) * 156 - 9).toFixed(1)}) scale(.75)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPHEN[d]}</g>`;
      svg += `<title>${esc(dimensionName(d))}: ${weltenFertigIn(fort, d)}/8 Welten</title></g>`;
    }
    const kOffen = kernOffen(fort);
    const kFertig = weltenFertigIn(fort, KERN_DIM);
    const bereit = DIMENSIONEN.slice(0, KERN_DIM).filter((_, d) => weltenFertigIn(fort, d) >= CONFIG.kern.freiAbWeltenJeDimension).length;
    svg += `<defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffb347"/></linearGradient><radialGradient id="kern"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#b45cff"/><stop offset="1" stop-color="#1a0b30"/></radialGradient></defs>`;
    svg += `<g class="kp-kern${dim === KERN_DIM ? ' an' : ''}${kOffen ? '' : ' zu'}" data-d="${KERN_DIM}"><circle cx="200" cy="200" r="104" fill="url(#kern)" opacity="${kOffen ? 0.95 : 0.35}"/>`;
    svg += `<text x="200" y="152" text-anchor="middle" class="kp-kern-t">Kern</text><text x="200" y="174" text-anchor="middle" class="kp-kern-s">${kOffen ? `${kFertig}/16 Welten` : `🔒 ${bereit}/32 bereit`}</text><title>Kern-Dimension: offen, wenn in jeder Dimension ${CONFIG.kern.freiAbWeltenJeDimension} Welten fertig sind</title></g>`;
    // Tiefer Kern [Nutzer, 24.11.2026]: kleiner Kreis in der Mitte, offen nach allen 16 Kern-Welten
    const tOffen = tiefOffen(fort), tFertig = weltenFertigIn(fort, TIEF_DIM);
    svg += `<defs><radialGradient id="tief"><stop offset="0" stop-color="#ffe2e2"/><stop offset=".45" stop-color="#ff3d5e"/><stop offset="1" stop-color="#1a0410"/></radialGradient></defs>`;
    svg += `<g class="kp-kern kp-tief${dim === TIEF_DIM ? ' an' : ''}${tOffen ? '' : ' zu'}" data-d="${TIEF_DIM}"><circle cx="200" cy="228" r="44" fill="url(#tief)" opacity="${tOffen ? 0.95 : 0.4}"/>`;
    svg += `<text x="200" y="226" text-anchor="middle" class="kp-kern-s">Tiefer Kern</text><text x="200" y="244" text-anchor="middle" class="kp-kern-s">${tOffen ? `${tFertig}/16` : '🔒'}</text><title>Tiefer Kern: offen, wenn alle 16 Kern-Welten abgeschlossen sind. Gegnereffekte mit Seltenheit 2–5.</title></g></svg>`;
    radBox.innerHTML = svg;
    radBox.querySelectorAll('[data-d]').forEach((g) => g.addEventListener('click', () => {
      const d = Number(g.dataset.d);
      if (!dimensionOffen(fort, d)) { toast(d === TIEF_DIM ? `Der Tiefe Kern öffnet sich, wenn du alle 16 Welten der Kern-Dimension abgeschlossen hast (${kFertig}/16).` : `Die Kern-Dimension öffnet sich, wenn du in jeder Dimension ${CONFIG.kern.freiAbWeltenJeDimension} Welten abgeschlossen hast (${bereit}/32).`); return; }
      dim = d; K.dim = d; welt = K.weltWahl[d] || aktuelleWelt(fort, d);
      Sound.klick(); zeichneAlles();
    }));
  };

  const zeichneDim = () => {
    const D = DIMENSIONEN[dim];
    const fertig = weltenFertigIn(fort, dim);
    const glyphe = dim === KERN_DIM ? '★' : dim === TIEF_DIM ? '✷' : glyphSVG(dim);
    dimBox.replaceChildren(
      h('div', { class: 'kp-dim-kopf', html: `<span class="siegel-klein gross" style="--el:${dim === KERN_DIM ? '#b45cff' : dim === TIEF_DIM ? '#ff3d5e' : farbe(dim)}">${glyphe}</span><div><h3>${esc(D.name)}</h3><small>${fertig}/${D.welten.length} Welten · ${dim === KERN_DIM ? 'Gegenpol-Paare aus allen Elementen' : dim === TIEF_DIM ? `Gegnereffekte mit Seltenheit ${CONFIG.tiefKern.effektStufe(1)}–${CONFIG.tiefKern.effektStufe(16)}` : esc(ELEMENTE[dim].bed)}</small></div>` }),
      h('div', { class: 'kp-welten' }, D.welten.map((w) => {
        const offen = weltOffen(fort, dim, w.nr), done = weltFertig(fort, dim, w.nr);
        const n = stufenFertigIn(fort, dim, w.nr);
        const b = h('button', { class: 'kp-weltkarte' + (w.nr === welt ? ' an' : '') + (done ? ' fertig' : '') + (offen ? '' : ' zu'), style: `background-image:linear-gradient(180deg, rgba(10,6,24,.1), rgba(10,6,24,.85)), url("${weltThema(dim, w.nr)}")`,
          html: `<span class="kp-wn">${w.nr}</span><b>${esc(w.name)}</b><small>${done ? '✓ abgeschlossen' : offen ? `${n}/${CONFIG.kampagne.stufenProWelt} Stufen` : '🔒 gesperrt'}</small><i class="kp-wb"><i style="width:${(n / CONFIG.kampagne.stufenProWelt) * 100}%"></i></i>` });
        b.addEventListener('click', () => { if (!offen) { toast('Schließe zuerst die vorige Welt ab.'); return; } welt = w.nr; K.weltWahl[dim] = w.nr; Sound.klick(); zeichneDim(); zeichneWelt(); });
        return b;
      })),
    );
  };

  const zeichneWelt = () => {
    const W = DIMENSIONEN[dim].welten[welt - 1];
    const eigene = teamStaerke();
    const wb = dim === KERN_DIM ? CONFIG.kern.weltBelohnung(welt) : dim === TIEF_DIM ? CONFIG.tiefKern.weltBelohnung(welt) : CONFIG.kampagne.weltBelohnung(welt);
    const pfad = h('div', { class: 'ebene-pfad stufen' });
    W.stufen.forEach((k, i) => {
      if (i) pfad.append(h('i', { class: 'pfad-linie' + (fort[W.stufen[i - 1].id] ? ' an' : '') }));
      const frei = freigeschaltet(fort, k);
      const kw = kampfWerte(k, fort);
      const sw = schwierigkeit(kw.staerke, eigene);
      pfad.append(h('button', {
        class: 'knoten' + (k.zwischenboss ? ' boss' : '') + (k.weltBoss ? ' boss weltboss' : '') + (fort[k.id] ? ' gewonnen' : '') + (frei ? '' : ' zu'),
        disabled: !frei, style: `--sw:${sw.farbe}`,
        html: `<b>${esc(k.name)}</b><span>Stärke ${fmt(kw.staerke)}</span><span class="sw">${frei ? esc(sw.name) : '🔒'}</span><span>${ICON.herz}${k.leben}</span>${fort[k.id] ? '<i class="haken">✓</i>' : ''}`,
        onclick: () => vorschau(k, nav),
      }));
    });
    weltBox.replaceChildren(
      h('div', { class: 'kp-weltbanner', style: `background-image:linear-gradient(90deg, rgba(10,6,24,.9), rgba(10,6,24,.2)), url("${weltThema(dim, welt)}")`, html: `<div><small>${esc(DIMENSIONEN[dim].name)} · Welt ${welt}</small><h2>${esc(W.name)}</h2><span>Gegner: ${esc(elementNamen(W.stufen[0].els))}</span></div><div class="kp-weltlohn"><small>Für den Abschluss</small><b>★ ${wb.gluecks} Glückspack${wb.gluecks > 1 ? 's' : ''} · ${wb.element} Elementpack${wb.element > 1 ? 's' : ''} · ${fmt(wb.muenzen)} Münzen</b></div>` }),
      pfad,
    );
  };
  const zeichneAlles = () => { zeichneKopf(); zeichneRad(); zeichneDim(); zeichneWelt(); };
  zeichneAlles();
  return {};
}

function vorschau(k, nav) {
  const fort = S.d.kampagne.fortschritt;
  const daily = !!k.daily;
  const gegner = daily ? dailyGegner(k) : gegnerTeam(k, fort);
  const ti = teamInfo(gegner);
  const kw = daily ? { einkommen: k.einkommen, startBank: k.startBank } : kampfWerte(k, fort);
  const eigenTeam = daily ? dailyTeam(k.kl).team : S.d.team;
  const eigene = eigenTeam.reduce((x, i) => x + staerke(karte(i).a), 0);
  const sw = schwierigkeit(ti.staerke, eigene);
  const grid = h('div', { class: 'vs-gegner' }, gegner.map((c) => {
    const el = karteElement(c, { animiert: false, nurMaus: true });
    el.classList.add('mini');
    el.addEventListener('click', () => karteVergroessern(c));
    return el;
  }));
  const ok = eigenTeam.length > 0 && (daily || teamPlaetze().ok);
  // Team wählen: Nummer und Name aus den Teamslots, bei Dailies zusätzlich „automatisch“ [Nutzer, 24.11.2026]
  const dt = daily ? dailyTeam(k.kl) : null;
  const aktuell = daily ? dt.wahl : S.d.teamSlot;
  const klasseZahl = (sl) => (daily ? sl.team.filter((i) => i < S.karten.length && karte(i).kl === k.kl).length : sl.team.length);
  const teamWahl = h('label', { class: 'vs-teamwahl' }, h('span', { text: 'Team' }), h('select', {
    onchange: (e) => {
      const n = Number(e.target.value);
      if (daily) dailyTeamWaehlen(k.kl, n); else teamSlotWaehlen(n);
      speichernBald();
      m.zu();
      setTimeout(() => vorschau(daily ? dailyKampf(k.kl, undefined, dailyTeam(k.kl).team.length) : k, nav), 260);
    },
  }, [
    ...(daily ? [h('option', { value: -1, selected: aktuell === -1, text: `Automatisch (beste ${KLASSEN[k.kl].name}-Karten)` })] : []),
    ...S.d.teamSlots.map((sl, n) => h('option', { value: n, selected: aktuell === n, text: `${n + 1} · ${sl.name} (${klasseZahl(sl)} ${daily ? KLASSEN[k.kl].name + '-' : ''}Karten)` })),
  ]));
  const titel = daily ? esc(k.name) : `${esc(weltName(k.dim, k.welt))} · ${esc(k.name)}`;
  const lohn = daily ? dailyBelohnung(k.kl) : belohnung(k, !fort[k.id]);
  const m = modal({
    titel,
    inhalt: h('div', {},
      teamWahl,
      h('div', { class: 'vs-vergleich', html: `
<div><span>Gegnerteam</span><b>${fmt(ti.staerke)}</b><small>${gegner.length} Karten · Plätze ${ti.belegt}/${ti.gesamt} · ${ICON.herz} ${k.leben}</small><small>${ICON.beschwoerung} ${kw.einkommen} je Zug${kw.startBank ? ` · Vorsprung ${kw.startBank}` : ''}</small></div>
<div class="vs-sw" style="--sw:${sw.farbe}"><b>${esc(sw.name)}</b></div>
<div><span>${daily ? `Dein ${KLASSEN[k.kl].name}-Team` : `Team ${S.d.teamSlot + 1} · ${esc(S.d.teamSlots[S.d.teamSlot].name)}`}</span><b>${fmt(eigene)}</b><small>${eigenTeam.length} Karten · ${ICON.herz} ${CONFIG.kampf.spielerLeben}</small><small>${ICON.beschwoerung} ${CONFIG.kampf.beschwoerungProZug} je Zug</small></div>` }),
      h('p', { class: 'leise', html: `Elemente: ${esc(elementNamen(k.els))} · Belohnung ${ICON.pack} <b>${lohn.packs}</b> Packs, ${ICON.muenze} <b>${fmt(lohn.muenzen)}</b>${lohn.gluecks ? ` · <span class="gluecks-text">★ ${lohn.gluecks} Glückspack</span>` : ''}${lohn.welt ? ' · <span class="gluecks-text">★ Weltbelohnung</span>' : ''} · Karte antippen zum Vergrößern` }),
      daily ? h('p', { class: 'leise', text: dt.wahl >= 0 ? `Es kämpfen die ${KLASSEN[k.kl].name}-Karten aus Team ${dt.wahl + 1} (${S.d.teamSlots[dt.wahl].name}), höchstens 12.` : `Es kämpfen automatisch deine besten ${KLASSEN[k.kl].name}-Karten.` }) : null,
      grid,
      ok ? null : h('p', { class: 'gold', text: daily ? (dt.wahl >= 0 && dt.verfuegbar ? `In Team ${dt.wahl + 1} sind keine ${KLASSEN[k.kl].name}-Karten. Wähle ein anderes Team oder „Automatisch“.` : `Du hast noch keine ${KLASSEN[k.kl].name}-Karten.`) : 'Stelle zuerst ein gültiges Team auf.' })),
    klasse: 'breit',
    knoepfe: [
      daily ? { text: 'Zurück' } : { text: 'Team bearbeiten', aktion: () => nav('team') },
      { text: 'Kämpfen', klasse: 'primaer', disabled: !ok, aktion: () => nav('kampf', daily ? { daily: k.kl } : { id: k.id }) },
    ],
  });
}

// ---------- Daily Challenges ----------
export function dailyScreen(root, nav) {
  const d = dailyStand();
  const wrap = h('section', { class: 'screen daily' });
  const rest = msBisMorgen();
  wrap.append(h('div', { class: 'panel kp-kopf', html: `<div class="kp-titel"><h2>Daily Challenges</h2><span>Neue Gegner in <b>${Math.floor(rest / 36e5)} h ${Math.floor((rest % 36e5) / 6e4)} min</b></span><span>Serie <b>${d.serie || 0}</b> Tag${d.serie === 1 ? '' : 'e'}</span></div><p class="leise">Jede Klasse hat ihre eigene Challenge. Es kämpfen nur deine Karten genau dieser Klasse gegen ein Team derselben Klasse. Jede Challenge gibt einmal am Tag eine Belohnung.</p>` }));
  const grid = h('div', { class: 'daily-grid' });
  KLASSEN.forEach((kl, i) => {
    const k = dailyKampf(i, undefined, dailyTeam(i).team.length);
    const { team, verfuegbar } = dailyTeam(i);
    const eigene = team.reduce((x, j) => x + staerke(karte(j).a), 0);
    const ti = teamInfo(dailyGegner(k));
    const sw = schwierigkeit(ti.staerke, eigene || 1);
    const l = dailyBelohnung(i);
    const geschafft = !!d.geschafft[i];
    const box = h('button', { class: `daily-karte kl-${kl.key}${geschafft ? ' geschafft' : ''}${verfuegbar ? '' : ' zu'}`, style: `--sw:${sw.farbe}`,
      html: `<span class="daily-klasse">${kl.name}</span><b>Daily ${kl.name} Challenge</b><small>Gegner ${fmt(ti.staerke)} · dein Team ${fmt(eigene)} (${verfuegbar} Karten)</small><span class="sw">${verfuegbar ? esc(sw.name) : 'keine Karten'}</span><em>${ICON.pack}${l.packs} ${ICON.muenze}${fmt(l.muenzen)}${l.gluecks ? ' <span class="gluecks-text">★</span>' : ''}${l.element ? ' +Elementpack' : ''}</em>${geschafft ? '<i class="haken">✓ heute geschafft</i>' : ''}` });
    box.addEventListener('click', () => { if (!verfuegbar) { toast(`Du hast noch keine ${kl.name}-Karten.`); return; } vorschau(k, nav); });
    grid.append(box);
  });
  wrap.append(grid);
  root.append(wrap);
  return {};
}

// ---------- Erfolge ----------
export function erfolgeScreen(root, nav) {
  const wrap = h('section', { class: 'screen erfolge' });
  root.append(wrap);
  const abholen = (ids) => {
    for (const id of ids) { S.d.erfolgeAbgeholt[id] = true; sonderPacksGeben({}, 0); S.d.sonderPacks.push({ typ: 'erfolg' }); }
    Sound.jackpot(4); konfetti(60);
    toast(`${ids.length} Erfolgspack${ids.length > 1 ? 's' : ''} abgeholt. Öffnen unter „Packs“.`);
    aenderung('packs'); speichernBald(200);
    wrap.replaceChildren(); erfolgeInhalt();
  };
  const erfolgeInhalt = () => {
  const gruppen = [...new Set(ERFOLGE.map((e) => e.gruppe))];
  const geschafft = ERFOLGE.filter((e) => S.d.erfolge[e.id]).length;
  const offen = ERFOLGE.filter((e) => S.d.erfolge[e.id] && !S.d.erfolgeAbgeholt[e.id]).map((e) => e.id);
  const kopf = h('div', { class: 'panel kp-kopf', html: `<div class="kp-titel"><h2>Erfolge</h2><span><b>${geschafft}</b> / ${ERFOLGE.length} freigeschaltet</span><span>Jeder Erfolg gibt ein Erfolgspack (Chancen ×${CONFIG.erfolgsPack.faktor}).</span></div>` });
  if (offen.length) kopf.append(h('div', { class: 'kp-knoepfe' }, h('button', { class: 'btn primaer', html: `🏆 Alle Erfolgspacks abholen (${offen.length})`, onclick: () => abholen(offen) }), h('button', { class: 'btn', text: 'Zu den Packs', onclick: () => nav && nav('packs') })));
  wrap.append(kopf);
  for (const g of gruppen) {
    const box = h('div', { class: 'panel erfolg-gruppe' }, h('h3', { text: g }));
    const liste = h('div', { class: 'erfolg-liste' });
    for (const e of ERFOLGE.filter((x) => x.gruppe === g)) {
      const fertig = !!S.d.erfolge[e.id];
      const w = Math.min(e.ziel, e.wert());
      const el = h('div', { class: 'erfolg' + (fertig ? ' fertig' : ''), html: `<span class="erfolg-orden">${fertig ? '★' : '☆'}</span><div><b>${esc(e.name)}</b><small>${esc(e.text)}</small><i class="erfolg-balken"><i style="width:${(w / e.ziel) * 100}%"></i></i></div><div class="erfolg-lohn"><small>${fertig ? 'erhalten' : `${fmt(w)}/${fmt(e.ziel)}`}</small><span>${esc(lohnText(e.lohn))} · 🏆 Erfolgspack</span></div>` });
      if (fertig && !S.d.erfolgeAbgeholt[e.id]) el.append(h('button', { class: 'btn klein primaer erfolg-abholen', text: 'Abholen', onclick: () => abholen([e.id]) }));
      liste.append(el);
    }
    box.append(liste);
    wrap.append(box);
  }
  wrap.append(effektLexikon());
  };
  erfolgeInhalt();
  return {};
}

// Effekt-Lexikon [Nutzer, 24.11.2026]: alle entdeckten Effekte mit Seltenheit und Beschreibung, Unentdeckte verdeckt
const lexikonF = { suche: '', zeige: 'alle' };
function effektLexikon() {
  const ES = CONFIG.effektStufen;
  const entdeckt = S.d.effekteEntdeckt || {};
  // Anzahl je Effekt in der aktuellen Sammlung
  const besitz = {};
  for (const code of S.karten) { const c = dekodiere(code); for (const id of c.fx) besitz[id] = (besitz[id] || 0) + 1; }
  // Entdeckte zuerst, danach die noch verdeckten
  const alle = [...PACK_EFFEKTE].sort((a, b) => !!entdeckt[b.id] - !!entdeckt[a.id] || a.id - b.id);
  const gefunden = alle.filter((e) => entdeckt[e.id]).length;
  const stufenGesamt = alle.reduce((n, e) => n + (e.skaliert ? 5 : 1), 0);
  const stufenGefunden = alle.reduce((n, e) => n + [0, 1, 2, 3, 4].filter((i) => (entdeckt[e.id] || 0) & (1 << i)).length, 0);
  const liste = h('div', { class: 'lexikon-liste' });
  const zeichne = () => {
    const q = lexikonF.suche.trim().toLowerCase();
    const zeilen = alle.filter((e) => {
      const hat = !!entdeckt[e.id];
      if (lexikonF.zeige === 'entdeckt' && !hat) return false;
      if (lexikonF.zeige === 'offen' && hat) return false;
      if (lexikonF.zeige === 'neu' && !e.skaliert) return false;
      return !q || (hat && `${e.name} ${e.wirkung}`.toLowerCase().includes(q));
    }).map((e) => {
      const m = entdeckt[e.id] || 0;
      if (!m) return h('div', { class: 'lexikon-eintrag zu', html: `<span class="lx-icon">?</span><div><b>???</b><small>Noch nicht entdeckt${e.skaliert ? ' · skaliert mit Seltenheit 1–5' : ''}</small></div>` });
      const stufen = e.skaliert ? [1, 2, 3, 4, 5] : [1];
      const chips = stufen.map((st) => { const hat = m & (1 << (st - 1)); return `<span class="lx-stufe${hat ? ' hat' : ''}" style="--fxc:${ES.farben[st - 1]}" title="${ES.namen[st - 1]}${hat ? ' (entdeckt)' : ' (noch nicht entdeckt)'}: ${esc(effektText(e.id, st))}">${hat ? ES.namen[st - 1] : '?'}</span>`; }).join('');
      const hoechste = [5, 4, 3, 2, 1].find((st) => m & (1 << (st - 1))) || 1;
      const texte = e.skaliert
        ? stufen.filter((st) => m & (1 << (st - 1))).map((st) => `<div class="lx-text" style="--fxc:${ES.farben[st - 1]}"><i>${ES.namen[st - 1]} (+${st}):</i> ${esc(effektText(e.id, st))}</div>`).join('')
        : `<div class="lx-text">${esc(e.wirkung)}</div>`;
      return h('div', { class: 'lexikon-eintrag', style: `--fxc:${ES.farben[hoechste - 1]}`, html: `<span class="lx-icon">${e.blitz ? '⚡' : '✦'}</span><div><b>${esc(e.name)}</b>${texte}<div class="lx-stufen">${chips}</div></div><div class="lx-besitz"><b>${fmt(besitz[e.id] || 0)}</b><small>in der Sammlung</small></div>` });
    });
    liste.replaceChildren(...(zeilen.length ? zeilen : [h('p', { class: 'leise', text: 'Keine Effekte passen.' })]));
  };
  const suche = h('input', { type: 'search', class: 'such-feld', placeholder: 'Effekt suchen …', value: lexikonF.suche });
  suche.addEventListener('input', () => { lexikonF.suche = suche.value; zeichne(); });
  const wahl = h('select', { onchange: (e) => { lexikonF.zeige = e.target.value; zeichne(); } }, [['alle', 'Alle'], ['entdeckt', 'Nur entdeckte'], ['offen', 'Nur unentdeckte'], ['neu', 'Nur skalierende (Seltenheit 1–5)']].map(([v, t]) => h('option', { value: v, selected: lexikonF.zeige === v, text: t })));
  zeichne();
  return h('div', { class: 'panel erfolg-gruppe lexikon' },
    h('div', { class: 'kand-leiste' }, h('h3', { text: 'Entdeckte Effekte' }), h('span', { class: 'leise', html: `<b>${gefunden}</b> / ${alle.length} Effekte · <b>${stufenGefunden}</b> / ${stufenGesamt} Seltenheiten` }), suche, wahl),
    h('p', { class: 'leise', html: `Seltenheiten: ${ES.namen.map((n, i) => `<b style="color:${ES.farben[i]}">${n}</b>`).join(' · ')}. Klassische Effekte gibt es nur als ${ES.namen[0]}, die neuen skalieren bis ${ES.namen[4]}. Einmal gefunden bleibt ein Effekt entdeckt, auch wenn du die Karte verkaufst.` }),
    liste);
}

// Erfolge melden (Toast mit Fanfare)
export function erfolgeMelden(neu) {
  neu.forEach((e, i) => setTimeout(() => { Sound.jackpot(5); toast(`<b>★ Erfolg: ${esc(e.name)}</b><br><small>${esc(lohnText(e.lohn))}</small>`, 'erfolg', 4200); }, 600 + i * 900));
}

// ---------- Kampfansicht ----------
const TEMPI = [1, 2, 3, 5, 10]; // [Nutzer, 21.11.2026] bis ×10
export function kampfScreen(root, nav, { id, daily = null }) {
  const fortschritt = S.d.kampagne.fortschritt;
  const k = daily != null ? dailyKampf(daily, undefined, dailyTeam(daily).team.length) : kampfNachId(id);
  const eigenTeam = daily != null ? dailyTeam(daily).team : S.d.team;
  if (!k || !eigenTeam.length) { nav(daily != null ? 'daily' : 'kampagne'); return {}; }
  const kw = daily != null ? { einkommen: k.einkommen, startBank: k.startBank } : kampfWerte(k, fortschritt);
  const b = neuerKampf({
    spielerKarten: eigenTeam.map(karte), gegnerKarten: daily != null ? dailyGegner(k) : gegnerTeam(k, fortschritt), gegnerLeben: k.leben,
    rng: new Rng(`${S.d.seed}:${k.id}:${S.d.stat.packs}:${S.d.kampagne.siege + S.d.kampagne.niederlagen}`),
    gegnerName: k.daily ? k.name : k.boss ? k.name : 'Gegner', gegnerEinkommen: kw.einkommen, gegnerStartBank: kw.startBank,
  });
  const v = { auswahlHand: null, auswahlFeld: null, phase: 'start', tempoI: S.d.einst.kampfTempo || 0, auto: false, laeuft: false, aus: false };
  const wrap = h('section', { class: 'screen kampf' });
  wrap.innerHTML = `
<div class="kf-seite gegner"><div class="kf-name"></div><div class="kf-leben"></div><div class="kf-bank"></div><div class="kf-staerke"></div><div class="kf-hand-zahl"></div></div>
<div class="kf-brett"><div class="kf-spalten"></div><div class="kf-flug"></div></div>
<div class="kf-mitte"><span class="kf-zug"></span><span class="kf-phase"></span></div>
<div class="kf-seite spieler"><div class="kf-name"></div><div class="kf-leben"></div><div class="kf-bank"></div><div class="kf-staerke"></div><div class="kf-knoepfe"></div></div>
<div class="kf-hand"></div>
<details class="kf-log"><summary>Kampfprotokoll</summary><div class="kf-log-inhalt"></div></details>`;
  root.append(wrap);
  const q = (s) => wrap.querySelector(s);
  const spalten = q('.kf-spalten');
  const flug = q('.kf-flug');
  const D = (ms) => ms / TEMPI[v.tempoI];

  // ---- Darstellung einer Einheit ----
  const kachel = (u) => {
    const bild = monsterBild(u.art, false);
    const el = angezeigtesEl(u, 0);
    const t = h('div', { class: `einheit kl-${KLASSEN[u.c.kl].key}${u.seite ? ' feind' : ''}${u.fx.length ? ' mit-fx fx-' + u.fx.length : ''}`, 'data-uid': u.uid, style: `--el:${farbe(el)};--elh:${farbton(el).toFixed(0)}` });
    t.innerHTML = `<div class="eh-bild"><img src="${bild.bg}" alt=""><img class="eh-fg" src="${bild.fg}" alt=""></div>
<div class="eh-siegel" data-tip="${esc(ELEMENTE[el].name)}">${glyphSVG(el)}</div>
<div class="eh-name">${esc(u.name)}</div>
<div class="eh-hp"><i></i><span></span></div>
<div class="eh-werte"></div><div class="eh-fx"></div>`;
    aktualisiereKachel(t, u);
    return t;
  };
  const aktualisiereKachel = (t, u, hp = null) => {
    const max = maxLeben(b, u);
    const rest = hp ?? restLeben(b, u);
    const versteckt = lebenVerborgen(b, u, 0);
    t.querySelector('.eh-hp i').style.width = Math.max(0, Math.min(100, (rest / max) * 100)) + '%';
    t.querySelector('.eh-hp span').textContent = versteckt ? '?' : `${fmt1(Math.max(0, rest))}/${max}`;
    t.classList.toggle('verletzt', rest / max < 0.35);
    const w = werte(b, u);
    const z = (key, wert, tip) => `<span data-tip="${tip}: ${wert}">${attrIcon(key)}<b>${wert}</b></span>`;
    t.querySelector('.eh-werte').innerHTML = z('kraft', w.kraft, 'Elementarkraft') + z('schutz', w.schutz, 'Elementarschutz') + z('wildheit', w.wild, 'Wildheit') + z('schlagzahl', w.schlag, 'Schlagzahl') + (w.groesse ? z('groesse', w.groesse, 'Größe') : '') + (w.selt ? z('seltsamkeit', w.selt, 'Seltsamkeit') : '') + (u.a.heilung ? z('heilung', u.a.heilung, 'Heilung je Runde') : '') + (w.mult > 1 ? `<span data-tip="Teamplatz-Multiplikator">×${zahl(w.mult)}</span>` : '');
    const fx = [...u.fx, ...(u.kopie ? [u.kopie] : [])];
    t.querySelector('.eh-fx').innerHTML = fx.map((key) => { const e = EFFEKT_BY_KEY[key]; const an = b.zug >= u.aktivAb && u.gebanntZug !== b.zug; const st = u.fxStufe?.[key] || 1; return `<span class="${an ? 'an' : ''}" style="--fxc:${CONFIG.effektStufen.farben[st - 1]}" data-tip="${esc(e.name)} (${CONFIG.effektStufen.namen[st - 1]})${an ? '' : ' (noch nicht aktiv)'}: ${esc(effektText(e.id, st))}">${e.blitz ? '⚡' : '✦'}</span>`; }).join('');
    const el = angezeigtesEl(u, 0);
    t.style.setProperty('--el', farbe(el));
    t.querySelector('.eh-siegel').innerHTML = glyphSVG(el) + (u.elZug !== u.el && (u.seite === 0 || u.enthuellt || u.falschEl == null) ? '<i class="versch">↻</i>' : '');
    t.querySelector('.eh-siegel').dataset.tip = ELEMENTE[el].name + (u.elZug !== u.el ? ` (verschoben von ${ELEMENTE[u.el].name})` : '');
  };
  const kachelVon = (uid) => spalten.querySelector(`.einheit[data-uid="${uid}"]`);

  const zeichneBrett = () => {
    const [p, g] = b.seiten;
    const n = Math.max(p.feld.length, g.feld.length) + 1;
    spalten.replaceChildren();
    for (let i = 0; i < n; i++) {
      const sp = h('div', { class: 'kf-spalte', 'data-i': i });
      const sg = h('div', { class: 'slot g' }), ss = h('div', { class: 'slot s' });
      if (g.feld[i]) sg.append(kachel(g.feld[i]));
      if (p.feld[i]) { const t = kachel(p.feld[i]); t.addEventListener('pointerdown', (e) => ziehStart(e, 'feld', i, t)); ss.append(t); }
      ss.addEventListener('click', () => { if (!v.nachZiehen) slotKlick(i); });
      sp.append(sg, h('div', { class: 'kf-linie' }), ss);
      spalten.append(sp);
    }
    markiere();
  };
  const markiere = () => {
    spalten.querySelectorAll('.slot.s').forEach((s, i) => {
      const leer = !b.seiten[0].feld[i];
      s.classList.toggle('ziel', v.phase === 'spieler' && ((v.auswahlHand != null && leer) || v.auswahlFeld != null));
      s.classList.toggle('gewaehlt', v.auswahlFeld === i);
    });
  };
  const herzen = (s) => {
    const seite = b.seiten[s];
    return Array.from({ length: Math.max(seite.maxLeben, seite.leben) }, (_, i) => (i < seite.leben ? ICON.herz : ICON.herzLeer)).join('');
  };
  const zeichneSeiten = () => {
    for (const [s, cls] of [[0, 'spieler'], [1, 'gegner']]) {
      const seite = b.seiten[s];
      const box = q(`.kf-seite.${cls}`);
      box.querySelector('.kf-name').textContent = seite.name;
      box.querySelector('.kf-leben').innerHTML = herzen(s);
      box.querySelector('.kf-bank').innerHTML = `<span data-tip="Beschwörungspunkte (angespart). Pro Zug +${einkommen(b, s)}">${ICON.beschwoerung}<b>${fmt(seite.bank)}</b><small>+${einkommen(b, s)}</small></span>`;
      // [Nutzer] Stärke im Kampf sichtbar: Leben auf dem Feld und Stärke in der Hand
      const feld = lebend(seite).reduce((x, u) => x + Math.max(0, restLeben(b, u)), 0);
      const feldMax = lebend(seite).reduce((x, u) => x + maxLeben(b, u), 0);
      const hand = seite.hand.reduce((x, u) => x + staerke(u.a), 0);
      box.querySelector('.kf-staerke').innerHTML = `<span data-tip="Stärke auf dem Feld (verbleibende Lebenspunkte / Maximum) und in der Hand"><b>${fmt1(feld)}</b><small>/${fmt(feldMax)} Feld</small> · <b>${fmt(hand)}</b><small> Hand</small></span>`;
    }
    q('.kf-hand-zahl').innerHTML = `<span data-tip="Karten in der gegnerischen Hand">🂠 ${b.seiten[1].hand.length}</span>`;
    q('.kf-zug').textContent = `Zug ${b.zug}`;
    q('.kf-phase').textContent = b.ende ? 'Kampfende' : v.phase === 'spieler' ? (v.auto ? 'Automatisch' : 'Beschwören und umstellen') : v.phase === 'kampf' ? 'Kampf läuft' : '';
    const knoepfe = q('.kf-knoepfe');
    knoepfe.replaceChildren(
      h('button', { class: 'btn primaer gross', disabled: v.phase !== 'spieler' || v.auto || !!b.ende, html: `${ICON.schwert} Kampf!`, onclick: () => kampfRunde() }),
      h('button', { class: 'btn' + (v.auto ? ' an' : ''), text: v.auto ? 'Auto an' : 'Auto', 'data-tip': 'Beschwört und kämpft automatisch für dich', onclick: () => { v.auto = !v.auto; b.autoSpieler = v.auto; zeichneSeiten(); if (v.auto && v.phase === 'spieler') autoSchritt(); } }),
      h('button', { class: 'btn', text: `${TEMPI[v.tempoI]}×`, 'data-tip': 'Tempo der Animation', onclick: () => { v.tempoI = (v.tempoI + 1) % TEMPI.length; S.d.einst.kampfTempo = v.tempoI; zeichneSeiten(); } }),
      h('button', { class: 'btn leise-btn', text: 'Aufgeben', onclick: () => { if (!b.ende) { b.ende = { sieger: 1, grund: 'aufgegeben' }; ende(); } } }),
    );
  };
  const zeichneHand = () => {
    const hand = q('.kf-hand');
    const seite = b.seiten[0];
    hand.replaceChildren(...seite.hand.map((u, i) => {
      const k = effektiveKosten(b, 0, u);
      const t = kachel(u);
      t.classList.add('in-hand');
      const leistbar = k <= seite.bank;
      t.classList.toggle('teuer', !leistbar);
      t.classList.toggle('gewaehlt', v.auswahlHand === i);
      t.append(h('div', { class: 'eh-kosten', html: `${ICON.beschwoerung}${k}` }));
      t.addEventListener('pointerdown', (e) => ziehStart(e, 'hand', i, t));
      t.addEventListener('click', () => {
        if (v.nachZiehen) return;
        if (v.phase !== 'spieler' || v.auto) return;
        if (!leistbar) { toast(`Zu wenig Beschwörungspunkte (${k} nötig, ${seite.bank} vorhanden). Ungenutzte Punkte werden angespart.`); return; }
        if (v.auswahlHand === i) { platzieren(i, null); return; }
        v.auswahlHand = i; v.auswahlFeld = null;
        zeichneHand(); markiere();
      });
      return t;
    }));
    if (!seite.hand.length) hand.append(h('p', { class: 'leise', text: 'Keine Karten mehr in der Hand.' }));
  };
  const zeichneLog = () => { q('.kf-log-inhalt').innerHTML = b.log.slice(-80).reverse().map((l) => `<div><b>${l.zug}</b> ${esc(l.text)}</div>`).join(''); };
  const zeichneAlles = () => { zeichneBrett(); zeichneSeiten(); zeichneHand(); zeichneLog(); };

  // ---- Eingaben ----
  const platzieren = async (handIdx, spalte) => {
    if (spalte == null) {
      const f = b.seiten[0].feld;
      spalte = f.findIndex((x, i) => !x && b.seiten[1].feld[i]);
      if (spalte < 0) spalte = f.findIndex((x) => !x);
      if (spalte < 0) spalte = f.length;
    }
    if (beschwoere(b, 0, handIdx, spalte)) {
      v.auswahlHand = null;
      zeichneSeiten(); zeichneHand();
      await spiele(b.ev.splice(0));
      zeichneAlles();
    }
  };
  // ---- Ziehen und Ablegen (Maus und Finger) ----
  // Handkarte auf ein freies Feld ziehen = beschwören, Feldkarte auf ein anderes Feld ziehen = tauschen
  let zug = null;
  const ziehStart = (e, art, wert, el) => {
    if (v.phase !== 'spieler' || v.auto || (e.button != null && e.button > 0)) return;
    zug = { art, wert, el, x0: e.clientX, y0: e.clientY, geist: null };
  };
  const slotUnter = (x, y) => {
    const ziel = document.elementFromPoint(x, y);
    const slot = ziel && ziel.closest('.slot.s');
    return slot ? Number(slot.parentElement.dataset.i) : null;
  };
  const bewegen = (e) => {
    if (!zug) return;
    if (!zug.geist) {
      if (Math.hypot(e.clientX - zug.x0, e.clientY - zug.y0) < 8) return;
      if (zug.art === 'hand' && effektiveKosten(b, 0, b.seiten[0].hand[zug.wert]) > b.seiten[0].bank) { toast('Zu wenig Beschwörungspunkte für diese Karte.'); zug = null; return; }
      const r = zug.el.getBoundingClientRect();
      zug.dx = e.clientX - r.left; zug.dy = e.clientY - r.top;
      zug.geist = zug.el.cloneNode(true);
      zug.geist.classList.add('zieh-geist');
      zug.geist.style.width = r.width + 'px'; zug.geist.style.height = r.height + 'px';
      document.body.append(zug.geist);
      zug.el.classList.add('wird-gezogen');
      wrap.classList.add('zieht', 'zieht-' + zug.art);
      Sound.schnipp();
    }
    e.preventDefault();
    zug.geist.style.transform = `translate(${e.clientX - zug.dx}px, ${e.clientY - zug.dy}px) rotate(-4deg) scale(1.05)`;
    const i = slotUnter(e.clientX, e.clientY);
    spalten.querySelectorAll('.slot.s').forEach((s, k) => s.classList.toggle('drueber', k === i));
  };
  const loslassen = async (e) => {
    if (!zug) return;
    const z = zug; zug = null;
    if (!z.geist) return;
    v.nachZiehen = true; setTimeout(() => { v.nachZiehen = false; }, 50);
    z.geist.remove(); z.el.classList.remove('wird-gezogen');
    wrap.classList.remove('zieht', 'zieht-hand', 'zieht-feld');
    spalten.querySelectorAll('.slot.s.drueber').forEach((s) => s.classList.remove('drueber'));
    const i = slotUnter(e.clientX, e.clientY);
    if (i == null || v.phase !== 'spieler') return;
    if (z.art === 'hand') { if (!b.seiten[0].feld[i]) { v.auswahlHand = null; await platzieren(z.wert, i); } else toast('Dieses Feld ist besetzt. Ziehe die Karte auf ein freies Feld.'); }
    else if (z.wert !== i) { tausche(b, 0, z.wert, i); Sound.schnipp(); v.auswahlFeld = null; zeichneBrett(); }
  };
  addEventListener('pointermove', bewegen, { passive: false });
  addEventListener('pointerup', loslassen);
  addEventListener('pointercancel', loslassen);

  const slotKlick = (i) => {
    if (v.phase !== 'spieler' || v.auto) return;
    if (v.auswahlHand != null) { if (!b.seiten[0].feld[i]) platzieren(v.auswahlHand, i); return; }
    if (v.auswahlFeld != null) {
      if (v.auswahlFeld !== i) { tausche(b, 0, v.auswahlFeld, i); Sound.schnipp(); }
      v.auswahlFeld = null; zeichneBrett(); return;
    }
    if (b.seiten[0].feld[i]) { v.auswahlFeld = i; markiere(); }
  };

  // ---- Ereignisse abspielen ----
  const mitte = (el) => { const r = el.getBoundingClientRect(), o = flug.getBoundingClientRect(); return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2 }; };
  const zahlFliegt = (el, text, art = '') => {
    if (!el) return;
    const p = mitte(el);
    const z = h('div', { class: 'schadenzahl ' + art, html: text });
    z.style.left = p.x + 'px'; z.style.top = p.y + 'px';
    flug.append(z);
    anim(z, [{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-190%) scale(1)', opacity: 0 }], { duration: D(1100), easing: 'ease-out' }).then(() => z.remove());
  };
  const geschoss = async (von, nach, farbeEl) => {
    if (!von || !nach) return;
    const a = mitte(von), z = mitte(nach);
    const g = h('i', { class: 'geschoss', style: `--gf:${farbeEl}` });
    g.style.left = a.x + 'px'; g.style.top = a.y + 'px';
    flug.append(g);
    anim(von, [{ transform: 'none' }, { transform: `translateY(${z.y < a.y ? -14 : 14}px) scale(1.06)` }, { transform: 'none' }], { duration: D(320), fill: 'none' });
    await anim(g, [{ transform: 'translate(-50%,-50%) scale(.5)' }, { transform: `translate(calc(-50% + ${z.x - a.x}px), calc(-50% + ${z.y - a.y}px)) scale(1.1)` }], { duration: D(280), easing: 'cubic-bezier(.5,0,.8,.6)' });
    g.remove();
  };
  const schuettle = (el) => el && anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: D(260), fill: 'none' });
  const blase = (el, text) => zahlFliegt(el, text, 'info');

  const spiele = async (evs) => {
    for (const e of evs) {
      if (v.aus) return;
      const u = e.uid ? findeEinheit(b, e.uid) : e.von ? findeEinheit(b, e.von) : null;
      switch (e.t) {
        case 'zug': q('.kf-zug').textContent = `Zug ${e.zug}`; break;
        case 'einkommen': zeichneSeiten(); break;
        case 'beschwoeren': {
          const seite = b.seiten[e.seite];
          let sp = spalten.children[e.spalte];
          if (!sp) { zeichneBrett(); sp = spalten.children[e.spalte]; }
          const slot = sp?.querySelector(e.seite === 0 ? '.slot.s' : '.slot.g');
          const einheit = findeEinheit(b, e.uid);
          if (slot && einheit && !kachelVon(e.uid)) { slot.replaceChildren(kachel(einheit)); }
          const t = kachelVon(e.uid);
          Sound.beschwoeren();
          if (t) { t.classList.add('erscheint'); await anim(t, [{ transform: 'scale(.3) translateY(30px)', opacity: 0, filter: 'brightness(3)' }, { transform: 'none', opacity: 1, filter: 'none' }], { duration: D(420), easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'none' }); }
          if (e.frei) blase(t, esc(e.grund || 'kostenlos'));
          void seite;
          break;
        }
        case 'verschieben': { const t = kachelVon(e.uid); if (t && u) { aktualisiereKachel(t, u); anim(t.querySelector('.eh-siegel'), [{ transform: 'rotateY(0)' }, { transform: 'rotateY(360deg)' }], { duration: D(400), fill: 'none' }); } await warte(D(120)); break; }
        case 'blitz': { const t = kachelVon(e.ziel); Sound.treffer(1.5); zahlFliegt(t, `⚡ −${fmt1(e.wert)}`, 'blitz'); schuettle(t); const z = findeEinheit(b, e.ziel); if (t && z) aktualisiereKachel(t, z, e.hpNach); await warte(D(350)); break; }
        case 'heilung': { const t = kachelVon(e.uid); zahlFliegt(t, `+${fmt1(e.wert)}`, 'heil'); await warte(D(200)); break; }
        case 'angriff': {
          const t0 = kachelVon(e.von);
          if (e.leer) { blase(t0, 'freies Feld!'); Sound.treffer(0.5); await warte(D(250)); break; }
          if (e.kein) { blase(t0, e.grund ? `kein Ziel: ${e.grund}` : 'kein Ziel'); zeichneLog(); await warte(D(150)); break; }
          const tz = kachelVon(e.ziel);
          await geschoss(t0, tz, t0?.style.getPropertyValue('--el') || '#fff');
          Sound.treffer(e.f);
          schuettle(tz);
          const fText = Math.abs(e.f - 1) > 1e-6 ? `<small class="${e.f > 1 ? 'gut' : 'schlecht'}">${faktorText(e.f)}${e.art === 'gegenpol' ? ' Erzfeind!' : ''}</small>` : '';
          if (e.gespiegelt) {
            zahlFliegt(tz, 'Spiegel!', 'info');
            zahlFliegt(t0, `−${fmt1(e.schaden)}`, 'schaden');
            const a = findeEinheit(b, e.von); if (t0 && a) aktualisiereKachel(t0, a, e.hpAngreifer);
          } else {
            zahlFliegt(tz, `−${fmt1(e.schaden)}${fText}`, 'schaden' + (e.art === 'gegenpol' ? ' erz' : ''));
            const z = findeEinheit(b, e.ziel); if (tz && z) aktualisiereKachel(tz, z, e.hpNach);
          }
          await warte(D(140));
          break;
        }
        case 'dornen': case 'flaeche': { const t = kachelVon(e.ziel); zahlFliegt(t, `−${fmt1(e.schaden ?? 1)}`, 'schaden klein'); const z = findeEinheit(b, e.ziel); if (t && z) aktualisiereKachel(t, z, e.hpNach); break; }
        case 'atem': { const t = kachelVon(e.uid); blase(t, esc(e.text || 'Zweiter Atem!')); if (t) { const z = findeEinheit(b, e.uid); if (z) aktualisiereKachel(t, z); } Sound.beschwoeren(); await warte(D(300)); break; }
        case 'tod': {
          const t = kachelVon(e.uid);
          Sound.tod();
          if (t) {
            const r = t.getBoundingClientRect();
            partikel(r.left + r.width / 2, r.top + r.height / 2, { anzahl: 18, farben: [t.style.getPropertyValue('--el'), '#fff'], weite: 90, dauer: 700, groesse: 6 });
            await anim(t, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.6) rotate(8deg)', opacity: 0, filter: 'grayscale(1) brightness(2)' }], { duration: D(420), easing: 'ease-in' });
            t.remove();
          }
          break;
        }
        case 'leben': {
          zeichneSeiten();
          const box = q(`.kf-seite.${e.seite === 0 ? 'spieler' : 'gegner'} .kf-leben`);
          if (e.delta < 0) { Sound.leben(); schuetteln(q(`.kf-seite.${e.seite === 0 ? 'spieler' : 'gegner'}`), 1.4); zahlFliegt(box, `−1 ♥`, 'leben'); }
          else if (e.delta > 0) zahlFliegt(box, '+1 ♥', 'heil');
          await warte(D(500));
          break;
        }
        case 'anker': { const box = q(`.kf-seite.${e.seite === 0 ? 'spieler' : 'gegner'} .kf-leben`); zahlFliegt(box, 'Rettungsanker!', 'info'); await warte(D(400)); break; }
        case 'effekt': { const t = kachelVon(e.uid); const ef = EFFEKT_BY_KEY[e.key]; if (t && ef) blase(t, '✦ ' + esc(ef.name)); await warte(D(160)); break; }
        default: break;
      }
    }
  };

  // ---- Ablauf ----
  const neuerZug = async () => {
    v.phase = 'gegner';
    zugBeginn(b);
    zeichneSeiten();
    await spiele(b.ev.splice(0));
    v.phase = 'spieler';
    zeichneAlles();
    if (b.ende) return ende();
    if (v.auto) autoSchritt();
  };
  const kampfRunde = async () => {
    if (v.phase !== 'spieler' || b.ende) return;
    v.phase = 'kampf'; v.auswahlHand = null; v.auswahlFeld = null;
    zeichneSeiten(); zeichneHand(); markiere();
    kampf(b);
    await spiele(b.ev.splice(0));
    zeichneAlles();
    if (b.ende) return ende();
    await warte(D(250));
    await neuerZug();
  };
  const autoSchritt = async () => {
    if (!v.auto || v.phase !== 'spieler' || b.ende || v.aus) return;
    kiBeschwoeren(b, 0);
    await spiele(b.ev.splice(0));
    zeichneAlles();
    await warte(D(300));
    if (v.auto && !v.aus) kampfRunde();
  };
  const ende = () => {
    if (v.phase === 'ende') return;
    v.phase = 'ende';
    zeichneAlles();
    const sieg = b.ende.sieger === 0;
    const fort = S.d.kampagne.fortschritt;
    let text = `<p>${esc(b.ende.grund)}.</p>`;
    let weltText = '';
    if (sieg) {
      S.d.kampagne.siege++;
      if (k.daily) {
        const erst = dailyGeschafft(k.kl);
        S.d.erfolgeDaily = S.d.erfolgeDaily || {}; S.d.erfolgeDaily[k.kl] = true;
        if (erst) {
          const l = dailyBelohnung(k.kl);
          S.d.packs += l.packs; S.d.muenzen += l.muenzen;
          sonderPacksGeben({ gluecks: l.gluecks, element: l.element }, k.els[0]);
          text += `<p class="belohnung">${ICON.pack} <b>+${l.packs}</b> Packs &nbsp; ${ICON.muenze} <b>+${fmt(l.muenzen)}</b>${l.gluecks ? ' &nbsp; <span class="gluecks-text">★ +1 Glückspack</span>' : ''}${l.element ? ` &nbsp; +1 ${esc(ELEMENTE[k.els[0]].name)}-Elementpack` : ''}</p>`;
        } else text += '<p class="leise">Die Belohnung dieser Challenge hast du heute schon bekommen.</p>';
      } else {
        const erstSieg = !fort[k.id];
        const bel = belohnung(k, erstSieg);
        S.d.packs += bel.packs; S.d.muenzen += bel.muenzen;
        fort[k.id] = true;
        text += `<p class="belohnung">${ICON.pack} <b>+${bel.packs}</b> Packs &nbsp; ${ICON.muenze} <b>+${fmt(bel.muenzen)}</b> Münzen${erstSieg ? '' : ' <small class="leise">(Wiederholung)</small>'}</p>`;
        if (bel.welt) {
          const el = themaElement(k.dim, k.welt);
          sonderPacksGeben({ gluecks: bel.welt.gluecks, element: bel.welt.element }, el);
          S.d.muenzen += bel.welt.muenzen;
          weltText = `<div class="welt-geschafft" style="background-image:linear-gradient(90deg, rgba(10,6,24,.85), rgba(10,6,24,.3)), url('${weltThema(k.dim, k.welt)}')"><small>Welt abgeschlossen</small><h3>${esc(weltName(k.dim, k.welt))}</h3><p>★ <b>${bel.welt.gluecks}</b> Glückspack${bel.welt.gluecks > 1 ? 's' : ''} · <b>${bel.welt.element}</b> ${esc(ELEMENTE[el].name)}-Elementpack${bel.welt.element > 1 ? 's' : ''} · <b>${fmt(bel.welt.muenzen)}</b> Münzen</p></div>`;
          setTimeout(() => { konfetti(220); Sound.jackpot(9); }, 400);
        }
      }
      Sound.sieg();
      const r = wrap.getBoundingClientRect();
      partikel(r.left + r.width / 2, r.top + r.height / 3, { anzahl: 70, weite: 380 });
    } else {
      S.d.kampagne.niederlagen++;
      text += '<p>Tipp: Öffne mehr Packs, nutze Gegenpol-Vorteile (×2,5) und Karten mit Wildheit, um gezielt anzugreifen.</p>';
      Sound.niederlage();
    }
    const neueErfolge = pruefeErfolge();
    if (neueErfolge.length) text += `<div class="erfolg-neu"><b>Neue Erfolge</b>${neueErfolge.map((e) => `<div>★ ${esc(e.name)} <small>${esc(lohnText(e.lohn))}</small></div>`).join('')}</div>`;
    aenderung('kampf'); speichernBald(200);
    // Schließen (×, Escape, Klick daneben) führt zurück zur Karte bzw. zu den Dailys
    const zurueck = k.daily ? 'daily' : 'kampagne';
    let gewaehlt = false;
    const geh = (ziel, params) => () => { gewaehlt = true; nav(ziel, params); };
    const naechster = sieg && !k.daily ? naechsterKampf(fort, k.dim) : null;
    const knoepfe = [{ text: 'Nochmal', aktion: geh('kampf', k.daily ? { daily: k.kl } : { id: k.id }) }];
    if (sieg) knoepfe.push({ text: 'Packs öffnen', aktion: geh('packs') });
    knoepfe.push({ text: k.daily ? 'Zu den Dailys' : 'Zur Karte', klasse: naechster ? '' : 'primaer', aktion: geh(zurueck) });
    if (naechster) knoepfe.push({ text: `Weiter: ${esc(weltName(naechster.dim, naechster.welt))} · ${esc(naechster.name)}`, klasse: 'primaer', aktion: () => { gewaehlt = true; vorschau(naechster, nav); } });
    modal({
      titel: sieg ? (weltText ? 'Welt abgeschlossen!' : 'Sieg!') : b.ende.sieger === -1 ? 'Unentschieden' : 'Niederlage',
      inhalt: weltText + text, klasse: sieg ? 'sieg' : 'niederlage',
      knoepfe,
      onClose: () => { if (!gewaehlt) nav(zurueck); },
    });
  };

  zeichneAlles();
  neuerZug();
  return { verlassen: () => { v.aus = true; removeEventListener('pointermove', bewegen); removeEventListener('pointerup', loslassen); removeEventListener('pointercancel', loslassen); } };
}

export { lebend };
