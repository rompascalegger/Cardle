// Galerie für die Gestaltung (nur mit ?debug): alle Monster, alle Holo-Stufen, Looks und Klassen.
import { HOLO_STUFEN, KLASSEN } from '../config.js';
import { ARTEN, artenFuerElement } from '../species.js';
import { ELEMENTE } from '../elements.js';
import { karteElement } from '../cardview.js';
import { verteilePunkte } from '../generator.js';
import { Rng } from '../rng.js';
import { S, packOeffnen, aenderung } from '../state.js';
import { zeremonie } from './packs.js';
import { h } from './dom.js';

export function galerieScreen(root) {
  const wrap = h('section', { class: 'screen galerie' });
  const r = new Rng('galerie');
  const karte = (art, kl, holo = 'keins', looks = 0, fx = []) => {
    const K = KLASSEN[kl];
    return { art, kl, a: verteilePunkte(r, Math.round((K.min + K.max) / 2), ARTEN[art].rolle), holo, looks, fx };
  };
  // Alle Monster je Element (20 pro Element), damit die Unterschiede sichtbar sind
  const alleMonster = () => {
    const box = h('div', { class: 'gal-reihe klein' });
    const wahl = h('select', { onchange: () => zeige() }, ELEMENTE.map((e, i) => h('option', { value: i, text: e.name })));
    const zeige = () => box.replaceChildren(...artenFuerElement(Number(wahl.value)).map((a) => karteElement(karte(a.id, 1 + a.form), { animiert: false, nurMaus: true, rueckseite: 'info', drehbar: true })));
    zeige();
    return h('div', { class: 'panel' }, h('h3', { text: `Alle ${ARTEN.length} Monster` }), wahl, box);
  };
  const reihe = (titel, karten) => h('div', { class: 'panel' }, h('h3', { text: titel }), h('div', { class: 'gal-reihe' }, karten.map((c) => karteElement(c, { rueckseite: 'info', drehbar: true }))));
  wrap.append(
    h('div', { class: 'panel' }, h('h2', { text: 'Galerie (Testansicht)' }),
      h('a', { class: 'btn', href: 'tools/werkstatt.html', text: 'Sprite-Werkstatt öffnen' }),
      h('button', { class: 'btn', text: 'Test-Zeremonie: Pity-Pack', onclick: async () => { S.d.pity = 199; S.d.packs++; const p = packOeffnen(); aenderung(); await zeremonie(p, { titel: 'Pity-Test' }); } }),
      h('button', { class: 'btn', text: 'Test-Zeremonie: Omega-Karte', onclick: async () => {
        S.d.packs++; const p = packOeffnen();
        p.eintraege[9].karte = Object.assign(p.eintraege[9].karte, { holo: 'secret', looks: 31, fx: [1, 14, 51], kl: 7 });
        p.eintraege[9].stufe = 14; p.eintraege[9].wuerfe.holo = 0.0004; p.eintraege[9].wuerfe.looks = [0.001, 0.002, 0.004, 0.0001, 0.003]; p.eintraege[9].wuerfe.effekt = 0.00003; p.eintraege[9].wuerfe.klasse = 0.0005;
        await zeremonie(p, { titel: 'Nur Anzeige-Test (nicht gespeichert)' });
      } })),
    reihe('Stärkeklassen', KLASSEN.map((_, i) => karte(i * 11 % ARTEN.length, i))),
    reihe('Holo-Stufen', HOLO_STUFEN.map((hs, i) => karte(5 + i * 7, 3, hs))),
    reihe('Zusatzlooks', [1, 2, 4, 8, 16, 3, 31].map((m, i) => karte(40 + i * 3, 2, 'keins', m))),
    reihe('Effekte und Kombination', [karte(60, 4, 'holo', 0, [1]), karte(70, 5, 'reverse', 8, [9, 26]), karte(80, 7, 'secret', 31, [14, 38, 51])]),
    alleMonster(),
  );
  root.append(wrap);
  return {};
}
