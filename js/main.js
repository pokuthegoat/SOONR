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

  /* ---------- Dock (the nav at the top): drops in after the intro; the menu opens downward on phones ---------- */
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
  const portA = $('#portA'), portB = $('#portB');
  const coin = $('#coin');
  const wallet = $('#wallet');
  const walletBal = $('#walletBal');
  odo(walletBal, '0.00');
  const walletOk = $('#walletOk');
  const wsteps = $$('.ws', wallet).map(el => ({ el, at: +el.dataset.at }));
  const cubic = (a, b, c, d, t) => {
    const u = 1 - t;
    return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
             y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y };
  };
  const f1 = v => v.toFixed(1);
  // Desktop: the section slides sideways. One row (x in px from the left column's edge): the text, the payout
  // preview the USDC leaves from (in the middle column), the line with the three stages along it, then the wallet.
  // The coin slides out of the preview's edge to a spot just right of it and waits there while the row slides left
  // under it (the bright line fills up to it, each stage lights as it reaches it); at the end the wallet arrives
  // and the coin drops into it.
  const flowIn = $('#flowIn'), flowL = $('.l', flowIn), flowR = $('.r', flowIn), flowSrc = $('#flowSrc');
  const stations = $('#stations'), stEls = $$('.st', stations);
  function layoutFlowX() {
    const L = M.lay, srcW = flowSrc.offsetWidth;
    const srcX = L.colW + (L.mid - srcW) / 2;
    const port = srcX + srcW;                          // the preview's right edge: the line starts here
    const coinX = port + 96;
    const pitch = Math.max(300, L.colW * 0.92);
    const st0 = coinX + 150;
    const stX = stEls.map((_, i) => st0 + i * pitch);
    const walletX = st0 + 3 * pitch;
    M.fx = { srcX, port, coinX, stX, walletX, travel: walletX - coinX - 18, len: walletX - port };
    stations.style.setProperty('--len', M.fx.len + 'px');
    stEls.forEach((el, i) => { el.style.left = (stX[i] - port) + 'px'; });
  }
  function updateFlowX(p) {
    const F = M.fx, L = M.lay;
    const draw = span(p, 0.02, 0.1);
    const show = span(p, 0.03, 0.24); // a long stretch, so it eases out of the preview instead of darting out as the section pins
    const T = F.travel * easeInOutCubic(span(p, 0.13, 0.86)); // how far the row has slid left
    const sink = span(p, 0.86, 0.92);
    flowL.style.transform = `translate3d(${f1(-T)}px,-50%,0)`;
    flowSrc.style.transform = `translate3d(${f1(F.srcX - T)}px,-50%,0)`;
    flowR.style.transform = `translate3d(${f1(F.walletX - T)}px,-50%,0)`;
    stations.style.transform = `translate3d(${f1(F.port - T)}px,0,0)`;
    stations.style.setProperty('--draw', easeOut(draw).toFixed(4));
    // the bead starts hidden under the preview and slides out of its edge to its spot; at the end it runs on under the
    // wallet's edge (which arrives 18px past that spot) and the wallet's border fills from there
    const cx = F.port - 64 + (F.coinX - F.port + 64) * easeInOutCubic(show) + 70 * sink; // on screen, from the left column's edge; starts 64px in so its label is hidden too
    stations.style.setProperty('--fill', clamp((cx - (F.port - T)) / F.len, 0, 1).toFixed(4));
    stEls.forEach((el, i) => el.classList.toggle('on', F.stX[i] - T <= cx + 1));
    coin.style.transform = `translate3d(${f1(L.left + cx)}px,${f1(M.vh / 2)}px,0)`;
    coin.style.setProperty('--ang', '0deg');
    const inWallet = sink >= 0.26;                      // the bead has reached the wallet's edge
    wallet.classList.toggle('lit', inWallet);
    odo(walletBal, sink >= 0.6 ? '100.00' : '0.00');
    wsteps.forEach((s, i) => s.el.classList.toggle('on', i < 2 ? stEls[i].classList.contains('on') : inWallet));
    walletOk.classList.toggle('on', p >= 0.92);
  }
  // Phones: the preview sits above the wallet; the coin rides a curve from the preview's bottom edge into the
  // top of the wallet card.
  function updateFlow(y) {
    const p = clamp((y - M.flowTop) / (M.flowH - M.vh), 0, 1);
    if (!M.isMobile) { updateFlowX(p); return; }
    const card = M.cardAt, src = M.srcAt;
    const p0 = { x: src.right - 64, y: src.bottom };
    const p1 = { x: card.right - 74, y: card.top }; // just left of the tick badge (16px in, 34px wide), not on it
    const midY = (p0.y + p1.y) / 2;
    const c1 = { x: p0.x, y: midY }, c2 = { x: p1.x, y: midY };
    const d = `M${f1(p0.x)} ${f1(p0.y)} C${f1(c1.x)} ${f1(c1.y)} ${f1(c2.x)} ${f1(c2.y)} ${f1(p1.x)} ${f1(p1.y)}`;
    fTrack.setAttribute('d', d); fFill.setAttribute('d', d);
    portA.setAttribute('cx', f1(p0.x)); portA.setAttribute('cy', f1(p0.y));
    portB.setAttribute('cx', f1(p1.x)); portB.setAttribute('cy', f1(p1.y));

    const draw = span(p, 0.14, 0.24);                 // the faint track draws in, the ports appear
    // u: the bead's trip. It starts 26px up inside the preview (hidden under it), drops out of its bottom edge,
    // rides the curve, and runs on 26px down into the wallet, under its top edge.
    const u = easeInOutCubic(span(p, 0.22, 0.8));
    const IN = 0.1, OUT = 0.9;
    const t = clamp((u - IN) / (OUT - IN), 0, 1);     // how far along the curve
    fTrack.style.strokeDashoffset = (1 - easeOut(draw)).toFixed(4);
    fFill.style.strokeDashoffset = (1 - t).toFixed(4);
    portA.style.opacity = portB.style.opacity = draw.toFixed(3);
    portA.classList.toggle('on', u > IN);
    let at, ang;
    if (u < IN) { at = { x: p0.x, y: p0.y - 26 * (1 - u / IN) }; ang = 90; }
    else if (u > OUT) { at = { x: p1.x, y: p1.y + 26 * ((u - OUT) / (1 - OUT)) }; ang = 90; }
    else {
      at = cubic(p0, c1, c2, p1, t);
      const q = cubic(p0, c1, c2, p1, Math.min(1, t + 0.01)), r = cubic(p0, c1, c2, p1, Math.max(0, t - 0.01));
      ang = Math.atan2(q.y - r.y, q.x - r.x) * 180 / Math.PI; // the streak trails along the curve
    }
    coin.style.transform = `translate3d(${f1(at.x)}px,${f1(at.y)}px,0)`;
    coin.style.setProperty('--ang', ang.toFixed(1) + 'deg');

    const inWallet = u >= OUT;
    wallet.classList.toggle('lit', inWallet);
    portB.classList.toggle('on', inWallet);
    odo(walletBal, u >= 0.96 ? '100.00' : '0.00');
    wsteps.forEach(s => s.el.classList.toggle('on', p >= s.at));
    walletOk.classList.toggle('on', p >= 0.88);
  }

  /* ---------- The app: the five steps ---------- */
  // Desktop: the heading and the five steps sit on one row; each step is the app's screen with its text beside it.
  // Each scroll stretch slides the row so the next step lands in the left column (holds between moves), with the
  // one after it waiting dimmed on the right. Phones: each step's text swipes in under its screen.
  const tour = $('#tour');
  const slides = $$('.slide', tour);
  const dots = $$('#dots i');
  const stepItems = $$('#steps li');
  const TOUR_SHOTS = ['signin', 'today', 'withdraw', 'payout', 'activity'];
  const tourShot = $('#tourShot');
  const shotSrc = k => window.__shots?.[k] || `assets/screens/${k}.jpg`;
  // swap in the cleaned-up screens once screens.js has made them (the raw frames show test-build labels)
  const useShots = () => {
    $$('img[data-shot]').forEach(img => { img.src = shotSrc(img.dataset.shot); });
    tourShot.src = shotSrc(TOUR_SHOTS[Math.max(0, tourStep)]);
  };
  addEventListener('shots:ready', useShots);
  window.__tour = { p: 0, step: 0 };
  let tourStep = -1;
  const tourItems = [$('.l', $('#tourIn')), ...slides];
  function layoutTourX() {
    let x = 0;
    M.tx = tourItems.map((el, i) => { const at = x; x += el.offsetWidth + (i === 0 ? 110 : 120); return at; });
  }
  function updateTourX(p) {
    const n = slides.length, raw = p * n, k = Math.min(n - 1, Math.floor(raw)), f = raw - k;
    const pos = k + easeInOutCubic(clamp((f - 0.18) / 0.64, 0, 1));
    const a = Math.floor(pos), b = Math.min(n, a + 1), t = pos - a;
    const off = M.tx[a] + (M.tx[b] - M.tx[a]) * t; // item `pos` at the left column
    tourItems.forEach((el, i) => {
      const d = i - pos;
      el.style.transform = `translate3d(${f1(M.tx[i] - off)}px,-50%,0)`;
      el.style.opacity = (d >= 0 ? 1 - 0.65 * clamp(d, 0, 1) : clamp(1 + d * 1.6, 0, 1)).toFixed(3);
    });
    const step = Math.max(0, Math.round(pos) - 1);
    window.__tour.p = p;
    window.__tour.step = step;
    if (step === tourStep) return;
    tourStep = step;
    dots.forEach((el, i) => el.classList.toggle('on', i === step));
  }
  function updateTour(y) {
    const p = clamp((y - M.tourTop) / (M.tourH - M.vh), 0, 1);
    if (!M.isMobile) { updateTourX(p); return; }
    const step = Math.min(slides.length - 1, Math.floor(p * slides.length));
    window.__tour.p = p;
    window.__tour.step = step;
    if (step === tourStep) return;
    tourStep = step;
    tourShot.src = shotSrc(TOUR_SHOTS[step]);
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
      // phones: the wallet card's and the payout preview's edges, in pin coordinates (the coin's curve joins them)
      cardAt: (() => {
        const c = wallet.getBoundingClientRect(), f = flowPin.getBoundingClientRect();
        return { left: c.left, right: c.right, top: c.top - f.top };
      })(),
      srcAt: (() => {
        const c = flowSrc.getBoundingClientRect(), f = flowPin.getBoundingClientRect();
        return { right: c.right, bottom: c.bottom - f.top };
      })(),
      arts: arts.map(a => ({ c: pageTop(a.parentElement) + a.parentElement.offsetHeight / 2, h: a.parentElement.offsetHeight })),
    };
  }
  // Column layout of .wrap (max 1240px, 32px padding, middle column --mid), for the sideways sections.
  function measureSideways() {
    const cw = document.documentElement.clientWidth, wrapW = Math.min(1240, cw);
    const mid = clamp(cw * 0.27, 300, 380), inner = wrapW - 64;
    M.lay = { left: (cw - wrapW) / 2 + 32, mid, colW: (inner - mid) / 2 };
    for (const el of [flowIn, $('#tourIn')]) el.style.setProperty('--colw', M.lay.colW + 'px');
    if (M.isMobile) {
      [flowL, flowR, flowSrc, stations, ...tourItems].forEach(el => { el.style.transform = ''; el.style.opacity = ''; });
      tourStep = -1;
      return;
    }
    layoutFlowX();
    layoutTourX();
  }
  function onScroll() {
    const y = scrollY;
    updateNav(y); updatePeriod(y); updateTour(y); updateBackground(y);
  }
  measure();
  measureSideways();
  if (lenis) lenis.on('scroll', onScroll);
  else addEventListener('scroll', onScroll, { passive: true });
  // Paid as USDC is updated every frame while it's on screen (Lenis eases the scroll between scroll events).
  (function flowLoop() {
    const y = scrollY;
    if (M && y > M.flowTop - M.vh && y < M.flowTop + M.flowH) updateFlow(y);
    requestAnimationFrame(flowLoop);
  })();
  const remeasure = () => { measure(); measureSideways(); onScroll(); };
  addEventListener('resize', remeasure);
  new ResizeObserver(remeasure).observe(document.body);
  document.fonts.ready.then(remeasure);
  onScroll();
})();
