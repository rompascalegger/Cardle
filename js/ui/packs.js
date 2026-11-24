// Packs: Shop-Bühne und die Öffnungs-Zeremonie. [FEST 10.1] Ergebnis steht vor der Animation fest. [VORSCHLAG 13.4]
import { CONFIG, KLASSEN, LOOKS, HOLO_NAMEN } from '../config.js';
import { S, packOeffnen, packKaufen, aenderung, speichernBald } from '../state.js';
import { karteElement, stufenFarbe, stufenName, esc } from '../cardview.js';
import { Sound } from '../audio.js';
import { farbton, farbe, ELEMENTE } from '../elements.js';
import { ARTEN } from '../species.js';
import { monsterBild } from '../monsterart.js';
import { EFFEKT, effektText } from '../effects.js';
import { klassenGrenzen, holoGrenzen, prozent, pityChance, seltenheitsChancen, einsVon, pHolo, pEffekte } from '../rules.js';
import { h, warte, anim, toast, schuetteln, partikel, blitzLicht, konfetti, ICON, fmt, modal } from './dom.js';
import { karteVergroessern } from './lupe.js';

const KLASSEN_FARBEN = ['#d4935a', '#dfe5ea', '#ffd23f', '#cfe6f2', '#3ee08f', '#ff4f72', '#4f8dff', '#e8f6ff'];
const zufallsArt = () => Math.floor(Math.random() * ARTEN.length);

export function packElement(artId = zufallsArt(), { gluecks = false, element = null, erfolg = false } = {}) {
  if (element != null) { const pool = ARTEN.filter((a) => a.el === element && !a.silber); artId = pool[Math.floor(Math.random() * pool.length)].id; }
  const bild = monsterBild(artId, true);
  const el = ARTEN[artId].el;
  return h('div', {
    class: 'pack' + (gluecks ? ' gluecks' : '') + (erfolg ? ' erfolgspack' : '') + (element != null ? ' elementpack' : ''), 'data-art': artId, style: `--ph:${gluecks ? 45 : farbton(el).toFixed(0)}`, html: `
<div class="pack-koerper">
  <div class="pack-folie"></div>
  <div class="pack-rad"></div>
  <img class="pack-motiv" src="${bild.fg}" alt="" draggable="false">
  <div class="pack-logo">${esc(CONFIG.spielname.toUpperCase())}</div>
  <div class="pack-unter">${erfolg ? `ERFOLGSPACK · ${CONFIG.erfolgsPack.karten} KARTEN` : gluecks ? `GLÜCKSPACK · ${CONFIG.gluecksPack.karten} KARTEN` : element != null ? `ELEMENTPACK · ${CONFIG.elementPack.karten} KARTEN` : `BOOSTER · ${CONFIG.packGroesse} KARTEN`}</div>
  <div class="pack-el">${erfolg ? `🏆 Chancen ×${CONFIG.erfolgsPack.faktor} 🏆` : gluecks ? `★ alle Chancen ×${CONFIG.gluecksPack.faktor} ★` : element != null ? `★ nur ${esc(ELEMENTE[el].name)} · Chancen ×${CONFIG.elementPack.faktor} ★` : `${esc(ELEMENTE[el].name)}-Edition`}</div>
  <div class="pack-glanz"></div>
</div>
<div class="pack-oeffnung"></div>
<div class="pack-lasche"><span class="pack-griff">⟵ hier aufreißen ⟶</span></div>
<div class="lasche-ab"></div>
<div class="pack-crimp oben"></div><div class="pack-crimp unten"></div>` });
}

// ---------- Shop-Bildschirm ----------
export function packsScreen(root, nav) {
  const wrap = h('section', { class: 'screen packs' });
  const buehne = h('div', { class: 'pack-buehne' });
  const schwebe = h('div', { class: 'pack-schwebe' }, packElement());
  const btnOeffnen = h('button', { class: 'btn gross primaer', html: 'Pack öffnen' });
  const vorrat = h('div', { class: 'vorrat' });
  const kauf1 = h('button', { class: 'btn', html: `1 Pack kaufen · ${ICON.muenze} ${CONFIG.wirtschaft.packPreis}` });
  const kauf10 = h('button', { class: 'btn', html: `10 Packs · ${ICON.muenze} ${CONFIG.wirtschaft.packPreis * 10}` });
  const sonderBox = h('div', { class: 'sonder-packs' });
  const mehrBox = h('div', { class: 'mehr-packs' });
  buehne.append(h('div', { class: 'buehne-licht' }), schwebe, h('div', { class: 'pack-aktionen' }, btnOeffnen, mehrBox, sonderBox, vorrat, h('div', { class: 'kauf' }, kauf1, kauf10)));
  const info = h('aside', { class: 'panel pack-info' });
  wrap.append(buehne, info);
  root.append(wrap);

  const aktualisiere = () => {
    vorrat.innerHTML = `Vorrat: <b>${fmt(S.d.packs)}</b> ${S.d.packs === 1 ? 'Pack' : 'Packs'}`;
    btnOeffnen.disabled = S.d.packs <= 0;
    mehrBox.replaceChildren(...mengenOptionen(S.d.packs).map((n) => h('button', { class: 'btn', text: n === S.d.packs ? `Alle ${fmt(n)} öffnen` : `${n} öffnen`, onclick: async () => { await mehrerePacksOeffnen(n); aktualisiere(); } })));
    // Sonderpacks gruppiert: Glückspacks und Elementpacks je Element
    const gruppen = new Map();
    S.d.sonderPacks.forEach((sp, i) => { const key = sp.typ === 'element' ? 'e' + sp.el : sp.typ; if (!gruppen.has(key)) gruppen.set(key, { sp, idx: [] }); gruppen.get(key).idx.push(i); });
    sonderBox.replaceChildren(...[...gruppen.values()].map(({ sp, idx }) => h('button', {
      class: 'btn gluecks-btn' + (sp.typ === 'element' ? ' element-btn' : sp.typ === 'erfolg' ? ' erfolg-btn' : CONFIG.sonderPackTypen[sp.typ] ? ' endgame-btn' : ''), style: sp.typ === 'element' ? `--el:${farbe(sp.el)}` : CONFIG.sonderPackTypen[sp.typ] ? `--el:${CONFIG.sonderPackTypen[sp.typ].farbe}` : '',
      html: CONFIG.sonderPackTypen[sp.typ] ? `${CONFIG.sonderPackTypen[sp.typ].symbol} ${CONFIG.sonderPackTypen[sp.typ].name} öffnen (${idx.length}) · ×${CONFIG.sonderPackTypen[sp.typ].faktor}` : sp.typ === 'gluecks' ? `★ Glückspack öffnen (${idx.length})` : sp.typ === 'erfolg' ? `🏆 Erfolgspack öffnen (${idx.length})` : `${esc(ELEMENTE[sp.el].name)}-Elementpack öffnen (${idx.length})`,
      onclick: () => sonderOeffnen(idx[0]),
    })));
    kauf1.disabled = S.d.muenzen < CONFIG.wirtschaft.packPreis;
    kauf10.disabled = S.d.muenzen < CONFIG.wirtschaft.packPreis * 10;
    info.innerHTML = infoHTML();
  };
  aktualisiere();

  const oeffnen = async () => {
    if (S.d.packs <= 0) { toast('Keine Packs im Vorrat. Gewinne Kämpfe oder kaufe welche.'); return; }
    Sound.rascheln();
    const packEl = schwebe.firstElementChild;
    const artId = Number(packEl.dataset.art) || zufallsArt();
    const pack = packOeffnen({ quelle: 'vorrat' });
    aenderung('pack'); speichernBald(300);
    await zeremonie(pack, { artId });
    schwebe.replaceChildren(packElement());
    aktualisiere();
  };
  btnOeffnen.addEventListener('click', oeffnen);
  const sonderOeffnen = async (index) => {
    const pack = packOeffnen({ quelle: 'sonder', sonderIndex: index });
    if (!pack) return;
    aenderung('pack'); speichernBald(300);
    Sound.rascheln();
    const sp = pack.sonder;
    const ST = CONFIG.sonderPackTypen[sp.typ];
    await zeremonie(pack, { titel: ST ? `${ST.name} · alle Chancen ×${ST.faktor}` : sp.typ === 'gluecks' ? `Glückspack · alle Chancen ×${CONFIG.gluecksPack.faktor}` : sp.typ === 'erfolg' ? `Erfolgspack · Chancen ×${CONFIG.erfolgsPack.faktor}` : `${ELEMENTE[sp.el].name}-Elementpack · Chancen ×${CONFIG.elementPack.faktor}` });
    schwebe.replaceChildren(packElement());
    aktualisiere();
  };
  schwebe.addEventListener('click', oeffnen);
  setzePackNeuzeichnen(() => { schwebe.replaceChildren(packElement()); aktualisiere(); });
  kauf1.addEventListener('click', () => { if (packKaufen(1)) { Sound.muenze(); aktualisiere(); } });
  kauf10.addEventListener('click', () => { if (packKaufen(10)) { Sound.muenze(); aktualisiere(); } });
  return { aktualisiere };
}

function infoHTML() {
  const ch = seltenheitsChancen();
  const pity = S.d.pity;
  const n = pity + 1;
  const pc = pityChance(n);
  const pityPct = Math.min(100, (pity / CONFIG.pity.garantie) * 100);
  return `<h3>Was steckt drin?</h3>
<div class="chancen">
  <div class="ch-gruppe"><h4>Stärkeklasse</h4>${KLASSEN.map((k, i) => `<div class="ch-z"><i style="background:${KLASSEN_FARBEN[i]}"></i><span>${k.name}</span><b>${prozent(k.chance)}</b></div>`).join('')}</div>
  <div class="ch-gruppe"><h4>Holo-Stufe</h4>${['reverse', 'holo', 'secret', 'ghost'].map((x) => `<div class="ch-z"><i class="holo-i ${x}"></i><span>${HOLO_NAMEN[x]}</span><b>${prozent(pHolo(x))}</b></div>`).join('')}
  <h4>Zusatzlooks</h4><div class="ch-z"><i class="look-i"></i><span>je Look (5 Sorten)</span><b>${prozent(CONFIG.lookChance)}</b></div>
  <h4>Spezialeffekte</h4><div class="ch-z"><i class="fx-i"></i><span>mind. ein Effekt</span><b>${prozent(pEffekte(1) + pEffekte(2) + pEffekte(3))}</b></div></div>
</div>
<div class="pity">
  <div class="pity-kopf"><span>Packs seit der letzten Effektkarte</span><b>${pity}</b></div>
  <div class="pity-bar"><i style="width:${pityPct}%"></i><em style="left:${(CONFIG.pity.schwelle / CONFIG.pity.garantie) * 100}%"></em></div>
  <div class="pity-fuss">Nächstes Pack: ${prozent(pc)} pro Karte${n > CONFIG.pity.schwelle ? ' · <b class="gold">Pity aktiv</b>' : ''} · sicher im ${CONFIG.pity.garantie}. Pack</div>
</div>
<div class="stat-zeile"><span>Geöffnet</span><b>${fmt(S.d.stat.packs)} Packs</b></div>
<div class="stat-zeile"><span>Beste Seltenheit</span><b style="color:${stufenFarbe(S.d.stat.besteStufe)}">${stufenName(S.d.stat.besteStufe)}</b></div>
<details class="stufen-liste"><summary>Alle 14 Seltenheiten</summary>${ch.slice(1).map((p, i) => `<div class="ch-z"><i style="background:${stufenFarbe(i + 1)}"></i><span>${i + 1}. ${stufenName(i + 1)}</span><b>${einsVon(p)}</b><em>${fmt(S.d.stat.stufen[i + 1] || 0)}×</em></div>`).join('')}</details>`;
}

// ---------- Wurf-Anzeige (Zufallszahlen laufen sichtbar) [FEST 10.1] ----------
const LOG_MIN = { klasse: 1e-4, holo: 1e-4, look: 1e-4, effekt: 1e-5 };
const xPos = (u, min) => { const l = Math.log10(Math.max(u, min)); return Math.max(0, Math.min(1, (l - Math.log10(min)) / -Math.log10(min))); };

function zonenKlasse(mult = 1) {
  return klassenGrenzen(mult).map((z) => ({ von: z.von, bis: z.bis, farbe: KLASSEN_FARBEN[z.i], label: KLASSEN[z.i].name, gut: z.i >= 3, idx: z.i }));
}
function zonenHolo(mult = 1) {
  const g = holoGrenzen(mult);
  const f = { ghost: 'linear-gradient(90deg,#ffffff,#cfe3ff,#f3d9ff,#ffffff)', secret: 'linear-gradient(90deg,#ff5fd2,#5ffff0,#ffe14d)', holo: 'linear-gradient(90deg,#ff7a7a,#ffe14d,#7aff9a,#7ad8ff,#c27aff)', reverse: 'linear-gradient(90deg,#c9d3dc,#ffffff,#b9e6ff)' };
  let von = 0;
  return g.map((z) => { const o = { von, bis: z.bis, farbe: f[z.holo], label: HOLO_NAMEN[z.holo], gut: true, holo: z.holo }; von = z.bis; return o; });
}

function messer(art, u, zonen, opts = {}) {
  const min = LOG_MIN[art];
  const el = h('div', { class: 'messer ' + art + (opts.duenn ? ' duenn' : '') });
  const bahn = h('div', { class: 'messer-bahn' });
  for (const z of zonen) {
    const l = xPos(z.von, min), r = xPos(z.bis, min);
    bahn.append(h('i', { class: 'zone', style: `left:${l * 100}%;width:${(r - l) * 100}%;background:${z.farbe}` }));
  }
  const nadel = h('b', { class: 'nadel' });
  bahn.append(nadel);
  el.append(bahn);
  const wert = opts.ohneWert ? null : h('span', { class: 'messer-wert', text: '100 %' });
  if (wert) el.append(wert);
  const treffer = zonen.find((z) => u >= z.von && u < z.bis) || null;
  // Beinahe-Treffer: knapp über der Grenze einer besseren Zone [FEST "Beinahe-Treffer sind zu sehen"]
  const bessere = zonen.filter((z) => z.gut && z.bis <= u && (!treffer || z.bis <= treffer.von));
  const grenze = bessere.length ? Math.max(...bessere.map((z) => z.bis)) : null;
  const knapp = !opts.erzwungen && grenze != null && u < grenze * 1.8;
  const ziel = opts.erzwungen ? xPos((zonen[0].von + zonen[0].bis) / 2, min) : xPos(u, min);
  const grenzenX = zonen.map((z) => xPos(z.bis, min));
  return {
    el, treffer: opts.erzwungen ? zonen[0] : treffer, knapp,
    start(dauer) {
      const drama = knapp || (treffer && treffer.gut) || opts.erzwungen;
      const D = dauer * (drama ? 1.9 : 1);
      return new Promise((res) => {
        const t0 = performance.now();
        let letztesX = 1;
        const frame = (t) => {
          const p = Math.min(1, (t - t0) / D);
          const e = 1 - Math.pow(1 - p, drama ? 5 : 3);
          const x = 1 + (ziel - 1) * e;
          nadel.style.left = (x * 100).toFixed(2) + '%';
          for (const g of grenzenX) if ((letztesX - g) * (x - g) < 0) { Sound.tick(); bahn.classList.remove('zuck'); void bahn.offsetWidth; bahn.classList.add('zuck'); }
          letztesX = x;
          if (wert) { const uu = 10 ** (Math.log10(min) * (1 - x)); wert.textContent = prozent(Math.min(1, uu)); }
          if (p < 1) requestAnimationFrame(frame);
          else {
            if (wert) wert.textContent = opts.erzwungen ? 'PITY' : prozent(u);
            const gut = (opts.erzwungen || (treffer && treffer.gut));
            el.classList.add(gut ? 'treffer' : knapp ? 'knapp' : 'fertig');
            if (gut) el.style.setProperty('--tz', treffer ? (treffer.farbe.startsWith('linear') ? '#fff' : treffer.farbe) : '#ffd447');
            res({ gut, knapp });
          }
        };
        requestAnimationFrame(frame);
      });
    },
    sofort() {
      nadel.style.left = (ziel * 100).toFixed(2) + '%';
      if (wert) wert.textContent = opts.erzwungen ? 'PITY' : prozent(u);
      const gut = opts.erzwungen || (treffer && treffer.gut);
      el.classList.add(gut ? 'treffer' : knapp ? 'knapp' : 'fertig');
    },
  };
}

function wurfPanel(eintrag) {
  const w = eintrag.wuerfe, c = eintrag.karte;
  const panel = h('div', { class: 'wuerfe' });
  const zeilen = [];
  const zeile = (titel, inhalt, ergebnis) => {
    const erg = h('span', { class: 'z-erg', html: '' });
    const z = h('div', { class: 'w-zeile' }, h('span', { class: 'z-titel', text: titel }), inhalt, erg);
    panel.append(z);
    return { z, erg, ergebnis };
  };
  const mult = w.mult || 1;
  const mk = messer('klasse', w.klasse, zonenKlasse(mult));
  zeilen.push({ ...zeile('Klasse', mk.el, `<b style="color:${KLASSEN_FARBEN[c.kl]}">${KLASSEN[c.kl].name}</b>`), m: [mk], art: 'klasse' });
  const mh = messer('holo', w.holo, zonenHolo(mult));
  zeilen.push({ ...zeile('Holo', mh.el, c.holo === 'keins' ? '–' : `<b class="regenbogen">${HOLO_NAMEN[c.holo]}</b>`), m: [mh], art: 'holo' });
  const lookBox = h('div', { class: 'look-messer' });
  const ml = w.looks.map((u) => { const m = messer('look', u, [{ von: 0, bis: CONFIG.lookChance * mult, farbe: '#ffd447', label: 'Look', gut: true }], { duenn: true, ohneWert: true }); lookBox.append(m.el); return m; });
  const gefunden = LOOKS.filter((_, i) => c.looks & (1 << i)).map((l) => l.kurz);
  zeilen.push({ ...zeile('Looks', lookBox, gefunden.length ? `<b class="gold">${gefunden.join(', ')}</b>` : '–'), m: ml, art: 'looks' });
  const me = messer('effekt', w.effekt, [{ von: 0, bis: w.effektChance, farbe: 'linear-gradient(90deg,#ffd447,#ff9b2f)', label: 'Effekt', gut: true }], { erzwungen: w.pity });
  zeilen.push({ ...zeile('Effekt', me.el, c.fx.length ? `<b class="gold">${c.fx.map((id) => esc(EFFEKT[id].name)).join(', ')}</b>` : '–'), m: [me], art: 'effekt' });
  return { panel, zeilen };
}

// ---------- Zeremonie ----------
// autoAblauf: läuft ohne Eingaben durch (für Auto-Öffnen). fokus: nur diese Karten werden groß aufgedeckt.
export function zeremonie(pack, { artId = zufallsArt(), titel = null, auto = false, ausAuto = false, autoAblauf = false, fokus = null } = {}) {
  return new Promise((resolve) => {
    const z = new Zeremonie(pack, artId, titel, auto || autoAblauf, resolve, ausAuto);
    z.autoAblauf = autoAblauf;
    z.fokus = fokus;
    z.start();
  });
}

class Zeremonie {
  constructor(pack, artId, titel, auto, fertig, ausAuto) {
    this.pack = pack; this.artId = artId; this.titel = titel; this.auto = auto; this.fertig = fertig; this.ausAuto = ausAuto;
    this.tempo = S.d.einst.aufdecken === 'schnell' ? 0.55 : 1;
    this.eilig = false; this.alles = false; this.warter = null;
    this.reihenfolge = pack.eintraege.map((_, i) => i).sort((a, b) => {
      const x = pack.eintraege[a], y = pack.eintraege[b];
      return x.stufe - y.stufe || x.karte.kl - y.karte.kl || a - b;
    });
  }
  D(ms) { return ms * this.tempo * (this.eilig ? 0.18 : 1); }
  warteD(ms) { return warte(this.D(ms)); }

  bauen() {
    const o = h('div', { class: 'oeffnen', tabindex: '-1' });
    o.innerHTML = `<div class="oe-hg"></div><div class="oe-strahlen"></div><div class="oe-glow"></div><div class="oe-runen"></div>
<div class="oe-titel">${this.titel ? esc(this.titel) : ''}</div>
<div class="oe-buehne"><div class="oe-packplatz"></div><div class="oe-slot"></div><div class="oe-wurfplatz"></div></div>
<div class="oe-faecher"></div>
<div class="oe-reihe"></div>
<div class="oe-banner"></div>
<div class="oe-hinweis"></div>
<div class="oe-leiste"></div>`;
    document.body.append(o);
    this.o = o;
    this.q = (s) => o.querySelector(s);
    this.leiste = this.q('.oe-leiste');
    this.hinweis = (t) => { this.q('.oe-hinweis').textContent = t || ''; };
    const tipp = (e) => {
      if (e.target.closest('button') || e.target.closest('.oe-uebersicht')) return;
      if (e.target.closest('.oe-slot')) this.tipp();
    };
    o.addEventListener('pointerdown', tipp);
    this.taste = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (this.waehleR) this.waehleNaechste();
        else if (this.weiterR) { const r = this.weiterR; this.weiterR = null; r(); }
        else this.tipp();
      }
      if (e.key === 'Escape') this.allesAufdecken();
    };
    document.addEventListener('keydown', this.taste);
    requestAnimationFrame(() => o.classList.add('an'));
  }
  tipp() {
    if (this.warter) { const w = this.warter; this.warter = null; w(); return; }
    if (this.phase === 'aufdecken') this.eilig = true;
  }
  weiterWarten(hinweis = 'Tippen für die nächste Karte') {
    if (this.alles) return Promise.resolve();
    this.hinweis(hinweis);
    return new Promise((r) => { this.warter = () => { this.hinweis(''); r(); }; });
  }
  knoepfe(liste) {
    this.leiste.replaceChildren(...liste.map((k) => h('button', { class: 'btn ' + (k.klasse || ''), html: k.text, onclick: k.aktion })));
  }

  standardKnoepfe() {
    if (this.autoAblauf) this.knoepfe([{ text: 'Auto-Öffnen anhalten', aktion: () => this.anhalten() }, { text: 'Überspringen', aktion: () => this.allesAufdecken() }]);
    else this.knoepfe([{ text: 'Alle aufdecken', aktion: () => this.allesAufdecken() }]);
  }
  // Im Auto-Ablauf: Wunsch merken, die Übersicht schließt sich dann nicht von selbst
  anhalten() {
    this.stoppWunsch = true;
    this.knoepfe([{ text: 'Überspringen', aktion: () => this.allesAufdecken() }]);
    this.hinweis('Auto-Öffnen wird nach diesem Pack angehalten');
  }
  autoWarten(ms) {
    if (this.alles) return Promise.resolve();
    return new Promise((r) => {
      const t = setTimeout(() => { this.warter = null; r(); }, this.D(ms));
      this.warter = () => { clearTimeout(t); r(); };
    });
  }
  // Karte ohne Aufdeck-Animation in die Reihe legen (Auto-Ablauf, normale Karten)
  inReiheSofort(i, n) {
    const fk = this.faecherKarten[n];
    if (fk) fk.style.visibility = 'hidden';
    const mini = karteElement(this.pack.eintraege[i].karte, { animiert: false, interaktiv: false });
    mini.classList.add('reihen-karte');
    this.q('.oe-reihe').append(mini);
  }

  async start() {
    this.bauen();
    this.standardKnoepfe();
    await this.reissen();
    // Beim manuellen Öffnen liegen die Karten gemischt im Fächer, man wählt selbst
    if (!this.autoAblauf) this.reihenfolge = this.reihenfolge.map((i) => [i, Math.random()]).sort((a, b) => a[1] - b[1]).map(([i]) => i);
    await this.faechern();
    this.phase = 'aufdecken';
    if (!this.autoAblauf) { await this.waehlen(); this.uebersicht(); return; }
    for (let n = 0; n < this.reihenfolge.length; n++) {
      if (this.alles) break;
      const i = this.reihenfolge[n];
      if (this.autoAblauf && this.fokus && !this.fokus.has(i)) { this.inReiheSofort(i, n); continue; }
      this.eilig = false;
      await this.deckeAuf(i, n);
      if (this.alles) break;
      if (this.autoAblauf) await this.autoWarten(1700);
      else await this.weiterWarten(n === this.reihenfolge.length - 1 ? 'Tippen für die Übersicht' : 'Tippen für die nächste Karte');
      await this.inReihe(i);
    }
    this.uebersicht();
  }

  // Manuell: Karte im Fächer anklicken, um sie aufzudecken
  async waehlen() {
    const offen = new Set(this.reihenfolge.map((_, n) => n));
    let buehne = null;
    this.waehleNaechste = () => { const n = [...offen][0]; if (n != null && this.waehleR) { const r = this.waehleR; this.waehleR = null; r(n); } };
    while (offen.size && !this.alles) {
      this.hinweis(buehne ? 'Wähle die nächste Karte im Fächer' : 'Wähle eine Karte im Fächer');
      this.knoepfe([{ text: 'Nächste aufdecken', aktion: () => this.waehleNaechste() }, { text: 'Alle aufdecken', aktion: () => this.allesAufdecken() }]);
      this.o.classList.add('waehlbar');
      const n = await new Promise((r) => { this.waehleR = r; });
      this.o.classList.remove('waehlbar');
      if (n == null || this.alles) break;
      this.hinweis('');
      if (buehne) await this.inReihe(buehne);
      offen.delete(n);
      const i = this.reihenfolge[n];
      this.eilig = false;
      await this.deckeAuf(i, n);
      buehne = i;
    }
    if (this.alles) return;
    this.hinweis('Alle Karten aufgedeckt');
    this.knoepfe([{ text: 'Zur Übersicht', klasse: 'primaer', aktion: () => { if (this.weiterR) { const r = this.weiterR; this.weiterR = null; r(); } } }]);
    await new Promise((r) => { this.weiterR = r; });
    if (buehne != null && !this.alles) await this.inReihe(buehne);
  }

  allesAufdecken() {
    if (this.phase === 'uebersicht') return;
    this.alles = true; this.eilig = true;
    if (this.reissFertig) this.reissFertig();
    if (this.warter) { const w = this.warter; this.warter = null; w(); }
    if (this.waehleR) { const r = this.waehleR; this.waehleR = null; r(null); }
    if (this.weiterR) { const r = this.weiterR; this.weiterR = null; r(); }
  }

  // Phase 1: Aufreißen mit Widerstand [VORSCHLAG 13.4]
  reissen() {
    this.phase = 'reissen';
    const platz = this.q('.oe-packplatz');
    const pack = packElement(this.artId, { gluecks: !!this.pack.gluecks, erfolg: this.pack.sonder?.typ === 'erfolg', element: this.pack.sonder?.typ === 'element' ? this.pack.sonder.el : null });
    pack.classList.add('gross');
    platz.append(pack);
    anim(pack, [{ transform: 'translateY(60px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    this.hinweis('Ziehe an der Lasche, um das Pack aufzureißen');
    if (!this.autoAblauf) this.knoepfe([{ text: 'Aufreißen', klasse: 'primaer', aktion: () => auto() }, { text: 'Alle aufdecken', aktion: () => this.allesAufdecken() }]);
    // Widerstand: Die Folie folgt dem Finger nur mit begrenzter Geschwindigkeit, am Anfang zäh, dann reißt sie schneller.
    let p = 0, ziel = 0, ziehen = false, startX = 0, letzterKnister = 0, fertig = false, tLetzt = 0;
    const zeichneP = () => {
      pack.style.setProperty('--p', (p * 100).toFixed(1) + '%');
      pack.style.setProperty('--p01', p.toFixed(3));
      if (p - letzterKnister > 0.022) { letzterKnister = p; Sound.knistern(0.6 + p); pack.classList.toggle('wackel', Math.random() < 0.5); }
    };
    let resolveFn;
    const promise = new Promise((r) => (resolveFn = r));
    const schleife = (t) => {
      if (fertig) return;
      const dt = Math.min(0.05, (t - (tLetzt || t)) / 1000);
      tLetzt = t;
      if (ziel > p) {
        const v = (0.45 + p * 1.8) / this.tempo * (this.eilig ? 5 : 1);
        p = Math.min(ziel, p + v * dt);
        zeichneP();
      }
      if (p >= 0.97) { abschluss(); return; }
      requestAnimationFrame(schleife);
    };
    requestAnimationFrame(schleife);
    const abschluss = async () => {
      if (fertig) return;
      fertig = true;
      this.reissFertig = null;
      pack.removeEventListener('pointerdown', down);
      p = 1; zeichneP();
      Sound.reissen();
      pack.classList.remove('wackel');
      pack.classList.add('gerissen');
      blitzLicht('hsl(' + pack.style.getPropertyValue('--ph') + ' 90% 75%)', 0.5);
      await this.warteD(550);
      Sound.rascheln();
      pack.classList.add('leert');
      await this.warteD(650);
      platz.replaceChildren();
      resolveFn();
    };
    this.reissFertig = () => { if (!fertig) abschluss(); };
    const down = (e) => {
      const r = pack.getBoundingClientRect();
      if (e.clientY > r.top + r.height * 0.24) return;
      ziehen = true; startX = e.clientX - ziel * r.width;
      pack.setPointerCapture(e.pointerId);
      e.stopPropagation();
    };
    const move = (e) => {
      if (!ziehen) return;
      const r = pack.getBoundingClientRect();
      ziel = Math.max(ziel, Math.min(1, Math.abs(e.clientX - startX) / r.width));
    };
    const up = () => { ziehen = false; };
    pack.addEventListener('pointerdown', down);
    pack.addEventListener('pointermove', move);
    pack.addEventListener('pointerup', up);
    pack.addEventListener('pointercancel', up);
    const auto = () => {
      this.standardKnoepfe();
      ziel = 1;
    };
    if (this.auto) auto();
    return promise;
  }

  // Phase 2: Karten auffächern
  async faechern() {
    this.phase = 'faechern';
    this.hinweis('');
    const f = this.q('.oe-faecher');
    const n = this.reihenfolge.length;
    this.faecherKarten = this.reihenfolge.map((i, k) => {
      const winkel = (k - (n - 1) / 2) * 7;
      const e = this.pack.eintraege[i];
      // Sehr Seltenes glüht schon in der Vorschau [Nutzer, 21.11.2026]
      const glut = e.stufe >= 7 || e.karte.kl >= 7 || e.karte.fx.length ? 3 : e.stufe >= 5 || e.karte.kl >= 6 ? 2 : e.stufe >= 4 || e.karte.kl >= 5 ? 1 : 0;
      const farbeGlut = e.stufe >= 4 ? stufenFarbe(e.stufe) : KLASSEN_FARBEN[e.karte.kl];
      const el = h('div', { class: 'faecher-karte' + (glut ? ' glut' + glut : ''), style: `--w:${winkel}deg;--k:${k};--fg:${farbeGlut}`, html: `<div class="fk-innen"></div>` });
      el.addEventListener('click', () => { if (this.waehleR) { Sound.schnipp(); const r = this.waehleR; this.waehleR = null; r(k); } });
      f.append(el);
      return el;
    });
    Sound.faechern(n);
    for (const [k, el] of this.faecherKarten.entries()) {
      anim(el, [{ transform: 'translate(-50%, 40vh) rotate(0deg) scale(.6)', opacity: 0 }, { transform: `translate(calc(-50% + ${(k - (n - 1) / 2) * 36}px), ${Math.abs(k - (n - 1) / 2) * 5}px) rotate(var(--w))`, opacity: 1 }], { duration: this.D(520), delay: this.D(k * 45), easing: 'cubic-bezier(.2,.9,.3,1.15)' });
    }
    await this.warteD(520 + n * 45);
    if (!this.stoppWunsch) this.standardKnoepfe();
  }

  // Phase 3: einzeln aufdecken
  async deckeAuf(i, n) {
    const e = this.pack.eintraege[i];
    const c = e.karte, st = e.stufe;
    const fk = this.faecherKarten[n];
    if (fk) anim(fk, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%, -30vh) scale(1.4)' }], { duration: this.D(300), easing: 'ease-in' });
    const slot = this.q('.oe-slot');
    const karte = karteElement(c, { verdeckt: true, rueckseite: 'logo', maxNeigung: 16 });
    karte.classList.add('gyro', 'buehnen-karte');
    if (e.neuArt || e.neuAusf) karte.dataset.neu = e.neuArt ? 'NEU' : 'NEUE AUSFÜHRUNG';
    slot.replaceChildren(karte);
    this.q('.oe-wurfplatz').replaceChildren();
    this.o.dataset.stufe = st;
    this.o.style.setProperty('--glow', stufenFarbe(st));
    this.o.classList.remove('feier', 'grossfeier', 'glueht');
    await anim(karte, [{ transform: 'translateY(30vh) scale(.35) rotate(-6deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: this.D(420), easing: 'cubic-bezier(.2,.9,.3,1.15)' });
    // Glühen vor dem Umdrehen zeigt die Seltenheit
    const ladung = st <= 1 ? 140 : 220 + Math.min(st, 10) * 150;
    this.o.style.setProperty('--ladung', this.D(ladung) + 'ms');
    this.o.classList.add('glueht');
    if (st >= 3) Sound.aufladen(this.D(ladung) / 1000, st);
    if (st >= 5) karte.classList.add('zittert');
    await this.warteD(ladung);
    karte.classList.remove('zittert');
    // Umdrehen (Zeitlupe ab rare)
    const langsam = st >= 3 && !this.eilig;
    karte.querySelector('.k-flip').style.transitionDuration = this.D(langsam ? 1200 : 600) + 'ms';
    karte.classList.remove('gedreht');
    Sound.wenden(st);
    if (st >= 7) this.nachbild(karte);
    await this.warteD(langsam ? 950 : 420);
    if (karte.dataset.neu) karte.append(h('div', { class: 'neu-marke', text: karte.dataset.neu }));
    // Zufallszahlen auszählen
    const { panel, zeilen } = wurfPanel(e);
    this.q('.oe-wurfplatz').append(panel);
    anim(panel, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: this.D(200) });
    const laeufe = zeilen.map(async (z, k) => {
      await this.warteD(k * 140);
      const res = await Promise.all(z.m.map(async (m, j) => { await this.warteD(j * 60); if (this.eilig) { m.sofort(); return { gut: m.treffer?.gut, knapp: m.knapp }; } return m.start(this.D(620)); }));
      z.erg.innerHTML = z.ergebnis;
      z.z.classList.add('fertig');
      const gut = res.some((r) => r.gut), knapp = res.some((r) => r.knapp);
      if (gut) {
        if (z.art === 'holo') Sound.holo(c.holo);
        else if (z.art === 'looks') LOOKS.forEach((l, li) => { if (c.looks & (1 << li)) setTimeout(() => Sound.look(l.key), li * 90); });
        else if (z.art === 'effekt') Sound.effekt();
        else if (z.art === 'klasse') Sound.klasse(c.kl);
        Sound.einrasten(true);
      } else if (knapp && !this.eilig) Sound.knapp();
      else Sound.einrasten(false);
    });
    await Promise.all(laeufe);
    if (c.fx.length && !this.alles) await this.effektShow(karte, c);
    // Feier je nach Stufe
    // Je seltener, desto mehr Feuerwerk [Nutzer, 21.11.2026: "way more dopamin"]
    const hohKlasse = c.kl >= 5;
    const rekord = st >= 3 && st > (this.pack.besteVorher || 1);
    const klasseRekord = c.kl >= 4 && c.kl > (this.pack.besteKlasseVorher ?? -1);
    const wucht = Math.max(st >= 3 ? st : 0, hohKlasse ? c.kl + 1 : 0, c.holo !== 'keins' ? 4 : 0);
    this.o.classList.add(st >= 7 || c.kl >= 6 ? 'grossfeier' : wucht >= 3 ? 'feier' : 'ruhig');
    Sound.stufe(st);
    const r = karte.getBoundingClientRect();
    const mx = r.left + r.width / 2, my = r.top + r.height / 2;
    if (st >= 2 || hohKlasse) partikel(mx, my, { anzahl: 14 + wucht * 12, farben: [stufenFarbe(st), '#fff', '#ffd447'], weite: 140 + wucht * 40 });
    if (wucht >= 4) {
      Sound.jackpot(wucht);
      konfetti(40 + wucht * 18, [stufenFarbe(st), '#ffd447', '#fff', '#ff5fd2', '#5ffff0']);
      for (let i = 1; i <= Math.min(4, wucht - 3); i++) setTimeout(() => partikel(mx + (Math.random() - 0.5) * 300, my + (Math.random() - 0.5) * 200, { anzahl: 30, farben: [stufenFarbe(st), '#fff'], weite: 180 }), this.D(260 * i));
    }
    if (wucht >= 5) { schuetteln(this.o, 0.6 + wucht * 0.14); blitzLicht(stufenFarbe(st), 0.35 + wucht * 0.04); }
    if (wucht >= 7) setTimeout(() => { konfetti(160, ['#ffd447', '#fff6c8', '#ff9b2f', '#fff']); blitzLicht('#fff', 0.5); Sound.jackpot(wucht + 2); }, this.D(900));
    if (!c.fx.length && (st >= 3 || hohKlasse)) this.banner(st, c, { rekord, klasseRekord });
    else if (rekord || klasseRekord) this.rekordSticker(rekord ? 'Neuer Rekord!' : `Erste ${KLASSEN[c.kl].name}-Karte!`);
  }

  rekordSticker(text) {
    const st = h('div', { class: 'rekord-sticker', text });
    this.o.append(st);
    Sound.muenze();
    setTimeout(() => st.remove(), 3200);
  }

  // Spezialeffekt: eigene, epische Inszenierung [Nutzer, 21.11.2026]
  async effektShow(karte, c) {
    const o = this.o;
    o.classList.add('fx-show');
    karte.classList.add('fx-buehne');
    Sound.effekt();
    Sound.chor(392, 9 + c.fx.length * 2);
    blitzLicht('#ffd447', 0.55);
    schuetteln(o, 1.2);
    const r = karte.getBoundingClientRect();
    partikel(r.left + r.width / 2, r.top + r.height / 2, { anzahl: 90, farben: ['#ffd447', '#fff', '#ff9b2f', '#ff5fd2'], weite: 420, dauer: 1600, groesse: 9 });
    const b = this.q('.oe-banner');
    b.style.setProperty('--bf', '#ffd447');
    b.innerHTML = `<span>✦ Spezialeffekt${c.fx.length > 1 ? 'e' : ''} ✦</span>${c.fx.map((id, i) => `<small class="fx-zeile" style="animation-delay:${(0.35 + i * 0.5).toFixed(2)}s;--fxc:${CONFIG.effektStufen.farben[(c.fxs?.[i] || 1) - 1]}">${esc(EFFEKT[id].name)} (${CONFIG.effektStufen.namen[(c.fxs?.[i] || 1) - 1]}) · ${esc(effektText(id, c.fxs?.[i] || 1))}</small>`).join('')}`;
    b.classList.remove('an', 'lang'); void b.offsetWidth; b.classList.add('an', 'lang');
    for (let i = 0; i < c.fx.length; i++) setTimeout(() => { Sound.stufe(10 + i); blitzLicht('#fff3b0', 0.3); }, this.D(350 + i * 500));
    await this.warteD(1600 + c.fx.length * 600);
    o.classList.remove('fx-show');
  }

  nachbild(karte) {
    for (let k = 0; k < 3; k++) {
      const geist = karte.cloneNode(true);
      geist.classList.add('nachbild');
      geist.classList.remove('gedreht');
      karte.parentElement.append(geist);
      anim(geist, [{ opacity: 0.45, transform: 'scale(1)' }, { opacity: 0, transform: `scale(${1.15 + k * 0.12})` }], { duration: this.D(900 + k * 200), delay: this.D(200 + k * 160), easing: 'ease-out' }).then(() => geist.remove());
    }
  }

  banner(st, c, { rekord = false, klasseRekord = false } = {}) {
    const b = this.q('.oe-banner');
    const ch = seltenheitsChancen();
    const nurKlasse = st < 3;
    b.style.setProperty('--bf', nurKlasse ? KLASSEN_FARBEN[c.kl] : stufenFarbe(st));
    const titel = nurKlasse ? `${KLASSEN[c.kl].name}!` : stufenName(st);
    const quote = nurKlasse ? einsVon(KLASSEN[c.kl].chance) : einsVon(ch[st]);
    b.innerHTML = `<span>${esc(titel)}</span><small class="quote">${esc(quote)} Karten</small>${rekord ? '<small class="rekord">★ Neuer Rekord ★</small>' : klasseRekord ? `<small class="rekord">★ Erste ${esc(KLASSEN[c.kl].name)}-Karte ★</small>` : ''}`;
    b.classList.remove('an', 'lang'); void b.offsetWidth; b.classList.add('an');
    if (st >= 6 || rekord) b.classList.add('lang');
  }

  async inReihe(i) {
    const slot = this.q('.oe-slot');
    const karte = slot.firstElementChild;
    const reihe = this.q('.oe-reihe');
    const c = this.pack.eintraege[i].karte;
    const mini = karteElement(c, { animiert: false, interaktiv: false });
    mini.classList.add('reihen-karte');
    reihe.append(mini);
    this.q('.oe-banner').classList.remove('an');
    this.q('.oe-wurfplatz').replaceChildren();
    this.o.classList.remove('feier', 'grossfeier', 'glueht', 'ruhig');
    if (karte) {
      const a = karte.getBoundingClientRect(), z = mini.getBoundingClientRect();
      const dx = z.left + z.width / 2 - (a.left + a.width / 2), dy = z.top + z.height / 2 - (a.top + a.height / 2);
      Sound.schnipp();
      await anim(karte, [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${z.width / a.width})`, opacity: 0.2 }], { duration: this.D(320), easing: 'cubic-bezier(.5,0,.7,.4)' });
      slot.replaceChildren();
    }
    anim(mini, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: this.D(200), easing: 'ease-out' });
  }

  uebersicht() {
    this.phase = 'uebersicht';
    this.hinweis('');
    const o = this.o;
    o.classList.remove('feier', 'grossfeier', 'glueht', 'ruhig');
    o.classList.add('fertig');
    this.q('.oe-buehne').remove();
    this.q('.oe-faecher').remove();
    this.q('.oe-reihe').remove();
    this.q('.oe-banner').classList.remove('an');
    const besteSt = Math.max(...this.pack.eintraege.map((e) => e.stufe));
    if (this.alles) Sound.stufe(besteSt);
    const grid = h('div', { class: 'oe-uebersicht' });
    const neu = this.pack.eintraege.filter((e) => e.neuArt).length;
    const kopf = h('div', { class: 'ue-kopf', html: `<h2>Dein Pack</h2><span>${neu ? `<b class="gold">${neu} neue Monster</b> · ` : ''}beste Karte: <b style="color:${stufenFarbe(besteSt)}">${esc(stufenName(besteSt))}</b>${this.pack.pityNachher === 0 && this.pack.pityVorher > 0 ? ' · <b class="gold">Effektkarte! Pity zurückgesetzt</b>' : ''}</span>` });
    const karten = h('div', { class: 'ue-karten' });
    this.reihenfolge.forEach((i, k) => {
      const e = this.pack.eintraege[i];
      const el = karteElement(e.karte, { maxNeigung: 12 });
      if (e.neuArt || e.neuAusf) el.append(h('div', { class: 'neu-marke', text: e.neuArt ? 'NEU' : 'NEUE AUSF.' }));
      el.addEventListener('click', () => { abbruch(); karteVergroessern(e.karte, { neu: e.neuArt ? 'NEU' : e.neuAusf ? 'NEUE AUSFÜHRUNG' : null }); });
      karten.append(el);
      anim(el, [{ opacity: 0, transform: 'translateY(30px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: k * 50, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
    });
    grid.append(kopf, karten, h('p', { class: 'ue-tipp', text: 'Tippe eine Karte an, um sie groß mit allen Werten und Chancen zu sehen.' }));
    o.append(grid);
    const zu = (weiter) => {
      document.removeEventListener('keydown', this.taste);
      o.classList.remove('an');
      setTimeout(() => o.remove(), 300);
      this.fertig(weiter);
    };
    const knoepfe = [{ text: 'Fertig', aktion: () => zu(false) }];
    // Auto-Ablauf: Übersicht kurz zeigen, dann von selbst weiter (außer der Spieler hält an oder schaut sich eine Karte an)
    let autoTimer = null;
    const abbruch = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; this.hinweis(''); this.knoepfe(knoepfe); } };
    if (this.autoAblauf && !this.stoppWunsch) {
      let rest = 3;
      this.hinweis(`Auto-Öffnen geht in ${rest} s weiter`);
      autoTimer = setInterval(() => {
        if (--rest > 0) { this.hinweis(`Auto-Öffnen geht in ${rest} s weiter`); return; }
        clearInterval(autoTimer); autoTimer = null;
        if (document.querySelector('.lupe-hg')) { this.hinweis(''); return; }
        zu('weiter');
      }, 1000);
      this.knoepfe([{ text: 'Auto-Öffnen anhalten', aktion: () => { abbruch(); zu(false); } }, { text: 'Weiter', klasse: 'primaer', aktion: () => { abbruch(); zu('weiter'); } }]);
    }
    if (this.ausAuto) knoepfe.unshift({ text: 'Auto-Öffnen fortsetzen', klasse: 'primaer', aktion: () => zu('weiter') });
    else if (S.d.packs > 0) {
      // Mehrere Packs auf einmal [Nutzer, 24.11.2026]: Knöpfe je nach Vorrat
      const mehr = mengenOptionen(S.d.packs).map((n) => ({ text: n === S.d.packs ? `Alle ${fmt(n)}` : `${n} Packs`, aktion: async () => { zu(false); await warte(320); await mehrerePacksOeffnen(n); } }));
      knoepfe.unshift({ text: `Nächstes Pack (${fmt(S.d.packs)})`, klasse: 'primaer', aktion: async () => { zu(false); await warte(320); naechstesPack(); } }, ...mehr);
    }
    if (!autoTimer) this.knoepfe(knoepfe);
    this.taste = (e) => { if (document.querySelector('.lupe-hg')) return; if (e.key === 'Escape') { abbruch(); zu(false); } if (e.key === 'Enter') { abbruch(); zu(this.autoAblauf ? 'weiter' : false); } };
    document.addEventListener('keydown', this.taste);
  }
}

let packsNeuZeichnen = null;
export const setzePackNeuzeichnen = (f) => { packsNeuZeichnen = f; };
// Mengen für „mehrere Packs“: 5, 10, 25, 100 (soweit vorhanden) und „Alle“
export function mengenOptionen(vorrat) {
  const out = [5, 10, 25, 100].filter((n) => n < vorrat);
  if (vorrat > 1) out.push(vorrat);
  return out;
}

// Mehrere Packs sofort öffnen und gesammelt zeigen: Statistik und die besten Funde
export async function mehrerePacksOeffnen(anzahl) {
  const n = Math.min(anzahl, S.d.packs);
  if (n <= 0) return;
  const eintraege = [];
  let effektPacks = 0;
  for (let k = 0; k < n; k++) {
    const pack = packOeffnen({ quelle: 'vorrat' });
    if (pack.pityNachher === 0 && pack.pityVorher > 0) effektPacks++;
    eintraege.push(...pack.eintraege);
  }
  aenderung('pack'); speichernBald(300);
  Sound.rascheln();
  const beste = Math.max(...eintraege.map((e) => e.stufe));
  const neu = eintraege.filter((e) => e.neuArt).length;
  const fx = eintraege.filter((e) => e.karte.fx.length).length;
  const holo = eintraege.filter((e) => e.karte.holo !== 'keins').length;
  const looks = eintraege.filter((e) => e.karte.looks).length;
  const klassen = KLASSEN.map((_, i) => eintraege.filter((e) => e.karte.kl === i).length);
  // Funde: alles Besondere zuerst (Seltenheit, Klasse, Effekte, neue Monster)
  const wert = (e) => e.stufe * 1e5 + e.karte.fx.length * 1e4 + e.karte.kl * 1e3 + (e.neuArt ? 500 : 0) + (e.neuAusf ? 50 : 0);
  const funde = eintraege.filter((e) => e.stufe >= 2 || e.karte.kl >= 3 || e.karte.fx.length || e.neuArt).sort((a, b) => wert(b) - wert(a));
  const ZEIGEN = 60;
  const grid = h('div', { class: 'ue-karten sammel-karten' }, funde.slice(0, ZEIGEN).map((e) => {
    const el = karteElement(e.karte, { maxNeigung: 10 });
    if (e.neuArt || e.neuAusf) el.append(h('div', { class: 'neu-marke', text: e.neuArt ? 'NEU' : 'NEUE AUSF.' }));
    el.addEventListener('click', () => karteVergroessern(e.karte, { neu: e.neuArt ? 'NEU' : e.neuAusf ? 'NEUE AUSFÜHRUNG' : null }));
    return el;
  }));
  if (beste >= 5) { Sound.jackpot(Math.min(5, beste - 3)); konfetti(60 + beste * 10, [stufenFarbe(beste), '#ffd447', '#fff']); } else Sound.stufe(beste);
  const weiter = S.d.packs > 0 ? mengenOptionen(S.d.packs) : [];
  modal({
    titel: `${fmt(n)} Packs geöffnet`,
    klasse: 'breit',
    inhalt: h('div', { class: 'sammel' },
      h('div', { class: 'sammel-stats', html: `<div><span>Karten</span><b>${fmt(eintraege.length)}</b></div><div><span>Neue Monster</span><b class="${neu ? 'gold' : ''}">${fmt(neu)}</b></div><div><span>Beste Karte</span><b style="color:${stufenFarbe(beste)}">${esc(stufenName(beste))}</b></div><div><span>Effektkarten</span><b class="${fx ? 'gold' : ''}">${fmt(fx)}</b></div><div><span>Holo</span><b>${fmt(holo)}</b></div><div><span>Mit Look</span><b>${fmt(looks)}</b></div>` }),
      h('div', { class: 'kl-zeile', html: KLASSEN.map((k, i) => (klassen[i] ? `<span class="kl-chip kl-${k.key}">${k.name} <b>${fmt(klassen[i])}</b></span>` : '')).join('') }),
      h('h4', { text: funde.length ? `Besondere Funde (${fmt(funde.length)}${funde.length > ZEIGEN ? `, die besten ${ZEIGEN}` : ''})` : 'Keine besonderen Funde, nur gewöhnliche Karten.' }),
      grid),
    knoepfe: [
      ...(S.d.packs > 0 ? [{ text: `Nächstes Pack (${fmt(S.d.packs)})`, aktion: () => { setTimeout(naechstesPack, 320); } }] : []),
      ...weiter.map((m) => ({ text: m === S.d.packs ? `Alle ${fmt(m)}` : `${m} Packs`, aktion: () => { setTimeout(() => mehrerePacksOeffnen(m), 320); } })),
      { text: 'Fertig', klasse: 'primaer' },
    ],
    onClose: () => { packsNeuZeichnen && packsNeuZeichnen(); },
  });
}

async function naechstesPack() {
  if (S.d.packs <= 0) return;
  const pack = packOeffnen({ quelle: 'vorrat' });
  aenderung('pack'); speichernBald(300);
  Sound.rascheln();
  await zeremonie(pack, {});
  packsNeuZeichnen && packsNeuZeichnen();
}
