// Cardle – zentrale Konfiguration aller Balancing-Werte.
//
// Statuskürzel wie im MANIFEST.md:
//   [FEST]      vom Nutzer festgelegt, so gebaut
//   [ANNAHME]   Lesart einer Nutzeraussage, gebaut, aber hier änderbar
//   [VORSCHLAG] Entwurf, als Standardwert gesetzt
//   [OFFEN]     ungeklärt, nur Platzhalter, damit das Spiel läuft
//
// Alles, was Balancing ist, steht hier. Der übrige Code liest nur diese Werte.

// Versionskennung, oben in der Hilfe angezeigt. Bei jedem Release hochzählen (Datum + Buchstabe für mehrere am Tag).
export const VERSION = { kennung: '2026.11.24g', stand: '24.11.2026', notiz: 'Kampf: Hand-Sortierung, Effekte und Hover-Infos, Friedhof, Wiederbelebung repariert' };

export const CONFIG = {
  spielname: 'Cardle', // [OFFEN] Platzhalter, Arbeitsname (Manifest 1.2)
  version: '0.1.0',

  packGroesse: 10, // [FEST]
  // [Nutzer, 21.11.2026] Glückspack: Belohnung für Weltenbosse. 5 Karten, alle seltenen Chancen ×10
  // (Klassen ab Emerald, Holo-Stufen, Zusatzlooks, Effekte). Die häufigen Klassen werden anteilig seltener.
  gluecksPack: { karten: 5, faktor: 10, klasseAb: 4 },

  rad: {
    anzahl: 32, // [FEST]
    gegenpolAbstand: 16, // [FEST]
    primFaktoren: { 2: 1.1, 3: 1.2, 5: 1.4, 7: 1.6, 11: 1.8, 13: 2.0 }, // [FEST] Faktor der starken Seite, schwach = Kehrwert
    gegenpolFaktor: 2.5, // [ANNAHME] Nutzer sagte "2,4, äh, 5"
    // [ANNAHME 4.5] +1: Ein Angreifer, der d Schritte im Uhrzeigersinn hinter dem Verteidiger liegt, ist stark.
    // -1 kehrt die Richtung um (Manifest: "nur das Vorzeichen von d umkehren").
    richtung: 1,
  },

  // [FEST] Bereiche Bronze bis Ruby und "Saphire ab 50". [VORSCHLAG] Saphire-Deckel 80, Diamond 70–100.
  // Chancen [Nutzer, 21.11.2026]: Bronze deutlich häufiger (vorher 40/28/17/9/4/1,5/0,4/0,1 %).
  klassen: [
    { key: 'bronze', name: 'Bronze', min: 1, max: 7, chance: 0.60 },
    { key: 'silber', name: 'Silber', min: 7, max: 15, chance: 0.22 },
    { key: 'gold', name: 'Gold', min: 13, max: 25, chance: 0.10 },
    { key: 'platin', name: 'Platin', min: 23, max: 35, chance: 0.05 },
    { key: 'emerald', name: 'Emerald', min: 30, max: 45, chance: 0.02 },
    { key: 'ruby', name: 'Ruby', min: 40, max: 60, chance: 0.006 },
    { key: 'saphire', name: 'Saphire', min: 50, max: 80, chance: 0.003 },
    { key: 'diamond', name: 'Diamond', min: 70, max: 100, chance: 0.001 },
  ],

  // [VORSCHLAG 5.5] Obergrenzen. Hinweis: Summe 88 (78 ohne Kapazität) liegt unter dem Diamond-Deckel 100.
  // Punkte über der Summe der Obergrenzen lassen sich nicht verteilen, die Stärke wird dann gedeckelt (siehe generator.js).
  obergrenzen: {
    kraft: 30, schutz: 15, groesse: 5, wildheit: 5,
    seltsamkeit: 8, schlagzahl: 5, teamplatz: 10, heilung: 10, kapazitaet: 10,
  },

  // [VORSCHLAG 5.1] Rollen mit Gewichten für die Punkteverteilung. Pro Monsterart fest.
  // min: Mindestpunkte, wenn die Stärke es zulässt (sorgt dafür, dass Angreifer überhaupt angreifen).
  rollen: {
    angreifer: { name: 'Angreifer', schlagMax: 2, g: { kraft: 6, schutz: 2, groesse: 1, wildheit: 1.5, seltsamkeit: 1, schlagzahl: 2, teamplatz: 1 }, min: { kraft: 1, schlagzahl: 1 } },
    tank: { name: 'Tank', schlagMax: 1, g: { kraft: 2, schutz: 6, groesse: 3, wildheit: 0.5, seltsamkeit: 0.5, schlagzahl: 1, teamplatz: 0.5 }, min: { schutz: 1, schlagzahl: 1 } },
    wildling: { name: 'Wildling', schlagMax: 2, g: { kraft: 4, schutz: 1, groesse: 0.5, wildheit: 4, seltsamkeit: 1, schlagzahl: 2, teamplatz: 0.5 }, min: { kraft: 1, schlagzahl: 1 } },
    riese: { name: 'Riese', schlagMax: 1, g: { kraft: 4, schutz: 3, groesse: 4, wildheit: 1, seltsamkeit: 0.3, schlagzahl: 1, teamplatz: 2 }, min: { kraft: 1, schlagzahl: 1 } },
    sonderling: { name: 'Sonderling', schlagMax: 2, g: { kraft: 3, schutz: 2, groesse: 1, wildheit: 1, seltsamkeit: 5, schlagzahl: 1, teamplatz: 0.5 }, min: { kraft: 1, schlagzahl: 1 } },
    wirbler: { name: 'Wirbler', schlagMax: 4, g: { kraft: 4, schutz: 1, groesse: 0.5, wildheit: 2, seltsamkeit: 1, schlagzahl: 4, teamplatz: 0.5 }, min: { kraft: 1, schlagzahl: 1 } },
    koloss: { name: 'Koloss', schlagMax: 1, g: { kraft: 5, schutz: 2, groesse: 2, wildheit: 1, seltsamkeit: 0.5, schlagzahl: 1, teamplatz: 4 }, min: { kraft: 1, schlagzahl: 1 } },
    heiler: { name: 'Heiler', schlagMax: 1, g: { kraft: 2, schutz: 2, groesse: 1, wildheit: 1, seltsamkeit: 1, schlagzahl: 1, teamplatz: 0.5, heilung: 5 }, min: { heilung: 1 } }, // [Nutzer, 21.11.2026]
    // [FEST] Teamkapazität ist optional, nur diese Rolle trägt sie ([OFFEN] welche Karten sie haben, Platzhalter).
    kommandant: { name: 'Kommandant', schlagMax: 1, g: { kraft: 2, schutz: 2, groesse: 1, wildheit: 1, seltsamkeit: 1, schlagzahl: 1, teamplatz: 0.5, kapazitaet: 5 }, min: { kapazitaet: 1 } },
  },

  holo: { reverse: 0.01, holo: 0.005, secret: 0.001, ghost: 0.0002 }, // [FEST] Chance pro Karte, schließen sich aus. Ghost Rare [Nutzer, 21.11.2026]: neue, seltenste Holo-Stufe
  lookChance: 0.005, // [FEST] je Zusatzlook, unabhängig

  // Effekt-Seltenheit [Nutzer, 24.11.2026]: Stufe 1–5, kostet +Stufe Beschwörungspunkte. Neue Effekte wirken je Stufe stärker (bis ×5).
  effektStufen: {
    namen: ['Gewöhnlich', 'Selten', 'Episch', 'Legendär', 'Mythisch'],
    farben: ['#3ddc84', '#3d9bff', '#b066ff', '#ffc83d', '#ff4d5e'],
    chancen: [0.55, 0.25, 0.12, 0.06, 0.02], // Würfel für skalierende Effekte
  },
  effekte: {
    mind1: 0.003, // [Nutzer, 21.11.2026] etwas häufiger: 0,3 % statt 0,1 % mindestens ein Effekt
    // [ANNAHME 9.3] daraus: genau 1 = 0,05 %, genau 2 = 0,04 %, genau 3 = 0,01 %. Als bedingte Anteile:
    anteilGenau: { 1: 0.5, 2: 0.4, 3: 0.1 },
    maxProKarte: 3, // [FEST]
  },

  // Mittelweicher Pity [FEST], an die höhere Effektchance angepasst (vorher 100 / 25 / 200 bei 0,1 %).
  pity: {
    schwelle: 35, // ungefährer Erwartungswert bei 0,3 % je Karte
    verdopplung: 9,
    garantie: 70,
    // [ANNAHME] "sicher" heißt: mindestens eine Karte im Pack bekommt Effekte. 'alle_karten' wäre die wörtliche Formel p = 1 pro Karte.
    garantieModus: 'eine_karte',
  },

  // [FEST 7.3] Punktemodell der Kartenseltenheit
  seltenheit: {
    basis: { keins: 1, reverse: 3, holo: 4, secret: 5, ghost: 6 }, // Ghost 6, Stufe wird bei 14 (Omega) gedeckelt
    effekt: [0, 3, 4, 5],
    looksMitEffekt1bis4: 3,
    looksMitEffekt5: 4,
    namen: ['normal', 'uncommon', 'rare', 'super rare', 'mega rare', 'hyper rare', 'elite rare',
      'Titan Rare', 'Galactic Rare', 'Top Rare', 'Master Rare', 'Alpha Rare', 'Beta Rare', 'Omega Rare'],
    kurz: ['N', 'U', 'R', 'SR', 'MR', 'HR', 'ER', 'TR', 'GR', 'TopR', 'MaR', 'AR', 'BR', 'ΩR'],
  },

  staub: {
    auftragKosten: 10, // [FEST]
    abtragMenge: 'klassennummer', // [ANNAHME 11.2] Bronze 1 bis Diamond 8
  },

  kampf: {
    beschwoerungProZug: 10, // [FEST] "sagen wir 10"
    sparenOhneGrenze: true, // [FEST]
    spielerLeben: 5, // [FEST]
    teamGrundplaetze: 10, // [VORSCHLAG]
    teamSlots: 5, // gespeicherte Teams [Spielerfeedback 24.11.2026]
    // Kostenkurve für automatische Teams (aus der Balance-Simulation): je Kostenstufe so viele Karten zuerst
    teamKurve: [{ bis: 10, anzahl: 2 }, { bis: 20, anzahl: 2 }, { bis: 35, anzahl: 3 }, { bis: 50, anzahl: 3 }],
    // [OFFEN] Teamplatz: wie der Multiplikator entsteht. Platzhalter: 1 + 0,2 je Punkt, belegt max(1, Teamplatz) Plätze.
    teamplatzMultProPunkt: 0.2,
    teamplatzMinPlaetze: 1,
    // [OFFEN] Rundung der Beschwörungskosten. Platzhalter: kaufmännisch, mindestens 1.
    kostenRundung: 'round',

    rundenLimit: 80, // [OFFEN] Platzhalter gegen Endlos-Patts
    // [ANNAHME 5.4] Teamplatz-Multiplikator wirkt auf den Schaden ([OFFEN], Platzhalter).
    effektStart: 'naechsterZug', // [FEST] außer Blitz
  },

  // [OFFEN 11.3/14.2] Münzen und Packbeschaffung. Alles hier ist Platzhalter.
  // Version 2 (21.11.2026): Münzwerte ×10, damit Kartenverkauf ganze Münzen ergibt. Alte Spielstände werden umgerechnet.
  wirtschaft: {
    version: 2,
    startPacks: 10,
    startMuenzen: 3000,
    packPreis: 50, // Basispreis eines Packs in Münzen
    manuellKostetMuenzen: false, // manuelles Öffnen verbraucht ein Pack aus dem Vorrat
    packKaufbar: true, // Packs für den Vorrat lassen sich zum Basispreis kaufen
    // Verkauf: Wert je Stärkeklasse × Faktor je Seltenheitsstufe. Im Schnitt ~30 Münzen je Pack, also unter dem Packpreis.
    verkaufKlasse: [1, 1, 2, 5, 12, 30, 80, 200],
    verkaufStufe: [0, 1, 3, 6, 10, 20, 40, 80, 120, 200, 400, 800, 1600, 3200, 6400],
  },

  // [VORSCHLAG 11.3] Tempostufen des Auto-Öffnens. [FEST] jedes Pack kostet Münzen, schneller ist teurer.
  // gebuehr: Münzen je automatisch geöffnetem Pack. Ist der Vorrat leer, wird das Pack zusätzlich zum Packpreis gekauft.
  autoOeffnen: {
    stufen: [
      { name: 'Gemütlich', packsProSekunde: 1 / 3, gebuehr: 1 },
      { name: 'Zügig', packsProSekunde: 1, gebuehr: 3 },
      { name: 'Schnell', packsProSekunde: 5, gebuehr: 6 },
      { name: 'Rasend', packsProSekunde: 20, gebuehr: 10 },
    ],
  },

  // [VORSCHLAG 12.7] Kampagne. Version 4 [Nutzer, 21.11.2026]: Für jedes Element eine Dimension (32),
  // je Dimension 8 Welten, je Welt 10 Stufen (Stufe 5 Zwischenboss, Stufe 10 Weltenboss) = 2560 Kämpfe.
  // Alle Dimensionen sind offen, die Welten einer Dimension der Reihe nach. Karte auf dem Elementrad.
  kampagne: {
    version: 5, // v5: 12 Stufen je Welt, Fortschritt wird übernommen
    weltenProDimension: 8,
    stufenProWelt: 12, // [Nutzer, 24.11.2026] Stufen 9–12 dazu (vorher 10), Weltenboss jetzt auf Stufe 12
    zwischenbossStufe: 6,
    // Werte aus der Balance-Simulation (23.11.2026, 1,09 Mio. Spiele, 10 Teamtypen):
    // die besten Aufstellungen gewinnen im Schnitt ~54 %, der Median ~2 %. Nur gute Teams kommen durch.
    staerkeBasis: 193, // Teamstärke des ersten Gegners einer Dimension
    wachstumProStufe: 1.0, // Steigerung kommt über Einkommen, Startbank, Bosse und Fortschritt
    bossFaktor: 1.52,
    zwischenbossFaktor: 1.22,
    // Einstieg: die ersten drei Kämpfe einer Welt 1 sind leichter (Simulation: Kampf 1 war mit Startkarten kaum zu schaffen)
    einstieg: [0.6, 0.75, 0.9],
    // Je mehr Welten insgesamt abgeschlossen sind, desto stärker werden alle Gegner (bis ×1,77)
    fortschrittFaktor: (weltenFertig) => Math.min(1.77, 1 + 0.001 * weltenFertig),
    // Beschwörung ist der Engpass (10 je Zug): spätere Gegner beschwören mehr und starten mit Vorsprung
    // Aus der Balance-Simulation: Tempo entscheidet die Kämpfe. Früh kein Vorsprung, später langsam mehr.
    gegnerEinkommen: (w, l, fertig) => 10 + Math.floor((w - 1) / 2) + Math.min(6, Math.floor(fertig / 8)),
    gegnerStartBank: (w, l) => 3 * (w - 1) + Math.floor((l - 1) / 3),
    lebenNormal: 5,
    lebenZwischenboss: (w) => 6 + Math.floor(w / 3),
    lebenWeltBoss: (w) => 8 + w,
    effektChance: (w, l) => Math.min(0.6, 0.05 + 0.04 * w + 0.01 * l), // Chance je Gegnerkarte auf einen Effekt
    bossEffekte: (weltBoss) => (weltBoss ? 3 : 2), // Weltenbosse haben eine Karte mit 3 Effekten
    // Belohnungen. Wiederholte Siege geben einen Teil davon.
    wiederholungsAnteil: 0.3,
    belohnung: {
      stufePacks: (w, l) => 1 + Math.ceil(w / 2) + Math.floor(l / 4),
      stufeMuenzen: (w, l) => 250 * w + 60 * l,
      zwischenbossPacks: (w) => 4 + w,
      zwischenbossMuenzen: (w) => 1200 * w,
      weltBossPacks: (w) => 8 + 2 * w,
      weltBossMuenzen: (w) => 3000 * w,
    },
    // [Nutzer] Sonderpacks für jede abgeschlossene Welt: Glückspack(s) und ein Elementpack der Dimension
    weltBelohnung: (w) => ({ gluecks: w >= 6 ? 2 : 1, element: 1 + Math.floor(w / 3), muenzen: 5000 * w }),
  },

  // [Nutzer, 21.11.2026] 33. Dimension: der Kern des Rads. 16 Welten à 10 Stufen, offen ab 2 fertigen Welten in jeder Dimension.
  kern: {
    welten: 16,
    freiAbWeltenJeDimension: 2,
    staerkeStart: 700, wachstumProStufe: 1.008, staerkeMax: 2200,
    gegnerEinkommen: (w, l) => 22 + w + Math.floor(l / 3),
    gegnerStartBank: (w, l) => 40 + 6 * w + 2 * l,
    effektChance: (w) => Math.min(0.75, 0.4 + 0.02 * w),
    weltBelohnung: (w) => ({ gluecks: 2 + Math.floor(w / 4), element: 2, muenzen: 20000 + 2000 * w }),
  },

  // [Nutzer, 24.11.2026] Tiefer Kern: 16 weitere Welten nach dem Kern, Gegnereffekte mit Seltenheit 2–5
  tiefKern: {
    welten: 16,
    staerkeStart: 1600, wachstumProStufe: 1.006, staerkeMax: 3600,
    gegnerEinkommen: (w, l) => 30 + w + Math.floor(l / 3),
    gegnerStartBank: (w, l) => 60 + 8 * w + 2 * l,
    effektChance: (w) => Math.min(0.9, 0.55 + 0.02 * w),
    effektStufe: (w) => Math.min(5, 2 + Math.floor((w - 1) / 4)), // Welt 1–4: 2, 5–8: 3, 9–12: 4, 13–16: 5
    weltBelohnung: (w) => ({ gluecks: 4 + Math.floor(w / 3), element: 3, muenzen: 60000 + 6000 * w }),
  },

  // [Nutzer, 21.11.2026] Erfolgspack: eins je Erfolg zum Abholen, 10 Karten, seltene Chancen ×5
  erfolgsPack: { karten: 10, faktor: 5 },
  // Elementpack: 10 Karten nur aus dem Element einer Dimension, seltene Chancen ×3
  elementPack: { karten: 10, faktor: 3 },

  monster: {
    artenProElement: 20, // [FEST seit 21.11.2026] 20 Monster je Element = 640. Namen und Kunst bleiben [OFFEN] Platzhalter.
    // [Nutzer, 21.11.2026] Silber-Monster: erscheinen nur als Silber und sind seltener als normale Arten.
    silberArtenProElement: 2,
    silberGewicht: 0.3, // Ziehgewicht je Silber-Art (normale Arten: 1). Insgesamt ~3 % aller Karten.
    silberKlasse: 1,
  },

  // [OFFEN 3] Ob die Zahl neben dem Symbol steht. Platzhalter: ja.
  zahlNebenSymbol: true,
};

export const KLASSEN = CONFIG.klassen;
export const HOLO_STUFEN = ['keins', 'reverse', 'holo', 'secret', 'ghost'];
export const HOLO_NAMEN = { keins: 'ohne Holo', reverse: 'Reverse Holo', holo: 'Holo', secret: 'Secret Holo', ghost: 'Ghost Rare' };
export const LOOKS = [
  { key: 'spiegelH', name: 'Horizontal gespiegelt', kurz: 'Spiegel ↔', staub: 'Spiegel-↔-Staub' },
  { key: 'spiegelV', name: 'Vertikal gespiegelt', kurz: 'Spiegel ↕', staub: 'Spiegel-↕-Staub' },
  { key: 'invertiert', name: 'Invertiert', kurz: 'Invertiert', staub: 'Invert-Staub' },
  { key: 'glitch', name: 'Glitch', kurz: 'Glitch', staub: 'Glitch-Staub' },
  { key: 'fehldruck', name: 'Fehldruck', kurz: 'Fehldruck', staub: 'Fehldruck-Staub' },
];
