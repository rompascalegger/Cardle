// Die acht Attribute. [FEST 5.2] Namen und Bedeutung. [OFFEN 3/17] Symbole: Platzhalter.
export const ATTRIBUTE = [
  { key: 'kraft', name: 'Elementarkraft', info: 'Angriffskraft im eigenen Element. Die Faktoren des Rads wirken darauf.',
    icon: '<path d="M7 11.5V7.2a1.6 1.6 0 0 1 3.2 0V10M10.2 10V5.8a1.6 1.6 0 0 1 3.2 0V10M13.4 10V6.8a1.6 1.6 0 0 1 3.2 0V11M16.6 11V9.2a1.6 1.6 0 0 1 3.2 0V14a7 7 0 0 1-7 7h-1.3A6.5 6.5 0 0 1 5 14.5v-1.8A2.2 2.2 0 0 1 7.2 10.5H10a2 2 0 0 1 0 4H8"/>' },
  { key: 'schutz', name: 'Elementarschutz', info: 'Teilt erlittenen Schaden durch (Schutz + 1).',
    icon: '<path d="M12 2.5l8 3v6.2c0 5-3.5 8.3-8 9.8-4.5-1.5-8-4.8-8-9.8V5.5z"/><path d="M12 6v12"/>' },
  { key: 'groesse', name: 'Größe', info: 'Nur Angreifer mit Wildheit ≥ Größe dürfen dieses Ziel frei wählen.',
    icon: '<path d="M12 2.5v19M7.5 7L12 2.5 16.5 7M7.5 17l4.5 4.5 4.5-4.5"/>' },
  { key: 'wildheit', name: 'Wildheit', info: '0: nur das Gegenüber. 1: Ziel frei wählen. n ≥ 2: Angriff auf n Ziele aufteilen.',
    icon: '<path d="M5.5 3.5c2.3 5 2.3 11.5-1 17M11 2.5c2.3 6 2.3 12.5-1 19M16.5 3.5c2.3 5 2.3 11.5-1 17"/>' },
  { key: 'seltsamkeit', name: 'Seltsamkeit', info: 'Verschiebt das Element pro Zug. Schritt Richtung Schwäche kostet 2, sonst 1.',
    icon: '<path d="M12 12a1.2 1.2 0 1 1 2.4 0 3.4 3.4 0 1 1-6.8 0 5.6 5.6 0 1 1 11.2 0 7.8 7.8 0 1 1-15.6 0"/>' },
  { key: 'schlagzahl', name: 'Schlagzahl', info: 'Angriffe pro Zug, jeder auf einen anderen Gegner.',
    icon: '<path d="M4.5 5l7 7-7 7M12 5l7 7-7 7"/>' },
  { key: 'teamplatz', name: 'Teamplatz', info: 'Angriffsmultiplikator, belegt entsprechend viel Platz im Team.',
    icon: '<path d="M5.5 21h13M7 21v-3h10v3M8.3 18l1-7.5h5.4l1 7.5M6.5 10.5V5h2.2v2h2.2V5h2.2v2h2.2V5h2.2v5.5z"/>' },
  // [Nutzer, 21.11.2026] Heilung: zu Beginn jedes Kampfes einer Runde so viele Lebenspunkte, verteilt auf das eigene Team
  { key: 'heilung', name: 'Heilung', info: 'Heilt in jeder Runde so viele Lebenspunkte, verteilt auf die am stärksten verletzten Verbündeten.',
    icon: '<path d="M12 20.5s-7.5-4.8-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.4-7.5 10.2-7.5 10.2z"/><path d="M12 10.5v6M9 13.5h6"/>' },
  { key: 'kapazitaet', name: 'Teamkapazität', info: 'Optional. Bringt dem Team zusätzliche Plätze mit.',
    icon: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 20.5c0-4 2.8-6.5 6.2-6.5s6.2 2.5 6.2 6.5"/><path d="M19 7.5v7M15.5 11h7"/>' },
];

export const ATTR_KEYS = ATTRIBUTE.map((a) => a.key);
export const ATTR = Object.fromEntries(ATTRIBUTE.map((a) => [a.key, a]));

export function attrIcon(key, cls = '') {
  return `<svg class="aicon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ATTR[key].icon}</svg>`;
}

export function leereAttribute() {
  return { kraft: 0, schutz: 0, groesse: 0, wildheit: 0, seltsamkeit: 0, schlagzahl: 0, teamplatz: 0, heilung: 0, kapazitaet: 0 };
}
