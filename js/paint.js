// paint.js: the medium. A Canvas2D painter in the manner of the Claude Animation Base (p5.brush there): flat washes
// with pooled edges, watercolour fills that bleed in layers, pencil hatching, and one tapered ink outline per shape.
// The linework boils: random() is reseeded twelve times a second, per element (boilSeed), so still things hold and
// drawn things wobble like hand-drawn animation. Static scenery is painted once into three boil drawings and cycled.
'use strict';

// ---------- the current surface ----------
let C = null;            // the 2D context being painted
let RS = 1;              // render scale: backing pixels per logical pixel
const push = () => C.save(), pop = () => C.restore();
const translate = (x, y) => C.translate(x, y), rotate = a => C.rotate(a), scale = (x, y = x) => C.scale(x, y);
function withCtx(ctx, fn) { const prev = C; C = ctx; try { fn(); } finally { C = prev; } }

// ---------- randomness and boil ----------
let _rs = 1, BOILN = 0;
function randomSeed(s) { _rs = (s >>> 0) || 1; }
function random() { let t = _rs += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const jit = a => (random() * 2 - 1) * a;
function boilSeed(key) { let h = 2166136261; const s = key + '|' + BOILN; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); randomSeed(h >>> 0); }
function gauss() { let u = 0, v = 0; while (u === 0) u = random(); v = random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

// ---------- geometry ----------
function rectPts(x, y, w, h, j = 0) {
  return [[x + jit(j), y + jit(j)], [x + w / 2 + jit(j), y + jit(j) * .5], [x + w + jit(j), y + jit(j)],
          [x + w + jit(j) * .5, y + h / 2], [x + w + jit(j), y + h + jit(j)], [x + w / 2 + jit(j), y + h + jit(j) * .5],
          [x + jit(j), y + h + jit(j)], [x + jit(j) * .5, y + h / 2]];
}
function ellPts(cx, cy, rx, ry, n = 28, j = 0, rot = 0) {
  const p = []; for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; p.push([cx + Math.cos(a) * rx + jit(j), cy + Math.sin(a) * ry + jit(j)]); } return p;
}
function rrPts(x, y, w, h, r, j = 0) {
  const p = [], sg = 5, corner = (cx, cy, a0) => { for (let i = 0; i <= sg; i++) { const a = a0 + i / sg * Math.PI / 2; p.push([cx + Math.cos(a) * r + jit(j), cy + Math.sin(a) * r + jit(j)]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return p;
}
function starPts(cx, cy, r, inner = .38, n = 4, rot = -Math.PI / 2) {
  const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, q = i % 2 ? r * inner : r; p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return p;
}
function heartPts(cx, cy, r, n = 22) {
  const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; p.push([cx + 16 * Math.pow(Math.sin(a), 3) * r / 16, cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r / 16]); } return p;
}
function polyPts(list, j = 0) { return list.map(([x, y]) => [x + jit(j), y + jit(j)]); }
// Smooth curve through the points (Catmull-Rom), n samples per span.
function through(P, n = 6, closed = false) {
  if (P.length < 3) return P.slice();
  const out = [], N = P.length, at = i => closed ? P[(i + N) % N] : P[Math.max(0, Math.min(N - 1, i))];
  const spans = closed ? N : N - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3)));
    }
  }
  if (!closed) out.push(P[N - 1]);
  return out;
}
function ribbon(P, w0, w1 = w0) {
  const Cc = through(P), n = Cc.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = Cc[Math.max(0, i - 1)], b = Cc[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / Math.max(1, n - 1)) / 2;
    L.push([Cc[i][0] - dy / d * w, Cc[i][1] + dx / d * w]); R.push([Cc[i][0] + dy / d * w, Cc[i][1] - dx / d * w]);
  }
  return L.concat(R.reverse());
}
function tracePath(P, closed = true) {
  C.beginPath(); C.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) C.lineTo(P[i][0], P[i][1]); if (closed) C.closePath();
}
function bbox(P) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of P) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
// resample a polyline at roughly even steps
function resample(P, step, closed) {
  const pts = closed ? P.concat([P[0]]) : P, out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < 1e-6) continue;
    let s = step - carry;
    while (s <= d) { const k = s / d; out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]); s += step; }
    carry = d - (s - step);
  }
  const last = pts[pts.length - 1], q = out[out.length - 1];
  if (Math.hypot(last[0] - q[0], last[1] - q[1]) > step * .3) out.push(last);
  return out;
}

// ---------- textures ----------
let GRAIN_PAT = null, PAPER = null, GRAIN = null, FIBRE_PAT = null;
function noiseCanvas(n, seed, fn) {
  const cv = document.createElement('canvas'); cv.width = cv.height = n;
  const c = cv.getContext('2d'), id = c.createImageData(n, n), d = id.data; let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  fn(d, n, rnd); c.putImageData(id, 0, 0); return cv;
}
function makeTextures() {
  // pigment granulation: soft blotchy noise, multiplied into washes
  const g = noiseCanvas(256, 7, (d, n, rnd) => {
    const v = new Float32Array(n * n);
    for (let oct = 0; oct < 4; oct++) {
      const cell = 64 >> oct, cells = n / cell, grid = [];
      for (let i = 0; i < (cells + 1) * (cells + 1); i++) grid.push(rnd());
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const gx = x / cell, gy = y / cell, ix = Math.floor(gx) % cells, iy = Math.floor(gy) % cells, fx = ease(gx % 1), fy = ease(gy % 1);
        const at = (a, b) => grid[(b % cells) * (cells + 1) + (a % cells)];
        v[y * n + x] += lerp(lerp(at(ix, iy), at(ix + 1, iy), fx), lerp(at(ix, iy + 1), at(ix + 1, iy + 1), fx), fy) / (1 << oct);
      }
    }
    for (let i = 0; i < n * n; i++) { const k = clamp((v[i] / 1.875 - .3) * 1.6) * .7 + rnd() * .3; const c = 255 - k * 70; d[i * 4] = c; d[i * 4 + 1] = c - 2; d[i * 4 + 2] = c - 6; d[i * 4 + 3] = 255; }
  });
  GRAIN_PAT = g;
  // paper fibre: fine speckle for the multiply pass
  FIBRE_PAT = noiseCanvas(256, 13, (d, n, rnd) => {
    for (let i = 0; i < n * n; i++) { const v = 255 - (rnd() < .5 ? rnd() * rnd() * 40 : 0); d[i * 4] = v; d[i * 4 + 1] = v - 1; d[i * 4 + 2] = v - 4; d[i * 4 + 3] = 255; }
  });
}
// the whole-frame grain and vignette, multiplied over every frame so the pigment sits in the paper
function makeGrain(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = c.createPattern(FIBRE_PAT, 'repeat'); c.fillRect(0, 0, w, h);
  let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  c.lineWidth = Math.max(1, w / 1920);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w, y = rnd() * h, l = (6 + rnd() * 26) * w / 1920, a = rnd() * TAU;
    c.strokeStyle = `rgba(110,88,60,${.04 + rnd() * .07})`; c.beginPath(); c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a + .6) * l * .5, y + Math.sin(a + .6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  const g = c.createRadialGradient(w / 2, h / 2, h * .42, w / 2, h / 2, h * 1.05);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(110,88,70,.42)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  return cv;
}
// a sheet of paper: tone, mottling, fibres (cards, envelopes, the map, the title)
function paperSheet(w, h, tone = PAL.paper, seed = 3, age = .5) {
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * RS); cv.height = Math.ceil(h * RS);
  const c = cv.getContext('2d'); c.scale(RS, RS);
  c.fillStyle = tone; c.fillRect(0, 0, w, h);
  let s = seed * 7919 + 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 18 + w * h / 40000; i++) {
    const x = rnd() * w, y = rnd() * h, r = (40 + rnd() * 200) * Math.max(w, h) / 900, gr = c.createRadialGradient(x, y, 0, x, y, r), a = .07 * rnd() * age;
    gr.addColorStop(0, `rgba(150,110,60,${a})`); gr.addColorStop(1, 'rgba(150,110,60,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  c.globalCompositeOperation = 'multiply'; c.globalAlpha = .55; c.fillStyle = c.createPattern(FIBRE_PAT, 'repeat'); c.fillRect(0, 0, w, h);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, `rgba(120,90,50,${.06 * age})`); g.addColorStop(.5, 'rgba(120,90,50,0)'); g.addColorStop(1, `rgba(120,90,50,${.1 * age})`);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  return cv;
}

// ---------- the brush ----------
const INK_PX = 3.4;   // stroke width in px for sw = 1
// One tapered brush stroke along P (already a dense path), as a filled outline. closed: around the shape, with the
// start and end overlapping a little, the way a brush goes round and lifts.
function brushStroke(P, sw, col, alpha = .93, o = {}) {
  if (P.length < 2) return;
  // the step is in local units: under a scale-up (a figure drawn in centimetres) keep it about 1.6 px on screen
  const m = C.getTransform(), zoom = Math.hypot(m.a, m.b) / RS;
  const step = Math.max(1.6 / Math.max(1, zoom), sw * INK_PX * .9);
  let Q = resample(P, step, o.closed);
  if (o.closed && Q.length > 4) { const over = Math.max(2, Math.round(Q.length * .04)); Q = Q.concat(Q.slice(1, over)); }
  const n = Q.length; if (n < 2) return;
  const base = sw * INK_PX / 2, ph = random() * 10, fr = .02 + random() * .05, tip0 = o.tip0 ?? .25, tip1 = o.tip1 ?? .12;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const taper = Math.min(lerp(tip0, 1, ease(k / .12)), lerp(tip1, 1, ease((1 - k) / .16)));
    const w = base * taper * (1 + .22 * Math.sin(ph + i * fr * 6) + .1 * (random() - .5)) * (o.pressure ? o.pressure(k) : 1);
    const sx = jit(base * .08), sy = jit(base * .08);
    L.push([Q[i][0] - dy * w + sx, Q[i][1] + dx * w + sy]); R.push([Q[i][0] + dy * w + sx, Q[i][1] - dx * w + sy]);
  }
  C.globalAlpha = alpha; C.fillStyle = col;
  C.beginPath(); C.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) C.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) C.lineTo(R[i][0], R[i][1]); C.closePath(); C.fill();
  C.globalAlpha = 1;
}
// dry brush: a few thin bristle tracks with gaps
function dryStroke(P, sw, col, alpha = .5) {
  const Q = resample(P, 3, false), n = Q.length; if (n < 2) return;
  const bristles = 5, wide = sw * INK_PX * 1.6;
  C.strokeStyle = col; C.lineCap = 'round';
  for (let b = 0; b < bristles; b++) {
    const off = (b / (bristles - 1) - .5) * wide + jit(1), gap0 = random(), gapL = .1 + random() * .25;
    C.globalAlpha = alpha * (.4 + random() * .6); C.lineWidth = .6 + random() * sw * .8;
    C.beginPath(); let pen = false;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), a = Q[Math.max(0, i - 1)], c2 = Q[Math.min(n - 1, i + 1)];
      let dx = c2[0] - a[0], dy = c2[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const inGap = k > gap0 && k < gap0 + gapL;
      const x = Q[i][0] - dy * off, y = Q[i][1] + dx * off;
      if (inGap) { pen = false; continue; }
      if (!pen) { C.moveTo(x, y); pen = true; } else C.lineTo(x, y);
    }
    C.stroke();
  }
  C.globalAlpha = 1;
}
// pencil: a thin grainy line (J.D.'s notes, hatching, the map's working lines)
function pencilLine(P, w = 1.2, col = '#3a3540', alpha = .75) {
  const Q = resample(P, 2.5, false), n = Q.length; if (n < 2) return;
  C.strokeStyle = col; C.lineCap = 'round'; C.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    C.globalAlpha = alpha * (pass ? .45 : .8); C.lineWidth = w * (pass ? 1.6 : .9);
    C.beginPath(); C.moveTo(Q[0][0] + jit(.4), Q[0][1] + jit(.4));
    for (let i = 1; i < n; i++) C.lineTo(Q[i][0] + jit(.5), Q[i][1] + jit(.5));
    C.stroke();
  }
  C.globalAlpha = 1;
}

// Hobbs-style polygon deformation: every edge gets a displaced midpoint, recursively
function deform(P, depth, v) {
  let Q = P;
  for (let d = 0; d < depth; d++) {
    const out = [];
    for (let i = 0; i < Q.length; i++) {
      const a = Q[i], b = Q[(i + 1) % Q.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      out.push(a);
      out.push([(a[0] + b[0]) / 2 + gauss() * v * len, (a[1] + b[1]) / 2 + gauss() * v * len]);
    }
    Q = out;
  }
  return Q;
}

// ---------- paint(): one call = one painted shape ----------
//   wash, washOp     flat colour (0-255), its edge pooled a little darker, granulated by the pigment texture
//   fill, fillOp     watercolour: layers that bleed (bleed ~.05-.3), granulate (tex) and darken at the rim (border)
//   hatch            { d, a, c, w, o }: pencil hatching clipped to the shape
//   ink, sw          outline colour (null for none) and weight; br: 'ink' | 'inkfine' | 'dry' | 'pencil'
//   curv             0-1: smooth the outline through the points
function paint(pts, o = {}) {
  if (!pts || pts.length < 2) return;
  let P = pts;
  if (o.curv) P = through(pts, 5, true);
  if (o.wash) {
    const op = (o.washOp ?? 255) / 255;
    C.globalAlpha = op; C.fillStyle = o.wash; tracePath(P); C.fill();
    if (o.tex !== 0 && op > .3) {   // granulation
      C.save(); C.clip(); C.globalCompositeOperation = 'multiply'; C.globalAlpha = .55 * op * (o.texK ?? 1);
      const [x0, y0, x1, y1] = bbox(P), pat = C.createPattern(GRAIN_PAT, 'repeat');
      const ox = (random() * 256) | 0, oy = (random() * 256) | 0;
      C.translate(x0 - ox, y0 - oy); C.fillStyle = pat; C.fillRect(ox - 2, oy - 2, x1 - x0 + 4, y1 - y0 + 4);
      C.restore();
    }
    if (o.pool !== 0) {   // pooled edge
      C.globalAlpha = .28 * op * (o.pool ?? 1); C.strokeStyle = mixCol(o.wash, PAL.ink, .35); C.lineWidth = 2.2; tracePath(P); C.stroke();
    }
    C.globalAlpha = 1;
  }
  if (o.fill) waterFill(P, o);
  if (o.hatch) hatchFill(P, o.hatch);
  if (o.ink !== null) {
    const col = o.ink || PAL.ink, sw = o.sw ?? 1, br = o.br || 'ink';
    if (br === 'pencil') pencilLine(P.concat([P[0]]), sw, col, .8);
    else if (br === 'dry') dryStroke(P.concat([P[0]]), sw, col, .6);
    else brushStroke(o.curv ? P : densify(P, true), br === 'inkfine' ? sw * .6 : sw, col, .93, { closed: true });
  }
}
// straight-edged polygons need points along their sides for the brush to wobble
function densify(P, closed) {
  const out = [], N = P.length, spans = closed ? N : N - 1;
  for (let i = 0; i < spans; i++) {
    const a = P[i], b = P[(i + 1) % N], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(d / 18));
    for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  if (!closed) out.push(P[N - 1]);
  return out;
}
function waterFill(P, o) {
  const op = (o.fillOp ?? 170) / 255, bleed = o.bleed ?? .1, layers = o.layers ?? 5;
  const base = deform(P, 2, bleed * .35);
  C.fillStyle = o.fill;
  for (let l = 0; l < layers; l++) {
    const Q = deform(base, 2, bleed * .22);
    C.globalAlpha = op * .26; tracePath(Q); C.fill();
  }
  const tex = o.tex ?? .4;
  if (tex > 0) {
    C.save(); tracePath(base); C.clip(); C.globalCompositeOperation = 'multiply'; C.globalAlpha = tex * .8 * op;
    const [x0, y0, x1, y1] = bbox(base), ox = (random() * 256) | 0, oy = (random() * 256) | 0;
    C.translate(x0 - ox, y0 - oy); C.fillStyle = C.createPattern(GRAIN_PAT, 'repeat'); C.fillRect(ox, oy, x1 - x0, y1 - y0);
    C.restore();
  }
  const border = o.border ?? .35;
  if (border > 0) { C.globalAlpha = border * .35 * op; C.strokeStyle = mixCol(o.fill, PAL.ink, .3); C.lineWidth = 2.5; tracePath(base); C.stroke(); }
  C.globalAlpha = 1;
}
function hatchFill(P, h) {
  const [x0, y0, x1, y1] = bbox(P), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  const d = h.d || 8, a = h.a ?? .8, col = h.c || PAL.ink, w = h.w || 1;
  C.save(); tracePath(P); C.clip();
  C.strokeStyle = col; C.lineCap = 'round';
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let s = -R; s <= R; s += d * (1 + jit(.25))) {
    const grad = h.gradient ? clamp(1 - (s + R) / (2 * R) * h.gradient) : 1;
    C.globalAlpha = (h.op ?? .45) * grad * (.6 + random() * .4); C.lineWidth = w * (.7 + random() * .6);
    const px = cx - sa * s, py = cy + ca * s;
    C.beginPath(); C.moveTo(px - ca * R + jit(2), py - sa * R + jit(2)); C.lineTo(px + ca * R + jit(2), py + sa * R + jit(2)); C.stroke();
  }
  C.restore(); C.globalAlpha = 1;
}
function inkLine(pts, sw = 1, col = PAL.ink, br = 'ink', curv = .5) {
  const P = curv > 0 && pts.length > 2 ? through(pts, 6) : densify(pts, false);
  if (br === 'dry') dryStroke(P, sw, col, .6);
  else if (br === 'pencil') pencilLine(P, sw, col, .8);
  else brushStroke(P, br === 'inkfine' ? sw * .6 : sw, col, .93, { tip0: .3, tip1: .15 });
}
// Light: an additive halo, the one non-paint mark (lamps, the moon, a match)
function glow(x, y, r, col = '#FFC766', a = 1) {
  if (a <= 0 || r < 1) return;
  const [cr, cg, cb] = hexRgb(col), g = C.createRadialGradient(x, y, 0, x, y, r);
  [[0, .62], [.18, .48], [.45, .2], [.75, .05], [1, 0]].forEach(([s, k]) => g.addColorStop(s, `rgba(${cr},${cg},${cb},${k * clamp(a)})`));
  C.save(); C.globalCompositeOperation = 'lighter'; C.fillStyle = g; C.fillRect(x - r, y - r, 2 * r, 2 * r); C.restore();
}
// a soft wash of shadow or light that has no edge (a pool of lamplight, mist, a shadow on the floor)
function softBlob(x, y, rx, ry, col, a) {
  const [cr, cg, cb] = hexRgb(col);
  C.save(); C.translate(x, y); C.scale(1, ry / rx);
  const g = C.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`); g.addColorStop(.6, `rgba(${cr},${cg},${cb},${a * .45})`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  C.fillStyle = g; C.fillRect(-rx, -rx, 2 * rx, 2 * rx); C.restore();
}

// ---------- lettering ----------
const FONT = {
  type: '"Special Elite", "Special Elite L", "Courier New", monospace',
  hand: '"Caveat", "Caveat L", "Segoe Print", cursive',
  jd: '"Homemade Apple", "Homemade Apple L", "Caveat", cursive',
  fell: '"IM Fell English", "IM Fell English L", Georgia, serif',
  fellSC: '"IM Fell English SC", "IM Fell English SC L", Georgia, serif',
};
const _wrapMemo = new Map();
function wrapLines(text, maxW, font) {
  const key = font + '|' + maxW + '|' + text;
  if (_wrapMemo.has(key)) return _wrapMemo.get(key);
  C.font = font; const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean); let line = '';
    if (!words.length) { out.push(''); continue; }
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (C.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  if (_wrapMemo.size > 3000) _wrapMemo.clear();
  _wrapMemo.set(key, out); return out;
}
// text with a little boil (position and angle jitter per boil drawing)
function handText(txt, x, y, size, col = PAL.ink, o = {}) {
  C.save(); C.translate(x + jit(o.j ?? .5), y + jit(o.j ?? .5)); C.rotate((o.rot || 0) + jit(.004));
  C.font = `${o.weight || ''} ${size}px ${o.font || FONT.hand}`; C.textAlign = o.align || 'left'; C.textBaseline = o.base || 'alphabetic';
  C.globalAlpha = o.alpha ?? 1; C.fillStyle = col; C.fillText(txt, 0, 0); C.restore(); C.globalAlpha = 1;
}
// typed text: each character inked a little differently, the way a worn ribbon prints
function typedText(txt, x, y, size, col = '#2a2630', o = {}) {
  if (!txt) return 0;
  C.font = `${size}px ${FONT.type}`; C.textBaseline = 'alphabetic'; C.textAlign = 'left';
  const total = C.measureText(txt).width, cw = total / txt.length;
  let s = strHash(txt + (o.seed || 0)) || 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  C.fillStyle = col;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i]; if (ch === ' ') continue;
    C.globalAlpha = (o.alpha ?? 1) * (.72 + rnd() * .28);
    C.fillText(ch, x + i * cw + (rnd() - .5) * .6, y + (rnd() - .5) * .9);
  }
  C.globalAlpha = 1;
  return total;
}
function typedWidth(txt, size) { C.font = `${size}px ${FONT.type}`; return C.measureText(txt).width; }

// ---------- boiled layers: static painting cached as three drawings ----------
// A layer is painted once per boil drawing (0, 1, 2) into its own canvas and cycled at BOIL fps.
class Layer {
  constructor(x, y, w, h, draw, key) { Object.assign(this, { x, y, w, h, draw, key, cv: [null, null, null], dirty: true }); }
  render(v) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(this.w * RS); cv.height = Math.ceil(this.h * RS);
    const c = cv.getContext('2d'); c.scale(RS, RS); c.translate(-this.x, -this.y);
    const keep = BOILN; BOILN = 1000 + v * 7;
    withCtx(c, () => this.draw(v));
    BOILN = keep;
    this.cv[v] = cv; return cv;
  }
  invalidate() { this.cv = [null, null, null]; }
  get(v) { return this.cv[v] || this.render(v); }
  blit(v = BOILN % 3, alpha = 1) {
    // fall back to an already painted drawing while the others are still being made
    this.used = performance.now();
    let cv = this.cv[v]; if (!cv) cv = this.cv.find(Boolean) || this.render(v);
    if (alpha < 1) C.globalAlpha = alpha;
    C.drawImage(cv, this.x, this.y, this.w, this.h); C.globalAlpha = 1;
  }
}
// paint missing boil drawings in idle time, a few per frame
const LAYERS = [];
function layer(x, y, w, h, draw, key) { const L = new Layer(x, y, w, h, draw, key); LAYERS.push(L); return L; }
// Layers not shown for a while give their drawings back (a phone has little memory for canvases: every view's walls,
// three times over, come to some 300 MB); they are painted again when next shown, behind the transition.
let LAYER_KEEP = 30000;
function warmLayers(budgetMs = 6) {
  const t0 = performance.now();
  for (const L of LAYERS) if (L.used && t0 - L.used > LAYER_KEEP && L.cv.some(Boolean)) L.invalidate();
  for (const L of LAYERS) {
    if (L.used && t0 - L.used > LAYER_KEEP) continue;
    for (let v = 0; v < 3; v++) if (!L.cv[v]) { L.render(v); if (performance.now() - t0 > budgetMs) return false; }
  }
  return true;
}
