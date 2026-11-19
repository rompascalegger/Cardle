// Kampagne (Welten, Bosse) und Kampfansicht. [FEST 12] automatischer Kampf, Beschwörung, 5 Leben.
import { CONFIG, KLASSEN } from '../config.js';
import { S, karte, teamPlaetze, aenderung, speichernBald } from '../state.js';
import { karteElement, esc, zahl } from '../cardview.js';
import { ELEMENTE, glyphSVG, farbe, farbton, faktorText } from '../elements.js';
import { attrIcon } from '../attributes.js';
import { EFFEKT_BY_KEY } from '../effects.js';
import { monsterBild } from '../monsterart.js';
import { Sound } from '../audio.js';
import { Rng } from '../rng.js';
import { staerke } from '../rules.js';
import { WELTEN, kampfNachId, freigeschaltet, gegnerTeam, belohnung, elementNamen } from '../campaign.js';
import { neuerKampf, zugBeginn, kampf, beschwoere, tausche, kiBeschwoeren, werte, restLeben, maxLeben, effektiveKosten, einkommen, angezeigtesEl, lebenVerborgen, findeEinheit, lebend } from '../battle.js';
import { h, modal, toast, warte, anim, ICON, fmt, fmt1, schuetteln, partikel } from './dom.js';

// ---------- Weltkarte ----------
export function kampagneScreen(root, nav) {
  const wrap = h('section', { class: 'screen kampagne' });
  const p = teamPlaetze();
  const fort = S.d.kampagne.fortschritt;
  wrap.append(h('div', { class: 'panel kp-kopf', html: `<h2>Kampagne</h2><span>Team: <b>${S.d.team.length}</b> Karten · Plätze ${p.belegt}/${p.gesamt}</span><span>Siege <b>${S.d.kampagne.siege}</b> · Niederlagen ${S.d.kampagne.niederlagen}</span>` },
    h('button', { class: 'btn', text: 'Team bearbeiten', onclick: () => nav('team') })));
  const karteW = h('div', { class: 'welten' });
  for (const w of WELTEN) {
    const offen = freigeschaltet(fort, w.kaempfe[0]);
    const fertig = w.kaempfe.every((k) => fort[k.id]);
    const box = h('div', { class: 'welt panel' + (offen ? '' : ' gesperrt') + (fertig ? ' fertig' : '') + (w.finale ? ' finale' : ''), style: `--wh:${farbton(w.els[0]).toFixed(0)}` });
    box.append(h('div', { class: 'welt-kopf', html: `<span class="welt-nr">${w.finale ? '★' : w.nr}</span><div><h3>${esc(w.name)}</h3><div class="welt-els">${w.els.map((e) => `<span class="siegel-klein" style="--el:${farbe(e)}" data-tip="${esc(ELEMENTE[e].name)}">${glyphSVG(e)}</span>`).join('')}<small>${esc(elementNamen(w.els))}</small></div></div>` }));
    const knoten = h('div', { class: 'welt-knoten' });
    for (const k of w.kaempfe) {
      const frei = freigeschaltet(fort, k);
      const b = belohnung(k);
      knoten.append(h('button', {
        class: 'knoten' + (k.boss ? ' boss' : '') + (fort[k.id] ? ' gewonnen' : '') + (frei ? '' : ' zu'),
        disabled: !frei,
        html: `<b>${esc(k.name)}</b><span>Stärke ~${k.staerke}</span><span>${ICON.herz}${k.leben}</span><em>${ICON.pack}${b.packs} ${ICON.muenze}${b.muenzen}</em>${fort[k.id] ? '<i class="haken">✓</i>' : ''}`,
        onclick: () => vorschau(k, nav),
      }));
    }
    box.append(knoten);
    karteW.append(box);
  }
  wrap.append(karteW);
  root.append(wrap);
  return {};
}

function vorschau(k, nav) {
  const gegner = gegnerTeam(k);
  const b = belohnung(k);
  const grid = h('div', { class: 'vs-gegner' }, gegner.map((c) => { const el = karteElement(c, { animiert: false, nurMaus: true, rueckseite: 'info', drehbar: true }); el.classList.add('mini'); return el; }));
  const p = teamPlaetze();
  const ok = S.d.team.length > 0 && p.ok;
  modal({
    titel: `${esc(k.name)} <small>${k.boss ? 'Boss · ' : ''}${esc(elementNamen(k.els))}</small>`,
    inhalt: h('div', {}, h('p', { html: `Gegnerische Stärke <b>${fmt(gegner.reduce((x, c) => x + staerke(c.a), 0))}</b> · Leben <b>${k.leben}</b> · Belohnung ${ICON.pack} <b>${b.packs}</b> Packs, ${ICON.muenze} <b>${b.muenzen}</b>` }), grid,
      h('p', { class: 'leise', html: ok ? `Dein Team: ${S.d.team.length} Karten, Stärke ${fmt(S.d.team.reduce((x, i) => x + staerke(karte(i).a), 0))}. Du hast ${CONFIG.kampf.spielerLeben} Leben.` : 'Stelle zuerst ein Team auf.' })),
    klasse: 'breit',
    knoepfe: [
      { text: 'Team bearbeiten', aktion: () => nav('team') },
      { text: 'Kämpfen', klasse: 'primaer', disabled: !ok, aktion: () => nav('kampf', { id: k.id }) },
    ],
  });
}

// ---------- Kampfansicht ----------
const TEMPI = [1, 2, 4];
export function kampfScreen(root, nav, { id }) {
  const k = kampfNachId(id);
  if (!k || !S.d.team.length) { nav('kampagne'); return {}; }
  const b = neuerKampf({
    spielerKarten: S.d.team.map(karte), gegnerKarten: gegnerTeam(k), gegnerLeben: k.leben,
    rng: new Rng(`${S.d.seed}:${id}:${S.d.stat.packs}:${S.d.kampagne.siege + S.d.kampagne.niederlagen}`),
    gegnerName: k.boss ? k.name : 'Gegner',
  });
  const v = { auswahlHand: null, auswahlFeld: null, phase: 'start', tempoI: S.d.einst.kampfTempo || 0, auto: false, laeuft: false, aus: false };
  const wrap = h('section', { class: 'screen kampf' });
  wrap.innerHTML = `
<div class="kf-seite gegner"><div class="kf-name"></div><div class="kf-leben"></div><div class="kf-bank"></div><div class="kf-hand-zahl"></div></div>
<div class="kf-brett"><div class="kf-spalten"></div><div class="kf-flug"></div></div>
<div class="kf-mitte"><span class="kf-zug"></span><span class="kf-phase"></span></div>
<div class="kf-seite spieler"><div class="kf-name"></div><div class="kf-leben"></div><div class="kf-bank"></div><div class="kf-knoepfe"></div></div>
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
    const t = h('div', { class: `einheit kl-${KLASSEN[u.c.kl].key}${u.seite ? ' feind' : ''}`, 'data-uid': u.uid, style: `--el:${farbe(el)};--elh:${farbton(el).toFixed(0)}` });
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
    t.querySelector('.eh-werte').innerHTML = z('kraft', w.kraft, 'Elementarkraft') + z('schutz', w.schutz, 'Elementarschutz') + z('wildheit', w.wild, 'Wildheit') + z('schlagzahl', w.schlag, 'Schlagzahl') + (w.groesse ? z('groesse', w.groesse, 'Größe') : '') + (w.selt ? z('seltsamkeit', w.selt, 'Seltsamkeit') : '') + (w.mult > 1 ? `<span data-tip="Teamplatz-Multiplikator">×${zahl(w.mult)}</span>` : '');
    const fx = [...u.fx, ...(u.kopie ? [u.kopie] : [])];
    t.querySelector('.eh-fx').innerHTML = fx.map((key) => { const e = EFFEKT_BY_KEY[key]; const an = b.zug >= u.aktivAb && u.gebanntZug !== b.zug; return `<span class="${an ? 'an' : ''}" data-tip="${esc(e.name)}${an ? '' : ' (noch nicht aktiv)'}: ${esc(e.wirkung)}">${e.blitz ? '⚡' : '✦'}</span>`; }).join('');
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
      if (p.feld[i]) ss.append(kachel(p.feld[i]));
      ss.addEventListener('click', () => slotKlick(i));
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
      t.addEventListener('click', () => {
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
          if (e.kein) { blase(t0, 'kein Ziel'); await warte(D(150)); break; }
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
        case 'atem': { const t = kachelVon(e.uid); blase(t, 'Zweiter Atem!'); Sound.beschwoeren(); await warte(D(300)); break; }
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
    const erstSieg = sieg && !fort[k.id];
    let text = `<p>${esc(b.ende.grund)}.</p>`;
    if (sieg) {
      const bel = belohnung(k);
      S.d.packs += bel.packs; S.d.muenzen += bel.muenzen;
      fort[k.id] = true;
      S.d.kampagne.siege++;
      text += `<p class="belohnung">${ICON.pack} <b>+${bel.packs}</b> Packs &nbsp; ${ICON.muenze} <b>+${bel.muenzen}</b> Münzen</p>${erstSieg ? '<p class="gold">Neuer Fortschritt freigeschaltet!</p>' : ''}`;
      Sound.sieg();
      const r = wrap.getBoundingClientRect();
      partikel(r.left + r.width / 2, r.top + r.height / 3, { anzahl: 70, weite: 380 });
    } else {
      S.d.kampagne.niederlagen++;
      text += '<p>Tipp: Öffne mehr Packs, nutze Gegenpol-Vorteile (×2,5) und Karten mit Wildheit, um gezielt anzugreifen.</p>';
      Sound.niederlage();
    }
    aenderung('kampf'); speichernBald(200);
    modal({
      titel: sieg ? 'Sieg!' : b.ende.sieger === -1 ? 'Unentschieden' : 'Niederlage',
      inhalt: text, klasse: sieg ? 'sieg' : 'niederlage', schliessbar: false,
      knoepfe: [{ text: 'Nochmal', aktion: () => nav('kampf', { id: k.id }) }, { text: sieg ? 'Packs öffnen' : 'Zur Kampagne', klasse: 'primaer', aktion: () => nav(sieg ? 'packs' : 'kampagne') }],
    });
  };

  zeichneAlles();
  neuerZug();
  return { verlassen: () => { v.aus = true; } };
}

export { lebend };
