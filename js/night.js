// night.js: the director. Every frame it moves the night on: the clock ticks (too loud, and missing beats, while
// Voortekenen leaks), the window mists, the wolf goes along the ledge, the lamp flickers; room locks wake and do what
// they do; filed cabinets play their enactment. Nobody explains any of it.
'use strict';

const N = {
  nextBeat: 0, beatN: 0, nextMiss: 0, nextWolf: 0, nextFlick: 0, flickEnd: 0, knock: null, lastMinute: 0, doorWait: 0, wasActive: null,
  update(dt) {
    const S = G.S; if (!S) return;
    const fx = G.fx, playing = !['title', 'intro', 'final'].includes(G.view) && !S.ended;
    if (playing && !document.hidden) S.played += dt;
    stepTweens();
    this.events();
    if (!playing && !S.ended) return;
    const n = S.active, lv = G.leakLevel();
    // ---------- the clock ----------
    if (T >= this.nextBeat) {
      const uneven = n === 1 ? (hash(this.beatN * 1.7) - .5) * .18 * lv : 0;
      this.nextBeat = T + 1 + uneven; this.beatN++;
      const silent = fx.stopped || T < fx.silentUntil || S.ended === 'shut' && fx.lampOff > .5;
      if (!silent) {
        const miss = n === 1 && T >= this.nextMiss && this.nextMiss > 0;
        if (miss) { this.missBeat(lv); this.nextMiss = T + [40, 40, 20, 10][lv] * (.8 + hash(this.beatN) * .4); }
        else SND.tick(n === 1 ? .35 + lv * .22 : (fx.softTick ? -.25 : 0), this.beatN % 2 === 1);
      }
      if (n === 1 && this.nextMiss === 0) this.nextMiss = T + [40, 40, 20, 10][lv];
    }
    if (n !== 1) this.nextMiss = 0;
    // ---------- the window mists (Witte wieven), and stays misted while its lock is awake ----------
    const r2 = G.cab(2).drawers[2], r2awake = S.woke[r2.id] && !['solved', 'filed'].includes(S.drawers[r2.id]);
    let mistWant = n === 2 ? lv : 0;
    if (r2awake && !fx.sillCard) mistWant = 3;
    if (fx.mistHold != null) mistWant = fx.mistHold;
    fx.mistLevel = lerp(fx.mistLevel, mistWant, 1 - Math.exp(-dt * .5));
    if (r2awake && !fx.writing) fx.writing = { text: r2.lock.text, t: T - 9 };
    SND.setWind(.3 + (G.view === 'window' ? .6 : 0) + (n === 2 ? lv * .2 : 0));
    // ---------- the wolf on the ledge (Weerwolven) ----------
    if (n === 3 && !fx.wolf && T > this.nextWolf) {
      if (this.nextWolf === 0) this.nextWolf = T + 12;
      else {
        this.wolf(lv);
        this.nextWolf = T + [90, 90, 45, 20][lv] * (.85 + Math.random() * .3);
      }
    }
    if (n !== 3) this.nextWolf = 0;
    // ---------- the lamp (Spoken) ----------
    let flick = 1;
    if (n === 4) {
      if (T > this.nextFlick) { this.flickEnd = T + .25 + Math.random() * .6; this.nextFlick = this.flickEnd + [[8, 14], [8, 14], [4, 8], [1.5, 4]][lv].reduce((a, b) => a + Math.random() * (b - a)); }
      if (T < this.flickEnd) flick = Math.random() < .5 ? .15 + Math.random() * .3 : 1;
      // it dims while you move, more at each step
      const moving = G.clawd.walking || TR.kind;
      fx.dim = lerp(fx.dim || 1, moving ? [1, .4, .25, .1][lv] : 1, 1 - Math.exp(-dt * (moving ? 2.5 : .5)));
      flick *= fx.dim;
    } else this.nextFlick = T + 6;
    fx.flick = flick;
    // a steady lamp is silent; one that flickers buzzes, and crackles as it catches
    const flickering = fx.lampOff <= .5 && flick < .8;
    SND.setHum(flickering ? 1 : 0);
    if (flickering && !this.wasFlick) SND.burst({ dur: .06, f: 3800, q: 1.5, vol: .05, pan: SND.panX(ROOM.lamp.cx), wet: .3 });
    this.wasFlick = flickering;
    // ---------- knocking at the door (R3) ----------
    const r3 = G.cab(3).drawers[2], r3awake = S.woke[r3.id] && !['solved', 'filed'].includes(S.drawers[r3.id]);
    if (r3awake && T > (this.nextKnock || 0)) {
      const k = r3.lock.n;
      for (let i = 0; i < k; i++) setTimeout(() => { SND.knock(0, 160); fx.shiver = 1; G.clawd.mood.act('scared', .6); }, i * 520);
      caption('(er wordt op de deur geklopt)', 2 + k * .52);
      this.nextKnock = T + 30;
    }
    if (!r3awake) this.nextKnock = 0;
    fx.shiver = Math.max(0, (fx.shiver || 0) - dt * 3);
    // ---------- the typewriter typing by itself (R4) ----------
    const tw = fx.tw;
    if (tw && !tw.done) {
      const before = Math.floor(tw.shown);
      tw.shown = Math.min(tw.text.length, tw.shown + dt * 16);
      if (Math.floor(tw.shown) > before && Math.floor(tw.shown) % 2 === 0) SND.key();
      if (tw.shown >= tw.text.length && !tw.ended) {
        tw.ended = true;
        setTimeout(() => { SND.carriage(); tw.extra.push({ txt: G.F.machine_continued, seed: 70 }); tw.done = true; G.S.woke[tw.id] = 'typed'; G.save(); }, 700);
      }
    }
    // ---------- the leak's jolts on cabinet I ----------
    for (const k in fx.jolt) for (const i in fx.jolt[k]) { fx.jolt[k][i] *= Math.exp(-dt * 6); if (fx.jolt[k][i] < .2) delete fx.jolt[k][i]; }
    // ---------- reactions ----------
    if (n && S.played - S.lastProgress > 240 && !S.fired['stalled' + n]) { S.fired['stalled' + n] = true; G.say(G.F.reactions.stalled); }
    // midnight strikes regardless
    const m = Math.floor(G.minutes());
    if (m >= 24 * 60 && !S.fired.midnight) { S.fired.midnight = true; SND.strike(12, 1110, 1.1); G.say(G.F.midnight); }
    // ---------- standing at the door, with four cabinets done ----------
    if (G.allFiled() && !['open', 'reading', 'typed'].includes(S.five) && !S.ended && (G.view === 'door' || (G.view === 'room' && Math.abs(G.clawd.x - STATIONS.door.x) < 40 && !G.clawd.walking))) {
      this.doorWait += dt;
      if (this.doorWait > 60) { this.doorWait = 0; endingShut(); }
    } else this.doorWait = 0;
    // mood follows the leak; left alone, the assistant hums, then nods off
    const idle = T - (G.lastInput || 0), idleMood = lv ? null : idle > 70 ? 'sleepy' : idle > 30 ? 'hum' : null;
    const want = idleMood || G.restMood();
    if (this.wasActive !== lv || this.idleMood !== idleMood) { this.wasActive = lv; this.idleMood = idleMood; if (!G.reader) G.clawd.mood.setRest(want); }
    if (Math.floor(S.played) % 10 === 0 && !this.saved) { this.saved = true; G.save(); } else if (Math.floor(S.played) % 10) this.saved = false;
  },
  missBeat(lv) {
    SND.catchTick(); caption('(de klok hapert)', 1.6);
    // the drawers are knocked out of their runners, each on its own
    const fx = G.fx; fx.jolt[1] = fx.jolt[1] || {};
    const which = lv >= 3 ? [0, 1, 2] : lv === 2 ? [0, 1] : [Math.floor(Math.random() * 3)];
    which.forEach((i, j) => setTimeout(() => { fx.jolt[1][i] = 6 + Math.random() * 6; SND.burst({ dur: .04, f: 300, q: 2, vol: .15, pan: SND.panX(455) }); }, j * 140 + Math.random() * 80));
    if (G.view === 'room' || G.view === 'cabinet') G.clawd.mood.act('surprised', .7);
  },
  wolf(lv, o = {}) {
    const fx = G.fx;
    fx.wolf = { t: T, dur: o.dur || 7, stop: o.stop ?? (lv >= 3 ? 3 : lv >= 2 ? 1.6 : 0), dir: 1 };
    setTimeout(() => { SND.scratch(1330, 5); caption('(gekras op het zink)'); }, 1200); setTimeout(() => SND.scratch(1330, 4), 3800);
    if (fx.wolf.stop) setTimeout(() => { SND.breath(1330, fx.wolf ? fx.wolf.stop : 1.5); caption('(iets ademt tegen het raam)'); }, (fx.wolf.dur * .4) * 1000);
    // claw marks come on the cabinet as it passes
    setTimeout(() => { SND.scratch(791, 3); }, 2600);
    if (['room', 'window'].includes(G.view)) setTimeout(() => G.clawd.mood.act('scared', 1.8), 1800);
  },
  // ---------- things that happen once ----------
  events() {
    const S = G.S, fx = G.fx;
    for (const e of G.events.slice()) {
      if (e.t > T || e.done) continue;
      e.done = true;
      if (e.kind === 'wake') this.woke(e);
      else if (e.kind === 'trail') { G.events.push({ kind: 'trailShow', key: e.key, t: T }); G.clawd.mood.act('surprised', 1.2); }
      else if (e.kind === 'sill') this.sill(e);
      else if (e.kind === 'underdoor') { SND.shove(); fx.shiver = 0; setTimeout(() => this.showDigit(), 1400); }
      else if (e.kind === 'typeline') this.typeline(e);
      else if (e.kind === 'filed') this.filedAnim(e);
      else if (e.kind === 'complete') this.complete(e.n);
      else if (e.kind === 'digit') this.showDigit();
      if (e.kind !== 'trailShow') G.events = G.events.filter(x => x !== e);
    }
    void S;
  },
  woke(e) {
    const fx = G.fx, d = G.drawer(e.id), n = Number(e.id[0]);
    if (d.type === 'R1') {
      // the loud ticking stops dead; the head turns to the clock
      fx.stopped = true; fx.stoppedAt = G.wallMinutes();
      caption('(de klok tikt niet meer)');
      look('clock');
    } else if (d.type === 'R2') {
      fx.writing = { text: d.lock.text, t: T, slow: true }; SND.squeak(1330); setTimeout(() => SND.squeak(1330), 700);
      caption('(een vinger piept over het glas)');
      look('window');
    } else if (d.type === 'R3') {
      this.nextKnock = T + .5; look('door');
    } else if (d.type === 'R4') {
      startSelfTyping(d); look('typewriter');
      caption('(de schrijfmachine tikt, uit zichzelf)', 4);
    }
    void n;
  },
  sill(e) {
    // the card lies on the sill; the name fades, the mist goes down a step, and a figure comes, written from outside
    const fx = G.fx, key = e.key, id = key.split('/')[0], d = G.drawer(id);
    fx.sillCard = { key, t: T };
    if (fx.writing) fx.writing.fadeT = T;
    fx.mistHold = 2;
    setTimeout(() => { SND.squeak(1330); fx.writing = { text: String(d.on_success.digit.value), t: T, slow: true, digit: true }; G.clawd.mood.act('scared', 1.4); }, 2200);
    setTimeout(() => {
      // the card comes back damp
      G.S.damp[key] = true; fx.sillCard = null; G.setLoc(key, 'env');
      G.solve(id); fx.mistHold = null;
      setTimeout(() => { if (fx.writing && fx.writing.digit) fx.writing.fadeT = T; }, 6000);
      setTimeout(() => this.showDigit(), 600);
    }, 5200);
  },
  typeline(e) {
    const fx = G.fx, key = e.key, id = key.split('/')[0], d = G.drawer(id);
    const tw = fx.tw || { id, text: '', shown: 0, done: true, extra: [] }; fx.tw = tw;
    G.setLoc(key, 'machine');
    const lines = [d.on_success.type_line || 'Verteller: de vorige assistent.', `— ${d.on_success.digit.word} —`];
    let delay = 600;
    SND.carriage();
    lines.forEach((ln, li) => {
      for (let i = 1; i <= ln.length; i++) setTimeout(() => { tw.extra[tw.base + li] = { txt: ln.slice(0, i), seed: 80 + li }; if (i % 2) SND.key(); }, delay + i * 70);
      delay += ln.length * 70 + 700;
      setTimeout(() => SND.carriage(), delay - 300);
    });
    tw.base = tw.extra.length;
    setTimeout(() => { SND.ding(); G.finishR4(key); setTimeout(() => this.showDigit(), 900); }, delay + 200);
  },
  // a room lock is open: the card it turned on comes up, with J.J.V.'s pencil
  showDigit() {
    const k = G.S.pendingDigitCard; if (!k) return;
    G.S.pendingDigitCard = null;
    G.read([k], 0, 'digit');
  },
  filedAnim(e) {
    // the drawer slides out, the cards riffle in behind the divider, it is pushed shut; the envelope is stamped
    G.fx.filing = { id: e.id, t: T };
    G.clawd.mood.act('proud', 1.6);
  },
  // the last drawer of a cabinet filed: its leak clears off the cabinet, then the room's half stops and the enactment plays
  complete(n) {
    const fx = G.fx;
    fx.clearing = { n, t: T };
    if (n === 4) fx.frostClear = { n, t: T };
    if (n === 2) fx.mistClear = T + 2;
    G.busy = true;
    setTimeout(() => {
      const go = () => {
        G.busy = true;
        const st = { 1: 'clock', 2: 'window', 3: 'window', 4: 'table' }[n];
        if (n === 1) {
          fx.silentUntil = T + 6; look('clock', 6); caption('(stilte)', 5);
          setTimeout(() => { fx.softTick = true; G.clawd.mood.act('relieved', 2); }, 6000);
          setTimeout(() => this.doneEnact(n), 7500);
        } else if (n === 2) {
          look('window', 5); fx.mistHold = 0;
          setTimeout(() => animate(fx, 'reflect', 0, 1, .5), 1800);
          setTimeout(() => animate(fx, 'reflect', 1, 0, .6), 3900);
          setTimeout(() => { fx.mistHold = null; fx.writing = null; this.doneEnact(n); }, 5200);
        } else if (n === 3) {
          look('window', 9);
          this.wolf(3, { dur: 9, stop: 4.5 });
          setTimeout(() => { for (let i = 0; i < 3; i++) setTimeout(() => { SND.knock(0, 160); fx.shiver = 1; }, i * 600); caption('(drie klopjes op de deur)'); look('door', 3); }, 9800);
          setTimeout(() => { for (let i = 0; i < 8; i++) SND.gravel(i * .5, 100); caption('(voetstappen over grind, weg)', 4); }, 12000);
          setTimeout(() => this.doneEnact(n), 16000);
        } else if (n === 4) {
          animate(fx, 'lampOff', 0, 1, .15); SND.setHum(0);
          G.clawd.mood.act('scared', 3);
          setTimeout(() => { animate(fx, 'lampOff', 1, 0, 1.2); G.S.desk = 'table'; G.save(); }, 3200);
          setTimeout(() => this.doneEnact(n), 5200);
        }
        void st;
      };
      if (G.view !== 'room') openView('room', null, null, go); else go();
    }, 1500);
  },
  doneEnact(n) {
    G.busy = false; G.S.enacted[n] = true; G.fx.clearing = null; G.fx.frostClear = null; G.fx.mistClear = null;
    G.clawd.mood.setRest(G.restMood());
    if (G.allFiled()) setTimeout(() => G.say(G.S.five === 'trail' ? 'Twaalf enveloppen. Alles ingevoegd.' : 'Twaalf enveloppen.'), 800);
    G.save();
  },
};
// the head turns of its own accord
function look(what, secs = 2.4) {
  const c = G.clawd, tx = { clock: ROOM.clock.cx, window: 1330, door: 160, typewriter: 1180, table: 930 }[what] ?? 960;
  const dir = tx > c.x ? 1 : -1, far = Math.abs(tx - c.x) > 120;
  c.look = { view: far ? 'q' : 'back', flip: dir < 0, until: T + secs };
  c.mood.act('surprised', Math.min(1.4, secs));
}
