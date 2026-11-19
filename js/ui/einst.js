// Einstellungen: Ton, Bewegung, Aufdecktempo, Spielstand. [VORSCHLAG 13.3/13.5]
import { CONFIG } from '../config.js';
import { S, speichernBald, zuruecksetzen, URL_SEED } from '../state.js';
import { einstellen, Sound } from '../audio.js';
import { setzeBewegung, aktiviereGyro } from '../cardview.js';
import { h, modal, toast } from './dom.js';

export function einstellungen(neuZeichnen) {
  const e = S.d.einst;
  const auswahl = (titel, key, opts, nach) => h('label', { class: 'einst-zeile' }, h('span', { text: titel }), h('select', { onchange: (ev) => { e[key] = ev.target.value; nach && nach(); speichernBald(); } }, opts.map(([v, t]) => h('option', { value: v, selected: e[key] === v, text: t }))));
  const inhalt = h('div', { class: 'einst' },
    h('label', { class: 'einst-zeile' }, h('span', { text: 'Lautstärke' }), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: e.lautstaerke, oninput: (ev) => { e.lautstaerke = Number(ev.target.value); einstellen(e.lautstaerke, e.stumm); }, onchange: () => { Sound.stufe(5); speichernBald(); } })),
    h('label', { class: 'einst-zeile' }, h('span', { text: 'Stumm' }), h('input', { type: 'checkbox', checked: e.stumm, onchange: (ev) => { e.stumm = ev.target.checked; einstellen(e.lautstaerke, e.stumm); neuZeichnen && neuZeichnen(); speichernBald(); } })),
    auswahl('Bewegung', 'bewegung', [['auto', 'wie System'], ['voll', 'volle Effekte'], ['reduziert', 'reduziert']], () => setzeBewegung(e.bewegung)),
    auswahl('Aufdecken', 'aufdecken', [['normal', 'episch'], ['schnell', 'schnell']]),
    h('div', { class: 'einst-zeile' }, h('span', { text: 'Bewegungssensor (Handy)' }), h('button', { class: 'btn klein', text: 'Aktivieren', onclick: async () => toast((await aktiviereGyro()) ? 'Neigung per Sensor aktiv.' : 'Sensor nicht verfügbar oder abgelehnt.') })),
    h('hr'),
    h('p', { class: 'leise', html: `${CONFIG.spielname} ${CONFIG.version} · Arbeitsname · Seed <code>${S.d.seed}</code>${URL_SEED ? ' (Test-Spielstand über ?seed=)' : ''}` }),
    h('p', { class: 'leise', text: 'Platzhalter laut Manifest: Spielname, Monster und Namen, Symbole, Münzquelle und Packpreise, Teamplatz-Formel und Zugablauf. Alle Werte stehen in js/config.js.' }),
    h('button', { class: 'btn gefahr', text: 'Spielstand zurücksetzen', onclick: () => {
      modal({ titel: 'Wirklich zurücksetzen?', inhalt: '<p>Alle Karten, Packs, Münzen, Staub und der Kampagnen-Fortschritt werden gelöscht. Das lässt sich nicht rückgängig machen.</p>', knoepfe: [{ text: 'Abbrechen' }, { text: 'Zurücksetzen', klasse: 'gefahr', aktion: async () => { await zuruecksetzen(); toast('Spielstand zurückgesetzt.'); location.reload(); } }] });
    } }),
  );
  modal({ titel: 'Einstellungen', inhalt });
}
