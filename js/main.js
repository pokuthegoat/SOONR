(() => {
  /* ---------- Contract address: the only thing to change at launch ---------- */
  const CA = '0000000000000000000000000000000000000000pump'; // placeholder until the real address exists

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const span = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  // Rolling number (odometer): columns are matched from the right, so "0.00" → "180.00" rolls the existing digits
  // and slides the new ones in on the left. Each digit column is a 0–9 strip moved to its value.
  const odo = (el, text) => {
    if (el._odoText === text) return;
    el._odoText = text;
    const cols = el._odo || (el._odo = (el.textContent = '', []));
    const chars = [...text].reverse();
    while (cols.length < chars.length) {
      const c = document.createElement('span');
      c.className = 'odo-c off';
      c.innerHTML = '<span class="odo-h">0</span><span class="odo-s">' + '0123456789'.split('').map(d => `<i>${d}</i>`).join('') + '</span>';
      el.prepend(c);
      void c.offsetWidth; // start collapsed, so it slides open
      cols.push(c);
    }
    cols.forEach((c, i) => {
      const ch = chars[i], strip = c.lastChild, digit = /\d/.test(ch || '');
      c.classList.toggle('off', ch === undefined);
      if (ch === undefined) return;
      strip.style.visibility = digit ? '' : 'hidden';
      c.firstChild.textContent = ch; // the column takes the width of the digit it shows (the font's 1 is much narrower than its 0)
      c.firstChild.style.visibility = digit ? '' : 'visible';
      if (digit) {
        strip.style.transitionDelay = `${(chars.length - 1 - i) * 70}ms`;
        strip.style.transform = `translateY(${-ch * 100}%)`;
      }
    });
  };

  /* ---------- Always start at the top on reload ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  /* ---------- Lenis smooth scroll: held while the intro is up ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) { lenis = new Lenis({ autoRaf: true, lerp: 0.08, smoothWheel: true }); lenis.stop(); }
  window.__lenis = lenis;

  /* ---------- Intro: the S tile on black; a phone outline draws around it with the 3D phone's load progress ---------- */
  const intro = $('#intro');
  const introFill = $('#introFill');
  const introStart = performance.now();
  let introTarget = 0.08, introShown = 0, introReady = false, introDone = false;
  document.documentElement.classList.add('intro-on');
  addEventListener('phone:progress', e => { introTarget = Math.max(introTarget, 0.08 + 0.82 * e.detail); });
  addEventListener('phone:ready', () => { introReady = true; });
  setTimeout(() => { introReady = true; }, 6000); // never hold the page longer than this
  function finishIntro() {
    if (introDone) return;
    introDone = true;
    window.__introDone = true;
    intro.classList.add('done');
    document.documentElement.classList.remove('intro-on');
    if (lenis) lenis.start();
    dispatchEvent(new Event('intro:done'));
    setTimeout(() => intro.remove(), 900);
  }
  let introLast = introStart;
  (function tickIntro(now) {
    if (introDone) return;
    if (introReady && now - introStart > 900) introTarget = 1;
    const dt = Math.min((now - introLast) / 1000, 0.5);
    introLast = now;
    introShown += (introTarget - introShown) * (1 - Math.exp(-7 * dt)); // time-based, same at any frame rate
    introFill.style.strokeDashoffset = (1 - introShown).toFixed(4); // pathLength="1"
    if (introTarget === 1 && introShown > 0.99) setTimeout(finishIntro, 180);
    else requestAnimationFrame(tickIntro);
  })(introStart);
  if (reduce) finishIntro();

  /* ---------- Anchor links glide with Lenis ---------- */
  $$('a[data-scroll]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) {
        const to = target === 0 ? 0 : target.getBoundingClientRect().top + scrollY;
        lenis.scrollTo(target, { duration: clamp(1.1 + Math.abs(to - scrollY) / 5000, 1.2, 2.8), easing: easeInOutCubic });
      } else if (target === 0) scrollTo(0, 0);
      else target.scrollIntoView();
    });
  });

  /* ---------- Contract address buttons: short in the dock pill (full one on hover), full in the drop-down, copies on click ---------- */
  const copyText = text => {
    const fallback = () => {
      const t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    };
    // Confirm straight away; the clipboard API can stay pending (permissions), so it isn't awaited.
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
  };
  // a ring of grid-sized dots pops out of the button
  const burst = btn => {
    if (reduce) return;
    const r = btn.getBoundingClientRect(), el = document.createElement('span'), N = 12;
    el.className = 'burst';
    el.style.left = `${r.left + r.width / 2}px`; el.style.top = `${r.top + r.height / 2}px`;
    for (let i = 0; i < N; i++) {
      // start on the button's edge (an ellipse round it) and fly 26px further out
      const a = i / N * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a), rx = r.width / 2, ry = r.height / 2;
      const dot = document.createElement('i');
      el.appendChild(dot);
      dot.animate([
        { transform: `translate(${(cx * rx).toFixed(1)}px,${(cy * ry).toFixed(1)}px) scale(1)`, opacity: 1 },
        { transform: `translate(${(cx * (rx + 26)).toFixed(1)}px,${(cy * (ry + 26)).toFixed(1)}px) scale(.4)`, opacity: 0 },
      ], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 750);
  };
  $$('.ca').forEach(btn => {
    const v = $('.ca-v', btn);
    const label = btn.matches('.ca-big, .ca-full') ? CA : CA.slice(0, 4) + '…' + CA.slice(-4); // the big one and the menu's show it all
    v.textContent = label;
    if (btn.closest('.dock') && !btn.matches('.ca-big, .ca-full')) btn.insertAdjacentHTML('beforeend', `<span class="ca-tip">${CA}<small>Click to copy</small></span>`);
    const tip = $('.ca-tip small', btn);
    btn.addEventListener('click', () => {
      copyText(CA);
      burst(btn);
      btn.classList.add('copied');
      v.textContent = 'Copied';
      if (tip) tip.textContent = 'Copied to clipboard';
      clearTimeout(btn._t);
      btn._t = setTimeout(() => {
        btn.classList.remove('copied');
        v.textContent = label;
        if (tip) tip.textContent = 'Click to copy';
      }, 1600);
    });
  });

  /* ---------- Dock (the nav at the bottom): rises in after the intro; the menu opens upward on phones ---------- */
  const navEl = $('#nav');
  const burger = $('#burger');
  const setSheet = open => {
    navEl.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.addEventListener('click', () => setSheet(!navEl.classList.contains('open')));
  $$('.sheet a').forEach(a => a.addEventListener('click', () => setSheet(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setSheet(false); });
  const dockIn = () => setTimeout(() => navEl.classList.add('in'), 700);
  if (introDone) dockIn(); else addEventListener('intro:done', dockIn, { once: true });

  /* ---------- Hero: the floating cards come in once the phone is there ---------- */
  const heroEl = $('#hero');
  const heroGo = () => setTimeout(() => heroEl.classList.add('go'), 500);
  if (introDone) heroGo(); else addEventListener('intro:done', heroGo, { once: true });

  /* ---------- 01 · Pay period: 12–30 Oct 2026 (12 Oct is a Monday); today Thu 22, period ends 25, payday 30 ---------- */
  const grid = $('#tlGrid');
  const SHIFTS = [13, 14, 15, 16, 21, 22];
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let d = 12; d <= 30; d++) {
    const cls = ['tl-day', SHIFTS.includes(d) && 'shift', d === 22 && 'today', d > 25 && d < 30 && 'after', d === 30 && 'pay'].filter(Boolean).join(' ');
    grid.insertAdjacentHTML('beforeend', `<div class="${cls}" data-d="${d}"><small>${DOW[(d - 12) % 7].slice(0, 1)}</small><div class="tl-col"></div><b>${d}</b></div>`);
  }
  const period = $('#period');
  const shiftEls = SHIFTS.map(d => $(`[data-d="${d}"]`, grid));
  const earnedEl = $('#tlEarned');
  const availEl = $('#tlAvail');
  const availN = $('#tlAvailN');
  odo(availN, '0.00');
  let lit = -1;
  function updatePeriod(y) {
    const p = clamp((y - M.periodTop) / (M.periodH - M.vh), 0, 1);
    const n = Math.floor(span(p, 0.08, 0.66) * SHIFTS.length + 1e-4); // shifts filled so far
    if (n !== lit) {
      lit = n;
      shiftEls.forEach((el, i) => el.classList.toggle('on', i < n));
      earnedEl.textContent = n * 80;
    }
    const avail = p > 0.74;
    if (avail !== availEl.classList.contains('on')) {
      availEl.classList.toggle('on', avail);
      odo(availN, avail ? '180.00' : '0.00');
    }
  }

  /* ---------- 02 · Try it: slider + chips drive the payout preview ---------- */
  const range = $('#range'), fill = $('#rangeFill');
  const amt = $('#amt'), recv = $('#recv'), req = $('#req'), taken = $('#taken'), note = $('#minNote');
  const chips = $$('#chips button');
  const NOTE = note.textContent;
  const setAmount = v => {
    v = +v;
    range.value = v;
    fill.style.width = `calc(${v / 180} * (100% - 28px) + 14px)`; // follows the thumb's centre
    amt.textContent = v;
    recv.textContent = v.toFixed(2);
    req.textContent = taken.textContent = '$' + v.toFixed(2);
    chips.forEach(c => c.classList.toggle('on', +c.dataset.v === v));
    const low = v < 5;
    note.classList.toggle('warn', low);
    note.textContent = low ? 'Below the $5.00 minimum.' : NOTE;
  };
  range.addEventListener('input', () => setAmount(range.value));
  chips.forEach(c => c.addEventListener('click', () => setAmount(c.dataset.v)));
  setAmount(50); // the phone beside it shows the app's Withdraw screen with $50 picked

  /* ---------- 03 · Paid as USDC: 100 USDC rides a line from the phone to the wallet as you scroll ---------- */
  // The line runs port to port: from a dot at the phone's edge to a dot on the wallet card's edge, as a smooth
  // S-curve (flat where it leaves and where it arrives). Scroll drives it: the faint track draws in → the chip
  // appears at the phone's port → it rides the line, the bright line filling behind it → it sinks into the
  // wallet's port (a pulse), the balance rolls up → tick. The steps under the balance light as it passes.
  const flow = $('#flow');
  const flowPin = $('#flowPin');
  const fTrack = $('#flowTrack'), fFill = $('#flowFill');
  const portA = $('#portA'), portB = $('#portB'), portRing = $('#portRing');
  const coin = $('#coin');
  const wallet = $('#wallet');
  const walletBal = $('#walletBal');
  odo(walletBal, '0.00');
  const walletOk = $('#walletOk');
  const wsteps = $$('.ws', wallet).map(el => ({ el, at: +el.dataset.at }));
  let landed = false;
  const cubic = (a, b, c, d, t) => {
    const u = 1 - t;
    return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
             y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y };
  };
  const f1 = v => v.toFixed(1);
  function updateFlow(y) {
    const p = clamp((y - M.flowTop) / (M.flowH - M.vh), 0, 1);
    // where the sticky pin's top is on screen, from cached numbers (reading layout every frame made it janky)
    const pinTop = y < M.flowTop ? M.flowTop - y : Math.min(0, M.flowTop + M.flowH - M.vh - y);
    if (pinTop > M.vh || pinTop < -M.vh) return;
    const ph = window.__phoneAt, card = M.cardAt;
    if (!ph) return;
    const pcx = ph.x, pcy = ph.y - pinTop; // phone centre, in pin coordinates
    let p0, p1, c1, c2;
    if (M.isMobile) {
      // phone above the card: leave the phone's right side, curve down into the top of the card
      p0 = { x: pcx + ph.h * 0.25 + 10, y: pcy }; // the phone faces you here, so its edge is ~0.23 of its height out
      p1 = { x: card.right - 74, y: card.top }; // just left of the tick badge (16px in, 34px wide), not on it
      c1 = { x: p0.x + (p1.x - p0.x) * 0.9, y: p0.y };
      c2 = { x: p1.x, y: p0.y + (p1.y - p0.y) * 0.45 };
    } else {
      // phone left, card right: from the phone's edge (level with its payout card) to the card's edge (level with the balance)
      p0 = { x: pcx + ph.h * 0.17 + 14, y: pcy - ph.h * 0.22 };
      p1 = { x: card.left, y: card.balY };
      const dx = Math.max(p1.x - p0.x, 80);
      c1 = { x: p0.x + dx * 0.9, y: p0.y - ph.h * 0.22 }; // up and over …
      c2 = { x: p1.x - dx * 0.7, y: p1.y };              // … then in flat to the wallet's edge
    }
    const d = `M${f1(p0.x)} ${f1(p0.y)} C${f1(c1.x)} ${f1(c1.y)} ${f1(c2.x)} ${f1(c2.y)} ${f1(p1.x)} ${f1(p1.y)}`;
    fTrack.setAttribute('d', d); fFill.setAttribute('d', d);
    portA.setAttribute('cx', f1(p0.x)); portA.setAttribute('cy', f1(p0.y));
    portB.setAttribute('cx', f1(p1.x)); portB.setAttribute('cy', f1(p1.y));
    portRing.setAttribute('cx', f1(p1.x)); portRing.setAttribute('cy', f1(p1.y));

    const draw = span(p, 0.14, 0.24);                 // the faint track draws in, the ports appear
    const show = span(p, 0.22, 0.3);                  // the chip appears at the phone's port
    const t = easeInOutCubic(span(p, 0.3, 0.74));     // it rides the line
    const sink = span(p, 0.74, 0.8);                   // and sinks into the wallet's port
    fTrack.style.strokeDashoffset = (1 - easeOut(draw)).toFixed(4);
    fFill.style.strokeDashoffset = (1 - t).toFixed(4);
    portA.style.opacity = portB.style.opacity = draw.toFixed(3);
    portA.classList.toggle('on', t > 0);

    const at = cubic(p0, c1, c2, p1, t);
    const sc = (0.6 + 0.4 * easeOut(show)) * (1 - 0.6 * sink);
    coin.style.transform = `translate(${f1(at.x)}px,${f1(at.y)}px) translate(-50%,-50%) scale(${sc.toFixed(3)})`;
    coin.style.opacity = (show * (1 - sink)).toFixed(3);

    odo(walletBal, p >= 0.8 ? '100.00' : '0.00');
    wallet.classList.toggle('lit', p >= 0.78);
    wsteps.forEach(s => s.el.classList.toggle('on', p >= s.at));
    walletOk.classList.toggle('on', p >= 0.9);
    const arrived = sink >= 1;
    portB.classList.toggle('on', arrived);
    if (arrived && !landed) { portRing.classList.remove('go'); void portRing.getBBox(); portRing.classList.add('go'); }
    landed = arrived;
  }

  /* ---------- The app: scrolling through the pinned section swipes through the five steps ---------- */
  // Each step owns a fifth of the pinned scroll. Its text swipes in from the right (the previous one leaves to the
  // left), like the app's own onboarding; the pager dots and the list on the right follow; the phone shows that
  // step's screen (screens.js reads window.__tour).
  const tour = $('#tour');
  const slides = $$('.slide', tour);
  const dots = $$('#dots i');
  const stepItems = $$('#steps li');
  window.__tour = { p: 0, step: 0 };
  let tourStep = -1;
  function updateTour(y) {
    const p = clamp((y - M.tourTop) / (M.tourH - M.vh), 0, 1);
    const step = Math.min(slides.length - 1, Math.floor(p * slides.length));
    window.__tour.p = p;
    window.__tour.step = step;
    if (step === tourStep) return;
    tourStep = step;
    slides.forEach((el, i) => { el.classList.toggle('on', i === step); el.classList.toggle('prev', i < step); });
    dots.forEach((el, i) => el.classList.toggle('on', i === step));
    stepItems.forEach((el, i) => { el.classList.toggle('on', i === step); el.classList.toggle('done', i < step); });
  }

  /* ---------- FAQ: one open at a time ---------- */
  const faqs = $$('.faq details');
  faqs.forEach(d => d.addEventListener('toggle', () => { if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; }); }));

  /* ---------- Headings: words come in one after another (Coldly's, as on CalorieEarn) ---------- */
  const wordHeads = $$('main h1, main h2');
  wordHeads.forEach(h => {
    let i = 0;
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--i', i++);
            w.textContent = part;
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(h);
    h.classList.add('words-in');
  });
  const once = (els, threshold) => {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold });
    els.forEach(el => io.observe(el));
  };
  const heroH1 = $('.hero h1');
  const h1Go = () => setTimeout(() => heroH1.classList.add('in'), 150);
  if (introDone) h1Go(); else addEventListener('intro:done', h1Go, { once: true });
  once(wordHeads.filter(h => h !== heroH1), 0.4);

  /* ---------- Cards rise in ---------- */
  const risers = $$('.sec:not(.final) .l .lead, .try-card, .tl, .wallet, .faq-list details, .final-r');
  risers.forEach(el => el.classList.add('rise'));
  $$('.faq-list details').forEach((el, i) => { el.style.transitionDelay = `${i * 60}ms`; });
  once(risers, 0.15);

  /* ---------- Cursor polish: buttons lean toward the cursor; panel borders catch a light where it is ---------- */
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    $$('.btn').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
        b.style.setProperty('--my', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
      });
      b.addEventListener('pointerleave', () => { b.style.removeProperty('--mx'); b.style.removeProperty('--my'); });
    });
    // the light follows the cursor while it is on or near a panel (within 120px), so it can travel along the edge
    const panels = $$('.panel');
    addEventListener('pointermove', e => {
      for (const p of panels) {
        const r = p.getBoundingClientRect();
        const near = e.clientX > r.left - 120 && e.clientX < r.right + 120 && e.clientY > r.top - 120 && e.clientY < r.bottom + 120;
        p.classList.toggle('edge', near);
        if (near) { p.style.setProperty('--px', `${(e.clientX - r.left).toFixed(0)}px`); p.style.setProperty('--py', `${(e.clientY - r.top).toFixed(0)}px`); }
      }
    }, { passive: true });
    document.addEventListener('pointerleave', () => panels.forEach(p => p.classList.remove('edge')));
  }

  /* ---------- Nav: active link, island after the hero ---------- */
  const navLinks = $$('#links a');
  const navSecs = navLinks.map(a => document.getElementById(a.dataset.sec));
  let navActive = null;
  function updateNav(y) {
    const line = y + M.vh * 0.4;
    let active = -1;
    M.nav.forEach((top, i) => { if (top <= line) active = i; });
    if (M.final <= line) active = -1;
    if (active !== navActive) { navActive = active; navLinks.forEach((a, i) => a.classList.toggle('active', i === active)); }
    heroEl.style.setProperty('--out', clamp(y / (M.vh * 0.3), 0, 1).toFixed(3)); // the floating cards leave with the phone
  }

  /* ---------- Background: dot grid; the cursor leaves a short cyan trail through it ----------
     Each dot holds a charge: passing near it tops the charge up, then it fades over about a second.
     The plain dots are drawn on this same canvas (not a CSS gradient): at browser zoom levels like 110% Chrome rounds
     CSS background tiles to whole pixels, so a CSS grid drifts away from dots drawn here. */
  (() => {
    const cvs = $('#dotTrail');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const base = document.createElement('canvas'), bctx = base.getContext('2d');
    const GAP = 28, BRUSH = 64, DECAY = 0.94;
    const interactive = !reduce && matchMedia('(pointer: fine)').matches;
    let cols = 0, rows = 0, charge = new Float32Array(0), dpr = 1;
    let lastX = null, lastY = null, running = false;
    const dotAt = i => [(i % cols) * GAP + GAP / 2, Math.floor(i / cols) * GAP + GAP / 2];

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      for (const [c, x] of [[cvs, ctx], [base, bctx]]) {
        c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr);
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      cols = Math.ceil(innerWidth / GAP) + 1; rows = Math.ceil(innerHeight / GAP) + 1;
      charge = new Float32Array(cols * rows);
      // the plain grid is drawn once here, then copied in each frame
      bctx.fillStyle = 'rgba(255,255,255,.09)';
      bctx.beginPath();
      for (let i = 0; i < cols * rows; i++) { const [x, y] = dotAt(i); bctx.moveTo(x + 1, y); bctx.arc(x, y, 1, 0, Math.PI * 2); }
      bctx.fill();
      paint();
    }
    function paint() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.drawImage(base, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // light up every dot within the brush around (x, y)
    function stamp(x, y) {
      const c0 = Math.max(0, Math.floor((x - BRUSH) / GAP)), c1 = Math.min(cols - 1, Math.ceil((x + BRUSH) / GAP));
      const r0 = Math.max(0, Math.floor((y - BRUSH) / GAP)), r1 = Math.min(rows - 1, Math.ceil((y + BRUSH) / GAP));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const d = Math.hypot(c * GAP + GAP / 2 - x, r * GAP + GAP / 2 - y);
        if (d >= BRUSH) continue;
        const k = 1 - d / BRUSH, i = r * cols + c;
        if (k * k > charge[i]) charge[i] = k * k;
      }
    }
    function tick() {
      paint();
      let alive = false;
      for (let i = 0; i < charge.length; i++) {
        const k = charge[i];
        if (k < 0.015) { charge[i] = 0; continue; }
        alive = true;
        const [x, y] = dotAt(i);
        ctx.fillStyle = `rgba(157,241,245,${(0.12 + 0.78 * k).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, 1 + 1.4 * k, 0, Math.PI * 2);
        ctx.fill();
        charge[i] = k * DECAY;
      }
      if (alive) requestAnimationFrame(tick);
      else running = false;
    }
    if (interactive) {
      addEventListener('pointermove', e => {
        const x = e.clientX, y = e.clientY;
        // fill in the gap between pointer events so fast moves still leave an unbroken trail
        if (lastX !== null) {
          const steps = Math.min(40, Math.ceil(Math.hypot(x - lastX, y - lastY) / (GAP / 2)));
          for (let s = 1; s < steps; s++) stamp(lastX + (x - lastX) * s / steps, lastY + (y - lastY) * s / steps);
        }
        stamp(x, y);
        lastX = x; lastY = y;
        if (!running) { running = true; requestAnimationFrame(tick); }
      }, { passive: true });
      document.addEventListener('pointerleave', () => { lastX = lastY = null; });
    }
    addEventListener('resize', resize);
    resize();
  })();

  /* ---------- Background: the line drawing drifts slowly ---------- */
  const arts = $$('.bg-art');
  function updateBackground(y) {
    const mid = M.vh / 2;
    arts.forEach((a, i) => {
      const c = M.arts[i].c - y, half = M.arts[i].h / 2;
      if (c + half < -200 || c - half > M.vh + 200) return;
      const off = (c - mid) * -0.18;
      a.style.transform = `translate3d(0,${off.toFixed(1)}px,0) rotate(${(off * 0.012).toFixed(2)}deg)`;
    });
  }

  /* ---------- Loop: layout is measured once (and on resize); each frame only does arithmetic ---------- */
  let M;
  const pageTop = el => el.getBoundingClientRect().top + scrollY;
  function measure() {
    M = {
      vw: innerWidth, vh: innerHeight,
      isMobile: innerWidth <= 900,
      docMax: document.documentElement.scrollHeight - innerHeight,
      heroH: heroEl.offsetHeight,
      nav: navSecs.map(pageTop),
      final: pageTop($('#ca')),
      periodTop: pageTop(period), periodH: period.offsetHeight,
      flowTop: pageTop(flow), flowH: flow.offsetHeight,
      tourTop: pageTop(tour), tourH: tour.offsetHeight,
      // the wallet card's edges and its balance line, in pin coordinates (the coin's line ends there)
      cardAt: (() => {
        const c = wallet.getBoundingClientRect(), b = walletBal.getBoundingClientRect(), f = flowPin.getBoundingClientRect();
        return { left: c.left, right: c.right, top: c.top - f.top, balY: b.top - f.top + b.height / 2 };
      })(),
      arts: arts.map(a => ({ c: pageTop(a.parentElement) + a.parentElement.offsetHeight / 2, h: a.parentElement.offsetHeight })),
    };
  }
  function onScroll() {
    const y = scrollY;
    updateNav(y); updatePeriod(y); updateTour(y); updateBackground(y);
  }
  measure();
  if (lenis) lenis.on('scroll', onScroll);
  else addEventListener('scroll', onScroll, { passive: true });
  // The coin follows the 3D phone (which floats and trails the scroll), so it's updated every frame.
  // (only while the section is on screen)
  (function flowLoop() {
    const y = scrollY;
    if (M && y > M.flowTop - M.vh && y < M.flowTop + M.flowH) updateFlow(y);
    requestAnimationFrame(flowLoop);
  })();
  const remeasure = () => { measure(); onScroll(); };
  addEventListener('resize', remeasure);
  new ResizeObserver(remeasure).observe(document.body);
  document.fonts.ready.then(remeasure);
  onScroll();
})();
