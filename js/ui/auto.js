// Auto-Öffnen gegen Münzen. [FEST 11.3] je schneller, desto teurer. [VORSCHLAG] Tempostufen und Auto-Stopp.
import { CONFIG, KLASSEN } from '../config.js';
import { S, packOeffnen, aenderung, speichernBald } from '../state.js';
import { karteElement, stufenFarbe, stufenName, esc } from '../cardview.js';
import { Sound } from '../audio.js';
import { ARTEN } from '../species.js';
import { h, toast, ICON, fmt } from './dom.js';
import { zeremonie } from './packs.js';

const STANDARD_STOPP = { neuArt: true, neuAusf: false, holo: true, effekt: true, klasseAb: 5, stufeAb: 4 };
let lauf = null; // läuft über Bildschirmwechsel hinweg nicht weiter

export function autoScreen(root) {
  const einst = S.d.einst;
  einst.autoTempo ??= 0;
  einst.autoStopp = Object.assign({}, STANDARD_STOPP, einst.autoStopp || {});
  const st = einst.autoStopp;
  const sitzung = { packs: 0, karten: 0, muenzen: 0, beste: 0, stufen: new Array(15).fill(0), klassen: new Array(8).fill(0), feed: [] };

  const wrap = h('section', { class: 'screen auto' });
  const links = h('div', { class: 'panel auto-steuerung' });
  const rechts = h('div', { class: 'auto-live' });
  wrap.append(links, rechts);
  root.append(wrap);

  const preis = (i) => CONFIG.wirtschaft.packPreis * CONFIG.autoOeffnen.stufen[i].preisFaktor;
  const tempoBox = h('div', { class: 'tempo-wahl' });
  const zeichneTempo = () => {
    tempoBox.replaceChildren(...CONFIG.autoOeffnen.stufen.map((t, i) => h('button', {
      class: 'tempo' + (i === einst.autoTempo ? ' an' : ''),
      onclick: () => { einst.autoTempo = i; zeichneTempo(); speichernBald(); },
      html: `<b>${t.name}</b><span>${t.packsProSekunde >= 1 ? fmt(t.packsProSekunde) + ' Packs/s' : '1 Pack / ' + Math.round(1 / t.packsProSekunde) + ' s'}</span><em>${ICON.muenze} ${fmt(preis(i))} je Pack</em><small>${fmt(preis(i) * t.packsProSekunde * 60)} / Min.</small>`,
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
    h('h3', { text: 'Anhalten und volle Animation bei' }),
    h('div', { class: 'stopp-regeln' },
      check('neuArt', 'neuem Monster'),
      check('neuAusf', 'neuer Ausführung'),
      check('holo', 'Holo-Stufe'),
      check('effekt', 'Spezialeffekt'),
      auswahl('klasseAb', [[99, 'nie'], ...KLASSEN.map((k, i) => [i, k.name + ' oder besser'])], 'Stärkeklasse'),
      auswahl('stufeAb', [[99, 'nie'], ...CONFIG.seltenheit.namen.map((n, i) => [i + 1, n + ' oder besser'])], 'Seltenheit'),
    ),
    muenzInfo, startBtn,
  );

  const zaehler = h('div', { class: 'auto-zaehler' });
  const band = h('div', { class: 'auto-band' });
  const histo = h('div', { class: 'auto-histo' });
  const feed = h('div', { class: 'auto-feed' });
  rechts.append(h('div', { class: 'panel' }, band, zaehler), h('div', { class: 'panel' }, h('h3', { text: 'Diese Sitzung' }), histo), h('div', { class: 'panel' }, h('h3', { text: 'Besondere Funde' }), feed));

  const zeichne = () => {
    const t = CONFIG.autoOeffnen.stufen[einst.autoTempo];
    muenzInfo.innerHTML = `Münzen: <b>${fmt(S.d.muenzen)}</b> · reicht für <b>${fmt(Math.floor(S.d.muenzen / preis(einst.autoTempo)))}</b> Packs (${t.name})`;
    startBtn.textContent = lauf ? 'Anhalten' : 'Starten';
    startBtn.classList.toggle('stopp', !!lauf);
    wrap.classList.toggle('laeuft', !!lauf);
    zaehler.innerHTML = `<div><span>Packs</span><b>${fmt(sitzung.packs)}</b></div><div><span>Karten</span><b>${fmt(sitzung.karten)}</b></div><div><span>Ausgegeben</span><b>${ICON.muenze} ${fmt(sitzung.muenzen)}</b></div><div><span>Pity</span><b>${S.d.pity}</b></div><div><span>Beste</span><b style="color:${stufenFarbe(sitzung.beste || 1)}">${sitzung.beste ? esc(stufenName(sitzung.beste)) : '–'}</b></div>`;
    const max = Math.max(1, ...sitzung.stufen);
    histo.innerHTML = `<div class="histo">${sitzung.stufen.slice(1).map((n, i) => `<div class="hb" data-tip="${esc(stufenName(i + 1))}: ${fmt(n)}"><i style="height:${n ? 8 + 92 * Math.log(1 + n) / Math.log(1 + max) : 0}%;background:${stufenFarbe(i + 1)}"></i><span>${CONFIG.seltenheit.kurz[i]}</span><em>${n ? fmt(n) : ''}</em></div>`).join('')}</div>
<div class="kl-zeile">${KLASSEN.map((k, i) => `<span class="kl-chip kl-${k.key}">${k.name} <b>${fmt(sitzung.klassen[i])}</b></span>`).join('')}</div>`;
  };
  const zeichneFeed = () => {
    feed.replaceChildren(...sitzung.feed.slice(-16).reverse().map((e) => {
      const el = karteElement(e.karte, { animiert: false, nurMaus: true, rueckseite: 'info', drehbar: true });
      el.classList.add('mini');
      return el;
    }));
    if (!sitzung.feed.length) feed.append(h('p', { class: 'leise', text: 'Noch nichts Besonderes. Holo, Looks, Effekte, neue Monster und Klassen ab Emerald erscheinen hier.' }));
  };
  zeichne(); zeichneFeed();

  const pruefeStopp = (pack) => {
    for (const e of pack.eintraege) {
      const c = e.karte;
      if (st.neuArt && e.neuArt) return `neues Monster: ${ARTEN[c.art].name}`;
      if (st.neuAusf && e.neuAusf) return 'neue Ausführung';
      if (st.holo && c.holo !== 'keins') return 'Holo-Stufe';
      if (st.effekt && c.fx.length) return 'Spezialeffekt';
      if (c.kl >= st.klasseAb) return `Klasse ${KLASSEN[c.kl].name}`;
      if (e.stufe >= st.stufeAb) return stufenName(e.stufe);
    }
    return null;
  };

  let uiTimer = 0;
  const schritt = (t) => {
    if (!lauf) return;
    const dt = Math.min(0.25, (t - lauf.t) / 1000);
    lauf.t = t;
    const tempo = CONFIG.autoOeffnen.stufen[einst.autoTempo];
    lauf.faellig += dt * tempo.packsProSekunde;
    let geoeffnet = 0;
    while (lauf && lauf.faellig >= 1 && geoeffnet < 50) {
      lauf.faellig -= 1;
      const p = preis(einst.autoTempo);
      if (S.d.muenzen < p) { stoppe(); toast('Keine Münzen mehr für das Auto-Öffnen.'); break; }
      S.d.muenzen -= p;
      S.d.stat.muenzenAusgegeben += p;
      sitzung.muenzen += p;
      const pack = packOeffnen({ quelle: 'auto' });
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
      const grund = pruefeStopp(pack);
      if (grund) { stoppe(); zeichne(); zeichneFeed(); aenderung('auto'); speichernBald(300); stoppZeremonie(pack, grund); return; }
    }
    if (geoeffnet) { aenderung('auto'); speichernBald(3000); }
    if (t - uiTimer > 120) { uiTimer = t; zeichne(); if (geoeffnet) zeichneFeed(); }
    if (lauf) lauf.raf = requestAnimationFrame(schritt);
  };
  let flugZaehler = 0;
  const fliegePack = () => {
    if (++flugZaehler % Math.max(1, Math.round(CONFIG.autoOeffnen.stufen[einst.autoTempo].packsProSekunde / 4)) !== 0) return;
    const p = h('i', { class: 'flug-pack', html: ICON.pack });
    band.append(p);
    Sound.schnipp();
    setTimeout(() => p.remove(), 1200);
  };
  const stoppZeremonie = async (pack, grund) => {
    const weiter = await zeremonie(pack, { titel: 'Auto-Stopp: ' + grund, ausAuto: true });
    zeichne();
    if (weiter === 'weiter' && wrap.isConnected) starte();
  };
  const starte = () => {
    if (lauf) return;
    if (S.d.muenzen < preis(einst.autoTempo)) { toast('Nicht genug Münzen für dieses Tempo.'); return; }
    lauf = { t: performance.now(), faellig: 1, raf: 0 };
    lauf.raf = requestAnimationFrame(schritt);
    zeichne();
  };
  const stoppe = () => {
    if (!lauf) return;
    cancelAnimationFrame(lauf.raf);
    lauf = null;
    zeichne();
    speichernBald(200);
  };
  startBtn.addEventListener('click', () => (lauf ? stoppe() : starte()));
  return { verlassen: stoppe };
}
