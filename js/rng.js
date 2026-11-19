// Reproduzierbarer Zufall (sfc32). [VORSCHLAG 1.4] Seed per URL-Parameter ?seed=... zum Testen.

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export class Rng {
  constructor(seed) {
    const s = xmur3(String(seed));
    this.s = [s(), s(), s(), s()];
    for (let i = 0; i < 12; i++) this.next();
  }
  next() {
    let [a, b, c, d] = this.s;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.s[0] = a; this.s[1] = b; this.s[2] = c; this.s[3] = d;
    return (t >>> 0) / 4294967296;
  }
  int(min, max) { return min + Math.floor(this.next() * (max - min + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  weighted(entries) { // entries: [[wert, gewicht], ...]
    let sum = 0;
    for (const [, w] of entries) sum += w;
    let r = this.next() * sum;
    for (const [v, w] of entries) { if ((r -= w) < 0) return v; }
    return entries[entries.length - 1][0];
  }
  getState() { return this.s.slice(); }
  setState(s) { if (Array.isArray(s) && s.length === 4) this.s = s.map((x) => x | 0); }
}

export function zufallsSeed() {
  if (globalThis.crypto && crypto.getRandomValues) {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return a[0].toString(36) + a[1].toString(36);
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Kleine deterministische Zufallsquelle für Kunst und Namen (unabhängig vom Spielzufall)
export function seeded(seed) { return new Rng('kunst:' + seed); }
