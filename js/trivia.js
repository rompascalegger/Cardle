// Trivia je Monster [Nutzer, 24.11.2026: kleine Beschreibung auf jeder Karte].
// Aus Element, Bauplan, Erkennungsmerkmal, Rolle und Entwicklungsstufe zusammengesetzt, fest je Art (Seed = Art-ID).
import { ARTEN } from './species.js';
import { seeded } from './rng.js';

// Lebensraum je Element (zwei Varianten)
const LEBENSRAUM = [
  ['in erkalteten Vulkanschloten', 'zwischen den Glutresten alter Lagerfeuer'],
  ['an den Ufern zäher Lavaflüsse', 'in Höhlen, deren Wände noch glühen'],
  ['tief in verlassenen Kohleflözen', 'in rußigen Schornsteinen alter Fabriken'],
  ['in den Spalten uralter Felswände', 'unter Steinbrücken, die niemand mehr nutzt'],
  ['in Geoden, die nur bei Vollmond aufspringen', 'zwischen singenden Kristallsäulen'],
  ['an den Rändern ausgetrockneter Salzseen', 'in Salzminen, in denen jedes Geräusch hallt'],
  ['in klaren Bergseen', 'zwischen den Wurzeln überfluteter Wälder'],
  ['in Gewächshäusern, die niemand mehr gießt', 'unter dem Blätterdach uralter Wälder'],
  ['in dichtem Unterholz', 'in Bauen, die es selbst gräbt'],
  ['in vergessenen Werkstätten', 'in Dörfern, deren Bewohner es für einen Nachbarn halten'],
  ['in Ateliers, in denen die Farbe nie trocknet', 'zwischen den Seiten unvollendeter Skizzenbücher'],
  ['in stillen Bibliotheken', 'auf Bergspitzen, von denen aus man über alles nachdenken kann'],
  ['in Tafelbildern voller Formeln', 'in perfekt quadratischen Höhlen'],
  ['in Kratern, in denen Steine schweben', 'dort, wo es bergauf leichter geht als bergab'],
  ['in Umspannwerken', 'in Gewitterwolken über dem Meer'],
  ['in Leuchttürmen', 'am Rand von Regenbögen'],
  ['in Gletscherspalten', 'unter dem Eis gefrorener Seen'],
  ['in der Tiefsee unter enormem Druck', 'in den Kammern alter Dampfkessel'],
  ['in verlassenen Servern', 'zwischen den Pixeln alter Bildschirme'],
  ['zwischen den Sternen', 'in der Stille hinter dem Mond'],
  ['in Nebelbänken', 'in den Böen über hohen Klippen'],
  ['in gesperrten Zonen', 'in Laboren, deren Lampen nie ausgehen'],
  ['in Schrottplätzen', 'in den Schmieden alter Meister'],
  ['in Uhrwerken', 'zwischen den Zahnrädern stillgelegter Maschinen'],
  ['in Spielzeugkisten', 'auf Inseln aus angeschwemmtem Kunststoff'],
  ['in Legenden, die nur Großeltern kennen', 'auf Gipfeln über den Wolken'],
  ['in brodelnden Sümpfen', 'in Laborflaschen ohne Etikett'],
  ['im Inneren von Teilchenbeschleunigern', 'zwischen den Bahnen kreisender Elektronen'],
  ['an mehreren Orten gleichzeitig', 'überall dort, wo niemand hinsieht'],
  ['am Rand eines Ereignishorizonts', 'dort, wo Licht nicht mehr entkommt'],
  ['in stehengebliebenen Uhren', 'in Momenten, die sich wie Ewigkeiten anfühlen'],
  ['in mondlosen Nächten', 'in Schatten, die länger sind als ihr Werfer'],
];

// Verhalten je Bauplan
const BAUPLAN = {
  blob: ['Es kann sich so flach machen, dass es unter jeder Tür hindurchpasst.', 'Wenn es sich freut, wabbelt es noch eine Minute lang nach.'],
  zweibeiner: ['Es läuft auf zwei Beinen, stolpert aber gern über den eigenen Schwanz.', 'Es steht stundenlang aufrecht Wache, ohne zu blinzeln.'],
  vierbeiner: ['Auf vier Beinen ist es schneller, als man ihm zutraut.', 'Es markiert sein Revier mit sorgfältig gestapelten Steinen.'],
  schlange: ['Es rollt sich zum Schlafen zu einer perfekten Spirale ein.', 'Es kann sich durch Spalten schlängeln, die halb so breit sind wie es selbst.'],
  schweber: ['Es berührt nie den Boden, nicht einmal im Schlaf.', 'Es schwebt lautlos, nur ein leises Summen verrät es.'],
  flieger: ['Es fliegt in großen Kreisen, bevor es landet.', 'Seine Flügel schlagen so schnell, dass man sie kaum sieht.'],
  humanoid: ['Es ahmt Gesten nach, die es bei Menschen gesehen hat.', 'Es trägt gern Dinge, die es gefunden hat, als Schmuck.'],
  insekt: ['Es krabbelt nachts in Schwärmen an Wänden empor.', 'Mit seinen Fühlern spürt es Erschütterungen über weite Strecken.'],
  fisch: ['Es schwimmt durch die Luft, als wäre sie Wasser.', 'Es schläft mit offenen Augen und träumt trotzdem.'],
  krabbe: ['Es läuft lieber seitwärts als geradeaus.', 'Mit seinen Scheren knackt es selbst die härtesten Nüsse.'],
  pilz: ['Wo es länger sitzt, wachsen kleine Pilze nach.', 'Bei Regen öffnet es seinen Hut wie einen Schirm.'],
  oktopus: ['Jeder seiner Tentakel hat einen eigenen Kopf, sagen manche.', 'Es kann jedes Glas öffnen, auch von innen.'],
  vogel: ['Es singt eine Melodie, die kein Instrument nachspielen kann.', 'Es baut sein Nest aus Dingen, die anderen gehören.'],
  schnecke: ['Es trägt sein Haus immer bei sich und lädt niemanden ein.', 'Es ist langsam, kommt aber immer an.'],
  zweikopf: ['Seine beiden Köpfe sind sich selten einig.', 'Ein Kopf schläft immer, während der andere wacht.'],
  golem: ['Es wurde nicht geboren, sondern gebaut, und ist stolz darauf.', 'Es bewegt sich nur, wenn es wirklich muss.'],
  raupe: ['Es zählt seine Beine jeden Morgen und kommt nie auf dieselbe Zahl.', 'Es träumt davon, eines Tages zu fliegen.'],
  igel: ['Bei Gefahr rollt es sich zu einer stacheligen Kugel ein.', 'Seine Stacheln wachsen nach, sobald es einen verliert.'],
  langhals: ['Mit seinem langen Hals schaut es über jede Mauer.', 'Es frisst nur die obersten Blätter, die anderen sind ihm zu gewöhnlich.'],
  qualle: ['Es leuchtet schwach, wenn es nachdenkt.', 'Seine Tentakel sind länger, als es selbst weiß.'],
};

// Erkennungsmerkmal
const MERKMAL = {
  riesenhorn: 'Sein Horn wächst ein Leben lang und ist nie gleich lang wie bei Artgenossen.',
  geweih: 'Sein Geweih wirft es jeden Winter ab und trägt im Frühling ein größeres.',
  maehne: 'Seine Mähne stellt sich auf, wenn es lügt.',
  segel: 'Mit seinem Rückensegel wärmt es sich morgens in der Sonne.',
  platten: 'Die Platten auf seinem Rücken klappern, wenn es nervös ist.',
  panzer: 'Sein Panzer ist so hart, dass Hagelkörner daran zerspringen.',
  kiefer: 'Sein Kiefer schließt sich mit einem Klick, den man weit hört.',
  stosszaehne: 'Seine Stoßzähne poliert es jeden Abend sorgfältig.',
  halskrause: 'Seine Halskrause spreizt es nur, wenn es beeindrucken will.',
  drittesauge: 'Mit dem dritten Auge sieht es angeblich, was gleich passiert.',
  schweif: 'Sein langer Schweif dient ihm als Kompass.',
  tentakelbart: 'Mit seinem Tentakelbart schmeckt es die Luft.',
  fluegelchen: 'Seine kleinen Flügel tragen es nicht, aber es versucht es trotzdem jeden Tag.',
  kristallkamm: 'Sein Kristallkamm singt leise, wenn Wind darüberstreicht.',
};

const ROLLE = {
  angreifer: 'Es greift lieber an, als lange abzuwarten.',
  tank: 'Es stellt sich schützend vor Schwächere.',
  wildling: 'Niemand konnte es je zähmen.',
  riese: 'Wenn es niest, wackeln die Fenster.',
  sonderling: 'Selbst seine Artgenossen verstehen es nicht ganz.',
  wirbler: 'Es dreht sich so schnell, dass ihm nie schwindelig wird.',
  koloss: 'Es braucht viel Platz, gibt aber auch viel Halt.',
  heiler: 'Wunden schließen sich schneller, wenn es in der Nähe ist.',
  kommandant: 'Andere Monster folgen ihm, ohne zu wissen warum.',
};

const FORM = ['Das Jungtier', 'Das junge Tier', 'Ein ausgewachsenes Exemplar', 'Das legendäre Exemplar'];
// Grundgröße (m) und Gewicht (kg) je Bauplan, skaliert nach Entwicklungsstufe
const MASS = { blob: [0.6, 30], zweibeiner: [1.2, 45], vierbeiner: [1.0, 80], schlange: [3.5, 60], schweber: [1.1, 8], flieger: [0.9, 18], humanoid: [1.6, 70], insekt: [0.5, 6], fisch: [1.0, 25], krabbe: [0.8, 40], pilz: [0.7, 12], oktopus: [1.3, 35], vogel: [1.1, 14], schnecke: [0.6, 20], zweikopf: [1.4, 90], golem: [2.2, 400], raupe: [1.5, 15], igel: [0.6, 22], langhals: [2.6, 300], qualle: [0.9, 3] };
const FORM_MASS = [0.4, 0.7, 1, 1.6];

const zahl = (n, nach = 1) => n.toLocaleString('de-DE', { maximumFractionDigits: nach });

function erzeuge(a, versuch) {
  const r = seeded('trivia-' + a.kunstSeed);
  const ort = LEBENSRAUM[a.el][(Math.floor(r.next() * 2) + Math.floor(versuch / 3)) % 2];
  const s1 = `${FORM[a.form] || 'Es'} lebt ${ort}.`;
  const bp = BAUPLAN[a.bauplan] || BAUPLAN.blob;
  const kandidaten = [bp[Math.floor(r.next() * bp.length)], MERKMAL[a.merkmal], ROLLE[a.rolle]].filter(Boolean);
  // Abwechslung: je Art eine andere Mischung aus Bauplan, Merkmal und Rolle; bei Dopplung die nächste
  const s2 = kandidaten[(a.id + versuch) % kandidaten.length];
  const silber = a.silber ? ' Silberne Exemplare sind so selten, dass viele sie für ein Gerücht halten.' : '';
  const [g, m] = MASS[a.bauplan] || [1, 40];
  const f = FORM_MASS[a.form] ?? 1;
  const streu = 0.8 + r.next() * 0.4;
  const groesse = g * f * streu * (a.hoehe ?? 1);
  const gewicht = m * f ** 2.2 * streu ** 2 * (a.streckung ?? 1);
  return { text: `${s1} ${s2}${silber}`, groesse: `${zahl(groesse, 1)} m`, gewicht: gewicht < 1 ? `${zahl(gewicht * 1000, 0)} g` : `${zahl(gewicht, gewicht < 10 ? 1 : 0)} kg` };
}
// Alle Texte einmal erzeugen, keine zwei Monster mit demselben Text
const ALLE = (() => {
  const gesehen = new Set();
  return ARTEN.map((a) => {
    let t = erzeuge(a, 0);
    for (let v = 1; gesehen.has(t.text) && v < 6; v++) t = erzeuge(a, v);
    gesehen.add(t.text);
    return t;
  });
})();

// Gibt { text, groesse, gewicht } zurück
export const trivia = (artId) => ALLE[artId];
