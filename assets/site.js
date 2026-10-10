/* =========================================================================
   Henry Zisow — site script
   Everything that moves is optional: without GSAP, or with reduced motion
   on, the page renders as a plain top-to-bottom document and the
   interactive bits (terminal, pads, menu, modal) still work.
   ========================================================================= */
(function () {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const hasGSAP = !!(gsap && ScrollTrigger);
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const motionOK = () => hasGSAP && !reduceMQ.matches;

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    // Phones show/hide the URL bar constantly; don't re-measure every pin for it.
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------- Text helpers ---------- */
  const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789/._-+*#';

  // Resolves left to right out of random glyphs. Mono text keeps its width.
  function scramble(el, text, duration) {
    if (text == null) text = el.dataset.text || el.textContent;
    cancelAnimationFrame(el._scramble);
    if (!motionOK()) { el.textContent = text; return; }
    const start = performance.now();
    const len = text.length;
    const tick = now => {
      const p = clamp((now - start) / (duration || 900), 0, 1);
      const fixed = Math.floor(p * len);
      let out = text.slice(0, fixed);
      for (let i = fixed; i < len; i++) {
        out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._scramble = requestAnimationFrame(tick);
    };
    el._scramble = requestAnimationFrame(tick);
  }

  // Wraps every character in a masked word so headings can rise into place.
  // Screen readers get the heading text once, via aria-label.
  function splitChars(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const wrap = document.createElement('span');
    wrap.setAttribute('aria-hidden', 'true');
    const chars = [];
    const walk = (node, into) => {
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { into.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'split-word';
            for (const ch of part) {
              const c = document.createElement('span');
              c.className = 'split-char';
              c.textContent = ch;
              w.appendChild(c);
              chars.push(c);
            }
            into.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          const shell = n.cloneNode(false);
          into.appendChild(shell);
          walk(n, shell);
        }
      });
    };
    walk(el, wrap);
    el.textContent = '';
    el.appendChild(wrap);
    el.setAttribute('aria-label', label);
    return chars;
  }

  // Wraps words in place (keeps <em> and friends) for the About read-along.
  function splitWords(el) {
    const words = [];
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.textContent = part;
            frag.appendChild(w);
            words.push(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    return words;
  }

  $$('[data-scramble]').forEach(el => { el.dataset.text = el.textContent.trim(); });

  /* ---------- Nav: "where am I" label ---------- */
  const whereEl = $('#nav-where');
  const WHERE = {
    about: '01 / About', projects: '02 / Projects', graveyard: '03 / Graveyard',
    leadership: '04 / Leadership', record: '05 / Record', stack: '06 / Stack', contact: '07 / Contact'
  };
  let whereNow;
  function setWhere(key) {
    if (key === whereNow || !whereEl) return;
    whereNow = key;
    whereEl.textContent = key ? WHERE[key] : '';
  }

  /* ---------- Hero dot field ---------- */
  // A grid of dots that bulge away from the cursor. Only runs while the hero
  // is on screen and uncovered; with reduced motion it draws once and stops.
  const field = (function () {
    const canvas = $('#hero-field');
    if (!canvas || !canvas.getContext) return { setActive() {} };
    const ctx = canvas.getContext('2d');
    const GAP = 24, R = 160;
    let w = 0, h = 0, pts = new Float32Array(0);
    let raf = 0, running = false, visible = true, enabled = true;
    const m = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.ceil(w / GAP) + 1, rows = Math.ceil(h / GAP) + 1;
      const ox = (w - (cols - 1) * GAP) / 2, oy = (h - (rows - 1) * GAP) / 2;
      pts = new Float32Array(cols * rows * 2);
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) { pts[i++] = ox + c * GAP; pts[i++] = oy + r * GAP; }
      }
      if (!running) draw(performance.now());
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      m.x += (m.tx - m.x) * 0.14;
      m.y += (m.ty - m.y) * 0.14;
      const wave = motionOK();
      const near = [];
      ctx.fillStyle = 'rgba(18, 21, 27, 0.15)';
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i];
        let y = pts[i + 1];
        if (wave) y += Math.sin(t * 0.0011 + x * 0.011 + y * 0.004) * 1.6;
        const dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < R * R) { near.push(x, y, dx, dy, Math.sqrt(d2) || 1); continue; }
        ctx.moveTo(x + 1.1, y);
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      }
      ctx.fill();
      for (let j = 0; j < near.length; j += 5) {
        const d = near[j + 4], f = 1 - d / R, e = f * f, push = e * 26;
        ctx.fillStyle = 'rgba(59, 133, 199, ' + (0.22 + e * 0.75).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(near[j] + near[j + 2] / d * push, near[j + 1] + near[j + 3] / d * push, 1.1 + e * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
    function sync() {
      const should = enabled && visible && !document.hidden && motionOK();
      if (should && !running) { running = true; raf = requestAnimationFrame(loop); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }

    window.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      m.tx = e.clientX - r.left;
      m.ty = e.clientY - r.top;
      if (m.x < -1e3) { m.x = m.tx; m.y = m.ty; }
    }, { passive: true });
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) { m.tx = m.ty = -1e4; } });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; sync(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', sync);
    resize();
    sync();
    return { setActive(v) { if (v !== enabled) { enabled = v; sync(); } } };
  })();

  /* ---------- Draggable stickers (mouse/trackpad only) ---------- */
  function initDrag() {
    if (!finePointer || !hasGSAP) return;
    root.classList.add('can-drag');
    const hero = $('.hero');
    $$('.sticker[data-drag]').forEach(el => {
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, lx = 0, ly = 0, lt = 0, vx = 0, vy = 0, base = 0, b = null;
      el.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        dragging = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add('is-dragging');
        base = parseFloat(el.style.getPropertyValue('--r')) || 0;
        ox = gsap.getProperty(el, 'x');
        oy = gsap.getProperty(el, 'y');
        const r = el.getBoundingClientRect(), hr = hero.getBoundingClientRect();
        b = {
          minX: ox + hr.left - r.left + 6, maxX: ox + hr.right - r.right - 6,
          minY: oy + hr.top - r.top + 64, maxY: oy + hr.bottom - r.bottom - 6
        };
        sx = lx = e.clientX; sy = ly = e.clientY; lt = performance.now(); vx = vy = 0;
        gsap.to(el, { scale: 1.07, duration: 0.25, overwrite: 'auto' });
      });
      el.addEventListener('pointermove', e => {
        if (!dragging) return;
        const now = performance.now(), dt = Math.max(1, now - lt);
        vx = vx * 0.6 + ((e.clientX - lx) / dt) * 0.4;
        vy = vy * 0.6 + ((e.clientY - ly) / dt) * 0.4;
        lx = e.clientX; ly = e.clientY; lt = now;
        gsap.set(el, { x: clamp(ox + e.clientX - sx, b.minX, b.maxX), y: clamp(oy + e.clientY - sy, b.minY, b.maxY) });
        gsap.to(el, { rotation: base + clamp(vx * 10, -16, 16), duration: 0.35, overwrite: 'auto' });
      });
      const end = e => {
        if (!dragging) return;
        dragging = false;
        el.classList.remove('is-dragging');
        if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        gsap.to(el, {
          x: clamp(gsap.getProperty(el, 'x') + vx * 140, b.minX, b.maxX),
          y: clamp(gsap.getProperty(el, 'y') + vy * 140, b.minY, b.maxY),
          rotation: base, scale: 1, duration: 1, ease: 'expo.out', overwrite: 'auto'
        });
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
  }

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    if (!finePointer || !motionOK()) return;
    const c = $('#cursor'), label = $('#cursor-label');
    if (!c) return;
    root.classList.add('has-cursor');
    c.classList.add('is-hidden'); // until the first real mouse move
    const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' });
    let shown = '', px = -1, py = -1, pending = false;
    const relabel = target => {
      const t = target && target.closest ? target.closest('[data-drag], [data-cursor], .pad') : null;
      let want = '';
      if (t) want = t.matches('[data-drag]') ? 'drag' : t.matches('.pad') ? 'play' : t.dataset.cursor;
      if (want !== shown) {
        shown = want;
        label.textContent = want;
        c.classList.toggle('is-label', !!want);
      }
    };
    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
      xTo(px);
      yTo(py);
      c.classList.remove('is-hidden');
      relabel(e.target);
    }, { passive: true });
    // Content slides under a still cursor while scrolling; re-read what's beneath it.
    window.addEventListener('scroll', () => {
      if (px < 0 || pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; relabel(document.elementFromPoint(px, py)); });
    }, { passive: true });
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) c.classList.add('is-hidden'); });
  }

  /* ---------- Preloader + hero entrance ---------- */
  function heroInitialState() {
    if (!motionOK()) return;
    gsap.set('.hero-name .ch', { yPercent: 115 });
    gsap.set('.hero .sticker', { scale: 0.3, opacity: 0, rotation: '+=25' });
    gsap.set('.hero-scroll', { opacity: 0 });
    const tag = $('.hero-tag');
    if (tag) tag.style.visibility = 'hidden';
  }

  function heroIn() {
    const tag = $('.hero-tag');
    if (!motionOK()) { if (tag) tag.style.visibility = ''; return; }
    gsap.timeline()
      .to('.hero-name .ch', { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.05, clearProps: 'transform' })
      .to('.hero .sticker', { scale: 1, opacity: 1, rotation: '-=25', duration: 1, ease: 'back.out(1.7)', stagger: 0.08 }, 0.35)
      .add(() => { if (tag) { tag.style.visibility = ''; scramble(tag, tag.dataset.text, 1100); } }, 0.5)
      .to('.hero-scroll', { opacity: 1, duration: 0.6 }, 0.9);
  }

  function runLoader(done) {
    const loader = $('#loader');
    if (!loader) { done(); return; }
    if (!motionOK()) { loader.remove(); done(); return; }
    const pct = $('#loader-pct'), chart = $('.loader-chart');
    const s = { p: 0 };
    const render = () => {
      pct.textContent = Math.round(s.p);
      chart.style.clipPath = 'inset(0 ' + (100 - s.p).toFixed(2) + '% 0 0)';
    };
    const loaded = new Promise(res => {
      if (document.readyState === 'complete') res();
      else window.addEventListener('load', res, { once: true });
    });
    const ready = Promise.race([
      Promise.all([loaded, document.fonts ? document.fonts.ready : null]),
      new Promise(res => setTimeout(res, 2600))
    ]);
    const finish = () => {
      gsap.timeline({ onComplete: () => loader.remove() })
        .to(s, { p: 100, duration: 0.35, ease: 'power1.inOut', onUpdate: render })
        .to('.loader-card', { y: -30, opacity: 0, scale: 0.96, duration: 0.45, ease: 'power3.in' }, '+=0.12')
        .to(loader, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.1')
        .add(done, '-=0.6');
    };
    render();
    gsap.to(s, { p: 86, duration: 1, ease: 'power2.out', onUpdate: render, onComplete: () => ready.then(finish) });
  }

  /* ---------- Terminal (works with or without motion) ---------- */
  function initTerminal() {
    const tabs = $$('.term-row');
    if (!tabs.length) return;
    const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
    function select(i, focus) {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[j].classList.toggle('is-active', on);
      });
      if (focus) tabs[i].focus();
      if (motionOK()) {
        const p = panels[i], name = $('.tp-name', p);
        if (!name.dataset.text) name.dataset.text = name.textContent;
        scramble(name, name.dataset.text, 420);
        gsap.fromTo($$('.tp-head, .tp-note, .tp-lead, .tp-desc, .tp-stack, .tp-keys', p),
          { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out', overwrite: true });
      }
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { if (t.getAttribute('aria-selected') !== 'true') select(i); });
      t.addEventListener('keydown', e => {
        let n = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });

    const clock = $('#term-clock');
    if (clock && window.Intl) {
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
      });
      const tick = () => { clock.textContent = 'BOS ' + fmt.format(new Date()); };
      tick();
      setInterval(tick, 1000);
    }
  }

  /* ---------- Pad controller ---------- */
  let menuIsOpen = false;
  function initPads() {
    const device = $('#pad-device');
    const pads = $$('.pad');
    if (!device || !pads.length) return;
    const lcd = $('#pad-lcd'), soundBtn = $('#pad-sound');
    const CAT = { skill: 'Skill', interest: 'Interest', hobby: 'Hobby' };
    const KEYS = '123456qwertyasdfgh';
    const SCALE = [0, 3, 5, 7, 10]; // minor pentatonic: nothing clashes
    let soundOn = true, actx = null;

    function play(i, cat) {
      if (!soundOn) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        const t = actx.currentTime;
        const f = 130.81 * Math.pow(2, (12 * Math.floor(i / 5) + SCALE[i % 5]) / 12);
        const out = actx.createGain();
        out.gain.setValueAtTime(0.0001, t);
        out.gain.exponentialRampToValueAtTime(0.2, t + 0.008);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        const lp = actx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3200, t);
        lp.frequency.exponentialRampToValueAtTime(500, t + 0.7);
        const o1 = actx.createOscillator();
        o1.type = cat === 'hobby' ? 'square' : 'triangle';
        o1.frequency.value = f;
        const o2 = actx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = f * 2;
        const g2 = actx.createGain();
        g2.gain.value = cat === 'interest' ? 0.5 : 0.25;
        o1.connect(lp);
        o2.connect(g2).connect(lp);
        lp.connect(out).connect(actx.destination);
        o1.start(t); o2.start(t);
        o1.stop(t + 1); o2.stop(t + 1);
      } catch (_) { /* no audio, no problem */ }
    }

    function hit(i) {
      const p = pads[i];
      p.classList.remove('is-hit');
      void p.offsetWidth;
      p.classList.add('is-hit');
      clearTimeout(p._hit);
      p._hit = setTimeout(() => p.classList.remove('is-hit'), 170);
      lcd.textContent = '▶ ' + $('span', p).textContent + ' · ' + CAT[p.dataset.cat];
      play(i, p.dataset.cat);
    }

    pads.forEach((p, i) => {
      p.addEventListener('pointerdown', e => { if (e.button === 0) hit(i); });
      p.addEventListener('click', e => { if (e.detail === 0) hit(i); }); // keyboard Enter/Space
    });

    let inView = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { inView = en.isIntersecting; }, { threshold: 0.35 }).observe(device);
    }
    document.addEventListener('keydown', e => {
      if (!inView || menuIsOpen || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
      if ($('.modal-overlay.open')) return;
      const i = KEYS.indexOf((e.key || '').toLowerCase());
      if (i < 0 || i >= pads.length) return;
      e.preventDefault();
      hit(i);
    });

    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
    });

    // Used by the scroll scene: a diagonal light-up wave when the device arrives.
    device._wave = () => pads.forEach((p, i) => {
      setTimeout(() => {
        p.classList.add('is-glow');
        setTimeout(() => p.classList.remove('is-glow'), 240);
      }, ((i % 6) + Math.floor(i / 6)) * 70);
    });
  }

  /* ---------- Scroll scenes ---------- */
  const SCENES = {};          // id -> { st, frac } for anchor links into pinned scenes
  let statementWords = null;  // split once; the DOM change survives rebuilds

  function headIn(section) {
    $$('[data-split]', section).forEach(h => {
      if (!h._chars) h._chars = splitChars(h);
      gsap.fromTo(h._chars, { yPercent: 112 }, {
        yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.028,
        scrollTrigger: { trigger: h, start: 'top 88%', once: true }
      });
    });
    $$('.sec-sub[data-scramble]', section).forEach(el => {
      el.style.visibility = 'hidden';
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => { el.style.visibility = ''; scramble(el, el.dataset.text, 900); }
      });
    });
  }

  function whereTrigger(section, key) {
    ScrollTrigger.create({
      trigger: section, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => { if (self.isActive) setWhere(key); }
    });
  }

  function buildIntro(isDesktop) {
    const intro = $('.intro'), win = $('#hero-window'), slot = $('#stage-slot'), photo = $('#stage-photo');
    const rel = (el, to) => {
      const a = el.getBoundingClientRect(), b = to.getBoundingClientRect();
      return { x: a.left - b.left, y: a.top - b.top, r: b.right - a.right, b: b.bottom - a.bottom };
    };
    if (!statementWords) statementWords = splitWords($('#stage-statement'));
    const words = statementWords;

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: intro,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * 2.8),
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: self => {
          field.setActive(self.progress < 0.3);
          setWhere(self.progress > 0.2 ? 'about' : null);
        }
      }
    });

    tl.fromTo('.stage', { clipPath: () => {
        const r = rel(win, intro);
        return 'inset(' + r.y + 'px ' + r.r + 'px ' + r.b + 'px ' + r.x + 'px round 16px)';
      } },
      { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1, ease: 'power2.inOut' }, 0)
      .fromTo(photo, {
        x: () => rel(win, slot).x, y: () => rel(win, slot).y,
        width: () => win.offsetWidth, height: () => win.offsetHeight, borderRadius: 16
      }, {
        x: 0, y: 0, width: () => slot.offsetWidth, height: () => slot.offsetHeight,
        borderRadius: isDesktop ? 18 : 0, duration: 1, ease: 'power2.inOut'
      }, 0)
      .fromTo(photo, { '--shade': 0 }, { '--shade': 1, duration: 0.6 }, 0.45)
      .fromTo('.hero-name', { yPercent: 0, opacity: 1, scale: 1 }, { yPercent: -18, opacity: 0, scale: 0.94, duration: 0.7, immediateRender: false }, 0)
      .fromTo(['.hero-tag', '.hero-scroll'], { opacity: 1 }, { opacity: 0, duration: 0.3, immediateRender: false }, 0)
      .fromTo('.hero .sticker', { opacity: 1, yPercent: 0 }, { opacity: 0, yPercent: -60, duration: 0.6, stagger: 0.04, immediateRender: false }, 0.05)
      .fromTo('.stage-copy', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.72)
      .fromTo('.stage-label', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3 }, 0.8)
      .fromTo(words, { opacity: 0.12 }, { opacity: 1, duration: 0.25, stagger: 1.1 / words.length }, 0.95)
      .fromTo('.stage-sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35 }, 2.0)
      .fromTo('.stage-stats > div', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.08 }, 2.25);

    $$('.stage-stats [data-count]').forEach((el, i) => {
      const target = +el.dataset.count, suffix = el.dataset.suffix || '', o = { v: 0 };
      tl.fromTo(o, { v: 0 }, {
        v: target, duration: 0.45, ease: 'power1.out',
        onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US') + suffix; }
      }, 2.3 + i * 0.08);
    });
    tl.to({}, { duration: 0.35 }); // a beat to read before it unpins

    SCENES.about = { st: tl.scrollTrigger, frac: 0.92 };
    SCENES.top = { st: tl.scrollTrigger, frac: 0 };
  }

  function buildLeadership(isDesktop) {
    const lead = $('.lead'), track = $('.lead-track'), badges = $$('.badge');
    if (isDesktop) {
      root.classList.add('lead-h');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const rotTo = badges.map(b => gsap.quickTo(b, 'rotation', { duration: 1.1, ease: 'elastic.out(1, 0.35)' }));
      const slide = gsap.to(track, { x: () => -dist(), ease: 'none' });
      const st = ScrollTrigger.create({
        trigger: lead, start: 'top top', end: () => '+=' + dist(),
        pin: true, scrub: 0.8, animation: slide, invalidateOnRefresh: true,
        onUpdate: self => {
          const r = clamp(-self.getVelocity() / 160, -9, 9);
          rotTo.forEach((to, i) => to(r * (0.8 + (i % 3) * 0.15)));
        }
      });
      const settle = () => rotTo.forEach(to => to(0));
      ScrollTrigger.addEventListener('scrollEnd', settle);
      badges.forEach(b => {
        gsap.from(b, {
          yPercent: -30, opacity: 0, duration: 1.2, ease: 'elastic.out(1, 0.55)',
          scrollTrigger: { trigger: b, containerAnimation: slide, start: 'left 96%', toggleActions: 'play none none reverse' }
        });
      });
      SCENES.leadership = { st, frac: 0 };
      return () => {
        root.classList.remove('lead-h');
        ScrollTrigger.removeEventListener('scrollEnd', settle);
        delete SCENES.leadership;
      };
    }
    badges.forEach(b => {
      gsap.from(b, {
        y: -60, rotation: -5, opacity: 0, duration: 1.3, ease: 'elastic.out(1, 0.5)',
        scrollTrigger: { trigger: b, start: 'top 88%', once: true }
      });
    });
    return null;
  }

  function buildEnvelope() {
    root.classList.add('env-anim');
    const letter = $('#letter'), flap = $('#env-flap');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.contact', start: 'top top', end: '+=120%', pin: true, scrub: 0.7, invalidateOnRefresh: true }
    });
    tl.fromTo(flap, { rotationX: 0, transformPerspective: 1400 }, { rotationX: 180, duration: 0.45, ease: 'power2.inOut' }, 0)
      .set(flap, { zIndex: 1 }, 0.22)
      // Hidden while sealed so it can't ghost through the seams between flap and front.
      .fromTo(letter, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.12)
      .fromTo(letter, { y: () => letter.offsetHeight - 58 }, { y: 0, duration: 0.6, ease: 'power3.out' }, 0.42)
      .to({}, { duration: 0.2 });
    SCENES.contact = { st: tl.scrollTrigger, frac: 1 };
    return () => { root.classList.remove('env-anim'); delete SCENES.contact; };
  }

  function initScenes() {
    if (!hasGSAP) return;
    const mm = gsap.matchMedia();
    mm.add({
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 861px)',
      wide: '(min-width: 1000px)',
      envelope: '(min-width: 900px) and (min-height: 600px)'
    }, ctx => {
      const { motion, desktop, wide, envelope } = ctx.conditions;
      if (!motion) return;
      root.classList.add('motion');
      const cleanups = [];

      // Built strictly in page order so every pin pushes the ones below it.
      buildIntro(desktop);

      const projects = $('#projects');
      whereTrigger(projects, 'projects');
      headIn(projects);
      gsap.timeline({ scrollTrigger: { trigger: '.term', start: 'top 82%', once: true } })
        .from('.term', { y: 70, opacity: 0, duration: 0.9, ease: 'expo.out' })
        .fromTo('.term-body', { scaleY: 0.012, filter: 'brightness(3)' }, { scaleY: 1, filter: 'brightness(1)', duration: 0.7, ease: 'expo.out', clearProps: 'transform,filter' }, 0.25)
        .from('.term-row', { opacity: 0, x: -14, duration: 0.4, stagger: 0.06 }, 0.6);

      const yard = $('#graveyard');
      whereTrigger(yard, 'graveyard');
      headIn(yard);
      gsap.fromTo('.grave', { yPercent: 118 }, {
        yPercent: 0, ease: 'power2.out', stagger: 0.18,
        scrollTrigger: { trigger: '.yard', start: 'top 88%', end: 'top 38%', scrub: 0.6 }
      });

      gsap.fromTo('.band-a .band-move', { xPercent: 0 }, {
        xPercent: -12, ease: 'none', scrollTrigger: { trigger: '.bands', start: 'top bottom', end: 'bottom top', scrub: true }
      });
      gsap.fromTo('.band-b .band-move', { xPercent: -12 }, {
        xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.bands', start: 'top bottom', end: 'bottom top', scrub: true }
      });

      const lead = $('#leadership');
      const undoLead = buildLeadership(wide);
      if (undoLead) cleanups.push(undoLead);
      whereTrigger(lead, 'leadership');
      headIn(lead);

      const record = $('#record');
      whereTrigger(record, 'record');
      headIn(record);
      gsap.set('[data-reveal]', { opacity: 0, y: 34 });
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 92%', once: true,
        onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, overwrite: true })
      });

      const stack = $('#stack');
      whereTrigger(stack, 'stack');
      headIn(stack);
      gsap.from('#pad-device', {
        y: 80, rotationX: 18, opacity: 0, duration: 1.1, ease: 'expo.out', transformPerspective: 1200,
        scrollTrigger: { trigger: '#pad-device', start: 'top 85%', once: true, onEnter: () => setTimeout(() => $('#pad-device')._wave && $('#pad-device')._wave(), 500) }
      });

      const contact = $('#contact');
      if (envelope) cleanups.push(buildEnvelope());
      whereTrigger(contact, 'contact');
      headIn(contact);

      gsap.fromTo('.footer-giant', { yPercent: 55 }, {
        yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
      });

      return () => {
        cleanups.forEach(fn => fn());
        root.classList.remove('motion');
        $$('[data-scramble]').forEach(el => { el.style.visibility = ''; el.textContent = el.dataset.text; });
        delete SCENES.about;
        delete SCENES.top;
        field.setActive(true);
        setWhere(null);
      };
    });

    // Late font swaps shift every measurement; re-measure once they land.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- In-page links ---------- */
  function scrollToHash(hash) {
    let y = null;
    const key = hash.slice(1);
    const scene = SCENES[key];
    if (hash === '#top' || hash === '#') y = 0;
    else if (scene && scene.st) y = scene.st.start + (scene.st.end - scene.st.start) * scene.frac;
    const el = key ? document.getElementById(key) : null;
    if (y === null) {
      if (!el) return false;
      y = el.getBoundingClientRect().top + window.scrollY;
    }
    window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    if (el) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
    return true;
  }

  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.id === 'menu-btn') return;
    const hash = a.getAttribute('href');
    if (hash.length < 2 && hash !== '#') return;
    if (menuIsOpen) closeMenu(false);
    if (scrollToHash(hash)) e.preventDefault();
  });

  /* ---------- Menu ---------- */
  const menuBtn = $('#menu-btn'), menu = $('#menu');
  let menuTimer = null;
  function openMenu() {
    menuIsOpen = true;
    clearTimeout(menuTimer);
    menu.hidden = false;
    void menu.offsetWidth;
    menu.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    root.style.overflow = 'hidden';
    setTimeout(() => { const first = $('.menu-links a'); if (first) first.focus({ preventScroll: true }); }, 60);
  }
  function closeMenu(restoreFocus) {
    if (!menuIsOpen) return;
    menuIsOpen = false;
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    root.style.overflow = '';
    menuTimer = setTimeout(() => { menu.hidden = true; }, reduceMQ.matches ? 0 : 700);
    if (restoreFocus !== false) menuBtn.focus({ preventScroll: true });
  }
  if (menuBtn && menu) {
    menuBtn.setAttribute('role', 'button');
    $$('.menu-links a').forEach((a, i) => a.style.setProperty('--i', i));
    menuBtn.addEventListener('click', e => { e.preventDefault(); if (menuIsOpen) closeMenu(); else openMenu(); });
    menuBtn.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); menuBtn.click(); } });
    document.addEventListener('keydown', e => {
      if (!menuIsOpen) return;
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key !== 'Tab') return;
      const focusables = [menuBtn].concat($$('a[href]', menu));
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    $$('a:not([href^="#"])', menu).forEach(a => a.addEventListener('click', () => closeMenu(false)));
  }

  /* ---------- Graveyard modal ---------- */
  const graveyard = {
    'ai-tiktok': {
      title: 'AI TikTok Video Automation',
      year: '2025 – 2026',
      description: 'A fully automated AI TikTok video generator and uploader. Uses N8N, UploadPost API, OpenRouter API, and Airtable.',
      tags: ['N8N', 'OpenRouter', 'Automation'],
      download: 'Airtable_to_Platforms.json',
      downloadLabel: 'Download N8N Workflow'
    },
    'sora-downloader': {
      title: 'OpenAI Sora Bulk Downloader',
      year: '2025 – 2026',
      description: 'An easy way to manage and organize Sora AI video downloads. Takes in all the files Sora generates and lets you bulk download with the file name being the prompt, for easy organization.',
      tags: ['Sora', 'OpenAI', 'Replit'],
      link: 'https://sora-batch-gen--hzisow.replit.app/'
    }
  };

  const modal = $('#modal'), modalInner = $('#modal-inner'), modalClose = $('#modal-close-btn');
  let lastFocused = null;

  function openModal(id) {
    const p = graveyard[id];
    if (!p) return;
    lastFocused = document.activeElement;
    $('#modal-year').textContent = 'Rest in peace · ' + p.year;
    $('#modal-title').textContent = p.title;
    $('#modal-desc').textContent = p.description;
    const tags = $('#modal-tags');
    tags.textContent = '';
    p.tags.forEach(t => { const s = document.createElement('span'); s.textContent = t; tags.appendChild(s); });
    const actions = $('#modal-actions');
    actions.textContent = '';
    if (p.link) {
      const a = document.createElement('a');
      a.className = 'btn-ink';
      a.href = p.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Visit site ↗';
      actions.appendChild(a);
    }
    if (p.download) {
      const a = document.createElement('a');
      a.className = 'btn-ink';
      a.href = p.download;
      a.setAttribute('download', '');
      a.textContent = p.downloadLabel + ' ↓';
      actions.appendChild(a);
    }
    actions.hidden = !actions.children.length;
    modal.classList.add('open');
    root.style.overflow = 'hidden';
    modalClose.focus();
  }

  function closeModal() {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    root.style.overflow = '';
    if (lastFocused) lastFocused.focus({ preventScroll: true });
    lastFocused = null;
  }

  if (modal) {
    modalInner.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const f = modalInner.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // The stones are divs, so they need the button affordances spelled out.
    $$('[data-project]').forEach(el => {
      const heading = $('h3', el);
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      if (heading) el.setAttribute('aria-label', heading.textContent + ' — view details');
      el.addEventListener('click', () => openModal(el.dataset.project));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(el.dataset.project); }
      });
    });
  }

  /* ---------- Resume: open in a tab and save a copy ---------- */
  // The anchor's own target="_blank" handles the tab; this adds the download,
  // which a single <a> cannot do alongside navigation.
  $$('.resume-link').forEach(el => el.addEventListener('click', () => {
    const saver = document.createElement('a');
    saver.href = 'Henry%20Zisow%20Resume.pdf';
    saver.download = 'Henry Zisow Resume.pdf';
    document.body.appendChild(saver);
    saver.click();
    document.body.removeChild(saver);
  }));

  /* ---------- Copy email ---------- */
  const copyBtn = $('#copy-email');
  if (copyBtn) {
    const copyLabel = $('.copy-btn-label', copyBtn);
    let resetTimer = null;
    copyBtn.addEventListener('click', async () => {
      const value = copyBtn.dataset.copy;
      let ok = true;
      try {
        await navigator.clipboard.writeText(value);
      } catch (e) {
        // Older browsers, and any non-secure origin, reject the async API.
        try {
          const scratch = document.createElement('textarea');
          scratch.value = value;
          scratch.setAttribute('readonly', '');
          scratch.style.cssText = 'position:absolute;left:-9999px';
          document.body.appendChild(scratch);
          scratch.select();
          ok = document.execCommand('copy');
          document.body.removeChild(scratch);
        } catch (e2) {
          ok = false;
        }
      }
      copyLabel.textContent = ok ? 'Copied' : 'Press ⌘C';
      copyBtn.classList.toggle('copied', ok);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copyLabel.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 2000);
    });
  }

  /* ---------- Boot ---------- */
  initTerminal();
  initPads();
  initScenes();      // adds html.motion and builds the pins before anything is shown
  heroInitialState();
  initDrag();
  initCursor();
  runLoader(heroIn);
})();
