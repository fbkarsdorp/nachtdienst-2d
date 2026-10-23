// person.js: the night assistant as a person, after a portrait of the player (curly hair, round glasses, moustache,
// freckles, a black T-shirt over tattooed arms, rolled-up jeans, heavy boots). Built like the cat: a small model in
// centimetres (f forward, up, z to the person's left) turned to the key view and painted flat, taking the same pose as
// clawd(). The mood behind the pose picks what a person does with it: hands on hips, a scratch of the head, arms
// crossed, a hand over the mouth, hands in pockets while humming, the head going down when sleepy.
// (x, y) is the ground point between the feet; at u = 17 (the room) the person is about four hundred pixels tall.
'use strict';

const ME = {
  skin: '#EEC5AC', skinDk: '#D39C83', skinLt: '#F6DCCB', cheek: '#E8907E', hair: '#3A2925', hairLt: '#5A443C',
  tee: '#3A3537', teeLt: '#504A4D', jeans: '#A6BDC9', jeansDk: '#86A0AF', cuff: '#C2D1D8', boot: '#2A2526', sole: '#3A302D',
  rim: '#3E2A22', iris: '#8C8992', tattoo: '#2E2A34', sock: '#EFE6D2', stitch: '#D9A74A',
};
const ME_COLS = { col: ME.skin, dk: ME.skinDk, lt: ME.skinLt };

// ---------- what each mood does with arms and posture ----------
// a gesture is where the elbow and the hand go, from the shoulder: [f, up, outwards]
const GESTURE = {
  hang:    [[0, -29, 3], [2, -58, 2]],      hips:   [[-5, -20, 16], [1, -40, 4]],
  up:      [[3, 24, 11], [5, 50, 9]],       spread: [[7, -20, 15], [17, -31, 27]],
  cover:   [[12, -22, 9], [22, 2, 1]],      scratch: [[8, 18, 20], [-3, 33, 5]],
  chin:    [[16, -20, 4], [12, 5, -13]],    across: [[8, -24, 2], [16, -23, -24]],
  brow:    [[11, 6, 17], [11, 22, -14]],    hold:   [[6, -26, 5], [20, -15, -7]],
  point:   [[7, -8, 15], [8, 24, 14]],      fists:  [[-2, -24, 9], [8, -36, 5]],
  wring:   [[6, -26, 6], [17, -30, -15]],   cross:  [[9, -25, 3], [15, -15, -26]],
  hug:     [[10, -20, 2], [13, -6, -29]],   pocket: [[-3, -25, 7], [-1, -47, 1]],
  clasp:   [[7, -25, 8], [18, -12, -18]],   carry:  [[2, -26, 4], [15, -45, -1]],
};
const PM0 = { L: 'hang', R: 'hang', lean: 0, crouch: 0, slump: 0, shrug: 0, headDown: 0, tilt: 0, sway: 0, nod: 0 };
const PMOOD = {
  neutral:    {},
  happy:      {},
  excited:    { L: 'up', R: 'up' },
  proud:      { L: 'hips', R: 'hips', lean: -.05, headDown: -.4 },
  relieved:   { R: 'brow' },
  sad:        { lean: .08, slump: 1, headDown: .7 },
  scared:     { L: 'cover', R: 'cover', crouch: .45, lean: -.06, shrug: 1 },
  surprised:  { L: 'spread', R: 'spread', lean: -.04, shrug: .4 },
  confused:   { R: 'scratch', tilt: .13 },
  thinking:   { L: 'across', R: 'chin', headDown: -.35 },
  reading:    { L: 'hold', R: 'hold', headDown: .5, lean: .05 },
  idea:       { R: 'point', headDown: -.2 },
  determined: { L: 'fists', R: 'fists', lean: .04 },
  sleepy:     { slump: 1, headDown: .85, lean: .05, nod: 1 },
  nervous:    { L: 'wring', R: 'wring', shrug: .5 },
  suspicious: { L: 'cross', R: 'cross', lean: -.03, headDown: .15 },
  shiver:     { L: 'hug', R: 'hug', shrug: 1, crouch: .15 },
  hum:        { L: 'pocket', R: 'pocket', sway: 1 },
  starstruck: { L: 'clasp', R: 'clasp', headDown: -.3 },
  hopeful:    { L: 'clasp', R: 'clasp', headDown: -.3 },
};
function personMood(o) {
  const at = name => ({ ...PM0, ...(PMOOD[name] || {}) });
  const cur = at(o.mood), prev = o.prevMood ? at(o.prevMood) : null;
  const k = prev && o.moodAge != null ? backOut(seg(o.moodAge, 0, .4)) : 1, kp = prev && o.moodAge != null ? ease(seg(o.moodAge, 0, .6)) : 1;
  const out = { gL: lerpDeep(GESTURE[prev ? prev.L : cur.L], GESTURE[cur.L], k), gR: lerpDeep(GESTURE[prev ? prev.R : cur.R], GESTURE[cur.R], k),
                pocketL: lerp(prev && prev.L === 'pocket' ? 1 : 0, cur.L === 'pocket' ? 1 : 0, kp), pocketR: lerp(prev && prev.R === 'pocket' ? 1 : 0, cur.R === 'pocket' ? 1 : 0, kp) };
  for (const f in PM0) if (typeof PM0[f] === 'number') out[f] = lerp(prev ? prev[f] : cur[f], cur[f], kp);
  return out;
}

// ---------- the person ----------
function personProj(th) {
  const s = Math.sin(th), c = Math.cos(th);
  return { s, c, P: (f, up, z) => [f * s + z * c, -up], D: (f, up, z) => f * c - z * s };
}
// an upright ellipsoid's outline; pw > 2 squares it off, taper narrows the bottom, bump curls the edge
function meEll(pr, [f, up, z], a, b, h, sc, J, o = {}) {
  const [X, Y] = pr.P(f, up, z), rx = Math.hypot(a * pr.s, b * pr.c), n = o.n || 32, pw = o.pw || 2, P = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU, ct = Math.cos(t), st = Math.sin(t);
    let x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / pw) * rx, y = Math.sign(st) * Math.pow(Math.abs(st), 2 / pw) * h;
    if (o.taper && y > 0) x *= 1 - o.taper * y / h;
    if (o.bump) { const m = frac(t / TAU * o.bump + (o.ph || 0)), k = 1 + o.bk * Math.sqrt(Math.max(0, 1 - (2 * m - 1) ** 2)) - o.bk * .4; x *= k; y *= k; }
    P.push([(X + x) * sc + jit(J), (Y + y) * sc + jit(J)]);
  }
  return P;
}
function meSurf(pr, [f, up, z], a, b, h, c1, c2, c3) {
  const n = [c1 / a, c2 / h, c3 / b], nl = Math.hypot(...n);
  return { p: pr.P(f + c1 * a, up + c2 * h, z + c3 * b), face: pr.D(n[0], n[1], n[2]) / nl };
}
// two-bone reach: the knee (or elbow) between a and c, bent towards dir in the f-up plane
function meKnee(a, c, L1, L2, bendF) {
  const d = Math.hypot(c[0] - a[0], c[1] - a[1]), dd = Math.min(d, L1 + L2 - .01), x = (dd * dd + L1 * L1 - L2 * L2) / (2 * dd);
  const h = Math.sqrt(Math.max(0, L1 * L1 - x * x)), ux = (c[0] - a[0]) / (d || 1), uy = (c[1] - a[1]) / (d || 1);
  const nx = -uy * bendF, ny = ux * bendF;   // perpendicular, towards the front when bendF = 1 for legs going down
  return [a[0] + ux * x + nx * h, a[1] + uy * x + ny * h, lerp(a[2], c[2], .5)];
}

// corner-cutting: rounds a polygon's corners without overshooting them
function chaikin(P, n = 2) {
  let Q = P;
  for (let k = 0; k < n; k++) {
    const R = [];
    for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; R.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); }
    Q = R;
  }
  return Q;
}
let RS_FINE = false;   // the eye's lid line is heavier when the face is drawn large
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

function person(x, y, u, o = {}) {
  const id = o.boilKey ?? 'p', rs = part => boilSeed(`me ${id} ${part}`);
  // how big: the room keeps true scale; a close-up shows the head and shoulders from the corner; an ending, the whole
  const frame = o.frame || 'room';
  let sc = u * 2.22 / 17;
  if (frame === 'peek') { sc = u * 6 / 32; y = y - 400 + 180 * sc; }
  else if (frame === 'stage') { sc = 2.0; y += 90; }
  const m = personMood(o), walking = o.walk != null;
  // which way: a key view, or (while turning) any angle in between
  let th = CAT_YAW[o.view] ?? 0, flip = !!o.flip;
  if (o.yaw != null) { const A = ((o.yaw % TAU) + TAU) % TAU; flip = A > Math.PI + 1e-6; th = flip ? TAU - A : A; }
  const pr = personProj(th), side = Math.abs(pr.s);
  const visZ = pr.D(0, 0, 1) >= 0 ? 1 : -1;   // which side of the body faces us
  const sw = clamp(sc * .5, .5, 2.6) * (o.swMul || 1), J = sc * .3;
  const skin = tintCols(o).col, ink = PAL.ink;
  x += (o.dx || 0) * u * .8;
  const dy = (o.dy || 0) * u * .8, sq = ((o.sq || 0) + (o.take || 0)) * .45;

  // ----- the skeleton -----
  const ph = walking ? o.walk * 68 / 290 * TAU : 0, idle = !walking && frame !== 'peek';
  const breath = walking ? 0 : Math.sin(T * TAU * .21) * .45, shift = idle ? Math.sin(T * .37) : 0;
  const crouch = m.crouch, bob = walking ? -1.6 * Math.cos(2 * ph) : 0, sway = m.sway * Math.sin(T * 2.2) * .03;
  const pelvis = [0, 92 - crouch * 13 + bob, shift * 1.3], lean = m.lean + (walking ? .03 : 0);
  const sh = [pelvis[0] + Math.sin(lean) * 54, pelvis[1] + Math.cos(lean) * 54 - m.slump * 2.5 + m.shrug * 2.5 + breath, -shift * .3];
  const nod = m.nod * Math.max(0, Math.sin(T * 1.1)) ** 3;
  const hd = m.headDown + nod * .6;
  const head = [sh[0] + 1.5 + hd * 3.5, sh[1] + 19 - Math.max(0, hd) * 3 - m.shrug * 1.5 + Math.max(0, -hd) * .5, sh[2] * .5];
  const hem = pelvis[1] - 1;
  // legs: the feet are planted, or walking heel to toe; the knees find themselves
  const legs = [1, -1].map(sg => {
    const hip = [pelvis[0], pelvis[1] - 2, pelvis[2] + sg * 9.5];
    let ank = [crouch * 2, 9, sg * 10.5], pitch = 0;
    if (walking) {
      const p = ph + (sg > 0 ? 0 : Math.PI), lift = Math.max(0, Math.cos(p));
      ank = [26 * Math.sin(p), 9 + 10 * lift ** 1.5, sg * 9.5]; pitch = .5 * lift * Math.sin(p);
    }
    const knee = meKnee(hip, ank, 40.5, 40.5, 1);
    return { sg, hip, knee, ank, pitch };
  });
  // arms: the gesture, swinging when walking, and what is carried
  const hook = o.armR || o.armL;
  const arms = [1, -1].map(sg => {
    const S = [sh[0], sh[1] - 1, sh[2] + sg * 20.5];
    let g = sg > 0 ? m.gL : m.gR;
    if (walking) g = GESTURE.hang;
    if (hook && sg < 0) g = GESTURE.carry;
    let [E, Hd] = g.map(v => [S[0] + v[0], S[1] + v[1], S[2] + sg * v[2]]);
    if (walking && !(hook && sg < 0)) { const swg = -Math.sin(ph + (sg > 0 ? 0 : Math.PI)); E[0] += swg * 7; Hd[0] += swg * 17; Hd[1] += Math.abs(swg) * 3; }
    const mood = o.mood;
    if (mood === 'excited') Hd[1] += 6 * Math.sin(T * TAU * 2 + sg);
    if (mood === 'determined') Hd[1] += 5 * Math.max(0, Math.sin(T * TAU + (sg > 0 ? 0 : Math.PI)));
    if (mood === 'nervous' || mood === 'shiver') Hd[2] += 1.2 * Math.sin(T * TAU * (mood === 'shiver' ? 9 : 3) + sg);
    if (mood === 'happy') Hd[0] += 3 * Math.sin(T * TAU * .5 + sg);
    const hidden = (sg > 0 ? m.pocketL : m.pocketR) > .5 && !walking;
    // a sleeve hanging beside the body joins the shirt's outline; one in front of it is drawn over it
    const zo = (Hd[2] - S[2]) * sg, ze = (E[2] - S[2]) * sg;
    const beside = Math.abs(pr.c) > .55 && zo > -4 && ze > 1;
    return { sg, S, E, Hd, hidden, beside, end: lerp3(S, E, .72) };
  });

  // ----- shadow, then the figure -----
  if (!o.noShadow && frame !== 'peek') softBlob(x, y + sc * 1.5, sc * lerp(30, 42, side), sc * 7, '#1a1424', .5 * (o.shadowK ?? 1));
  push();
  translate(x, y + dy);
  rotate((o.rot || 0) * .35 + sway);
  scale((flip ? -1 : 1) * (1 + sq * .4), 1 - sq);
  scale(sc, sc);
  const S1 = 1 / sc;   // brush widths are in pixels; undo the scale for them
  const items = [];
  for (const L of legs) items.push({ d: pr.D(L.ank[0], 0, L.ank[2]) - 50, draw: () => meLeg(L) });
  items.push({ d: -40, draw: () => meHips() });
  items.push({ d: 0, draw: () => meTorso() });
  for (const A of arms) {
    const dh = pr.D(A.Hd[0] - A.S[0], 0, A.Hd[2] - A.S[2]), dsh = pr.D(0, 0, A.S[2]);
    let d = Math.min(9, dsh * .6 + dh * .5 + .3); if (A.beside) d = Math.max(d, .05);
    if (pr.c > 0 && A.Hd[1] > sh[1] - 8 && A.Hd[0] > head[0] + 3) d = 20;   // a hand up in front of the face
    items.push({ d, draw: () => meArm(A) });
  }
  items.push({ d: 10, draw: () => meHead() });   // the head always over the collar
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.draw();
  rs('draw'); if (o.draw) o.draw(u, sw);
  pop();

  // ----- emotes by the head -----
  rs('emote');
  if (o.emote) {
    const dir = flip ? -1 : 1, [hx, hy] = pr.P(...head), es = frame === 'peek' ? u * .9 : u * 1.05;
    const top = EMOTE_TOP.includes(o.emote) || o.emote === 'music';
    let ex = x + dir * hx * sc, ey = y + dy + (hy - (top ? 23 : 4)) * sc;
    if (o.emote === 'breath') { const mo = pr.P(head[0] + 11, head[1] - 7, 0); ex = x + dir * mo[0] * sc + dir * es * .6; ey = y + dy + mo[1] * sc; }
    else if (!top) { ex += dir * 28 * sc; ey -= 6 * sc; }
    if (o.emote === 'music') ex += dir * 11 * sc;
    emote(o.emote, ex, ey, es * (o.emoteScale || 1), o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');

  // ===== the parts, in centimetres =====
  function proj(p) { return pr.P(p[0], p[1], p[2]); }
  function rib(pts, w0, w1) { return ribbon(pts.map(p => { const [a, b] = proj(p); return [a + jit(J * S1 * .5), b + jit(J * S1 * .5)]; }), w0, w1); }
  function openInk(rb, cut, w = sw) { const k = Math.floor(rb.length / 2 * cut); inkLine(rb.slice(k, rb.length - k), w * S1, ink, 'ink', 0); }
  function solid(pts3, rnd = 2) { return chaikin(hullPts(pts3.map(proj), false), rnd).map(([p, q]) => [p + jit(J * S1 * .35), q + jit(J * S1 * .35)]); }

  function meLeg(L) {
    rs('leg' + L.sg);
    const near = pr.D(0, 0, L.sg) >= -.01, col = near || side < .3 ? ME.jeans : mixCol(ME.jeans, ME.jeansDk, .7);
    // the shin's own direction, for the cuff and the sock
    const v = [L.knee[0] - L.ank[0], L.knee[1] - L.ank[1]], vl = Math.hypot(...v) || 1, at = t => [L.ank[0] + v[0] / vl * t, L.ank[1] + v[1] / vl * t, L.ank[2]];
    const rb = rib([L.hip, L.knee, at(16)], 19, 18.4);
    paint(rb, { wash: col, tex: 0, pool: 0, ink: null });
    openInk(rb, .1);
    if (sc > 1.2 && side > .3) inkLine([proj([L.knee[0] + 2, L.knee[1] + 3, L.knee[2]]), proj([L.knee[0] + .5, L.knee[1] - 1, L.knee[2]])], sw * .45 * S1, ME.jeansDk, 'inkfine', .5);
    // a cream sock, then the deep turned-up cuff
    paint(rib([at(-1), at(6)], 11, 11), { wash: ME.sock, tex: 0, pool: 0, ink, sw: sw * .6 * S1 });
    const cb = rib([at(4.5), at(17.5)], 20.5, 20.5), n = cb.length / 2;
    paint(cb, { wash: near || side < .3 ? ME.cuff : mixCol(ME.cuff, ME.jeansDk, .5), tex: 0, pool: 0, ink, sw: sw * .7 * S1 });
    const mid = Math.floor(n / 2);
    inkLine([cb[mid], cb[cb.length - 1 - mid]], sw * .45 * S1, ME.jeansDk, 'inkfine', 0);
    meShoe(L);
  }

  // a heavy shoe with a thick sole and yellow welt stitching, laced, its toe cap seamed
  function meShoe(L) {
    rs('shoe' + L.sg);
    const A = L.ank, cp = Math.cos(L.pitch), sp = Math.sin(L.pitch);
    const at = (f, up, z) => [A[0] + f * cp - up * sp, A[1] + f * sp + up * cp, A[2] + z];
    const wOf = f => f > 12 ? 5.9 : f < -3 ? 4.9 : 5.4;
    const PROF = [[-8.6, -8.6], [-8.8, -5.5], [-8.2, -.5], [-4.5, 1.6], [1.5, 2.4], [6, 1.4], [9.5, -.3], [15, -2.8], [20.5, -4.4], [23.8, -6.2], [24.2, -8.6]];
    const upper = [];
    for (const [f, up] of PROF) for (const zs of [-1, 1]) upper.push(at(f, up, zs * wOf(f)));
    const upP = solid(upper, 1);
    paint(upP, { wash: ME.boot, tex: 0, pool: 0, ink, sw: sw * S1 });
    const sole = [];
    for (const [f, up] of [[-9.2, -9.6], [24.6, -9.6], [25.2, -6.4], [-9.4, -6.4]]) for (const zs of [-1, 1]) sole.push(at(f, up, zs * (wOf(f) + .5)));
    paint(solid(sole, 1), { wash: ME.sole, tex: 0, pool: 0, ink, sw: sw * .9 * S1 });
    if (sc > 1.3) {
      // the stitching round the welt, as dashes
      const loop = [];
      for (let f = -8.5; f <= 21; f += 2.6) loop.push(at(f, -6.5, visZ * (wOf(f) + .45)));
      for (let a = -Math.PI / 2; a <= Math.PI / 2; a += .35) loop.push(at(21 + 3.9 * Math.cos(a), -6.5, -visZ * (wOf(21) + .45) * Math.sin(a)));
      const Q = loop.map(proj);
      for (let i = 0; i + 1 < Q.length; i += 2) inkLine([Q[i], [lerp(Q[i][0], Q[i + 1][0], .6), lerp(Q[i][1], Q[i + 1][1], .6)]], sw * .45 * S1, ME.stitch, 'inkfine', 0);
      // the toe cap's seam, the laces
      if (pr.c > .1 || side > .6) inkLine([-4.6, -2.5, 0, 2.5, 4.6].map(z => proj(at(15.5 + 1.6 * (1 - (z / 4.6) ** 2), -2.6 - .2 * (1 - (z / 4.6) ** 2), z))), sw * .45 * S1, '#4D4547', 'inkfine', .5);
      for (const [f, up] of [[5.2, 1.6], [7.8, .6]]) for (const z of [-1.7, 1.7]) { const p = proj(at(f, up, z)); paint(ellPts(p[0], p[1], .35, .35, 6), { wash: '#6A6264', tex: 0, pool: 0, ink: null }); }
      const b0 = proj(at(6.6, 2.2, 0));
      for (const s2 of [-1, 1]) paint(ellPts(b0[0] + s2 * 1.1, b0[1] - .4, 1.1, .6, 10, 0, s2 * .4), { ink: '#151214', sw: sw * .4 * S1 });
    }
  }

  // the top of the jeans, where the shirt ends: pockets and fly in front, patch pockets behind
  function meHips() {
    rs('hips');
    const pts = [];
    for (const [up, w, d] of [[pelvis[1] + 5, 20, 12], [pelvis[1] - 9, 19.5, 11.5]]) for (const sz of [-1, 1]) for (const sf of [-1, 1]) pts.push([pelvis[0] + sf * d, up, pelvis[2] + sz * w]);
    const P = solid(pts, 2);
    paint(P, { wash: ME.jeans, tex: 0, pool: 0, ink, sw: sw * S1 });
    if (sc < 1.1) return;
    const f0 = pelvis[0] + 11.6, z0 = pelvis[2];
    if (pr.c > .25) {
      inkLine([[f0, hem, z0 + 1.6], [f0, hem - 6, z0 + 1.6], [f0, hem - 8.5, z0 + .3]].map(proj), sw * .45 * S1, ME.jeansDk, 'inkfine', .5);
      for (const sg of [1, -1]) inkLine([[f0 - .4, hem, z0 + sg * 12], [f0 - .3, hem - 4, z0 + sg * 15.5], [f0 - 1.2, hem - 6, z0 + sg * 19.4]].map(proj), sw * .45 * S1, ME.jeansDk, 'inkfine', .6);
    } else if (pr.c < -.25) {
      for (const sg of [1, -1]) { const zc = z0 + sg * 8.5, f = pelvis[0] - 11.6; paint([[f, hem - 1, zc - 4], [f, hem - 1, zc + 4], [f, hem - 8, zc + 3.6], [f, hem - 9.4, zc], [f, hem - 8, zc - 3.6]].map(proj), { ink: ME.jeansDk, sw: sw * .45 * S1, br: 'inkfine' }); }
    }
  }

  // an oversized T-shirt: dropped shoulders, wide sleeves, a ribbed collar
  function meTorso() {
    rs('torso');
    const nb = [sh[0] + .3, sh[1] - 3, sh[2]], nt = [head[0] - 1.2, head[1] - 8, head[2]];
    paint(rib([nb, nt], 11.8, 11), { wash: skin, tex: 0, pool: 0, ink, sw: sw * .8 * S1 });
    if (pr.c > .3 && sc > 1.2) { const a = proj([nb[0] + 6.6, nb[1] + 5.5, nb[2]]); inkLine([[a[0] - .9, a[1] - .4], [a[0], a[1] + .3], [a[0] + .9, a[1] - .4]], sw * .45 * S1, ME.skinDk, 'inkfine', .5); }
    const pts = [];
    // collar, the slope of the shoulders, the shoulder line, under the arms, the hem
    for (const [up, w, d] of [[sh[1] + 3.6, 7.6, 6], [sh[1] + 1.4, 14.5, 8.6], [sh[1] - 1.6, 19.6, 10.2], [sh[1] - 14, 21, 10.8], [hem, 21.6, 11.4]]) {
      const fc = lerp(pelvis[0], sh[0], (up - hem) / (sh[1] - hem)), zc = lerp(pelvis[2], sh[2], (up - hem) / (sh[1] - hem));
      for (const sz of [-1, 1]) for (const sf of [-1, 1]) pts.push([fc + sf * d, up, zc + sz * w]);
    }
    const tee = solid(pts, 2), polys = [tee];
    // round shoulders always belong to the shirt; a sleeve hanging beside it joins the outline too
    for (const A of arms) { polys.push(meCap(A)); if (A.beside) { A.sleeve = meSleeve(A); polys.push(A.sleeve); } }
    for (const Q of polys) paint(Q, { ink, sw: sw * 1.8 * S1 });
    for (const Q of polys) paint(Q, { wash: ME.tee, tex: 0, pool: 0, ink: null });
    grainIn(polys, .22);
    // the ribbed neckband, front or back
    if (Math.abs(pr.c) > .08) {
      const s2 = pr.c > 0 ? 1 : -1, arc = [];
      for (let a = -1.35; a <= 1.36; a += .27) arc.push(proj([sh[0] + s2 * 6.4 * Math.cos(a), sh[1] + 2.3 - (s2 > 0 ? 1.6 : .5) * Math.cos(a), sh[2] + 7.2 * Math.sin(a)]));
      inkLine(arc, sw * 2.2 * S1, '#262224', 'ink', .5);
      inkLine(arc.map(([p, q]) => [p, q + .8]), sw * .5 * S1, ink, 'inkfine', .5);
    }
    // soft folds
    if (sc > 1.2) {
      rs('folds');
      const fc = pr.c > 0 ? 1 : -1;
      for (const sg of [1, -1]) {
        const f = (sh[0] + pelvis[0]) / 2 + fc * 10.6;
        inkLine([[f, sh[1] - 11, sh[2] + sg * 18], [f, sh[1] - 19, sh[2] + sg * 13.5]].map(proj), sw * .45 * S1, ME.teeLt, 'inkfine', .5);
        inkLine([[pelvis[0] + fc * 11.4, hem + 6, pelvis[2] + sg * 6], [pelvis[0] + fc * 11.4, hem + 1, pelvis[2] + sg * 8]].map(proj), sw * .4 * S1, ME.teeLt, 'inkfine', .5);
      }
    }
  }
  // the sleeve hangs from a rounded shoulder cap, a little wider at the hem
  function meCap(A) { return meEll(pr, [A.S[0], A.S[1] - 5.6, A.S[2]], 6.6, 8, 5.6, 1, J * S1 * .3, { n: 24 }); }
  function meSleeve(A) { return rib([[A.S[0], A.S[1] - 5.2, A.S[2]], A.end], 12.5, 16); }

  function meArm(A) {
    rs('arm' + A.sg);
    const { S, E, Hd } = A;
    // forearm and the bit of upper arm below the sleeve
    const arm = rib([lerp3(S, E, .7), E, Hd], 8.6, 6.4);
    paint(arm, { wash: skin, tex: 0, pool: 0, ink: null });
    openInk(arm, .05, sw * .85);
    if (sc > 1) meTattoos(A);
    if (!A.hidden) meHand(A);
    // the sleeve: joined to the shirt (only its hem to draw) or over the body
    rs('sleeve' + A.sg);
    if (A.beside && A.sleeve) { const n = A.sleeve.length / 2; inkLine([A.sleeve[n - 1], A.sleeve[n]], sw * .9 * S1, ink, 'ink', 0); }
    else if (Math.abs(pr.c) > .55) {   // across the chest: the sleeve comes out of the shoulder, which is the shirt's
      const sl = meSleeve(A); paint(sl, { wash: ME.tee, tex: 0, pool: 0, ink: null }); openInk(sl, .3);
    } else {   // seen from the side: cap and sleeve as one piece of cloth, outlined where it lies on the shirt
      const pcs = [meCap(A), meSleeve(A)];
      for (const Q of pcs) paint(Q, { ink, sw: sw * 1.6 * S1 });
      for (const Q of pcs) paint(Q, { wash: ME.tee, tex: 0, pool: 0, ink: null });
      grainIn(pcs, .22);
      const n = pcs[1].length / 2; inkLine([pcs[1][n - 1], pcs[1][n]], sw * .9 * S1, ink, 'ink', 0);
    }
  }

  // a relaxed hand, the thumb towards the front
  function meHand(A) {
    rs('hand' + A.sg);
    const [hx, hy] = proj(A.Hd), [ex, ey] = proj(A.E), ang = Math.atan2(hy - ey, hx - ex);
    const sa = Math.sign(Math.sin(ang)) || 1, thumb = side > .5 ? -sa : A.sg * sa * (pr.c >= 0 ? 1 : -1);
    push(); translate(hx, hy); rotate(ang); scale(1, thumb > 0 ? 1 : -1);
    paint([[-.5, -2.7], [3.5, -3.2], [7, -3], [8.8, -1.8], [9.3, .2], [8.6, 2.2], [6.8, 3], [5.6, 3.1], [6.2, 4.3], [5.4, 5.1], [3.6, 4.8], [1.5, 3.6], [-.5, 2.7]].map(([p, q]) => [p + jit(J * S1 * .2), q + jit(J * S1 * .2)]),
      { wash: skin, tex: 0, pool: 0, ink, sw: sw * .75 * S1, curv: .3 });
    if (sc > 1.3) for (const q of [-1.1, .5, 1.9]) inkLine([[6.3, q], [8.6, q + .15]], sw * .4 * S1, ME.skinDk, 'inkfine', 0);
    pop();
    if (hook && A.sg < 0) { push(); translate(hx, hy); rotate(Math.PI + .7); hook(4.5, sw * S1); pop(); }
  }

  // tattoo sleeves: little motifs in fine black line down both forearms
  function meTattoos(A) {
    rs('tattoo' + A.sg);
    const seg2 = (a, b, t) => { const p = proj(lerp3(a, b, t)), q = proj(lerp3(a, b, Math.min(1, t + .05))); return [p, Math.atan2(q[1] - p[1], q[0] - p[0])]; };
    const spots = [[A.end, A.E, .45, 0], [A.E, A.Hd, .14, -1], [A.E, A.Hd, .34, 1], [A.E, A.Hd, .54, -1], [A.E, A.Hd, .73, 1], [A.E, A.Hd, .88, 0]];
    spots.forEach(([a, b, t, off], i) => {
      const [p, ang] = seg2(a, b, t);
      push(); translate(p[0], p[1]); rotate(ang + Math.PI / 2); translate(off * 1.2, 0);
      meGlyph(TATTOOS[(i + (A.sg > 0 ? 3 : 0)) % TATTOOS.length], sw * .36 * S1, sc > 3);
      pop();
    });
  }

  function meHead() {
    rs('head');
    const hth = th + clamp(o.lookX || 0, -1, 1) * .28, hp = personProj(hth), facing = hp.c;
    const [hx, hy] = pr.P(...head), tilt = (o.rot || 0) * 1.8 + m.tilt;
    push(); translate(hx, hy); rotate(tilt);
    const C0 = [0, 0, 0], A = 11.2, B = 11.4, Hh = 13;
    const stamp = (c, r, k) => ellPts(c[0], c[1], r, r * .93, 12, J * S1 * .3, k * 6);
    // tufts of hair at the nape show beside the jaw: behind the head when we see the face
    const nape = [1, -1].map(sg => { const sp = meSurf(hp, C0, A, B, Hh, -.45, -.62, sg * .64); return stamp(sp.p, 3.3, hash(sg + 3)); });
    const hairMass = (polys) => {
      for (const Q of polys) paint(Q, { ink, sw: sw * 1.6 * S1 });
      for (const Q of polys) paint(Q, { wash: ME.hair, tex: 0, pool: 0, ink: null });
      grainIn(polys, .25);
    };
    if (facing > 0) hairMass(nape);
    // head, ears and nose as one silhouette
    const headP = meEll(hp, C0, A, B, Hh, 1, J * S1 * .4, { pw: 3.2, taper: .14 });
    const ears = [1, -1].map(sg => meEll(hp, [-.4, -1.8, sg * 11.7], 2.0, 1.6, 3.3, 1, J * S1 * .2, { n: 16 }));
    const nose = meEll(hp, [11.4, -2.8, 0], 1.7, 1.5, 2.1, 1, J * S1 * .2, { n: 16 });
    // seen from the front the ears stick out of the outline; from the side they sit on the head and are drawn on it
    const earsOut = Math.abs(hp.s) < .55, sil = earsOut ? [headP, ...ears, nose] : [headP, nose];
    for (const Q of sil) paint(Q, { ink, sw: sw * 1.8 * S1 });
    for (const Q of sil) paint(Q, { wash: skin, tex: 0, pool: 0, ink: null });
    grainIn(sil, .22);
    if (!earsOut) ears.forEach((Q, i) => { if (hp.D(0, 0, i ? -1 : 1) > 0) paint(Q, { wash: skin, tex: 0, pool: 0, ink, sw: sw * .9 * S1 }); });
    // the curl inside each ear
    for (const sg of [1, -1]) {
      if (hp.D(0, 0, sg) < -2) continue;
      const c = hp.P(-.4, -1.8, sg * 12.4), mir = (hp.P(0, 0, sg)[0] > 0 ? 1 : -1);
      inkLine([[-.3, -1.3], [.5, -1.5], [.8, -.7], [.2, 0], [.15, .8]].map(([p, q]) => [c[0] + mir * p, c[1] + q]), sw * .5 * S1, ME.skinDk, 'inkfine', .6);
    }
    // the face
    if (facing > -.05) {
      rs('face');
      const surf = (c2, c3) => meSurf(hp, C0, A, B, Hh, Math.sqrt(Math.max(0, 1 - c2 * c2 - c3 * c3)), c2, c3);
      for (const sg of [1, -1]) {
        const c = surf(-.34, sg * .68); if (c.face < .1) continue;
        paint(ellPts(c.p[0], c.p[1], 2.3 * c.face, 1.8, 12), { fill: ME.cheek, fillOp: 160 + 80 * clamp(o.blush === true ? 1 : o.blush || 0), bleed: .12, layers: 3, tex: .2, ink: null });
        if (sc > 1.4) for (let i = 0; i < 8; i++) { const f = surf(-.18 - hash(i * 3 + sg) * .3, sg * (.12 + hash(i * 5 + sg) * .5)); if (f.face > .2) paint(ellPts(f.p[0], f.p[1], .3, .27, 6), { wash: ME.skinDk, tex: 0, pool: 0, ink: null }); }
      }
      // the eyes fill the round glasses
      rs('eyes');
      const el = .1 - m.headDown * .05 - (o.lookY || 0) * .05;
      const eyes = [1, -1].map(sg => ({ sg, sp: surf(Math.sin(el), sg * Math.sin(.42)) }));
      for (const { sg, sp } of eyes) {
        if (sp.face < .1) continue;
        push(); translate(sp.p[0], sp.p[1]); scale(clamp(sp.face * 1.1, .25, 1), 1);
        RS_FINE = sc > 3; meEye(o, sg * (flip ? -1 : 1), sw * S1 * (sc > 3 ? 1 : .8));
        pop();
      }
      for (const { sg, sp } of eyes) {
        if (sp.face < -.15) continue;
        const fz = clamp(sp.face * 1.1, .12, 1);
        paint(ellPts(sp.p[0], sp.p[1], 5.1 * fz, 4.9, 26, J * S1 * .12), { ink: ME.rim, sw: sw * (sc > 3 ? 1.1 : .72) * S1 });
        if (sc > 1.6) inkLine([[sp.p[0] - 3.1 * fz, sp.p[1] - 2.8], [sp.p[0] - 1.4 * fz, sp.p[1] - 3.9]], sw * .5 * S1, '#FFFFFF', 'inkfine', .4);
        if (facing < .8 && hp.D(0, 0, sg) > 0) inkLine([[sp.p[0] - (hp.s > 0 ? 5.1 * fz : -5.1 * fz), sp.p[1] - .5], hp.P(-.5, 0, sg * 11.2)], sw * .6 * S1, ME.rim, 'inkfine', 0);
      }
      const [e0, e1] = eyes.map(e => e.sp), dir = Math.sign(e1.p[0] - e0.p[0]) || 1;
      if (e0.face > -.15 && e1.face > -.15) inkLine([[e0.p[0] + dir * 5.1 * clamp(e0.face * 1.1, .12, 1), e0.p[1] - .8], surf(.16, 0).p, [e1.p[0] - dir * 5.1 * clamp(e1.face * 1.1, .12, 1), e1.p[1] - .8]], sw * .6 * S1, ME.rim, 'inkfine', .5);
      // nostrils, the moustache, the mouth
      rs('mouth');
      if (facing > .25) { const n = hp.P(12.4, -3.9, 0); inkLine([[-1.1, .1], [-.55, .6], [0, .35], [.55, .6], [1.1, .1]].map(([p, q]) => [n[0] + p * facing, n[1] + q]), sw * .45 * S1, ME.skinDk, 'inkfine', .5); }
      const mo = surf(-.4, 0), mf = Math.max(.25, facing);
      push(); translate(mo.p[0] + (1 - facing) * hp.s * 1.2, mo.p[1]); scale(mf, 1);
      paint([[-4.9, 1.5], [-4.3, -.2], [-3.1, -.9], [-1.7, -1.1], [-.7, -.6], [0, -.95], [.7, -.6], [1.7, -1.1], [3.1, -.9], [4.3, -.2], [4.9, 1.5], [3.7, 1.2], [2, 1.05], [0, .85], [-2, 1.05], [-3.7, 1.2]].map(([p, q]) => [p + jit(J * S1 * .1), q + jit(J * S1 * .1)]),
        { wash: ME.hair, tex: 0, pool: 0, ink: ME.hair, sw: sw * .5 * S1, curv: .45 });
      translate(0, 2.4); meMouth(o.mouth, sw * S1);
      pop();
    }
    // the hair: big curls stamped over the scalp above the hairline, sideburns down past the ears
    rs('hair');
    const polys = [], centres = [];
    for (const [nf, nu, nz, k] of HAIR_SITES) {
      const top = nu > .45, sp = meSurf(hp, [-1, 3.4, 0], 12.2, 11.6, top ? 14.4 : 13.4, nf, nu, nz);
      if (sp.face < -.25) continue;
      polys.push(stamp(sp.p, (top ? 4.5 : 3.4) * (.86 + .28 * k), k));
      if (sp.face > .1) centres.push(sp.p);
    }
    if (facing > .85) for (const sg of [1, -1]) polys.push(meEll(hp, [2.5, .6, sg * 11.2], .95, .9, 4.4, 1, J * S1 * .2, { n: 16 }));
    for (const Q of polys) paint(Q, { ink, sw: sw * 1.6 * S1 });
    if (facing < -.3 && centres.length > 3) paint(hullPts(centres, false), { wash: ME.hair, tex: 0, pool: 0, ink: null });
    for (const Q of polys) paint(Q, { wash: ME.hair, tex: 0, pool: 0, ink: null });
    grainIn(polys, .25);
    pop();
  }
}

// where the curls grow: points spread evenly over a sphere, kept above the hairline, the same on both sides
const HAIR_SITES = (() => {
  const out = [], N = 110;
  for (let i = 0; i < N; i += 2) {
    const nu = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - nu * nu), ph = i * 2.39996, nf = r * Math.cos(ph), nz = Math.abs(r * Math.sin(ph));
    const keep = nu > .44 - .3 * Math.max(0, -nf) || (nf < -.2 && nu > -.62) || (nf < .1 && nu > .16 && nz > .55);
    if (keep) out.push([nf, nu, nz, hash(i * 1.37)], [nf, nu, -nz, hash(i * 2.11)]);
  }
  return out;
})();

// ---------- tattoo motifs, in a box about four centimetres high ----------
const TATTOOS = ['face', 'snake', 'flower', 'skull', 'dagger', 'swallow', 'rose', 'star'];
function meGlyph(kind, w, fine) {
  const L = (pts, c = .5) => inkLine(pts, w, ME.tattoo, 'inkfine', c), dot = (x, y, r = .22) => paint(ellPts(x, y, r, r, 6), { wash: ME.tattoo, tex: 0, pool: 0, ink: null });
  switch (kind) {
    case 'face':
      paint(ellPts(0, .2, 1.2, 1.45, 14), { ink: ME.tattoo, sw: w, br: 'inkfine' });
      L([[-1.5, .3], [-1.2, -1.2], [0, -1.8], [1.2, -1.2], [1.5, .3]], .6); dot(-.45, 0); dot(.45, 0);
      if (fine) { L([[-.5, .75], [0, .6], [.5, .75]], .4); for (const s of [-1, 1]) paint(ellPts(s * .9, -1.7, .45, .45, 8), { ink: ME.tattoo, sw: w * .8, br: 'inkfine' }); }
      break;
    case 'snake': L([[-1.6, 1.8], [-.4, 1.1], [.6, 1.4], [1.2, .3], [0, -.4], [-1, -.9], [-.2, -1.7], [1.2, -1.8]], .6); dot(1.3, -1.8, .4); break;
    case 'flower': for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; paint(ellPts(Math.cos(a) * .85, Math.sin(a) * .85, .55, .55, 8), { ink: ME.tattoo, sw: w * .9, br: 'inkfine' }); } dot(0, 0, .3); break;
    case 'skull':
      paint([[-1.1, -1.4], [1.1, -1.4], [1.3, .1], [.7, .5], [.7, 1.2], [-.7, 1.2], [-.7, .5], [-1.3, .1]], { ink: ME.tattoo, sw: w, br: 'inkfine', curv: .5 });
      dot(-.5, -.4, .32); dot(.5, -.4, .32); if (fine) L([[-.3, .9], [-.3, 1.2]], 0), L([[.3, .9], [.3, 1.2]], 0); break;
    case 'dagger': L([[0, -2], [0, 1.2]], 0); L([[-.9, -.8], [.9, -.8]], 0); L([[-.25, 1.2], [0, 1.9], [.25, 1.2]], .3); break;
    case 'swallow': L([[-1.8, -.6], [-.7, .2], [0, -.1], [.7, .2], [1.8, -.6]], .5); L([[0, -.1], [-.3, 1.2]], .3); L([[0, -.1], [.3, 1.2]], .3); break;
    case 'rose': { const sp = []; for (let i = 0; i < 14; i++) { const a = i * .8, r = .15 + i * .08; sp.push([Math.cos(a) * r, Math.sin(a) * r]); } L(sp, .6); L([[0, 1.3], [-.2, 2]], .3); break; }
    case 'star': paint(starPts(0, 0, 1.4, .45, 5), { ink: ME.tattoo, sw: w, br: 'inkfine' }); break;
  }
}

// ---------- the face: a heavy-lidded sideways look, as in the portrait ----------
function meEye(o, s, sw) {
  const kind = Array.isArray(o.eyes) ? o.eyes[s < 0 ? 0 : 1] : o.eyes === 'wink' ? (s < 0 ? 'happy' : 'normal') : (o.eyes || 'normal');
  const LID = { normal: .3, look: .3, dot: .3, wide: .02, shine: .2, scared: 0, blank: .3, narrow: .62, determined: .5, angry: .55, sleepy: .78, sad: .42, teary: .42 };
  if (!(kind in LID)) { push(); scale(.7); eye(kind, s, 2.8, { ...o, lookX: (o.lookX || 0) * .6 }, sw / .7); pop(); return; }
  const w = 5.4, h = kind === 'wide' || kind === 'scared' ? 3.9 : 3.4;
  const blink = ((T + (o.seed || 0) * 1.9) % 4.3) < .13 && kind !== 'sleepy';
  const lid = blink ? 1 : clamp(LID[kind] + (o.squint || 0) * (1 - LID[kind]));
  const glance = .6 * Math.tanh(3 * Math.sin(T * .31 + 1.3));
  const lx = clamp((o.lookX || 0) + (kind === 'scared' ? 0 : glance), -1, 1) * w * .24, ly = (o.lookY || 0) * h * .16;
  const N = 12, top = [], bot = [];
  for (let i = 0; i <= N; i++) { const t = i / N, X = (t - .5) * w, b = Math.sin(t * Math.PI); top.push([X, -b * h * .55]); bot.push([X, b * h * .45]); }
  if (lid > .93) { inkLine(bot.map(([a, b]) => [a, b * .3]), sw * 1.2, PAL.ink, 'ink', .5); return; }
  const shape = top.concat(bot.slice().reverse());
  paint(shape, { wash: '#FBF6EE', tex: 0, pool: .4, ink: null });
  C.save(); tracePath(shape); C.clip();
  const ir = kind === 'scared' ? .75 : 1.5;
  paint(ellPts(lx, ly + .15, ir, ir, 16), { wash: ME.iris, tex: 0, pool: 0, ink: null });
  paint(ellPts(lx + ir * .25, ly + .15, ir * .62, ir * .62, 14), { wash: '#55525A', tex: 0, pool: 0, ink: null });
  paint(ellPts(lx + ir * .3, ly + .15, ir * .42, ir * .42, 12), { wash: PAL.ink, tex: 0, pool: 0, ink: null });
  paint(ellPts(lx - ir * .35, ly - ir * .3, ir * .2, ir * .2, 8), { wash: PAL.cream, tex: 0, pool: 0, ink: null });
  // the lid: skin from the top down to a straight edge (slanted when sad or cross), its rim dark
  const slope = kind === 'sad' || kind === 'teary' ? -.5 : kind === 'angry' || kind === 'determined' ? .45 : 0;
  const ly0 = lerp(-h * .55, h * .45, lid), a = [-w, ly0 - slope * s * w * .25], b = [w, ly0 + slope * s * w * .25];
  if (lid > .03) paint([[-w, -h * 2], [w, -h * 2], b, a], { wash: ME.skin, tex: 0, pool: 0, ink: null });
  C.restore();
  if (lid > .03) inkLine([[-w * .56, a[1] + (b[1] - a[1]) * .2], [w * .56, a[1] + (b[1] - a[1]) * .8]], sw * (RS_FINE ? 1.5 : 1), '#3A2A2A', 'ink', 0);
  inkLine(top, sw * (lid > .03 ? .5 : 1.2), PAL.ink, 'ink', .4);
  inkLine(bot, sw * .45, PAL.ink, 'inkfine', .4);
  if (kind === 'teary') paint(ellPts(0, h * .6 + Math.sin(T * 9 + s) * .15, w * .45, .5, 12), { wash: PAL.sky, washOp: 210, tex: 0, ink: PAL.ink, sw: sw * .4 });
}
function meMouth(m, sw) {
  const line = (pts, w = .8) => inkLine(pts, sw * w, '#8A3E3A', 'ink', .6);
  const open = { O: [1.3, 1.6], open: [1.8, 1.2], yawn: [1.5, 2.2], o: [.8, .9], teeth: [2.2, 1.1] }[m];
  if (open) {
    paint(ellPts(0, .3 + open[1] * .5, open[0], open[1] * .6, 14), { wash: '#4A1F2A', tex: 0, pool: 0, ink: PAL.ink, sw: sw * .5 });
    if (m === 'teeth') paint(rectPts(-open[0] * .8, .1, open[0] * 1.6, .55), { wash: PAL.cream, tex: 0, pool: 0, ink: null });
    else if (m !== 'o') paint(ellPts(0, .3 + open[1] * .85, open[0] * .55, open[1] * .2, 10), { wash: PAL.rose, tex: 0, pool: 0, ink: null });
    return;
  }
  switch (m) {
    case 'frown': line([[-1.6, .9], [0, .1], [1.6, .9]]); break;
    case 'wobble': line([[-1.8, .4], [-.9, .1], [0, .4], [.9, .1], [1.8, .4]], .7); break;
    case 'flat': line([[-1.4, .3], [1.4, .3]]); break;
    case 'pout': line([[-.7, .5], [0, .1], [.7, .5]], 1); break;
    case 'smirk': line([[-1.4, .3], [.4, .35], [1.6, -.3]]); break;
    case 'grin':
      paint([[-2, -.1], [2, -.1], [1.2, 1.3], [-1.2, 1.3]], { wash: '#4A1F2A', tex: 0, pool: 0, ink: PAL.ink, sw: sw * .5, curv: .4 });
      paint(rectPts(-1.6, -.05, 3.2, .5), { wash: PAL.cream, tex: 0, pool: 0, ink: null }); break;
    default:   // the small pink smile under the moustache
      paint([[-1.4, 0], [0, .38], [1.4, 0], [.7, .8], [0, 1.0], [-.7, .8]], { wash: '#D9776C', tex: 0, pool: 0, ink: '#8A3E3A', sw: sw * .45, curv: .5 });
  }
}

// ---------- who is on duty ----------
WHO_ALL.me = { draw: person, cols: ME_COLS, word: 'je' };
