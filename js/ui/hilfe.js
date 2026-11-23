// Hilfe: alle Regeln und Bildschirme erklärt. Zahlen kommen aus der Konfiguration.
import { CONFIG, KLASSEN, LOOKS, HOLO_NAMEN } from '../config.js';
import { ATTRIBUTE, attrIcon } from '../attributes.js';
import { EFFEKTE } from '../effects.js';
import { ARTEN, REGULAERE_ARTEN } from '../species.js';
import { ALLE_KAEMPFE } from '../campaign.js';
import { prozent, seltenheitsChancen, einsVon, pHolo } from '../rules.js';
import { esc } from '../cardview.js';
import { faktorText } from '../elements.js';
import { h, modal, fmt } from './dom.js';
import { spielstandExport, spielstandPruefen, spielstandImport, speichern } from '../state.js';

const abschnitt = (titel, html, offen = false) => `<details class="hilfe-abschnitt"${offen ? ' open' : ''}><summary>${titel}</summary><div class="hilfe-text">${html}</div></details>`;

export function hilfe() {
  const K = CONFIG.kampagne, G = CONFIG.gluecksPack, P = CONFIG.pity;
  const ch = seltenheitsChancen();
  const silber = ARTEN.length - REGULAERE_ARTEN.length;
  const html = [
    abschnitt('Worum geht es?', `<p>Du sammelst Monsterkarten aus Booster-Packs, baust ein Team und kämpfst dich durch eine lange Kampagne. Jede Karte hat ein <b>Element</b>, eine <b>Stärkeklasse</b>, acht <b>Attribute</b> und eine <b>Kartenseltenheit</b>. Es gibt ${fmt(REGULAERE_ARTEN.length)} Monster (${CONFIG.monster.artenProElement} je Element) und ${silber} seltene Silber-Monster.</p>
<p><b>Ablauf:</b> Packs öffnen → im Album sammeln und Looks übertragen → Team aufstellen → Kampagne spielen → Belohnungen (Packs, Münzen, Glückspacks) → wieder Packs öffnen.</p>`, true),
    abschnitt('Packs öffnen', `<p>Ein Pack hat ${CONFIG.packGroesse} Karten. Alle Zufallswerte stehen fest, sobald du das Pack öffnest. Die Animation zeigt das Ergebnis nur.</p>
<ul><li><b>Aufreißen:</b> An der Lasche oben ziehen oder „Aufreißen“ drücken.</li>
<li><b>Karte wählen:</b> Die Karten liegen gemischt im Fächer. Tippe eine an, um sie aufzudecken. Sehr seltene Karten <b>glühen</b> schon im Fächer.</li>
<li><b>Würfe:</b> Neben der Karte laufen die Zufallszahlen für Klasse, Holo, Looks und Effekt sichtbar ab. Landet die Nadel in einer farbigen Zone, ist es ein Treffer. „knapp!“ heißt, der Wurf lag kurz davor.</li>
<li>Tippe die aufgedeckte Karte an, um die Animation zu beschleunigen. „Alle aufdecken“ springt zur Übersicht.</li>
<li>In der Übersicht öffnet ein Klick auf eine Karte die <b>große Ansicht</b> mit allen Werten und Chancen.</li></ul>
<p><b>Sonderpacks</b> (Glückspack, Elementpack) bekommst du für abgeschlossene Welten, Erfolge und hohe Daily Challenges.</p>`),
    abschnitt('Stärkeklassen', `<p>Die Klasse bestimmt den Bereich der Punktesumme (Stärke). Der Rahmen der Karte zeigt die Klasse.</p>
<table class="hilfe-tab"><tr><th>Klasse</th><th>Stärke</th><th>Chance</th></tr>${KLASSEN.map((k) => `<tr><td><span class="kl-chip kl-${k.key}">${k.name}</span></td><td>${k.min}–${k.max}</td><td>${prozent(k.chance)}</td></tr>`).join('')}</table>
<p><b>Silber-Monster</b> erscheinen nur als Silber und werden seltener gezogen als normale Monster.</p>`),
    abschnitt('Kartenseltenheit (14 Stufen)', `<p>Unabhängig von der Klasse. Sie ergibt sich aus Holo-Stufe, Anzahl der Zusatzlooks und Anzahl der Effekte (Punktemodell).</p>
<table class="hilfe-tab"><tr><th>Stufe</th><th>Name</th><th>Chance je Karte</th></tr>${CONFIG.seltenheit.namen.map((n, i) => `<tr><td>${i + 1}</td><td>${esc(n)}</td><td>${einsVon(ch[i + 1])}</td></tr>`).join('')}</table>`),
    abschnitt('Holo-Stufen und Zusatzlooks', `<p><b>Holo-Stufen</b> schließen sich aus und sind fest an die Karte gebunden:</p>
<ul>${['reverse', 'holo', 'secret', 'ghost'].map((x) => `<li><b>${HOLO_NAMEN[x]}</b> (${prozent(pHolo(x))}): ${{ reverse: 'Hintergrund und Rahmen schimmern, das Monster nicht.', holo: 'Regenbogen über dem ganzen Bild.', secret: 'Tiefe, Prisma über der Karte, Partikel.', ghost: 'die seltenste Stufe: blasse, durchscheinende Karte, das Monster als schimmerndes Geisterbild.' }[x]}</li>`).join('')}</ul>
<p><b>Zusatzlooks</b> (je ${prozent(CONFIG.lookChance)}, kombinierbar): ${LOOKS.map((l) => esc(l.name)).join(', ')}. Sie sind mit <b>Staub</b> übertragbar.</p>`),
    abschnitt('Spezialeffekte', `<p>Sehr selten (mindestens ein Effekt: ${prozent(CONFIG.effekte.mind1)} je Karte, bis zu ${CONFIG.effekte.maxProKarte} pro Karte). Karten mit Effekt leuchten golden. Jeder Effekt erhöht die <b>Beschwörungskosten</b> um seinen Preisfaktor, nicht die Stärke. Effekte wirken ab dem Zug nach der Beschwörung, Blitzeffekte (⚡) sofort.</p>
<p><b>Pity:</b> Nach ${P.schwelle} Packs ohne Effektkarte verdoppelt sich die Chance alle ${P.verdopplung} Packs, im ${P.garantie}. Pack ist eine Effektkarte sicher.</p>
<details><summary>Alle ${EFFEKTE.length} Effekte</summary><table class="hilfe-tab">${EFFEKTE.map((e) => `<tr><td>${e.blitz ? '⚡' : '✦'} <b>${esc(e.name)}</b></td><td>${esc(e.wirkung)}</td><td>×${String(e.faktor).replace('.', ',')}</td></tr>`).join('')}</table></details>`),
    abschnitt('Attribute', `<p>Die Summe aller Attributpunkte ist die <b>Stärke</b> und zugleich die <b>Lebenspunkte</b> der Karte.</p>
<div class="hilfe-attr">${ATTRIBUTE.map((a) => `<div>${attrIcon(a.key)}<b>${esc(a.name)}</b><span>${esc(a.info)}</span></div>`).join('')}</div>`),
    abschnitt('Elementrad', `<p>32 Elemente auf einem Kreis. Der Abstand zweier Elemente bestimmt den Schaden:</p>
<ul><li>Nachbarn und Abstände ohne Primzahl: neutral (×1).</li>
<li>Abstände 2, 3, 5, 7, 11, 13: in die eine Richtung stark (${[1.1, 1.2, 1.4, 1.6, 1.8, 2].map((f) => faktorText(f)).join(', ')}), in die andere schwach (Kehrwert).</li>
<li>Gegenpol (16 Felder): ×${String(CONFIG.rad.gegenpolFaktor).replace('.', ',')} in beide Richtungen, ein riskantes Duell.</li></ul>
<p>Schaden = Elementarkraft × Faktor × Teamplatz-Multiplikator ÷ (Elementarschutz + 1). Unter „Elementrad“ kannst du jedes Element anklicken und siehst seine Stärken und Schwächen.</p>`),
    abschnitt('Kampf', `<p>Jede Seite hat ${CONFIG.kampf.spielerLeben} Leben (Bosse mehr). Pro Zug:</p>
<ol><li>Beschwörungspunkte: +${CONFIG.kampf.beschwoerungProZug} je Zug (spätere Gegner mehr), Ungenutztes wird angespart.</li>
<li>Beschwören: Karte aus der Hand antippen und eine freie Spalte wählen (zweimal tippen setzt sie automatisch). Feldkarten lassen sich durch Antippen tauschen.</li>
<li>„Kampf!“: Monster verschieben ihr Element mit Seltsamkeit, dann greifen sie Spalte für Spalte an. Wer auf 0 Leben fällt, ist sofort aus dem Spiel.</li></ol>
<ul><li>Ohne Wildheit trifft ein Monster nur sein Gegenüber. Mit Wildheit wählt es Ziele frei und teilt den Angriff auf. Große Ziele (Größe) kann nur angreifen, wer genug Wildheit hat.</li>
<li>Greift ein Monster ins Leere, wählt der Verteidiger, wen es trifft.</li>
<li>Ein Leben verliert, wessen Monster alle ausgeschaltet werden oder wer ohne Monster angegriffen wird (höchstens 1 je Runde).</li>
<li>Hat eine Seite keine Karten mehr, ist der Kampf sofort entschieden.</li>
<li>„Auto“ spielt für dich, die Tempo-Taste beschleunigt die Animation.</li></ul>`),
    abschnitt('Team', `<p>Dein Team hat ${CONFIG.kampf.teamGrundplaetze} Grundplätze. Jede Karte belegt so viele Plätze wie ihr Teamplatz-Wert (mindestens 1), Teamplatz erhöht dafür ihren Angriff. Karten mit Teamkapazität bringen zusätzliche Plätze mit. Gegner bauen ihre Teams nach denselben Regeln.</p>`),
    abschnitt('Kampagne', `<p>Für jedes der 32 Elemente gibt es eine <b>Dimension</b> mit ${K.weltenProDimension} Welten zu je ${K.stufenProWelt} Stufen (Stufe ${K.zwischenbossStufe}: Zwischenboss, Stufe ${K.stufenProWelt}: Weltenboss). Alle Dimensionen sind offen, ihre Welten spielst du der Reihe nach. Dazu kommt die <b>Kern-Dimension</b> in der Mitte des Rads mit ${CONFIG.kern.welten} Welten. Sie öffnet sich, wenn du in jeder Dimension ${CONFIG.kern.freiAbWeltenJeDimension} Welten abgeschlossen hast. Insgesamt sind es ${fmt(ALLE_KAEMPFE.length)} Kämpfe.</p>
<ul><li>Die Karte ist das Elementrad: Tippe eine Dimension an, dann eine Welt. Jede Welt hat einen eigenen Namen und eine eigene Landschaft.</li>
<li>Je mehr Welten du insgesamt abgeschlossen hast, desto stärker werden alle Gegner. Spätere Gegner beschwören auch mehr Punkte je Zug.</li>
<li>Die Farbe am Kampf zeigt, wie schwer er im Vergleich zu deinem Team ist (leicht, machbar, schwer, sehr schwer).</li>
<li>Jeder Sieg bringt Packs und Münzen, Wiederholungen einen Teil davon. Für jede abgeschlossene Welt gibt es <b>Sonderpacks</b>: Glückspacks und Elementpacks der Dimension.</li></ul>`),
    abschnitt('Daily Challenges', `<p>Jeden Tag gibt es acht Challenges, von der „Daily Bronze Challenge“ bis zur „Daily Diamond Challenge“. Es kämpfen nur deine stärksten Karten genau dieser Klasse gegen ein Team derselben Klasse. Jede Challenge gibt einmal am Tag eine Belohnung, höhere Klassen mehr. Wer an mehreren Tagen in Folge gewinnt, baut eine Serie auf.</p>`),
    abschnitt('Erfolge und Sonderpacks', `<p>Erfolge gibt es für Welten, Dimensionen, den Kern, Siege, Daily-Serien, die Sammlung und besondere Funde. Jeder Erfolg bringt eine Belohnung.</p>
<ul><li><b>Glückspack</b>: ${G.karten} Karten, alle seltenen Chancen ×${G.faktor}.</li><li><b>Elementpack</b>: ${CONFIG.elementPack.karten} Karten nur aus einem Element, seltene Chancen ×${CONFIG.elementPack.faktor}.</li></ul>`),
    abschnitt('Auto-Öffnen', `<p>Öffnet Packs automatisch gegen Münzen. Zuerst werden Packs aus deinem Vorrat geöffnet (nur die Tempo-Gebühr), danach werden Packs gekauft. Je schneller, desto teurer: ${CONFIG.autoOeffnen.stufen.map((t) => `${t.name} ${t.gebuehr}`).join(', ')} Münzen Gebühr je Pack.</p>
<p>Besondere Funde (einstellbar) erscheinen groß oben im Auto-Öffnen, das Öffnen läuft dabei weiter. Mit „bei einem Fund anhalten“ stoppt es stattdessen.</p>`),
    abschnitt('Album, Staub und Verkauf', `<ul><li><b>Monster</b>-Ansicht: ein Stapel je Monster mit allen Ausführungen (Kombinationen aus Holo-Stufe und Zusatzlooks) als kleine Marken. <b>Alle Karten</b>: jede Karte einzeln.</li>
<li>Filter für Name, Element, Klasse, Seltenheit, Holo, Look, Effekt, Rolle, Bauplan, Entwicklung, Attribute, Stärke und Team. Sortieren nach jeder Eigenschaft, auf- oder absteigend.</li>
<li>Klick auf eine Karte öffnet die große Ansicht. Dort schaltest du zwischen deinen Ausführungen um und kannst verkaufen.</li>
<li><b>Looks übertragen</b> (unter „Alle Karten &amp; Looks“): Abtragen gibt Staub dieses Looks (Klassennummer), Auftragen kostet ${CONFIG.staub.auftragKosten} Staub.</li>
<li><b>Doppelte verkaufen</b>: Je Monster und Ausführung bleiben die stärksten Karten, schwache Doppelte werden zu Münzen. Teamkarten werden nie verkauft.</li></ul>`),
    abschnitt('Tipps', `<ul><li>Nutze den Gegenpol: ×${String(CONFIG.rad.gegenpolFaktor).replace('.', ',')} Schaden, aber du nimmst ihn auch.</li>
<li>Spare Beschwörungspunkte für starke Karten, wenn dein Feld steht.</li>
<li>Elementarschutz teilt jeden Treffer, schon 1 Punkt halbiert den Schaden.</li>
<li>Verkaufe schwache Doppelte, um Münzen für das Auto-Öffnen zu bekommen.</li></ul>`),
  ].join('');
  const inhalt = h('div', { class: 'hilfe' }, sicherung(), h('div', { html }));
  modal({ titel: 'Hilfe', inhalt, klasse: 'breit' });
}

// Spielstand exportieren und importieren (Datei oder Text zum Kopieren)
function sicherung() {
  const info = h('p', { class: 'sicherung-info' });
  const feld = h('textarea', { class: 'sicherung-text', rows: 3, spellcheck: false, placeholder: 'Spielstand hier einfügen …' });
  const melde = (t, fehler = false) => { info.textContent = t; info.classList.toggle('fehler', fehler); };
  const datei = h('input', { type: 'file', accept: '.json,application/json,text/plain', hidden: true, onchange: async () => { const f = datei.files[0]; if (f) { feld.value = await f.text(); importieren(); } datei.value = ''; } });

  const exportieren = async () => {
    await speichern();
    const text = spielstandExport();
    const tag = new Date().toISOString().slice(0, 10);
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: `cardle-spielstand-${tag}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    melde('Spielstand als Datei gespeichert.');
  };
  const kopieren = async () => {
    await speichern();
    const text = spielstandExport();
    feld.value = text;
    try { await navigator.clipboard.writeText(text); melde('Spielstand in die Zwischenablage kopiert.'); } catch { feld.select(); melde('Text unten markiert: mit Strg+C kopieren.'); }
  };
  const importieren = () => {
    let p;
    try { p = spielstandPruefen(feld.value); } catch (e) { return melde(e.message, true); }
    const wann = p.zeit ? ` vom ${new Date(p.zeit).toLocaleString('de-DE')}` : '';
    modal({
      titel: 'Spielstand importieren?',
      inhalt: `<p>Spielstand${wann}: <b>${fmt(p.karten)}</b> Karten, <b>${fmt(p.muenzen)}</b> Münzen, <b>${fmt(p.packs)}</b> Packs.</p><p>Dein aktueller Spielstand wird dabei <b>ersetzt</b>. Exportiere ihn vorher, wenn du ihn behalten willst.</p>`,
      knoepfe: [
        { text: 'Abbrechen' },
        { text: 'Ersetzen und laden', klasse: 'primaer', aktion: () => { spielstandImport(feld.value).catch((e) => melde(e.message, true)); } },
      ],
    });
  };
  return h('div', { class: 'panel sicherung' },
    h('h3', { text: 'Spielstand sichern' }),
    h('p', { text: 'Exportiere deinen Spielstand als Datei oder Text, um ihn zu sichern oder auf ein anderes Gerät mitzunehmen.' }),
    h('div', { class: 'sicherung-knoepfe' },
      h('button', { class: 'btn primaer', text: 'Exportieren (Datei)', onclick: exportieren }),
      h('button', { class: 'btn', text: 'Als Text kopieren', onclick: kopieren }),
      h('button', { class: 'btn', text: 'Datei importieren', onclick: () => datei.click() }),
      h('button', { class: 'btn', text: 'Text importieren', onclick: importieren })),
    feld, datei, info);
}
