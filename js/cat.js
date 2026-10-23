// cat.js: the archive cat, the other assistant. Same medium and the same pose as clawd() (key views, eyes, mouths,
// emotes, acted emotions), but built as a small model: ellipsoids for the body and head, cones for the ears, a tail
// and four legs, turned to the view and painted flat. Inks go under the washes, so overlapping parts close into one
// silhouette. The mood behind the pose decides what a cat does with it: ears, tail, fur, pupils, sitting, curling up.
// (x, y) is the ground point under the cat; u is the same body unit as Clawd's.
'use strict';

const CAT_COLS = { col: '#DE8E4C', dk: '#A65826', lt: '#F7E6CC' };   // a ginger tabby with a white bib and socks
const CAT_IRIS = '#E7BB3A', CAT_NOSE = '#D9848C';
const CAT_YAW = { front: 0, q: Math.PI / 4, side: Math.PI / 2, qback: 3 * Math.PI / 4, back: Math.PI };

// ---------- what each mood does to a cat ----------
//   earL/earR -1 flat … 1 pricked   puff: fur on end   stand/arch: up on its toes   lie: curled up
//   tu: tail up (0 wrapped round the feet)   curl: hook at the tip   lash, lashF: swish   pupil: 0 slit … 1 round
//   whisk: whiskers down … forward   headY: chin down … up   paw: a front paw lifted
const CM0 = { earL: 0, earR: 0, puff: 0, stand: 0, arch: 0, lie: 0, tu: .25, curl: .4, lash: .2, lashF: .4, pupil: .35, whisk: 0, headY: 0, paw: 0 };
const CATMOOD = {
  neutral:    {},
  happy:      { ears: .5, tu: .95, curl: .9, lash: .1, pupil: .3, whisk: .3 },
  excited:    { ears: 1, tu: 1, curl: .3, lash: .15, lashF: 2, pupil: .9, stand: .6, whisk: .6 },
  proud:      { ears: .5, tu: 1, curl: .7, lash: .05, pupil: .2, headY: .5 },
  relieved:   { ears: -.2, tu: .1, lash: .05, pupil: .4, headY: -.1 },
  sad:        { ears: -.8, tu: 0, curl: .1, lash: 0, pupil: .6, whisk: -1, headY: -.7 },
  scared:     { ears: -1, puff: 1, stand: 1, arch: 1, tu: 1, curl: 0, lash: .05, lashF: 3, pupil: 1, whisk: -.6, mouth: 'hiss' },
  surprised:  { ears: 1, puff: .35, tu: 1, curl: 0, lash: 0, pupil: 1, whisk: .7 },
  confused:   { earL: .9, earR: -.5, tu: .7, curl: 1.3, lash: .1, pupil: .5, paw: 1 },
  thinking:   { earL: .3, earR: .7, tu: .2, lash: .5, lashF: .25, pupil: .3, headY: .3 },
  reading:    { ears: .4, tu: .1, lash: .15, pupil: .45, headY: -.5 },
  idea:       { ears: 1, tu: 1, curl: .9, pupil: .9, paw: .6, whisk: .7 },
  determined: { ears: .6, tu: .6, curl: .2, lash: .6, lashF: 1.2, pupil: .1, whisk: .5 },
  sleepy:     { ears: -.3, lie: 1, tu: 0, lash: 0, pupil: .5, headY: -.3 },
  nervous:    { ears: -.5, puff: .15, tu: .3, lash: .9, lashF: 1.5, pupil: .8 },
  suspicious: { ears: -.4, tu: .3, lash: .7, lashF: .5, pupil: .05 },
  shiver:     { ears: -.6, puff: .45, lie: .5, tu: 0, lash: 0, pupil: .6, whisk: -.4 },
  hum:        { ears: .2, lie: .6, tu: 0, lash: .05, pupil: .3 },
  starstruck: { ears: 1, tu: 1, curl: .5, pupil: 1, whisk: .5 },
  hopeful:    { ears: .7, tu: .8, curl: .7, pupil: .7, headY: .25 },
};
for (const k in CATMOOD) { const m = CATMOOD[k]; m.earL ??= m.ears ?? 0; m.earR ??= m.ears ?? 0; }
// a change of mood is acted like Clawd's, quickly; sitting up, standing and curling up take longer
function catMood(o) {
  const cur = { ...CM0, ...(CATMOOD[o.mood] || {}) };
  if (!o.prevMood || o.moodAge == null) return cur;
  const prev = { ...CM0, ...(CATMOOD[o.prevMood] || {}) }, k = backOut(seg(o.moodAge, 0, .35)), ks = ease(seg(o.moodAge, 0, .9));
  for (const f in CM0) cur[f] = lerp(prev[f], cur[f], f === 'lie' || f === 'stand' || f === 'arch' ? ks : k);
  return cur;
}

// ---------- three poses, in body units: [f, up, z] with f forward, up up, z to the cat's left ----------
// parts: [f, up, z, a (half-length), b (half-width), h (half-height), pitch]; legs: [shoulder or hip, knee, paw]
const CAT_POSE = {
  stand: { rear: [-1.7, 3.5, 0, 2.3, 1.5, 1.6, 0], chest: [1.4, 3.65, 0, 2.3, 1.55, 1.75, .1], head: [3.95, 5.5, 0],
           fl: [[2.0, 3.3], [2.3, 1.55], [2.4, 0]], hl: [[-2.3, 3.2], [-3.05, 1.35], [-2.45, 0]], ls: .85, hs: .85, tail: [-3.8, 4.1] },
  sit:   { rear: [-1.0, 1.85, 0, 2.15, 2.25, 1.85, 0], chest: [.45, 3.8, 0, 1.5, 1.6, 2.3, .3], head: [1.05, 6.8, 0],
           fl: [[.95, 2.7], [1.2, 1.3], [1.35, 0]], hl: [[-.9, 1.4], [-.4, .45], [.75, .1]], ls: .72, hs: 1.5, tail: [-2.95, .65] },
  lie:   { rear: [-1.3, 1.45, 0, 2.3, 1.85, 1.45, 0], chest: [.9, 1.6, 0, 2.0, 1.75, 1.55, 0], head: [2.55, 2.95, 0],
           fl: [[1.5, 1.2], [2.2, .45], [2.95, .2]], hl: [[-1.4, .95], [-.6, .4], [.2, .18]], ls: .62, hs: 1.45, tail: [-3.4, .65] },
};
const lerpDeep = (a, b, k) => Array.isArray(a) ? a.map((v, i) => lerpDeep(v, b[i], k)) : typeof a === 'number' ? lerp(a, b, k) : a;
function catPose(sit, lie, m, walk) {
  const P = {};
  for (const f in CAT_POSE.stand) P[f] = lerpDeep(lerpDeep(CAT_POSE.stand[f], CAT_POSE.sit[f], sit), CAT_POSE.lie[f], lie);
  const ar = m.arch * (1 - sit) * (1 - lie);
  if (ar > 0) {   // up on its toes, back in a hoop
    P.rear[1] += .9 * ar; P.chest[1] += .6 * ar; P.rear[6] += .32 * ar; P.chest[6] -= .34 * ar; P.head[1] -= .1 * ar; P.head[0] -= .3 * ar;
    P.fl[0][1] += .6 * ar; P.fl[1][1] += .3 * ar; P.hl[0][1] += .9 * ar; P.hl[1][1] += .5 * ar; P.tail[1] += .7 * ar;
  }
  if (m.paw > 0 && walk == null) { const p = m.paw * (1 - lie); P.flR = [P.fl[0], [P.fl[1][0] + .7 * p, P.fl[1][1] + .9 * p], [P.fl[2][0] + .9 * p, P.fl[2][1] + 2.1 * p]]; }
  return P;
}

// ---------- projection ----------
function catProj(th) {
  const s = Math.sin(th), c = Math.cos(th);
  return { P: (f, up, z) => [f * s + z * c, -up], D: (f, up, z) => f * c - z * s };
}
// the outline of an ellipsoid seen from the side: the image of the unit sphere under the 2×3 map L is the ellipse LLᵀ
function catEll(pr, [f, up, z, a, b, h, pitch = 0]) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const A = [pr.P(a * cp, a * sp, 0), pr.P(-h * sp, h * cp, 0), pr.P(0, 0, b)];
  let p = 0, q = 0, r = 0; for (const [x, y] of A) { p += x * x; q += x * y; r += y * y; }
  const m = (p + r) / 2, d = Math.sqrt((p - r) * (p - r) / 4 + q * q), [X, Y] = pr.P(f, up, z);
  return { x: X, y: Y, rx: Math.sqrt(m + d), ry: Math.sqrt(Math.max(1e-4, m - d)), rot: .5 * Math.atan2(2 * q, p - r), depth: pr.D(f, up, z) };
}
// its points, fur on end when puffed; tuft(a, i) adds fluff where it likes
function catOutline(e, u, J, puff = 0, tuft = null, n = 30) {
  const P = [], cr = Math.cos(e.rot), sr = Math.sin(e.rot);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, k = 1 + (i % 2 ? puff * (.13 + .12 * hash(i * 3.1)) : -puff * .03) + (tuft ? tuft(a, i) : 0);
    const x = Math.cos(a) * e.rx * k, y = Math.sin(a) * e.ry * k;
    P.push([(e.x + x * cr - y * sr) * u + jit(J), (e.y + x * sr + y * cr) * u + jit(J)]);
  }
  return P;
}
// a surface point of an ellipsoid part, and how much it faces us (0 edge-on … 1 straight at us)
function catSurf(pr, [f, up, z, a, b, h, pitch = 0], c1, c2, c3, view) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const pf = f + c1 * a * cp - c2 * h * sp, pu = up + c1 * a * sp + c2 * h * cp, pz = z + c3 * b;
  const nf = c1 / a * cp - c2 / h * sp, nu = c1 / a * sp + c2 / h * cp, nz = c3 / b, nl = Math.hypot(nf, nu, nz) || 1;
  return { p: pr.P(pf, pu, pz), face: pr.D(nf, nu, nz) / nl * (view ?? 1) };
}
const unionPath = (polys) => { C.beginPath(); for (const P of polys) { C.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) C.lineTo(P[i][0], P[i][1]); C.closePath(); } };
function grainIn(polys, op) {
  C.save(); unionPath(polys); C.clip(); C.globalCompositeOperation = 'multiply'; C.globalAlpha = op;
  const [x0, y0, x1, y1] = bbox(polys.flat()), ox = (random() * 256) | 0, oy = (random() * 256) | 0;
  C.translate(x0 - ox, y0 - oy); C.fillStyle = C.createPattern(GRAIN_PAT, 'repeat'); C.fillRect(ox, oy, x1 - x0, y1 - y0);
  C.restore();
}

// ---------- the cat ----------
function cat(x, y, u, o = {}) {
  const id = o.boilKey ?? 'c', rs = part => boilSeed(`cat ${id} ${part}`);
  const m = catMood(o), walking = o.walk != null;
  x += (o.dx || 0) * u;
  const th = CAT_YAW[o.view] ?? 0, pr = catProj(th), side = Math.abs(Math.sin(th));
  const dy = (o.dy || 0) * u, sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
  const sw = clamp(u / 15, .45, 2.4) * (o.swMul || 1), J = u * .06;
  const { col, dk, lt } = tintCols(o), far = mixCol(col, dk, .5), ink = PAL.ink;
  const lie = walking ? 0 : m.lie, sit = walking ? 0 : (o.sit ?? 1) * (1 - m.stand);
  const P = catPose(sit, lie, m, o.walk), puff = m.puff;
  const bob = walking ? -Math.abs(Math.sin(o.walk * TAU)) * .25 : 0;

  if (!o.noShadow) {
    const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .06);
    softBlob(x, y + u * .1, u * lerp(3.2, 5.6, side * (1 - sit * .35)) * f, u * 1.05 * f, '#1a1424', .55 * (o.shadowK ?? 1));
  }
  if (sm > .05) { rs('smear'); smearTrail(x, y + dy, u, { R: 3.5 }, sm, o.smearDir ?? (o.flip ? -1 : 1), col); }

  push();
  translate(x, y + dy + bob * u);
  if (o.rot) rotate(o.rot * .4);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + sm * .35), (o.sy ?? 1) * (1 - sq));

  // ----- what gets drawn, back to front -----
  const items = [];
  const legs = [['fl', 1, P.ls, 0], ['fl', -1, P.ls, .5], ['hl', 1, P.hs, .5], ['hl', -1, P.hs, 0]];
  for (const [kind, zs, zw, phase] of legs) {
    let L = (kind === 'fl' && zs < 0 && P.flR) ? P.flR : P[kind];
    L = L.map(p => p.slice());
    if (walking) {   // a trot: diagonal pairs together
      const ph = (o.walk + phase) * TAU, sw2 = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
      L[2][0] += sw2 * 1.05; L[2][1] += lift * .75; L[1][0] += sw2 * .55 + (kind === 'fl' ? -lift * .35 : lift * .2); L[1][1] += lift * .4;
    }
    const z = zs * zw, pts = L.map(([f, up]) => pr.P(f, up, z)), d = pr.D(L[2][0], 0, z);
    items.push({ d: d + (kind === 'fl' ? .02 : 0), draw: near => catLegDraw(pts, kind, near) , leg: true, z: pr.D(0, 0, z) });
  }
  const bodyD = pr.D((P.rear[0] + P.chest[0]) / 2, 0, 0);
  items.push({ d: bodyD, body: true, draw: () => catBody() });
  const head = P.head.slice(); head[1] += m.headY * .35 - (o.lookY || 0) * .15;
  items.push({ d: pr.D(head[0], 0, 0) + .05 + (lie > .5 ? .5 : 0), draw: () => catHead() });
  const tail = catTailPts(m, P, sit, lie, walking);
  const tmid = tail[Math.floor(tail.length * .6)];
  items.push({ d: Math.max(pr.D(...tail[0]), pr.D(...tmid)) - .03, draw: () => catTail(tail) });

  // legs on the far side go behind the body; the near ones join its silhouette
  for (const it of items) if (it.leg) { it.near = it.z > -.05; if (!it.near) it.d = Math.min(it.d, bodyD - .1); }
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.draw(it.near);
  rs('draw'); if (o.draw) o.draw(u, sw);
  pop();

  // ----- emotes, next to the head as drawn -----
  rs('emote');
  if (o.emote) {
    const dir = o.flip ? -1 : 1, [hx, hy] = pr.P(head[0], head[1], 0), sxk = (1 + sq * .6), syk = (1 - sq);
    const kind = o.emote === 'music' ? 'purr' : o.emote;
    if (kind === 'purr') catPurr(x + dir * hx * u * sxk, y + dy + (hy + 1.5) * u * syk, u, o.emoteK ?? 1, o.emoteAge ?? T);
    else if (kind === 'breath') {
      const nz = pr.P(head[0] + 2.1, head[1] - .5, 0);
      emote('breath', x + dir * (nz[0] * u * sxk + u * .6), y + dy + nz[1] * u * syk - u * .4, u * .8, o.emoteK ?? 1, o.emoteAge ?? T);
    } else {
      const top = EMOTE_TOP.includes(kind);
      const ex = top ? x + dir * hx * u * sxk : x + dir * (hx + 2.9) * u * sxk, ey = y + dy + (top ? hy - 4.3 : hy - 1.6) * u * syk;
      emote(kind, ex, ey, u * .9 * (o.emoteScale || 1), o.emoteK ?? 1, o.emoteAge ?? T);
    }
  }
  rs('after');

  // ===== the parts =====
  function catLegDraw(pts, kind, near) {
    rs('leg' + kind + pts[0][0].toFixed(1));
    const Q = pts.map(([a, b]) => [a * u + jit(J * .5), b * u + jit(J * .5)]);
    const w0 = (kind === 'fl' ? 1.1 : 1.15) * u, w1 = .72 * u, rb = ribbon(Q, w0, w1);
    paint(rb, { wash: near ? col : far, tex: 0, pool: 0, ink: null });
    if (near) { const cut = Math.floor(rb.length / 2 * (sit > .5 ? .38 : .2)); inkLine(rb.slice(cut, rb.length - cut), sw * .85, ink, 'ink', 0); }   // open at the top: the leg grows out of the body
    else paint(rb, { ink, sw: sw * .8 });
    const [px, py] = Q[Q.length - 1], pw = lerp(.42, .68, side);
    paint(ellPts(px + (kind === 'fl' ? .1 : 0) * u * side, py - .22 * u, pw * u, .34 * u, 14, J * .4), { wash: near ? lt : mixCol(lt, dk, .35), tex: 0, pool: 0, ink, sw: sw * .7 });
  }

  function catBody() {
    rs('body');
    const parts = [P.rear, P.chest], E = parts.map(p => catEll(pr, p)), polys = E.map(e => catOutline(e, u, J, puff));
    for (const Q of polys) paint(Q, { ink, sw: sw * 1.85 });            // inks first…
    for (const Q of polys) paint(Q, { wash: col, tex: 0, pool: 0, ink: null });   // …washes over: one silhouette
    grainIn(polys, .32);
    C.save(); unionPath(polys); C.clip();
    // belly in shadow, back in light
    const lo = E[0], hi = E[1];
    paint(ellPts(((lo.x + hi.x) / 2) * u, (Math.max(lo.y + lo.ry, hi.y + hi.ry) - .1) * u, (Math.abs(lo.x - hi.x) / 2 + lo.rx) * u, 1.2 * u, 16), { fill: dk, fillOp: 90, bleed: .15, tex: .3, layers: 3, ink: null });
    paint(ellPts(hi.x * u, (hi.y - hi.ry * .65) * u, hi.rx * .7 * u, hi.ry * .35 * u, 14), { fill: mixCol(col, '#FFFFFF', .35), fillOp: 90, bleed: .2, layers: 3, tex: .3, ink: null });
    // tabby stripes, where the body faces us
    rs('stripes');
    const rings = [[P.rear, [-.55, -.15, .3]], [P.chest, sit > .5 ? [-.4] : [-.55, -.1]]];
    for (const [part, ts] of rings) for (const t of ts) for (const s of [1, -1]) {
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const ph = s * (.15 + k * .2), r = Math.sqrt(1 - t * t), sp = catSurf(pr, part, t, r * Math.cos(ph), r * Math.sin(ph));
        if (sp.face > .08) pts.push([sp.p[0] * u + jit(J), sp.p[1] * u + jit(J)]);
      }
      if (pts.length > 2) inkLine(pts, sw * 1.5, dk, 'ink', .5);
    }
    // the white bib
    const bib = catSurf(pr, P.chest, .8, -.05, 0), be = catEll(pr, [...P.chest.slice(0, 3), .9, 1.05, 1.5, P.chest[6]]);
    if (bib.face > .05) {
      const off = [bib.p[0] - be.x, bib.p[1] - be.y];
      paint(catOutline({ ...be, x: be.x + off[0] * .55, y: be.y + off[1] * .55 + .5 }, u, J, 0, (a, i) => i % 2 ? .06 : 0, 24),
            { wash: lt, washOp: 255 * clamp(bib.face * 2), tex: 0, pool: 0, ink: null });
    }
    C.restore();
  }

  function catTail(T3) {
    rs('tail');
    const Q = T3.map(p => { const [a, b] = pr.P(...p); return [a * u + jit(J * .4), b * u + jit(J * .4)]; });
    let rb = ribbon(Q, .82 * u * (1 + puff * 1.1), .42 * u * (1 + puff * 1.4));
    if (puff > .05) rb = rb.map((p, i) => i % 2 ? [p[0] + jit(puff * u * .35), p[1] + jit(puff * u * .35)] : p);
    paint(rb, { wash: col, tex: 0, pool: 0, ink: null });
    // rings and a dark tip
    const n = rb.length / 2, L = rb.slice(0, n), R = rb.slice(n).reverse();
    C.save(); tracePath(rb); C.clip();
    for (const k of [.38, .56, .72, .86, .95]) { const i = Math.min(n - 1, Math.round(k * (n - 1))); inkLine([L[i], R[i]], sw * (k > .9 ? 3.4 : 1.7), dk, 'ink', 0); }
    C.restore();
    inkLine(rb, sw * .85, ink, 'ink', 0);
  }

  function catHead() {
    rs('head');
    const hth = th + clamp(o.lookX || 0, -1, 1) * .3, hp = catProj(hth);
    const [hx, hy] = pr.P(head[0], head[1], head[2]), tilt = (o.rot || 0) * 2.2 + (o.mood === 'confused' ? .18 : 0);
    push(); translate(hx * u, hy * u); rotate(tilt);
    const H0 = [0, 0, 0, 1.75, 2.05, 1.8, 0], hd = catEll(hp, H0);
    const MZ = [1.35, -.7, 0, .78, 1.0, .72, 0], mz = catEll(hp, MZ);
    const facing = Math.cos(hth);
    // ears: cones, pricked or flattened
    const ears = [-1, 1].map(s => {
      const e = s < 0 ? m.earR : m.earL, flat = Math.max(0, -e), up = Math.max(0, e);   // z>0 is the cat's left
      const twitch = ((T * .7 + s * 1.3 + (o.seed || 0)) % 4.1) < .12 ? .25 : 0;
      const base = [[-.1, 1.15, s * .45], [-.1, 1.05, s * 1.8], [.45, 1.5, s * 1.15], [-.65, 1.45, s * 1.15]];
      const apex = [lerp(lerp(.0, .25, up), -.7, flat) - twitch, lerp(lerp(3.0, 3.25, up), 1.95, flat), s * lerp(lerp(1.45, 1.3, up), 2.75, flat)];
      const pts = hullPts([...base, apex].map(p => hp.P(...p)));
      const inner = [base[0], base[1], apex].map(p => hp.P(p[0] + .25, p[1] + .1, p[2] * .97 - s * .0));
      const c = inner.reduce((a, b) => [a[0] + b[0] / 3, a[1] + b[1] / 3], [0, 0]);
      return { outer: pts.map(([a, b]) => [a * u + jit(J), b * u + jit(J)]), inner: inner.map(([a, b]) => [lerp(a, c[0], .3) * u, lerp(b, c[1], .3) * u]), z: s };
    });
    const tuft = (a, i) => i % 2 ? .22 * Math.max(0, Math.sin(a)) * Math.abs(Math.cos(a)) * (1 + puff) : 0;
    const headPts = catOutline(hd, u, J, puff * .4, tuft, 32), mzPts = catOutline(mz, u, J * .6, 0, null, 20);
    const sil = [...ears.map(e => e.outer), headPts, mzPts];
    for (const Q of sil) paint(Q, { ink, sw: sw * 1.85 });
    for (const e of ears) paint(e.outer, { wash: col, tex: 0, pool: 0, ink: null });
    if (facing < 0) paint(mzPts, { wash: col, tex: 0, pool: 0, ink: null });   // a muzzle seen from behind is only cheek
    paint(headPts, { wash: col, tex: 0, pool: 0, ink: null });
    if (facing >= 0) paint(mzPts, { wash: lt, tex: 0, pool: 0, ink: null });
    grainIn(sil, .3);
    if (facing > .15) for (const e of ears) paint(e.inner, { wash: mixCol(CAT_NOSE, lt, .35), washOp: 255 * clamp(facing * 1.6), tex: 0, pool: 0, ink: null, curv: .3 });
    // forehead stripes and a cream muzzle edge
    rs('face');
    C.save(); unionPath([headPts]); C.clip();
    for (const [c2, c3, len] of [[.55, 0, .5], [.5, .32, .38], [.5, -.32, .38]]) {
      const a = catSurf(hp, H0, Math.sqrt(1 - c2 * c2 - c3 * c3), c2, c3), b = catSurf(hp, H0, Math.sqrt(1 - (c2 + len) ** 2 - c3 * c3 * .8) || 0, c2 + len, c3 * .9);
      if (a.face > .1) inkLine([[a.p[0] * u, a.p[1] * u], [b.p[0] * u, b.p[1] * u]], sw * 1.3, dk, 'ink', 0);
    }
    for (const s of [1, -1]) {   // cheek stripes
      const a = catSurf(hp, H0, .55, -.15, s * .82), b = catSurf(hp, H0, .25, -.3, s * .95);
      if (a.face > .1) inkLine([[a.p[0] * u, a.p[1] * u], [b.p[0] * u, b.p[1] * u]], sw * 1.1, dk, 'ink', 0);
    }
    C.restore();
    if (o.blush) for (const s of [1, -1]) {
      const c = catSurf(hp, H0, .7, -.3, s * .62); if (c.face < .1) continue;
      paint(ellPts(c.p[0] * u, c.p[1] * u, .5 * u * c.face, .25 * u, 12), { fill: PAL.rose, fillOp: 160 * clamp(o.blush === true ? 1 : o.blush), bleed: .2, layers: 3, tex: .2, ink: null });
    }
    // eyes
    rs('eyes');
    const el = .15 + m.headY * .2;
    for (const s of [-1, 1]) {
      const c1 = Math.cos(el) * Math.cos(.46), sp = catSurf(hp, H0, c1, Math.sin(el), s * Math.cos(el) * Math.sin(.46));
      if (sp.face < .12) continue;
      push(); translate(sp.p[0] * u, sp.p[1] * u); scale(clamp(sp.face * 1.15, .3, 1), 1);
      catEye(o, m, s * (o.flip ? -1 : 1), u, sw);
      pop();
    }
    // nose, mouth, whiskers
    rs('mouth');
    const nose = hp.P(MZ[0] + MZ[3] * .78, MZ[1] + .42, 0), fz = Math.max(.3, facing);
    if (facing > -.2) {
      push(); translate(nose[0] * u, nose[1] * u); scale(fz, 1);
      catMouth(u, m.mouth || o.mouth, sw);
      pop();
      rs('whisk');
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const a = hp.P(MZ[0] + .35, MZ[1] - .05 - i * .2, s * .7), d = [.55, .35 - i * .32 + m.whisk * .35, s * 1.1], L = 2.1;
        const b = hp.P(MZ[0] + .35 + d[0] * L, MZ[1] - .05 - i * .2 + d[1] * L, s * .7 + d[2] * L);
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + .12 + Math.max(0, -m.whisk) * .2];
        inkLine([a, mid, b].map(([p, q]) => [p * u, q * u]), sw * .45, mixCol(ink, '#FFFFFF', .15), 'inkfine', .6);
      }
    }
    // what is carried goes in the mouth
    const hook = o.armR || o.armL;
    if (hook) { const mo = hp.P(MZ[0] + .6, MZ[1] - .4, 0); push(); translate(mo[0] * u, mo[1] * u); rotate(Math.PI + .85); scale(.85); hook(u, sw); pop(); }
    pop();
  }
}

// the tail, as points in body space: up and hooked, or wrapped round the feet, and always moving a little
function catTailPts(m, P, sit, lie, walking) {
  const n = 11, B = [P.tail[0], P.tail[1], 0], tu = walking ? Math.max(m.tu, .8) : m.tu, wrap = (1 - tu) * clamp(sit + lie);
  const sw = Math.sin(T * TAU * m.lashF);
  const up = [], wr = [];
  let f = B[0], h = B[1], b = lerp(lerp(205, 160, tu), 98, tu) * Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    up.push([f, h, Math.sin(T * TAU * m.lashF + k * 1.6) * m.lash * k * 1.8]);
    b -= (lerp(.06, .02, tu) + m.curl * k * k * .55) * (1 + .15 * sw * m.lash);
    f += Math.cos(b) * .64; h += Math.sin(b) * .64;
  }
  for (let i = 0; i < n; i++) {   // round the near side to the front of the paws
    const k = i / (n - 1), a = Math.PI - k * 2.75, R = lerp(2.5, 2.9, k);
    wr.push([lerp(B[0], Math.cos(a) * R * 1.05 + .35, Math.min(1, k * 3)), lerp(B[1], .35 + .45 * k * k * (1 + .6 * Math.max(0, sw) * m.lash * 3), Math.min(1, k * 2.5)), -Math.sin(a) * R * .95]);
  }
  return up.map((p, i) => lerpDeep(p, wr[i], wrap));
}

// ---------- the face ----------
function catEye(o, m, s, u, sw) {
  const kind = Array.isArray(o.eyes) ? o.eyes[s < 0 ? 0 : 1] : o.eyes === 'wink' ? (s < 0 ? 'happy' : 'normal') : (o.eyes || 'normal');
  const own = { normal: 1, look: 1, wide: 1, shine: 1, scared: 1, dot: 1, blank: 1, narrow: .42, determined: .5, angry: .38, sleepy: .28, sad: .78, teary: .78 };
  if (!(kind in own)) { push(); scale(.42); eye(kind, s, u, { ...o, lookX: (o.lookX || 0) * .6 }, sw / .42 * .9); pop(); return; }
  const big = kind === 'wide' || kind === 'scared' ? 1.18 : 1, w = .98 * big, h = .78 * big;
  const slow = ((T + (o.seed || 0) * 2.3) % 5.3), blink = slow < .5 ? 1 - Math.sin(slow / .5 * Math.PI) : 1;
  const lid = clamp(own[kind] * (1 - (o.squint || 0)) * (kind === 'sleepy' ? 1 : blink));
  const lx = (o.lookX || 0) * w * .22, ly = (o.lookY || 0) * h * .2, slope = kind === 'sad' || kind === 'teary' ? .3 : kind === 'angry' || kind === 'determined' ? -.25 : 0;
  const top = [], bot = [], N = 10;
  for (let i = 0; i <= N; i++) {
    const t = i / N, X = (t - .5) * w, tilt = -(t - .5) * s * .18 * h, sl = (t - .5) * s * slope * h;
    bot.push([X * u, (tilt + Math.sin(t * Math.PI) * h * .5) * u]);
    top.push([X * u, (tilt + sl * lid - Math.sin(t * Math.PI) * h * .5 * (lid * 2 - 1) - sl) * u]);
  }
  if (lid < .12) { inkLine(bot.map(([a, b]) => [a, b - h * .15 * u]), sw * 1.1, PAL.ink, 'ink', .5); return; }
  const shape = top.concat(bot.slice().reverse());
  paint(shape, { wash: kind === 'blank' ? PAL.cream : CAT_IRIS, tex: 0, pool: .6, ink: null });
  if (kind !== 'blank') {
    C.save(); tracePath(shape); C.clip();
    const pu = kind === 'scared' ? 1 : kind === 'dot' ? .7 : clamp(m.pupil + (kind === 'wide' ? .3 : 0) + (kind === 'shine' ? .25 : 0));
    const shake = kind === 'scared' ? Math.sin(T * 40) * .03 * u : 0;
    paint(ellPts(lx * u + shake, ly * u, lerp(.07, .4, pu) * w * u, h * .62 * u, 14), { wash: PAL.ink, tex: 0, pool: 0, ink: null });
    if (u > 8) {
      paint(ellPts((lx - w * .17) * u, (ly - h * .18) * u, .13 * w * u * (kind === 'shine' ? 1.5 : 1), .15 * w * u * (kind === 'shine' ? 1.5 : 1), 10), { wash: PAL.cream, tex: 0, pool: 0, ink: null });
      if (kind === 'shine') paint(ellPts((lx + w * .14) * u, (ly + h * .2) * u, .07 * w * u, .07 * w * u, 8), { wash: PAL.cream, tex: 0, pool: 0, ink: null });
    }
    C.restore();
  }
  inkLine(top, sw * 1.15, PAL.ink, 'ink', .4);
  inkLine(bot, sw * .55, PAL.ink, 'inkfine', .4);
  if (kind === 'teary') { const wv = Math.sin(T * 9 + s) * .05 * u; paint(ellPts(0, (h * .55) * u + wv, w * .5 * u, .18 * u, 12), { wash: PAL.sky, washOp: 210, tex: 0, ink: PAL.ink, sw: sw * .4 }); }
}
function catMouth(u, m, sw) {
  const P = pts => pts.map(([a, b]) => [a * u, b * u]), line = (pts, w = .7) => inkLine(P(pts), sw * w, PAL.ink, 'ink', .6);
  paint(P([[-.3, -.08], [.3, -.08], [0, .24]]), { wash: CAT_NOSE, tex: 0, pool: 0, ink: PAL.ink, sw: sw * .55, curv: .35 });
  line([[0, .22], [0, .42]], .55);
  const open = { O: .55, open: .42, yawn: .7, o: .26, teeth: .45, hiss: .5 }[m];
  if (open) {
    const ow = m === 'o' ? .22 : .42;
    paint(ellPts(0, (.47 + open * .5) * u, ow * u, open * .5 * u, 14), { wash: '#4A1F2A', tex: 0, pool: 0, ink: PAL.ink, sw: sw * .5 });
    if (m === 'open' || m === 'yawn' || m === 'O') paint(ellPts(0, (.47 + open * .85) * u, ow * .6 * u, open * .16 * u, 10), { wash: PAL.rose, tex: 0, pool: 0, ink: null });
    if (m === 'hiss' || m === 'teeth') for (const s of [-1, 1]) paint(P([[s * .3, .5], [s * .14, .5], [s * .22, .78]]), { wash: PAL.cream, tex: 0, pool: 0, ink: PAL.ink, sw: sw * .3 });
    line([[-.5, .48], [-.25, .55], [0, .42]], .55); line([[0, .42], [.25, .55], [.5, .48]], .55);
  } else if (m === 'frown' || m === 'wobble' || m === 'pout') {
    line([[-.5, .66], [-.25, .52], [0, .42]]); line([[0, .42], [.25, .52], [.5, .66]]);
  } else {   // the ω
    const up = m === 'smile' || m === 'grin' || m === 'cat' ? .08 : 0;
    line([[-.52, .44 - up], [-.27, .6], [0, .42]]); line([[0, .42], [.27, .6], [.52, .44 - up]]);
  }
}
// purring: a little thrum at the throat
function catPurr(x, y, u, k = 1, age = T) {
  const p = backOut(k); if (p < .02) return;
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
    const ph = frac(age * 1.3 + i * .5), r = (1.6 + ph * 1.4) * u, a = 1 - ph;
    if (a < .1) continue;
    C.globalAlpha = a * p;
    inkLine([[x + s * r, y - .6 * u], [x + s * (r + .25 * u), y], [x + s * r, y + .6 * u]], .9, PAL.ink, 'inkfine', .6);
    C.globalAlpha = 1;
  }
}
function hullPts(pts, smooth = true) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const H = lo.slice(0, -1).concat(up.slice(0, -1));
  // round it out (or keep the corners): points along each edge so the brush can wobble
  return smooth ? through(H, 4, true) : densify(H, true);
}

// ---------- who is on duty ----------
// each assistant draws itself from the same pose; person.js adds the default one, the player
const WHO_ALL = {
  clawd: { draw: (x, y, u, o) => clawd(x, y, u, o), cols: CLAWD_COLS, word: 'de assistent' },
  cat: { draw: cat, cols: CAT_COLS, word: 'de kat' },
};
let WHO = 'me';
function setWho(name) {
  WHO = name in WHO_ALL ? name : 'me';
  BODY = WHO_ALL[WHO].cols;
  if (typeof TABLE_RAISE !== 'undefined') TABLE_RAISE = WHO === 'me' ? 96 : 0;
  if (typeof HELP_LINES !== 'undefined') HELP_LINES[0] = `Klik op iets in de kamer: ${WHO_ALL[WHO].word} loopt erheen.`;
}
function assistant(x, y, u, o) { WHO_ALL[WHO].draw(x, y, u, o); }
