// main.js: boot, the frame, the pointer and the keys, and going from one place in the room to another.
'use strict';

let SCREEN = null, GRAINCV = null, lastNow = 0;
const params = new URLSearchParams(location.search);

function setView(name, arg) {
  const prev = V[G.view]; if (prev && prev.leave) prev.leave();
  G.view = name; G.arg = arg; V.halves.on = false; V.drawerOpen = null;
  const v = V[name]; if (v && v.enter) v.enter(arg);
}
// go somewhere with an iris from the thing clicked; `after` runs once the new place is in view
function openView(name, arg, at, after, o = {}) {
  if (o.carryEnv) G.fx.carryEnv = true;
  transition(at ? 'iris' : 'iris', () => { setView(name, arg); if (after) setTimeout(() => { G.fx.carryEnv = false; after(); }, 380); else G.fx.carryEnv = false; }, { at: at || [W / 2, H / 2], dur: .62 });
}
async function beginNight(seed, name, resume) {
  SND.resume();
  focusKeys(false);
  G.preview = false;
  await G.start(seed, name, resume);
  if (!resume || !G.S.fired.introDone) transition('wipe', () => setView('intro'));
  else transition('wipe', () => setView('room'));
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - lastNow) / 1000 || 0); lastNow = now;
  T = now / 1000; BOILN = Math.floor(T * BOIL);
  C = SCREEN.getContext('2d');
  C.setTransform(RS, 0, 0, RS, 0, 0);
  C.globalAlpha = 1; C.globalCompositeOperation = 'source-over'; C.filter = 'none';
  UI.hits = []; window.STORYLINK = null;
  try {
    N.update(dt);
    const v = V[G.view];
    if (G.view !== 'title' && G.view !== 'intro' && G.view !== 'final') {
      v.draw();
      if (V.halves.on) V.halves.draw();
      if (G.reader) Reader.draw();
      if (G.S && G.view !== 'title') drawStrip(G);
      if (G.view === 'room') { if (G.S.hand) drawHand(G, 170, H - 84); }
    } else v.draw();
    if (G.view !== 'title' && G.view !== 'intro' && G.view !== 'final' && !G.reader) cornerTags();
    UI.drawNotes();
    drawCaptions();
    drawHelp();
    drawTransition();
    if (TR.kind && !TR.done) UI.hits = [{ r: [0, 0, W, H], cursor: 'wait', onClick: () => {} }];
    if (G.busy && G.view !== 'title') UI.hits = UI.hits.filter(h => h.keepBusy);
    hover();
    UI.drawTip();
    touchFrame();
  } catch (e) { console.error(e); }
  placeStoryLink();
  // paper grain over everything
  C.setTransform(1, 0, 0, 1, 0, 0); C.globalCompositeOperation = 'multiply'; C.drawImage(GRAINCV, 0, 0); C.globalCompositeOperation = 'source-over';
  warmLayers(4);
}

// a question mark and the sound, in the corner
// fullscreen and landscape: Android browsers allow both; an iPhone does neither (added to the home screen it runs
// without the browser's bars, see index.html)
let fullTried = false;
const canFull = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function goFull() {
  if (!canFull() || isFull()) return;
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    const lock = () => { try { const r = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (r && r.catch) r.catch(() => {}); } catch (e) { /* not allowed here */ } };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  } catch (e) { /* not allowed here (an embedded page, say) */ }
}
function cornerTags() {
  if (TOUCH && canFull() && !isFull()) UI.button('⤢', W - 230 - (PHONE ? 50 : 0), 46 + (PHONE ? 12 : 0), { size: 30, w: 64, id: 'full', onClick: goFull, noHole: true });
  UI.button('?', W - 70, 46 + (PHONE ? 12 : 0), { size: 30, w: 64, id: 'help', tip: 'Hoe het werkt (H)', onClick: () => helpToggle(true), noHole: true });
  UI.button(SND.on ? '♪' : '–', W - 150 - (PHONE ? 25 : 0), 46 + (PHONE ? 12 : 0), { size: 30, w: 64, id: 'sound', tip: SND.on ? 'Geluid uit (M)' : 'Geluid aan (M)', onClick: () => SND.toggle(), noHole: true });
}

// a real link over the archive's stamp, so the story's own page opens like any link
function placeStoryLink() {
  const a = document.getElementById('storylink'), L = window.STORYLINK;
  if (!a) return;
  if (!L || TR.kind || HELP.on) { if (!a.hidden) a.hidden = true; return; }
  if (a.href !== L.url) a.href = L.url;
  const pct = (v, d) => (v / d * 100) + '%';
  Object.assign(a.style, { left: pct(L.r[0], W), top: pct(L.r[1], H), width: pct(L.r[2], W), height: pct(L.r[3], H) });
  a.hidden = false;
}

// ---------- the pointer ----------
function toLogical(e) { return toLogicalXY(e.clientX, e.clientY); }
function hover() {
  const [x, y] = UI.mouse, h = UI.find(x, y);
  UI.hover = h;
  const cur = UI.dragging ? 'grabbing' : h ? (h.cursor || 'pointer') : 'default';
  if (cur !== UI.cursor) { UI.cursor = cur; SCREEN.style.cursor = cur; }
}
function onDown(e) {
  SND.resume(); G.lastInput = T;
  const [x, y] = toLogical(e); UI.mouse = [x, y]; UI.touch = e.pointerType === 'touch';
  if (e.pointerType) TOUCH = e.pointerType !== 'mouse';
  if (e.button === 2) { goBack(); return; }
  const h = pickHit(x, y); UI.down = { h, x, y, t: T };
  if (h && h.drag && h.onDown) { h.onDown(x, y); UI.dragging = h; SCREEN.setPointerCapture && SCREEN.setPointerCapture(e.pointerId); }
}
function onMove(e) {
  const [x, y] = toLogical(e); UI.mouse = [x, y];
  if (UI.dragging && UI.dragging.onDrag) UI.dragging.onDrag(x, y);
}
function onUp(e) {
  const [x, y] = toLogical(e); UI.mouse = [x, y];
  const d = UI.down; UI.down = null;
  if (UI.dragging) { const h = UI.dragging; UI.dragging = null; if (h.onUp) h.onUp(x, y); return; }
  if (!d || e.button === 2) return;
  // the first tap on a phone asks for the whole screen, sideways (where the browser allows it)
  if (e.pointerType === 'touch' && !fullTried) { fullTried = true; goFull(); }
  if (swipe(d, e)) return;
  const h = pickHit(x, y);
  if (h && sameHit(h, d.h) && h.onClick) { touchTap(e, x, y, h); h.onClick(x, y); }
  else if (e.pointerType === 'touch') touchTap(e, x, y, null);
  // a finger leaves no pointer behind: no label hangs about after a tap (the map keeps it, to read the name)
  if (e.pointerType === 'touch' && G.view !== 'map') UI.mouse = [-500, -500];
}
// hit regions are rebuilt every frame: the same region is the same place, the same tip, the same id
function sameHit(a, b) {
  if (!a || !b) return false;
  if (a.id || b.id) return a.id === b.id;
  return JSON.stringify(a.r || a.c || a.poly) === JSON.stringify(b.r || b.c || b.poly) && a.tip === b.tip;
}
function goBack() {
  if (HELP.on) { HELP.on = false; return; }
  if (TR.kind && !TR.done) return;
  if (G.reader) { G.closeReader(); return; }
  if (V.halves.on) { V.halves.on = false; return; }
  if (V.drawerOpen) { V.drawerOpen = null; SND.drawer(false); return; }
  if (G.busy) return;
  if (['table', 'cabinet', 'map', 'typewriter', 'clock', 'window', 'door', 'dial'].includes(G.view)) openView('room');
}
let lastKeyAt = 0;
const HELD = new Set();   // arrow directions held down
const walkDir = k => k === 'ArrowLeft' || k === 'a' || k === 'A' ? -1 : k === 'ArrowRight' || k === 'd' || k === 'D' ? 1 : 0;
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.type === 'keydown' && e.key && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter')) lastKeyAt = performance.now();
  G.lastInput = T;
  SND.resume();
  if (HELP.on) { if (['Escape', 'Enter', ' ', 'h', 'H', '?'].includes(e.key)) { HELP.on = false; e.preventDefault(); } return; }
  if (Reader.key(e)) { e.preventDefault(); return; }
  const v = V[G.view];
  if (V.halves.on && e.key === 'Escape') { V.halves.on = false; e.preventDefault(); return; }
  if (v && v.key && !G.busy && v.key(e)) { e.preventDefault(); return; }
  if (e.key === 'Escape') { goBack(); e.preventDefault(); }
  if (!['title', 'intro', 'typewriter'].includes(G.view) && (e.key === 'h' || e.key === 'H' || e.key === '?')) helpToggle(true);
  if (!['title', 'intro', 'typewriter'].includes(G.view) && (e.key === 'm' || e.key === 'M')) SND.toggle();
  if (G.view === 'room' && !G.busy && !G.reader) {
    const dir = walkDir(e.key);
    if (dir) { HELD.add(dir); if (!e.repeat) holdWalk(dir); e.preventDefault(); }
  }
  if (G.view === 'table' && !G.reader && e.key === ' ' && G.S.table.length) { G.read(G.S.table.slice(), 0, 'table'); e.preventDefault(); }
}

// ---------- boot ----------
async function boot() {
  SCREEN = document.getElementById('screen');
  setWho(params.get('who') || 'me');
  // a phone is measured as it will be held, sideways, whichever way it is held now
  const dpr = window.devicePixelRatio || 1, lw = TOUCH ? Math.max(innerWidth, innerHeight) : innerWidth, lh = TOUCH ? Math.min(innerWidth, innerHeight) : innerHeight;
  const cssW = Math.min(lw, lh * 16 / 9);
  RS = clamp(Math.round(cssW * dpr / W * 4) / 4, .75, 1.5);
  if (cssW < 1000 && (TOUCH || dpr > 1.5)) RS = Math.min(RS, 1);   // a phone: sharp enough, and a third of the memory
  if (params.has('rs')) RS = Number(params.get('rs'));
  SCREEN.width = Math.round(W * RS); SCREEN.height = Math.round(H * RS);
  try {
    await Promise.race([Promise.all(['Special Elite', 'Caveat', 'IM Fell English', 'IM Fell English SC', 'Homemade Apple'].map(f => document.fonts.load(`40px "${f}"`)).concat(
      ['Special Elite L', 'Caveat L', 'IM Fell English L', 'IM Fell English SC L', 'Homemade Apple L'].map(f => document.fonts.load(`40px "${f}"`)))), new Promise(r => setTimeout(r, 2500))]);
  } catch (e) { /* the fallbacks will do */ }
  makeTextures(); GRAINCV = makeGrain(SCREEN.width, SCREEN.height); compInit(); makeRoomLayers();
  // a quiet night behind the title: the default one
  G.preview = true;
  await G.start(defaultSeed(), '', false);
  G.S.fired.introDone = false;
  setView('title');
  checkPhone(); window.addEventListener('resize', checkPhone);
  // iOS lets sound start only from the end of a touch
  for (const ev of ['touchend', 'click']) window.addEventListener(ev, () => SND.resume(), { passive: true });
  SCREEN.addEventListener('pointerdown', onDown); SCREEN.addEventListener('pointermove', onMove); SCREEN.addEventListener('pointerup', onUp); SCREEN.addEventListener('pointerleave', e => { if (!UI.dragging) UI.mouse = [-500, -500]; });
  SCREEN.addEventListener('contextmenu', e => e.preventDefault());
  // a tap on the canvas must not take the focus from the typing field it has just given it (the phone's keyboard would close)
  SCREEN.addEventListener('mousedown', e => e.preventDefault());
  window.addEventListener('keydown', onKey);
  // letting go of one arrow while the other is still down walks the other way
  window.addEventListener('keyup', e => { const dir = walkDir(e.key); if (!dir) return; HELD.delete(dir); if (G.clawd.hold === dir) holdWalk(HELD.has(-dir) && G.view === 'room' ? -dir : 0); });
  window.addEventListener('blur', () => { HELD.clear(); holdWalk(0); });
  const keys = document.getElementById('keys');
  // a phone's own keyboard sends no keys, only what it did to the text: a space is kept in the field so that its
  // backspace has something to take; what is added is typed, what is taken is a backspace, a new line is Enter
  const SENT = ' ';
  keys.addEventListener('focus', () => { keys.value = SENT; });
  keys.addEventListener('input', e => {
    const v = keys.value; keys.value = SENT;
    if (performance.now() - lastKeyAt < 80) return;
    if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') return onKey({ key: 'Enter', preventDefault() {} });
    if (v.length < SENT.length) return onKey({ key: 'Backspace', preventDefault() {} });
    for (const ch of v.slice(SENT.length)) onKey({ key: ch, preventDefault() {} });
  });
  keys.addEventListener('keydown', e => { if (e.key === 'Enter') { keys.blur(); } });
  document.getElementById('loading').classList.add('gone');
  requestAnimationFrame(frame);
  window.ready = true;
  // for testing: ?seed=1001&go jumps straight into a night
  if (params.has('go')) { G.preview = false; const s = seedFor(params.get('seed') || defaultSeed()); await G.start(s, params.get('name') || '', false); G.S.fired.introDone = true; setView('room'); }
}
// Start as soon as the page's own scripts are in (not on 'load', which also waits for the web fonts' stylesheet:
// on a slow connection that can take a long while, and the fonts are waited for in boot anyway). If anything goes
// wrong before the room is up, the loading screen says what, rather than warming the lamp for ever.
function bootFailed(e) {
  if (window.ready) return;
  console.error(e);
  const l = document.getElementById('loading'); if (!l) return;
  const msg = (e && (e.message || e.reason && e.reason.message || e.reason)) || String(e);
  l.innerHTML = '';
  const box = document.createElement('div'); box.style.cssText = 'max-width:80%;text-align:center;line-height:1.3';
  box.append('De lamp gaat niet aan.');
  const small = document.createElement('div'); small.style.cssText = 'font:16px/1.4 ui-monospace,monospace;opacity:.7;margin:.6em 0 1em;word-break:break-word'; small.textContent = msg;
  const again = document.createElement('button'); again.textContent = 'Opnieuw proberen'; again.style.cssText = 'font:inherit;color:#f2c66b;background:none;border:0;text-decoration:underline;cursor:pointer';
  again.onclick = () => location.reload();
  box.append(small, again); l.append(box);
}
window.addEventListener('error', e => bootFailed(e.error || e.message));
window.addEventListener('unhandledrejection', e => bootFailed(e.reason));
const startBoot = () => boot().catch(bootFailed);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startBoot); else startBoot();
