// Kartenlupe: Karte groß mit Neigung, daneben alle Werte und Chancen gut lesbar, dazu die eigenen Ausführungen.
import { karteElement, infoHTML, esc } from '../cardview.js';
import { Sound } from '../audio.js';
import { h, anim } from './dom.js';

// varianten: [{ label, anzahl, c }] zum Umschalten. aktionen: [{ text, klasse, aktion(c, schliessen, knopf) }]
export function karteVergroessern(c, { neu = null, varianten = null, aktiv = 0, aktionen = [], onClose } = {}) {
  Sound.klick();
  const hg = h('div', { class: 'lupe-hg' });
  const box = h('div', { class: 'lupe', role: 'dialog', 'aria-modal': 'true' });
  const kartenPlatz = h('div', { class: 'lupe-karte' });
  const info = h('div', { class: 'lupe-info' });
  const variantenBox = h('div', { class: 'lupe-varianten' });
  const aktionenBox = h('div', { class: 'lupe-aktionen' });
  const zu = () => {
    document.removeEventListener('keydown', taste);
    hg.classList.remove('an');
    setTimeout(() => hg.remove(), 220);
    onClose && onClose();
  };
  const taste = (e) => { if (e.key === 'Escape') { e.stopPropagation(); zu(); } };
  let aktuell = c;
  const zeige = (karte) => {
    aktuell = karte;
    const el = karteElement(karte, { rueckseite: 'logo', drehbar: true, maxNeigung: 18 });
    el.classList.add('gyro');
    if (neu) el.append(h('div', { class: 'neu-marke', text: neu }));
    kartenPlatz.replaceChildren(el);
    info.innerHTML = infoHTML(karte);
    aktionenBox.replaceChildren(...aktionen.map((a) => {
      const b = h('button', { class: 'btn ' + (a.klasse || ''), html: typeof a.text === 'function' ? a.text(karte) : a.text });
      if (a.deaktiviert && a.deaktiviert(karte)) b.disabled = true;
      b.addEventListener('click', () => a.aktion(karte, zu, b));
      return b;
    }), h('button', { class: 'btn', text: 'Schließen', onclick: zu }));
  };
  const zeichneVarianten = (an) => {
    if (!varianten || varianten.length < 2) { variantenBox.replaceChildren(); return; }
    variantenBox.replaceChildren(h('h4', { text: `Deine Ausführungen (${varianten.length})` }), h('div', { class: 'chips' }, varianten.map((v, i) => h('button', {
      class: 'ausf-chip' + (i === an ? ' an' : ''), html: `${esc(v.label)} <b>×${v.anzahl}</b>`,
      onclick: () => { zeichneVarianten(i); zeige(v.c); Sound.klick(); },
    }))));
  };
  box.append(h('button', { class: 'x lupe-x', 'aria-label': 'Schließen', text: '×', onclick: zu }), kartenPlatz, h('div', { class: 'lupe-seite' }, info, variantenBox, aktionenBox));
  hg.append(box);
  hg.addEventListener('pointerdown', (e) => { if (e.target === hg) zu(); });
  document.addEventListener('keydown', taste);
  document.body.append(hg);
  zeichneVarianten(aktiv);
  zeige(varianten && varianten[aktiv] ? varianten[aktiv].c : c);
  requestAnimationFrame(() => hg.classList.add('an'));
  anim(box, [{ transform: 'scale(.85) translateY(20px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1.15)', fill: 'none' });
  return { zu, aktuell: () => aktuell };
}
