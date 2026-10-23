// feast.js: the real calendar, let into the archive. The moon in the window is tonight's moon, and on a few nights of
// the year something is different: a hollowed pumpkin on the sill, lanterns along the quay, a shoe by the radiator,
// snow, fireworks, a black cat. Nothing here is a clue; it is just the night outside.
// To see a night early: ?date=12-05 (or ?date=2026-12-05).
'use strict';

const DAY = (() => {
  let d = new Date();
  const q = new URLSearchParams(location.search).get('date'), m = q && q.match(/^(?:(\d{4})-)?(\d{1,2})-(\d{1,2})$/);
  if (m) d = new Date(+(m[1] || d.getFullYear()), +m[2] - 1, +m[3], 22);
  return d;
})();
const FEAST = (() => {
  const md = (DAY.getMonth() + 1) * 100 + DAY.getDate();
  if (md === 1031) return 'halloween';
  if (md === 1111) return 'maarten';
  if (md >= 1114 && md <= 1204) return 'schoen';
  if (md === 1205 || md === 1206) return 'letter';
  if (md >= 1224 && md <= 1226) return 'kerst';
  if (md === 1231 || md === 101) return 'oudjaar';
  if (DAY.getDate() === 13 && DAY.getDay() === 5) return 'vrijdag13';
  return null;
})();
// the moon's age: 0 new, .5 full (from the new moon of 6 January 2000, a synodic month at a time)
const MOON = (() => {
  const syn = 29.530588853, p = (((DAY - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / syn) % 1 + 1) % 1;
  return { p, lit: (1 - Math.cos(p * TAU)) / 2, full: Math.abs(p - .5) < 1.2 / syn };
})();
// the lit part of the disc: the bright limb, then back along the terminator (right when waxing, left when waning)
function moonPts(cx, cy, r, p) {
  const side = p < .5 ? 1 : -1, t = Math.cos(p * TAU), P = [], n = 18;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI * i / n; P.push([cx + side * r * Math.cos(a), cy + r * Math.sin(a)]); }
  for (let i = 1; i < n; i++) { const a = Math.PI / 2 - Math.PI * i / n; P.push([cx + side * t * r * Math.cos(a), cy + r * Math.sin(a)]); }
  return P;
}
const flicker = (k = 0) => .82 + .1 * Math.sin(T * 11 + k) * Math.sin(T * 6.7 + k * 2) + .08 * Math.sin(T * 23 + k);

// ---------- the sill: a pumpkin at the end of October, a candle at Christmas ----------
const SILL_ITEM = FEAST === 'halloween' ? 'pumpkin' : FEAST === 'kerst' ? 'candle' : null;
const SILL_AT = { x: 1222, y: 642 };
const pumpkinFace = (x, y, s) => [
  [[x - 12 * s, y - 15 * s], [x - 4 * s, y - 15 * s], [x - 8 * s, y - 21 * s]],
  [[x + 4 * s, y - 15 * s], [x + 12 * s, y - 15 * s], [x + 8 * s, y - 21 * s]],
  [[x - 13 * s, y - 10 * s], [x - 8 * s, y - 7 * s], [x - 5 * s, y - 9 * s], [x - 2 * s, y - 5 * s], [x + 2 * s, y - 8 * s], [x + 6 * s, y - 5 * s], [x + 9 * s, y - 8 * s], [x + 13 * s, y - 10 * s], [x + 6 * s, y - 3 * s], [x - 6 * s, y - 3 * s]],
];
function paintSillItem(x, y, s) {
  if (SILL_ITEM === 'pumpkin') {
    boilSeed('pumpkin' + s);
    for (const [dx, rx, col] of [[-11, 12, '#C25A1C'], [11, 12, '#C25A1C'], [-5, 12, '#D86A22'], [5, 12, '#D86A22'], [0, 10, '#E57A2A']])
      paint(ellPts(x + dx * s, y - 13 * s, rx * s, 13 * s, 18), { wash: col, ink: PAL.ink, sw: .45 * s });
    paint([[x - 2 * s, y - 25 * s], [x + 2 * s, y - 25 * s], [x + 4 * s, y - 32 * s], [x, y - 33 * s]], { wash: '#5E6B2E', ink: PAL.ink, sw: .35 * s });
    for (const f of pumpkinFace(x, y, s)) paint(f, { wash: '#3A1A0A', tex: 0, ink: PAL.ink, sw: .3 * s });
  } else if (SILL_ITEM === 'candle') {
    boilSeed('candle' + s);
    // a sprig of holly, then the candle in its brass stick
    for (const [dx, a] of [[-16, -.5], [-24, .4]]) { push(); translate(x + dx * s, y - 3 * s); rotate(a); paint(ellPts(0, 0, 8 * s, 3.2 * s, 10), { wash: '#2F5A33', ink: PAL.ink, sw: .3 * s }); pop(); }
    for (const [dx, dy] of [[-19, -5], [-16, -7], [-21, -8]]) paint(ellPts(x + dx * s, y + dy * s, 1.8 * s, 1.8 * s, 8), { wash: '#B8282A', tex: 0, ink: null });
    paint(ellPts(x, y - 2 * s, 9 * s, 3 * s, 14), { wash: PAL.brass, ink: PAL.ink, sw: .35 * s });
    paint(rectPts(x - 3 * s, y - 30 * s, 6 * s, 27 * s, .3), { wash: '#F1E6CC', ink: PAL.ink, sw: .35 * s });
    inkLine([[x, y - 30 * s], [x, y - 33 * s]], .5 * s, PAL.ink, 'inkfine', 0);
  }
}
// what glows, drawn over the dark
function glowSillItem(x, y, s) {
  const f = flicker(x);
  if (SILL_ITEM === 'pumpkin') {
    C.save(); C.globalAlpha = .9 * f; C.fillStyle = '#FFC24D';
    for (const P of pumpkinFace(x, y, s)) { C.beginPath(); P.forEach(([px, py], i) => i ? C.lineTo(px, py) : C.moveTo(px, py)); C.closePath(); C.fill(); }
    C.restore();
    glow(x, y - 13 * s, 60 * s, '#FF9A3C', .5 * f);
  } else if (SILL_ITEM === 'candle') {
    const sway = Math.sin(T * 3.1) * .8 * s;
    C.save(); C.fillStyle = `rgba(255,214,130,${.9 * f})`; C.beginPath(); C.ellipse(x + sway * .5, y - 37 * s, 2.6 * s, 5 * s, sway * .05, 0, TAU); C.fill();
    C.fillStyle = 'rgba(255,250,230,.95)'; C.beginPath(); C.ellipse(x + sway * .3, y - 36 * s, 1.1 * s, 2.4 * s, 0, 0, TAU); C.fill(); C.restore();
    glow(x, y - 36 * s, 70 * s, '#FFC766', .55 * f);
  }
}
const sillSay = () => SILL_ITEM === 'pumpkin'
  ? 'Een uitgeholde pompoen. Halloween? Dat vieren ze in Amerika. Hier lopen de kinderen over elf dagen met lampionnen langs de deuren.'
  : WHO === 'cat' ? 'Om middernacht kunnen de dieren praten, zeggen ze. Ik zeg niks.'
  : WHO === 'clawd' ? 'Om middernacht kunnen de dieren praten, zeggen ze. Geldt dat ook voor mij?'
  : 'Een kaarsje voor de kerstnacht. Om middernacht kunnen de dieren praten, staat in het archief.';

// ---------- Sinterklaas: a shoe by the radiator, and then a letter in it ----------
const SHOE_AT = { x: 1340, y: 844 }, SHOE_K = 1.4;
const initial = () => { const c = ((G.S && G.S.name) || '').trim().charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : 'N'; };
function paintShoe() {
  if (FEAST !== 'schoen' && FEAST !== 'letter') return;
  const { x, y } = SHOE_AT;
  boilSeed('shoe');
  // heel to the right, so what is in it stands clear of the table's end (the letter is not mirrored with it)
  push(); translate(x, y); scale(SHOE_K, SHOE_K);
  // something sticking out of it first, so the shoe's mouth goes over it
  if (FEAST === 'schoen') {
    paint([[20, -20], [13, -21], [26, -52]], { wash: '#F08A34', ink: PAL.ink, sw: .4 });
    for (const a of [-.5, 0, .5]) inkLine([[25, -50], [25 + Math.sin(a) * 9, -61 + Math.abs(a) * 4]], 1.4, '#5E9A3E', 'ink', .2);
  } else {
    // a chocolate letter, still in the bottom of its gold wrapper
    push(); translate(16, -19); rotate(.12);
    C.font = `700 46px ${FONT.fell}`; C.textAlign = 'center';
    C.fillStyle = '#3E2416'; C.fillText(initial(), 1.6, 1.6); C.fillStyle = '#7A4A2A'; C.fillText(initial(), 0, 0);
    C.fillStyle = 'rgba(255,225,190,.14)'; C.fillText(initial(), -1.2, -1.2);
    paint(rectPts(-17, -9, 34, 10, .3), { wash: '#D9A93C', tex: 0, ink: PAL.ink, sw: .35 });
    inkLine([[-15, -6], [15, -6]], .6, '#F6DE8A', 'inkfine', 0);
    pop();
  }
  scale(-1, 1);
  paint([[-27, 0], [27, 0], [30, -6], [20, -12], [4, -15], [-6, -23], [-25, -23], [-29, -10]], { wash: '#84492A', ink: PAL.ink, sw: .5 });
  paint(rectPts(-28, -3, 59, 4, .3), { wash: '#2A1A12', tex: 0, ink: null });
  paint(ellPts(-15, -22, 9, 2.5, 10), { wash: '#24140C', tex: 0, ink: null });
  inkLine([[-22, -17], [14, -9]], .6, 'rgba(255,230,200,.35)', 'inkfine', 0);   // a shine along the toe
  for (let i = 0; i < 3; i++) inkLine([[-3 + i * 5, -15 + i * 1.2], [2 + i * 5, -12 + i * 1.2]], .5, '#E8D9B8', 'inkfine', 0);
  pop();
}
const SINT_RHYME = 'De Sint kwam langs, het was al laat, en zag een licht dat nooit uitgaat. Hij liet een letter voor je staan: voor wie de nachtdienst durft te gaan. — de Sint';
function shoeSay() {
  if (FEAST === 'letter') { G.say(SINT_RHYME, { other: true, ms: 9500 }); G.clawd.mood.act('happy', 1.4); return; }
  G.say(WHO === 'cat' ? 'Een schoen, met een wortel erin. Mensen.' : 'Mijn schoen gezet, met een wortel voor het paard. Je weet maar nooit.');
}

// ---------- oud en nieuw: oliebollen on the table ----------
function paintOliebollen() {
  if (FEAST !== 'oudjaar') return;
  const x = 962, y = 857;
  boilSeed('oliebol');
  paint(ellPts(x, y, 32, 6, 20), { wash: '#ECE6DA', ink: PAL.ink, sw: .4 });
  for (const [dx, dy] of [[-14, -6], [13, -6], [-1, -8], [0, -17]]) {
    paint(ellPts(x + dx, y + dy, 10, 8, 14), { wash: '#94562A', ink: PAL.ink, sw: .35 });
    for (let i = 0; i < 6; i++) paint(ellPts(x + dx + (hash(dx * 7 + i) - .5) * 14, y + dy - 3 - hash(dy * 3 + i) * 4, 1.4, 1, 6), { wash: '#FAF6EE', tex: 0, pool: 0, ink: null });
  }
}

// ---------- outside: snow, fireworks, lanterns along the quay, a black cat on the ledge ----------
const FW = { list: [], next: 0, flash: null, midnight: false };
const FW_COLS = ['#FF7A66', '#FFD36E', '#9BF08F', '#8EC2FF', '#F0A8FF', '#FFF2D0', '#FF9AC2'];
function fwSpawn() { FW.list.push({ t: T, u: .12 + Math.random() * .76, top: .1 + Math.random() * .22, rise: .8 + Math.random() * .5, col: FW_COLS[Math.floor(Math.random() * FW_COLS.length)], n: 42 + Math.floor(Math.random() * 24), seed: Math.random() * 100, boom: false }); }
function drawFireworks(gx, gy, gw, gh) {
  const k = gw / 264;
  C.save(); C.beginPath(); C.rect(gx, gy, gw, gh * .66); C.clip(); C.globalCompositeOperation = 'lighter';
  for (const r of FW.list) {
    const a = T - r.t, x = gx + r.u * gw;
    if (a < r.rise) {
      const v = lerp(.66, r.top, easeOut(a / r.rise)), y = gy + v * gh;
      C.fillStyle = 'rgba(255,220,170,.9)'; C.beginPath(); C.arc(x, y, 1.6 * k, 0, TAU); C.fill();
      C.strokeStyle = 'rgba(255,190,120,.35)'; C.lineWidth = 1 * k; C.beginPath(); C.moveTo(x, y); C.lineTo(x + Math.sin(a * 9) * k, y + 14 * k); C.stroke();
      continue;
    }
    const b = a - r.rise, fade = clamp(1 - b / 2.1), [cr, cg, cb] = hexRgb(r.col), cy = gy + r.top * gh;
    // the sky lights up for a moment, then two shells of sparks, the outer one faster, falling as they fade
    if (b < .35) { C.fillStyle = `rgba(${cr},${cg},${cb},${.1 * (1 - b / .35)})`; C.fillRect(gx, gy, gw, gh * .66); }
    for (let i = 0; i < r.n; i++) {
      const outer = i % 3 !== 0, ang = i / r.n * TAU * (outer ? 1 : 3) + r.seed, sp = (outer ? 56 + hash(r.seed + i) * 26 : 26 + hash(r.seed + i) * 12) * k;
      const d = sp * (1 - Math.exp(-b * 2.4)), px = x + Math.cos(ang) * d, py = cy + Math.sin(ang) * d + 16 * k * b * b;
      const tw = b > 1.1 ? .5 + .5 * Math.sin(b * 34 + i * 2.1) : 1, al = fade * tw;
      C.strokeStyle = `rgba(${cr},${cg},${cb},${.55 * fade})`; C.lineWidth = 1.3 * k;
      C.beginPath(); C.moveTo(px, py); C.lineTo(px - Math.cos(ang) * 11 * k * fade, py - Math.sin(ang) * 11 * k * fade - 3 * k * b); C.stroke();
      C.fillStyle = `rgba(${cr},${cg},${cb},${al})`; C.beginPath(); C.arc(px, py, 2 * k, 0, TAU); C.fill();
      if (b < .6) { C.fillStyle = `rgba(255,250,235,${.6 * al * (1 - b / .6)})`; C.beginPath(); C.arc(px, py, .7 * k, 0, TAU); C.fill(); }
    }
    if (b < .7) glow(x, cy, 110 * k, r.col, .8 * (1 - b / .7));
  }
  C.restore();
}
function drawSnow(gx, gy, gw, gh) {
  const k = gw / 264;
  C.save(); C.beginPath(); C.rect(gx, gy, gw, gh); C.clip(); C.fillStyle = 'rgba(244,246,255,.85)';
  for (let i = 0; i < 80; i++) {
    const x = gx + frac(hash(i * 1.7) + T * .012 * (hash(i * 2.3) - .5) + Math.sin(T * .6 + i) * .015) * gw;
    const y = gy + frac(hash(i * 3.1) + T * (.025 + .035 * hash(i * 5.3))) * gh;
    C.beginPath(); C.arc(x, y, (.7 + 1.5 * hash(i * 7.9)) * k, 0, TAU); C.fill();
  }
  C.restore();
}
// children with lanterns on sticks, along the far quay
const MAARTEN = { period: 75, dur: 24 };
function drawLanterns(gx, gy, gw, gh) {
  const ph = (T + 60) % MAARTEN.period; if (ph > MAARTEN.dur) return;
  const k = gw / 264, base = gy + gh * .66, cols = ['#FF9E4A', '#FF6A5A', '#FFD25E', '#9FD27A', '#FF9E4A'];
  C.save(); C.beginPath(); C.rect(gx, gy, gw, gh); C.clip();
  boilSeed('maarten');
  for (let i = 0; i < 5; i++) {
    const u = -.15 + 1.3 * ph / MAARTEN.dur - i * .085, x = gx + u * gw, bob = Math.sin(T * 5 + i * 1.7), h = (15 + (i % 3) * 3) * k;
    if (x < gx - 20 * k || x > gx + gw + 20 * k) continue;
    // a small figure, then the lantern held out in front on a stick
    C.fillStyle = '#0E1124';
    C.beginPath(); C.moveTo(x - 3.2 * k, base); C.lineTo(x + 3.2 * k, base); C.lineTo(x + 2.4 * k, base - h * .7); C.lineTo(x - 2.4 * k, base - h * .7); C.closePath(); C.fill();
    C.beginPath(); C.arc(x, base - h * .82, 2.6 * k, 0, TAU); C.fill();
    const lx = x + 7 * k, ly = base - h * 1.05 + bob * 1.2 * k;
    C.strokeStyle = '#0E1124'; C.lineWidth = .8 * k; C.beginPath(); C.moveTo(x + 1.5 * k, base - h * .6); C.lineTo(lx, ly - 4 * k); C.stroke();
    C.fillStyle = cols[i]; C.beginPath(); C.ellipse(lx, ly, 3.2 * k, 3.8 * k, 0, 0, TAU); C.fill();
    glow(lx, ly, 18 * k, cols[i], .55 * flicker(i));
    glow(lx, base + 22 * k, 10 * k, cols[i], .25 * flicker(i));   // and in the water
  }
  C.restore();
}
// Friday the thirteenth: a black cat along the zinc, now and then
const BLACKCAT = { period: 200, dur: 9 };
function drawBlackCat(gx, gy, gw, gh) {
  const ph = (T + 170) % BLACKCAT.period; if (ph > BLACKCAT.dur) return;
  const k = gw / 264, x = gx - 30 * k + (gw + 60 * k) * ph / BLACKCAT.dur, y = gy + gh - 26 * k, step = T * 6;
  C.save(); C.beginPath(); C.rect(gx, gy, gw, gh); C.clip();
  push(); translate(x, y); scale(k * 1.3, k * 1.3);
  C.fillStyle = '#07080F'; C.strokeStyle = '#07080F'; C.lineCap = 'round';
  C.beginPath(); C.ellipse(0, -11, 13, 5.5, 0, 0, TAU); C.fill();
  C.beginPath(); C.arc(13, -15, 4.6, 0, TAU); C.fill();
  for (const ex of [11, 15.5]) { C.beginPath(); C.moveTo(ex - 2, -18.5); C.lineTo(ex, -23); C.lineTo(ex + 2, -18.5); C.fill(); }
  C.lineWidth = 2.2;
  for (let i = 0; i < 4; i++) { const lx = [-9, -5, 7, 11][i], sw = Math.sin(step + [0, Math.PI, Math.PI, 0][i]) * 3; C.beginPath(); C.moveTo(lx, -8); C.lineTo(lx + sw, 0); C.stroke(); }
  C.lineWidth = 2; C.beginPath(); C.moveTo(-12, -12); C.quadraticCurveTo(-22, -16 + Math.sin(T * 2) * 2, -19, -27); C.stroke();
  C.fillStyle = '#E9D27A'; C.beginPath(); C.arc(15, -15.5, .9, 0, TAU); C.fill();
  pop(); C.restore();
}
// what is out there, darkened with the rest of the night
function feastOutside(gx, gy, gw, gh) {
  if (FEAST === 'kerst') drawSnow(gx, gy, gw, gh);
  else if (FEAST === 'vrijdag13') drawBlackCat(gx, gy, gw, gh);
}
// what gives its own light, drawn over the dark, on the glass between the bars
function feastOutsideGlow(gx, gy, gw, gh, panes) {
  if (FEAST !== 'oudjaar' && FEAST !== 'maarten') return;
  C.save(); C.beginPath(); for (const p of panes) C.rect(p.x, p.y, p.w, p.h); C.clip();
  if (FEAST === 'oudjaar') drawFireworks(gx, gy, gw, gh); else drawLanterns(gx, gy, gw, gh);
  C.restore();
}

// ---------- sounds and remarks, once a frame while the room or the window is in view ----------
const FEAST_T = { howl: 40, maarten: -1, cat: -1 };
function howl() {
  const p = .55;
  SND.tone({ f: 330, dur: 1.3, vol: .03, type: 'triangle', pan: p, wet: 1, attack: .5, glide: 1.6 });
  SND.tone({ t: 1.15, f: 528, dur: 2.2, vol: .028, type: 'triangle', pan: p, wet: 1, attack: .1, glide: .62 });
  SND.tone({ f: 334, dur: 1.3, vol: .018, type: 'sine', pan: p, wet: 1, attack: .5, glide: 1.58 });
}
function chant() {
  // a children's sing-song, far off across the water
  const G5 = 784, E5 = 659, A5 = 880, D5 = 587, notes = [G5, G5, E5, 0, G5, G5, E5, 0, G5, G5, A5, G5, G5, E5, 0, D5, D5, E5, D5, 0, G5, G5, E5];
  notes.forEach((f, i) => { if (f) { SND.tone({ t: i * .26, f, dur: .24, vol: .018, type: 'triangle', pan: .5, wet: 1, attack: .02 }); SND.tone({ t: i * .26 + .01, f: f * 1.005, dur: .22, vol: .01, pan: .6, wet: 1, attack: .02 }); } });
}
function boom(close) {
  const v = close ? 1 : .55;
  SND.burst({ dur: .18, f: 160, q: .7, type: 'lowpass', vol: .3 * v, pan: .5, wet: .9, curve: 2 });
  for (let i = 0; i < 9; i++) SND.burst({ t: .15 + i * .05 + Math.random() * .04, dur: .02, f: 4200 + Math.random() * 2000, q: 2, vol: .03 * v, pan: .5 + Math.random() * .2, wet: .9 });
}
function feastTick() {
  if (!G.S || !['room', 'window'].includes(G.view)) return;
  const close = G.view === 'window';
  if (MOON.full && T > FEAST_T.howl) {
    FEAST_T.howl = T + 150 + Math.random() * 120;
    howl(); caption('(ver weg huilt iets naar de volle maan)', 3.2);
    if (G.view === 'room') G.clawd.mood.act('nervous', 1);
  }
  if (FEAST === 'maarten') {
    const n = Math.floor((T + 60) / MAARTEN.period);
    if (n !== FEAST_T.maarten && (T + 60) % MAARTEN.period < 2) { FEAST_T.maarten = n; chant(); caption('(buiten zingen kinderen: Sint-Maarten, Sint-Maarten, de koeien hebben staarten…)', 4.5); }
  }
  if (FEAST === 'vrijdag13') {
    const n = Math.floor((T + 170) / BLACKCAT.period);
    if (n !== FEAST_T.cat && (T + 170) % BLACKCAT.period < 1) { FEAST_T.cat = n; caption('(een zwarte kat loopt over het zink)', 3); if (WHO === 'cat') G.clawd.mood.act('surprised', 1.2); }
  }
  if (FEAST === 'oudjaar') {
    // midnight on the thirty-first, by the archive's own clock: everything at once
    const eve = DAY.getMonth() === 11;
    if (eve && !FW.midnight && G.minutes() >= 24 * 60) { FW.midnight = T; G.say('Gelukkig nieuwjaar!', { big: true }); G.clawd.mood.act('happy', 2); caption('(overal klokken en vuurwerk)', 3); }
    const busy = FW.midnight && T - FW.midnight < 45;
    if (T > FW.next) { fwSpawn(); FW.next = T + (busy ? .3 + Math.random() * .6 : eve ? 2.5 + Math.random() * 3.5 : 9 + Math.random() * 14); }
    for (const r of FW.list) if (!r.boom && T - r.t >= r.rise) { r.boom = true; FW.flash = { t: T, col: r.col }; boom(close); }
    FW.list = FW.list.filter(r => T - r.t < r.rise + 2);
  }
}
// what the feast adds to the room's light
function feastLight() {
  const out = [];
  if (SILL_ITEM) out.push([SILL_AT.x, SILL_AT.y - 20, SILL_ITEM === 'pumpkin' ? 170 : 200, SILL_ITEM === 'pumpkin' ? '#F0A050' : '#F2C070', .42 * flicker(SILL_AT.x), 1]);
  if (FW.flash && T - FW.flash.t < .7) out.push([1330, 380, 440, FW.flash.col, .35 * (1 - (T - FW.flash.t) / .7), 1.3]);
  if (FEAST === 'maarten' && (T + 60) % MAARTEN.period < MAARTEN.dur) out.push([1330, 520, 260, '#FFB060', .12, .6]);
  return out;
}

// ---------- in the room, and at the window ----------
function feastRoom() { feastTick(); if (SILL_ITEM) paintSillItem(SILL_AT.x, SILL_AT.y, 1); paintShoe(); }
function feastRoomGlow() { const w = ROOM.window; feastOutsideGlow(w.gx, w.gy, w.gw, w.gh, windowPanes()); if (SILL_ITEM) glowSillItem(SILL_AT.x, SILL_AT.y, 1); }
function feastRoomHits() {
  if (SILL_ITEM) UI.hit({ r: [SILL_AT.x - 28, SILL_AT.y - 40, 56, 44], tip: SILL_ITEM === 'pumpkin' ? 'Een pompoen' : 'Een kaarsje', onClick: () => walkTo(STATIONS.window.x, 'back', () => G.say(sillSay())) });
  if (FEAST === 'schoen' || FEAST === 'letter') UI.hit({ r: [SHOE_AT.x - 34 * SHOE_K, SHOE_AT.y - 62 * SHOE_K, 70 * SHOE_K, 66 * SHOE_K], tip: FEAST === 'letter' ? 'Een chocoladeletter' : 'Een schoen', onClick: () => walkTo(SHOE_AT.x + 60, 'front', shoeSay) });
  if (FEAST === 'oudjaar') UI.hit({ r: [926, 826 - TABLE_RAISE, 72, 38], tip: 'Oliebollen', onClick: () => walkTo(STATIONS.table.x, 'front', () => G.say(WHO === 'cat' ? 'Oliebollen. Het poeder komt overal. Ook op mij.' : 'Oliebollen, nog een beetje warm, van de kraam op de hoek. Het poeder komt overal.')) });
}
const SILL_BIG = () => ({ x: WINV.gx + 60, y: WINV.gy + WINV.gh, s: WINV.s });
function feastWindow() { feastTick(); }
function feastWindowSill() { if (SILL_ITEM) { const b = SILL_BIG(); paintSillItem(b.x, b.y, b.s); } }
function feastWindowGlow() { const v = WINV; feastOutsideGlow(v.gx, v.gy, v.gw, v.gh, panesOf(v.gx, v.gy, v.gw, v.gh)); if (SILL_ITEM) { const b = SILL_BIG(); glowSillItem(b.x, b.y, b.s); } }
function feastWindowHits() { if (SILL_ITEM) { const b = SILL_BIG(); UI.hit({ r: [b.x - 30 * b.s, b.y - 40 * b.s, 60 * b.s, 44 * b.s], tip: SILL_ITEM === 'pumpkin' ? 'Een pompoen' : 'Een kaarsje', onClick: () => G.say(sillSay()) }); } }
