// views.js: the room, the table, a cabinet up close, the archive behind a divider, and the reader. Each view paints
// the whole frame and registers what can be clicked; the night's rules stay in game.js.
'use strict';

const V = {};

// ---------- compositing: Clawd and the foreground lit apart from the wall behind them ----------
const COMP = {};
function compInit() {
  const mk = () => { const cv = document.createElement('canvas'); cv.width = Math.ceil(W * RS); cv.height = Math.ceil(H * RS); return [cv, cv.getContext('2d')]; };
  [COMP.fg, COMP.fgc] = mk(); [COMP.a, COMP.ac] = mk();
  COMP.lmc = document.createElement('canvas'); COMP.lmc.width = LM.w; COMP.lmc.height = LM.h; COMP.lmcc = COMP.lmc.getContext('2d');
}
// draw fn into its own layer, multiply that by the light, keep its own alpha, lay it over the frame. r = region
// Premultiplied, so soft edges and shadows come out right: frame·(1 − a) + a·colour·light.
function litPass(fn, lm, r = [0, 0, W, H]) {
  const c = COMP.fgc, [x, y, w, h] = r.map(v => v * RS), X = Math.max(0, Math.floor(x)), Y = Math.max(0, Math.floor(y));
  const Wd = Math.min(Math.ceil(w) + 2, COMP.fg.width - X), Hd = Math.min(Math.ceil(h) + 2, COMP.fg.height - Y);
  if (Wd <= 0 || Hd <= 0) return;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(X, Y, Wd, Hd);
  c.save(); c.beginPath(); c.rect(X, Y, Wd, Hd); c.clip(); c.setTransform(RS, 0, 0, RS, 0, 0);
  withCtx(c, fn);
  c.restore();
  // the premultiplied colour: the layer over black, times the light
  const a = COMP.ac; a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over';
  a.fillStyle = '#000'; a.fillRect(X, Y, Wd, Hd); a.drawImage(COMP.fg, X, Y, Wd, Hd, X, Y, Wd, Hd);
  a.globalCompositeOperation = 'multiply'; a.drawImage(lm, X / (W * RS) * LM.w, Y / (H * RS) * LM.h, Wd / (W * RS) * LM.w, Hd / (H * RS) * LM.h, X, Y, Wd, Hd);
  a.globalCompositeOperation = 'source-over';
  C.save(); C.setTransform(1, 0, 0, 1, 0, 0);
  C.globalCompositeOperation = 'destination-out'; C.drawImage(COMP.fg, X, Y, Wd, Hd, X, Y, Wd, Hd);
  C.globalCompositeOperation = 'lighter'; C.drawImage(COMP.a, X, Y, Wd, Hd, X, Y, Wd, Hd);
  C.restore();
}
function charLight(lm, k = .5) {
  const c = COMP.lmcc; c.globalAlpha = 1; c.fillStyle = '#fff'; c.fillRect(0, 0, LM.w, LM.h);
  c.globalAlpha = 1 - k; c.drawImage(lm, 0, 0); c.globalAlpha = 1; return COMP.lmc;
}

// ---------- the light of the moment ----------
function roomLight() {
  const fx = G.fx, lamp = clamp(fx.flick) * (1 - fx.lampOff), morning = fx.morning;
  return {
    ambient: mixCol('#45476E', '#B9B3A6', morning), lamp: lamp * (1 - morning * .8), moon: (1 - G.mistK() * .75) * (1 - morning) * (fx.wolfShade ? .45 : 1),
    door: 1 - morning, doorOpen: fx.doorOpen, extra: morning > 0 ? [[1330, 420, 700, '#D8DCE0', .5 * morning, 1]] : null,
  };
}
G.mistK = () => clamp(G.fx.mistLevel / 3);

// ---------- Clawd walks ----------
const WALK_SPEED = 620;
// a grown-up stands beside a cabinet rather than in front of its drawers, and walks rather than trots
const standX = (x, face) => WHO === 'me' && face === 'back' && CABS.some(c => Math.abs(x - (c.x + c.w / 2)) < 2) ? x + 74 : x;
const walkSpeed = () => WHO === 'me' ? 430 : WALK_SPEED;
function walkTo(x, face, then) {
  const c = G.clawd; x = clamp(standX(x, face), 120, 1840);
  c.held = false; c.hold = 0;
  if (Math.abs(c.x - x) < 6) { c.x = c.tx = x; c.walking = false; turnTo(face); then && setTimeout(then, 180); return; }
  c.x0 = c.x; c.tx = x; c.walkT0 = T; c.walkDur = Math.max(.35, Math.abs(x - c.x) / walkSpeed() + .2); c.walking = true; c.face = face; c.then = then;
}
function turnTo(face) { const c = G.clawd; if (c.face !== face) { c.prevFace = c.face; c.face = face; c.turnT = T; } }
// holding an arrow key walks that way until it is let go: speed up, keep going, slow down
function holdWalk(dir) {
  const c = G.clawd;
  if (!dir) { c.hold = 0; return; }
  if (c.held && c.hold === dir) return;
  if (!c.held) { c.v = 0; c.dist = 0; c.lastStep = -1; }
  c.held = true; c.hold = dir; c.heldDir = dir; c.walking = true; c.then = null; c.face = 'front'; c.lastT = T;
}
function updateHeld(c) {
  const dt = Math.min(.05, Math.max(0, T - c.lastT)), vmax = walkSpeed(), acc = vmax / .2;
  c.lastT = T;
  if (G.view !== 'room') c.hold = 0;
  c.v += clamp(c.hold * vmax - c.v, -acc * dt, acc * dt);
  if (c.v) c.heldDir = Math.sign(c.v);
  const nx = clamp(c.x + c.v * dt, 120, 1840);
  c.dist += Math.abs(nx - c.x); c.x = c.tx = nx;
  const step = Math.floor(c.dist / 34); if (step !== c.lastStep) { c.lastStep = step; if (step > 0) SND.step(nx); }
  const atEdge = (nx <= 120 && c.v < 0) || (nx >= 1840 && c.v > 0);
  if (atEdge || (!c.hold && Math.abs(c.v) < 4)) {
    c.walking = false; c.held = false; c.hold = 0; c.v = 0;
    c.stopT = c.turnT = T; c.lastLeft = c.heldDir < 0; c.prevFace = 'side';
  }
}
function updateWalk() {
  const c = G.clawd; if (!c.walking) return;
  if (c.held) return updateHeld(c);
  const k = seg(T, c.walkT0, c.walkT0 + c.walkDur), x = lerp(c.x0, c.tx, ease(k));
  const step = Math.floor(Math.abs(x - c.x0) / 34); if (step !== c.lastStep) { c.lastStep = step; SND.step(x); }
  c.x = x;
  if (k >= 1) { c.walking = false; c.stopT = c.turnT = T; c.lastLeft = c.tx < c.x0; c.prevFace = 'side'; const f = c.then; c.then = null; f && setTimeout(f, 220); }
}
function clawdPose() {
  const c = G.clawd, m = c.mood.pose();
  if (c.walking) {
    const d = (c.held ? c.dist : Math.abs(c.x - c.x0)) / (4 * 17), flip = c.held ? c.heldDir < 0 : c.tx < c.x0;
    return { ...m, view: 'side', flip, walk: d, dy: (m.dy || 0) * .3 - Math.abs(Math.sin(d * Math.PI)) * .5, rot: 0, dx: 0, aL: .3 * Math.sin(d * Math.PI), aR: -.3 * Math.sin(d * Math.PI) };
  }
  // a drawn turn from the way it walked to the way it faces (a person turns a little slower, through every angle)
  let view = c.face, flip = false, yaw;
  const tk = seg(T, c.turnT, c.turnT + (WHO === 'me' ? .38 : .22));
  if (tk < 1 && c.prevFace !== c.face) {
    const from = c.lastLeft ? .75 : .25, to = c.face === 'back' ? .5 : c.lastLeft ? 1 : 0, a = lerp(from, to, ease(tk));
    const v = spinView(a); view = v.view; flip = v.flip; yaw = a * TAU;
  }
  if (c.look) { const lk = c.look; if (T < lk.until) { view = lk.view || 'q'; flip = lk.flip; yaw = undefined; } else c.look = null; }
  const sit = ease(seg(T, c.stopT ?? -9, (c.stopT ?? -9) + .35));
  return { ...m, view, flip, yaw, sit, smear: tk < 1 && tk > .2 ? .3 * Math.sin(tk * Math.PI) : 0, smearDir: 0 };
}
function carryHook() {
  const h = (G.S && G.S.hand) || (G.fx.carryEnv ? { kind: 'env' } : null); if (!h) return null;
  return (u) => {
    push(); rotate(-.6);
    if (h.kind === 'env') paint(rectPts(-u * 1.6, -u * 2.6, u * 3.4, u * 2.2, .4), { wash: PAL.manila, tex: 0, ink: PAL.ink, sw: .5 });
    else paint(rectPts(-u * 1.4, -u * 2.4, u * 2.8, u * 1.7, .4), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .5 });
    pop();
  };
}
// the cat goes up on the table at the table's own places, and hops down again when it leaves
const TABLE_LIFT = 38;
function tableHop() {
  const c = G.clawd;
  const want = WHO === 'cat' && !c.walking && c.face === 'front' && ['lamp', 'table'].some(k => Math.abs(c.x - STATIONS[k].x) < 4) ? 1 : 0;
  if (want !== c.hopTo) { c.hopFrom = c.hopK ?? 0; c.hopTo = want; c.hopT0 = T; if (c.hopT0 > 1) SND.step(c.x); }
  const k = ease(seg(T, c.hopT0 ?? -9, (c.hopT0 ?? -9) + .34));
  c.hopK = lerp(c.hopFrom ?? 0, want, k); c.hopArc = c.hopFrom !== want && k < 1 ? 4 * k * (1 - k) : 0;
  return c.hopK;
}
function drawClawdRoom() {
  const c = G.clawd, p = clawdPose(), hook = carryHook(), lift = (c.hopK || 0) * TABLE_LIFT + (c.hopArc || 0) * 46;
  if (c.hopArc) { p.sit = 0; p.sq = (p.sq || 0) - .08 * c.hopArc; }
  const breath = G.S && G.S.active === 4 && G.leakLevel() >= 3 && Math.abs(c.x - STATIONS.cab4.x) < 90;
  const side = p.view === 'side' || p.view === 'q' && p.flip;
  const carry = hook ? (side ? { aL: .6, armL: hook } : { aR: 1, armR: hook }) : {};
  assistant(c.x, WALK_Y - lift, 17, { ...p, ...carry, emote: breath && !p.emote ? 'breath' : p.emote, emoteK: breath && !p.emote ? 1 : p.emoteK, boilKey: 'me', seed: 2 });
}

// ---------- the room ----------
V.room = {
  enter() { G.clawd.mood.setRest(G.restMood()); },
  draw() {
    const S = G.S, fx = G.fx;
    updateWalk();
    // the wall, the cabinets, the clock, the window, the door
    RL.back.blit();
    const month = ['JANUARI', 'FEBRUARI', 'MAART', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AUGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DECEMBER'][new Date().getMonth()];
    stateLayer('cal', month, 270, 310, 100, 130, () => paintCalendar(month)).blit();
    for (const c of CABS) drawCabinetRoom(c);
    RL.clock.blit();
    const swing = fx.pendulum ? .13 * Math.sin(T * Math.PI) * (fx.stopped ? 0 : 1) : 0;
    paintClockLive(G.wallMinutes(), swing, fx.stopped);
    drawWindowRoom();
    RL.frame.blit(); RL.curtain.blit();
    RL.map.blit();
    paintDoorLeaf(fx.doorOpen, fx.shiver * Math.sin(T * 70) * 2);
    if (S.fired.floor && G.where(S.fired.floor) === 'floor') drawFloorCard();
    stateLayer('coat', 'coat' + !!G.foundAt('coat'), 240, 420, 160, 420, () => paintCoat(!!G.foundAt('coat'))).blit();
    stateLayer('chair', 'chair' + !!G.foundAt('chair'), 1370, 680, 210, 240, () => paintArmchair(!!G.foundAt('chair'))).blit();
    const L = roomLight(), lm = lightmap(L);
    applyLight(L);
    // ghostly things glow through the dark
    drawLeakGlow();
    // Clawd, lit to stay readable
    const cx = G.clawd.x;
    const up = tableHop() > .5;
    if (!up) litPass(drawClawdRoom, charLight(lm, .5), WHO === 'me' ? [cx - 280, WALK_Y - 470, 560, 520] : [cx - 260, WALK_Y - 330, 520, 380]);
    // the table and what is on it
    litPass(drawTableRoom, lm, [480, 700 - TABLE_RAISE, 980, 380 + TABLE_RAISE]);
    if (up) litPass(drawClawdRoom, charLight(lm, .5), [cx - 260, WALK_Y - 430, 520, 480]);
    push(); translate(0, -TABLE_RAISE);
    paintLampShade(L.lamp > .05 ? L.lamp : 0);
    drawDust(L.lamp);
    pop();
    if (fx.wolf) drawWolfShadowFloor();
    this.hits();
  },
  hits() {
    const S = G.S;
    const go = (st, then) => () => { const s = STATIONS[st]; walkTo(s.x, s.face, then); };
    // the floor first, so everything standing on it wins: clicking it just walks there
    UI.hit({ r: [0, FLOOR_Y + 10, W, H - FLOOR_Y], tip: null, cursor: 'default', floor: true, onClick: (x) => walkTo(x, 'front') });
    for (const c of CABS) {
      const st = 'cab' + c.n;
      UI.hit({ r: [c.x - 8, c.y - 34, c.w + 16, FLOOR_Y - c.y + 34], tip: `Kast ${ROMAN[c.n]} · ${CAB_LABEL[c.n]}`, cursor: 'pointer',
        onClick: go(st, () => openView(c.n === 5 ? 'dial' : 'cabinet', c.n, [c.x + c.w / 2, c.y + 150])) });
    }
    UI.hit({ r: [ROOM.clock.x, ROOM.clock.y, ROOM.clock.w, ROOM.clock.h], tip: 'De klok', onClick: go('clock', () => openView('clock', null, [ROOM.clock.cx, ROOM.clock.cy])) });
    UI.hit({ r: [ROOM.window.x, ROOM.window.y, ROOM.window.w, ROOM.window.h + 30], tip: 'Het raam', onClick: go('window', () => openView('window', null, [1330, 400])) });
    UI.hit({ r: [ROOM.door.x, ROOM.door.y, ROOM.door.w, ROOM.door.h], tip: 'De deur', onClick: go('door', () => openView('door', null, [160, 600])) });
    UI.hit({ r: [ROOM.coat.x, ROOM.coat.y, ROOM.coat.w, ROOM.coat.h - 60], tip: 'De jas van J.J.V.', onClick: go('coat', () => clickCoat()) });
    UI.hit({ r: [ROOM.chair.x, ROOM.chair.y, ROOM.chair.w, ROOM.chair.h], tip: 'De leunstoel', onClick: go('chair', () => clickFound('chair', 'Een leunstoel. Er ligt niets op.')) });
    UI.hit({ r: [ROOM.map.x - 6, ROOM.map.y - 6, ROOM.map.w + 12, ROOM.map.h + 12], tip: 'De kaart van Nederland', onClick: go('map', () => openView('map', null, [1830, 330])) });
    // in front of the cabinets: the table and what stands on it
    const R = TABLE_RAISE;
    UI.hit({ r: [ROOM.table.x, 806 - R, ROOM.table.w, 132], tip: 'De leestafel', onClick: go('table', () => openView('table', null, [930, 860])) });
    UI.hit({ r: [ROOM.lamp.x, ROOM.lamp.y - R, ROOM.lamp.w, ROOM.lamp.h], tip: 'De lamp', onClick: go('lamp', () => clickFound('lamp', null) || openView('table', null, [700, 840])) });
    UI.hit({ r: [ROOM.typewriter.x, ROOM.typewriter.y - 40 - R, ROOM.typewriter.w, ROOM.typewriter.h + 40], tip: 'De schrijfmachine', onClick: go('typewriter', () => clickTypewriter()) });
    UI.hit({ r: [ROOM.spike.x - 10, ROOM.spike.y - 10 - R, ROOM.spike.w + 20, ROOM.spike.h + 10], tip: 'De prikker', onClick: go('table', () => openView('table', null, [930, 860])) });
    UI.hit({ r: [ROOM.basket.x - 10, ROOM.basket.y - 20, ROOM.basket.w + 20, ROOM.basket.h + 20], tip: 'De prullenbak', onClick: go('basket', () => clickFound('bin', 'Snippers. Niets.')) });
    if (S.fired.floor && G.where(S.fired.floor) === 'floor') UI.hit({ r: [180, 880, 140, 60], tip: 'Een kaart op de vloer', onClick: () => walkTo(250, 'front', () => G.pickUp('floor')) });
  },
};
// dust drifting through the lamplight: nothing in the room is ever quite still
function drawDust(lamp) {
  if (lamp < .1) return;
  const cx = ROOM.lamp.cx;
  C.save(); C.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const ph = frac(T * (.012 + hash(i) * .02) + hash(i * 3.1)), x = cx - 120 + hash(i * 7.7) * 240 + Math.sin(T * .3 + i) * 30, y = 690 + (1 - ph) * 170;
    const a = Math.sin(ph * Math.PI) * .5 * lamp * (.5 + .5 * Math.sin(T * 2 + i * 1.3));
    C.fillStyle = `rgba(255,224,170,${a})`; C.beginPath(); C.arc(x, y, 1.4 + hash(i * 2) * 1.2, 0, TAU); C.fill();
  }
  C.restore();
}

// whatever is on the table in the room, painted live where it changes
function drawTableRoom() {
  const S = G.S, env = S.env;
  push(); translate(0, -TABLE_RAISE);
  RL.table.blit(); RL.lamp.blit();
  const wob = G.fx.wobble ? spring(T, G.fx.wobble, 5, 30) * 4 : 0;
  if (wob) { push(); translate(0, 0); rotate(0); }
  const n = env ? G.inTray().length + (S.envOpen ? 0 : 1) : 0;
  stateLayer('tray', 'tray' + n, ROOM.tray.x - 16, 770, 130, 100, () => paintTray(Math.min(6, n))).blit();
  stateLayer('spike', 'spike' + S.spike, ROOM.spike.cx - 48, 740, 100, 130, () => paintSpike(S.spike)).blit();
  const paper = (S.woke && Object.entries(S.woke).some(([id, v]) => v && G.drawer(id).type === 'R4')) || G.foundAt('typewriter') || S.five === 'reading' ? 1 : 0;
  stateLayer('tw', 'tw' + paper, ROOM.typewriter.x - 24, 690, 230, 190, () => paintTypewriter(paper)).blit();
  if (env) { const d = G.drawer(env); if (d.type === 'P4' || d.type === 'P6') paintKitSmall(d.type, !!S.kitOpen[env]); }
  if (S.desk === 'table') { boilSeed('deskcard'); push(); translate(880, 852); rotate(-.05); paint(rectPts(-40, -5, 80, 8, .3), { wash: '#EFE3C4', tex: 0, ink: PAL.ink, sw: .4 }); pop(); }
  if (wob) pop();
  // the lamp's foot, which wobbles when a card is pulled from under it
  if (G.foundAt('lamp')) { boilSeed('lampcard'); paint(rectPts(ROOM.lamp.cx + 10, 851, 46, 6, .3), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .4 }); }
  pop();
  stateLayer('basket', 'b' + !!G.foundAt('bin'), 1320, 930, 110, 130, () => paintBasket(!!G.foundAt('bin'))).blit();
}
function paintKitSmall(type, open) {
  boilSeed('kit' + type);
  const K = ROOM.kit;
  if (type === 'P6') {
    paint(rectPts(K.x, K.y + 8, K.w, K.h - 8, .5), { wash: '#5D6470', ink: PAL.ink, sw: .6 });
    for (let i = 0; i < 3; i++) paint(ellPts(K.x + 14 + i * 19, K.y + 30, 7, 7, 10), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .4 });
    if (open) paint([[K.x, K.y + 8], [K.x + K.w, K.y + 8], [K.x + K.w - 6, K.y - 22], [K.x + 6, K.y - 22]], { wash: '#6D7480', ink: PAL.ink, sw: .5 });
  } else {
    paint(rectPts(K.x, K.y + 14, K.w, K.h - 14, .5), { wash: '#B99A6A', ink: PAL.ink, sw: .6 });
    for (let i = 0; i < 4; i++) paint(rectPts(K.x + 6 + i * 13, K.y + 4 + (i % 2) * 3, 12, 14, .3), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .3 });
  }
}
function drawFloorCard() {
  boilSeed('floorcard');
  push(); translate(250, 900); rotate(.3);
  paint(rectPts(-34, -10, 68, 18, .5), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .5 });
  pop();
}
// the cabinet in the room: its layer, the envelopes on its drawers, and its leak
function drawCabinetRoom(c) {
  const L = RL.cabs[c.n - 1], S = G.S, n = c.n, G2 = cabGrid(c);
  const lv = S.active === n ? G.leakLevel() : 0;
  L.blit();
  if (n === 5) { if (S.five === 'open' || S.five === 'reading' || S.five === 'typed') { boilSeed('five-open'); paint(rectPts(c.x - 14, c.y + 140, 26, 16, .5), { wash: PAL.iron, ink: PAL.ink, sw: .5 }); } return; }
  for (let i = 0; i < 3; i++) {
    const id = `${n}-${i + 1}`, st = S.drawers[id], cell = G2.cell(1, PUZZLE_ROWS[i]);
    const jolt = G.fx.jolt[n] && G.fx.jolt[n][i] ? G.fx.jolt[n][i] : 0;
    boilSeed('cabenv' + id);
    if (st === 'shut') {
      const ready = G.canTake(id).ok || (S.unlocked[n] && !S.env && !S.hand && G.nextDrawer(n) === id && (!S.active || S.active === n));
      paint(rectPts(cell.x + 8, cell.y + 14 + jolt, cell.w - 16, cell.h - 18, .4), { wash: ready ? PAL.manila : '#9C8E74', tex: 0, ink: PAL.ink, sw: .4 });
      if (ready) inkLine([[cell.x + 12, cell.y + 22 + jolt], [cell.x + cell.w / 2, cell.y + 30 + jolt], [cell.x + cell.w - 12, cell.y + 22 + jolt]], .3, '#7A5B30', 'inkfine', 0);
    } else if (st === 'filed') {
      inkLine([[cell.x + cell.w / 2 - 7, cell.y + 14], [cell.x + cell.w / 2 - 2, cell.y + 19], [cell.x + cell.w / 2 + 8, cell.y + 9]], .6, PAL.red, 'ink', 0);
    } else if (jolt) {
      paint(rectPts(cell.x + 2, cell.y + 2 + jolt, cell.w - 4, cell.h - 4, .4), { wash: PAL.oakLt, ink: PAL.ink, sw: .45 });
    }
  }
  // a cabinet that has just been unlocked stands with its first drawer a hand's width open
  if (S.unlocked[n] && S.drawers[`${n}-1`] === 'shut' && n !== 1) {
    const cell = G2.cell(1, PUZZLE_ROWS[0]);
    boilSeed('ajar' + n);
    paint([[cell.x, cell.y + cell.h], [cell.x + cell.w, cell.y + cell.h], [cell.x + cell.w + 6, cell.y + cell.h + 8], [cell.x - 6, cell.y + cell.h + 8]], { wash: PAL.oakDk, ink: PAL.ink, sw: .4 });
  }
  if (lv) drawLeakOnCabinet(c, lv, 1);
  if (G.fx.frostClear && G.fx.frostClear.n === n) drawLeakOnCabinet(c, 3, 1 - seg(T, G.fx.frostClear.t, G.fx.frostClear.t + 1.2));
}
// each leak's half on its own cabinet, at room scale (k = how much of it is there)
function drawLeakOnCabinet(c, lv, k) {
  if (k <= 0) return;
  const n = c.n;
  if (n === 3) {   // claw marks
    boilSeed('claws');
    const marks = [[.25, .3], [.7, .55], [.4, .78], [.8, .2], [.15, .6], [.6, .35]].slice(0, lv * 2);
    C.globalAlpha = k;
    marks.forEach(([mx, my], i) => {
      for (let j = 0; j < 3; j++) inkLine([[c.x + c.w * mx + j * 6, c.y + c.h * my], [c.x + c.w * mx + j * 6 + 16, c.y + c.h * my + 30]], lv >= 2 ? .9 : .5, lv >= 2 ? '#E8C9A0' : '#3A2418', 'inkfine', .2);
      void i;
    });
    C.globalAlpha = 1;
  }
  if (n === 4) {   // frost
    boilSeed('frost');
    const top = [0, .2, .55, 1][lv];
    paint(rectPts(c.x - 6, c.y - 34, c.w + 12, 40 + c.h * top, 3), { fill: '#DDE9F6', fillOp: 70 * k, bleed: .2, tex: .7, layers: 3, ink: null });
    for (let i = 0; i < 6 * lv; i++) { const fx = c.x + hash(i * 3.3) * c.w, fy = c.y - 20 + hash(i * 5.1) * (40 + c.h * top); inkLine([[fx, fy], [fx + 6, fy - 5], [fx + 10, fy + 2]], .3, `rgba(240,248,255,${.8 * k})`, 'inkfine', .3); }
  }
}
// what glows: mist pooled at cabinet II, frost glints
function drawLeakGlow() {
  const S = G.S;
  if (S.active === 2 || G.fx.mistClear) {
    const lv = S.active === 2 ? G.leakLevel() : 0, c = CABS[1], k = G.fx.mistClear ? 1 - seg(T, G.fx.mistClear, G.fx.mistClear + 1.5) : 1;
    if (lv && k > 0) {
      const top = [0, 90, 170, 250][lv];
      for (let i = 0; i < 9; i++) {
        const mx = c.x - 30 + i * (c.w + 60) / 8 + Math.sin(T * .4 + i) * 10, h = top * (1 - Math.abs(i - 4) / 6) + (i % 4 === 0 ? 40 : 0);
        softBlob(mx, FLOOR_Y - h * .35, 70 + h * .2, 40 + h * .5, '#D8E2EE', .3 * k);
      }
    }
  }
}

// ---------- the window in the room: outside, wolf, mist, writing ----------
function drawWindowRoom() {
  const fx = G.fx, Gw = ROOM.window;
  RL.outside.blit();
  if (fx.reflect > 0) drawReflection(Gw.gx, Gw.gy, Gw.gw, Gw.gh, fx.reflect);
  if (fx.wolf) drawWolf(Gw.gx, Gw.gy, Gw.gw, Gw.gh, 1);
  drawMist(Gw.gx, Gw.gy, Gw.gw, Gw.gh, fx.mistLevel, 1);
  if (fx.writing) drawWriting(Gw.gx, Gw.gy, Gw.gw, Gw.gh, 1);
}
function drawMist(gx, gy, gw, gh, level, s) {
  if (level <= .01) return;
  const panes = panesOf(gx, gy, gw, gh, s);
  boilSeed('mist' + s);
  C.save();
  for (const p of panes) {
    const lv = clamp(level / 3);
    // a band round the frame first, then most of the pane, then all of it
    const inset = lerp(Math.min(p.w, p.h) * .5, 0, ease(lv)) ;
    C.globalAlpha = .55 + .3 * lv;
    const grd = C.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, Math.max(1, inset * .6), p.x + p.w / 2, p.y + p.h / 2, Math.max(p.w, p.h) * .75);
    grd.addColorStop(0, 'rgba(200,210,226,0)'); grd.addColorStop(.35, `rgba(200,210,226,${.3 * lv})`); grd.addColorStop(1, 'rgba(214,222,236,.85)');
    C.fillStyle = grd; C.fillRect(p.x, p.y, p.w, p.h);
    if (level >= 2.6) { C.globalAlpha = .55 * clamp(level - 2.6, 0, .4) / .4; C.fillStyle = '#CDD6E4'; C.fillRect(p.x, p.y, p.w, p.h); }
    // drops running down
    C.globalAlpha = .5 * lv; C.strokeStyle = 'rgba(120,135,160,.6)'; C.lineWidth = 1 * s;
    for (let i = 0; i < 4; i++) { const dx = p.x + hash(p.x + i * 7) * p.w, dy = p.y + hash(p.y + i * 3) * p.h * .6; C.beginPath(); C.moveTo(dx, dy); C.lineTo(dx + jit(1), dy + 10 * s + hash(i) * 20 * s); C.stroke(); }
  }
  C.restore();
}
function panesOf(gx, gy, gw, gh) {
  const meet = gy + gh * .49, out = [];
  for (const sTop of [true, false]) {
    const y0 = sTop ? gy : meet + 9 * gh / 456, y1 = sTop ? meet - 1 : gy + gh;
    const mid = (y0 + y1) / 2;
    for (const [a, b] of [[y0, mid - 3 * gh / 456], [mid + 3 * gh / 456, y1]]) for (const c of [0, 1]) out.push({ x: gx + c * (gw / 2 + 3 * gw / 264), y: a, w: gw / 2 - 3 * gw / 264, h: b - a });
  }
  return out;
}
// the name in the mist, written from outside (mirrored), or the figure after it
function drawWriting(gx, gy, gw, gh, s, readable = 0) {
  const w = G.fx.writing; if (!w) return;
  const age = T - w.t, k = clamp(age / (w.slow ? 3.2 : 1.2)), fade = w.fadeT ? 1 - seg(T, w.fadeT, w.fadeT + 1.4) : 1;
  if (fade <= 0) return;
  boilSeed('writing');
  C.save();
  C.beginPath(); C.rect(gx, gy, gw, gh * .48); C.clip();
  C.translate(gx + gw / 2, gy + gh * (w.digit ? .2 : .24)); C.scale(lerp(-1, 1, readable), 1);
  const size = w.digit ? gh * .3 : Math.min(gw * .8 / (Math.max(4, w.text.length) * .5), gh * .17);
  C.font = `600 ${size}px ${FONT.hand}`; C.textAlign = 'center'; C.textBaseline = 'middle';
  // revealed as if written: a clip that grows from left (seen from outside: right)
  const tw = C.measureText(w.text).width;
  C.beginPath(); C.rect(-tw / 2 - 10, -size, (tw + 20) * k, size * 2); C.clip();
  C.globalAlpha = .55 * fade; C.strokeStyle = '#1E2846'; C.lineWidth = size * .09; C.lineJoin = 'round'; C.strokeText(w.text, 0, 0);
  C.globalAlpha = .9 * fade; C.fillStyle = '#1E2846'; C.fillText(w.text, 0, 0);
  C.globalAlpha = .4 * fade; C.strokeStyle = '#EEF2FA'; C.lineWidth = Math.max(1, size * .015); C.strokeText(w.text, 0, 0);
  // drips from the letters
  C.globalAlpha = .6 * fade; C.strokeStyle = 'rgba(40,50,80,.7)'; C.lineWidth = Math.max(1, size * .03);
  for (let i = 0; i < 5; i++) { const dx = -tw / 2 + hash(i * 9 + w.text.length) * tw, l = (.15 + hash(i) * .35) * size * k; C.beginPath(); C.moveTo(dx, size * .3); C.lineTo(dx, size * .3 + l); C.stroke(); }
  C.restore();
}
// the reflection of the room with the door standing open (cabinet II, filed)
function drawReflection(gx, gy, gw, gh, k) {
  C.save(); C.globalAlpha = k * .85; C.fillStyle = '#20243C'; C.fillRect(gx, gy, gw, gh);
  C.translate(gx + gw, gy); C.scale(-gw / W, gh / H);
  C.fillStyle = '#E8C88A'; C.globalAlpha = k * .8; C.fillRect(ROOM.door.x, ROOM.door.y, ROOM.door.w, ROOM.door.h);
  C.fillStyle = '#16131E'; C.fillRect(ROOM.door.x + ROOM.door.w * .7, ROOM.door.y + 120, 40, ROOM.door.h - 120);
  C.globalAlpha = k * .55; C.fillStyle = '#E8B070'; C.beginPath(); C.ellipse(ROOM.lamp.cx, 800 - TABLE_RAISE, 160, 70, 0, 0, TAU); C.fill();
  C.globalAlpha = k * .5; C.fillStyle = '#5A4632'; for (const c of CABS) C.fillRect(c.x, c.y, c.w, c.h);
  C.restore();
}
// the creature at the window: Muybridge's walking mastiff, as a silhouette going along the ledge
function drawWolf(gx, gy, gw, gh, s) {
  const w = G.fx.wolf, age = T - w.t, dur = w.dur;
  if (age > dur) { G.fx.wolf = null; G.fx.wolfShade = false; return; }
  let k = age / dur;
  // it stops at the glass on the way and breathes on it
  let x;
  if (w.stop) { const a = .4, b = .4 + w.stop / dur; x = k < a ? k / a * .5 : k < b ? .5 : .5 + (k - b) / (1 - b) * .5; }
  else x = k;
  const px = gx - gw * .3 + x * gw * 1.6, py = gy + gh - 26 * s / 1, sc = s * .9;
  const walking = !(w.stop && k > .4 && k < .4 + w.stop / dur);
  G.fx.wolfShade = px > gx && px < gx + gw;
  C.save(); C.beginPath(); C.rect(gx, gy, gw, gh); C.clip();
  boilSeed('wolf');
  push(); translate(px, py); scale(sc * (w.dir || 1), sc);
  const ph = walking ? age * 3.2 : 0;
  // body
  paint([[-60, -40], [-30, -52], [20, -54], [48, -50], [62, -62], [78, -66], [92, -58], [96, -48], [82, -44], [70, -40], [56, -26], [-40, -22], [-62, -30]], { wash: '#0D0F1A', tex: 0, pool: 0, ink: null, curv: .3 });
  // ears and tail
  paint([[74, -64], [78, -78], [84, -64]], { wash: '#0D0F1A', tex: 0, pool: 0, ink: null });
  inkLine([[-58, -36], [-80, -30], [-92, -14]], 3, '#0D0F1A', 'ink', .5);
  // legs: four, walking
  for (let i = 0; i < 4; i++) {
    const lx = [-46, -30, 34, 48][i], sw = Math.sin(ph * TAU + [0, .5, .5, 0][i] * TAU) * 10;
    inkLine([[lx, -26], [lx + sw * .5, -12], [lx + sw, 0]], 2.6, '#0D0F1A', 'ink', .3);
  }
  // the eye catches the moon
  paint(ellPts(84, -56, 2.2, 1.6, 8), { wash: '#E9D27A', tex: 0, pool: 0, ink: null });
  pop();
  // breath on the glass
  if (!walking) { const bk = Math.sin(clamp((age - .4 * dur) / w.stop) * Math.PI); softBlob(px + 100 * sc * (w.dir || 1), py - 52 * sc, 40 * sc, 26 * sc, '#C9D2E2', .7 * bk); }
  C.restore();
}
function drawWolfShadowFloor() {
  if (!G.fx.wolfShade) return;
  softBlob(1260, 1000, 140, 40, '#0A0812', .25);
}

// ---------- the table, from above ----------
const TABLE = {
  slots: [[690, 112], [1210, 112], [690, 448], [1210, 448]], cw: 500,
  bay: [56, 600, 600, 373], tray: [690, 820, 760, 260], kit: [56, 230, 600, 340], spike: [560, 130], lamp: [190, 110],
};
V.table = {
  enter() { G.clawd.mood.setRest(G.restMood()); },
  draw() {
    const S = G.S;
    drawFelt();
    const id = S.env, d = id && G.drawer(id);
    // the lamp and the spike
    drawLampTop(); drawSpikeTop();
    // the typewriter's corner
    drawTypewriterCorner();
    // P4 box of halves, P6 strongbox
    if (d && d.type === 'P4') drawHalvesBox(d);
    if (d && d.type === 'P6') drawStrongbox(d);
    // the four places
    TABLE.slots.forEach(([x, y], i) => {
      const key = S.table[i];
      boilSeed('slot' + i);
      if (!key) {
        C.save(); C.globalAlpha = .18; C.setLineDash([10, 12]); C.strokeStyle = '#E9E2C8'; C.lineWidth = 2; C.strokeRect(x, y, TABLE.cw, TABLE.cw * .6); C.restore();
        return;
      }
      const card = G.cardView(key);
      drawCard(card, x, y, TABLE.cw, { rot: (hash(i + key.length) - .5) * .03 });
      UI.hit({ r: [x, y, TABLE.cw, TABLE.cw * .6], tip: 'Lezen', onClick: () => clickTableCard(key) });
    });
    if (S.desk === 'table') {
      drawCard(G.cardView('desk'), 1712, 420, 196, { rot: .09 });
      UI.hit({ r: [1712, 420, 196, 118], tip: 'Een kaart die er niet lag', onClick: () => { if (G.S.hand) return G.say('De hand is vol.'); G.read(['desk'], 0, 'desk'); } });
    }
    // the envelope in its bay
    if (id) drawEnvelopeBay(id);
    else {
      const [bx, by] = TABLE.bay;
      C.save(); C.globalAlpha = .22; C.setLineDash([12, 12]); C.strokeStyle = '#E9E2C8'; C.lineWidth = 2; C.strokeRect(bx, by + 40, 600, 330); C.restore();
      handText(S.hand && S.hand.kind === 'env' ? 'De envelop is in je hand.' : 'Haal een envelop uit een kast.', bx + 300, by + 214, 34, 'rgba(233,226,200,.55)', { font: FONT.hand, align: 'center', j: .3 });
    }
    // the tray, cards standing in it
    if (id && S.envOpen) drawTray();
    // pointer: a card in the hand can go back
    if (S.hand && S.hand.kind === 'card' && id && S.hand.key.startsWith(id + '/')) {
      const [tx, ty, tw, th] = TABLE.tray;
      const hk = S.hand.key, hd = G.card(hk), half = hd.d.type === 'P4' && hd.c.role !== 'top';
      UI.hit({ r: [tx, ty - 40, tw, th + 40], tip: half ? 'In de doos met helften' : 'Terug in de envelop', onClick: () => G.handToTray() });
      if (half) UI.hit({ r: [TABLE.kit[0] + 40, TABLE.kit[1] + 60, 420, 220], tip: 'In de doos met helften', onClick: () => { G.handToTray(); V.halves.open(); } });
    }
    drawPeek();
    backButton(() => openView('room'));
  },
};
function drawFelt() {
  stateLayer('felt', 'felt', 0, 0, W, H, () => {
    boilSeed('felt');
    paint(rectPts(-20, -20, W + 40, H + 40), { wash: PAL.felt, ink: null, texK: 1.2 });
    for (let i = 0; i < 30; i++) paint(ellPts(hash(i * 3.1) * W, hash(i * 7.3) * H, 200 + hash(i) * 260, 120 + hash(i * 2) * 160, 16), { fill: i % 2 ? PAL.feltDk : '#4C7A5A', fillOp: 40, bleed: .3, tex: .8, layers: 3, ink: null });
    // the table's edge at the bottom
    paint(rectPts(-20, H - 26, W + 40, 50, 1), { wash: PAL.oak, ink: PAL.ink, sw: .8 });
    // old ink stains and a ring from a cup
    paint(ellPts(1540, 120, 46, 40, 20), { fill: '#2A3A30', fillOp: 70, bleed: .2, layers: 3, ink: null });
    C.save(); C.globalAlpha = .1; C.strokeStyle = '#2A2018'; C.lineWidth = 4; C.beginPath(); C.ellipse(1600, 860, 44, 40, 0, .4, TAU - 1.2); C.stroke(); C.restore();
  }).blit();
  // the lamp's light on the felt, and the dark beyond it
  const lamp = clamp(G.fx.flick) * (1 - G.fx.lampOff);
  C.save(); C.globalCompositeOperation = 'multiply';
  const g = C.createRadialGradient(240, 240, 60, 300, 340, 1750);
  g.addColorStop(0, mixCol('#FFF4DA', '#8090B0', 1 - lamp)); g.addColorStop(.35, mixCol('#F0D6A6', '#6A7496', 1 - lamp)); g.addColorStop(.7, mixCol('#A08C70', '#4A5070', 1 - lamp)); g.addColorStop(1, '#34304A');
  C.fillStyle = g; C.fillRect(0, 0, W, H); C.restore();
}
function drawLampTop() {
  const [x, y] = TABLE.lamp, lamp = clamp(G.fx.flick) * (1 - G.fx.lampOff);
  // the pool of light it throws on the felt, under and in front of the shade
  glow(x + 40, y + 230, 620, '#FFD58A', .42 * lamp);
  boilSeed('lamptop');
  C.save(); C.fillStyle = 'rgba(10,6,14,.3)'; C.filter = 'blur(10px)'; C.beginPath(); C.ellipse(x + 30, y + 132, 120, 50, 0, 0, TAU); C.fill(); C.restore();
  // a card under the foot, a corner sticking out
  if (G.foundAt('lamp')) { push(); translate(x + 96, y + 150); rotate(.35); paint(rectPts(-10, -24, 120, 60, .6), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .6 }); inkLine([[0, -10], [100, -10]], .4, PAL.red, 'inkfine', 0); pop(); }
  // the round brass foot, its stem, the long green glass shade with brass ends, the pull chain
  paint(ellPts(x + 20, y + 124, 98, 48, 24), { wash: PAL.brass, ink: PAL.ink, sw: .9 });
  paint(ellPts(x + 14, y + 118, 64, 28, 18), { fill: '#F4DC98', fillOp: 130, bleed: .1, layers: 2, ink: null });
  paint(rectPts(x + 8, y + 40, 18, 82, .5), { wash: PAL.brassDk, ink: PAL.ink, sw: .7 });
  paint(rrPts(x - 158, y - 50, 330, 104, 46, 1), { wash: lamp > .2 ? '#3E9B6E' : '#2C6A4E', ink: PAL.ink, sw: 1.1 });
  paint(rrPts(x - 136, y - 38, 286, 30, 15, 1), { fill: '#C8F4DA', fillOp: 60 + 110 * lamp, bleed: .1, layers: 3, ink: null });
  paint(rrPts(x - 140, y + 14, 294, 26, 12, 1), { fill: '#1E4A36', fillOp: 120, bleed: .08, layers: 2, ink: null });
  for (const ex of [x - 160, x + 172]) paint(ellPts(ex, y + 2, 15, 50, 16), { wash: PAL.brass, ink: PAL.ink, sw: .7 });
  inkLine([[x + 118, y + 50], [x + 128, y + 96], [x + 124, y + 140]], .6, PAL.brassDk, 'inkfine', .4);
  paint(ellPts(x + 124, y + 146, 6, 8, 10), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .4 });
  if (lamp > .05) glow(x, y + 60, 200, '#FFE7B0', .35 * lamp);
  UI.hit({ r: [x - 170, y - 56, 360, 240], tip: 'De lamp', onClick: () => clickFound('lamp', 'Een groene bankierslamp.') });
}
function drawSpikeTop() {
  const [x, y] = TABLE.spike, n = G.S.spike;
  boilSeed('spiketop');
  paint(ellPts(x, y, 62, 62, 22), { wash: PAL.oakDk, ink: PAL.ink, sw: .8 });
  // the note, then the stamped envelopes, each turned a little
  push(); translate(x, y); rotate(-.2);
  paint(rectPts(-110, -66, 220, 132, 1), { wash: '#F2EAD3', ink: PAL.ink, sw: .6 });
  handText('Twaalf enveloppen…', -90, -20, 26, '#3A3248', { font: FONT.hand, weight: 600, j: .2 });
  pop();
  for (let i = 0; i < n; i++) {
    push(); translate(x + (hash(i * 5) - .5) * 14, y + (hash(i * 9) - .5) * 14); rotate((hash(i * 3.7) - .5) * 1.4);
    paint(rectPts(-120, -75, 240, 150, 1), { wash: i % 2 ? PAL.manila : '#D3AE6E', ink: PAL.ink, sw: .6 });
    C.save(); C.globalAlpha = .55; C.strokeStyle = '#2F4E8C'; C.lineWidth = 3; C.strokeRect(-80, -18, 160, 36); C.font = `22px ${FONT.fellSC}`; C.fillStyle = '#2F4E8C'; C.textAlign = 'center'; C.fillText('INGEVOEGD', 0, 8); C.restore();
    pop();
  }
  paint(ellPts(x, y, 6, 6, 10), { wash: '#C9CAD6', tex: 0, ink: PAL.ink, sw: .5 });
  UI.hit({ c: [x, y, 120], tip: n ? `${n} van de twaalf` : 'Het briefje van J.J.V.', onClick: () => G.read(['note'], 0, 'note') });
}
function drawTypewriterCorner() {
  boilSeed('twcorner');
  paint([[1760, -20], [W + 20, -20], [W + 20, 320], [1800, 300]], { wash: '#26242B', ink: PAL.ink, sw: 1 });
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) paint(ellPts(1830 + k * 28 + r * 6, 60 + r * 52, 11, 9, 10), { wash: '#E8E1D0', tex: 0, pool: 0, ink: PAL.ink, sw: .4 });
  UI.hit({ poly: [[1760, 0], [W, 0], [W, 320], [1800, 300]], tip: 'De schrijfmachine', onClick: () => openView('typewriter', null, [1850, 150]) });
}
function drawEnvelopeBay(id) {
  const [bx, by, bw, bh] = TABLE.bay, env = G.envelopeView(id), S = G.S;
  const sealed = env.sealed;
  boilSeed('bay');
  C.save(); C.fillStyle = 'rgba(10,6,14,.35)'; C.filter = 'blur(8px)'; C.fillRect(bx + 8, by + 12, bw, bh); C.restore();
  C.drawImage(envelopeFace(env), bx, by, bw, bh);
  if (sealed) {
    UI.hit({ r: [bx, by, bw, bh], tip: 'Meenemen naar de kast', onClick: () => G.takeSealed() });
    UI.button('Meenemen', bx + bw - 120, by + bh - 40, { size: 30, onClick: () => G.takeSealed() });
  } else if (!S.envOpen) UI.hit({ r: [bx, by, bw, bh], tip: 'Openmaken', onClick: () => G.openEnvelope() });
  else UI.hit({ r: [bx, by, bw, bh], tip: null, cursor: 'default', onClick: () => {} });
  if (!sealed && G.S.drawers[id] === 'open') {
    const used = S.hints[id] || 0, d = G.drawer(id);
    if (used < (d.hints || []).length) UI.button(`Vraag J.J.V. (+${HINT_COST[used]} min)`, bx + 200, by - 34, { size: 26, onClick: () => G.askHint() });
  }
}
function drawTray() {
  const [tx, ty, tw, th] = TABLE.tray, keys = G.inTray();
  boilSeed('tray');
  paint(rectPts(tx, ty + 70, tw, th, 1), { wash: PAL.oakLt, ink: PAL.ink, sw: .9 });
  const n = keys.length, step = Math.min(150, (tw - 160) / Math.max(1, n - 1));
  let hov = -1;
  keys.forEach((k, i) => { const x = tx + 20 + i * step; if (UI.mouse[0] > x && UI.mouse[0] < x + Math.min(step, 150) && UI.mouse[1] > ty - 20) hov = i; });
  if (hov < 0) keys.forEach((k, i) => { const x = tx + 20 + i * step; if (UI.mouse[0] > x && UI.mouse[0] < x + 150 && UI.mouse[1] > ty - 20) hov = i; });
  keys.forEach((k, i) => {
    const card = G.cardView(k), lab = tabLabel(card), x = tx + 20 + i * step, lift = i === hov ? -30 : 0, y = ty + lift;
    boilSeed('trayc' + k);
    paint(rectPts(x, y + 22, 220, 160, .6), { wash: card.grey ? '#D9D5C9' : PAL.card, ink: PAL.ink, sw: .5, texK: .4 });
    const tabx = x + 12 + (i % 3) * 50;
    paint(rectPts(tabx, y, 120, 30, .5), { wash: card.grey ? '#D9D5C9' : PAL.card, ink: PAL.ink, sw: .5, texK: .4 });
    handText(lab.place.slice(0, 16), x + 12, y + 56, 20, '#26222B', { font: FONT.type, j: 0 });
    if (lab.year) handText(String(lab.year), x + 12, y + 80, 18, '#4A4450', { font: FONT.type, j: 0 });
    if (lab.code) handText(lab.code, x + 12, y + 104, 20, PAL.red, { font: FONT.hand, weight: 600, j: 0 });
    if (G.S.read.includes(k)) inkLine([[x + 196, y + 40], [x + 202, y + 46], [x + 212, y + 32]], .5, '#4A4250', 'inkfine', 0);
    UI.hit({ r: [x, y, Math.min(step, 220), 190], tip: lab.place, onClick: () => G.read(keys, i, 'tray') });
  });
  paint(rectPts(tx - 10, ty + 120, tw + 20, th - 50, 1), { wash: PAL.oak, ink: PAL.ink, sw: .9 });
  paint(rectPts(tx + tw / 2 - 40, ty + 150, 80, 30, .4), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .5 });
  if (!keys.length) handText('leeg', tx + tw / 2, ty + 230, 30, 'rgba(255,240,210,.4)', { font: FONT.hand, align: 'center', j: 0 });
}
function clickTableCard(key) {
  const S = G.S;
  if (S.hand && S.hand.kind === 'card') {
    // swap: the card in the hand takes this card's place
    const k = S.hand.key; if (!k.includes('/') || k.split('/')[0] !== S.env) return G.read([key], 0, 'table');
    const i = S.table.indexOf(key); S.table[i] = k; G.setLoc(k, 'table'); S.table[i] = k; G.S.loc[key] = 'hand'; S.hand = { kind: 'card', key }; SND.card(); G.save(); return;
  }
  const d = G.drawer(key.split('/')[0]);
  if (d && d.type === 'P4' && G.card(key).c.role === 'top') { V.halves.open(); return; }
  G.read(S.table.slice(), S.table.indexOf(key), 'table');
}

// ---------- the night over a close-up: lamplight from one side, dark at the edges ----------
function nightGrade(cx, cy, warm = 1, o = {}) {
  const lamp = clamp(G.fx.flick) * (1 - G.fx.lampOff), m = G.fx.morning || 0;
  C.save(); C.globalCompositeOperation = 'multiply';
  const g = C.createRadialGradient(cx, cy, 80, cx, cy, o.r || 1500);
  const inner = mixCol(mixCol('#8E9AC0', '#FFEBCB', warm * lamp), '#E8E4DA', m), mid = mixCol(mixCol('#5A6288', '#C9A57A', warm * lamp * .8), '#CFCAC0', m);
  g.addColorStop(0, inner); g.addColorStop(.5, mid); g.addColorStop(1, mixCol('#2E2C48', '#B8B3A8', m));
  C.fillStyle = g; C.fillRect(0, 0, W, H); C.restore();
}

// ---------- Clawd peeking in at the corner of a close-up ----------
function drawPeek(o = {}) {
  const m = G.clawd.mood.pose(), [mx, my] = UI.mouse, x = o.x ?? 1800, y = o.y ?? 1160, u = o.u ?? 34;
  const lookX = clamp((mx - x) / 700, -1, 1), lookY = clamp((my - (y - 6 * u)) / 500, -1, 1);
  assistant(x, y, u, { ...m, view: 'front', lookX: m.eyes === 'scared' ? m.lookX : lookX, lookY: m.eyes === 'scared' ? 0 : lookY, noShadow: true, boilKey: 'peek', frame: 'peek', aL: (m.aL || 0) + .4, aR: (m.aR || 0) + .4 });
  if (G.S.hand) drawHand(G, x > W / 2 ? x - 360 : x + 360, H - 150);
}
function backButton(fn) { UI.button('← Terug', 96, 46, { size: 28, onClick: fn, key: 'Esc', rot: -.02 }); V.back = fn; }

// ---------- the reader: one card lifted to be read ----------
const Reader = {
  draw() {
    const R = G.reader; if (!R) return;
    const key = R.list[R.i], card = G.cardView(key);
    C.save(); C.fillStyle = 'rgba(14,10,18,.72)'; C.fillRect(0, 0, W, H); C.restore();
    UI.hit({ r: [0, 0, W, H], tip: null, cursor: 'default', onClick: () => {} });
    const age = T - R.t0, k = backOut(clamp(age / .35)), fk = clamp((T - R.flipT) / .36);
    const sx = fk < 1 ? Math.abs(Math.cos(fk * Math.PI)) : 1, back = fk < .5 ? !R.back : R.back;
    const w = 1120, h = w * cardAspect(card), x = W / 2 - w / 2, y = 70 + (672 - h) / 2 + (1 - k) * 80;
    C.globalAlpha = clamp(age / .2);
    drawCard(card, x, y, w, { back, sx, rot: -.008 });
    C.globalAlpha = 1;
    // the stamp opens the story's own page
    const url = card.r && card.r.url;
    if (url && !back && cardAspect(card) > .5 && fk >= 1) window.STORYLINK = { url, r: [x + w - 290, y + h - 150, 240, 120] };
    if (window.STORYLINK) UI.hit({ r: window.STORYLINK.r, tip: 'Naar de Verhalenbank', onClick: () => {} });
    // what can be done with it
    const S = G.S, from = R.from, b = [];
    if (R.list.length > 1) { UI.button('←', x - 70, y + h / 2, { size: 40, onClick: () => this.step(-1), id: 'prev' }); UI.button('→', x + w + 70, y + h / 2, { size: 40, onClick: () => this.step(1), id: 'next' }); }
    if (card.kind !== 'note') b.push(['Omdraaien', () => this.flip(), 'F']);
    const here = key.includes('/') && !key.startsWith('arch:') ? G.where(key) : null, open = here && S.drawers[key.split('/')[0]] === 'open';
    if (from === 'tray' && here === 'tray' && open) { b.push(['Op tafel', () => { G.toTable(key); this.after(); }, 'Enter']); b.push(['Meenemen', () => { if (G.take(key)) G.closeReader(); }]); }
    if (from === 'table' && here === 'table') { b.push(['In de la', () => { G.toTray(key); this.after(); }]); b.push(['Meenemen', () => { if (G.take(key)) G.closeReader(); }]); }
    if (from === 'desk') b.push(['Meenemen', () => { if (S.hand) return G.say('De hand is vol.'); S.desk = 'hand'; S.hand = { kind: 'card', key: 'desk' }; G.closeReader(); G.save(); }]);
    if (from === 'hand' && G.view === 'table' && S.env && key.startsWith(S.env + '/')) b.push(['In de envelop', () => { G.handToTray(); G.closeReader(); }]);
    if (from === 'five') b.push(['Naar de schrijfmachine', () => { G.closeReader(); openView('typewriter', null, [W / 2, H / 2]); }]);
    b.push(['Terug', () => G.closeReader(), 'Esc']);
    C.font = `600 32px ${FONT.hand}`;
    const widths = b.map(([l]) => C.measureText(l).width + 70), gap = 44, total = widths.reduce((s, w2) => s + w2 + gap, -gap);
    let bx = W / 2 - total / 2;
    b.forEach(([label, fn, kb], i) => { const bw = widths[i]; UI.button(label, bx + bw / 2, 834, { size: 32, onClick: fn, w: bw }); if (kb) handText(kb, bx + bw / 2, 892, 18, 'rgba(240,230,210,.45)', { font: FONT.type, align: 'center', j: 0 }); bx += bw + gap; });
    if (R.list.length > 1) handText(`${R.i + 1} / ${R.list.length}`, W / 2, y - 24, 26, 'rgba(240,230,210,.7)', { font: FONT.hand, align: 'center', j: 0 });
    if (back && !(card.r && card.r.original) && card.kind !== 'note') handText('(achterkant)', x + 40, y + 50, 24, '#8A7F92', { font: FONT.hand, j: 0 });
  },
  step(d) { const R = G.reader; R.i = (R.i + d + R.list.length) % R.list.length; R.back = false; R.flipT = -9; R.t0 = T - .25; G.markRead(R.list[R.i]); SND.card(); },
  flip() { const R = G.reader; R.back = !R.back; R.flipT = T; SND.flip(); },
  after() { const R = G.reader; const key = R.list[R.i]; R.list = R.list.filter(k => k !== key); if (!R.list.length || R.from === 'table') { G.reader = null; G.clawd.mood.setRest(G.restMood()); G.afterPutDown(key); return; } R.i = Math.min(R.i, R.list.length - 1); R.t0 = T - .2; G.afterPutDown(key); },
  key(e) {
    const R = G.reader; if (!R) return false;
    if (e.key === 'Escape') { G.closeReader(); return true; }
    if (e.key === 'f' || e.key === 'F') { this.flip(); return true; }
    if (e.key === 'ArrowLeft') { if (R.list.length > 1) this.step(-1); return true; }
    if (e.key === 'ArrowRight') { if (R.list.length > 1) this.step(1); return true; }
    if (e.key === 'Enter' && R.from === 'tray' && G.where(R.list[R.i]) === 'tray') { G.toTable(R.list[R.i]); this.after(); return true; }
    return false;
  },
};

// ---------- a cabinet up close ----------
const CABV = { x: 560, y: 150, w: 800, h: 880 };
function cabCell(col, row) { const cw = (CABV.w - 60) / 3, rh = (CABV.h - 60) / 7; return { x: CABV.x + 30 + col * cw, y: CABV.y + 30 + row * rh, w: cw, h: rh }; }
V.cabinet = {
  enter(n) { this.n = n; this.open = null; this.slide = 0; G.clawd.mood.setRest(G.restMood()); },
  draw() {
    const n = this.n, S = G.S;
    stateLayer('cabwall', 'cabwall', 0, 0, W, H, paintCabWall).blit();
    stateLayer('cabbig', 'cab' + n + JSON.stringify(S.label || {}), 480, 40, 960, 1040, () => paintCabinetBig(n)).blit();
    const lv = S.active === n ? G.leakLevel() : 0;
    // envelopes on tonight's drawers
    for (let i = 0; i < 3; i++) {
      const id = `${n}-${i + 1}`, st = S.drawers[id], cell = cabCell(1, PUZZLE_ROWS[i]);
      const jolt = (G.fx.jolt[n] && G.fx.jolt[n][i]) || 0;
      if (jolt) { boilSeed('jolt' + id); paint(rectPts(cell.x + 4, cell.y + 4 + jolt * 2.4, cell.w - 8, cell.h - 8, .6), { wash: PAL.oakLt, ink: PAL.ink, sw: .6 }); }
      if (st === 'shut') {
        const can = G.canTake(id), ready = can.ok;
        const env = G.envelopeView(id);
        const ew = cell.w * .52, eh = ew * EH / EW, ex = cell.x + (cell.w - ew) / 2, ey = cell.y + 46 + jolt * 2.4;
        C.save(); C.translate(ex + ew / 2, ey); C.rotate((hash(i + n * 3) - .5) * .06); if (!ready) C.filter = 'grayscale(.85) brightness(.7)';
        C.fillStyle = 'rgba(10,6,14,.3)'; C.fillRect(-ew / 2 + 4, 6, ew, eh);
        C.drawImage(envelopeFace(env), -ew / 2, 0, ew, eh);
        C.filter = 'none'; boilSeed('clip' + id);
        paint(rrPts(-10, -14, 20, 34, 8), { ink: '#9A9CA6', sw: 1.1 });
        C.restore();
        if (ready) { C.save(); C.globalAlpha = .25 + .15 * Math.sin(T * 3); C.strokeStyle = '#FFE6A8'; C.lineWidth = 4; C.strokeRect(ex - 6, ey - 6, ew + 12, eh + 12); C.restore(); }
        UI.hit({ r: [cell.x, cell.y, cell.w, cell.h], tip: ready ? `Envelop van la ${id} pakken` : `La ${id}`, onClick: () => clickCabinetEnvelope(id) });
      } else if (st === 'filed') {
        UI.hit({ r: [cell.x, cell.y, cell.w, cell.h], tip: `La ${id}: ingevoegd`, onClick: () => { if (S.hand && S.hand.kind === 'card') G.offerDrawer(id); else G.say(G.F.reactions.reopen_filed); } });
      } else {
        // its envelope is out: with it in the hand, this is where it goes
        const want = S.hand && S.hand.kind === 'env' && S.hand.id === id;
        if (want) { C.save(); C.globalAlpha = .5 + .3 * Math.sin(T * 5); C.strokeStyle = '#FFE6A8'; C.lineWidth = 6; C.setLineDash([14, 10]); C.strokeRect(cell.x + 6, cell.y + 6, cell.w - 12, cell.h - 12); C.restore(); }
        UI.hit({ r: [cell.x, cell.y, cell.w, cell.h], tip: want ? 'Invoegen' : `La ${id}`, onClick: () => clickDrawerSlot(id) });
      }
    }
    // the other drawers hold the archive
    for (let row = 0; row < 7; row++) for (let col = 0; col < 3; col++) {
      if (col === 1 && PUZZLE_ROWS.includes(row)) continue;
      const cell = cabCell(col, row);
      UI.hit({ r: [cell.x, cell.y, cell.w, cell.h], tip: 'Het archief', onClick: () => clickArchiveDrawer(n, row * 3 + col) });
    }
    nightGrade(700, 1000, 1);
    if (lv) drawLeakBig(n, lv, 1);
    if (G.fx.clearing && G.fx.clearing.n === n) drawLeakBig(n, 3, 1 - seg(T, G.fx.clearing.t, G.fx.clearing.t + 1.4));
    // a card in the hand can be given to the whole cabinet
    if (S.hand && S.hand.kind === 'card') {
      C.save(); C.globalAlpha = .35 + .2 * Math.sin(T * 4); C.strokeStyle = '#FFE6A8'; C.lineWidth = 5; C.setLineDash([16, 12]); C.strokeRect(CABV.x - 14, CABV.y - 90, CABV.w + 28, CABV.h + 100); C.restore();
      UI.button('In deze kast', CABV.x + CABV.w / 2, CABV.y - 116, { size: 30, onClick: () => G.offerCabinet(n) });
    }
    if (V.drawerOpen) V.drawerOpen.draw();
    else if (G.events.some(e => e.kind === 'trailShow')) drawTrailShow();
    drawPeek({ x: 230, u: 30 });
    backButton(() => { V.drawerOpen = null; openView('room'); });
  },
};
function paintCabWall() {
  boilSeed('cabwall');
  paint(rectPts(-20, -20, W + 40, H + 40), { wash: PAL.wall, ink: null });
  for (let i = 0; i < 18; i++) paint(ellPts(hash(i * 3.1) * W, hash(i * 7.7) * H * .7, 120 + hash(i) * 200, 100, 18), { fill: PAL.wallDk, fillOp: 40, bleed: .25, layers: 3, ink: null });
  paint(rectPts(-20, 700, W + 40, H), { wash: PAL.wains, ink: null });
  paint(rectPts(-20, 690, W + 40, 18, .5), { wash: PAL.oakLt, ink: PAL.ink, sw: .6 });
  for (const x of [80, 1500]) paint(rectPts(x, 740, 300, 300, 1.4), { fill: PAL.oakDk, fillOp: 60, bleed: .05, layers: 3, ink: PAL.ink, sw: .5 });
  // the neighbours, cut off at the edges
  for (const x of [130, 1450]) { paint(rectPts(x, 150, 340, 950, 1), { wash: PAL.oak, ink: PAL.ink, sw: .9 }); for (let r = 0; r < 7; r++) paint(rectPts(x + 20 + (x > 900 ? 0 : 100), 180 + r * 120, 220, 110, .8), { wash: PAL.oakLt, ink: PAL.ink, sw: .6 }); }
  // dark at the edges
  C.save(); const g = C.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,14,30,.75)'); C.fillStyle = g; C.fillRect(0, 0, W, H); C.restore();
}
function paintCabinetBig(n) {
  const X = CABV, devil = n === 5;
  boilSeed('cabbig' + n);
  const wood = PAL.oak, woodLt = PAL.oakLt;
  paint(rectPts(X.x - 30, X.y - 100, X.w + 60, 76, 1), { wash: woodLt, ink: PAL.ink, sw: 1.1 });
  paint(rectPts(X.x - 16, X.y - 124, X.w + 32, 28, .8), { wash: wood, ink: PAL.ink, sw: .8 });
  paint(rectPts(X.x + 120, X.y - 88, X.w - 240, 52, .6), { wash: '#EDE3C8', ink: PAL.ink, sw: .6 });
  handText(`${ROMAN[n]} · ${CAB_LABEL[n].toUpperCase()}`, X.x + X.w / 2, X.y - 49, 40, PAL.ink, { font: FONT.fellSC, align: 'center', j: 0 });
  paint(rectPts(X.x, X.y - 24, X.w, X.h + 24, 1.5), { wash: wood, ink: PAL.ink, sw: 1.2 });
  const types = (Object.values(CABINET_TYPES).find(c => c.id === n) || { types: [] }).types;
  for (let row = 0; row < 7; row++) for (let col = 0; col < 3; col++) {
    const d = cabCell(col, row), k = hash(n * 31 + row * 7 + col), puzzle = col === 1 && PUZZLE_ROWS.includes(row);
    paint(rectPts(d.x + 4, d.y + 4, d.w - 8, d.h - 8, .8), { wash: mixCol(woodLt, wood, .3 + k * .4), ink: PAL.ink, sw: .7 });
    // brass label holder and pull
    paint(rectPts(d.x + d.w / 2 - 64, d.y + 14, 128, 34, .4), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .5 });
    paint(rectPts(d.x + d.w / 2 - 58, d.y + 18, 116, 26, .2), { wash: '#F0E7D0', tex: 0, pool: 0, ink: null });
    let lab;
    if (puzzle) { const i = PUZZLE_ROWS.indexOf(row) + 1, id = `${n}-${i}`; lab = (G.S.label && G.S.label[id]) || `la ${id}`; }
    else { const t = types.length ? types[(row * 3 + col) % types.length] : null; lab = t ? t.code : ''; }
    handText(lab, d.x + d.w / 2, d.y + 38, puzzle ? 22 : 18, puzzle && G.S.label && G.S.label[`${n}-${PUZZLE_ROWS.indexOf(row) + 1}`] ? '#2A2630' : '#4A4450', { font: FONT.type, align: 'center', j: 0 });
    paint(ellPts(d.x + d.w / 2, d.y + d.h - 26, 22, 11, 14, .4), { wash: PAL.brassDk, tex: 0, ink: PAL.ink, sw: .5 });
    void devil;
  }
}
// the leaks, up close
function drawLeakBig(n, lv, k) {
  if (k <= 0) return;
  const X = CABV;
  if (n === 1 && lv >= 3) { /* labels askew: painted by the jolts */ }
  if (n === 2) {
    const top = [0, 260, 520, 760][lv];
    for (let i = 0; i < 14; i++) {
      const mx = X.x - 120 + i * (X.w + 240) / 13 + Math.sin(T * .35 + i) * 24, edge = i < 2 || i > 11 ? 1.25 : 1;
      softBlob(mx, X.y + X.h - top * .3 * edge, 160, top * .55 * edge, '#DCE4EE', .3 * k);
    }
  }
  if (n === 3) {
    boilSeed('clawsbig');
    const marks = [[.14, .2], [.62, .44], [.36, .66], [.78, .12], [.08, .52], [.52, .3]].slice(0, lv * 2);
    for (const [mx, my] of marks) for (let j = 0; j < 4; j++) {
      const x0 = X.x + X.w * mx + j * 18, y0 = X.y + X.h * my;
      if (lv >= 2) inkLine([[x0, y0], [x0 + 30, y0 + 50], [x0 + 46, y0 + 104]], 2.4, `rgba(232,201,160,${k})`, 'ink', .4);
      inkLine([[x0 - 2, y0 - 2], [x0 + 28, y0 + 48], [x0 + 44, y0 + 102]], lv >= 2 ? .8 : 1.2, `rgba(40,24,16,${.9 * k})`, 'ink', .4);
    }
    if (lv >= 3) { boilSeed('plate'); push(); translate(X.x + X.w / 2 - 140, X.y - 60); rotate(.35); paint(rectPts(0, -20, 290, 50, .6), { wash: '#EDE3C8', ink: PAL.ink, sw: .6 }); pop(); }
  }
  if (n === 4) {
    boilSeed('frostbig');
    const reach = [0, .25, .6, 1.05][lv];
    // rime from the top down: thick at the plate, thinning where it creeps on
    const top = X.y - 130, hgt = 120 + X.h * reach;
    for (let b = 0; b < 4; b++) paint(rectPts(X.x - 40 + b * 6, top, X.w + 80 - b * 12, hgt * (1 - b * .2), 6), { fill: '#E2EDF8', fillOp: 34 * k, bleed: .3, tex: .9, layers: 3, ink: null });
    C.save(); C.globalAlpha = .55 * k; C.strokeStyle = '#F4F9FF'; C.lineWidth = 1.2;
    for (let i = 0; i < 26 * lv; i++) {
      const fx = X.x - 30 + hash(i * 1.7) * (X.w + 60), fy = top + 10 + hash(i * 2.9) * hgt * .9, len = 14 + hash(i) * 30;
      C.beginPath(); C.moveTo(fx, fy); for (let j = 1; j < 5; j++) C.lineTo(fx + j * len / 4 + (hash(i * 9 + j) - .5) * 8, fy + (hash(i * 7 + j) - .5) * 10); C.stroke();
    }
    C.restore();
    for (let i = 0; i < 16 * lv; i++) {
      const fx = X.x - 30 + hash(i * 3.3) * (X.w + 60), fy = X.y - 120 + hash(i * 5.1) * (110 + X.h * reach), s = 8 + hash(i) * 18;
      for (let a = 0; a < 3; a++) { const ang = a * Math.PI / 3; inkLine([[fx - Math.cos(ang) * s, fy - Math.sin(ang) * s], [fx + Math.cos(ang) * s, fy + Math.sin(ang) * s]], .35, `rgba(250,253,255,${.85 * k})`, 'inkfine', 0); }
    }
  }
}
function clickCabinetEnvelope(id) {
  if (G.S.hand && G.S.hand.kind === 'card') return G.offerCabinet(Number(id[0]));
  const can = G.canTake(id);
  if (!can.ok) { if (can.why) G.say(can.why); G.clawd.mood.act('confused', 1); SND.nee(); return; }
  if (G.takeEnvelope(id)) {
    // it comes into the hand, and to the table
    const n = Number(id[0]);
    openView('room', null, null, () => { G.S.hand = null; walkTo(STATIONS.table.x, 'front', () => openView('table', null, [930, 860])); }, { carryEnv: id });
  }
}
function clickDrawerSlot(id) {
  const S = G.S;
  if (S.hand) { G.offerDrawer(id); return; }
  if (S.env === id) { G.say('De envelop ligt op tafel.'); return; }
}
function clickArchiveDrawer(n, idx) {
  if (G.S.hand && G.S.hand.kind === 'card') return G.offerCabinet(n);
  if (G.S.hand && G.S.hand.kind === 'env') { G.say(G.F.nee); return; }
  V.drawerOpen = archiveDrawer(n, idx);
  SND.drawer(true);
}
// the archive behind the divider: the cabinet's real cards on grey stock
function archiveDrawer(n, idx) {
  const D = { n, idx, t0: T, list: null, err: null };
  loadArchive(n).then(list => { D.list = list; }).catch(e => { D.err = e.message; });
  D.draw = function () {
    const k = easeOut(clamp((T - this.t0) / .4));
    C.save(); C.fillStyle = `rgba(14,10,18,${.6 * k})`; C.fillRect(0, 0, W, H); C.restore();
    UI.hit({ r: [0, 0, W, H], tip: null, cursor: 'default', onClick: () => { V.drawerOpen = null; SND.drawer(false); } });
    const bx = 260, by = 140 + (1 - k) * 300, bw = 1400, bh = 800;
    boilSeed('archdrawer');
    paint(rectPts(bx, by, bw, bh, 2), { wash: PAL.oakLt, ink: PAL.ink, sw: 1.2 });
    paint(rectPts(bx + 24, by + 24, bw - 48, bh - 48, 1), { wash: '#4A3424', ink: PAL.ink, sw: .8 });
    // the brown divider with J.J.V.'s note on the first
    paint(rectPts(bx + 40, by + 40, bw - 80, 110, 1), { wash: '#8A5E38', ink: PAL.ink, sw: .8 });
    if (!G.S.fired.archiveNote || G.S.fired.archiveNote === `${n}-${idx}`) { G.S.fired.archiveNote = `${n}-${idx}`; pencilNote(G.F.archive_note, bx + 70, by + 104, 900, 34, { col: '#F2E6CC' }); }
    else handText(`${CAB_LABEL[n]}`, bx + 70, by + 106, 34, '#F2E6CC', { font: FONT.fellSC, j: 0 });
    if (!this.list) { handText(this.err ? 'Het archief is niet te openen.' : 'Even zoeken…', bx + bw / 2, by + 400, 34, '#F2E6CC', { font: FONT.hand, align: 'center', j: 0 }); return; }
    const L = this.list, per = 30, start = Math.floor(hash(n * 13 + idx) * Math.max(1, L.length - per));
    const items = L.slice(start, start + per);
    items.forEach((a, i) => {
      const col = i % 6, row = Math.floor(i / 6), x = bx + 50 + col * 222, y = by + 176 + row * 118;
      const hov = UI.mouse[0] > x && UI.mouse[0] < x + 210 && UI.mouse[1] > y && UI.mouse[1] < y + 108;
      boilSeed('arch' + i);
      paint(rectPts(x, y - (hov ? 10 : 0), 210, 108, .5), { wash: '#D3CEC1', ink: PAL.ink, sw: .45, texK: .4 });
      handText((a.p || '—').slice(0, 15), x + 10, y + 30 - (hov ? 10 : 0), 20, '#2E2A35', { font: FONT.type, j: 0 });
      handText(String(a.y || ''), x + 10, y + 56 - (hov ? 10 : 0), 18, '#4A4450', { font: FONT.type, j: 0 });
      if (a.c) handText(a.c, x + 10, y + 84 - (hov ? 10 : 0), 20, PAL.red, { font: FONT.hand, weight: 600, j: 0 });
      const keyOf = j => `arch:${n}:${start + j}`;
      UI.hit({ r: [x, y - 10, 210, 118], tip: a.p || 'Een kaart', onClick: () => G.read(items.map((_, j) => keyOf(j)), i, 'archive') });
    });
    handText(`${L.length} kaarten in deze kast`, bx + bw - 40, by + bh - 40, 26, 'rgba(242,230,204,.75)', { font: FONT.hand, align: 'right', j: 0 });
    UI.button('Dicht', bx + bw - 90, by + 60, { size: 30, onClick: () => { V.drawerOpen = null; SND.drawer(false); } });
  };
  return D;
}
// the misfiled card going home, its trail note in pencil as it goes
function drawTrailShow() {
  const e = G.events.find(ev => ev.kind === 'trailShow'); if (!e) return;
  const age = T - e.t, card = G.cardView(e.key);
  const k = age < 2.6 ? 0 : easeIn(clamp((age - 2.6) / .7));
  drawCard(card, W / 2 - 420, 200 + k * 500, 840, { alpha: 1 - k, rot: -.02 + k * .1 });
  if (age > 3.4) G.events = G.events.filter(x => x !== e);
}

// ---------- clicking things in the room ----------
function clickFound(loc, emptyNote) {
  const key = G.foundAt(loc);
  if (key) { G.pickUp(loc); return true; }
  if (emptyNote) G.say(emptyNote);
  return false;
}
function clickCoat() {
  if (G.foundAt('coat')) return G.pickUp('coat');
  G.say(G.S.ended ? 'De jas hangt er nog.' : 'De jas van J.J.V. Hij is zonder jas naar huis.');
}
function clickTypewriter() {
  if (G.foundAt('typewriter')) { G.pickUp('typewriter'); return; }
  openView('typewriter', null, [1180, 800]);
}
