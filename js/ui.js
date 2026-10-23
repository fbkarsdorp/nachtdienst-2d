// ui.js: what sits over the painting: paper tags to click, pencil notes that come and go, the strip with the hour and
// the four digits, the hand, the pointer's label, and the transitions between places (an iris, a brush wipe).
'use strict';

// ---------- a phone: a finger rather than a mouse, and a small screen ----------
// TOUCH follows the last pointer used; PHONE is a small stage (on a phone in landscape it is about 700 css px wide),
// where tags are drawn larger, their tap areas taller, and cards read closer.
let TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches, PHONE = false;
function checkPhone() { const st = document.getElementById('stage'); PHONE = !!st && st.clientWidth > 0 && st.clientWidth < 1000; LAYER_KEEP = PHONE || TOUCH ? 4000 : 30000; }
const GROW = () => PHONE ? 1.35 : 1;
const UI = {
  notes: [], tip: null, hover: null, mouse: [-500, -500], hits: [], down: null, cursor: 'default',
  // ---------- hit regions, rebuilt every frame by whatever is drawn ----------
  hit(h) { this.hits.push(h); return h; },
  find(x, y) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (h.disabled) continue;
      if (h.r && x >= h.r[0] && y >= h.r[1] && x <= h.r[0] + h.r[2] && y <= h.r[1] + h.r[3]) return h;
      if (h.c && Math.hypot(x - h.c[0], y - h.c[1]) <= h.c[2]) return h;
      if (h.poly && inPoly(x, y, h.poly)) return h;
    }
    return null;
  },
  // ---------- notes: a slip of paper in pencil, low in the middle ----------
  note(txt, o = {}) {
    if (!txt) return;
    const n = { txt, t: T, ms: o.ms ?? Math.max(2400, 900 + txt.length * 55), other: o.other, big: o.big, x: o.x, y: o.y };
    this.notes = this.notes.filter(m => m.txt !== txt).slice(-2); this.notes.push(n);
    if (!o.silent) SND.pencil();
  },
  drawNotes() {
    let y = 900;
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i], age = (T - n.t) * 1000; if (age > n.ms) { this.notes.splice(i, 1); continue; }
      const k = backOut(clamp(age / 260)), out = clamp((n.ms - age) / 300), size = n.big ? 46 : 38;
      const font = n.other ? FONT.jjv : FONT.hand, lines = wrapLines(n.txt, 900, `600 ${size}px ${font}`);
      const lh = size * (n.other ? 1.55 : 1.12), h = lines.length * lh + 34;
      C.font = `600 ${size}px ${font}`; const w = Math.min(980, Math.max(...lines.map(l => C.measureText(l).width)) + 70);
      const x = n.x ?? W / 2, yy = (n.y ?? y) - h;
      push(); translate(x, yy + h / 2 + (1 - k) * 40); rotate(-.012 + (strHash(n.txt) % 7 - 3) * .004); scale(lerp(.9, 1, k));
      C.globalAlpha = out;
      boilSeed('note' + n.txt);
      C.save(); C.fillStyle = 'rgba(10,6,14,.35)'; C.filter = 'blur(8px)'; C.fillRect(-w / 2 + 6, -h / 2 + 10, w, h); C.restore();
      paint(rectPts(-w / 2, -h / 2, w, h, 2), { wash: n.other ? '#E9E4DA' : '#F2EBD8', ink: PAL.ink, sw: .6, texK: .5 });
      lines.forEach((l, j) => handText(l, 0, -h / 2 + 17 + lh * (j + .78), size, n.other ? '#2E2838' : '#3A3248', { font, weight: 600, align: 'center', j: .3 }));
      pop(); C.globalAlpha = 1;
      if (!n.y) y = yy - 14;
    }
  },
  // ---------- a paper tag to click ----------
  button(label, x, y, o = {}) {
    const g = o.noGrow ? 1 : GROW(), size = (o.size || 30) * g;
    C.font = `600 ${size}px ${FONT.hand}`;
    const w = o.w ? o.w * g : C.measureText(label).width + 56 * g, h = o.h ? o.h * g : size * 1.6;
    if (o.left != null) x = o.left + w / 2;
    const hov = this.hover && this.hover.id === (o.id || label) && !o.disabled;
    const lift = hov ? -3 : 0;
    boilSeed('btn' + label);
    push(); translate(x, y + lift); rotate(o.rot ?? ((strHash(label) % 5) - 2) * .006);
    if (!o.flat) { C.save(); C.fillStyle = 'rgba(10,6,14,.3)'; C.fillRect(-w / 2 + 4, -h / 2 + 6, w, h); C.restore(); }
    const col = o.disabled ? '#BDB4A2' : hov ? (o.hot || '#FFF1C9') : (o.col || '#EFE5CC');
    paint([[-w / 2, -h / 2], [w / 2 - 14, -h / 2], [w / 2, -h / 2 + 12], [w / 2, h / 2], [-w / 2, h / 2]].map(([a, b]) => [a + jit(1), b + jit(1)]), { wash: col, ink: PAL.ink, sw: .7, texK: .4 });
    if (!o.noHole) paint(ellPts(w / 2 - 14, -h / 2 + 16, 4, 4, 8), { wash: '#4A4038', tex: 0, pool: 0, ink: null });
    handText(label, 0, size * .34, size, o.disabled ? '#7D7468' : '#2E2838', { font: FONT.hand, weight: 600, align: 'center', j: .3 });
    if (o.key && !TOUCH) handText(o.key, -w / 2 + 10, h / 2 - 8, 15, '#8A7F70', { font: FONT.type, j: 0 });
    pop();
    // on a phone a tag is tapped, not pointed at: its tap area is at least a fingertip tall (about 44 css px)
    const pad = PHONE ? Math.max(0, (124 - h) / 2) : 0;
    return this.hit({ id: o.id || label, r: [x - w / 2 - pad * .25, y - h / 2 - pad, w + pad * .5, h + 2 * pad], tip: o.tip, onClick: o.onClick, disabled: o.disabled, cursor: o.disabled ? 'not-allowed' : 'pointer' });
  },
  // ---------- the pointer's label ----------
  drawTip() {
    const h = this.hover; if (!h || !h.tip || this.dragging) return;
    const [mx, my] = this.mouse, txt = typeof h.tip === 'function' ? h.tip() : h.tip; if (!txt) return;
    C.font = `600 28px ${FONT.hand}`; const w = C.measureText(txt).width + 30;
    const x = clamp(mx + 22, 10, W - w - 10), y = clamp(my + 30, 10, H - 50);
    boilSeed('tip' + txt);
    paint(rectPts(x, y, w, 44, 1), { wash: '#F2EBD8', washOp: 235, ink: PAL.ink, sw: .45, texK: .3 });
    handText(txt, x + 15, y + 31, 28, '#3A3248', { font: FONT.hand, weight: 600, j: .2 });
  },
};
function inPoly(x, y, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------- the strip: the hour, and the four digits once they are known ----------
function drawStrip(G) {
  const S = G.S, digits = [1, 2, 3, 4].map(n => S.digits[n]), any = digits.some(d => d != null);
  boilSeed('strip');
  const w = any ? 520 : 190, x = W / 2 - w / 2, y = 12;
  C.save(); C.fillStyle = 'rgba(10,6,14,.3)'; C.fillRect(x + 4, y + 6, w, 54); C.restore();
  paint(rectPts(x, y, w, 54, 1.5), { wash: '#ECE3CB', washOp: 240, ink: PAL.ink, sw: .5, texK: .4 });
  typedText(hhmm(G.minutes()), x + 24, y + 38, 30, '#2E2838', { seed: 5 });
  if (any) {
    for (let i = 0; i < 4; i++) {
      const dx = x + 180 + i * 84;
      handText(ROMAN[i + 1], dx, y + 36, 22, '#7A6F86', { font: FONT.fellSC, j: 0 });
      const d = digits[i];
      if (d != null) handText(String(d), dx + 34, y + 42, 40, '#3A3248', { font: FONT.hand, weight: 600, j: .2 });
      else inkLine([[dx + 30, y + 40], [dx + 52, y + 40]], .5, '#9A90A0', 'inkfine', 0);
    }
  }
}

// ---------- what the hand holds ----------
function drawHand(G, x = W - 250, y = H - 190) {
  const h = G.S.hand; if (!h) return;
  boilSeed('hand');
  push(); translate(x, y); rotate(-.08 + Math.sin(T * 1.3) * .015);
  if (h.kind === 'env') {
    const env = G.envelopeView(h.id);
    C.save(); C.fillStyle = 'rgba(10,6,14,.35)'; C.fillRect(-100, -54, 220, 138); C.restore();
    C.drawImage(envelopeFace(env), -110, -64, 220, 137);
  } else {
    const card = G.cardView(h.key);
    drawCard(card, -110, -60, 220, {});
  }
  pop();
  return UI.hit({ id: 'hand', r: [x - 120, y - 70, 240, 150], tip: h.kind === 'env' ? 'In de hand: de envelop' : 'In de hand', onClick: () => G.clickHand() });
}

// ---------- transitions ----------
const TR = { kind: null, t0: 0, dur: .8, mid: null, done: false, at: [W / 2, H / 2] };
function transition(kind, mid, o = {}) {
  if (TR.kind && !TR.done) { mid && mid(); return; }
  Object.assign(TR, { kind, t0: T, dur: o.dur || (kind === 'wipe' ? 1.1 : .7), mid, done: false, fired: false, at: o.at || [W / 2, H / 2], col: o.col });
}
function drawTransition() {
  if (!TR.kind) return;
  const p = (T - TR.t0) / TR.dur;
  if (p >= .5 && !TR.fired) { TR.fired = true; TR.mid && TR.mid(); }
  if (p >= 1) { TR.kind = null; TR.done = true; return; }
  boilSeed('tr' + Math.floor(p * 12));
  if (TR.kind === 'iris') {
    const k = p < .5 ? 1 - easeIn(p * 2) : easeOut((p - .5) * 2), r = k * 1500;
    const [cx, cy] = p < .5 ? TR.at : [W / 2, H / 2];
    irisShape(ellPts(cx, cy, Math.max(2, r), Math.max(2, r), 40, Math.min(8, r * .05)), TR.col || '#16121C');
  } else if (TR.kind === 'fade') {
    C.globalAlpha = Math.sin(clamp(p) * Math.PI); C.fillStyle = TR.col || '#16121C'; C.fillRect(0, 0, W, H); C.globalAlpha = 1;
  } else brushWipe(p, TR.col);
}
function irisShape(pts, col) {
  C.save(); C.beginPath(); C.rect(-50, -50, W + 100, H + 100);
  C.moveTo(pts[0][0], pts[0][1]); for (let i = pts.length - 1; i >= 0; i--) C.lineTo(pts[i][0], pts[i][1]); C.closePath();
  C.fillStyle = col; C.fill('evenodd'); C.restore();
  brushStroke(pts.concat([pts[0]]), 2.2, '#0B080F', .9, { closed: true });
}
function brushWipe(p, cols = ['#2A2030', '#3A2C3E']) {
  if (p <= 0 || p >= 1) return;
  const [c1, c2] = cols || ['#2A2030', '#3A2C3E'], n = 5, bh = (H + 420) / n + 40;
  push(); translate(W / 2, H / 2); rotate(-.1); translate(-W / 2, -H / 2);
  for (let i = 0; i < n; i++) {
    const y0 = -230 + i * (H + 420) / n, d = [0, .14, .06, .18, .1][i];
    const q = p < .5 ? easeOut(clamp((p * 2 - d) / (1 - d))) : ease(clamp(((p - .5) * 2 - d) / (1 - d)));
    const x0 = p < .5 ? -300 : lerp(-300, W + 400, q), x1 = p < .5 ? lerp(-300, W + 400, q) : W + 400;
    if (x1 - x0 < 30) continue;
    const pts = [], rag = k => 40 + 50 * hash(i * 31 + k) + jit(12);
    for (let k = 0; k <= 8; k++) pts.push([lerp(x0, x1, k / 8), y0 + Math.sin(k * .9 + i) * 14 + jit(5)]);
    for (let k = 1; k < 9; k++) pts.push([x1 + rag(k) - 40, y0 + bh * k / 9]);
    for (let k = 8; k >= 0; k--) pts.push([lerp(x0, x1, k / 8), y0 + bh + Math.sin(k * .8 + i * 2) * 14 + jit(5)]);
    if (p >= .5) for (let k = 8; k > 0; k--) pts.push([x0 - rag(k + 20) + 40, y0 + bh * k / 9]);
    paint(pts, { wash: i % 2 ? c1 : c2, fill: i % 2 ? c2 : c1, fillOp: 70, bleed: .05, tex: .8, border: .6, layers: 2, ink: null });
  }
  pop();
}

// ---------- how it works: a card of J.J.V.'s instructions, in pencil ----------
// with a finger it is tapping, not clicking, and there are no keys to press
const helpLines = () => {
  const who = typeof WHO_ALL !== 'undefined' ? WHO_ALL[WHO].word : 'de assistent';
  return [
    `${TOUCH ? 'Tik' : 'Klik'} op iets in de kamer: ${who} loopt erheen.`,
    'Bij een kast: pak de envelop van de la die aan de beurt is. Hij gaat mee naar de leestafel.',
    `Op tafel: maak de envelop open, lees de kaarten (${TOUCH ? '“Omdraaien”' : 'F'} draait ze om), leg ze neer.`,
    'Wat op de envelop staat, is de opdracht. “Vraag J.J.V.” kost tijd op de klok.',
    'Een kaart kan mee in de hand, naar een kast, het raam, de deur, de machine.',
    'Gaat het slot open, dan gaat de envelop dicht: neem hem mee en voeg hem in zijn la in.',
    TOUCH ? 'De hand houdt één ding. “Terug”, linksboven: terug.' : 'De hand houdt één ding. Esc of de rechterknop: terug.',
  ];
};
const HELP = { on: false, t0: 0 };
function drawHelp() {
  if (!HELP.on) return;
  const k = backOut(clamp((T - HELP.t0) / .35));
  C.save(); C.fillStyle = `rgba(14,10,18,${.7 * clamp((T - HELP.t0) / .2)})`; C.fillRect(0, 0, W, H); C.restore();
  UI.hit({ r: [0, 0, W, H], cursor: 'pointer', tip: null, onClick: () => { HELP.on = false; }, keepBusy: true });
  push(); translate(W / 2, H / 2 + (1 - k) * 60); rotate(-.012);
  const w = 1180, h = 700;
  C.drawImage(paperSheet(w, h, '#F4EEDC', 91, .5), -w / 2, -h / 2, w, h);
  C.save(); C.globalAlpha = .45; C.strokeStyle = PAL.rule; C.lineWidth = 1.3;
  for (let y = -h / 2 + 150; y < h / 2 - 20; y += 64) { C.beginPath(); C.moveTo(-w / 2 + 20, y); C.lineTo(w / 2 - 20, y); C.stroke(); }
  C.restore();
  handText('Nachtdienst', -w / 2 + 60, -h / 2 + 96, 58, '#3A3248', { font: FONT.fell, j: 0 });
  handText('— zo gaat het —', -w / 2 + 380, -h / 2 + 96, 34, '#6A6070', { font: FONT.hand, j: 0 });
  let y = -h / 2 + 140;
  for (const l of helpLines()) y += pencilNote(l, -w / 2 + 60, y + 4, w - 120, 34, { rot: 0, col: '#3A3248' }) + 22;
  handText('J.J.V.', w / 2 - 80, h / 2 - 36, 40, '#3A3248', { font: FONT.hand, weight: 600, align: 'right', j: 0 });
  pop();
}
function helpToggle(on = !HELP.on) { HELP.on = on; HELP.t0 = T; SND.pencil(); }

// ---------- captions: what is heard, for whoever cannot hear it ----------
const CAPS = [];
function caption(txt, secs = 2.6) { if (CAPS.some(c => c.txt === txt && T - c.t < 1)) return; CAPS.push({ txt, t: T, secs }); if (CAPS.length > 3) CAPS.shift(); }
function drawCaptions() {
  let y = H - 34;
  for (let i = CAPS.length - 1; i >= 0; i--) {
    const c = CAPS[i], age = T - c.t; if (age > c.secs) { CAPS.splice(i, 1); continue; }
    const a = clamp(age / .2) * clamp((c.secs - age) / .4);
    handText(c.txt, 36, y, 26, `rgba(236,228,210,${.8 * a})`, { font: FONT.fell, j: 0, alpha: 1 });
    y -= 34;
  }
}
