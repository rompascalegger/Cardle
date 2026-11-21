// Importierte Monster-Sprites. assets/monster/index.json listet vorhandene Bilder: { "dateien": { "<artId>": "007.webp?v=..." } }
// Fehlt ein Bild, zeichnet das Spiel die generierte Figur (monsterart.js).
export const SPRITE_ORDNER = new URL('../assets/monster/', import.meta.url).href;

let INDEX = {};

export async function ladeSprites() {
  try {
    const r = await fetch(SPRITE_ORDNER + 'index.json', { cache: 'no-cache' });
    if (r.ok) INDEX = (await r.json()).dateien || {};
  } catch { INDEX = {}; }
  return INDEX;
}

export const spriteUrl = (artId) => (INDEX[artId] ? SPRITE_ORDNER + INDEX[artId] : null);
export const spriteAnzahl = () => Object.keys(INDEX).length;
export const spriteIndex = () => INDEX;
