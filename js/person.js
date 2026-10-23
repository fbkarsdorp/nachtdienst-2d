// person.js: the night assistant as a person, after a portrait of the player (curly hair, round glasses, moustache,
// freckles, a black T-shirt over tattooed arms, rolled-up jeans, heavy boots). Built like the cat: a small model in
// centimetres (f forward, up, z to the person's left) turned to the key view and painted flat, taking the same pose as
// clawd(). The mood behind the pose picks what a person does with it: hands on hips, a scratch of the head, arms
// crossed, a hand over the mouth, hands in pockets while humming, the head going down when sleepy.
// Colours and proportions follow the portrait. (x, y) is the ground point between the feet; at u = 17 (the room) the
// person is about four hundred pixels tall.
'use strict';

// colours sampled from the drawing
const ME = {
  skin: '#E6C3B5', skinDk: '#C99686', skinLt: '#F2DCD2', cheek: '#E58168', freckle: '#C08F7E', hair: '#362B21', hairLt: '#5F5A60',
  must: '#312416', mouth: '#CE8B84', tee: '#494949', teeLt: '#5F5F5F', teeDk: '#363636', jeans: '#8CB0C2', jeansDk: '#6C90A3',
  cuff: '#D1D9DD', boot: '#141213', sole: '#60452C', rim: '#3B2A22', bridge: '#B29C7D', iris: '#586271', irisDk: '#303846',
  lid: '#454C5A', tattoo: '#26262B', sock: '#EFE5CF', stitch: '#E3AA3A',
};
// the drawing has no black outlines: each part is edged in a deeper shade of its own colour
const edge = c => mixCol(c, PAL.ink, .62);
const ME_COLS = { col: ME.skin, dk: ME.skinDk, lt: ME.skinLt };

// ---------- what each mood does with arms and posture ----------
// a gesture is where the elbow and the hand go, from the shoulder: [f, up, outwards]
const GESTURE = {
  hang:    [[0, -31, 3], [2, -65, 2.5]],      hips:   [[-5, -20, 16], [1, -40, 4]],
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
  // facing left is a real turn, not a mirror image: the left arm stays the left arm, with its own tattoos, and the
  // right hand keeps the card. (flip still says which way the figure faces on screen.)
  const yawS = flip ? -th : th, fs = flip ? -1 : 1, lookX = (o.lookX || 0) * fs;
  const pr = personProj(yawS), side = Math.abs(pr.s);
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
  const head = [sh[0] + 1.5 + hd * 3.5, sh[1] + 19.5 - Math.max(0, hd) * 3 - m.shrug * 1.5 + Math.max(0, -hd) * .5, sh[2] * .5];
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
    const S = [sh[0], sh[1] - 1, sh[2] + sg * 19.6];
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
    const end = lerp3(S, E, .9); end[2] += sg * 2.4;
    return { sg, S, E, Hd, hidden, beside, end };
  });

  // ----- shadow, then the figure -----
  if (!o.noShadow && frame !== 'peek') softBlob(x, y + sc * 1.5, sc * lerp(30, 42, side), sc * 7, '#1a1424', .5 * (o.shadowK ?? 1));
  push();
  translate(x, y + dy);
  rotate((o.rot || 0) * .35 * fs + sway);
  scale(1 + sq * .4, 1 - sq);
  scale(sc, sc);
  const S1 = 1 / sc;   // brush widths are in pixels; undo the scale for them
  const items = [];
  for (const L of legs) items.push({ d: pr.D(L.ank[0], 0, L.ank[2]) - 50, draw: () => meLeg(L) });
  items.push({ d: -60, draw: () => meHips() });
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
    let ex = x + hx * sc, ey = y + dy + (hy - (top ? 23 : 4)) * sc;
    if (o.emote === 'breath') { const mo = pr.P(head[0] + 11, head[1] - 7, 0); ex = x + mo[0] * sc + dir * es * .6; ey = y + dy + mo[1] * sc; }
    else if (!top) { ex += dir * 28 * sc; ey -= 6 * sc; }
    if (o.emote === 'music') ex += dir * 11 * sc;
    emote(o.emote, ex, ey, es * (o.emoteScale || 1), o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');

  // ===== the parts, in centimetres =====
  function proj(p) { return pr.P(p[0], p[1], p[2]); }
  function rib(pts, w0, w1) { return ribbon(pts.map(p => { const [a, b] = proj(p); return [a + jit(J * S1 * .5), b + jit(J * S1 * .5)]; }), w0, w1); }
  function openInk(rb, cut, w = sw, col = ink) { const k = Math.floor(rb.length / 2 * cut); inkLine(rb.slice(k, rb.length - k), w * S1, col, 'ink', 0); }
  function solid(pts3, rnd = 2) { return chaikin(hullPts(pts3.map(proj), false), rnd).map(([p, q]) => [p + jit(J * S1 * .35), q + jit(J * S1 * .35)]); }

  function meLeg(L) {
    rs('leg' + L.sg);
    const near = pr.D(0, 0, L.sg) >= -.01, col = near || side < .3 ? ME.jeans : mixCol(ME.jeans, ME.jeansDk, .7);
    // the shin's own direction, for the cuff and the sock
    const v = [L.knee[0] - L.ank[0], L.knee[1] - L.ank[1]], vl = Math.hypot(...v) || 1, at = t => [L.ank[0] + v[0] / vl * t, L.ank[1] + v[1] / vl * t, L.ank[2]];
    const rb = rib([L.hip, L.knee, at(11)], 18, 18);
    paint(rb, { wash: col, tex: 0, pool: 0, ink: null });
    openInk(rb, .1, sw, edge(ME.jeans));
    if (sc > 1.2 && side > .3) inkLine([proj([L.knee[0] + 2, L.knee[1] + 3, L.knee[2]]), proj([L.knee[0] + .5, L.knee[1] - 1, L.knee[2]])], sw * .45 * S1, ME.jeansDk, 'inkfine', .5);
    // a cream sock, then the deep turned-up cuff
    const sock = rib([at(-1), at(6.5)], 11, 11);
    paint(sock, { wash: ME.sock, tex: 0, pool: 0, ink: edge(ME.sock), sw: sw * .6 * S1 });
    if (sc > 1.4) for (const t of [1.5, 3, 4.5]) inkLine([proj(lerp3(at(t), [at(t)[0], at(t)[1], at(t)[2] - 4.5], 1)), proj([at(t)[0], at(t)[1], at(t)[2] + 4.5])], sw * .3 * S1, mixCol(ME.sock, ME.skinDk, .5), 'inkfine', 0);
    // the deep turned-up cuff, paler than the leg
    const cb = rib([at(5), at(10.8)], 19, 19);
    paint(cb, { wash: near || side < .3 ? ME.cuff : mixCol(ME.cuff, ME.jeansDk, .5), tex: 0, pool: 0, ink: edge(ME.cuff), sw: sw * .7 * S1 });
    meShoe(L);
  }

  // a heavy shoe with a thick sole and yellow welt stitching, laced, its toe cap seamed
  function meShoe(L) {
    rs('shoe' + L.sg);
    const A = L.ank, cp = Math.cos(L.pitch), sp = Math.sin(L.pitch);
    const at = (f, up, z) => [A[0] + f * cp - up * sp, A[1] + f * sp + up * cp, A[2] + z];
    // seen from the front, the shoe is drawn a little from above, as in the drawing: the toe stays on the ground and
    // the rest rises behind it, so the laces and the polished vamp show
    const kTop = .16 * Math.max(0, pr.c) ** 2, dA = pr.D(A[0], A[1], A[2]);
    const sproj = p => { const q = proj(p); q[1] += kTop * (pr.D(p[0], p[1], p[2]) - dA - 25 * pr.c); return q; };
    const ssolid = (pts3, rnd) => chaikin(hullPts(pts3.map(sproj), false), rnd).map(([p, q]) => [p + jit(J * S1 * .35), q + jit(J * S1 * .35)]);
    const wOf = f => f > 12 ? 7.3 : f < -3 ? 5.8 : 6.6;
    const PROF = [[-8.6, -7], [-8.9, -5.5], [-8.4, -.2], [-4.5, 2.6], [1.5, 3.8], [6.5, 2.8], [10, .8], [15.5, -1.4], [21, -3], [24.6, -5], [25.2, -7]];
    const sole = [];
    for (const [f, up] of [[-9.4, -9.8], [25.6, -9.8], [26.2, -6.4], [-9.6, -6.4]]) for (const zs of [-1, 1]) sole.push(at(f, up, zs * (wOf(f) + .5)));
    paint(ssolid(sole, 2), { wash: ME.sole, tex: 0, pool: 0, ink, sw: sw * .9 * S1 });
    const upper = [];
    for (const [f, up] of PROF) for (const zs of [-1, 1]) upper.push(at(f, up, zs * wOf(f)));
    const upP = ssolid(upper, 2);
    paint(upP, { wash: ME.boot, tex: 0, pool: 0, ink, sw: sw * .9 * S1 });
    if (sc > 1.3) {
      // the stitching round the welt, as dashes
      const loop = [];
      for (let f = -8.5; f <= 21; f += 2.6) loop.push(at(f, -8.1, visZ * (wOf(f) + .45)));
      for (let a = -Math.PI / 2; a <= Math.PI / 2; a += .3) loop.push(at(21 + 4.5 * Math.cos(a), -8.1, -visZ * (wOf(21) + .45) * Math.sin(a)));
      const Q = loop.map(sproj);
      for (let i = 0; i + 1 < Q.length; i += 2) inkLine([Q[i], [lerp(Q[i][0], Q[i + 1][0], .6), lerp(Q[i][1], Q[i + 1][1], .6)]], sw * .45 * S1, ME.stitch, 'inkfine', 0);
      // the toe cap's seam, the laces
      if (pr.c > .1 || side > .6) inkLine([-4.6, -2.5, 0, 2.5, 4.6].map(z => sproj(at(15.5 + 1.6 * (1 - (z / 4.6) ** 2), -2.6 - .2 * (1 - (z / 4.6) ** 2), z))), sw * .45 * S1, '#4D4547', 'inkfine', .5);
      for (const [f, up] of [[5.2, 1.6], [7.8, .6]]) for (const z of [-1.7, 1.7]) { const p = sproj(at(f, up, z)); paint(ellPts(p[0], p[1], .35, .35, 6), { wash: '#6A6264', tex: 0, pool: 0, ink: null }); }
      if (pr.c > .4) {   // the laces, criss-crossed between two rows of eyelets
        const rows = [[1.5, 3.6], [4, 3.3], [6.5, 2.6], [9, 1.4]].map(([f, up]) => [-1, 1].map(z => sproj(at(f, up + .2, z * 1.9))));
        for (let r = 0; r + 1 < rows.length; r++) for (const k2 of [0, 1]) inkLine([rows[r][k2], rows[r + 1][1 - k2]], sw * .45 * S1, '#4A4A50', 'inkfine', 0);
      }
      const b0 = sproj(at(6.6, 2.2, 0));
      for (const s2 of [-1, 1]) paint(ellPts(b0[0] + s2 * 1.1, b0[1] - .4, 1.1, .6, 10, 0, s2 * .4), { ink: '#3A3A3E', sw: sw * .4 * S1 });
      // the shine on polished leather
      for (const [f, up, z, l] of [[19, -3.6, 2.2, 2.4], [17.5, -3.1, -1.6, 1.4], [3, 1.4, 4, 2]]) {
        if (pr.D(0, 0, z) < -.5 && Math.abs(z) > 3) continue;
        const a = sproj(at(f, up, z * visZ)), b = sproj(at(f + l, up - l * .25, z * visZ));
        inkLine([a, b], sw * .55 * S1, '#E8E8EC', 'inkfine', 0);
      }
    }
  }

  // the top of the jeans, where the shirt ends: pockets and fly in front, patch pockets behind
  function meHips() {
    rs('hips');
    const pts = [];
    for (const [up, w, d] of [[pelvis[1] + 5, 18.4, 11], [pelvis[1] - 9, 18.2, 10.6]]) for (const sz of [-1, 1]) for (const sf of [-1, 1]) pts.push([pelvis[0] + sf * d, up, pelvis[2] + sz * w]);
    const P = solid(pts, 2);
    paint(P, { wash: ME.jeans, tex: 0, pool: 0, ink: edge(ME.jeans), sw: sw * S1 });
    if (sc < 1.1) return;
    const f0 = pelvis[0] + 10.6, z0 = pelvis[2];
    if (pr.c > .25) {
      inkLine([[f0, hem, z0 + 1.6], [f0, hem - 6, z0 + 1.6], [f0, hem - 8.5, z0 + .3]].map(proj), sw * .45 * S1, ME.jeansDk, 'inkfine', .5);
      for (const sg of [1, -1]) inkLine([[f0 - .4, hem, z0 + sg * 10.5], [f0 - .3, hem - 4, z0 + sg * 14.5], [f0 - 1.2, hem - 6, z0 + sg * 18]].map(proj), sw * .45 * S1, ME.jeansDk, 'inkfine', .6);
    } else if (pr.c < -.25) {
      for (const sg of [1, -1]) { const zc = z0 + sg * 8, f = pelvis[0] - 10.6; paint([[f, hem - 1, zc - 4], [f, hem - 1, zc + 4], [f, hem - 8, zc + 3.6], [f, hem - 9.4, zc], [f, hem - 8, zc - 3.6]].map(proj), { ink: ME.jeansDk, sw: sw * .45 * S1, br: 'inkfine' }); }
    }
  }

  // an oversized T-shirt: a straight boxy body, square shoulders, the sleeves set on with a seam, a plain crew neck
  function meTorso() {
    rs('torso');
    const nb = [sh[0] + .3, sh[1] - 3, sh[2]], nt = [head[0] - 1.2, head[1] - 8, head[2]];
    paint(rib([nb, nt], 14, 13), { wash: skin, tex: 0, pool: 0, ink: edge(skin), sw: sw * .8 * S1 });
    const pts = [];
    // collar, the slope of the shoulders, the shoulder corner, under the arms, the hem
    for (const [up, w, d] of [[sh[1] + 3, 7.2, 6], [sh[1] + 1.8, 15, 8.6], [sh[1] - .6, 20, 10], [sh[1] - 13, 18.6, 10.4], [hem, 19, 10.8]]) {
      const fc = lerp(pelvis[0], sh[0], (up - hem) / (sh[1] - hem)), zc = lerp(pelvis[2], sh[2], (up - hem) / (sh[1] - hem));
      for (const sz of [-1, 1]) for (const sf of [-1, 1]) pts.push([fc + sf * d, up, zc + sz * w]);
    }
    const tee = solid(pts, 2), polys = [tee];
    // the shoulders belong to the shirt; a sleeve hanging beside it joins the outline too
    for (const A of arms) { polys.push(meCap(A)); if (A.beside) { A.sleeve = meSleeve(A); polys.push(A.sleeve); } }
    for (const Q of polys) paint(Q, { ink: edge(ME.tee), sw: sw * 1.8 * S1 });
    for (const Q of polys) paint(Q, { wash: ME.tee, tex: 0, pool: 0, ink: null });
    grainIn(polys, .3);
    // the neckline: a wide U at the front, as in the portrait (shallow at the back), skin above it, a stitched band below
    if (Math.abs(pr.c) > .08) {
      const s2 = pr.c > 0 ? 1 : -1, dip = s2 > 0 ? 5.2 : .6;
      const arc = (dn, rr) => { const A2 = []; for (let a = -1.45; a <= 1.46; a += .145) { const ca = Math.cos(a); A2.push(proj([sh[0] + s2 * rr * 6.6 * ca, sh[1] + 2.6 - dn - dip * Math.pow(ca, 2.2), sh[2] + rr * (s2 > 0 ? 10 : 7.6) * Math.sin(a)])); } return A2; };
      if (s2 > 0) {
        // skin above the U, up to the neck: it also covers the shirt's top edge where it crosses the neck
        const U = arc(0, 1);
        paint(U.concat([proj([sh[0] + 2, sh[1] + 3.8, sh[2] + 6.6]), proj([sh[0] + 2, sh[1] + 3.8, sh[2] - 6.6])]), { wash: skin, tex: 0, pool: 0, ink: null });
        if (sc > 1.2 && pr.c > .3) {
          // the hollow of the throat, a collarbone either side, the tips of a chest piece just above the neckline
          const a = proj([sh[0] + 6.6, sh[1] + 3.6, sh[2]]); inkLine([[a[0] - .9, a[1] - .4], [a[0], a[1] + .3], [a[0] + .9, a[1] - .4]], sw * .45 * S1, ME.skinDk, 'inkfine', .5);
          for (const sg of [1, -1]) {
            inkLine([proj([sh[0] + 6.4, sh[1] + .9, sh[2] + sg * 1.6]), proj([sh[0] + 6, sh[1] + 1.5, sh[2] + sg * 5.2])], sw * .4 * S1, ME.skinDk, 'inkfine', .3);
            const q = proj([sh[0] + 6.2, sh[1] - 1.2, sh[2] + sg * 4.4]); paint([[q[0] - .6, q[1] + .6], [q[0] + .6, q[1] + .6], [q[0] + sg * .5, q[1] - .9]], { wash: ME.tattoo, tex: 0, pool: 0, ink: null });
          }
        }
      }
      inkLine(arc(0, 1), sw * .9 * S1, edge(ME.tee), 'ink', .5);
      if (sc > 1.2) { const st = arc(1.3, 1.12); for (let i = 0; i + 1 < st.length; i += 2) inkLine([st[i], [lerp(st[i][0], st[i + 1][0], .7), lerp(st[i][1], st[i + 1][1], .7)]], sw * .35 * S1, ME.teeLt, 'inkfine', 0); }
    }
    if (sc > 1.2) {
      rs('seams');
      const fc = pr.c > 0 ? 1 : -1;
      // where the sleeves are set on, front and back
      if (Math.abs(pr.c) > .45) for (const sg of [1, -1]) inkLine([[sh[0] + fc * 8, sh[1] - .2, sh[2] + sg * 16.8], [sh[0] + fc * 9.4, sh[1] - 7, sh[2] + sg * 17.6], [sh[0] + fc * 10, sh[1] - 12.5, sh[2] + sg * 18]].map(proj), sw * .45 * S1, ME.teeLt, 'inkfine', .6);
      // the hem's stitching
      const hz = [], hf = pelvis[0] + fc * 10.8;
      for (let z = -18.6; z <= 18.6; z += 2.4) hz.push(proj([hf, hem + 1.6, pelvis[2] + z]));
      if (Math.abs(pr.c) > .3) for (let i = 0; i + 1 < hz.length; i += 2) inkLine([hz[i], [lerp(hz[i][0], hz[i + 1][0], .7), lerp(hz[i][1], hz[i + 1][1], .7)]], sw * .3 * S1, ME.teeLt, 'inkfine', 0);
    }
  }
  // the sleeve hangs from a rounded shoulder, wide, a little wider at the hem
  function meCap(A) { return meEll(pr, [A.S[0], A.S[1] - 5, A.S[2] - A.sg * .6], 5.8, 6.6, 5.2, 1, J * S1 * .3, { n: 24, pw: 2.6 }); }
  function meSleeve(A) { return rib([[A.S[0], A.S[1] - 4.4, A.S[2]], A.end], 11.4, 13); }

  function meArm(A) {
    rs('arm' + A.sg);
    const { S, E, Hd } = A;
    // forearm and the bit of upper arm below the sleeve
    const arm = rib([lerp3(S, E, .8), E, Hd], 8.4, 6.4);
    paint(arm, { wash: skin, tex: 0, pool: 0, ink: null });
    openInk(arm, .05, sw * .85, edge(skin));
    if (sc > 1) { C.save(); tracePath(arm); C.clip(); meTattoos(A); C.restore(); }   // ink stays on the skin
    if (!A.hidden) meHand(A);
    // the sleeve: joined to the shirt (only its hem to draw) or over the body
    rs('sleeve' + A.sg);
    const te = edge(ME.tee);
    if (A.beside && A.sleeve) {   // the sleeve's outline belongs to the shirt; its cloth goes back over the arm
      paint(A.sleeve, { wash: ME.tee, tex: 0, pool: 0, ink: null }); grainIn([A.sleeve], .3);
      const n = A.sleeve.length / 2; inkLine([A.sleeve[n - 1], A.sleeve[n]], sw * .9 * S1, te, 'ink', 0);
    }
    else if (Math.abs(pr.c) > .55) {   // across the chest: the sleeve comes out of the shoulder, which is the shirt's
      const sl = meSleeve(A); paint(sl, { wash: ME.tee, tex: 0, pool: 0, ink: null }); openInk(sl, .3, sw, te);
    } else {   // seen from the side: shoulder and sleeve as one piece of cloth, edged where it lies on the shirt
      const pcs = [meCap(A), meSleeve(A)];
      for (const Q of pcs) paint(Q, { ink: te, sw: sw * 1.6 * S1 });
      for (const Q of pcs) paint(Q, { wash: ME.tee, tex: 0, pool: 0, ink: null });
      grainIn(pcs, .3);
      const n = pcs[1].length / 2; inkLine([pcs[1][n - 1], pcs[1][n]], sw * .9 * S1, te, 'ink', 0);
    }
  }

  // a relaxed hand, the thumb towards the front
  function meHand(A) {
    rs('hand' + A.sg);
    const [hx, hy] = proj(A.Hd), [ex, ey] = proj(A.E), ang = Math.atan2(hy - ey, hx - ex);
    const sa = Math.sign(Math.sin(ang)) || 1, thumb = side > .5 ? -sa : A.sg * sa * (pr.c >= 0 ? 1 : -1);
    push(); translate(hx, hy); rotate(ang); scale(1, thumb > 0 ? 1 : -1);
    paint([[-.5, -2.6], [4, -3], [8, -2.9], [11.4, -2.2], [13, -1], [13.2, .4], [12.2, 1.9], [9.6, 2.7], [7, 2.8], [6.4, 3.3], [7.2, 5.2], [6.4, 5.9], [4.6, 4.9], [2.2, 3.4], [-.5, 2.6]].map(([p, q]) => [p + jit(J * S1 * .2), q + jit(J * S1 * .2)]),
      { wash: skin, tex: 0, pool: 0, ink: edge(skin), sw: sw * .75 * S1, curv: .3 });
    if (sc > 1.3) for (const q of [-1.3, -.1, 1.1]) inkLine([[7.4, q], [12.3, q + .35]], sw * .38 * S1, ME.skinDk, 'inkfine', .3);
    pop();
    if (hook && A.sg < 0) { push(); translate(hx, hy); rotate(Math.PI + .7); hook(4.5, sw * S1); pop(); }
  }

  // tattoo sleeves: little motifs in fine black line down both forearms
  function meTattoos(A) {
    rs('tattoo' + A.sg);
    const seg2 = (a, b, t) => { const p = proj(lerp3(a, b, t)), q = proj(lerp3(a, b, Math.min(1, t + .05))); return [p, Math.atan2(q[1] - p[1], q[0] - p[0])]; };
    // the right arm as in the drawing (a tiger, a woman with flowers in her hair, a snake, a skull among plants), the
    // left (a monkey with a question mark, a dancer)
    const set = A.sg < 0 ? [['tiger', A.E, A.Hd, .04, 0, .7], ['lady', A.E, A.Hd, .2, .3, .8], ['snake', A.E, A.Hd, .34, -.8, .65], ['skull', A.E, A.Hd, .5, .1, .7], ['lotus', A.E, A.Hd, .67, -.3, .55], ['star', A.E, A.Hd, .6, .9, .35]]
                         : [['monkey', A.E, A.Hd, .05, 0, .75], ['dancer', A.E, A.Hd, .36, .1, 1], ['rose', A.E, A.Hd, .16, -.9, .5], ['swallow', A.E, A.Hd, .63, .7, .5], ['star', A.E, A.Hd, .54, -.9, .35]];
    for (const [kind, a, b, t, off, k] of set) {
      const [p, ang] = seg2(a, b, t);
      push(); translate(p[0], p[1]); rotate(ang - Math.PI / 2); translate(off, 0); scale(2.5 * k);
      meGlyph(kind, sw * .42 * S1 / (2.5 * k), sc > 3);
      pop();
    }
  }

  function meHead() {
    rs('head');
    const hth = yawS + clamp(lookX, -1, 1) * .28, hp = personProj(hth), facing = hp.c;
    const [hx, hy] = pr.P(...head), tilt = ((o.rot || 0) * 1.8 + m.tilt) * fs;
    push(); translate(hx, hy); rotate(tilt);
    const C0 = [0, 0, 0], A = 11.2, B = 12.3, Hh = 10;
    const stamp = (c, r, k) => ellPts(c[0], c[1], r, r * .93, 12, J * S1 * .3, k * 6);
    // tufts of hair at the nape show beside the jaw: behind the head when we see the face
    const nape = [1, -1].map(sg => { const sp = meSurf(hp, C0, A, B, Hh, -.35, -.82, sg * .6); return stamp(sp.p, 3.6, hash(sg + 3)); });
    const hairMass = (polys) => {
      for (const Q of polys) paint(Q, { ink: edge(ME.hair), sw: sw * 1.6 * S1 });
      for (const Q of polys) paint(Q, { wash: ME.hair, tex: 0, pool: 0, ink: null });
      grainIn(polys, .25);
    };
    if (facing > 0) hairMass(nape);
    // head, ears and nose as one silhouette
    const headP = meEll(hp, C0, A, B, Hh, 1, J * S1 * .4, { pw: 3.6, taper: .08 });
    const ears = [1, -1].map(sg => meEll(hp, [-.4, -1.2, sg * 12.9], 2.1, 1.9, 3, 1, J * S1 * .2, { n: 16 }));
    const nose = meEll(hp, [11.4, -1.2, 0], 1.7, 1.5, 2.1, 1, J * S1 * .2, { n: 16 });
    // seen from the front the ears stick out of the outline; from the side they sit on the head and are drawn on it
    const earsOut = Math.abs(hp.s) < .55, sil = earsOut ? [headP, ...ears, nose] : [headP, nose];
    const se = edge(skin);
    for (const Q of sil) paint(Q, { ink: se, sw: sw * 1.8 * S1 });
    for (const Q of sil) paint(Q, { wash: skin, tex: 0, pool: 0, ink: null });
    grainIn(sil, .22);
    if (!earsOut) ears.forEach((Q, i) => { if (hp.D(0, 0, i ? -1 : 1) > 0) paint(Q, { wash: skin, tex: 0, pool: 0, ink: se, sw: sw * .9 * S1 }); });
    // the curl inside each ear
    for (const sg of [1, -1]) {
      if (hp.D(0, 0, sg) < -2) continue;
      const c = hp.P(-.4, -1.2, sg * 13.8), mir = (hp.P(0, 0, sg)[0] > 0 ? 1 : -1);
      inkLine([[-.3, -1.3], [.5, -1.5], [.8, -.7], [.2, 0], [.15, .8]].map(([p, q]) => [c[0] + mir * p, c[1] + q]), sw * .5 * S1, ME.skinDk, 'inkfine', .6);
    }
    // the face
    if (facing > -.05) {
      rs('face');
      const surf = (c2, c3) => meSurf(hp, C0, A, B, Hh, Math.sqrt(Math.max(0, 1 - c2 * c2 - c3 * c3)), c2, c3);
      for (const sg of [1, -1]) {
        const c = surf(-.46, sg * .58); if (c.face < .1) continue;
        const bl = clamp(o.blush === true ? 1 : o.blush || 0);
        paint(ellPts(c.p[0], c.p[1], (1.75 + bl * .5) * c.face, 1.65 + bl * .4, 16), { wash: ME.cheek, washOp: 205 + 50 * bl, tex: 0, pool: 0, ink: null });
        if (sc > 1.4) for (let i = 0; i < 16; i++) { const f = surf(-.36 - hash(i * 3 + sg) * .4, sg * (.06 + hash(i * 5 + sg) * .66)); if (f.face > .2) paint(ellPts(f.p[0], f.p[1], .24, .22, 6), { wash: ME.freckle, tex: 0, pool: 0, ink: null }); }
      }
      // the eyes fill the round glasses
      rs('eyes');
      const el = -.05 - m.headDown * .05 - (o.lookY || 0) * .05;
      const eyes = [1, -1].map(sg => ({ sg, sp: surf(Math.sin(el), sg * .49) }));
      for (const { sg, sp } of eyes) {
        if (sp.face < .1) continue;
        push(); translate(sp.p[0], sp.p[1]); scale(clamp(sp.face * 1.1, .25, 1), 1);
        meEye({ ...o, lookX }, sg, sw * S1 * (sc > 3 ? 1 : .8));
        pop();
      }
      for (const { sg, sp } of eyes) {
        if (sp.face < -.15) continue;
        const fz = clamp(sp.face * 1.1, .12, 1);
        paint(ellPts(sp.p[0], sp.p[1], 4.3 * fz, 4.25, 28, J * S1 * .12), { ink: ME.rim, sw: sw * (sc > 3 ? 1 : .66) * S1 });
        if (facing < .8 && hp.D(0, 0, sg) > 0) inkLine([[sp.p[0] - (hp.s > 0 ? 4.3 * fz : -4.3 * fz), sp.p[1] - .5], hp.P(-.5, -.6, sg * 12.1)], sw * .55 * S1, ME.rim, 'inkfine', 0);
      }
      const [e0, e1] = eyes.map(e => e.sp), dir = Math.sign(e1.p[0] - e0.p[0]) || 1;
      if (e0.face > -.15 && e1.face > -.15) inkLine([[e0.p[0] + dir * 4.3 * clamp(e0.face * 1.1, .12, 1), e0.p[1] - 1.4], [lerp(e0.p[0], e1.p[0], .35), e0.p[1] - 2.3], surf(.02, 0).p, [lerp(e0.p[0], e1.p[0], .65), e1.p[1] - 2.3], [e1.p[0] - dir * 4.3 * clamp(e1.face * 1.1, .12, 1), e1.p[1] - 1.4]], sw * .7 * S1, ME.bridge, 'inkfine', .6);
      // nostrils, the moustache, the mouth
      rs('mouth');
      if (facing > .25) { const n = hp.P(12.3, -1.6, 0); inkLine([[-1.3, -.3], [-.7, .35], [0, .1], [.7, .35], [1.3, -.3]].map(([p, q]) => [n[0] + p * facing, n[1] + q]), sw * .4 * S1, ME.skinDk, 'inkfine', .5); }
      const mo = surf(-.32, 0), mf = Math.max(.25, facing);
      push(); translate(mo.p[0] + (1 - facing) * hp.s * 1.2, mo.p[1]); scale(mf, 1);
      paint([[-4.7, 1.2], [-4.3, -.4], [-3, -1.2], [-1.3, -1.25], [0, -.8], [1.3, -1.25], [3, -1.2], [4.3, -.4], [4.7, 1.2], [3.3, 1.45], [1.5, 1.1], [0, .95], [-1.5, 1.1], [-3.3, 1.45]].map(([p, q]) => [p + jit(J * S1 * .1), q + jit(J * S1 * .1)]),
        { wash: ME.must, tex: 0, pool: 0, ink: ME.must, sw: sw * .5 * S1, curv: .45 });
      translate(0, 2.9); if (facing > .35) meMouth(o.mouth, sw * S1);   // in profile the moustache hides it
      pop();
    }
    // the hair: big curls stamped over the scalp above the hairline, sideburns down past the ears
    rs('hair');
    const polys = [], centres = [];
    for (const [nf, nu, nz, k] of HAIR_SITES) {
      const top = nu > .45, sp = meSurf(hp, [-1, 2.4, 0], 12.4, 12.2, top ? 13.8 : 12.4, nf, nu, nz);
      if (sp.face < -.25) continue;
      polys.push(stamp(sp.p, (top ? 4.5 : 3.2) * (.86 + .28 * k), k));
      if (sp.face > .1) centres.push(sp.p);
    }
    // in front of the ears the hair comes down over the temples
    for (const sg of [1, -1]) for (const [c2, r] of [[.42, 2.7]]) { const sp = meSurf(hp, C0, A, B, Hh, .25, c2, sg * .94); if (sp.face > -.3) polys.push(stamp(sp.p, r, hash(sg * 7 + c2))); }
    for (const Q of polys) paint(Q, { ink: edge(ME.hair), sw: sw * 1.6 * S1 });
    if (facing < -.3 && centres.length > 3) paint(hullPts(centres, false), { wash: ME.hair, tex: 0, pool: 0, ink: null });
    for (const Q of polys) paint(Q, { wash: ME.hair, tex: 0, pool: 0, ink: null });
    grainIn(polys, .25);
    // the drawing's curls: a row of loose loops drawn in a lighter brown across the mop
    if (sc > 1.2) {
      rs('loops');
      for (const [nu0, w0, nl] of [[.52, .64, 6]]) {
        const P = [];
        for (let i = 0; i <= nl * 10; i++) {
          const t = i / (nl * 10), a = lerp(-w0, w0, t) * Math.PI / 2;
          const sp = meSurf(hp, [-1, 2.4, 0], 12.4, 12.2, 13.8, Math.cos(a) * Math.sqrt(1 - nu0 * nu0), nu0, Math.sin(a) * Math.sqrt(1 - nu0 * nu0));
          if (sp.face < .15) { if (P.length > 6) { inkLine(P, sw * .32 * S1, ME.hairLt, 'inkfine', .3); } P.length = 0; continue; }
          const ph = t * nl * TAU;
          const big = .8 + .35 * hash(Math.floor(t * nl) + 3);
          P.push([sp.p[0] + Math.sin(ph) * 1.9 * big, sp.p[1] - (1 - Math.cos(ph)) * 4.2 * big + 3]);
        }
        if (P.length > 6) inkLine(P, sw * .32 * S1, ME.hairLt, 'inkfine', .3);
      }
    }
    pop();
  }
}

// where the curls grow: points spread evenly over a sphere, kept above the hairline, the same on both sides
const HAIR_SITES = (() => {
  const out = [], N = 110;
  for (let i = 0; i < N; i += 2) {
    const nu = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - nu * nu), ph = i * 2.39996, nf = r * Math.cos(ph), nz = Math.abs(r * Math.sin(ph));
    const keep = nu > .5 - .36 * Math.max(0, -nf) || (nf < -.2 && nu > -.5) || (nf < .25 && nu > .18 && nz > .62);
    if (keep) out.push([nf, nu, nz, hash(i * 1.37)], [nf, nu, -nz, hash(i * 2.11)]);
  }
  return out;
})();

// ---------- tattoo motifs: old-style flash in fine black line, in a box about four centimetres high ----------
// (drawn twenty times over and scaled down, so the brush, which steps in local units, follows the small curves)
function meGlyph(kind, w, fine) {
  const Z = 20, M = pts => pts.map(([x, y]) => [x * Z, y * Z]);
  push(); scale(1 / Z);
  const col = ME.tattoo, L = (pts, c = .5, k = 1) => inkLine(M(pts), w * k * Z, col, 'inkfine', c);
  const O = (x, y, rx, ry, k = 1, rot = 0) => paint(M(ellPts(x, y, rx, ry, 16, 0, rot)), { ink: col, sw: w * k * Z, br: 'inkfine', curv: .5 });
  const F = (pts, op = 255) => paint(M(pts), { wash: col, washOp: op, tex: 0, pool: 0, ink: null, curv: .5 });
  const D = (x, y, r = .16) => paint(M(ellPts(x, y, r, r, 8)), { wash: col, tex: 0, pool: 0, ink: null });
  const shade = (pts, op = 70) => paint(M(pts), { wash: col, washOp: op, tex: 0, pool: 0, ink: null, curv: .5 });
  const OL = (pts, k = 1, c = .5) => paint(M(pts), { ink: col, sw: w * k * Z, br: 'inkfine', curv: c });
  const flower = (x, y, r) => { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; O(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .45, r * .45, .7); } D(x, y, r * .25); };
  switch (kind) {
    case 'lady':   // a woman's head with a black bob and flowers in her hair
      F([[-1.35, .9], [-1.5, -.4], [-1.05, -1.35], [0, -1.65], [1.05, -1.35], [1.5, -.4], [1.35, .9], [.95, .2], [.75, -.75], [0, -.95], [-.75, -.75], [-.95, .2]]);
      O(0, .15, .95, 1.2);
      flower(-.75, -1.7, .5); flower(.15, -1.95, .55); if (fine) flower(.95, -1.6, .42);
      L([[-.55, -.05], [-.2, -.1]], 0, 1.2); L([[.2, -.1], [.55, -.05]], 0, 1.2); L([[0, .1], [-.1, .5], [.05, .55]], .4, .8);
      F([[-.28, .8], [0, .72], [.28, .8], [0, .92]]); L([[-.45, 1.3], [-.5, 2]], .3); L([[.45, 1.3], [.5, 2]], .3); L([[-1.3, 2.3], [-.5, 2], [0, 2.15], [.5, 2], [1.3, 2.3]], .5);
      break;
    case 'dancer':   // a dancer, one arm raised, in a short dotted dress
      O(0, -2.3, .42, .48); F([[-.45, -2.5], [-.2, -2.85], [.3, -2.8], [.55, -2.4], [.9, -2.9], [.6, -2.2]], 220);
      L([[0, -1.82], [0, -1.45]], 0); L([[.35, -1.35], [1, -2.1], [1.2, -3], [.8, -3.4]], .5); L([[-.35, -1.35], [-1.1, -.8], [-1.35, -.2]], .5);
      OL([[-.5, -1.45], [.5, -1.45], [.7, -.2], [1.1, .5], [.5, .4], [0, .55], [-.5, .4], [-1.1, .5], [-.7, -.2]], 1, .4);
      if (fine) for (const [x, y] of [[-.2, -1], [.25, -.7], [-.3, -.3], [.3, 0], [-.6, .2], [.65, .25]]) D(x, y, .1);
      L([[-.25, .5], [-.35, 1.6], [.1, 2.5]], .4); L([[.25, .5], [.45, 1.5], [-.1, 2.45]], .4); F([[.05, 2.45], [.5, 2.6], [.1, 2.7]]); F([[-.15, 2.4], [-.6, 2.55], [-.2, 2.65]]);
      break;
    case 'monkey':   // a monkey's face, ears out, a question mark over it
      O(-1.35, .1, .45, .55, .8); O(1.35, .1, .45, .55, .8); shade(ellPts(0, .1, 1.15, 1.2, 16), 60); O(0, .1, 1.15, 1.2);
      O(0, .7, .75, .5, .8); F(ellPts(-.42, -.2, .28, .32, 10)); F(ellPts(.42, -.2, .28, .32, 10));
      L([[-.8, -.65], [-.4, -.8], [-.1, -.6]], .5); L([[.1, -.6], [.4, -.8], [.8, -.65]], .5); D(-.15, .6, .08); D(.15, .6, .08); L([[-.35, .95], [0, 1.05], [.35, .95]], .4);
      L([[-.35, -2.6], [-.1, -2.95], [.35, -2.85], [.4, -2.4], [0, -2.1], [0, -1.8]], .5, 1.3); D(0, -1.45, .14);
      break;
    case 'tiger':   // a tiger's head, striped
      OL([[-1.6, -.3], [-1.25, -1.2], [-.6, -1.45], [.6, -1.45], [1.25, -1.2], [1.6, -.3], [1.4, .7], [.7, 1.35], [0, 1.5], [-.7, 1.35], [-1.4, .7]]);
      F([[-1.35, -1.05], [-1.1, -1.75], [-.6, -1.4]]); F([[1.35, -1.05], [1.1, -1.75], [.6, -1.4]]);
      for (const sx of [-1, 1]) { F([[sx * 1.6, -.35], [sx * .95, -.15], [sx * 1.55, .05]]); F([[sx * 1.45, .55], [sx * .95, .5], [sx * 1.3, .85]]); F([[sx * .7, -.35], [sx * .25, -.5], [sx * .3, -.2]]); }
      F([[-.2, -1.45], [0, -.8], [.2, -1.45]]); F([[-.3, .45], [.3, .45], [0, .8]]); L([[0, .8], [0, 1.05], [-.4, 1.2]], .4); L([[0, 1.05], [.4, 1.2]], .4);
      break;
    case 'snake': {
      const P = [[-1.6, 2.2], [-.5, 1.4], [.8, 1.6], [1.2, .5], [.1, -.2], [-1, -.7], [-.4, -1.6], [.9, -1.9]];
      paint(ribbon(M(P), .55 * Z, .2 * Z), { wash: col, washOp: 230, tex: 0, pool: 0, ink: null }); F(ellPts(1.15, -1.95, .45, .3, 10)); L([[1.55, -1.95], [1.95, -2.05], [2.1, -1.85]], .3, .7);
      break;
    }
    case 'skull':   // a skull among plants
      OL([[-1.15, -.6], [-.9, -1.45], [0, -1.75], [.9, -1.45], [1.15, -.6], [1.05, .25], [.65, .55], [.65, 1.1], [-.65, 1.1], [-.65, .55], [-1.05, .25]]);
      F(ellPts(-.45, -.35, .33, .36, 12)); F(ellPts(.45, -.35, .33, .36, 12)); F([[-.12, .3], [.12, .3], [0, .02]]);
      for (const x of [-.4, -.13, .13, .4]) L([[x, .75], [x, 1.1]], 0, .7);
      for (const sx of [-1, 1]) { L([[sx * 1.4, 2.2], [sx * 1.6, .8], [sx * 2, -.6]], .5); for (const y of [-.2, .5, 1.3]) F([[sx * 1.75, y], [sx * 2.3, y - .35], [sx * 2.1, y + .15]]); }
      break;
    case 'lotus': for (const a of [-1, -.5, 0, .5, 1]) { push(); rotate(a * .9); OL([[0, 0], [-.42, -.7], [0, -1.55], [.42, -.7]], .9, .6); pop(); } L([[-1.6, .25], [-.6, .05], [0, .2], [.6, .05], [1.6, .25]], .5); break;
    case 'swallow':
      F([[-2, -.9], [-1.1, -.5], [-.35, -.1], [0, -.45], [.35, -.1], [1.1, -.5], [2, -.9], [1.2, .05], [.4, .3], [.3, 1], [.65, 1.9], [0, 1.2], [-.65, 1.9], [-.3, 1], [-.4, .3], [-1.2, .05]], 235);
      break;
    case 'rose': {
      O(0, 0, 1.05, .95); const sp = []; for (let i = 0; i < 12; i++) { const a = i * .9, r = .1 + i * .07; sp.push([Math.cos(a) * r, Math.sin(a) * r - .05]); } L(sp, .6);
      L([[-.95, .3], [-.4, .55], [0, .4]], .5); L([[.95, .3], [.4, .6], [0, .45]], .5);
      F([[-.4, 1], [-1.4, 1.5], [-.7, 1.9]]); F([[.4, 1], [1.4, 1.4], [.8, 1.85]]); break;
    }
    case 'star': {
      const P = starPts(0, 0, 1.4, .45, 5); OL(P, 1, 0);
      for (let k = 0; k < 5; k++) F([[0, 0], P[2 * k], P[2 * k + 1]]);
      break;
    }
  }
  pop();
}

// ---------- the face: a heavy-lidded sideways look, as in the portrait ----------
function meEye(o, s, sw) {
  const kind = Array.isArray(o.eyes) ? o.eyes[s < 0 ? 0 : 1] : o.eyes === 'wink' ? (s < 0 ? 'happy' : 'normal') : (o.eyes || 'normal');
  const LID = { normal: .34, look: .34, dot: .34, wide: .06, shine: .24, scared: 0, blank: .34, narrow: .62, determined: .52, angry: .56, sleepy: .8, sad: .44, teary: .44 };
  if (!(kind in LID)) { push(); scale(.8); eye(kind, s, 3.1, { ...o, lookX: (o.lookX || 0) * .6 }, sw / .8); pop(); return; }
  const w = 8.1, h = kind === 'wide' || kind === 'scared' ? 6 : 5.3;
  const blink = ((T + (o.seed || 0) * 1.9) % 4.3) < .13 && kind !== 'sleepy';
  const lid = blink ? 1 : clamp(LID[kind] + (o.squint || 0) * (1 - LID[kind]));
  const glance = .75 * Math.tanh(3 * Math.sin(T * .31 + 1.3));
  const lx = clamp((o.lookX || 0) + (kind === 'scared' ? 0 : glance), -1, 1) * w * .2, ly = (o.lookY || 0) * h * .12;
  const N = 14, top = [], bot = [];
  for (let i = 0; i <= N; i++) { const t = i / N, X = (t - .5) * w, b = Math.pow(Math.sin(t * Math.PI), .75); top.push([X, -b * h * .5]); bot.push([X, b * h * .5]); }
  if (lid > .93) { inkLine(bot.map(([a, b]) => [a, b * .25]), sw * 1.1, ME.lid, 'ink', .5); return; }
  const shape = top.concat(bot.slice().reverse());
  paint(shape, { wash: '#FBFAF7', tex: 0, pool: 0, ink: null });
  C.save(); tracePath(shape); C.clip();
  const ir = kind === 'scared' ? 1.5 : 2.75;
  paint(ellPts(lx, ly + .2, ir, ir, 18), { wash: '#8A94A5', tex: 0, pool: 0, ink: null });
  paint(ellPts(lx + ir * .12 * Math.sign(lx || 1), ly + .2, ir * .78, ir * .78, 18), { wash: ME.iris, tex: 0, pool: 0, ink: null });
  paint(ellPts(lx + ir * .22 * Math.sign(lx || 1), ly + .2, ir * .55, ir * .55, 14), { wash: ME.irisDk, tex: 0, pool: 0, ink: null });
  paint(ellPts(lx - ir * .45, ly - ir * .15, ir * .22, ir * .3, 8), { wash: '#FFFFFF', tex: 0, pool: 0, ink: null });
  // the upper lid: a dark band down to its edge (slanted when sad or cross), skin above it
  const slope = kind === 'sad' || kind === 'teary' ? -.5 : kind === 'angry' || kind === 'determined' ? .45 : 0;
  const ly0 = lerp(-h * .5, h * .5, lid), a = [-w, ly0 - slope * s * w * .2], b = [w, ly0 + slope * s * w * .2];
  if (lid > .03) {
    paint([[-w, -h * 2], [w, -h * 2], b, a], { wash: ME.lid, tex: 0, pool: 0, ink: null });
    const up = h * .38; paint([[-w, -h * 2], [w, -h * 2], [b[0], b[1] - up], [a[0], a[1] - up]], { wash: ME.skin, tex: 0, pool: 0, ink: null });
  }
  C.restore();
  inkLine(top, sw * .55, ME.lid, 'ink', .4);
  inkLine(bot, sw * .35, mixCol(ME.lid, ME.skin, .4), 'inkfine', .4);
  if (kind === 'teary') paint(ellPts(0, h * .55 + Math.sin(T * 9 + s) * .15, w * .4, .6, 12), { wash: PAL.sky, washOp: 210, tex: 0, ink: PAL.ink, sw: sw * .4 });
}
function meMouth(m, sw) {
  const line = (pts, w = .8) => inkLine(pts, sw * w, mixCol(ME.mouth, PAL.ink, .3), 'ink', .6);
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
      paint([[-1.1, 0], [0, .3], [1.1, 0], [.55, .7], [0, .85], [-.55, .7]], { wash: ME.mouth, tex: 0, pool: 0, ink: mixCol(ME.mouth, PAL.ink, .3), sw: sw * .4, curv: .5 });
  }
}

// ---------- who is on duty ----------
WHO_ALL.me = { draw: person, cols: ME_COLS, word: 'je' };
