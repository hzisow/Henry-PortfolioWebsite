/* =========================================================================
   Henry Zisow — T map trip
   Draws the rapid transit map from TMAP, works out the real route between
   each pair of stops, and rides a train along it as the page scrolls. The
   content column works on its own; everything here is an enhancement.
   ========================================================================= */
(function () {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMQ = window.matchMedia('(max-width: 899px)');
  const NS = 'http://www.w3.org/2000/svg';
  const D = window.TMAP;

  function svgEl(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const colorOf = line => (D.lines[line] ? D.lines[line].color : '#1b1b1b');

  /* ---------------------------------------------------------------------
     Geometry: bends get a small rounded corner, sampled into points, so
     the drawn track and the train's path are the same polyline.
     --------------------------------------------------------------------- */
  function sample(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const bend = !p[2] && i > 0 && i < pts.length - 1;
      if (!bend) { out.push({ x: p[0], y: p[1], id: p[2] || null }); continue; }
      const a = pts[i - 1], c = pts[i + 1];
      const d1 = Math.hypot(p[0] - a[0], p[1] - a[1]);
      const d2 = Math.hypot(c[0] - p[0], c[1] - p[1]);
      const r = Math.min(14, d1 / 2, d2 / 2);
      const s = [p[0] - (p[0] - a[0]) / d1 * r, p[1] - (p[1] - a[1]) / d1 * r];
      const e = [p[0] + (c[0] - p[0]) / d2 * r, p[1] + (c[1] - p[1]) / d2 * r];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6, u = 1 - t;
        out.push({ x: u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], y: u * u * s[1] + 2 * u * t * p[1] + t * t * e[1], id: null });
      }
    }
    return out;
  }
  const polyLen = g => g.reduce((s, p, i) => (i ? s + Math.hypot(p.x - g[i - 1].x, p.y - g[i - 1].y) : 0), 0);
  const pathD = g => g.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('');

  /* ---------------------------------------------------------------------
     Stations and the track graph
     --------------------------------------------------------------------- */
  const segs = D.segments.map(s => Object.assign({}, s, { sp: sample(s.pts) }));
  const ST = {};
  segs.forEach(seg => seg.sp.forEach(p => {
    if (!p.id) return;
    const s = ST[p.id] || (ST[p.id] = { id: p.id, pos: [], lines: new Set(), branch: null });
    if (!s.pos.some(q => q.x === p.x && q.y === p.y)) s.pos.push({ x: p.x, y: p.y });
    s.lines.add(seg.line);
    // Only stops that live on a single branch get its letter (Copley and Kenmore are trunk).
    if (!seg.branch) s.trunk = true;
    else (s.branches || (s.branches = new Set())).add(seg.branch);
  }));
  Object.values(ST).forEach(s => {
    s.branch = !s.trunk && s.branches && s.branches.size === 1 ? Array.from(s.branches)[0] : null;
  });
  Object.keys(ST).forEach(id => {
    const s = ST[id], def = D.stations[id] || [id, 'r'];
    s.name = def[0]; s.side = def[1]; s.opts = def[2] || {};
    const xs = s.pos.map(p => p.x), ys = s.pos.map(p => p.y);
    s.x0 = Math.min.apply(null, xs); s.x1 = Math.max.apply(null, xs);
    s.y0 = Math.min.apply(null, ys); s.y1 = Math.max.apply(null, ys);
    s.x = (s.x0 + s.x1) / 2; s.y = (s.y0 + s.y1) / 2;
    // Junctions like Kenmore are one colour; only a change of colour gets the big ring.
    s.transfer = new Set(Array.from(s.lines).map(colorOf)).size > 1;
    s.r = s.transfer ? 6 : 3.8;
  });

  const nodes = new Map();
  const nodeAt = (id, x, y) => {
    const k = id + '@' + x + ',' + y;
    if (!nodes.has(k)) nodes.set(k, { k, id, x, y, edges: [] });
    return nodes.get(k);
  };
  segs.forEach(seg => {
    let prev = null, prevIdx = 0;
    seg.sp.forEach((p, i) => {
      if (!p.id) return;
      const n = nodeAt(p.id, p.x, p.y);
      if (prev) {
        const g = seg.sp.slice(prevIdx, i + 1);
        const len = polyLen(g);
        prev.edges.push({ to: n, line: seg.line, g, len });
        n.edges.push({ to: prev, line: seg.line, g: g.slice().reverse(), len });
      }
      prev = n; prevIdx = i;
    });
  });
  // Parallel platforms (Haymarket, North Station) are joined by a short walk.
  Object.values(ST).forEach(s => {
    if (s.pos.length < 2) return;
    const ns = Array.from(nodes.values()).filter(n => n.id === s.id);
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
      const a = ns[i], b = ns[j], len = Math.hypot(a.x - b.x, a.y - b.y);
      a.edges.push({ to: b, line: 'walk', g: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }], len });
      b.edges.push({ to: a, line: 'walk', g: [{ x: b.x, y: b.y }, { x: a.x, y: a.y }], len });
    }
  });

  // Shortest ride, with a penalty for changing lines so it rides like a person would.
  function findRoute(fromId, toId) {
    const PENALTY = 70;
    const best = new Map(), back = new Map(), queue = [];
    nodes.forEach(n => {
      if (n.id !== fromId) return;
      const key = n.k + '|';
      best.set(key, 0);
      queue.push({ key, n, line: null, d: 0 });
    });
    let goal = null;
    while (queue.length) {
      queue.sort((a, b) => a.d - b.d);
      const cur = queue.shift();
      if (cur.d > best.get(cur.key)) continue;
      if (cur.n.id === toId) { goal = cur; break; }
      cur.n.edges.forEach(e => {
        const change = cur.line && cur.line !== 'walk' && e.line !== cur.line;
        const d = cur.d + e.len + (change ? PENALTY : 0);
        const key = e.to.k + '|' + e.line;
        if (d < (best.has(key) ? best.get(key) : Infinity)) {
          best.set(key, d);
          back.set(key, { prevKey: cur.key, edge: e });
          queue.push({ key, n: e.to, line: e.line, d });
        }
      });
    }
    if (!goal) return null;
    const edges = [];
    for (let k = goal.key; back.has(k); k = back.get(k).prevKey) edges.unshift(back.get(k).edge);

    const pts = [], seg = [], changes = [], passes = [{ id: fromId, d: 0 }];
    let lastLine = null, atId = fromId, acc = 0;
    edges.forEach((e, i) => {
      // A walk between platforms takes the colour of the line it walks to.
      const line = e.line === 'walk' ? (edges[i + 1] ? edges[i + 1].line : lastLine) : e.line;
      e.g.forEach((p, j) => {
        if (pts.length && j === 0) return;
        if (pts.length) seg.push(line);
        pts.push({ x: p.x, y: p.y });
      });
      if (e.line !== 'walk') {
        if (lastLine && e.line !== lastLine) changes.push({ id: atId, line: e.line });
        lastLine = e.line;
      }
      acc += e.len;
      atId = e.to.id;
      if (e.line !== 'walk' && passes[passes.length - 1].id !== atId) passes.push({ id: atId, d: acc });
    });
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    passes[passes.length - 1].d = cum[cum.length - 1];
    return { pts, seg, cum, len: cum[cum.length - 1], passes, changes, lastLine };
  }

  function pointAt(r, d) {
    d = clamp(d, 0, r.len);
    let lo = 0, hi = r.cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (r.cum[mid] <= d) lo = mid; else hi = mid; }
    const a = r.pts[lo], b = r.pts[Math.min(lo + 1, r.pts.length - 1)];
    const span = (r.cum[lo + 1] - r.cum[lo]) || 1;
    const t = (d - r.cum[lo]) / span;
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), a: Math.atan2(b.y - a.y, b.x - a.x), line: r.seg[Math.min(lo, r.seg.length - 1)] };
  }

  /* ---------------------------------------------------------------------
     Drawing the map
     --------------------------------------------------------------------- */
  const svg = $('#tmap');
  const pane = $('.map-pane');
  if (!svg || !pane || !D) return;
  root.classList.add('has-map');

  const stopEls = $$('[data-station]');
  const stops = stopEls.map((el, i) => ({ el, i, id: el.dataset.station, label: el.dataset.label || '' }));
  const tripIds = new Set(stops.map(s => s.id));

  const FS = 8.6;
  const gWater = svgEl('g', { class: 'm-water' }, svg);
  const gLines = svgEl('g', { class: 'm-lines' }, svg);
  const gTrail = svgEl('g', { class: 'm-trail' }, svg);
  const gStations = svgEl('g', { class: 'm-stations' }, svg);
  const gLabels = svgEl('g', { class: 'm-labels' }, svg);
  const gTabs = svgEl('g', { class: 'm-tabs' }, svg);
  const gPins = svgEl('g', { class: 'm-pins' }, svg);
  const gTrain = svgEl('g', { class: 'm-train' }, svg);

  D.water.strokes.forEach(w => svgEl('path', { d: w.d, 'stroke-width': w.w, class: 'water-stroke' }, gWater));
  D.water.fills.forEach(d => svgEl('path', { d, class: 'water-fill' }, gWater));
  D.water.labels.forEach(l => {
    const t = svgEl('text', { x: l.x, y: l.y, class: 'water-label', transform: 'rotate(' + l.r + ' ' + l.x + ' ' + l.y + ')' }, gWater);
    t.textContent = l.text;
  });
  D.parks.forEach(p => {
    svgEl('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 6, class: 'park' }, gWater);
    const t = svgEl('text', { x: p.x + p.w / 2, y: p.y + p.h / 2 + 2, class: 'park-label' }, gWater);
    t.textContent = p.label;
  });

  segs.forEach(seg => {
    const L = D.lines[seg.line];
    svgEl('path', { d: pathD(seg.sp), stroke: L.color, 'stroke-width': L.width, class: 'track track-' + seg.line }, gLines);
  });

  const trailDots = svgEl('path', { class: 'trail-dots' }, gTrail);
  const trailLine = svgEl('path', { class: 'trail-line' }, gTrail);

  const labelEls = {};
  Object.values(ST).forEach(s => {
    const feat = tripIds.has(s.id);
    if (s.pos.length > 1) {
      svgEl('rect', {
        x: s.x0 - s.r, y: s.y0 - s.r, width: s.x1 - s.x0 + s.r * 2, height: s.y1 - s.y0 + s.r * 2,
        rx: s.r, class: 'stn stn-transfer'
      }, gStations);
    } else {
      svgEl('circle', { cx: s.x, cy: s.y, r: s.r, class: 'stn' + (s.transfer ? ' stn-transfer' : '') }, gStations);
    }
    labelEls[s.id] = drawLabel(s, feat);
  });

  function drawLabel(s, feat) {
    const lines = s.opts.lines || [s.name];
    const fs = feat ? 9.6 : FS;
    const lh = fs * 1.12;
    const pad = s.r + 3.5;
    const dx = s.opts.dx || 0, dy = s.opts.dy || 0;
    const cls = 'lbl' + (s.opts.end ? ' lbl-end' : '') + (feat ? ' lbl-feat' : '');
    const t = svgEl('text', { class: cls, 'font-size': fs }, gLabels);
    let x, y0, anchor = 'start';
    const n = lines.length;
    switch (s.side) {
      case 'l': x = s.x0 - pad; anchor = 'end'; y0 = s.y - (n - 1) * lh / 2 + fs * 0.35; break;
      case 't': x = s.x; anchor = 'middle'; y0 = s.y0 - pad - (n - 1) * lh; break;
      case 'b': x = s.x; anchor = 'middle'; y0 = s.y1 + pad + fs * 0.75; break;
      case 'tl': x = s.x0 - pad + 2; anchor = 'end'; y0 = s.y0 - pad + 1 - (n - 1) * lh; break;
      case 'tr': x = s.x1 + pad - 2; y0 = s.y0 - pad + 1 - (n - 1) * lh; break;
      case 'bl': x = s.x0 - pad + 2; anchor = 'end'; y0 = s.y1 + pad + fs * 0.75; break;
      case 'br': x = s.x1 + pad - 2; y0 = s.y1 + pad + fs * 0.75; break;
      case 'rot':
        t.setAttribute('transform', 'translate(' + (s.x - pad * 0.72 + dx) + ' ' + (s.y - pad * 0.72 + dy) + ') rotate(45)');
        t.setAttribute('text-anchor', 'end');
        t.setAttribute('y', fs * 0.35);
        t.textContent = s.name;
        return t;
      default: x = s.x1 + pad; y0 = s.y - (n - 1) * lh / 2 + fs * 0.35;
    }
    t.setAttribute('text-anchor', anchor);
    lines.forEach((ln, i) => {
      const span = svgEl('tspan', { x: x + dx, y: y0 + dy + i * lh }, t);
      span.textContent = ln;
    });
    return t;
  }

  D.tabs.forEach(tb => {
    const w = tb.text.length * 5.4 + 14;
    const g = svgEl('g', { class: 'tab' }, gTabs);
    svgEl('rect', { x: tb.x - w / 2, y: tb.y - 8, width: w, height: 16, rx: 8, fill: colorOf(tb.line) }, g);
    const t = svgEl('text', { x: tb.x, y: tb.y + 3.2 }, g);
    t.textContent = tb.text;
  });
  D.branches.forEach(b => {
    const g = svgEl('g', { class: 'tab' }, gTabs);
    svgEl('circle', { cx: b.x, cy: b.y, r: 8, fill: colorOf('green') }, g);
    const t = svgEl('text', { x: b.x, y: b.y + 3.4 }, g);
    t.textContent = b.text;
  });

  // Title block, like the one on the real map.
  (function () {
    const g = svgEl('g', { class: 'title-block' }, gTabs);
    svgEl('rect', { x: 122, y: 1176, width: 296, height: 112, rx: 12 }, g);
    svgEl('circle', { cx: 170, cy: 1232, r: 25, class: 'tb-roundel' }, g);
    const h = svgEl('text', { x: 170, y: 1243, class: 'tb-h' }, g); h.textContent = 'H';
    const n = svgEl('text', { x: 208, y: 1226, class: 'tb-name' }, g); n.textContent = 'Henry Zisow';
    const s = svgEl('text', { x: 209, y: 1246, class: 'tb-sub' }, g); s.textContent = 'Rapid transit map · Boston, MA';
    svgEl('circle', { cx: 216, cy: 1266, r: 6.5, class: 'tb-pin' }, g);
    const p = svgEl('text', { x: 216, y: 1269, class: 'tb-pin-n' }, g); p.textContent = '1';
    const l = svgEl('text', { x: 228, y: 1269.5, class: 'tb-legend' }, g); l.textContent = 'Numbered stops are this trip';
  })();

  // Numbered pins for the stops on this trip, tucked into the clear side of each.
  const PIN = {
    alewife: [30, -14], park: [-17, 17], lma: [-19, 3], state: [16, 16], hynes: [17, -14], mfa: [-19, 3],
    northeastern: [-19, 3], foresthills: [-14, 16], govcenter: [16, 16], copley: [-15, 17], kendall: [19, -3], airport: [-17, -1]
  };
  stops.forEach((sp, i) => {
    const s = ST[sp.id];
    if (!s) return;
    const off = PIN[sp.id] || [14, -14];
    const g = svgEl('g', { class: 'pin' + (i === 0 ? ' pin-start' : ''), 'data-stop': i }, gPins);
    const title = svgEl('title', null, g);
    title.textContent = s.name + (sp.label ? ' — ' + sp.label : '');
    if (i === 0) {
      svgEl('rect', { x: s.x + off[0] - 15, y: s.y + off[1] - 7, width: 30, height: 14, rx: 7 }, g);
      const t = svgEl('text', { x: s.x + off[0], y: s.y + off[1] + 2.6 }, g); t.textContent = 'START';
    } else {
      svgEl('circle', { cx: s.x + off[0], cy: s.y + off[1], r: 7.5 }, g);
      const t = svgEl('text', { x: s.x + off[0], y: s.y + off[1] + 3.2 }, g); t.textContent = i;
    }
    g.addEventListener('click', () => goToStop(i));
  });

  // Here-ring and the train.
  const hereRing = svgEl('circle', { r: 11, class: 'here-ring' }, gTrain);
  const train = svgEl('g', { class: 'train' }, gTrain);
  svgEl('rect', { x: -12, y: -6, width: 24, height: 12, rx: 6, class: 'train-body' }, train);
  svgEl('rect', { x: -6.5, y: -2.4, width: 9, height: 4.8, rx: 1.6, class: 'train-window' }, train);
  svgEl('circle', { cx: 7.2, cy: 0, r: 1.7, class: 'train-light' }, train);
  const trainBody = train.firstChild;

  /* ---------------------------------------------------------------------
     Rides between stops
     --------------------------------------------------------------------- */
  const LINE_LABEL = l => (D.lines[l] ? D.lines[l].name : '');
  const rides = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const r = findRoute(stops[i].id, stops[i + 1].id);
    if (!r) continue;
    const el = buildRideEl(r, stops[i], stops[i + 1]);
    stops[i].el.after(el);
    rides.push({ i, r, el, start: 0, end: 0, nowEl: $('.rb-now', el), leftEl: $('.rb-left', el), lastNow: '' });
  }

  function buildRideEl(r, from, to) {
    const dest = ST[to.id];
    const el = document.createElement('div');
    el.className = 'ride';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--len', Math.round(r.len));
    const line = r.lastLine;
    const branch = line === 'green' && dest.branch ? ' · ' + dest.branch + ' branch' : '';
    const changes = r.changes
      .map(c => 'Change at ' + ST[c.id].name + ' for the ' + LINE_LABEL(c.line) + '.')
      .join(' ');
    el.innerHTML =
      '<div class="ride-board" style="--c:' + colorOf(line) + '">' +
        '<div class="rb-top"><span>Next stop</span><span class="rb-line"><i></i>' + LINE_LABEL(line) + branch + '</span></div>' +
        '<div class="rb-name"><span class="led">' + dest.name + '</span></div>' +
        '<div class="rb-for">for ' + (to.label || '') + '</div>' +
        '<div class="rb-bottom"><span class="rb-now">Departing ' + ST[from.id].name + '</span><span class="rb-left"></span></div>' +
        (changes ? '<p class="rb-change">' + changes + '</p>' : '') +
      '</div>';
    return el;
  }

  /* ---------------------------------------------------------------------
     Camera + train, driven by scroll
     --------------------------------------------------------------------- */
  let vh = 0, paneW = 1, paneH = 1, focus = 0, Ws = 400, Wover = 1300, mobile = false;
  const over = { cx: D.bounds.x + D.bounds.w / 2, cy: D.bounds.y + D.bounds.h / 2 };

  function measure() {
    vh = window.innerHeight;
    mobile = mobileMQ.matches;
    paneW = pane.clientWidth || 1;
    paneH = pane.clientHeight || 1;
    const topbar = $('.topbar') ? $('.topbar').offsetHeight : 0;
    focus = mobile ? topbar + paneH + (vh - topbar - paneH) * 0.42 : vh * 0.5;
    rides.forEach(rd => {
      const top = rd.el.getBoundingClientRect().top + window.scrollY;
      rd.start = top - focus;
      rd.end = top + rd.el.offsetHeight - focus;
    });
    stops.forEach(s => { s.top = s.el.getBoundingClientRect().top + window.scrollY; });
    Ws = clamp(paneW / (mobile ? 1.5 : 2.2), 230, 520);
    const aspect = paneH / paneW;
    Wover = Math.max(D.bounds.w, D.bounds.h / aspect) * 1.03;
  }

  function stateAt(s) {
    for (let k = 0; k < rides.length; k++) {
      const rd = rides[k];
      if (s <= rd.end) {
        if (s >= rd.start) return { ride: k, p: (s - rd.start) / Math.max(1, rd.end - rd.start) };
        return { stop: rd.i };
      }
    }
    return { stop: stops.length - 1 };
  }

  let shownTrail = -1, here = null, nowKey = '', curIdx = -1;
  function render(s) {
    const S = stateAt(s);
    root.classList.toggle('at-start', S.stop === 0);
    let cx, cy, W, pos, trailRide = -1, trailD = 0, hereId = null;

    if (S.stop !== undefined) {
      const sp = stops[S.stop], st = ST[sp.id];
      const prevRide = rides.find(rd => rd.i === S.stop - 1);
      const nextRide = rides.find(rd => rd.i === S.stop);
      if (S.stop === 0) {
        cx = over.cx; cy = over.cy; W = Wover;
        pos = nextRide ? pointAt(nextRide.r, 0) : { x: st.x, y: st.y, a: 0, line: 'red' };
      } else {
        cx = st.x; cy = st.y; W = Ws;
        pos = prevRide ? pointAt(prevRide.r, prevRide.r.len) : { x: st.x, y: st.y, a: 0, line: 'red' };
        if (prevRide) { trailRide = rides.indexOf(prevRide); trailD = prevRide.r.len; }
      }
      hereId = sp.id;
      setNow(S.stop, st.name + (sp.label ? ' · ' + sp.label : ''));
    } else {
      const rd = rides[S.ride], r = rd.r;
      let t = clamp(S.p, 0, 1);
      if (reduceMQ.matches) t = t < 0.5 ? 0 : 1;
      const te = ease(t);
      const d = te * r.len;
      pos = pointAt(r, d);
      trailRide = S.ride; trailD = d;
      if (rd.i === 0) {
        W = Wover * Math.pow(Ws / Wover, te);
        cx = lerp(over.cx, pos.x, te); cy = lerp(over.cy, pos.y, te);
      } else {
        const wide = clamp(r.len * 0.9, Ws, Wover * 0.8);
        W = Ws * Math.pow(wide / Ws, Math.sin(Math.PI * te));
        cx = pos.x; cy = pos.y;
      }
      updateBoard(rd, d);
      setNow(t > 0.5 ? rd.i + 1 : rd.i, 'Next: ' + ST[stops[rd.i + 1].id].name);
    }

    const H = W * paneH / paneW;
    svg.setAttribute('viewBox', (cx - W / 2).toFixed(2) + ' ' + (cy - H / 2).toFixed(2) + ' ' + W.toFixed(2) + ' ' + H.toFixed(2));

    train.setAttribute('transform', 'translate(' + pos.x.toFixed(2) + ' ' + pos.y.toFixed(2) + ') rotate(' + (pos.a * 180 / Math.PI).toFixed(1) + ')');
    trainBody.setAttribute('fill', colorOf(pos.line));

    if (trailRide !== shownTrail) {
      shownTrail = trailRide;
      const d = trailRide >= 0 ? pathD(rides[trailRide].r.pts) : '';
      trailDots.setAttribute('d', d);
      trailLine.setAttribute('d', d);
    }
    if (trailRide >= 0) trailLine.style.strokeDasharray = trailD.toFixed(1) + ' 99999';

    if (hereId !== here) {
      here = hereId;
      if (here) {
        const st = ST[here];
        hereRing.setAttribute('cx', st.x);
        hereRing.setAttribute('cy', st.y);
      }
      root.classList.toggle('is-docked', !!here);
      $$('.lbl-here', gLabels).forEach(t => t.classList.remove('lbl-here'));
      if (here && labelEls[here]) labelEls[here].classList.add('lbl-here');
    }
  }

  function updateBoard(rd, d) {
    const ps = rd.r.passes;
    let k = 0;
    for (let i = 0; i < ps.length; i++) if (ps[i].d <= d + 0.5) k = i;
    let now;
    if (d < 1) now = 'Departing ' + ST[ps[0].id].name;
    else if (k >= ps.length - 1) now = 'Arriving at ' + ST[ps[ps.length - 1].id].name;
    else now = 'Now passing ' + ST[ps[k].id].name;
    if (now !== rd.lastNow) {
      rd.lastNow = now;
      rd.nowEl.textContent = now;
      const left = ps.length - 1 - k;
      rd.leftEl.textContent = left > 0 ? left + (left === 1 ? ' stop' : ' stops') : '';
    }
  }

  // Top bar: where are we, and which stop is lit on the strip.
  const nowText = $('#now-text');
  const stripLinks = $$('.strip a');
  function setNow(idx, text) {
    if (nowText && text !== nowKey) { nowKey = text; nowText.textContent = text; }
    if (idx !== curIdx) {
      curIdx = idx;
      stripLinks.forEach((a, i) => a.classList.toggle('is-current', i === idx));
      const c = ST[stops[idx].id];
      root.style.setProperty('--now', colorOf(stops[idx].line || Array.from(c.lines)[0]));
    }
  }
  stops.forEach(sp => {
    const s = ST[sp.id];
    sp.line = sp.el.dataset.line || (s ? Array.from(s.lines)[0] : 'red');
  });

  // Smooth the scroll value itself, so train, camera and trail move together.
  let sTarget = window.scrollY, sCur = sTarget, raf = 0;
  function frame() {
    raf = 0;
    const k = reduceMQ.matches ? 1 : 0.14;
    sCur += (sTarget - sCur) * k;
    if (Math.abs(sTarget - sCur) < 0.4) sCur = sTarget;
    render(sCur);
    if (sCur !== sTarget) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  window.addEventListener('scroll', () => { sTarget = window.scrollY; kick(); }, { passive: true });

  let resizeTimer = 0;
  function remeasure() { measure(); sTarget = sCur = window.scrollY; render(sCur); }
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(remeasure, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(remeasure, 120); }).observe($('.stops'));
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  remeasure();

  /* ---------------------------------------------------------------------
     Jumping to a stop (top bar strip, map pins, in-page links)
     --------------------------------------------------------------------- */
  function goToStop(i) {
    const sp = stops[i];
    if (!sp) return;
    let y = 0;
    if (i > 0) {
      const topbar = $('.topbar').offsetHeight;
      const offset = mobile ? topbar + paneH + 8 : topbar + 8;
      y = sp.el.getBoundingClientRect().top + window.scrollY - offset;
    }
    window.scrollTo({ top: Math.max(0, y), behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    sp.el.setAttribute('tabindex', '-1');
    sp.el.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (id === 'top' || id === '') { e.preventDefault(); goToStop(0); return; }
    if (!target) return;
    const stopEl = target.matches('[data-station]') ? target : target.querySelector('[data-station]') || target.closest('[data-station]');
    const idx = stopEl ? stopEls.indexOf(stopEl) : -1;
    if (idx < 0) return;
    e.preventDefault();
    goToStop(idx);
  });
})();

/* =========================================================================
   Page bits that don't depend on the map
   ========================================================================= */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  /* ---------- Reveal stop content as you arrive ---------- */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('can-reveal');
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  }

  /* ---------- Clocks (Boston time) ---------- */
  const clocks = $$('[data-clock]');
  if (clocks.length && window.Intl) {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
    const tick = () => { const t = fmt.format(new Date()); clocks.forEach(c => { c.textContent = t; }); };
    tick();
    setInterval(tick, 15000);
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
    p.tags.forEach(t => { const li = document.createElement('li'); li.textContent = t; tags.appendChild(li); });
    const actions = $('#modal-actions');
    actions.textContent = '';
    if (p.link) {
      const a = document.createElement('a');
      a.className = 'btn btn-primary';
      a.href = p.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = 'Visit site ↗';
      actions.appendChild(a);
    }
    if (p.download) {
      const a = document.createElement('a');
      a.className = 'btn';
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
    const label = $('.copy-label', copyBtn);
    let timer = null;
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
        } catch (e2) { ok = false; }
      }
      label.textContent = ok ? 'Copied' : 'Press ⌘C';
      copyBtn.classList.toggle('copied', ok);
      clearTimeout(timer);
      timer = setTimeout(() => { label.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
    });
  }
})();
