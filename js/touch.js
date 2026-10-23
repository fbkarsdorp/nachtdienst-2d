// touch.js: the game in the hand. A finger is broad and does not hover, a phone has a back button, a rotation lock,
// a vibration motor and a screen that dims; this is what the room does about each.
'use strict';

// ---------- a broad fingertip: a tap just beside something small still finds it ----------
// Exact hits win, unless the exact hit is something big behind (the floor, a backdrop) and a small thing lies within
// reach of the finger: then the small thing is meant.
const REACH = 70;   // logical px, about a fingertip's half-width on a phone
function hitArea(h) {
  if (h.r) return h.r[2] * h.r[3];
  if (h.c) return Math.PI * h.c[2] * h.c[2];
  if (h.poly) { const [x0, y0, x1, y1] = bbox(h.poly); return (x1 - x0) * (y1 - y0); }
  return Infinity;
}
function hitDist(h, x, y) {
  if (h.c) return Math.max(0, Math.hypot(x - h.c[0], y - h.c[1]) - h.c[2]);
  const [x0, y0, x1, y1] = h.r ? [h.r[0], h.r[1], h.r[0] + h.r[2], h.r[1] + h.r[3]] : bbox(h.poly || [[x, y]]);
  return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
}
function pickHit(x, y) {
  const exact = UI.find(x, y);
  if (!TOUCH) return exact;
  if (exact && !exact.floor && hitArea(exact) < W * H * .2) return exact;
  // a sheet over the whole screen (help, colophon, reader, an open drawer) hides what lies under it from the finger too
  let top = 0;
  for (let i = UI.hits.length - 1; i >= 0; i--) if (!UI.hits[i].floor && hitArea(UI.hits[i]) >= W * H * .95) { top = i + 1; break; }
  let best = null, bd = REACH;
  for (let i = UI.hits.length - 1; i >= top; i--) {
    const h = UI.hits[i];
    if (h.disabled || h.floor || h === exact || !h.onClick && !h.drag || hitArea(h) >= W * H * .2) continue;
    const d = hitDist(h, x, y); if (d < bd) { bd = d; best = h; }
  }
  return best || exact;
}

// ---------- what a tap leaves behind: a ring of ink where the finger was, and the thing's name ----------
const TAPS = [];
function tapMark(x, y, h) {
  TAPS.push({ x, y, t: T });
  if (TAPS.length > 6) TAPS.shift();
  const tip = h && h.tip && (typeof h.tip === 'function' ? h.tip() : h.tip);
  UI.flash = tip ? { txt: tip, x, y, t: T } : null;
}
function drawTaps() {
  for (const p of TAPS) {
    const k = (T - p.t) / .45; if (k > 1) continue;
    C.save(); C.globalAlpha = .55 * (1 - k); C.strokeStyle = '#F4E6C2'; C.lineWidth = 5 * (1 - k) + 1;
    C.beginPath(); C.arc(p.x, p.y, 18 + 70 * easeOut(k), 0, TAU); C.stroke(); C.restore();
  }
  // the name of what was tapped, as the label a mouse would have shown, for a moment
  const f = UI.flash;
  if (f && T - f.t < 1.4 && !HELP.on) {
    const a = clamp((1.4 - (T - f.t)) / .3);
    C.save(); C.globalAlpha = a;
    C.font = `600 34px ${FONT.hand}`; const w = C.measureText(f.txt).width + 36;
    const x = clamp(f.x - w / 2, 12, W - w - 12), y = clamp(f.y - 130, 70, H - 70);
    boilSeed('flash' + f.txt);
    paint(rectPts(x, y, w, 54, 1), { wash: '#F2EBD8', washOp: 240, ink: PAL.ink, sw: .5, texK: .3 });
    handText(f.txt, x + 18, y + 38, 34, '#3A3248', { font: FONT.hand, weight: 600, j: .2 });
    C.restore();
  }
}

// ---------- swipes: through the cards being read, and down to put them away ----------
function swipe(d, e) {
  if (!d || e.pointerType === 'mouse' || !G.reader || UI.dragging) return false;
  const [x, y] = toLogical(e), dx = x - d.x, dy = y - d.y, dt = T - d.t;
  if (dt > .7) return false;
  if (Math.abs(dx) > 160 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (G.reader.list.length > 1) Reader.step(dx < 0 ? 1 : -1); return true; }
  if (dy > 220 && dy > Math.abs(dx) * 1.4) { G.closeReader(); return true; }
  return false;
}

// ---------- the vibration motor: a little weight to the things that have it (Android; an iPhone has none for pages) ----------
const VIBE = { key: 6, carriage: 14, stamp: 22, drawer: 10, thud: 25, slam: 60, knock: 30, nee: [14, 50, 14], good: [10, 40, 18], ding: 12, strike: 20 };
for (const [k, pat] of Object.entries(VIBE)) {
  const f = SND[k]; if (!f) continue;
  SND[k] = function (...a) { if (TOUCH && SND.on && navigator.vibrate) try { navigator.vibrate(pat); } catch (e) { /* not allowed */ } return f.apply(this, a); };
}

// ---------- the back button (and the back swipe) step back in the room rather than leaving the archive ----------
// One extra history entry stands in for the game; going back from it does what Esc does, and puts it back. In the
// room with nothing open, a back press leaves for real.
const canStepBack = () => !!(HELP.on || COLOFON.on || G.reader || V.halves.on || V.drawerOpen || (G.S && ['table', 'cabinet', 'map', 'typewriter', 'clock', 'window', 'door', 'dial'].includes(G.view)));
let historyArmed = false;
function armHistory() { if (historyArmed || !canStepBack()) return; try { history.pushState({ nachtdienst: 1 }, ''); historyArmed = true; } catch (e) { /* sandboxed */ } }
window.addEventListener('popstate', () => {
  historyArmed = false;
  if (!canStepBack()) return;
  goBack(); armHistory();
});

// ---------- the screen stays on while a night is played, and the night is kept when the phone is put away ----------
let wakeLock = null;
async function keepAwake() {
  if (!TOUCH || !navigator.wakeLock || wakeLock || document.hidden || G.view === 'title') return;
  try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch (e) { /* not allowed here */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (G.S && !G.preview) G.save(); HELD.clear(); SND.sleep(); }
  else { SND.wake(); keepAwake(); }
});
window.addEventListener('pagehide', () => { if (G.S && !G.preview) G.save(); SND.sleep(); });
window.addEventListener('pageshow', e => { if (e.persisted && !document.hidden) SND.wake(); });

// ---------- sideways: a phone held upright with its rotation locked still plays, the room turned on the glass ----------
// Upright, the stage is drawn turned a quarter, filling the screen; turning the phone then reads it. Unlocked phones
// turn the page themselves and never see this.
const SIDE = { on: false };
function checkSideways() {
  const upright = window.innerHeight > window.innerWidth * 1.1;
  const on = upright && (TOUCH || matchMedia('(pointer: coarse)').matches);
  if (on !== SIDE.on) { SIDE.on = on; document.documentElement.classList.toggle('sideways', on); }
}
// screen coordinates to the logical 1920×1080, the stage turned or not
function toLogicalXY(cx, cy) {
  const r = SCREEN.getBoundingClientRect();
  if (SIDE.on) return [(cy - r.top) / r.height * W, (r.right - cx) / r.width * H];
  return [(cx - r.left) / r.width * W, (cy - r.top) / r.height * H];
}

// ---------- no zooming the page out from under the room ----------
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

// all of it, once a frame and on each tap
function touchFrame() { checkSideways(); drawTaps(); if (!historyArmed && canStepBack()) armHistory(); }
function touchTap(e, x, y, h) {
  if (e.pointerType !== 'touch') return;
  tapMark(x, y, h); keepAwake();
}
