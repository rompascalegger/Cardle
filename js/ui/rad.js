// Elementrad zum Erkunden: Abstand ersetzt die Effektivitätstabelle. [FEST 4]
import { CONFIG } from '../config.js';
import { ELEMENTE, N, farbe, farbton, faktorInfo, faktorText, glyphSVG, GLYPHEN, gegenpol } from '../elements.js';
import { ATTRIBUTE, attrIcon } from '../attributes.js';
import { artenFuerElement } from '../species.js';
import { monsterBild } from '../monsterart.js';
import { esc } from '../cardview.js';
import { h } from './dom.js';
import { Sound } from '../audio.js';

let gewaehlt = 0;

export function radScreen(root) {
  const wrap = h('section', { class: 'screen rad' });
  const links = h('div', { class: 'rad-box' });
  const rechts = h('div', { class: 'panel rad-info' });
  wrap.append(links, rechts);
  root.append(wrap);

  const R = 300, r1 = 205, r2 = 285;
  const seg = (i) => {
    const a0 = ((i - 0.5) / N) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 0.5) / N) * Math.PI * 2 - Math.PI / 2;
    const p = (r, a) => `${(R + Math.cos(a) * r).toFixed(1)},${(R + Math.sin(a) * r).toFixed(1)}`;
    return `M${p(r1, a0)} L${p(r2, a0)} A${r2},${r2} 0 0 1 ${p(r2, a1)} L${p(r1, a1)} A${r1},${r1} 0 0 0 ${p(r1, a0)}Z`;
  };
  const zeichne = () => {
    let svg = `<svg viewBox="0 0 600 600" class="rad-svg" role="img" aria-label="Elementrad">`;
    svg += `<circle cx="300" cy="300" r="${r1 - 6}" fill="rgba(10,6,24,.75)" stroke="rgba(255,255,255,.08)"/>`;
    for (let i = 0; i < N; i++) {
      const info = faktorInfo(gewaehlt, i);
      const cls = i === gewaehlt ? 'ich' : info.art;
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const gx = R + Math.cos(a) * ((r1 + r2) / 2), gy = R + Math.sin(a) * ((r1 + r2) / 2);
      const tx = R + Math.cos(a) * (r2 + 14);
      const ty = R + Math.sin(a) * (r2 + 14);
      const rot = (a * 180) / Math.PI + (Math.cos(a) < 0 ? 180 : 0);
      svg += `<g class="seg ${cls}" data-i="${i}" style="--c:${farbe(i)}"><path d="${seg(i)}" fill="${farbe(i, 70, cls === 'neutral' || cls === 'gleich' ? 26 : 50)}"/>`;
      svg += `<g transform="translate(${(gx - 11).toFixed(1)} ${(gy - 11).toFixed(1)}) scale(.92)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPHEN[i]}</g>`;
      svg += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})" text-anchor="${Math.cos(a) < 0 ? 'end' : 'start'}" dominant-baseline="middle">${esc(ELEMENTE[i].name)}</text>`;
      if (i !== gewaehlt && info.art !== 'neutral') {
        svg += `<text class="fk" x="${(R + Math.cos(a) * (r1 - 22)).toFixed(1)}" y="${(R + Math.sin(a) * (r1 - 22)).toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${faktorText(info.f)}</text>`;
      }
      svg += '</g>';
    }
    const gp = gegenpol(gewaehlt);
    const a1 = (gewaehlt / N) * Math.PI * 2 - Math.PI / 2, a2 = (gp / N) * Math.PI * 2 - Math.PI / 2;
    svg += `<line x1="${R + Math.cos(a1) * (r1 - 40)}" y1="${R + Math.sin(a1) * (r1 - 40)}" x2="${R + Math.cos(a2) * (r1 - 40)}" y2="${R + Math.sin(a2) * (r1 - 40)}" stroke="#ff7af6" stroke-width="2" stroke-dasharray="6 6" opacity=".6"/>`;
    svg += `<circle cx="300" cy="300" r="62" fill="${farbe(gewaehlt, 70, 30)}" stroke="${farbe(gewaehlt)}" stroke-width="3"/>`;
    svg += `<g transform="translate(276 252) scale(2)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPHEN[gewaehlt]}</g>`;
    svg += `<text x="300" y="322" text-anchor="middle" class="mitte">${esc(ELEMENTE[gewaehlt].name)}</text></svg>`;
    links.innerHTML = svg;
    links.querySelectorAll('.seg').forEach((g) => g.addEventListener('click', () => { gewaehlt = Number(g.dataset.i); Sound.klick(); zeichne(); }));

    const stark = [], schwach = [];
    for (let v = 0; v < N; v++) { const i = faktorInfo(gewaehlt, v); if (i.art === 'stark') stark.push([v, i]); if (i.art === 'schwach') schwach.push([v, i]); }
    stark.sort((x, y) => y[1].f - x[1].f); schwach.sort((x, y) => x[1].f - y[1].f);
    const chip = ([v, i]) => `<span class="el-chip" style="--el:${farbe(v)}">${glyphSVG(v)}${esc(ELEMENTE[v].name)} <b>${faktorText(i.f)}</b><small>${i.d > 16 ? 32 - i.d : i.d}</small></span>`;
    const arten = artenFuerElement(gewaehlt);
    rechts.innerHTML = `<h2 style="color:${farbe(gewaehlt, 85, 70)}">${esc(ELEMENTE[gewaehlt].name)}</h2><p class="leise">${esc(ELEMENTE[gewaehlt].bed)} · Position ${gewaehlt}</p>
<div class="rad-arten">${arten.map((a) => `<img src="${monsterBild(a.id, false).fg}" alt="${esc(a.name)}" data-tip="${esc(a.name)}">`).join('')}</div>
<h4>Greift stark an</h4><div class="chips">${stark.map(chip).join('')}</div>
<h4>Greift schwach an</h4><div class="chips">${schwach.map(chip).join('')}</div>
<h4>Gegenpol (beidseitig ×${String(CONFIG.rad.gegenpolFaktor).replace('.', ',')})</h4><div class="chips">${chip([gp, faktorInfo(gewaehlt, gp)])}</div>
<details class="regeln"><summary>Regeln des Rads</summary>
<p>Direkte Nachbarn und alle Abstände ohne Primzahl sind neutral (×1). Die Primzahl-Abstände 2, 3, 5, 7, 11 und 13 geben in die eine Richtung ×1,1 bis ×2,0 und in die andere den Kehrwert. Der Gegenpol (16 Felder) gibt ×2,5 in beide Richtungen.</p>
<table class="ftab"><tr><th>Abstand</th>${[2, 3, 5, 7, 11, 13, 16].map((d) => `<td>${d}</td>`).join('')}</tr><tr><th>stark</th>${[1.1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5].map((f) => `<td>${faktorText(f)}</td>`).join('')}</tr><tr><th>schwach</th>${[1.1, 1.2, 1.4, 1.6, 1.8, 2.0].map((f) => `<td>${faktorText(1 / f)}</td>`).join('')}<td>×2,5</td></tr></table>
<p>Schaden = Elementarkraft × Faktor ÷ (Elementarschutz + 1).</p>
<div class="attr-legende">${ATTRIBUTE.map((a) => `<div>${attrIcon(a.key)}<b>${esc(a.name)}</b><span>${esc(a.info)}</span></div>`).join('')}</div>
</details>`;
  };
  zeichne();
  return {};
}
void farbton;
