// tutorial.js: the first cabinet, taught. Until cabinet I is filed, a slip of J.D.'s pencil in the corner says what to
// do next and a red pencil ring goes round where to do it. Each step is read off the night as it stands (only its
// dismissal is saved), so a night resumed half way picks the lesson up where it is. After cabinet I, one last slip
// points at the cabinet that has come ajar; from there on nobody explains anything.
'use strict';

const TUT = {
  key: null, t0: 0,
  // the step for this moment: { txt, ring: [cx, cy, rx, ry] | null, hit: id of a tag to ring }, or null
  step() {
    const S = G.S;
    if (!S || G.preview || S.fired.tutOff || S.ended || G.busy) return null;
    const v = G.view, inCab = v === 'cabinet' ? V.cabinet.n : 0, atTable = v === 'table' && !V.halves.on;
    const klik = tr(TOUCH ? 'tik' : 'klik'), Klik = tr(TOUCH ? 'Tik' : 'Klik');
    const back = txt => ({ txt, hit: '← Terug' });
    // after cabinet I: the next one stands ajar
    if (G.cabinetFiled(1)) {
      const nx = [2, 3, 4].find(n => S.unlocked[n] && S.drawers[`${n}-1`] === 'shut');
      if (!S.enacted[1] || !nx || S.active) return null;
      return { txt: tr('Kast I is klaar. Kast {roman} staat nu op een kier: daar ga je verder. Vanaf hier zonder uitleg.', { roman: ROMAN[nx] }), ring: v === 'room' ? TUT.cabRoom(nx) : null };
    }
    const id = G.nextDrawer(1), i = Number(id[2]), d = G.drawer(id), st = S.drawers[id], h = S.hand;
    // the sealed envelope in the hand: back into its drawer
    if (h && h.kind === 'env') {
      if (inCab === 1) return { txt: tr('{Klik} op la {id}. Dan pas is hij ingevoegd, en alleen invoegen telt.', { Klik, id }), ring: TUT.cell(id) };
      if (v === 'room') return { txt: tr('Terug naar kast I, la {id}.', { id }), ring: TUT.cabRoom(1) };
      return back(tr('Breng de envelop terug naar kast I.'));
    }
    // the drawer's turn: take its envelope
    if (st === 'shut') {
      if (inCab === 1) return { txt: i === 1 ? tr('Vannacht gaat het om de drie laden in het midden, op volgorde. Pak de envelop van la {id}.', { id }) : tr('Ingevoegd, en de envelop is op de prikker gestoken: twaalf moeten erop. Nu la {id}.', { id }), ring: TUT.cell(id) };
      if (v === 'room') return { txt: i === 1 ? tr('Begin bij kast I, de eerste van links. {Klik} erop.', { Klik }) : tr('Nu kast I, la {id}.', { id }), ring: TUT.cabRoom(1) };
      if (inCab) return back(tr('Dit is kast {roman}. Eerst kast I.', { roman: ROMAN[inCab] }));
      return back(i === 1 ? tr('Begin bij kast I, in de kamer.') : tr('Nu kast I, la {id}.', { id }));
    }
    if (S.env !== id) return null;
    // the lock is open
    if (S.sealed[id]) {
      if (atTable) return { txt: tr('Het slot is open: de kaarten zijn terug in de envelop, en hij is dicht. Neem hem mee.'), hit: 'Meenemen' };
      const txt = tr('Opgelost. De dichte envelop ligt op de leestafel: haal hem.');
      return v === 'room' ? { txt, ring: TUT.tableRoom() } : back(txt);
    }
    if (st === 'solved') {
      if (atTable) return { txt: tr('Het slot is open. Leg de kaart uit je hand terug in de envelop.'), ring: TUT.TRAY };
      return v === 'room' ? { txt: tr('Het slot is open. De kaart in je hand moet terug in de envelop, op tafel.'), ring: TUT.tableRoom() } : back(tr('Het slot is open. De kaart in je hand moet terug in de envelop, op tafel.'));
    }
    // the envelope on the table, shut, then its cards to read
    const toTable = txt => v === 'room' ? { txt, ring: TUT.tableRoom() } : back(txt);
    if (!S.envOpen) return atTable ? { txt: tr('{Klik} op de envelop om hem open te maken.', { Klik }), ring: TUT.BAY } : toTable(tr('De envelop ligt op de leestafel.'));
    const out = G.keysOf(id).filter(k => ['tray', 'table', 'hand'].includes(G.where(k)));
    const unread = !out.some(k => S.read.includes(k));
    // the first card read, the puzzle's own step takes over (and says to read on where that matters)
    if (unread && !(d.type === 'P3' && h) && !(d.type === 'R1' && S.woke[id])) {
      return atTable ? { txt: tr('Wat op de envelop staat, is de opdracht. Lees nu de kaarten: {klik} op een kaart in de bak.', { klik }), ring: TUT.TRAY } : toTable(tr('De kaarten staan op de leestafel. Lees ze eerst.'));
    }
    // then the puzzle itself; stuck for a while, J.D. can be asked
    const stuck = S.played - S.lastProgress > 90 ? '\n' + tr('Vast? “Vraag J.D.” op tafel helpt. Dat kost tijd.') : '';
    if (d.type === 'P4') {
      if (V.halves.on) return { txt: tr('Lees het bovenste stuk tot het laatste woord. Welke helft maakt het af? Het rode nummer helpt, maar meer helften hebben het. {Klik} op een helft om hem eronder te leggen.', { Klik }) + stuck };
      if (atTable) return { txt: tr('Deze kaart is doorgescheurd. De onderste helft zit in de doos met losse helften, tussen andere.') + stuck, ring: TUT.BOX };
      return toTable(tr('De doos met losse helften staat op de leestafel.'));
    }
    if (d.type === 'P2') {
      if (v === 'map') return { txt: tr(TOUCH ? 'De grijze spelden zijn de drie plaatsen van de kaarten. De vierde ligt daartussen. Tik om te kijken, en tik op dezelfde plek nog eens om te prikken. Mis, dan zegt J.D. welke kant op.' : 'De grijze spelden zijn de drie plaatsen van de kaarten. De vierde ligt daartussen. Het vergrootglas noemt de dorpen; klik om te prikken. Mis, dan zegt J.D. welke kant op.') + stuck };
      if (v === 'room') return { txt: tr('De kaart van Nederland hangt rechts aan de muur.') + stuck, ring: TUT.mapRoom() };
      if (atTable) return back(tr('Drie kaarten hebben een plaats, de vierde niet. Waar hoort die? Dat prik je op de kaart van Nederland, aan de muur.') + stuck);
      return back(tr('De kaart van Nederland hangt in de kamer, rechts aan de muur.'));
    }
    if (d.type === 'P3') {
      if (h && h.kind === 'card' && h.key.startsWith(id + '/')) {
        if (inCab) return { txt: tr('Hoort je kaart bij {label}? Dan “In deze kast”. Zo niet: terug, en een andere kast.', { label: CAB_LABEL[inCab] }) + stuck, hit: 'In deze kast' };
        const txt = tr('Breng hem naar zijn eigen kast. Elke kast heeft een onderwerp: {list}. Waar gaat je kaart over?', { list: CAB_LABEL.slice(1, 5).join(', ') }) + stuck;
        return v === 'room' ? { txt } : back(txt);
      }
      return atTable ? { txt: tr('Drie kaarten horen bij elkaar, één niet: die gaat over iets anders. Lees ze alle vier, en kies bij die ene “Meenemen”.') + stuck, ring: TUT.TRAY } : toTable(tr('De kaarten liggen op de leestafel. Eén hoort in een andere kast.'));
    }
    if (d.type === 'R1') {
      if (v === 'clock') return { txt: tr('Sleep de kleine wijzer naar het uur, of {klik} op het uur. Laat los en wacht twee tellen.', { klik }) + stuck };
      if (atTable) { const txt = tr('Hoor je? De klok tikt niet meer. Elk van deze kaarten telt iets, en steeds is het hetzelfde getal. Zet de klok op dat uur.') + stuck; return out.some(k => !S.read.includes(k)) ? { txt, ring: TUT.TRAY } : back(txt); }
      const txt = tr('De klok staat stil. Zet hem op het uur dat de kaarten tellen.') + stuck;
      return v === 'room' ? { txt, ring: TUT.clockRoom() } : back(txt);
    }
    return null;
  },
  // where things are, as rings: [cx, cy, rx, ry]
  BAY: [356, 786, 330, 216], TRAY: [1070, 960, 420, 160], BOX: [306, 400, 250, 150],
  cabRoom(n) { const c = CABS[n - 1]; return [c.x + c.w / 2, c.y + c.h / 2 - 14, c.w / 2 + 36, c.h / 2 + 46]; },
  cell(id) { const c = cabCell(1, PUZZLE_ROWS[Number(id[2]) - 1]); return [c.x + c.w / 2, c.y + c.h / 2, c.w / 2 + 26, c.h / 2 + 20]; },
  tableRoom() { return [ROOM.table.x + ROOM.table.w / 2, 806 - TABLE_RAISE + 70, ROOM.table.w / 2 + 24, 116]; },
  mapRoom() { const m = ROOM.map; return [m.x + m.w / 2 - 6, m.y + m.h / 2, m.w / 2 + 20, m.h / 2 + 30]; },
  clockRoom() { const c = ROOM.clock; return [c.cx, c.cy, c.r + 34, c.r + 34]; },

  draw() {
    if (G.reader || HELP.on || COLOFON.on || (TR.kind && !TR.done)) return;
    const s = this.step();
    if (!s) { this.key = null; return; }
    if (s.txt !== this.key) { if (this.key) SND.pencil(); this.key = s.txt; this.t0 = T; }
    let ring = s.ring;
    if (s.hit) { const hh = UI.hits.find(x => x.id === s.hit); ring = hh && hh.r ? [hh.r[0] + hh.r[2] / 2, hh.r[1] + hh.r[3] / 2, hh.r[2] / 2 + 24, Math.min(hh.r[3] / 2 + 18, 50)] : null; }   // (a phone's tap area is taller than the tag)
    if (V.drawerOpen || V.halves.on) ring = null;
    if (ring) this.ring(...ring);
    this.slip(s.txt, ring);
  },
  // a red pencil ring, gone round once and a bit, that breathes
  ring(cx, cy, rx, ry) {
    const k = ease(clamp((T - this.t0) / .5)), a = (.6 + .3 * Math.sin(T * 4)) * k;
    boilSeed('tutring');
    const P = ellPts(cx, cy, rx, ry, 48, Math.min(rx, ry) * .03, -.08);
    brushStroke(P.concat(P.slice(1, 9)), 1.3, '#D9503C', a);
  },
  // top left, under the way back; at the foot of the box of halves; top right where it would cover its own ring
  slip(txt, ring) {
    const g = GROW(), size = Math.round(29 * g), w = Math.round(470 * g), font = `600 ${size}px ${FONT.hand}`;
    const lines = wrapLines(txt, w - 50, font), lh = size * 1.12, h = Math.round(58 * g + lines.length * lh + 16);
    let x = 26, y = V.halves.on ? H - h - 34 : G.view === 'room' ? 24 : PHONE ? 116 : 92;
    if (ring && ring[0] - ring[2] < x + w && ring[1] - ring[3] < y + h && ring[1] > y) { x = W - w - 26; y = PHONE ? 116 : 92; }
    const k = backOut(clamp((T - this.t0) / .4));
    push(); translate(x + w / 2, y + h / 2 - (1 - k) * 26); rotate(-.01);
    C.globalAlpha = clamp((T - this.t0) / .2);
    boilSeed('tutslip');
    C.save(); C.fillStyle = 'rgba(10,6,14,.35)'; C.fillRect(-w / 2 + 6, -h / 2 + 8, w, h); C.restore();
    paint(rectPts(-w / 2, -h / 2, w, h, 1.5), { wash: '#F2EBD8', washOp: 245, ink: PAL.ink, sw: .5, texK: .4 });
    handText(tr('zo gaat het · kast I'), -w / 2 + 24, -h / 2 + 40 * g, Math.round(24 * g), PAL.red, { font: FONT.hand, weight: 600, j: 0 });
    lines.forEach((l, j) => handText(l, -w / 2 + 24, -h / 2 + 50 * g + lh * (j + .9), size, '#3A3248', { font: FONT.hand, weight: 600, j: .2 }));
    pop(); C.globalAlpha = 1;
    // a returning hand can do without
    UI.button('×', x + w - 32 * g, y + 30 * g, { size: 24, w: 44, h: 40, id: 'tutoff', noHole: true, flat: true, rot: 0, tip: 'Verder zonder uitleg', onClick: () => { G.S.fired.tutOff = true; G.save(); } });
  },
};
