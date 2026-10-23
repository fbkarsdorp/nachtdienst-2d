// admin.js: a small panel for testing without playing the whole night. Turn it on with ?admin (it stays on for this
// browser; ?admin=0 turns it off), then the ⚙ in the corner opens it. It plays on DEV (dev.js): jump to any drawer,
// solve or skip it, skip whole cabinets and the scenes between them, go to cabinet V or either ending, set the hour.
'use strict';

const ADMIN = (() => {
  const KEY = 'nachtdienst-admin', q = new URLSearchParams(location.search);
  try { if (q.has('admin')) q.get('admin') === '0' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, '1'); } catch (e) { /* no storage */ }
  let on = q.has('admin') && q.get('admin') !== '0';
  try { on = on || localStorage.getItem(KEY) === '1'; } catch (e) { /* no storage */ }
  return { on, open: false, skip: true, el: null, btn: null };
})();

const TYPE_NAME = { P1: 'etiket (wat alle vier noemen)', P2: 'plaats op de kaart', P3: 'één hoort hier niet', P4: 'doorgescheurde kaart',
  P5: 'de oudste houden', P6: 'kistje met cijferslot', R1: 'de klok', R2: 'het raam', R3: 'kloppen op de deur', R4: 'de schrijfmachine' };
const STATE_NAME = { shut: 'dicht', open: 'bezig', solved: 'opgelost', filed: 'ingevoegd' };
const ADMIN_DATES = [['', 'vandaag'], ['10-31', 'Halloween'], ['11-11', 'Sint-Maarten'], ['11-20', 'schoen zetten'], ['12-05', 'pakjesavond'],
  ['12-25', 'Kerst'], ['12-31', 'oudjaar'], ['2026-11-13', 'vrijdag de 13e']];

const AD = {
  // put down whatever is in the hand or being read, so the next step starts clean
  clear() {
    const S = G.S; G.reader = null; V.halves.on = false; V.drawerOpen = null;
    if (S.hand && S.hand.kind === 'card') {
      const k = S.hand.key;
      if (k === S.fired.floor) G.setLoc(k, 'floor');
      else if (k.includes('/')) G.setLoc(k, k.startsWith(S.env + '/') ? 'tray' : 'env');
      S.hand = null;
    }
    if (S.hand && S.hand.kind === 'env') { S.env = S.hand.id; S.hand = null; }
  },
  solve(id) {
    const S = G.S, d = G.drawer(id);
    this.clear();
    if (S.drawers[id] === 'shut' && !this.take(id)) return false;
    if (S.drawers[id] === 'open') DEV.solve(id);
    if (d.type === 'R1') { G.fx.stopped = false; G.fx.stoppedAt = null; }
    if (S.drawers[id] === 'solved' && !S.sealed[id]) { for (const k of G.keysOf(id)) if (['tray', 'table'].includes(G.where(k))) G.setLoc(k, 'env'); G.checkSeal(id); }
    if (S.drawers[id] === 'solved' && !S.sealed[id]) { S.sealed[id] = true; S.envOpen = false; S.table = []; }
    return S.drawers[id] === 'solved';
  },
  file(id) {
    const S = G.S;
    if (S.drawers[id] === 'filed') return true;
    if (!this.solve(id)) return false;
    S.env = null; S.hand = { kind: 'env', id }; G.offerDrawer(id);
    return S.drawers[id] === 'filed';
  },
  // take a drawer's envelope, first finishing what stands in the way: another cabinet under way, the drawers before it
  take(id) {
    const S = G.S, [n, i] = id.split('-').map(Number);
    if (S.active && S.active !== n) this.cabinet(S.active);
    if (S.env && S.env !== id) this.file(S.env);
    for (let k = 1; k < i; k++) this.file(`${n}-${k}`);
    this.clear();
    S.unlocked[n] = true;
    if (S.drawers[id] !== 'shut') return true;
    if (!G.takeEnvelope(id)) return false;
    G.openEnvelope();
    return true;
  },
  cabinet(n) { for (let i = 1; i <= 3; i++) this.file(`${n}-${i}`); },
  allFour() { for (const n of G.B.chain) if (n <= 4) this.cabinet(n); },
  // the scenes between cabinets (the leak clearing, the enactment) and the cards that come up after a lock
  skipScenes() {
    const S = G.S, fx = G.fx;
    for (const e of G.events) if (e.kind === 'complete') {
      S.enacted[e.n] = true;
      if (e.n === 1) fx.softTick = true;
      if (e.n === 2) { fx.writing = null; fx.mistHold = null; }
      if (e.n === 4) S.desk = 'table';
    }
    G.events = G.events.filter(e => !['complete', 'filed', 'trail', 'trailShow'].includes(e.kind));
    S.pendingDigitCard = null; G.busy = false;
    fx.clearing = null; fx.frostClear = null; fx.mistClear = null; fx.filing = null;
    G.clawd.mood.setRest(G.restMood());
  },
  // do something, then tidy up and show where it left things
  run(fn, view) {
    if (!G.S || G.preview) return;
    TR.kind = null; G.busy = false;
    fn();
    if (ADMIN.skip) this.skipScenes();
    G.save();
    if (view && !(G.busy)) setView(view);
    adminRender();
  },
  setHour(h, m) { G.S.played = Math.max(0, (h * 60 + m - (21 * 60 + 15) - G.S.penalty) * 60); },
  restart(seed, date) {
    const p = new URLSearchParams(); p.set('go', ''); p.set('seed', seed); if (date) p.set('date', date);
    const name = G.S && G.S.name; if (name) p.set('name', name);
    location.search = p.toString().replace('go=&', 'go&');
  },
};

function adminEl(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (k === 'on') e.addEventListener('click', v); else if (k in e) e[k] = v; else e.setAttribute(k, v);
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
const adminBtn = (label, fn, title) => adminEl('button', { type: 'button', textContent: label, title: title || '', on: fn });

function adminRender() {
  const el = ADMIN.el; if (!el || !ADMIN.open) return;
  // the title screen plays a night behind it for show; that one is not to be touched
  const S = G.preview ? null : G.S, keep = el.scrollTop;
  el.replaceChildren();
  el.append(adminEl('header', {},
    adminEl('b', { textContent: 'Admin' }),
    adminEl('span', { textContent: S ? ` nacht ${S.seed} · ${hhmm(G.minutes())} · ${G.view}` : ' (kies een nacht)' }),
    adminBtn('×', () => adminToggle(false), 'Sluiten')));

  // the night itself
  const seedSel = adminEl('select', {}, ...NIGHT_SEEDS.map(s => adminEl('option', { value: s, textContent: s, selected: S ? s === S.seed : s === defaultSeed() })));
  const dateNow = new URLSearchParams(location.search).get('date') || '';
  const dateSel = adminEl('select', {}, ...ADMIN_DATES.map(([v, l]) => adminEl('option', { value: v, textContent: l, selected: v === dateNow })));
  el.append(adminEl('section', {}, adminEl('h3', { textContent: 'Nacht' }),
    adminEl('div', { className: 'row' }, seedSel, dateSel, adminBtn('Begin opnieuw', () => AD.restart(seedSel.value, dateSel.value), 'Een verse nacht, zonder titel en intro'))));
  if (!S) return;

  el.append(adminEl('label', { className: 'row' }, adminEl('input', { type: 'checkbox', checked: ADMIN.skip, on: e => { ADMIN.skip = e.target.checked; } }),
    ' tussenscènes overslaan'));

  // the cabinets, in the order the night opens them
  const sec = adminEl('section', {}, adminEl('h3', { textContent: 'Kasten' }));
  for (const n of G.B.chain.filter(c => c <= 4)) {
    const cab = G.cab(n), nth = G.nth(n), done = G.cabinetFiled(n);
    sec.append(adminEl('div', { className: 'cab' },
      adminEl('b', { textContent: `${ROMAN[n]} ${cab.label}` }),
      adminEl('span', { className: 'dim', textContent: `${nth ? ` · ${nth}e kast` : ''}${S.unlocked[n] ? '' : ' · op slot'}${S.digits[n] != null ? ` · cijfer ${S.digits[n]}` : ''}` }),
      done ? null : adminBtn('Hele kast invoegen', () => AD.run(() => AD.cabinet(n), 'room'))));
    for (const d of cab.drawers) {
      const st = S.drawers[d.id], hint = (d.hints || [])[d.hints.length - 1] || '';
      sec.append(adminEl('div', { className: 'drawer' + (st === 'filed' ? ' done' : '') + (S.env === d.id ? ' cur' : '') },
        adminEl('div', {}, adminEl('b', { textContent: d.id }), ` ${TYPE_NAME[d.type] || d.type} `, adminEl('span', { className: 'dim', textContent: `(${STATE_NAME[st] || st})` })),
        adminEl('div', { className: 'dim small', textContent: hint }),
        st === 'filed' ? null : adminEl('div', { className: 'row' },
          adminBtn('Speel', () => AD.run(() => AD.take(d.id), 'table'), 'Alles ervoor invoegen en deze envelop openen'),
          adminBtn('Los op', () => AD.run(() => AD.solve(d.id), 'table'), 'Het slot open, de envelop dicht'),
          adminBtn('Invoegen', () => AD.run(() => AD.file(d.id), 'room'), 'Oplossen en in de la'))));
    }
  }
  el.append(sec);

  // cabinet V and the two ways the night ends
  el.append(adminEl('section', {}, adminEl('h3', { textContent: 'Einde' }), adminEl('div', { className: 'row' },
    adminBtn('Kast I–IV invoegen', () => AD.run(() => AD.allFour(), 'room')),
    adminBtn('Kast V open', () => AD.run(() => { AD.allFour(); S.five = 'open'; }, 'dial'), 'Alles ingevoegd, het slot van kast V open; de kaart is te lezen'),
    // the endings start after the tidying, so their own hold on the input stays
    adminBtn('Einde: kast V', () => { AD.run(() => { AD.allFour(); S.fiveWord = S.fiveWord || 'mijzelf'; S.five = 'typed'; }); adminToggle(false); endingFive(); }),
    adminBtn('Einde: dicht laten', () => { AD.run(() => AD.allFour()); adminToggle(false); endingShut(); }),
    adminBtn('Slotscherm', () => { AD.run(() => { S.fiveWord = S.fiveWord || 'mijzelf'; S.endMinutes = G.minutes(); }); adminToggle(false); setView('final', 'five'); }))));

  // where to stand, and what time it is
  el.append(adminEl('section', {}, adminEl('h3', { textContent: 'Ga naar' }), adminEl('div', { className: 'row' },
    ...[['kamer', 'room'], ['tafel', 'table'], ['raam', 'window'], ['kaart', 'map'], ['machine', 'typewriter'], ['klok', 'clock'], ['deur', 'door'], ['kast V', 'dial']]
      .map(([l, v]) => adminBtn(l, () => AD.run(() => {}, v))))));
  el.append(adminEl('section', {}, adminEl('h3', { textContent: 'Tijd' }), adminEl('div', { className: 'row' },
    adminBtn('+15 min', () => AD.run(() => { S.played += 15 * 60; })),
    adminBtn('23:50', () => AD.run(() => AD.setHour(23, 50))),
    adminBtn('21:15', () => AD.run(() => AD.setHour(21, 15))))));
  el.scrollTop = keep;
}

function adminToggle(open = !ADMIN.open) {
  ADMIN.open = open;
  ADMIN.el.hidden = !open;
  if (open) adminRender();
}

function adminInit() {
  if (!ADMIN.on || ADMIN.el) return;
  ADMIN.btn = adminEl('button', { id: 'adminbtn', type: 'button', textContent: '⚙', title: 'Admin', on: () => adminToggle() });
  ADMIN.el = adminEl('div', { id: 'admin', hidden: true });
  // the panel's own keys and touches stay its own: no walking, typing or swiping in the room behind it
  for (const ev of ['keydown', 'keyup', 'pointerdown', 'touchstart', 'touchmove']) ADMIN.el.addEventListener(ev, e => e.stopPropagation(), { passive: true });
  // on the page, not the stage: in the letterbox band, and clear of the stage's turn on a phone held upright
  document.body.append(ADMIN.btn, ADMIN.el);
  // keep the header's hour and the drawers' states fresh while it is open (not while a list is being picked from)
  setInterval(() => { if (ADMIN.open && document.activeElement.tagName !== 'SELECT') adminRender(); }, 1500);
}
document.addEventListener('DOMContentLoaded', adminInit);
if (document.readyState !== 'loading') adminInit();
