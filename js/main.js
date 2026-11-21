// Einstieg: Laden, Navigation, Kopfleiste.
import { CONFIG, LOOKS } from './config.js';
import { S, laden, speichern, beobachte, DEBUG } from './state.js';
import { einstellen, entsperren, Sound } from './audio.js';
import { initTooltip, initTexturen, setzeBewegung } from './cardview.js';
import { h, ICON, fmt } from './ui/dom.js';
import { packsScreen } from './ui/packs.js';
import { autoScreen } from './ui/auto.js';
import { sammlungScreen } from './ui/sammlung.js';
import { teamScreen } from './ui/team.js';
import { kampagneScreen, kampfScreen, dailyScreen, erfolgeScreen, erfolgeMelden } from './ui/kampagne.js';
import { pruefeErfolge } from './erfolge.js';
import { radScreen } from './ui/rad.js';
import { einstellungen } from './ui/einst.js';
import { hilfe } from './ui/hilfe.js';
import { ladeSprites } from './sprites.js';
import { galerieScreen } from './ui/galerie.js';

const SCREENS = {
  packs: { titel: 'Packs', f: packsScreen },
  auto: { titel: 'Auto-Öffnen', f: autoScreen },
  sammlung: { titel: 'Album', f: sammlungScreen },
  team: { titel: 'Team', f: teamScreen },
  kampagne: { titel: 'Kampagne', f: kampagneScreen },
  daily: { titel: 'Daily', f: dailyScreen },
  erfolge: { titel: 'Erfolge', f: erfolgeScreen },
  rad: { titel: 'Elementrad', f: radScreen },
  kampf: { titel: 'Kampf', f: kampfScreen, versteckt: true },
  galerie: { titel: 'Galerie', f: galerieScreen, versteckt: !DEBUG },
};

let aktuell = null, aktuellName = null;
const view = () => document.getElementById('view');

export function nav(name, params = {}) {
  if (!SCREENS[name]) name = 'packs';
  if (aktuell && aktuell.verlassen) aktuell.verlassen();
  aktuellName = name;
  const v = view();
  v.replaceChildren();
  v.scrollTop = 0;
  window.scrollTo(0, 0);
  document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('an', b.dataset.nav === name || (name === 'kampf' && b.dataset.nav === 'kampagne')));
  document.body.dataset.screen = name;
  aktuell = SCREENS[name].f(v, nav, params) || {};
  if (name !== 'kampf') history.replaceState(null, '', location.pathname + location.search + '#' + name);
}

function kopfleiste() {
  const nav_ = document.querySelector('.nav');
  for (const [k, s] of Object.entries(SCREENS)) {
    if (s.versteckt) continue;
    nav_.append(h('button', { 'data-nav': k, text: s.titel, onclick: () => { Sound.klick(); nav(k); } }));
  }
  const status = document.querySelector('.status');
  const muenzen = h('span', { class: 'chip', 'data-tip': 'Münzen' });
  const packs = h('button', { class: 'chip knopf', 'data-tip': 'Packs im Vorrat – zum Öffnen', onclick: () => nav('packs') });
  const staub = h('button', { class: 'chip knopf', onclick: () => nav('sammlung') });
  const ton = h('button', { class: 'werkzeug', 'aria-label': 'Ton an/aus' });
  const zahnrad = h('button', { class: 'werkzeug', 'aria-label': 'Einstellungen', 'data-tip': 'Einstellungen', html: ICON.zahnrad, onclick: () => einstellungen(zeichne) });
  const hilfeBtn = h('button', { class: 'werkzeug hilfe-btn', 'aria-label': 'Hilfe', 'data-tip': 'Hilfe: alles erklärt', text: '?', onclick: () => hilfe() });
  ton.addEventListener('click', () => { S.d.einst.stumm = !S.d.einst.stumm; einstellen(S.d.einst.lautstaerke, S.d.einst.stumm); zeichne(); speichern(); });
  status.append(muenzen, packs, staub, ton, hilfeBtn, zahnrad);
  const zeichne = () => {
    muenzen.innerHTML = `${ICON.muenze}<b>${fmt(S.d.muenzen)}</b>`;
    packs.innerHTML = `${ICON.pack}<b>${fmt(S.d.packs)}</b>`;
    const gesamt = LOOKS.reduce((x, l) => x + S.d.staub[l.key], 0);
    staub.innerHTML = `${ICON.staub}<b>${fmt(gesamt)}</b>`;
    staub.dataset.tip = 'Staub: ' + LOOKS.map((l) => `${l.kurz} ${S.d.staub[l.key]}`).join(' · ');
    ton.innerHTML = S.d.einst.stumm ? ICON.stumm : ICON.laut;
    ton.dataset.tip = S.d.einst.stumm ? 'Ton ist aus' : 'Ton ist an';
  };
  zeichne();
  let geplant = false;
  beobachte(() => { if (!geplant) { geplant = true; requestAnimationFrame(() => { geplant = false; zeichne(); }); } });
}

async function start() {
  document.title = CONFIG.spielname;
  document.querySelector('.logo-text').textContent = CONFIG.spielname.toUpperCase();
  initTexturen();
  initTooltip();
  await Promise.all([laden(), ladeSprites()]);
  setzeBewegung(S.d.einst.bewegung);
  einstellen(S.d.einst.lautstaerke, S.d.einst.stumm);
  kopfleiste();
  const entsperrer = () => { entsperren(); removeEventListener('pointerdown', entsperrer); removeEventListener('keydown', entsperrer); };
  addEventListener('pointerdown', entsperrer);
  addEventListener('keydown', entsperrer);
  addEventListener('beforeunload', () => { if (S.dirty) speichern(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.dirty) speichern(); });
  addEventListener('hashchange', () => {
    const z = location.hash.slice(1);
    if (SCREENS[z] && z !== aktuellName && z !== 'kampf' && !document.querySelector('.oeffnen')) nav(z);
  });
  // Erfolge regelmäßig prüfen (Sammlung, Funde)
  setInterval(() => { const neu = pruefeErfolge(); if (neu.length) erfolgeMelden(neu); }, 4000);
  const ziel = (location.hash || '').slice(1).split('?')[0];
  nav(SCREENS[ziel] && ziel !== 'kampf' ? ziel : 'packs');
  document.getElementById('lade').remove();
}

start().catch((e) => {
  console.error(e);
  const l = document.getElementById('lade');
  if (l) l.innerHTML = `<p>Fehler beim Start: ${String(e.message || e)}</p>`;
});
