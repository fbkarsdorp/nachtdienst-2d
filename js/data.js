// data.js: a night's bundle (made by the Nachtdienst pipeline from the Nederlandse Volksverhalenbank), loaded by
// script tag so the game also runs from a double-clicked file. The client never holds a plain word or number answer:
// it hashes what is typed or dialled the way the pipeline hashed the accepted answers, and compares.
'use strict';

let _nightCb = null;
function NIGHT_LOADED(b) { if (_nightCb) { _nightCb(b); _nightCb = null; } }
// a data file as a script; on a poor connection it is tried again, and it gives up rather than waiting for ever
// the version stamped into index.html (stamp.sh): data fetched later is asked for by it too, past any cache
const VERSION = (document.querySelector('meta[name="nachtdienst-version"]') || {}).content || '';
const versioned = src => VERSION ? `${src}?v=${VERSION}` : src;
function loadScript(src, tries = 2) {
  return new Promise((ok, bad) => {
    const s = document.createElement('script'); let done = false;
    const fail = why => { if (done) return; done = true; s.remove(); if (tries > 1) loadScript(src + (src.includes('?') ? '&' : '?') + 'r=' + Date.now(), tries - 1).then(ok, bad); else bad(new Error(`${src} ${why}`)); };
    const timer = setTimeout(() => fail(tr('laadt niet (na 20 s)')), 20000);
    s.onload = () => { if (done) return; done = true; clearTimeout(timer); ok(); };
    s.onerror = () => { clearTimeout(timer); fail(tr('kon niet geladen worden')); };
    s.src = src; document.head.appendChild(s);
  });
}
function seedFor(name) {
  const n = Number(name);
  if (NIGHT_SEEDS.includes(n)) return n;
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NIGHT_SEEDS[h % NIGHT_SEEDS.length];
}
function loadNight(seed) {
  return new Promise((ok, bad) => { _nightCb = ok; loadScript(versioned(`data/nights/${LANG === 'en' ? 'en/' : ''}${seed}.js`)).catch(bad); });
}
const ARCHIVE = {};
const _archWait = {};
function ARCHIVE_LOADED(n, list) { ARCHIVE[n] = list; (_archWait[n] || []).forEach(f => f(list)); delete _archWait[n]; }
function loadArchive(n) {
  if (ARCHIVE[n]) return Promise.resolve(ARCHIVE[n]);
  return new Promise((ok, bad) => {
    const first = !_archWait[n]; (_archWait[n] = _archWait[n] || []).push(ok);
    if (first) loadScript(versioned(`data/archive/${LANG === 'en' ? 'en/' : ''}cabinet-${n}.js`)).catch(bad);
  });
}

// Spec 6.2, as pipeline/common.py normalize() (and in English without the, a, an, as tools/english.py hashed it)
const ARTICLES = LANG === 'en' ? ['the ', 'an ', 'a '] : ['de ', 'het ', 'een ', "'n ", "'t "];
function normalize(input) {
  let s = String(input).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  s = s.replace(/\s+/g, ' ');
  for (const a of ARTICLES) if (s.startsWith(a)) { s = s.slice(a.length); break; }
  return s.replace(/[\s.,;:!?'"()\-]+$/, '').trim();
}
// SHA-256, small and synchronous (crypto.subtle is not there on every file:// page)
function sha256(msg) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes = Array.from(new TextEncoder().encode(msg)), l = bytes.length * 8;
  bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const r = (x, n) => (x >>> n) | (x << (32 - n)), w = new Array(64);
  for (let o = 0; o < bytes.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
      const S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h = [h[0] + a, h[1] + b, h[2] + c, h[3] + d, h[4] + e, h[5] + f, h[6] + g, h[7] + hh].map(x => x | 0);
  }
  return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
// word and number3 locks: is this input one of the accepted answers?
function opens(lock, input) {
  const n = lock.kind === 'number3' ? input : normalize(input);
  if (!n) return false;
  return lock.accepted_hashes.includes(sha256(lock.salt + n));
}
function haversine(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const COMPASS = ['noorden', 'noordoosten', 'oosten', 'zuidoosten', 'zuiden', 'zuidwesten', 'westen', 'noordwesten'];
function compass(lat1, lon1, lat2, lon2) {
  const dy = lat2 - lat1, dx = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180);
  return COMPASS[Math.round(((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360 / 45) % 8];
}
// the nearest place in the gazetteer (villages with people in them win over hamlets at the same spot)
const KX = Math.cos((52.15 * Math.PI) / 180);
function nearestPlace(lat, lon) {
  let best = null, bd = 1e9;
  for (const p of PLACES) {
    const d = (p[1] - lat) ** 2 + ((p[2] - lon) * KX) ** 2, s = d * (p[4] > 0 ? .6 : 1);
    if (s < bd) { bd = s; best = p; }
  }
  return best && { name: best[0], prov: best[3], lat: best[1], lon: best[2], km: haversine(lat, lon, best[1], best[2]) };
}
// how many stories in the archive were told within km of a point
function storiesNear(lat, lon, km = 5) {
  let n = 0; const dl = km / 111, dk = km / (111 * KX);
  for (let i = 0; i < DOTS.length; i += 2) if (Math.abs(DOTS[i] - lat) < dl && Math.abs(DOTS[i + 1] - lon) < dk && haversine(lat, lon, DOTS[i], DOTS[i + 1]) < km) n++;
  return n;
}
