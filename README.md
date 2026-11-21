# Cardle (Arbeitsname)

Monster-Sammelkartenspiel für playle.io: Booster-Packs öffnen, 32 Elemente auf einem Rad, Holo-Stufen, Zusatzlooks, Spezialeffekte, Auto-Öffnen, automatische Kämpfe mit Kampagne. Grundlage ist `MANIFEST.md`.

## Starten

Reines HTML, CSS und JavaScript (ES-Module), ohne Build-Schritt. Wegen der Module braucht es einen lokalen Server:

```bash
python tools/serve.py 8140
```

Dann `http://localhost:8140` öffnen. Der Server schickt `Cache-Control: no-store`, damit Änderungen sofort ankommen.

- `?seed=abc` startet einen getrennten, reproduzierbaren Test-Spielstand.
- `?debug` zeigt die Galerie (alle 640 Monster, Holo, Looks, Test-Zeremonien).
- `tools/tests.html` führt die Logik-Tests aus Manifest 18.4 aus.

## Monster-Bilder mit einem KI-Bildgenerator

Die 640 Monster sind zunächst prozedural gezeichnet. Eigene Bilder ersetzen sie Stück für Stück, der Element-Hintergrund der Karte bleibt.

1. `python tools/serve.py` starten und `http://localhost:8140/tools/werkstatt.html` öffnen.
2. Reiter **Prompts**: Stil-Text anpassen, dann `prompts.csv`, `prompts.txt` (ein Prompt pro Zeile) oder `prompts.json` exportieren. Fertige Listen liegen schon in `assets/monster/`. Jeder Prompt beschreibt Element, Bauplan, Entwicklungsstufe, Rolle, Farben, Augen, Ohren, Muster und Schwanz, passend zur generierten Vorschau.
3. Bilder erzeugen, am besten mit einer festen Stil-Referenz, auf weißem oder transparentem Hintergrund. Dateiname mit Nummer (`007.png`) oder Monstername. Lizenz des Generators für die kommerzielle Nutzung prüfen.
4. Reiter **Bilder importieren**: Dateien hineinziehen. Die Werkstatt stellt einfarbige Hintergründe frei, schneidet zu, setzt das Monster mit Schatten ins Kartenformat (880×640) und speichert es als `assets/monster/NNN.webp`. `assets/monster/index.json` wird dabei neu geschrieben.

Ohne `tools/serve.py` lädt die Werkstatt die Dateien herunter. Dann die Bilder nach `assets/monster/` legen und die Werkstatt einmal mit dem Server öffnen, damit `index.json` entsteht.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `js/config.js` | Alle Balancing-Werte mit Status [FEST], [ANNAHME], [VORSCHLAG], [OFFEN] |
| `js/elements.js` | Elementrad, Faktorfunktion, Glyphen |
| `js/rules.js` | Klassen, Seltenheits-Punktemodell, Kosten, Pity, Kartenkodierung |
| `js/generator.js` | Kartenwürfe und Pack-Öffnung (alles steht vor der Animation fest) |
| `js/species.js`, `js/monsterart.js` | 640 Monsterarten (20 je Element), prozedurale SVG-Kunst |
| `js/battle.js`, `js/campaign.js` | Kampf-Engine und Kampagne |
| `js/state.js` | Spielstand in IndexedDB (große Sammlungen), Sammlung, Staub, Team |
| `js/ui/*` | Bildschirme: Packs, Auto-Öffnen, Sammlung, Team, Kampagne/Kampf, Elementrad |

## Platzhalter und Hinweise

Alles mit [OFFEN] im Manifest ist als Platzhalter in `js/config.js` angelegt: Spielname, Monsternamen und Kunst, Attributsymbole, Münzquelle und Packpreise, Teamplatz-Formel, Zugablauf.

Beim Umsetzen aufgefallen:

- Die vorgeschlagenen Obergrenzen der Attribute ergeben zusammen 88 Punkte (78 ohne Teamkapazität). Diamond reicht laut Vorschlag bis 100. Solche Karten werden auf die Summe der Obergrenzen gedeckelt.
- „Im 200. Pack ist ein Effekt sicher“ ist so umgesetzt, dass eine Karte des Packs sicher Effekte bekommt (`pity.garantieModus`). Die wörtliche Formel (p = 1 pro Karte) gäbe allen 10 Karten Effekte.
