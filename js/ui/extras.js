// Mehr Dopamin [Nutzer, 26.11.2026]: Glücksrad, Login-Truhe, Quests, Goldene Stunde, Element-Sets (Darstellung)
import { CONFIG } from '../config.js';
import { ELEMENTE, glyphSVG, farbe } from '../elements.js';
import { S } from '../state.js';
import { Sound } from '../audio.js';
import { h, modal, toast, fmt, konfetti, anim, warte } from './dom.js';
import { radDrehen, radFelder, loginStand, loginAbholen, quests, questAbholen, questsOffen, questsNeuFertig, goldeneStunde, naechsteGoldeneStunde, setStand, setsPruefen, lohnText } from '../extras.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Glücksrad ----------
export function gluecksradZeigen(rang = 1) {
  const felder = radFelder(rang);
  const summe = felder.reduce((s, x) => s + x.gewicht, 0);
  // Segmente proportional zur Chance (ehrlich: der Jackpot ist schmal)
  let w = 0;
  const seg = felder.map((x) => { const von = (w / summe) * 360; w += x.gewicht; return { ...x, von, bis: (w / summe) * 360 }; });
  const R = 150, C = 160;
  const punkt = (a, r = R) => { const rad = ((a - 90) * Math.PI) / 180; return `${(C + Math.cos(rad) * r).toFixed(1)},${(C + Math.sin(rad) * r).toFixed(1)}`; };
  const svg = `<svg viewBox="0 0 320 320" class="rad-svg"><g class="rad-dreh">${seg.map((x, i) => {
    const gross = x.bis - x.von > 180 ? 1 : 0;
    const mitte = (x.von + x.bis) / 2;
    const lab = x.bis - x.von >= 14 ? `<text x="${punkt(mitte, R * 0.66).split(',')[0]}" y="${punkt(mitte, R * 0.66).split(',')[1]}" transform="rotate(${mitte} ${punkt(mitte, R * 0.66).replace(',', ' ')})" class="rad-text">${esc(x.text)}</text>` : '';
    return `<path d="M${C},${C} L${punkt(x.von)} A${R},${R} 0 ${gross} 1 ${punkt(x.bis)} Z" fill="${x.farbe}" class="rad-seg${x.typ === 'jackpot' ? ' jackpot' : ''}" data-i="${i}"/>${lab}`;
  }).join('')}<circle cx="${C}" cy="${C}" r="22" class="rad-mitte"/></g><path d="M${C - 14},4 L${C + 14},4 L${C},34 Z" class="rad-zeiger"/></svg>`;
  const ergebnis = h('div', { class: 'rad-ergebnis', html: '&nbsp;' });
  const box = h('div', { class: 'gluecksrad', html: svg });
  const chancen = h('details', { class: 'rad-chancen' }, h('summary', { text: 'Chancen' }), h('div', { html: seg.map((x) => `<div><i style="background:${x.farbe}"></i>${esc(x.text)} <b>${((x.gewicht / summe) * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %</b></div>`).join('') }));
  let gedreht = false;
  const m = modal({
    titel: '🎡 Glücksrad', klasse: 'rad-modal',
    inhalt: h('div', {}, box, ergebnis, chancen),
    knoepfe: [{ text: 'Drehen!', klasse: 'primaer rad-dreh-knopf', schliesst: false, aktion: () => { if (!gedreht) { gedreht = true; drehen(); } return false; } }],
  });
  const drehen = async () => {
    m.box.querySelector('.rad-dreh-knopf')?.setAttribute('disabled', '');
    const { index, feld } = radDrehen(rang);
    const s = seg[index];
    // Landepunkt im Segment; manchmal knapp neben dem Jackpot (Near Miss)
    const jp = seg.findIndex((x) => x.typ === 'jackpot');
    let ziel = s.von + (s.bis - s.von) * (0.2 + Math.random() * 0.6);
    if (feld.typ !== 'jackpot' && Math.random() < 0.35 && Math.abs(index - jp) === 1) ziel = index < jp ? s.bis - (s.bis - s.von) * 0.06 : s.von + (s.bis - s.von) * 0.06;
    const gesamt = 360 * 6 + (360 - ziel);
    const dreh = box.querySelector('.rad-dreh');
    const dauer = 5200, t0 = performance.now();
    let letztes = -1;
    await new Promise((fertig) => {
      const schritt = (t) => {
        const p = Math.min(1, (t - t0) / dauer);
        const e = 1 - (1 - p) ** 4; // stark abbremsen
        const winkel = gesamt * e;
        dreh.style.transform = `rotate(${winkel}deg)`;
        const unterZeiger = ((360 - (winkel % 360)) + 360) % 360;
        const i = seg.findIndex((x) => unterZeiger >= x.von && unterZeiger < x.bis);
        if (i !== letztes) { letztes = i; Sound.klick(); }
        if (p < 1) requestAnimationFrame(schritt); else fertig();
      };
      requestAnimationFrame(schritt);
    });
    const gross = feld.typ === 'jackpot' || feld.typ === 'gluecks';
    ergebnis.innerHTML = `${feld.typ === 'jackpot' ? '<b class="jackpot-wort">JACKPOT!</b><br>' : ''}Gewonnen: <b>${esc(lohnText(feld.lohn))}</b>`;
    ergebnis.classList.add('an', ...(gross ? ['gross'] : []));
    if (feld.typ === 'jackpot') { Sound.jackpot(9); konfetti(320); } else if (gross) { Sound.jackpot(6); konfetti(150); } else { Sound.muenze(); Sound.stufe(3); }
    box.querySelector(`.rad-seg[data-i="${index}"]`)?.classList.add('gewinn');
    const k = m.box.querySelector('.rad-dreh-knopf');
    if (k) { k.textContent = 'Super!'; k.removeAttribute('disabled'); k.onclick = () => m.zu(); }
  };
}

// ---------- Login-Truhe ----------
export function loginTruhePruefen() {
  const st = loginStand();
  if (st.offen) setTimeout(() => loginTruheZeigen(), 700);
}
export function loginTruheZeigen() {
  const st = loginStand();
  const tage = CONFIG.login.tage;
  const kalender = h('div', { class: 'login-tage' }, tage.map((l, i) => {
    const n = i + 1;
    const erledigt = st.offen ? n < st.tagImZyklus : n <= st.tagImZyklus;
    return h('div', { class: 'login-tag' + (n === st.tagImZyklus ? ' heute' : '') + (erledigt ? ' erledigt' : '') + (n === 7 ? ' gross' : ''), html: `<small>Tag ${n}</small><span>${n === 7 ? '🎁' : '📦'}</span><em>${esc(lohnText(l))}</em>` });
  }));
  const truhe = h('button', { class: 'login-truhe' + (st.offen ? '' : ' leer'), text: st.offen ? '🧰' : '✅', title: st.offen ? 'Antippen zum Öffnen' : 'Heute schon abgeholt' });
  const info = h('p', { class: 'login-info', html: st.offen ? `Login-Serie: <b>${st.serie}</b> ${st.serie === 1 ? 'Tag' : 'Tage'}. Tippe auf die Truhe!` : `Heute schon abgeholt. Serie: <b>${S.d.login?.serie || 0}</b> Tage. Morgen wartet Tag ${(st.tagImZyklus % tage.length) + 1}.` });
  const m = modal({ titel: '🧰 Tägliche Truhe', klasse: 'login-modal', inhalt: h('div', {}, truhe, info, kalender, h('p', { class: 'leise', text: `Jeden ${CONFIG.login.tage.length}. Tag gibt es die große Truhe, jeden 30. Tag zusätzlich ${lohnText(CONFIG.login.alle30)}. Ein ausgelassener Tag setzt die Serie zurück.` })) });
  truhe.addEventListener('click', async () => {
    if (!loginStand().offen) return;
    truhe.disabled = true;
    Sound.stufe(2);
    await anim(truhe, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg) scale(1.05)' }, { transform: 'rotate(12deg) scale(1.1)' }, { transform: 'rotate(-8deg) scale(1.15)' }, { transform: 'rotate(0) scale(1.25)' }], { duration: 700, easing: 'ease-in-out' });
    const r = loginAbholen();
    if (!r) return;
    truhe.textContent = '✨';
    const gross = r.tagImZyklus === 7 || r.serie % 30 === 0;
    Sound.jackpot(gross ? 7 : 3);
    konfetti(gross ? 220 : 90);
    info.innerHTML = `Tag ${r.tagImZyklus} · Serie <b>${r.serie}</b><br>Gewonnen: <b>${esc(lohnText(r.lohn))}</b>`;
    info.classList.add('gewonnen');
    kalender.querySelectorAll('.login-tag')[r.tagImZyklus - 1]?.classList.add('erledigt');
  });
  return m;
}

// ---------- Quests ----------
export function questsPanel(neuZeichnen) {
  const q = quests();
  const zeile = (art) => (x) => h('div', { class: 'quest' + (x.fertig ? ' fertig' : '') + (x.abgeholt ? ' abgeholt' : '') },
    h('div', { class: 'quest-text' }, h('b', { text: x.text }), h('small', { text: lohnText(x.lohn) })),
    h('div', { class: 'quest-balken' }, h('i', { style: `width:${Math.min(100, (x.stand / x.ziel) * 100)}%` })),
    h('span', { class: 'quest-stand', text: `${fmt(x.stand)}/${fmt(x.ziel)}` }),
    x.abgeholt ? h('span', { class: 'quest-ok', text: '✓' }) : h('button', { class: 'btn klein primaer', disabled: !x.fertig, text: 'Abholen', onclick: () => { const r = questAbholen(art, x.id); if (r) { Sound.jackpot(art === 'woche' ? 6 : 3); konfetti(art === 'woche' ? 160 : 70); toast(`Quest geschafft: ${esc(r.text)}<br><small>${esc(lohnText(r.lohn))}</small>`); neuZeichnen && neuZeichnen(); } } }));
  const bisMorgen = () => { const d = new Date(); const m = new Date(d); m.setHours(24, 0, 0, 0); const ms = m - d; return `${Math.floor(ms / 36e5)} h ${Math.floor((ms % 36e5) / 6e4)} min`; };
  return h('div', { class: 'panel erfolg-gruppe quests' },
    h('h3', { text: '📜 Quests' }),
    h('div', { class: 'quest-gruppe' }, h('h4', { html: `Heute <small class="leise">neue in ${bisMorgen()}</small>` }), ...q.tag.map(zeile('tag'))),
    h('div', { class: 'quest-gruppe' }, h('h4', { html: 'Diese Woche <small class="leise">neue am Montag</small>' }), ...q.woche.map(zeile('woche'))));
}

// ---------- Element-Sets ----------
export function setsPanel() {
  const kacheln = ELEMENTE.map((e, el) => {
    const st = setStand(el);
    return h('div', { class: 'set-kachel' + (st.fertig ? ' fertig' : ''), style: `--el:${farbe(el)}`, title: st.fertig ? `${e.name}: Set komplett, +${CONFIG.elementSet.bonusKraft} Elementarkraft im Kampf` : `${e.name}: ${st.gefunden}/${st.gesamt} Monster`,
      html: `<span class="set-glyph">${glyphSVG(el)}</span><b>${esc(e.name)}</b><small>${st.fertig ? '✓ Bonus aktiv' : `${st.gefunden}/${st.gesamt}`}</small><i class="set-balken"><i style="width:${(st.gefunden / st.gesamt) * 100}%"></i></i>` });
  });
  const fertig = ELEMENTE.filter((_, el) => setStand(el).fertig).length;
  return h('div', { class: 'panel erfolg-gruppe sets' },
    h('h3', { html: `🧩 Element-Sets <small class="leise">${fertig}/${ELEMENTE.length} komplett</small>` }),
    h('p', { class: 'leise', text: `Finde alle ${setStand(0).gesamt} Monster eines Elements: Du bekommst ${lohnText(CONFIG.elementSet.lohn)} und deine Karten dieses Elements haben dauerhaft +${CONFIG.elementSet.bonusKraft} Elementarkraft im Kampf.` }),
    h('div', { class: 'set-raster' }, kacheln));
}
export function setFeier(neu) {
  neu.forEach((el, i) => setTimeout(() => {
    Sound.jackpot(8); konfetti(260, [farbe(el), '#ffd447', '#fff']);
    modal({ titel: `🧩 ${esc(ELEMENTE[el].name)}-Set komplett!`, klasse: 'set-feier', inhalt: h('div', { html: `<div class="set-feier-glyph" style="--el:${farbe(el)}">${glyphSVG(el)}</div><p>Du hast alle Monster des Elements <b>${esc(ELEMENTE[el].name)}</b> gefunden!</p><p>Belohnung: <b>${esc(lohnText({ ...CONFIG.elementSet.lohn, el }))}</b></p><p>Dauerhaft: <b>+${CONFIG.elementSet.bonusKraft} Elementarkraft</b> für deine ${esc(ELEMENTE[el].name)}-Karten im Kampf.</p>` }) });
  }, 400 + i * 1500));
}

// ---------- Goldene Stunde (Kopfleiste) ----------
export function goldChip() {
  const chip = h('button', { class: 'chip knopf gold-chip', onclick: () => {
    const g = goldeneStunde();
    const n = naechsteGoldeneStunde();
    toast(g.aktiv ? `✨ <b>Goldene Stunde!</b> Normale Packs haben alle seltenen Chancen ×${g.mult}, noch ${Math.ceil(g.endeMs / 6e4)} min.` : `Nächste Goldene Stunde: ${n ? n.toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'bald'}. Dann haben normale Packs alle seltenen Chancen ×${CONFIG.goldeneStunde.mult}.`);
  } });
  let warAktiv = null;
  const zeichne = () => {
    const g = goldeneStunde();
    chip.classList.toggle('aktiv', g.aktiv);
    if (g.aktiv) {
      const s = Math.floor(g.endeMs / 1000);
      chip.innerHTML = `✨ <b>×${g.mult}</b> <small>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</small>`;
      chip.dataset.tip = `Goldene Stunde: normale Packs mit allen seltenen Chancen ×${g.mult}`;
    } else {
      const n = naechsteGoldeneStunde();
      chip.innerHTML = `✨ <small>${n ? n.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '–'}</small>`;
      chip.dataset.tip = 'Nächste Goldene Stunde';
    }
    if (warAktiv === false && g.aktiv) { Sound.jackpot(5); toast(`✨ <b>Goldene Stunde!</b> Eine Stunde lang alle seltenen Chancen ×${g.mult} in normalen Packs.`, 'erfolg', 6000); }
    warAktiv = g.aktiv;
  };
  zeichne();
  setInterval(zeichne, 1000);
  return chip;
}

// ---------- Regelmäßige Meldungen ----------
export function extrasMelden() {
  const neueSets = setsPruefen();
  if (neueSets.length) setFeier(neueSets);
  for (const q of questsNeuFertig()) { Sound.stufe(4); toast(`📜 Quest erfüllt: <b>${esc(q.text)}</b><br><small>Abholen unter „Erfolge“</small>`, 'erfolg', 4000); }
}
export const offeneMeldungen = () => questsOffen();
