// The preference lab. A toy 2-D task where two rollouts are scored against three expert demos with
// the paper's equations, computed live: ORCA progress (Eq. 2), marginal segment scores (Eq. 3-4),
// max over demos (Eq. 6), then the threshold and the label (Eq. 5). Positions stand in for the
// R3M embeddings of camera frames that the paper uses.
(() => {
  const $ = (id) => document.getElementById(id);
  const cv = $("lab-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = getComputedStyle(document.documentElement);
  const V = (n) => css.getPropertyValue(n).trim();
  const COL = {
    demo: V("--demo"), demoInk: V("--demo-ink"), win: V("--win"), lose: V("--lose"), ink: V("--ink"),
    muted: V("--muted"), faint: V("--faint"), rule: V("--rule"), coral: V("--coral"), brand: V("--brand"),
  };
  const ROLL = [V("--roll"), V("--lav")];
  const ROLL_INK = [V("--roll-ink"), "#4b3aa8"];
  const RGB = { r0: "201,154,6", r1: "124,106,214", win: "63,143,47", lose: "192,0,0", grey: "139,148,156", demo: "46,117,182" };

  // ---------- geometry ----------
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  // smooth curve through waypoints (Catmull-Rom) with an arc-length table
  function curve(wp, per = 14) {
    const pts = [];
    for (let i = 0; i < wp.length - 1; i++) {
      const p0 = wp[Math.max(0, i - 1)], p1 = wp[i], p2 = wp[i + 1], p3 = wp[Math.min(wp.length - 1, i + 2)];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        pts.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3)));
      }
    }
    pts.push(wp[wp.length - 1].slice());
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  function at(c, s) {
    const d = clamp01(s) * c.len;
    let i = 1;
    while (i < c.cum.length - 1 && c.cum[i] < d) i++;
    const f = (d - c.cum[i - 1]) / (c.cum[i] - c.cum[i - 1] || 1);
    return [lerp(c.pts[i - 1][0], c.pts[i][0], f), lerp(c.pts[i - 1][1], c.pts[i][1], f)];
  }
  // arc-length fraction over time, piecewise linear between [t, s] keys
  function sched(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) { const [t0, s0] = keys[i - 1], [t1, s1] = keys[i]; return lerp(s0, s1, (t - t0) / (t1 - t0)); }
    }
    return keys[keys.length - 1][1];
  }

  // ---------- ORCA, Eq. 2 ----------
  // P[t][j] = exp(-lambda ||o_t - o~_j||);  C[t][j] = max(C[t-1][j], C[t][j-1] P[t][j]) with C[t][0] = 1 before the
  // first subgoal and C[0][j] = 0;  progress r^_t = C[t][J-1] P[t][J]  (1-indexed as in the paper).
  function orca(obs, sub, lam) {
    const T = obs.length, J = sub.length, r = new Float64Array(T), C = [];
    let prev = new Float64Array(J);
    for (let t = 0; t < T; t++) {
      const cur = new Float64Array(J);
      let left = 1;
      for (let j = 0; j < J; j++) {
        const p = Math.exp(-lam * dist(obs[t], sub[j]));
        cur[j] = Math.max(prev[j], left * p);
        if (j === J - 1) r[t] = (J > 1 ? cur[J - 2] : 1) * p;
        left = cur[j];
      }
      C.push(cur);
      prev = cur;
    }
    return { r, C };
  }

  // ---------- the four cases ----------
  const J = 10;   // subgoals per demonstration
  // three demos of a pick-and-place arch: middle, outer and inner; label anchors sit between the lines
  const ARCH = [
    [[8, 46], [20, 45], [29, 35], [37, 21], [50, 13], [66, 13], [79, 20], [88, 30], [92, 40]],
    [[8, 46], [18, 41], [26, 28], [36, 13], [52, 6], [70, 7], [83, 15], [90, 28], [92, 40]],
    [[8, 46], [23, 46], [32, 38], [40, 27], [51, 20], [63, 20], [76, 25], [86, 33], [92, 40]],
  ];
  const ARCH_LAB = [[57, 18.4], [61, 11], [57, 26.6]];
  const SC = [
    { tab: "Stalled vs. steady", cat: "Double counting", naive: true, truth: 1,
      desc: "τ<sub>1</sub> races ahead, then hovers short of the goal. τ<sub>2</sub> is slower but keeps going.",
      T: 90, L: 18, lam: 0.012, eps: 0.1, demos: ARCH, dlab: ARCH_LAB, seg: [58, 44],
      rolls: [
        { wp: [[8, 47], [21, 44], [30, 34], [38, 21], [51, 14], [66, 14], [78, 21]], keys: [[1, 0], [30, 1]], wob: [[31, 90, 1.1]] },
        { wp: [[8, 46], [20, 45], [29, 35], [37, 21], [50, 13], [66, 13], [79, 20], [88, 30], [91, 40]], keys: [[1, 0], [14, 0.12], [42, 0.45], [70, 0.87], [84, 1]], wob: [[85, 90, 0.3]] },
      ] },
    { tab: "Skipped subgoal", cat: "Order matters", truth: 1,
      desc: "τ<sub>1</sub> slides straight to the goal and skips the climb. τ<sub>2</sub> covers the subgoals in order.",
      T: 90, L: 20, lam: 0.02, eps: 0.1, demos: ARCH, dlab: ARCH_LAB, seg: [14, 60],
      rolls: [
        { wp: [[8, 46], [30, 47], [55, 46], [78, 43], [91, 40]], keys: [[1, 0], [44, 1]], wob: [[45, 90, 0.6]] },
        { wp: [[8, 46], [21, 44], [30, 35], [38, 21], [51, 13], [67, 13], [80, 20], [88, 30], [92, 40]], keys: [[1, 0], [90, 0.8]], wob: [] },
      ] },
    { tab: "Two strategies", cat: "Multimodality", truth: 0,
      desc: "τ<sub>1</sub> goes around the block the other way, like expert <span data-tex='\\tilde\\tau_2'>τ<sub>2</sub></span>. Turn off “Max over 3 demos” to see it penalized.",
      T: 90, L: 20, lam: 0.016, eps: 0.1, seg: [46, 52], box: [40, 18, 20, 20], dlab: [[50, 12.6], [50, 54.6], [50, 2.6]],
      demos: [
        [[8, 28], [22, 24], [34, 12], [50, 7], [66, 12], [78, 24], [92, 28]],
        [[8, 28], [22, 33], [34, 44], [50, 49], [66, 44], [78, 33], [92, 28]],
        [[8, 28], [23, 23], [36, 10], [50, 5], [64, 10], [77, 23], [92, 28]],
      ],
      rolls: [
        { wp: [[8, 29], [21, 34], [33, 45], [50, 50], [66, 45], [79, 34], [91, 29]], keys: [[1, 0], [80, 1]], wob: [[81, 90, 0.3]] },
        { wp: [[8, 27], [22, 23], [35, 11], [50, 6], [66, 11], [78, 23], [92, 28]], keys: [[1, 0], [40, 0.42], [90, 0.75]], wob: [] },
      ] },
    { tab: "Too close to call", cat: "Ambiguous pair", truth: null,
      desc: "Both segments make about the same progress, so the pair is dropped rather than becoming a noisy label.",
      T: 90, L: 18, lam: 0.012, eps: 0.1, demos: ARCH, dlab: ARCH_LAB, seg: [52, 50],
      rolls: [
        { wp: [[8, 46], [20, 44], [29, 34], [37, 21], [51, 13], [66, 14], [79, 20], [88, 30], [91, 40]], keys: [[1, 0], [86, 1]], wob: [[87, 90, 0.3]] },
        { wp: [[8, 47], [23, 46], [32, 38], [40, 27], [51, 20], [63, 20], [76, 25], [86, 33], [92, 40]], keys: [[1, 0], [84, 1]], wob: [[85, 90, 0.3]] },
      ] },
  ];
  function wob(r, t) {
    let a = 0;
    for (const [t0, t1, amp] of r.wob) a += amp * clamp01((t - t0 + 1) / 4) * (t <= t1 ? 1 : 0);
    return a;
  }
  function build(sc) {
    sc.dc = sc.demos.map((wp) => curve(wp));
    sc.sub = sc.dc.map((c) => Array.from({ length: J }, (_, j) => at(c, j / (J - 1))));
    sc.obs = sc.rolls.map((r, i) => {
      const c = curve(r.wp);
      return Array.from({ length: sc.T }, (_, k) => {
        const t = k + 1, p = at(c, sched(r.keys, t)), a = wob(r, t);
        return [p[0] + a * Math.sin(t * 1.9 + i * 2.1), p[1] + a * Math.cos(t * 1.37 + i)];
      });
    });
    sc.res = sc.obs.map((o) => sc.sub.map((s) => orca(o, s, sc.lam)));
    sc.seg0 = sc.seg.slice();
  }
  SC.forEach(build);

  // ---------- state ----------
  const ORDER = ["cover", "margin", "max", "label", "cpl", "end"];
  const DUR = { cover: 3800, margin: 2300, max: 2100, label: 2100, cpl: 2500, end: 3200 };
  const PH = Object.fromEntries(ORDER.map((p, i) => [p, i]));
  let sc = SC[0], ph = "cover", pt = 0, playing = !reduce, speed = 1, visible = false;
  let useMax = true, naive = !!sc.naive, eps = sc.eps, manualT = null;
  let drag = null, hover = -1, focusSeg = 0, dirty = true;

  // ---------- scores ----------
  const active = () => (useMax ? sc.sub.map((_, m) => m) : [0]);
  const rh = (i, m, k) => (k <= 0 ? 0 : sc.res[i][m].r[Math.min(k, sc.T) - 1]);
  const segR = (i, m) => rh(i, m, sc.seg[i] + sc.L) - rh(i, m, sc.seg[i]);
  function segSum(i, m) { let s = 0; for (let k = sc.seg[i] + 1; k <= sc.seg[i] + sc.L; k++) s += rh(i, m, k); return s; }
  function agg(i) {
    const per = sc.sub.map((_, m) => segR(i, m));
    let best = 0, v = -Infinity;
    for (const m of active()) if (per[m] > v) { v = per[m]; best = m; }
    const sums = active().map((m) => segSum(i, m));
    return { v, best, per, sum: Math.max(...sums) };
  }
  function decide() {
    const a = agg(0), b = agg(1), d = a.v - b.v;
    return { a, b, d, kept: Math.abs(d) > eps, win: d > 0 ? 0 : 1, sumWin: a.sum > b.sum ? 0 : 1 };
  }

  // ---------- layout, in a 640 x 640 frame ----------
  const LW = 640, LH = 640;
  const WS = { x: 20, y: 48, s: 6 };            // world (100 x 56) to frame
  const wx = (x) => WS.x + x * WS.s, wy = (y) => WS.y + y * WS.s;
  const PL = { x0: 70, x1: 610, y0: 412, y1: 538 };
  const TRK = [576, 602];
  const xs = (k) => PL.x0 + ((k - 0.5) / sc.T) * (PL.x1 - PL.x0);
  const kx = (x) => (x - PL.x0) / (PL.x1 - PL.x0) * sc.T + 0.5;
  const py = (v) => PL.y1 - clamp01(v) * (PL.y1 - PL.y0);
  let dpr = 1, k = 1;

  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    k = Math.min(cv.width / LW, cv.height / LH);
    dirty = true;
  }

  // ---------- drawing ----------
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function poly(g, pts, map = true) {
    g.beginPath();
    pts.forEach((p, i) => { const x = map ? wx(p[0]) : p[0], y = map ? wy(p[1]) : p[1]; i ? g.lineTo(x, y) : g.moveTo(x, y); });
  }
  function txt(g, s, x, y, col, font, align = "left") { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); }
  // italic symbol with a subscript and an optional accent drawn by hand ("tilde" or "hat"), since
  // combining accents place badly on canvas; halo puts a white outline behind it over busy lines
  function sym(g, base, sub, x, y, col, size = 15, align = "left", acc = null, halo = false) {
    const fb = `italic 600 ${size}px "STIX Two Text", serif`, fs = `600 ${size * 0.68}px "STIX Two Text", serif`;
    g.font = fb; const w0 = g.measureText(base).width;
    g.font = fs; const w1 = g.measureText(sub).width;
    const x0 = align === "center" ? x - (w0 + w1) / 2 : align === "right" ? x - w0 - w1 : x;
    const parts = [[base, x0, y, fb], [sub, x0 + w0 + 0.5, y + size * 0.28, fs]];
    if (halo) {
      g.lineWidth = 4; g.strokeStyle = "rgba(255,255,255,.92)"; g.lineJoin = "round"; g.textAlign = "left";
      for (const [s, px, pyy, f] of parts) { g.font = f; g.strokeText(s, px, pyy); }
      if (acc) accent(g, acc, x0, y, w0, size, "rgba(255,255,255,.92)", 4);
    }
    for (const [s, px, pyy, f] of parts) txt(g, s, px, pyy, col, f);
    if (acc) accent(g, acc, x0, y, w0, size, col);
  }
  function accent(g, kind, x, y, w, size, col, lw) {
    const cx = x + w * 0.58, cy = y - size * 0.66, a = size * 0.2;
    g.strokeStyle = col; g.lineWidth = lw || Math.max(1, size * 0.075); g.lineCap = "round";
    g.beginPath();
    if (kind === "hat") { g.moveTo(cx - a, cy + a * 0.45); g.lineTo(cx, cy - a * 0.35); g.lineTo(cx + a, cy + a * 0.45); }
    else for (let i = 0; i <= 12; i++) { const u = i / 12; g[i ? "lineTo" : "moveTo"](cx - a + 2 * a * u, cy - Math.sin(u * Math.PI * 2) * a * 0.3); }
    g.stroke();
  }
  function halo(g, s, x, y, font, align = "left") {
    g.font = font; g.textAlign = align; g.lineWidth = 4; g.strokeStyle = "rgba(255,255,255,.92)"; g.lineJoin = "round"; g.strokeText(s, x, y);
  }

  function stateCol(i, L, alpha) {
    if (!L) return `rgba(${i ? RGB.r1 : RGB.r0},${alpha})`;
    if (!L.kept) return `rgba(${RGB.grey},${alpha})`;
    return `rgba(${L.win === i ? RGB.win : RGB.lose},${alpha})`;
  }

  function draw() {
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(k * 1, 0, 0, k * 1, (cv.width - LW * k) / 2, (cv.height - LH * k) / 2);
    g.lineCap = g.lineJoin = "round";
    const f = clamp01(pt / DUR[ph]);
    const P = PH[ph];
    const tc = manualT != null ? manualT : P === 0 ? Math.max(1, Math.round(sc.T * clamp01(pt / (DUR.cover * 0.92)))) : sc.T;
    const D = decide();
    const winA = P > PH.margin ? 1 : P === PH.margin ? ease(clamp01(f * 1.6)) : 0;     // windows and brackets
    const showLabel = P >= PH.label;
    const L = showLabel ? D : null;
    const bestOf = [D.a.best, D.b.best];

    // workspace panel
    g.fillStyle = "#ffffff"; rr(g, 14, 42, 612, 348, 12); g.fill();
    g.strokeStyle = COL.rule; g.lineWidth = 1; g.stroke();
    g.fillStyle = "rgba(30,30,60,.07)";
    for (let x = 0; x <= 100; x += 4) for (let y = 0; y <= 56; y += 4) g.fillRect(wx(x) - 0.6, wy(y) - 0.6, 1.2, 1.2);
    if (sc.box) {
      const [bx, by, bw, bh] = sc.box;
      g.fillStyle = "#eef0f6"; rr(g, wx(bx), wy(by), bw * WS.s, bh * WS.s, 10); g.fill();
      g.strokeStyle = "#c9cfdc"; g.lineWidth = 1.5; g.stroke();
      txt(g, "obstacle", wx(bx + bw / 2), wy(by + bh / 2) + 4, COL.faint, '500 12px Inter, sans-serif', "center");
    }
    // start and goal
    const s0 = sc.sub[0][0], gl = sc.sub[0][J - 1];
    g.strokeStyle = COL.faint; g.lineWidth = 1.2; g.setLineDash([3, 3]);
    g.beginPath(); g.arc(wx(s0[0]), wy(s0[1]), 11, 0, 7); g.stroke(); g.setLineDash([]);
    txt(g, "start", wx(s0[0]) - 15, wy(s0[1]) + 4, COL.faint, '500 11px Inter, sans-serif', "right");
    for (const [r, a] of [[16, 0.12], [10, 0.2]]) { g.fillStyle = `rgba(${RGB.demo},${a})`; g.beginPath(); g.arc(wx(gl[0]), wy(gl[1]), r, 0, 7); g.fill(); }
    txt(g, "goal", wx(gl[0]) + 19, wy(gl[1]) + 4, COL.demoInk, '600 11px Inter, sans-serif');

    // expert demonstrations and their subgoals
    sc.dc.forEach((c, m) => {
      const on = useMax || m === 0;
      const hi = P >= PH.max && on && bestOf.includes(m);
      g.globalAlpha = on ? (P >= PH.max ? (hi ? 1 : 0.35) : 0.75) : 0.16;
      g.strokeStyle = hi ? COL.demoInk : COL.demo; g.lineWidth = hi ? 2.6 : 1.7;
      if (!on) g.setLineDash([4, 4]);
      poly(g, c.pts); g.stroke(); g.setLineDash([]);
      sc.sub[m].forEach((p) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(wx(p[0]), wy(p[1]), 4.6, 0, 7); g.fill(); g.lineWidth = 1.6; g.stroke(); });
      if (sc.dlab) sym(g, "τ", String(m + 1), wx(sc.dlab[m][0]), wy(sc.dlab[m][1]), hi ? COL.demoInk : COL.demo, 14, "center", "tilde", true);
      g.globalAlpha = 1;
    });

    // ordered coverage of each rollout, shown on the demo that serves it best: covered subgoals fill in
    for (let i = 0; i < 2; i++) {
      const m = P >= PH.max ? bestOf[i] : bestNow(i, tc);
      const C = sc.res[i][m].C[tc - 1];
      sc.sub[m].forEach((p, j) => {
        const a = clamp01((C[j] - 0.25) / 0.6);
        if (a <= 0.02) return;
        g.fillStyle = `rgba(${i ? RGB.r1 : RGB.r0},${0.9 * a})`;
        g.beginPath(); g.moveTo(wx(p[0]), wy(p[1]));
        g.arc(wx(p[0]), wy(p[1]), 4.6, i ? -Math.PI / 2 : Math.PI / 2, i ? Math.PI / 2 : Math.PI * 1.5); g.fill();
      });
      if (P === PH.cover || manualT != null) {
        let jf = 0;
        for (let j = 0; j < J; j++) if (C[j] >= 0.5) jf = j;
        const o = sc.obs[i][tc - 1], q = sc.sub[m][jf];
        g.strokeStyle = `rgba(${i ? RGB.r1 : RGB.r0},.75)`; g.lineWidth = 1.2; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(wx(o[0]), wy(o[1])); g.lineTo(wx(q[0]), wy(q[1])); g.stroke(); g.setLineDash([]);
      }
    }

    // segment highlights on the paths, then the paths
    for (let i = 0; i < 2; i++) {
      if (winA > 0) {
        const a = sc.seg[i], seg = sc.obs[i].slice(a, Math.min(tc, a + sc.L));
        if (seg.length > 1) { g.strokeStyle = stateCol(i, L, 0.3 * winA); g.lineWidth = 11; poly(g, seg); g.stroke(); }
      }
      g.strokeStyle = ROLL[i]; g.lineWidth = 2.3;
      poly(g, sc.obs[i].slice(0, tc)); g.stroke();
    }
    for (let i = 0; i < 2; i++) {
      const o = sc.obs[i][tc - 1];
      g.fillStyle = ROLL[i]; g.strokeStyle = "#fff"; g.lineWidth = 2;
      g.beginPath(); g.arc(wx(o[0]), wy(o[1]), 6.5, 0, 7); g.fill(); g.stroke();
      const dy = i ? 22 : -12, left = wx(o[0]) > 540;
      sym(g, "τ", String(i + 1), wx(o[0]) + (left ? -10 : 10), wy(o[1]) + dy, ROLL_INK[i], 16, left ? "right" : "left", null, true);
    }

    // CPL: raise the likelihood of the preferred segment, lower the rejected one
    if (P >= PH.cpl && D.kept) {
      const a = P === PH.cpl ? ease(clamp01(f * 1.5)) : 1;
      for (let i = 0; i < 2; i++) {
        const o = sc.obs[i][Math.min(sc.T, sc.seg[i] + Math.round(sc.L / 2)) - 1];
        const up = D.win === i, x = wx(o[0]) + (i ? 26 : -26), y = wy(o[1]) + (up ? -10 : 10);
        g.globalAlpha = a;
        arrow(g, x, y, up, up ? COL.win : COL.lose, 18 * a);
        halo(g, up ? "log π ↑" : "log π ↓", x, y + (up ? -24 : 32), '600 12px Inter, sans-serif', "center");
        txt(g, up ? "log π ↑" : "log π ↓", x, y + (up ? -24 : 32), up ? COL.win : COL.lose, '600 12px Inter, sans-serif', "center");
        g.globalAlpha = 1;
      }
    }

    drawPlot(g, P, f, tc, D, L, winA);
  }

  function arrow(g, x, y, up, col, h) {
    const s = up ? -1 : 1;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x, y + s * h); g.lineTo(x - 8, y + s * (h - 9)); g.lineTo(x - 3.5, y + s * (h - 9)); g.lineTo(x - 3.5, y);
    g.lineTo(x + 3.5, y); g.lineTo(x + 3.5, y + s * (h - 9)); g.lineTo(x + 8, y + s * (h - 9)); g.closePath(); g.fill();
  }

  function bestNow(i, tc) {
    let best = 0, v = -1;
    for (const m of active()) { const r = sc.res[i][m].r[tc - 1]; if (r > v) { v = r; best = m; } }
    return best;
  }

  function drawPlot(g, P, f, tc, D, L, winA) {
    // axes
    g.strokeStyle = COL.rule; g.lineWidth = 1;
    for (const v of [0, 0.5, 1]) {
      g.beginPath(); g.moveTo(PL.x0, py(v)); g.lineTo(PL.x1, py(v)); g.stroke();
      txt(g, v.toFixed(1), PL.x0 - 8, py(v) + 4, COL.faint, '500 10px "JetBrains Mono", monospace', "right");
    }
    txt(g, "progress", PL.x0, PL.y0 - 7, COL.muted, '500 11px Inter, sans-serif');
    sym(g, "r", "t", PL.x0 + 54, PL.y0 - 7, COL.muted, 13, "left", "hat");
    for (const t of [1, Math.round(sc.T / 2), sc.T]) txt(g, String(t), xs(t), PL.y1 + 15, COL.faint, '500 10px "JetBrains Mono", monospace', "center");
    txt(g, "time step t →", PL.x1, LH - 10, COL.muted, '500 11px Inter, sans-serif', "right");

    // windows
    const agg2 = [D.a, D.b];
    for (let i = 0; i < 2; i++) {
      if (winA <= 0) break;
      const x0 = xs(sc.seg[i] + 0.5), x1 = xs(sc.seg[i] + sc.L + 0.5);
      g.fillStyle = stateCol(i, L, 0.13 * winA); g.fillRect(x0, PL.y0, x1 - x0, PL.y1 - PL.y0);
      g.strokeStyle = stateCol(i, L, 0.45 * winA); g.lineWidth = 1; g.setLineDash([2, 3]);
      g.beginPath(); g.moveTo(x0, PL.y0); g.lineTo(x0, PL.y1); g.moveTo(x1, PL.y0); g.lineTo(x1, PL.y1); g.stroke(); g.setLineDash([]);
    }
    // naive sum: the area under the cumulative curve inside the window
    if (naive && winA > 0) {
      for (let i = 0; i < 2; i++) {
        const m = agg2[i].best, a = sc.seg[i];
        g.save();
        g.beginPath(); g.moveTo(xs(a + 0.5), py(0));
        for (let kk = a + 1; kk <= a + sc.L; kk++) g.lineTo(xs(kk), py(rh(i, m, kk)));
        g.lineTo(xs(a + sc.L + 0.5), py(0)); g.closePath(); g.clip();
        g.strokeStyle = `rgba(${i ? RGB.r1 : RGB.r0},${0.55 * winA})`; g.lineWidth = 1.2;
        for (let x = PL.x0 - 200; x < PL.x1; x += 6) { g.beginPath(); g.moveTo(x, PL.y1); g.lineTo(x + 140, PL.y1 - 140); g.stroke(); }
        g.restore();
      }
    }
    // progress curves: thin for every active demo, bold for the one that scores the segment
    for (let i = 0; i < 2; i++) {
      for (const m of active()) {
        const bold = m === agg2[i].best;
        g.strokeStyle = bold ? ROLL[i] : `rgba(${i ? RGB.r1 : RGB.r0},.3)`;
        g.lineWidth = bold ? 2.6 : 1.1;
        g.beginPath();
        for (let kk = 1; kk <= tc; kk++) { const x = xs(kk), y = py(rh(i, m, kk)); kk > 1 ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
      const yv = py(rh(i, agg2[i].best, tc));
      g.fillStyle = ROLL[i]; g.strokeStyle = "#fff"; g.lineWidth = 1.6;
      g.beginPath(); g.arc(xs(tc), yv, 4, 0, 7); g.fill(); g.stroke();
    }
    // marginal brackets: progress made inside each window
    for (let i = 0; i < 2; i++) {
      if (winA <= 0) break;
      const m = agg2[i].best, a = sc.seg[i];
      const y0 = py(rh(i, m, a)), y1 = py(rh(i, m, a + sc.L));
      const clash = i === 1 && Math.abs(sc.seg[1] - sc.seg[0]) * (PL.x1 - PL.x0) / sc.T < 46;
      const right = !clash && xs(a + sc.L + 0.5) + 30 < PL.x1;
      const bx = right ? xs(a + sc.L + 0.5) + 7 : xs(a + 0.5) - 7;
      const col = L ? stateCol(i, L, 1) : ROLL_INK[i];
      g.globalAlpha = winA;
      g.strokeStyle = col; g.lineWidth = 1; g.setLineDash([2, 3]);
      g.beginPath(); g.moveTo(xs(a + 0.5), y0); g.lineTo(bx, y0); g.moveTo(xs(a + sc.L), y1); g.lineTo(bx, y1); g.stroke(); g.setLineDash([]);
      const ym = lerp(y0, y1, winA);
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(bx, y0); g.lineTo(bx, ym); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(bx - 4, y0); g.lineTo(bx + 4, y0); g.moveTo(bx - 4, ym); g.lineTo(bx + 4, ym); g.stroke();
      const v = agg2[i].v, lab = sgn(v);
      const ty = Math.min(PL.y1 - 4, Math.max(PL.y0 + 10, (y0 + ym) / 2 + 4));
      halo(g, lab, bx + (right ? 7 : -7), ty, '700 12px "JetBrains Mono", monospace', right ? "left" : "right");
      txt(g, lab, bx + (right ? 7 : -7), ty, col, '700 12px "JetBrains Mono", monospace', right ? "left" : "right");
      if (naive) {
        const s = "Σ " + agg2[i].sum.toFixed(1);
        const sx = (xs(a + 0.5) + xs(a + sc.L + 0.5)) / 2;
        halo(g, s, sx, PL.y1 - 6, '600 11px "JetBrains Mono", monospace', "center");
        txt(g, s, sx, PL.y1 - 6, `rgba(${i ? RGB.r1 : RGB.r0},1)`, '600 11px "JetBrains Mono", monospace', "center");
      }
      g.globalAlpha = 1;
    }

    // timeline tracks with the draggable windows
    for (let i = 0; i < 2; i++) {
      const y = TRK[i];
      g.strokeStyle = COL.rule; g.lineWidth = 2;
      g.beginPath(); g.moveTo(PL.x0, y); g.lineTo(PL.x1, y); g.stroke();
      sym(g, "σ", String(i + 1), 14, y + 5, ROLL_INK[i], 15);
      txt(g, "on", 34, y + 4, COL.faint, '500 10px Inter, sans-serif');
      sym(g, "τ", String(i + 1), 50, y + 5, ROLL_INK[i], 14);
      const x0 = xs(sc.seg[i] + 0.5), x1 = xs(sc.seg[i] + sc.L + 0.5);
      const hot = (drag && drag.i === i) || hover === i;
      g.fillStyle = L ? stateCol(i, L, 0.22) : `rgba(${i ? RGB.r1 : RGB.r0},.2)`;
      rr(g, x0, y - 9, x1 - x0, 18, 9); g.fill();
      g.strokeStyle = L ? stateCol(i, L, 1) : ROLL[i]; g.lineWidth = hot || focusSeg === i && document.activeElement === cv ? 2.4 : 1.4; g.stroke();
      g.strokeStyle = L ? stateCol(i, L, 0.9) : ROLL_INK[i]; g.lineWidth = 1.2;
      const cx = (x0 + x1) / 2;
      for (const d of [-3, 0, 3]) { g.beginPath(); g.moveTo(cx + d, y - 4); g.lineTo(cx + d, y + 4); g.stroke(); }
      if (L) {
        const tag = !L.kept ? "dropped" : L.win === i ? "σʷ" : "σˡ";
        txt(g, tag, x1 + 8, y + 4, stateCol(i, L, 1), L.kept ? 'italic 700 13px "STIX Two Text", serif' : '600 10.5px Inter, sans-serif');
      }
    }
  }

  // ---------- side panel ----------
  const TEX = {
    cover: "\\begin{gathered}\\hat r_t=C_{t,\\tilde H-1}\\,P_{t,\\tilde H}\\\\ C_{t,j}=\\max\\{C_{t-1,j},\\;C_{t,j-1}P_{t,j}\\}\\end{gathered}",
    margin: "R(\\sigma,\\tilde\\tau)=\\sum_{k=t+1}^{t+L} r_k=\\hat r_{t+L}-\\hat r_{t}",
    max: "R(\\sigma)=\\max_{m\\in\\{1,\\dots,M\\}} R(\\sigma,\\tilde\\tau_m)",
    label: "|R(\\sigma_1)-R(\\sigma_2)|>\\epsilon_\\sigma\\;\\Rightarrow\\;(\\sigma^w,\\sigma^l)",
    cpl: "\\begin{gathered}\\mathcal{L}_{\\text{CPL}}=-\\log\\sigma\\big(\\alpha\\,[\\,\\ell(\\sigma^w)-\\ell(\\sigma^l)\\,]\\big)\\\\ \\ell(\\sigma)=\\textstyle\\sum_{t}\\gamma^t\\log\\frac{\\pi_\\theta(\\mathbf{a}_t\\mid\\mathbf{s}_t)}{\\pi_{\\text{ref}}(\\mathbf{a}_t\\mid\\mathbf{s}_t)}\\end{gathered}",
  };
  const sgn = (v) => (Math.abs(v) < 0.005 ? "0.00" : (v > 0 ? "+" : "−") + Math.abs(v).toFixed(2));
  const PHASE = { cover: "Ordered coverage", margin: "Marginal progress", max: "Max over demos", cpl: "Fine-tune with CPL" };
  const scoresEl = $("lab-scores");
  scoresEl.innerHTML = [0, 1].map((i) => `<div class="sgrp"><div class="hd"><span><b style="color:${ROLL_INK[i]}">σ<sub>${i + 1}</sub></b> on τ<sub>${i + 1}</sub></span><span class="v" id="lab-v${i}">–</span></div>
    ${[0, 1, 2].map((m) => `<div class="srow" id="lab-s${i}${m}"><span class="nm" data-tex="\\tilde\\tau_{${m + 1}}">τ&#771;<sub>${m + 1}</sub></span><span class="wb"><i></i></span><span class="wv"></span></div>`).join("")}</div>`).join("");
  scoresEl.querySelectorAll("[data-tex]").forEach((el) => window.katex && PGPG.tex(el, el.dataset.tex));
  let lastSig = "", lastEq = "";

  function panel() {
    const P = PH[ph], D = decide();
    const showRows = P >= PH.margin, showMax = P >= PH.max, showLabel = P >= PH.label;
    const sig = [ph, showRows, showMax, showLabel, useMax, naive, eps, sc.seg.join(","), sc.tab].join("|");
    const steps = document.querySelectorAll("#lab-steps li");
    steps.forEach((li) => { const j = PH[li.dataset.k]; li.classList.toggle("on", j === Math.min(P, PH.cpl)); li.classList.toggle("done", j < P); });
    const eqKey = ph === "end" ? "cpl" : ph;
    if (eqKey !== lastEq) { lastEq = eqKey; window.PGPG && PGPG.tex($("lab-eq"), TEX[eqKey], true); }
    const pe = $("lab-phase");
    let ptxt = PHASE[ph] || PHASE.cpl, pcls = ph === "end" ? "cpl" : ph;
    if (ph === "label" || (ph === "cpl" && !D.kept) || (ph === "end" && !D.kept)) {
      ptxt = D.kept ? `σ${D.win ? "₂" : "₁"} ≻ σ${D.win ? "₁" : "₂"}` : "Dropped: too close to call";
      pcls = D.kept ? "label" : "drop";
    }
    pe.textContent = ptxt; pe.className = "vphase " + pcls;
    if (sig === lastSig) return;
    lastSig = sig;
    scoresEl.classList.toggle("lit", showRows);
    [D.a, D.b].forEach((A, i) => {
      $("lab-v" + i).textContent = showMax ? sgn(A.v) : "–";
      $("lab-v" + i).style.color = showLabel ? (D.kept ? (D.win === i ? COL.win : COL.lose) : COL.faint) : COL.ink;
      A.per.forEach((v, m) => {
        const row = $(`lab-s${i}${m}`);
        const on = useMax || m === 0;
        row.classList.toggle("off", !on);
        row.classList.toggle("top", showMax && on && m === A.best);
        row.querySelector("i").style.width = showRows ? `${Math.max(0, Math.min(1, v / 0.6)) * 100}%` : "0";
        row.querySelector(".wv").textContent = showRows ? sgn(v) : "";
      });
    });
    // the label meter: the gap against the dead zone of width 2 eps
    const span = 0.5, X = (d) => 50 + Math.max(-1, Math.min(1, d / span)) * 46;
    $("lab-dead").style.left = `${X(-eps)}%`;
    $("lab-dead").style.width = `${X(eps) - X(-eps)}%`;
    const mk = $("lab-mk");
    mk.style.left = showLabel ? `${X(D.d)}%` : "50%";
    mk.style.background = !showLabel ? COL.faint : D.kept ? COL.win : COL.faint;
    $("lab-gap").textContent = showLabel ? `gap ${Math.abs(D.d).toFixed(2)}, ε = ${eps.toFixed(2)}` : "";
    const nm = (i) => `<b>σ<sub>${i + 1}</sub></b>`;
    // the intended outcome is known for the case's own windows; once they are dragged, no verdict
    const T = sc.seg.some((v, i) => v !== sc.seg0[i]) ? undefined : sc.truth;
    const call = (ok) => (ok ? '<span class="ok">Right call.</span>' : '<span class="bad">Wrong call.</span>');
    $("lab-out").innerHTML = !showLabel ? "–" : D.kept
      ? `${nm(D.win)} preferred over ${nm(1 - D.win)}, so the pair goes into <i>D</i><sub>pref</sub>. ` +
        (T === undefined ? "" : T === null ? '<span class="bad">A near tie: this label is noise.</span>' : call(D.win === T))
      : `Dropped: the gap is below <i>ε<sub>σ</sub></i>, so no label. ` +
        (T === undefined ? "" : T === null ? '<span class="ok">Right call.</span>' : '<span class="bad">A useful pair is lost.</span>');
    const sumWrong = T != null && D.sumWin !== T;
    $("lab-naive").innerHTML = !showLabel ? "" :
      `Summing the progress over the window instead: ${D.a.sum.toFixed(1)} vs ${D.b.sum.toFixed(1)}, which picks ${nm(D.sumWin)}. ` +
      (T == null ? "" : !sumWrong ? '<span class="ok">Right call.</span>' : D.kept && D.win === T
        ? '<span class="bad">Wrong call: the sum keeps counting progress made before the window.</span>' : '<span class="bad">Wrong call.</span>');
  }

  // ---------- loop ----------
  let last = 0;
  function frame(now) {
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    if (playing && visible) {
      pt += dt * speed;
      if (pt >= DUR[ph]) { pt = 0; ph = ph === "end" ? "cover" : ORDER[PH[ph] + 1]; }
      dirty = true;
    }
    if (dirty && visible) {
      draw(); panel(); dirty = false;
      const tc = manualT != null ? manualT : PH[ph] === 0 ? Math.max(1, Math.round(sc.T * clamp01(pt / (DUR.cover * 0.92)))) : sc.T;
      $("lab-t").textContent = `t = ${tc} / ${sc.T}`;
      if (!drag && document.activeElement !== scrub) scrub.value = String(Math.round(((tc - 1) / (sc.T - 1)) * 1000));
    }
    requestAnimationFrame(frame);
  }

  // ---------- controls ----------
  const scrub = $("lab-scrub");
  const playBtn = $("lab-play");
  function setPlaying(p) {
    playing = p;
    playBtn.classList.toggle("on", p);
    playBtn.querySelector("span").textContent = p ? "Pause" : "Play";
    $("lab-play-ico").innerHTML = p ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M7 5l12 7-12 7z"/>';
    dirty = true;
  }
  // any direct manipulation shows the finished label and stops the tour
  function settle() {
    if (PH[ph] < PH.label) { ph = "label"; pt = DUR.label; }
    setPlaying(false);
    dirty = true;
  }
  playBtn.onclick = () => {
    if (!playing && manualT != null) manualT = null;
    if (!playing && ph === "end") { ph = "cover"; pt = 0; }
    setPlaying(!playing);
  };
  $("lab-next").onclick = () => {
    manualT = null;
    ph = ph === "end" || ph === "cpl" ? "cover" : ORDER[PH[ph] + 1];
    pt = playing ? 0 : DUR[ph];
    dirty = true;
  };
  document.querySelectorAll("#lab-steps li").forEach((li) => {
    li.onclick = () => { manualT = null; ph = li.dataset.k; pt = playing ? 0 : DUR[ph]; dirty = true; };
  });
  document.querySelectorAll("#lab-speed button").forEach((b) => {
    b.onclick = () => {
      speed = +b.dataset.s;
      document.querySelectorAll("#lab-speed button").forEach((x) => x.classList.toggle("on", x === b));
    };
  });
  scrub.addEventListener("input", () => {
    manualT = 1 + Math.round((+scrub.value / 1000) * (sc.T - 1));
    setPlaying(false);
  });
  const maxBtn = $("lab-max"), naiveBtn = $("lab-naive-btn"), epsIn = $("lab-eps"), epsOut = $("lab-eps-v");
  function syncToggles() {
    maxBtn.classList.toggle("on", useMax); maxBtn.setAttribute("aria-pressed", useMax);
    naiveBtn.classList.toggle("on", naive); naiveBtn.setAttribute("aria-pressed", naive);
    epsIn.value = eps; epsOut.textContent = eps.toFixed(2);
  }
  maxBtn.onclick = () => { useMax = !useMax; syncToggles(); settle(); };
  naiveBtn.onclick = () => { naive = !naive; syncToggles(); dirty = true; };
  epsIn.addEventListener("input", () => { eps = +epsIn.value; syncToggles(); settle(); });

  function load(i) {
    sc = SC[i];
    sc.seg = sc.seg0.slice();
    useMax = true; naive = !!sc.naive; eps = sc.eps; manualT = null;
    $("lab-cat").textContent = sc.cat;
    $("lab-desc").innerHTML = sc.desc;
    $("lab-desc").querySelectorAll("[data-tex]").forEach((el) => window.katex && PGPG.tex(el, el.dataset.tex));
    ph = reduce ? "cpl" : "cover"; pt = reduce ? DUR.cpl : 0;
    lastSig = ""; syncToggles(); setPlaying(!reduce);
  }
  const tabsHost = $("lab-tabs");
  SC.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "tab" + (i === 0 ? " on" : "");
    b.textContent = s.tab;
    b.onclick = () => { tabsHost.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t === b)); load(i); };
    tabsHost.appendChild(b);
  });

  // dragging the windows, on the tracks or in the plot
  function local(e) {
    const r = cv.getBoundingClientRect();
    const sx = (e.clientX - r.left) * dpr, sy = (e.clientY - r.top) * dpr;
    return [(sx - (cv.width - LW * k) / 2) / k, (sy - (cv.height - LH * k) / 2) / k];
  }
  function hit(x, y) {
    const D = decide();
    for (let i = 0; i < 2; i++) {
      if (Math.abs(y - TRK[i]) <= 13 && x >= xs(sc.seg[i] + 0.5) - 8 && x <= xs(sc.seg[i] + sc.L + 0.5) + 8) return i;
    }
    if (y >= PL.y0 - 8 && y <= PL.y1 + 4 && PH[ph] >= PH.margin) {
      const inside = [0, 1].filter((i) => x >= xs(sc.seg[i] + 0.5) && x <= xs(sc.seg[i] + sc.L + 0.5));
      if (inside.length === 1) return inside[0];
      if (inside.length === 2) {
        const kk = Math.max(1, Math.min(sc.T, Math.round(kx(x))));
        const d = inside.map((i) => Math.abs(py(rh(i, [D.a, D.b][i].best, kk)) - y));
        return d[0] <= d[1] ? 0 : 1;
      }
    }
    return -1;
  }
  function moveSeg(i, t) {
    const v = Math.max(0, Math.min(sc.T - sc.L, Math.round(t)));
    if (v !== sc.seg[i]) { sc.seg[i] = v; dirty = true; }
  }
  cv.addEventListener("pointerdown", (e) => {
    const [x, y] = local(e);
    let i = hit(x, y);
    if (i < 0) {
      // a click on an empty track moves that window there
      for (let j = 0; j < 2; j++) if (Math.abs(y - TRK[j]) <= 13 && x >= PL.x0 && x <= PL.x1) i = j;
      if (i < 0) return;
      moveSeg(i, kx(x) - sc.L / 2 - 0.5);
    }
    focusSeg = i;
    drag = { i, off: kx(x) - sc.seg[i] };
    cv.setPointerCapture(e.pointerId);
    settle();
    e.preventDefault();
  });
  cv.addEventListener("pointermove", (e) => {
    const [x, y] = local(e);
    if (drag) { moveSeg(drag.i, kx(x) - drag.off); return; }
    const h = hit(x, y);
    if (h !== hover) { hover = h; dirty = true; }
    cv.style.cursor = h >= 0 ? "ew-resize" : "default";
  });
  const end = () => { if (drag) { drag = null; dirty = true; } };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
  cv.addEventListener("pointerleave", () => { if (hover !== -1) { hover = -1; dirty = true; } });
  cv.addEventListener("keydown", (e) => {
    if (e.key === "1" || e.key === "2") { focusSeg = +e.key - 1; dirty = true; return; }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      moveSeg(focusSeg, sc.seg[focusSeg] + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 5 : 1));
      settle(); e.preventDefault();
    }
  });
  cv.addEventListener("focus", () => (dirty = true));
  cv.addEventListener("blur", () => (dirty = true));

  new ResizeObserver(resize).observe(cv);
  new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); dirty = true; }).observe(cv);
  resize();
  load(0);
  requestAnimationFrame(frame);

  // exposed for checking the numbers from the console
  window.PGPG = window.PGPG || {};
  PGPG.lab = { SC, decide, setCase: (i) => tabsHost.children[i].click(), setMax: (v) => { useMax = v; syncToggles(); } };
})();
