// Looping sketches on the three method cards, after the three panels at the bottom of Fig. 1:
// ordered coverage between a rollout and a demo (real frames from the figure), marginal against
// summed progress on a segment, and max over the reference demos. Schematic, not measured.
(() => {
  const css = getComputedStyle(document.documentElement);
  const C = (n) => css.getPropertyValue(n).trim();
  const COL = {
    demo: C("--demo"), demoInk: C("--demo-ink"), roll: C("--roll"), rollInk: C("--roll-ink"), win: C("--win"),
    lose: C("--lose"), coral: C("--coral"), ink: C("--ink"), muted: C("--muted"), faint: C("--faint"), rule: C("--rule"),
  };
  const GOLD = "#bf9000", GREEN = "#548235", NAVY = "#203864";   // the three demos of Fig. 1, panel 3
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const back = (x) => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  function dot(g, x, y, r, fill, stroke, w = 1.2) {
    g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 7);
    g.fillStyle = fill; g.fill();
    if (stroke) { g.lineWidth = w; g.strokeStyle = stroke; g.stroke(); }
  }
  function text(g, s, x, y, col, font, align = "left") { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); }
  // rich text: [string, kind] pieces, kind = "i" italic serif, "it"/"ih" italic with a tilde/hat drawn over it,
  // "s" subscript, "n" upright serif, "t" sans, "m" mono. Accents are drawn by hand: combining marks place badly on canvas.
  function rich(g, parts, x, y, col, size = 12) {
    const it = `italic 500 ${size + 1}px "STIX Two Text", serif`;
    const F = { i: it, it, ih: it, s: `500 ${size - 2}px "STIX Two Text", serif`, n: `500 ${size + 1}px "STIX Two Text", serif`,
      t: `500 ${size - 1}px Inter, sans-serif`, m: `700 ${size}px "JetBrains Mono", monospace` };
    let cx = x;
    for (const [s, k] of parts) {
      g.font = F[k]; g.fillStyle = col; g.textAlign = "left";
      g.fillText(s, cx, y + (k === "s" ? 3 : 0));
      const w = g.measureText(s).width;
      if (k === "it" || k === "ih") accent(g, k === "it" ? "tilde" : "hat", cx, y, w, size + 1, col);
      cx += w + (k === "s" ? 1 : 0);
    }
    return cx;
  }
  function accent(g, kind, x, y, w, size, col) {
    const cx = x + w * 0.58, cy = y - size * 0.66, a = size * 0.2;
    g.strokeStyle = col; g.lineWidth = Math.max(1, size * 0.075); g.lineCap = "round";
    g.beginPath();
    if (kind === "hat") { g.moveTo(cx - a, cy + a * 0.45); g.lineTo(cx, cy - a * 0.35); g.lineTo(cx + a, cy + a * 0.45); }
    else for (let i = 0; i <= 12; i++) { const u = i / 12; g[i ? "lineTo" : "moveTo"](cx - a + 2 * a * u, cy - Math.sin(u * Math.PI * 2) * a * 0.3); }
    g.stroke();
  }
  function pill(g, txt, x, y, col, a) {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a;
    g.font = '700 11px Inter, sans-serif';
    const w = g.measureText(txt).width;
    g.fillStyle = "rgba(255,255,255,0.95)"; g.strokeStyle = col; g.lineWidth = 1.2;
    g.beginPath(); g.roundRect(x - w / 2 - 9, y - 13, w + 18, 20, 10); g.fill(); g.stroke();
    g.fillStyle = col; g.textAlign = "left"; g.fillText(txt, x - w / 2, y + 1);
    g.restore();
  }
  function arrowHead(g, x, y, an, col, s = 7) {
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y);
    g.lineTo(x - s * Math.cos(an - 0.45), y - s * Math.sin(an - 0.45)); g.lineTo(x - s * Math.cos(an + 0.45), y - s * Math.sin(an + 0.45)); g.fill();
  }

  // ---------- 1. Ordered coverage, 660 x 250 ----------
  // Top: a rollout that tilts the nut at the peg; bottom: an expert demo of the same Square task.
  // Each rollout step aligns to the demo subgoal it covers; subgoals count only in order.
  const thumbs = new Image();
  thumbs.src = "assets/frames/nodes.jpg";
  const NX = [150, 236, 322, 408, 494, 580], YR = 66, YD = 182, NR = 26;
  const LINKS = [[0, 0, 1], [1, 1, 1], [2, 2, 1], [3, 3, 1], [4, 4, 0.45], [5, 5, 0]];   // strength of each alignment
  const COVER_T = 11;
  function node(g, x, y, img, col, s) {
    if (s <= 0) return;
    const r = NR * back(s);
    g.save(); g.shadowColor = "rgba(40,30,90,0.18)"; g.shadowBlur = 7; g.shadowOffsetY = 2;
    dot(g, x, y, r, "#fff"); g.restore();
    g.save(); g.beginPath(); g.arc(x, y, Math.max(0, r - 2), 0, 7); g.clip();
    if (thumbs.complete && thumbs.naturalWidth) g.drawImage(thumbs, img * 96, 0, 96, 96, x - r, y - r, 2 * r, 2 * r);
    g.restore();
    g.lineWidth = 2.8; g.strokeStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  }
  function drawCover(g, t) {
    const fade = 1 - seg(t, 10.3, 11);
    g.globalAlpha = fade;
    g.lineCap = g.lineJoin = "round";
    // row names
    g.globalAlpha = fade * seg(t, 0.8, 1.3);
    text(g, "rollout", 18, YR - 4, COL.rollInk, '700 11px Inter, sans-serif');
    rich(g, [["τ ∼ D", "i"], ["demo", "s"], [" ∪ D", "i"], ["rollout", "s"]], 18, YR + 13, COL.muted, 11);
    g.globalAlpha = fade * seg(t, 0.1, 0.6);
    text(g, "expert demo", 18, YD - 4, COL.demoInk, '700 11px Inter, sans-serif');
    rich(g, [["τ", "it"], ["m", "s"], [" ∼ D", "i"], ["demo", "s"]], 18, YD + 13, COL.muted, 11);
    g.globalAlpha = fade;
    // temporal arrows inside each row
    for (const [y, col, t0] of [[YD, COL.demo, 0.2], [YR, COL.roll, 0.9]]) {
      for (let i = 0; i < 5; i++) {
        const f = ease(seg(t, t0 + i * 0.16 + 0.15, t0 + i * 0.16 + 0.4));
        if (f <= 0) continue;
        const x0 = NX[i] + NR + 3, x1 = NX[i + 1] - NR - 4;
        g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(lerp(x0, x1, f), y); g.stroke();
        if (f > 0.95) arrowHead(g, x1 + 2, y, 0, col);
      }
    }
    // alignment links, in order
    LINKS.forEach(([i, j, s], n) => {
      const t0 = 2.3 + n * 0.75, f = ease(seg(t, t0, t0 + 0.45));
      if (f <= 0) return;
      const x0 = NX[i], y0 = YR + NR + 3, x1 = NX[j], y1 = YD - NR - 3;
      g.setLineDash(s > 0.9 ? [] : [4, 4]);
      g.strokeStyle = s > 0.9 ? COL.roll : s > 0 ? "rgba(201,154,6,.6)" : "rgba(192,0,0,.55)";
      g.lineWidth = s > 0.9 ? 2.4 : 1.8;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, f), lerp(y0, y1, f)); g.stroke(); g.setLineDash([]);
    });
    // nodes on top
    for (let i = 0; i < 6; i++) node(g, NX[i], YD, i, COL.demo, seg(t, 0.2 + i * 0.16, 0.55 + i * 0.16));
    for (let i = 0; i < 6; i++) node(g, NX[i], YR, 6 + i, COL.roll, seg(t, 0.9 + i * 0.16, 1.25 + i * 0.16));
    // coverage marks on the demo subgoals
    LINKS.forEach(([, j, s], n) => {
      const t0 = 2.3 + n * 0.75 + 0.45, f = back(seg(t, t0, t0 + 0.35));
      if (f <= 0) return;
      const x = NX[j] + 19, y = YD - 19;
      if (s > 0.9) { dot(g, x, y, 8 * f, COL.roll, "#fff", 1.5); tick(g, x, y, f); }
      else if (s > 0) { dot(g, x, y, 8 * f, "#fff", COL.roll, 1.8); text(g, "?", x, y + 4, COL.rollInk, '700 11px Inter, sans-serif', "center"); }
      else { dot(g, x, y, 8 * f, COL.lose, "#fff", 1.5); cross(g, x, y, f); }
    });
    // ordered coverage meter: one cell per subgoal
    const mx = 630, top = 52;
    g.globalAlpha = fade * seg(t, 1.6, 2.2);
    text(g, "C", mx + 5, top - 10, COL.ink, 'italic 600 13px "STIX Two Text", serif', "center");
    for (let j = 0; j < 6; j++) {
      const y = top + (5 - j) * 24;
      g.fillStyle = "#fff"; g.strokeStyle = COL.rule; g.lineWidth = 1.2;
      g.beginPath(); g.roundRect(mx - 4, y, 18, 18, 4); g.fill(); g.stroke();
      const n = LINKS.findIndex((l) => l[1] === j), s = LINKS[n][2];
      const f = seg(t, 2.3 + n * 0.75 + 0.45, 2.3 + n * 0.75 + 0.8);
      if (f > 0 && s > 0) {
        g.fillStyle = s > 0.9 ? COL.roll : "rgba(201,154,6,.35)";
        g.beginPath(); g.roundRect(mx - 4, y + 18 * (1 - f * (s > 0.9 ? 1 : 0.5)), 18, 18 * f * (s > 0.9 ? 1 : 0.5), 4); g.fill();
      }
    }
    g.globalAlpha = fade;
    pill(g, "each step covers the next subgoal, in order", 365, 18, COL.demo, seg(t, 2.3, 2.7) * (1 - seg(t, 5.0, 5.4)));
    pill(g, "the nut tilts at the peg: the last subgoals stay uncovered", 365, 18, COL.lose, seg(t, 5.5, 5.9) * (1 - seg(t, 8.0, 8.4)));
    pill(g, "so the progress score stays well below 1", 365, 18, COL.ink, seg(t, 8.5, 8.9) * (1 - seg(t, 10.0, 10.3)));
    g.globalAlpha = 1;
  }
  function tick(g, x, y, f) {
    g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath();
    g.moveTo(x - 3.5 * f, y); g.lineTo(x - 1 * f, y + 3 * f); g.lineTo(x + 4 * f, y - 3.5 * f); g.stroke();
  }
  function cross(g, x, y, f) {
    g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath();
    g.moveTo(x - 3 * f, y - 3 * f); g.lineTo(x + 3 * f, y + 3 * f); g.moveTo(x + 3 * f, y - 3 * f); g.lineTo(x - 3 * f, y + 3 * f); g.stroke();
  }

  // ---------- 2. Marginal progress scoring, 320 x 200 ----------
  const MARGIN_T = 10;
  const prog = (u) => 0.55 * sm(0.04, 0.42, u) + 0.45 * sm(0.66, 0.98, u);   // rises, stalls, rises again
  const PX = (u) => 34 + u * 266, PY = (v) => 140 - v * 104;
  const W = 0.2;
  const KEYS = [[0, 0.03], [1.6, 0.18], [3.0, 0.18], [4.6, 0.46], [6.6, 0.46], [8.0, 0.76], [9.4, 0.76]];
  function winAt(t) {
    for (let i = 1; i < KEYS.length; i++) if (t <= KEYS[i][0]) return lerp(KEYS[i - 1][1], KEYS[i][1], ease(seg(t, KEYS[i - 1][0], KEYS[i][0])));
    return KEYS[KEYS.length - 1][1];
  }
  function drawMargin(g, t) {
    const fade = seg(t, 0, 0.5) * (1 - seg(t, 9.4, 10));
    g.globalAlpha = fade;
    g.lineCap = g.lineJoin = "round";
    // axes
    g.strokeStyle = COL.ink; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(PX(0), PY(1.08)); g.lineTo(PX(0), PY(0)); g.lineTo(PX(1.02), PY(0)); g.stroke();
    arrowHead(g, PX(0), PY(1.08) - 3, -Math.PI / 2, COL.ink, 6); arrowHead(g, PX(1.02) + 3, PY(0), 0, COL.ink, 6);
    text(g, "1.0", PX(0) - 5, PY(1) + 4, COL.faint, '500 9px "JetBrains Mono", monospace', "right");
    g.strokeStyle = COL.rule; g.lineWidth = 1; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(PX(0), PY(1)); g.lineTo(PX(1), PY(1)); g.stroke(); g.setLineDash([]);
    text(g, "progress", PX(0) + 6, PY(1.08) + 2, COL.muted, '500 10px Inter, sans-serif');
    text(g, "time step", PX(1), PY(0) + 14, COL.muted, '500 10px Inter, sans-serif', "right");
    // window
    const u0 = winAt(t), u1 = u0 + W;
    g.fillStyle = "rgba(63,143,47,0.12)"; g.fillRect(PX(u0), PY(1.04), PX(u1) - PX(u0), PY(0) - PY(1.04));
    text(g, "σ", (PX(u0) + PX(u1)) / 2, PY(1.04) + 13, COL.win, 'italic 600 14px "STIX Two Text", serif', "center");
    // naive: the area under the cumulative curve inside the window
    g.save();
    g.beginPath(); g.moveTo(PX(u0), PY(0));
    for (let u = u0; u <= u1 + 1e-6; u += 0.005) g.lineTo(PX(u), PY(prog(u)));
    g.lineTo(PX(u1), PY(0)); g.closePath(); g.clip();
    g.strokeStyle = "rgba(251,101,68,.5)"; g.lineWidth = 1.2;
    for (let x = 0; x < 340; x += 6) { g.beginPath(); g.moveTo(x, PY(0)); g.lineTo(x + 110, PY(0) - 110); g.stroke(); }
    g.restore();
    // the curve
    g.strokeStyle = COL.win; g.lineWidth = 2.6; g.beginPath();
    for (let u = 0; u <= 1.0001; u += 0.01) { const x = PX(u), y = PY(prog(u)); u ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    // marginal bracket
    const y0 = PY(prog(u0)), y1 = PY(prog(u1)), bx = PX(u1) + 6;
    g.strokeStyle = COL.win; g.lineWidth = 1; g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(PX(u0), y0); g.lineTo(bx, y0); g.stroke(); g.setLineDash([]);
    g.lineWidth = 2.4; g.beginPath(); g.moveTo(bx, y0); g.lineTo(bx, y1); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.moveTo(bx - 4, y0); g.lineTo(bx + 4, y0); g.moveTo(bx - 4, y1); g.lineTo(bx + 4, y1); g.stroke();
    dot(g, PX(u0), y0, 3.2, COL.win, "#fff"); dot(g, PX(u1), y1, 3.2, COL.win, "#fff");
    // readouts
    let sum = 0, n = 0;
    for (let u = u0; u <= u1 + 1e-6; u += 0.01) { sum += prog(u); n++; }
    const naive = sum / n, marg = prog(u1) - prog(u0);
    const rows = [[[["naive: summed ", "t"], ["r", "ih"]], naive, "rgba(251,101,68,.85)"],
      [[["marginal: ", "t"], ["r", "ih"], ["t+L", "s"], [" − ", "n"], ["r", "ih"], ["t", "s"]], marg, COL.win]];
    rows.forEach(([lab, v, col], i) => {
      const y = 166 + i * 17;
      rich(g, lab, 16, y + 4, COL.muted, 11);
      g.fillStyle = "rgba(139,148,156,.18)"; g.beginPath(); g.roundRect(150, y - 4, 120, 8, 4); g.fill();
      g.fillStyle = col; g.beginPath(); g.roundRect(150, y - 4, Math.max(3, 120 * v), 8, 4); g.fill();
      text(g, v.toFixed(2), 306, y + 4, COL.ink, '600 10px "JetBrains Mono", monospace', "right");
    });
    const flat = marg < 0.06 && naive > 0.4;
    pill(g, flat ? "stalled: big sum, no progress" : "progress made inside σ", 186, 20, flat ? COL.coral : COL.win, 1);
    g.globalAlpha = 1;
  }

  // ---------- 3. Max over demonstrations, 320 x 200 ----------
  const MAX_T = 9.4;
  const LINES = [
    { col: GOLD, y: 44, d: [0, -7, 6, 8, -6], sub: "1", v: 0.42 },
    { col: GREEN, y: 96, d: [2, 4, -6, 3, 0], sub: "2", v: 0.28 },
    { col: NAVY, y: 156, d: [3, 1, 5, -10, 4], sub: "M", v: 0.63 },
  ];
  const LX = [18, 48, 78, 108, 138];
  function drawMax(g, t) {
    const fade = 1 - seg(t, 8.6, 9.4);
    g.globalAlpha = fade;
    g.lineCap = g.lineJoin = "round";
    const pick = seg(t, 3.6, 4.2);
    LINES.forEach((L, i) => {
      const f = ease(seg(t, 0.1 + i * 0.35, 1.2 + i * 0.35));
      const pts = LX.map((x, j) => [x, L.y + L.d[j]]);
      const hi = i === 2 ? pick : 0, dim = i === 2 ? 1 : 1 - 0.5 * pick;
      g.globalAlpha = fade * dim;
      g.strokeStyle = L.col; g.lineWidth = 2.6 + 1.2 * hi;
      g.beginPath();
      const n = Math.max(1, Math.round(f * 40));
      for (let s = 0; s <= n; s++) {
        const u = (s / 40) * (pts.length - 1), a = Math.min(pts.length - 2, Math.floor(u)), w = u - a;
        const y = lerp(pts[a][1], pts[a + 1][1], (1 - Math.cos(w * Math.PI)) / 2);
        s ? g.lineTo(lerp(pts[a][0], pts[a + 1][0], w), y) : g.moveTo(pts[0][0], pts[0][1]);
      }
      g.stroke();
      pts.forEach(([x, y], j) => { if (f * 4 >= j - 0.01) dot(g, x, y, 4.6, L.col, "#fff", 1.2); });
      // value, counting up
      const c = seg(t, 1.3 + i * 0.35, 2.2 + i * 0.35);
      if (c > 0) {
        g.globalAlpha = fade * dim * clamp(c * 2);
        const end = rich(g, [["R(σ, ", "i"], ["τ", "it"], [L.sub, "s"], [") = ", "n"]], 152, L.y + 4, L.col, 12);
        text(g, (L.v * ease(c)).toFixed(2), end, L.y + 4, L.col, '700 12px "JetBrains Mono", monospace');
      }
    });
    g.globalAlpha = fade * seg(t, 0.8, 1.4);
    for (const dy of [-6, 0, 6]) dot(g, 78, 126 + dy, 1.8, COL.muted);
    // the bracket and the max
    const b = ease(seg(t, 3.0, 3.6));
    if (b > 0) {
      g.globalAlpha = fade;
      g.strokeStyle = COL.ink; g.lineWidth = 1.6;
      const yt = 38, yb = 162, ym = (yt + yb) / 2;
      g.beginPath(); g.moveTo(272, ym - (ym - yt) * b); g.lineTo(272, ym + (yb - ym) * b); g.stroke();
      g.beginPath(); g.moveTo(266, ym - (ym - yt) * b); g.lineTo(272, ym - (ym - yt) * b); g.moveTo(266, ym + (yb - ym) * b); g.lineTo(272, ym + (yb - ym) * b); g.stroke();
      g.globalAlpha = fade * pick;
      text(g, "max", 296, ym - 6, COL.ink, '600 12px Inter, sans-serif', "center");
      text(g, "0.63", 296, ym + 12, NAVY, '700 14px "JetBrains Mono", monospace', "center");
      const mn = seg(t, 5.0, 5.6);
      if (mn > 0) {
        g.globalAlpha = fade * mn;
        text(g, "mean", 296, ym + 40, COL.faint, '500 10px Inter, sans-serif', "center");
        text(g, "0.44", 296, ym + 54, COL.faint, '600 11px "JetBrains Mono", monospace', "center");
        g.strokeStyle = COL.faint; g.lineWidth = 1.2; g.beginPath(); g.moveTo(281, ym + 50); g.lineTo(311, ym + 50); g.stroke();
      }
    }
    g.globalAlpha = fade;
    pill(g, "credit for matching any expert mode", 160, 18, NAVY, seg(t, 4.2, 4.6) * (1 - seg(t, 8.0, 8.6)));
    g.globalAlpha = 1;
  }

  // ---------- run ----------
  const SK = { cover: [drawCover, COVER_T, 9.6, 660, 250], margin: [drawMargin, MARGIN_T, 5.4, 320, 200], max: [drawMax, MAX_T, 6.4, 320, 200] };
  const items = [...document.querySelectorAll(".pill-cv")].map((cv) => ({ cv, g: cv.getContext("2d"), sk: SK[cv.dataset.anim], vis: false, t0: 0 }));
  function size(it) {
    const r = it.cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    it.cv.width = Math.max(1, Math.round(r.width * dpr)); it.cv.height = Math.max(1, Math.round(r.height * dpr));
    const [, , , LW, LH] = it.sk;
    it.k = Math.min(it.cv.width / LW, it.cv.height / LH);
    it.ox = (it.cv.width - LW * it.k) / 2; it.oy = (it.cv.height - LH * it.k) / 2;
  }
  function paint(it, t) {
    const g = it.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, it.cv.width, it.cv.height);
    g.setTransform(it.k, 0, 0, it.k, it.ox, it.oy);
    it.sk[0](g, t);
  }
  items.forEach((it) => {
    size(it);
    new ResizeObserver(() => { size(it); if (reduce) paint(it, it.sk[2]); }).observe(it.cv);
    new IntersectionObserver((es) => { it.vis = es.some((e) => e.isIntersecting); }).observe(it.cv);
    it.cv.parentElement.addEventListener("mouseenter", () => { it.t0 = performance.now(); });
    if (reduce) paint(it, it.sk[2]);
  });
  if (reduce) { thumbs.onload = () => items.forEach((it) => paint(it, it.sk[2])); return; }
  function loop(now) {
    items.forEach((it) => {
      if (!it.vis) return;
      if (!it.t0) it.t0 = now;
      paint(it, ((now - it.t0) / 1000) % it.sk[1]);
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
