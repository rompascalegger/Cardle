// Spezialeffekte. [FEST 9.4] alle 50 Ideen bleiben als Testmaterial.
// [Nutzer, 24.11.2026] Alle bestehenden Effekte sind stärker und haben Seltenheit 1. Neue Effekte (ab 55) skalieren mit
// ihrer Seltenheit 1–5 (bis ×5) und sind für kleine Kreaturen gedacht.
// [VORSCHLAG] Wirkungen und Preisfaktoren. blitz: wirkt sofort beim Beschwören.
// Nr. 51–53: [VORSCHLAG 9.5] Effekte für Spielerleben.
const E = (id, key, name, wirkung, faktor, extra = {}) => ({ id, key, name, wirkung, faktor, blitz: false, ...extra });
// Skalierende Effekte: Text hängt von der Stufe ab, Preisfaktor nur noch für die KI-Bewertung
const S = (id, key, name, text, extra = {}) => ({ id, key, name, wirkung: text(1), text, faktor: 2.0, skaliert: true, blitz: false, ...extra });

export const EFFEKTE = [
  E(1, 'verstaerker', 'Beschwörungsverstärker', 'Beschwörungspunkte pro Zug ×3.', 3.0),
  E(2, 'doppelrufer', 'Doppelrufer', 'Beschwörungspunkte pro Zug ×2, dazu +3.', 2.0),
  E(3, 'elementverstaerker', 'Elementverstärker', 'Alle eigenen Karten dieses Elements +2 Elementarkraft.', 1.5),
  E(4, 'elementschild', 'Elementschild', 'Alle eigenen Karten dieses Elements +2 Elementarschutz.', 1.5),
  E(5, 'nachbarschaft', 'Nachbarschaftsbonus', 'Eigene Karten auf den Nachbarfeldern im Rad +2 Elementarkraft.', 1.5),
  E(6, 'gegenpolbann', 'Gegenpolbann', 'Gegenpol-Treffer gegen deine Karten zählen nur ×1 statt ×2,5.', 2.0),
  E(7, 'erzfeindjaeger', 'Erzfeindjäger', 'Gegenpol-Angriffe deiner Karten zählen ×3,5 statt ×2,5.', 2.0),
  E(8, 'blitzruf', 'Blitzruf', 'Beschwört sofort kostenlos eine weitere Karte bis Stärke 8 aus der Hand.', 3.0, { blitz: true }),
  E(9, 'blitzschlag', 'Blitzschlag', 'Verursacht sofort 6 Schaden an einem Gegner.', 2.5, { blitz: true }),
  E(10, 'blitzheilung', 'Blitzheilung', 'Heilt sofort 10 Lebenspunkte bei einem Verbündeten.', 2.0, { blitz: true }),
  E(11, 'ruestung', 'Rüstung', 'Der Elementarschutz dieser Karte zählt +4.', 1.5),
  E(12, 'dornen', 'Dornen', 'Wer diese Karte trifft, nimmt 3 Schaden.', 1.3),
  E(13, 'regeneration', 'Regeneration', 'Heilt jeden Zug 3 Lebenspunkte.', 1.4),
  E(14, 'zweiteratem', 'Zweiter Atem', 'Stirbt die Karte, kehrt sie einmal mit halben Lebenspunkten zurück.', 2.5),
  E(15, 'letzterwille', 'Letzter Wille', 'Beim Tod: Verbündete +4 Elementarkraft für zwei Züge.', 1.8),
  E(16, 'erinnerung', 'Erinnerung', 'Beim Tod: eine Karte aus der Hand wird kostenlos beschworen.', 2.0),
  E(17, 'rudelruf', 'Rudelruf', 'Eigene Karten gleichen Elements kosten 3 weniger.', 1.6),
  E(18, 'sammelrabatt', 'Sammelrabatt', 'Eigene Karten unter Stärke 10 kosten 2 weniger.', 2.0),
  E(19, 'schwergewicht', 'Schwergewicht', 'Eigene Karten ab Stärke 20 kosten 10 weniger.', 2.0),
  E(20, 'platzspender', 'Platzspender', 'Bringt 4 zusätzliche Teamplätze mit.', 1.5),
  E(21, 'platzfresser', 'Platzfresser', 'Bringt 8 Teamplätze mit, belegt selbst aber 2 Plätze mehr.', 1.3),
  E(22, 'wildesherz', 'Wildes Herz', 'Wildheit zählt dreifach für den Angriff.', 1.5),
  E(23, 'seltsamewelt', 'Seltsame Welt', 'Seltsamkeit zählt dreifach.', 1.5),
  E(24, 'gigant', 'Gigant', 'Größe zählt dreifach für die Lebenspunkte.', 1.6),
  E(25, 'schnellschlag', 'Schnellschlag', 'Schlagzahl +2.', 2.0),
  E(26, 'flaechenwirbel', 'Flächenwirbel', 'Treffer erwischen auch die Nachbarn des Ziels mit 75 % des Schadens.', 2.0),
  E(27, 'wahllos', 'Wahllos', 'Angriffe treffen ein zufälliges Ziel, dafür mit Faktor 2.', 1.3),
  E(28, 'durchdringen', 'Durchdringen', 'Ignoriert 4 Punkte Elementarschutz.', 1.8),
  E(29, 'zielsuche', 'Zielsuche', 'Wählt jedes Ziel frei, unabhängig von Wildheit, Größe und Tarnung. +1 Elementarkraft.', 1.8),
  E(30, 'koeder', 'Köder', 'Gegner, die frei wählen, müssen diese Karte zuerst angreifen. +2 Elementarschutz.', 1.5),
  E(31, 'tarnung', 'Tarnung', 'Kann nicht frei gewählt werden, solange andere eigene Karten leben. +1 Elementarschutz.', 2.0),
  E(32, 'spiegel', 'Spiegel', 'Wirft den Schaden der ersten zwei Treffer pro Zug zurück.', 2.0),
  E(33, 'elementwandel', 'Elementwandel', 'Wechselt zu Beginn jedes Zuges das Element um 2 Felder im Uhrzeigersinn. +2 Elementarkraft.', 1.8),
  E(34, 'schwarzerwirbel', 'Schwarzer Wirbel', 'Effektivitätsfaktoren der Gegner gegen diese Karte −0,4.', 1.5),
  E(35, 'rueckseite', 'Rückseite', 'Zeigt dem Gegner ein falsches Element, bis die Karte angreift. Der erste Angriff zählt ×1,5.', 1.3),
  E(36, 'zweitesich', 'Zweites Ich', 'Kopiert den Effekt einer anderen eigenen Karte (kein Blitz).', 2.5),
  E(37, 'aufschub', 'Aufschub', 'Verschiebt die Effekte einer Gegnerkarte um zwei Züge.', 2.0),
  E(38, 'zauberbann', 'Zauberbann', 'Hebt pro Zug die Effekte von zwei Gegnerkarten auf.', 3.0),
  E(39, 'aufruester', 'Aufrüster', 'Eine andere eigene Karte bekommt +3 Elementarkraft.', 1.6),
  E(40, 'opferaltar', 'Opferaltar', 'Opfert die schwächste eigene Karte und beschwört kostenlos eine bis Stärke 10.', 2.0),
  E(41, 'zeitsprung', 'Zeitsprung', 'Effekte wirken sofort, und die Karte greift im Zug der Beschwörung mit +2 Elementarkraft an.', 2.5),
  E(42, 'fruehstart', 'Frühstart', 'Die Effekte wirken schon im Zug der Beschwörung. +1 Elementarkraft.', 2.0),
  E(43, 'nachbrenner', 'Nachbrenner', 'Die Effekte wirken nach dem Tod noch zwei Züge weiter.', 1.6),
  E(44, 'schwarmgeist', 'Schwarmgeist', '+2 Elementarkraft je weiterer eigener Karte dieses Elements, bis +6.', 1.8),
  E(45, 'einzelgaenger', 'Einzelgänger', 'Lebt nur diese eigene Karte: +6 Elementarkraft.', 1.5),
  E(46, 'schlussakt', 'Schlussakt', 'Lebt nur noch diese eigene Karte: Elementarkraft ×3.', 2.0),
  E(47, 'beutezug', 'Beutezug', 'Tötet die Karte einen Gegner, wird sofort eine Karte aus der Hand kostenlos beschworen.', 2.0),
  E(48, 'wachstum', 'Wachstum', 'Jeden Zug +2 Punkte auf zufällige Attribute, bis die Karte dreimal so stark ist.', 2.0),
  E(49, 'nebel', 'Nebel', 'Gegner sehen die Lebenspunkte deiner Karten nicht, bis sie angreifen.', 1.5),
  E(50, 'gleichgewicht', 'Gleichgewicht', 'Gegnerkarten mit Stärke über 20 verlieren 3 Elementarkraft.', 2.5),
  E(51, 'herzstueck', 'Herzstück', 'Maximale Spielerleben +2, solange die Karte lebt.', 4.0),
  E(52, 'lebenslicht', 'Lebenslicht', 'Beim Tod der Karte +2 Spielerleben.', 3.0),
  E(53, 'rettungsanker', 'Rettungsanker', 'Zweimal pro Kampf: Verlierst du ein Leben, bekommst du es zurück.', 3.5),
  // [Nutzer, 21.11.2026] nur für Bosse: die stärkste Karte eines Weltenbosses kehrt einmal mit vollen Lebenspunkten zurück
  E(54, 'auferstehung', 'Auferstehung', 'Stirbt diese Karte, kehrt sie einmal mit vollen Lebenspunkten zurück.', 3.0, { nurBoss: true }),
  // ---------- Neue, skalierende Effekte (Stufe n = Seltenheit 1–5) ----------
  S(55, 'bann', 'Bann', (n) => `Beim Eintritt kann die gegenüberliegende Karte ${n} ${n === 1 ? 'Zug' : 'Züge'} nicht angreifen.`, { blitz: true }),
  S(56, 'giftstachel', 'Giftstachel', (n) => `Getroffene Gegner sind vergiftet: ${n} Schaden zu Beginn der nächsten zwei Züge.`),
  S(57, 'flink', 'Flink', (n) => `${12 * n} % Chance, einem Treffer auszuweichen, bei Größe 0–1 doppelt so hoch.`),
  S(58, 'winzlingswut', 'Winzlingswut', (n) => `Bei Größe 0–1: +${2 * n} Elementarkraft.`),
  S(59, 'eintrittsstich', 'Eintrittsstich', (n) => `Beim Eintritt ${2 * n} Schaden an der gegenüberliegenden Karte (sonst am stärksten Gegner).`, { blitz: true }),
  S(60, 'schrumpfzauber', 'Schrumpfzauber', (n) => `Beim Eintritt verliert die gegenüberliegende Karte ${2 * n} Elementarkraft für zwei Züge.`, { blitz: true }),
  S(61, 'lebensraub', 'Lebensraub', (n) => `Heilt sich bei jedem Treffer um ${n} Lebenspunkte.`),
  S(62, 'rudelbiss', 'Rudelbiss', (n) => `+${n} Elementarkraft je weiterer eigener kleiner Karte (Größe 0–1), bis +${3 * n}.`),
  S(63, 'schutzgeist', 'Schutzgeist', (n) => `Beim Eintritt bekommen alle eigenen Karten +${n} Elementarschutz für zwei Züge.`, { blitz: true }),
];
export const PACK_EFFEKTE = EFFEKTE.filter((e) => !e.nurBoss);

export const EFFEKT = Object.fromEntries(EFFEKTE.map((e) => [e.id, e]));
export const EFFEKT_BY_KEY = Object.fromEntries(EFFEKTE.map((e) => [e.key, e]));

// Wirkungstext für eine Karte: skalierende Effekte mit ihrer Stufe
export const effektText = (id, stufe = 1) => { const e = EFFEKT[id]; return e.skaliert ? e.text(stufe) : e.wirkung; };
