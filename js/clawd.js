// clawd.js: Clawd, the new assistant, ported from the Claude Animation Base to the Canvas2D painter. Same model sheet:
// a 10×6 terracotta block, four stubby legs, two arm nubs, two slit eyes; drawn key views, acted emotions, painted
// emotes. (x, y) is the ground point between the feet; u is the body unit (10u wide, 8u tall with legs).
'use strict';

let T = 0;   // seconds since the page started: everything alive is a function of it

const VIEWS = {
  front: { L: -5, R: 5, face: { cx: 0, fw: 1, sides: [-1, 1], mx: 0, bx: 3.6 }, hat: 0, hw: 1,
           legs: [[-4, 0], [-2, 0], [1, 0], [3, 0]], arms: [[-4.9, -1, 'L', 0], [4.9, 1, 'R', 0]] },
  q:     { L: -5, R: 5.1, strip: [-5, -2.3], seam: -2.3, face: { cx: 1.5, fw: .74, sides: [-1, 1], mx: .3, bx: 3.6 }, hat: .6, hw: 1,
           legs: [[-4.3, 1], [-1.8, 0], [.8, 0], [3.3, 0]], arms: [[5, 1, 'R', 2], [-4.7, -1, 'L', 1]] },
  side:  { L: -3.1, R: 3.1, face: { cx: 1.35, fw: .55, sides: [1], mx: 1.7, bx: 1 }, hat: .3, hw: .66,
           legs: [[-2.1, 1], [1.3, 1], [-2.6, 0], [.9, 0]], arms: [[1.6, 0, 'L', 1]] },
  qback: { L: -5.1, R: 5, strip: [2.3, 5], seam: 2.3, face: null, hat: -.4, hw: 1,
           legs: [[3.3, 1], [.8, 0], [-1.8, 0], [-4.3, 0]], arms: [[-5, -1, 'R', 2], [4.7, 1, 'L', 1]] },
  back:  { L: -5, R: 5, face: null, hat: 0, hw: 1, back: true,
           legs: [[-4, 0], [-2, 0], [1, 0], [3, 0]], arms: [[-4.9, -1, 'R', 0], [4.9, 1, 'L', 0]] },
};
function spinView(a) {
  const K = [['front', 0], ['q', 0], ['side', 0], ['qback', 0], ['back', 0], ['qback', 1], ['side', 1], ['q', 1]];
  const [view, f] = K[((Math.round(a * 8) % 8) + 8) % 8]; return { view, flip: !!f };
}

const CLAWD_COLS = { col: PAL.clay, dk: PAL.clayDk, lt: '#F5B394' };
let BODY = CLAWD_COLS;   // the assistant's own colours, which tints and acted changes mix from (cat.js swaps them)
const TINT = { pale: '#F6E6D2', flush: '#E23E36', blue: '#6D86BE', rosy: '#EF8EA8', green: '#98B25E', gold: '#F0BE46' };
function tintCols(o) {
  const c = { col: o.col || BODY.col, dk: o.dk || BODY.dk, lt: o.lt || BODY.lt };
  const tc = o.tint && (TINT[o.tint] || o.tint), k = clamp(o.tintK ?? 1);
  if (!tc || k <= 0) return c;
  return { col: mixCol(c.col, tc, .55 * k), dk: mixCol(c.dk, mixCol(tc, PAL.ink, .35), .5 * k), lt: mixCol(c.lt, mixCol(tc, '#FFFFFF', .4), .45 * k) };
}

function clawd(x, y, u, o = {}) {
  const id = o.boilKey ?? 'c', rs = part => boilSeed(`clawd ${id} ${part}`);
  x += (o.dx || 0) * u;
  const V = VIEWS[o.view] || VIEWS.front;
  const dy = (o.dy || 0) * u, sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
  const sw = clamp(u / 15, .45, 2.4) * (o.swMul || 1), J = u * .07;
  const { col, dk, lt } = tintCols(o), far = mixCol(dk, PAL.ink, .22);

  if (!o.noShadow) {
    const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .06), w = (V.R - V.L) / 10;
    softBlob(x, y + u * .1, u * 6 * f * w, u * 1.1 * f, '#1a1424', .55 * (o.shadowK ?? 1));
  }
  if (sm > .05) { rs('smear'); smearTrail(x, y + dy, u, V, sm, o.smearDir ?? (o.flip ? -1 : 1), col); }

  push();
  translate(x, y + dy);
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + sm * .35), (o.sy ?? 1) * (1 - sq));

  const arm = ([px, dir, which, layer]) => {
    rs('arm' + which);
    const a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2), hook = which === 'L' ? o.armL : o.armR;
    push(); translate((px + dir * .55 * clamp((Math.abs(a) - .7) / .9)) * u, -4.5 * u);
    if (dir === 0) {
      translate(0, .3 * u); rotate(.7 - a);
      paint(rectPts(-.2 * u, -.45 * u, 2.3 * u, .9 * u, J * .6), { wash: col, tex: 0, pool: .5, ink: PAL.ink, sw: sw * .8 });
      if (hook) { translate(2.1 * u, 0); hook(u, sw); }
    } else {
      rotate(dir < 0 ? a : -a);
      paint(rectPts(dir < 0 ? -2.2 * u : 0, -.5 * u, 2.2 * u, u, J * .6), { wash: layer === 2 ? mixCol(col, dk, .4) : col, tex: 0, pool: .5, ink: PAL.ink, sw: sw * .8 });
      if (hook) { translate(dir * 2.2 * u, 0); if (dir < 0) scale(-1, 1); hook(u, sw); }
    }
    pop();
  };

  V.arms.filter(a => a[3] !== 1).forEach(arm);
  if (!o.noLegs) V.legs.forEach(([lx, isFar], i) => {
    rs('leg' + i);
    let h = 2.2, sx = 0;
    if (o.walk != null) {
      if (o.view === 'side') {
        const ph = (o.walk + [0, .5, .5, 0][i]) * TAU;
        sx = Math.sin(ph) * .55; h = 2.2 - Math.max(0, Math.cos(ph)) * .8;
      } else { const ph = Math.sin((o.walk + (i % 2 ? .5 : 0)) * TAU); if (ph > 0) h = 2.2 - ph * .9; }
    }
    paint(rectPts((lx + sx) * u, -2.4 * u, u, h * u, J * .6), { wash: isFar ? far : dk, tex: 0, pool: 0, ink: PAL.ink, sw: sw * .8 });
  });

  rs('body');
  const L = V.L * u, R = V.R * u, wk = (V.R - V.L) / 10, body = rectPts(L, -8 * u, R - L, 6 * u, J);
  paint(body, { wash: col, texK: .6, ink: null });
  const px = V.strip ? (V.strip[0] < 0 ? (V.seam + V.R) / 2 - 1.2 : (V.L + V.seam) / 2 - .6) : -1.6 * wk;
  paint(ellPts(px * u, -6.4 * u, 3.4 * u * (V.strip ? .75 : wk), 1.5 * u, 14, J * 2, -.08), { fill: lt, fillOp: V.back ? 80 : 120, bleed: .2, tex: .5, border: .6, layers: 3, ink: null });
  paint(rectPts(L + .2 * u, -3.8 * u, R - L - .4 * u, 1.6 * u, J), { fill: dk, fillOp: 120, bleed: .03, tex: .5, border: .4, layers: 3, ink: null });
  if (V.strip) {
    paint(rectPts(V.strip[0] * u, -8 * u, (V.strip[1] - V.strip[0]) * u, 6 * u, J * .5), { fill: dk, fillOp: 150, bleed: .04, tex: .4, border: .4, layers: 3, ink: null });
    inkLine([[V.seam * u + jit(J), -7.9 * u], [V.seam * u + jit(J), -5 * u], [V.seam * u + jit(J), -2.1 * u]], sw * .55, PAL.ink, 'inkfine', 0);
  }
  if (o.frost > .02) {   // rime creeping over the top of the body (cabinet IV's cold)
    paint(rectPts(L + .1 * u, -8 * u, R - L - .2 * u, 1.6 * u * o.frost, J), { fill: '#E4EEF8', fillOp: 170 * o.frost, bleed: .2, tex: .6, layers: 3, ink: null });
  }
  paint(body, { ink: PAL.ink, sw });
  if (o.gloom > .02) gloom(u, sw, V, o.gloom);
  if (V.face) {
    const F = V.face;
    push(); translate(F.cx * u, 0); scale(F.fw, 1);
    if (o.blush) blush(u, sw, F, o.blush === true ? 1 : o.blush);
    rs('eyes'); eyes(u, o, sw, F.sides, sm); rs('mouth');
    push(); translate(F.mx * u, 0); mouth(u, o.mouth, sw); pop();
    pop();
  }
  V.arms.filter(a => a[3] === 1).forEach(arm);
  rs('draw'); if (o.draw) o.draw(u, sw);
  pop();

  rs('emote');
  if (o.emote) {
    const top = EMOTE_TOP.includes(o.emote), dir = o.flip ? -1 : 1;
    const ex = top ? x + dir * V.hat * u : x + dir * (V.R + .4) * u, ey = y + dy + (top ? -10.4 : -8.6) * u * (1 - sq);
    emote(o.emote, ex, ey, u * .9 * (o.emoteScale || 1), o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
}

function smearTrail(x, y, u, V, k, dir, col) {
  const sides = dir === 0 ? [-1, 1] : [-dir];
  for (const s of sides) for (let i = 0; i < 4; i++) {
    const yy = y - (7.2 - i * 1.5) * u, x0 = x + s * (V.R - .5) * u, len = (3 + 3 * hash(i + 7 * s)) * u * k;
    inkLine([[x0, yy], [x0 + s * len * .5, yy + jit(u * .1)], [x0 + s * len, yy]], 2.2 * k, col, 'dry', .3);
    if (i % 2) inkLine([[x0 + s * len * .3, yy + .5 * u], [x0 + s * len * 1.1, yy + .5 * u]], .6, PAL.ink, 'inkfine', 0);
  }
}
function gloom(u, sw, V, g) {
  const L = V.L * u, R = V.R * u;
  paint(rectPts(L + .15 * u, -7.9 * u, R - L - .3 * u, 2.6 * u, u * .05), { fill: PAL.indigo, fillOp: 150 * g, bleed: .08, tex: .5, border: .6, layers: 3, ink: null });
  const n = Math.round((V.R - V.L) * .7);
  for (let i = 0; i < n; i++) { const gx = lerp(L + .7 * u, R - .7 * u, i / Math.max(1, n - 1)); inkLine([[gx, -7.8 * u], [gx + jit(u * .05), (-7.8 + 2.4 * g * (.7 + .3 * hash(i))) * u]], sw * .45, PAL.ink, 'inkfine', 0); }
}
function blush(u, sw, F, b) {
  for (const s of F.sides) {
    const bx = s * F.bx * u;
    paint(ellPts(bx, -4.6 * u, u * .85, u * .42, 14), { fill: PAL.rose, fillOp: 170 * clamp(b), bleed: .2, layers: 3, tex: .2, ink: null });
    if (b > .6) for (let k = 0; k < 3; k++) inkLine([[bx - .5 * u + k * .4 * u, -4.35 * u], [bx - .3 * u + k * .4 * u, -4.85 * u]], sw * .4, mixCol(PAL.rose, PAL.ink, .3), 'inkfine', 0);
  }
}

// ---------- eyes ----------
function eyes(u, o, sw, sides, smear = 0) {
  const kinds = Array.isArray(o.eyes) ? o.eyes : o.eyes === 'wink' ? ['happy', 'normal'] : [o.eyes || 'normal', o.eyes || 'normal'];
  const sqz = clamp(o.squint || 0);
  if (smear > .5) { for (const s of sides) inkLine([[s * 2.5 * u - .9 * u, -6 * u], [s * 2.5 * u + .9 * u, -6 * u]], sw * 1.4, PAL.ink, 'ink', 0); return; }
  if (sqz > .8) { for (const s of sides) inkLine([[s * 2.5 * u - .8 * u, -5.9 * u], [s * 2.5 * u + .8 * u, -5.9 * u]], sw, PAL.ink, 'ink', 0); return; }
  if (sqz > 0) { push(); translate(0, -6 * u); scale(1 + sqz * .15, 1 - sqz); translate(0, 6 * u); }
  for (const s of sides) { push(); translate(s * 2.5 * u, -6 * u); eye(kinds[s < 0 ? 0 : 1], s, u, o, sw); pop(); }
  if (sqz > 0) pop();
}
function eye(e, s, u, o, sw) {
  const lx = (o.lookX || 0) * u * .5, ly = (o.lookY || 0) * u * .4;
  const slit = (w, h) => {
    paint(rectPts(-w / 2 * u + lx, -h / 2 * u + ly, w * u, h * u, u * .04), { wash: PAL.ink, tex: 0, pool: 0, ink: null });
    if (u > 9) paint(ellPts(lx - w * .18 * u, ly - h * .29 * u, u * .17 * w, u * .24 * w, 10), { wash: PAL.cream, washOp: 230, tex: 0, pool: 0, ink: null });
  };
  const blinkOn = ['normal', 'look', 'wide'].includes(e) && ((T * .9 + (o.seed || 0) * 1.7) % 3.3) < .12;
  if (blinkOn) { inkLine([[-.7 * u, .5 * u], [.7 * u, .5 * u]], sw, PAL.ink, 'ink', 0); return; }
  const lineEye = (pts, w = 1.3, c = .2) => inkLine(pts.map(([a, b]) => [a * u, b * u]), sw * w, PAL.ink, 'ink', c);
  const solid = P => paint(P, { wash: PAL.ink, tex: 0, pool: 0, ink: null });
  switch (e) {
    case 'normal': case 'look': slit(1, 2); break;
    case 'wide': slit(1.25, 2.7); break;
    case 'happy': lineEye([[-.9, .7], [0, -.5], [.9, .7]]); break;
    case 'closed': lineEye([[-.9, .2], [0, .6], [.9, .2]], 1.2, .4); break;
    case 'sleepy':
      solid(rectPts(-.5 * u + lx, .05 * u, u, .95 * u, u * .03));
      lineEye([[-.8, .05], [0, -.1], [.8, .1]], 1.1, .4); break;
    case 'narrow': solid(rectPts(-.6 * u + lx, -.1 * u + ly, 1.2 * u, .7 * u, u * .03)); break;
    case 'angry': case 'determined': {
      const hi = e === 'angry' ? .75 : .5, top = e === 'angry' ? -.7 : -.55;
      solid([[-.65, s < 0 ? top : top + hi], [.65, s < 0 ? top + hi : top], [.65, 1], [-.65, 1]].map(([a, b]) => [a * u + lx, b * u + ly]));
      if (e === 'determined' && u > 9) paint(ellPts(lx - .2 * u, ly + .25 * u, u * .16, u * .2, 8), { wash: PAL.cream, tex: 0, pool: 0, ink: null });
      break;
    }
    case 'sad': case 'teary': {
      solid([[-.6, s < 0 ? -.2 : -.85], [.6, s < 0 ? -.85 : -.2], [.6, .9], [-.6, .9]].map(([a, b]) => [a * u + lx, b * u + ly]));
      if (u > 9) paint(ellPts(lx - .18 * u, ly + .05 * u, u * .16, u * .22, 8), { wash: PAL.cream, tex: 0, pool: 0, ink: null });
      if (e === 'teary') {
        const w = Math.sin(T * 9 + s) * .06 * u;
        paint(ellPts(0, .95 * u + w, .95 * u, .38 * u, 14), { wash: PAL.sky, washOp: 210, tex: 0, ink: PAL.ink, sw: sw * .4 });
      }
      break;
    }
    case 'squeeze': lineEye([[-.55 * -s, -.7], [.55 * -s, 0], [-.55 * -s, .7]], 1.3, 0); break;
    case 'shine':
      paint(ellPts(lx * .6, ly * .6, u * .78, u * 1.12, 16), { wash: PAL.ink, tex: 0, pool: 0, ink: null });
      paint(ellPts(lx * .6 - .25 * u, ly * .6 - .45 * u, u * .3, u * .38, 10), { wash: PAL.cream, tex: 0, pool: 0, ink: null });
      paint(ellPts(lx * .6 + .25 * u, ly * .6 + .45 * u, u * .14, u * .14, 8), { wash: PAL.cream, tex: 0, pool: 0, ink: null });
      break;
    case 'scared':
      paint(ellPts(0, 0, u * .95, u * 1.15, 16), { wash: PAL.cream, tex: 0, pool: 0, ink: PAL.ink, sw: sw * .6 });
      paint(ellPts((o.lookX || 0) * u * .3 + Math.sin(T * 40) * .04 * u, .1 * u, u * .3, u * .4, 10), { wash: PAL.ink, tex: 0, pool: 0, ink: null });
      break;
    case 'blank': paint(ellPts(0, 0, u * .8, u * 1.05, 14), { wash: PAL.cream, tex: 0, pool: 0, ink: PAL.ink, sw: sw * .7 }); break;
    case 'spark':
      paint(starPts(0, 0, u * 1.35 * (1 + .12 * Math.sin(T * 14))), { wash: PAL.cream, tex: 0, ink: PAL.ink, sw: sw * .55 });
      break;
    case 'heart': paint(heartPts(0, .1 * u, u * .9 * (1 + .1 * pulse(T))), { wash: '#E2476E', tex: 0, ink: PAL.ink, sw: sw * .5 }); break;
    case 'x': lineEye([[-.8, -.8], [.8, .8]], 1, 0); lineEye([[.8, -.8], [-.8, .8]], 1, 0); break;
    case 'swirl': {
      const sp = []; for (let k = 0; k < 16; k++) { const a = k * .7 + T * 6 * s, r = k * .06 * u; sp.push([Math.cos(a) * r, Math.sin(a) * r]); }
      inkLine(sp, sw * .6, PAL.ink, 'inkfine', .6); break;
    }
    case 'dot': paint(ellPts(lx * .5, ly * .5, u * .45, u * .55, 12), { wash: PAL.ink, tex: 0, pool: 0, ink: null }); break;
    default: slit(1, 2);
  }
}

// ---------- mouths ----------
function mouth(u, m, sw) {
  if (!m) return;
  const P = pts => pts.map(([a, b]) => [a * u, b * u]), dark = '#4A1F2A';
  const line = (pts, w = .8, c = .6) => inkLine(P(pts), sw * w, PAL.ink, 'ink', c);
  const flat = (pts, o) => paint(pts, { tex: 0, pool: 0, ...o });
  switch (m) {
    case 'o': flat(ellPts(0, -4.3 * u, u * .45, u * .5, 12), { wash: PAL.ink, ink: null }); break;
    case 'O': flat(ellPts(0, -4.1 * u, u * .8, u * .95, 14), { wash: dark, ink: PAL.ink, sw: sw * .6 }); break;
    case 'smile': line([[-.8, -4.6], [0, -4.1], [.8, -4.6]]); break;
    case 'frown': line([[-.8, -4.1], [0, -4.6], [.8, -4.1]]); break;
    case 'grin': flat(P([[-1.3, -4.8], [1.3, -4.8], [.9, -3.9], [-.9, -3.9]]), { wash: dark, ink: PAL.ink, sw: sw * .6, curv: .3 }); break;
    case 'flat': line([[-.7, -4.4], [.7, -4.4]], .8, 0); break;
    case 'wobble': line([[-1, -4.4], [-.5, -4.7], [0, -4.4], [.5, -4.7], [1, -4.4]], .7, .3); break;
    case 'cat': line([[-.9, -4.5], [-.45, -4.1], [0, -4.5], [.45, -4.1], [.9, -4.5]], .7, .5); break;
    case 'smirk': line([[-.8, -4.35], [.2, -4.3], [.9, -4.75]], .8, .5); break;
    case 'open':
      flat(ellPts(0, -4.25 * u, u * .75, u * .6, 14), { wash: dark, ink: PAL.ink, sw: sw * .6 });
      flat(ellPts(0, -3.95 * u, u * .45, u * .2, 10), { wash: PAL.rose, ink: null }); break;
    case 'teeth':
      flat(rectPts(-1.3 * u, -4.85 * u, 2.6 * u, .95 * u, u * .04), { wash: PAL.cream, ink: PAL.ink, sw: sw * .6 });
      line([[-1.25, -4.38], [1.25, -4.38]], .4, 0);
      break;
    case 'pout': line([[-.45, -4.2], [0, -4.5], [.45, -4.2]], 1, .6); break;
    case 'yawn':
      flat(ellPts(0, -4.1 * u, u * .6, u * 1.05, 14), { wash: dark, ink: PAL.ink, sw: sw * .6 });
      flat(ellPts(0, -3.45 * u, u * .38, u * .25, 10), { wash: PAL.rose, ink: null }); break;
  }
}

// ---------- emotes: painted marks, never letters ----------
const EMOTE_TOP = ['bulb', 'cloud', 'breath', 'stars'];
function emote(kind, x, y, s, k = 1, age = T) {
  const p = backOut(k); if (p < .02) return;
  const sw = clamp(s / 15, .4, 2), P = pts => pts.map(([a, b]) => [a * s, b * s]);
  const fl = (pts, o) => paint(pts, { tex: 0, pool: .4, ...o });
  const dot = (dx, col) => fl(ellPts(dx, 1.25 * s, .42 * s, .42 * s, 12), { wash: col, ink: PAL.ink, sw: sw * .7 });
  const bang = (dx, col) => {
    push(); translate(dx, 0); rotate(.1 + .08 * Math.sin(age * 16) * Math.exp(-age * 3));
    fl(P([[-.62, -2.3], [.62, -2.3], [.22, .45], [-.22, .45]]), { wash: col, ink: PAL.ink, sw: sw * .8, curv: .25 }); dot(0, col);
    pop();
  };
  const quest = (dx, col) => {
    push(); translate(dx, 0); rotate(-.08 + .08 * Math.sin(age * 12) * Math.exp(-age * 3));
    fl(ribbon(P([[-1, -1.3], [-.55, -2.15], [.35, -2.3], [1, -1.6], [.7, -.75], [.05, -.3], [0, .4]]), .75 * s, .5 * s), { wash: col, ink: PAL.ink, sw: sw * .8 });
    dot(0, col); pop();
  };
  push(); translate(x, y); scale(p);
  switch (kind) {
    case '!': bang(0, PAL.ochre); break;
    case '?': quest(0, PAL.sky); break;
    case '!!': bang(-.8 * s, PAL.ochre); bang(.9 * s, PAL.ochre); break;
    case '!?': bang(-.9 * s, PAL.ochre); quest(1 * s, PAL.sky); break;
    case 'zzz': for (let i = 0; i < 3; i++) {
      const ph = frac(age * .4 + i / 3), a = Math.sin(ph * Math.PI), zs = (.8 + ph * .7) * s * Math.min(1, a * 1.6);
      if (a < .12) continue;
      const Z = [[-.6, -.6], [.6, -.6], [.6, -.28], [-.12, .3], [.6, .3], [.6, .6], [-.6, .6], [-.6, .28], [.12, -.3], [-.6, -.3]];
      push(); translate(ph * 2.6 * s, -ph * 4.2 * s); rotate(-.15 + .1 * Math.sin(age * 2 + i));
      fl(Z.map(([a2, b]) => [a2 * zs, b * zs]), { wash: PAL.cream, ink: PAL.ink, sw: sw * .7 });
      pop();
    } break;
    case 'sweat': for (const [dx, dy, r] of [[0, 0, 1], [1.6, 1.4, .7]])
      fl(P([[dx, dy - 1.6 * r], [dx + .9 * r, dy + .2], [dx, dy + .9 * r], [dx - .9 * r, dy + .2]]), { wash: PAL.sky, ink: PAL.ink, sw: sw * .6, curv: .7 });
      break;
    case 'spark': {
      const tw = 1 + .15 * Math.sin(age * 12);
      fl(starPts(0, 0, 1.6 * s * tw), { wash: PAL.cream, ink: PAL.ink, sw: sw * .5 });
      fl(starPts(1.9 * s, 1.2 * s, .8 * s / tw), { wash: PAL.ochre, ink: PAL.ink, sw: sw * .4 });
      break;
    }
    case 'heart': fl(heartPts(0, 0, s * 1.8 * (1 + .12 * pulse(age))), { wash: '#E2476E', ink: PAL.ink, sw: sw * .6 }); break;
    case 'bulb': {
      const gl = .5 + .5 * Math.sin(age * 10);
      glow(0, -1.4 * s, 4.5 * s, '#FFD27A', .75 + .25 * gl);
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .45, r0 = 1.6 * s, r1 = (2.2 + .4 * gl) * s; inkLine([[Math.cos(a) * r0, -1.4 * s + Math.sin(a) * r0], [Math.cos(a) * r1, -1.4 * s + Math.sin(a) * r1]], sw * .8, PAL.ochre, 'ink', 0); }
      fl(ellPts(0, -1.4 * s, 1.15 * s, 1.2 * s, 16), { wash: '#FFE68A', ink: PAL.ink, sw: sw * .7 });
      fl(rectPts(-.5 * s, -.3 * s, s, .8 * s), { wash: '#9A93A8', ink: PAL.ink, sw: sw * .6 });
      break;
    }
    case 'dots': for (let i = 0; i < 3; i++) {
      const ph = frac(age / 1.8), q = backOut(clamp((ph - i * .22) * 6)); if (q < .02) continue;
      fl(ellPts((i - 1) * 1.3 * s, 0, .42 * s * q, .42 * s * q, 10), { wash: PAL.ink, ink: null });
    } break;
    case 'stars': for (let i = 0; i < 3; i++) {
      const a = age * 5 + i * TAU / 3, d = .75 + .25 * Math.sin(a);
      fl(starPts(Math.cos(a) * 4.2 * s, Math.sin(a) * s, .75 * s * d, .45, 5, age * 3), { wash: PAL.ochre, ink: PAL.ink, sw: sw * .5 });
    } break;
    case 'cloud': {
      const bob = Math.sin(age * 2) * .15 * s, c = [];
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * TAU, up = Math.sin(a) < 0, r = up ? 1 + .38 * Math.pow(Math.abs(Math.sin(a * 3)), .6) : 1;
        c.push([Math.cos(a) * 2.8 * s * (up ? r * .92 : 1), bob - .2 * s + Math.sin(a) * (up ? 1.35 : .7) * s * r]);
      }
      for (let i = 0; i < 6; i++) { const ph = frac(age * 2.4 + hash(i)), rx = (-2 + i * .8) * s, ry = (.7 + ph * 2) * s; inkLine([[rx, ry], [rx - .12 * s, ry + .7 * s]], sw * 1.1, mixCol(PAL.sky, PAL.indigo, .3), 'ink', 0); }
      fl(c, { wash: '#A3A8C4', ink: PAL.ink, sw: sw * .8, curv: .4 });
      break;
    }
    case 'breath': {   // a puff of breath in the cold
      for (let j = 0; j < 3; j++) {
        const ph = frac(age * .5 + j / 3); if (ph > .9) continue;
        softBlob(ph * 2.5 * s, -ph * 2 * s, (1 + ph * 2) * s, (.7 + ph * 1.3) * s, '#E8F0FA', .35 * (1 - ph));
      }
      break;
    }
    case 'music': {   // the assistant hums
      const b = Math.sin(age * 5) * .3 * s;
      push(); translate(0, b); rotate(.1 * Math.sin(age * 5));
      fl(ellPts(0, 1.2 * s, .7 * s, .5 * s, 12, 0, -.3), { wash: PAL.ink, ink: null });
      inkLine(P([[.6, 1.1], [.6, -1.6], [1.6, -1]]), sw * .8, PAL.ink, 'ink', 0);
      pop();
      break;
    }
  }
  pop();
}

// ---------- emotions ----------
const _b = t => { const bp = bpOf(t), s1 = Math.sin(bp * Math.PI); return { bp, s1, ab: Math.abs(s1), hit: pulse(t), s2: Math.sin(bp * TAU), f: frac(bp) }; };
const EMO = {
  neutral:    { eyes: 'normal', take: .3, body: t => { const b = _b(t); return { dy: -.25 * b.ab, sq: .03 * b.hit, aL: .15 + .05 * b.s1, aR: .15 - .05 * b.s1 }; } },
  happy:      { eyes: 'happy', mouth: 'smile', blush: .3, take: .6, body: t => { const b = _b(t); return { dy: -1.2 * b.ab, sq: .1 * b.hit, aL: .4 + .4 * b.s1, aR: .4 - .4 * b.s1 }; } },
  excited:    { eyes: 'wide', mouth: 'open', emote: 'spark', take: 1, body: t => { const b = _b(t), h = Math.abs(b.s2); return { dy: -2.4 * h, sq: .16 * pulse2(t) - .06 * h, aL: 1 + .5 * Math.sin(b.bp * TAU * 2), aR: 1 - .5 * Math.sin(b.bp * TAU * 2) }; } },
  proud:      { eyes: 'closed', mouth: 'smile', tint: 'gold', tintK: .3, emote: 'spark', take: .5, body: t => { const b = _b(t); return { sq: -.1 - .03 * b.ab, dy: -.3 * b.hit, aL: -.9, aR: -.9, rot: .02 * b.s1 }; } },
  relieved:   { eyes: 'closed', mouth: 'smile', emote: 'sweat', take: .4, body: t => { const b = _b(t), br = Math.sin(t * TAU * .35); return { sq: .05 + .05 * br, dy: -.15 * b.ab, aL: -.7 + .1 * br, aR: -.7 + .1 * br }; } },
  sad:        { eyes: 'sad', mouth: 'frown', tint: 'blue', tintK: .35, gloom: .35, emote: 'cloud', take: .3, body: t => { const b = _b(t), s = Math.sin(b.bp * Math.PI / 4); return { sq: .08 + .02 * s, rot: .03 * s, aL: -.75, aR: -.75, lookY: .5 }; } },
  scared:     { eyes: 'scared', mouth: 'wobble', tint: 'pale', tintK: .6, emote: 'sweat', take: 1.1, body: t => ({ dx: .1 * Math.sin(t * TAU * 22), sq: -.06, aL: 1 + .08 * Math.sin(t * TAU * 17), aR: 1 + .08 * Math.sin(t * TAU * 19), lookX: .6 * Math.sign(Math.sin(t * 2.3)) }) },
  surprised:  { eyes: 'wide', mouth: 'O', emote: '!', fade: true, take: 1.3, body: t => { const b = _b(t); return { sq: -.12, dy: -.3 - .15 * b.ab, aL: 1.1 + .05 * b.s2, aR: 1.1 - .05 * b.s2 }; } },
  confused:   { eyes: ['narrow', 'wide'], mouth: 'wobble', emote: '?', take: .6, body: t => { const b = _b(t); return { rot: .1 * Math.sin(b.bp * Math.PI / 4), aL: .1, aR: 1.5 + .15 * Math.sin(t * TAU * 3), dy: -.15 * b.ab }; } },
  thinking:   { eyes: 'look', mouth: 'flat', emote: 'dots', take: .4, body: t => { const b = _b(t); return { lookX: .5, lookY: -.8, rot: .05, aR: .9, aL: -.3 + .25 * Math.sin(b.f * Math.PI), dy: -.1 * b.ab }; } },
  reading:    { eyes: 'look', mouth: null, take: .2, body: t => { const b = _b(t); return { lookY: .55, lookX: .35 * Math.sin(t * 1.3), dy: -.1 * b.ab, aL: .5, aR: .5 }; } },
  idea:       { eyes: 'shine', mouth: 'grin', emote: 'bulb', take: 1.1, body: t => { const b = _b(t); return { dy: -1 * b.ab, sq: -.05 + .1 * b.hit, aR: 1.55 + .1 * b.s2, aL: .2 + .2 * b.s1 }; } },
  determined: { eyes: 'determined', mouth: 'flat', take: .7, body: t => { const b = _b(t), p1 = Math.sin(b.f * Math.PI), p2 = Math.abs(Math.cos(b.f * Math.PI)); return { rot: .06, sq: -.04 + .06 * b.hit, dy: -.3 * b.ab, aL: .1 + .7 * p1, aR: .1 + .7 * p2 }; } },
  sleepy:     { eyes: 'sleepy', mouth: 'o', emote: 'zzz', take: .2, body: t => { const br = Math.sin(t * TAU * .3); return { sq: .05 + .05 * br, rot: .06 * Math.sin(t * .8), aL: -.6, aR: -.6 }; } },
  nervous:    { eyes: 'look', mouth: 'wobble', tint: 'pale', tintK: .2, emote: 'sweat', take: .5, body: t => { const b = _b(t); return { lookX: beatN(t) % 2 ? .8 : -.8, dx: .3 * b.s1 * .5, sq: .04, aL: -.1 + .2 * Math.sin(t * TAU * 5), aR: -.1 + .2 * Math.sin(t * TAU * 5 + 1) }; } },
  suspicious: { eyes: 'narrow', mouth: 'flat', take: .4, body: t => { const s = Math.sin(t * TAU * .25); return { lookX: s, rot: -.08 * s, dx: .4 * s, sq: .04, aL: -.4, aR: -.4 }; } },
  shiver:     { eyes: 'squeeze', mouth: 'wobble', tint: 'blue', tintK: .35, emote: 'breath', take: .6, body: t => ({ dx: .06 * Math.sin(t * TAU * 26), sq: .08, aL: -.9 + .05 * Math.sin(t * 60), aR: -.9 + .05 * Math.sin(t * 57) }) },
  hum:        { eyes: 'closed', mouth: 'cat', emote: 'music', take: .3, body: t => { const b = _b(t); return { dy: -.4 * b.ab, rot: .05 * b.s1, aL: .3 + .2 * b.s1, aR: .3 - .2 * b.s1 }; } },
  starstruck: { eyes: 'spark', mouth: 'open', tint: 'gold', tintK: .3, take: 1, body: t => { const b = _b(t), h = Math.abs(b.s2); return { dy: -1.6 * h, sq: .1 * pulse2(t), aL: 1.1 + .35 * Math.sin(b.bp * TAU * 2), aR: 1.1 + .35 * Math.sin(b.bp * TAU * 2) }; } },
  hopeful:    { eyes: 'shine', mouth: 'cat', blush: .35, take: .5, body: t => { const b = _b(t); return { sq: -.06 - .02 * b.ab, dy: -.25 * b.ab, lookY: -.4, aL: .5 + .05 * b.s1, aR: .5 - .05 * b.s1, rot: .03 * Math.sin(b.bp * Math.PI / 2) }; } },
};
function feel(name, t, over = {}) {
  const E = EMO[name] || EMO.neutral;
  return { mood: name, eyes: E.eyes, mouth: E.mouth, tint: E.tint, tintK: E.tintK ?? 1, blush: E.blush || 0, gloom: E.gloom || 0,
           emote: E.emote, ...(E.body ? E.body(t) : {}), ...over };
}
function emotions(t, keys, o = {}) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [tc, name, over] = keys[i], age = t - tc, cur = feel(name, t, over);
  const tn = i + 1 < keys.length ? keys[i + 1][0] : Infinity, tkS = o.take ?? 1;
  const E = EMO[name] || EMO.neutral;
  let squint = cur.squint || 0;
  if (tn - t < .1) squint = Math.max(squint, 1 - (tn - t) / .1);
  if (i > 0 && age < .14) squint = Math.max(squint, 1 - age / .14);
  const prev = i > 0 ? feel(keys[i - 1][1], t, keys[i - 1][2]) : null;
  if (prev && age < .5) {
    const base = { dy: 0, sq: 0, aL: .2, aR: .2, rot: 0, dx: 0, lookX: 0, lookY: 0 };
    const k = backOut(seg(age, 0, .4)), kc = ease(seg(age, 0, .3));
    for (const f in base) cur[f] = lerp(prev[f] ?? base[f], cur[f] ?? base[f], k);
    const a = tintCols(prev), b = tintCols(cur);
    cur.col = mixCol(a.col, b.col, kc); cur.dk = mixCol(a.dk, b.dk, kc); cur.lt = mixCol(a.lt, b.lt, kc); cur.tint = null;
    for (const f of ['blush', 'gloom']) cur[f] = lerp(prev[f] || 0, cur[f] || 0, kc);
  }
  const t1 = prev ? take(t, tc, (E.take ?? .6) * tkS) : { sq: 0, dy: 0 };
  const En = i + 1 < keys.length ? EMO[keys[i + 1][1]] || EMO.neutral : null, t2 = En ? take(t, tn, (En.take ?? .6) * tkS) : { sq: 0, dy: 0 };
  cur.sq = (cur.sq || 0) + t1.sq + t2.sq; cur.dy = (cur.dy || 0) + t1.dy + t2.dy;
  cur.squint = squint;
  const same = prev && prev.emote === cur.emote;
  cur.emoteK = same ? 1 : seg(age, .06, .32) * (E.fade && !(over && over.emote) ? 1 - seg(age, 1.4, 1.8) : 1);
  cur.emoteAge = age; cur.moodAge = age; cur.prevMood = prev ? keys[i - 1][1] : null;
  return cur;
}

// ---------- a mood that lives in real time ----------
// The films key emotions on a timeline; the game keys them as things happen. act('surprised', 1.4) keys a take now
// and keys a return to the resting mood after it, so every change is acted: anticipation, squint, take, settle.
class Mood {
  constructor(rest = 'neutral') { this.rest = rest; this.keys = [[-10, rest]]; }
  act(name, hold = 1.6, over) {
    const now = T;
    this.keys = this.keys.filter(k => k[0] <= now).slice(-2);
    this.keys.push([now + .1, name, over]);
    if (hold > 0) this.keys.push([now + .1 + hold, this.rest]);
  }
  setRest(name) {
    if (name === this.rest) return;
    this.rest = name;
    const now = T, last = this.keys[this.keys.length - 1];
    // a held reaction finishes first; then the new resting mood
    if (last[0] > now) last[1] = name;
    else { this.keys = this.keys.filter(k => k[0] <= now).slice(-2); this.keys.push([now + .15, name]); }
  }
  current() { return this.keys.filter(k => k[0] <= T).pop()[1]; }
  pose() { return emotions(T, this.keys); }
}
