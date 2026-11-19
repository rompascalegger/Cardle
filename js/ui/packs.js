// Packs: Shop-Bühne und die Öffnungs-Zeremonie. [FEST 10.1] Ergebnis steht vor der Animation fest. [VORSCHLAG 13.4]
import { CONFIG, KLASSEN, LOOKS, HOLO_NAMEN } from '../config.js';
import { S, packOeffnen, packKaufen, aenderung, speichernBald } from '../state.js';
import { karteElement, stufenFarbe, stufenName, esc } from '../cardview.js';
import { Sound } from '../audio.js';
import { farbton, ELEMENTE } from '../elements.js';
import { ARTEN } from '../species.js';
import { monsterBild } from '../monsterart.js';
import { EFFEKT } from '../effects.js';
import { klassenGrenzen, holoGrenzen, prozent, pityChance, seltenheitsChancen, einsVon, pHolo, pEffekte } from '../rules.js';
import { h, warte, anim, toast, schuetteln, partikel, blitzLicht, ICON, fmt } from './dom.js';

const KLASSEN_FARBEN = ['#d4935a', '#dfe5ea', '#ffd23f', '#cfe6f2', '#3ee08f', '#ff4f72', '#4f8dff', '#e8f6ff'];
const zufallsArt = () => Math.floor(Math.random() * ARTEN.length);

export function packElement(artId = zufallsArt()) {
  const bild = monsterBild(artId, true);
  const el = ARTEN[artId].el;
  return h('div', {
    class: 'pack', 'data-art': artId, style: `--ph:${farbton(el).toFixed(0)}`, html: `
<div class="pack-koerper">
  <div class="pack-folie"></div>
  <div class="pack-rad"></div>
  <img class="pack-motiv" src="${bild.fg}" alt="" draggable="false">
  <div class="pack-logo">${esc(CONFIG.spielname.toUpperCase())}</div>
  <div class="pack-unter">BOOSTER · ${CONFIG.packGroesse} KARTEN</div>
  <div class="pack-el">${esc(ELEMENTE[el].name)}-Edition</div>
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
  buehne.append(h('div', { class: 'buehne-licht' }), schwebe, h('div', { class: 'pack-aktionen' }, btnOeffnen, vorrat, h('div', { class: 'kauf' }, kauf1, kauf10)));
  const info = h('aside', { class: 'panel pack-info' });
  wrap.append(buehne, info);
  root.append(wrap);

  const aktualisiere = () => {
    vorrat.innerHTML = `Vorrat: <b>${fmt(S.d.packs)}</b> ${S.d.packs === 1 ? 'Pack' : 'Packs'}`;
    btnOeffnen.disabled = S.d.packs <= 0;
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
  <div class="ch-gruppe"><h4>Holo-Stufe</h4>${['reverse', 'holo', 'secret'].map((x) => `<div class="ch-z"><i class="holo-i ${x}"></i><span>${HOLO_NAMEN[x]}</span><b>${prozent(pHolo(x))}</b></div>`).join('')}
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

function zonenKlasse() {
  return klassenGrenzen().map((z) => ({ von: z.von, bis: z.bis, farbe: KLASSEN_FARBEN[z.i], label: KLASSEN[z.i].name, gut: z.i >= 3, idx: z.i }));
}
function zonenHolo() {
  const g = holoGrenzen();
  const f = { secret: 'linear-gradient(90deg,#ff5fd2,#5ffff0,#ffe14d)', holo: 'linear-gradient(90deg,#ff7a7a,#ffe14d,#7aff9a,#7ad8ff,#c27aff)', reverse: 'linear-gradient(90deg,#c9d3dc,#ffffff,#b9e6ff)' };
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
  const mk = messer('klasse', w.klasse, zonenKlasse());
  zeilen.push({ ...zeile('Klasse', mk.el, `<b style="color:${KLASSEN_FARBEN[c.kl]}">${KLASSEN[c.kl].name}</b>`), m: [mk], art: 'klasse' });
  const mh = messer('holo', w.holo, zonenHolo());
  zeilen.push({ ...zeile('Holo', mh.el, c.holo === 'keins' ? '–' : `<b class="regenbogen">${HOLO_NAMEN[c.holo]}</b>`), m: [mh], art: 'holo' });
  const lookBox = h('div', { class: 'look-messer' });
  const ml = w.looks.map((u) => { const m = messer('look', u, [{ von: 0, bis: CONFIG.lookChance, farbe: '#ffd447', label: 'Look', gut: true }], { duenn: true, ohneWert: true }); lookBox.append(m.el); return m; });
  const gefunden = LOOKS.filter((_, i) => c.looks & (1 << i)).map((l) => l.kurz);
  zeilen.push({ ...zeile('Looks', lookBox, gefunden.length ? `<b class="gold">${gefunden.join(', ')}</b>` : '–'), m: ml, art: 'looks' });
  const me = messer('effekt', w.effekt, [{ von: 0, bis: w.effektChance, farbe: 'linear-gradient(90deg,#ffd447,#ff9b2f)', label: 'Effekt', gut: true }], { erzwungen: w.pity });
  zeilen.push({ ...zeile('Effekt', me.el, c.fx.length ? `<b class="gold">${c.fx.map((id) => esc(EFFEKT[id].name)).join(', ')}</b>` : '–'), m: [me], art: 'effekt' });
  return { panel, zeilen };
}

// ---------- Zeremonie ----------
export function zeremonie(pack, { artId = zufallsArt(), titel = null, auto = false, ausAuto = false } = {}) {
  return new Promise((resolve) => new Zeremonie(pack, artId, titel, auto, resolve, ausAuto).start());
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
    o.innerHTML = `<div class="oe-hg"></div><div class="oe-strahlen"></div><div class="oe-glow"></div>
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
      this.tipp();
    };
    o.addEventListener('pointerdown', tipp);
    this.taste = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.tipp(); }
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

  async start() {
    this.bauen();
    this.knoepfe([{ text: 'Alle aufdecken', aktion: () => this.allesAufdecken() }]);
    await this.reissen();
    await this.faechern();
    this.phase = 'aufdecken';
    for (let n = 0; n < this.reihenfolge.length; n++) {
      if (this.alles) break;
      const i = this.reihenfolge[n];
      this.eilig = false;
      await this.deckeAuf(i, n);
      if (this.alles) break;
      await this.weiterWarten(n === this.reihenfolge.length - 1 ? 'Tippen für die Übersicht' : 'Tippen für die nächste Karte');
      await this.inReihe(i);
    }
    this.uebersicht();
  }

  allesAufdecken() {
    if (this.phase === 'uebersicht') return;
    this.alles = true; this.eilig = true;
    if (this.reissFertig) this.reissFertig();
    if (this.warter) { const w = this.warter; this.warter = null; w(); }
  }

  // Phase 1: Aufreißen mit Widerstand [VORSCHLAG 13.4]
  reissen() {
    this.phase = 'reissen';
    const platz = this.q('.oe-packplatz');
    const pack = packElement(this.artId);
    pack.classList.add('gross');
    platz.append(pack);
    anim(pack, [{ transform: 'translateY(60px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    this.hinweis('Ziehe an der Lasche, um das Pack aufzureißen');
    this.knoepfe([{ text: 'Aufreißen', klasse: 'primaer', aktion: () => auto() }, { text: 'Alle aufdecken', aktion: () => this.allesAufdecken() }]);
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
      this.knoepfe([{ text: 'Alle aufdecken', aktion: () => this.allesAufdecken() }]);
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
      const el = h('div', { class: 'faecher-karte', style: `--w:${winkel}deg;--k:${k}`, html: `<div class="fk-innen"></div>` });
      f.append(el);
      return el;
    });
    Sound.faechern(n);
    for (const [k, el] of this.faecherKarten.entries()) {
      anim(el, [{ transform: 'translate(-50%, 40vh) rotate(0deg) scale(.6)', opacity: 0 }, { transform: `translate(calc(-50% + ${(k - (n - 1) / 2) * 36}px), ${Math.abs(k - (n - 1) / 2) * 5}px) rotate(var(--w))`, opacity: 1 }], { duration: this.D(520), delay: this.D(k * 45), easing: 'cubic-bezier(.2,.9,.3,1.15)' });
    }
    await this.warteD(520 + n * 45);
    this.knoepfe([{ text: 'Alle aufdecken', aktion: () => this.allesAufdecken() }]);
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
    // Feier je nach Stufe
    this.o.classList.add(st >= 7 ? 'grossfeier' : st >= 3 ? 'feier' : 'ruhig');
    Sound.stufe(st);
    const r = karte.getBoundingClientRect();
    if (st >= 2) partikel(r.left + r.width / 2, r.top + r.height / 2, { anzahl: 10 + st * 8, farben: [stufenFarbe(st), '#fff', '#ffd447'], weite: 120 + st * 30 });
    if (st >= 5) { schuetteln(this.o, 0.6 + st * 0.12); blitzLicht(stufenFarbe(st), 0.35 + st * 0.03); }
    if (st >= 3) this.banner(st, c);
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

  banner(st, c) {
    const b = this.q('.oe-banner');
    b.style.setProperty('--bf', stufenFarbe(st));
    b.innerHTML = `<span>${esc(stufenName(st))}</span>${c.fx.length ? `<small>${c.fx.map((id) => esc(EFFEKT[id].name)).join(' · ')}</small>` : ''}`;
    b.classList.remove('an'); void b.offsetWidth; b.classList.add('an');
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
      const el = karteElement(e.karte, { rueckseite: 'info', drehbar: true, maxNeigung: 12 });
      if (e.neuArt || e.neuAusf) el.append(h('div', { class: 'neu-marke', text: e.neuArt ? 'NEU' : 'NEUE AUSF.' }));
      karten.append(el);
      anim(el, [{ opacity: 0, transform: 'translateY(30px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: k * 50, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
    });
    grid.append(kopf, karten, h('p', { class: 'ue-tipp', text: 'Tippe eine Karte an, um sie umzudrehen. Die Rückseite zeigt Werte und Chancen.' }));
    o.append(grid);
    const zu = (weiter) => {
      document.removeEventListener('keydown', this.taste);
      o.classList.remove('an');
      setTimeout(() => o.remove(), 300);
      this.fertig(weiter);
    };
    const knoepfe = [{ text: 'Fertig', aktion: () => zu(false) }];
    if (this.ausAuto) knoepfe.unshift({ text: 'Auto-Öffnen fortsetzen', klasse: 'primaer', aktion: () => zu('weiter') });
    else if (S.d.packs > 0) knoepfe.unshift({ text: `Nächstes Pack (${fmt(S.d.packs)})`, klasse: 'primaer', aktion: async () => { zu(false); await warte(320); naechstesPack(); } });
    this.knoepfe(knoepfe);
    this.taste = (e) => { if (e.key === 'Escape' || e.key === 'Enter') zu(false); };
    document.addEventListener('keydown', this.taste);
  }
}

let packsNeuZeichnen = null;
export const setzePackNeuzeichnen = (f) => { packsNeuZeichnen = f; };
async function naechstesPack() {
  if (S.d.packs <= 0) return;
  const pack = packOeffnen({ quelle: 'vorrat' });
  aenderung('pack'); speichernBald(300);
  Sound.rascheln();
  await zeremonie(pack, {});
  packsNeuZeichnen && packsNeuZeichnen();
}
