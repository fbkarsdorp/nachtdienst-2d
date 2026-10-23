// room.js: the reading room of the Centraal Sagenarchief, seen as one painted cut-away: the back wall with its five
// card cabinets, the wall clock, the window over the canal, the door, J.D.'s coat, and the reading table in front.
// Static parts are painted into boiled layers; whatever moves or changes is painted live on top.
'use strict';

const FLOOR_Y = 826, WALK_Y = 918;
let TABLE_RAISE = 0;   // a grown-up on duty needs the table at hip height: it and what stands on it go up this far
const CABS = [380, 548, 716, 884].map((x, i) => ({ n: i + 1, x, y: 455, w: 150, h: 345 }));
CABS.push({ n: 5, x: 1586, y: 455, w: 150, h: 345 });
const ROOM = {
  door: { x: 62, y: 372, w: 196, h: 454 },
  coat: { x: 282, y: 455, w: 76, h: 372 },
  clock: { x: 1062, y: 168, w: 96, h: 392, cx: 1110, cy: 252, r: 37 },
  window: { x: 1180, y: 160, w: 300, h: 492, gx: 1198, gy: 178, gw: 264, gh: 456 },
  sill: { x: 1168, y: 642, w: 324, h: 18 },
  chair: { x: 1386, y: 698, w: 176, h: 206 },
  map: { x: 1756, y: 214, w: 148, h: 236 },
  table: { x: 536, y: 858, w: 772, h: 196 },
  lamp: { x: 572, y: 742, w: 132, h: 120, cx: 638 },
  tray: { x: 700, y: 806, w: 96, h: 54 },
  spike: { x: 1036, y: 762, w: 60, h: 98, cx: 1064 },
  kit: { x: 800, y: 806, w: 62, h: 54 },
  typewriter: { x: 1108, y: 774, w: 176, h: 88 },
  basket: { x: 1336, y: 952, w: 74, h: 94 },
  shelf: { x: 372, y: 330, w: 676 },
};
const STATIONS = {
  door: { x: 168, face: 'back' }, coat: { x: 322, face: 'back' }, clock: { x: 1110, face: 'back' },
  window: { x: 1318, face: 'back' }, chair: { x: 1452, face: 'q' }, map: { x: 1826, face: 'back' },
  table: { x: 944, face: 'front' }, lamp: { x: 700, face: 'front' }, typewriter: { x: 1196, face: 'front' },
  basket: { x: 1290, face: 'front' },
  cab1: { x: 455, face: 'back' }, cab2: { x: 623, face: 'back' }, cab3: { x: 791, face: 'back' }, cab4: { x: 959, face: 'back' }, cab5: { x: 1661, face: 'back' },
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const CAB_LABEL = ['', 'Voortekenen', 'Witte wieven', 'Weerwolven', 'Spoken', 'De duivel'];
// the three drawers of tonight, in the middle column of each cabinet
const PUZZLE_ROWS = [3, 4, 5];
function cabGrid(c) {
  const ix = c.x + 9, iy = c.y + 12, cw = (c.w - 18) / 3, rh = (c.h - 26) / 7;
  return { ix, iy, cw, rh, cell: (col, row) => ({ x: ix + col * cw, y: iy + row * rh, w: cw, h: rh }) };
}

// ---------- the back wall, ceiling, floor and the things that never move ----------
function paintBackWall() {
  boilSeed('wall');
  // ceiling and cornice
  paint(rectPts(-20, -20, W + 40, 78), { wash: '#DCD3BC', ink: null });
  paint(rectPts(-20, 48, W + 40, 16, 1), { wash: '#E6DDC7', ink: PAL.ink, sw: .5 });
  inkLine([[-10, 66], [W + 10, 66]], .7, PAL.ink, 'ink', 0);
  // wall
  paint(rectPts(-20, 66, W + 40, FLOOR_Y - 66), { wash: PAL.wall, ink: null });
  for (let i = 0; i < 26; i++) {
    const x = hash(i * 3.1) * W, y = 80 + hash(i * 7.7) * 520, r = 60 + hash(i * 1.3) * 160;
    paint(ellPts(x, y, r, r * .7, 18), { fill: i % 3 ? PAL.wallDk : '#B9AE92', fillOp: 40, bleed: .25, tex: .6, layers: 4, ink: null });
  }
  // picture rail
  paint(rectPts(-20, 140, W + 40, 8, .6), { wash: '#B9A27E', ink: null });
  inkLine([[-10, 140], [W + 10, 140]], .5, PAL.ink, 'inkfine', 0); inkLine([[-10, 148], [W + 10, 148]], .5, PAL.ink, 'inkfine', 0);
  // wainscot
  paint(rectPts(-20, 612, W + 40, FLOOR_Y - 612), { wash: PAL.wains, ink: null });
  paint(rectPts(-20, 600, W + 40, 15, .5), { wash: PAL.oakLt, ink: PAL.ink, sw: .55 });
  for (let x = 20; x < W; x += 172) {
    paint(rectPts(x, 632, 148, 152, 1.2), { fill: PAL.oakDk, fillOp: 60, bleed: .05, tex: .6, layers: 3, ink: PAL.ink, sw: .45 });
    inkLine([[x + 6, 778], [x + 142, 778], [x + 142, 638]], .35, PAL.oakLt, 'inkfine', 0);
  }
  // skirting
  paint(rectPts(-20, 800, W + 40, 27, .5), { wash: PAL.oakDk, ink: PAL.ink, sw: .6 });
  // floor: planks, wider as they come nearer
  paint(rectPts(-20, FLOOR_Y, W + 40, H - FLOOR_Y + 20), { wash: PAL.floor, ink: null });
  let y = FLOOR_Y, h = 9, row = 0;
  while (y < H + 10) {
    const off = hash(row * 5.3) * 300;
    for (let x = -off; x < W + 40; x += 260 + hash(row * 9 + x) * 120) {
      inkLine([[x, y + 1], [x + jit(1), y + h - 1]], .35, PAL.floorDk, 'inkfine', 0);
      if (hash(x * .37 + row) > .55) paint(rectPts(x + 4, y + 1, 200, h - 2), { fill: hash(x + row) > .5 ? PAL.floorDk : '#8D6644', fillOp: 55, bleed: .04, tex: .7, layers: 2, ink: null });
    }
    inkLine([[-10, y], [W + 10, y + jit(1)]], .4 + row * .03, PAL.floorDk, 'inkfine', 0);
    y += h; h *= 1.17; row++;
  }
  // a worn runner under the table
  paint(rectPts(500, 1000, 860, 80, 2), { wash: '#7A3236', ink: null });
  paint(rectPts(512, 1008, 836, 64, 2), { fill: '#5E2427', fillOp: 120, bleed: .04, tex: .8, layers: 3, ink: null });
  inkLine([[510, 1000], [1352, 1000]], .5, PAL.ink, 'ink', 0);
  for (let i = 0; i < 40; i++) inkLine([[516 + i * 21, 1000], [512 + i * 21, 994]], .3, '#C9A469', 'inkfine', 0);
  for (let x = 560; x < 1320; x += 64) paint(ellPts(x, 1040, 14, 6, 10), { fill: '#C9A469', fillOp: 90, bleed: .1, layers: 2, ink: null });

  paintShelf(); paintPortrait(); paintPendant();
}

function paintShelf() {
  const S = ROOM.shelf;
  boilSeed('shelf');
  // boxes and lever arch files
  let x = S.x + 12;
  const cols = ['#7E8B78', '#8A9480', '#6B6560', '#2F2F38', '#7C6E5A', '#8F8471'];
  let i = 0;
  while (x < S.x + S.w - 40) {
    const kind = hash(i * 4.7), bw = kind > .6 ? 26 : 40 + hash(i) * 10, bh = kind > .6 ? 92 : 70 + hash(i * 2) * 14;
    const col = kind > .6 ? (hash(i * 9) > .5 ? '#2F2F38' : '#3E5A4A') : cols[i % cols.length];
    const lean = i % 7 === 6 ? -.12 : 0;
    push(); translate(x, S.y); rotate(lean);
    paint(rectPts(0, -bh, bw, bh, .8), { wash: col, ink: PAL.ink, sw: .55 });
    if (kind > .6) { // lever arch: label window and ring hole
      paint(rectPts(5, -bh + 10, bw - 10, 34, .4), { wash: '#E8DFC8', tex: 0, ink: PAL.ink, sw: .3 });
      paint(ellPts(bw / 2, -22, 5, 5, 10), { wash: PAL.ink, tex: 0, ink: null });
      inkLine([[8, -bh + 22], [bw - 8, -bh + 22]], .3, PAL.ink, 'inkfine', 0);
    } else {
      paint(rectPts(7, -bh + 12, bw - 14, 20, .4), { wash: '#ECE4CF', tex: 0, ink: PAL.ink, sw: .3 });
      inkLine([[10, -bh + 20], [bw - 12, -bh + 20]], .3, PAL.ink, 'inkfine', 0);
      inkLine([[10, -bh + 26], [bw - 18, -bh + 26]], .25, PAL.ink, 'inkfine', 0);
      paint(ellPts(bw / 2, -bh + 52, 4, 4, 8), { wash: PAL.ink, tex: 0, ink: null });
    }
    pop();
    x += bw + 2 + (lean ? 6 : 0); i++;
  }
  paint(rectPts(S.x, S.y, S.w, 10, .5), { wash: PAL.oak, ink: PAL.ink, sw: .7 });
  for (const bx of [S.x + 40, S.x + S.w - 50]) paint([[bx, S.y + 10], [bx + 12, S.y + 10], [bx + 12, S.y + 44]], { wash: PAL.oakDk, ink: PAL.ink, sw: .5 });
}
function paintPortrait() {
  boilSeed('portrait');
  // an old photograph of a collector in a black frame, and the month's calendar by the door
  paint(rectPts(287, 214, 66, 84, .8), { wash: '#26222B', ink: PAL.ink, sw: .7 });
  paint(rectPts(295, 222, 50, 68, .5), { wash: '#B9AC92', ink: null });
  paint(ellPts(320, 246, 11, 13, 14), { fill: '#5C5246', fillOp: 180, bleed: .1, layers: 3, ink: null });
  paint([[302, 290], [306, 268], [320, 260], [334, 268], [338, 290]], { fill: '#4A4239', fillOp: 200, bleed: .05, layers: 3, ink: null });
  inkLine([[320, 180], [302, 214]], .4, PAL.ink, 'inkfine', 0); inkLine([[320, 180], [338, 214]], .4, PAL.ink, 'inkfine', 0);
  paint(ellPts(320, 179, 3, 3, 8), { wash: PAL.brass, tex: 0, ink: null });
}
function paintPendant() {
  boilSeed('pendant');
  inkLine([[934, 66], [934, 214]], .5, PAL.ink, 'inkfine', 0);
  paint([[906, 214], [962, 214], [990, 248], [878, 248]], { wash: '#3F6B58', ink: PAL.ink, sw: .8 });
  paint(ellPts(934, 249, 56, 6, 16), { wash: '#E9E2C8', tex: 0, ink: PAL.ink, sw: .5 });
  paint(rectPts(926, 204, 16, 12), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .5 });
}

// ---------- the calendar (today, in 1983) ----------
function paintCalendar(month) {
  boilSeed('calendar');
  const x = 286, y = 330;
  inkLine([[x + 34, y - 10], [x + 34, y]], .4, PAL.ink, 'inkfine', 0);
  paint(rectPts(x, y, 68, 92, .8), { wash: '#EFE7D2', ink: PAL.ink, sw: .5 });
  paint(rectPts(x, y, 68, 22, .5), { wash: PAL.red, tex: 0, ink: null });
  handText(month, x + 34, y + 16, 12, PAL.cream, { font: FONT.fellSC, align: 'center', j: 0 });
  handText('1983', x + 34, y + 38, 13, PAL.ink, { font: FONT.fell, align: 'center', j: 0 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) paint(rectPts(x + 7 + c * 9.5, y + 48 + r * 10, 5, 3), { wash: '#6F675C', tex: 0, pool: 0, ink: null });
}

// ---------- a card cabinet ----------
function paintCabinet(c, st = {}) {
  boilSeed('cab' + c.n);
  const devil = c.n === 5, wood = devil ? '#4B302A' : PAL.oak, woodDk = devil ? '#2E1C19' : PAL.oakDk, woodLt = devil ? '#6A4639' : PAL.oakLt;
  // plinth and body
  paint(rectPts(c.x - 4, c.y + c.h - 2, c.w + 8, FLOOR_Y - c.y - c.h + 2, .6), { wash: woodDk, ink: PAL.ink, sw: .7 });
  paint(rectPts(c.x, c.y, c.w, c.h, 1), { wash: wood, ink: null });
  paint(rectPts(c.x + 4, c.y + 6, c.w - 8, c.h - 10, 1), { fill: woodDk, fillOp: 70, bleed: .08, tex: .8, layers: 3, ink: null });
  // cornice with its title
  paint(rectPts(c.x - 8, c.y - 22, c.w + 16, 24, .8), { wash: woodLt, ink: PAL.ink, sw: .7 });
  paint(rectPts(c.x - 4, c.y - 30, c.w + 8, 9, .6), { wash: wood, ink: PAL.ink, sw: .5 });
  paint(rectPts(c.x + 20, c.y - 18, c.w - 40, 15, .4), { wash: '#EDE3C8', tex: 0, ink: PAL.ink, sw: .35 });
  handText(`${ROMAN[c.n]} · ${CAB_LABEL[c.n].toUpperCase()}`, c.x + c.w / 2, c.y - 6.5, 9.5, PAL.ink, { font: FONT.fellSC, align: 'center', j: 0 });
  // drawers
  const G = cabGrid(c);
  for (let row = 0; row < 7; row++) for (let col = 0; col < 3; col++) {
    const d = G.cell(col, row), k = hash(c.n * 31 + row * 7 + col);
    paint(rectPts(d.x + 2, d.y + 2, d.w - 4, d.h - 4, .5), { wash: mixCol(woodLt, wood, .3 + k * .4), ink: PAL.ink, sw: .45 });
    paint(rectPts(d.x + d.w / 2 - 10, d.y + 9, 20, 10, .2), { wash: devil ? '#8E7448' : PAL.brass, tex: 0, pool: 0, ink: PAL.ink, sw: .25 });
    paint(rectPts(d.x + d.w / 2 - 8, d.y + 11, 16, 6, .1), { wash: '#EFE6CF', tex: 0, pool: 0, ink: null });
    paint(ellPts(d.x + d.w / 2, d.y + d.h - 12, 6, 3.4, 10, .2), { wash: devil ? '#7A6440' : PAL.brassDk, tex: 0, pool: 0, ink: PAL.ink, sw: .3 });
  }
  paint(rectPts(c.x, c.y, c.w, c.h, 1), { ink: PAL.ink, sw: .9 });
  if (devil) {
    // the bar across, and the slot
    paint(rectPts(c.x - 10, c.y + 150, c.w + 20, 16, .6), { wash: PAL.iron, ink: PAL.ink, sw: .7 });
    for (const bx of [c.x - 4, c.x + c.w + 2]) paint(ellPts(bx, c.y + 158, 4, 4, 8), { wash: '#777080', tex: 0, ink: PAL.ink, sw: .3 });
    paint(rectPts(c.x + c.w / 2 - 26, c.y + 40, 52, 10, .3), { wash: '#1A1418', tex: 0, ink: PAL.brass, sw: .6 });
  }
}

// ---------- the clock ----------
function paintClockCase() {
  const K = ROOM.clock;
  boilSeed('clockcase');
  const x = K.x, w = K.w;
  // crest
  paint([[x - 4, 204], [x + w + 4, 204], [x + w - 6, 186], [x + w / 2, 166], [x + 6, 186]], { wash: PAL.oakDk, ink: PAL.ink, sw: .8, curv: .15 });
  paint(ellPts(x + w / 2, 168, 6, 6, 10), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .4 });
  // hood with the face
  paint(rectPts(x, 202, w, 104, .8), { wash: PAL.oak, ink: PAL.ink, sw: .8 });
  paint(ellPts(K.cx, K.cy, K.r + 6, K.r + 6, 32), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .6 });
  paint(ellPts(K.cx, K.cy, K.r, K.r, 32), { wash: '#F1E8D2', ink: PAL.ink, sw: .5 });
  for (let h = 1; h <= 12; h++) {
    const a = h / 12 * TAU - Math.PI / 2, r0 = K.r - 7, r1 = K.r - 2;
    inkLine([[K.cx + Math.cos(a) * r0, K.cy + Math.sin(a) * r0], [K.cx + Math.cos(a) * r1, K.cy + Math.sin(a) * r1]], h % 3 ? .4 : .7, PAL.ink, 'inkfine', 0);
  }
  // trunk with its glass door
  paint(rectPts(x + 8, 306, w - 16, 222, .8), { wash: PAL.oak, ink: PAL.ink, sw: .8 });
  paint(rectPts(x + 18, 318, w - 36, 196, .6), { wash: '#2A2530', ink: PAL.ink, sw: .6 });
  paint(rectPts(x + 18, 318, w - 36, 196, .6), { fill: '#6A7290', fillOp: 40, bleed: .02, layers: 2, ink: null });
  paint(rectPts(x, 528, w, 20, .7), { wash: PAL.oakDk, ink: PAL.ink, sw: .7 });
  paint([[x + 20, 548], [x + w - 20, 548], [x + w / 2, 578]], { wash: PAL.oakDk, ink: PAL.ink, sw: .6 });
}
// hands and pendulum, live. minutes = shown time; swing = pendulum angle
function paintClockLive(minutes, swing, stopped) {
  const K = ROOM.clock;
  boilSeed('clockhands');
  // pendulum
  push(); translate(K.cx, 322); rotate(swing);
  inkLine([[0, 0], [0, 150]], .6, PAL.brassDk, 'inkfine', 0);
  paint(ellPts(0, 160, 15, 15, 18), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .6 });
  glow(-4, 156, 12, '#FFE7A8', .25);
  pop();
  // glass glint
  inkLine([[K.x + 26, 330], [K.x + 34, 380]], .5, 'rgba(255,255,255,.35)', 'inkfine', 0);
  const hA = ((minutes / 60) % 12) / 12 * TAU - Math.PI / 2, mA = (minutes % 60) / 60 * TAU - Math.PI / 2;
  inkLine([[K.cx, K.cy], [K.cx + Math.cos(hA) * 20, K.cy + Math.sin(hA) * 20]], 1.1, PAL.ink, 'ink', 0);
  inkLine([[K.cx, K.cy], [K.cx + Math.cos(mA) * 30, K.cy + Math.sin(mA) * 30]], .7, PAL.ink, 'ink', 0);
  paint(ellPts(K.cx, K.cy, 2.5, 2.5, 8), { wash: PAL.ink, tex: 0, pool: 0, ink: null });
}

// ---------- the window: frame, the canal outside, mist ----------
function paintOutside() {
  const Gw = ROOM.window, { gx, gy, gw, gh } = Gw, k = gw / 264;
  boilSeed('outside' + k);
  // night sky
  const sky = C.createLinearGradient(0, gy, 0, gy + gh);
  sky.addColorStop(0, '#1B2147'); sky.addColorStop(.6, '#2C3A6E'); sky.addColorStop(1, '#3A4675');
  C.fillStyle = sky; C.fillRect(gx - 4 * k, gy - 4 * k, gw + 8 * k, gh + 8 * k);
  for (let i = 0; i < 26; i++) { const sx = gx + hash(i * 3.3) * gw, sy = gy + hash(i * 8.1) * gh * .45; paint(ellPts(sx, sy, 1.2 * k, 1.2 * k, 6), { wash: '#E9E4FF', tex: 0, pool: 0, washOp: 120 + hash(i) * 120, ink: null }); }
  // the moon over the gables: tonight's moon (feast.js), the dark of it just showing
  const mx = gx + gw * .72, my = gy + 74 * k, lit = MOON.lit;
  glow(mx, my, 90 * k, '#B8C6F0', .55 * (.2 + .8 * lit));
  paint(ellPts(mx, my, 21 * k, 21 * k, 24), { wash: '#2A3164', tex: .3, ink: null });
  if (lit > .02) paint(moonPts(mx, my, 21 * k, MOON.p), { wash: PAL.moon, tex: .4, ink: null });
  if (lit > .85) paint(ellPts(mx + 5 * k, my - 4 * k, 5 * k, 4 * k, 10), { fill: '#AEB8D2', fillOp: 120, layers: 2, ink: null });
  // the far side of the canal: gables with a few lit windows
  const base = gy + gh * .66;
  let x = gx - 10 * k, i = 0;
  while (x < gx + gw + 10 * k) {
    const bw = (44 + hash(i * 5.1) * 28) * k, bh = (120 + hash(i * 2.9) * 90) * k, kind = i % 3;
    const top = base - bh, P = [[x, base], [x, top + 26 * k]];
    if (kind === 0) P.push([x + bw * .2, top + 26 * k], [x + bw * .2, top + 12 * k], [x + bw * .5, top - 6 * k], [x + bw * .8, top + 12 * k], [x + bw * .8, top + 26 * k]);
    else if (kind === 1) P.push([x + bw * .5, top - 18 * k]);
    else P.push([x + bw * .15, top + 8 * k], [x + bw * .3, top + 8 * k], [x + bw * .3, top - 4 * k], [x + bw * .7, top - 4 * k], [x + bw * .7, top + 8 * k], [x + bw * .85, top + 8 * k]);
    P.push([x + bw, top + 26 * k], [x + bw, base]);
    paint(P, { wash: mixCol('#1F2443', '#2A2E52', hash(i)), tex: .3, ink: '#141830', sw: .5 * k });
    if (FEAST === 'kerst') inkLine(P.slice(1, -1), 1.5 * k, '#E6EAF4', 'ink', .12);   // snow on the roofs
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
      const wx = x + bw * (.25 + c * .32), wy = top + (34 + r * 26) * k; if (wy > base - 18 * k) continue;
      const lit = hash(i * 13 + r * 3 + c) > .78, tv = lit && hash(i * 7 + r) > .8;
      paint(rectPts(wx, wy, 9 * k, 13 * k, .3), { wash: lit ? (tv ? '#9FC4E8' : '#F2C66B') : '#2A3058', tex: 0, pool: 0, ink: null });
      if (lit) glow(wx + 4 * k, wy + 6 * k, 16 * k, tv ? '#A8CCF0' : '#FFC766', .35);
    }
    x += bw + k; i++;
  }
  // a bare elm and a quay lamp
  const tx = gx + 48 * k;
  inkLine([[tx, base + 4 * k], [tx + 3 * k, base - 90 * k], [tx - 6 * k, base - 150 * k]], 2.6 * k, '#121528', 'ink', .5);
  for (let b = 0; b < 9; b++) { const by = base - (60 + b * 12) * k, d = b % 2 ? 1 : -1; inkLine([[tx + 2 * k, by], [tx + d * (24 + hash(b) * 26) * k, by - (30 + hash(b * 2) * 20) * k]], .7 * k, '#121528', 'ink', .4); }
  const lx = gx + gw * .58;
  inkLine([[lx, base + 30 * k], [lx, base - 40 * k]], 1 * k, '#121528', 'ink', 0);
  paint(rectPts(lx - 6 * k, base - 52 * k, 12 * k, 14 * k, .3), { wash: '#F4D38C', tex: 0, ink: '#121528', sw: .4 * k });
  glow(lx, base - 45 * k, 60 * k, '#FFC766', .6);
  // quay and water
  paint(rectPts(gx - 6 * k, base, gw + 12 * k, 12 * k), { wash: '#2B2D44', tex: .5, ink: null });
  paint(rectPts(gx - 6 * k, base + 12 * k, gw + 12 * k, gh - (base - gy) - 12 * k), { wash: '#1C2244', tex: .5, ink: null });
  for (let j = 0; j < 10; j++) {
    const wy = base + (20 + j * 10) * k, wl = (20 + hash(j) * 40) * k;
    inkLine([[lx - wl / 2 + jit(4 * k), wy], [lx + wl / 2 + jit(4 * k), wy]], .5 * k, '#E9C77D', 'inkfine', 0);
    if (lit > .1) inkLine([[mx - 12 * k * lit, wy + 4 * k], [mx + 12 * k * lit, wy + 4 * k]], .4 * k, '#AEB8D8', 'inkfine', 0);
  }
  // the zinc ledge just outside the glass
  paint(rectPts(gx - 6 * k, gy + gh - 26 * k, gw + 12 * k, 30 * k, .5), { wash: '#69707E', tex: .6, ink: '#1A1C28', sw: .5 * k });
  inkLine([[gx - 6 * k, gy + gh - 26 * k], [gx + gw + 6 * k, gy + gh - 26 * k]], .5 * k, '#A9B0BE', 'inkfine', 0);
  if (FEAST === 'kerst') {
    paint(rectPts(gx - 6 * k, gy + gh - 30 * k, gw + 12 * k, 7 * k, .6), { wash: '#E9EDF6', tex: .3, ink: null });
    paint(rectPts(gx - 6 * k, base - 2 * k, gw + 12 * k, 6 * k, .5), { wash: '#C9D0E2', tex: .3, ink: null });
  }
}
function windowPanes() {
  const { gx, gy, gw, gh } = ROOM.window, out = [], meet = gy + gh * .49;
  for (let s = 0; s < 2; s++) {
    const y0 = s ? meet + 9 : gy, y1 = s ? gy + gh : meet - 1, ph = (y1 - y0) / 2;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) out.push({ x: gx + c * (gw / 2) + (c ? 3 : 0), y: y0 + r * ph + (r ? 3 : 0), w: gw / 2 - 3, h: ph - 3 });
  }
  return out;
}
function paintWindowFrame() {
  const G = ROOM.window, { gx, gy, gw, gh } = G, meet = gy + gh * .49;
  boilSeed('winframe');
  const fc = '#E2D7B8', fcd = '#BFB08A';
  // reveal and frame
  paint(rectPts(G.x - 14, G.y - 14, G.w + 28, G.h + 18, 1), { fill: '#8E8468', fillOp: 120, bleed: .04, layers: 3, ink: null });
  const frame = [[G.x, G.y], [G.x + G.w, G.y], [G.x + G.w, G.y + G.h], [G.x, G.y + G.h]];
  // frame as four bars around the glass
  const bar = (x, y, w, h) => paint(rectPts(x, y, w, h, .5), { wash: fc, ink: PAL.ink, sw: .55 });
  bar(G.x, G.y, G.w, gy - G.y); bar(G.x, gy + gh, G.w, G.y + G.h - gy - gh);
  bar(G.x, G.y, gx - G.x, G.h); bar(gx + gw, G.y, G.x + G.w - gx - gw, G.h);
  // meeting rail and glazing bars
  bar(gx - 2, meet - 2, gw + 4, 12);
  for (const s of [0, 1]) {
    const y0 = s ? meet + 10 : gy, y1 = s ? gy + gh : meet - 2;
    bar(gx + gw / 2 - 3, y0, 6, y1 - y0);
    bar(gx, (y0 + y1) / 2 - 3, gw, 6);
  }
  inkLine([[gx + gw / 2 - 30, meet + 3], [gx + gw / 2 + 30, meet + 3]], .4, fcd, 'inkfine', 0);
  paint(rectPts(gx + gw / 2 - 8, meet - 6, 16, 6, .3), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .35 });
  void frame;
  // the sill inside, deep enough to lay a card on
  const S = ROOM.sill;
  paint(rectPts(S.x, S.y, S.w, S.h, .6), { wash: fc, ink: PAL.ink, sw: .6 });
  paint(rectPts(S.x + 6, S.y + S.h, S.w - 12, 8, .4), { wash: fcd, ink: PAL.ink, sw: .4 });
  // radiator
  const rx = 1222, ry = 682;
  for (let i = 0; i < 13; i++) paint(rrPts(rx + i * 16, ry, 13, 104, 5, .4), { wash: '#B3AE9E', ink: PAL.ink, sw: .45 });
  paint(rectPts(rx - 4, ry + 98, 13 * 16 + 4, 8, .4), { wash: '#9C9787', ink: PAL.ink, sw: .4 });
  inkLine([[rx - 4, ry + 92], [rx - 30, ry + 92], [rx - 30, FLOOR_Y + 4]], .9, '#8C877A', 'ink', 0);
}
function paintCurtain() {
  boilSeed('curtain');
  // rail
  inkLine([[1150, 150], [1546, 150]], 1.4, PAL.brassDk, 'ink', 0);
  for (const x of [1150, 1546]) paint(ellPts(x, 150, 5, 5, 8), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .4 });
  // the right curtain, gathered: long folds of dark red velvet
  const x0 = 1470, x1 = 1548, P = [[x0, 152], [x1, 152], [x1 + 6, 520], [x1 + 2, 816], [x0 - 10, 816], [x0 + 16, 520]];
  paint(P, { wash: '#7B2B32', ink: PAL.ink, sw: .7, curv: .2 });
  for (let i = 0; i < 6; i++) {
    const fx = lerp(x0 + 6, x1 - 4, i / 5);
    paint([[fx - 4, 160], [fx + 4, 160], [fx + 6 + (i % 2 ? 8 : -6), 520], [fx + 2, 810], [fx - 6, 810], [fx - 2 + (i % 2 ? 6 : -8), 520]], { fill: i % 2 ? '#5A1C24' : '#9A3B40', fillOp: 120, bleed: .04, layers: 3, ink: null });
  }
  // tie-back
  paint(ellPts(x1 - 18, 520, 22, 7, 12), { wash: PAL.ochre, tex: 0, ink: PAL.ink, sw: .45 });
}

// ---------- the door ----------
function paintDoorFrame() {
  const D = ROOM.door;
  boilSeed('doorframe');
  // corridor behind (seen when the door stands open)
  paint(rectPts(D.x, D.y, D.w, D.h), { wash: '#4A4033', ink: null });
  paint(rectPts(D.x, D.y + D.h - 70, D.w, 70), { wash: '#5A4B3A', ink: null });
  // architrave
  paint(rectPts(D.x - 18, D.y - 20, D.w + 36, 22, .6), { wash: '#E2D7B8', ink: PAL.ink, sw: .6 });
  paint(rectPts(D.x - 18, D.y, 18, D.h, .6), { wash: '#E2D7B8', ink: PAL.ink, sw: .6 });
  paint(rectPts(D.x + D.w, D.y, 18, D.h, .6), { wash: '#E2D7B8', ink: PAL.ink, sw: .6 });
}
// the leaf, opening from 0 (shut) to 1 (wide open); it swings on its left hinge, its width narrowing
function paintDoorLeaf(open = 0, shiver = 0, letters = true) {
  const D = ROOM.door;
  boilSeed('doorleaf');
  const w = D.w * (1 - open * .82), x = D.x + shiver;
  if (open > 0) {
    // the light from the corridor
    softBlob(D.x + D.w * .6, D.y + D.h * .7, 120 + 80 * open, 200, '#F2D9A0', .5 * open);
  }
  paint(rectPts(x, D.y, w, D.h, .8), { wash: '#6E4A2E', ink: PAL.ink, sw: .8 });
  const pw = w - 40;
  if (pw > 10) {
    // upper glass (frosted, the archive's name on it, read from inside), lower panels
    paint(rectPts(x + 20, D.y + 26, pw, 150, .6), { wash: '#B9B8A6', ink: PAL.ink, sw: .5 });
    paint(rectPts(x + 20, D.y + 26, pw, 150, .6), { fill: '#E3E0CF', fillOp: 120, bleed: .1, layers: 3, ink: null });
    if (letters && open < .3) {
      push(); translate(x + 20 + pw / 2, D.y + 92); scale(-1 * (1 - open * 2), 1);
      handText('CENTRAAL', 0, 0, 15, '#6A5A3C', { font: FONT.fellSC, align: 'center', j: 0 });
      handText('SAGENARCHIEF', 0, 22, 15, '#6A5A3C', { font: FONT.fellSC, align: 'center', j: 0 });
      pop();
    }
    paint(rectPts(x + 20, D.y + 200, pw, 106, .6), { fill: '#4E3320', fillOp: 120, bleed: .04, layers: 3, ink: PAL.ink, sw: .5 });
    paint(rectPts(x + 20, D.y + 324, pw, 106, .6), { fill: '#4E3320', fillOp: 120, bleed: .04, layers: 3, ink: PAL.ink, sw: .5 });
  }
  // knob and keyhole
  if (open < .5) {
    paint(ellPts(x + w - 22, D.y + 246, 8, 8, 12), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .5 });
    paint(rectPts(x + w - 26, D.y + 262, 8, 14, .3), { wash: PAL.brassDk, tex: 0, ink: PAL.ink, sw: .3 });
  }
  // the edge of the leaf as it turns toward us
  if (open > .02) paint(rectPts(x + w, D.y, 12 * open + 4, D.h, .4), { wash: '#4A3020', ink: PAL.ink, sw: .5 });
}

// ---------- the coat stand and J.D.'s coat ----------
function paintCoat(pocketCard) {
  const K = ROOM.coat, cx = K.x + K.w / 2;
  boilSeed('coat');
  inkLine([[cx, 470], [cx, FLOOR_Y - 4]], 2.4, '#3C2A1E', 'ink', 0);
  for (const d of [-1, 1]) inkLine([[cx, FLOOR_Y - 40], [cx + d * 30, FLOOR_Y + 2]], 1.4, '#3C2A1E', 'ink', .3);
  for (const d of [-1, 1]) inkLine([[cx, 480], [cx + d * 22, 468], [cx + d * 28, 474]], 1.1, '#3C2A1E', 'ink', .4);
  // the hat
  paint(ellPts(cx + 4, 468, 30, 7, 16), { wash: '#2D2A30', ink: PAL.ink, sw: .6 });
  paint([[cx - 16, 468], [cx - 12, 446], [cx + 4, 440], [cx + 20, 446], [cx + 24, 468]], { wash: '#35313A', ink: PAL.ink, sw: .6, curv: .3 });
  paint(rectPts(cx - 15, 458, 38, 6), { wash: '#5A3A30', tex: 0, ink: null });
  // the long coat
  const P = [[cx - 14, 486], [cx + 14, 486], [cx + 30, 520], [cx + 36, 700], [cx + 40, 742], [cx - 36, 742], [cx - 32, 700], [cx - 30, 520]];
  paint(P, { wash: PAL.coat, ink: PAL.ink, sw: .8, curv: .1 });
  paint([[cx - 14, 486], [cx - 2, 560], [cx - 6, 742]], { wash: '#2C2A33', ink: PAL.ink, sw: .45 });
  inkLine([[cx + 2, 500], [cx + 2, 740]], .5, PAL.ink, 'inkfine', 0);
  for (let b = 0; b < 3; b++) paint(ellPts(cx + 8, 560 + b * 46, 3, 3, 8), { wash: '#16141A', tex: 0, ink: null });
  // the pocket, with a card's corner when one is in it
  if (pocketCard) {
    push(); translate(cx + 22, 648); rotate(-.25);
    paint(rectPts(-8, -22, 26, 26, .4), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .45 });
    inkLine([[-5, -15], [14, -15]], .3, PAL.red, 'inkfine', 0);
    pop();
  }
  inkLine([[cx + 4, 656], [cx + 32, 652]], .7, PAL.ink, 'ink', 0);
}

// ---------- the armchair by the window ----------
function paintArmchair(card) {
  const A = ROOM.chair;
  boilSeed('chair');
  const leather = '#6B3A2C', dk = '#4A251C';
  paint([[A.x + 22, A.y + 128], [A.x + 30, A.y + 18], [A.x + 88, A.y], [A.x + 146, A.y + 18], [A.x + 154, A.y + 128]], { wash: leather, ink: PAL.ink, sw: .8, curv: .25 });
  for (let i = 0; i < 4; i++) inkLine([[A.x + 50 + i * 26, A.y + 24], [A.x + 48 + i * 26, A.y + 110]], .4, dk, 'inkfine', 0);
  paint(rrPts(A.x + 18, A.y + 120, 140, 36, 10, .6), { wash: '#7A4535', ink: PAL.ink, sw: .7 });
  for (const s of [0, 1]) paint(rrPts(A.x + (s ? 140 : 0), A.y + 86, 36, 92, 14, .6), { wash: leather, ink: PAL.ink, sw: .8 });
  paint(rectPts(A.x + 6, A.y + 156, 164, 26, .6), { wash: dk, ink: PAL.ink, sw: .7 });
  for (const lx of [A.x + 14, A.x + 156]) paint(rectPts(lx, A.y + 182, 8, 22, .3), { wash: '#2A1A14', tex: 0, ink: PAL.ink, sw: .4 });
  if (card) {
    push(); translate(A.x + 84, A.y + 126); rotate(.12);
    paint(rectPts(-26, -7, 52, 10, .3), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .45 });
    pop();
  }
}

// ---------- the reading table ----------
function paintTable() {
  const Tb = ROOM.table;
  boilSeed('table');
  // legs
  for (const lx of [Tb.x + 34, Tb.x + Tb.w - 52]) {
    paint(rectPts(lx, Tb.y + 40, 20, 150 + TABLE_RAISE, .6), { wash: PAL.oakDk, ink: PAL.ink, sw: .7 });
    paint(ellPts(lx + 10, Tb.y + 96, 14, 9, 10), { wash: PAL.oak, ink: PAL.ink, sw: .5 });
  }
  inkLine([[Tb.x + 54, Tb.y + 150 + TABLE_RAISE * .6], [Tb.x + Tb.w - 52, Tb.y + 150 + TABLE_RAISE * .6]], 1.6, PAL.oakDk, 'ink', 0);
  // top and the green cloth hanging over the front
  paint(rectPts(Tb.x - 10, Tb.y - 2, Tb.w + 20, 18, .6), { wash: PAL.oak, ink: PAL.ink, sw: .8 });
  paint([[Tb.x - 14, Tb.y + 8], [Tb.x + Tb.w + 14, Tb.y + 8], [Tb.x + Tb.w + 18, Tb.y + 52], [Tb.x - 18, Tb.y + 52]], { wash: PAL.felt, ink: PAL.ink, sw: .8 });
  for (let i = 0; i < 12; i++) { const fx = Tb.x + 20 + i * 64; inkLine([[fx, Tb.y + 14], [fx + 4, Tb.y + 50]], .4, PAL.feltDk, 'inkfine', 0); }
  for (let i = 0; i < 64; i++) inkLine([[Tb.x - 16 + i * 12.4, Tb.y + 52], [Tb.x - 16 + i * 12.4 + jit(1), Tb.y + 58]], .3, PAL.feltDk, 'inkfine', 0);
}
function paintLampBody() {
  const L = ROOM.lamp, cx = L.cx;
  boilSeed('lamp');
  paint(ellPts(cx, 856, 34, 7, 16), { wash: PAL.brass, ink: PAL.ink, sw: .6 });
  inkLine([[cx, 852], [cx, 792]], 2.2, PAL.brassDk, 'ink', 0);
  inkLine([[cx, 800], [cx + 22, 812]], .8, PAL.brassDk, 'ink', .3);
  paint(ellPts(cx + 24, 816, 3, 5, 8), { wash: PAL.brass, tex: 0, ink: null });
}
// the shade, painted live so it can glow and flicker
function paintLampShade(on) {
  const cx = ROOM.lamp.cx;
  boilSeed('shade');
  paint([[cx - 64, 798], [cx - 54, 768], [cx + 54, 768], [cx + 64, 798]], { wash: on > .3 ? mixCol(PAL.shade, '#5FB98A', on * .35) : PAL.shade, ink: PAL.ink, sw: .8, curv: .1 });
  inkLine([[cx - 56, 774], [cx + 56, 774]], .4, '#9FD8B5', 'inkfine', 0);
  if (on > .02) {
    paint(ellPts(cx, 799, 60, 4, 16), { wash: '#FFF2C8', washOp: 255 * clamp(on), tex: 0, pool: 0, ink: null });
    glow(cx, 806, 120, '#FFD58A', .9 * on);
  }
}
function paintTray(count) {
  const R = ROOM.tray;
  boilSeed('tray');
  for (let i = 0; i < count; i++) {
    const cx = R.x + 12 + i * (70 / Math.max(1, count)), tab = i % 3;
    paint(rectPts(cx, R.y - 16 + (i % 2) * 3, 50, 30, .5), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .4 });
    paint(rectPts(cx + 6 + tab * 12, R.y - 22 + (i % 2) * 3, 14, 8, .3), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .35 });
  }
  paint(rectPts(R.x, R.y, R.w, R.h, .6), { wash: PAL.oakLt, ink: PAL.ink, sw: .7 });
  paint(rectPts(R.x + 34, R.y + 18, 28, 12, .3), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .35 });
}
function paintSpike(n) {
  const S = ROOM.spike, cx = S.cx;
  boilSeed('spike');
  paint(ellPts(cx, 856, 26, 6, 14), { wash: PAL.oakDk, ink: PAL.ink, sw: .6 });
  inkLine([[cx, 852], [cx, 770]], .9, '#8A8A96', 'ink', 0);
  // the impaled note, and on it the night's envelopes, stamped
  const stack = [{ col: '#F2EAD3', w: 40 }].concat(Array.from({ length: n }, (_, i) => ({ col: i % 2 ? PAL.manila : '#D3AE6E', w: 48 })));
  stack.forEach((s, i) => {
    const y = 846 - i * 5.5, r = (hash(i * 3.7) - .5) * .28;
    push(); translate(cx, y); rotate(r);
    paint(rectPts(-s.w / 2, -4, s.w, 7, .3), { wash: s.col, tex: 0, ink: PAL.ink, sw: .35 });
    pop();
  });
}
function paintTypewriter(paper) {
  const Tw = ROOM.typewriter, x = Tw.x;
  boilSeed('typewriter');
  if (paper) {
    paint(rectPts(x + 54, 738 - paper * 30, 70, 64 + paper * 30, .5), { wash: '#F4EFE2', tex: 0, ink: PAL.ink, sw: .45 });
    for (let i = 0; i < Math.min(6, paper * 6); i++) inkLine([[x + 60, 750 - paper * 30 + i * 7], [x + 112 - hash(i) * 24, 750 - paper * 30 + i * 7]], .3, '#45404C', 'inkfine', 0);
  }
  // platen and carriage
  paint(rrPts(x + 18, 778, 142, 24, 10, .5), { wash: '#1E1C22', ink: PAL.ink, sw: .7 });
  for (const s of [x + 10, x + 162]) paint(ellPts(s, 790, 9, 9, 10), { wash: '#2C2930', ink: PAL.ink, sw: .5 });
  inkLine([[x + 160, 782], [x + 182, 770]], 1.2, '#B9BCC4', 'ink', 0);
  // body
  paint([[x + 6, 860], [x + 170, 860], [x + 158, 800], [x + 18, 800]], { wash: '#26242B', ink: PAL.ink, sw: .8 });
  paint([[x + 34, 836], [x + 142, 836], [x + 134, 808], [x + 42, 808]], { wash: '#3A3740', ink: null });
  for (let r = 0; r < 3; r++) for (let k = 0; k < 9 - r; k++) paint(ellPts(x + 48 + r * 6 + k * 11, 846 - r * 9, 3.6, 2.6, 8), { wash: '#E8E1D0', tex: 0, pool: 0, ink: PAL.ink, sw: .25 });
  handText('Olympia', x + 88, 826, 9, '#C9B98A', { font: FONT.fell, align: 'center', j: 0 });
}
function paintBasket(card) {
  const B = ROOM.basket;
  boilSeed('basket');
  paint([[B.x, B.y], [B.x + B.w, B.y], [B.x + B.w - 10, B.y + B.h], [B.x + 10, B.y + B.h]], { wash: '#9B7A4E', ink: PAL.ink, sw: .7 });
  for (let i = 1; i < 7; i++) inkLine([[B.x + i * B.w / 7, B.y + 4], [B.x + 10 + i * (B.w - 20) / 7, B.y + B.h - 4]], .35, '#5E4528', 'inkfine', 0);
  for (let j = 1; j < 6; j++) inkLine([[B.x + 2 + j * 1.6, B.y + j * B.h / 6], [B.x + B.w - 2 - j * 1.6, B.y + j * B.h / 6]], .3, '#5E4528', 'inkfine', 0);
  paint(ellPts(B.x + B.w / 2, B.y, B.w / 2, 6, 14), { wash: '#7E5F38', ink: PAL.ink, sw: .5 });
  // a crumpled card, balled up and poking out of the top: big enough to see across the room
  if (card) {
    const cx = B.x + B.w / 2 + 4, cy = B.y - 10;
    paint(ellPts(cx, cy, 25, 19, 11, 5), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .7 });
    inkLine([[cx - 16, cy - 6], [cx - 2, cy + 2], [cx + 14, cy - 8]], .45, PAL.ink, 'inkfine', .5);
    inkLine([[cx - 6, cy - 16], [cx, cy - 2], [cx - 8, cy + 14]], .4, PAL.ink, 'inkfine', .5);
    inkLine([[cx + 4, cy + 4], [cx + 18, cy + 8]], .35, PAL.red, 'inkfine', .3);
  }
}
// the wall map, small in the room: the same sheet as up close (views2.js), sea, neighbours, provinces and all
function paintMapSmall() {
  const M = ROOM.map, path = (ring) => { C.beginPath(); ring.forEach(([lon, lat], i) => { const [x, y] = mapXY(lat, lon, 160, 230); i ? C.lineTo(x, y) : C.moveTo(x, y); }); C.closePath(); };
  boilSeed('mapsmall');
  paint(rectPts(M.x - 6, M.y - 6, M.w + 12, M.h + 12, .6), { wash: '#4F3B2A', ink: PAL.ink, sw: .6 });
  C.drawImage(paperSheet(M.w, M.h, '#E9DFC4', 12, 1), M.x, M.y, M.w, M.h);
  C.save(); C.beginPath(); C.rect(M.x + 3, M.y + 18, M.w - 6, M.h - 22); C.clip();
  C.fillStyle = 'rgba(115,145,160,.5)'; C.fillRect(M.x, M.y, M.w, M.h);
  push(); translate(M.x + 10, M.y + 44); scale(M.w / 178, M.w / 178);   // the country across the sheet, sea above, Belgium below
  const land = [...MAPGEO.provinces.flatMap(p => p.rings), ...MAPGEO.neighbours.flatMap(n => n.rings)];
  C.lineJoin = 'round';
  for (let i = 4; i >= 1; i--) { C.lineWidth = i * 2.2; C.strokeStyle = `rgba(60,85,100,${.05 + (4 - i) * .02})`; for (const r of land) { path(r); C.stroke(); } }
  for (const n of MAPGEO.neighbours) for (const r of n.rings) { path(r); C.fillStyle = '#D2C6A6'; C.fill(); }
  // the tints a shade deeper than up close: seen across the room, by lamplight, pastel goes grey
  for (const p of MAPGEO.provinces) for (const r of p.rings) { path(r); C.fillStyle = PROV_TINT[p.name] || '#E0D4B0'; C.fill(); C.fillStyle = 'rgba(175,105,50,.16)'; C.fill(); }
  for (const w of MAPGEO.water) for (const r of w.rings) { path(r); C.fillStyle = 'rgba(110,140,155,.8)'; C.fill(); }
  C.strokeStyle = 'rgba(70,110,140,.6)'; C.lineWidth = .7;
  for (const rv of MAPGEO.rivers) for (const line of (rv.lines || rv.rings || [])) { C.beginPath(); line.forEach(([lon, lat], i) => { const [x, y] = mapXY(lat, lon, 160, 230); i ? C.lineTo(x, y) : C.moveTo(x, y); }); C.stroke(); }
  C.lineWidth = .8; C.strokeStyle = 'rgba(60,40,28,.75)';
  for (const p of MAPGEO.provinces) for (const r of p.rings) { path(r); C.stroke(); }
  C.fillStyle = 'rgba(58,48,40,.8)';
  for (const [, lat, lon] of CITIES) { const [x, y] = mapXY(lat, lon, 160, 230); C.beginPath(); C.arc(x, y, 1.05, 0, TAU); C.fill(); }
  pop(); C.restore();
  handText('NEDERLAND', M.x + M.w / 2, M.y + 13, 9, '#4A3A2A', { font: FONT.fellSC, align: 'center', j: 0 });
  for (const [px, py] of [[M.x + 3, M.y + 3], [M.x + M.w - 3, M.y + 3]]) paint(ellPts(px, py, 3, 3, 8), { wash: PAL.red, tex: 0, ink: null });
}
// lat/lon to a box of w × h (the map's own projection)
const MAP_BOX = { lon0: 3.25, lon1: 7.3, lat0: 50.72, lat1: 53.6 };
function mapXY(lat, lon, w, h) {
  const B = MAP_BOX, kx = Math.cos(52.15 * Math.PI / 180), sx = w / ((B.lon1 - B.lon0) * kx), sy = h / (B.lat1 - B.lat0), s = Math.min(sx, sy);
  return [(lon - B.lon0) * kx * s, (B.lat1 - lat) * s];
}

// ---------- the room as layers ----------
const RL = {};   // room layers, made once the fonts are in
function makeRoomLayers() {
  RL.back = layer(0, 0, W, H, () => { paintBackWall(); paintDoorFrame(); }, 'back');
  RL.clock = layer(1040, 150, 140, 440, paintClockCase, 'clock');
  RL.outside = layer(1190, 170, 280, 472, paintOutside, 'outside');
  RL.frame = layer(1150, 140, 360, 680, () => { paintWindowFrame(); }, 'frame');
  RL.curtain = layer(1140, 140, 420, 690, paintCurtain, 'curtain');
  RL.cabs = CABS.map(c => layer(c.x - 16, c.y - 36, c.w + 32, FLOOR_Y - c.y + 40, () => paintCabinet(c, {}), 'cab' + c.n));
  RL.table = layer(500, 840, 860, 230 + TABLE_RAISE, paintTable, 'table');
  RL.lamp = layer(ROOM.lamp.cx - 52, 780, 110, 90, paintLampBody, 'lampbody');
  RL.map = layer(1740, 200, 180, 266, paintMapSmall, 'map');
  RL.tray = null; RL.spike = null; RL.coat = null; RL.chair = null; RL.basket = null; RL.tw = null; RL.leaf = null; RL.cal = null;
}
// small layers whose look depends on the night's state are remade when it changes
function stateLayer(name, key, x, y, w, h, draw) {
  const L = RL[name];
  if (L && L.key === key) return L;
  if (L) LAYERS.splice(LAYERS.indexOf(L), 1);
  return (RL[name] = layer(x, y, w, h, draw, key));
}

// ---------- light: the room is painted as by day and darkened by a lightmap ----------
const LM = { cv: null, c: null, w: 240, h: 135 };
function lightmap(L) {
  if (!LM.cv) { LM.cv = document.createElement('canvas'); LM.cv.width = LM.w; LM.cv.height = LM.h; LM.c = LM.cv.getContext('2d'); }
  const c = LM.c, s = LM.w / W;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over';
  c.fillStyle = L.ambient; c.fillRect(0, 0, LM.w, LM.h);
  c.setTransform(s, 0, 0, s, 0, 0); c.globalCompositeOperation = 'lighter';
  const blob = (x, y, r, col, a, sy = 1) => {
    if (a <= 0) return; const [cr, cg, cb] = hexRgb(col);
    c.save(); c.translate(x, y); c.scale(1, sy);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`); g.addColorStop(.5, `rgba(${cr},${cg},${cb},${a * .5})`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r); c.restore();
  };
  // the desk lamp: a pool on the table and up the wall behind it
  const lp = L.lamp;
  const ly = -TABLE_RAISE;
  blob(ROOM.lamp.cx, 830 + ly, 560, '#F2B66A', .78 * lp, .62);
  blob(ROOM.lamp.cx + 120, 900 + ly * .5, 420, '#E8A860', .45 * lp, .5);
  blob(ROOM.lamp.cx, 640 + ly, 330, '#C98E50', .25 * lp);
  // the moon through the window: the glass, and the panes' patch on the floor
  const mn = L.moon;
  blob(1330, 400, 260, '#8FA0D8', .55 * mn, 1.4);
  if (mn > 0) {
    c.save(); c.globalAlpha = .32 * mn; c.fillStyle = '#9FB0E4';
    c.beginPath(); c.moveTo(1190, 900); c.lineTo(1460, 900); c.lineTo(1300, 1080); c.lineTo(960, 1080); c.closePath(); c.fill(); c.restore();
    blob(1200, 980, 260, '#8FA0D8', .3 * mn, .5);
  }
  // the corridor lamp, under the door
  blob(160, 826, 130, '#E8B878', .4 * L.door, .25);
  if (L.doorOpen > 0) blob(160, 640, 300, '#F0CC90', .7 * L.doorOpen, 1.2);
  // whatever else glows (the morning, a match)
  if (L.extra) for (const e of L.extra) blob(...e);
  return LM.cv;
}
function applyLight(L) {
  const cv = lightmap(L);
  C.save(); C.globalCompositeOperation = 'multiply'; C.imageSmoothingEnabled = true; C.drawImage(cv, 0, 0, W, H); C.restore();
}
