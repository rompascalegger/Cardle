// Soundeffekte, komplett mit Web Audio erzeugt. [VORSCHLAG 13.5] dezent, mit Lautstärke und Stumm.
let ctx = null, master = null, hall = null, rauschPuffer = null;
let lautstaerke = 0.45, stumm = false;
let letzterTick = 0;

export function einstellen(v, s) {
  lautstaerke = v; stumm = s;
  if (master) master.gain.setTargetAtTime(stumm ? 0 : lautstaerke, ctx.currentTime, 0.02);
}

function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = stumm ? 0 : lautstaerke;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  // Rauschpuffer
  rauschPuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = rauschPuffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // Hall aus abklingendem Rauschen
  hall = ctx.createConvolver();
  const len = ctx.sampleRate * 2.2;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  hall.buffer = ir;
  const hallGain = ctx.createGain(); hallGain.gain.value = 0.32;
  hall.connect(hallGain).connect(master);
  return true;
}
export function entsperren() { init(); }

const jetzt = () => ctx.currentTime;

function rauschen({ dauer = 0.2, typ = 'bandpass', f = 2000, f2 = null, q = 1, gain = 0.3, an = 0.005, t = 0, hallAnteil = 0, playbackRate = 1 }) {
  if (!init()) return;
  const t0 = jetzt() + t;
  const src = ctx.createBufferSource();
  src.buffer = rauschPuffer; src.playbackRate.value = playbackRate;
  const fil = ctx.createBiquadFilter(); fil.type = typ; fil.Q.value = q;
  fil.frequency.setValueAtTime(f, t0);
  if (f2) fil.frequency.exponentialRampToValueAtTime(f2, t0 + dauer);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + an);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  src.connect(fil).connect(g).connect(master);
  if (hallAnteil) { const h = ctx.createGain(); h.gain.value = hallAnteil; g.connect(h).connect(hall); }
  src.start(t0, Math.random() * 1.5, dauer + 0.05);
}

function ton({ f = 440, typ = 'sine', dauer = 0.3, gain = 0.2, an = 0.005, t = 0, f2 = null, hallAnteil = 0.3, detune = 0 }) {
  if (!init()) return;
  const t0 = jetzt() + t;
  const o = ctx.createOscillator(); o.type = typ; o.detune.value = detune;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dauer);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + an);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  o.connect(g).connect(master);
  if (hallAnteil) { const h = ctx.createGain(); h.gain.value = hallAnteil; g.connect(h).connect(hall); }
  o.start(t0); o.stop(t0 + dauer + 0.05);
}

// Pentatonisch-dur Leiter über 14 Stufen
const LEITER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
const freq = (halbton, basis = 261.63) => basis * 2 ** (halbton / 12);

export const Sound = {
  rascheln() { for (let i = 0; i < 5; i++) rauschen({ dauer: 0.07 + Math.random() * 0.06, f: 3000 + Math.random() * 3000, q: 0.8, gain: 0.08, t: i * 0.05 + Math.random() * 0.03 }); },
  knistern(staerke = 1) {
    if (!init()) return;
    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) rauschen({ dauer: 0.015 + Math.random() * 0.02, typ: 'highpass', f: 2500 + Math.random() * 4000, q: 0.7, gain: 0.06 + 0.08 * staerke * Math.random(), t: Math.random() * 0.03 });
  },
  reissen() {
    rauschen({ dauer: 0.42, typ: 'bandpass', f: 1800, f2: 5200, q: 0.9, gain: 0.32, an: 0.01 });
    for (let i = 0; i < 9; i++) rauschen({ dauer: 0.02, typ: 'highpass', f: 4000, gain: 0.12, t: i * 0.035 });
    ton({ f: 90, f2: 50, typ: 'sine', dauer: 0.25, gain: 0.12, hallAnteil: 0 });
  },
  schnipp(t = 0) { rauschen({ dauer: 0.04, typ: 'bandpass', f: 3200, q: 2, gain: 0.14, t }); ton({ f: 160, f2: 90, dauer: 0.06, gain: 0.05, t, hallAnteil: 0 }); },
  faechern(n = 10) { for (let i = 0; i < n; i++) this.schnipp(i * 0.045); },
  // Weiches Schwingen, mit der Seltenheit heller und länger
  wenden(stufe = 1) {
    const s = Math.min(14, stufe);
    rauschen({ dauer: 0.22 + s * 0.04, typ: 'bandpass', f: 500 + s * 120, f2: 1400 + s * 380, q: 1.2, gain: 0.13 + s * 0.008, an: 0.04, hallAnteil: 0.15 + s * 0.02 });
  },
  tick() {
    if (!init()) return;
    const n = performance.now();
    if (n - letzterTick < 28) return;
    letzterTick = n;
    ton({ f: 2400 + Math.random() * 300, typ: 'square', dauer: 0.012, gain: 0.025, hallAnteil: 0 });
  },
  einrasten(gut = false) {
    ton({ f: gut ? 880 : 220, typ: 'triangle', dauer: 0.09, gain: 0.08, hallAnteil: 0.05 });
    rauschen({ dauer: 0.03, typ: 'lowpass', f: 900, gain: 0.12 });
  },
  aufladen(dauer = 1, stufe = 3) {
    if (!init()) return;
    const t0 = jetzt();
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(180 + stufe * 55, t0 + dauer);
    const fil = ctx.createBiquadFilter(); fil.type = 'lowpass';
    fil.frequency.setValueAtTime(250, t0); fil.frequency.exponentialRampToValueAtTime(1400 + stufe * 220, t0 + dauer);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.04 + stufe * 0.006, t0 + dauer * 0.92); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer + 0.12);
    o.connect(fil).connect(g).connect(master); o.start(t0); o.stop(t0 + dauer + 0.2);
    rauschen({ dauer: dauer + 0.05, typ: 'bandpass', f: 400, f2: 4200, q: 1.4, gain: 0.04 + stufe * 0.006, an: dauer * 0.9 });
  },
  knapp() { ton({ f: 330, f2: 300, typ: 'sawtooth', dauer: 0.22, gain: 0.04, hallAnteil: 0.2 }); },
  // Steigende Tonleiter: 14 Stufen, 14 Töne, ab hohen Stufen Chor
  stufe(stufe = 1) {
    const s = Math.max(1, Math.min(14, stufe));
    const f = freq(LEITER[s - 1]);
    const voll = s >= 3, chor = s >= 7;
    ton({ f, typ: 'sine', dauer: 0.5 + s * 0.12, gain: 0.12 + s * 0.006, hallAnteil: 0.35 + s * 0.03 });
    if (voll) { ton({ f: f * 1.5, typ: 'triangle', dauer: 0.6 + s * 0.1, gain: 0.05, t: 0.04 }); ton({ f: f * 2, typ: 'sine', dauer: 0.8 + s * 0.1, gain: 0.04, t: 0.08 }); }
    if (s >= 5) for (let i = 0; i < 4; i++) ton({ f: f * 2 * 2 ** (LEITER[i] / 12), typ: 'sine', dauer: 0.25, gain: 0.03, t: 0.12 + i * 0.06 });
    if (chor) this.chor(f, s);
  },
  chor(f, s) {
    if (!init()) return;
    const t0 = jetzt();
    const dauer = 1.6 + (s - 7) * 0.35;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.06 + (s - 7) * 0.012, t0 + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    const formanten = [700, 1150, 2600];
    const bus = ctx.createGain(); bus.gain.value = 1;
    for (const ff of formanten) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = 6; bus.connect(b).connect(g); }
    for (const mult of [1, 1.25, 1.5, 2]) for (const det of [-9, 0, 8]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * mult / 2; o.detune.value = det;
      o.connect(bus); o.start(t0); o.stop(t0 + dauer + 0.1);
    }
    g.connect(master); const h = ctx.createGain(); h.gain.value = 0.8; g.connect(h).connect(hall);
  },
  look(key) {
    if (key === 'glitch') { for (let i = 0; i < 7; i++) ton({ f: 200 + Math.random() * 1800, typ: 'square', dauer: 0.03, gain: 0.04, t: i * 0.04, hallAnteil: 0 }); rauschen({ dauer: 0.25, typ: 'highpass', f: 5000, gain: 0.06 }); }
    else if (key === 'fehldruck') { rauschen({ dauer: 0.05, typ: 'lowpass', f: 700, gain: 0.25 }); rauschen({ dauer: 0.05, typ: 'lowpass', f: 600, gain: 0.2, t: 0.11 }); }
    else if (key === 'invertiert') { ton({ f: 196, typ: 'sine', dauer: 0.7, gain: 0.08, hallAnteil: 0.6 }); ton({ f: 293.7, typ: 'sine', dauer: 0.7, gain: 0.05, hallAnteil: 0.6, detune: 12 }); }
    else { rauschen({ dauer: 0.5, typ: 'bandpass', f: 1200, f2: 4800, q: 4, gain: 0.07, hallAnteil: 0.4 }); }
  },
  holo(h) {
    if (h === 'ghost') {
      // Geisterhaft: verstimmte Sinustöne mit langem Hall, ein leises Hauchen
      for (const [f, t] of [[392, 0], [415, 0.05], [587, 0.25], [554, 0.32], [784, 0.55]]) ton({ f, typ: 'sine', dauer: 1.6, gain: 0.05, t, hallAnteil: 0.9, detune: Math.random() * 20 - 10 });
      rauschen({ dauer: 1.4, typ: 'bandpass', f: 600, f2: 2400, q: 3, gain: 0.04, an: 0.5, hallAnteil: 0.8 });
      return;
    }
    const basis = h === 'secret' ? 784 : h === 'holo' ? 659 : 523;
    for (let i = 0; i < (h === 'secret' ? 8 : 5); i++) ton({ f: basis * 2 ** (LEITER[i] / 12), typ: 'sine', dauer: 0.4, gain: 0.05, t: i * 0.05, hallAnteil: 0.6 });
  },
  effekt() { ton({ f: 110, f2: 880, typ: 'sawtooth', dauer: 0.7, gain: 0.05, hallAnteil: 0.5 }); for (let i = 0; i < 6; i++) ton({ f: 1046 * 2 ** (LEITER[i] / 12), typ: 'triangle', dauer: 0.3, gain: 0.05, t: 0.3 + i * 0.07, hallAnteil: 0.6 }); },
  klasse(kl) { if (kl < 4) return; ton({ f: 140 + kl * 30, typ: 'triangle', dauer: 0.9, gain: 0.1, hallAnteil: 0.5 }); ton({ f: (140 + kl * 30) * 3.01, typ: 'sine', dauer: 1.2, gain: 0.04, hallAnteil: 0.6 }); },
  // Jackpot: Münzregen und aufsteigende Fanfare, länger und voller mit der Wucht
  jackpot(wucht = 4) {
    const n = Math.min(16, 4 + wucht * 2);
    for (let i = 0; i < n; i++) {
      ton({ f: 1318 + Math.random() * 600, typ: 'square', dauer: 0.06, gain: 0.025, t: i * 0.055, hallAnteil: 0.2 });
      ton({ f: 1975 + Math.random() * 400, typ: 'square', dauer: 0.08, gain: 0.02, t: i * 0.055 + 0.03, hallAnteil: 0.3 });
    }
    [0, 4, 7, 12, 16, 19, 24].slice(0, Math.min(7, wucht)).forEach((hton, i) => ton({ f: freq(hton, 392), typ: 'triangle', dauer: 0.5 + i * 0.05, gain: 0.07, t: 0.1 + i * 0.09, hallAnteil: 0.5 }));
    if (wucht >= 7) this.chor(523, Math.min(14, wucht + 3));
  },
  wumms() { ton({ f: 70, f2: 35, typ: 'sine', dauer: 0.6, gain: 0.3, hallAnteil: 0.2 }); rauschen({ dauer: 0.4, typ: 'lowpass', f: 400, gain: 0.25 }); },
  klick() { ton({ f: 1200, typ: 'triangle', dauer: 0.03, gain: 0.05, hallAnteil: 0 }); },
  muenze() { ton({ f: 1568, typ: 'square', dauer: 0.07, gain: 0.03, hallAnteil: 0.1 }); ton({ f: 2093, typ: 'square', dauer: 0.12, gain: 0.03, t: 0.06, hallAnteil: 0.2 }); },
  beschwoeren() { ton({ f: 220, f2: 660, typ: 'triangle', dauer: 0.35, gain: 0.08, hallAnteil: 0.4 }); rauschen({ dauer: 0.3, f: 800, f2: 3000, gain: 0.06 }); },
  treffer(f = 1) { rauschen({ dauer: 0.09, typ: 'lowpass', f: 1200 + f * 500, gain: 0.18 }); ton({ f: 160 * Math.min(2, f), f2: 80, typ: 'sine', dauer: 0.12, gain: 0.1, hallAnteil: 0 }); },
  tod() { rauschen({ dauer: 0.5, typ: 'bandpass', f: 1200, f2: 200, gain: 0.18, hallAnteil: 0.3 }); ton({ f: 300, f2: 90, typ: 'triangle', dauer: 0.5, gain: 0.07 }); },
  leben() { ton({ f: 220, f2: 110, typ: 'sawtooth', dauer: 0.5, gain: 0.07, hallAnteil: 0.3 }); },
  sieg() { [0, 4, 7, 12, 16].forEach((h, i) => ton({ f: freq(h), typ: 'triangle', dauer: 0.6, gain: 0.08, t: i * 0.1, hallAnteil: 0.5 })); },
  niederlage() { [7, 4, 0, -5].forEach((h, i) => ton({ f: freq(h, 220), typ: 'triangle', dauer: 0.5, gain: 0.07, t: i * 0.14, hallAnteil: 0.4 })); },
};
