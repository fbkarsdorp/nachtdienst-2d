// game.js: the night. Twelve envelopes to insert into four cabinets, three drawers each: two card puzzles and one room
// lock. A drawer goes shut → open (envelope taken) → solved (lock opened) → filed (cards inserted). Only filing counts.
// The cabinet being worked on leaks into the room until its three drawers are filed; then its enactment plays and its
// room lock's number joins the strip, for the dial of cabinet five. (After NACHTDIENST_PUZZLES.md.)
'use strict';

const SAVE_KEY = 'nachtdienst-2d';
const LEAK_STEP = 180;          // seconds per step of a leak
const HINT_COST = [2, 4, 8];    // minutes on the clock

// the last card: the top card in cabinet V bears a name, and the blank is it. The player's own name goes in at once
// (any part of it), as do these; anything else after the nudges. Without a name given, what is typed becomes the name.
const FIVE_ENDING = [', en wat de assistent daar zag, dat was ____.', '. Op de bovenste stond een naam: ____.'];
const FIVE_WORDS = ['assistent', 'nieuwe assistent', 'vorige assistent', 'mij', 'mijzelf', 'ik', 'mijn naam', 'jij', 'jou'];
const FIVE_INVITE = 'vul het zelf in. aan de machine';
const FIVE_NUDGES = ['Wie zat hier vannacht?', 'Wiens kaart is dit?', 'Je eigen naam.'];
const G = {
  B: null, S: null, F: null, view: 'title', arg: null, reader: null, busy: false, events: [],
  clawd: { x: 300, tx: 300, y: WALK_Y, face: 'front', walking: false, walkT0: 0, x0: 300, then: null, mood: new Mood('neutral'), look: null, turnT: 0, prevFace: 'front' },
  fx: { tickLoud: 0, stopped: false, silentUntil: 0, jolt: {}, wolf: null, flick: 1, flickUntil: 0, lampOff: 0, mistLevel: 0, reflect: 0, knockT: 0, shiver: 0, tw: null, doorOpen: 0, morning: 0, pendulum: true },

  // ---------- the bundle ----------
  cab(n) { return this.B.cabinets[n - 1]; },
  drawer(id) { const [c, d] = id.split('-').map(Number); return this.cab(c).drawers[d - 1]; },
  allDrawers() { return this.B.cabinets.slice(0, 4).flatMap(c => c.drawers); },
  card(key) { const [id, cid] = key.split('/'); const d = this.drawer(id); return { d, c: d.cards.find(x => x.id === cid) }; },
  keysOf(id) { return this.drawer(id).cards.map(c => `${id}/${c.id}`); },
  roleKey(id, role) { const c = this.drawer(id).cards.find(x => x.role === role); return c && `${id}/${c.id}`; },
  nth(n) { return this.S.order.indexOf(n) + 1; },          // which cabinet of the night this was (1st..4th), 0 if not begun

  // ---------- starting and saving ----------
  newState(seed, name) {
    const S = {
      v: 1, seed, name: name || '', played: 0, penalty: 0, order: [1], unlocked: { 1: true }, active: null, activeSince: 0,
      drawers: {}, loc: {}, env: null, envOpen: false, sealed: {}, hand: null, table: [], hints: {}, digits: {}, fill: {},
      notes: {}, typed: [], read: [], fired: {}, enacted: {}, found: {}, woke: {}, fused: {}, damp: {}, filedIn: {},
      wall: null, clockSet: null, spike: 0, desk: 'none', gone: {}, intruderIn: {}, kitOpen: {}, wheels: [1, 1, 1],
      pins: {}, wrongTyped: 0, lastProgress: 0, ended: null, startedReal: Date.now(), unclassedCab: {}, five: 'shut', boxOpen: false,
    };
    for (const d of this.B.cabinets.slice(0, 4).flatMap(c => c.drawers)) S.drawers[d.id] = 'shut';
    return S;
  },
  async start(seed, name, resume) {
    this.B = await loadNight(seed);
    this.F = this.B.frame;
    this.F.card_five = { ...this.F.card_five, description: this.F.card_five.description.replace(...FIVE_ENDING) };
    let S = null;
    if (resume) { try { S = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { S = null; } }
    this.S = S && S.seed === seed ? S : this.newState(seed, name);
    this.reader = null; this.events = []; this.busy = false;
    this.clawd.x = this.clawd.tx = resume ? 930 : 330; this.clawd.face = resume ? 'front' : 'q';
    this.clawd.mood = new Mood('neutral');
    this.fx.stopped = this.S.woke['1-3'] && !['solved', 'filed'].includes(this.S.drawers['1-3']);
    if (this.S.ended) this.S.ended = null;
    if (resume) this.repair();
    if (this.fx.stopped) this.fx.stoppedAt = this.minutes();
    this.fx.softTick = !!this.S.enacted[1];
    this.save();
  },
  // a night left in the middle of something timed (a card on the sill, the machine finishing its line, the strongbox
  // opening, an enactment) is put where that would have ended
  repair() {
    const S = this.S;
    for (const d of this.allDrawers()) {
      if (S.drawers[d.id] !== 'open') continue;
      const keys = this.keysOf(d.id);
      if (d.type === 'R2' && keys.some(k => this.where(k) === 'sill')) { const k = keys.find(x => this.where(x) === 'sill'); S.damp[k] = true; this.setLoc(k, 'env'); this.solve(d.id); }
      if (d.type === 'R4' && this.where(`${d.id}/${d.lock.bottom_card}`) === 'machine') this.finishR4(`${d.id}/${d.lock.bottom_card}`);
      if (d.type === 'P6' && S.kitOpen[d.id]) { const inside = this.roleKey(d.id, 'inside'); if (inside) this.setLoc(inside, 'tray'); this.solve(d.id); }
    }
    for (const n of [1, 2, 3, 4]) if (this.cabinetFiled(n) && !S.enacted[n]) { S.enacted[n] = true; if (n === 4 && S.desk === 'none') S.desk = 'table'; if (n === 1) this.fx.softTick = true; }
    if (S.active && this.cabinetFiled(S.active)) S.active = null;
    S.pendingDigitCard = null;
    if (S.five === 'typed') S.five = 'reading';
    for (const k in S.kitOpen) S.kitOpen[k] = -99;
  },
  save() { if (this.preview) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.S)); } catch (e) { /* the night is not kept; that is all */ } },
  hasSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && !s.ended && s.seed ? s : null; } catch (e) { return null; } },
  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing kept */ } },

  // ---------- time ----------
  minutes() { return 21 * 60 + 15 + this.S.played / 60 + this.S.penalty; },
  wallMinutes() {
    // the clock on the wall: game time, or from the hour it was set to; stopped while the R1 lock is awake
    const m = this.minutes();
    if (this.fx.clockShow != null) return this.fx.clockShow;
    if (this.fx.stopped && this.fx.stoppedAt != null) return this.fx.stoppedAt;
    if (this.S.clockSet != null) return m + this.S.clockSet;
    return m;
  },

  // ---------- where the cards are ----------
  // a card key lives in one place: 'env' (inside its envelope), 'tray', 'table', 'hand', 'box' (the loose halves),
  // 'kit' (in the strongbox), 'machine' (in the typewriter), 'found:<where>', 'gone', 'cab:<n>' (filed elsewhere), 'filed'
  where(key) { return this.S.loc[key] || 'drawer'; },
  setLoc(key, w) { this.S.loc[key] = w; if (w !== 'table') this.S.table = this.S.table.filter(k => k !== key); },
  inTray() { const id = this.S.env; if (!id) return []; return this.keysOf(id).filter(k => this.where(k) === 'tray'); },
  envKeys(id) { return this.keysOf(id).filter(k => this.where(k) === 'env'); },
  homeCount(id) {
    // what the envelope's count says: its cards, less the ones that are gone for good
    const d = this.drawer(id); let n = 0;
    for (const c of d.cards) {
      if (d.type === 'P4' && (c.role === 'distractor' || c.role === 'bottom')) continue;
      if (d.type === 'R4' && c.role === 'top') continue;
      if (d.type === 'P6' && c.role === 'inside') continue;
      n++;
    }
    return n;
  },
  envelopeView(id) {
    const d = this.drawer(id), st = this.S.drawers[id], keys = this.keysOf(id);
    const gone = keys.filter(k => ['gone'].includes(this.where(k)) || this.where(k).startsWith('cab:')).length;
    const count = this.homeCount(id) - gone;
    const counted = keys.filter(k => {
      const c = this.card(k).c;
      if (d.type === 'P4' && (c.role === 'distractor' || c.role === 'bottom')) return false;
      if (d.type === 'R4' && c.role === 'top') return false;
      if (d.type === 'P6' && c.role === 'inside') return false;
      const w = this.where(k); return !w.startsWith('found') && w !== 'gone' && !w.startsWith('cab:') && w !== 'floor';
    }).length;
    const hints = (d.hints || []).slice(0, this.S.hints[id] || 0);
    const fc = d.found_card && this.S.found[id];
    let found = null, foundOther = false;
    // J.J.V. says where he left it; the bin he does not own up to, so the other hand does
    if (fc && this.where(`${id}/${fc.card}`).startsWith('found')) {
      foundOther = fc.loc === 'bin';
      found = foundOther ? 'hij heeft er één weggegooid' : this.F.found_notes[fc.loc];
    }
    const other = this.S.fired.otherHandOn === id ? this.F.reactions.other_hand : null;
    return { id, note: d.note, count, have: counted, sealed: !!this.S.sealed[id], filed: st === 'filed', open: this.S.envOpen && this.S.env === id && !this.S.sealed[id],
      hints, found, foundOther, other, ver: [st, count, counted, hints.length, !!this.S.sealed[id], this.S.envOpen, found, other].join('.') };
  },
  cardView(key) {
    if (key === 'note') return { key: 'note', kind: 'note', text: this.F.note_table, r: {} };
    if (key === 'desk') {
      const r = { ...this.F.card_desk };
      return { key: 'desk', kind: 'desk', r, notes: [{ txt: r.note }], ver: '' };
    }
    if (key === 'five') {
      const r = { ...this.F.card_five }, fill = this.S.fiveWord ? { blank: this.S.fiveWord } : null;
      const notes = this.S.fiveWord ? [] : [{ txt: FIVE_INVITE, other: true }];
      return { key: 'five', kind: 'five', r, fill, notes, dateText: this.tomorrow(), ver: this.S.fiveWord || '' };
    }
    if (key.startsWith('arch:')) {
      const [, n, i] = key.split(':'), a = ARCHIVE[n] && ARCHIVE[n][i];
      if (!a) return { key, grey: true, r: { description: '…' } };
      return { key, grey: true, r: { description: a.d, original: a.o, place: a.p, prov: a.v, year: a.y, code: a.c, initials: a.i, url: ARCHIVE_INDEX.url.replace('{n}', a.n), front: 'description' }, ver: '' };
    }
    const { d, c } = this.card(key), notes = (this.S.notes[key] || []).slice();
    const fill = this.S.fill[key] || null, fusedKey = this.S.fused[key];
    const fusedWith = fusedKey ? this.card(fusedKey).c.render : null;
    const r = c.render;
    const unclassed = d.type === 'P3' && !r.code;
    const crumpled = !!(this.S.crumpled && this.S.crumpled[key]);
    return { key, r, role: c.role, notes, fill, fusedWith, damp: !!this.S.damp[key], crumpled, unclassed,
      noStain: false, ver: [notes.length, fill && JSON.stringify(fill), fusedKey, this.S.damp[key], crumpled].join('|') };
  },
  tomorrow() {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return `${d.getDate()}-${d.getMonth() + 1}-1983`;
  },
  addNote(key, txt, other = false) { (this.S.notes[key] = this.S.notes[key] || []).push({ txt, other }); },

  // ---------- which drawer may be taken ----------
  cabinetFiled(n) { return [1, 2, 3].every(i => this.S.drawers[`${n}-${i}`] === 'filed'); },
  filedCount(n) { return [1, 2, 3].filter(i => this.S.drawers[`${n}-${i}`] === 'filed').length; },
  allFiled() { return [1, 2, 3, 4].every(n => this.cabinetFiled(n)); },
  canTake(id) {
    const [n, i] = id.split('-').map(Number), st = this.S.drawers[id];
    if (st === 'filed') return { ok: false, why: this.F.reactions.reopen_filed, filed: true };
    if (st !== 'shut') return { ok: false, why: null };
    if (!this.S.unlocked[n]) return { ok: false, why: this.F.not_yet };
    if (this.S.active && this.S.active !== n) return { ok: false, why: this.F.finish_first.replace('{roman}', ROMAN[this.S.active]) };
    for (let k = 1; k < i; k++) if (this.S.drawers[`${n}-${k}`] !== 'filed') return { ok: false, why: this.F.not_yet };
    if (this.S.env) return { ok: false, why: 'Eén envelop tegelijk.' };
    if (this.S.hand) return { ok: false, why: 'De hand is vol.' };
    return { ok: true };
  },
  nextDrawer(n) { for (let i = 1; i <= 3; i++) if (this.S.drawers[`${n}-${i}`] !== 'filed') return `${n}-${i}`; return null; },

  // ---------- taking an envelope from its drawer ----------
  takeEnvelope(id) {
    const ok = this.canTake(id);
    if (!ok.ok) { if (ok.why) this.say(ok.why); this.clawd.mood.act('confused', 1.2); SND.nee(); return false; }
    const [n] = id.split('-').map(Number), d = this.drawer(id);
    if (!this.S.active) { this.S.active = n; this.S.activeSince = this.S.played; if (!this.S.order.includes(n)) this.S.order.push(n); }
    this.S.drawers[id] = 'open';
    this.S.env = id; this.S.envOpen = false;
    // the cards go into the envelope, except the one that is elsewhere in the room
    for (const c of d.cards) {
      const key = `${id}/${c.id}`;
      if (d.type === 'P4' && (c.role === 'distractor' || c.role === 'bottom')) this.setLoc(key, 'box');
      else if (d.type === 'R4' && c.role === 'top') this.setLoc(key, 'machine');
      else if (d.type === 'P6' && c.role === 'inside') this.setLoc(key, 'kit');
      else this.setLoc(key, 'env');
    }
    const nth = this.nth(n);
    if (id.endsWith('-1') && d.found_card && nth >= 2) {
      const r = hash(this.S.seed * 7 + n);
      let loc = nth === 2 ? (r < .5 ? 'chair' : 'lamp') : nth === 3 ? (r < .5 ? 'coat' : 'typewriter') : 'bin';
      if (loc === 'typewriter' && this.cab(n).drawers[2].type === 'R4') loc = 'coat';
      const key = `${id}/${d.found_card.card}`;
      this.S.found[id] = { card: d.found_card.card, loc };
      this.setLoc(key, 'found:' + loc);
    }
    if (nth === 4 && id.endsWith('-1') && !this.S.fired.floor) this.floorEvent(id);
    // the typewriter starts as its drawer comes out
    if (d.type === 'R4') this.wake(id);
    this.S.lastProgress = this.S.played;
    SND.envOut(); SND.drawer(true, this.cabX(n));
    this.save();
    return true;
  },
  // the player's fourth cabinet: a card filed earlier lies on the floor by the door, in another hand
  floorEvent(id) {
    const fusedHalves = new Set(Object.values(this.S.fused));
    const filed = this.allDrawers().filter(d => this.S.drawers[d.id] === 'filed' && ['P1', 'P2', 'P5', 'P6', 'R1'].includes(d.type))
      .flatMap(d => (d.on_success.stack || []).map(c => `${d.id}/${c}`)).filter(k => !fusedHalves.has(k) && this.where(k) === 'filed');
    if (!filed.length) return;
    const key = filed[Math.floor(hash(this.S.seed + 3) * filed.length)];
    this.S.fired.floor = key; this.setLoc(key, 'floor');
    this.addNote(key, this.F.floor_note, true);
    this.S.fired.otherHandOn = id;
  },

  // ---------- the envelope on the table ----------
  openEnvelope() {
    const id = this.S.env; if (!id || this.S.sealed[id]) return;
    if (!this.S.envOpen) {
      this.S.envOpen = true;
      for (const k of this.envKeys(id)) this.setLoc(k, 'tray');
      SND.flap(); setTimeout(() => SND.fan(), 250);
      this.save();
    }
  },
  // the reader: one card lifted to be read
  read(list, i = 0, from = 'tray') {
    if (!list.length) return;
    this.reader = { list, i, back: false, from, t0: T, flipT: -9 };
    const key = list[i];
    this.markRead(key);
    SND.card();
    this.clawd.mood.setRest('reading');
  },
  markRead(key) {
    if (!this.S.read.includes(key)) this.S.read.push(key);
    if (key === 'desk' && !this.S.fired.read_desk) { this.S.fired.read_desk = true; setTimeout(() => this.say(this.F.reactions.read_desk), 1600); }
  },
  closeReader() {
    if (!this.reader) return;
    const key = this.reader.list[this.reader.i];
    if (key === 'note' && !this.S.fired.help) { this.S.fired.help = true; setTimeout(() => helpToggle(true), 500); }
    this.reader = null; SND.shove();
    this.clawd.mood.setRest(this.restMood());
    this.afterPutDown(key);
  },
  // a room lock wakes once one of its drawer's cards has been read and put down
  afterPutDown(key) {
    if (!key || !key.includes('/')) return;
    const id = key.split('/')[0], [n, i] = id.split('-').map(Number);
    const R = this.cab(n).drawers[2];
    if (i === 3 || (i === 1 && this.nth(n) === 3)) this.wake(R.id);
  },
  restMood() {
    const lv = this.leakLevel();
    if (this.S.ended) return 'neutral';
    if (this.S.hand && this.S.hand.kind === 'env' && this.S.sealed[this.S.hand.id]) return 'determined';
    return lv >= 3 ? 'nervous' : lv === 2 ? 'suspicious' : 'neutral';
  },
  toTable(key) {
    if (this.S.table.includes(key)) return;
    if (this.S.table.length >= 4) { const old = this.S.table.shift(); this.setLoc(old, 'tray'); }
    this.setLoc(key, 'table'); this.S.table.push(key);
    SND.place(); this.save();
  },
  toTray(key) { this.setLoc(key, 'tray'); SND.shove(); this.save(); },
  take(key) {
    if (this.S.hand && (this.S.hand.kind !== 'card' || !this.S.env || !this.S.hand.key.startsWith(this.S.env + '/'))) { this.say('De hand is vol.'); return false; }
    if (this.S.hand) {
      // a card in the hand and another to take: they change places
      if (this.S.hand.kind === 'card') { const k = this.S.hand.key; this.setLoc(k, this.where(key) === 'table' ? 'table' : 'tray'); if (this.where(key) === 'table') this.S.table[this.S.table.indexOf(key)] = k; }
      else { this.say('De hand is vol.'); return false; }
    }
    this.S.table = this.S.table.filter(k => k !== key);
    this.setLoc(key, 'hand'); this.S.hand = { kind: 'card', key };
    SND.card(); this.save();
    return true;
  },
  // a card in the hand comes back to the tray of its envelope
  handToTray() {
    const h = this.S.hand; if (!h || h.kind !== 'card') return false;
    const key = h.key;
    if (key === 'desk') return false;
    const id = key.split('/')[0];
    if (this.S.env !== id) { this.say('Die hoort in een andere envelop.'); return false; }
    this.S.hand = null;
    const { d, c } = this.card(key);
    // a loose half goes back in the box of halves; once the lock is open, a card brought back goes straight into
    // the envelope, and may let its flap shut
    if (d.type === 'P4' && (c.role === 'bottom' || c.role === 'distractor') && this.S.drawers[id] === 'open') this.setLoc(key, 'box');
    else if (this.S.drawers[id] === 'solved') { this.setLoc(key, 'env'); this.checkSeal(id); }
    else this.setLoc(key, this.S.envOpen ? 'tray' : 'env');
    // a helper of a map puzzle, back from the room: its place goes on the map
    SND.shove(); this.save(); return true;
  },
  clickHand() {
    const h = this.S.hand; if (!h) return;
    if (h.kind === 'card') this.read([h.key], 0, 'hand');
  },

  // ---------- hints ----------
  askHint() {
    const id = this.S.env; if (!id) return;
    const n = this.S.hints[id] || 0, d = this.drawer(id);
    if (n >= (d.hints || []).length) { this.say('Meer weet ik ook niet.'); return; }
    this.S.hints[id] = n + 1; this.S.penalty += HINT_COST[n];
    SND.pencil(); this.clawd.mood.act('thinking', 1.4);
    this.save();
  },

  // ---------- solving ----------
  solve(id) {
    const d = this.drawer(id);
    if (['solved', 'filed'].includes(this.S.drawers[id])) return;
    this.S.drawers[id] = 'solved';
    this.S.lastProgress = this.S.played;
    const os = d.on_success || {};
    if (os.fill_field) {
      const key = `${id}/${os.fill_field.card}`, f = (this.S.fill[key] = this.S.fill[key] || {});
      f[os.fill_field.field] = os.fill_field.value === 'typed' ? this.S.lastTyped : os.fill_field.value;
    }
    if (os.fuse) { this.S.fused[`${id}/${os.fuse[0]}`] = `${id}/${os.fuse[1]}`; this.setLoc(`${id}/${os.fuse[1]}`, 'fused'); }
    if (d.type === 'P4') for (const k of this.keysOf(id)) if (this.where(k) === 'box') this.setLoc(k, 'gone-box');
    if (d.type === 'R4') { this.setLoc(this.roleKey(id, 'top'), 'env'); this.S.woke[id] = 'done'; }
    // every card of the drawer that belongs in it slides back into the envelope
    for (const c of os.stack || []) {
      const key = `${id}/${c}`, w = this.where(key);
      if (w === 'hand') continue;   // a card kept in the hand holds the envelope open
      if (w.startsWith('found') || w === 'floor') continue;
      if (w !== 'gone') this.setLoc(key, 'env');
    }
    if (os.digit) {
      const n = Number(id[0]);
      this.S.digits[n] = os.digit.value;
      const dk = `${id}/${os.digit.card}`;
      this.addNote(dk, this.F.digit_note.replace('{n}', os.digit.value).replace('{roman}', ROMAN[n]));
      if (!this.S.fired.digitFirst) { this.S.fired.digitFirst = true; this.addNote(dk, this.F.digit_first); }
      this.S.pendingDigitCard = dk;
    }
    this.checkSeal(id);
    this.clawd.mood.act(os.digit ? 'idea' : 'happy', 1.8);
    SND.good();
    this.save();
  },
  // the flap shuts once every card that belongs in the envelope is in it
  checkSeal(id) {
    if (!['solved'].includes(this.S.drawers[id])) return;
    const d = this.drawer(id), out = (d.on_success.stack || []).map(c => `${id}/${c}`).filter(k => !['env', 'gone', 'fused'].includes(this.where(k)) && !this.where(k).startsWith('cab:'));
    if (out.length) return;
    this.S.sealed[id] = true; this.S.envOpen = false; this.S.table = [];
    setTimeout(() => SND.flap(), 200);
    this.clawd.mood.setRest(this.restMood());
    this.save();
  },
  // with the sealed envelope taken in hand at the table
  takeSealed() {
    const id = this.S.env; if (!id || !this.S.sealed[id]) return;
    if (this.S.hand) { this.say('De hand is vol.'); return; }
    this.S.hand = { kind: 'env', id };
    this.S.env = null;
    SND.envOut(); this.clawd.mood.setRest('determined'); this.save();
  },
  // the envelope (or a single card) offered to a drawer
  offerDrawer(id) {
    const h = this.S.hand;
    if (!h) return false;
    if (h.kind === 'env') {
      if (h.id !== id) { this.say(this.F.nee); this.clawd.mood.act('confused', 1.2); SND.nee(); return false; }
      if (!this.S.sealed[id]) { this.say(this.F.not_yet); SND.nee(); return false; }
      this.fileEnvelope(id); return true;
    }
    // single cards: the desk card goes anywhere; the card from the floor back to its own drawer
    if (h.key === 'desk') { this.S.hand = null; this.S.desk = 'filed'; SND.riffle(); SND.drawer(false); this.save(); return true; }
    if (this.S.fired.floor === h.key) {
      if (h.key.split('/')[0] !== id) { this.say(this.F.nee); SND.nee(); return false; }
      this.S.hand = null; this.setLoc(h.key, 'filed'); this.S.fired.floorBack = true; SND.riffle(); this.clawd.mood.act('relieved', 1.6); this.save(); return true;
    }
    this.say(this.F.into_envelope); SND.nee(); return false;
  },
  fileEnvelope(id) {
    const n = Number(id[0]);
    this.S.hand = null; this.S.drawers[id] = 'filed';
    for (const k of this.keysOf(id)) if (this.where(k) === 'env') this.setLoc(k, 'filed');
    this.S.spike++;
    this.S.lastProgress = this.S.played;
    SND.drawer(true, this.cabX(n)); setTimeout(() => SND.riffle(), 350); setTimeout(() => SND.drawer(false, this.cabX(n)), 1300); setTimeout(() => SND.stamp(), 1700);
    this.events.push({ kind: 'filed', id, t: T });
    if (this.cabinetFiled(n)) {
      this.S.active = null;
      this.events.push({ kind: 'complete', n, t: T + 1.6 });
    } else this.clawd.mood.act('proud', 1.6);
    this.save();
  },
  // a single card given to a cabinet (the misfiled one going home)
  offerCabinet(n) {
    const h = this.S.hand;
    if (!h) return false;
    if (h.kind === 'env') return false;
    const key = h.key;
    if (key === 'desk') { this.S.hand = null; this.S.desk = 'filed'; SND.riffle(); this.save(); return true; }
    if (this.S.fired.floor === key) { const home = key.split('/')[0]; if (Number(home[0]) !== n) { this.say(this.F.nee); SND.nee(); return false; } return this.offerDrawer(home); }
    const { d, c } = this.card(key);
    if (d.type === 'P3' && d.lock.card === c.id && d.lock.cabinet === n) {
      this.S.hand = null; this.setLoc(key, 'cab:' + n);
      const os = d.on_success;
      this.addNote(key, this.F.trail_notes[os.trail_note]);
      this.S.unlocked[os.unlock_cabinet] = true;
      if (os.unlock_cabinet === 5) this.S.five = 'trail';
      this.S.intruderIn[n] = key;
      this.events.push({ kind: 'trail', key, n, t: T });
      SND.riffle(); SND.drawer(false, this.cabX(n));
      this.solve(d.id);
      return true;
    }
    this.say(d.type === 'P3' || key.includes('/') ? this.F.nee : this.F.into_envelope);
    this.clawd.mood.act('confused', 1.3); SND.nee();
    return false;
  },
  // a card given to the window, the door or the typewriter
  offerObject(obj) {
    const h = this.S.hand;
    if (!h || h.kind !== 'card') return false;
    const key = h.key, { d, c } = key.includes('/') ? this.card(key) : { d: null, c: null };
    if (!d) { this.say(this.F.nee); SND.nee(); return false; }
    if (obj === 'window' && d.type === 'R2' && this.S.woke[d.id]) {
      if (d.lock.card === c.id) {
        this.S.hand = null; this.setLoc(key, 'sill');
        this.events.push({ kind: 'sill', key, t: T });
        return true;
      }
    }
    if (obj === 'door' && d.type === 'R3' && this.S.woke[d.id]) {
      if (d.lock.card === c.id) {
        this.S.hand = null; this.setLoc(key, 'gone');
        this.events.push({ kind: 'underdoor', key, t: T });
        this.fx.knockUntil = 0;
        this.solve(d.id);
        return true;
      }
    }
    if (obj === 'typewriter' && d.type === 'R4' && this.S.woke[d.id] === 'typed') {
      if (d.lock.bottom_card === c.id) {
        this.S.hand = null;
        this.events.push({ kind: 'typeline', key, t: T });
        return true;
      }
    }
    this.say(this.F.nee); this.clawd.mood.act('confused', 1.3); SND.nee();
    return false;
  },
  // ---------- found cards ----------
  foundAt(loc) {
    for (const [id, f] of Object.entries(this.S.found)) {
      const key = `${id}/${f.card}`;
      if (f.loc === loc && this.where(key) === 'found:' + loc) return key;
    }
    return null;
  },
  pickUp(loc) {
    const key = loc === 'floor' ? this.S.fired.floor : this.foundAt(loc);
    if (!key || (loc === 'floor' && this.where(key) !== 'floor')) return false;
    if (this.S.hand) { this.say('De hand is vol.'); return false; }
    this.setLoc(key, 'hand'); this.S.hand = { kind: 'card', key };
    if (loc === 'lamp') this.fx.wobble = T;
    if (loc === 'bin') { this.S.crumpled = this.S.crumpled || {}; this.S.crumpled[key] = true; }
    this.read([key], 0, 'found');
    this.clawd.mood.act('surprised', 1.2);
    this.save();
    return true;
  },

  // ---------- typing, the clock, the map, the halves, the wheels ----------
  typeWord(word) {
    // the final card first, then whichever drawer has the typewriter as its lock
    if (this.S.five === 'reading') return this.typeFive(word);
    const id = this.S.env;
    const d = id && this.drawer(id);
    if (!d || !['P1', 'P5'].includes(d.type) || this.S.drawers[id] !== 'open') return { ok: null };
    if (!this.S.envOpen) return { ok: null };
    if (opens(d.lock, word)) {
      this.S.lastTyped = word.trim();
      this.S.typed.push(word.trim());
      if (d.type === 'P1') this.S.label = { ...(this.S.label || {}), [id]: word.trim() };
      this.S.wrongTyped = 0;
      this.solve(id);
      return { ok: true, type: d.type };
    }
    this.S.wrongTyped++;
    if (this.S.wrongTyped === 3 && !this.S.fired.typo3) { this.S.fired.typo3 = true; this.say(this.F.reactions.typo3); }
    this.clawd.mood.act('confused', 1.2);
    return { ok: false };
  },
  typeFive(word) {
    const n = normalize(word), name = normalize(this.S.name || '');
    if (!n) return { ok: false };
    const list = FIVE_WORDS.map(normalize);
    if (name) list.push(name, ...name.split(' ').filter(p => p.length > 1));
    const miss = this.S.fiveMiss || 0;
    if (!name || list.includes(n) || miss >= FIVE_NUDGES.length) {
      if (!name) this.S.name = word.trim();
      this.S.fiveWord = word.trim(); this.S.five = 'typed'; this.save(); return { ok: true, five: true };
    }
    this.S.fiveMiss = miss + 1; this.save();
    return { ok: false, nudge: FIVE_NUDGES[miss] };
  },
  setClock(hour) {
    const R = this.cab(1).drawers[2];
    if (R.type !== 'R1' || !this.S.woke[R.id] || this.S.drawers[R.id] !== 'open') return null;
    if (hour === R.lock.hour) {
      const now = this.minutes();
      this.S.clockSet = ((hour * 60 - (now % 720)) % 720 + 720) % 720;
      this.fx.stopped = false; this.fx.stoppedAt = null;
      SND.strike(hour, 1110, 1.1);
      this.solve(R.id);
      this.events.push({ kind: 'digit', t: T + 1.6 + hour * 1.1 });
      return true;
    }
    SND.catchTick(); this.say(this.F.nee); this.clawd.mood.act('confused', 1.2);
    return false;
  },
  pin(lat, lon) {
    const id = this.S.env, d = id && this.drawer(id);
    if (!d || d.type !== 'P2' || this.S.drawers[id] !== 'open' || !this.S.envOpen) return null;
    const L = d.lock, km = haversine(lat, lon, L.target_geo[0], L.target_geo[1]);
    this.S.pins[id] = { lat, lon, ok: km <= L.radius_km };
    if (km <= L.radius_km) { this.S.pins[id] = { lat: L.target_geo[0], lon: L.target_geo[1], ok: true }; this.solve(id); return { ok: true }; }
    this.say(`${this.F.nee} Meer naar het ${compass(lat, lon, L.target_geo[0], L.target_geo[1])}.`);
    this.clawd.mood.act('thinking', 1.2);
    this.save();
    return { ok: false };
  },
  tryHalf(key) {
    const id = this.S.env, d = id && this.drawer(id);
    if (!d || d.type !== 'P4' || this.S.drawers[id] !== 'open') return null;
    const top = this.roleKey(id, 'top');
    if (this.where(top) !== 'table' && this.where(top) !== 'tray' && this.where(top) !== 'hand') { this.say('Eerst het bovenste stuk op tafel.'); return null; }
    if (key === `${id}/${d.lock.bottom_card}`) { this.solve(id); return true; }
    SND.nee(); this.clawd.mood.act('confused', 1); return false;
  },
  turnWheel(i, dir) {
    const w = this.S.wheels; w[i] = ((w[i] - 1 + (dir > 0 ? 1 : 11)) % 12) + 1;
    SND.click();
    const id = this.S.env, d = id && this.drawer(id);
    if (!d || d.type !== 'P6' || this.S.drawers[id] !== 'open') return;
    if (opens(d.lock, w.join('-'))) {
      this.S.kitOpen[id] = T;
      SND.thud(.1, 960, .3);
      setTimeout(() => {
        const inside = this.roleKey(id, 'inside');
        if (inside) this.setLoc(inside, 'env');
        this.solve(id);
        if (inside) this.read([inside], 0, 'digit');
      }, 1100);
      this.save();
    }
  },
  // R4: the bottom half laid on the typewriter, and the machine finishes it
  finishR4(key) {
    const id = key.split('/')[0];
    this.setLoc(key, 'env');
    this.solve(id);
  },

  // ---------- the room locks wake ----------
  wake(id) {
    if (this.S.woke[id]) return;
    const d = this.drawer(id);
    if (['solved', 'filed'].includes(this.S.drawers[id])) return;
    this.S.woke[id] = true;
    this.events.push({ kind: 'wake', id, type: d.type, t: T + .3 });
    this.save();
  },

  // ---------- the leak of the cabinet being worked on ----------
  leakLevel() {
    const n = this.S.active; if (!n) return 0;
    const lv = 1 + Math.floor((this.S.played - this.S.activeSince) / LEAK_STEP) - this.filedCount(n);
    return clamp(lv, 1, 3);
  },

  // ---------- cabinet five ----------
  dialOpen(digits) {
    if (!this.allFiled()) { this.say(this.F.not_yet); return false; }
    const want = [1, 2, 3, 4].map(n => this.S.digits[n]);
    if (want.some(x => x == null)) { this.say(this.F.reactions.five_shut); return false; }
    if (digits.every((v, i) => v === want[i])) { this.S.five = 'open'; this.save(); return true; }
    return false;
  },

  // ---------- words ----------
  say(txt, o) { UI.note(txt, o); },
  cabX(n) { const c = CABS[n - 1]; return c.x + c.w / 2; },
};
