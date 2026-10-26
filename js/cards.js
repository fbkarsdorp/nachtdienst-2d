// cards.js: filing cards and envelopes, drawn in the house style of the archive. A card face is painted once into its
// own canvas (1000 × 600) and kept until something on it changes (a place filled in, a pencil note, a stain gone damp).
'use strict';

const CW = 1000, CH = 600;
let CHC = CH;   // the height of the card being painted: halves are shorter
function cardAspect(card) { return card && card.r && card.r.half && !card.fusedWith ? .4 : .6; }
const _faces = new Map();
function faceCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * RS); cv.height = Math.ceil(h * RS); const c = cv.getContext('2d'); c.scale(RS, RS); return { cv, c }; }

// text sized to fit a box: the largest size from `max` down whose wrapped lines fit
function fitText(text, w, h, max, min, font, lh = 1.36) {
  for (let s = max; s >= min; s -= 1) {
    const lines = wrapLines(text, w, `${s}px ${font}`);
    if (lines.length * s * lh <= h) return { size: s, lines, lh: s * lh };
  }
  const lines = wrapLines(text, w, `${min}px ${font}`), keep = Math.floor(h / (min * lh));
  return { size: min, lines: lines.slice(0, keep).concat(lines.length > keep ? ['…'] : []), lh: min * lh };
}
function cardSeed(key) { return strHash(key) % 9973; }

// the paper of a card, with its lines; grey stock for the archive, cream for tonight's
function cardPaper(key, o = {}) {
  const tone = o.grey ? '#D9D5C9' : o.tone || PAL.card;
  C.drawImage(paperSheet(CW, CHC, tone, cardSeed(key), o.grey ? .8 : .45), 0, 0, CW, CHC);
  if (!o.plain) {
    C.globalAlpha = .55; C.strokeStyle = PAL.rule; C.lineWidth = 1.4;
    for (let y = o.bottomHalf ? 74 : o.firstLine || 150; y < CHC - 30; y += 38) { C.beginPath(); C.moveTo(24, y); C.lineTo(CW - 24, y + (cardSeed(key) % 3 - 1) * .5); C.stroke(); }
    C.globalAlpha = .8; C.strokeStyle = '#C44A44'; C.lineWidth = 2;
    if (!o.bottomHalf) { C.beginPath(); C.moveTo(20, 104); C.lineTo(CW - 20, 103); C.stroke(); }
    C.globalAlpha = 1;
  }
}
function tornEdge(top, key) {
  // cut the card along a ragged line: keep above (top half) or below (bottom half)
  const pts = []; let s = cardSeed(key) + 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const yb = top ? CHC - 34 : 34;
  for (let x = -5; x <= CW + 5; x += 14) pts.push([x, yb + (rnd() - .5) * 22]);
  C.save(); C.globalCompositeOperation = 'destination-in'; C.beginPath();
  if (top) { C.moveTo(-5, -5); C.lineTo(CW + 5, -5); for (let i = pts.length - 1; i >= 0; i--) C.lineTo(pts[i][0], pts[i][1]); }
  else { C.moveTo(-5, CHC + 5); C.lineTo(CW + 5, CHC + 5); for (let i = pts.length - 1; i >= 0; i--) C.lineTo(pts[i][0], pts[i][1]); }
  C.closePath(); C.fill(); C.restore();
  // fibres along the tear
  C.save(); C.strokeStyle = 'rgba(255,250,235,.9)'; C.lineWidth = 3; C.beginPath(); pts.forEach(([x, y], i) => i ? C.lineTo(x, y) : C.moveTo(x, y)); C.stroke(); C.restore();
}
function coffeeStain(x, y, r, seed) {
  let s = seed + 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  C.save();
  for (let i = 0; i < 4; i++) { C.globalAlpha = .22; C.fillStyle = i % 2 ? '#8A5A2B' : '#A8743E'; C.beginPath(); C.ellipse(x + (rnd() - .5) * 10, y + (rnd() - .5) * 8, r * (.85 + rnd() * .3), r * (.6 + rnd() * .2), rnd(), 0, TAU); C.fill(); }
  C.globalAlpha = .85; C.fillStyle = '#7A4A22'; C.beginPath(); C.ellipse(x, y, r * .82, r * .55, .1, 0, TAU); C.fill();
  C.globalAlpha = .6; C.strokeStyle = '#4E2C12'; C.lineWidth = 3.5; C.beginPath(); C.ellipse(x, y, r * 1.02, r * .68, .1, .3, TAU - .5); C.stroke();
  C.restore();
}
function violetStamp(x, y, num) {
  C.save(); C.translate(x, y); C.rotate(-.12); C.globalAlpha = .78;
  C.strokeStyle = PAL.stamp; C.fillStyle = PAL.stamp; C.lineWidth = 3;
  C.beginPath(); C.ellipse(0, 0, 92, 40, 0, 0, TAU); C.stroke();
  C.lineWidth = 1.2; C.beginPath(); C.ellipse(0, 0, 84, 33, 0, 0, TAU); C.stroke();
  C.font = `15px ${FONT.fellSC}`; C.textAlign = 'center'; C.fillText('VERHALENBANK', 0, -6);
  C.font = `20px ${FONT.type}`; C.fillText(String(num), 0, 18);
  C.restore();
}
function storyNumber(r) { const m = r && r.url && r.url.match(/(\d+)$/); return m ? m[1] : null; }

// pencil in J.D.'s hand, or another's
function pencilNote(txt, x, y, w, size = 30, o = {}) {
  const font = o.other ? FONT.jd : FONT.hand, col = o.col || (o.other ? '#3B3346' : '#4A4250');
  const lines = wrapLines(txt, w, `${size}px ${font}`);
  C.save(); C.translate(x, y); C.rotate(o.rot ?? -.025); C.globalAlpha = o.alpha ?? .92; C.fillStyle = col; C.font = `${o.weight || 600} ${size}px ${font}`;
  lines.forEach((l, i) => C.fillText(l, 0, i * size * (o.other ? 1.5 : 1.08)));
  C.restore();
  return lines.length * size * (o.other ? 1.5 : 1.08);
}

// ---------- a card's two sides ----------
// card = { key, r (render), role, notes: [{txt, other}], fill: {field: value}, damp, fusedWith (render of the bottom),
//          grey (archive), kind ('note' | 'desk' | 'five' | 'own') }
function cardTexts(card) {
  const r = card.r, hasOrig = r.original && r.original.trim(), frontIsOrig = r.front === 'original' && hasOrig;
  return { front: frontIsOrig ? r.original : r.description, back: hasOrig ? (frontIsOrig ? r.description : r.original) : null, frontIsOrig };
}
function paintCardFront(card) {
  const r = card.r, key = card.key;
  if (card.kind === 'note') return paintNoteCard(card);
  const half = r.half, fused = card.fusedWith;
  cardPaper(key, { grey: card.grey, tone: card.tone, bottomHalf: half === 'bottom' && !fused });
  // header: place (province), year; code in red pencil
  const place = card.fill && card.fill.place ? card.fill.place : r.place, filledPlace = card.fill && card.fill.place;
  if (half !== 'bottom') {
    if (place) {
      typedText(place.length > 34 ? place.slice(0, 33) + '.' : place, 40, 80, 34, '#26222B', { seed: 1 });
      if (r.prov) typedText(`(${r.prov})`, 48 + typedWidth(place.slice(0, 34), 34), 80, 24, '#4A4450', { seed: 2 });
      if (filledPlace) { C.save(); C.globalAlpha = .9; pencilLine([[36, 92], [44 + typedWidth(place, 34), 92]], 1.2, '#3a3540'); C.restore(); }
    } else if (!r.summary && card.kind !== 'five') {
      typedText('— — —', 40, 80, 34, '#26222B'); handText(tr('plaats?'), 228, 76, 28, '#7A6F86', { font: FONT.hand, rot: -.06, j: 0 });
    }
    const yr = card.kind === 'five' ? card.dateText : r.year;
    if (yr) typedText(String(yr), CW - 40 - typedWidth(String(yr), 30), 80, 30, '#26222B', { seed: 3 });
    if (r.code) handText(r.code, CW - 46, 136, 30, PAL.red, { font: FONT.hand, align: 'right', rot: -.03, j: 0, weight: 600 });
    else if (card.unclassed) handText(tr('nog niet ingedeeld'), CW - 46, 136, 26, '#8A7F92', { font: FONT.hand, align: 'right', rot: -.03, j: 0 });
  } else if (r.code) handText(r.code, CW - 46, 82, 30, PAL.red, { font: FONT.hand, align: 'right', rot: -.03, j: 0, weight: 600 });
  if (r.kind && card.kind !== 'five') handText(r.kind, 40, 136, 24, '#6A6070', { font: FONT.fell, j: 0 });
  // the telling
  let text = cardTexts(card).front || '';
  if (card.fill && card.fill.blank) text = text.replace('____', '\u0000');
  const nNotes = (card.notes || []).length, noteSpace = nNotes ? nNotes * 58 + 12 : 0;
  const top = half === 'bottom' ? 70 : 168, bottom = CHC - (fused ? 330 : half === 'top' ? 40 : half === 'bottom' ? 30 : 86) - noteSpace;
  const box = fitText(text, CW - 100, bottom - top, 27, 17, FONT.type);
  const stainWord = r.stain && !card.noStain ? r.stain : null;
  let stainAt = null;
  box.lines.forEach((ln, i) => {
    const y = top + i * box.lh + box.size;
    if (ln.includes('\u0000')) {   // the blank, filled in pencil
      const [a, b] = ln.split('\u0000');
      const wa = typedText(a, 50, y, box.size, '#26222B', { seed: i });
      C.font = `600 ${box.size * 1.3}px ${FONT.hand}`; const fw = C.measureText(card.fill.blank).width;
      handText(card.fill.blank, 50 + wa + 6, y, box.size * 1.3, '#3A3248', { font: FONT.hand, weight: 600, j: 0 });
      typedText(b, 50 + wa + fw + 14, y, box.size, '#26222B', { seed: i + 7 });
    } else typedText(ln, 50, y, box.size, '#26222B', { seed: i });
    if (stainWord && !stainAt) {
      const m = ln.toLowerCase().indexOf(stainWord.toLowerCase());
      if (m >= 0) stainAt = [50 + typedWidth(ln.slice(0, m), box.size) + typedWidth(stainWord, box.size) / 2, y - box.size * .35];
    }
  });
  if (stainWord) { const [sx, sy] = stainAt || [CW * .6, top + 60]; coffeeStain(sx, sy, Math.max(46, typedWidth(stainWord, box.size) * .75), cardSeed(key)); }
  // the bottom half of a fused card, below its tear
  if (fused) {
    C.save(); C.strokeStyle = 'rgba(110,90,70,.55)'; C.lineWidth = 2; C.setLineDash([3, 5]);
    C.beginPath(); C.moveTo(24, CHC - 316); for (let x = 24; x < CW - 24; x += 20) C.lineTo(x, CHC - 316 + Math.sin(x * .7) * 5); C.stroke(); C.restore();
    const fb = fitText(fused.description, CW - 100, 230, 24, 15, FONT.type);
    fb.lines.forEach((ln, i) => typedText(ln, 50, CHC - 290 + i * fb.lh + fb.size, fb.size, '#26222B', { seed: 40 + i }));
    if (fused.stain && !card.noStain) coffeeStain(CW * .55, CHC - 220, 60, cardSeed(key) + 5);
  }
  // footer: who wrote it down; the archive's stamp
  if (!half || fused) {
    const lift = 0;
    C.save(); C.translate(0, -lift);
    const who = r.teller ? tr('Verteller: {who}', { who: r.teller }) : r.initials ? tr('opgetekend door {who}', { who: r.initials }) : '';
    if (who) handText(who, 44, CHC - 36, 21, '#5A5262', { font: FONT.type, j: 0 });
    const num = storyNumber(r); if (num) violetStamp(CW - 140, CHC - 66, num);
    C.restore();
  }
  if (half === 'top' && !fused) tornEdge(true, key);
  if (half === 'bottom' && !fused) tornEdge(false, key);
  if (card.damp) {
    C.save(); C.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 7; i++) { C.globalAlpha = .12; C.fillStyle = '#7F95B8'; C.beginPath(); C.ellipse(hash(i * 3 + 1) * CW, hash(i * 7 + 2) * CHC, 120, 70, hash(i), 0, TAU); C.fill(); }
    C.restore();
  }
  if (card.crumpled) {
    // smoothed out again, the creases stay
    let cs = cardSeed(key) + 17; const rnd = () => (cs = (cs * 16807) % 2147483647) / 2147483647;
    C.save();
    for (let i = 0; i < 9; i++) {
      const x0 = rnd() * CW, y0 = rnd() * CHC, a = rnd() * TAU, l = 160 + rnd() * 360, x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l;
      C.globalAlpha = .22; C.strokeStyle = '#6E5E48'; C.lineWidth = 2.2; C.beginPath(); C.moveTo(x0, y0); C.lineTo(x1, y1); C.stroke();
      C.globalAlpha = .35; C.strokeStyle = '#FFF8E8'; C.lineWidth = 1.4; C.beginPath(); C.moveTo(x0 + 2, y0 + 2); C.lineTo(x1 + 2, y1 + 2); C.stroke();
    }
    C.globalCompositeOperation = 'multiply'; C.globalAlpha = .18;
    for (let i = 0; i < 6; i++) { C.fillStyle = '#8A7A60'; C.beginPath(); C.moveTo(rnd() * CW, rnd() * CHC); C.lineTo(rnd() * CW, rnd() * CHC); C.lineTo(rnd() * CW, rnd() * CHC); C.fill(); }
    C.restore();
  }
  if (card.grey) { C.save(); C.globalAlpha = .9; C.fillStyle = '#6C6878'; C.font = `18px ${FONT.fellSC}`; C.fillText(tr('ARCHIEF'), 44, 136); C.restore(); }
  // pencil notes, in the space kept for them under the text
  let ny = bottom + 44;
  for (const n of card.notes || []) { pencilNote(n.txt, n.other ? 380 : 60, ny, n.other ? 560 : 640, n.other ? 24 : 34, { other: n.other, rot: n.other ? .02 : -.015 }); ny += 58; }
}
function paintCardBack(card) {
  const r = card.r;
  cardPaper(card.key + 'b', { grey: card.grey, plain: true, tone: card.grey ? null : '#F3EAD3' });
  const back = cardTexts(card).back;
  if (back && r.half !== 'bottom') {
    if (r.lang) handText(r.lang, 44, 58, 22, '#6A6070', { font: FONT.fell, j: 0 });
    const box = fitText(back.replace(/\n+/g, '\n'), CW - 90, CHC - 130, 23, 13, FONT.type, 1.3);
    box.lines.forEach((ln, i) => typedText(ln, 46, 84 + i * box.lh + box.size * .7, box.size, '#2E2A35', { seed: 90 + i }));
  } else {
    const ini = r.initials || (card.kind === 'five' || card.kind === 'desk' ? 'J.D.' : '');
    if (ini) handText(ini, CW - 70, CHC - 60, 40, '#4A4250', { font: FONT.hand, align: 'right', weight: 600, j: 0, rot: -.04 });
  }
}
// J.D.'s note, the one on the spike
function paintNoteCard(card) {
  C.drawImage(paperSheet(CW, CHC, '#F4EEDC', 77, .4), 0, 0, CW, CHC);
  C.save(); C.globalAlpha = .4; C.strokeStyle = PAL.rule; C.lineWidth = 1.2;
  for (let y = 120; y < CHC; y += 46) { C.beginPath(); C.moveTo(0, y); C.lineTo(CW, y); C.stroke(); }
  C.restore();
  const lines = card.text.split('\n');
  lines.forEach((l, i) => handText(l, 90, 150 + i * 92, 64, '#3A3248', { font: FONT.hand, weight: 600, rot: -.02, j: 0 }));
  C.save(); C.fillStyle = '#2B2233'; C.globalAlpha = .9; C.beginPath(); C.ellipse(CW / 2, 40, 12, 12, 0, 0, TAU); C.fill(); C.restore();
}
// a face, cached by its key and a version string
function cardFace(card, back = false) {
  const id = `${card.key}|${back ? 'b' : 'f'}|${card.ver || ''}|${RS}`;
  let f = _faces.get(id);
  if (!f) {
    CHC = Math.round(CW * cardAspect(card));
    const { cv, c } = faceCanvas(CW, CHC);
    const keep = BOILN; BOILN = 4242;
    withCtx(c, () => { boilSeed(id); back ? paintCardBack(card) : paintCardFront(card); });
    BOILN = keep; CHC = CH;
    f = cv; _faces.set(id, f);
    if (_faces.size > 160) _faces.delete(_faces.keys().next().value);
  }
  return f;
}
// draw a card face at (x, y) scaled to width w, with a soft shadow; optional rotation about its centre
function drawCard(card, x, y, w, o = {}) {
  const h = w * cardAspect(card), cv = cardFace(card, o.back);
  C.save(); C.translate(x + w / 2, y + h / 2); if (o.rot) C.rotate(o.rot); if (o.sx !== undefined) C.scale(o.sx, 1);
  if (!o.noShadow) { C.save(); C.globalAlpha = .35 * (o.alpha ?? 1); C.fillStyle = '#120E16'; C.filter = 'blur(6px)'; C.fillRect(-w / 2 + 6, -h / 2 + 10, w, h); C.restore(); }
  C.globalAlpha = o.alpha ?? 1;
  C.drawImage(cv, -w / 2, -h / 2, w, h);
  C.restore(); C.globalAlpha = 1;
}

// ---------- the index tab of a card standing in the tray ----------
function tabLabel(card) {
  const r = card.r;
  if (card.kind === 'note') return { place: 'J.D.', year: '', code: '' };
  if (r.half === 'bottom') return { place: tr('onderste helft'), year: '', code: r.code || '' };
  if (r.summary) return { place: tr('samenvatting'), year: '', code: '' };
  const place = card.fill && card.fill.place ? card.fill.place : r.place || '— —';
  return { place, year: r.year || '', code: r.code || '' };
}

// ---------- the manila envelope ----------
const EW = 900, EH = 560;
function paintEnvelope(env) {
  // env = { id, label, note, count, have, sealed, filed, open, hints: [], found, other, unclassed }
  C.drawImage(paperSheet(EW, EH, env.filed ? '#CDB27C' : PAL.manila, strHash(env.id) % 97, .9), 0, 0, EW, EH);
  // the flap
  C.save(); C.globalAlpha = .9; C.strokeStyle = '#8A6A38'; C.lineWidth = 2.5;
  if (!env.open) { C.beginPath(); C.moveTo(10, 14); C.lineTo(EW / 2, 190); C.lineTo(EW - 10, 14); C.stroke(); C.fillStyle = 'rgba(120,90,40,.08)'; C.fill(); }
  else { C.beginPath(); C.moveTo(10, 14); C.lineTo(EW - 10, 14); C.stroke(); }
  C.restore();
  // the string clasp
  C.save(); C.fillStyle = '#7A5B30'; C.beginPath(); C.arc(EW / 2, env.open ? 40 : 170, 14, 0, TAU); C.fill(); C.restore();
  // the rubber stamp
  C.save(); C.translate(70, env.open ? 120 : 250); C.rotate(-.04); C.globalAlpha = .82;
  C.strokeStyle = '#8E2F3A'; C.lineWidth = 3; C.strokeRect(-10, -44, 452, 62);
  C.fillStyle = '#8E2F3A'; C.font = `34px ${FONT.fellSC}`; C.fillText(tr('IN TE VOEGEN — la {id}', { id: env.id }), 4, 0);
  C.restore();
  // the count, live
  C.save(); C.translate(EW - 96, env.open ? 108 : 236); C.globalAlpha = .9;
  C.strokeStyle = '#3A3248'; C.lineWidth = 2.5; C.beginPath(); C.arc(0, 0, 44, 0, TAU); C.stroke();
  C.fillStyle = '#3A3248'; C.font = `600 ${env.have < env.count ? 38 : 52}px ${FONT.hand}`; C.textAlign = 'center';
  C.fillText(env.have < env.count ? `${env.have}/${env.count}` : String(env.count), 0, 16);
  if (env.sealed) { C.strokeStyle = PAL.red; C.lineWidth = 6; C.beginPath(); C.moveTo(-30, 2); C.lineTo(-8, 26); C.lineTo(38, -36); C.stroke(); }
  C.restore();
  // J.D.'s note, then whatever he added
  let y = env.open ? 220 : 340;
  const lines = [];
  if (env.note) lines.push({ txt: env.note });
  if (env.found) lines.push({ txt: env.found, other: env.foundOther });
  for (const h of env.hints || []) lines.push({ txt: h, hint: true });
  for (const l of lines) {
    const size = l.hint ? 34 : 42;
    y += pencilNote(l.txt, 48, y, EW - 100, size, { rot: l.hint ? -.012 : -.02, col: l.hint ? '#4F4660' : '#3A3248', other: l.other }) + 10;
    if (y > EH - 30) break;
  }
  if (env.other) pencilNote(env.other, EW - 330, EH - 40, 300, 22, { other: true, rot: .05 });
  if (env.filed) {
    C.save(); C.translate(EW / 2, EH / 2 + 30); C.rotate(-.18); C.globalAlpha = .75; C.strokeStyle = '#2F4E8C'; C.lineWidth = 6;
    C.strokeRect(-230, -56, 460, 100); C.fillStyle = '#2F4E8C'; C.font = `66px ${FONT.fellSC}`; C.textAlign = 'center'; C.fillText(tr('INGEVOEGD'), 0, 20); C.restore();
  }
}
function envelopeFace(env) {
  const id = `env|${env.id}|${env.ver}|${RS}`;
  let f = _faces.get(id);
  if (!f) { const { cv, c } = faceCanvas(EW, EH); withCtx(c, () => paintEnvelope(env)); f = cv; _faces.set(id, f); }
  return f;
}
