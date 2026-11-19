// Cardle – zentrale Konfiguration aller Balancing-Werte.
//
// Statuskürzel wie im MANIFEST.md:
//   [FEST]      vom Nutzer festgelegt, so gebaut
//   [ANNAHME]   Lesart einer Nutzeraussage, gebaut, aber hier änderbar
//   [VORSCHLAG] Entwurf, als Standardwert gesetzt
//   [OFFEN]     ungeklärt, nur Platzhalter, damit das Spiel läuft
//
// Alles, was Balancing ist, steht hier. Der übrige Code liest nur diese Werte.

export const CONFIG = {
  spielname: 'Cardle', // [OFFEN] Platzhalter, Arbeitsname (Manifest 1.2)
  version: '0.1.0',

  packGroesse: 10, // [FEST]

  rad: {
    anzahl: 32, // [FEST]
    gegenpolAbstand: 16, // [FEST]
    primFaktoren: { 2: 1.1, 3: 1.2, 5: 1.4, 7: 1.6, 11: 1.8, 13: 2.0 }, // [FEST] Faktor der starken Seite, schwach = Kehrwert
    gegenpolFaktor: 2.5, // [ANNAHME] Nutzer sagte "2,4, äh, 5"
    // [ANNAHME 4.5] +1: Ein Angreifer, der d Schritte im Uhrzeigersinn hinter dem Verteidiger liegt, ist stark.
    // -1 kehrt die Richtung um (Manifest: "nur das Vorzeichen von d umkehren").
    richtung: 1,
  },

  // [FEST] Bereiche Bronze bis Ruby und "Saphire ab 50". [VORSCHLAG] Saphire-Deckel 80, Diamond 70–100, alle Chancen.
  klassen: [
    { key: 'bronze', name: 'Bronze', min: 1, max: 7, chance: 0.40 },
    { key: 'silber', name: 'Silber', min: 7, max: 15, chance: 0.28 },
    { key: 'gold', name: 'Gold', min: 13, max: 25, chance: 0.17 },
    { key: 'platin', name: 'Platin', min: 23, max: 35, chance: 0.09 },
    { key: 'emerald', name: 'Emerald', min: 30, max: 45, chance: 0.04 },
    { key: 'ruby', name: 'Ruby', min: 40, max: 60, chance: 0.015 },
    { key: 'saphire', name: 'Saphire', min: 50, max: 80, chance: 0.004 },
    { key: 'diamond', name: 'Diamond', min: 70, max: 100, chance: 0.001 },
  ],

  // [VORSCHLAG 5.5] Obergrenzen. Hinweis: Summe 88 (78 ohne Kapazität) liegt unter dem Diamond-Deckel 100.
  // Punkte über der Summe der Obergrenzen lassen sich nicht verteilen, die Stärke wird dann gedeckelt (siehe generator.js).
  obergrenzen: {
    kraft: 30, schutz: 15, groesse: 5, wildheit: 5,
    seltsamkeit: 8, schlagzahl: 5, teamplatz: 10, kapazitaet: 10,
  },

  // [VORSCHLAG 5.1] Rollen mit Gewichten für die Punkteverteilung. Pro Monsterart fest.
  // min: Mindestpunkte, wenn die Stärke es zulässt (sorgt dafür, dass Angreifer überhaupt angreifen).
  rollen: {
    angreifer: { name: 'Angreifer', g: { kraft: 6, schutz: 2, groesse: 1, wildheit: 1.5, seltsamkeit: 1, schlagzahl: 2, teamplatz: 1 }, min: { kraft: 1, schlagzahl: 1 } },
    tank: { name: 'Tank', g: { kraft: 2, schutz: 6, groesse: 3, wildheit: 0.5, seltsamkeit: 0.5, schlagzahl: 1, teamplatz: 0.5 }, min: { schutz: 1, schlagzahl: 1 } },
    wildling: { name: 'Wildling', g: { kraft: 4, schutz: 1, groesse: 0.5, wildheit: 4, seltsamkeit: 1, schlagzahl: 2, teamplatz: 0.5 }, min: { kraft: 1, schlagzahl: 1 } },
    riese: { name: 'Riese', g: { kraft: 4, schutz: 3, groesse: 4, wildheit: 1, seltsamkeit: 0.3, schlagzahl: 1, teamplatz: 2 }, min: { kraft: 1, schlagzahl: 1 } },
    sonderling: { name: 'Sonderling', g: { kraft: 3, schutz: 2, groesse: 1, wildheit: 1, seltsamkeit: 5, schlagzahl: 1, teamplatz: 0.5 }, min: { kraft: 1, schlagzahl: 1 } },
    wirbler: { name: 'Wirbler', g: { kraft: 4, schutz: 1, groesse: 0.5, wildheit: 2, seltsamkeit: 1, schlagzahl: 4, teamplatz: 0.5 }, min: { kraft: 1, schlagzahl: 1 } },
    koloss: { name: 'Koloss', g: { kraft: 5, schutz: 2, groesse: 2, wildheit: 1, seltsamkeit: 0.5, schlagzahl: 1, teamplatz: 4 }, min: { kraft: 1, schlagzahl: 1 } },
    // [FEST] Teamkapazität ist optional, nur diese Rolle trägt sie ([OFFEN] welche Karten sie haben, Platzhalter).
    kommandant: { name: 'Kommandant', g: { kraft: 2, schutz: 2, groesse: 1, wildheit: 1, seltsamkeit: 1, schlagzahl: 1, teamplatz: 0.5, kapazitaet: 5 }, min: { kapazitaet: 1 } },
  },

  holo: { reverse: 0.01, holo: 0.005, secret: 0.001 }, // [FEST] Chance pro Karte, schließen sich aus
  lookChance: 0.005, // [FEST] je Zusatzlook, unabhängig

  effekte: {
    mind1: 0.001, // [FEST] mindestens ein Effekt
    // [ANNAHME 9.3] daraus: genau 1 = 0,05 %, genau 2 = 0,04 %, genau 3 = 0,01 %. Als bedingte Anteile:
    anteilGenau: { 1: 0.5, 2: 0.4, 3: 0.1 },
    maxProKarte: 3, // [FEST]
  },

  pity: {
    schwelle: 100, // [FEST] Erwartungswert 100 Packs
    verdopplung: 25, // [FEST] alle 25 Packs verdoppelt
    garantie: 200, // [FEST] im 200. Pack sicher
    // [ANNAHME] "sicher" heißt: mindestens eine Karte im Pack bekommt Effekte. 'alle_karten' wäre die wörtliche Formel p = 1 pro Karte.
    garantieModus: 'eine_karte',
  },

  // [FEST 7.3] Punktemodell der Kartenseltenheit
  seltenheit: {
    basis: { keins: 1, reverse: 3, holo: 4, secret: 5 },
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
    // [OFFEN] Teamplatz: wie der Multiplikator entsteht. Platzhalter: 1 + 0,2 je Punkt, belegt max(1, Teamplatz) Plätze.
    teamplatzMultProPunkt: 0.2,
    teamplatzMinPlaetze: 1,
    // [OFFEN] Rundung der Beschwörungskosten. Platzhalter: kaufmännisch, mindestens 1.
    kostenRundung: 'round',
    rundenLimit: 60, // [OFFEN] Platzhalter gegen Endlos-Patts
    // [ANNAHME 5.4] Teamplatz-Multiplikator wirkt auf den Schaden ([OFFEN], Platzhalter).
    effektStart: 'naechsterZug', // [FEST] außer Blitz
  },

  // [OFFEN 11.3/14.2] Münzen und Packbeschaffung. Alles hier ist Platzhalter.
  wirtschaft: {
    startPacks: 10,
    startMuenzen: 300,
    packPreis: 5, // Basispreis eines Packs in Münzen (Tempo 1)
    manuellKostetMuenzen: false, // manuelles Öffnen verbraucht ein Pack aus dem Vorrat
    packKaufbar: true, // Packs für den Vorrat lassen sich zum Basispreis kaufen
  },

  // [VORSCHLAG 11.3] Tempostufen des Auto-Öffnens
  autoOeffnen: {
    stufen: [
      { name: 'Gemütlich', packsProSekunde: 1 / 3, preisFaktor: 1 },
      { name: 'Zügig', packsProSekunde: 1, preisFaktor: 2 },
      { name: 'Schnell', packsProSekunde: 5, preisFaktor: 4 },
      { name: 'Rasend', packsProSekunde: 20, preisFaktor: 8 },
    ],
  },

  // [VORSCHLAG 12.7] Kampagne
  kampagne: {
    welten: 8,
    elementeProWelt: 4,
    kaempfeProWelt: 3,
    staerkeBasis: 15,
    staerkeFaktor: 1.5,
    kampfAnteile: [0.6, 0.8, 1.0], // steigende Stärke innerhalb der Welt
    bossAnteil: 1.25,
    bossLebenBasis: 3, // Boss hat 3 + Weltnummer Leben
    bossEffekte: 2, // garantierte Effekte auf Bosskarten
    // [VORSCHLAG] Belohnung als Booster-Packs, [OFFEN] Münzen als Platzhalter
    belohnung: {
      kampfPacks: (w) => 2 + w,
      kampfMuenzen: (w) => 40 * w,
      bossPacks: (w) => 5 + 2 * w,
      bossMuenzen: (w) => 150 * w,
    },
    finaleStaerke: 320,
    finaleLeben: 12,
  },

  monster: {
    artenProElement: 3, // [OFFEN] Anzahl der Monster, Platzhalter: 3 je Element = 96
  },

  // [OFFEN 3] Ob die Zahl neben dem Symbol steht. Platzhalter: ja.
  zahlNebenSymbol: true,
};

export const KLASSEN = CONFIG.klassen;
export const HOLO_STUFEN = ['keins', 'reverse', 'holo', 'secret'];
export const HOLO_NAMEN = { keins: 'ohne Holo', reverse: 'Reverse Holo', holo: 'Holo', secret: 'Secret Holo' };
export const LOOKS = [
  { key: 'spiegelH', name: 'Horizontal gespiegelt', kurz: 'Spiegel ↔', staub: 'Spiegel-↔-Staub' },
  { key: 'spiegelV', name: 'Vertikal gespiegelt', kurz: 'Spiegel ↕', staub: 'Spiegel-↕-Staub' },
  { key: 'invertiert', name: 'Invertiert', kurz: 'Invertiert', staub: 'Invert-Staub' },
  { key: 'glitch', name: 'Glitch', kurz: 'Glitch', staub: 'Glitch-Staub' },
  { key: 'fehldruck', name: 'Fehldruck', kurz: 'Fehldruck', staub: 'Fehldruck-Staub' },
];
