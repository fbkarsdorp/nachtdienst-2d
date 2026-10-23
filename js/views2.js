// views2.js: the wall map, the typewriter, the clock, the window, the door, cabinet five, the box of loose halves,
// the strongbox; the title, and the two mornings.
'use strict';

// ---------- the wall map ----------
const MAPV = { x: 470, y: 40, w: 980, h: 1010, mx: 520, my: 100, mw: 880, mh: 900 };
function mapProj() {
  const B = MAP_BOX, kx = Math.cos(52.15 * Math.PI / 180), s = Math.min(MAPV.mw / ((B.lon1 - B.lon0) * kx), MAPV.mh / (B.lat1 - B.lat0));
  const ox = MAPV.mx + (MAPV.mw - (B.lon1 - B.lon0) * kx * s) / 2, oy = MAPV.my;
  return { s, kx, ox, oy, xy: (lat, lon) => [ox + (lon - B.lon0) * kx * s, oy + (B.lat1 - lat) * s], ll: (x, y) => [B.lat1 - (y - oy) / s, B.lon0 + (x - ox) / (kx * s)] };
}
const PROV_TINT = { Groningen: '#E6C9A8', Friesland: '#D9DCB0', Drenthe: '#E9D9A4', Overijssel: '#E3C0B0', Gelderland: '#CFD9AE', Utrecht: '#E8CFA0',
  'Noord-Holland': '#D6CFA8', 'Zuid-Holland': '#E5D3B1', Zeeland: '#D3D6B8', 'Noord-Brabant': '#E7C8A5', Limburg: '#D5D0A7', Flevoland: '#E2DCC0' };
const CITIES = [['Amsterdam', 52.37, 4.9], ['Rotterdam', 51.92, 4.48], ["'s-Gravenhage", 52.08, 4.3], ['Utrecht', 52.09, 5.12], ['Groningen', 53.22, 6.57],
  ['Leeuwarden', 53.2, 5.79], ['Zwolle', 52.51, 6.09], ['Arnhem', 51.98, 5.91], ['Nijmegen', 51.84, 5.86], ["'s-Hertogenbosch", 51.69, 5.3], ['Eindhoven', 51.44, 5.48],
  ['Maastricht', 50.85, 5.69], ['Middelburg', 51.5, 3.61], ['Assen', 52.99, 6.56], ['Haarlem', 52.38, 4.64], ['Alkmaar', 52.63, 4.75], ['Den Helder', 52.96, 4.76],
  ['Enschede', 52.22, 6.89], ['Breda', 51.59, 4.78], ['Venlo', 51.37, 6.17], ['Deventer', 52.25, 6.16], ['Leiden', 52.16, 4.49], ['Harlingen', 53.17, 5.42],
  ['Emmen', 52.78, 6.9], ['Sneek', 53.03, 5.66], ['Meppel', 52.7, 6.19], ['Zutphen', 52.14, 6.2], ['Dokkum', 53.33, 6.0], ['Winterswijk', 51.97, 6.72]];
function paintMapBig() {
  const P = mapProj(), path = (ring) => { C.beginPath(); ring.forEach(([lon, lat], i) => { const [x, y] = P.xy(lat, lon); i ? C.lineTo(x, y) : C.moveTo(x, y); }); C.closePath(); };
  boilSeed('mapbig');
  // the wall, the board, the sheet
  paint(rectPts(-20, -20, W + 40, H + 40), { wash: PAL.wall, ink: null });
  paint(rectPts(MAPV.x - 30, MAPV.y - 26, MAPV.w + 60, MAPV.h + 52, 1.5), { wash: '#4F3B2A', ink: PAL.ink, sw: 1 });
  C.drawImage(paperSheet(MAPV.w, MAPV.h, '#E9DFC4', 12, 1), MAPV.x, MAPV.y, MAPV.w, MAPV.h);
  C.save(); C.beginPath(); C.rect(MAPV.mx - 30, MAPV.my - 20, MAPV.mw + 60, MAPV.mh + 30); C.clip();
  C.fillStyle = 'rgba(150,170,175,.3)'; C.fillRect(MAPV.mx - 30, MAPV.my - 20, MAPV.mw + 60, MAPV.mh + 30);
  const land = [...MAPGEO.provinces.flatMap(p => p.rings), ...MAPGEO.neighbours.flatMap(n => n.rings)];
  C.lineJoin = 'round';
  for (let i = 7; i >= 1; i--) { C.lineWidth = i * 7; C.strokeStyle = `rgba(70,95,110,${.03 + (7 - i) * .006})`; for (const r of land) { path(r); C.stroke(); } }
  for (const n of MAPGEO.neighbours) for (const r of n.rings) { path(r); C.fillStyle = '#D9CEB2'; C.fill(); }
  for (const p of MAPGEO.provinces) for (const r of p.rings) { path(r); C.fillStyle = PROV_TINT[p.name] || '#E0D4B0'; C.fill(); }
  for (const p of MAPGEO.provinces) { C.save(); for (const r of p.rings) path(r); C.clip(); for (const r of p.rings) { path(r); C.lineWidth = 16; C.strokeStyle = 'rgba(160,110,60,.12)'; C.stroke(); } C.restore(); }
  for (const w of MAPGEO.water) for (const r of w.rings) { path(r); C.fillStyle = 'rgba(150,170,175,.55)'; C.fill(); }
  C.strokeStyle = 'rgba(80,120,150,.55)'; C.lineWidth = 1.6;
  for (const rv of MAPGEO.rivers) for (const line of (rv.lines || rv.rings || [])) { C.beginPath(); line.forEach(([lon, lat], i) => { const [x, y] = P.xy(lat, lon); i ? C.lineTo(x, y) : C.moveTo(x, y); }); C.stroke(); }
  C.setLineDash([12, 5, 3, 5]); C.lineWidth = 1.8; C.strokeStyle = 'rgba(80,46,30,.55)';
  for (const p of MAPGEO.provinces) for (const r of p.rings) { path(r); C.stroke(); }
  C.setLineDash([]); C.lineWidth = 1.3; C.strokeStyle = 'rgba(40,36,30,.6)';
  for (const p of MAPGEO.provinces) for (const r of p.rings) { path(r); C.stroke(); }
  // every story in the archive with a place: a faint dot
  C.fillStyle = 'rgba(90,40,50,.28)';
  for (let i = 0; i < DOTS.length; i += 2) { const [x, y] = P.xy(DOTS[i], DOTS[i + 1]); C.fillRect(x - 1, y - 1, 2.2, 2.2); }
  // cities
  for (const [name, lat, lon] of CITIES) {
    const [x, y] = P.xy(lat, lon);
    C.fillStyle = '#3A3028'; C.beginPath(); C.arc(x, y, 3.2, 0, TAU); C.fill();
    C.font = `15px ${FONT.fell}`; C.fillStyle = 'rgba(40,32,26,.85)'; C.fillText(name, x + 6, y - 4);
  }
  C.restore();
  // the cartouche
  handText('NEDERLAND', MAPV.x + 80, MAPV.y + 70, 40, '#4A3A2A', { font: FONT.fellSC, j: 0 });
  handText('met de plaatsen der verhalen', MAPV.x + 82, MAPV.y + 100, 22, '#6A5A46', { font: FONT.fell, j: 0 });
  handText('Centraal Sagenarchief', MAPV.x + MAPV.w - 40, MAPV.y + MAPV.h - 24, 18, '#6A5A46', { font: FONT.fell, align: 'right', j: 0 });
  for (const [px, py] of [[MAPV.x + 12, MAPV.y + 12], [MAPV.x + MAPV.w - 12, MAPV.y + 12], [MAPV.x + 12, MAPV.y + MAPV.h - 12], [MAPV.x + MAPV.w - 12, MAPV.y + MAPV.h - 12]]) paint(ellPts(px, py, 7, 7, 10), { wash: '#B8322A', tex: 0, ink: PAL.ink, sw: .5 });
}
V.map = {
  enter() { this.hover = null; this.flash = null; },
  draw() {
    const S = G.S, P = mapProj();
    stateLayer('mapbig', 'mapbig', 0, 0, W, H, paintMapBig).blit();
    const id = S.env, d = id && G.drawer(id), active = d && d.type === 'P2' && S.drawers[id] === 'open' && S.envOpen;
    const pins = mapPins(id);
    const drawPins = (f = (x, y) => [x, y]) => {
      if (pins.helpers.length > 1) {
        boilSeed('pencil');
        for (let i = 0; i < pins.helpers.length; i++) { const a = pins.helpers[i], b = pins.helpers[(i + 1) % pins.helpers.length]; pencilLine([f(...P.xy(a.lat, a.lon)), f(...P.xy(b.lat, b.lon))], 1.3, '#3A3540', .6); }
      }
      pins.helpers.forEach((h, i) => drawPin(f(...P.xy(h.lat, h.lon)), '#8D8A94', h.name, 'h' + i));
      pins.mine.forEach((m, i) => drawPin(f(...P.xy(m.lat, m.lon)), m.ok ? '#25212A' : PAL.red, m.label, 'm' + i));
    };
    drawPins();
    // the pointer: the nearest place, and a loupe
    const [mx, my] = UI.mouse, inside = mx > MAPV.mx - 20 && mx < MAPV.mx + MAPV.mw + 20 && my > MAPV.my && my < MAPV.my + MAPV.mh;
    if (inside && !G.reader) {
      const [lat, lon] = P.ll(mx, my);
      if (!this.hover || Math.hypot(this.hover.mx - mx, this.hover.my - my) > 3) {
        const np = nearestPlace(lat, lon);
        this.hover = { mx, my, np, n: np && np.km < 8 ? storiesNear(np.lat, np.lon, 5) : 0 };
      }
      drawLoupe(P, mx, my, drawPins);
      const np = this.hover.np;
      UI.hit({ r: [MAPV.mx - 20, MAPV.my, MAPV.mw + 40, MAPV.mh], cursor: active ? 'crosshair' : 'zoom-in',
        tip: np && np.km < 10 ? `${np.name}${this.hover.n ? ` · ${this.hover.n} ${this.hover.n === 1 ? 'verhaal' : 'verhalen'}` : ''}` : null,
        onClick: () => { if (UI.touch && active && !(this.lastTap && Math.hypot(this.lastTap[0] - mx, this.lastTap[1] - my) < 40 && T - this.lastTap[2] < 4)) { this.lastTap = [mx, my, T]; return; } this.lastTap = null; if (active) { SND.click(); const r = G.pin(lat, lon); if (r && r.ok) { this.flash = T; SND.good(); } } else G.say(d && d.type === 'P2' ? 'Eerst de envelop open.' : 'Er hoeft niets op de kaart.'); } });
    }
    nightGrade(400, 200, 1, { r: 1900 });
    drawPeek({ x: 1780, u: 32 });
    backButton(() => openView('room'));
    if (active) handText('Prik de plaats van de kaart zonder plaats.', MAPV.x + MAPV.w / 2, MAPV.y + MAPV.h + 30, 26, 'rgba(240,230,210,.0)', { font: FONT.hand, align: 'center', j: 0 });
  },
};
// the pins for the map: helpers of the drawer in hand (grey), and every pin put in tonight
function mapPins(id) {
  const S = G.S, helpers = [], mine = [];
  for (const dd of G.allDrawers().filter(x => x.type === 'P2')) {
    if (dd.id === id) for (const c of dd.cards.filter(x => x.role === 'helper' && x.geo)) {
      if (['tray', 'table', 'hand'].includes(G.where(`${dd.id}/${c.id}`))) helpers.push({ lat: c.geo[0], lon: c.geo[1], name: c.render.place });
    }
    const pin = S.pins[dd.id];
    if (pin) mine.push({ lat: pin.lat, lon: pin.lon, ok: pin.ok, label: pin.ok ? (S.fill[`${dd.id}/${dd.on_success.fill_field.card}`] || {}).place : null });
  }
  return { helpers, mine };
}
function drawPin([x, y], col, label, key) {
  boilSeed('pin' + key);
  inkLine([[x, y], [x + 7, y - 16]], .6, '#55525C', 'inkfine', 0);
  paint(ellPts(x + 8, y - 18, 8, 8, 12), { wash: col, tex: 0, ink: PAL.ink, sw: .5 });
  paint(ellPts(x + 6, y - 21, 2.5, 2.5, 8), { wash: '#FFFFFF', washOp: 140, tex: 0, pool: 0, ink: null });
  if (label) {
    C.font = `600 22px ${FONT.hand}`; const w = C.measureText(label).width + 16;
    paint(rectPts(x + 18, y - 44, w, 28, .6), { wash: '#F4EEDC', tex: 0, ink: PAL.ink, sw: .35 });
    handText(label, x + 26, y - 23, 22, '#3A3248', { font: FONT.hand, weight: 600, j: 0 });
  }
}
// a magnifying glass: the map three times larger, with the villages named
function drawLoupe(P, mx, my, pinsFn) {
  const r = 120, z = 3.2, src = RL.mapbig.get(BOILN % 3);
  C.save(); C.beginPath(); C.arc(mx, my, r, 0, TAU); C.clip();
  C.drawImage(src, (mx - r / z) * RS, (my - r / z) * RS, (2 * r / z) * RS, (2 * r / z) * RS, mx - r, my - r, 2 * r, 2 * r);
  const [lat0, lon0] = P.ll(mx - r / z, my - r / z), [lat1, lon1] = P.ll(mx + r / z, my + r / z);
  C.font = `15px ${FONT.fell}`; C.fillStyle = 'rgba(30,24,20,.9)';
  // villages first, then hamlets; a name only where it does not run into another
  const cand = PLACES.filter(p => !(p[1] > lat0 || p[1] < lat1 || p[2] < lon0 || p[2] > lon1)).sort((a, b) => b[4] - a[4]);
  const boxes = [];
  for (const p of cand) {
    const [x, y] = P.xy(p[1], p[2]), sx = mx + (x - mx) * z, sy = my + (y - my) * z, w = C.measureText(p[0]).width;
    C.beginPath(); C.arc(sx, sy, 2.2, 0, TAU); C.fill();
    const b = [sx + 4, sy - 16, w + 4, 16];
    if (boxes.length < 14 && !boxes.some(o => b[0] < o[0] + o[2] && o[0] < b[0] + b[2] && b[1] < o[1] + o[3] && o[1] < b[1] + b[3])) { boxes.push(b); C.fillText(p[0], sx + 5, sy - 3); }
  }
  if (pinsFn) pinsFn((x, y) => [mx + (x - mx) * z, my + (y - my) * z]);
  C.restore();
  boilSeed('loupe');
  inkLine(ellPts(mx, my, r, r, 40).concat([[mx + r, my]]), 2.6, '#2B2233', 'ink', 0);
  paint(ellPts(mx, my, r + 8, r + 8, 40), { ink: PAL.brassDk, sw: 2.2 });
  inkLine([[mx + r * .72, my + r * .72], [mx + r * 1.2, my + r * 1.25]], 6, '#3A2A1C', 'ink', 0);
  C.save(); C.globalAlpha = .15; C.fillStyle = '#fff'; C.beginPath(); C.ellipse(mx - r * .4, my - r * .45, r * .3, r * .15, -.6, 0, TAU); C.fill(); C.restore();
  // crosshair
  C.save(); C.strokeStyle = 'rgba(184,50,42,.7)'; C.lineWidth = 1.5; C.beginPath(); C.moveTo(mx - 10, my); C.lineTo(mx + 10, my); C.moveTo(mx, my - 10); C.lineTo(mx, my + 10); C.stroke(); C.restore();
}

// ---------- the typewriter ----------
const TWV = { cx: 960, lineY: 530, lh: 46, size: 34 };
V.typewriter = {
  enter() {
    this.line = ''; this.offset = 0; this.cr = -9;
    if (!this.paper) this.paper = [];
    focusKeys(true);
    const r4 = activeR4();
    if (r4 && G.S.woke[r4.id] && !G.fx.tw) {
      startSelfTyping(r4);
      // already typed before the night was resumed: it stands on the paper as it was left
      if (G.S.woke[r4.id] === 'typed') Object.assign(G.fx.tw, { shown: G.fx.tw.text.length, done: true, ended: true, extra: [{ txt: G.F.machine_continued, seed: 70 }] });
    }
  },
  leave() { focusKeys(false); },
  purpose() {
    const S = G.S;
    if (S.five === 'reading') return { kind: 'five', label: 'kaart uit kast V' };
    const id0 = S.env, d0 = id0 && G.drawer(id0);
    if (d0 && ['P1', 'P5'].includes(d0.type) && S.drawers[id0] === 'open') return { kind: d0.type, label: d0.type === 'P1' ? `etiket voor la ${id0}` : `samenvatting, la ${id0}`, id: id0 };
    const r4 = activeR4(); if (r4 && S.woke[r4.id]) return { kind: 'r4', label: `la ${r4.id}`, id: r4.id };
    // what the machine typed by itself stays on the paper until its envelope is filed
    if (G.fx.tw && S.drawers[G.fx.tw.id] === 'solved') return { kind: 'r4', label: `la ${G.fx.tw.id}`, id: G.fx.tw.id, done: true };
    const id = S.env, d = id && G.drawer(id);
    if (d && ['P1', 'P5'].includes(d.type) && S.drawers[id] === 'open') return { kind: d.type, label: d.type === 'P1' ? `etiket voor la ${id}` : `samenvatting, la ${id}`, id };
    return { kind: 'free', label: null };
  },
  draw() {
    const S = G.S, pur = this.purpose();
    UI.hit({ r: [300, 0, 1320, 1080], tip: null, cursor: 'text', onClick: () => focusKeys(true) });
    stateLayer('twwall', 'twwall', 0, 0, W, H, paintTypewriterRoom).blit();
    // the paper: what has been typed, scrolled up a line at a time; the carriage moves left as letters go on,
    // so the letter always strikes at the type guide in the middle
    const lineW = typedWidth(this.line, TWV.size), crk = clamp((T - this.cr) / .45);
    const off = crk < 1 ? lerp(this.crFrom || 0, lineW, easeOut(crk)) : lineW;
    const px = TWV.cx - 8 - off, lines = this.lines(pur), ly = TWV.lineY;
    const paperTop = Math.min(70, ly - 90 - lines.length * TWV.lh);
    boilSeed('paper');
    C.save(); C.beginPath(); C.rect(0, 0, W, 586); C.clip();
    C.save(); C.fillStyle = 'rgba(10,6,14,.35)'; C.filter = 'blur(12px)'; C.fillRect(px - 50, paperTop + 20, 860, 586 - paperTop); C.restore();
    C.drawImage(paperSheet(860, 1000, '#F6F1E3', 33, .3), px - 70, paperTop, 860, 600 - paperTop);
    lines.forEach((l, i) => typedText(l.txt, px, ly - (lines.length - i) * TWV.lh, TWV.size, l.col || '#26222B', { seed: i + (l.seed || 0) }));
    typedText(this.line, px, ly, TWV.size, '#26222B', { seed: 99 });
    C.restore();
    if (Math.floor(T * 2) % 2 && pur.kind !== 'r4') { C.fillStyle = 'rgba(184,50,42,.75)'; C.fillRect(TWV.cx - 8, ly + 8, TWV.size * .55, 3); }
    // the machine in front of the paper
    stateLayer('twbig', 'twbig' + PHONE, 0, 520, W, 560, paintTypewriterBig).blit();
    // the keys can be pressed by hand: the one pressed goes down for a moment
    for (const k of twKeys()) UI.hit({ id: 'tw' + k.key, r: [k.x - k.w / 2, k.y - k.h / 2, k.w, k.h], tip: null, onClick: () => { this.pressed = { k, t: T }; onKey({ key: k.key, preventDefault() {} }); } });
    const pk = this.pressed;
    if (pk && T - pk.t < .14) { const k = pk.k; C.save(); C.fillStyle = 'rgba(20,16,24,.4)'; C.beginPath(); C.ellipse(k.x, k.y + 3, k.rx, k.ry, 0, 0, TAU); C.fill(); C.restore(); }
    // a paper tag on the machine says what the typing is for
    if (pur.label) UI.button(pur.label, 1420, 700, { size: 26, rot: .04, flat: true, onClick: () => {} });
    if (G.fx.tw && G.fx.tw.done === false) handText('…', 1500, 600, 40, '#E8DCC0', { font: FONT.hand, j: 0 });
    if (this.printed) drawPrintedLabel(this.printed);
    // a card in the hand can be laid on the machine
    if (S.hand && S.hand.kind === 'card') {
      C.save(); C.globalAlpha = .4 + .2 * Math.sin(T * 4); C.strokeStyle = '#FFE6A8'; C.lineWidth = 5; C.setLineDash([14, 10]); C.strokeRect(420, 640, 1080, 140); C.restore();
      UI.button('Op de machine leggen', 960, 610, { size: 30, onClick: () => G.offerObject('typewriter') });
    }
    nightGrade(760, 380, 1, { r: 2300 });
    drawPeek({ x: 200, u: 30 });
    backButton(() => openView('room'));
  },
  lines(pur) {
    const out = this.paper.slice(-8);
    if (pur.kind === 'r4' && G.fx.tw) {
      const tw = G.fx.tw, txt = tw.text.slice(0, Math.floor(tw.shown));
      const wrapped = wrapLines(txt, 760, `${TWV.size}px ${FONT.type}`);
      return wrapped.map(t => ({ txt: t, seed: 50 })).concat(tw.extra || []).slice(-10);
    }
    if (pur.kind === 'five') return [{ txt: '… en wat de assistent daar zag,', col: '#4A4450' }, { txt: 'dat was', col: '#4A4450' }];
    return out;
  },
  key(e) {
    const pur = this.purpose();
    if (pur.kind === 'r4' && G.fx.tw && !G.fx.tw.done) return true;
    if (e.key === 'Enter') { this.submit(pur); return true; }
    if (e.key === 'Backspace') { this.line = this.line.slice(0, -1); SND.key(); return true; }
    if (e.key.length === 1 && this.line.length < 34) { this.line += e.key; SND.key(); return true; }
    return false;
  },
  submit(pur) {
    const word = this.line.trim(); this.crFrom = typedWidth(this.line, TWV.size); this.line = '';
    this.cr = T; SND.carriage();
    if (!word) return;
    this.paper.push({ txt: word });
    if (pur.kind === 'five') {
      const r = G.typeWord(word);
      if (r.ok) { SND.ding(); setTimeout(() => endingFive(), 900); }
      else { G.say(G.F.nee); this.paper.push({ txt: 'xxxxxxx', col: '#7A6F86' }); }
      return;
    }
    if (pur.kind === 'P1' || pur.kind === 'P5') {
      const r = G.typeWord(word);
      if (r.ok) { setTimeout(() => SND.ding(), 500); if (pur.kind === 'P1') this.printed = { word, t: T }; else G.say('Ingevuld.'); }
      else if (r.ok === false) { SND.nee(); }
    }
  },
};
function activeR4() { const S = G.S; for (let n = 1; n <= 4; n++) { const d = G.cab(n).drawers[2]; if (d.type === 'R4' && S.woke[d.id] && !['solved', 'filed'].includes(S.drawers[d.id])) return d; } return null; }
function startSelfTyping(d) {
  const top = G.card(G.roleKey(d.id, 'top')).c.render;
  G.fx.tw = { id: d.id, text: top.description, shown: 0, t: T, done: false, extra: [] };
}
function drawPrintedLabel(p) {
  const age = T - p.t, k = easeOut(clamp(age / .8)), out = clamp((4 - age) / .6);
  if (out <= 0) { V.typewriter.printed = null; return; }
  boilSeed('label');
  C.globalAlpha = out;
  push(); translate(1300, 420 - k * 120); rotate(.06);
  paint(rectPts(-160, -40, 320, 80, 1), { wash: '#F0E7D0', ink: PAL.ink, sw: .7 });
  typedText(p.word.toUpperCase(), -140, 14, 40, '#2A2630');
  pop(); C.globalAlpha = 1;
}
function paintTypewriterRoom() {
  boilSeed('twroom');
  paint(rectPts(-20, -20, W + 40, H + 40), { wash: '#2E2A3A', ink: null });
  for (let i = 0; i < 10; i++) paint(ellPts(hash(i * 2.1) * W, hash(i * 4.3) * H * .6, 300, 160, 16), { fill: '#3C3550', fillOp: 60, bleed: .3, layers: 3, ink: null });
  glow(420, 160, 700, '#FFD58A', .35);
}
function paintTypewriterBig() {
  boilSeed('twbig');
  const cx = TWV.cx;
  // platen
  paint(rrPts(cx - 560, 560, 1120, 70, 30, 1), { wash: '#1E1C22', ink: PAL.ink, sw: 1.2 });
  for (const s of [-1, 1]) paint(ellPts(cx + s * 600, 595, 40, 40, 20), { wash: '#2C2930', ink: PAL.ink, sw: 1 });
  paint(rectPts(cx - 520, 548, 1040, 18, .6), { wash: '#B9BCC4', tex: 0, ink: PAL.ink, sw: .6 });
  inkLine([[cx + 620, 570], [cx + 760, 500], [cx + 800, 510]], 4, '#B9BCC4', 'ink', .4);
  // the type guide, where the letter strikes
  paint([[cx - 30, 640], [cx + 30, 640], [cx + 14, 600], [cx - 14, 600]], { wash: '#8A8D96', tex: 0, ink: PAL.ink, sw: .6 });
  // body
  paint([[cx - 700, 1100], [cx + 700, 1100], [cx + 610, 650], [cx - 610, 650]], { wash: '#26242B', ink: PAL.ink, sw: 1.4 });
  paint([[cx - 520, 760], [cx + 520, 760], [cx + 480, 680], [cx - 480, 680]], { wash: '#3A3740', ink: null });
  handText('Olympia', cx, 735, 40, '#C9B98A', { font: FONT.fell, align: 'center', j: 0 });
  for (const k of twKeys()) {
    if (k.wide) paint(rrPts(k.x - k.rx, k.y - k.ry, 2 * k.rx, 2 * k.ry, k.ry * .9, .6), { wash: '#E8E1D0', tex: 0, pool: 0, ink: PAL.ink, sw: .8 });
    else paint(ellPts(k.x, k.y, k.rx, k.ry, 18), { wash: '#E8E1D0', tex: 0, pool: 0, ink: PAL.ink, sw: .8 });
    handText(k.ch, k.x, k.y + k.fs * .36, k.fs, '#2A2630', { font: FONT.type, align: 'center', j: 0 });
  }
  if (!PHONE) paint(rrPts(cx - 260, 1060, 520, 40, 18, .6), { wash: '#E8E1D0', ink: PAL.ink, sw: .8 });
}
// the keys, where they are drawn: on a phone bigger, with a backspace, a return and a space bar of their own
function twKeys() {
  const cx = TWV.cx, P = PHONE, dx = P ? 132 : 100, dy = P ? 74 : 62, y0 = P ? 800 : 820, st = P ? 26 : 18;
  const rx = P ? 50 : 30, ry = P ? 31 : 24, fs = P ? 34 : 22, out = [];
  ['1234567890', 'QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'].forEach((r, ri) => [...r].forEach((ch, k) => {
    out.push({ ch, key: ch.toLowerCase(), x: cx - (r.length - 1) * dx / 2 + k * dx + ri * st, y: y0 + ri * dy, rx, ry, fs, w: dx, h: dy });
  }));
  if (P) {
    const after = (ri, n, o) => ({ x: cx - (n - 1) * dx / 2 + n * dx + ri * st + (o.rx - rx), y: y0 + ri * dy, ry, fs, h: dy, wide: true, ...o, w: 2 * o.rx + 16 });
    out.push(after(0, 10, { ch: '⌫', key: 'Backspace', rx: 62 }), after(2, 9, { ch: '⏎', key: 'Enter', rx: 74 }), after(3, 7, { ch: '', key: ' ', rx: 150 }));
  }
  return out;
}
function focusKeys(on, soft = false) {
  const k = document.getElementById('keys'); if (!k) return;
  if (on && TOUCH && !soft) { k.blur(); return; }   // with a finger the drawn keys are the keyboard; the phone's own would cover the room
  if (on) { k.value = ' '; try { k.focus({ preventScroll: true }); } catch (e) { k.focus(); } } else k.blur();
}

// ---------- the clock ----------
const CLK = { cx: 960, cy: 430, r: 300 };
V.clock = {
  enter() { this.hand = null; },
  draw() {
    stateLayer('clockbig', 'clockbig', 0, 0, W, H, paintClockBig).blit();
    const R = G.cab(1).drawers[2], live = R.type === 'R1' && G.S.woke[R.id] && G.S.drawers[R.id] === 'open';
    // pendulum below the face
    const swing = G.fx.stopped ? 0 : .12 * Math.sin(T * Math.PI);
    boilSeed('bigpend');
    push(); translate(CLK.cx, 790); rotate(swing);
    inkLine([[0, 0], [0, 250]], 2, PAL.brassDk, 'ink', 0);
    paint(ellPts(0, 270, 50, 50, 24), { wash: PAL.brass, ink: PAL.ink, sw: 1 });
    glow(-16, 256, 40, '#FFF0C0', .3);
    pop();
    // hands: the game's hour, or the one being set
    let mins = G.wallMinutes();
    if (this.hand) mins = this.hand.hour * 60;
    const hA = ((mins / 60) % 12) / 12 * TAU - Math.PI / 2, mA = (mins % 60) / 60 * TAU - Math.PI / 2;
    boilSeed('bighands');
    const hp = [CLK.cx + Math.cos(hA) * 170, CLK.cy + Math.sin(hA) * 170];
    paint(ribbon([[CLK.cx - Math.cos(hA) * 30, CLK.cy - Math.sin(hA) * 30], [CLK.cx, CLK.cy], hp], 16, 4), { wash: '#1F1B24', tex: 0, ink: PAL.ink, sw: .6 });
    paint(ribbon([[CLK.cx - Math.cos(mA) * 40, CLK.cy - Math.sin(mA) * 40], [CLK.cx, CLK.cy], [CLK.cx + Math.cos(mA) * 250, CLK.cy + Math.sin(mA) * 250]], 9, 2), { wash: '#1F1B24', tex: 0, ink: PAL.ink, sw: .6 });
    paint(ellPts(CLK.cx, CLK.cy, 14, 14, 14), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .6 });
    if (live) {
      // the hour hand can be taken and turned; let go on an hour, it is a setting
      UI.hit({ c: [CLK.cx, CLK.cy, CLK.r], tip: this.hand ? null : 'De wijzer verzetten', cursor: 'grab', drag: true,
        onDown: (x, y) => { this.hand = { hour: hourAt(x, y), held: true, since: T }; SND.click(); },
        onDrag: (x, y) => { const h = hourAt(x, y); if (this.hand && h !== this.hand.hour) { this.hand.hour = h; SND.click(); } },
        onUp: () => { if (this.hand) { this.hand.held = false; this.hand.since = T; } },
        onClick: (x, y) => { this.hand = { hour: hourAt(x, y), held: false, since: T }; SND.click(); } });
      if (this.hand && !this.hand.held && T - this.hand.since > 2) { const h = this.hand.hour; this.hand = null; G.setClock(h); }
    } else UI.hit({ c: [CLK.cx, CLK.cy, CLK.r], tip: 'De klok', onClick: () => { if (G.S.clockSet != null) G.say('Daarna laat je de klok met rust.'); } });
    nightGrade(300, 900, .8);
    drawPeek({ x: 1700, u: 32 });
    backButton(() => openView('room'));
  },
};
function hourAt(x, y) { let a = Math.atan2(y - CLK.cy, x - CLK.cx) + Math.PI / 2; if (a < 0) a += TAU; let h = Math.round(a / TAU * 12) % 12; return h === 0 ? 12 : h; }
function paintClockBig() {
  boilSeed('clockbig');
  paint(rectPts(-20, -20, W + 40, H + 40), { wash: PAL.wall, ink: null });
  for (let i = 0; i < 12; i++) paint(ellPts(hash(i * 2.1) * W, hash(i * 4.3) * H, 260, 160, 16), { fill: PAL.wallDk, fillOp: 50, bleed: .3, layers: 3, ink: null });
  // the case
  paint(rectPts(CLK.cx - 380, 60, 760, 760, 2), { wash: PAL.oak, ink: PAL.ink, sw: 1.4 });
  paint([[CLK.cx - 400, 64], [CLK.cx + 400, 64], [CLK.cx + 300, -10], [CLK.cx - 300, -10]], { wash: PAL.oakDk, ink: PAL.ink, sw: 1.2 });
  paint(rectPts(CLK.cx - 300, 790, 600, 400, 2), { wash: PAL.oak, ink: PAL.ink, sw: 1.4 });
  paint(rectPts(CLK.cx - 250, 820, 500, 380, 1.5), { wash: '#2A2530', ink: PAL.ink, sw: 1 });
  paint(ellPts(CLK.cx, CLK.cy, CLK.r + 30, CLK.r + 30, 60), { wash: PAL.brass, ink: PAL.ink, sw: 1.2 });
  paint(ellPts(CLK.cx, CLK.cy, CLK.r, CLK.r, 60), { wash: '#F1E8D2', ink: PAL.ink, sw: 1 });
  const RN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let h = 0; h < 12; h++) {
    const a = h / 12 * TAU - Math.PI / 2;
    push(); translate(CLK.cx + Math.cos(a) * (CLK.r - 56), CLK.cy + Math.sin(a) * (CLK.r - 56)); rotate(a + Math.PI / 2);
    handText(RN[h], 0, 14, 40, '#26222B', { font: FONT.fell, align: 'center', j: 0 });
    pop();
  }
  for (let m = 0; m < 60; m++) { const a = m / 60 * TAU, r0 = CLK.r - (m % 5 ? 14 : 24), r1 = CLK.r - 6; inkLine([[CLK.cx + Math.cos(a) * r0, CLK.cy + Math.sin(a) * r0], [CLK.cx + Math.cos(a) * r1, CLK.cy + Math.sin(a) * r1]], m % 5 ? .4 : .9, PAL.ink, 'inkfine', 0); }
  handText('J. Mulder · Amsterdam', CLK.cx, CLK.cy + 110, 22, '#6A5A46', { font: FONT.fell, align: 'center', j: 0 });
}

// ---------- the window ----------
const WINV = (() => { const s = 2.1, gw = 264 * s, gh = 456 * s; return { s, gx: W / 2 - gw / 2, gy: 24, gw, gh }; })();
V.window = {
  enter() { this.flipT = T; },
  draw() {
    const fx = G.fx, Wv = WINV;
    stateLayer('winbig', 'winbig', 0, 0, W, H, paintWindowBig).blit();
    stateLayer('outbig', 'outbig', Wv.gx - 10, Wv.gy - 10, Wv.gw + 20, Wv.gh + 20, () => paintOutsideBox(Wv.gx, Wv.gy, Wv.gw, Wv.gh, Wv.s)).blit();
    if (fx.reflect > 0) drawReflection(Wv.gx, Wv.gy, Wv.gw, Wv.gh, fx.reflect);
    if (fx.wolf) drawWolf(Wv.gx, Wv.gy, Wv.gw, Wv.gh, Wv.s);
    drawMist(Wv.gx, Wv.gy, Wv.gw, Wv.gh, fx.mistLevel, Wv.s);
    // at the window the view flips for a moment, so the writing reads
    const age = T - this.flipT, readable = age < 1.3 ? 1 : age < 1.7 ? 1 - ease((age - 1.3) / .4) : 0;
    if (fx.writing) drawWriting(Wv.gx, Wv.gy, Wv.gw, Wv.gh, Wv.s, readable);
    stateLayer('winframebig', 'winframebig', 0, 0, W, H, paintWindowFrameBig).blit();
    nightGrade(W / 2, 420, .15, { r: 1400 });
    if (fx.sillCard) { const card = G.cardView(fx.sillCard.key); drawCard(card, W / 2 - 170, 1000 - 110, 340, { rot: -.03 }); }
    // the sill takes a card
    if (G.S.hand && G.S.hand.kind === 'card') {
      C.save(); C.globalAlpha = .4 + .2 * Math.sin(T * 4); C.strokeStyle = '#FFE6A8'; C.lineWidth = 5; C.setLineDash([14, 10]); C.strokeRect(Wv.gx - 60, 990, Wv.gw + 120, 70); C.restore();
      UI.hit({ r: [Wv.gx - 60, 980, Wv.gw + 120, 90], tip: 'Op de vensterbank leggen', onClick: () => G.offerObject('window') });
    } else UI.hit({ r: [Wv.gx, Wv.gy, Wv.gw, Wv.gh], tip: null, cursor: 'default', onClick: () => { this.flipT = T - .2; } });
    drawPeek({ x: 1720, u: 32 });
    backButton(() => openView('room'));
  },
};
function paintWindowBig() {
  boilSeed('winwall');
  paint(rectPts(-20, -20, W + 40, H + 40), { wash: PAL.wall, ink: null });
  for (let i = 0; i < 14; i++) paint(ellPts(hash(i * 2.1) * W, hash(i * 4.3) * H, 260, 160, 16), { fill: PAL.wallDk, fillOp: 50, bleed: .3, layers: 3, ink: null });
}
function paintWindowFrameBig() {
  const Wv = WINV, s = Wv.s, { gx, gy, gw, gh } = Wv, meet = gy + gh * .49, fc = '#E2D7B8';
  boilSeed('winframebig');
  const bar = (x, y, w, h) => paint(rectPts(x, y, w, h, 1), { wash: fc, ink: PAL.ink, sw: 1 });
  bar(gx - 40, gy - 40, gw + 80, 40); bar(gx - 40, gy - 40, 40, gh + 80); bar(gx + gw, gy - 40, 40, gh + 80);
  bar(gx - 4, meet - 4, gw + 8, 24);
  for (const sTop of [true, false]) { const y0 = sTop ? gy : meet + 20, y1 = sTop ? meet - 4 : gy + gh; bar(gx + gw / 2 - 6, y0, 12, y1 - y0); bar(gx, (y0 + y1) / 2 - 6, gw, 12); }
  paint(rectPts(gx + gw / 2 - 20, meet - 14, 40, 14, .5), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .6 });
  // the sill
  paint(rectPts(gx - 120, gy + gh, gw + 240, 44, 1), { wash: fc, ink: PAL.ink, sw: 1 });
  paint(rectPts(gx - 100, gy + gh + 44, gw + 200, 30, 1), { wash: '#BFB08A', ink: PAL.ink, sw: .8 });
  // the curtain on the right
  paint([[gx + gw + 60, -20], [gx + gw + 260, -20], [gx + gw + 300, 1100], [gx + gw + 30, 1100]], { wash: '#7B2B32', ink: PAL.ink, sw: 1.2, curv: .2 });
  for (let i = 0; i < 5; i++) { const fx = gx + gw + 80 + i * 40; paint([[fx, 0], [fx + 14, 0], [fx + 24 + (i % 2) * 10, 1100], [fx - 4, 1100]], { fill: i % 2 ? '#5A1C24' : '#9A3B40', fillOp: 120, bleed: .04, layers: 3, ink: null }); }
  void s;
}
// the canal, painted for any box
function paintOutsideBox(gx, gy, gw, gh, s) {
  const keep = ROOM.window; ROOM.window = { ...keep, gx, gy, gw, gh };
  try { paintOutside(s); } finally { ROOM.window = keep; }
}

// ---------- the door ----------
const DOORV = { x: 660, y: 40, w: 600, h: 1000 };
V.door = {
  enter() { this.since = T; },
  draw() {
    const fx = G.fx, D = DOORV;
    stateLayer('doorbig', 'doorbig', 0, 0, W, H, paintDoorBig).blit();
    const sh = fx.shiver * Math.sin(T * 80) * 6;
    // the leaf, big
    boilSeed('doorleafbig');
    push(); translate(sh, 0);
    paint(rectPts(D.x, D.y, D.w, D.h, 1.5), { wash: '#6E4A2E', ink: PAL.ink, sw: 1.4 });
    paint(rectPts(D.x + 60, D.y + 60, D.w - 120, 340, 1), { wash: '#B9B8A6', ink: PAL.ink, sw: 1 });
    paint(rectPts(D.x + 60, D.y + 60, D.w - 120, 340, 1), { fill: '#E3E0CF', fillOp: 120, bleed: .1, layers: 3, ink: null });
    push(); translate(D.x + D.w / 2, D.y + 210); scale(-1, 1);
    handText('CENTRAAL', 0, 0, 52, '#6A5A3C', { font: FONT.fellSC, align: 'center', j: 0 });
    handText('SAGENARCHIEF', 0, 70, 52, '#6A5A3C', { font: FONT.fellSC, align: 'center', j: 0 });
    pop();
    for (const y of [470, 740]) paint(rectPts(D.x + 60, D.y + y, D.w - 120, 230, 1), { fill: '#4E3320', fillOp: 120, bleed: .04, layers: 3, ink: PAL.ink, sw: 1 });
    paint(ellPts(D.x + D.w - 70, D.y + 560, 24, 24, 16), { wash: PAL.brass, tex: 0, ink: PAL.ink, sw: .8 });
    paint(rectPts(D.x + D.w - 82, D.y + 600, 24, 44, .6), { wash: PAL.brassDk, tex: 0, ink: PAL.ink, sw: .6 });
    pop();
    // the knocks show as dust shaken loose
    if (fx.shiver > .1) for (let i = 0; i < 6; i++) { const ph = frac(T * 1.4 + i / 6); softBlob(D.x + hash(i) * D.w, D.y + 100 + ph * 900, 6, 6, '#E8DCC0', .5 * (1 - ph) * fx.shiver); }
    // the gap under the door, lit from the corridor
    boilSeed('gap');
    paint(rectPts(D.x - 10, D.y + D.h, D.w + 20, 14, .6), { wash: '#F2D9A0', tex: 0, ink: null });
    glow(D.x + D.w / 2, D.y + D.h + 10, 260, '#F2C878', .4);
    if (G.S.hand && G.S.hand.kind === 'card') {
      C.save(); C.globalAlpha = .4 + .2 * Math.sin(T * 4); C.strokeStyle = '#FFE6A8'; C.lineWidth = 5; C.setLineDash([14, 10]); C.strokeRect(D.x - 20, D.y + D.h - 30, D.w + 40, 60); C.restore();
      UI.hit({ r: [D.x - 20, D.y + D.h - 40, D.w + 40, 80], tip: 'Onder de deur door schuiven', onClick: () => G.offerObject('door') });
    }
    nightGrade(D.x + D.w / 2, D.y + D.h, .4, { r: 1500 });
    UI.hit({ c: [D.x + D.w - 70, D.y + 580, 70], tip: 'De deurknop', onClick: () => { SND.burst({ dur: .08, f: 900, q: 4, vol: .15 }); G.say(G.F.door_locked); } });
    drawPeek({ x: 1700, u: 32 });
    backButton(() => openView('room'));
  },
};
function paintDoorBig() {
  boilSeed('doorwall');
  paint(rectPts(-20, -20, W + 40, H + 40), { wash: PAL.wall, ink: null });
  for (let i = 0; i < 12; i++) paint(ellPts(hash(i * 2.1) * W, hash(i * 4.3) * H, 260, 160, 16), { fill: PAL.wallDk, fillOp: 50, bleed: .3, layers: 3, ink: null });
  paint(rectPts(-20, 860, W + 40, 300), { wash: PAL.wains, ink: null });
  paint(rectPts(DOORV.x - 80, DOORV.y - 60, DOORV.w + 160, DOORV.h + 100, 2), { wash: '#E2D7B8', ink: PAL.ink, sw: 1.2 });
  paint(rectPts(DOORV.x - 10, DOORV.y - 6, DOORV.w + 20, DOORV.h + 10, 1), { wash: '#3A2E24', ink: null });
  paint(rectPts(-20, 1040, W + 40, 60), { wash: PAL.floor, ink: PAL.ink, sw: .8 });
}

// ---------- cabinet five ----------
V.dial = {
  enter() { this.rings = this.rings || [0, 0, 0, 0]; this.openT = G.S.five === 'open' || G.S.five === 'reading' || G.S.five === 'typed' ? -9 : null; if (!G.S.digits[1] && !G.S.fired.five_shut) { G.S.fired.five_shut = true; setTimeout(() => G.say(G.F.reactions.five_shut), 500); } },
  draw() {
    const S = G.S, open = ['open', 'reading', 'typed'].includes(S.five);
    stateLayer('cabwall', 'cabwall', 0, 0, W, H, paintCabWall).blit();
    stateLayer('devil', 'devil', 480, 0, 960, 1080, paintDevilBig).blit();
    // the bar and its four rings
    const k = this.openT != null ? easeOut(clamp((T - this.openT) / 1.2)) : open ? 1 : 0;
    boilSeed('bar');
    push(); translate(CABV.x - 40, 470); rotate(-k * 1.3);
    paint(rectPts(0, -26, CABV.w + 80, 52, 1), { wash: PAL.iron, ink: PAL.ink, sw: 1.2 });
    pop();
    if (k < .1) {
      for (let i = 0; i < 4; i++) {
        const x = CABV.x + 230 + i * 110, y = 470;
        paint(rrPts(x - 44, y - 70, 88, 140, 20, 1), { wash: PAL.brass, ink: PAL.ink, sw: 1 });
        paint(rectPts(x - 26, y - 28, 52, 56, .6), { wash: '#F1E8D2', tex: 0, ink: PAL.ink, sw: .7 });
        handText(String(this.rings[i]), x, y + 18, 46, '#26222B', { font: FONT.type, align: 'center', j: 0 });
        handText(ROMAN[i + 1], x, y + 104, 24, '#E9DCC0', { font: FONT.fellSC, align: 'center', j: 0 });
        for (const sgn of [-1, 1]) paint([[x - 12, y + sgn * 40], [x + 12, y + sgn * 40], [x, y + sgn * 54]], { wash: '#3A3248', tex: 0, pool: 0, ink: null });
        UI.hit({ r: [x - 44, y - 70, 88, 70], tip: 'hoger', onClick: () => this.turn(i, 1) });
        UI.hit({ r: [x - 44, y, 88, 70], tip: 'lager', onClick: () => this.turn(i, -1) });
      }
    }
    // the slot in its front
    const sx = CABV.x + CABV.w / 2, sy = 240;
    if (S.hand && S.hand.kind === 'card' && !open) {
      C.save(); C.globalAlpha = .4 + .2 * Math.sin(T * 4); C.strokeStyle = '#FFE6A8'; C.lineWidth = 5; C.setLineDash([14, 10]); C.strokeRect(sx - 170, sy - 40, 340, 80); C.restore();
      UI.hit({ r: [sx - 170, sy - 40, 340, 80], tip: 'Door de gleuf', onClick: () => G.offerCabinet(5) });
    }
    if (open) {
      // the Varia drawer: one card, and the last misfiled card on top of it
      const dk = this.openT != null ? easeOut(clamp((T - this.openT - 1) / .8)) : 1;
      boilSeed('varia');
      paint(rectPts(CABV.x + 160, 640 + (1 - dk) * 40, CABV.w - 320, 300, 1), { wash: '#5A3A30', ink: PAL.ink, sw: 1 });
      handText('VARIA', CABV.x + CABV.w / 2, 690, 34, '#E9DCC0', { font: FONT.fellSC, align: 'center', j: 0 });
      drawCard(G.cardView('five'), CABV.x + 210, 720, 380, { rot: -.03 });
      const last = S.intruderIn[5]; if (last) drawCard(G.cardView(last), CABV.x + 300, 760, 300, { rot: .08 });
      UI.hit({ r: [CABV.x + 200, 700, 520, 280], tip: 'Lezen', onClick: () => { G.S.five = S.five === 'open' ? 'reading' : S.five; G.read(['five'], 0, 'five'); } });
    }
    nightGrade(700, 1000, 1);
    if (G.events.some(e => e.kind === 'trailShow')) drawTrailShow();
    drawPeek({ x: 230, u: 30 });
    backButton(() => openView('room'));
  },
  turn(i, d) {
    this.rings[i] = (this.rings[i] + d + 10) % 10; SND.click();
    if (G.allFiled() && [1, 2, 3, 4].every(n => G.S.digits[n] != null) && G.dialOpen(this.rings)) {
      this.openT = T; SND.thud(.2, 1660, .6); SND.creak(1660); G.clawd.mood.act('scared', 2);
    }
  },
};
function paintDevilBig() {
  const X = CABV;
  boilSeed('devilbig');
  paint(rectPts(X.x - 30, X.y - 100, X.w + 60, 76, 1), { wash: '#6A4639', ink: PAL.ink, sw: 1.1 });
  paint(rectPts(X.x + 120, X.y - 88, X.w - 240, 52, .6), { wash: '#E3D6B6', ink: PAL.ink, sw: .6 });
  handText('V · DE DUIVEL', X.x + X.w / 2, X.y - 49, 40, PAL.ink, { font: FONT.fellSC, align: 'center', j: 0 });
  paint(rectPts(X.x, X.y - 24, X.w, X.h + 24, 1.5), { wash: '#4B302A', ink: PAL.ink, sw: 1.2 });
  for (let row = 0; row < 7; row++) for (let col = 0; col < 3; col++) {
    const d = cabCell(col, row);
    paint(rectPts(d.x + 4, d.y + 4, d.w - 8, d.h - 8, .8), { wash: mixCol('#6A4639', '#4B302A', hash(row * 3 + col)), ink: PAL.ink, sw: .7 });
    paint(ellPts(d.x + d.w / 2, d.y + d.h - 26, 22, 11, 14, .4), { wash: '#7A6440', tex: 0, ink: PAL.ink, sw: .5 });
  }
  paint(rectPts(X.x + X.w / 2 - 150, 225, 300, 30, .6), { wash: '#130E12', tex: 0, ink: PAL.brass, sw: 1.4 });
}

// ---------- P4: the box of loose halves ----------
function drawHalvesBox(d) {
  const [x, y] = TABLE.kit, S = G.S;
  boilSeed('halvesbox');
  paint(rectPts(x + 40, y + 60, 420, 220, 1.5), { wash: '#B99A6A', ink: PAL.ink, sw: 1 });
  paint(rectPts(x + 56, y + 76, 388, 188, 1), { wash: '#8E7048', ink: null });
  for (let i = 0; i < 9; i++) paint(rectPts(x + 66 + i * 40, y + 70 + (i % 3) * 6, 64, 120, .6), { wash: PAL.card, tex: 0, ink: PAL.ink, sw: .5 });
  handText('losse helften', x + 250, y + 248, 30, '#F2E6CC', { font: FONT.hand, weight: 600, align: 'center', j: 0 });
  if (S.drawers[d.id] === 'open') UI.hit({ r: [x + 40, y + 60, 420, 220], tip: 'De doos met helften', onClick: () => V.halves.open() });
}
V.halves = {
  on: false,
  open() { const id = G.S.env; if (!id || G.S.drawers[id] !== 'open') return; if (!G.S.envOpen) G.openEnvelope(); this.on = true; this.t0 = T; this.try = null; SND.fan(); },
  draw() {
    if (!this.on) return;
    const S = G.S, id = S.env; if (!id || S.drawers[id] !== 'open') { this.on = false; return; }
    const d = G.drawer(id), top = G.roleKey(id, 'top');
    const halves = G.keysOf(id).filter(k => G.where(k) === 'box' || (this.try && this.try.key === k));
    C.save(); C.fillStyle = 'rgba(14,10,18,.78)'; C.fillRect(0, 0, W, H); C.restore();
    UI.hit({ r: [0, 0, W, H], tip: null, cursor: 'default', onClick: () => {} });
    // the top half, and under it the one being tried
    const tc = G.cardView(top);
    drawCard(tc, 120, 40, 620, {});
    G.markRead(top);
    let hov = null;
    const cols = 3, cw = 330, ch = cw * .4;
    halves.forEach((k, i) => {
      const c = i % cols, r = Math.floor(i / cols), x = 800 + c * (cw + 24), y = 70 + r * (ch + 40);
      const card = G.cardView(k), over = UI.mouse[0] > x && UI.mouse[0] < x + cw && UI.mouse[1] > y && UI.mouse[1] < y + ch;
      if (over) hov = k;
      if (this.try && this.try.key === k) return;
      drawCard(card, x, y - (over ? 8 : 0), cw, { rot: (hash(i) - .5) * .04 });
      UI.hit({ r: [x, y, cw, ch], tip: 'Eronder leggen', onClick: () => this.attempt(k) });
    });
    // the half under the pointer brought forward to read
    const show = this.try ? this.try.key : hov;
    if (show) {
      const card = G.cardView(show), t = this.try, back = t && !t.ok ? easeIn(clamp((T - t.t - .5) / .4)) : 0;
      drawCard(card, 120, 40 + 620 * .4 + 6 + back * 300, 620, { alpha: 1 - back * .8, rot: t && !t.ok ? Math.sin((T - t.t) * 40) * .02 * (1 - back) : 0 });
      if (!t) G.markRead(show);
    } else handText('Kies een onderste helft.', 430, 380, 34, 'rgba(240,230,210,.6)', { font: FONT.hand, align: 'center', j: 0 });
    if (this.try && T - this.try.t > 1.1) { const ok = this.try.ok; this.try = null; if (ok) this.on = false; }
    UI.button('Dicht', 1760, 1020, { size: 30, onClick: () => { this.on = false; }, key: 'Esc' });
    void d;
  },
  attempt(k) {
    if (this.try) return;
    const ok = G.tryHalf(k);
    if (ok === null) return;
    this.try = { key: k, t: T, ok };
    if (ok) SND.place(); else SND.shove();
  },
};

// ---------- P6: the strongbox with three wheels of 1-12 ----------
function drawStrongbox(d) {
  const [x, y] = TABLE.kit, S = G.S, open = S.kitOpen[d.id];
  const lid = open ? easeOut(clamp((T - open) / 1)) : 0;
  boilSeed('strongbox');
  paint(rectPts(x + 30, y + 90, 520, 230, 1.5), { wash: '#5D6470', ink: PAL.ink, sw: 1.1 });
  paint(rectPts(x + 30, y + 90 - lid * 60, 520, 40, 1), { wash: '#6D7480', ink: PAL.ink, sw: .9 });
  for (let i = 0; i < 3; i++) {
    const wx = x + 140 + i * 150, wy = y + 210;
    paint(ellPts(wx, wy, 58, 58, 24), { wash: PAL.brass, ink: PAL.ink, sw: .9 });
    paint(rectPts(wx - 30, wy - 26, 60, 52, .5), { wash: '#F1E8D2', tex: 0, ink: PAL.ink, sw: .6 });
    handText(String(S.wheels[i]), wx, wy + 16, 40, '#26222B', { font: FONT.type, align: 'center', j: 0 });
    for (const s of [-1, 1]) paint([[wx - 12, wy + s * 40], [wx + 12, wy + s * 40], [wx, wy + s * 52]], { wash: '#3A3248', tex: 0, ink: null });
    if (!open && S.drawers[d.id] === 'open') {
      UI.hit({ r: [wx - 58, wy - 60, 116, 58], tip: 'hoger', onClick: () => G.turnWheel(i, 1) });
      UI.hit({ r: [wx - 58, wy, 116, 60], tip: 'lager', onClick: () => G.turnWheel(i, -1) });
    }
  }
  handText('I', x + 140, y + 300, 24, '#E9DCC0', { font: FONT.fellSC, align: 'center', j: 0 });
  handText('II', x + 290, y + 300, 24, '#E9DCC0', { font: FONT.fellSC, align: 'center', j: 0 });
  handText('III', x + 440, y + 300, 24, '#E9DCC0', { font: FONT.fellSC, align: 'center', j: 0 });
}

// ---------- the title ----------
V.title = {
  enter() { this.name = this.name || ''; this.seed = this.seed || defaultSeed(); this.editing = false; },
  draw() {
    // the room behind, dim, Clawd waiting by the door
    if (G.B) V.room.draw(); else { C.fillStyle = '#16121C'; C.fillRect(0, 0, W, H); }
    UI.hits = [];
    C.save(); C.fillStyle = 'rgba(14,10,20,.62)'; C.fillRect(0, 0, W, H); C.restore();
    boilSeed('title');
    handText('Nachtdienst', W / 2, 300, 150, '#F1E6CC', { font: FONT.fell, align: 'center', j: .8 });
    handText('Centraal Sagenarchief · 1983', W / 2, 372, 40, '#CDBFA2', { font: FONT.fellSC, align: 'center', j: .3 });
    const save = G.hasSave();
    let y = 520;
    if (save) { UI.button(`Verder met nacht ${save.seed}`, W / 2, y, { size: 40, onClick: () => beginNight(save.seed, save.name, true) }); y += 100; }
    UI.button(save ? 'Een nieuwe nacht' : 'Begin de nacht', W / 2, y, { size: 40, onClick: () => beginNight(this.seed, this.name, false) }); y += 100;
    UI.button(`Nacht nr. ${this.seed}  ↻`, W / 2 - 200, y, { size: 28, onClick: () => { this.seed = NIGHT_SEEDS[Math.floor(Math.random() * NIGHT_SEEDS.length)]; } });
    UI.button(this.editing ? `Naam: ${this.name}${Math.floor(T * 2) % 2 ? '|' : ' '}` : this.name ? `Naam: ${this.name}` : 'Je naam (voor de kaart)', W / 2 + 200, y, { size: 28, id: 'name', onClick: () => { this.editing = true; focusKeys(true, true); } });
    y += 90;
    UI.button(SND.on ? 'Geluid: aan' : 'Geluid: uit', W / 2, y, { size: 26, id: 'snd', onClick: () => SND.toggle() });
    handText('Met koptelefoon. Verhalen: Nederlandse Volksverhalenbank, Meertens Instituut (KNAW).', W / 2, H - 40, 26, 'rgba(230,220,200,.55)', { font: FONT.hand, align: 'center', j: 0 });
    UI.button('Colofon', W - 150, H - 60, { size: 26, id: 'colofon', onClick: () => colofonToggle(true) });
  },
  key(e) {
    if (!this.editing) { if (e.key === 'Enter') { beginNight(this.seed, this.name, false); return true; } return false; }
    if (e.key === 'Enter' || e.key === 'Escape') { this.editing = false; focusKeys(false); return true; }
    if (e.key === 'Backspace') { this.name = this.name.slice(0, -1); return true; }
    if (e.key.length === 1 && this.name.length < 24) { this.name += e.key; SND.key(); return true; }
    return false;
  },
};
function defaultSeed() { const d = new Date(), k = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate(); return NIGHT_SEEDS[k % NIGHT_SEEDS.length]; }

// ---------- the intro: typed lines on black ----------
V.intro = {
  enter() { this.t0 = T; this.lines = G.F.intro; this.shown = 0; this.lastKey = 0; },
  draw() {
    C.fillStyle = '#100D14'; C.fillRect(0, 0, W, H);
    const per = 1.9, age = T - this.t0;
    this.lines.forEach((l, i) => {
      const a = age - i * per; if (a < 0) return;
      const n = Math.min(l.length, Math.floor(a * 26));
      if (n > this.lastKey && n < l.length) { this.lastKey = n; if (n % 2) SND.key(); } if (n >= l.length && this.lastLine !== i) { this.lastLine = i; this.lastKey = 0; }
      typedText(l.slice(0, n), 420, 340 + i * 74, 40, '#E9E0CC', { seed: i });
    });
    UI.hit({ r: [0, 0, W, H], tip: null, cursor: 'pointer', onClick: () => this.done() });
    handText(TOUCH ? 'tik om verder te gaan' : 'klik om verder te gaan', W - 60, H - 40, 24, 'rgba(230,220,200,.35)', { font: FONT.hand, align: 'right', j: 0 });
    if (age > this.lines.length * per + 1.6) this.done();
  },
  done() { if (this.finished) return; this.finished = true; transition('iris', () => { setView('room'); introRoom(); }, { at: [W / 2, H / 2] }); },
  key(e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { this.done(); return true; } return false; },
};
// the front door slams downstairs, the key turns; then to the table, where the note is
function introRoom() {
  const c = G.clawd; c.x = c.tx = 330; c.face = 'q';
  G.busy = true;
  setTimeout(() => { SND.slam(-200); G.clawd.mood.act('surprised', 1.2); turnTo('back'); }, 900);
  setTimeout(() => { SND.keyTurn(0, -200); }, 1700);
  setTimeout(() => { G.clawd.mood.setRest('nervous'); G.clawd.mood.act('nervous', 1.6); }, 2300);
  setTimeout(() => { walkTo(STATIONS.table.x, 'front', () => { G.busy = false; G.clawd.mood.setRest('neutral'); G.read(['note'], 0, 'note'); G.S.fired.introDone = true; G.save(); }); }, 3800);
}

// ---------- the endings ----------
function endingFive() {
  const S = G.S; S.ended = 'five'; S.endMinutes = G.minutes(); G.save();
  G.busy = true; G.reader = null;
  openView('room', null, null, () => {
    // the card goes home; the clock strikes twelve; the door opens on a grey morning
    walkTo(STATIONS.cab5.x, 'back', () => {
      SND.riffle(); SND.drawer(false, 1660);
      setTimeout(() => { G.fx.stopped = false; G.fx.clockShow = 24 * 60; SND.strike(12, 1110, 1.05); }, 1200);
      setTimeout(() => { SND.creak(160); animate(G.fx, 'doorOpen', 0, 1, 3); }, 6000);
      setTimeout(() => animate(G.fx, 'morning', 0, 1, 6), 7200);
      setTimeout(() => { G.clawd.mood.setRest('hopeful'); walkTo(STATIONS.door.x, 'back', () => { G.fx.leaving = T; }); }, 9000);
      setTimeout(() => transition('wipe', () => setView('final', 'five'), { col: ['#B9B3A6', '#D8D2C2'] }), 15000);
    });
  });
}
function endingShut() {
  const S = G.S; S.ended = 'shut'; S.endMinutes = G.minutes(); G.save();
  G.busy = true; G.reader = null;
  animate(G.fx, 'lampOff', 0, 1, .3); SND.setHum(0);
  setTimeout(() => { G.fx.clockShow = 9 * 60; SND.strike(9, 1110, 1.05); }, 2200);
  setTimeout(() => { SND.creak(160); animate(G.fx, 'doorOpen', 0, 1, 3); }, 13500);
  setTimeout(() => animate(G.fx, 'morning', 0, 1, 5), 14000);
  setTimeout(() => G.say(G.F.good_end, { ms: 5000, big: true }), 16000);
  setTimeout(() => transition('wipe', () => setView('final', 'shut'), { col: ['#B9B3A6', '#D8D2C2'] }), 22000);
}
// the player's own card, in the house format
V.final = {
  enter(mode) { this.mode = mode; this.back = false; this.t0 = T; this.flipT = -9; G.clearSave(); },
  card() {
    const S = G.S, d = new Date(), date = `${d.getDate()}-${d.getMonth() + 1}-1983`;
    const desc = G.F.card_five.description.replace('____', S.fiveWord || '…');
    return { key: 'own' + S.seed, kind: 'own', r: { kind: 'Sage', description: desc, place: 'Amsterdam', prov: 'N.-H.', year: `${date}, ${hhmm(S.endMinutes || G.minutes())}`,
      code: `NACHT ${S.seed}`, teller: S.name || 'de assistent' }, notes: [{ txt: G.F.note_final }], ver: S.fiveWord };
  },
  draw() {
    const S = G.S;
    C.fillStyle = '#C9C3B4'; C.fillRect(0, 0, W, H);
    stateLayer('morning', 'morning', 0, 0, W, H, () => { boilSeed('morning'); for (let i = 0; i < 16; i++) paint(ellPts(hash(i * 3) * W, hash(i * 5) * H, 300, 200, 16), { fill: '#B4AE9F', fillOp: 60, bleed: .3, layers: 3, ink: null }); }).blit();
    if (this.mode === 'shut') {
      handText(G.F.good_end, W / 2, 360, 70, '#3A3248', { font: FONT.hand, weight: 600, align: 'center', j: .4 });
      handText(`Twaalf enveloppen ingevoegd. ${hhmm(S.endMinutes || G.minutes())}.`, W / 2, 460, 40, '#4A4250', { font: FONT.type, align: 'center', j: 0 });
      assistant(W / 2, 820, 34, { ...feel('relieved', T), boilKey: 'endc', frame: 'stage' });
    } else {
      const fk = clamp((T - this.flipT) / .36), sx = fk < 1 ? Math.abs(Math.cos(fk * Math.PI)) : 1, back = fk < .5 ? !this.back : this.back;
      if (back) drawOwnBack(560, 80, 1000);
      else drawCard(this.card(), 460, 80, 1000, { sx, rot: -.01 });
      handText(G.F.citation, W / 2, 760, 24, '#4A4250', { font: FONT.type, align: 'center', j: 0 });
      UI.button('Achterkant', 640, 860, { size: 32, onClick: () => { this.back = !this.back; this.flipT = T; SND.flip(); } });
      UI.button('Bewaar als plaatje', 960, 860, { size: 32, onClick: () => saveOwnCard(this.card()) });
    }
    UI.button('Een nieuwe nacht', this.mode === 'shut' ? W / 2 : 1290, this.mode === 'shut' ? 980 : 860, { size: 32, onClick: () => { location.reload(); } });
    // who made it, at the end of the night
    handText('Folgert Karsdorp, met Claude · portret: Lauren Fonteyn · verhalen: Meertens Instituut', W / 2, H - 22, 22, 'rgba(60,52,70,.6)', { font: FONT.hand, align: 'center', j: 0 });
    UI.button('Colofon', W - 130, H - 50, { size: 24, id: 'colofon', onClick: () => colofonToggle(true) });
  },
};
function drawOwnBack(x, y, w) {
  const S = G.S, h = w * .6, keys = S.read.filter(k => k !== 'note');
  boilSeed('ownback');
  C.drawImage(paperSheet(w, h, '#F3EAD3', 5, .5), x, y, w, h);
  const total = ARCHIVE_INDEX.total, n = keys.length;
  handText(`${n} kaarten gelezen. Nog ${total - n} in deze kasten.`, x + 40, y + 60, 32, '#3A3248', { font: FONT.hand, weight: 600, j: 0 });
  const cols = 2, per = 13, list = keys.slice(0, cols * per);
  list.forEach((k, i) => {
    const cv = G.cardView(k), r = cv.r || {}, cx = x + 40 + Math.floor(i / per) * (w / 2 - 20), cy = y + 110 + (i % per) * 34;
    const label = `${r.place || '—'}${r.year ? ', ' + r.year : ''}${r.code ? ' · ' + r.code : ''}`;
    handText(label.slice(0, 42), cx, cy, 20, '#2E2A35', { font: FONT.type, j: 0 });
    if (r.url) {
      const rr = [cx, cy - 22, w / 2 - 40, 30], [mx, my] = UI.mouse;
      if (mx > rr[0] && mx < rr[0] + rr[2] && my > rr[1] && my < rr[1] + rr[3]) { window.STORYLINK = { url: r.url, r: rr }; inkLine([[cx, cy + 5], [cx + Math.min(rr[2], label.length * 12), cy + 5]], .4, '#3A3248', 'inkfine', 0); }
      UI.hit({ r: rr, tip: 'Naar de Verhalenbank', onClick: () => {} });
    }
  });
  if (keys.length > list.length) handText(`en nog ${keys.length - list.length}…`, x + w - 40, y + h - 30, 24, '#6A6070', { font: FONT.hand, align: 'right', j: 0 });
}
// the card as a picture, shown so it can be kept (a download link where the browser allows one)
function saveOwnCard(card) {
  let url;
  try { url = cardFace(card, false).toDataURL('image/png'); } catch (e) { G.say('Bewaren lukt hier niet.'); return; }
  const v = document.getElementById('saveview');
  document.getElementById('saveimg').src = url;
  const a = document.getElementById('savelink'); a.href = url; a.download = `nachtdienst-${G.S.seed}.png`;
  // inside an embedding page a download link does nothing; the picture itself can still be saved
  let embedded = false; try { embedded = window.top !== window; } catch (e) { embedded = true; }
  a.hidden = embedded;
  document.getElementById('saveclose').onclick = () => { v.hidden = true; };
  v.hidden = false;
}

// ---------- small animation helper: tween a field ----------
const TWEENS = [];
function animate(obj, key, from, to, dur, ease_ = ease) { TWEENS.push({ obj, key, from, to, t0: T, dur, e: ease_ }); obj[key] = from; }
function stepTweens() { for (let i = TWEENS.length - 1; i >= 0; i--) { const tw = TWEENS[i], k = clamp((T - tw.t0) / tw.dur); tw.obj[tw.key] = lerp(tw.from, tw.to, tw.e(k)); if (k >= 1) TWEENS.splice(i, 1); } }
