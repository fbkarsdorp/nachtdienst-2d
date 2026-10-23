// audio.js: the room is mostly sound. Everything is synthesised (the clock, its chime, knocks, wind, the typewriter,
// claws on zinc, the lamp's hum) except cards and envelopes, which are Kenney's recordings (CC0), as in Nachtdienst.
'use strict';

const SND = {
  ctx: null, master: null, room: null, dry: null, on: true, started: false, samples: {}, nodes: {}, boost: 1,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.on ? .9 : 0; this.master.connect(c.destination);
    // a small room: a generated impulse response
    const len = c.sampleRate * 1.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 200 ? i / 200 : 1); }
    this.room = c.createConvolver(); this.room.buffer = ir;
    const wet = c.createGain(); wet.gain.value = .32; this.room.connect(wet); wet.connect(this.master);
    this.dry = c.createGain(); this.dry.gain.value = 1; this.dry.connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const names = ['take-1', 'take-2', 'take-3', 'take-4', 'take-5', 'take-6', 'take-7', 'take-8', 'place-1', 'place-2', 'place-3', 'place-4',
      'shove-1', 'shove-2', 'shove-3', 'shove-4', 'out-1', 'out-2', 'flap-1', 'flap-2', 'fan-1', 'fan-2', 'flip-1', 'flip-2', 'flip-3'];
    for (const n of names) { const a = new Audio(`sounds/${n}.mp3`); a.preload = 'auto'; this.samples[n] = a; }
  },
  resume() { this.init(); if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); if (!this.started && this.ctx) { this.started = true; this.ambience(); } },
  toggle() { this.on = !this.on; if (this.master) this.master.gain.setTargetAtTime(this.on ? .9 : 0, this.ctx.currentTime, .05); for (const a of Object.values(this.samples)) a.muted = !this.on; return this.on; },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  out(pan = 0, wet = .6) {
    const c = this.ctx, g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(this.dry); const s = c.createGain(); s.gain.value = wet; p.connect(s); s.connect(this.room); }
    else { g.connect(this.dry); }
    return g;
  },
  // x in the room (0..1920) to a stereo position
  panX(x) { return clamp((x - 960) / 1100, -.85, .85); },
  sample(base, n, vol = .7, rate = 1) {
    if (!this.on) return;
    const a = this.samples[`${base}-${1 + Math.floor(Math.random() * n)}`]; if (!a) return;
    try { const b = a.cloneNode(); b.volume = clamp(vol); b.playbackRate = rate; b.play().catch(() => {}); } catch (e) { /* no sound is fine */ }
  },
  card() { this.sample('take', 8, .55); }, place() { this.sample('place', 4, .6); }, shove() { this.sample('shove', 4, .55); },
  envOut() { this.sample('out', 2, .6); }, flap() { this.sample('flap', 2, .6); }, fan() { this.sample('fan', 2, .55); }, flip() { this.sample('flip', 2, .6); },
  burst({ t = 0, dur = .05, f = 2000, q = 1, type = 'bandpass', vol = .3, pan = 0, wet = .5, attack = .002, curve = 3 } = {}) {
    if (!this.ctx) return; const c = this.ctx, t0 = c.currentTime + t;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = .8 + Math.random() * .4;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    vol *= this.boost; const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.setTargetAtTime(0, t0 + attack, dur / curve);
    s.connect(fl); fl.connect(g); g.connect(this.out(pan, wet)); s.start(t0, Math.random()); s.stop(t0 + dur * 3 + .1);
  },
  tone({ t = 0, f = 440, dur = .3, vol = .2, type = 'sine', pan = 0, wet = .6, attack = .004, glide = 0 } = {}) {
    if (!this.ctx) return; const c = this.ctx, t0 = c.currentTime + t;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0); if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * glide), t0 + dur);
    vol *= this.boost; const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.setTargetAtTime(0, t0 + attack, dur / 4);
    o.connect(g); g.connect(this.out(pan, wet)); o.start(t0); o.stop(t0 + dur * 1.6 + .1);
  },
  // ---------- the clock ----------
  tick(loud = 0, tock = false, x = 1110) {
    const p = this.panX(x), v = .05 + loud * .11;
    this.burst({ dur: .012, f: tock ? 2400 : 3000, q: 2.5, vol: v, pan: p, wet: .35 });
    this.tone({ f: tock ? 1580 : 1870, dur: .045, vol: v * .35, type: 'triangle', pan: p, wet: .5, attack: .001 });
    this.burst({ t: .003, dur: .035, f: tock ? 700 : 850, q: 2, vol: v * .6, pan: p, wet: .55 });
  },
  catchTick(x = 1110) { for (let i = 0; i < 3; i++) this.burst({ t: i * .045, dur: .015, f: 2600 - i * 200, q: 8, vol: .1, pan: this.panX(x) }); },
  bell(t, f, vol = .18, x = 1110) {
    const p = this.panX(x);
    [[1, 1], [2.01, .55], [2.76, .4], [4.07, .22], [5.4, .12]].forEach(([m, a]) => this.tone({ t, f: f * m, dur: 2.8 / Math.sqrt(m), vol: vol * a, pan: p, wet: .9, attack: .003 }));
  },
  strike(n, x = 1110, gap = 1.25) { this.whirr(x); for (let i = 0; i < n; i++) this.bell(.6 + i * gap, 196, .2, x); },
  whirr(x = 1110) { for (let i = 0; i < 10; i++) this.burst({ t: i * .03, dur: .02, f: 1800, q: 6, vol: .035, pan: this.panX(x) }); },
  // ---------- the room ----------
  knock(t = 0, x = 160) { const p = this.panX(x); this.tone({ t, f: 95, dur: .22, vol: .55, pan: p, wet: .7, glide: .6 }); this.burst({ t, dur: .06, f: 380, q: 1.2, type: 'lowpass', vol: .5, pan: p, wet: .7 }); },
  thud(t = 0, x = 960, vol = .5) { const p = this.panX(x); this.tone({ t, f: 60, dur: .35, vol, pan: p, wet: .8, glide: .5 }); this.burst({ t, dur: .12, f: 240, q: .8, type: 'lowpass', vol: vol * .8, pan: p, wet: .8 }); },
  slam(x = 160) { this.thud(0, x, .9); this.burst({ t: .01, dur: .25, f: 700, q: .7, vol: .3, pan: this.panX(x), wet: 1 }); },
  keyTurn(t = 0, x = 160) { for (let i = 0; i < 4; i++) this.burst({ t: t + i * .09 + (i > 1 ? .12 : 0), dur: .012, f: 4200 - i * 300, q: 12, vol: .12, pan: this.panX(x) }); },
  drawer(out = true, x = 960) { const p = this.panX(x); this.burst({ dur: .32, f: out ? 520 : 420, q: 2.2, vol: .16, pan: p, attack: .03, curve: 2 }); this.burst({ t: .3, dur: .05, f: 300, q: 2, vol: .25, pan: p }); },
  stamp() { this.thud(0, 960, .35); this.burst({ dur: .03, f: 1400, q: 2, vol: .15 }); },
  pencil() { for (let i = 0; i < 6; i++) this.burst({ t: i * .07 + Math.random() * .02, dur: .05, f: 5200, q: 3, vol: .03 }); },
  step(x) { this.burst({ dur: .03, f: 260 + Math.random() * 60, q: 1.5, type: 'lowpass', vol: .1, pan: this.panX(x), wet: .3 }); },
  gravel(t, x = 160) { for (let i = 0; i < 5; i++) this.burst({ t: t + i * .018, dur: .02, f: 3000 + Math.random() * 2500, q: 2, vol: .05, pan: this.panX(x), wet: .9 }); },
  key() { this.burst({ dur: .02, f: 3200 + Math.random() * 600, q: 3, vol: .22, wet: .25 }); this.burst({ t: .012, dur: .03, f: 900, q: 2, vol: .14, wet: .25 }); },
  ding() { this.tone({ f: 2093, dur: 1.4, vol: .14, wet: .6 }); this.tone({ f: 4186, dur: .8, vol: .04, wet: .6 }); },
  carriage() { this.burst({ dur: .45, f: 1500, q: 1.4, vol: .1, attack: .02, curve: 1.5 }); this.burst({ t: .44, dur: .05, f: 600, q: 2, vol: .2 }); },
  nee() { this.burst({ dur: .06, f: 500, q: 3, vol: .12 }); this.tone({ f: 150, dur: .12, vol: .06, glide: .8 }); },
  good() { this.tone({ f: 523, dur: .5, vol: .06, type: 'triangle' }); this.tone({ t: .09, f: 784, dur: .7, vol: .05, type: 'triangle' }); },
  squeak(x = 1330) { const c = this.ctx; if (!c) return; this.tone({ f: 1250, dur: .55, vol: .05, pan: this.panX(x), glide: 1.25, type: 'triangle' }); },
  scratch(x = 1330, n = 4) { for (let i = 0; i < n; i++) this.burst({ t: i * .11, dur: .09, f: 5200, q: 2.5, vol: .07, pan: this.panX(x), attack: .02, curve: 1.6 }); },
  breath(x = 1330, dur = 1.6) { this.burst({ dur, f: 420, q: .7, type: 'lowpass', vol: .12, pan: this.panX(x), attack: dur * .4, curve: 1.5 }); },
  riffle() { for (let i = 0; i < 9; i++) this.burst({ t: i * .045, dur: .03, f: 3500 + i * 120, q: 2, vol: .06 }); },
  click() { this.burst({ dur: .015, f: 2600, q: 5, vol: .12 }); },
  creak(x = 160) { this.tone({ f: 180, dur: 1.4, vol: .05, type: 'sawtooth', pan: this.panX(x), glide: 1.6, attack: .3 }); },
  // ---------- ambience: room tone, wind at the glass, the lamp ----------
  ambience() {
    const c = this.ctx;
    const loop = (f, q, vol, type = 'lowpass') => {
      const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = c.createGain(); g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(this.dry); s.start(); return { s, fl, g };
    };
    this.nodes.tone = loop(180, .5, .025);
    this.nodes.wind = loop(420, .9, .0, 'bandpass');
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .07; lg.gain.value = 140; lfo.connect(lg); lg.connect(this.nodes.wind.fl.frequency); lfo.start();
    const hum = c.createOscillator(), hg = c.createGain(); hum.type = 'sawtooth'; hum.frequency.value = 50; hg.gain.value = 0;
    const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 400; hum.connect(hf); hf.connect(hg); hg.connect(this.dry); hum.start();
    this.nodes.hum = hg;
  },
  setWind(k) { if (this.nodes.wind) this.nodes.wind.g.gain.setTargetAtTime(.012 + .05 * k, this.ctx.currentTime, .8); },
  // (a narrow band of noise carries little energy, so most noise-based sounds need lifting; measured, peak dBFS)
  setHum(k) { if (this.nodes.hum) this.nodes.hum.gain.setTargetAtTime(.012 * k, this.ctx.currentTime, .03); },
};
const LEVELS = { tick: 13.5, catchTick: 22, whirr: 24, keyTurn: 13, drawer: 16, pencil: 13, step: 18, gravel: 9, key: 11, carriage: 14,
  nee: 10, good: 6, squeak: 11, scratch: 16, breath: 14, riffle: 14, click: 17, creak: 7 };
for (const [k, db] of Object.entries(LEVELS)) {
  const f = SND[k];
  SND[k] = function (...a) { const b = this.boost; this.boost = b * Math.pow(10, db / 20); try { return f.apply(this, a); } finally { this.boost = b; } };
}
