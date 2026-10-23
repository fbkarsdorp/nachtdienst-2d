// dev.js: a back door for testing (and for the curious), in the spirit of the original's ?admin panel. From the console:
//   DEV.take('2-1')     take a drawer's envelope and open it on the table
//   DEV.solve('2-1')    open its lock the way a right answer does
//   DEV.file('2-1')     insert its cards, as if carried to the drawer
//   DEV.cabinet(2)      take, solve and file a whole cabinet (and its trail card)
//   DEV.go('map')       go somewhere
'use strict';

const DEV = {
  take(id) { const n = Number(id[0]); for (let k = 1; k < n; k++) G.S.unlocked[k + 1] = true; G.S.unlocked[n] = true; if (G.S.env && G.S.env !== id) this.file(G.S.env); G.S.hand = null; G.takeEnvelope(id); G.openEnvelope(); return G.S.drawers[id]; },
  solve(id) {
    const d = G.drawer(id);
    if (G.S.drawers[id] === 'shut') this.take(id);
    if (d.type === 'P3') { const key = `${id}/${d.lock.card}`; G.S.hand = null; G.setLoc(key, 'hand'); G.S.hand = { kind: 'card', key }; G.offerCabinet(d.lock.cabinet); return; }
    if (d.type === 'R2') { const key = `${id}/${d.lock.card}`; G.S.damp[key] = true; }
    if (d.type === 'R3') { G.setLoc(`${id}/${d.lock.card}`, 'gone'); }
    if (d.type === 'R4') { G.setLoc(`${id}/${d.lock.bottom_card}`, 'env'); }
    if (d.type === 'P1' || d.type === 'P5') G.S.lastTyped = '(opgelost)';
    for (const k of G.keysOf(id)) if (G.where(k).startsWith('found')) G.setLoc(k, 'env');
    G.solve(id);
  },
  file(id) { if (G.S.drawers[id] !== 'solved') this.solve(id); G.S.env = null; G.S.hand = { kind: 'env', id }; G.offerDrawer(id); },
  cabinet(n) { for (let i = 1; i <= 3; i++) this.file(`${n}-${i}`); },
  upTo(n) { for (const c of G.B.chain.slice(0, G.B.chain.indexOf(n))) if (c <= 4) this.cabinet(c); },
  go(view, arg) { setView(view, arg); },
  state() { return { view: G.view, env: G.S.env, hand: G.S.hand, drawers: G.S.drawers, active: G.S.active, order: G.S.order, digits: G.S.digits, five: G.S.five }; },
};
window.DEV = DEV;
