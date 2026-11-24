// Auto-Öffnen gegen Münzen. [FEST 11.3] je schneller, desto teurer. [VORSCHLAG] Tempostufen und Auto-Stopp.
import { CONFIG, KLASSEN } from '../config.js';
import { S, packOeffnen, aenderung, speichernBald, speichernSpaetestens } from '../state.js';
import { karteElement, stufenFarbe, stufenName, esc } from '../cardview.js';
import { Sound } from '../audio.js';
import { ARTEN } from '../species.js';
import { h, toast, ICON, fmt } from './dom.js';
import { karteVergroessern } from './lupe.js';
import { FILTER_STANDARD, passt, filterFelder, filterChips, suchFeld, fundDaten } from './sammlung.js';

// Suche und Filter für die Fundliste [Nutzer, 24.11.2026: Filter überall, wo Karten angezeigt werden]
const FEED_STANDARD = { ...FILTER_STANDARD, offen: false };
const feedF = { ...FEED_STANDARD };

// [VORSCHLAG 11.3] Besondere Funde werden gezeigt. Ab Werk läuft das Auto-Öffnen danach von selbst weiter (keine Eingaben nötig).
// "Neues Monster" und Holo sind ab Werk aus: Bei 640 Arten bzw. 15 % Holo je Pack käme sonst ständig eine Unterbrechung.
const STANDARD_STOPP = { neuArt: false, neuAusf: false, holo: false, effekt: true, klasseAb: 6, stufeAb: 5, anhalten: false, vorrat: true };
const STOPP_VERSION = 3;
let lauf = null; // läuft über Bildschirmwechsel hinweg nicht weiter

export function autoScreen(root) {
  const einst = S.d.einst;
  einst.autoTempo ??= 0;
  if (einst.autoStoppV !== STOPP_VERSION) { einst.autoStopp = { ...STANDARD_STOPP }; einst.autoStoppV = STOPP_VERSION; }
  einst.autoStopp = Object.assign({}, STANDARD_STOPP, einst.autoStopp || {});
  const st = einst.autoStopp;
  const sitzung = { packs: 0, karten: 0, muenzen: 0, beste: 0, stufen: new Array(15).fill(0), klassen: new Array(8).fill(0), feed: [] };

  const wrap = h('section', { class: 'screen auto' });
  const links = h('div', { class: 'panel auto-steuerung' });
  const rechts = h('div', { class: 'auto-live' });
  wrap.append(links, rechts);
  root.append(wrap);

  // [FEST] jedes automatisch geöffnete Pack kostet Münzen, schneller = teurer.
  // [OFFEN, Platzhalter] Aus dem Vorrat zahlt man nur die Tempo-Gebühr, sonst wird das Pack zum Packpreis mitgekauft.
  const preisVorrat = (i) => CONFIG.autoOeffnen.stufen[i].gebuehr;
  const preis = (i) => CONFIG.wirtschaft.packPreis + preisVorrat(i);
  const naechsteKosten = () => (st.vorrat && S.d.packs > 0 ? { k: preisVorrat(einst.autoTempo), vorrat: true } : { k: preis(einst.autoTempo), vorrat: false });
  const tempoBox = h('div', { class: 'tempo-wahl' });
  const zeichneTempo = () => {
    tempoBox.replaceChildren(...CONFIG.autoOeffnen.stufen.map((t, i) => h('button', {
      class: 'tempo' + (i === einst.autoTempo ? ' an' : ''),
      onclick: () => { einst.autoTempo = i; zeichneTempo(); speichernBald(); },
      html: `<b>${t.name}</b><span>${t.packsProSekunde >= 1 ? fmt(t.packsProSekunde) + ' Packs/s' : '1 Pack / ' + Math.round(1 / t.packsProSekunde) + ' s'}</span><em>${ICON.muenze} ${fmt(preisVorrat(i))} je Pack aus dem Vorrat</em><small>ohne Vorrat ${fmt(preis(i))} (Pack wird gekauft)</small>`,
    })));
  };
  zeichneTempo();

  const check = (key, text) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st[key], onchange: (e) => { st[key] = e.target.checked; speichernBald(); } }), h('span', { text }));
  const auswahl = (key, optionen, text) => h('label', { class: 'auswahl' }, h('span', { text }), h('select', { onchange: (e) => { st[key] = Number(e.target.value); speichernBald(); } }, optionen.map(([v, t]) => h('option', { value: v, selected: st[key] === v, text: t }))));
  const startBtn = h('button', { class: 'btn gross primaer start' });
  const muenzInfo = h('div', { class: 'muenz-info' });

  links.append(
    h('h2', { text: 'Auto-Öffnen' }),
    h('p', { class: 'leise', text: 'Alle Ergebnisse stehen beim Öffnen fest. Das Tempo ändert nur die Zeit, nicht die Chancen.' }),
    tempoBox,
    h('div', { class: 'stopp-regeln' }, check('vorrat', 'Packs aus dem Vorrat zuerst öffnen')),
    h('h3', { text: 'Als Fund hervorheben bei' }),
    h('div', { class: 'stopp-regeln' },
      check('neuArt', 'neuem Monster'),
      check('neuAusf', 'neuer Ausführung'),
      check('holo', 'Holo-Stufe'),
      check('effekt', 'Spezialeffekt'),
      auswahl('klasseAb', [[99, 'nie'], ...KLASSEN.map((k, i) => [i, k.name + ' oder besser'])], 'Stärkeklasse'),
      auswahl('stufeAb', [[99, 'nie'], ...CONFIG.seltenheit.namen.map((n, i) => [i + 1, n + ' oder besser'])], 'Seltenheit'),
      check('anhalten', 'bei einem Fund anhalten (sonst läuft es weiter)'),
    ),
    muenzInfo, startBtn,
  );

  const zaehler = h('div', { class: 'auto-zaehler' });
  const band = h('div', { class: 'auto-band' });
  const histo = h('div', { class: 'auto-histo' });
  const feed = h('div', { class: 'auto-feed' });
  const fundBox = h('div', { class: 'panel fund-buehne', hidden: true });
  const feedKopf = h('div', { class: 'kand-kopf' });
  rechts.append(fundBox, h('div', { class: 'panel' }, band, zaehler), h('div', { class: 'panel' }, h('h3', { text: 'Diese Sitzung' }), histo), h('div', { class: 'panel' }, feedKopf, feed));
  const zeichneFeedKopf = () => feedKopf.replaceChildren(
    h('div', { class: 'kand-leiste' }, h('h3', { text: 'Besondere Funde' }), suchFeld(feedF, () => { zeichneFeed(); feedChips(); }, 'Funde durchsuchen …'),
      h('button', { class: 'btn klein' + (feedF.offen ? ' an' : ''), text: 'Filter', onclick: () => { feedF.offen = !feedF.offen; zeichneFeedKopf(); } })),
    feedF.offen ? filterFelder(feedF, () => { zeichneFeed(); feedChips(); }, { ohne: ['Name', 'Team', 'Monster', 'Favoriten'] }) : '',
    filterChips(feedF, FEED_STANDARD, () => { zeichneFeedKopf(); zeichneFeed(); }) || '');
  const feedChips = () => { const alt = feedKopf.querySelector('.filter-chips'); const neu = filterChips(feedF, FEED_STANDARD, () => { zeichneFeedKopf(); zeichneFeed(); }); if (alt) alt.replaceWith(neu || h('span')); else if (neu) feedKopf.append(neu); };

  const zeichne = () => {
    const t = CONFIG.autoOeffnen.stufen[einst.autoTempo];
    const ausVorrat = st.vorrat ? Math.min(S.d.packs, Math.floor(S.d.muenzen / preisVorrat(einst.autoTempo))) : 0;
    const rest = S.d.muenzen - ausVorrat * preisVorrat(einst.autoTempo);
    const moeglich = ausVorrat + Math.floor(Math.max(0, rest) / preis(einst.autoTempo));
    muenzInfo.innerHTML = `Vorrat <b>${fmt(S.d.packs)}</b> Packs · Münzen <b>${fmt(S.d.muenzen)}</b> · reicht für <b>${fmt(moeglich)}</b> Packs (${t.name})`;
    startBtn.textContent = lauf ? 'Anhalten' : 'Starten';
    startBtn.classList.toggle('stopp', !!lauf);
    wrap.classList.toggle('laeuft', !!lauf);
    zaehler.innerHTML = `<div><span>Packs</span><b>${fmt(sitzung.packs)}</b></div><div><span>Karten</span><b>${fmt(sitzung.karten)}</b></div><div><span>Ausgegeben</span><b>${ICON.muenze} ${fmt(sitzung.muenzen)}</b></div><div><span>Pity</span><b>${S.d.pity}</b></div><div><span>Beste</span><b style="color:${stufenFarbe(sitzung.beste || 1)}">${sitzung.beste ? esc(stufenName(sitzung.beste)) : '–'}</b></div>`;
    const max = Math.max(1, ...sitzung.stufen);
    histo.innerHTML = `<div class="histo">${sitzung.stufen.slice(1).map((n, i) => `<div class="hb" data-tip="${esc(stufenName(i + 1))}: ${fmt(n)}"><i style="height:${n ? 8 + 92 * Math.log(1 + n) / Math.log(1 + max) : 0}%;background:${stufenFarbe(i + 1)}"></i><span>${CONFIG.seltenheit.kurz[i]}</span><em>${n ? fmt(n) : ''}</em></div>`).join('')}</div>
<div class="kl-zeile">${KLASSEN.map((k, i) => `<span class="kl-chip kl-${k.key}">${k.name} <b>${fmt(sitzung.klassen[i])}</b></span>`).join('')}</div>`;
  };
  const zeichneFeed = () => {
    const passend = sitzung.feed.filter((e) => passt(fundDaten(e.karte), feedF));
    feed.replaceChildren(...passend.slice(-16).reverse().map((e) => {
      const el = karteElement(e.karte, { animiert: false, nurMaus: true });
      el.classList.add('mini');
      el.addEventListener('click', () => karteVergroessern(e.karte));
      return el;
    }));
    if (sitzung.feed.length && !passend.length) feed.append(h('p', { class: 'leise', text: 'Kein Fund passt zu Suche oder Filter.' }));
    if (!sitzung.feed.length) feed.append(h('p', { class: 'leise', text: 'Noch nichts Besonderes. Holo, Looks, Effekte, neue Monster und Klassen ab Emerald erscheinen hier. Klick auf eine Karte vergrößert sie.' }));
  };
  zeichne(); zeichneFeedKopf(); zeichneFeed();

  // Welche Karten eines Packs sind ein Fund? Gibt den Grund und die Karten (Indizes) zurück.
  const pruefeFund = (pack) => {
    const fokus = new Set();
    let grund = null;
    pack.eintraege.forEach((e, i) => {
      const c = e.karte;
      const g = (st.neuArt && e.neuArt) ? `neues Monster: ${ARTEN[c.art].name}`
        : (st.neuAusf && e.neuAusf) ? 'neue Ausführung'
          : (st.holo && c.holo !== 'keins') ? 'Holo-Stufe'
            : (st.effekt && c.fx.length) ? 'Spezialeffekt'
              : c.kl >= st.klasseAb ? `Klasse ${KLASSEN[c.kl].name}`
                : e.stufe >= st.stufeAb ? stufenName(e.stufe) : null;
      if (g) { fokus.add(i); grund ??= g; }
    });
    return grund ? { grund, fokus } : null;
  };

  let uiTimer = 0;
  // Taktgeber nach echter Zeit (nicht nach Bildschirm-Frames), damit das Tempo stimmt, auch im Hintergrund.
  const schritt = () => {
    if (!lauf) return;
    const t = performance.now();
    const dt = Math.min(5, (t - lauf.t) / 1000);
    lauf.t = t;
    const tempo = CONFIG.autoOeffnen.stufen[einst.autoTempo];
    lauf.faellig += dt * tempo.packsProSekunde;
    let geoeffnet = 0;
    while (lauf && lauf.faellig >= 1 && geoeffnet < 200) {
      lauf.faellig -= 1;
      const { k: p, vorrat } = naechsteKosten();
      if (S.d.muenzen < p) { stoppe(); toast('Keine Münzen mehr für das Auto-Öffnen.'); break; }
      S.d.muenzen -= p;
      S.d.stat.muenzenAusgegeben += p;
      sitzung.muenzen += p;
      const pack = packOeffnen({ quelle: vorrat ? 'vorrat' : 'auto' });
      geoeffnet++;
      sitzung.packs++;
      for (const e of pack.eintraege) {
        sitzung.karten++;
        sitzung.stufen[e.stufe]++;
        sitzung.klassen[e.karte.kl]++;
        if (e.stufe > sitzung.beste) sitzung.beste = e.stufe;
        if (e.stufe >= 2 || e.karte.kl >= 4 || e.neuArt) sitzung.feed.push(e);
      }
      if (sitzung.feed.length > 60) sitzung.feed.splice(0, sitzung.feed.length - 60);
      fliegePack();
      const fund = pruefeFund(pack);
      if (fund) { fundZeigen(pack, fund); if (!lauf) { zeichne(); zeichneFeed(); aenderung('auto'); speichernBald(300); return; } }
    }
    if (geoeffnet) { aenderung('auto'); speichernSpaetestens(3000); }
    if (t - uiTimer > 120 && !document.hidden) { uiTimer = t; zeichne(); if (geoeffnet) zeichneFeed(); }
  };
  let flugZaehler = 0;
  const fliegePack = () => {
    if (document.hidden) return;
    if (++flugZaehler % Math.max(1, Math.round(CONFIG.autoOeffnen.stufen[einst.autoTempo].packsProSekunde / 4)) !== 0) return;
    const p = h('i', { class: 'flug-pack', html: ICON.pack });
    band.append(p);
    Sound.schnipp();
    setTimeout(() => p.remove(), 1200);
  };
  // Fund zeigen: direkt hier im Auto-Öffnen, ohne Pack-Animation. Das Öffnen läuft weiter (außer "anhalten").
  let letzterFund = 0;
  const fundZeigen = (pack, fund) => {
    const jetzt = performance.now();
    if (!st.anhalten && jetzt - letzterFund < 1400) return; // bei sehr schnellen Funden nur in die Liste
    letzterFund = jetzt;
    const karten = [...fund.fokus].map((i) => pack.eintraege[i]).sort((a, b) => b.stufe - a.stufe || b.karte.kl - a.karte.kl).slice(0, 3);
    const reihe = h('div', { class: 'fund-reihe' });
    karten.forEach((e, n) => {
      const el = karteElement(e.karte, { verdeckt: true, rueckseite: 'logo', maxNeigung: 14 });
      el.classList.add('fund-karte');
      el.style.setProperty('--glow', stufenFarbe(e.stufe));
      el.addEventListener('click', () => karteVergroessern(e.karte));
      reihe.append(el);
      setTimeout(() => {
        el.classList.remove('gedreht');
        Sound.wenden(e.stufe);
        setTimeout(() => { Sound.stufe(e.stufe); if (e.karte.holo !== 'keins') Sound.holo(e.karte.holo); if (e.karte.fx.length) Sound.effekt(); }, 450);
      }, 200 + n * 320);
    });
    fundBox.replaceChildren(h('h3', { html: `Fund: <span class="gold">${esc(fund.grund)}</span>` }), reihe, h('p', { class: 'leise', text: 'Karte antippen zum Vergrößern.' }));
    fundBox.hidden = false;
    fundBox.classList.remove('neu'); void fundBox.offsetWidth; fundBox.classList.add('neu');
    if (st.anhalten) { stoppe(); toast('Auto-Öffnen angehalten: ' + fund.grund); }
  };
  const starte = () => {
    if (lauf) return;
    if (S.d.muenzen < naechsteKosten().k) { toast('Nicht genug Münzen für dieses Tempo.'); return; }
    lauf = { t: performance.now(), faellig: 1, timer: setInterval(schritt, 50) };
    schritt();
    zeichne();
  };
  const pausiere = () => {
    if (!lauf) return;
    clearInterval(lauf.timer);
    lauf = null;
    speichernBald(200);
  };
  const stoppe = () => { pausiere(); zeichne(); };
  let verlassen = false;
  startBtn.addEventListener('click', () => (lauf ? stoppe() : starte()));
  return { verlassen: () => { verlassen = true; stoppe(); } };
}
