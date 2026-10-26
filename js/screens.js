// What the 3D phone's screen shows: the real app, frames from the 25 Oct walkthrough recording (720×1564).
// They're drawn into the canvas phone3d.js maps onto the display. Clean-ups, all done with pixels from the
// recording itself (no flat patches, so nothing shows a seam):
//   · sign-in: "Developer details ›" and "● Test environment · test USDC" are covered with clean background
//     rows copied from just below them (that area is a flat colour)
//   · the status-bar clock reads 11:18 / 11:21 / 11:22 across the recording; every screen gets the same
//     "11:21", lifted glyph-for-glyph from the Today frame onto the healed background
// The screen follows the section in the middle of the viewport; in The app it follows the step (main.js).

const screen = window.__phoneScreen;
const { width: W, height: H, texture } = screen;
const ctx = screen.ctx;
const FW = 720, FH = 1564, S = W / FW; // frame space → screen canvas
const STATUS = 100;                     // the status bar's height in frame space: it stays still during a switch

const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };

/* ---------- frames ---------- */
const NAMES = ['splash', 'paycard', 'payout', 'ready', 'signin', 'today', 'activity', 'withdraw'];
const CLOCK_OK = ['today', 'activity']; // already show 11:21
const load = (n) => new Promise((res) => {
  const img = new Image();
  img.onload = () => res([n, img]);
  img.onerror = () => res([n, null]);
  img.src = `assets/screens/${n}.jpg`;
});

// Clock area: the digits span x 96–168, y 46–68 on every frame.
const CK = { x0: 86, x1: 178, y0: 38, y1: 78 };
// Background under the clock, rebuilt row by row from the pixels just left and right of it.
function healedClockBg(px) {
  const w = CK.x1 - CK.x0, out = new Float32Array(w * (CK.y1 - CK.y0) * 3);
  for (let y = CK.y0; y < CK.y1; y++) {
    const l = ((y * FW) + CK.x0 - 2) * 4, r = ((y * FW) + CK.x1 + 2) * 4;
    for (let x = 0; x < w; x++) {
      const t = x / (w - 1), o = ((y - CK.y0) * w + x) * 3;
      for (let k = 0; k < 3; k++) out[o + k] = px[l + k] * (1 - t) + px[r + k] * t;
    }
  }
  return out;
}
let clockAlpha = null; // how white each pixel of Today's "11:21" is over its own background (0–1)
function makeClockAlpha(todayImg) {
  const c = document.createElement('canvas'); c.width = FW; c.height = FH;
  const x = c.getContext('2d'); x.drawImage(todayImg, 0, 0);
  const px = x.getImageData(0, 0, FW, CK.y1 + 4).data;
  const bg = healedClockBg(px), w = CK.x1 - CK.x0;
  clockAlpha = new Float32Array(w * (CK.y1 - CK.y0));
  for (let y = CK.y0; y < CK.y1; y++) for (let i = 0; i < w; i++) {
    const p = ((y * FW) + CK.x0 + i) * 4, o = (y - CK.y0) * w + i;
    const lum = (px[p] + px[p + 1] + px[p + 2]) / 3, b = (bg[o * 3] + bg[o * 3 + 1] + bg[o * 3 + 2]) / 3;
    clockAlpha[o] = clamp((lum - b) / (255 - b));
  }
}
function fixClock(x) {
  const data = x.getImageData(0, 0, FW, CK.y1 + 4);
  const px = data.data, bg = healedClockBg(px), w = CK.x1 - CK.x0;
  for (let y = CK.y0; y < CK.y1; y++) for (let i = 0; i < w; i++) {
    const p = ((y * FW) + CK.x0 + i) * 4, o = (y - CK.y0) * w + i, a = clockAlpha[o];
    for (let k = 0; k < 3; k++) px[p + k] = bg[o * 3 + k] * (1 - a) + 255 * a;
  }
  x.putImageData(data, 0, 0);
}

// A frame plus its clean-ups, rendered once into its own canvas at screen size.
function bake(name, img) {
  const f = document.createElement('canvas'); f.width = FW; f.height = FH;
  const x = f.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  if (name === 'signin') {
    x.drawImage(f, 0, 1100, FW, 40, 0, 1005, FW, 40); // "Developer details ›" (rows 1015–1035)
    x.drawImage(f, 0, 1490, FW, 34, 0, 1442, FW, 34); // "Test environment · test USDC" (rows 1451–1467)
  }
  if (!CLOCK_OK.includes(name) && clockAlpha) fixClock(x);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  c.getContext('2d').drawImage(f, 0, 0, W, FH * S);
  return c;
}

/* ---------- which screen ---------- */
const SECTIONS = ['hero', 'period', 'try', 'flow', 'tour', 'faq', 'ca'].map((id) => document.getElementById(id));
const KEY = { hero: 'today', period: 'paycard', try: 'withdraw', flow: 'payout', faq: 'ready', ca: 'splash' };
const TOUR = ['signin', 'today', 'withdraw', 'payout', 'activity'];
let tops = [];
function measureTops() { tops = SECTIONS.map((s) => s.getBoundingClientRect().top + scrollY); }
measureTops();
new ResizeObserver(measureTops).observe(document.body);

function activeKey() {
  let id = window.__phoneSection; // phones: the slot the 3D phone sits in
  if (!id) {
    const mid = scrollY + innerHeight / 2;
    let i = 0;
    tops.forEach((t, j) => { if (t <= mid) i = j; });
    id = SECTIONS[i].id;
  }
  if (id === 'tour') return TOUR[window.__tour?.step ?? 0];
  return KEY[id];
}
// Page order, so a switch slides the right way (later screens come in from the right, like going forward in iOS).
const ORDER = ['today', 'paycard', 'withdraw', 'payout', 'signin', 'activity', 'ready', 'splash'];

/* ---------- drawing ---------- */
const SH = Math.round(STATUS * S);
function draw(key) { if (baked[key]) ctx.drawImage(baked[key], 0, 0); }
// Like iOS: the content slides, the status bar stays put (it cross-fades, since the screens' tops differ in colour).
function drawSwitch(a, b, k) {
  const e = easeInOut(k), forward = ORDER.indexOf(b) >= ORDER.indexOf(a);
  const [lo, hi] = forward ? [a, b] : [b, a];
  const p = forward ? e : 1 - e, x = (1 - p) * W; // how far the later screen is in
  ctx.save();
  ctx.beginPath(); ctx.rect(0, SH, W, H - SH); ctx.clip();
  ctx.save(); ctx.translate(-0.3 * p * W, 0); draw(lo); ctx.restore();
  ctx.fillStyle = `rgba(0,0,0,${0.4 * p})`; ctx.fillRect(0, 0, W, H);
  const sh = ctx.createLinearGradient(x - 40, 0, x, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, `rgba(0,0,0,${0.5 * p})`);
  ctx.fillStyle = sh; ctx.fillRect(x - 40, 0, 40, H);
  ctx.translate(x, 0); draw(hi);
  ctx.restore();
  // status bar: the outgoing one, with the incoming one fading in over it
  if (baked[a]) ctx.drawImage(baked[a], 0, 0, W, SH, 0, 0, W, SH);
  if (baked[b]) { ctx.globalAlpha = e; ctx.drawImage(baked[b], 0, 0, W, SH, 0, 0, W, SH); ctx.globalAlpha = 1; }
}

const SWITCH = 0.45;
let baked = {}, current = null, prev = null, since = 0, drawn = false;
function frame(now) {
  requestAnimationFrame(frame);
  const key = activeKey();
  if (current === null) { current = key; drawn = false; }
  if (key !== current) {
    if (prev && key === prev && now - since < SWITCH * 1000) { // scrolled back mid-switch: run it backwards
      const done = now - since;
      [prev, current] = [current, prev];
      since = now - (SWITCH * 1000 - done);
    } else { prev = current; current = key; since = now; }
  }
  const t = (now - since) / 1000;
  if (prev && t < SWITCH) drawSwitch(prev, current, t / SWITCH);
  else if (prev || !drawn) { prev = null; draw(current); }
  else return; // a still screen: nothing to upload to the GPU
  drawn = true;
  texture.needsUpdate = true;
}

Promise.all(NAMES.map(load)).then((res) => {
  const imgs = Object.fromEntries(res.filter((r) => r[1]));
  if (imgs.today) makeClockAlpha(imgs.today);
  for (const n in imgs) baked[n] = bake(n, imgs[n]);
  if (new URLSearchParams(location.search).has('screens')) window.__screens = baked; // debug: inspect the finished screens
  requestAnimationFrame(frame);
});
