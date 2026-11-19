# MANIFEST: Monster-Sammelkartenspiel (Ordner Cardle)

Stand: 19. November 2026, Gesprächsstand nach Auto-Öffnen und Korrektur der Seltenheitsliste.

Quelle: Entwurfsgespräch mit dem Nutzer und das begleitende Dokument "Monster-Sammelspiel: Elementrad und Regeln" (https://claude.ai/artifact/5Mdmr5NUdHs9UKMGhvW6PS). Dieses Manifest fasst beides zusammen. Wo das Dokument und dieses Manifest abweichen, gilt das Manifest, weil es spätere Klarstellungen und die Konsistenzprüfung enthält.

Zweck: Verbindliche Referenz für die Umsetzung. Jede Aussage trägt ein Statuskürzel, damit nie ein Vorschlag mit einer Entscheidung verwechselt wird.

## Statuskennzeichnung

| Kürzel | Bedeutung |
| --- | --- |
| [FEST] | Der Nutzer hat es ausdrücklich festgelegt oder bestätigt. |
| [ANNAHME] | Meine Lesart einer Aussage des Nutzers. Er hat sie nicht ausdrücklich bestätigt oder die Aussage war mehrdeutig. |
| [VORSCHLAG] | Entwurf von mir zum Zerpflücken. Nicht entschieden. Alle Zahlen darin sind grobe Schätzungen. |
| [OFFEN] | Ungeklärt. Hier fehlt eine Entscheidung des Nutzers. |

Regel für die Umsetzung: [FEST] wird so gebaut. [ANNAHME] wird so gebaut, aber im Code als änderbar markiert. [VORSCHLAG] wird als Standardwert in der Konfiguration gebaut. [OFFEN] wird nicht geraten, sondern als Platzhalter angelegt.

---

## 0. Kurzfassung

- [FEST] Webbasiertes Sammelspiel mit Monsterkarten für die Plattform playle.io, ohne Download.
- [FEST] Booster-Packs mit je 10 Karten. Stark dopamin-geprägt: Die meisten Karten sind normal, dazu gibt es sehr seltene Sonderfälle.
- [FEST] Jede Karte hat ein Grundelement auf einem Rad mit 32 selbst erfundenen Elementen. Nachbarn sind neutral, ausgewählte Primzahl-Abstände geben Vor- oder Nachteile, der Gegenpol (16 Felder entfernt) gibt in beide Richtungen Faktor 2,5.
- [FEST] Jede Karte hat bis zu 8 Attribute, jedes eine natürliche Zahl ab 0, auf der Karte nur als Symbole gezeigt. Die Summe aller Punkte ist die Stärke und zugleich die Lebenspunktzahl.
- [FEST] 8 Stärkeklassen: Bronze, Silber, Gold, Platin, Emerald, Ruby, Saphire, Diamond.
- [FEST] 14 Kartenseltenheiten von normal bis Omega Rare, bestimmt durch Holo-Stufe, Zusatzlooks und Spezialeffekte.
- [FEST] Holo-Stufen: Reverse Holo, Holo, Secret Holo. Dazu fünf Zusatzlooks. Zusatzlooks sind per Staub übertragbar, Holo-Stufen und Effekte nicht.
- [FEST] Bis zu drei Spezialeffekte pro Karte, reiner Zufall, extrem selten. Jeder Effekt kann auf jeder Karte vorkommen.
- [FEST] Pity-Mechanismus für Effektkarten, mittelweich.
- [FEST] Alle Zufallswerte stehen beim Öffnen des Packs fest, die Animation zählt sie beim Aufdecken sichtbar aus.
- [FEST] Auto-Öffnen gegen Münzen, je schneller, desto teurer.
- [FEST] Automatische Kämpfe gegen Gegner mit Endbossen, ein progressives Kampfsystem. Karten stehen sich gegenüber, Beschwörung kostet Punkte, die man ansparen kann.
- [FEST] Jeder Spieler hat 5 Lebenspunkte.
- [FEST] Design hat höchste Priorität: extrem ansehnliche Monster, epische Pack-Animation, Karteneffekte, die auf Maus oder Hand reagieren, Soundeffekte mit angenehmen Kartenzieh-Geräuschen.
- [OFFEN] Spielname, Münzquelle und Packbeschaffung, Zugablauf, Anzahl der Monster, Obergrenzen der Attribute, Symbole, Richtung der Effektivität auf dem Rad.

---

## 1. Projekt und Rahmen

### 1.1 Plattform

- [FEST] Das Spiel ist eines von vielen webbasierten Spielen auf www.playle.io, ohne Download. Das Projekt dort heißt "www.playle.io Spielideen" mit dem Ziel, möglichst viele Spielideen zu sammeln und zu veröffentlichen.
- [FEST] Der Nutzer entwickelt mehrere Playle-Spiele mit Namen im Muster "...le" (etwa Dragonle, Bookle, Trainle, Trafficle, Keyle). Diese Spiele sind nicht Teil dieses Spiels.
- [FEST] Das Spiel liegt im Ordner C:\Users\Firemozzi\Documents\GitHub\Cardle (frisches Git-Repository, bisher nur .gitattributes).

### 1.2 Titel

- [OFFEN] Der Spielname steht nicht fest. Der Ordner heißt Cardle, das ist ein Arbeitsname.
- [VORSCHLAG] Namensideen im Muster der anderen Spiele: Monstle, Packle, Kartle, Monsterle. Verfügbarkeit und Domain sind nicht geprüft.

### 1.3 Sprache

- [ANNAHME] Die Oberfläche ist deutsch, weil der Nutzer deutsch arbeitet und alle Begriffe deutsch festgelegt wurden. Der Nutzer hat das nicht ausdrücklich gesagt.

### 1.4 Technik

- [FEST] Webbasiert, ohne Download.
- [OFFEN] Technologie nicht festgelegt.
- [VORSCHLAG] Reines HTML, CSS und JavaScript ohne Build-Schritt, wie im Schwesterprojekt Dragonle. WebGL optional für Secret Holo. Spielstand in localStorage. Reproduzierbarer Zufall mit Seed über URL-Parameter, zum Testen. Alle Balancing-Zahlen in einer Konfigurationsdatei.

### 1.5 Verworfene Vorlagen

- [FEST] Keine Kopie von Dungeons and Dragons: Die sechs D&D-Attribute (Stärke, Geschicklichkeit, Konstitution, Intelligenz, Weisheit, Charisma) werden nicht übernommen, alle Attribute sind neu erfunden.
- [FEST] Kein Tempo-Attribut als Reihenfolge im Kampf, weil es zu nah an Pokémon ist.
- [FEST] Das Elementsystem ist ähnlich zu Pokémon gedacht, aber nicht dasselbe: ein Rad statt einer Tabelle.
- [FEST] Die zwölf Elemente aus dem Schwesterprojekt Dragonle werden nicht übernommen. Stattdessen werden 32 neue Elemente definiert (zuerst waren es 20, dann 32).

---

## 2. Spielschleife (Überblick)

1. [FEST] Packs öffnen (10 Karten pro Pack, Zufall beim Öffnen fixiert, Aufdeck-Animation), von Hand oder per Auto-Öffnen gegen Münzen.
2. [FEST] Sammlung: Karten sind in Stapeln nach Karte organisiert, jeder Stapel enthält die verschiedenen Ausführungen (Kombination aus Holo-Stufe und Zusatzlooks).
3. [FEST] Looks von Karten abtragen und auftragen mit Staub.
4. [FEST] Team bauen und aufstellen.
5. [FEST] Automatische Kämpfe gegen Gegner, progressiv mit Endbossen.
6. [OFFEN] Wie man an Packs und Münzen kommt, ist nicht festgelegt. [VORSCHLAG] Siege geben Booster-Packs.

---

## 3. Aufbau einer Karte (Datenmodell)

Jede Karte hat:

| Feld | Inhalt | Status |
| --- | --- | --- |
| Monster | Name und Bild. Die Anzahl verschiedener Monster ist offen. | [OFFEN] |
| Grundelement | eines der 32 Elemente | [FEST] |
| Stärkeklasse | Bronze bis Diamond, bestimmt den Bereich der Punktesumme | [FEST] |
| Attribute | 7 feste Attribute plus 1 optionales, jeweils natürliche Zahl ab 0 | [FEST] |
| Stärke | Summe aller Attributpunkte, zugleich Lebenspunkte | [FEST] |
| Beschwörungskosten | Stärke mal die Preisfaktoren der Effekte | [ANNAHME] |
| Holo-Stufe | keine, Reverse Holo, Holo oder Secret Holo, höchstens eine | [FEST] |
| Zusatzlooks | fünf unabhängige Schalter | [FEST] |
| Spezialeffekte | 0 bis 3, fest auf der Karte | [FEST] |
| Kartenseltenheit | 1 bis 14, abgeleitet aus Holo, Looks und Effekten | [FEST] |

- [FEST] Auf der Karte werden die Attribute nur als Symbole dargestellt, nicht mit ausgeschriebenen Namen. Beispiel des Nutzers: ein Faustsymbol statt des Wortes Stärke.
- [OFFEN] Ob die Zahl klein neben dem Symbol steht oder nur die Anzahl gefüllter Symbole zählt.
- [OFFEN] Welche Symbole die Attribute bekommen.
- [VORSCHLAG] Symbolideen aus dem Gespräch: Faust oder Klaue für Kraft, Flügel oder Blitz, Herz oder Schild, Buch, Eule oder Auge, Stern oder Krone. Das waren Ideen für die verworfenen D&D-ähnlichen Werte und müssen für die neuen Attribute neu gewählt werden.
---

## 4. Elemente und Elementrad

### 4.1 Grundprinzip

- [FEST] Es gibt 32 Elemente, angeordnet auf einem Kreis. Der Abstand auf dem Kreis ersetzt eine Effektivitätstabelle. Zuerst wurden die Elemente gesammelt, dann sortiert.
- [FEST] Direkte Nachbarn sind befreundet und neutral zueinander. Je weiter zwei Elemente voneinander entfernt sind, desto größer ist ihr feindliches Potenzial. Der größte Feind liegt genau 16 Felder entfernt (Gegenpol).
- [FEST] Jedes Element hat genau einen Gegenpol. Die 16 Gegenpolpaare wurden zuerst festgelegt, damit die Anordnung nicht reiner Zufall ist, und der Rest ergibt sich aus den Nachbarschaften.
- [FEST] Es zählt nur der direkte Abstand zwischen zwei Elementen, nie eine Kette über Zwischenelemente.
- [FEST] Jedes Monster hat ein Grundelement.

### 4.2 Die 32 Elemente in Kreisreihenfolge (Uhrzeigersinn, Position 0 bis 31)

[FEST] Reihenfolge und Gegenpole. Die Bedeutungen in der letzten Spalte sind meine Arbeitsdeutung, außer wo der Nutzer sie ausdrücklich definiert hat (Cyber, Mechanik, Humanoid, Gas, Singularität als Gegenpol von Gravitation).

| Pos. | Element | Gegenpol (Pos.) | Bedeutung (Arbeitsdeutung) |
| --- | --- | --- | --- |
| 0 | Feuer | Eis (16) | Hitze, Flamme |
| 1 | Lava | Druck (17) | glühendes, fließendes Gestein |
| 2 | Kohle | Cyber (18) | Rohstoff, Ruß, Glut, organisch entstanden und brennbar |
| 3 | Stein | Raum (19) | festes Gestein |
| 4 | Kristall | Gas (20) | Struktur, kristalline Stoffe |
| 5 | Salz | Radioaktivität (21) | Mineral, Verbindung |
| 6 | Wasser | Metall (22) | flüssig |
| 7 | Pflanze | Mechanik (23) | Wachstum, Pflanzen |
| 8 | Bestie | Plastik (24) | Tiere |
| 9 | Humanoid | Mythisch (25) | Menschenähnliche, Kobolde, Golems (vom Nutzer aus Wesen umbenannt) |
| 10 | Kunst | Säure (26) | Kreativität, Farbe, Inspiration |
| 11 | Philosophie | Neutronen (27) | Denken, Sinn |
| 12 | Mathematik | Quantum (28) | Ordnung, Logik |
| 13 | Gravitation | Singularität (29) | Schwerkraft |
| 14 | Elektrizität | Zeit (30) | Naturkraft (Blitz wurde in Elektrizität aufgelöst) |
| 15 | Licht | Dunkelheit (31) | Licht |
| 16 | Eis | Feuer (0) | Kälte |
| 17 | Druck | Lava (1) | Pressen, Zerquetschen, Tiefsee, Vulkane |
| 18 | Cyber | Kohle (2) | die virtuelle, digitale Welt (Nutzerdefinition) |
| 19 | Raum | Stein (3) | Leere, Weite |
| 20 | Gas | Kristall (4) | Luft, Wind, Dampf, Nebel, Gaswolken (ersetzt Wind) |
| 21 | Radioaktivität | Salz (5) | Strahlung, Zerfall, Gefahr |
| 22 | Metall | Wasser (6) | hart, Metall |
| 23 | Mechanik | Pflanze (7) | Maschinen und Mechanik (vom Nutzer aus Technik umbenannt) |
| 24 | Plastik | Bestie (8) | künstliches Material |
| 25 | Mythisch | Humanoid (9) | Fantasy: Drachen, Götter, Legenden |
| 26 | Säure | Kunst (10) | ätzende Chemie |
| 27 | Neutronen | Philosophie (11) | Atom- und Teilchenphysik |
| 28 | Quantum | Mathematik (12) | Wahrscheinlichkeit, Zufall |
| 29 | Singularität | Gravitation (13) | Schwarzes Loch, Punkt unendlicher Dichte, wo alle Regeln brechen |
| 30 | Zeit | Elektrizität (14) | Zeit |
| 31 | Dunkelheit | Licht (15) | Dunkelheit (vom Nutzer aus Schatten umbenannt) |

Danach folgt wieder Position 0 (Feuer).

### 4.3 Gegenpolpaare

[FEST] Die 16 Paare (der Nutzer: "die Paare passen"). Die Leitideen sind [VORSCHLAG] und erklären nur, warum ich sie so gewählt habe.

| Paar | Leitidee |
| --- | --- |
| Feuer und Eis | Hitze gegen Kälte |
| Licht und Dunkelheit | klassischer Gegensatz |
| Mathematik und Quantum | Ordnung gegen Chaos |
| Pflanze und Mechanik | Natur gegen Technik |
| Bestie und Plastik | lebendig gegen künstlich |
| Stein und Raum | Stoff gegen Leere |
| Kristall und Gas | Struktur gegen Auflösung |
| Kohle und Cyber | Rohstoff gegen Digitales |
| Metall und Wasser | hart gegen flüssig |
| Lava und Druck | Hitze gegen Kälte der Tiefe |
| Salz und Radioaktivität | Verbindung gegen Zerfall |
| Elektrizität und Zeit | schnell gegen langsam |
| Gravitation und Singularität | Gewicht gegen Auflösung der Gesetze |
| Philosophie und Neutronen | Sinn gegen Sinnlosigkeit (laut Nutzer-Vorbehalt locker) |
| Kunst und Säure | Schöpfung gegen Zerstörung |
| Humanoid und Mythisch | Mensch gegen Legende |

### 4.4 Effektivitätsregeln

- [FEST] Direkter Nachbar (Abstand 1) ist neutral, Faktor 1.
- [FEST] Alle Abstände, die keine Primzahl sind, sind neutral, Faktor 1. Begründung des Nutzers: 4 wäre dasselbe wie 2. Der Abstand 1 ist als Ausnahme ebenfalls neutral.
- [FEST] Nur die Primzahl-Abstände 2, 3, 5, 7, 11 und 13 haben eine Richtung: auf der einen Seite stark, auf der anderen schwach. Der Faktor der schwachen Seite ist der Kehrwert des Faktors der starken Seite.
- [FEST] Der Gegenpol (Abstand 16) hat Faktor 2,5 in beide Richtungen. Angriffe sind doppelt so effektiv wie sonst und der erlittene Schaden entsprechend hoch, "mal 2,5 in beide Richtungen". Der Nutzer sagte "2,4, äh, 5", gemeint ist [ANNAHME] 2,5. Es ist ein symmetrisches Hochrisiko-Duell (Arbeitsname: Erzfeindschaft).
- [FEST] Die Faktoren der Primzahlen sind gleichmäßig verteilt zwischen 1 und 2, mit Schritten, die man sich merken kann, und wurden vom Nutzer so festgelegt:

| Abstand | Faktor stark | Faktor schwach (Kehrwert) |
| --- | --- | --- |
| 1 | 1,0 | 1,0 |
| 2 | 1,1 | 0,909091 |
| 3 | 1,2 | 0,833333 |
| 5 | 1,4 | 0,714286 |
| 7 | 1,6 | 0,625 |
| 11 | 1,8 | 0,555556 |
| 13 | 2,0 | 0,5 |
| 16 (Gegenpol) | 2,5 | 2,5 |
| 4, 6, 8, 9, 10, 12, 14, 15 | 1,0 | 1,0 |

- [FEST] Ein Abstand über 16 wird als Abstand in die andere Richtung gelesen (Abstand 17 im Uhrzeigersinn ist Abstand 15 dagegen). Beide Richtungen zusammen decken alle 31 Abstände ab.
- [FEST] Weil der Kehrwert gilt, gleicht sich die Kette aus: Das Produkt aller Faktoren in einem Kreis ergibt 1, kein Element ist insgesamt besser als ein anderes.
- [FEST] Der Nutzer nannte zuerst die Idee mit Schrittweite 2 (Faktor 1,1) und Dreierschritten (Faktor 1,2), dann die Primzahlen als verallgemeinerte Regel. Beide Ideen sind in der Primzahlregel enthalten.

### 4.5 Richtung der Effektivität

- [OFFEN] Welche Richtung stark und welche schwach ist, ist nicht bestätigt.
- [ANNAHME] Wortlaut des Nutzers: "von dem Element aus gesehen zwei Schritte im Uhrzeigersinn ist es stark gegen das Element und gegen den Uhrzeigersinn ist es schwach". Das heißt: Ein Angreifer, der d Schritte im Uhrzeigersinn hinter dem Verteidiger liegt, ist stark gegen ihn. Anders gesagt ist ein Element stark gegen die Elemente, die gegen den Uhrzeigersinn von ihm liegen.
- Das begleitende Dokument hat die Richtung umgekehrt formuliert (ein Element sei stark gegen die Felder im Uhrzeigersinn). Es muss nach der Bestätigung korrigiert werden. Wird die Gegenrichtung bestätigt, wird in der Funktion unten nur das Vorzeichen von d umgekehrt.

Pseudocode für den Faktor (Angreifer A gegen Verteidiger V, Positionen wachsen im Uhrzeigersinn):

```
PRIMES = {2: 1.1, 3: 1.2, 5: 1.4, 7: 1.6, 11: 1.8, 13: 2.0}
function faktor(A, V):
    d = (pos[A] - pos[V]) mod 32      // Schritte im Uhrzeigersinn von V zu A
    if d == 0:  return 1.0
    if d == 16: return 2.5
    if d in PRIMES:         return PRIMES[d]            // A steht im Uhrzeigersinn hinter V: stark
    if (32 - d) in PRIMES:  return 1 / PRIMES[32 - d]   // A steht gegen den Uhrzeigersinn: schwach
    return 1.0
```

Beispiele (nach der Annahme oben):

| Fall | Rechnung |
| --- | --- |
| Gegenpol, Angriff 8, Schutz 3 | 8 mal 2,5 gleich 20, geteilt durch (3 plus 1) gleich 5 |
| Abstand 2 stark, Angriff 8, Schutz 0 | 8 mal 1,1 gleich 8,8, geteilt durch 1 gleich 8,8 |
| Abstand 13 schwach, Angriff 8, Schutz 1 | 8 mal 0,5 gleich 4, geteilt durch 2 gleich 2 |
| Abstand 4 (neutral), Angriff 8, Schutz 0 | 8 mal 1 gleich 8 |

### 4.6 Bekannte Schwächen der Anordnung

[FEST] Der Nutzer hat entschieden, damit zu leben. Die härtesten Brüche zwischen Nachbarn:

- Plastik neben Mythisch (der härteste).
- Licht neben Eis, Elektrizität neben Licht (lose Brücken).
- Kristall, Salz, Wasser ist ein kleiner Sprung.
- Pflanze neben Metall wurde als zu hart abgelehnt und gelöst: Wasser steht jetzt neben Pflanze, Metall direkt vor Mechanik.

### 4.7 Familien und Parität

- Die Zweierschritte allein würden das Rad in zwei getrennte Kreise mit je 16 Elementen zerlegen (gerade und ungerade Positionen). Der Nutzer wollte das ausdrücklich ([FEST]: "das ist gewollt").
- Mit den ungeraden Primzahlen 3, 5, 7, 11 und 13 gibt es zusätzliche Beziehungen zwischen den beiden Hälften, die Familien sind also nicht völlig getrennt.

### 4.8 Entstehung und verworfene Kandidaten

- Der Nutzer zählte Elemente auf, sortiert wurde erst am Ende. Redundanzen wurden bei jedem neuen Element geprüft.
- Aufgelöst oder umbenannt, alle [FEST]: Blitz (aufgelöst, Elektrizität bleibt), Technik wird Mechanik, Elektronik wird Cyber (virtuelle Welt), Erde wird Natur und Natur wird in Bestie, Pflanze und Humanoid geteilt, Wesen wird Humanoid, Schatten wird Dunkelheit, Wind wird gestrichen und von Gas übernommen.
- Gestrichen, alle [FEST]: Materie (überschneidet sich mit den Materialelementen), Edelstein (zu nah an Kristall), Diamant (nach Bewertung gestrichen, ein weiteres Material), Neutral (passt nicht zum Rad).
- [VORSCHLAG] Farbrad: Die 32 Elemente bekommen 32 Farbtöne in Kreisreihenfolge. Nachbarn haben ähnliche Farben, Gegenpole sind Komplementärfarben. Das macht das Rad auf einen Blick lesbar.

---

## 5. Attribute

### 5.1 Grundregeln

- [FEST] Jedes Attribut ist eine natürliche Zahl von 0 bis zu einer Obergrenze. Die Obergrenze ist noch nicht definiert.
- [FEST] Die Summe aller Punkte aller Attribute ist die Stärke der Karte, ohne Ausnahme. Sie ist zugleich die Lebenspunktzahl des Monsters.
- [FEST] Punktebudget: Jede Stärkeklasse hat einen Bereich an Gesamtpunkten, der auf die Attribute verteilt wird. Eine Karte mit viel Teamkapazität hat deshalb weniger Punkte für andere Werte. Ein schwaches Monster mit hoher Kapazität kann trotzdem im Deck sinnvoll sein.
- [VORSCHLAG] Die Verteilung bei der Kartenerzeugung geschieht zufällig mit Gewichten nach einer Rolle der Karte, zum Beispiel Tank mit viel Schutz oder Wildling mit viel Wildheit.
- [FEST] Schutz wirkt doppelt: weniger Schaden und mehr Lebenspunkte. Das Gespräch hat das ausdrücklich als gewollt bestätigt ("das passt").

### 5.2 Die acht Attribute

| Attribut | Bedeutung | Status |
| --- | --- | --- |
| Elementarkraft | Angriffskraft im Grundelement der Karte. Die Effektivitätsfaktoren vom Rad wirken darauf. | [FEST] |
| Elementarschutz | Verteidigung. Der Schaden wird durch (Schutz plus 1) geteilt, also nie null. | [FEST] |
| Größe | Gegenspieler der Wildheit. Ein Ziel mit Größe n kann nur von Angreifern frei gewählt werden, deren Wildheit mindestens n ist. Alle anderen treffen es nur als Gegenüber. | [FEST] |
| Wildheit | Wie viele Gegner ein Angriff trifft. Wildheit 0: nur das Gegenüber. Wildheit 1: der Angreifer wählt das Ziel frei. Wildheit 2: der Angriff kann beliebig auf 2 Ziele aufgeteilt werden, 3: auf 3, und so weiter. Ein Angriff mit 7 Punkten kann zum Beispiel als 3 und 4 auf zwei Gegner gehen. | [FEST] |
| Seltsamkeit | Verschiebung des eigenen Elements auf dem Rad. Ein Maximum pro Zug, das jeden Zug neu nutzbar ist. Im nächsten Zug steht das Monster wieder auf seinem Ursprungselement. Ein Schritt in die Richtung der Schwäche kostet doppelt so viel wie ein Schritt in die andere Richtung. | [FEST] |
| Schlagzahl | Anzahl der Angriffe pro Zug. Jeder Angriff kann je nach Wildheit aufgeteilt werden. | [ANNAHME] |
| Teamplatz | Angriffsmultiplikator, belegt aber entsprechend viel Platz im Team. Vorteil und Nachteil zugleich. | [FEST] |
| Teamkapazität | Optional, nicht jede Karte hat sie. Bringt dem Team Plätze mit. Karten ohne Kapazität belegen nur Platz und ziehen vom gemeinsamen Vorrat ab. | [FEST] |

Offene Details zu den Attributen:

- [OFFEN] Teamplatz: Wie der Multiplikator aus dem Wert entsteht (direkt oder Stufe pro Punkt).
- [OFFEN] Teamplatz und Kapazität: Wie viele Plätze ein Team insgesamt hat. [VORSCHLAG] Grundvorrat 10, Kapazitätskarten erhöhen ihn. Der Nutzer hat gleichzeitig gesagt, dass die Feldbreite unbeschränkt ist, daher ist unklar, was genau der Platz begrenzt.
- [ANNAHME] Teamkapazität zählt, wenn vorhanden, zur Stärkesumme (Regel "Summe aller Punkte").
- [ANNAHME] Größe 0 und Wildheit 0: Die freie Zielwahl braucht in jedem Fall Wildheit von mindestens 1. Die Regel "Wildheit mindestens Größe" gilt zusätzlich. Wirksam ist also Wildheit von mindestens dem Maximum aus 1 und Größe.
- [ANNAHME] Aufteilen nur in ganzen Punkten, jeder Teil mindestens 1. Die Rundung von Schaden ist offen. [VORSCHLAG] Intern mit Dezimalzahlen rechnen, anzeigen mit einer Nachkommastelle, eine Karte stirbt bei 0 oder weniger. Aufrunden auf ganze Zahlen würde das Aufteilen gegen hohen Schutz zu stark machen.
- [ANNAHME] Seltsamkeit gilt für Angriff und Schutz, wird vor der Zielwahl festgelegt und ist für den Gegner sichtbar.

### 5.3 Seltsamkeit im Detail

- [FEST] Ein Punkt Seltsamkeit erlaubt einen Schritt auf dem Elementrad.
- [FEST] Der Schritt in die Richtung der Schwäche kostet 2, der Schritt in die andere Richtung kostet 1. Beispiel (Nutzer bestätigt): Seltsamkeit 4 reicht für vier Felder in die günstige Richtung oder zwei Felder in die Schwächerichtung.
- [FEST] Die Seltsamkeit ist ein Maximum pro Zug und verbraucht sich nicht. Jeden Zug ist das Monster wieder auf dem Ursprungselement.
- [OFFEN] Welche Richtung auf dem Rad welche ist. [ANNAHME] "Richtung der Schwäche" sind die Elemente, die das Monster schlagen. Nach der Annahme aus 4.5 ist das der Uhrzeigersinn.

### 5.4 Schadensformel

```
schaden = elementarkraft * faktor(angreifer, verteidiger) / (elementarschutz + 1)
```

- [FEST] Der Kehrwert des Schutzwerts mal der Angriff. Schutz plus eins, damit Schutz 0 keinen Abzug gibt. Der erste Schutzpunkt halbiert den Schaden, der zehnte bringt kaum noch etwas.
- [FEST] Ein Monster lebt, bis der erlittene Schaden seine Stärke erreicht.
- [ANNAHME] Erlittener Schaden bleibt über Züge bestehen.
- [OFFEN] Wie der Teamplatz-Multiplikator in die Formel eingeht.

### 5.5 Obergrenzen

[OFFEN] Nicht festgelegt. [VORSCHLAG] Gestaffelt, weil Größe, Wildheit und Schlagzahl pro Punkt viel stärker wirken als ein Punkt Elementarkraft:

| Attribut | Obergrenze | Begründung |
| --- | --- | --- |
| Elementarkraft | 30 | normale Angriffsstärke |
| Elementarschutz | 15 | wirkt als Teiler, ab 15 bleibt unter 7 % des Schadens |
| Größe | 5 | jeder Punkt verändert die Zielwahl stark |
| Wildheit | 5 | jeder Punkt ist ein zusätzliches Ziel |
| Schlagzahl | 5 | jeder Punkt ist ein zusätzlicher Angriff, eventuell besser 3 |
| Seltsamkeit | 8 | ein Viertel des Rads in der günstigen Richtung |
| Teamplatz | 10 | hängt am Grundvorrat |
| Teamkapazität | 10 | gleiche Größenordnung wie Teamplatz |

### 5.6 Verworfene Attributideen

- Mein erster Vorschlag (Wucht, Tempo, Panzer, Schlauheit, Zauber, Schrecken) wurde nicht gewählt.
- Größe als Trefferwahrscheinlichkeit oder Platzverbrauch wurde durch die Rolle als Gegenspieler der Wildheit ersetzt.
- Wildheit als Cleave auf Nachbarn wurde zur freien Zielwahl umdefiniert.
- Seltsamkeit als Zufallsfaktor wurde durch die Elementverschiebung ersetzt.
- Spezialeffekte für nur schwache Karten wurden zu "jede Karte kann jeden Effekt haben".

---

## 6. Stärkeklassen

- [FEST] Acht Klassen, nach der Punktesumme: Bronze, Silber, Gold, Platin, Emerald, Ruby, Saphire, Diamond.
- [FEST] Die zuerst festgelegten sieben Bereiche überlappen leicht, damit eine gute Karte der unteren Klasse eine schwache der nächsten erreichen kann:

| Klasse | Gesamtpunkte | Status |
| --- | --- | --- |
| Bronze | 1 bis 7 | [FEST] (vom Nutzer von "7" auf "1 bis 7" präzisiert) |
| Silber | 7 bis 15 | [FEST] |
| Gold | 13 bis 25 | [FEST] |
| Platin | 23 bis 35 | [FEST] |
| Emerald | 30 bis 45 | [FEST] |
| Ruby | 40 bis 60 | [FEST] |
| Saphire | ab 50, ohne Obergrenze | [FEST], [ANNAHME] zugeordnet |
| Diamond | offen | [OFFEN] |

- [ANNAHME] Die sieben festgelegten Bereiche wurden vor den acht Namen festgelegt und der Reihe nach Bronze bis Saphire zugeordnet.
- [VORSCHLAG] Saphire 50 bis 80, Diamond 70 bis 100 (Deckel 100). Chance pro Karte: Bronze 40 %, Silber 28 %, Gold 17 %, Platin 9 %, Emerald 4 %, Ruby 1,5 %, Saphire 0,4 %, Diamond 0,1 %.
- Dazu pro Pack (10 Karten, mindestens eine Karte der Klasse): 99,4 %, 96,3 %, 84,5 %, 61,1 %, 33,5 %, 14,0 %, 3,9 %, 1,0 %. Emerald oder höher steckt in 46,1 % der Packs, das ist großzügig. Diamond erscheint im Schnitt etwa alle 100 Packs, Saphire alle 25.
- [ANNAHME] Der Staub beim Abtragen von Looks entspricht der Nummer der Klasse, Bronze 1 bis Diamond 8.

---

## 7. Kartenseltenheit

### 7.1 Legende und Lesart

- [FEST] Die Kartenseltenheit ist unabhängig von der Stärkeklasse. Sie hängt nur von Holo-Stufe, Anzahl der Zusatzlooks und Anzahl der Effekte ab.
- RH = Reverse Holo, H = Holo, SH = Secret Holo, KL = Zusatzlooks (Anzahl), E1 bis E3 = Anzahl der Effekte.
- [ANNAHME] Zahlen wie RH+3 bedeuten genau 3 Zusatzlooks. Das Sternchen steht für 1 bis 4 Zusatzlooks, weil 5 Looks jeweils extra aufgeführt sind. Passen mehrere Zeilen, gilt die höhere Stufe. Das Plus hinter "RH+1 KL+" bei super rare ist unklar.

### 7.2 Die 14 Stufen

[FEST] Die Spalte "Bedingungen" ist die Liste des Nutzers. Die Spalte "Ergänzt" schließt die Lücken nach dem Punktemodell und ist [VORSCHLAG].

| Nr. | Name | Bedingungen | Ergänzt nach Punktemodell |
| --- | --- | --- | --- |
| 1 | normal | kein Holo, kein Look, kein Effekt | |
| 2 | uncommon | 1 Zusatzlook | |
| 3 | rare | RH | ohne Holo mit 2 Looks |
| 4 | super rare | RH+1 KL | H ohne Looks und Effekt; ohne Holo mit 3 Looks; ohne Holo mit E1 |
| 5 | mega rare | RH+2 KL, H+1 KL, SH | ohne Holo mit 4 Looks; ohne Holo mit E2 |
| 6 | hyper rare | SH+1, H+2, RH+3, RH+E1 | ohne Holo mit 5 Looks; ohne Holo mit E3 |
| 7 | elite rare | SH+2, H+3, RH+4, H+E1, RH+E2 | ohne Holo mit 1 bis 4 Looks und E1 |
| 8 | Titan Rare | SH+3, H+4, RH+5, SH+E1, H+E2, RH+E3 | ohne Holo mit 1 bis 4 Looks und E2; ohne Holo mit 5 Looks und E1 |
| 9 | Galactic Rare | SH+4, H+5, RH+*+E1, H+E3, SH+E2 | ohne Holo mit 1 bis 4 Looks und E3; ohne Holo mit 5 Looks und E2 |
| 10 | Top Rare | SH+5, H+*+E1, RH+*+E2, SH+E3 | RH+5+E1; ohne Holo mit 5 Looks und E3 |
| 11 | Master Rare | SH+*+E1, H+*+E2, RH+*+E3 | RH+5+E2, H+5+E1 |
| 12 | Alpha Rare | RH+5+E3, SH+*+E2, H+*+E3 | H+5+E2, SH+5+E1 |
| 13 | Beta Rare | H+5+E3, SH+*+E3 | SH+5+E2 |
| 14 | Omega Rare | SH+5+E3 | |

### 7.3 Das Punktemodell dahinter

Alle Einträge des Nutzers gehen mit einem Punktemodell auf (geprüft, kein Eintrag weicht ab). Die Stufe ist die Punktzahl.

- Basis: kein Holo 1, RH 3, H 4, SH 5.
- Looks ohne Effekt: plus 1 je Look.
- Looks mit Effekt: 1 bis 4 Looks zusammen plus 3, 5 Looks plus 4.
- Effekte: E1 plus 3, E2 plus 4, E3 plus 5.
- Höchste Punktzahl: SH plus 4 plus E3 gleich 14, also Omega Rare.

Pseudocode:

```
BASIS   = {keins: 1, RH: 3, H: 4, SH: 5}
EFFEKT  = {0: 0, 1: 3, 2: 4, 3: 5}
function kartenseltenheit(holo, k, e):
    looks = k if e == 0 else (0 if k == 0 else (3 if k <= 4 else 4))
    return BASIS[holo] + looks + EFFEKT[e]
```

### 7.4 Chancen

Basis: die festgelegten Chancen aus Abschnitt 8 und 9, alles unabhängig. Pro Pack gilt: 10 Karten.

| Nr. | Name | Chance pro Karte | Chance pro Pack |
| --- | --- | --- | --- |
| 1 | normal | 95,9 % | fast jedes Pack |
| 2 | uncommon | 1 von 42 | 1 von 5 |
| 3 | rare | 1 von 100 | 1 von 10 |
| 4 | super rare | 1 von 179 | 1 von 18 |
| 5 | mega rare | 1 von 674 | 1 von 68 |
| 6 | hyper rare | 1 von 7.900 | 1 von 791 |
| 7 | elite rare | 1 von 53.300 | 1 von 5.330 |
| 8 | Titan Rare | 1 von 76.000 | 1 von 7.600 |
| 9 | Galactic Rare | 1 von 291.000 | 1 von 29.100 |
| 10 | Top Rare | 1 von 3,9 Mio. | 1 von 387.000 |
| 11 | Master Rare | 1 von 11,5 Mio. | 1 von 1,15 Mio. |
| 12 | Alpha Rare | 1 von 44,9 Mio. | 1 von 4,5 Mio. |
| 13 | Beta Rare | 1 von 404 Mio. | 1 von 40 Mio. |
| 14 | Omega Rare | 1 von 3,2 mal 10 hoch 18 | 1 von 3,2 mal 10 hoch 17 |

- Durch die ergänzten Einträge ist jede Kombination eingeordnet, die Chancen ergeben 100 %, und es wird von Stufe zu Stufe durchgehend seltener.
- Ab Master Rare liegen die Chancen beim direkten Ziehen über einer Million Packs, Omega Rare ist durch reines Ziehen praktisch nie erreichbar.
- Weil Zusatzlooks per Staub auf- und abgetragen werden können, kommt es für die oberen Stufen vor allem auf die Basis aus Holo-Stufe und Effekten an. Die Looks kann man später ergänzen (10 Staub je Look, bei fünf Looks 50 Staub aus fünf Sorten). Diese Tabelle (eigene Rechnung, Python) zeigt, wie oft ein gezogener Basis-Rohling zu mindestens der Stufe ausgebaut werden kann:

| Ausbaubar zu mindestens | Chance pro Karte | Chance pro Pack |
| --- | --- | --- |
| Stufe 9 (Galactic Rare) | 1 von 154 | 1 von 16 |
| Stufe 10 (Top Rare) | 1 von 898 | 1 von 90 |
| Stufe 11 (Master Rare) | 1 von 90.900 | 1 von 9.100 |
| Stufe 12 (Alpha Rare) | 1 von 222.000 | 1 von 22.200 |
| Stufe 13 (Beta Rare) | 1 von 1 Mio. | 1 von 100.000 |
| Stufe 14 (Omega Rare) | 1 von 10 Mio. | 1 von 1 Mio. |

- Heißt: Die oberen Stufen sind über das Staub-System deutlich erreichbarer als beim Ziehen allein, Omega Rare braucht ein Secret Holo mit 3 Effekten. Das ist eine Folge der Regeln des Nutzers, kein Fehler, aber die Staub-Wirtschaft entscheidet damit über das Endspiel. Ob das gewollt ist, ist [OFFEN].
- [OFFEN] Ob die obersten Stufen so ein Mythos bleiben sollen, ist eine Designentscheidung.
- [OFFEN] Das einfache Holo als super rare ist ein Vorschlag. Der Nutzer hat es noch nicht bestätigt.
---

## 8. Looks (Sammel-Optik)

Looks verändern nichts am Kampf. Sie bestimmen nur das Aussehen und den Sammelwert, wie bei echten Sammelkarten. [FEST]

### 8.1 Holo-Stufen

- [FEST] Reverse Holo, Holo und Secret Holo bilden ein Spektrum mit aufsteigender Seltenheit: Reverse Holo ist die niedrigste Stufe, dann Holo, dann Secret Holo.
- [FEST] Sie schließen sich gegenseitig aus, eine Karte hat höchstens eine Holo-Stufe.
- [FEST] Holo-Stufen sind fest an die Karte gebunden und nicht übertragbar.
- [FEST] Chancen pro Karte: Reverse Holo 1 %, Holo 0,5 %, Secret Holo 0,1 %. Zusammen hat eine Karte mit 1,6 % irgendeine Holo-Stufe, mit 98,4 % keine.

| Look | Chance pro Karte | Chance pro Pack (mind. eine) | im Schnitt eine Karte pro |
| --- | --- | --- | --- |
| Reverse Holo | 1 % | 9,56 % | etwa 10 Packs |
| Holo | 0,5 % | 4,89 % | etwa 20 Packs |
| Secret Holo | 0,1 % | 1,00 % | etwa 100 Packs |
| irgendeine Holo-Stufe | 1,6 % | 14,9 % | etwa 7 Packs |

### 8.2 Zusatzlooks

- [FEST] Fünf Zusatzlooks: horizontal gespiegelt, vertikal gespiegelt, invertiert, Glitch, Fehldruck.
- [FEST] Sie sind unabhängig voneinander und beliebig kombinierbar, auch mit jeder Holo-Stufe. Horizontal und vertikal gespiegelt können gleichzeitig auftreten.
- [FEST] Gespiegelt bedeutet nur das Bild des Monsters, nicht die ganze Karte. Beide Spiegelungen zusammen entsprechen einer Drehung des Bildes um 180 Grad.
- [FEST] Invertiert bedeutet umgekehrte Farben. Glitch ist ein digitaler Bildfehler, Fehldruck ein mechanischer Druckfehler (zum Beispiel verrutschte Farben). [ANNAHME] Diese Abgrenzung stammt aus meiner Redundanzprüfung, der Nutzer hat sie nicht verneint.
- [FEST] Jeder Zusatzlook hat eine Chance von 0,5 % pro Karte, unabhängig voneinander.
- [FEST] Zusatzlooks sind per Staub übertragbar (siehe Abschnitt 11).
- [OFFEN] Weitere Looks: Der Nutzer sagte, es müssten erst die Looks gesammelt werden. Weitere Zusatzlooks sind möglich.

| Größe | Wert |
| --- | --- |
| Mindestens ein Zusatzlook pro Karte | 2,475 %, im Schnitt in jedem 4,5. Pack eine solche Karte (22,2 % pro Pack) |
| Ein bestimmter Look pro Pack | 4,89 %, im Schnitt alle 20,5 Packs |
| Genau 1 Look pro Karte | 2,450 % (1 von 41) |
| Genau 2 Looks pro Karte | 0,0246 % (1 von 4.061) |
| Genau 3 Looks pro Karte | 0,000124 % (1 von 808.060) |
| Genau 4 Looks pro Karte | 1 von 321.608.040 |
| Alle 5 Looks | 1 von 320 Milliarden |
| Secret Holo mit allen 5 Looks | 1 von 320 Billionen |

### 8.3 Kombinatorik

- Holo-Stufe (4 Möglichkeiten: keine, RH, H, SH) mal 2 hoch 5 (Zusatzlooks) gleich 128 mögliche Look-Kombinationen pro Karte.

---

## 9. Spezialeffekte

### 9.1 Grundregeln

- [FEST] Jede Karte kann bis zu drei Spezialeffekte haben.
- [FEST] Jeder Spezialeffekt kann auf jeder Karte vorkommen, unabhängig von Stärkeklasse oder Stärke. Es gibt keine verbotenen Kombinationen.
- [FEST] Die Auswahl der Effekte ist absoluter Zufall, jeder Effekt ist extrem selten, als Zufalls-Dopamineffekt.
- [FEST] Effekte sind fest auf der Karte. Sie lassen sich nicht abtragen oder übertragen. (Korrektur des Nutzers: Er hat bei Abtragen und Übertragen immer die Looks gemeint, nicht die Effekte.)
- [FEST] Jeder Effekt hat einen Wert. Der Wert wirkt multiplikativ nur auf die Beschwörungskosten der Karte, nicht auf die Stärke. Die Stärke und damit die Lebenspunkte bleiben unangetastet.
- [FEST] Ein Effekt kann zugleich ein Vorteil und ein Preis sein: Beispiel Beschwörungsverstärker.
- [FEST] Ein Effekt wirkt nur, solange die Karte lebt.
- [FEST] Alle Effekte wirken erst im nächsten Zug nach der Beschwörung, außer den Blitzeffekten, die sofort wirken.
- [FEST] Der Effektwert hängt vom Effekt selbst ab. Beispiel des Nutzers: Ein Beschwörungsverstärker ist ein sehr starker Effekt und verdreifacht sowohl das Beschwörungsangebot als auch die Kosten.
- [ANNAHME] Mehrere Effekte auf einer Karte multiplizieren ihre Preisfaktoren (Beispiel aus dem Gespräch: dreimal Faktor 2,0 gleich das Achtfache).
- [ANNAHME] Die Effekte einer Karte sind verschieden, kein Effekt kommt doppelt auf derselben Karte vor. Gleichverteilte Auswahl aus der Liste.
- [OFFEN] Ob und wie Effekte bei den Gegnern und Bossen anders vergeben werden (siehe Abschnitt 13).

### 9.2 Beispiel Beschwörungsverstärker

- [FEST] Eine Karte mit Stärke 1 und dem Verstärker kostet 3 Beschwörungspunkte statt 1. Ab dem nächsten Zug dürfen alle weiteren Monster bis zur dreifachen Menge beschworen werden (statt 10 pro Zug dann 30).
- [FEST] Der Nutzer wollte beides gleichzeitig: dreifacher Preis und dreifaches Angebot. Es ist ein Investitionsgeschäft, das sich erst später auszahlt, und die Karte ist ein Muss-Ziel für den Gegner.
- [ANNAHME] Das Angebot pro Zug ist das Einkommen an Beschwörungspunkten. Bei unbegrenztem Ansparen wirkt der Verstärker auf das Einkommen pro Zug.

### 9.3 Chancen pro Karte

- [FEST] Mindestens ein Effekt: 0,1 %. Mindestens zwei Effekte: 0,05 %. Drei Effekte: 0,01 %. Das sind Gesamtchancen pro Karte, die Karten mit zwei oder drei Effekten sind also unter den Karten mit mindestens einem Effekt mitgezählt.
- [ANNAHME] Daraus folgen die exakten Chancen: genau 1 Effekt 0,05 %, genau 2 Effekte 0,04 %, genau 3 Effekte 0,01 %.
- Pro Pack: mindestens eine Karte mit Effekt 0,996 % (im Schnitt etwa alle 100 Packs), mindestens zwei Effekte 0,499 % (alle 200 Packs), drei Effekte 0,100 % (alle 1000 Packs).
- Der Nutzer hat ausdrücklich darauf bestanden, dass 1 von 1000 Karten ein Erwartungswert ist, kein fester Takt. Die Anzahl der Treffer ist binomialverteilt, die Poisson-Näherung mit Lambda gleich n mal p ist hier sehr gut.
- Wahrscheinlichkeit, nach n Packs mindestens eine Effektkarte gesehen zu haben, ohne Pity: nach 50 Packs 39,4 %, nach 100 Packs 63,2 %, nach 200 Packs 86,5 %, nach 300 Packs 95,0 %, nach 500 Packs 99,3 %. Der Median liegt bei etwa 69 Packs.
- [FEST] Der Nutzer nimmt 100 Packs als guten Randwert für die erste Effektkarte.

### 9.4 Die 50 Effektideen

[FEST] Der Nutzer löscht momentan keine davon. Alle bleiben als Testmaterial stehen, Spieltests entscheiden später, was rausfliegt. [VORSCHLAG] Die Wirkungen und Preisfaktoren sind meine Entwürfe. Blitz bedeutet: wirkt sofort. Sonst gilt die Standardregel (ab dem nächsten Zug, nur solange die Karte lebt).

| Nr. | Effekt | Wirkung | Preisfaktor |
| --- | --- | --- | --- |
| 1 | Beschwörungsverstärker | Beschwörungslimit pro Zug mal 3 | 3,0 |
| 2 | Doppelrufer | Zug-Limit mal 2 | 2,0 |
| 3 | Elementverstärker | Alle Karten des eigenen Elements bekommen +1 Elementarkraft | 1,5 |
| 4 | Elementschild | Alle Karten des eigenen Elements bekommen +1 Elementarschutz | 1,5 |
| 5 | Nachbarschaftsbonus | Karten auf den Nachbarfeldern im Elementrad bekommen +1 Elementarkraft | 1,5 |
| 6 | Gegenpolbann | Gegenpol-Treffer gegen dich zählen nur Faktor 1,5 statt 2,5 | 2,0 |
| 7 | Erzfeindjäger | Gegenpol-Angriffe der eigenen Karten zählen Faktor 3,0 statt 2,5 | 2,0 |
| 8 | Blitzruf | Beschwöre eine weitere Karte bis Stärke 3 sofort (Blitz) | 3,0 |
| 9 | Blitzschlag | Verursacht sofort 3 Schaden an einem Gegner (Blitz) | 2,5 |
| 10 | Blitzheilung | Heilt sofort 5 Lebenspunkte bei einem Verbündeten (Blitz) | 2,0 |
| 11 | Rüstung | Eigene Elementarschutz-Werte zählen +2 | 1,5 |
| 12 | Dornen | Wer diese Karte trifft, nimmt 1 Schaden | 1,3 |
| 13 | Regeneration | Heilt jeden Zug 1 Lebenspunkt | 1,4 |
| 14 | Zweiter Atem | Wenn die Karte stirbt, kehrt sie einmal mit 1 Lebenspunkt zurück | 2,5 |
| 15 | Letzter Wille | Beim Tod: Verbündete bekommen +2 Elementarkraft für einen Zug | 1,8 |
| 16 | Erinnerung | Beim Tod: Ziehe eine Karte, ohne Beschwörungsmenge zu verbrauchen | 2,0 |
| 17 | Rudelruf | Beschwörst du eine Karte gleichen Elements, kostet sie 1 weniger | 1,6 |
| 18 | Sammelrabatt | Jede Karte unter Stärke 5 kostet 1 weniger zu beschwören | 2,0 |
| 19 | Schwergewicht | Eigene Karten ab Stärke 30 kosten 5 weniger zu beschwören | 2,0 |
| 20 | Platzspender | Bringt 2 zusätzliche Teamplätze mit | 1,5 |
| 21 | Platzfresser | Bringt 5 Teamplätze mit, die Karte selbst belegt aber 2 Plätze mehr | 1,3 |
| 22 | Wildes Herz | Wildheit zählt doppelt für den Angriff | 1,5 |
| 23 | Seltsame Welt | Seltsamkeit zählt doppelt, auch beim Aufdecken von Fallen und Überraschungen | 1,5 |
| 24 | Gigant | Größe zählt doppelt für Lebenspunkte | 1,6 |
| 25 | Schnellschlag | Die Schlagzahl steigt um 1 | 2,0 |
| 26 | Flächenwirbel | Ein Angriff trifft auch die Nachbarn des Ziels mit halbem Schaden | 2,0 |
| 27 | Wahllos | Ein Angriff trifft ein zufälliges Ziel, dafür mit Faktor 1,5 | 1,3 |
| 28 | Durchdringen | Ignoriert 2 Punkte Elementarschutz | 1,8 |
| 29 | Zielsuche | Du bestimmst, welcher Gegner angegriffen wird | 1,8 |
| 30 | Köder | Gegner müssen diese Karte zuerst angreifen | 1,5 |
| 31 | Tarnung | Die Karte kann nicht gewählt werden, solange andere Karten leben | 2,0 |
| 32 | Spiegel | Wirft den Schaden des ersten Treffers pro Zug zurück | 2,0 |
| 33 | Elementwandel | Wechselt zu Beginn deines Zuges das Element um 2 Felder im Uhrzeigersinn | 1,8 |
| 34 | Schwarzer Wirbel | Die Effektivitätsfaktoren der Gegner werden gegen diese Karte um 0,1 kleiner | 1,5 |
| 35 | Rückseite | Zeigt dem Gegner einen falschen Elementwert, bis die Karte angreift | 1,3 |
| 36 | Zweites Ich | Kopiert den Effekt einer eigenen Karte auf dem Feld, aber nicht Blitz | 2,5 |
| 37 | Aufschub | Verschiebt den Effekt einer Gegnerkarte um einen Zug | 2,0 |
| 38 | Zauberbann | Ein Gegnereffekt pro Zug wird aufgehoben | 3,0 |
| 39 | Aufrüster | Gibt einer anderen eigenen Karte +1 Punkt auf ein Attribut deiner Wahl | 1,6 |
| 40 | Opferaltar | Opfere eine Karte, um Stärke 5 zu beschwören, ohne Beschwörungsmenge zu zahlen | 2,0 |
| 41 | Zeitsprung | Zählt, als wäre die Karte schon einen Zug früher beschworen worden | 2,5 |
| 42 | Frühstart | Der Effekt wirkt schon im selben Zug, in dem die Karte beschworen wird | 2,0 |
| 43 | Nachbrenner | Der Effekt wirkt noch einen Zug länger, nachdem die Karte gestorben ist | 1,6 |
| 44 | Schwarmgeist | Je mehr Karten des Elements liegen, desto höher der Angriff, bis +3 | 1,8 |
| 45 | Einzelgänger | Wenn nur diese Karte lebt, +3 Elementarkraft | 1,5 |
| 46 | Schlussakt | Wenn nur noch 1 eigene Karte lebt, Elementarkraft mal 2 | 2,0 |
| 47 | Beutezug | Tötet die Karte einen Gegner, ziehe sofort eine neue Karte | 2,0 |
| 48 | Wachstum | Jeden Zug +1 Punkt auf ein zufälliges Attribut, bis die Karte doppelt so stark ist | 2,0 |
| 49 | Nebel | Gegner sehen die Stärke deiner Karten nicht, bis sie angreifen | 1,5 |
| 50 | Gleichgewicht | Alle Karten auf dem Feld mit Stärke über 20 verlieren 1 Punkt Elementarkraft | 2,5 |

Hinweise:

- [FEST] Der Nutzer sagte zur Überschneidung zwischen Wildheit und dem Effekt Flächenwirbel: "Die Überschneidung ist egal."
- Einige Effekte haben Wechselwirkungen, die bei der Umsetzung geklärt werden müssen (zum Beispiel Elementwandel, Tarnung, Köder, Zielsuche gegen die feste Gegenüber-Regel und die freie Zielwahl durch Wildheit).

### 9.5 Effekte für Spielerleben

- [FEST] Es soll Karten geben, die die Lebenspunkte der Spieler erhöhen.
- [VORSCHLAG] Drei Effekte:

| Effekt | Wirkung | Preisfaktor |
| --- | --- | --- |
| Herzstück | Maximale Spielerleben plus 1, solange die Karte lebt | 4,0 |
| Lebenslicht | Beim Tod der Karte plus 1 Spielerleben | 3,0 |
| Rettungsanker | Einmal pro Kampf: Verlierst du ein Leben, bekommst du es zurück | 3,5 |

### 9.6 Beschwörungskosten

- [ANNAHME] Beschwörungskosten einer Karte gleich Stärke mal das Produkt der Preisfaktoren ihrer Effekte, auf eine geeignete Weise gerundet. [OFFEN] Rundung der Kosten.

---

## 10. Booster-Pack und Zufall

### 10.1 Grundregeln

- [FEST] Ein Booster-Pack enthält 10 Karten.
- [FEST] Alle Zufallswerte (Stärkeklasse, Holo-Stufe, Zusatzlooks, Effekte, Pity) werden schon beim Öffnen des Packs ausgewürfelt und gespeichert. Beim Aufdecken werden die Zufallszahlen sichtbar ausgezählt, die Animation zeigt das feststehende Ergebnis nur an. Dadurch sind Pity-Zähler und Spielstand sofort konsistent, und Abbrechen während des Aufdeckens ändert nichts.
- [FEST] Die Zufallszahlen laufen sichtbar hoch, Beinahe-Treffer sind zu sehen.
- [VORSCHLAG] Seeded Zufall (URL-Parameter) zum Testen.

### 10.2 Reihenfolge der Auswürfelung

[VORSCHLAG] Pro Karte, in dieser Reihenfolge:

1. Monster (Art und damit Grundelement). Die Anzahl der Monster und ihre Verteilung sind [OFFEN].
2. Stärkeklasse nach den Chancen aus Abschnitt 6.
3. Punktesumme im Bereich der Klasse, dann Verteilung auf die Attribute.
4. Holo-Stufe (1 % / 0,5 % / 0,1 %).
5. Fünf Zusatzlooks, je 0,5 %.
6. Effekt: erst, ob Effekte vorkommen und wie viele (mit Pity), dann die Auswahl.
7. Kartenseltenheit aus dem Punktemodell.

### 10.3 Pity-Mechanismus für Effektkarten

- [FEST] Der Pity-Mechanismus wird ausgelöst, wenn der Erwartungswert überschritten wird. Der Erwartungswert sind 100 Packs ohne Effektkarte.
- [FEST] Gewählt wurde die mittelweiche Variante. Der Nutzer sagte "das passt".
- [FEST] Ab dem 101. Pack ohne Effektkarte verdoppelt sich die Chance pro Karte alle 25 Packs, im 200. Pack ohne Effektkarte ist ein Effekt sicher. (Die Parameter 25 und 200 waren mein Vorschlag, den der Nutzer akzeptiert hat. Die Spieltests prüfen sie.)

```
function chance_pro_karte(n):      // n = laufende Nummer des Packs seit der letzten Effektkarte (das erste Pack danach hat n = 1)
    if n <= 100: return 0.001
    if n >= 200: return 1.0
    return min(1.0, 0.001 * 2 ** ((n - 100) / 25))
```

| Packnummer n seit der letzten Effektkarte | Chance pro Karte | Chance pro Pack |
| --- | --- | --- |
| bis 100 | 0,1 % | etwa 1 % |
| 125 | 0,2 % | etwa 2 % |
| 150 | 0,4 % | etwa 4 % |
| 175 | 0,8 % | etwa 8 % |
| 200 | 100 % | 100 % |

- Ergebnis der Simulation: Mittel etwa 78 Packs bis zur ersten Effektkarte, Median 70, neun von zehn Spielern sehen sie bis Pack 155, das Maximum ist 200. Rund 37 % erreichen den Pity-Bereich.
- [ANNAHME] Der Zähler setzt zurück, sobald eine Karte mit mindestens einem Effekt gezogen wird. Eine durch Pity ausgelöste Karte hat mindestens einen Effekt, mehr nur mit den normalen Zusatzchancen.
- [OFFEN] Ob der Zähler pro Spieler und Konto läuft und beim Auto-Öffnen unverändert weiterläuft. [ANNAHME] Er läuft in beiden Fällen weiter, da alle Ergebnisse ohnehin beim Öffnen feststehen.
- [FEST] Es gibt keinen Pity für Secret Holo oder die anderen Looks. Das war eine Frage von mir, die der Nutzer nicht aufgegriffen hat. [OFFEN].

---

## 11. Sammlung, Staub, Münzen, Auto-Öffnen

### 11.1 Aufbau der Sammlung

- [FEST] Die Sammlung ist nach Kartenstapeln organisiert. Ein Stapel gehört zu einer Karte und enthält die Anzahl verschiedener Ausführungen dieser Karte. Eine Ausführung ist eine einzigartige Kombination aus Holo-Stufe und Zusatzlooks. Beispiel: derselbe Stapel kann eine normale Version, eine Glitch-Version und eine Holo-plus-Glitch-Version enthalten.
- [FEST] Das Abtragen und Auftragen gilt pro Kartenstapel.

### 11.2 Looks abtragen und auftragen

- [FEST] Übertragbar sind nur die Looks, also die fünf Zusatzlooks. Holo-Stufen bleiben fest an der Karte, Spezialeffekte ebenfalls.
- [FEST] Abtragen: geht bei jeder Karte, nicht nur bei doppelten. Man bekommt Staub dieses Looks. Die Karte behält man ohne den Look.
- [FEST] Die Menge Staub entspricht der Seltenheit der Karte. Beispiel des Nutzers: eine Seltenheit-7-Karte gibt 7 Staub. [ANNAHME] Gemeint ist die Nummer der Stärkeklasse (Bronze 1 bis Diamond 8), weil der Nutzer die Klassen später "Stärke" nannte und die Kartenseltenheit die Looks beschreibt.
- [FEST] Auftragen: kostet 10 Staub des jeweiligen Looks.
- [FEST] Es gibt je Look eine eigene Staubsorte (Beispiel: Glitch-Staub, Fehldruck-Staub).
- [FEST] Es gibt keinen Höchstwert für gesammelten Staub.
- [ANNAHME] Ein Look kann nicht auf eine Karte aufgetragen werden, die ihn schon hat. Es würde dieselbe Ausführung entstehen.
- [ANNAHME] Beim Abtragen oder Auftragen wechselt die Karte in den Stapel der entsprechenden Ausführung.
- [ANNAHME] Wird die Seltenheitsstufe einer Karte durch Auftragen oder Abtragen verändert, wird sie neu aus dem Punktemodell berechnet (zum Beispiel erreichen oberste Stufen so die Looks, die fehlen).

### 11.3 Münzen und Auto-Öffnen

- [FEST] Als Ausgleich für die extreme Seltenheit gibt es ein automatisches Öffnen von Packs.
- [FEST] Jedes automatisch geöffnete Pack kostet Münzen. Je schneller das Öffnen läuft, desto teurer ist es pro Pack.
- [FEST] Da alle Ergebnisse beim Öffnen feststehen, ändert Auto-Öffnen nur die Zeit, nicht die Chancen.
- [OFFEN] Woher die Münzen kommen (Kämpfe, Staub oder beides). Was ein Pack im Basispreis kostet. Ob auch das manuelle Öffnen Münzen kostet. Ob das Tempo in Stufen oder stufenlos wählbar ist.
- [VORSCHLAG] Vier Tempostufen:

| Tempo | Geschwindigkeit | Preisfaktor pro Pack |
| --- | --- | --- |
| 1 | 1 Pack alle 3 Sekunden | 1,0 |
| 2 | 1 Pack pro Sekunde | 2,0 |
| 3 | 5 Packs pro Sekunde | 4,0 |
| 4 | 20 Packs pro Sekunde | 8,0 |

- [VORSCHLAG] Auto-Stopp: Das automatische Öffnen hält an und spielt die volle Animation, sobald eine Karte kommt, die neu ist, ein Holo trägt, einen Effekt hat oder ab einer wählbaren Stärkeklasse liegt. So bleibt die epische Animation für die besonderen Momente erhalten.
- Zeitbedarf bei Tempo 4: 7.600 Packs (im Schnitt eine Titan Rare) etwa 6 Minuten, 29.100 Packs (Galactic Rare) etwa 24 Minuten, eine Master Rare (rund 1,15 Mio. Packs) etwa 16 Stunden. Die obersten Stufen bleiben auch mit Auto-Öffnen außer Reichweite.
---

## 12. Kampf

### 12.1 Grundprinzip

- [FEST] Im Spiel gibt es Gegner und ein progressives Kampfsystem mit Endbossen.
- [FEST] Man kämpft automatisch: Der Spieler stellt sein Team zusammen und beschwört Karten, der Kampf selbst läuft ohne Eingaben ab.
- [FEST] Die Karten stehen sich in Spalten gegenüber. Jede Karte greift das Ziel auf der gegenüberliegenden Seite an.
- [FEST] Karten können pro Zug gewechselt, also umgestellt werden.
- [FEST] Es gibt keine Obergrenze für die Feldbreite.

### 12.2 Beschwörung

- [FEST] Jede Karte muss beschworen werden, bevor sie kämpfen kann.
- [FEST] Pro Zug können 10 Punkte Stärke beschworen werden (Richtwert des Nutzers: "sagen wir 10").
- [FEST] Nicht verbrauchte Beschwörungspunkte kann man sparen. Sie sammeln sich ohne Obergrenze an.
- [FEST] Die Anzahl der Beschwörungen pro Zug kann durch Effekte verändert werden (Beschwörungsverstärker).
- [ANNAHME] Die Kosten einer Karte entsprechen ihrer Stärke mal den Preisfaktoren ihrer Effekte. Eine Karte mit Stärke 25 kostet ohne Effekte 25 Punkte und braucht also mehrere Züge Ansparen.
- [FEST] Effekte wirken erst ab dem nächsten Zug, ausgenommen Blitzeffekte.

### 12.3 Ablauf einer Runde

[OFFEN] Der Nutzer hat den Zugablauf nicht festgelegt. [VORSCHLAG] zur Prüfung:

1. Beschwörungspunkte des Zuges gutschreiben (10, durch Effekte verändert).
2. Beschwören: Karten aus der Hand für Beschwörungspunkte aufs Feld legen. Umstellen ist erlaubt.
3. Seltsamkeit festlegen: jedes Monster verschiebt sein Element im Rahmen seines Budgets, für den Gegner sichtbar.
4. Automatischer Kampf: Alle Karten schlagen entsprechend Schlagzahl zu. Aufteilen der Treffer nach Wildheit und Größe.
5. Aufräumen: Tote Karten entfernen, Lebenspunkte der Spieler prüfen, Effekte zeitlich abrechnen.

Offene Fragen dazu:

- [OFFEN] Ob beide Seiten gleichzeitig angreifen oder abwechselnd. [VORSCHLAG] Gleichzeitig, Schaden wird gesammelt und danach angewendet. Das vermeidet einen Vorteil des Anfangs.
- [OFFEN] Ob der Spieler die Reihenfolge der Schläge oder das Aufteilen selbst festlegt oder eine Voreinstellung (KI) läuft, weil der Kampf automatisch ist. [ANNAHME] Der Angreifer wählt die Ziele nach Wildheit vorab (Vorauswahl), der Kampf rechnet dann automatisch.
- [OFFEN] Ob Karten nach dem Kampf wieder in die Hand zurückkehren, ob Schaden bis zum Ende des Kampfes bestehen bleibt oder ob es Heilung gibt.
- [OFFEN] Spielerhand, Kartenpool und Deckgröße. Wie viele Karten dürfen in ein Team? [VORSCHLAG] Team aus der Sammlung, Grenze durch Teamplatz und Teamkapazität.

### 12.4 Zielwahl und Angriff ins Leere

- [FEST] Jeder Angriff trifft zunächst das gegenüberliegende Feld.
- [FEST] Wildheit 0: nur das Gegenüber. Wildheit 1: freie Wahl eines Ziels. Wildheit n von mindestens 2: der Schaden darf beliebig in ganzen Punkten auf n Ziele aufgeteilt werden. Beispiel: 7 gleich 3 plus 4.
- [FEST] Schlagzahl 2 bedeutet zwei Angriffe auf zwei verschiedene Gegner. Jeder dieser Angriffe kann je nach Wildheit zusätzlich aufgeteilt werden.
- [FEST] Der Angreifer wählt, mit wie viel Schaden er welches Ziel angreift.
- [FEST] Größe: Ein Ziel mit Größe n kann nur frei gewählt werden, wenn die Wildheit des Angreifers mindestens n beträgt. Sonst trifft es nur als Gegenüber.
- [FEST] Greift ein Monster auf ein leeres Feld an (kein Gegenüber), darf der Angegriffene entscheiden, welches seiner Monster den Schaden bekommt. Das ersetzt die frühere Idee, dass ein Treffer ins Leere verpufft.
- [ANNAHME] Der Angegriffene wählt aus allen seinen lebenden Monstern. Der Schaden wird dabei mit dem Elementfaktor des gewählten Ziels berechnet, nicht mit einem neutralen Wert.
- [OFFEN] Bei mehreren gleichzeitigen Angriffen ins Leere: ob der Angegriffene jeden einzeln zuweist.

### 12.5 Lebenspunkte der Spieler

- [FEST] Jeder Spieler hat zu Beginn 5 Lebenspunkte. Es gibt Karten, die diese Punkte erhöhen (siehe Abschnitt 9.5).
- [FEST] Lebenspunkte beenden das Spiel: Bei 0 ist der Spieler besiegt.
- [FEST] Der Spieler verliert einen Lebenspunkt, wenn alle seine Monster ausgeschaltet sind (Auslöser: der Gegner hat sie alle ausgeschaltet).
- [FEST] Hat der Verteidiger gar keine Monster und der Angreifer greift mindestens einmal an, verliert der Angegriffene einen Lebenspunkt, aber nur einen pro Runde.
- [ANNAHME] "Alle Monster ausgeschaltet" und "keine Monster beim Angriff" zusammen kosten höchstens 1 Punkt pro Runde.
- Verworfene frühere Idee: Wer zweimal ins Leere angreift, bekommt der Gegner einen Punkt Abzug. Sie wurde durch die Regeln oben ersetzt.

### 12.6 Beispielrechnung

Team A: Monster "Wasser", Elementarkraft 10, Schutz 2, Wildheit 1, Schlagzahl 1. Team B: Monster "Feuer", Schutz 3.

- Nach der Annahme aus 4.5 liegt Wasser (Pos. 6) im Uhrzeigersinn 6 Felder hinter Feuer (Pos. 0), also d gleich 6. Das ist keine Primzahl, der Faktor ist 1,0 (neutral).
- Schaden: 10 mal 1,0 geteilt durch (3 plus 1) gleich 2,5.
- Hätte Wasser Elementarkraft 10 gegen ein Metall (Pos. 22, Gegenpol von Wasser), wäre der Faktor 2,5 und bei Schutz 0 der Schaden 25.

### 12.7 Gegner, Fortschritt, Endbosse

- [FEST] Es gibt Gegner, ein progressives Kampfsystem und Endbosse. Alles Weitere ist [OFFEN].
- [VORSCHLAG] Zur Prüfung:

| Punkt | Entwurf |
| --- | --- |
| Welten | 8 Welten mit je 4 benachbarten Elementen des Rades, passend zum Thema der Welt |
| Gegnerstärke | Team-Stärke wächst pro Welt mit Faktor 1,5, etwa 15, 22, 34, 51, 76, 114, 171, 256 |
| Bosse | Boss mit 3 plus Weltnummer Lebenspunkten und garantierten Effekten |
| Belohnung | Siegprämie als Booster-Packs, so entsteht der Kreislauf aus Kämpfen und Packs |
| Finale | Finalboss aus zwei Gegenpolpaaren (vier Elemente) |
| Schwierigkeit | Pro Welt mehrere Kämpfe mit steigender Stärke, danach der Boss |

---

## 13. Design, Animation, Sound

Das Design ist dem Nutzer extrem wichtig ([FEST]). Jedes der folgenden Ziele ist deshalb Pflicht, nicht Kür.

### 13.1 Anforderungen des Nutzers

- [FEST] Monster extrem ansehnlich.
- [FEST] Die Animation der Kartenziehung ist faszinierend, spannend und episch.
- [FEST] Der Effekt, den die Karte beim Wenden und Drehen zeigt, ist faszinierend und hängt davon ab, wo man mit der Maus auf der Karte ist.
- [FEST] "Respektive Hand": Der Nutzer meint die Bedienung per Hand. [ANNAHME] Das ist Touch (Finger auf dem Bildschirm). Kamerabasiertes Hand-Tracking würde ein ganz anderes Projekt, der Nutzer hat das nicht gesagt. [OFFEN] zur Bestätigung.
- [FEST] Die Effekte (Holo und Looks) sind sehr schön gewählt.
- [FEST] Soundeffekte runden alles ab, es gibt angenehme Kartenzieh-Geräusche.

### 13.2 Vorschläge: Optik

- [VORSCHLAG] Die 32 Elemente bekommen ein Farbrad in Kreisreihenfolge. Gegenpole sind Komplementärfarben (zum Beispiel Feuer orange, Eis blau). So sieht man Effektivitäten.
- [VORSCHLAG] Der Rahmen der Karte zeigt die Stärkeklasse: Bronze, Silber, Gold, Platin, Smaragd, Rubin, Saphir, Diamant als Material und Farbe. Die Kartenseltenheit zeigt sich an Holo und Glanz, nicht am Rahmen. So lesen sich beide Achsen unabhängig.
- [VORSCHLAG] Layout: Bild im Zentrum, Attributsymbole mit Zahl am Rand, Element als Siegel am Rand, Effekte als kleine Banner. Wenig Text, weil die Attribute als Symbole gedacht sind.
- [VORSCHLAG] Holo-Look: Reverse Holo mit schimmerndem Rahmen und Hintergrund, Holo mit Regenbogenverlauf über dem Bild, Secret Holo mit Tiefe (Parallaxe, Partikel, Lichtbrechung). Secret Holo bekommt eine Sonderschicht (WebGL), die anderen laufen mit CSS.
- [VORSCHLAG] Zusatzlooks als erkennbare Bildbehandlung: Gespiegelt (nur das Bild), invertiert (negative Farben), Glitch (digitale Streifen und Farbversatz, die zucken), Fehldruck (verrutschte Farbschichten, Rasterpunkte).
- [VORSCHLAG] Monsterkunst: Das ist der größte Aufwand. Ein Stil, dessen Bilder aus einem Werkzeug oder von einem Künstler kommen und für die 32 Elemente ein gemeinsames, hohes Niveau halten. Zahl der Monster ist offen, die Kunst bestimmt das Budget.

### 13.3 Vorschläge: Bewegung

- [VORSCHLAG] Neigung: Die Karte neigt sich 3D bis etwa 15 Grad zur Maus oder zum Finger, mit weichem Nachlauf (Federung). Ein Glanzpunkt folgt dem Zeiger. Holo-Schichten verschieben sich gegen die Neigung, das ergibt Tiefe.
- [VORSCHLAG] Die Wirkung hängt vom Ort ab: Zeigt die Maus auf das Monster, glimmt das Element. Auf dem Rand, glänzt die Stärkeklasse. Auf dem Effektbanner, erscheint der Effekttext.
- [VORSCHLAG] Karte drehen: Ziehen oder Tippen dreht sie um, die Rückseite zeigt Statistik und Chancen.
- [VORSCHLAG] Gerät mit Gyrosensor (Handy): Die Neigung des Handys steuert das Licht, dort wo es erlaubt ist.
- [VORSCHLAG] Reduzierte Bewegung (prefers-reduced-motion) schaltet Neigung und Partikel stark zurück.
- [VORSCHLAG] Ziel 60 Bilder pro Sekunde, auch mit 10 Karten gleichzeitig.

### 13.4 Vorschläge: Pack-Öffnung

[VORSCHLAG] Ablauf des Öffnens. Die Zufallswerte stehen schon, die Animation zählt sie nur aus (Regel aus Abschnitt 10).

1. Pack erscheint, leichtes Schweben, Glanz.
2. Aufreißen mit Widerstand: Der Spieler zieht die Kante, ein Knistern setzt ein, die Folie reißt.
3. Die Karten fächern sich auf, die oberste liegt verdeckt.
4. Aufdecken einzeln: vor dem Umdrehen zeigt ein Glühen die Seltenheit der Karte (Farbe und Stärke des Glühens). Dann dreht sich die Karte, dabei zählen die Zufallszahlen sichtbar hoch (Holo, Looks, Effekte).
5. Höhere Stufen: Zeitlupe, Lichtstrahlen, Bildschirmerschütterung, Staubpartikel, Nachbild.
6. Beinahe-Treffer sind sichtbar: Der Zähler läuft knapp am Wert vorbei oder bleibt gerade noch hängen.
7. Übersicht: Alle 10 Karten liegen aus, Neues ist markiert.

### 13.5 Vorschläge: Sound

- [VORSCHLAG] Papierrascheln und Folienreißen beim Öffnen, leises Schnippen beim Fächern.
- [VORSCHLAG] Kartenumdrehen: weiches Schwingen, wird mit der Seltenheit heller und länger.
- [VORSCHLAG] Steigende Tonleiter: Je höher die Seltenheitsstufe, desto höher und voller der Ton, bis zu Chören bei den obersten Stufen. 14 Stufen, 14 Töne.
- [VORSCHLAG] Zusatzlooks haben ihren eigenen Klang (Glitch knistert, Fehldruck klackt, invertiert klingt hohl).
- [VORSCHLAG] Zufallszähler ticken, wie bei einer Zahlenwalze, und rasten hörbar ein.
- [VORSCHLAG] Lautstärke und Stumm in den Einstellungen, standardmäßig dezent, mit Web Audio erzeugt oder kurze Dateien.

---

## 14. Gesamtübersicht der offenen Punkte

Alles hier ist [OFFEN]. Der Nutzer muss entscheiden, oder ich baue den [VORSCHLAG] als Standardwert.

### 14.1 Regeln

1. Richtung der Effektivität auf dem Rad (Abschnitt 4.5). Das begleitende Dokument sagt das Gegenteil des Wortlauts des Nutzers.
2. Klasse Diamond: Punktebereich. [VORSCHLAG] Saphire 50 bis 80, Diamond 70 bis 100.
3. Obergrenzen der Attribute (Abschnitt 5.5).
4. Teamplatz: Umrechnung vom Wert auf den Angriffsmultiplikator und Rolle im Schaden. Grundvorrat an Plätzen. Wie sich unbegrenzte Feldbreite und Teamplätze vertragen.
5. Rundung von Schaden und Beschwörungskosten.
6. Zugablauf, Gleichzeitigkeit, Rolle der Hand, Deckgröße (Abschnitt 12.3).
7. Ob Schaden nach dem Kampf bleibt, ob es Heilung gibt.
8. Bedeutung des Pluszeichens in "RH+1 KL+" und des Sterns in der Seltenheitsliste (Abschnitt 7.1). Mein Vorschlag: 1 bis 4 Zusatzlooks.
9. Ob einfaches Holo ohne Looks und Effekt als super rare gilt.
10. Pity für Secret Holo und andere Looks.
11. Weitere Looks.

### 14.2 Wirtschaft

12. Münzen: Quelle, Basispreis eines Packs, ob manuelles Öffnen kostet.
13. Auto-Öffnen: Stufen oder stufenlos, Auto-Stopp-Regeln.
14. Wie man an Packs kommt (Startpacks, Belohnungen, Kauf).
15. Staub: Ob die Klassennummer gemeint ist (Abschnitt 11.2).

### 14.3 Inhalt und Technik

16. Spielname. Anzahl und Namen der Monster. Verteilung der Monster auf die Elemente.
17. Symbole der Attribute.
18. "Hand" gleich Touch oder Kamera (Abschnitt 13.1).
19. Technologie (Abschnitt 1.4), Speicherung, ob es ein Konto gibt.
20. Gegner, Welten, Bosse (Abschnitt 12.7), Belohnungen.
21. Spieltests der 50 Effekte (welche fliegen raus, Preisfaktoren).
22. Teamkapazität: ob sie in die Stärkesumme zählt (Annahme: ja).

---

## 15. Annahmen im Überblick

Dinge, die ich so gelesen habe, ohne dass der Nutzer sie bestätigt hat. Alle im Code als Konfiguration markieren.

1. Gegenpol-Faktor ist 2,5 (der Nutzer sagte "2,4, äh, 5").
2. Stärkeklassen-Bereiche gelten der Reihe nach für Bronze bis Saphire.
3. Der Staub beim Abtragen ist die Klassennummer (Bronze 1 bis Diamond 8).
4. Mehrere Effekte multiplizieren ihre Preisfaktoren.
5. Effekte einer Karte sind verschieden.
6. Genau-Chancen für Effekte: 0,05 %, 0,04 %, 0,01 %.
7. Pity-Zähler zählt Packs seit der letzten Effektkarte und läuft beim Auto-Öffnen weiter.
8. Looks lassen sich nicht doppelt auftragen.
9. Seltsamkeit gilt für Angriff und Verteidigung und ist für den Gegner sichtbar.
10. Wirksame Wildheit zur freien Zielwahl ist mindestens das Maximum aus 1 und Größe.
11. Teilen des Schadens nur in ganzen Punkten, jeder Teil mindestens 1.
12. Schaden bleibt über Züge hinweg bestehen.
13. Beim Angriff ins Leere wird der Faktor des gewählten Ziels benutzt.
14. Teamkapazität zählt in die Stärkesumme.
15. Die Oberfläche ist deutsch.

---

## 16. Verworfene und geänderte Ideen

- 12 Elemente von Dragonle: ersetzt durch 32 neue (zuerst 20).
- Attribute nach Dungeons and Dragons: verworfen, alle neu.
- Tempo als Attribut: verworfen, zu nah an Pokémon.
- Elementtabelle nach Pokémon: ersetzt durch das Rad.
- Blitz als eigenes Element: aufgelöst in Elektrizität.
- Wind: gestrichen, Gas stattdessen. Materie, Edelstein, Diamant, Neutral: gestrichen.
- Seltsamkeit als Zufall: ersetzt durch die Elementverschiebung.
- Wildheit als Cleave auf Nachbarn: ersetzt durch freie Zielwahl und Aufteilung.
- Effekte nur für schwache Karten: ersetzt durch "jede Karte kann jeden Effekt haben".
- Effekte übertragbar: nein, nur Looks sind übertragbar.
- Effektmultiplikator auf Stärke: nein, nur auf den Beschwörungspreis.
- Zweimal ins Leere angreifen kostet einen Lebenspunkt: ersetzt durch Wahl des Verteidigers und die Regeln aus 12.5.
- Harter Pity: ersetzt durch den mittelweichen.
- Attribute "Anzahl Angriffe, die sich ein Monster merken kann": weggelassen.

---

## 17. Glossar

| Begriff | Bedeutung |
| --- | --- |
| Booster-Pack | Päckchen mit 10 zufälligen Karten |
| Elementrad | Kreis aus 32 Elementen, Abstände bestimmen Effektivität |
| Gegenpol | Element 16 Felder entfernt, Faktor 2,5 in beide Richtungen |
| Elementarkraft | Angriffskraft im eigenen Element |
| Elementarschutz | Verteidigung, teilt den Schaden durch (Schutz plus 1) |
| Größe | Wer frei angreifen kann, hängt davon ab (Gegenspieler der Wildheit) |
| Wildheit | Anzahl der Ziele, auf die ein Angriff aufgeteilt werden kann |
| Seltsamkeit | Budget für die Verschiebung des Elements pro Zug |
| Schlagzahl | Angriffe pro Zug |
| Teamplatz | Angriffsmultiplikator, der Platz im Team kostet |
| Teamkapazität | Optionaler Wert, der Plätze mitbringt |
| Stärke | Summe aller Attributpunkte, zugleich Lebenspunkte |
| Stärkeklasse | Bronze bis Diamond, nach Punktesumme |
| Kartenseltenheit | normal bis Omega Rare, nach Holo, Looks und Effekten |
| Look | Optik-Eigenschaft: Holo-Stufe oder Zusatzlook |
| Holo-Stufe | Reverse Holo, Holo oder Secret Holo, höchstens eine |
| Zusatzlook | gespiegelt (horizontal, vertikal), invertiert, Glitch, Fehldruck |
| Spezialeffekt | Fester Effekt auf der Karte, nur durch Ziehen erhältlich |
| Blitzeffekt | Effekt, der sofort statt im nächsten Zug wirkt |
| Staub | Währung für Looks, eine Sorte pro Look |
| Pity | Mechanismus, der Effektkarten garantiert nach 200 Packs |
| Beschwörung | Karte aufs Feld bringen, kostet Punkte |
| Auto-Öffnen | Packs automatisch gegen Münzen öffnen |

---

## 18. Hinweise für die Umsetzung

### 18.1 Formeln (gesetzt)

Faktor des Angreifers $A$ gegen den Verteidiger $V$ mit $d = (\mathrm{pos}(A) - \mathrm{pos}(V)) \bmod 32$ (Richtung nach Annahme aus 4.5):

Mit der Menge $D = \{2, 3, 5, 7, 11, 13\}$:

$$
f(d) =
\begin{cases}
2{,}5 & d = 16 \\
s(d) & d \in D \\
1 / s(32 - d) & 32 - d \in D \\
1 & \text{sonst}
\end{cases}
$$

mit $s(2)=1{,}1$, $s(3)=1{,}2$, $s(5)=1{,}4$, $s(7)=1{,}6$, $s(11)=1{,}8$, $s(13)=2{,}0$. Für $d = 0$ und alle Abstände, die keine Primzahl sind, ergibt sich $f = 1$.

Schaden:

$$
S = \frac{E \cdot f}{P + 1}
$$

mit Elementarkraft $E$ und Elementarschutz $P$.

Stärke und Kosten:

$$
\text{Stärke} = \sum_i a_i, \qquad \text{Kosten} = \text{Stärke} \cdot \prod_j c_j
$$

mit Attributpunkten $a_i$ und Preisfaktoren $c_j$ der Effekte.

Pity (Chance pro Karte im $n$-ten Pack seit der letzten Effektkarte, das erste Pack danach hat $n = 1$):

$$
p(n) =
\begin{cases}
0{,}001 & n \le 100 \\
\min\left(1,\ 0{,}001 \cdot 2^{(n-100)/25}\right) & 100 < n < 200 \\
1 & n \ge 200
\end{cases}
$$

Pack-Chance aus Kartenchance $p$: $P_\text{Pack} = 1 - (1-p)^{10}$.

### 18.2 Datenmodell (Entwurf)

```json
{
  "karte": {
    "id": "string",
    "monster": "string",
    "element": 0,
    "klasse": "bronze | silber | gold | platin | emerald | ruby | saphire | diamond",
    "attribute": {
      "elementarkraft": 0, "elementarschutz": 0, "groesse": 0, "wildheit": 0,
      "seltsamkeit": 0, "schlagzahl": 0, "teamplatz": 0, "teamkapazitaet": 0
    },
    "holo": "keins | reverse | holo | secret",
    "looks": { "spiegel_h": false, "spiegel_v": false, "invertiert": false, "glitch": false, "fehldruck": false },
    "effekte": ["id", "id", "id"],
    "seltenheit": 1
  }
}
```

- Der Stapel in der Sammlung ist die Karte, die Ausführung ist (holo, looks).
- Staub: pro Look ein Zähler (5 Sorten).
- Pity-Zähler: pro Konto ein Zähler.

### 18.3 Zufallsablauf beim Öffnen

1. Pity-Zähler lesen, Chance für Effekte bestimmen.
2. Für jede der 10 Karten alle Würfe nach 10.2 ausführen und speichern.
3. Pity-Zähler anpassen (zurücksetzen, wenn eine Karte Effekte hat, sonst plus 1).
4. Erst danach Animation starten. Die Animation liest nur das Ergebnis.

### 18.4 Tests

- Verteilungstests mit mindestens 10 Mio. Karten: Holo-Chancen 1 % / 0,5 % / 0,1 % im Rahmen der Zufallsschwankung, jeder Zusatzlook 0,5 %, Effekte 0,1 % bei ausgeschaltetem Pity.
- Pity-Test: Kein Konto geht über 200 Packs ohne Effektkarte, der Mittelwert liegt bei etwa 78 Packs (Sollwert aus Simulation, Abweichung nur Zufall).
- Punktemodell-Test: Alle 4 Holo-Stufen mal 6 Lookzahlen (0 bis 5) mal 4 Effektzahlen ergeben genau die Stufen 1 bis 14, höchstens Omega bei SH+5+E3. Tabelle in 7.2 als Referenz.
- Faktor-Test: Alle 32 mal 32 Paare. Summe der Logarithmen über jedes Paar (A,V) und (V,A) gleich 0 für Primzahl-Abstände (Kehrwert), 2 mal ln 2,5 für den Gegenpol.
- Rad-Test: Es gibt genau 16 Gegenpolpaare, jedes Element kommt genau einmal vor, direkte Nachbarn sind neutral.
- Kampf-Tests: Schaden nie null bei Kraft größer 0, Aufteilen in ganzen Punkten, Größe verhindert freie Wahl.

### 18.5 Reihenfolge der Entwicklung

[VORSCHLAG] Stufenweise, jede Stufe spielbar:

1. Daten und Regeln als reine Logik mit Tests (Rad, Attribute, Zufall, Seltenheit, Pity). Konfigurationsdatei.
2. Pack-Öffnung mit Karten-Rendering (zuerst ohne Monsterkunst, Platzhalter), Animation und Sound.
3. Sammlung mit Stapeln, Staub und Looks.
4. Auto-Öffnen mit Münzen.
5. Kampf mit einfachen Gegnern.
6. Welten, Bosse, Belohnungen.
7. Politur: Holo-Shader, Sound, Zeitlupen, Feinschliff.

---

Ende des Manifests.
